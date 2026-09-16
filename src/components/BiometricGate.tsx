import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { signOutService } from '../../services/sign-out.service';

type GateMode = 'loading' | 'biometric' | 'pin' | 'lockout' | 'error';

/** Format remaining ms as "Xm Ys" */
function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function BiometricGate() {
  const [mode, setMode] = useState<GateMode>('loading');
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutCountdown, setLockoutCountdown] = useState('');

  const unlock = useSecurityStore((s) => s.unlock);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdownTimer = useCallback(() => {
    if (countdownRef.current !== null) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    clearCountdownTimer();
    try {
      await signOutService.signOut();
    } catch {
      // Best-effort teardown
    }
  }, [clearCountdownTimer]);

  const startLockoutCountdown = useCallback(() => {
    clearCountdownTimer();
    setMode('lockout');

    const tick = () => {
      const remaining = useSecurityStore.getState().getLockoutRemainingMs();
      if (remaining <= 0) {
        clearCountdownTimer();
        setLockoutCountdown('');
        setMode('pin');
        setErrorMessage('');
        return;
      }
      setLockoutCountdown(formatCountdown(remaining));
    };

    tick(); // immediate first tick
    countdownRef.current = setInterval(tick, 1000);
  }, [clearCountdownTimer]);

  const handleFailure = useCallback(async () => {
    await useSecurityStore.getState().incrementFailedAttempts();

    // Check if we're now in lockout
    if (useSecurityStore.getState().getIsLockedOut()) {
      startLockoutCountdown();
    } else {
      const { failedAttempts } = useSecurityStore.getState();
      const remaining = Math.max(0, 6 - failedAttempts); // show remaining before max lockout
      setErrorMessage(
        `Verification failed. ${remaining} attempt${remaining !== 1 ? 's' : ''} before lockout.`,
      );
    }
  }, [startLockoutCountdown]);

  const handleSuccess = useCallback(async () => {
    clearCountdownTimer();
    setPin('');
    setErrorMessage('');
    await unlock();
  }, [unlock, clearCountdownTimer]);

  const tryBiometric = useCallback(async () => {
    const result = await biometricService.authenticateBiometric();
    if (result.success) {
      await handleSuccess();
    } else {
      const hasPinSet = await biometricService.hasPin();
      if (hasPinSet) {
        // Check lockout before allowing PIN entry
        if (useSecurityStore.getState().getIsLockedOut()) {
          startLockoutCountdown();
        } else {
          setMode('pin');
        }
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
  }, [handleSuccess, handleFailure, startLockoutCountdown]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Check if already in lockout
      if (useSecurityStore.getState().getIsLockedOut()) {
        if (!cancelled) startLockoutCountdown();
        return;
      }

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
      clearCountdownTimer();
    };
  }, [tryBiometric, startLockoutCountdown, clearCountdownTimer]);

  const handlePinSubmit = useCallback(async () => {
    if (pin.length < 4) return;
    setErrorMessage('');

    // Double-check lockout before verifying
    if (useSecurityStore.getState().getIsLockedOut()) {
      startLockoutCountdown();
      return;
    }

    const isValid = await biometricService.verifyPin(pin);
    if (isValid) {
      await handleSuccess();
    } else {
      setPin('');
      await handleFailure();
    }
  }, [pin, handleSuccess, handleFailure, startLockoutCountdown]);

  // ── Loading ──
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

  // ── Biometric prompt ──
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

  // ── Lockout screen ──
  if (mode === 'lockout') {
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
            Too Many Attempts
          </Text>

          <Text
            className="text-sm text-center"
            style={{ color: colors.textSecondary }}
          >
            Please wait before trying again.
          </Text>

          <View
            className="rounded-2xl px-8 py-5 items-center"
            style={{ backgroundColor: colors.warningDim }}
          >
            <Text
              className="text-3xl font-bold font-mono"
              style={{ color: colors.warning }}
            >
              {lockoutCountdown}
            </Text>
          </View>

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

  // ── PIN entry / error ──
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
