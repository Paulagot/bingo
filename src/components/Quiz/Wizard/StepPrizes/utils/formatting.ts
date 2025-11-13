/**
 * Formatting Utilities
 */

/**
 * Get ordinal suffix for a number
 */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

