import api from './api';
import { addBreadcrumb, captureServiceError } from './sentry';
import type { TransactionResult } from '../types/transaction.types';

interface SubmitSignedXdrResponse {
  txHash: string;
}

/**
 * On‑chain status returned by the API for a submitted transaction hash.
 */
export interface TxStatusResponse {
  status: 'pending' | 'confirmed' | 'failed' | 'expired';
  /** Human‑readable message from the chain / API. */
  message?: string;
}

export const transactionsService = {
  async submitSignedXdr(signedXdr: string): Promise<TransactionResult> {
    const res = await api.post<SubmitSignedXdrResponse>('/transactions/submit', {
      signedXdr,
    });
    return { txHash: res.data.txHash, signedXdr };
  },

  /**
   * Poll the API for the on‑chain resolution of a previously submitted tx.
   * Returns the current status and an optional human‑readable message.
   */
  async getTxStatus(txHash: string): Promise<TxStatusResponse> {
    addBreadcrumb('transactions.service', 'Polling tx status', { txHash });
    try {
      const res = await api.get<TxStatusResponse>(`/transactions/${txHash}/status`);
      return res.data;
    } catch (error) {
      captureServiceError('transactions', 'getTxStatus', error);
      // Network errors during polling should be handled gracefully —
      // return 'pending' so the poller retries with backoff.
      return { status: 'pending', message: 'Network error — will retry' };
    }
  },
};
