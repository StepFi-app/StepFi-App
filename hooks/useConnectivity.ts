import { useConnectivityStore } from '../src/offline/connectivity.store';

export function useConnectivity() {
  const isConnected = useConnectivityStore((s) => s.isConnected);
  const connectionType = useConnectivityStore((s) => s.connectionType);
  const isInternetReachable = useConnectivityStore((s) => s.isInternetReachable);

  return { isConnected, connectionType, isInternetReachable };
}
