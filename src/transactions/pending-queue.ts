import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  PendingTransaction,
  PendingTransactionStatus,
  PendingTransactionType,
} from '../../types/transaction.types';

const QUEUE_KEY = '@stepfi/pending-transactions';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

// ─── Storage ──────────────────────────────────────────────────────────────────

/**
 * Read the full pending‑transaction queue from storage.
 * Returns an empty array on any error.
 */
async function loadAll(): Promise<PendingTransaction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Persist the full queue back to storage.
 */
async function saveAll(txns: PendingTransaction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(txns));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const pendingQueue = {
  /**
   * Add a new pending transaction to the queue.
   * Returns the newly created entry with its auto‑generated id and timestamp.
   */
  async add(tx: {
    txHash: string;
    type: PendingTransactionType;
    targetLoanId?: string;
    targetInstallmentIndex?: number;
    amount?: number;
  }): Promise<PendingTransaction> {
    const queue = await loadAll();
    const entry: PendingTransaction = {
      id: generateId(),
      txHash: tx.txHash,
      type: tx.type,
      targetLoanId: tx.targetLoanId,
      targetInstallmentIndex: tx.targetInstallmentIndex,
      amount: tx.amount,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      retryCount: 0,
    };
    queue.push(entry);
    await saveAll(queue);
    return entry;
  },

  /**
   * Update the status (and optionally retryCount) of a queue entry.
   * Returns `true` if the entry was found and updated, `false` otherwise.
   */
  async updateStatus(
    id: string,
    status: PendingTransactionStatus,
    retryCount?: number,
    lastPolledAt?: number,
  ): Promise<boolean> {
    const queue = await loadAll();
    const idx = queue.findIndex((t) => t.id === id);
    if (idx === -1) return false;

    queue[idx].status = status;
    queue[idx].updatedAt = Date.now();
    if (retryCount !== undefined) queue[idx].retryCount = retryCount;
    if (lastPolledAt !== undefined) queue[idx].lastPolledAt = lastPolledAt;
    await saveAll(queue);
    return true;
  },

  /**
   * Remove an entry from the queue by id.
   */
  async remove(id: string): Promise<void> {
    const queue = await loadAll();
    const filtered = queue.filter((t) => t.id !== id);
    await saveAll(filtered);
  },

  /**
   * Retrieve a single entry by id.
   */
  async get(id: string): Promise<PendingTransaction | null> {
    const queue = await loadAll();
    return queue.find((t) => t.id === id) ?? null;
  },

  /**
   * Retrieve an entry by its on‑chain tx hash.
   */
  async getByTxHash(txHash: string): Promise<PendingTransaction | null> {
    const queue = await loadAll();
    return queue.find((t) => t.txHash === txHash) ?? null;
  },

  /**
   * Return all entries from the queue.
   */
  async getAll(): Promise<PendingTransaction[]> {
    return loadAll();
  },

  /**
   * Return only entries whose status is 'pending' (i.e. still in flight).
   */
  async getPending(): Promise<PendingTransaction[]> {
    const queue = await loadAll();
    return queue.filter((t) => t.status === 'pending');
  },

  /**
   * Return a count of entries grouped by status.
   */
  async getSummary(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    expired: number;
  }> {
    const queue = await loadAll();
    return {
      total: queue.length,
      pending: queue.filter((t) => t.status === 'pending').length,
      confirmed: queue.filter((t) => t.status === 'confirmed').length,
      failed: queue.filter((t) => t.status === 'failed').length,
      expired: queue.filter((t) => t.status === 'expired').length,
    };
  },

  /**
   * Clear all entries (e.g. after a full reconciliation).
   */
  async clear(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },
};
