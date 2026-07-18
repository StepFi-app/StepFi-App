// ─── Mock all store modules ──────────────────────────────────────────
const mockDisconnect = jest.fn().mockResolvedValue(undefined);
const mockClearAuth = jest.fn().mockResolvedValue(undefined);
const mockClearUser = jest.fn();
const mockClearLoans = jest.fn();
const mockSecurityReset = jest.fn().mockResolvedValue(undefined);
const mockDisableBiometrics = jest.fn().mockResolvedValue(undefined);

jest.mock('../../stores/wallet.store', () => ({
  useWalletStore: {
    getState: () => ({ disconnect: mockDisconnect }),
  },
}));

jest.mock('../../stores/auth.store', () => ({
  useAuthStore: {
    getState: () => ({ clearAuth: mockClearAuth }),
  },
}));

jest.mock('../../stores/user.store', () => ({
  useUserStore: {
    getState: () => ({ clearUser: mockClearUser }),
  },
}));

jest.mock('../../stores/loans.store', () => ({
  useLoansStore: {
    getState: () => ({ clearLoans: mockClearLoans }),
  },
}));

jest.mock('../../src/security/security.store', () => ({
  useSecurityStore: {
    getState: () => ({ reset: mockSecurityReset }),
  },
}));

jest.mock('../../src/security/biometric.service', () => ({
  biometricService: {
    disableBiometrics: mockDisableBiometrics,
  },
}));

import { signOutService } from '../sign-out.service';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('signOutService.signOut', () => {
  it('calls disconnect on wallet store', async () => {
    await signOutService.signOut();
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('clears auth tokens', async () => {
    await signOutService.signOut();
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
  });

  it('clears user profile', async () => {
    await signOutService.signOut();
    expect(mockClearUser).toHaveBeenCalledTimes(1);
  });

  it('clears loans', async () => {
    await signOutService.signOut();
    expect(mockClearLoans).toHaveBeenCalledTimes(1);
  });

  it('resets security store', async () => {
    await signOutService.signOut();
    expect(mockSecurityReset).toHaveBeenCalledTimes(1);
  });

  it('disables biometrics', async () => {
    await signOutService.signOut();
    expect(mockDisableBiometrics).toHaveBeenCalledTimes(1);
  });

  it('calls all teardown steps in order', async () => {
    const callOrder: string[] = [];
    mockDisconnect.mockImplementation(async () => { callOrder.push('disconnect'); });
    mockClearAuth.mockImplementation(async () => { callOrder.push('clearAuth'); });
    mockClearUser.mockImplementation(() => { callOrder.push('clearUser'); });
    mockClearLoans.mockImplementation(() => { callOrder.push('clearLoans'); });
    mockSecurityReset.mockImplementation(async () => { callOrder.push('securityReset'); });
    mockDisableBiometrics.mockImplementation(async () => { callOrder.push('disableBiometrics'); });

    await signOutService.signOut();

    expect(callOrder).toEqual([
      'disconnect',
      'clearAuth',
      'clearUser',
      'clearLoans',
      'securityReset',
      'disableBiometrics',
    ]);
  });

  it('completes teardown even if WC disconnect throws', async () => {
    mockDisconnect.mockRejectedValueOnce(new Error('WC session expired'));

    await signOutService.signOut();

    // All subsequent steps should still be called
    expect(mockClearAuth).toHaveBeenCalledTimes(1);
    expect(mockClearUser).toHaveBeenCalledTimes(1);
    expect(mockClearLoans).toHaveBeenCalledTimes(1);
    expect(mockSecurityReset).toHaveBeenCalledTimes(1);
    expect(mockDisableBiometrics).toHaveBeenCalledTimes(1);
  });

  it('completes teardown even if clearAuth throws', async () => {
    mockClearAuth.mockRejectedValueOnce(new Error('Storage error'));

    await signOutService.signOut();

    expect(mockClearUser).toHaveBeenCalledTimes(1);
    expect(mockSecurityReset).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — calling twice does not throw', async () => {
    await signOutService.signOut();
    await expect(signOutService.signOut()).resolves.toBeUndefined();
  });
});
