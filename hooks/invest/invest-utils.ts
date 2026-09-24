/**
 * Pure, dependency-free helpers for the invest flow.
 *
 * Kept in a standalone module (no react-native / expo / service imports) so
 * they can be unit-tested without pulling in the heavy native transitive
 * dependency chain.
 */

/**
 * Formats the currency value, returning exactly 2 decimal places.
 */
export const formatCurrency = (value: string): string => {
  if (!value || value.trim() === '') {
    return '0.00';
  }

  let filtered = value.replace(/[^\d.]/g, '');

  const decimalCount = (filtered.match(/\./g) || []).length;
  if (decimalCount > 1) {
    const parts = filtered.split('.');
    filtered = parts[0] + '.' + parts.slice(1).join('');
  }

  if (filtered.startsWith('0') && filtered.length > 1 && filtered[1] !== '.') {
    filtered = filtered.replace(/^0+/, '');
  }

  if (filtered === '.' || filtered === '') {
    return '0.00';
  }

  const numValue = parseFloat(filtered);

  if (isNaN(numValue)) {
    return '0.00';
  }

  const formatted = numValue.toFixed(2);

  return formatted;
};

/**
 * Validates if the given deposit amount is at least $10.00.
 */
export const validateDepositAmount = (depositAmount: string): boolean => {
  if (!depositAmount || depositAmount === '') {
    return false;
  }

  const amount = parseFloat(depositAmount);

  if (isNaN(amount) || amount === 0) {
    return false;
  }

  return amount >= 10.0;
};
