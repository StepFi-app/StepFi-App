/**
 * Tests for the wallet-signature auth service (services/auth.service.ts).
 *
 * Focus: the end-to-end `authenticate` orchestration for the SEP-10-style
 * challenge-transaction flow —
 *   getNonce → sign challengeXdr with the connected wallet → verify → tokens.
 *
 * Both wallet types are covered (Freighter signs directly; Lobstr signs over
 * WalletConnect using the stored sessionId), along with the error paths:
 * a wallet signing failure and a missing Lobstr session both surface as a
 * `WALLET_SIGNING_FAILED` ApiClientError, and network failures propagate as
 * ApiClientError from the underlying calls.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const mockPost = jest.fn();
const mockSignWithFreighter = jest.fn();
const mockSignWithLobstr = jest.fn();

jest.mock('../api', () => ({
  __esModule: true,
  default: { post: mockPost },
}));

jest.mock('../wallet.service', () => ({
  walletService: {
    signWithFreighter: mockSignWithFreighter,
    signWithLobstr: mockSignWithLobstr,
  },
}));

jest.mock('../sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureServiceError: jest.fn(),
}));

import { authService } from '../auth.service';
import { ApiClientError, ApiErrorCode } from '../../types/errors';

const WALLET = 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW';
const NONCE = 'a1b2c3d4e5f67890abcdef1234567890a1b2c3d4e5f67890abcdef1234567890';
const CHALLENGE_XDR = 'AAAAAgAAAAMOCK_CHALLENGE_XDR';
const SIGNED_XDR = 'AAAAAgAAAAMOCK_SIGNED_XDR';

const NONCE_RESPONSE = {
  nonce: NONCE,
  expiresAt: '2026-01-01T00:05:00.000Z',
  challengeXdr: CHALLENGE_XDR,
};
const TOKENS = {
  accessToken: 'real.access.jwt',
  refreshToken: 'real.refresh.jwt',
  expiresIn: 3600,
};

/** Wires the two POSTs authenticate makes: /auth/nonce then /auth/verify. */
function wireHappyPath() {
  mockPost.mockImplementation((url: string) => {
    if (url === '/auth/nonce') return Promise.resolve({ data: NONCE_RESPONSE });
    if (url === '/auth/verify') return Promise.resolve({ data: TOKENS });
    return Promise.reject(new Error(`unexpected POST ${url}`));
  });
}

describe('authService.authenticate (SEP-10 challenge transaction)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('freighter: fetches a nonce, signs the challengeXdr, verifies as sep0010, returns tokens', async () => {
    wireHappyPath();
    mockSignWithFreighter.mockResolvedValue(SIGNED_XDR);

    const tokens = await authService.authenticate(WALLET, 'freighter', null);

    expect(mockPost).toHaveBeenNthCalledWith(1, '/auth/nonce', { wallet: WALLET });
    expect(mockSignWithFreighter).toHaveBeenCalledWith(CHALLENGE_XDR);
    expect(mockSignWithLobstr).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/verify', {
      wallet: WALLET,
      nonce: NONCE,
      signedXdr: SIGNED_XDR,
      signatureType: 'sep0010',
    });
    expect(tokens).toEqual(TOKENS);
  });

  it('lobstr: signs the challengeXdr over WalletConnect using the sessionId', async () => {
    wireHappyPath();
    mockSignWithLobstr.mockResolvedValue(SIGNED_XDR);

    const tokens = await authService.authenticate(WALLET, 'lobstr', 'session-123');

    expect(mockSignWithLobstr).toHaveBeenCalledWith(CHALLENGE_XDR, 'session-123', WALLET);
    expect(mockSignWithFreighter).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenNthCalledWith(2, '/auth/verify', {
      wallet: WALLET,
      nonce: NONCE,
      signedXdr: SIGNED_XDR,
      signatureType: 'sep0010',
    });
    expect(tokens).toEqual(TOKENS);
  });

  it('lobstr with no sessionId → WALLET_SIGNING_FAILED (verify never called)', async () => {
    wireHappyPath();

    await expect(authService.authenticate(WALLET, 'lobstr', null)).rejects.toMatchObject({
      code: ApiErrorCode.WALLET_SIGNING_FAILED,
    });
    expect(mockSignWithLobstr).not.toHaveBeenCalled();
    expect(mockPost).toHaveBeenCalledTimes(1); // only /auth/nonce
    expect(mockPost).not.toHaveBeenCalledWith('/auth/verify', expect.anything());
  });

  it('wraps a wallet signing rejection as a WALLET_SIGNING_FAILED ApiClientError', async () => {
    wireHappyPath();
    mockSignWithFreighter.mockRejectedValue(new Error('user rejected'));

    const err = await authService.authenticate(WALLET, 'freighter', null).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.code).toBe(ApiErrorCode.WALLET_SIGNING_FAILED);
    expect(mockPost).not.toHaveBeenCalledWith('/auth/verify', expect.anything());
  });

  it('propagates a nonce network failure as ApiClientError (signing never attempted)', async () => {
    mockPost.mockRejectedValueOnce(
      new ApiClientError({ code: ApiErrorCode.NETWORK_ERROR, message: 'down' })
    );

    const err = await authService.authenticate(WALLET, 'freighter', null).catch((e) => e);
    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.code).toBe(ApiErrorCode.NETWORK_ERROR);
    expect(mockSignWithFreighter).not.toHaveBeenCalled();
  });
});
