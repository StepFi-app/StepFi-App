import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { router } from 'expo-router';
import { config } from '../constants/config';
import { useAuthStore } from '../stores/auth.store';
import { addBreadcrumb, captureServiceError } from './sentry';

const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use((req) => {
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

  return req;
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
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequest | undefined;
    const status = error.response?.status;

    // Capture non-401 errors to Sentry (401s are expected during token refresh)
    if (status !== 401) {
      captureServiceError('api', 'response', error);
      addBreadcrumb('http.error', `HTTP ${status ?? 'network'} error`, {
        url: original?.url ?? 'unknown',
        status: status ?? 0,
      }, 'error');
    }

    if (status !== 401 || !original || original._retry) {
      return Promise.reject(error);
    }

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
  },
);

export default api;
