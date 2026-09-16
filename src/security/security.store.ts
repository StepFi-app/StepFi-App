import { create } from 'zustand';
import { secureStorage } from './secure-storage';

// ─── Secure-store keys ───────────────────────────────────────────────
const KEY_IS_LOCKED = 'stepfi.security.isLocked';
const KEY_FAILED_ATTEMPTS = 'stepfi.security.failedAttempts';
const KEY_LOCKOUT_UNTIL = 'stepfi.security.lockoutUntil';
const KEY_LAST_ACTIVE_AT = 'stepfi.security.lastActiveAt';

// ─── Constants ───────────────────────────────────────────────────────
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Backoff schedule — returns lockout duration in ms for a given attempt count.
 * Attempts 1–2 have no lockout; 3 → 30 s; 4 → 2 min; 5 → 5 min; 6+ → 15 min.
 */
function lockoutDurationMs(failedAttempts: number): number {
  if (failedAttempts < 3) return 0;
  if (failedAttempts === 3) return 30_000;
  if (failedAttempts === 4) return 2 * 60_000;
  if (failedAttempts === 5) return 5 * 60_000;
  return 15 * 60_000;
}

// ─── Interface ───────────────────────────────────────────────────────
interface SecurityState {
  // Persisted across restart
  isLocked: boolean;
  failedAttempts: number;
  lockoutUntil: number | null;
  lastActiveAt: number;

  // Ephemeral — always false on cold start (forces biometric re-check)
  biometricCheckDone: boolean;

  // Hydration flag
  isHydrated: boolean;

  // ── Actions ──
  hydrate: () => Promise<void>;
  lock: () => Promise<void>;
  unlock: () => Promise<void>;
  incrementFailedAttempts: () => Promise<void>;
  resetFailedAttempts: () => Promise<void>;
  markBiometricCheckDone: () => void;
  recordActivity: () => Promise<void>;
  reset: () => Promise<void>;

  // ── Computed helpers (call on getState()) ──
  getIsLockedOut: () => boolean;
  getLockoutRemainingMs: () => number;
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  // ── Defaults (safe-by-default: locked until hydrate proves otherwise) ──
  isLocked: false,
  failedAttempts: 0,
  lockoutUntil: null,
  lastActiveAt: Date.now(),
  biometricCheckDone: false,
  isHydrated: false,

  // ── Hydrate from secure storage ──
  hydrate: async () => {
    try {
      const [lockedStr, attemptsStr, lockoutStr, lastActiveStr] =
        await Promise.all([
          secureStorage.getItem(KEY_IS_LOCKED),
          secureStorage.getItem(KEY_FAILED_ATTEMPTS),
          secureStorage.getItem(KEY_LOCKOUT_UNTIL),
          secureStorage.getItem(KEY_LAST_ACTIVE_AT),
        ]);

      const isLocked = lockedStr === 'true';
      const failedAttempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      const lockoutUntil = lockoutStr ? parseInt(lockoutStr, 10) : null;
      const lastActiveAt = lastActiveStr
        ? parseInt(lastActiveStr, 10)
        : Date.now();

      // Check if idle timeout expired while the app was killed
      const idleExpired = Date.now() - lastActiveAt >= IDLE_TIMEOUT_MS;

      set({
        isLocked: isLocked || idleExpired,
        failedAttempts,
        lockoutUntil,
        lastActiveAt,
        biometricCheckDone: false, // always force re-check on cold start
        isHydrated: true,
      });
    } catch {
      // If we can't read persisted state, default to locked (safe-by-default)
      set({
        isLocked: true,
        failedAttempts: 0,
        lockoutUntil: null,
        lastActiveAt: Date.now(),
        biometricCheckDone: false,
        isHydrated: true,
      });
    }
  },

  // ── Lock ──
  lock: async () => {
    set({ isLocked: true });
    await secureStorage.setItem(KEY_IS_LOCKED, 'true').catch(() => {});
  },

  // ── Unlock ──
  unlock: async () => {
    set({ isLocked: false, failedAttempts: 0, lockoutUntil: null });
    await Promise.all([
      secureStorage.setItem(KEY_IS_LOCKED, 'false'),
      secureStorage.setItem(KEY_FAILED_ATTEMPTS, '0'),
      secureStorage.removeItem(KEY_LOCKOUT_UNTIL),
    ]).catch(() => {});
  },

  // ── Failed attempt with backoff ──
  incrementFailedAttempts: async () => {
    const newCount = get().failedAttempts + 1;
    const duration = lockoutDurationMs(newCount);
    const lockoutUntil = duration > 0 ? Date.now() + duration : null;

    set({ failedAttempts: newCount, lockoutUntil });

    await Promise.all([
      secureStorage.setItem(KEY_FAILED_ATTEMPTS, String(newCount)),
      lockoutUntil
        ? secureStorage.setItem(KEY_LOCKOUT_UNTIL, String(lockoutUntil))
        : secureStorage.removeItem(KEY_LOCKOUT_UNTIL),
    ]).catch(() => {});
  },

  // ── Reset failed attempts (without full unlock) ──
  resetFailedAttempts: async () => {
    set({ failedAttempts: 0, lockoutUntil: null });
    await Promise.all([
      secureStorage.setItem(KEY_FAILED_ATTEMPTS, '0'),
      secureStorage.removeItem(KEY_LOCKOUT_UNTIL),
    ]).catch(() => {});
  },

  // ── Biometric check flag (ephemeral) ──
  markBiometricCheckDone: () => set({ biometricCheckDone: true }),

  // ── Record user activity (for idle detection) ──
  recordActivity: async () => {
    const now = Date.now();
    set({ lastActiveAt: now });
    await secureStorage
      .setItem(KEY_LAST_ACTIVE_AT, String(now))
      .catch(() => {});
  },

  // ── Full reset (sign-out) — wipe all persisted security keys ──
  reset: async () => {
    set({
      isLocked: false,
      failedAttempts: 0,
      lockoutUntil: null,
      lastActiveAt: Date.now(),
      biometricCheckDone: false,
      isHydrated: false,
    });
    await Promise.all([
      secureStorage.removeItem(KEY_IS_LOCKED),
      secureStorage.removeItem(KEY_FAILED_ATTEMPTS),
      secureStorage.removeItem(KEY_LOCKOUT_UNTIL),
      secureStorage.removeItem(KEY_LAST_ACTIVE_AT),
    ]).catch(() => {});
  },

  // ── Computed: is the user currently in a lockout period? ──
  getIsLockedOut: () => {
    const { lockoutUntil } = get();
    return lockoutUntil !== null && Date.now() < lockoutUntil;
  },

  // ── Computed: milliseconds remaining in lockout ──
  getLockoutRemainingMs: () => {
    const { lockoutUntil } = get();
    if (lockoutUntil === null) return 0;
    return Math.max(0, lockoutUntil - Date.now());
  },
}));

// Re-export for tests
export { lockoutDurationMs, IDLE_TIMEOUT_MS };

// Export storage keys for tests
export const SECURITY_KEYS = {
  KEY_IS_LOCKED,
  KEY_FAILED_ATTEMPTS,
  KEY_LOCKOUT_UNTIL,
  KEY_LAST_ACTIVE_AT,
} as const;
