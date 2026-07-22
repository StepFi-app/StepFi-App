import { transactionsService } from '../../services/transactions.service';
import { addBreadcrumb } from '../../services/sentry';
import { pendingQueue } from './pending-queue';
import { useLoansStore } from '../../stores/loans.store';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Base interval in ms before the first retry. */
const BASE_INTERVAL_MS = 2_000;

/** Maximum interval cap so we don't keep polling forever at high frequency. */
const MAX_INTERVAL_MS = 60_000;

/** How many consecutive failures before we give up on a tx and mark expired. */
const MAX_RETRIES = 15;

/** Key under which the poller stores its timer id on the global scope. */
const POLLER_TIMER_KEY = '__stepfi_tx_poller_timer';

// ─── Concurrency Guard ────────────────────────────────────────────────────────

/** Per‑tx lock to prevent the same tx from being polled concurrently. */
const inFlightLocks = new Map<string, Promise<void>>();

/**
 * Execute `fn` for a given tx id, ensuring only one poll at a time per tx.
 * Concurrent calls for the same id will await the in‑flight promise.
 */
async function withLock(txId: string, fn: () => Promise<void>): Promise<void> {
  const existing = inFlightLocks.get(txId);
  if (existing) {
    // Already being polled — wait for the in‑flight attempt to complete
    return existing;
  }

  const promise = fn().finally(() => {
    // Only clean up if our promise is still the one in the map
    if (inFlightLocks.get(txId) === promise) {
      inFlightLocks.delete(txId);
    }
  });

  inFlightLocks.set(txId, promise);
  return promise;
}

// ─── Backoff Calculation ──────────────────────────────────────────────────────

function getBackoffDelay(retryCount: number): number {
  const delay = Math.min(BASE_INTERVAL_MS * 2 ** retryCount, MAX_INTERVAL_MS);
  return delay;
}

// ─── Polling Logic ────────────────────────────────────────────────────────────

/**
 * Poll a single pending transaction.  If the API returns a terminal status the
 * queue entry is updated and the loan store is reconciled idempotently.
 */
async function pollOne(tx: {
  id: string;
  txHash: string;
  targetLoanId?: string;
  targetInstallmentIndex?: number;
  amount?: number;
}): Promise<void> {
  try {
    const result = await transactionsService.getTxStatus(tx.txHash);

    switch (result.status) {
      case 'confirmed': {
        await pendingQueue.updateStatus(tx.id, 'confirmed', undefined, Date.now());
        addBreadcrumb('tx.poller', 'Tx confirmed', {
          txHash: tx.txHash,
          loanId: tx.targetLoanId,
        });

        // Sync updated pending list into the store for live UI
        const updated = await pendingQueue.getPending();
        useLoansStore.getState().setPendingTransactions(
          await pendingQueue.getAll(),
        );

        // Idempotent loan‑store update — pass txHash as idempotency key
        if (tx.targetLoanId && tx.targetInstallmentIndex !== undefined) {
          useLoansStore.getState().markInstallmentPaid(
            tx.txHash,
            tx.targetLoanId,
            tx.targetInstallmentIndex,
          );
        }
        break;
      }

      case 'failed': {
        await pendingQueue.updateStatus(tx.id, 'failed', 0, Date.now());
        addBreadcrumb('tx.poller', 'Tx failed', {
          txHash: tx.txHash,
          message: result.message,
        });

        useLoansStore.getState().setPendingTransactions(
          await pendingQueue.getAll(),
        );
        break;
      }

      case 'expired': {
        await pendingQueue.updateStatus(tx.id, 'expired', 0, Date.now());
        addBreadcrumb('tx.poller', 'Tx expired', {
          txHash: tx.txHash,
        });

        useLoansStore.getState().setPendingTransactions(
          await pendingQueue.getAll(),
        );
        break;
      }

      case 'pending':
      default: {
        // Still pending — increment retry count for backoff
        const entry = await pendingQueue.get(tx.id);
        if (!entry) return;
        const nextRetry = entry.retryCount + 1;
        await pendingQueue.updateStatus(tx.id, 'pending', nextRetry, Date.now());

        // If we have exceeded the max retries, mark as expired
        if (nextRetry >= MAX_RETRIES) {
          await pendingQueue.updateStatus(tx.id, 'expired', nextRetry, Date.now());
          addBreadcrumb('tx.poller', 'Max retries reached — expired', {
            txHash: tx.txHash,
            retries: nextRetry,
          });

          useLoansStore.getState().setPendingTransactions(
            await pendingQueue.getAll(),
          );
        }
        break;
      }
    }
  } catch {
    // Network-level error — increment retry and let the scheduler re‑visit
    const entry = await pendingQueue.get(tx.id);
    if (!entry) return;
    const nextRetry = entry.retryCount + 1;
    await pendingQueue.updateStatus(tx.id, 'pending', nextRetry, Date.now());
  }
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Execute a single sweep of the pending queue: poll each pending tx at its
 * current backoff interval.  Entries that are not yet due for a retry are
 * skipped.
 */
async function sweep(): Promise<void> {
  const pendings = await pendingQueue.getPending();
  if (pendings.length === 0) return;

  const now = Date.now();

  for (const tx of pendings) {
    const delay = getBackoffDelay(tx.retryCount);
    const elapsed = tx.lastPolledAt ? now - tx.lastPolledAt : Infinity;

    // Only poll this tx if enough time has passed since the last attempt
    if (elapsed >= delay) {
      // Wrap with concurrency lock to prevent double-polling
      withLock(tx.id, () => pollOne(tx)).catch(() => {});
    }
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

let _active = false;

/**
 * Start the background poller.  It runs a sweep every `BASE_INTERVAL_MS` and
 * automatically stops when the queue is empty.
 */
export function startTxPoller(): void {
  if (_active) return;
  _active = true;

  addBreadcrumb('tx.poller', 'Poller started');

  // @ts-expect-error — storing timer id on global scope for cross‑module access
  globalThis[POLLER_TIMER_KEY] = setInterval(() => {
    sweep().catch(() => {});
  }, BASE_INTERVAL_MS);

  // Also kick off an immediate sweep
  sweep().catch(() => {});
}

/**
 * Stop the background poller.
 */
export function stopTxPoller(): void {
  _active = false;
  // @ts-expect-error
  const timer = globalThis[POLLER_TIMER_KEY] as ReturnType<typeof setInterval> | undefined;
  if (timer !== undefined) {
    clearInterval(timer);
    // @ts-expect-error
    delete globalThis[POLLER_TIMER_KEY];
  }
  addBreadcrumb('tx.poller', 'Poller stopped');
}

// ─── Reconciliation (on app resume) ───────────────────────────────────────────

/**
 * Force‑poll every pending transaction immediately and reconcile loan state.
 * Called when the app returns from background / kill.
 */
export async function reconcilePendingTxs(): Promise<void> {
  addBreadcrumb('tx.poller', 'Reconciliation started');
  const pendings = await pendingQueue.getPending();

  if (pendings.length === 0) {
    addBreadcrumb('tx.poller', 'No pending txs to reconcile');
    return;
  }

  addBreadcrumb('tx.poller', `Reconciling ${pendings.length} pending txs`);

  // Poll all in parallel for fast reconciliation, protected by per-tx locks
  const results = await Promise.allSettled(
    pendings.map((tx) => withLock(tx.id, () => pollOne(tx))),
  );

  const ok = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  addBreadcrumb('tx.poller', 'Reconciliation complete', { ok, failed });
}
