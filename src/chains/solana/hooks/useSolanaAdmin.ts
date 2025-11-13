/**
 * @module chains/solana/hooks/useSolanaAdmin
 *
 * Solana Admin Operations Hook
 *
 * ## Purpose
 *
 * This hook encapsulates all admin-only operations for the Solana contract. Admin operations
 * include global configuration management, token registry management, emergency controls, and
 * room recovery. These operations require admin privileges and are typically used for:
 *
 * - Initial program setup (global config, token registry)
 * - Configuration updates (fee structures, wallet addresses)
 * - Emergency controls (pause/unpause system)
 * - Room recovery (refund players from abandoned rooms)
 * - Token management (approve tokens)
 *
 * ## Architecture
 *
 * This hook uses the `useSolanaContext` hook to get the contract context, then wraps
 * API functions from `@/features/web3/solana/api/admin/*` with error handling and
 * React memoization.
 *
 * ## Permission Requirements
 *
 * Most operations require admin privileges (program upgrade authority). The exceptions are:
 * - `createTokenMint`: Can be called by any wallet (for testing)
 *
 * ## Usage
 *
 * ```typescript
 * const {
 *   initializeGlobalConfig,
 *   updateGlobalConfig,
 *   setEmergencyPause,
 *   // ... other admin operations
 * } = useSolanaAdmin();
 *
 * // Initialize global config (one-time setup)
 * await initializeGlobalConfig(platformWallet, charityWallet);
 * ```
 */

import { useCallback } from 'react';
import type { PublicKey } from '@solana/web3.js';
import { useSolanaContext } from './useSolanaContext';
import { createApiWrapper } from '../utils/api-wrapper';
import {
  initializeGlobalConfig as initializeGlobalConfigAPI,
  initializeTokenRegistry as initializeTokenRegistryAPI,
  addApprovedToken as addApprovedTokenAPI,
  updateGlobalConfig as updateGlobalConfigAPI,
  setEmergencyPause as setEmergencyPauseAPI,
  recoverRoom as recoverRoomAPI,
} from '@/features/web3/solana/api/admin';

/**
 * Hook for admin operations on Solana contract
 *
 * @returns Object with all admin operation functions
 */
export function useSolanaAdmin() {
  const context = useSolanaContext();

  /**
   * Initializes the global config (one-time setup)
   *
   * The global config must be initialized before creating any rooms. This sets the
   * platform and charity wallet addresses that are used for fee distribution.
   *
   * **One-Time Operation**: This should only be called once when the program is first
   * deployed. Subsequent calls will fail if the config already exists.
   *
   * @param platformWallet - Wallet to receive platform fees (20% of entry fees)
   * @param charityWallet - Wallet to receive charity donations (40%+ of entry fees)
   * @returns Transaction signature
   *
   * @throws Error if config already initialized or wallet not connected
   *
   * @example
   * ```typescript
   * await initializeGlobalConfig(
   *   new PublicKey('PlatformWallet...'),
   *   new PublicKey('CharityWallet...')
   * );
   * ```
   */
  const initializeGlobalConfig = useCallback(
    createApiWrapper(
      'initializeGlobalConfig',
      async (ctx, platformWallet: PublicKey, charityWallet: PublicKey) => {
        const result = await initializeGlobalConfigAPI(ctx, {
          platformWallet,
          charityWallet,
        });
        return { signature: result.signature };
      },
      []
    )(context),
    [context]
  );

  /**
   * Updates the global configuration (admin only)
   *
   * Used to update global config parameters such as:
   * - Platform and charity wallet addresses
   * - Fee structures (platform fee, max host fee, max prize pool)
   * - Minimum charity percentage
   *
   * **Common Use Case**: Updating `maxPrizePoolBps` from 3500 (35%) to 4000 (40%)
   * to allow hosts to allocate up to 40% - host fee for prizes.
   *
   * @param updates - Configuration updates (null values are filtered out)
   * @param updates.platformWallet - New platform wallet address
   * @param updates.charityWallet - New charity wallet address
   * @param updates.platformFeeBps - New platform fee in basis points
   * @param updates.maxHostFeeBps - New max host fee in basis points
   * @param updates.maxPrizePoolBps - New max prize pool in basis points
   * @param updates.minCharityBps - New minimum charity percentage in basis points
   * @returns Transaction signature
   *
   * @throws Error if wallet not connected or update fails
   *
   * @example
   * ```typescript
   * await updateGlobalConfig({
   *   maxPrizePoolBps: 4000, // Increase to 40%
   * });
   * ```
   */
  const updateGlobalConfig = useCallback(
    createApiWrapper(
      'updateGlobalConfig',
      async (ctx, updates: {
        platformWallet?: PublicKey | null;
        charityWallet?: PublicKey | null;
        platformFeeBps?: number | null;
        maxHostFeeBps?: number | null;
        maxPrizePoolBps?: number | null;
        minCharityBps?: number | null;
      }) => {
        // Filter out null values and convert to proper type
        const filteredUpdates: any = {};
        if (updates.platformWallet !== null && updates.platformWallet !== undefined) {
          filteredUpdates.platformWallet = updates.platformWallet;
        }
        if (updates.charityWallet !== null && updates.charityWallet !== undefined) {
          filteredUpdates.charityWallet = updates.charityWallet;
        }
        if (updates.platformFeeBps !== null && updates.platformFeeBps !== undefined) {
          filteredUpdates.platformFeeBps = updates.platformFeeBps;
        }
        if (updates.maxHostFeeBps !== null && updates.maxHostFeeBps !== undefined) {
          filteredUpdates.maxHostFeeBps = updates.maxHostFeeBps;
        }
        if (updates.maxPrizePoolBps !== null && updates.maxPrizePoolBps !== undefined) {
          filteredUpdates.maxPrizePoolBps = updates.maxPrizePoolBps;
        }
        if (updates.minCharityBps !== null && updates.minCharityBps !== undefined) {
          filteredUpdates.minCharityBps = updates.minCharityBps;
        }
        return await updateGlobalConfigAPI(ctx, filteredUpdates);
      },
      []
    )(context),
    [context]
  );

  /**
   * Initializes the token registry (one-time setup)
   *
   * The token registry must be initialized before creating any rooms. This is a one-time
   * operation that creates the registry PDA account used to track approved tokens.
   *
   * **One-Time Operation**: This should only be called once when the program is first
   * deployed. Subsequent calls will fail if the registry already exists.
   *
   * @returns Transaction signature
   *
   * @throws Error if registry already initialized or wallet not connected
   *
   * @example
   * ```typescript
   * await initializeTokenRegistry();
   * ```
   */
  const initializeTokenRegistry = useCallback(
    createApiWrapper(
      'initializeTokenRegistry',
      async (ctx) => {
        const result = await initializeTokenRegistryAPI(ctx);
        return { signature: result.signature };
      },
      []
    )(context),
    [context]
  );

  /**
   * Add an approved token to the token registry
   *
   * Adds a token mint to the approved tokens list. Only approved tokens can be used
   * for room entry fees (USDC and PYUSD are typically pre-approved).
   *
   * @param tokenMint - The mint address of the token to approve
   * @returns Transaction signature
   *
   * @throws Error if wallet not connected or token already approved
   *
   * @example
   * ```typescript
   * await addApprovedToken(new PublicKey('TokenMintAddress...'));
   * ```
   */
  const addApprovedToken = useCallback(
    createApiWrapper(
      'addApprovedToken',
      async (ctx, tokenMint: PublicKey) => {
        const result = await addApprovedTokenAPI(ctx, { tokenMint });
        return { signature: result.signature };
      },
      []
    )(context),
    [context]
  );

  /**
   * Sets emergency pause state (admin only)
   *
   * Pauses or unpauses the entire program. When paused, no operations can be performed
   * except for admin recovery operations. This is used in case of critical vulnerabilities.
   *
   * @param paused - True to pause, false to unpause
   * @returns Transaction signature
   *
   * @throws Error if wallet not connected or not admin
   *
   * @example
   * ```typescript
   * // Pause system
   * await setEmergencyPause(true);
   *
   * // Unpause system
   * await setEmergencyPause(false);
   * ```
   */
  const setEmergencyPause = useCallback(
    createApiWrapper(
      'setEmergencyPause',
      async (ctx, paused: boolean) => {
        const result = await setEmergencyPauseAPI(ctx, paused);
        return { signature: result.signature };
      },
      []
    )(context),
    [context]
  );

  /**
   * Recovers a room and refunds players (admin only)
   *
   * Recovers an abandoned room and refunds all players their entry fees. The platform
   * fee is still collected. This is used when a room host abandons a room or when
   * there are issues with prize distribution.
   *
   * @param params - Recovery parameters
   * @param params.roomId - Room identifier
   * @param params.hostPubkey - Room host's public key
   * @param params.roomAddress - Optional room PDA address (avoids derivation)
   * @returns Recovery result with transaction signature and refund details
   *
   * @throws Error if wallet not connected, room not found, or recovery fails
   *
   * @example
   * ```typescript
   * const result = await recoverRoom({
   *   roomId: 'abandoned-room',
   *   hostPubkey: hostKey,
   * });
   * console.log(`Refunded ${result.playersRefunded} players`);
   * ```
   */
  const recoverRoom = useCallback(
    createApiWrapper(
      'recoverRoom',
      async (ctx, params: { roomId: string; hostPubkey: PublicKey; roomAddress?: PublicKey }) => {
        const result = await recoverRoomAPI(ctx, params);
        return {
          signature: result.signature,
          playersRefunded: result.playersRefunded,
          totalRefunded: result.totalRefunded,
          platformFee: result.platformFee,
        };
      },
      []
    )(context),
    [context]
  );

  return {
    initializeGlobalConfig,
    updateGlobalConfig,
    setEmergencyPause,
    initializeTokenRegistry,
    addApprovedToken,
    recoverRoom,
  };
}

