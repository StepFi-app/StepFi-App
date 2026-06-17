import { create } from 'zustand';

interface SecurityState {
  isLocked: boolean;
  failedAttempts: number;
  biometricCheckDone: boolean;
  lock: () => void;
  unlock: () => void;
  incrementFailedAttempts: () => void;
  resetFailedAttempts: () => void;
  markBiometricCheckDone: () => void;
  reset: () => void;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  isLocked: false,
  failedAttempts: 0,
  biometricCheckDone: false,

  lock: () => set({ isLocked: true }),

  unlock: () => set({ isLocked: false, failedAttempts: 0 }),

  incrementFailedAttempts: () =>
    set((state) => ({ failedAttempts: state.failedAttempts + 1 })),

  resetFailedAttempts: () => set({ failedAttempts: 0 }),

  markBiometricCheckDone: () => set({ biometricCheckDone: true }),

  reset: () =>
    set({
      isLocked: false,
      failedAttempts: 0,
      biometricCheckDone: false,
    }),
}));
