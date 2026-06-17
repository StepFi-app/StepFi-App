import api from './api';
import type { TransactionResult } from '../types/transaction.types';

interface SubmitSignedXdrResponse {
  txHash: string;
}

export const transactionsService = {
  async submitSignedXdr(signedXdr: string): Promise<TransactionResult> {
    const res = await api.post<SubmitSignedXdrResponse>('/transactions/submit', {
      signedXdr,
    });
    return { txHash: res.data.txHash, signedXdr };
  },
};
