import { MAX_FAILED_ATTEMPTS, evaluateFailedAttempt } from './lockout';

declare const describe: any;
declare const it: any;
declare const expect: any;

describe('lockout', () => {
  it('exposes a three-attempt threshold', () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(3);
  });

  describe('evaluateFailedAttempt', () => {
    it('counts up and reports remaining attempts before the threshold', () => {
      expect(evaluateFailedAttempt(0)).toEqual({
        failedAttempts: 1,
        lockedOut: false,
        remainingAttempts: 2,
      });
      expect(evaluateFailedAttempt(1)).toEqual({
        failedAttempts: 2,
        lockedOut: false,
        remainingAttempts: 1,
      });
    });

    it('locks out once the threshold is reached', () => {
      expect(evaluateFailedAttempt(2)).toEqual({
        failedAttempts: 3,
        lockedOut: true,
        remainingAttempts: 0,
      });
    });

    it('stays locked out past the threshold without negative remaining', () => {
      expect(evaluateFailedAttempt(5)).toEqual({
        failedAttempts: 6,
        lockedOut: true,
        remainingAttempts: 0,
      });
    });

    it('treats negative, fractional, or non-finite counts as zero', () => {
      expect(evaluateFailedAttempt(-4)).toEqual({
        failedAttempts: 1,
        lockedOut: false,
        remainingAttempts: 2,
      });
      expect(evaluateFailedAttempt(1.9)).toEqual({
        failedAttempts: 2,
        lockedOut: false,
        remainingAttempts: 1,
      });
      expect(evaluateFailedAttempt(Number.NaN)).toEqual({
        failedAttempts: 1,
        lockedOut: false,
        remainingAttempts: 2,
      });
    });
  });
});
