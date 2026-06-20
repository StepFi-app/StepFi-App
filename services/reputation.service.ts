import api from './api';
import { addBreadcrumb, captureServiceError } from './sentry';

export interface ReputationScore {
  score: number;
  tier: string;
  interestRate: number;
  maxCredit: number;
}

export const reputationService = {
  async getScore(wallet: string): Promise<ReputationScore> {
    addBreadcrumb('reputation.service', 'Fetching reputation score');
    try {
      const res = await api.get<ReputationScore>(`/reputation/${wallet}`);
      addBreadcrumb('reputation.service', 'Reputation score received', {
        tier: res.data.tier,
      });
      return res.data;
    } catch (error) {
      captureServiceError('reputation', 'getScore', error);
      throw error;
    }
  },
};
