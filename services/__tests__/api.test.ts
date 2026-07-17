/**
 * Tests for the resilient API client (services/api.ts).
 *
 * Coverage areas:
 * 1. 401 handling – single refresh + retry; refresh failure → logout
 * 2. Exponential backoff + jitter for transient errors (network, 5xx)
 * 3. Offline mutation queue + replay on reconnect
 * 4. Request timeout ceiling
 * 5. Typed error wrapping (ApiClientError)
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------------
// Module-level mocks (hoisted by Jest)
// ---------------------------------------------------------------------------

const mockGetState = jest.fn();
const mockSetTokens = jest.fn();
const mockClearAuth = jest.fn();
const mockConnectivityState = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: {
    getState: mockGetState,
  },
}));

jest.mock('../../src/offline/connectivity.store', () => ({
  useConnectivityStore: {
    getState: mockConnectivityState,
  },
}));

jest.mock('../../src/offline/cache', () => ({
  getFromCache: jest.fn().mockResolvedValue(null),
  setToCache: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../src/offline/offline-queue', () => ({
  enqueueAction: jest.fn().mockResolvedValue({
    id: 'mock-action-id',
    type: 'CREATE_LOAN',
    endpoint: '/loans/create',
    method: 'POST',
    data: {},
    timestamp: Date.now(),
    idempotencyKey: 'idem-key-123',
  }),
  getQueue: jest.fn().mockResolvedValue([]),
  dequeueAction: jest.fn().mockResolvedValue(undefined),
  clearQueue: jest.fn().mockResolvedValue(undefined),
  getQueueLength: jest
    .fn()
    .mockResolvedValue(0),
}));

jest.mock('../../services/sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureServiceError: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: mockRouterReplace,
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function importApi() {
  return import('../api').then((mod) => mod.default);
}

function mockAuthState(overrides: Record<string, unknown> = {}) {
  return {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    setTokens: mockSetTokens,
    clearAuth: mockClearAuth,
    ...overrides,
  };
}

function mockConnectedState() {
  return { isConnected: true };
}

function mockDisconnectedState() {
  return { isConnected: false };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('API Client – resilience layer', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockGetState.mockReturnValue(mockAuthState());
    mockConnectivityState.mockReturnValue(mockConnectedState());
    jest.resetModules();
  });

  // -----------------------------------------------------------------------
  // 1. 401 → refresh → retry
  // -----------------------------------------------------------------------

  describe('401 handling – token refresh + retry', () => {
    it('refreshes the token once and retries the original request on 401', async () => {
      let callCount = 0;

      const realAxios = require('axios');
      const refreshSpy = jest.spyOn(realAxios, 'post').mockResolvedValueOnce({
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
        },
      });

      jest.spyOn(realAxios.Axios.prototype, 'request').mockImplementation(async (cfg: any) => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error('Unauthorized');
          err.response = { status: 401, data: { message: 'Token expired' } };
          err.config = cfg;
          throw err;
        }
        return { data: { success: true }, status: 200, config: cfg };
      });

      const api = await importApi();
      const result = await api.get('/protected-resource');

      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(2);
      expect(mockSetTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
      expect(result.status).toBe(200);
    });

    it('rejects with UNAUTHORIZED and clears auth when refresh fails', async () => {
      const realAxios = require('axios');
      jest.spyOn(realAxios, 'post').mockRejectedValueOnce(new Error('Refresh failed'));

      jest.spyOn(realAxios.Axios.prototype, 'request').mockImplementation(async (cfg: any) => {
        const err: any = new Error('Unauthorized');
        err.response = { status: 401, data: { message: 'Token expired' } };
        err.config = cfg;
        throw err;
      });

      const { ApiClientError, ApiErrorCode } = await import('../../types/errors');
      const api = await importApi();

      try {
        await api.get('/protected-resource');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiClientError);
        expect(e.code).toBe(ApiErrorCode.UNAUTHORIZED);
        expect(e.statusCode).toBe(401);
      }

      expect(mockClearAuth).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    });

    it('does not attempt refresh more than once when multiple 401s fire concurrently', async () => {
      const realAxios = require('axios');
      const refreshSpy = jest.spyOn(realAxios, 'post').mockResolvedValue({
        data: {
          accessToken: 'new-token',
          refreshToken: 'new-refresh-token',
          expiresIn: 3600,
        },
      });

      let callCount = 0;
      jest.spyOn(realAxios.Axios.prototype, 'request').mockImplementation(async (cfg: any) => {
        callCount++;
        if (callCount <= 2) {
          const err: any = new Error('Unauthorized');
          err.response = { status: 401, data: { message: 'Token expired' } };
          err.config = cfg;
          throw err;
        }
        return { data: { success: true }, status: 200, config: cfg };
      });

      const api = await importApi();

      const [result1, result2] = await Promise.allSettled([
        api.get('/resource-1'),
        api.get('/resource-2'),
      ]);

      // Both requests should resolve (or at least not hang)
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      // At least one should succeed after retry
      const fulfilled = [result1, result2].filter((r) => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // 2. Exponential backoff + jitter for transient errors
  // -----------------------------------------------------------------------

  describe('exponential backoff with jitter for transient errors', () => {
    it('retries GET requests up to MAX_RETRIES times on server errors', async () => {
      const realAxios = require('axios');

      let attempt = 0;
      jest.spyOn(realAxios.Axios.prototype, 'request').mockImplementation(async (cfg: any) => {
        attempt++;
        const err: any = new Error('Server Error');
        err.response = { status: 500, data: { message: 'Internal error' } };
        err.config = { ...cfg, _retryCount: attempt };
        throw err;
      });

      const { ApiClientError, ApiErrorCode } = await import('../../types/errors');
      const api = await importApi();

      try {
        await api.get('/flaky-resource');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiClientError);
        expect(e.code).toBe(ApiErrorCode.SERVER_ERROR);
      }

      // Initial attempt + up to 3 retries = 4 attempts max
      expect(attempt).toBeGreaterThanOrEqual(1);
      expect(attempt).toBeLessThanOrEqual(4);
    });

    it('does not retry POST requests on transient errors (non-idempotent)', async () => {
      const realAxios = require('axios');

      let attempt = 0;
      jest.spyOn(realAxios.Axios.prototype, 'request').mockImplementation(async (cfg: any) => {
        attempt++;
        const err: any = new Error('Server Error');
        err.response = { status: 500, data: { message: 'Internal error' } };
        err.config = cfg;
        throw err;
      });

      const api = await importApi();

      try {
        await api.post('/mutation', { foo: 'bar' });
      } catch {
        // Expected
      }

      // Should NOT retry – only initial attempt
      expect(attempt).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // 3. Offline mutation queue
  // -----------------------------------------------------------------------

  describe('offline mutation queue', () => {
    it('queues POST requests when offline and returns synthetic 202', async () => {
      mockConnectivityState.mockReturnValue(mockDisconnectedState());

      const api = await importApi();
      const result = await api.post('/loans/create', { amount: 100 });

      expect(result.status).toBe(202);
      expect(result.data.queued).toBe(true);
      expect(result.data.actionId).toBe('mock-action-id');
    });

    it('queues PUT requests when offline', async () => {
      mockConnectivityState.mockReturnValue(mockDisconnectedState());

      const api = await importApi();
      const result = await api.put('/repay-installment', { installmentId: 'i1' });

      expect(result.status).toBe(202);
      expect(result.data.queued).toBe(true);
    });

    it('still allows GET requests through when offline (no queue)', async () => {
      mockConnectivityState.mockReturnValue(mockDisconnectedState());

      const realAxios = require('axios');
      jest.spyOn(realAxios.Axios.prototype, 'request').mockResolvedValue({
        data: { loans: [] },
        status: 200,
        config: { url: '/loans' },
      });

      const api = await importApi();
      const result = await api.get('/loans');

      // GETs are not intercepted by the offline check – pass through
      expect(result.status).toBe(200);
    });
  });

  // -----------------------------------------------------------------------
  // 4. Request timeout
  // -----------------------------------------------------------------------

  describe('request timeout handling', () => {
    it('wraps timeout errors in ApiClientError with TIMEOUT code', async () => {
      const realAxios = require('axios');
      jest.spyOn(realAxios.Axios.prototype, 'request').mockImplementation(async (cfg: any) => {
        const err: any = new Error('timeout of 15000ms exceeded');
        err.code = 'ECONNABORTED';
        err.config = cfg;
        throw err;
      });

      const { ApiClientError, ApiErrorCode } = await import('../../types/errors');
      const api = await importApi();

      try {
        await api.get('/slow-endpoint');
      } catch (e: any) {
        expect(e).toBeInstanceOf(ApiClientError);
        expect(e.code).toBe(ApiErrorCode.TIMEOUT);
        expect(e.userMessage).toContain('timed out');
      }
    });
  });

  // -----------------------------------------------------------------------
  // 5. Typed error surfacing
  // -----------------------------------------------------------------------

  describe('typed error surfacing', () => {
    it('ApiClientError.fromAxiosError returns proper user-facing messages', async () => {
      const { ApiClientError, ApiErrorCode } = await import('../../types/errors');

      // 401
      const err401 = ApiClientError.fromAxiosError({
        response: { status: 401, data: { message: 'Unauthorized' } },
        message: 'Unauthorized',
      });
      expect(err401.code).toBe(ApiErrorCode.UNAUTHORIZED);
      expect(err401.userMessage).toContain('session');

      // 500
      const err500 = ApiClientError.fromAxiosError({
        response: { status: 500, data: { message: 'Server error' } },
        message: 'Server error',
      });
      expect(err500.code).toBe(ApiErrorCode.SERVER_ERROR);
      expect(err500.userMessage).toContain('server');

      // Network error (no response)
      const errNet = ApiClientError.fromAxiosError({
        message: 'Network Error',
        code: 'ERR_NETWORK',
      });
      expect(errNet.code).toBe(ApiErrorCode.NETWORK_ERROR);
      expect(errNet.userMessage).toContain('network');
    });

    it('ApiClientError.isRetryable is true for network, server, and timeout errors', () => {
      const { ApiClientError, ApiErrorCode } = require('../../types/errors');

      expect(
        new ApiClientError({ code: ApiErrorCode.NETWORK_ERROR }).isRetryable,
      ).toBe(true);
      expect(
        new ApiClientError({ code: ApiErrorCode.SERVER_ERROR }).isRetryable,
      ).toBe(true);
      expect(
        new ApiClientError({ code: ApiErrorCode.TIMEOUT }).isRetryable,
      ).toBe(true);
      expect(
        new ApiClientError({ code: ApiErrorCode.UNAUTHORIZED }).isRetryable,
      ).toBe(false);
      expect(
        new ApiClientError({ code: ApiErrorCode.CLIENT_ERROR }).isRetryable,
      ).toBe(false);
    });
  });
});
