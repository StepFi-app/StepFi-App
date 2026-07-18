import { useSecurityStore, lockoutDurationMs, SECURITY_KEYS } from '../security.store';

// ─── Mock secure-storage ──────────────────────────────────────────────
const mockStore: Record<string, string> = {};

jest.mock('../secure-storage', () => ({
  secureStorage: {
    getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStore[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete mockStore[key];
    }),
  },
}));

function clearMockStore() {
  for (const key of Object.keys(mockStore)) {
    delete mockStore[key];
  }
}

// ─── Helper: reset Zustand store between tests ───────────────────────
function resetStore() {
  useSecurityStore.setState({
    isLocked: false,
    failedAttempts: 0,
    lockoutUntil: null,
    lastActiveAt: Date.now(),
    biometricCheckDone: false,
    isHydrated: false,
  });
}

beforeEach(() => {
  clearMockStore();
  resetStore();
  jest.clearAllMocks();
});

// ─── lockoutDurationMs ───────────────────────────────────────────────
describe('lockoutDurationMs', () => {
  it('returns 0 for attempts 1 and 2', () => {
    expect(lockoutDurationMs(1)).toBe(0);
    expect(lockoutDurationMs(2)).toBe(0);
  });

  it('returns 30 s for attempt 3', () => {
    expect(lockoutDurationMs(3)).toBe(30_000);
  });

  it('returns 2 min for attempt 4', () => {
    expect(lockoutDurationMs(4)).toBe(120_000);
  });

  it('returns 5 min for attempt 5', () => {
    expect(lockoutDurationMs(5)).toBe(300_000);
  });

  it('returns 15 min for attempt 6+', () => {
    expect(lockoutDurationMs(6)).toBe(900_000);
    expect(lockoutDurationMs(10)).toBe(900_000);
  });
});

// ─── Persistence: lock / unlock ──────────────────────────────────────
describe('lock and unlock persistence', () => {
  it('persists isLocked = true to secure storage', async () => {
    await useSecurityStore.getState().lock();
    expect(mockStore[SECURITY_KEYS.KEY_IS_LOCKED]).toBe('true');
    expect(useSecurityStore.getState().isLocked).toBe(true);
  });

  it('persists isLocked = false on unlock and resets counters', async () => {
    // Set up failed state
    await useSecurityStore.getState().lock();
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().incrementFailedAttempts();

    expect(useSecurityStore.getState().failedAttempts).toBe(3);

    await useSecurityStore.getState().unlock();

    expect(mockStore[SECURITY_KEYS.KEY_IS_LOCKED]).toBe('false');
    expect(mockStore[SECURITY_KEYS.KEY_FAILED_ATTEMPTS]).toBe('0');
    expect(mockStore[SECURITY_KEYS.KEY_LOCKOUT_UNTIL]).toBeUndefined();
    expect(useSecurityStore.getState().isLocked).toBe(false);
    expect(useSecurityStore.getState().failedAttempts).toBe(0);
    expect(useSecurityStore.getState().lockoutUntil).toBeNull();
  });
});

// ─── Failed attempts survive hydrate ─────────────────────────────────
describe('failed attempts survive hydrate cycle', () => {
  it('persists and restores failedAttempts across store recreation', async () => {
    // Simulate 4 failed attempts
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().incrementFailedAttempts();

    expect(useSecurityStore.getState().failedAttempts).toBe(4);
    expect(mockStore[SECURITY_KEYS.KEY_FAILED_ATTEMPTS]).toBe('4');

    // Simulate app restart: reset in-memory state, then hydrate from storage
    resetStore();
    expect(useSecurityStore.getState().failedAttempts).toBe(0);

    await useSecurityStore.getState().hydrate();

    expect(useSecurityStore.getState().failedAttempts).toBe(4);
    expect(useSecurityStore.getState().isHydrated).toBe(true);
  });
});

// ─── Lockout backoff computation ─────────────────────────────────────
describe('lockout backoff', () => {
  it('sets lockoutUntil after 3rd failed attempt', async () => {
    await useSecurityStore.getState().incrementFailedAttempts(); // 1
    await useSecurityStore.getState().incrementFailedAttempts(); // 2
    expect(useSecurityStore.getState().lockoutUntil).toBeNull();

    const before = Date.now();
    await useSecurityStore.getState().incrementFailedAttempts(); // 3
    const after = Date.now();

    const lockoutUntil = useSecurityStore.getState().lockoutUntil;
    expect(lockoutUntil).not.toBeNull();
    // lockoutUntil should be ~30 seconds from now
    expect(lockoutUntil).toBeGreaterThanOrEqual(before + 30_000);
    expect(lockoutUntil).toBeLessThanOrEqual(after + 30_000);
  });

  it('getIsLockedOut returns true when in lockout period', async () => {
    // Set lockoutUntil to the future
    useSecurityStore.setState({ lockoutUntil: Date.now() + 60_000 });
    expect(useSecurityStore.getState().getIsLockedOut()).toBe(true);
  });

  it('getIsLockedOut returns false when lockout expired', async () => {
    useSecurityStore.setState({ lockoutUntil: Date.now() - 1000 });
    expect(useSecurityStore.getState().getIsLockedOut()).toBe(false);
  });

  it('getLockoutRemainingMs returns positive value during lockout', () => {
    useSecurityStore.setState({ lockoutUntil: Date.now() + 5000 });
    const remaining = useSecurityStore.getState().getLockoutRemainingMs();
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(5000);
  });

  it('getLockoutRemainingMs returns 0 when no lockout', () => {
    expect(useSecurityStore.getState().getLockoutRemainingMs()).toBe(0);
  });
});

// ─── Hydrate: idle timeout detection ─────────────────────────────────
describe('hydrate idle timeout detection', () => {
  it('auto-locks when lastActiveAt + IDLE_TIMEOUT exceeds now', async () => {
    // Simulate: app was last active 10 minutes ago, stored as unlocked
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    mockStore[SECURITY_KEYS.KEY_IS_LOCKED] = 'false';
    mockStore[SECURITY_KEYS.KEY_LAST_ACTIVE_AT] = String(tenMinutesAgo);
    mockStore[SECURITY_KEYS.KEY_FAILED_ATTEMPTS] = '0';

    await useSecurityStore.getState().hydrate();

    expect(useSecurityStore.getState().isLocked).toBe(true);
  });

  it('stays unlocked when idle timeout has not expired', async () => {
    const oneMinuteAgo = Date.now() - 1 * 60 * 1000;
    mockStore[SECURITY_KEYS.KEY_IS_LOCKED] = 'false';
    mockStore[SECURITY_KEYS.KEY_LAST_ACTIVE_AT] = String(oneMinuteAgo);
    mockStore[SECURITY_KEYS.KEY_FAILED_ATTEMPTS] = '0';

    await useSecurityStore.getState().hydrate();

    expect(useSecurityStore.getState().isLocked).toBe(false);
  });

  it('biometricCheckDone is always false after hydrate', async () => {
    await useSecurityStore.getState().hydrate();
    expect(useSecurityStore.getState().biometricCheckDone).toBe(false);
  });
});

// ─── Reset clears everything ─────────────────────────────────────────
describe('reset', () => {
  it('clears all in-memory and persisted state', async () => {
    await useSecurityStore.getState().lock();
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().incrementFailedAttempts();
    await useSecurityStore.getState().recordActivity();

    // Verify state was persisted
    expect(mockStore[SECURITY_KEYS.KEY_IS_LOCKED]).toBe('true');
    expect(mockStore[SECURITY_KEYS.KEY_FAILED_ATTEMPTS]).toBe('3');
    expect(mockStore[SECURITY_KEYS.KEY_LAST_ACTIVE_AT]).toBeDefined();

    await useSecurityStore.getState().reset();

    // In-memory state cleared
    expect(useSecurityStore.getState().isLocked).toBe(false);
    expect(useSecurityStore.getState().failedAttempts).toBe(0);
    expect(useSecurityStore.getState().lockoutUntil).toBeNull();
    expect(useSecurityStore.getState().biometricCheckDone).toBe(false);

    // Persisted keys removed
    expect(mockStore[SECURITY_KEYS.KEY_IS_LOCKED]).toBeUndefined();
    expect(mockStore[SECURITY_KEYS.KEY_FAILED_ATTEMPTS]).toBeUndefined();
    expect(mockStore[SECURITY_KEYS.KEY_LOCKOUT_UNTIL]).toBeUndefined();
    expect(mockStore[SECURITY_KEYS.KEY_LAST_ACTIVE_AT]).toBeUndefined();
  });
});

// ─── recordActivity ──────────────────────────────────────────────────
describe('recordActivity', () => {
  it('persists lastActiveAt to secure storage', async () => {
    const before = Date.now();
    await useSecurityStore.getState().recordActivity();
    const after = Date.now();

    const stored = parseInt(mockStore[SECURITY_KEYS.KEY_LAST_ACTIVE_AT], 10);
    expect(stored).toBeGreaterThanOrEqual(before);
    expect(stored).toBeLessThanOrEqual(after);
  });
});
