import api from './api';
import { addBreadcrumb, captureServiceError } from './sentry';

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
      throw error;
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
      throw error;
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
      throw error;
    }
  },
};
