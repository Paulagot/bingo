/**
 * @module shared/lib/web3
 *
 * Cross-chain Web3 utility functions
 *
 * This module provides utilities that work across multiple blockchains:
 * - Amount formatting (decimals, display)
 * - Error handling and parsing
 * - Address formatting
 *
 * @example
 * ```typescript
 * import { formatAmount, parseWeb3Error, formatAddress } from '@/shared/lib/web3';
 * ```
 */

// Formatting utilities
export * from './format';

// Error handling
export * from './errors';
