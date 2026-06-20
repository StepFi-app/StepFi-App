import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { LearnerProfile, UserRole } from '../types/user.types';

const PROFILE_KEY = 'stepfi.profile';
const REPUTATION_KEY = 'stepfi.reputation';
const ROLE_KEY = 'stepfi.role';
const ONBOARDING_COMPLETE_KEY = 'stepfi.onboardingComplete';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

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
  onboardingComplete: boolean;
  setProfile: (profile: LearnerProfile) => void;
  setReputation: (reputation: UserReputation) => void;
  setRole: (role: UserRole) => void;
  setOnboardingComplete: (complete: boolean) => void;
  clearUser: () => void;
  setLoading: (loading: boolean) => void;
  hydrate: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  reputation: null,
  role: null,
  isLoading: false,
  onboardingComplete: false,

  setProfile: (profile) => {
    set({ profile });
    void storage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
  setReputation: (reputation) => {
    set({ reputation });
    void storage.setItem(REPUTATION_KEY, JSON.stringify(reputation));
  },
  setRole: (role) => {
    set({ role });
    void storage.setItem(ROLE_KEY, role);
  },
  setOnboardingComplete: (onboardingComplete) => {
    set({ onboardingComplete });
    void storage.setItem(ONBOARDING_COMPLETE_KEY, onboardingComplete.toString());
  },
  clearUser: () => {
    set({ profile: null, reputation: null, role: null, onboardingComplete: false });
    void storage.removeItem(PROFILE_KEY);
    void storage.removeItem(REPUTATION_KEY);
    void storage.removeItem(ROLE_KEY);
    void storage.removeItem(ONBOARDING_COMPLETE_KEY);
  },
  setLoading: (isLoading) => set({ isLoading }),
  hydrate: async () => {
    const [profileStr, reputationStr, role, onboardingCompleteStr] = await Promise.all([
      storage.getItem(PROFILE_KEY),
      storage.getItem(REPUTATION_KEY),
      storage.getItem(ROLE_KEY),
      storage.getItem(ONBOARDING_COMPLETE_KEY),
    ]);

    set({
      profile: profileStr ? JSON.parse(profileStr) : null,
      reputation: reputationStr ? JSON.parse(reputationStr) : null,
      role: (role as UserRole) || null,
      onboardingComplete: onboardingCompleteStr === 'true',
    });
  },
}));
