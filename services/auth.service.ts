import api from './api';
import { walletService } from './wallet.service';
import { addBreadcrumb, captureServiceError } from './sentry';
import { ApiClientError, ApiErrorCode } from '../types/errors';

export type WalletType = 'freighter' | 'lobstr';

export interface NonceResponse {
  nonce: string;
  expiresAt: string;
  /**
   * Canonical challenge message (used by the message-signing schemes). Retained
   * for completeness; the SEP-10 flow signs `challengeXdr` instead.
   */
  message?: string;
  /**
   * Unsigned SEP-10-style challenge transaction (base64 envelope XDR). The
   * connected wallet signs this and returns it as `signedXdr` — this is what
   * lets transaction-only wallets (mobile Lobstr over WalletConnect) authenticate.
   */
  challengeXdr: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const authService = {
  async getNonce(wallet: string): Promise<NonceResponse> {
    addBreadcrumb('auth.service', 'Requesting nonce');
    try {
      const res = await api.post<NonceResponse>('/auth/nonce', { wallet });
      addBreadcrumb('auth.service', 'Nonce received');
      return res.data;
    } catch (error) {
      captureServiceError('auth', 'getNonce', error);
      // Re-throw as ApiClientError if it isn't already
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError({
        code: ApiErrorCode.NETWORK_ERROR,
        message: 'Failed to get authentication nonce',
        userMessage: 'Could not connect to the authentication server. Please try again.',
        cause: error,
      });
    }
  },

  async verify(wallet: string, nonce: string, signedXdr: string): Promise<AuthTokens> {
    addBreadcrumb('auth.service', 'Verifying signed challenge transaction');
    try {
      const res = await api.post<AuthTokens>('/auth/verify', {
        wallet,
        nonce,
        signedXdr,
        signatureType: 'sep0010',
      });
      addBreadcrumb('auth.service', 'Wallet verified successfully');
      return res.data;
    } catch (error) {
      captureServiceError('auth', 'verify', error);
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError({
        code: ApiErrorCode.NETWORK_ERROR,
        message: 'Failed to verify wallet signature',
        userMessage: 'Could not verify your wallet signature. Please try again.',
        cause: error,
      });
    }
  },

  /**
   * End-to-end wallet-signature login: fetch a nonce + challenge transaction,
   * have the connected wallet sign the challenge XDR (Lobstr over WalletConnect
   * or Freighter — both sign transactions, which is exactly what the SEP-10-style
   * scheme needs), then exchange the signed challenge for JWT tokens.
   *
   * Errors surface as `ApiClientError` from the underlying calls; a wallet
   * rejection/failure surfaces as a `WALLET_SIGNING_FAILED` `ApiClientError`.
   */
  async authenticate(
    wallet: string,
    walletType: WalletType,
    sessionId: string | null
  ): Promise<AuthTokens> {
    addBreadcrumb('auth.service', `Authenticating via ${walletType}`);
    const { nonce, challengeXdr } = await this.getNonce(wallet);

    let signedXdr: string;
    try {
      if (walletType === 'lobstr') {
        if (!sessionId) {
          throw new Error('Lobstr session not found. Please reconnect your wallet.');
        }
        signedXdr = await walletService.signWithLobstr(challengeXdr, sessionId, wallet);
      } else {
        signedXdr = await walletService.signWithFreighter(challengeXdr);
      }
    } catch (error) {
      captureServiceError('auth', 'authenticate.sign', error);
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError({
        code: ApiErrorCode.WALLET_SIGNING_FAILED,
        message: 'Failed to sign the authentication challenge',
        userMessage:
          'Could not sign the authentication request with your wallet. Please try again.',
        cause: error,
      });
    }

    return this.verify(wallet, nonce, signedXdr);
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    addBreadcrumb('auth.service', 'Refreshing auth tokens');
    try {
      const res = await api.post<AuthTokens>('/auth/refresh', { refreshToken });
      addBreadcrumb('auth.service', 'Tokens refreshed');
      return res.data;
    } catch (error) {
      captureServiceError('auth', 'refresh', error);
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError({
        code: ApiErrorCode.NETWORK_ERROR,
        message: 'Failed to refresh auth tokens',
        userMessage: 'Could not refresh your session. Please sign in again.',
        cause: error,
      });
    }
  },
};
