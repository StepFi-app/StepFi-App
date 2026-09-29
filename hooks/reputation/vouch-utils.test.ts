import { isStellarPublicKey, validateVouchRecipient } from './vouch-utils';

declare const describe: any;
declare const it: any;
declare const expect: any;

// Valid Stellar public keys are 'G' + 55 base32 chars (A-Z, 2-7).
const OWN = 'G' + 'A'.repeat(55);
const OTHER = 'G' + 'B'.repeat(55);

describe('vouch-utils', () => {
  describe('isStellarPublicKey', () => {
    it('accepts a well-formed G-address (56 base32 chars)', () => {
      expect(isStellarPublicKey(OWN)).toBe(true);
    });

    it('rejects wrong prefix, wrong length, and invalid chars', () => {
      expect(isStellarPublicKey('M' + 'A'.repeat(55))).toBe(false);
      expect(isStellarPublicKey('GABC')).toBe(false);
      expect(isStellarPublicKey('G' + '0'.repeat(55))).toBe(false);
    });
  });

  describe('validateVouchRecipient', () => {
    it('returns "empty" for blank/whitespace input', () => {
      expect(validateVouchRecipient(OWN, '')).toBe('empty');
      expect(validateVouchRecipient(OWN, '   ')).toBe('empty');
    });

    it('returns "format" for a malformed address', () => {
      expect(validateVouchRecipient(OWN, 'not-an-address')).toBe('format');
    });

    it('returns "self" when the recipient equals the own wallet', () => {
      expect(validateVouchRecipient(OWN, OWN)).toBe('self');
      expect(validateVouchRecipient(OWN, `  ${OWN}  `)).toBe('self');
    });

    it('returns null for a valid, different counterparty', () => {
      expect(validateVouchRecipient(OWN, OTHER)).toBeNull();
    });
  });
});
