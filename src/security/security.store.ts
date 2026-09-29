import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const LOCKED_KEY = 'stepfi.security.isLocked';
const FAILED_ATTEMPTS_KEY = 'stepfi.security.failedAttempts';

// Mirror of the auth store's storage shape: SecureStore on native, localStorage
// on web. Only the lockout-relevant fields (isLocked, failedAttempts) are
// persisted so the gate cannot be reset by relaunching the app.
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

interface SecurityState {
  isLocked: boolean;
  failedAttempts: number;
  biometricCheckDone: boolean;
  hydrate: () => Promise<void>;
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

  // Restore the persisted lockout state on launch. Must resolve before the app
  // renders so a locked session is not briefly shown as unlocked.
  hydrate: async () => {
    const [lockedRaw, attemptsRaw] = await Promise.all([
      storage.getItem(LOCKED_KEY),
      storage.getItem(FAILED_ATTEMPTS_KEY),
    ]);
    const parsedAttempts = Number.parseInt(attemptsRaw ?? '', 10);
    set({
      isLocked: lockedRaw === 'true',
      failedAttempts: Number.isNaN(parsedAttempts) ? 0 : Math.max(0, parsedAttempts),
    });
  },

  lock: () => {
    set({ isLocked: true });
    void storage.setItem(LOCKED_KEY, 'true');
  },

  unlock: () => {
    set({ isLocked: false, failedAttempts: 0 });
    void storage.setItem(LOCKED_KEY, 'false');
    void storage.setItem(FAILED_ATTEMPTS_KEY, '0');
  },

  incrementFailedAttempts: () =>
    set((state) => {
      const failedAttempts = state.failedAttempts + 1;
      void storage.setItem(FAILED_ATTEMPTS_KEY, String(failedAttempts));
      return { failedAttempts };
    }),

  resetFailedAttempts: () => {
    set({ failedAttempts: 0 });
    void storage.setItem(FAILED_ATTEMPTS_KEY, '0');
  },

  markBiometricCheckDone: () => set({ biometricCheckDone: true }),

  // Cleared on sign-out: drop the persisted lockout so the next user starts fresh.
  reset: () => {
    set({
      isLocked: false,
      failedAttempts: 0,
      biometricCheckDone: false,
    });
    void Promise.all([storage.removeItem(LOCKED_KEY), storage.removeItem(FAILED_ATTEMPTS_KEY)]);
  },
}));
