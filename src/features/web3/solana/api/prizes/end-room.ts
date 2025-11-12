/**
 * @module features/web3/solana/api/prizes/end-room
 *
 * ## Purpose
 * Ends a bingo room and atomically distributes all collected funds. This is the
 * final and critical transaction that distributes funds to platform, charity, host,
 * and winners in a single atomic operation.
 *
 * ## Architecture
 * This module extracts the room ending logic into a focused, testable API module.
 * It uses Phase 1 utilities for PDA derivation, token account management, and
 * transaction building.
 *
 * ## Security
 * This operation can only be performed by the room host (or if the room has expired).
 * The room must have winners declared before ending.
 *
 * ## Token Account Management
 * This function uses Phase 1 utilities to get or create token accounts for all
 * recipients (platform, charity, host, winners) before the transaction.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link declareWinners} - Must be called before this function
 * @see programs/bingo/src/instructions/end_room.rs - Contract implementation
 */

import { PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';

// Phase 1 utilities
import { deriveGlobalConfigPDA, deriveRoomPDA, deriveRoomVaultPDA } from '@/shared/lib/solana/pda';
import { getAssociatedTokenAccountAddress } from '@/shared/lib/solana/token-accounts';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

// Config
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Parameters for ending a room
 */
export interface EndRoomParams {
  roomId: string;
  hostPubkey: PublicKey;
  winners: PublicKey[];
  feeTokenMint: PublicKey;
}

/**
 * Result from ending a room
 */
export interface EndRoomResult {
  signature: string;
  charityAmount?: BN;
}

/**
 * Ends a bingo room and atomically distributes all collected funds
 *
 * This is the FINAL and CRITICAL transaction that distributes all funds in a single
 * atomic operation. Funds are distributed to:
 * - Platform wallet (20% platform fee)
 * - Charity wallet (40%+ charity allocation)
 * - Host wallet (0-5% host fee)
 * - Winners (0-35% prize pool, split according to prize distribution)
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - End room parameters
 * @returns Result with transaction signature and charity amount
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not initialized' - If Anchor program not initialized
 * @throws {Error} 'Room already ended' - If room.ended is true
 * @throws {Error} 'Winners not declared' - If declareWinners not called
 * @throws {Error} Transaction errors - If distribution fails
 *
 * @example
 * ```typescript
 * const result = await endRoom(context, {
 *   roomId: 'bingo-night-2024',
 *   hostPubkey: hostPublicKey,
 *   winners: [winner1, winner2, winner3],
 *   feeTokenMint: USDC_MINT,
 * });
 *
 * console.log('Room ended:', result.signature);
 * console.log('Charity amount:', result.charityAmount?.toString());
 * ```
 */
export async function endRoom(
  context: SolanaContractContext,
  params: EndRoomParams
): Promise<EndRoomResult> {
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

  // Derive PDAs
  const [globalConfig] = deriveGlobalConfigPDA();
  const [room] = deriveRoomPDA(params.hostPubkey, params.roomId);
  const [roomVault] = deriveRoomVaultPDA(room);

  // Fetch global config to get platform and charity wallets
  // @ts-ignore - Account types available after program deployment
  const globalConfigAccount = await program.account.globalConfig.fetch(globalConfig);
  const platformWallet = globalConfigAccount.platformWallet as PublicKey;
  const charityWallet = globalConfigAccount.charityWallet as PublicKey;

  // Get token accounts for all recipients using Phase 1 utilities
  const platformTokenAccount = getAssociatedTokenAccountAddress(
    params.feeTokenMint,
    platformWallet
  );
  const charityTokenAccount = getAssociatedTokenAccountAddress(
    params.feeTokenMint,
    charityWallet
  );
  const hostTokenAccount = getAssociatedTokenAccountAddress(
    params.feeTokenMint,
    params.hostPubkey
  );

  // Get winner token accounts (must be passed as remaining accounts)
  const winnerTokenAccounts = params.winners.map(winner =>
    getAssociatedTokenAccountAddress(params.feeTokenMint, winner)
  );

  // Build instruction with remaining accounts for winners
  const ix = await program.methods
    .endRoom(params.roomId, params.winners)
    .accounts({
      room,
      roomVault,
      globalConfig,
      platformTokenAccount,
      charityTokenAccount,
      hostTokenAccount,
      host: publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(
      winnerTokenAccounts.map(account => ({
        pubkey: account,
        isSigner: false,
        isWritable: true,
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
    console.error('[endRoom] SIMULATION FAILED');
    console.error('[endRoom] Error:', simResult.error);
    console.error('[endRoom] Logs:', simResult.logs);
    throw new Error(formatTransactionError(simResult.error));
  }

  // Send and confirm
  const signature = await provider.sendAndConfirm(transaction);

  // Parse RoomEnded event to get exact charity_amount that was sent
  let charityAmount: BN | undefined;
  try {
    const txDetails = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (txDetails?.meta?.logMessages) {
      // Parse events from transaction logs
      for (const log of txDetails.meta.logMessages) {
        if (log.includes('Program data:')) {
          const base64Match = log.match(/Program data: ([A-Za-z0-9+/=]+)/);
          if (base64Match) {
            try {
              const eventData = Buffer.from(base64Match[1], 'base64');
              const decoded = program.coder.events.decode('RoomEnded', eventData);
              if (decoded && decoded.charityAmount) {
                charityAmount = new BN(decoded.charityAmount.toString());
                break;
              }
            } catch (decodeError) {
              continue;
            }
          }
        }
      }
    }
  } catch (eventParseError) {
    console.warn('[endRoom] Failed to parse RoomEnded event:', eventParseError);
  }

  return {
    signature,
    charityAmount,
  };
}

