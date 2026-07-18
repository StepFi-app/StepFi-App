import { useAuthStore } from '../stores/auth.store';
import { useUserStore } from '../stores/user.store';
import { useWalletStore } from '../stores/wallet.store';
import { useLoansStore } from '../stores/loans.store';
import { useSecurityStore } from '../src/security/security.store';
import { biometricService } from '../src/security/biometric.service';

/**
 * Atomic sign-out orchestrator.
 *
 * Clears every store and disconnects the WalletConnect v2 session
 * so no orphaned sessions survive after the user signs out.
 *
 * Individual failures are caught so the teardown always completes.
 * WC disconnect is best-effort; local state wipe is mandatory.
 */
export const signOutService = {
  async signOut(): Promise<void> {
    // 1. Disconnect WalletConnect v2 session (best-effort)
    try {
      await useWalletStore.getState().disconnect();
    } catch {
      // Session may already be gone — safe to ignore
    }

    // 2. Clear auth tokens from secure storage
    try {
      await useAuthStore.getState().clearAuth();
    } catch {
      // Best-effort
    }

    // 3. Clear user profile
    try {
      useUserStore.getState().clearUser();
    } catch {
      // Best-effort
    }

    // 4. Clear loans
    try {
      useLoansStore.getState().clearLoans();
    } catch {
      // Best-effort
    }

    // 5. Reset security state (wipes persisted lock / attempt counters)
    try {
      await useSecurityStore.getState().reset();
    } catch {
      // Best-effort
    }

    // 6. Clear biometric / PIN preferences
    try {
      await biometricService.disableBiometrics();
    } catch {
      // Best-effort
    }
  },
};
