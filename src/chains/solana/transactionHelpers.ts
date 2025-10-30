/**
 * Transaction Utility Functions
 *
 * Provides transaction safety, validation, and error handling utilities for Solana interactions.
 * Includes transaction simulation to catch errors before user signing (preventing wasted gas),
 * input validation for room parameters (fees, IDs), slippage protection for token amounts,
 * and user-friendly error message formatting for common Solana/Anchor errors. Used by
 * useFundraiselyContract hook to validate and simulate transactions before submission, improving
 * UX by detecting failures early and providing clear feedback. Formats program-specific errors
 * (RoomExpired, HostFeeTooHigh) into actionable messages for users. Core safety layer between
 * UI components and blockchain transactions.
 */

import { Connection, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Transaction simulation and safety helpers
 */

export interface SimulationResult {
  success: boolean;
  error?: string;
  logs?: string[];
  unitsConsumed?: number;
}

/**
 * Simulate a transaction before sending
 * This helps catch errors before users sign and waste gas
 */
export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction | VersionedTransaction
): Promise<SimulationResult> {
  try {
    const simulation = transaction instanceof Transaction
      ? await connection.simulateTransaction(transaction)
      : await connection.simulateTransaction(transaction);

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

    console.log('[COMPLETE] Transaction simulation succeeded');
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
 * Note: For fixed-price entry fees, slippage is less relevant
 * But useful for when working with dynamic pricing or AMMs
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

  // Prize pool validation (max 35%)
  if (params.prizePoolBps !== undefined && params.prizePoolBps > 3500) {
    errors.push('Prize pool cannot exceed 35% (3500 bps)');
  }

  // Charity minimum validation (must be at least 40%)
  // Platform fee is fixed at 20% (2000 bps)
  if (params.hostFeeBps !== undefined && params.prizePoolBps !== undefined) {
    const platformBps = 2000;
    const charityBps = 10000 - platformBps - params.hostFeeBps - params.prizePoolBps;

    if (charityBps < 4000) {
      errors.push('Charity allocation must be at least 40% (4000 bps)');
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
 * User-friendly error messages
 */
export function formatTransactionError(error: any): string {
  const errorStr = error?.toString() || '';

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

  return error?.message || 'Transaction failed - please try again';
}
