import { create } from 'zustand';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { walletService } from '../services/wallet.service';

const STORAGE_KEY = 'stepfi.wallet';

interface StoredWalletState {
  address: string | null;
  sessionId: string | null;
  walletType: 'freighter' | 'lobstr' | null;
}

interface WalletState {
  address: string | null;
  sessionId: string | null;
  walletType: 'freighter' | 'lobstr' | null;
  isConnected: boolean;
  isConnecting: boolean;
  isSigning: boolean;
  error: string | null;
  pairingUri: string | null;

  connectFreighter: () => Promise<void>;
  initLobstrConnection: () => Promise<string>;
  completeLobstrConnection: () => Promise<void>;
  disconnect: () => Promise<void>;
  signXdr: (xdr: string) => Promise<string>;
  hydrate: () => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  address: null,
  sessionId: null,
  walletType: null,
  isConnected: false,
  isConnecting: false,
  isSigning: false,
  error: null,
  pairingUri: null,

  clearError: () => set({ error: null }),

  connectFreighter: async () => {
    set({ isConnecting: true, error: null, pairingUri: null });
    try {
      const { address } = await walletService.connectFreighter();
      set({
        address,
        sessionId: null,
        walletType: 'freighter',
        isConnected: true,
        isConnecting: false,
        error: null,
      });
      await persistState(get());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect Freighter';
      set({ isConnecting: false, error: message });
      throw error;
    }
  },

  initLobstrConnection: async () => {
    set({ isConnecting: true, error: null, pairingUri: null });
    try {
      await walletService.initWalletConnect();
      const uri = await walletService.getLobstrConnectionUri();
      set({ pairingUri: uri });
      return uri;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect Lobstr';
      set({ isConnecting: false, error: message, pairingUri: null });
      throw error;
    }
  },

  completeLobstrConnection: async () => {
    set({ isSigning: true });
    try {
      const result = await walletService.approveLobstrSession();
      set({
        address: result.address,
        sessionId: result.sessionId,
        walletType: 'lobstr',
        isConnected: true,
        isConnecting: false,
        isSigning: false,
        error: null,
        pairingUri: null,
      });
      await persistState(get());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect Lobstr';
      set({
        isConnecting: false,
        isSigning: false,
        error: message,
        pairingUri: null,
      });
      throw error;
    }
  },

  disconnect: async () => {
    const { walletType, sessionId } = get();

    try {
      if (walletType === 'lobstr' && sessionId) {
        await walletService.disconnectLobstr(sessionId);
      }
    } catch {
      // Best-effort disconnect
    }

    set({
      address: null,
      sessionId: null,
      walletType: null,
      isConnected: false,
      isConnecting: false,
      isSigning: false,
      error: null,
      pairingUri: null,
    });

    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEY);
      }
    } catch {
      // Best-effort clear
    }
  },

  signXdr: async (xdr: string) => {
    const { walletType, address, sessionId } = get();

    if (!walletType || !address) {
      throw new Error('No wallet connected. Please connect your wallet first.');
    }

    set({ isSigning: true, error: null });

    try {
      let signedXdr: string;

      if (walletType === 'freighter') {
        signedXdr = await walletService.signWithFreighter(xdr);
      } else if (walletType === 'lobstr') {
        if (!sessionId) {
          throw new Error('Lobstr session not found. Please reconnect.');
        }
        signedXdr = await walletService.signWithLobstr(xdr, sessionId, address);
      } else {
        throw new Error('Unsupported wallet type');
      }

      set({ isSigning: false });
      return signedXdr;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign transaction';
      set({ isSigning: false, error: message });
      throw error;
    }
  },

  hydrate: async () => {
    try {
      const raw =
        Platform.OS === 'web'
          ? localStorage.getItem(STORAGE_KEY)
          : await SecureStore.getItemAsync(STORAGE_KEY);

      if (!raw) return;

      const stored: StoredWalletState = JSON.parse(raw);
      if (!stored.walletType || !stored.address) return;

      if (stored.walletType === 'lobstr' && stored.sessionId) {
        await walletService.initWalletConnect();
        const restored = await walletService.restoreLobstrSession();
        if (restored) {
          set({
            address: restored.address,
            sessionId: restored.sessionId,
            walletType: 'lobstr',
            isConnected: true,
            error: null,
          });
          return;
        }
      }

      if (stored.walletType === 'freighter') {
        set({
          address: stored.address,
          sessionId: null,
          walletType: 'freighter',
          isConnected: true,
          error: null,
        });
      }
    } catch {
      // Silently fail hydration; user can reconnect
    }
  },
}));

async function persistState(state: WalletState): Promise<void> {
  const data: StoredWalletState = {
    address: state.address,
    sessionId: state.sessionId,
    walletType: state.walletType,
  };

  const raw = JSON.stringify(data);
  if (Platform.OS === 'web') {
    localStorage.setItem(STORAGE_KEY, raw);
  } else {
    await SecureStore.setItemAsync(STORAGE_KEY, raw);
  }
}
