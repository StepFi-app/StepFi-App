import { useState, useRef, useCallback } from 'react';
import { ScrollView } from 'react-native';
import { liquidityService } from '../../services/liquidity.service';
import { useTransaction } from '../useTransaction';
import { TransactionStatus } from '../../types/transaction.types';
import type { TransactionError } from '../../types/transaction.types';
import { formatCurrency, validateDepositAmount } from './invest-utils';

// Re-exported for backwards compatibility with existing consumers.
export { formatCurrency, validateDepositAmount };

/**
 * Return type for the useInvest hook
 */
export interface UseInvestReturn {
  depositAmount: string;
  scrollViewRef: React.RefObject<ScrollView | null>;
  formatCurrency: (value: string) => string;
  handleAmountChange: (text: string) => void;
  isDepositValid: () => boolean;
  handleDeposit: () => Promise<void>;
  transactionStatus: TransactionStatus;
  transactionHash: string | null;
  transactionError: TransactionError | null;
  resetTransaction: () => void;
}

/**
 * Hook encapsulating the invest/deposit form state and submission flow.
 */
export const useInvest = (): UseInvestReturn => {
  const [depositAmount, setDepositAmount] = useState<string>('');
  const scrollViewRef = useRef<ScrollView>(null);
  const { status, txHash, error, execute, reset } = useTransaction();

  const handleAmountChange = useCallback((text: string): void => {
    let filtered = text.replace(/[$\s,]/g, '');

    filtered = filtered.replace(/[^\d.]/g, '');

    const decimalCount = (filtered.match(/\./g) || []).length;
    if (decimalCount > 1) {
      const parts = filtered.split('.');
      filtered = parts[0] + '.' + parts.slice(1).join('');
    }

    if (filtered.startsWith('0') && filtered.length > 1 && filtered[1] !== '.') {
      filtered = filtered.replace(/^0+/, '');
    }

    if (filtered === '' || filtered === '.') {
      setDepositAmount('');
      return;
    }

    const parts = filtered.split('.');
    if (parts.length > 1 && parts[1].length > 2) {
      filtered = parts[0] + '.' + parts[1].substring(0, 2);
    }

    setDepositAmount(filtered);
  }, []);

  const isDepositValid = useCallback((): boolean => {
    return validateDepositAmount(depositAmount);
  }, [depositAmount]);

  const handleDeposit = useCallback(async (): Promise<void> => {
    if (!isDepositValid()) return;

    try {
      const { unsignedXdr } = await liquidityService.deposit({
        amount: parseFloat(depositAmount),
      });

      await execute(unsignedXdr);
    } catch {
      // Error is handled by useTransaction's internal state
    }
  }, [depositAmount, isDepositValid, execute]);

  return {
    depositAmount,
    scrollViewRef,
    formatCurrency,
    handleAmountChange,
    isDepositValid,
    handleDeposit,
    transactionStatus: status,
    transactionHash: txHash,
    transactionError: error,
    resetTransaction: reset,
  };
};
