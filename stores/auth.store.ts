import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const ACCESS_TOKEN_KEY = 'stepfi.accessToken';
const REFRESH_TOKEN_KEY = 'stepfi.refreshToken';
const WALLET_KEY = 'stepfi.walletAddress';

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

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  walletAddress: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setWallet: (address: string) => Promise<void>;
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  walletAddress: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    const [accessToken, refreshToken, walletAddress] = await Promise.all([
      storage.getItem(ACCESS_TOKEN_KEY),
      storage.getItem(REFRESH_TOKEN_KEY),
      storage.getItem(WALLET_KEY),
    ]);
    set({
      accessToken,
      refreshToken,
      walletAddress,
      isAuthenticated: Boolean(accessToken && refreshToken),
      isLoading: false,
    });
  },

  setTokens: async (access, refresh) => {
    await Promise.all([
      storage.setItem(ACCESS_TOKEN_KEY, access),
      storage.setItem(REFRESH_TOKEN_KEY, refresh),
    ]);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  setWallet: async (address) => {
    await storage.setItem(WALLET_KEY, address);
    set({ walletAddress: address });
  },

  clearAuth: async () => {
    await Promise.all([
      storage.removeItem(ACCESS_TOKEN_KEY),
      storage.removeItem(REFRESH_TOKEN_KEY),
      storage.removeItem(WALLET_KEY),
    ]);
    set({
      accessToken: null,
      refreshToken: null,
      walletAddress: null,
      isAuthenticated: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
