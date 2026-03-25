import { getRoom, getPlayer, getActiveRound } from './eliminationRoomManager.js';
import { ROOM_STATUS, ROUND_PHASE, GAME_RULES } from '../utils/eliminationConstants.js';
import { validateSubmission as engineValidate } from './eliminationScoringService.js';

/**
 * Validate that a room exists and is in an expected status.
 */
export const validateRoom = (roomId, expectedStatus = null) => {
  const room = getRoom(roomId);
  if (!room) return { valid: false, error: 'Room not found' };
  if (expectedStatus && room.status !== expectedStatus)
    return { valid: false, error: `Room is not in ${expectedStatus} state` };
  return { valid: true, room };
};

/**
 * Validate that the requester is the host of the room.
 */
export const validateHost = (room, requesterId) => {
  if (room.hostId !== requesterId)
    return { valid: false, error: 'Only the host can perform this action' };
  return { valid: true };
};

/**
 * Validate room can be started.
 */
export const validateStart = (roomId, hostId) => {
  const { valid, error, room } = validateRoom(roomId, ROOM_STATUS.WAITING);
  if (!valid) return { valid, error };

  const hostCheck = validateHost(room, hostId);
  if (!hostCheck.valid) return hostCheck;

  const playerCount = Object.keys(room.players).length;
  if (playerCount < GAME_RULES.MIN_PLAYERS)
    return {
      valid: false,
      error: `Need at least ${GAME_RULES.MIN_PLAYERS} players. Currently: ${playerCount}`,
    };

  return { valid: true, room };
};

/**
 * Validate a round submission from a player.
 */
export const validateRoundSubmission = (roomId, playerId, submission) => {
  const { valid, error, room } = validateRoom(roomId, ROOM_STATUS.ACTIVE);
  if (!valid) return { valid, error };

  const player = getPlayer(roomId, playerId);
  if (!player) return { valid: false, error: 'Player not found in room' };
  if (player.eliminated) return { valid: false, error: 'Eliminated players cannot submit' };
  if (player.hasSubmittedCurrentRound)
    return { valid: false, error: 'Already submitted for this round' };

  const activeRound = getActiveRound(roomId);
  if (!activeRound) return { valid: false, error: 'No active round' };
  if (activeRound.phase !== ROUND_PHASE.ACTIVE)
    return { valid: false, error: 'Round is not accepting submissions' };

  const now = Date.now();
  const LATE_SUBMISSION_GRACE_MS = 2000; // allow submissions up to 2s after timer
  if (now > activeRound.endsAt + LATE_SUBMISSION_GRACE_MS)
    return { valid: false, error: 'Round has already ended' };

  if (submission.roundType !== activeRound.roundType)
    return { valid: false, error: 'Submission round type does not match active round' };

  const engineCheck = engineValidate(submission, activeRound.generatedConfig);
  if (!engineCheck.valid) return engineCheck;

  return { valid: true, room, player, activeRound };
};

/**
 * Validate a player join request.
 */
export const validateJoin = (roomId) => {
  const { valid, error, room } = validateRoom(roomId, ROOM_STATUS.WAITING);
  if (!valid) return { valid, error };

  const playerCount = Object.keys(room.players).length;
  if (playerCount >= GAME_RULES.MAX_PLAYERS)
    return { valid: false, error: 'Room is full' };

  return { valid: true, room };
};