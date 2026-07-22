import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Loan } from '../types/loan.types';
import type { PendingTransaction } from '../types/transaction.types';

/** Maximum number of processed tx hashes kept in the persisted store to prevent unbounded growth. */
const MAX_PROCESSED_HASHES = 200;

interface LoansState {
  loans: Loan[];
  selectedLoan: Loan | null;
  isLoading: boolean;
  setLoans: (loans: Loan[]) => void;
  selectLoan: (id: string) => void;
  clearLoans: () => void;
  setLoading: (loading: boolean) => void;

  // ─── Persisted simulation state ────────────────────────────────────────
  simulatedAmount: number | null;
  simulatedTerm: number | null;
  saveSimulation: (amount: number, term: number) => void;

  // ─── Idempotent updates ───────────────────────────────────────────────
  /** Set of tx hashes that have already been reconciled so we never double‑count. */
  processedTxHashes: string[];

  /**
   * Idempotently mark an installment as paid.  If `txHash` has already been
   * processed this is a no‑op, preventing double‑counting on reconnect.
   */
  markInstallmentPaid: (
    txHash: string,
    loanId: string,
    installmentIndex: number,
  ) => void;

  // ─── Pending transaction sync ──────────────────────────────────────────
  pendingTransactions: PendingTransaction[];
  setPendingTransactions: (txns: PendingTransaction[]) => void;
}

export const useLoansStore = create<LoansState>()(
  persist(
    (set, get) => ({
      loans: [],
      selectedLoan: null,
      isLoading: false,
      simulatedAmount: null,
      simulatedTerm: null,

      processedTxHashes: [],
      pendingTransactions: [],

      setLoans: (loans) => set({ loans }),

      selectLoan: (id) => {
        const loan = get().loans.find((l) => l.id === id) ?? null;
        set({ selectedLoan: loan });
      },

      clearLoans: () =>
        set({
          loans: [],
          selectedLoan: null,
          pendingTransactions: [],
          processedTxHashes: [],
        }),

      setLoading: (isLoading) => set({ isLoading }),

      saveSimulation: (simulatedAmount, simulatedTerm) =>
        set({ simulatedAmount, simulatedTerm }),

      markInstallmentPaid: (txHash, loanId, installmentIndex) => {
        const state = get();

        // Idempotency guard — skip if we already processed this tx hash
        if (state.processedTxHashes.includes(txHash)) return;

        const updatedLoans = state.loans.map((loan) => {
          if (loan.id !== loanId) return loan;

          const updatedInstallments = loan.installments.map((inst, idx) => {
            if (idx !== installmentIndex) return inst;
            return { ...inst, paid: true, paidAt: new Date().toISOString() };
          });

          // Recalculate remaining balance
          const paidTotal = updatedInstallments
            .filter((i) => i.paid)
            .reduce((sum, i) => sum + i.amount, 0);
          const remainingBalance = loan.totalAmount - paidTotal;

          // Auto‑transition status if fully paid
          const allPaid = updatedInstallments.every((i) => i.paid);
          const status = allPaid ? ('paid' as const) : loan.status;

          return {
            ...loan,
            installments: updatedInstallments,
            remainingBalance: Math.max(0, remainingBalance),
            status,
          };
        });

        // Keep the processed list bounded — trim oldest entries if over limit
        const updatedHashes = [...state.processedTxHashes, txHash];
        const trimmedHashes =
          updatedHashes.length > MAX_PROCESSED_HASHES
            ? updatedHashes.slice(updatedHashes.length - MAX_PROCESSED_HASHES)
            : updatedHashes;

        set({
          loans: updatedLoans,
          processedTxHashes: trimmedHashes,
        });
      },

      setPendingTransactions: (pendingTransactions) => set({ pendingTransactions }),
    }),
    {
      name: '@stepfi/loans-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields — derived / transient state stays in memory
      partialize: (state) => ({
        loans: state.loans,
        simulatedAmount: state.simulatedAmount,
        simulatedTerm: state.simulatedTerm,
        processedTxHashes: state.processedTxHashes,
        pendingTransactions: state.pendingTransactions,
      }),
    },
  ),
);
