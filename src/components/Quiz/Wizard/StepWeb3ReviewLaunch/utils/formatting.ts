/**
 * Formatting Utilities
 *
 * Utility functions for formatting data for display in the Web3 review and launch step.
 * These functions handle date/time formatting, address formatting, and other display
 * transformations.
 *
 * ## Functions
 *
 * - `formatEventDateTime`: Formats ISO date/time strings for display
 * - `isInvalidTx`: Validates transaction hash/signature format
 *
 * Used by StepWeb3ReviewLaunch component and related UI components.
 */

import type { FormattedEventDateTime } from '../types';

/**
 * Format Event Date/Time
 *
 * Parses an ISO date/time string and formats it for display in the UI.
 * Returns both date and time as separate formatted strings.
 *
 * ## Format Details
 *
 * - **Date**: Full weekday, month name, day, year (e.g., "Monday, January 15, 2024")
 * - **Time**: 12-hour format with AM/PM (e.g., "02:30 PM")
 *
 * ## Locale
 *
 * Uses 'en-US' locale for consistent formatting across all users.
 *
 * ## Usage
 *
 * ```typescript
 * const formatted = formatEventDateTime('2024-01-15T14:30:00Z');
 * // { date: "Monday, January 15, 2024", time: "02:30 PM" }
 *
 * const nullResult = formatEventDateTime(undefined);
 * // null
 * ```
 *
 * @param dateTime - ISO date/time string or undefined
 * @returns Formatted date/time object or null if input is invalid
 */
export function formatEventDateTime(dateTime?: string): FormattedEventDateTime | null {
  if (!dateTime) return null;
  
  try {
    const date = new Date(dateTime);
    
    // Validate date is valid
    if (isNaN(date.getTime())) {
      console.warn('[formatEventDateTime] Invalid date string:', dateTime);
      return null;
    }
    
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  } catch (error) {
    console.error('[formatEventDateTime] Error formatting date:', error);
    return null;
  }
}

/**
 * Validate Transaction Hash/Signature
 *
 * Checks if a transaction hash or signature is valid and not a placeholder.
 * Used to validate deployment results before proceeding with room creation.
 *
 * ## Validation Rules
 *
 * - Must not be undefined or null
 * - Must not be placeholder strings ('pending', 'transaction-submitted')
 * - Must be at least 16 characters long (minimum for valid hash/signature)
 *
 * ## Chain-Specific Notes
 *
 * - **Solana**: Signatures are base58-encoded, typically 88 characters
 * - **EVM**: Transaction hashes are hex strings, 66 characters (0x + 64 hex)
 * - **Stellar**: Transaction hashes are base32-encoded, 64 characters
 *
 * ## Usage
 *
 * ```typescript
 * if (isInvalidTx(deployResult.txHash)) {
 *   throw new Error('Invalid transaction hash');
 * }
 * ```
 *
 * @param tx - Transaction hash or signature to validate
 * @returns true if transaction is invalid, false if valid
 */
export function isInvalidTx(tx?: string): boolean {
  if (!tx) return true;
  
  // Check for placeholder strings
  if (tx === 'pending' || tx === 'transaction-submitted') {
    return true;
  }
  
  // Check minimum length (16 chars covers most valid hashes)
  if (tx.length < 16) {
    return true;
  }
  
  return false;
}

