import { useState, useCallback, useEffect, useRef } from 'react';
import { transactionSigner } from '../src/transactions/transaction-signer.service';
import {
  TransactionStatus,
  TransactionError,
  TransactionErrorCode,
} from '../types/transaction.types';
import type { TransactionResult } from '../types/transaction.types';

export interface UseTransactionReturn {
  status: TransactionStatus;
  txHash: string | null;
  error: TransactionError | null;
  execute: (unsignedXdr: string) => Promise<TransactionResult | undefined>;
  reset: () => void;
}

export function useTransaction(): UseTransactionReturn {
  const [status, setStatus] = useState<TransactionStatus>(TransactionStatus.IDLE);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<TransactionError | null>(null);
  const isExecuting = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(
    async (unsignedXdr: string): Promise<TransactionResult | undefined> => {
      if (isExecuting.current) return;

      isExecuting.current = true;
      setStatus(TransactionStatus.SIGNING);
      setError(null);
      setTxHash(null);

      try {
        const result = await transactionSigner.signAndBroadcast(unsignedXdr);

        if (isMounted.current) {
          setTxHash(result.txHash);
          setStatus(TransactionStatus.SUCCESS);
        }

        return result;
      } catch (err) {
        if (isMounted.current) {
          const txError =
            err instanceof TransactionError
              ? err
              : new TransactionError(
                  TransactionErrorCode.UNKNOWN,
                  err instanceof Error ? err.message : 'Transaction failed',
                  err,
                );
          setError(txError);
          setStatus(TransactionStatus.ERROR);
        }
      } finally {
        isExecuting.current = false;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    isExecuting.current = false;
    setStatus(TransactionStatus.IDLE);
    setTxHash(null);
    setError(null);
  }, []);

  return { status, txHash, error, execute, reset };
}
