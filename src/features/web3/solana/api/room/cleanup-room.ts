/**
 * @module features/web3/solana/api/room/cleanup-room
 *
 * ## Purpose
 * Cleans up a room after it has ended and all prizes have been distributed. This
 * operation closes the room vault token account and reclaims rent lamports. For
 * asset-based rooms, it also closes prize vault accounts.
 *
 * ## Architecture
 * This module extracts the room cleanup logic into a focused, testable API module.
 * It uses Phase 1 utilities for PDA derivation and transaction building.
 *
 * ## Security
 * This operation can be performed by the room host or platform admin. The room must
 * be ended and the vault must be empty before cleanup.
 *
 * ## Rent Reclamation
 * This operation reclaims rent from:
 * - Room account
 * - Room vault token account
 * - Prize vault token accounts (for asset-based rooms, if empty)
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link endRoom} - Must be called before cleanup
 * @see programs/bingo/src/instructions/cleanup_room.rs - Contract implementation
 */

import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA, derivePrizeVaultPDA } from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

// Config
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Parameters for cleaning up a room
 */
export interface CleanupRoomParams {
  roomId: string;
  hostPubkey: PublicKey;
}

/**
 * Result from cleaning up a room
 */
export interface CleanupRoomResult {
  signature: string;
  rentReclaimed: number; // Rent reclaimed in lamports
}

/**
 * Cleans up a room and reclaims rent (host or admin)
 *
 * Closes vault token account and returns rent lamports after room ends. For
 * asset-based rooms, also closes prize vault accounts if they are empty.
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Cleanup parameters
 * @returns Result with transaction signature and rent reclaimed
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Room must be ended before cleanup' - If room is not ended
 * @throws {Error} 'Vault must be empty before cleanup' - If vault has remaining tokens
 * @throws {Error} Transaction errors - If cleanup fails
 *
 * @example
 * ```typescript
 * const result = await cleanupRoom(context, {
 *   roomId: 'bingo-night-2024',
 *   hostPubkey: hostPublicKey,
 * });
 *
 * console.log('Rent reclaimed:', result.rentReclaimed / 1e9, 'SOL');
 * ```
 */
export async function cleanupRoom(
  context: SolanaContractContext,
  params: CleanupRoomParams
): Promise<CleanupRoomResult> {
  if (!context.publicKey || !context.provider || !context.program) {
    throw new Error('Wallet not connected');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  // Derive PDAs
  const [globalConfig] = deriveGlobalConfigPDA();
  const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);
  const [roomVault] = deriveRoomVaultPDA(room);

  // Verify room is ended
  // @ts-ignore - Account types available after program deployment
  const roomAccount = await program.account.room.fetch(room);
  if (!roomAccount.ended) {
    throw new Error('Room must be ended before cleanup');
  }

  // Verify vault is empty
  const vaultAccount = await getAccount(connection, roomVault);
  if (vaultAccount.amount > 0n) {
    throw new Error('Vault must be empty before cleanup. Distribute prizes first.');
  }

  // Get rent before closing for return value (from room, vault, and prize vaults)
  const roomAccountInfo = await connection.getAccountInfo(room);
  const vaultAccountInfo = await connection.getAccountInfo(roomVault);
  const roomRent = roomAccountInfo?.lamports || 0;
  const vaultRent = vaultAccountInfo?.lamports || 0;
  let rentReclaimed = roomRent + vaultRent;

  // Check if room is asset-based and get prize vaults
  const isAssetBased = roomAccount.prizeMode &&
    ((roomAccount.prizeMode as any).assetBased !== undefined ||
     (roomAccount.prizeMode as any).AssetBased !== undefined);

  const remainingAccounts = [];
  if (isAssetBased && roomAccount.prizeAssets) {
    // Derive prize vault PDAs for each prize (up to 3)
    // Only add vaults that exist and are empty - contract will handle them gracefully
    for (let prizeIndex = 0; prizeIndex < 3; prizeIndex++) {
      const prizeAsset = roomAccount.prizeAssets[prizeIndex];
      if (prizeAsset && (prizeAsset as any).deposited) {
        // Derive prize vault PDA using Phase 1 utility
        const [prizeVault] = derivePrizeVaultPDA(room, prizeIndex);

        // Check if prize vault exists and is empty
        try {
          const prizeVaultAccount = await getAccount(connection, prizeVault);

          if (prizeVaultAccount.amount === 0n) {
            const prizeVaultInfo = await connection.getAccountInfo(prizeVault);
            if (prizeVaultInfo) {
              rentReclaimed += prizeVaultInfo.lamports;
              remainingAccounts.push({
                pubkey: prizeVault,
                isSigner: false,
                isWritable: true,
              });
            }
          } else {
            console.error(`[cleanupRoom] Prize vault ${prizeIndex} is not empty:`, {
              address: prizeVault.toBase58(),
              amount: prizeVaultAccount.amount.toString(),
            });
            throw new Error(`Prize vault ${prizeIndex} (${prizeVault.toBase58()}) has ${prizeVaultAccount.amount} tokens. Prizes were not fully distributed.`);
          }
        } catch (error: any) {
          // If getAccount fails, vault doesn't exist (was never created or already closed)
          if (error.message && error.message.includes('could not find account')) {
            // Don't add to remaining accounts if it doesn't exist
          } else if (error.message && error.message.includes('Prize vault')) {
            // Re-throw our own error about non-empty vault
            throw error;
          } else {
            console.warn(`[cleanupRoom] Error checking prize vault ${prizeIndex}:`, error);
            // Don't add to remaining accounts on error
          }
        }
      }
    }
  }

  // Build instruction
  // Ensure the Anchor `methods` API and the `cleanupRoom` method exist before invoking.
  const cleanupBuilder = program.methods?.cleanupRoom?.(params.roomId);
  if (!cleanupBuilder) {
    throw new Error('Program methods not initialized: cleanupRoom not available on program.methods');
  }

  const ix = await cleanupBuilder
    .accounts({
      room,
      roomVault,
      globalConfig,
      caller: publicKey,
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
    console.error('[cleanupRoom] Simulation failed:', {
      error: simResult.error,
      logs: simResult.logs,
      remainingAccountsCount: remainingAccounts.length,
      isAssetBased,
      roomEnded: roomAccount.ended,
      vaultBalance: vaultAccount.amount.toString(),
    });
    throw new Error(formatTransactionError(simResult.error));
  }

  // Send and confirm
  const signature = await provider.sendAndConfirm(transaction);

  return { signature, rentReclaimed };
}

