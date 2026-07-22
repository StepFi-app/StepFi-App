import api from './api';
import { addBreadcrumb, captureServiceError } from './sentry';
import { ApiClientError, ApiErrorCode } from '../types/errors';

export interface NonceResponse {
  nonce: string;
  expiresAt: string;
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

  async verify(wallet: string, nonce: string, signature: string): Promise<AuthTokens> {
    addBreadcrumb('auth.service', 'Verifying wallet signature');
    try {
      const res = await api.post<AuthTokens>('/auth/verify', { wallet, nonce, signature });
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
