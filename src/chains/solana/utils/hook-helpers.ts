/**
 * @module chains/solana/utils/hook-helpers
 *
 * Hook Helper Functions
 *
 * ## Purpose
 *
 * This module provides utility functions that support the Solana contract hook operations.
 * These helpers handle edge cases, type conversions, and provide safe defaults when the
 * wallet provider is unavailable.
 *
 * ## Architecture Decisions
 *
 * ### Provider Detection Strategy
 *
 * The hook needs to detect whether a Solana wallet provider is available. We check the
 * connection object rather than the wallet because:
 *
 * 1. **Connection is more reliable**: The connection object is always present when a provider
 *    is mounted, even if the wallet isn't connected
 * 2. **Avoids error logs**: Accessing `wallet.publicKey` when no provider exists triggers
 *    error logs in the wallet adapter
 * 3. **Type safety**: The connection object has a clear structure (`rpcEndpoint` property)
 *    that we can check without type assertions
 *
 * ### Safe Default Returns
 *
 * When no provider is available (e.g., in web2-only flows), we return a safe default object
 * where all functions throw descriptive errors. This allows:
 *
 * - Components to use the hook without conditional rendering
 * - Clear error messages when operations are attempted without a provider
 * - Type safety maintained throughout the application
 *
 * ### Type Conversion Rationale
 *
 * The base API types (`RoomInfo`, `PlayerEntryInfo`) may not include all fields that the
 * hook's extended types require. The conversion functions:
 *
 * 1. Preserve all base type fields
 * 2. Add extended fields with safe defaults or type casting
 * 3. Handle null/undefined cases gracefully
 *
 * ## Usage
 *
 * These functions are primarily used internally by the hook. External consumers should
 * use the hook interface directly.
 */

import { BN } from '@coral-xyz/anchor';
import type {
  RoomInfo,
  PlayerEntryInfo,
} from '@/features/web3/solana/model/types';
import type {
  RoomInfoExtended,
  PlayerEntryInfoExtended,
} from '../types/hook-types';

/**
 * Creates a safe default return object when wallet provider is unavailable
 *
 * ## Purpose
 *
 * When the Solana wallet provider is not mounted (e.g., in web2-only flows), the hook
 * needs to return a safe default object that:
 *
 * 1. Maintains the same interface as the normal hook return
 * 2. Provides clear error messages when operations are attempted
 * 3. Indicates connection state clearly
 *
 * ## Return Structure
 *
 * The returned object matches the hook's return type exactly, but:
 * - All connection state fields are set to `null` or `false`
 * - All operation functions throw descriptive errors
 * - `isReady` is always `false`
 *
 * ## Error Messages
 *
 * All functions throw: "Solana wallet provider is not available. This is expected in web2 flow."
 *
 * This message clearly indicates:
 * - What's missing (wallet provider)
 * - That this is expected behavior (not a bug)
 * - The context (web2 flow)
 *
 * ## Usage
 *
 * This function is called internally by the hook when no provider is detected.
 * External code should not call this directly.
 *
 * @returns Safe default hook return object with error-throwing functions
 *
 * @example
 * ```typescript
 * // Internal hook usage
 * if (!hasRealConnection) {
 *   return createSafeDefaultReturn();
 * }
 * ```
 */
export function createSafeDefaultReturn() {
  /**
   * Generic error function for all operations
   * Throws a descriptive error when called
   */
  const notAvailable = async () => {
    throw new Error(
      'Solana wallet provider is not available. This is expected in web2 flow.'
    );
  };

  return {
    // Connection state - all set to indicate no provider
    publicKey: null,
    connected: false,
    isReady: false,
    connection: null,

    // Admin operations - all throw errors
    initializeGlobalConfig: notAvailable,
    updateGlobalConfig: notAvailable,
    setEmergencyPause: notAvailable,
    initializeTokenRegistry: notAvailable,
    addApprovedToken: notAvailable,
    recoverRoom: notAvailable,

    // Room operations - all throw errors
    createPoolRoom: notAvailable,
    createAssetRoom: notAvailable,
    joinRoom: notAvailable,
    closeJoining: notAvailable,
    cleanupRoom: notAvailable,
    endRoom: notAvailable,

    // Prize operations - all throw errors
    declareWinners: notAvailable,
    distributePrizes: notAvailable,
    depositPrizeAsset: notAvailable,

    // Query operations - all throw errors
    getRoomInfo: notAvailable,
    getPlayerEntry: notAvailable,

    // Utility operations - all throw errors
    createTokenMint: notAvailable,
  };
}

/**
 * Converts base RoomInfo to RoomInfoExtended for backward compatibility
 *
 * ## Purpose
 *
 * The API layer returns base `RoomInfo` types, but the hook interface uses
 * `RoomInfoExtended` to maintain backward compatibility with existing consumers.
 * This function converts between the two types.
 *
 * ## Conversion Strategy
 *
 * 1. **Base fields**: All fields from `RoomInfo` are preserved via spread operator
 * 2. **Extended fields**: Additional fields are extracted from the base type using
 *    type casting (since they may exist in the runtime object but not in the type)
 * 3. **Safe defaults**: Missing fields get safe defaults (e.g., `false` for `ended`,
 *    `new BN(0)` for `expirationSlot`)
 *
 * ## Type Casting Rationale
 *
 * The base `RoomInfo` type may not include all fields that exist in the on-chain
 * account data. We use `as any` casting to access these fields, then provide
 * safe defaults if they're missing.
 *
 * ## Null Handling
 *
 * If `roomInfo` is `null`, the function returns `null` immediately. This preserves
 * the nullability of the return type.
 *
 * @param roomInfo - Base RoomInfo from API layer, or null
 * @returns Extended RoomInfo with additional fields, or null if input is null
 *
 * @example
 * ```typescript
 * const baseInfo = await getRoomInfoAPI(ctx, roomAddress);
 * const extendedInfo = toRoomInfoExtended(baseInfo);
 * if (extendedInfo?.ended) {
 *   console.log('Room has ended');
 * }
 * ```
 */
export function toRoomInfoExtended(
  roomInfo: RoomInfo | null
): RoomInfoExtended | null {
  if (!roomInfo) return null;

  return {
    ...roomInfo,
    // Extract extended fields from base type (may exist in runtime but not in type)
    ended: (roomInfo as any).ended ?? false,
    expirationSlot: (roomInfo as any).expirationSlot ?? new BN(0),
    prizeMode: (roomInfo as any).prizeMode,
  } as RoomInfoExtended;
}

/**
 * Converts base PlayerEntryInfo to PlayerEntryInfoExtended for backward compatibility
 *
 * ## Purpose
 *
 * The API layer returns base `PlayerEntryInfo` types, but the hook interface uses
 * `PlayerEntryInfoExtended` to maintain backward compatibility. This function converts
 * between the two types.
 *
 * ## Conversion Strategy
 *
 * 1. **Base fields**: All fields from `PlayerEntryInfo` are preserved via spread operator
 * 2. **Extended fields**: Additional fields are extracted using type casting
 * 3. **Safe defaults**: Missing numeric fields default to `new BN(0)`
 *
 * ## Field Descriptions
 *
 * - `room`: Room public key (reference to room account)
 * - `entryPaid`: Entry fee amount (defaults to BN(0) if missing)
 * - `extrasPaid`: Extras amount (defaults to BN(0) if missing)
 * - `totalPaid`: Total paid (defaults to BN(0) if missing)
 * - `joinSlot`: Join slot number (defaults to BN(0) if missing)
 *
 * ## Null Handling
 *
 * If `playerEntry` is `null`, the function returns `null` immediately.
 *
 * @param playerEntry - Base PlayerEntryInfo from API layer, or null
 * @returns Extended PlayerEntryInfo with additional fields, or null if input is null
 *
 * @example
 * ```typescript
 * const baseEntry = await getPlayerEntryAPI(ctx, playerEntryPDA);
 * const extendedEntry = toPlayerEntryInfoExtended(baseEntry);
 * if (extendedEntry) {
 *   console.log(`Total paid: ${extendedEntry.totalPaid}`);
 * }
 * ```
 */
export function toPlayerEntryInfoExtended(
  playerEntry: PlayerEntryInfo | null
): PlayerEntryInfoExtended | null {
  if (!playerEntry) return null;

  return {
    ...playerEntry,
    // Extract extended fields from base type
    room: (playerEntry as any).room,
    entryPaid: (playerEntry as any).entryPaid ?? new BN(0),
    extrasPaid: (playerEntry as any).extrasPaid ?? new BN(0),
    totalPaid: (playerEntry as any).totalPaid ?? new BN(0),
    joinSlot: (playerEntry as any).joinSlot ?? new BN(0),
  } as PlayerEntryInfoExtended;
}

