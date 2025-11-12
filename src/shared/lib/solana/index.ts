/**
 * @module shared/lib/solana
 *
 * Solana utility functions and helpers
 *
 * This module provides a comprehensive set of utilities for working with Solana:
 * - PDA derivation helpers
 * - Token account management
 * - Transaction building and sending
 * - Input validation
 *
 * @example
 * ```typescript
 * import { deriveRoomPDA, getOrCreateATA, buildTransaction } from '@/shared/lib/solana';
 * ```
 */

// PDA utilities
export * from './pda';

// Token account utilities
export * from './token-accounts';

// Transaction helpers
export * from './transactions';

// Validation schemas and helpers
export * from './validation';
