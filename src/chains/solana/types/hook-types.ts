/**
 * @module chains/solana/types/hook-types
 *
 * Hook-Specific Type Definitions
 *
 * ## Purpose
 *
 * This module centralizes all hook-specific type definitions that extend the base types
 * from `@/features/web3/solana/model/types`. These extended types maintain backward
 * compatibility with existing hook consumers while allowing the underlying API modules
 * to use more focused base types.
 *
 * ## Architecture Decision
 *
 * **Why Separate Hook Types?**
 *
 * The base types in `@/features/web3/solana/model/types` are designed for the API layer,
 * which focuses on core blockchain operations. The hook layer needs additional fields for:
 *
 * 1. **Backward Compatibility**: Existing consumers expect certain optional fields that
 *    aren't needed in the API layer (e.g., `hostPubkey`, `feeTokenMint` in `JoinRoomParams`)
 * 2. **Convenience**: Hook consumers often want to pass optional parameters that the API
 *    can fetch from on-chain data, reducing the number of required parameters
 * 3. **Type Safety**: Extended types provide better type checking for hook-specific use cases
 *
 * ## Type Relationships
 *
 * ```
 * Base Types (API Layer)
 *   ↓
 * Extended Types (Hook Layer) ← You are here
 *   ↓
 * Hook Consumers (Components/Pages)
 * ```
 *
 * ## Migration Guide
 *
 * If you're migrating from the old inline types:
 * - Import from this module instead of defining locally
 * - All types maintain the same structure and field names
 * - No changes needed to existing code using these types
 *
 * ## Usage
 *
 * ```typescript
 * import type { JoinRoomParams, RoomInfoExtended } from '@/chains/solana/types/hook-types';
 *
 * const params: JoinRoomParams = {
 *   roomId: 'my-room',
 *   // Optional fields for convenience
 *   hostPubkey: hostKey,
 *   entryFee: new BN(1000000),
 * };
 * ```
 */

import type { PublicKey } from '@solana/web3.js';
import type { BN } from '@coral-xyz/anchor';
import type {
  RoomInfo,
  PlayerEntryInfo,
} from '@/features/web3/solana/model/types';

/**
 * Extended JoinRoomParams with hook-specific optional fields
 *
 * ## Purpose
 *
 * The base `JoinRoomParams` in the API layer only requires `roomId`. This extended
 * version adds optional fields that allow hook consumers to pass additional context
 * without requiring the API to fetch it from on-chain data.
 *
 * ## Field Descriptions
 *
 * - `roomId`: Required room identifier (matches base type)
 * - `hostPubkey`: Optional - if provided, avoids on-chain lookup
 * - `entryFee`: Optional - if provided, avoids on-chain lookup
 * - `extrasAmount`: Optional additional donation (100% to charity)
 * - `feeTokenMint`: Optional - if provided, avoids on-chain lookup
 * - `roomPDA`: Optional - use this PDA instead of deriving (avoids PDA mismatch errors)
 *
 * ## Backward Compatibility
 *
 * All fields except `roomId` are optional to maintain backward compatibility with
 * existing code that may not provide all parameters.
 *
 * @example
 * ```typescript
 * // Minimal usage (API will fetch missing data)
 * await joinRoom({ roomId: 'my-room' });
 *
 * // Full usage (avoids on-chain lookups)
 * await joinRoom({
 *   roomId: 'my-room',
 *   hostPubkey: hostKey,
 *   entryFee: new BN(1000000),
 *   feeTokenMint: USDC_MINT,
 *   extrasAmount: new BN(500000), // Extra donation
 * });
 * ```
 */
export interface JoinRoomParams {
  /** Room identifier - required */
  roomId: string;
  /**
   * Room host's public key
   * Optional - will be fetched from room data if not provided
   */
  hostPubkey?: PublicKey;
  /**
   * Entry fee amount in token base units
   * Optional - will be fetched from room data if not provided
   */
  entryFee?: BN;
  /**
   * Additional donation beyond entry fee
   * Optional - 100% goes to charity
   */
  extrasAmount?: BN;
  /**
   * SPL token mint for entry fees
   * Optional - will be fetched from room data if not provided
   */
  feeTokenMint?: PublicKey;
  /**
   * Room PDA address
   * Optional - use this PDA instead of deriving it
   * Useful to avoid PDA mismatch errors when room PDA is known
   */
  roomPDA?: PublicKey;
}

/**
 * Parameters for declaring winners in a room
 *
 * ## Purpose
 *
 * Used by the host to declare winners before prize distribution. The winners
 * must be declared before calling `endRoom` or `distributePrizes`.
 *
 * ## Constraints
 *
 * - Must be called by the room host (hostPubkey must match caller)
 * - Winners array must contain 1-10 winners
 * - Host cannot be a winner
 * - Winners must be valid Solana public keys
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
export interface DeclareWinnersParams {
  /** Room identifier */
  roomId: string;
  /**
   * Room host's public key
   * Must match the caller's public key (enforced on-chain)
   */
  hostPubkey: PublicKey;
  /**
   * Array of winner public keys
   * Must contain 1-10 winners, host cannot be a winner
   */
  winners: PublicKey[];
}

/**
 * Parameters for ending a room and triggering prize distribution
 *
 * ## Purpose
 *
 * Used to end a room and distribute prizes. This is typically called after
 * `declareWinners` has been called. The room must be in a valid state for
 * ending (not already ended, joining closed, etc.).
 *
 * ## Constraints
 *
 * - Must be called by the room host OR room must be expired
 * - Winners must have been declared via `declareWinners`
 * - Fee token mint must match the room's fee token
 *
 * @example
 * ```typescript
 * await endRoom({
 *   roomId: 'my-room',
 *   hostPubkey: myPublicKey,
 *   winners: [winner1, winner2],
 *   feeTokenMint: USDC_MINT,
 * });
 * ```
 */
export interface EndRoomParams {
  /** Room identifier */
  roomId: string;
  /**
   * Room host's public key
   * Must match caller OR room must be expired
   */
  hostPubkey: PublicKey;
  /**
   * Array of winner public keys
   * Must match winners declared via `declareWinners`
   */
  winners: PublicKey[];
  /**
   * SPL token mint for entry fees
   * Must match the room's fee token mint
   */
  feeTokenMint: PublicKey;
}

/**
 * Extended RoomInfo with hook-specific additional fields
 *
 * ## Purpose
 *
 * The base `RoomInfo` type contains core room data from the on-chain account.
 * This extended version adds additional fields that are useful for hook consumers
 * but may not be present in the base type or need type casting.
 *
 * ## Field Descriptions
 *
 * - All fields from base `RoomInfo` are included
 * - `ended`: Boolean indicating if room has ended
 * - `expirationSlot`: Slot number when room expires
 * - `prizeMode`: Prize mode enum (PoolSplit | AssetBased)
 *
 * ## Backward Compatibility
 *
 * This type extends `RoomInfo` to maintain compatibility. The additional fields
 * are typed as `any` where necessary to handle cases where the base type doesn't
 * include them, but they're cast from the on-chain account data.
 *
 * @example
 * ```typescript
 * const roomInfo: RoomInfoExtended = await getRoomInfo(roomAddress);
 * if (roomInfo.ended) {
 *   console.log('Room has ended');
 * }
 * ```
 */
export interface RoomInfoExtended extends RoomInfo {
  /**
   * Whether the room has ended
   * Additional field for backward compatibility
   */
  ended: boolean;
  /**
   * Slot number when room expires
   * Additional field for backward compatibility
   */
  expirationSlot: BN;
  /**
   * Prize mode enum
   * PoolSplit for pool-based rooms, AssetBased for asset-based rooms
   * Typed as any to handle enum casting from on-chain data
   */
  prizeMode?: any; // PrizeMode enum (PoolSplit | AssetBased)
}

/**
 * Extended PlayerEntryInfo with hook-specific additional fields
 *
 * ## Purpose
 *
 * The base `PlayerEntryInfo` type contains core player entry data. This extended
 * version adds additional fields that provide more context for hook consumers.
 *
 * ## Field Descriptions
 *
 * - All fields from base `PlayerEntryInfo` are included
 * - `room`: Room public key (reference to room account)
 * - `entryPaid`: Amount paid as entry fee
 * - `extrasPaid`: Amount paid as extras (additional donation)
 * - `totalPaid`: Total amount paid (entry + extras)
 * - `joinSlot`: Slot number when player joined
 *
 * ## Backward Compatibility
 *
 * This type extends `PlayerEntryInfo` to maintain compatibility. The additional
 * fields are cast from the on-chain account data.
 *
 * @example
 * ```typescript
 * const entry: PlayerEntryInfoExtended = await getPlayerEntry(roomAddress, playerAddress);
 * console.log(`Player paid ${entry.totalPaid} total`);
 * ```
 */
export interface PlayerEntryInfoExtended extends PlayerEntryInfo {
  /**
   * Room public key
   * Reference to the room account this entry belongs to
   */
  room: PublicKey;
  /**
   * Entry fee amount paid
   * In token base units (e.g., 1000000 = 1 USDC)
   */
  entryPaid: BN;
  /**
   * Extras amount paid
   * Additional donation beyond entry fee (100% to charity)
   */
  extrasPaid: BN;
  /**
   * Total amount paid
   * Sum of entryPaid + extrasPaid
   */
  totalPaid: BN;
  /**
   * Slot number when player joined
   * Used for ordering and timing
   */
  joinSlot: BN;
}

