/**
 * Lockout policy for the biometric/PIN gate.
 *
 * Extracted as a pure, dependency-free module so the attempt-counting logic can
 * be unit-tested and shared, rather than living inline in the UI. The count it
 * evaluates is persisted by the security store, so the lockout survives an app
 * relaunch (a user cannot reset their remaining attempts by killing the app).
 */

export const MAX_FAILED_ATTEMPTS = 3;

export interface AttemptOutcome {
  /** The failed-attempt count after applying this attempt. */
  failedAttempts: number;
  /** True once the threshold is reached; the caller should force sign-out. */
  lockedOut: boolean;
  /** Attempts remaining before lockout (never negative). */
  remainingAttempts: number;
}

/**
 * Evaluate a single failed unlock attempt against the current count. Negative or
 * malformed input is treated as zero so a corrupted persisted value can never
 * grant extra attempts.
 */
export const evaluateFailedAttempt = (currentFailedAttempts: number): AttemptOutcome => {
  const safeCurrent = Number.isFinite(currentFailedAttempts)
    ? Math.max(0, Math.floor(currentFailedAttempts))
    : 0;
  const failedAttempts = safeCurrent + 1;
  const lockedOut = failedAttempts >= MAX_FAILED_ATTEMPTS;
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedAttempts);
  return { failedAttempts, lockedOut, remainingAttempts };
};
