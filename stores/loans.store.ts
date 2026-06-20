import { create } from 'zustand';
import type { Loan } from '../types/loan.types';

interface LoansState {
  loans: Loan[];
  selectedLoan: Loan | null;
  isLoading: boolean;
  setLoans: (loans: Loan[]) => void;
  selectLoan: (id: string) => void;
  clearLoans: () => void;
  setLoading: (loading: boolean) => void;
  
  // Persisted simulation state
  simulatedAmount: number | null;
  simulatedTerm: number | null;
  saveSimulation: (amount: number, term: number) => void;
}

export const useLoansStore = create<LoansState>((set, get) => ({
  loans: [],
  selectedLoan: null,
  isLoading: false,
  simulatedAmount: null,
  simulatedTerm: null,

  setLoans: (loans) => set({ loans }),

  selectLoan: (id) => {
    const loan = get().loans.find((l) => l.id === id) ?? null;
    set({ selectedLoan: loan });
  },

  clearLoans: () => set({ loans: [], selectedLoan: null }),

  setLoading: (isLoading) => set({ isLoading }),

  saveSimulation: (simulatedAmount, simulatedTerm) => set({ simulatedAmount, simulatedTerm }),
}));
