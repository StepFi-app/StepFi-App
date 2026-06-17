import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useCallback, useState } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../stores/auth.store';
import { useSecurityStore } from '../src/security/security.store';
import { biometricService } from '../src/security/biometric.service';
import { BiometricGate } from '../src/components/BiometricGate';
import { useConnectivityStore } from '../src/offline/connectivity.store';
import { processQueue } from '../src/offline/offline-sync';
import { initPromise } from '../src/locales/i18n';
import '../global.css';

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

function useAuthGuard() {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false);
  const hydrate = useAuthStore((s) => s.hydrate);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isLocked = useSecurityStore((s) => s.isLocked);
  const biometricCheckDone = useSecurityStore((s) => s.biometricCheckDone);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const startIdleTimer = useCallback(() => {
    clearIdleTimer();
    idleTimerRef.current = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        useSecurityStore.getState().lock();
      }
    }, IDLE_TIMEOUT_MS);
  }, [clearIdleTimer]);

  useEffect(() => {
    void hydrate();
    initPromise.then(() => setI18nReady(true));
  }, [hydrate]);

  useAuthGuard();

  useEffect(() => {
    if (!isLoading && isAuthenticated && !biometricCheckDone) {
      useSecurityStore.getState().markBiometricCheckDone();
      biometricService.isBiometricsEnabled().then((enabled) => {
        if (enabled) {
          useSecurityStore.getState().lock();
        }
      });
    }

    if (!isAuthenticated) {
      useSecurityStore.getState().reset();
    }
  }, [isLoading, isAuthenticated, biometricCheckDone]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        const elapsed = Date.now() - lastActiveRef.current;
        if (
          elapsed >= IDLE_TIMEOUT_MS &&
          useAuthStore.getState().isAuthenticated
        ) {
          useSecurityStore.getState().lock();
        }
        if (!useSecurityStore.getState().isLocked) {
          startIdleTimer();
        }
      } else if (state === 'background' || state === 'inactive') {
        lastActiveRef.current = Date.now();
        clearIdleTimer();
      }
    });

    return () => subscription.remove();
  }, [startIdleTimer, clearIdleTimer]);

  useEffect(() => {
    if (!isLocked && isAuthenticated) {
      startIdleTimer();
    }
  }, [isLocked, isAuthenticated, startIdleTimer]);

  const prevConnectedRef = useRef(true);

  useEffect(() => {
    NetInfo.fetch().then((state) => {
      useConnectivityStore.getState().setConnected(state.isConnected ?? false);
      useConnectivityStore.getState().setConnectionType(state.type);
      useConnectivityStore.getState().setInternetReachable(state.isInternetReachable);
      prevConnectedRef.current = state.isConnected ?? false;
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected ?? false;
      useConnectivityStore.getState().setConnected(connected);
      useConnectivityStore.getState().setConnectionType(state.type);
      useConnectivityStore.getState().setInternetReachable(state.isInternetReachable);

      if (!prevConnectedRef.current && connected) {
        processQueue().catch(() => {});
      }
      prevConnectedRef.current = connected;
    });

    return () => unsubscribe();
  }, []);

  if (isLoading || !i18nReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      {isLocked && isAuthenticated ? (
        <BiometricGate />
      ) : (
        <View
          style={{ flex: 1 }}
          onTouchStart={() => {
            if (!useSecurityStore.getState().isLocked) {
              startIdleTimer();
            }
          }}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </View>
      )}
    </SafeAreaProvider>
  );
}
