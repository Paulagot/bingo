/**
 * @module shared/lib/web3/format
 *
 * ## Purpose
 * Provides formatting utilities for Web3 data across multiple blockchains.
 * Handles amount formatting, address truncation, transaction hash display,
 * and human-readable conversions.
 *
 * ## Cross-Chain Support
 * Works with:
 * - Solana (base58 addresses, 9-decimal SOL, 6-decimal tokens)
 * - EVM chains (0x addresses, 18-decimal ETH, variable token decimals)
 * - Stellar (G addresses, 7-decimal XLM)
 *
 * ## Public API
 * - `formatAmount()` - Format token amounts with decimals
 * - `formatAddress()` - Truncate long addresses for display
 * - `formatTxHash()` - Format transaction hashes
 * - `parseAmount()` - Parse human-readable amounts to raw units
 * - `formatUSD()` - Format amounts as USD currency
 *
 * @example
 * ```typescript
 * import { formatAmount, formatAddress } from '@/shared/lib/web3/format';
 *
 * // Format USDC amount
 * const formatted = formatAmount(1_234_567, 6); // "1.234567"
 *
 * // Truncate Solana address
 * const short = formatAddress('7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn');
 * // "8W83...Ft7i"
 * ```
 */

/**
 * Formats a token amount with proper decimal handling
 *
 * Converts raw token units to a human-readable decimal string. Handles:
 * - Leading zeros (0.001)
 * - Large numbers (1,000,000.00)
 * - Trailing zero removal
 * - Precision limiting
 *
 * @param amount - Raw token amount (integer units)
 * @param decimals - Number of decimals for the token
 * @param options - Formatting options
 * @param options.maxDecimals - Max decimal places to show (default: decimals)
 * @param options.minDecimals - Min decimal places to show (default: 0)
 * @param options.useGrouping - Use thousand separators (default: false)
 * @returns Formatted amount string
 *
 * @example
 * ```typescript
 * // USDC (6 decimals)
 * formatAmount(1_000_000, 6); // "1"
 * formatAmount(1_234_567, 6); // "1.234567"
 * formatAmount(1_234_567, 6, { maxDecimals: 2 }); // "1.23"
 *
 * // SOL (9 decimals)
 * formatAmount(1_000_000_000, 9); // "1"
 * formatAmount(1_500_000_000, 9, { maxDecimals: 2 }); // "1.5"
 *
 * // With thousand separators
 * formatAmount(1_234_567_890, 6, { useGrouping: true }); // "1,234.56789"
 * ```
 */
export function formatAmount(
  amount: string | number | bigint,
  decimals: number,
  options: {
    maxDecimals?: number;
    minDecimals?: number;
    useGrouping?: boolean;
  } = {}
): string {
  const {
    maxDecimals = decimals,
    minDecimals = 0,
    useGrouping = false,
  } = options;

  // Convert to string
  const amountStr = amount.toString();

  // Handle zero
  if (amountStr === '0' || amountStr === '') {
    return '0';
  }

  // Pad with leading zeros if needed
  const paddedAmount = amountStr.padStart(decimals + 1, '0');

  // Split into integer and fractional parts
  const integerPart = paddedAmount.slice(0, -decimals) || '0';
  let fractionalPart = paddedAmount.slice(-decimals);

  // Trim to maxDecimals
  if (maxDecimals < decimals) {
    fractionalPart = fractionalPart.slice(0, maxDecimals);
  }

  // Remove trailing zeros (unless minDecimals requires them)
  if (minDecimals === 0) {
    fractionalPart = fractionalPart.replace(/0+$/, '');
  } else if (fractionalPart.length > minDecimals) {
    const significantPart = fractionalPart.slice(0, minDecimals);
    const trimmablePart = fractionalPart.slice(minDecimals).replace(/0+$/, '');
    fractionalPart = significantPart + trimmablePart;
  }

  // Format integer part with grouping if requested
  let formattedInteger = integerPart;
  if (useGrouping) {
    formattedInteger = parseInt(integerPart).toLocaleString('en-US');
  }

  // Combine
  return fractionalPart ? `${formattedInteger}.${fractionalPart}` : formattedInteger;
}

/**
 * Parses a human-readable amount to raw token units
 *
 * Converts decimal string to integer token units. Inverse of formatAmount().
 *
 * @param amount - Decimal amount string (e.g., "1.5")
 * @param decimals - Number of decimals for the token
 * @returns Raw token units as string
 *
 * @throws {Error} If amount format is invalid or has too many decimal places
 *
 * @example
 * ```typescript
 * // USDC (6 decimals)
 * parseAmount("1", 6); // "1000000"
 * parseAmount("1.5", 6); // "1500000"
 * parseAmount("0.000001", 6); // "1"
 *
 * // SOL (9 decimals)
 * parseAmount("1", 9); // "1000000000"
 * parseAmount("0.1", 9); // "100000000"
 * ```
 */
export function parseAmount(amount: string, decimals: number): string {
  // Validate format
  if (!/^\d+(\.\d+)?$/.test(amount)) {
    throw new Error(`Invalid amount format: "${amount}"`);
  }

  const [integerPart, fractionalPart = ''] = amount.split('.');

  // Check decimal places
  if (fractionalPart.length > decimals) {
    throw new Error(
      `Amount has too many decimal places: ${fractionalPart.length} (max: ${decimals})`
    );
  }

  // Pad fractional part to full decimals
  const paddedFraction = fractionalPart.padEnd(decimals, '0');

  // Combine and remove leading zeros
  const rawAmount = integerPart + paddedFraction;
  return rawAmount.replace(/^0+/, '') || '0';
}

/**
 * Truncates a long address for display
 *
 * Shortens blockchain addresses while keeping them recognizable.
 * Works with Solana, EVM, and Stellar addresses.
 *
 * @param address - Full address string
 * @param options - Truncation options
 * @param options.prefixLength - Characters to show at start (default: 4)
 * @param options.suffixLength - Characters to show at end (default: 4)
 * @param options.separator - Separator between parts (default: "...")
 * @returns Truncated address
 *
 * @example
 * ```typescript
 * // Solana address
 * formatAddress('7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn');
 * // "8W83...Ft7i"
 *
 * // EVM address
 * formatAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
 * // "0x74...0bEb"
 *
 * // Custom truncation
 * formatAddress('8W83...', { prefixLength: 6, suffixLength: 6 });
 * // "8W83G9...KFt7i"
 * ```
 */
export function formatAddress(
  address: string,
  options: {
    prefixLength?: number;
    suffixLength?: number;
    separator?: string;
  } = {}
): string {
  const {
    prefixLength = 4,
    suffixLength = 4,
    separator = '...',
  } = options;

  if (!address) {
    return '';
  }

  const totalLength = prefixLength + suffixLength + separator.length;

  // If address is short enough, return as-is
  if (address.length <= totalLength) {
    return address;
  }

  const prefix = address.slice(0, prefixLength);
  const suffix = address.slice(-suffixLength);

  return `${prefix}${separator}${suffix}`;
}

/**
 * Formats a transaction hash for display
 *
 * Alias for formatAddress with defaults optimized for transaction hashes.
 *
 * @param txHash - Transaction hash/signature
 * @param prefixLength - Characters to show at start (default: 8)
 * @param suffixLength - Characters to show at end (default: 8)
 * @returns Truncated transaction hash
 *
 * @example
 * ```typescript
 * formatTxHash('5K7Rv8yEgJkHnxX2P2hHfNrKzYmDqjGHbZPy6Hn9Qh4F3wGk2BPXm...');
 * // "5K7Rv8yE...BPXm"
 * ```
 */
export function formatTxHash(
  txHash: string,
  prefixLength: number = 8,
  suffixLength: number = 8
): string {
  return formatAddress(txHash, { prefixLength, suffixLength });
}

/**
 * Formats an amount as USD currency
 *
 * Formats a number as USD with proper symbol, separators, and decimals.
 *
 * @param amount - Amount in USD
 * @param options - Formatting options
 * @param options.decimals - Decimal places to show (default: 2)
 * @param options.hideSymbol - Hide $ symbol (default: false)
 * @returns Formatted USD string
 *
 * @example
 * ```typescript
 * formatUSD(1234.56); // "$1,234.56"
 * formatUSD(1000); // "$1,000.00"
 * formatUSD(0.99); // "$0.99"
 * formatUSD(1234.567, { decimals: 3 }); // "$1,234.567"
 * formatUSD(100, { hideSymbol: true }); // "100.00"
 * ```
 */
export function formatUSD(
  amount: number,
  options: {
    decimals?: number;
    hideSymbol?: boolean;
  } = {}
): string {
  const { decimals = 2, hideSymbol = false } = options;

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return hideSymbol ? formatted : `$${formatted}`;
}

/**
 * Formats a percentage value
 *
 * Converts basis points or decimal percentage to display string.
 *
 * @param value - Percentage value
 * @param options - Formatting options
 * @param options.isBasisPoints - Value is in basis points (default: false)
 * @param options.decimals - Decimal places (default: 2)
 * @param options.hideSymbol - Hide % symbol (default: false)
 * @returns Formatted percentage string
 *
 * @example
 * ```typescript
 * // From decimal percentage
 * formatPercentage(45); // "45.00%"
 * formatPercentage(1.5, { decimals: 1 }); // "1.5%"
 *
 * // From basis points
 * formatPercentage(2000, { isBasisPoints: true }); // "20.00%"
 * formatPercentage(500, { isBasisPoints: true }); // "5.00%"
 * ```
 */
export function formatPercentage(
  value: number,
  options: {
    isBasisPoints?: boolean;
    decimals?: number;
    hideSymbol?: boolean;
  } = {}
): string {
  const {
    isBasisPoints = false,
    decimals = 2,
    hideSymbol = false,
  } = options;

  const percentage = isBasisPoints ? value / 100 : value;

  const formatted = percentage.toFixed(decimals);

  return hideSymbol ? formatted : `${formatted}%`;
}

/**
 * Formats a large number with abbreviations (K, M, B, T)
 *
 * Converts large numbers to compact format for display.
 *
 * @param value - Number to format
 * @param decimals - Decimal places for abbreviated form (default: 1)
 * @returns Abbreviated number string
 *
 * @example
 * ```typescript
 * formatCompactNumber(1234); // "1.2K"
 * formatCompactNumber(1_500_000); // "1.5M"
 * formatCompactNumber(2_500_000_000); // "2.5B"
 * formatCompactNumber(999); // "999"
 * ```
 */
export function formatCompactNumber(value: number, decimals: number = 1): string {
  const suffixes = ['', 'K', 'M', 'B', 'T'];
  const tier = (Math.log10(Math.abs(value)) / 3) | 0;

  if (tier === 0) {
    return value.toString();
  }

  const suffix = suffixes[tier];
  const scale = Math.pow(10, tier * 3);
  const scaled = value / scale;

  return scaled.toFixed(decimals) + suffix;
}

/**
 * Formats a duration in seconds to human-readable string
 *
 * @param seconds - Duration in seconds
 * @param options - Formatting options
 * @param options.short - Use short format (1h 30m vs 1 hour 30 minutes)
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatDuration(90); // "1 minute 30 seconds"
 * formatDuration(90, { short: true }); // "1m 30s"
 * formatDuration(3665); // "1 hour 1 minute 5 seconds"
 * formatDuration(3665, { short: true }); // "1h 1m 5s"
 * ```
 */
export function formatDuration(
  seconds: number,
  options: { short?: boolean } = {}
): string {
  const { short = false } = options;

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(short ? `${hours}h` : `${hours} hour${hours !== 1 ? 's' : ''}`);
  }

  if (minutes > 0) {
    parts.push(short ? `${minutes}m` : `${minutes} minute${minutes !== 1 ? 's' : ''}`);
  }

  if (secs > 0 || parts.length === 0) {
    parts.push(short ? `${secs}s` : `${secs} second${secs !== 1 ? 's' : ''}`);
  }

  return parts.join(' ');
}
