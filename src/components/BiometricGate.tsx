import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';
import { biometricService } from '../security/biometric.service';
import { useSecurityStore } from '../security/security.store';
import { useAuthStore } from '../../stores/auth.store';
import { useUserStore } from '../../stores/user.store';
import { useWalletStore } from '../../stores/wallet.store';

const MAX_FAILED_ATTEMPTS = 3;

type GateMode = 'loading' | 'biometric' | 'pin' | 'error';

export function BiometricGate() {
  const [mode, setMode] = useState<GateMode>('loading');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const unlock = useSecurityStore((s) => s.unlock);

  const clearAuth = useAuthStore((s) => s.clearAuth);
  const clearUser = useUserStore((s) => s.clearUser);
  const setDisconnected = useWalletStore((s) => s.setDisconnected);

  const handleLogout = useCallback(async () => {
    setDisconnected();
    clearUser();
    await clearAuth();
  }, [clearAuth, clearUser, setDisconnected]);

  const handleFailure = useCallback(async () => {
    const store = useSecurityStore.getState();
    const newCount = store.failedAttempts + 1;
    store.incrementFailedAttempts();
    if (newCount >= MAX_FAILED_ATTEMPTS) {
      await handleLogout();
    } else {
      const remaining = MAX_FAILED_ATTEMPTS - newCount;
      setErrorMessage(
        `Verification failed. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
      );
    }
  }, [handleLogout]);

  const handleSuccess = useCallback(() => {
    setPin('');
    setErrorMessage('');
    unlock();
  }, [unlock]);

  const tryBiometric = useCallback(async () => {
    const result = await biometricService.authenticateBiometric();
    if (result.success) {
      handleSuccess();
    } else {
      const hasPinSet = await biometricService.hasPin();
      if (hasPinSet) {
        setMode('pin');
        if (
          result.error !== 'user_cancel' &&
          result.error !== 'USER_CANCELED'
        ) {
          await handleFailure();
        }
      } else {
        setMode('error');
        setErrorMessage('Biometric failed and no PIN is configured.');
      }
    }
  }, [handleSuccess, handleFailure]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { isAvailable, isEnrolled } =
        await biometricService.checkBiometricAvailability();

      if (cancelled) return;

      if (isAvailable && isEnrolled) {
        setMode('biometric');
        tryBiometric();
      } else {
        const hasPinSet = await biometricService.hasPin();
        if (cancelled) return;
        if (hasPinSet) {
          setMode('pin');
        } else {
          setMode('error');
          setErrorMessage(
            'No biometric or PIN configured. Sign out and set up security in Settings.',
          );
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [tryBiometric]);

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4) return;
    setErrorMessage('');

    const isValid = await biometricService.verifyPin(pin);
    if (isValid) {
      handleSuccess();
    } else {
      setPin('');
      await handleFailure();
    }
  }, [pin, handleSuccess, handleFailure]);

  if (mode === 'loading') {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>Preparing...</Text>
      </SafeAreaView>
    );
  }

  if (mode === 'biometric') {
    return (
      <SafeAreaView
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: colors.background }}
      >
        <Text style={{ color: colors.textSecondary }}>
          Authenticating...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: colors.background }}
    >
      <View className="flex-1 items-center justify-center px-8 gap-5">
        <Text
          className="text-2xl font-bold"
          style={{ color: colors.textPrimary }}
        >
          {mode === 'error' ? 'Cannot Unlock' : 'Enter PIN'}
        </Text>

        {errorMessage ? (
          <Text
            className="text-sm text-center"
            style={{ color: colors.error }}
          >
            {errorMessage}
          </Text>
        ) : null}

        {mode === 'pin' ? (
          <>
            <TextInput
              className="w-full text-center text-2xl tracking-widest rounded-xl px-4 py-3"
              style={{
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}
              placeholder="Enter PIN"
              placeholderTextColor={colors.textMuted}
              value={pin}
              onChangeText={setPin}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={6}
              onSubmitEditing={handlePinSubmit}
              autoFocus
            />

            <TouchableOpacity
              className="w-full py-4 rounded-xl items-center justify-center"
              style={{
                backgroundColor: colors.primaryContainer,
                opacity: pin.length >= 4 ? 1 : 0.5,
              }}
              activeOpacity={0.8}
              onPress={handlePinSubmit}
              disabled={pin.length < 4}
            >
              <Text
                className="text-base font-bold"
                style={{ color: colors.background }}
              >
                Unlock
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        <TouchableOpacity
          className="py-3 mt-4"
          onPress={handleLogout}
        >
          <Text
            className="text-sm"
            style={{ color: colors.textMuted }}
          >
            Sign out
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
