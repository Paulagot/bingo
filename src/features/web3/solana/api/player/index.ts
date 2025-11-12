/**
 * @module features/web3/solana/api/player
 *
 * Player operations API module
 *
 * Provides functions for players to join rooms and query their participation.
 * All functions use Phase 1 utilities for token transfers and account management.
 *
 * @example
 * ```typescript
 * import { joinRoom, getPlayerEntry } from '@/features/web3/solana/api/player';
 *
 * const result = await joinRoom(context, params);
 * const entry = await getPlayerEntry(context, roomAddress, playerAddress);
 * ```
 */

export { getPlayerEntry } from './get-player-entry';
export type { PlayerEntryInfo } from './get-player-entry';
export { joinRoom } from './join-room';
export type { JoinRoomParams, JoinRoomResult } from './join-room';

