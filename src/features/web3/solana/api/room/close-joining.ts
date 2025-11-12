/**
 * @module features/web3/solana/api/room/close-joining
 *
 * ## Purpose
 * Closes joining for a room, preventing new players from joining before max capacity
 * is reached. This is a room lifecycle management operation that can only be
 * performed by the room host.
 *
 * ## Architecture
 * This module extracts the close joining logic into a focused, testable API module.
 * It uses Phase 1 utilities for PDA derivation and transaction building.
 *
 * ## Security
 * This operation can only be performed by the room host. The caller's public key
 * must match the room's host public key.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/instructions/close_joining.rs - Contract implementation
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveRoomPDA } from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

// Config
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Parameters for closing joining
 */
export interface CloseJoiningParams {
  /** Room identifier */
  roomId: string;
  /** Room host's public key (must match caller) */
  hostPubkey: PublicKey;
}

/**
 * Result from closing joining
 */
export interface CloseJoiningResult {
  /** Transaction signature */
  signature: string;
}

/**
 * Closes joining for a room (host only)
 *
 * Prevents new players from joining before max capacity is reached. This operation
 * can only be performed by the room host.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Close joining parameters
 * @returns Close joining result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Only room host can close joining' - If caller is not the host
 * @throws {Error} Transaction simulation errors - If on-chain execution would fail
 *
 * @example
 * ```typescript
 * const result = await closeJoining(context, {
 *   roomId: 'bingo-night-2024',
 *   hostPubkey: hostPublicKey,
 * });
 *
 * console.log('Joining closed:', result.signature);
 * ```
 */
export async function closeJoining(
  context: SolanaContractContext,
  params: CloseJoiningParams
): Promise<CloseJoiningResult> {
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

  // Verify caller is host
  if (!publicKey.equals(params.hostPubkey)) {
    throw new Error('Only room host can close joining');
  }

  const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);

  const ix = await program.methods
    .closeJoining(params.roomId)
    .accounts({
      room,
      host: publicKey,
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
    console.error('[closeJoining] Simulation failed:', {
      error: simResult.error,
      logs: simResult.logs,
    });
    throw new Error(formatTransactionError(simResult.error));
  }

  const signature = await provider.sendAndConfirm(transaction);

  return { signature };
}

