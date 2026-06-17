import { create } from 'zustand';
import type { WalletConnectionStatus, WalletSessionInfo, WalletEvent } from '../types/wallet.types';

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  status: WalletConnectionStatus;
  isSigning: boolean;
  sessions: WalletSessionInfo[];
  activeTopic: string | null;
  events: WalletEvent[];
  pairingUri: string | null;
  needsReconnect: boolean;

  setConnected: (publicKey: string) => void;
  setDisconnected: () => void;
  setSigning: (signing: boolean) => void;
  setStatus: (status: WalletConnectionStatus) => void;
  setPairingUri: (uri: string | null) => void;

  addSession: (session: WalletSessionInfo) => void;
  removeSession: (topic: string) => void;
  setSessionHealth: (topic: string, healthy: boolean) => void;
  setActiveTopic: (topic: string) => void;
  switchWallet: (topic: string) => void;

  addEvent: (event: WalletEvent) => void;
  clearEvents: () => void;

  setNeedsReconnect: (needs: boolean) => void;

  signXdr: (unsignedXdr: string) => Promise<string>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  isConnected: false,
  publicKey: null,
  status: 'disconnected',
  isSigning: false,
  sessions: [],
  activeTopic: null,
  events: [],
  pairingUri: null,
  needsReconnect: false,

  setConnected: (publicKey) =>
    set({ isConnected: true, publicKey, status: 'connected', needsReconnect: false }),

  setDisconnected: () =>
    set({
      isConnected: false,
      publicKey: null,
      status: 'disconnected',
      isSigning: false,
      sessions: [],
      activeTopic: null,
      needsReconnect: false,
    }),

  setSigning: (isSigning) => set({ isSigning }),

  setStatus: (status) => set({ status }),

  setPairingUri: (pairingUri) => set({ pairingUri }),

  addSession: (session) =>
    set((state) => {
      const existing = state.sessions.findIndex((s) => s.topic === session.topic);
      if (existing >= 0) {
        const updated = [...state.sessions];
        updated[existing] = session;
        return { sessions: updated };
      }
      return { sessions: [...state.sessions, session] };
    }),

  removeSession: (topic) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.topic !== topic),
      activeTopic: state.activeTopic === topic ? null : state.activeTopic,
    })),

  setSessionHealth: (topic, healthy) =>
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.topic === topic ? { ...s, isHealthy: healthy } : s,
      ),
    })),

  setActiveTopic: (activeTopic) => set({ activeTopic }),

  switchWallet: (topic) =>
    set((state) => {
      const session = state.sessions.find((s) => s.topic === topic);
      if (!session) return state;
      return {
        activeTopic: topic,
        publicKey: session.publicKey,
        isConnected: true,
        status: 'connected' as const,
      };
    }),

  addEvent: (event) =>
    set((state) => {
      const recent = state.events.slice(-49);
      return { events: [...recent, event] };
    }),

  clearEvents: () => set({ events: [] }),

  setNeedsReconnect: (needsReconnect) => set({ needsReconnect }),

  signXdr: async (unsignedXdr: string) => {
    const state = get();
    const { walletService } = await import('../services/wallet.service');
    const topic = state.activeTopic;
    const pk = state.publicKey;

    if (!topic || !pk) {
      throw new Error('No active wallet session. Please connect your wallet.');
    }

    return walletService.signXdr(topic, unsignedXdr, pk);
  },
}));
