import { useCallback } from 'react';
import { loansService } from '../services/loans.service';
import { useTransaction } from './useTransaction';
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

      await execute(unsignedXdr);
    },
    [status, execute],
  );

  return { status, txHash, error, execute, repay, reset };
}
