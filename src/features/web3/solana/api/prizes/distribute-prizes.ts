/**
 * @module features/web3/solana/api/prizes/distribute-prizes
 *
 * ## Purpose
 * Handles prize distribution to winners after a game ends. This module extracts the
 * distribute prizes logic into a focused, testable function that uses Phase 1 utilities
 * for PDA derivation, token account management, and transaction building.
 *
 * ## Architecture
 * This module follows the extraction pattern established in Phase 6.2:
 * - Uses Phase 1 utilities (PDA derivation, token accounts, transactions)
 * - Uses centralized types from Phase 2
 * - Includes comprehensive JSDoc documentation
 * - Is testable and maintainable
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/instructions/distribute_prizes.rs - Distribute prizes instruction
 */

import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Phase 1 utilities
import {
  deriveRoomVaultPDA,
  deriveGlobalConfigPDA,
} from '@/shared/lib/solana/pda';
import {
  getAssociatedTokenAccountAddress,
} from '@/shared/lib/solana/token-accounts';
import { buildTransaction } from '@/shared/lib/solana/transactions';

// Phase 2 types
import type { SolanaContractContext, DistributePrizesParams, DistributePrizesResult } from '@/features/web3/solana/model/types';

/**
 * Distributes prizes to winners after game ends
 *
 * This function handles prize distribution for both pool-based and asset-based rooms.
 * For pool-based rooms, it calculates prize amounts from the total pool.
 * For asset-based rooms, it transfers pre-deposited prize assets to winners.
 *
 * ## Pool-Based Distribution
 *
 * The total pool is split according to prize percentages:
 * - 1st place: receives firstPlacePct of prize pool
 * - 2nd place (optional): receives secondPlacePct of prize pool
 * - 3rd place (optional): receives thirdPlacePct of prize pool
 *
 * ## Asset-Based Distribution
 *
 * Pre-deposited prize assets are transferred:
 * - Each winner receives their designated prize asset
 * - Prize vaults are emptied and closed
 * - Rent is reclaimed by the host
 *
 * @param context - Solana contract context (must have program, provider, publicKey, and connection)
 * @param params - Prize distribution parameters
 * @param params.roomId - Room identifier
 * @param params.winners - Array of winner public keys (1-10 winners, as strings or PublicKeys)
 * @param params.roomAddress - Optional room PDA address
 * @param params.charityWallet - Optional charity wallet override
 * @returns Distribution result with transaction signature
 * @throws Error if wallet not connected, room not found, or winners invalid
 *
 * @example
 * ```typescript
 * const result = await distributePrizes(context, {
 *   roomId: 'bingo-night-2024',
 *   winners: ['winner1...', 'winner2...', 'winner3...'],
 *   charityWallet: 'charity-wallet-address',
 * });
 *
 * console.log('Prizes distributed:', result.signature);
 * ```
 */
export async function distributePrizes(
  context: SolanaContractContext,
  params: DistributePrizesParams
): Promise<DistributePrizesResult> {
  if (!context.publicKey || !context.provider) {
    throw new Error('Wallet not connected');
  }

  if (!context.program) {
    throw new Error('Program not deployed yet');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  // Validate winners array
  if (!params.winners || params.winners.length === 0) {
    throw new Error('At least one winner must be specified');
  }

  if (params.winners.length > 10) {
    throw new Error('Maximum 10 winners allowed');
  }

  // Derive or use provided room PDA
  let roomPDA: PublicKey;
  if (params.roomAddress) {
    roomPDA = new PublicKey(params.roomAddress);
  } else {
    // Need to find the room by searching all rooms
    const rooms = await (program.account as any).room.all();
    const matchingRoom = rooms.find((r: any) => {
      const roomData = r.account;
      const roomIdStr = Buffer.from(roomData.roomId).toString('utf8').replace(/\0/g, '');
      return roomIdStr === params.roomId;
    });

    if (!matchingRoom) {
      throw new Error(`Room "${params.roomId}" not found`);
    }

    roomPDA = matchingRoom.publicKey;
  }

  // Fetch room data
  const roomAccount = await (program.account as any).room.fetch(roomPDA);
  const [roomVault] = deriveRoomVaultPDA(roomPDA);
  const [globalConfig] = deriveGlobalConfigPDA();

  // Get charity wallet (use TGB dynamic address if provided, otherwise room's charity wallet)
  const charityWallet = params.charityWallet
    ? new PublicKey(params.charityWallet)
    : (roomAccount.charityWallet as PublicKey);

  // Get fee token mint from room
  const feeTokenMint = roomAccount.feeTokenMint as PublicKey;

  // Get or create token accounts for winners and charity
  const winnerTokenAccounts: PublicKey[] = [];
  for (const winner of params.winners) {
    const winnerPubkey = typeof winner === 'string' ? new PublicKey(winner) : winner;
    const winnerATA = getAssociatedTokenAccountAddress(
      feeTokenMint,
      winnerPubkey
    );
    winnerTokenAccounts.push(winnerATA);
  }

  const charityTokenAccount = getAssociatedTokenAccountAddress(
    feeTokenMint,
    charityWallet
  );

  const globalConfigAccount = await (program.account as any).globalConfig.fetch(globalConfig);
  const platformWallet = globalConfigAccount.platformWallet as PublicKey;
  const platformTokenAccount = getAssociatedTokenAccountAddress(
    feeTokenMint,
    platformWallet
  );

  const hostTokenAccount = getAssociatedTokenAccountAddress(
    feeTokenMint,
    roomAccount.host as PublicKey
  );

  // Build instruction
  const winnerPubkeys = params.winners.map((w: string | PublicKey) =>
    typeof w === 'string' ? new PublicKey(w) : w
  );

  const distributePrizesIx = await (program.methods as any)
    .distributePrizes(params.roomId, winnerPubkeys)
    .accounts({
      room: roomPDA,
      roomVault,
      globalConfig,
      charityTokenAccount,
      platformTokenAccount,
      hostTokenAccount,
      caller: publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts([
      ...winnerPubkeys.map((winner: PublicKey) => ({
        pubkey: winner,
        isSigner: false,
        isWritable: false,
      })),
      ...winnerTokenAccounts.map((ata: PublicKey) => ({
        pubkey: ata,
        isSigner: false,
        isWritable: true,
      })),
    ])
    .instruction();

  // Build transaction using Phase 1 utilities
  const transaction = await buildTransaction({
    connection,
    instructions: [distributePrizesIx],
    feePayer: publicKey,
    commitment: 'confirmed',
  });

  // Send and confirm using Anchor provider (handles signing automatically)
  const signature = await provider.sendAndConfirm(transaction, [], {
    skipPreflight: false,
    commitment: 'confirmed',
  });

  return {
    signature,
    winnersCount: winnerPubkeys.length,
  };
}

