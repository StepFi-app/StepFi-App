import { useEffect } from 'react';
import { useWalletStore } from '../stores/wallet.store';

interface UseWalletReturn {
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
  clearError: () => void;
}

export function useWallet(): UseWalletReturn {
  const address = useWalletStore((s) => s.address);
  const sessionId = useWalletStore((s) => s.sessionId);
  const walletType = useWalletStore((s) => s.walletType);
  const isConnected = useWalletStore((s) => s.isConnected);
  const isConnecting = useWalletStore((s) => s.isConnecting);
  const isSigning = useWalletStore((s) => s.isSigning);
  const error = useWalletStore((s) => s.error);
  const pairingUri = useWalletStore((s) => s.pairingUri);

  const connectFreighter = useWalletStore((s) => s.connectFreighter);
  const initLobstrConnection = useWalletStore((s) => s.initLobstrConnection);
  const completeLobstrConnection = useWalletStore((s) => s.completeLobstrConnection);
  const disconnect = useWalletStore((s) => s.disconnect);
  const signXdr = useWalletStore((s) => s.signXdr);
  const hydrate = useWalletStore((s) => s.hydrate);
  const clearError = useWalletStore((s) => s.clearError);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return {
    address,
    sessionId,
    walletType,
    isConnected,
    isConnecting,
    isSigning,
    error,
    pairingUri,
    connectFreighter,
    initLobstrConnection,
    completeLobstrConnection,
    disconnect,
    signXdr,
    clearError,
  };
}
