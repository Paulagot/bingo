/**
 * @module features/web3/solana/api/admin/update-global-config
 *
 * ## Purpose
 * Updates the global platform configuration. This is an admin-only operation that
 * allows updating platform settings like wallet addresses, fee percentages, and
 * other global parameters.
 *
 * ## Architecture
 * This module extracts the global config update logic into a focused, testable
 * API module. It uses Phase 1 utilities for PDA derivation and transaction building.
 *
 * ## Security
 * This operation can only be performed by the platform admin. The caller's public
 * key must match the GlobalConfig admin public key.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link initializeGlobalConfig} - Initialize the config first
 * @see programs/bingo/src/instructions/update_global_config.rs - Contract implementation
 */

import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveGlobalConfigPDA } from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext, GlobalConfigParams } from '@/features/web3/solana/model/types';

// Config
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Updates the global platform configuration (admin only)
 *
 * Used to update max_prize_pool_bps from 3500 (35%) to 4000 (40%) to allow
 * hosts to allocate up to 40% - host fee for prizes.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param updates - Configuration updates
 * @returns Update result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Only platform admin can update global config' - If caller is not admin
 * @throws {Error} Transaction errors - If update fails
 *
 * @example
 * ```typescript
 * const result = await updateGlobalConfig(context, {
 *   maxPrizePoolBps: 4000, // Update to 40%
 * });
 *
 * console.log('Config updated:', result.signature);
 * ```
 */
export async function updateGlobalConfig(
  context: SolanaContractContext,
  updates: GlobalConfigParams
): Promise<{ signature: string }> {
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
    throw new Error('Only platform admin can update global config');
  }

  // Build update instruction
  const ix = await program.methods
    .updateGlobalConfig(
      updates.platformWallet ?? null,
      updates.charityWallet ?? null,
      updates.platformFeeBps ?? null,
      updates.maxHostFeeBps ?? null,
      updates.maxPrizePoolBps ?? null,
      updates.minCharityBps ?? null
    )
    .accounts({
      globalConfig,
      admin: publicKey,
    })
    .instruction();

  // Build and send transaction
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

  const signature = await provider.sendAndConfirm(transaction, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  return { signature };
}

