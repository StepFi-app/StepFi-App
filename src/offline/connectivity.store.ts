import { create } from 'zustand';

interface ConnectivityState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  setConnected: (connected: boolean) => void;
  setInternetReachable: (reachable: boolean | null) => void;
  setConnectionType: (type: string | null) => void;
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isConnected: true,
  isInternetReachable: null,
  connectionType: null,
  setConnected: (isConnected) => set({ isConnected }),
  setInternetReachable: (isInternetReachable) => set({ isInternetReachable }),
  setConnectionType: (connectionType) => set({ connectionType }),
}));
