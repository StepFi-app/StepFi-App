/**
 * Pure, dependency-free helpers for the vouch flow.
 *
 * Kept standalone (no react-native / service imports) so the validation logic
 * can be unit-tested without the native transitive dependency chain — mirrors
 * the hooks/invest/invest-utils.ts pattern.
 */

/** Reason a candidate vouch recipient is rejected, or null when it is valid. */
export type VouchRecipientError = 'empty' | 'format' | 'self';

/**
 * Stellar ed25519 public keys are base32, start with 'G', and are 56 chars long.
 */
export const isStellarPublicKey = (address: string): boolean => /^G[A-Z2-7]{55}$/.test(address);

/**
 * Validates the counterparty wallet for a vouch. Returns null when valid, or a
 * reason code: empty input, malformed address, or self-vouch (equals own wallet).
 */
export const validateVouchRecipient = (
  ownWallet: string,
  recipient: string
): VouchRecipientError | null => {
  const candidate = (recipient ?? '').trim();

  if (candidate === '') {
    return 'empty';
  }

  if (!isStellarPublicKey(candidate)) {
    return 'format';
  }

  if (candidate === (ownWallet ?? '').trim()) {
    return 'self';
  }

  return null;
};
