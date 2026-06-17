import { useCallback } from 'react';
import { vouchService } from '../services/vouch.service';
import { useTransaction } from './useTransaction';
import type { UseTransactionReturn } from './useTransaction';
import type { SubmitVouchDto } from '../services/vouch.service';

export interface UseVouchReturn extends UseTransactionReturn {
  submitVouch: (dto: SubmitVouchDto) => Promise<void>;
}

export function useVouch(): UseVouchReturn {
  const { status, txHash, error, execute, reset } = useTransaction();

  const submitVouch = useCallback(
    async (dto: SubmitVouchDto) => {
      if (status !== 'idle') return;

      const { unsignedXdr } = await vouchService.submitVouch(dto);

      await execute(unsignedXdr);
    },
    [status, execute],
  );

  return { status, txHash, error, execute, submitVouch, reset };
}
