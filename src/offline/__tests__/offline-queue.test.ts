/**
 * Tests for the offline queue idempotency keys.
 *
 * These are isolated from the API client tests because the real offline-queue
 * module depends on native modules (@react-native-async-storage/async-storage
 * and expo-crypto) that must be mocked at the module level.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

// ---------------------------------------------------------------------------
// Module-level mocks for native dependencies
// ---------------------------------------------------------------------------

const mockAsyncStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockAsyncStorage[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockAsyncStorage[key] = value;
  }),
  removeItem: jest.fn(async (key: string) => {
    delete mockAsyncStorage[key];
  }),
}));

const mockDigestValues: string[] = [];
let mockDigestIndex = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(async () => {
    const next = mockDigestValues[mockDigestIndex] ?? 'default-hash';
    mockDigestIndex++;
    return next;
  }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Offline queue idempotency keys', () => {
  beforeEach(() => {
    // Reset inline storage and digest counter
    Object.keys(mockAsyncStorage).forEach((k) => delete mockAsyncStorage[k]);
    mockDigestIndex = 0;

    // Clear module cache so each test gets fresh imports
    jest.resetModules();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ---- shared mock for the replay test ----
  const mockRequest = jest.fn().mockResolvedValue({ data: { success: true } });

  jest.mock('../../../services/api', () => ({
    __esModule: true,
    default: { request: mockRequest },
  }));

  describe('idempotency key generation', () => {
    it('generates an idempotency key when enqueuing an action', async () => {
      mockDigestValues.push('hash-001');
      const { enqueueAction } = await import('../offline-queue');

      const action = await enqueueAction({
        type: 'CREATE_LOAN',
        endpoint: '/loans/create',
        method: 'POST',
        data: { amount: 100 },
      });

      expect(action.idempotencyKey).toBeDefined();
      expect(typeof action.idempotencyKey).toBe('string');
      expect(action.idempotencyKey.length).toBeGreaterThan(0);
    });

    it('generates different keys for actions with different payloads', async () => {
      mockDigestValues.push('hash-abc', 'hash-def');
      const { enqueueAction, clearQueue } = await import('../offline-queue');

      const action1 = await enqueueAction({
        type: 'CREATE_LOAN',
        endpoint: '/loans/create',
        method: 'POST',
        data: { amount: 100 },
      });

      const action2 = await enqueueAction({
        type: 'CREATE_LOAN',
        endpoint: '/loans/create',
        method: 'POST',
        data: { amount: 200 },
      });

      expect(action1.idempotencyKey).not.toBe(action2.idempotencyKey);
      await clearQueue();
    });

    it('generates different keys for the same payload enqueued at different times', async () => {
      mockDigestValues.push('hash-aaa', 'hash-aaa'); // Same hash – key still differs due to random prefix
      const { enqueueAction, clearQueue } = await import('../offline-queue');

      const action1 = await enqueueAction({
        type: 'CREATE_LOAN',
        endpoint: '/loans/create',
        method: 'POST',
        data: { amount: 100 },
      });

      const action2 = await enqueueAction({
        type: 'CREATE_LOAN',
        endpoint: '/loans/create',
        method: 'POST',
        data: { amount: 100 },
      });

      // Even with identical payloads, the random prefix ensures different keys
      expect(action1.idempotencyKey).not.toBe(action2.idempotencyKey);
      await clearQueue();
    });
  });

  describe('offline sync sends idempotency key', () => {
    it('passes Idempotency-Key header when replaying queued actions', async () => {
      mockDigestValues.push('hash-replay-001');
      const { enqueueAction } = await import('../offline-queue');
      const { processQueue } = await import('../offline-sync');

      const action = await enqueueAction({
        type: 'REPAY_INSTALLMENT',
        endpoint: '/repay-installment',
        method: 'POST',
        data: { installmentId: 'i1', amount: 50 },
      });

      expect(action.idempotencyKey).toBeTruthy();

      await processQueue();

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: '/repay-installment',
          headers: expect.objectContaining({
            'Idempotency-Key': action.idempotencyKey,
          }),
        }),
      );
    });
  });
});
