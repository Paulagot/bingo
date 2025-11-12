/**
 * @module features/web3/solana/api/admin/recover-room
 *
 * ## Purpose
 * Recovers an abandoned room and refunds players when a host disappears mid-game.
 * This emergency function refunds 90% of collected funds to players and takes 10%
 * platform fee. This prevents funds from being locked if a host abandons a room
 * before ending it.
 *
 * ## Architecture
 * This module extracts the room recovery logic into a focused, testable API module.
 * It uses Phase 1 utilities for PDA derivation, token account management, and
 * transaction building.
 *
 * ## Security
 * This operation can only be performed by the platform admin. The caller's public
 * key must match the GlobalConfig admin public key. The room must not be already
 * ended and must have collected funds.
 *
 * ## Recovery Process
 * 1. Verifies caller is platform admin
 * 2. Fetches all PlayerEntry accounts for the room
 * 3. Gets token accounts for each player
 * 4. Calculates refund per player: (total_collected * 90%) / player_count
 * 5. Transfers 10% to platform wallet
 * 6. Refunds each player their share
 * 7. Marks room as ended
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/instructions/recover_room.rs - Contract implementation
 */

import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, derivePlayerEntryPDA } from '@/shared/lib/solana/pda';
import { getAssociatedTokenAccountAddress } from '@/shared/lib/solana/token-accounts';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

// Import getRoomInfo to fetch room data
import { getRoomInfo } from '@/features/web3/solana/api/room/get-room-info';

// Config
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Parameters for recovering a room
 */
export interface RecoverRoomParams {
  roomId: string;
  hostPubkey: PublicKey;
  roomAddress?: PublicKey; // Optional: Use this room PDA instead of deriving it
}

/**
 * Result from recovering a room
 */
export interface RecoverRoomResult {
  signature: string;
  playersRefunded: number;
  totalRefunded: BN;
  platformFee: BN;
}

/**
 * Recovers an abandoned room and refunds players (admin only)
 *
 * Emergency function for when a host disappears mid-game. Refunds 90% of collected
 * funds to players and takes 10% platform fee. This prevents funds from being
 * locked if a host abandons a room before ending it.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Recovery parameters
 * @returns Result with transaction signature, players refunded, and amounts
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Only platform admin can recover rooms' - If caller is not admin
 * @throws {Error} 'Room already ended' - If room.ended is true
 * @throws {Error} 'Room has no funds to recover' - If total_collected is 0
 * @throws {Error} 'No players found' - If no PlayerEntry accounts exist for room
 * @throws {Error} Transaction errors - If recovery fails
 *
 * @example
 * ```typescript
 * const result = await recoverRoom(context, {
 *   roomId: 'bingo-night-2024',
 *   hostPubkey: hostPublicKey,
 * });
 *
 * console.log('Recovery complete:', {
 *   signature: result.signature,
 *   playersRefunded: result.playersRefunded,
 *   totalRefunded: result.totalRefunded.toString(),
 *   platformFee: result.platformFee.toString(),
 * });
 * ```
 */
export async function recoverRoom(
  context: SolanaContractContext,
  params: RecoverRoomParams
): Promise<RecoverRoomResult> {
  if (!context.publicKey || !context.provider || !context.program) {
    throw new Error('Wallet not connected');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  // Use provided room address or derive it
  let roomPDA: PublicKey;
  if (params.roomAddress) {
    roomPDA = params.roomAddress;
  } else {
    [roomPDA] = deriveRoomPDA(params.hostPubkey, params.roomId);
  }

  // Verify caller is admin
  const [globalConfig] = deriveGlobalConfigPDA();
  // @ts-ignore - Account types available after program deployment
  const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
  if (!globalConfigAccount.admin.equals(publicKey)) {
    throw new Error('Only platform admin can recover rooms');
  }

  // Fetch room info using extracted API module
  const roomInfo = await getRoomInfo(context, roomPDA);
  if (!roomInfo) {
    throw new Error('Room not found at address: ' + roomPDA.toBase58());
  }

  // Verify room is not ended
  if (roomInfo.ended) {
    throw new Error('Room already ended');
  }

  // Verify room has funds
  if (roomInfo.totalCollected.eq(new BN(0))) {
    throw new Error('Room has no funds to recover');
  }

  // Query all PlayerEntry accounts for this room
  // Filter by room pubkey (offset 40 = discriminator 8 + player 32)
  // @ts-ignore - Account types available after program deployment
  const allPlayerEntries = await program.account.playerEntry.all([
    {
      memcmp: {
        offset: 8 + 32, // Skip discriminator (8) + player (32), room is next at offset 40
        bytes: roomPDA.toBase58(), // Anchor memcmp expects base58 string for Pubkeys
      },
    },
  ]);

  if (allPlayerEntries.length === 0) {
    throw new Error('No players found in room');
  }

  // Get token accounts for all players using Phase 1 utilities
  const playerAccounts: Array<{ player: PublicKey; tokenAccount: PublicKey }> = [];
  
  for (const entry of allPlayerEntries) {
    const playerPubkey = entry.account.player as PublicKey;
    const tokenAccount = await getAssociatedTokenAccountAddress(
      roomInfo.feeTokenMint,
      playerPubkey
    );
    playerAccounts.push({
      player: playerPubkey,
      tokenAccount,
    });
  }

  // Get platform token account using Phase 1 utilities
  const platformTokenAccount = await getAssociatedTokenAccountAddress(
    roomInfo.feeTokenMint,
    globalConfigAccount.platformWallet as PublicKey
  );

  // Get room vault PDA
  const [roomVault] = deriveRoomVaultPDA(roomPDA);

  // Build remaining_accounts: [player1_pubkey, player1_token_account, player2_pubkey, player2_token_account, ...]
  // The Rust code uses odd indices (token accounts) but we pass pairs for completeness
  const remainingAccounts = playerAccounts.flatMap(({ player, tokenAccount }) => [
    {
      pubkey: player,
      isSigner: false,
      isWritable: false, // Player pubkey is read-only
    },
    {
      pubkey: tokenAccount,
      isSigner: false,
      isWritable: true, // Token account is writable (receives refund)
    },
  ]);

  // Build recover_room instruction
  const ix = await program.methods
    .recoverRoom(params.roomId)
    .accounts({
      room: roomPDA,
      roomVault,
      globalConfig,
      platformTokenAccount,
      admin: publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();

  // Build transaction using Phase 1 utilities
  const transaction = await buildTransaction({
    connection,
    instructions: [ix],
    feePayer: publicKey,
    commitment: 'finalized',
  });

  // Simulate transaction
  const simResult = await simulateTransaction(connection, transaction);

  if (!simResult.success) {
    console.error('[recoverRoom] Simulation failed:', {
      error: simResult.error,
      logs: simResult.logs,
    });
    throw new Error(formatTransactionError(simResult.error));
  }

  // Send and confirm transaction
  const signature = await provider.sendAndConfirm(transaction);

  // Calculate amounts for return value
  const totalCollected = roomInfo.totalCollected;
  const platformFee = totalCollected.mul(new BN(10)).div(new BN(100)); // 10%
  const totalRefunded = totalCollected.sub(platformFee); // 90%

  return {
    signature,
    playersRefunded: playerAccounts.length,
    totalRefunded,
    platformFee,
  };
}

