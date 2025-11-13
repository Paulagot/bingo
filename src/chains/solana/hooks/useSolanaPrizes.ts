/**
 * @module chains/solana/hooks/useSolanaPrizes
 *
 * Solana Prize Operations Hook
 *
 * ## Purpose
 *
 * This hook encapsulates all prize-related operations for the Solana contract. Prize
 * operations include winner declaration, prize distribution, and asset deposits for
 * asset-based rooms.
 *
 * ## Prize Distribution Flow
 *
 * ### For Pool-Based Rooms
 *
 * 1. Host declares winners via `declareWinners`
 * 2. Host calls `distributePrizes` or `endRoom` to distribute from prize pool
 * 3. Prizes are distributed based on winner percentages configured at room creation
 *
 * ### For Asset-Based Rooms
 *
 * 1. Host deposits assets via `depositPrizeAsset` (before or during game)
 * 2. Host declares winners via `declareWinners`
 * 3. Host calls `distributePrizes` or `endRoom` to distribute assets
 * 4. Assets are distributed equally among winners (or as configured)
 *
 * ## Automatic Token Account Creation
 *
 * The prize distribution process automatically creates missing token accounts for:
 * - Host (for host fee)
 * - Platform (for platform fee)
 * - Charity (for charity allocation)
 * - All winners (for prize distribution)
 *
 * This ensures prize distribution succeeds even when recipients don't have token
 * accounts for the prize token.
 *
 * ## Usage
 *
 * ```typescript
 * const {
 *   declareWinners,
 *   distributePrizes,
 *   depositPrizeAsset,
 * } = useSolanaPrizes();
 *
 * // Declare winners
 * await declareWinners({
 *   roomId: 'my-room',
 *   hostPubkey: myPublicKey,
 *   winners: [winner1, winner2, winner3],
 * });
 *
 * // Distribute prizes
 * await distributePrizes({
 *   roomId: 'my-room',
 *   winners: [winner1, winner2, winner3],
 * });
 * ```
 */

import { useCallback } from 'react';
import type {
  DistributePrizesParams,
  DistributePrizesResult,
  DepositPrizeAssetParams,
} from '@/features/web3/solana/model/types';
import type { DeclareWinnersParams } from '../types/hook-types';
import { useSolanaContext } from './useSolanaContext';
import { createApiWrapper } from '../utils/api-wrapper';
import {
  declareWinners as declareWinnersAPI,
  distributePrizes as distributePrizesAPI,
  depositPrizeAsset as depositPrizeAssetAPI,
} from '@/features/web3/solana/api/prizes';

/**
 * Hook for prize operations on Solana contract
 *
 * @returns Object with all prize operation functions
 */
export function useSolanaPrizes() {
  const context = useSolanaContext();

  /**
   * Declares winners for a room (host only)
   *
   * Declares the winners before prize distribution. Winners must be declared before
   * calling `endRoom` or `distributePrizes`. This allows the host to finalize the
   * winner list before distribution.
   *
   * **Constraints**:
   * - Must be called by the room host
   * - Winners array must contain 1-10 winners
   * - Host cannot be a winner
   * - Winners must be valid Solana public keys
   *
   * @param params - Winner declaration parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Room host's public key (must match caller)
   * @param params.winners - Array of winner public keys (1-10 winners)
   * @returns Transaction signature
   *
   * @throws Error if wallet not connected, not host, or winners invalid
   *
   * @example
   * ```typescript
   * await declareWinners({
   *   roomId: 'my-room',
   *   hostPubkey: myPublicKey,
   *   winners: [winner1, winner2, winner3],
   * });
   * ```
   */
  const declareWinners = useCallback(
    createApiWrapper(
      'declareWinners',
      async (ctx, params: DeclareWinnersParams) => {
        const result = await declareWinnersAPI(ctx, {
          roomId: params.roomId,
          hostPubkey: params.hostPubkey,
          winners: params.winners,
        });
        return { signature: result.signature };
      },
      []
    )(context),
    [context]
  );

  /**
   * Distributes prizes to winners after game ends
   *
   * Distributes prizes to the declared winners. For pool-based rooms, distributes
   * from the prize pool. For asset-based rooms, distributes pre-deposited assets.
   *
   * **Automatic Token Account Creation**:
   * Missing token accounts are automatically created for all recipients (host,
   * platform, charity, winners) before distribution.
   *
   * **Transaction Simulation**:
   * The transaction is simulated before execution to prevent failures.
   *
   * @param params - Prize distribution parameters
   * @param params.roomId - Room identifier
   * @param params.winners - Array of winner public keys (must match declared winners)
   * @param params.roomAddress - Optional room PDA address (avoids derivation)
   * @param params.charityWallet - Optional charity wallet override (uses room charity if not provided)
   * @returns Distribution result with transaction signature
   *
   * @throws Error if wallet not connected, winners not declared, or distribution fails
   *
   * @example
   * ```typescript
   * // First declare winners
   * await declareWinners({
   *   roomId: 'my-room',
   *   hostPubkey: myPublicKey,
   *   winners: [winner1, winner2],
   * });
   *
   * // Then distribute prizes
   * await distributePrizes({
   *   roomId: 'my-room',
   *   winners: [winner1, winner2],
   * });
   * ```
   */
  const distributePrizes = useCallback(
    createApiWrapper(
      'distributePrizes',
      async (ctx, params: DistributePrizesParams): Promise<DistributePrizesResult> => {
        return await distributePrizesAPI(ctx, params);
      },
      []
    )(context),
    [context]
  );

  /**
   * Deposits a prize asset into an asset-based room
   *
   * Deposits SPL tokens (NFTs, custom tokens, etc.) into an asset-based room as prizes.
   * Assets can be deposited before or during the game. All deposited assets will be
   * distributed to winners when the room ends.
   *
   * **Asset Distribution**:
   * Assets are typically distributed equally among winners, but the exact distribution
   * depends on the room configuration and number of assets deposited.
   *
   * @param params - Asset deposit parameters
   * @param params.roomId - Room identifier
   * @param params.assetMint - SPL token mint address of the asset
   * @param params.amount - Amount of tokens to deposit (in token base units)
   * @param params.roomAddress - Optional room PDA address (avoids derivation)
   * @returns Transaction signature
   *
   * @throws Error if wallet not connected, room not found, or deposit fails
   *
   * @example
   * ```typescript
   * // Deposit an NFT (amount = 1)
   * await depositPrizeAsset({
   *   roomId: 'nft-raffle',
   *   assetMint: nftMint,
   *   amount: new BN(1),
   * });
   *
   * // Deposit custom tokens
   * await depositPrizeAsset({
   *   roomId: 'token-raffle',
   *   assetMint: customTokenMint,
   *   amount: new BN(1000000), // 1 token (if 6 decimals)
   * });
   * ```
   */
  const depositPrizeAsset = useCallback(
    createApiWrapper(
      'depositPrizeAsset',
      async (ctx, params: DepositPrizeAssetParams) => {
        return await depositPrizeAssetAPI(ctx, params);
      },
      []
    )(context),
    [context]
  );

  return {
    declareWinners,
    distributePrizes,
    depositPrizeAsset,
  };
}

