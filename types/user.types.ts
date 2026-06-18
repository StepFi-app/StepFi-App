export type UserRole = 'learner' | 'sponsor';

export interface LearnerProfile {
  walletAddress: string;
  displayName?: string;
  role?: UserRole;
  school?: string;
  program?: string;
  programType?: string;
  incomeType?: string;
  monthlyIncome?: number;
  country?: string;
  city?: string;
  organization?: string;
  investmentFocus?: string;
  onboardingComplete?: boolean;
}
