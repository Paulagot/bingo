/**
 * @module features/web3/solana/api/admin/set-emergency-pause
 *
 * ## Purpose
 * Sets or clears the emergency pause flag for the platform. This is an admin-only
 * operation that can halt all operations in emergency situations.
 *
 * ## Architecture
 * This module extracts the emergency pause logic into a focused, testable API module.
 * It uses Phase 1 utilities for PDA derivation and transaction building.
 *
 * ## Security
 * This operation can only be performed by the platform admin. The caller's public
 * key must match the GlobalConfig admin public key.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/instructions/set_emergency_pause.rs - Contract implementation
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveGlobalConfigPDA } from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

// Config
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Result from setting emergency pause
 */
export interface SetEmergencyPauseResult {
  /** Transaction signature */
  signature: string;
}

/**
 * Set emergency pause (admin only)
 *
 * Toggles global pause flag to halt all operations in emergency situations.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param paused - Whether to pause (true) or unpause (false) the platform
 * @returns Result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Only platform admin can toggle emergency pause' - If caller is not admin
 * @throws {Error} Transaction errors - If operation fails
 *
 * @example
 * ```typescript
 * // Pause the platform
 * const result = await setEmergencyPause(context, true);
 *
 * // Unpause the platform
 * const result2 = await setEmergencyPause(context, false);
 * ```
 */
export async function setEmergencyPause(
  context: SolanaContractContext,
  paused: boolean
): Promise<SetEmergencyPauseResult> {
  if (!context.publicKey || !context.provider) {
    throw new Error('Wallet not connected');
  }

  if (!context.program) {
    throw new Error('Program not initialized');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  const [globalConfig] = deriveGlobalConfigPDA();

  // Verify caller is admin
  const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
  if (!globalConfigAccount.admin.equals(publicKey)) {
    throw new Error('Only platform admin can toggle emergency pause');
  }

  const ix = await program.methods
    .setEmergencyPause(paused)
    .accounts({
      globalConfig,
      admin: publicKey,
    })
    .instruction();

  const transaction = await buildTransaction({
    connection,
    instructions: [ix],
    feePayer: publicKey,
    commitment: 'finalized',
  });

  const simResult = await simulateTransaction(connection, transaction);

  if (!simResult.success) {
    throw new Error(formatTransactionError(simResult.error));
  }

  const signature = await provider.sendAndConfirm(transaction);

  return { signature };
}

