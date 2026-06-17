import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { config } from '../constants/config';
import { useAuthStore } from '../stores/auth.store';
import { getFromCache, setToCache } from '../src/offline/cache';
import { useConnectivityStore } from '../src/offline/connectivity.store';
import { enqueueAction } from '../src/offline/offline-queue';
import type { QueueAction, QueueActionType } from '../src/offline/offline-queue';
import { addBreadcrumb, captureServiceError } from './sentry';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (req) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    req.headers = req.headers ?? {};
    (req.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
  }

  // Breadcrumb for every outgoing request (URL only, no auth headers)
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

  // Offline mitigation queue
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

interface RetriableRequest extends AxiosRequestConfig {
  _retry?: boolean;
}

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
    }>(`${config.API_BASE_URL}/auth/refresh`, { refreshToken }, { timeout: 10000 });
    await setTokens(res.data.accessToken, res.data.refreshToken);
    return res.data.accessToken;
  } catch {
    await clearAuth();
    return null;
  }
}

api.interceptors.response.use(
  (res) => {
    const method = res.config?.method?.toLowerCase();
    if (method === 'get' && res.config?.url) {
      setToCache(`GET:${res.config.url}`, res.data).catch(() => {});
    }
    return res;
  },
  async (error: any) => {
    // Intercept offline-queued mock items immediately
    if (error?.__offline_queued) {
      return {
        data: { queued: true, actionId: error.__action.id, unsignedXdr: '' },
        status: 202,
        statusText: 'Accepted (queued offline)',
        headers: {},
        config: error.config,
      };
    }

    const original = error.config as RetriableRequest | undefined;
    const status = error.response?.status;

    // Capture non-401 production exceptions to Sentry
    if (status !== 401) {
      captureServiceError('api', 'response', error as AxiosError);
      addBreadcrumb('http.error', `HTTP ${status ?? 'network'} error`, {
        url: original?.url ?? 'unknown',
        status: status ?? 0,
      }, 'error');
    }

    // Handle Token Expiration Refresh Sequence
    if (status === 401 && original && !original._retry) {
      original._retry = true;

      if (!refreshInFlight) {
        refreshInFlight = performRefresh().finally(() => {
          refreshInFlight = null;
        });
      }

      const newToken = await refreshInFlight;

      if (!newToken) {
        router.replace('/(auth)/sign-in');
        return Promise.reject(error);
      }

      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${newToken}`;
      return api.request(original);
    }

    // Offline read strategy fallback for standard broken GET failures
    if (original?.method?.toLowerCase() === 'get' && original?.url) {
      const cached = await getFromCache(`GET:${original.url}`);
      if (cached !== null) {
        return { data: cached, status: 200, statusText: 'OK (cached)', headers: {}, config: original };
      }
    }

    return Promise.reject(error);
  },
);

function getActionType(url: string, method: string): QueueActionType {
  if (url.includes('/repay-installment')) return 'REPAY_INSTALLMENT';
  if (url.includes('/loans/create')) return 'CREATE_LOAN';
  if (url.includes('/vouches/submit')) return 'SUBMIT_VOUCH';
  if (url.includes('/liquidity/deposit')) return 'DEPOSIT';
  if (url.includes('/transactions/submit')) return 'SUBMIT_SIGNED_XDR';
  return 'SUBMIT_SIGNED_XDR';
}

export default api;