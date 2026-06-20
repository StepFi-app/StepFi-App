import { isConnected, getPublicKey, signTransaction } from '@stellar/freighter-api';
import SignClient from '@walletconnect/sign-client';
import type { SessionTypes } from '@walletconnect/types';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { config } from '../constants/config';

const SESSION_KEY = 'stepfi.lobstrSession';
const WC_NAMESPACE = 'stellar';
const WC_CHAIN = 'stellar:pubnet:';

interface LobstrSessionData {
  topic: string;
  address: string;
  expiry: number;
}

class WalletService {
  private wcClient: SignClient | null = null;
  private wcInitialized = false;
  private pendingApproval: (() => Promise<SessionTypes.Struct>) | null = null;

  get isWalletConnectReady(): boolean {
    return this.wcInitialized;
  }

  async initWalletConnect(): Promise<void> {
    if (this.wcInitialized) return;

    if (!config.WC_PROJECT_ID) {
      console.warn('WalletConnect project ID not configured');
      return;
    }

    try {
      this.wcClient = await SignClient.init({
        projectId: config.WC_PROJECT_ID,
        metadata: {
          name: config.APP_NAME,
          description: config.APP_TAGLINE,
          url: 'https://stepfi.app',
          icons: ['https://stepfi.app/icon.png'],
        },
      });

      this.wcClient.on('session_delete', (event) => {
        const { useWalletStore } = require('../stores/wallet.store');
        const store = useWalletStore.getState();
        if (store.walletType === 'lobstr' && store.sessionId === event.topic) {
          store.disconnect();
        }
      });

      this.wcClient.on('session_expire', (event) => {
        const { useWalletStore } = require('../stores/wallet.store');
        const store = useWalletStore.getState();
        if (store.walletType === 'lobstr' && store.sessionId === event.topic) {
          store.disconnect();
        }
      });

      this.wcInitialized = true;
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
    }
  }

  async connectFreighter(): Promise<{ address: string }> {
    try {
      const connected = await isConnected();
      if (!connected) {
        throw new Error(
          'Freighter is not connected. Please install the Freighter browser extension.'
        );
      }

      const address = await getPublicKey();
      return { address };
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('Failed to connect to Freighter');
    }
  }

  async signWithFreighter(xdr: string): Promise<string> {
    try {
      const signed = await signTransaction(xdr, {
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      });
      return signed;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('User rejected the signing request');
    }
  }

  async getLobstrConnectionUri(): Promise<string> {
    if (!this.wcClient) {
      await this.initWalletConnect();
      if (!this.wcClient) {
        throw new Error('WalletConnect not initialized');
      }
    }

    const { uri, approval } = await this.wcClient.connect({
      requiredNamespaces: {
        [WC_NAMESPACE]: {
          methods: ['stellar_signXDR', 'stellar_signAndSubmitTransaction'],
          chains: [WC_CHAIN],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    });

    this.pendingApproval = approval;

    if (!uri) {
      throw new Error('Failed to generate WalletConnect URI');
    }

    return uri;
  }

  async approveLobstrSession(
    timeoutMs = 300_000
  ): Promise<{ address: string; sessionId: string }> {
    if (!this.pendingApproval) {
      throw new Error(
        'No pending Lobstr session. Call getLobstrConnectionUri() first.'
      );
    }

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session approval timed out')), timeoutMs);
    });

    try {
      const session = await Promise.race([this.pendingApproval(), timeout]);
      this.pendingApproval = null;

      const stellarNamespace = session.namespaces[WC_NAMESPACE];
      if (!stellarNamespace || stellarNamespace.accounts.length === 0) {
        throw new Error('No Stellar account found in the session');
      }

      const account = stellarNamespace.accounts[0];
      const address = account.split(':').pop() || account;

      const sessionData: LobstrSessionData = {
        topic: session.topic,
        address,
        expiry: session.expiry,
      };

      await this.persistLobstrSession(sessionData);

      return { address, sessionId: session.topic };
    } catch (error) {
      this.pendingApproval = null;
      throw error;
    }
  }

  async signWithLobstr(
    xdr: string,
    sessionId: string,
    publicKey: string
  ): Promise<string> {
    if (!this.wcClient) {
      throw new Error('WalletConnect not initialized');
    }

    try {
      const result = await this.wcClient.request<string>({
        topic: sessionId,
        request: {
          method: 'stellar_signXDR',
          params: { xdr, publicKey },
        },
        chainId: WC_CHAIN,
      });

      return result;
    } catch (error) {
      if (error instanceof Error) throw error;
      throw new Error('User rejected the signing request');
    }
  }

  async disconnectLobstr(sessionId: string): Promise<void> {
    if (!this.wcClient) return;

    try {
      await this.wcClient.disconnect({
        topic: sessionId,
        reason: { code: 6000, message: 'User disconnected' },
      });
    } catch {
      // Session may already be invalid
    }

    await this.clearLobstrSession();
  }

  async restoreLobstrSession(): Promise<{
    address: string;
    sessionId: string;
  } | null> {
    if (!this.wcClient) return null;

    try {
      const raw = await this.getLobstrSession();
      if (!raw) return null;

      const data: LobstrSessionData = JSON.parse(raw);
      const now = Math.floor(Date.now() / 1000);

      if (data.expiry <= now) {
        await this.clearLobstrSession();
        return null;
      }

      const session = this.wcClient.session.get(data.topic);
      if (!session) {
        await this.clearLobstrSession();
        return null;
      }

      return { address: data.address, sessionId: data.topic };
    } catch {
      await this.clearLobstrSession();
      return null;
    }
  }

  private async persistLobstrSession(
    data: LobstrSessionData
  ): Promise<void> {
    const raw = JSON.stringify(data);
    if (Platform.OS === 'web') {
      localStorage.setItem(SESSION_KEY, raw);
    } else {
      await SecureStore.setItemAsync(SESSION_KEY, raw);
    }
  }

  private async getLobstrSession(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(SESSION_KEY);
    }
    return SecureStore.getItemAsync(SESSION_KEY);
  }

  private async clearLobstrSession(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(SESSION_KEY);
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  }
}

export const walletService = new WalletService();
