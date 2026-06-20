import { useState } from 'react';
import { useUserStore } from '../stores/user.store';
import { useLoansStore } from '../stores/loans.store';

export type AffordabilityStatus = 'green' | 'amber' | 'red';

export interface RepaymentCalculation {
  monthlyRepayment: number;
  totalInterest: number;
  totalRepayment: number;
  debtToIncomeRatio: number;
  status: AffordabilityStatus;
}

export function useLoanSimulator() {
  const reputation = useUserStore((s) => s.reputation);
  const saveSimulationStore = useLoansStore((s) => s.saveSimulation);

  const [income, setIncome] = useState<number>(5000);
  const [desiredLoanAmount, setDesiredLoanAmount] = useState<number>(1000);
  const [selectedTerm, setSelectedTerm] = useState<number>(6);

  const interestRate = reputation?.interestRate ?? 8;

  const calculateRepayment = (amount: number, term: number): RepaymentCalculation => {
    const totalInterest = amount * (interestRate / 100) * (term / 12);
    const totalRepayment = amount + totalInterest;
    const monthlyRepayment = totalRepayment / term;
    
    const debtToIncomeRatio = income > 0 ? monthlyRepayment / income : 0;
    
    let status: AffordabilityStatus = 'green';
    if (debtToIncomeRatio >= 0.30) {
      status = 'red';
    } else if (debtToIncomeRatio >= 0.15) {
      status = 'amber';
    }

    return {
      monthlyRepayment,
      totalInterest,
      totalRepayment,
      debtToIncomeRatio,
      status,
    };
  };

  const repayments = {
    3: calculateRepayment(desiredLoanAmount, 3),
    6: calculateRepayment(desiredLoanAmount, 6),
    12: calculateRepayment(desiredLoanAmount, 12),
  };

  const activeStatus = repayments[selectedTerm as 3 | 6 | 12]?.status ?? 'green';

  const saveSimulation = () => {
    saveSimulationStore(desiredLoanAmount, selectedTerm);
  };

  return {
    income,
    setIncome,
    desiredLoanAmount,
    setDesiredLoanAmount,
    selectedTerm,
    setSelectedTerm,
    interestRate,
    repayments,
    activeStatus,
    saveSimulation,
  };
}
export type UseLoanSimulatorReturn = ReturnType<typeof useLoanSimulator>;
