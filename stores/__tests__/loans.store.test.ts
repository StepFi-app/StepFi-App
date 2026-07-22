import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Loan } from '../../types/loan.types';

// Mock AsyncStorage before any imports that depend on it
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  getAllKeys: jest.fn(),
  multiRemove: jest.fn(),
}));

// We need to use require for the store because it has module-level persist init
let useLoansStore: typeof import('../loans.store').useLoansStore;
let store: ReturnType<typeof import('../loans.store').useLoansStore>;

function createMockLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: 'loan-1',
    walletAddress: 'GABCDEF123456789',
    vendorId: 'vendor-1',
    totalAmount: 1000,
    remainingBalance: 500,
    status: 'active',
    loanType: 'learner_installment',
    installments: [
      { dueDate: '2026-01-01', amount: 200, paid: false },
      { dueDate: '2026-02-01', amount: 200, paid: false },
      { dueDate: '2026-03-01', amount: 200, paid: false },
      { dueDate: '2026-04-01', amount: 200, paid: false },
      { dueDate: '2026-05-01', amount: 200, paid: false },
    ],
    createdAt: '2025-12-01T00:00:00Z',
    ...overrides,
  };
}

describe('LoansStore — markInstallmentPaid idempotency', () => {
  beforeAll(async () => {
    // Reset mocks before importing the store
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    useLoansStore = (await import('../loans.store')).useLoansStore;
  });

  beforeEach(() => {
    // Reset store state before each test
    useLoansStore.setState({
      loans: [],
      selectedLoan: null,
      isLoading: false,
      simulatedAmount: null,
      simulatedTerm: null,
      processedTxHashes: [],
      pendingTransactions: [],
    });
  });

  describe('markInstallmentPaid', () => {
    it('marks an installment as paid and recalculates remaining balance', () => {
      const loan = createMockLoan();
      useLoansStore.getState().setLoans([loan]);

      useLoansStore.getState().markInstallmentPaid(
        'tx-1',
        'loan-1',
        0, // first installment
      );

      const state = useLoansStore.getState();
      const updatedLoan = state.loans[0];

      // First installment should be paid
      expect(updatedLoan.installments[0].paid).toBe(true);
      expect(updatedLoan.installments[0].paidAt).toBeDefined();

      // Remaining balance should be reduced by the installment amount (200)
      expect(updatedLoan.remainingBalance).toBe(loan.totalAmount - 200);

      // Processed tx hash should be tracked
      expect(state.processedTxHashes).toContain('tx-1');
    });

    it('is idempotent — calling with the same txHash twice does not double-count', () => {
      const loan = createMockLoan();
      useLoansStore.getState().setLoans([loan]);

      // First call
      useLoansStore.getState().markInstallmentPaid('tx-1', 'loan-1', 0);
      const stateAfterFirst = useLoansStore.getState();
      const remainingAfterFirst = stateAfterFirst.loans[0].remainingBalance;

      // Second call with same txHash — should be no-op
      useLoansStore.getState().markInstallmentPaid('tx-1', 'loan-1', 0);
      const stateAfterSecond = useLoansStore.getState();

      expect(stateAfterSecond.loans[0].remainingBalance).toBe(remainingAfterFirst);
      expect(stateAfterSecond.processedTxHashes).toHaveLength(1);
    });

    it('auto-transitions loan status to "paid" when all installments are paid', () => {
      const loan = createMockLoan(); // 5 installments, $200 each
      useLoansStore.getState().setLoans([loan]);

      // Pay all installments with unique tx hashes
      useLoansStore.getState().markInstallmentPaid('tx-1', 'loan-1', 0);
      useLoansStore.getState().markInstallmentPaid('tx-2', 'loan-1', 1);
      useLoansStore.getState().markInstallmentPaid('tx-3', 'loan-1', 2);
      useLoansStore.getState().markInstallmentPaid('tx-4', 'loan-1', 3);
      useLoansStore.getState().markInstallmentPaid('tx-5', 'loan-1', 4);

      const state = useLoansStore.getState();
      expect(state.loans[0].status).toBe('paid');
      expect(state.loans[0].remainingBalance).toBe(0);
      expect(state.loans[0].installments.every((i) => i.paid)).toBe(true);
    });

    it('does not modify other loans when updating', () => {
      const loan1 = createMockLoan({ id: 'loan-1' });
      const loan2 = createMockLoan({ id: 'loan-2', totalAmount: 2000, remainingBalance: 1000 });
      useLoansStore.getState().setLoans([loan1, loan2]);

      useLoansStore.getState().markInstallmentPaid('tx-1', 'loan-1', 0);

      const state = useLoansStore.getState();
      expect(state.loans[1].remainingBalance).toBe(1000); // Unchanged
      expect(state.loans[1].installments.every((i) => !i.paid)).toBe(true);
    });

    it('is a no-op if the loan does not exist', () => {
      useLoansStore.getState().setLoans([createMockLoan()]);

      // Should not throw and should not affect existing loans
      expect(() => {
        useLoansStore.getState().markInstallmentPaid('tx-404', 'nonexistent-loan', 0);
      }).not.toThrow();

      const state = useLoansStore.getState();
      expect(state.loans).toHaveLength(1);
      expect(state.loans[0].installments.every((i) => !i.paid)).toBe(true);
    });
  });

  describe('persistence (partialize)', () => {
    it('persists loans, simulatedAmount, simulatedTerm, and processedTxHashes', async () => {
      // Store persist middleware calls setItem on state changes
      // Set some state
      useLoansStore.getState().setLoans([createMockLoan()]);
      useLoansStore.getState().saveSimulation(5000, 6);
      useLoansStore.getState().markInstallmentPaid('tx-1', 'loan-1', 0);

      // Verify AsyncStorage.setItem was called with the persisted state
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@stepfi/loans-store',
        expect.any(String),
      );

      const savedData = JSON.parse((AsyncStorage.setItem as jest.Mock).mock.calls[0][1]);

      // Should persist these fields
      expect(savedData.state.loans).toHaveLength(1);
      expect(savedData.state.simulatedAmount).toBe(5000);
      expect(savedData.state.simulatedTerm).toBe(6);
      expect(savedData.state.processedTxHashes).toContain('tx-1');
    });
  });
});
