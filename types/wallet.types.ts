export interface WalletSessionInfo {
  topic: string;
  publicKey: string;
  walletName: string;
  walletIcon?: string;
  connectedAt: string;
  expiry: number;
  isHealthy: boolean;
}

export interface StoredSession {
  topic: string;
  publicKey: string;
  walletName: string;
  walletIcon?: string;
  connectedAt: string;
  expiry: number;
}

export type WalletConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';

export interface WalletEvent {
  type:
    | 'session_proposal'
    | 'session_request'
    | 'session_delete'
    | 'session_expire'
    | 'session_ping'
    | 'session_update'
    | 'session_connect';
  topic?: string;
  error?: string;
  timestamp: number;
}

export interface SignXdrResult {
  signedXdr: string;
}
