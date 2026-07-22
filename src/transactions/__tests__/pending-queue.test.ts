import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const QUEUE_KEY = '@stepfi/pending-transactions';

function createMockQueue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-id-1',
    txHash: '0xabc123def456',
    type: 'REPAYMENT',
    targetLoanId: 'loan-1',
    targetInstallmentIndex: 0,
    amount: 100,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    retryCount: 0,
    ...overrides,
  };
}

describe('pendingQueue', () => {
  let pendingQueue: typeof import('../pending-queue').pendingQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
  });

  beforeAll(async () => {
    pendingQueue = (await import('../pending-queue')).pendingQueue;
  });

  describe('add', () => {
    it('persists a new pending transaction to the queue', async () => {
      mockGetItem.mockResolvedValue(JSON.stringify([]));

      const entry = await pendingQueue.add({
        txHash: '0xabc',
        type: 'REPAYMENT',
        targetLoanId: 'loan-1',
        targetInstallmentIndex: 0,
        amount: 100,
      });

      expect(entry.id).toBeDefined();
      expect(entry.txHash).toBe('0xabc');
      expect(entry.type).toBe('REPAYMENT');
      expect(entry.targetLoanId).toBe('loan-1');
      expect(entry.status).toBe('pending');
      expect(entry.retryCount).toBe(0);
      expect(mockSetItem).toHaveBeenCalledTimes(1);
      expect(mockSetItem).toHaveBeenCalledWith(
        QUEUE_KEY,
        expect.any(String),
      );
    });

    it('appends to existing queue entries', async () => {
      const existing = [createMockQueue({ id: 'existing-1' })];
      mockGetItem.mockResolvedValue(JSON.stringify(existing));

      await pendingQueue.add({
        txHash: '0xnew',
        type: 'LOAN_CREATION',
      });

      const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(saved).toHaveLength(2);
      expect(saved[0].id).toBe('existing-1');
      expect(saved[1].txHash).toBe('0xnew');
    });
  });

  describe('updateStatus', () => {
    it('updates status, retryCount, and lastPolledAt for an existing entry', async () => {
      const entry = createMockQueue({ id: 'tx-1' });
      mockGetItem.mockResolvedValue(JSON.stringify([entry]));

      const result = await pendingQueue.updateStatus('tx-1', 'confirmed', undefined, 5000);

      expect(result).toBe(true);
      const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(saved[0].status).toBe('confirmed');
      expect(saved[0].lastPolledAt).toBe(5000);
      expect(saved[0].updatedAt).toBeGreaterThan(entry.updatedAt);
    });

    it('returns false if the entry does not exist', async () => {
      mockGetItem.mockResolvedValue(JSON.stringify([]));
      const result = await pendingQueue.updateStatus('nonexistent', 'confirmed');
      expect(result).toBe(false);
    });

    it('increments retryCount when provided', async () => {
      const entry = createMockQueue({ id: 'tx-1', retryCount: 2 });
      mockGetItem.mockResolvedValue(JSON.stringify([entry]));

      await pendingQueue.updateStatus('tx-1', 'pending', 3, Date.now());
      const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(saved[0].retryCount).toBe(3);
    });
  });

  describe('remove', () => {
    it('removes an entry by id', async () => {
      const entries = [
        createMockQueue({ id: 'tx-1' }),
        createMockQueue({ id: 'tx-2' }),
      ];
      mockGetItem.mockResolvedValue(JSON.stringify(entries));

      await pendingQueue.remove('tx-1');
      const saved = JSON.parse(mockSetItem.mock.calls[0][1]);
      expect(saved).toHaveLength(1);
      expect(saved[0].id).toBe('tx-2');
    });
  });

  describe('get / getByTxHash', () => {
    it('retrieves an entry by id', async () => {
      const entries = [createMockQueue({ id: 'tx-1' })];
      mockGetItem.mockResolvedValue(JSON.stringify(entries));

      const result = await pendingQueue.get('tx-1');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('tx-1');
    });

    it('retrieves an entry by txHash', async () => {
      const entries = [createMockQueue({ id: 'tx-1', txHash: '0xhaha' })];
      mockGetItem.mockResolvedValue(JSON.stringify(entries));

      const result = await pendingQueue.getByTxHash('0xhaha');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('tx-1');
    });
  });

  describe('getAll / getPending', () => {
    it('returns all entries', async () => {
      const entries = [
        createMockQueue({ id: 'tx-1', status: 'pending' }),
        createMockQueue({ id: 'tx-2', status: 'confirmed' }),
        createMockQueue({ id: 'tx-3', status: 'failed' }),
      ];
      mockGetItem.mockResolvedValue(JSON.stringify(entries));

      const all = await pendingQueue.getAll();
      expect(all).toHaveLength(3);
    });

    it('returns only pending entries', async () => {
      const entries = [
        createMockQueue({ id: 'tx-1', status: 'pending' }),
        createMockQueue({ id: 'tx-2', status: 'confirmed' }),
        createMockQueue({ id: 'tx-3', status: 'pending' }),
      ];
      mockGetItem.mockResolvedValue(JSON.stringify(entries));

      const pendings = await pendingQueue.getPending();
      expect(pendings).toHaveLength(2);
      expect(pendings.every((t: { status: string }) => t.status === 'pending')).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('returns counts grouped by status', async () => {
      const entries = [
        createMockQueue({ id: 'tx-1', status: 'pending' }),
        createMockQueue({ id: 'tx-2', status: 'confirmed' }),
        createMockQueue({ id: 'tx-3', status: 'failed' }),
        createMockQueue({ id: 'tx-4', status: 'pending' }),
        createMockQueue({ id: 'tx-5', status: 'expired' }),
      ];
      mockGetItem.mockResolvedValue(JSON.stringify(entries));

      const summary = await pendingQueue.getSummary();
      expect(summary).toEqual({
        total: 5,
        pending: 2,
        confirmed: 1,
        failed: 1,
        expired: 1,
      });
    });
  });

  describe('clear', () => {
    it('removes all entries from storage', async () => {
      await pendingQueue.clear();
      expect(mockRemoveItem).toHaveBeenCalledWith(QUEUE_KEY);
    });
  });
});
