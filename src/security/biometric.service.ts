import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

const BIOMETRICS_ENABLED_KEY = 'stepfi.biometricsEnabled';
const PIN_HASH_KEY = 'stepfi.pinHash';
const PIN_SALT_KEY = 'stepfi.pinSalt';

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

export interface BiometricStatus {
  isAvailable: boolean;
  isEnrolled: boolean;
}

export type AuthenticationResult =
  | { success: true }
  | { success: false; error: string };

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const biometricService = {
  async checkBiometricAvailability(): Promise<BiometricStatus> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return { isAvailable: false, isEnrolled: false };
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return { isAvailable: true, isEnrolled: enrolled };
    } catch {
      return { isAvailable: false, isEnrolled: false };
    }
  },

  async authenticateBiometric(): Promise<AuthenticationResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock StepFi',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  async isBiometricsEnabled(): Promise<boolean> {
    try {
      const value = await storage.getItem(BIOMETRICS_ENABLED_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  },

  async setBiometricsEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await storage.setItem(BIOMETRICS_ENABLED_KEY, 'true');
    } else {
      await storage.removeItem(BIOMETRICS_ENABLED_KEY);
    }
  },

  async setPin(pin: string): Promise<void> {
    const randomBytes = Crypto.getRandomBytes(16);
    const salt = bytesToHex(randomBytes);
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      salt + pin,
    );
    await Promise.all([
      storage.setItem(PIN_SALT_KEY, salt),
      storage.setItem(PIN_HASH_KEY, hash),
    ]);
  },

  async verifyPin(pin: string): Promise<boolean> {
    try {
      const [storedHash, salt] = await Promise.all([
        storage.getItem(PIN_HASH_KEY),
        storage.getItem(PIN_SALT_KEY),
      ]);
      if (!storedHash || !salt) {
        return false;
      }
      const computedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        salt + pin,
      );
      return computedHash === storedHash;
    } catch {
      return false;
    }
  },

  async hasPin(): Promise<boolean> {
    try {
      const hash = await storage.getItem(PIN_HASH_KEY);
      return hash !== null;
    } catch {
      return false;
    }
  },

  async clearPin(): Promise<void> {
    await Promise.all([
      storage.removeItem(PIN_HASH_KEY),
      storage.removeItem(PIN_SALT_KEY),
    ]);
  },

  async disableBiometrics(): Promise<void> {
    await Promise.all([
      storage.removeItem(BIOMETRICS_ENABLED_KEY),
      storage.removeItem(PIN_HASH_KEY),
      storage.removeItem(PIN_SALT_KEY),
    ]);
  },
};
