/**
 * @module features/web3/solana/api/player/get-player-entry
 *
 * ## Purpose
 * Fetches player entry information from on-chain account data. This is a pure query
 * function with no side effects - it only reads account data from the blockchain.
 *
 * ## Architecture
 * This module extracts the player entry query logic into a focused, testable function.
 * It uses the Anchor program's account API to fetch player entry account data and
 * transforms it into a standardized PlayerEntryInfo type.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see programs/bingo/src/state/player_entry.rs - PlayerEntry account structure
 */

import { PublicKey } from '@solana/web3.js';
import type { SolanaContractContext, PlayerEntryInfo } from '@/features/web3/solana/model/types';

/**
 * Fetches player entry information from on-chain account data
 *
 * This is a pure query function that reads player entry account data from the blockchain.
 * It does not modify any state or send any transactions.
 *
 * @param context - Solana contract context (must have program initialized)
 * @param playerEntryPubkey - Public key of the player entry account to fetch
 * @returns Player entry information or null if account doesn't exist or fetch fails
 *
 * @example
 * ```typescript
 * const entry = await getPlayerEntry(context, playerEntryPublicKey);
 * if (entry) {
 *   console.log('Player:', entry.player.toBase58());
 *   console.log('Total paid:', entry.totalPaid.toString());
 *   console.log('Join slot:', entry.joinSlot.toString());
 * }
 * ```
 */
export async function getPlayerEntry(
  context: SolanaContractContext,
  playerEntryPubkey: PublicKey
): Promise<PlayerEntryInfo | null> {
  if (!context.program) {
    console.error('[getPlayerEntry] Program not initialized');
    return null;
  }

  const { program } = context;

  try {
    // @ts-ignore - Account types available after program deployment
    const entry = await program.account.playerEntry.fetch(playerEntryPubkey);

    // Transform Anchor account data to PlayerEntryInfo type
    return {
      player: entry.player as PublicKey,
      room: entry.room as PublicKey,
      entryPaid: entry.entryPaid as any, // BN type
      extrasPaid: entry.extrasPaid as any, // BN type
      totalPaid: entry.totalPaid as any, // BN type
      joinSlot: entry.joinSlot as any, // BN type
    };
  } catch (error: any) {
    console.error('[getPlayerEntry] Failed to fetch player entry account:', error);
    return null;
  }
}

