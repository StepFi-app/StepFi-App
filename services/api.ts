import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { config } from '../constants/config';
import { useAuthStore } from '../stores/auth.store';
import { getFromCache, setToCache } from '../src/offline/cache';
import { useConnectivityStore } from '../src/offline/connectivity.store';
import { enqueueAction } from '../src/offline/offline-queue';
import type { QueueAction, QueueActionType } from '../src/offline/offline-queue';
import { addBreadcrumb, captureServiceError } from './sentry';
import { ApiClientError, ApiErrorCode } from '../types/errors';

// ---------------------------------------------------------------------------
// Retry & timeout configuration
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 15_000; // ceiling for all requests
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;
const JITTER_MAX_MS = 500;

/** HTTP methods that are safe to auto-retry on transient errors */
const IDEMPOTENT_METHODS = new Set(['get', 'put', 'delete', 'options', 'head']);

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNetworkOrServerError(status: number | undefined): boolean {
  if (!status) return true; // no response → network error
  return status >= 500 || status === 429;
}

function isIdempotentMethod(method: string | undefined): boolean {
  return IDEMPOTENT_METHODS.has((method ?? 'get').toLowerCase());
}

/**
 * Exponential back-off with full jitter.
 *
 *   delay = min(cap, base * 2^attempt)
 *   jitter = random(0, jitterMax)
 *   final = delay + jitter
 */
function backoffDelay(attempt: number): number {
  const delay = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
  const jitter = Math.random() * JITTER_MAX_MS;
  return Math.floor(delay + jitter);
}

// ---------------------------------------------------------------------------
// Request interceptor
// ---------------------------------------------------------------------------

api.interceptors.request.use(async (req) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    req.headers = req.headers ?? {};
    (req.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  // Breadcrumb for every outgoing request
  addBreadcrumb('http.request', `${req.method?.toUpperCase()} ${req.url}`, {
    baseURL: req.baseURL ?? '',
    timeout: req.timeout ?? 0,
  });

  const method = req.method?.toLowerCase();
  if (!method || !['post', 'put', 'patch', 'delete'].includes(method)) {
    return req;
  }

  const { isConnected } = useConnectivityStore.getState();
  if (isConnected) return req;

  // Offline – queue mutation for later replay
  const action = await enqueueAction({
    type: getActionType(req.url ?? '', req.method ?? 'POST'),
    endpoint: req.url ?? '',
    method: req.method?.toUpperCase() as QueueAction['method'],
    data: (req.data as Record<string, unknown>) ?? {},
  });

  return Promise.reject({
    __offline_queued: true,
    __action: action,
    config: req,
  });
});

// ---------------------------------------------------------------------------
// Token refresh – shared / deduplicated
// ---------------------------------------------------------------------------

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
  if (!refreshToken) {
    await clearAuth();
    return null;
  }

  try {
    const res = await axios.post<{
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    }>(
      `${config.API_BASE_URL}/auth/refresh`,
      { refreshToken },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    await setTokens(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken;
  } catch {
    await clearAuth();
    return null;
  }
}

// ---------------------------------------------------------------------------
// Response interceptor
// ---------------------------------------------------------------------------

api.interceptors.response.use(
  (res) => {
    const method = res.config?.method?.toLowerCase();
    if (method === 'get' && res.config?.url) {
      setToCache(`GET:${res.config.url}`, res.data).catch(() => {});
    }
    return res;
  },
  async (error: unknown) => {
    // Ensure we always have a structured error
    const axiosError = error as AxiosError & {
      __offline_queued?: boolean;
      __action?: QueueAction;
      config?: AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
    };

    // 1. Offline-queued mutations – return a synthetic accepted response
    if (axiosError.__offline_queued) {
      return {
        data: { queued: true, actionId: axiosError.__action?.id, unsignedXdr: '' },
        status: 202,
        statusText: 'Accepted (queued offline)',
        headers: {},
        config: axiosError.config,
      };
    }

    const original = axiosError.config;
    const status = axiosError.response?.status;
    const method = original?.method?.toLowerCase();

    // 2. Token refresh – 401 handling
    if (status === 401 && original && !original._retry) {
      original._retry = true;

      if (!refreshInFlight) {
        refreshInFlight = performRefresh().finally(() => {
          refreshInFlight = null;
        });
      }

      const newToken = await refreshInFlight;

      if (!newToken) {
        captureServiceError('api', 'refresh_failed', axiosError);
        router.replace('/(auth)/sign-in');
        return Promise.reject(
          new ApiClientError({
            code: ApiErrorCode.UNAUTHORIZED,
            statusCode: 401,
            message: 'Session expired – refresh failed',
            userMessage: 'Your session has expired. Please sign in again.',
            cause: axiosError,
          }),
        );
      }

      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
      return api.request(original);
    }

    // 3. Exponential backoff retry for transient errors on idempotent methods
    if (
      original &&
      isIdempotentMethod(method) &&
      isNetworkOrServerError(status) &&
      (original._retryCount ?? 0) < MAX_RETRIES
    ) {
      const attempt = original._retryCount ?? 0;
      original._retryCount = attempt + 1;

      const delayMs = backoffDelay(attempt);

      addBreadcrumb('http.retry', `Retrying ${method?.toUpperCase()} ${original.url}`, {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        delayMs,
        status,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api.request(original);
    }

    // 4. Capture non-401 errors to Sentry (after retries exhausted)
    if (status !== 401) {
      captureServiceError('api', 'response', axiosError);
      addBreadcrumb(
        'http.error',
        `HTTP ${status ?? 'network'} error`,
        { url: original?.url ?? 'unknown', status: status ?? 0 },
        'error',
      );
    }

    // 5. Offline cache fallback for GET requests
    if (method === 'get' && original?.url) {
      const cached = await getFromCache(`GET:${original.url}`);
      if (cached !== null) {
        return {
          data: cached,
          status: 200,
          statusText: 'OK (cached)',
          headers: {},
          config: original,
        };
      }
    }

    // 6. Wrap into typed ApiClientError before rejecting
    return Promise.reject(ApiClientError.fromAxiosError(axiosError));
  },
);

// ---------------------------------------------------------------------------
// Queue action type resolver
// ---------------------------------------------------------------------------

function getActionType(url: string, method: string): QueueActionType {
  if (url.includes('/repay-installment')) return 'REPAY_INSTALLMENT';
  if (url.includes('/loans/create')) return 'CREATE_LOAN';
  if (url.includes('/vouches/submit')) return 'SUBMIT_VOUCH';
  if (url.includes('/liquidity/deposit')) return 'DEPOSIT';
  if (url.includes('/transactions/submit')) return 'SUBMIT_SIGNED_XDR';
  return 'SUBMIT_SIGNED_XDR';
}

export default api;
