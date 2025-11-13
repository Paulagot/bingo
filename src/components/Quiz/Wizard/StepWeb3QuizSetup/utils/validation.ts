/**
 * Validation Utilities
 */

/**
 * Validate host name
 */
export function validateHostName(hostName: string): string | null {
  if (hostName.trim().length < 2) {
    return 'Please enter a host name with at least 2 characters.';
  }
  return null;
}

/**
 * Validate entry fee
 */
export function validateEntryFee(entryFee: string): string | null {
  const parsed = Number.parseFloat(entryFee.trim());
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 'Please enter a valid entry fee greater than 0.';
  }
  return null;
}

/**
 * Validate charity selection
 */
export function validateCharity(charityId: string | null): string | null {
  if (!charityId) {
    return 'Please select a charity.';
  }
  return null;
}

