import { create } from 'zustand';
import type { LearnerProfile, UserRole } from '../types/user.types';

export interface UserReputation {
  score: number;
  tier: string;
  interestRate: number;
  maxCredit: number;
}

interface UserState {
  profile: LearnerProfile | null;
  reputation: UserReputation | null;
  role: UserRole | null;
  isLoading: boolean;
  setProfile: (profile: LearnerProfile) => void;
  setReputation: (reputation: UserReputation) => void;
  setRole: (role: UserRole) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  reputation: null,
  role: null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),
  setReputation: (reputation) => set({ reputation }),
  setRole: (role) => set({ role }),
  clearUser: () => set({ profile: null, reputation: null, role: null }),
  setLoading: (isLoading) => set({ isLoading }),
}));
