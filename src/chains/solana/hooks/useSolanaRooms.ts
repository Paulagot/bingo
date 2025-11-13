/**
 * @module chains/solana/hooks/useSolanaRooms
 *
 * Solana Room Operations Hook
 *
 * ## Purpose
 *
 * This hook encapsulates all room-related operations for the Solana contract. Room operations
 * include room creation (pool-based and asset-based), room lifecycle management (close joining,
 * cleanup), and room ending.
 *
 * ## Room Types
 *
 * ### Pool-Based Rooms
 *
 * Rooms where prizes come from a pool of collected entry fees. The prize pool is calculated
 * as a percentage of total entry fees (0-35% depending on host fee).
 *
 * ### Asset-Based Rooms
 *
 * Rooms where prizes are pre-deposited SPL tokens (NFTs, custom tokens, etc.). The host
 * deposits assets before the room starts, and winners receive those assets.
 *
 * ## Room Lifecycle
 *
 * 1. **Create**: Host creates room (pool or asset-based)
 * 2. **Join**: Players join and pay entry fees
 * 3. **Close Joining**: Host closes room to new players
 * 4. **End**: Host ends room and distributes prizes
 * 5. **Cleanup**: Host cleans up room and reclaims rent
 *
 * ## Usage
 *
 * ```typescript
 * const {
 *   createPoolRoom,
 *   createAssetRoom,
 *   closeJoining,
 *   cleanupRoom,
 *   endRoom,
 * } = useSolanaRooms();
 *
 * // Create a pool-based room
 * const room = await createPoolRoom({
 *   roomId: 'my-room',
 *   entryFee: new BN(1000000),
 *   // ... other params
 * });
 * ```
 */

import { useCallback } from 'react';
import type { PublicKey } from '@solana/web3.js';
import type {
  CreatePoolRoomParams,
  CreateAssetRoomParams,
  RoomCreationResult,
} from '@/features/web3/solana/model/types';
import type { EndRoomParams } from '../types/hook-types';
import { useSolanaContext } from './useSolanaContext';
import { createApiWrapper } from '../utils/api-wrapper';
import {
  createPoolRoom as createPoolRoomAPI,
  createAssetRoom as createAssetRoomAPI,
  closeJoining as closeJoiningAPI,
  cleanupRoom as cleanupRoomAPI,
} from '@/features/web3/solana/api/room';
import { endRoom as endRoomAPI } from '@/features/web3/solana/api/prizes';

/**
 * Hook for room operations on Solana contract
 *
 * @returns Object with all room operation functions
 */
export function useSolanaRooms() {
  const context = useSolanaContext();

  /**
   * Creates a new pool-based fundraising room
   *
   * Creates a room where winners receive prizes from a pool of collected entry fees.
   * The room is configured with a fee structure that allocates funds between platform
   * (20%), host (0-5%), prize pool (0-35%), and charity (40%+).
   *
   * **Fee Structure**:
   * - Platform Fee: 20% (fixed)
   * - Host Fee: 0-5% (configurable)
   * - Prize Pool: 0-35% (max = 40% - host fee)
   * - Charity: Minimum 40% (calculated remainder)
   *
   * **Automatic Initialization**:
   * This function automatically initializes GlobalConfig and TokenRegistry if they
   * don't exist, and approves the fee token if needed.
   *
   * @param params - Room creation parameters
   * @returns Room creation result with room PDA and transaction signature
   *
   * @throws Error if wallet not connected, validation fails, or room creation fails
   *
   * @example
   * ```typescript
   * const room = await createPoolRoom({
   *   roomId: 'my-room-123',
   *   entryFee: new BN(1000000), // 1 USDC
   *   hostFeeBps: 100, // 1%
   *   prizePoolBps: 3900, // 39% (max with 1% host fee)
   *   maxPlayers: 100,
   *   feeTokenMint: USDC_MINT,
   *   charityWallet: charityAddress,
   *   prizeDistribution: [50, 30, 20], // 50% 1st, 30% 2nd, 20% 3rd
   * });
   * ```
   */
  const createPoolRoom = useCallback(
    createApiWrapper(
      'createPoolRoom',
      async (ctx, params: CreatePoolRoomParams): Promise<RoomCreationResult> => {
        return await createPoolRoomAPI(ctx, params);
      },
      []
    )(context),
    [context]
  );

  /**
   * Creates an asset-based room where prizes are pre-deposited SPL tokens
   *
   * Creates a room where winners receive pre-deposited assets (NFTs, custom tokens, etc.).
   * The host must deposit assets before players can join. Asset-based rooms don't use
   * entry fees for prizes - all entry fees go to platform, host, and charity.
   *
   * **Fee Structure** (same as pool rooms):
   * - Platform Fee: 20% of entry fees
   * - Host Fee: 0-5% of entry fees
   * - Charity: 40%+ of entry fees
   * - Prizes: Pre-deposited assets (not from entry fees)
   *
   * @param params - Asset room creation parameters
   * @returns Room creation result with room PDA and transaction signature
   *
   * @throws Error if wallet not connected, validation fails, or room creation fails
   *
   * @example
   * ```typescript
   * const room = await createAssetRoom({
   *   roomId: 'nft-raffle',
   *   entryFee: new BN(1000000), // Entry fee for platform/host/charity
   *   maxPlayers: 50,
   *   feeTokenMint: USDC_MINT,
   *   charityWallet: charityAddress,
   * });
   *
   * // Then deposit assets
   * await depositPrizeAsset({
   *   roomId: 'nft-raffle',
   *   assetMint: nftMint,
   *   amount: new BN(1),
   * });
   * ```
   */
  const createAssetRoom = useCallback(
    createApiWrapper(
      'createAssetRoom',
      async (ctx, params: CreateAssetRoomParams): Promise<RoomCreationResult> => {
        return await createAssetRoomAPI(ctx, params);
      },
      []
    )(context),
    [context]
  );

  /**
   * Closes joining for a room (host only)
   *
   * Prevents new players from joining the room. This should be called when the host
   * is ready to start the game or when the room has reached capacity.
   *
   * **After Closing**:
   * - No new players can join
   * - Existing players can still participate
   * - Host can proceed to end the room
   *
   * @param params - Close joining parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Room host's public key (must match caller)
   * @returns Transaction signature
   *
   * @throws Error if wallet not connected, not host, or room not found
   *
   * @example
   * ```typescript
   * await closeJoining({
   *   roomId: 'my-room',
   *   hostPubkey: myPublicKey,
   * });
   * ```
   */
  const closeJoining = useCallback(
    createApiWrapper(
      'closeJoining',
      async (ctx, params: { roomId: string; hostPubkey: PublicKey }) => {
        const result = await closeJoiningAPI(ctx, params);
        return { signature: result.signature };
      },
      []
    )(context),
    [context]
  );

  /**
   * Cleans up a room after it's ended (host only)
   *
   * Reclaims rent from closed room accounts. This should be called after the room has
   * ended and prizes have been distributed. Cleanup is optional but recommended to
   * reclaim SOL from closed accounts.
   *
   * @param params - Cleanup parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Room host's public key (must match caller)
   * @returns Cleanup result with transaction signature and rent reclaimed
   *
   * @throws Error if wallet not connected, not host, or room not found
   *
   * @example
   * ```typescript
   * const result = await cleanupRoom({
   *   roomId: 'my-room',
   *   hostPubkey: myPublicKey,
   * });
   * console.log(`Reclaimed ${result.rentReclaimed} SOL`);
   * ```
   */
  const cleanupRoom = useCallback(
    createApiWrapper(
      'cleanupRoom',
      async (ctx, params: { roomId: string; hostPubkey: PublicKey }) => {
        const result = await cleanupRoomAPI(ctx, params);
        return { signature: result.signature, rentReclaimed: result.rentReclaimed };
      },
      []
    )(context),
    [context]
  );

  /**
   * Ends a room and distributes prizes
   *
   * Ends the room and triggers prize distribution. Winners must have been declared
   * via `declareWinners` before calling this function. The room must be in a valid
   * state for ending (joining closed, not already ended, etc.).
   *
   * **Prize Distribution**:
   * - Pool rooms: Distributes from prize pool based on winner percentages
   * - Asset rooms: Distributes pre-deposited assets to winners
   *
   * @param params - End room parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Room host's public key (must match caller or room expired)
   * @param params.winners - Array of winner public keys (must match declared winners)
   * @param params.feeTokenMint - SPL token mint for entry fees
   * @returns Transaction signature
   *
   * @throws Error if wallet not connected, winners not declared, or room not in valid state
   *
   * @example
   * ```typescript
   * // First declare winners
   * await declareWinners({
   *   roomId: 'my-room',
   *   hostPubkey: myPublicKey,
   *   winners: [winner1, winner2, winner3],
   * });
   *
   * // Then end room
   * await endRoom({
   *   roomId: 'my-room',
   *   hostPubkey: myPublicKey,
   *   winners: [winner1, winner2, winner3],
   *   feeTokenMint: USDC_MINT,
   * });
   * ```
   */
  const endRoom = useCallback(
    createApiWrapper(
      'endRoom',
      async (ctx, params: EndRoomParams) => {
        const result = await endRoomAPI(ctx, {
          roomId: params.roomId,
          hostPubkey: params.hostPubkey,
          winners: params.winners,
          feeTokenMint: params.feeTokenMint,
        });
        return { signature: result.signature };
      },
      []
    )(context),
    [context]
  );

  return {
    createPoolRoom,
    createAssetRoom,
    closeJoining,
    cleanupRoom,
    endRoom,
  };
}

