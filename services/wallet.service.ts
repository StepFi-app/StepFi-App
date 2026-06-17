import SignClient from '@walletconnect/sign-client';
import type { SessionTypes, SignClientTypes } from '@walletconnect/types';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useWalletStore } from '../stores/wallet.store';
import { config } from '../constants/config';
import type { StoredSession } from '../types/wallet.types';

const SESSIONS_KEY = 'stepfi.walletSessions';

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

class WalletService {
  private static instance: WalletService;
  private client: SignClient | null = null;
  private initialized = false;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  private pendingApproval: (() => Promise<SessionTypes.Struct>) | null = null;

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  get signClient(): SignClient | null {
    return this.client;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!config.WC_PROJECT_ID) {
      console.warn('WalletConnect project ID not configured. Session management disabled.');
      this.initialized = true;
      return;
    }

    try {
      this.client = await SignClient.init({
        projectId: config.WC_PROJECT_ID,
        metadata: {
          name: config.APP_NAME,
          description: config.APP_TAGLINE,
          url: 'https://stepfi.app',
          icons: ['https://stepfi.app/icon.png'],
        },
      });

      this.registerEventHandlers();
      await this.restoreSessions();
      this.startHealthCheck();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      useWalletStore.getState().setStatus('error');
      this.initialized = true;
    }
  }

  private registerEventHandlers(): void {
    if (!this.client) return;

    this.client.on('session_proposal', (event) => {
      useWalletStore.getState().addEvent({
        type: 'session_proposal',
        timestamp: Date.now(),
      });
    });

    this.client.on('session_delete', (event) => {
      const store = useWalletStore.getState();
      store.removeSession(event.topic);
      store.addEvent({ type: 'session_delete', topic: event.topic, timestamp: Date.now() });
      const remaining = store.sessions;
      if (remaining.length === 0) {
        store.setDisconnected();
      }
      this.persistSessions();
    });

    this.client.on('session_expire', (event) => {
      const store = useWalletStore.getState();
      store.removeSession(event.topic);
      store.addEvent({ type: 'session_expire', topic: event.topic, timestamp: Date.now() });
      const remaining = store.sessions;
      if (remaining.length === 0) {
        store.setDisconnected();
      } else if (store.activeTopic === event.topic) {
        const next = remaining[0];
        store.setActiveTopic(next.topic);
        store.setConnected(next.publicKey);
      }
      this.persistSessions();
    });

    this.client.on('session_ping', (event) => {
      useWalletStore.getState().setSessionHealth(event.topic, true);
    });

    this.client.on('session_update', (event) => {
      useWalletStore.getState().addEvent({
        type: 'session_update',
        topic: event.topic,
        timestamp: Date.now(),
      });
    });

    this.client.on('session_connect', (event) => {
      this.handleNewSession(event.session);
    });

    this.client.on('session_request', (_event) => {});
  }

  async getConnectionUri(): Promise<string> {
    if (!this.client) throw new Error('WalletConnect not initialized');

    const { uri, approval } = await this.client.connect({
      requiredNamespaces: {
        stellar: {
          methods: ['stellar_signXDR'],
          chains: ['stellar:pubnet:'],
          events: ['chainChanged', 'accountsChanged'],
        },
      },
    });

    this.pendingApproval = approval;

    if (!uri) throw new Error('Failed to generate WalletConnect URI');

    return uri;
  }

  async approveSession(timeoutMs = 300_000): Promise<SessionTypes.Struct> {
    if (!this.pendingApproval) throw new Error('No pending session approval');

    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Session approval timed out')), timeoutMs);
    });

    try {
      const session = await Promise.race([this.pendingApproval(), timeout]);
      this.pendingApproval = null;
      this.handleNewSession(session);
      return session;
    } catch (error) {
      this.pendingApproval = null;
      useWalletStore.getState().setStatus('error');
      throw error;
    }
  }

  async pair(uri: string): Promise<void> {
    if (!this.client) throw new Error('WalletConnect not initialized');
    await this.client.pair({ uri });
  }

  async disconnect(topic?: string): Promise<void> {
    if (!this.client) return;

    const sessions = this.client.session.getAll();
    const topicToDisconnect = topic ?? (sessions.length > 0 ? sessions[0].topic : undefined);

    if (!topicToDisconnect) return;

    try {
      await this.client.disconnect({
        topic: topicToDisconnect,
        reason: { code: 6000, message: 'User disconnected' },
      });
    } catch {
      const store = useWalletStore.getState();
      store.removeSession(topicToDisconnect);
      const remaining = store.sessions;
      if (remaining.length === 0) {
        store.setDisconnected();
      } else if (store.activeTopic === topicToDisconnect) {
        store.switchWallet(remaining[0].topic);
      }
      this.persistSessions();
    }
  }

  switchWallet(topic: string): void {
    const store = useWalletStore.getState();
    store.switchWallet(topic);
  }

  async signXdr(topic: string, xdr: string, publicKey: string): Promise<string> {
    if (!this.client) throw new Error('WalletConnect not initialized');

    const result = await this.client.request<string>({
      topic,
      request: {
        method: 'stellar_signXDR',
        params: { xdr, publicKey },
      },
      chainId: 'stellar:pubnet:',
    });

    return result;
  }

  async ping(topic: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.ping({ topic });
      useWalletStore.getState().setSessionHealth(topic, true);
      return true;
    } catch {
      useWalletStore.getState().setSessionHealth(topic, false);
      return false;
    }
  }

  async tryRecover(topic: string): Promise<boolean> {
    if (!this.client) return false;

    try {
      await this.client.ping({ topic });
      useWalletStore.getState().setSessionHealth(topic, true);
      return true;
    } catch {
      const store = useWalletStore.getState();
      store.setSessionHealth(topic, false);
      store.addEvent({ type: 'session_expire', topic, timestamp: Date.now() });

      const session = this.client.session.get(topic);
      if (!session || Date.now() >= session.expiry * 1000) {
        store.removeSession(topic);
        const remaining = store.sessions;
        if (remaining.length === 0) {
          store.setDisconnected();
        } else if (store.activeTopic === topic) {
          store.setActiveTopic(remaining[0].topic);
          store.setConnected(remaining[0].publicKey);
        }
        this.persistSessions();
      }

      return false;
    }
  }

  getSessions(): SessionTypes.Struct[] {
    if (!this.client) return [];
    return this.client.session.getAll();
  }

  getSession(topic: string): SessionTypes.Struct | undefined {
    if (!this.client) return undefined;
    return this.client.session.get(topic);
  }

  private handleNewSession(session: SessionTypes.Struct): void {
    const stellarNamespace = session.namespaces.stellar;
    if (!stellarNamespace) return;

    const accounts = stellarNamespace.accounts;
    if (accounts.length === 0) return;

    const account = accounts[0];
    const publicKey = account.split(':').pop() || account;

    const metadata = session.peer.metadata;
    const walletName = metadata.name || 'Unknown Wallet';
    const walletIcon = metadata.icons?.[0];

    const store = useWalletStore.getState();
    store.addSession({
      topic: session.topic,
      publicKey,
      walletName,
      walletIcon,
      connectedAt: new Date().toISOString(),
      expiry: session.expiry,
      isHealthy: true,
    });

    if (!store.activeTopic) {
      store.setActiveTopic(session.topic);
      store.setConnected(publicKey);
    }

    store.addEvent({ type: 'session_connect', topic: session.topic, timestamp: Date.now() });
    this.persistSessions();
  }

  private async persistSessions(): Promise<void> {
    const store = useWalletStore.getState();
    const stored: StoredSession[] = store.sessions.map((s) => ({
      topic: s.topic,
      publicKey: s.publicKey,
      walletName: s.walletName,
      walletIcon: s.walletIcon,
      connectedAt: s.connectedAt,
      expiry: s.expiry,
    }));

    await storage.setItem(SESSIONS_KEY, JSON.stringify(stored));
  }

  private async restoreSessions(): Promise<void> {
    try {
      const raw = await storage.getItem(SESSIONS_KEY);
      if (!raw) return;

      const stored: StoredSession[] = JSON.parse(raw);
      if (!Array.isArray(stored) || stored.length === 0) return;

      const now = Math.floor(Date.now() / 1000);
      const valid = stored.filter((s) => s.expiry > now);

      if (valid.length === 0) {
        await storage.removeItem(SESSIONS_KEY);
        return;
      }

      const store = useWalletStore.getState();
      for (const s of valid) {
        const isHealthy = this.client ? await this.pingHealthy(s.topic) : false;
        store.addSession({
          topic: s.topic,
          publicKey: s.publicKey,
          walletName: s.walletName,
          walletIcon: s.walletIcon,
          connectedAt: s.connectedAt,
          expiry: s.expiry,
          isHealthy,
        });
      }

      if (valid.length > 0 && !store.activeTopic) {
        const first = valid[0];
        store.setActiveTopic(first.topic);
        store.setConnected(first.publicKey);
      }
    } catch {
      await storage.removeItem(SESSIONS_KEY);
    }
  }

  private async pingHealthy(topic: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.ping({ topic });
      return true;
    } catch {
      return false;
    }
  }

  private startHealthCheck(): void {
    this.stopHealthCheck();
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, 60_000);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer !== null) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }

  private async performHealthCheck(): Promise<void> {
    const store = useWalletStore.getState();
    const sessions = store.sessions;

    for (const session of sessions) {
      try {
        if (this.client) {
          await this.client.ping({ topic: session.topic });
          store.setSessionHealth(session.topic, true);
        }
      } catch {
        store.setSessionHealth(session.topic, false);

        const wcSession = this.client?.session.get(session.topic);
        if (wcSession && Date.now() < wcSession.expiry * 1000) {
          const recovered = await this.tryRecover(session.topic);
          if (!recovered) {
            store.addEvent({
              type: 'session_expire',
              topic: session.topic,
              timestamp: Date.now(),
            });
          }
        } else {
          store.removeSession(session.topic);
          const remaining = store.sessions;
          if (remaining.length === 0) {
            store.setDisconnected();
          } else if (store.activeTopic === session.topic) {
            store.setActiveTopic(remaining[0].topic);
            store.setConnected(remaining[0].publicKey);
          }
          this.persistSessions();
        }
      }
    }
  }

  async destroy(): Promise<void> {
    this.stopHealthCheck();
    if (this.client) {
      try {
        await this.client.core.relayer.transportClose();
      } catch {}
    }
    this.initialized = false;
    this.client = null;
    this.pendingApproval = null;
  }
}

export const walletService = WalletService.getInstance();
