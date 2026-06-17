import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useWalletStore } from '../stores/wallet.store';
import { walletService } from '../services/wallet.service';
import type { WalletSessionInfo, WalletConnectionStatus, WalletEvent } from '../types/wallet.types';

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  status: WalletConnectionStatus;
  isSigning: boolean;
  sessions: WalletSessionInfo[];
  activeSession: WalletSessionInfo | null;
  events: WalletEvent[];
  pairingUri: string | null;
  needsReconnect: boolean;
  isInitializing: boolean;
}

interface UseWalletReturn extends WalletState {
  connect: (walletDeepLink?: string) => Promise<void>;
  disconnect: (topic?: string) => Promise<void>;
  switchWallet: (topic: string) => void;
  signXdr: (xdr: string) => Promise<string>;
  clearEvents: () => void;
  retryConnection: () => Promise<void>;
}

function createWalletDeepLink(walletScheme: string, wcUri: string): string {
  const encoded = encodeURIComponent(wcUri);
  if (walletScheme.includes('://')) {
    return `${walletScheme}${walletScheme.endsWith('?') ? '' : '?'}uri=${encoded}`;
  }
  return `${walletScheme}://wc?uri=${encoded}`;
}

export function useWallet(): UseWalletReturn {
  const [isInitializing, setIsInitializing] = useState(true);

  const isConnected = useWalletStore((s) => s.isConnected);
  const publicKey = useWalletStore((s) => s.publicKey);
  const status = useWalletStore((s) => s.status);
  const isSigning = useWalletStore((s) => s.isSigning);
  const sessions = useWalletStore((s) => s.sessions);
  const activeTopic = useWalletStore((s) => s.activeTopic);
  const events = useWalletStore((s) => s.events);
  const pairingUri = useWalletStore((s) => s.pairingUri);
  const needsReconnect = useWalletStore((s) => s.needsReconnect);

  const activeSession = sessions.find((s) => s.topic === activeTopic) ?? null;

  useEffect(() => {
    const init = async () => {
      try {
        await walletService.initialize();
      } catch (error) {
        console.error('Failed to initialize wallet service:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    init();
  }, []);

  const connect = useCallback(async (walletDeepLink?: string) => {
    useWalletStore.getState().setStatus('connecting');

    try {
      const uri = await walletService.getConnectionUri();
      useWalletStore.getState().setPairingUri(uri);

      if (walletDeepLink && Platform.OS !== 'web') {
        const deepLink = createWalletDeepLink(walletDeepLink, uri);
        await Linking.openURL(deepLink);
      }

      await walletService.approveSession();
    } catch (error) {
      useWalletStore.getState().setStatus('error');
      throw error;
    }
  }, []);

  const disconnect = useCallback(async (topic?: string) => {
    const target = topic ?? activeTopic ?? undefined;
    await walletService.disconnect(target);
  }, [activeTopic]);

  const switchWallet = useCallback((topic: string) => {
    walletService.switchWallet(topic);
  }, []);

  const signXdr = useCallback(async (xdr: string) => {
    return useWalletStore.getState().signXdr(xdr);
  }, []);

  const clearEvents = useCallback(() => {
    useWalletStore.getState().clearEvents();
  }, []);

  const retryConnection = useCallback(async () => {
    if (!activeTopic) return;
    useWalletStore.getState().setStatus('reconnecting');
    const recovered = await walletService.tryRecover(activeTopic);
    if (!recovered) {
      useWalletStore.getState().setStatus('disconnected');
      useWalletStore.getState().setNeedsReconnect(true);
    }
  }, [activeTopic]);

  return {
    isConnected,
    publicKey,
    status,
    isSigning,
    sessions,
    activeSession,
    events,
    pairingUri,
    needsReconnect,
    isInitializing,
    connect,
    disconnect,
    switchWallet,
    signXdr,
    clearEvents,
    retryConnection,
  };
}
