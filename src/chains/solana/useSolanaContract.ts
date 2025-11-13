/**
 * Bingo Smart Contract Integration Hook
 *
 * Primary interface for all Solana blockchain interactions in the FundRaisely quiz platform.
 * This hook orchestrates domain-specific hooks to provide a unified interface for room
 * creation, player operations, prize distribution, and on-chain queries.
 *
 * ## Architecture
 *
 * This hook uses a modular architecture where functionality is split into domain-specific hooks:
 *
 * - `useSolanaContext`: Provider detection and context creation
 * - `useSolanaAdmin`: Admin operations (config, registry, emergency controls)
 * - `useSolanaRooms`: Room operations (create, close, cleanup, end)
 * - `useSolanaPrizes`: Prize operations (declare winners, distribute, deposit assets)
 * - `useSolanaQueries`: Query operations (get room info, get player entry)
 *
 * ## Key Features
 *
 * ### Room Management
 * - **createPoolRoom**: Creates a new pool-based fundraising room with configurable fee structure
 * - **createAssetRoom**: Creates an asset-based room with pre-deposited prize assets
 * - **getRoomInfo**: Fetches on-chain room state and configuration
 *
 * ### Player Operations
 * - **joinRoom**: Allows players to join a room by paying entry fee
 * - **getPlayerEntry**: Fetches player participation record
 *
 * ### Prize Distribution
 * - **distributePrizes**: Distributes prizes to winners with automatic token account creation
 *   - Automatically creates missing token accounts for host, platform, charity, and winners
 *   - Handles both pool-based and asset-based rooms
 *   - Simulates transaction before execution to prevent failures
 *   - Emits RoomEnded event for transparency
 *
 * ### Token Account Management
 * - **Automatic Creation**: Missing token accounts are created automatically before prize distribution
 * - **Recipients**: Host, platform, charity, and winner token accounts are checked and created if needed
 * - **Asset Rooms**: Prize asset token accounts are also created for asset-based rooms
 *
 * ### Transaction Safety
 * - **Simulation**: All transactions are simulated before execution
 * - **Validation**: Input validation via transactionHelpers.ts
 * - **Error Handling**: User-friendly error messages for common failures
 *
 * ## Economic Model
 *
 * The contract enforces a trustless economic model:
 * - Platform Fee: 20% (fixed)
 * - Host Allocation: 40% total (configurable within this limit)
 *   - Host Fee: 0-5% (host chooses)
 *   - Prize Pool: 0-35% (calculated as 40% - host fee)
 * - Charity: Minimum 40% (calculated remainder)
 * - Extras: 100% to charity
 *
 * ## Usage
 *
 * ```typescript
 * const { createPoolRoom, joinRoom, distributePrizes } = useSolanaContract();
 *
 * // Create a room
 * const room = await createPoolRoom({
 *   roomId: 'my-room-123',
 *   entryFee: 1.0,
 *   hostFeeBps: 100, // 1%
 *   prizePoolBps: 3900, // 39% (max with 1% host fee)
 *   maxPlayers: 100,
 *   feeTokenMint: USDC_MINT,
 *   charityWallet: charityAddress,
 * });
 *
 * // Join a room
 * await joinRoom({
 *   roomId: 'my-room-123',
 *   roomAddress: room.room,
 *   entryFee: 1.0,
 *   feeTokenMint: USDC_MINT,
 * });
 *
 * // Distribute prizes
 * await distributePrizes({
 *   roomId: 'my-room-123',
 *   winners: ['winner1...', 'winner2...', 'winner3...'],
 * });
 * ```
 *
 * Used by CreateRoomPage for room initialization and RoomPage for player joins. Integrates with
 * transactionHelpers.ts for validation and config.ts for network settings. Exposes query methods
 * (getRoomInfo, getPlayerEntry) for fetching on-chain state and PDA derivation helpers for building
 * custom transactions. Core blockchain layer of the application.
 *
 * ## Migration from Monolithic Hook
 *
 * This hook was refactored from a 961-line monolithic file into a modular architecture. The
 * refactoring maintains 100% backward compatibility - all existing code using this hook will
 * continue to work without changes.
 *
 * ### What Changed
 *
 * - Internal structure: Functionality split into domain hooks
 * - Code organization: Types, helpers, and utilities extracted to separate modules
 * - Documentation: Enhanced with deep documentation at each level
 *
 * ### What Stayed the Same
 *
 * - Public API: All function signatures unchanged
 * - Return type: Same interface returned
 * - Behavior: All operations work identically
 * - Error handling: Same error messages and behavior
 */

import { useCallback } from 'react';
import type { Transaction } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import type { CreateTokenMintParams, CreateTokenMintResult } from '@/features/web3/solana/api/admin';
import { useSolanaContext } from './hooks/useSolanaContext';
import { createSafeDefaultReturn } from './utils/hook-helpers';
import { createApiWrapper } from './utils/api-wrapper';
import { useSolanaAdmin } from './hooks/useSolanaAdmin';
import { useSolanaRooms } from './hooks/useSolanaRooms';
import { useSolanaPrizes } from './hooks/useSolanaPrizes';
import { useSolanaQueries } from './hooks/useSolanaQueries';
import type { JoinRoomParams } from './types/hook-types';
import { joinRoom as joinRoomAPI } from '@/features/web3/solana/api/player';
import { createTokenMint as createTokenMintAPI } from '@/features/web3/solana/api/admin';

/**
 * Main Solana contract hook - orchestrates all domain hooks
 *
 * This hook provides a unified interface for all Solana contract operations by composing
 * domain-specific hooks. It maintains backward compatibility with the original monolithic
 * implementation while providing better code organization and maintainability.
 *
 * @returns Unified interface with all Solana contract operations
 */
export function useSolanaContract() {
  const context = useSolanaContext();

  // If no provider available, return safe defaults
  if (!context.isReady && !context.connection) {
    return createSafeDefaultReturn();
  }

  // Get domain hooks
  const admin = useSolanaAdmin();
  const rooms = useSolanaRooms();
  const prizes = useSolanaPrizes();
  const queries = useSolanaQueries();

  // Player operations - joinRoom (single operation, kept in main hook)
  const joinRoom = useCallback(
    createApiWrapper(
      'joinRoom',
      async (ctx, params: JoinRoomParams) => {
        return await joinRoomAPI(ctx, params);
      },
      []
    )(context),
    [context]
  );

  // Get wallet for createTokenMint (needs direct wallet access)
  const wallet = useWallet();

  // Utility operations - createTokenMint (needs direct wallet access)
  // This is kept in the main hook because it needs signTransaction which isn't in context
  const createTokenMint = useCallback(
    async (params?: Omit<CreateTokenMintParams, 'connection' | 'publicKey' | 'signTransaction'>): Promise<CreateTokenMintResult> => {
      if (!context.publicKey || !wallet.signTransaction || !context.connection) {
        throw new Error('[useSolanaContract:createTokenMint] Wallet not connected');
      }

      try {
        const signTx = async (tx: Transaction) => {
          return wallet.signTransaction(tx);
        };

        return await createTokenMintAPI({
          connection: context.connection,
          publicKey: context.publicKey,
          signTransaction: signTx,
          ...params,
        });
      } catch (error: any) {
        const enhancedError = new Error(
          `[useSolanaContract:createTokenMint] ${error.message || 'Unknown error'}`
        );
        if (error.stack) {
          enhancedError.stack = error.stack;
        }
        Object.assign(enhancedError, error);
        throw enhancedError;
      }
    },
    [context, wallet]
  );

  // Compose and return unified interface
  return {
    // Connection state
    publicKey: context.publicKey,
    connected: context.connected,
    isReady: context.isReady,
    connection: context.connection,

    // Admin operations
    initializeGlobalConfig: admin.initializeGlobalConfig,
    updateGlobalConfig: admin.updateGlobalConfig,
    setEmergencyPause: admin.setEmergencyPause,
    initializeTokenRegistry: admin.initializeTokenRegistry,
    addApprovedToken: admin.addApprovedToken,
    recoverRoom: admin.recoverRoom,
    createTokenMint, // Note: Needs wallet access, see TODO above

    // Room operations
    createPoolRoom: rooms.createPoolRoom,
    createAssetRoom: rooms.createAssetRoom,
    closeJoining: rooms.closeJoining,
    cleanupRoom: rooms.cleanupRoom,
    endRoom: rooms.endRoom,

    // Player operations
    joinRoom,

    // Prize operations
    declareWinners: prizes.declareWinners,
    distributePrizes: prizes.distributePrizes,
    depositPrizeAsset: prizes.depositPrizeAsset,

    // Query operations
    getRoomInfo: queries.getRoomInfo,
    getPlayerEntry: queries.getPlayerEntry,
  };
}

// Re-export types for backward compatibility
export type {
  JoinRoomParams,
  DeclareWinnersParams,
  EndRoomParams,
  RoomInfoExtended,
  PlayerEntryInfoExtended,
} from './types/hook-types';
