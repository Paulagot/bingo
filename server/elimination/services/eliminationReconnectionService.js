import {
  getRoom,
  getPlayer,
  updatePlayerSocket,
  getReconnectSnapshot,
} from './eliminationRoomManager.js';
import { ROOM_STATUS } from '../utils/eliminationConstants.js';

/**
 * Reconnect a player to an active or ended room.
 *
 * @param {string} roomId
 * @param {string} playerId
 * @param {string} newSocketId
 * @returns {{ success: boolean, snapshot?: Object, spectating?: boolean, error?: string }}
 */
export const reconnectPlayer = (roomId, playerId, newSocketId) => {
  const room = getRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  if (room.status === ROOM_STATUS.ENDED) {
    // Game is over — send final state for winner/results display
    const snapshot = getReconnectSnapshot(roomId, playerId);
    return { success: true, snapshot, spectating: true, gameEnded: true };
  }

  const player = getPlayer(roomId, playerId);
  if (!player) return { success: false, error: 'Player not found in this room' };

  // Re-map socket
  updatePlayerSocket(roomId, playerId, newSocketId);

  const snapshot = getReconnectSnapshot(roomId, playerId);
  const spectating = player.eliminated;

  return { success: true, snapshot, spectating };
};

/**
 * Handle a player's socket disconnect event.
 * Marks them as disconnected but keeps their slot.
 * The game does NOT pause for disconnected players.
 */
export const handleDisconnect = (roomId, playerId) => {
  const room = getRoom(roomId);
  const player = getPlayer(roomId, playerId);
  if (!room || !player) return;

  player.connected = false;
  player.lastSeenAt = new Date().toISOString();
};