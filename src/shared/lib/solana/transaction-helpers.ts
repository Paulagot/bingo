/**
 * @module shared/lib/solana/transaction-helpers
 *
 * ## Purpose
 * Provides transaction safety, validation, and error handling utilities for Solana interactions.
 * Includes transaction simulation to catch errors before user signing (preventing wasted gas),
 * input validation for room parameters (fees, IDs), slippage protection for token amounts,
 * and user-friendly error message formatting for common Solana/Anchor errors.
 *
 * ## Prize Pool Validation
 *
 * The prize pool validation implements the economic model where hosts control 40% of the total
 * allocation, which can be split between host fee (0-5%) and prize pool (0-35%). The maximum
 * prize pool is dynamically calculated as: `40% - host fee = max prize pool`
 *
 * ### Validation Rules
 * - **Host Fee**: 0-5% (0-500 basis points)
 * - **Prize Pool**: 0-35% (0-3500 basis points), maximum = 40% - host fee
 * - **Platform Fee**: 20% (fixed, 2000 basis points)
 * - **Charity**: Minimum 40% (calculated remainder)
 * - **Total Allocation**: Must equal 100% (10000 basis points)
 *
 * ### Example Calculations
 * - Host fee: 1% (100 bps) → Max prize pool: 39% (3900 bps)
 * - Host fee: 5% (500 bps) → Max prize pool: 35% (3500 bps)
 * - Host fee: 0% (0 bps) → Max prize pool: 40% (4000 bps)
 *
 * ## Error Formatting
 *
 * Converts technical Solana/Anchor errors into actionable user messages. Handles common errors
 * such as insufficient funds, transaction rejection, and program-specific errors.
 *
 * @see {@link transactions} - Core transaction building and sending utilities
 * @see {@link validation} - Zod-based validation schemas
 *
 * @example
 * ```typescript
 * import { simulateTransaction, formatTransactionError, validateTransactionInputs } from '@/shared/lib/solana/transaction-helpers';
 *
 * // Validate inputs
 * const validation = validateTransactionInputs({
 *   entryFee: 1.0,
 *   hostFeeBps: 100,
 *   prizePoolBps: 3900,
 *   maxPlayers: 100,
 *   roomId: 'my-room-123',
 * });
 *
 * // Simulate transaction
 * const result = await simulateTransaction(connection, transaction);
 *
 * // Format errors
 * const message = formatTransactionError(error);
 * ```
 */

import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Transaction simulation result
 */
export interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
}

/**
 * Simulate a transaction before sending
 *
 * This helps catch errors before users sign and waste gas. Runs the transaction through
 * the runtime without actually executing it on-chain.
 *
 * @param connection - Solana connection
 * @param transaction - Transaction to simulate (legacy or versioned)
 * @returns Simulation result with success flag, error message, logs, and compute units
 *
 * @example
 * ```typescript
 * const result = await simulateTransaction(connection, transaction);
 * if (!result.success) {
 *   console.error('Transaction would fail:', result.error);
 *   console.error('Logs:', result.logs);
 *   return;
 * }
 * ```
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction
): Promise<SimulationResult> {
  try {
    // Add recent blockhash if not already set (required for simulation)
    if (transaction instanceof Transaction && !transaction.recentBlockhash) {
      const { blockhash } = await connection.getLatestBlockhash('finalized');
      transaction.recentBlockhash = blockhash;
    }

    const simulation = await connection.simulateTransaction(transaction);

    if (simulation.value.err) {
      return {
        success: false,
        error: `Simulation failed: ${JSON.stringify(simulation.value.err)}`,
        logs: simulation.value.logs || [],
      };
    }

    return {
      success: true,
      logs: simulation.value.logs || [],
      unitsConsumed: simulation.value.unitsConsumed,
    };
  } catch (error) {
    return {
      success: false,
      error: `Simulation error: ${(error as Error).message}`,
    };
  }
}

/**
 * Build and simulate transaction with error handling
 *
 * Gets a fresh blockhash, sets it on the transaction, and simulates it.
 * Useful for validating transactions before user signing.
 *
 * @param connection - Solana connection
 * @param transaction - Transaction to build and simulate
 * @returns Simulation result with success flag, error message, and logs
 *
 * @example
 * ```typescript
 * const result = await buildAndSimulateTransaction(connection, transaction);
 * if (!result.success) {
 *   throw new Error(result.error);
 * }
 * ```
 */
export async function buildAndSimulateTransaction(
  connection: Connection,
  transaction: Transaction
): Promise<{ success: boolean; error?: string; logs?: string[] }> {
  try {
    // Get latest blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;

    // Simulate
    const result = await simulateTransaction(connection, transaction);

    if (!result.success) {
      console.error('Transaction simulation failed:', result.error);
      console.error('Logs:', result.logs);
      return {
        success: false,
        error: result.error,
        logs: result.logs,
      };
    }

    console.log('[buildAndSimulateTransaction] Transaction simulation succeeded');
    console.log(`Units consumed: ${result.unitsConsumed}`);

    return { success: true };
  } catch (error) {
    console.error('Build and simulate error:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Slippage protection for token amounts
 *
 * Calculates minimum and maximum amounts based on expected amount and slippage tolerance.
 * Note: For fixed-price entry fees, slippage is less relevant, but useful for dynamic pricing or AMMs.
 *
 * @param expectedAmount - Expected token amount
 * @param slippageBps - Slippage tolerance in basis points (default: 50 = 0.5%)
 * @returns Minimum and maximum amounts accounting for slippage
 *
 * @example
 * ```typescript
 * const { minAmount, maxAmount } = calculateSlippageBounds(1000000, 50);
 * // minAmount: 995000, maxAmount: 1005000 (0.5% slippage)
 * ```
 */
export function calculateSlippageBounds(
  expectedAmount: number,
  slippageBps: number = 50 // Default 0.5%
): { minAmount: number; maxAmount: number } {
  const slippageMultiplier = slippageBps / 10000;
  const minAmount = Math.floor(expectedAmount * (1 - slippageMultiplier));
  const maxAmount = Math.ceil(expectedAmount * (1 + slippageMultiplier));

  return { minAmount, maxAmount };
}

/**
 * Validate transaction inputs before building
 *
 * Validates room creation parameters according to the economic model:
 * - Platform Fee: 20% (fixed)
 * - Host Allocation: 40% total (host fee + prize pool)
 * - Charity: Minimum 40% (calculated remainder)
 *
 * ## Prize Pool Validation Logic
 *
 * The prize pool validation dynamically calculates the maximum allowed prize pool based on the
 * host fee. Since hosts control 40% total allocation, the maximum prize pool is:
 * `maxPrizePool = 40% - hostFee`
 *
 * This ensures that:
 * - Host fee + prize pool never exceeds 40%
 * - Charity always receives at least 40%
 * - Total allocation always equals 100%
 *
 * ## Validation Rules
 *
 * 1. **Entry Fee**: Must be positive
 * 2. **Host Fee**: 0-5% (0-500 basis points)
 * 3. **Prize Pool**: 0-35% (0-3500 basis points), max = 40% - host fee
 * 4. **Host Allocation**: Host fee + prize pool must not exceed 40%
 * 5. **Total Allocation**: Platform (20%) + host allocation (40%) + charity (40%+) = 100%
 * 6. **Max Players**: 1-1000
 * 7. **Room ID**: 1-32 characters
 *
 * @param params - Transaction input parameters to validate
 * @param params.entryFee - Entry fee amount (must be positive)
 * @param params.hostFeeBps - Host fee in basis points (0-500 = 0-5%)
 * @param params.prizePoolBps - Prize pool in basis points (0-3500 = 0-35%, max = 40% - host fee)
 * @param params.maxPlayers - Maximum number of players (1-1000)
 * @param params.roomId - Room identifier (1-32 characters)
 * @returns Validation result with boolean valid flag and array of error messages
 *
 * @example
 * ```typescript
 * const result = validateTransactionInputs({
 *   entryFee: 1.0,
 *   hostFeeBps: 100, // 1%
 *   prizePoolBps: 3900, // 39% (valid: max is 39% with 1% host fee)
 *   maxPlayers: 100,
 *   roomId: 'my-room-123',
 * });
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors);
 * }
 * ```
 */
export function validateTransactionInputs(params: {
  entryFee?: number;
  hostFeeBps?: number;
  prizePoolBps?: number;
  maxPlayers?: number;
  roomId?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Entry fee validation
  if (params.entryFee !== undefined && params.entryFee <= 0) {
    errors.push('Entry fee must be positive');
  }

  // Host fee validation (max 5%)
  if (params.hostFeeBps !== undefined && params.hostFeeBps > 500) {
    errors.push('Host fee cannot exceed 5% (500 bps)');
  }

  // Prize pool validation
  // Host controls 40% total: 0-5% for host, remainder for prizes
  // Max prize pool = 40% - host fee = (4000 - hostFeeBps) bps
  if (params.prizePoolBps !== undefined) {
    if (params.prizePoolBps <= 0) {
      errors.push('Prize pool must be greater than 0');
    } else {
      const hostFeeBps = params.hostFeeBps ?? 0;
      const maxPrizePoolBps = 4000 - hostFeeBps; // 40% - host fee
      
      if (params.prizePoolBps > maxPrizePoolBps) {
        errors.push(
          `Prize pool cannot exceed ${maxPrizePoolBps / 100}% (${maxPrizePoolBps} bps). ` +
          `With host fee of ${hostFeeBps / 100}% (${hostFeeBps} bps), ` +
          `maximum prize pool is ${maxPrizePoolBps / 100}% (${maxPrizePoolBps} bps).`
        );
      }
    }
  }

  // Total allocation validation
  // Platform fee is fixed at 20% (2000 bps)
  // Host controls 40% (host fee + prize pool)
  // Charity gets the remainder (at least 40%)
  if (params.hostFeeBps !== undefined && params.prizePoolBps !== undefined) {
    const platformBps = 2000;
    const hostAllocationBps = params.hostFeeBps + params.prizePoolBps;
    const charityBps = 10000 - platformBps - hostAllocationBps;

    // Validate host allocation doesn't exceed 40%
    if (hostAllocationBps > 4000) {
      errors.push(
        `Host allocation (host fee + prize pool) cannot exceed 40% (4000 bps). ` +
        `Current: ${hostAllocationBps / 100}% (${hostAllocationBps} bps)`
      );
    }

    // Validate total doesn't exceed 100%
    if (charityBps < 0) {
      errors.push(
        `Total allocation exceeds 100%. ` +
        `Platform: 20%, Host: ${params.hostFeeBps / 100}%, Prizes: ${params.prizePoolBps / 100}% ` +
        `= ${(platformBps + hostAllocationBps) / 100}%. Reduce host fee or prize pool.`
      );
    }
  }

  // Max players validation (1-1000)
  if (params.maxPlayers !== undefined && (params.maxPlayers < 1 || params.maxPlayers > 1000)) {
    errors.push('Max players must be between 1 and 1000');
  }

  // Room ID validation
  if (params.roomId && (params.roomId.length === 0 || params.roomId.length > 32)) {
    errors.push('Room ID must be 1-32 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format transaction errors into user-friendly messages
 *
 * Converts technical Solana/Anchor errors into actionable user messages. Handles common errors
 * such as insufficient funds, transaction rejection, and program-specific errors.
 *
 * ## Error Categories
 *
 * 1. **Solana Errors**: Network errors, insufficient funds, blockhash not found
 * 2. **Anchor Errors**: Program-specific errors (Unauthorized, RoomExpired, etc.)
 * 3. **User Errors**: Transaction rejected, cancelled by user
 * 4. **Simulation Errors**: Transaction would fail, validation errors
 *
 * @param error - Error object or string to format
 * @returns User-friendly error message
 *
 * @example
 * ```typescript
 * try {
 *   await createPoolRoom({...});
 * } catch (error) {
 *   const message = formatTransactionError(error);
 *   console.error(message); // "Insufficient funds for transaction"
 * }
 * ```
 */
export function formatTransactionError(error: unknown): string {
  const errorStr = error?.toString() || '';
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Common Solana errors
  if (errorStr.includes('0x1')) {
    return 'Insufficient funds for transaction';
  }
  if (errorStr.includes('0x0')) {
    return 'Custom program error - check transaction details';
  }
  if (errorStr.includes('User rejected')) {
    return 'Transaction cancelled by user';
  }
  if (errorStr.includes('Blockhash not found')) {
    return 'Transaction expired - please try again';
  }
  if (errorStr.includes('Simulation failed')) {
    return 'Transaction would fail - please check your inputs';
  }

  // Anchor errors (mapped from program)
  if (errorStr.includes('Unauthorized')) {
    return 'You do not have permission to perform this action';
  }
  if (errorStr.includes('RoomExpired')) {
    return 'This room has expired and cannot accept new players';
  }
  if (errorStr.includes('EmergencyPause')) {
    return 'The program is currently paused';
  }
  if (errorStr.includes('HostFeeTooHigh')) {
    return 'Host fee exceeds the maximum allowed (5%)';
  }
  if (errorStr.includes('TotalAllocationTooHigh')) {
    return 'Total fees exceed the maximum allowed (40%)';
  }

  return errorMessage || 'Transaction failed - please try again';
}

