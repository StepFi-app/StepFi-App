import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Platform-aware secure storage adapter.
 *
 * Native (iOS / Android): uses expo-secure-store (Keychain / Keystore).
 * Web: falls back to localStorage (no hardware-backed option available).
 *
 * Every security-related value in the app must flow through this adapter
 * so nothing leaks into plain AsyncStorage.
 */
export const secureStorage = {
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
