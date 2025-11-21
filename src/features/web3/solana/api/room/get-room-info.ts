/**
 * @module features/web3/solana/api/room/get-room-info
 *
 * ## Purpose
 * Fetches room information from on-chain account data. This is a pure query function
 * with no side effects - it only reads account data from the blockchain.
 *
 * ## Architecture
 * This module extracts the room query logic into a focused, testable function.
 * It uses the Anchor program's account API to fetch room account data and transforms
 * it into a standardized RoomInfo type.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/state/room.rs - Room account structure
 */

import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import type { SolanaContractContext, RoomInfo } from '@/features/web3/solana/model/types';

/**
 * Fetches room information from on-chain account data
 *
 * This is a pure query function that reads room account data from the blockchain.
 * It does not modify any state or send any transactions.
 *
 * @param context - Solana contract context (must have program initialized)
 * @param roomPubkey - Public key of the room account to fetch
 * @returns Room information or null if account doesn't exist or fetch fails
 *
 * @example
 * ```typescript
 * const roomInfo = await getRoomInfo(context, roomPublicKey);
 * if (roomInfo) {
 *   console.log('Room ID:', roomInfo.roomId);
 *   console.log('Player count:', roomInfo.playerCount);
 *   console.log('Total collected:', roomInfo.totalCollected.toString());
 * }
 * ```
 */
export async function getRoomInfo(
  context: SolanaContractContext,
  roomPubkey: PublicKey
): Promise<RoomInfo | null> {
  if (!context.program) {
    console.error('[getRoomInfo] Program not initialized');
    return null;
  }

  const { program } = context;

  try {
    // @ts-ignore - Account types available after program deployment
    const roomAccount = await program.account.room.fetch(roomPubkey);

    // Transform Anchor account data to RoomInfo type
    return {
      roomId: roomAccount.roomId as string,
      host: roomAccount.host as PublicKey,
      charityWallet: roomAccount.charityWallet as PublicKey,
      feeTokenMint: roomAccount.feeTokenMint as PublicKey,
      entryFee: roomAccount.entryFee as any, // BN type
      maxPlayers: roomAccount.maxPlayers as number,
      playerCount: roomAccount.playerCount as number,
      totalCollected: roomAccount.totalCollected as any, // BN type
      hostFeeBps: roomAccount.hostFeeBps as number,
      prizePoolBps: roomAccount.prizePoolBps as number,
      charityBps: roomAccount.charityBps as number,
      status: roomAccount.status,
      winners: (roomAccount.winners as PublicKey[]) || [],
      prizeDistribution: roomAccount.prizeDistribution
        ? (roomAccount.prizeDistribution as number[])
        : undefined,
      prizeAssets: roomAccount.prizeAssets
        ? (roomAccount.prizeAssets as Array<{
            mint: PublicKey;
            amount: any; // BN type
            deposited: boolean;
          } | null>).map((asset) =>
            asset
              ? {
                  mint: asset.mint,
                  amount: asset.amount,
                  uploaded: asset.deposited,
                }
              : null
          )
        : undefined,
    };
  } catch (error: any) {
    console.error('[getRoomInfo] Failed to fetch room account:', error);
    return null;
  }
}

