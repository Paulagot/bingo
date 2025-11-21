/**
 * @module features/web3/solana/api/room
 *
 * Room operations API module
 *
 * Provides functions for creating and managing Bingo rooms on Solana.
 * All functions use Phase 1 utilities for PDA derivation, token account management,
 * transaction building, and validation.
 *
 * @example
 * ```typescript
 * import { createPoolRoom, getRoomInfo } from '@/features/web3/solana/api/room';
 *
 * const result = await createPoolRoom(context, params);
 * const roomInfo = await getRoomInfo(context, roomAddress);
 * ```
 */

export { getRoomInfo } from './get-room-info';
export { closeJoining } from './close-joining';
export type { CloseJoiningParams, CloseJoiningResult } from './close-joining';
export { cleanupRoom } from './cleanup-room';
export type { CleanupRoomParams, CleanupRoomResult } from './cleanup-room';
export { createPoolRoom } from './create-pool-room';
export { createAssetRoom } from './create-asset-room';

