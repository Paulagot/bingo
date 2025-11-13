/**
 * @module chains/solana/hooks/useSolanaQueries
 *
 * Solana Query Operations Hook
 *
 * ## Purpose
 *
 * This hook encapsulates all read-only query operations for the Solana contract. Query
 * operations fetch on-chain data without modifying state. These operations are used to
 * display room information, player participation records, and other on-chain data.
 *
 * ## PDA Derivation
 *
 * Query operations use Program Derived Addresses (PDAs) to locate on-chain accounts:
 *
 * - **Room PDA**: `["room", host_pubkey, room_id]` - Locates room account
 * - **Player Entry PDA**: `["player-entry", room_pubkey, player_pubkey]` - Locates player entry
 *
 * The hook automatically derives PDAs when needed, but also accepts pre-derived PDAs
 * to avoid derivation errors.
 *
 * ## Type Conversions
 *
 * Query results are converted from base API types to extended hook types for backward
 * compatibility. The conversion functions (`toRoomInfoExtended`, `toPlayerEntryInfoExtended`)
 * handle this automatically.
 *
 * ## Usage
 *
 * ```typescript
 * const {
 *   getRoomInfo,
 *   getPlayerEntry,
 * } = useSolanaQueries();
 *
 * // Fetch room information
 * const roomInfo = await getRoomInfo(roomAddress);
 * console.log('Room max players:', roomInfo?.maxPlayers);
 *
 * // Fetch player entry
 * const entry = await getPlayerEntry(roomAddress, playerAddress);
 * console.log('Player total paid:', entry?.totalPaid);
 * ```
 */

import { useCallback } from 'react';
import type { PublicKey } from '@solana/web3.js';
import { derivePlayerEntryPDA } from '@/shared/lib/solana/pda';
import { useSolanaContext } from './useSolanaContext';
import { createApiWrapper } from '../utils/api-wrapper';
import { toRoomInfoExtended, toPlayerEntryInfoExtended } from '../utils/hook-helpers';
import type { RoomInfoExtended, PlayerEntryInfoExtended } from '../types/hook-types';
import {
  getRoomInfo as getRoomInfoAPI,
} from '@/features/web3/solana/api/room';
import {
  getPlayerEntry as getPlayerEntryAPI,
} from '@/features/web3/solana/api/player';

/**
 * Hook for query operations on Solana contract
 *
 * @returns Object with all query operation functions
 */
export function useSolanaQueries() {
  const context = useSolanaContext();

  /**
   * Fetches room information from on-chain account
   *
   * Retrieves all room data from the on-chain account, including:
   * - Room configuration (max players, entry fee, fee structure)
   * - Room state (ended, expiration, player count)
   * - Prize mode (pool-based or asset-based)
   * - Host and charity wallet addresses
   *
   * **Return Type**:
   * Returns `RoomInfoExtended` which includes all base `RoomInfo` fields plus
   * additional fields for backward compatibility (`ended`, `expirationSlot`, `prizeMode`).
   *
   * @param roomAddress - Room PDA address (base58 string or PublicKey)
   * @returns Room information or null if room not found
   *
   * @throws Error if wallet not connected or room fetch fails
   *
   * @example
   * ```typescript
   * const roomInfo = await getRoomInfo(roomAddress);
   *
   * if (roomInfo) {
   *   console.log('Room ID:', roomInfo.roomId);
   *   console.log('Max players:', roomInfo.maxPlayers);
   *   console.log('Entry fee:', roomInfo.entryFee.toString());
   *   console.log('Ended:', roomInfo.ended);
   * }
   * ```
   */
  const getRoomInfo = useCallback(
    createApiWrapper(
      'getRoomInfo',
      async (ctx, roomAddress: PublicKey): Promise<RoomInfoExtended | null> => {
        const result = await getRoomInfoAPI(ctx, roomAddress);
        // Convert to extended type for backward compatibility
        return toRoomInfoExtended(result);
      },
      []
    )(context),
    [context]
  );

  /**
   * Fetches player entry information from on-chain account
   *
   * Retrieves player participation data from the on-chain account, including:
   * - Entry fee paid
   * - Extras amount paid (additional donation)
   * - Total amount paid
   * - Join slot (when player joined)
   * - Room reference
   *
   * **PDA Derivation**:
   * The player entry PDA is automatically derived using:
   * `["player-entry", room_pubkey, player_pubkey]`
   *
   * **Return Type**:
   * Returns `PlayerEntryInfoExtended` which includes all base `PlayerEntryInfo` fields
   * plus additional fields for backward compatibility (`room`, `entryPaid`, `extrasPaid`,
   * `totalPaid`, `joinSlot`).
   *
   * @param roomAddress - Room PDA address
   * @param playerAddress - Player's public key
   * @returns Player entry information or null if entry not found
   *
   * @throws Error if wallet not connected or entry fetch fails
   *
   * @example
   * ```typescript
   * const entry = await getPlayerEntry(roomAddress, playerAddress);
   *
   * if (entry) {
   *   console.log('Entry fee paid:', entry.entryPaid.toString());
   *   console.log('Extras paid:', entry.extrasPaid.toString());
   *   console.log('Total paid:', entry.totalPaid.toString());
   *   console.log('Joined at slot:', entry.joinSlot.toString());
   * }
   * ```
   */
  const getPlayerEntry = useCallback(
    createApiWrapper(
      'getPlayerEntry',
      async (ctx, roomAddress: PublicKey, playerAddress: PublicKey): Promise<PlayerEntryInfoExtended | null> => {
        // Derive player entry PDA
        const [playerEntryPDA] = derivePlayerEntryPDA(roomAddress, playerAddress);
        const result = await getPlayerEntryAPI(ctx, playerEntryPDA);
        // Convert to extended type for backward compatibility
        return toPlayerEntryInfoExtended(result);
      },
      []
    )(context),
    [context]
  );

  return {
    getRoomInfo,
    getPlayerEntry,
  };
}

