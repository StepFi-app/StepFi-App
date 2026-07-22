import { useCallback } from 'react';
import { loansService } from '../services/loans.service';
import { useTransaction } from './useTransaction';
import { pendingQueue } from '../src/transactions/pending-queue';
import { useLoansStore } from '../stores/loans.store';
import type { UseTransactionReturn } from './useTransaction';

export interface UseRepaymentReturn extends UseTransactionReturn {
  repay: (loanId: string, installmentIndex: number, amount: number) => Promise<void>;
}

export function useRepayment(): UseRepaymentReturn {
  const { status, txHash, error, execute, reset } = useTransaction();

  const repay = useCallback(
    async (loanId: string, installmentIndex: number, amount: number) => {
      if (status !== 'idle') return;

      const { unsignedXdr } = await loansService.repayInstallment(
        loanId,
        installmentIndex,
        amount,
      );

      const result = await execute(unsignedXdr);

      // On successful broadcast, persist the pending tx for background tracking
      if (result?.txHash) {
        const entry = await pendingQueue.add({
          txHash: result.txHash,
          type: 'REPAYMENT',
          targetLoanId: loanId,
          targetInstallmentIndex: installmentIndex,
          amount,
        });

        // Sync into the loans store for live UI updates
        const all = await pendingQueue.getAll();
        useLoansStore.getState().setPendingTransactions(all);
      }
    },
    [status, execute],
  );

  return { status, txHash, error, execute, repay, reset };
}
