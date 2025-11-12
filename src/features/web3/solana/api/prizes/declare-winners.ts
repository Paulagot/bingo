/**
 * @module features/web3/solana/api/prizes/declare-winners
 *
 * ## Purpose
 * Declares winners for a room. This operation can only be performed by the room host
 * and must be called before distributing prizes. The winners are stored in the room
 * account and used during prize distribution.
 *
 * ## Architecture
 * This module extracts the winner declaration logic into a focused, testable API module.
 * It uses Phase 1 utilities for PDA derivation and transaction building.
 *
 * ## Security
 * This operation can only be performed by the room host. The caller's public key must
 * match the room's host public key. Winners must have joined the room (PlayerEntry
 * accounts must exist).
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link distributePrizes} - Distribute prizes after declaring winners
 * @see programs/bingo/src/instructions/declare_winners.rs - Contract implementation
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveRoomPDA, derivePlayerEntryPDA } from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Parameters for declaring winners (extended with hostPubkey)
 */
export interface DeclareWinnersParams {
  roomId: string;
  hostPubkey: PublicKey; // Room host's pubkey (must match caller)
  winners: PublicKey[]; // Winner pubkeys (1-10 winners)
}

// Config
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Result from declaring winners
 */
export interface DeclareWinnersResult {
  /** Transaction signature */
  signature: string;
}

/**
 * Declares winners for a room (host only)
 *
 * This operation stores the winner addresses in the room account. Winners must have
 * joined the room (PlayerEntry accounts must exist). The room must be active and not
 * already ended.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Winner declaration parameters
 * @returns Result with transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Must declare 1-10 winners' - If winner count is invalid
 * @throws {Error} Transaction errors - If declaration fails
 *
 * @example
 * ```typescript
 * const result = await declareWinners(context, {
 *   roomId: 'bingo-night-2024',
 *   hostPubkey: hostPublicKey,
 *   winners: [winner1, winner2, winner3],
 * });
 *
 * console.log('Winners declared:', result.signature);
 * ```
 */
export async function declareWinners(
  context: SolanaContractContext,
  params: DeclareWinnersParams
): Promise<DeclareWinnersResult> {
  if (!context.publicKey || !context.provider) {
    throw new Error('Wallet not connected');
  }

  if (!context.program) {
    throw new Error('Program not deployed yet. Run: cd solana-program/bingo && anchor deploy');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  // Validate winners (bingo supports 1-10 winners)
  if (params.winners.length < 1 || params.winners.length > 10) {
    throw new Error('Must declare 1-10 winners');
  }

  // Derive room PDA
  const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);

  // Derive PlayerEntry PDAs for each winner (to verify they actually joined)
  const playerEntryPDAs = params.winners.map(winner => {
    const [playerEntry] = derivePlayerEntryPDA(room, winner);
    return playerEntry;
  });

  // Fetch and validate room state
  try {
    // @ts-ignore - Account types available after program deployment
    const roomAccount = await program.account.room.fetch(room);

    // Validation checks
    if (roomAccount.host.toBase58() !== params.hostPubkey.toBase58()) {
      console.error('[declareWinners] ⚠️ WARNING: Host mismatch!');
    }

    if (roomAccount.ended) {
      console.error('[declareWinners] ⚠️ WARNING: Room already ended!');
    }

    if (roomAccount.winners && roomAccount.winners.length > 0) {
      console.error('[declareWinners] ⚠️ WARNING: Winners already declared!');
    }
  } catch (e: any) {
    console.error('[declareWinners] ❌ Failed to fetch room account:', e);
    throw new Error('Cannot fetch room account: ' + e.message);
  }

  // Build instruction with PlayerEntry PDAs as remaining_accounts
  const ix = await program.methods
    .declareWinners(params.roomId, params.winners)
    .accounts({
      room,
      host: publicKey,
    })
    .remainingAccounts(
      playerEntryPDAs.map(playerEntry => ({
        pubkey: playerEntry,
        isSigner: false,
        isWritable: false, // Read-only, just verifying they exist
      }))
    )
    .instruction();

  // Build transaction and simulate
  const transaction = await buildTransaction({
    connection,
    instructions: [ix],
    feePayer: publicKey,
    commitment: 'finalized',
  });

  const simResult = await simulateTransaction(connection, transaction);

  if (!simResult.success) {
    console.error('[declareWinners] Simulation failed:', simResult.error);
    throw new Error(formatTransactionError(simResult.error) || 'Transaction simulation failed');
  }

  // Send and confirm transaction
  const signature = await provider.sendAndConfirm(transaction, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  return { signature };
}

