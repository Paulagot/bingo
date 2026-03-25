import {
  addPlayer,
  findPlayerBySocket,
  getRoomSnapshot,
  getRoom,
} from '../services/eliminationRoomManager.js';
import { startGame } from '../services/eliminationGameService.js';
import { recordSubmission } from '../services/eliminationRoundService.js';
import { reconnectPlayer, handleDisconnect } from '../services/eliminationReconnectionService.js';
import { checkSocketRate, cleanupSocket } from '../utils/socketRateLimit.js';
import {
  validateJoin,
  validateStart,
  validateRoundSubmission,
} from '../services/eliminationValidationService.js';
import {
  CLIENT_EVENTS,
  SERVER_EVENTS,
  ROOM_STATUS,
} from '../utils/eliminationConstants.js';

const getAllPlayers = (roomId) =>
  Object.values(getRoom(roomId)?.players ?? {}).map((p) => ({
    playerId: p.playerId,
    name: p.name,
    connected: p.connected,
    eliminated: p.eliminated ?? false,
  }));

export const registerEliminationSockets = (io) => {
  const emitToRoom = (roomId, event, payload) =>
    io.to(roomId).emit(event, payload);

  // Sanitise a player name — trim, strip HTML, limit length
  const sanitiseName = (name) => {
    if (typeof name !== 'string') return 'Player';
    return name
      .trim()
      .replace(/<[^>]*>/g, '')     // strip HTML tags
      .replace(/[^\w\s\-'.]/g, '') // only allow safe chars
      .slice(0, 32);               // max 32 chars
  };

  // Rate limit wrapper — rejects event and emits error if over limit
  const rateCheck = (socket, event) => {
    if (!checkSocketRate(socket.id, event)) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Too many requests. Slow down.' });
      return false;
    }
    return true;
  };

  io.on('connection', (socket) => {

    // ── HOST JOIN (no player entry, socket room only) ──────────────────────────
    socket.on('host_join_elimination_room', ({ roomId, hostId }) => {
      if (!rateCheck(socket, 'host_join_elimination_room')) return;
      try {
        console.log('🎮 [Elimination] host_join_elimination_room:', { roomId, hostId });
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });
        if (room.hostId !== hostId) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Invalid host credentials' });

        room.hostSocketId = socket.id;
        socket.join(roomId);
        console.log('🎮 [Elimination] Host joined socket room:', { roomId, hostId, socketId: socket.id });

        // Send host the current room state
        socket.emit(SERVER_EVENTS.ROOM_STATE, getRoomSnapshot(roomId));

        // Send host the current player list
        socket.emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── PLAYER JOIN ROOM ──────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.JOIN_ROOM, ({ roomId, playerId, name }) => {
      if (!rateCheck(socket, 'join_elimination_room')) return;
      try {
        const name_safe = sanitiseName(name);
        console.log('🎮 [Elimination] join_elimination_room:', { roomId, playerId, name: name_safe });

        // Reconnect flow — playerId already exists
        if (playerId) {
          const result = reconnectPlayer(roomId, playerId, socket.id);
          if (!result.success) {
            return socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
          }
          socket.join(roomId);
          socket.emit(SERVER_EVENTS.ROOM_STATE, {
            ...result.snapshot,
            yourPlayerId: playerId,
          });
          emitToRoom(roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
          return;
        }

        const { valid, error } = validateJoin(roomId);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        // Make name unique — if "sarah" exists, new player becomes "sarah 2", then "sarah 3" etc.
        const room = getRoom(roomId);
        let uniqueName = name_safe || 'Player';
        if (room) {
          const existingNames = Object.values(room.players).map(p => p.name.toLowerCase());
          if (existingNames.includes(uniqueName.toLowerCase())) {
            let suffix = 2;
            while (existingNames.includes(`${uniqueName.toLowerCase()} ${suffix}`)) suffix++;
            uniqueName = `${uniqueName} ${suffix}`;
          }
        }

        const { player } = addPlayer(roomId, { name: uniqueName, socketId: socket.id });
        socket.join(roomId);

        // Confirm to joining player — include their playerId so client doesn't need to guess by name
        socket.emit(SERVER_EVENTS.ROOM_STATE, {
          ...getRoomSnapshot(roomId),
          yourPlayerId: player.playerId,
          yourName: player.name,
        });

        // Notify everyone in room (including host) of updated player list
        emitToRoom(roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── START GAME ────────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.START_GAME, ({ roomId, hostId }) => {
      if (!rateCheck(socket, 'start_elimination_game')) return;
      try {
        const { valid, error } = validateStart(roomId, hostId);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        startGame(roomId, (event, payload) => emitToRoom(roomId, event, payload)).catch((err) => {
          console.error(`[Elimination] Game loop error in room ${roomId}:`, err);
          emitToRoom(roomId, SERVER_EVENTS.ERROR, { message: 'Game encountered an error.' });
        });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── SUBMIT ANSWER ─────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.SUBMIT_ANSWER, ({ roomId, playerId, submission }) => {
      if (!rateCheck(socket, 'submit_round_answer')) return;
      // Reject oversized payloads (max 1KB)
      try {
        const payloadSize = JSON.stringify(submission || {}).length;
        if (payloadSize > 1024) {
          return socket.emit(SERVER_EVENTS.ERROR, { message: 'Submission too large.' });
        }
      } catch {}
      try {
        const { valid, error, activeRound } = validateRoundSubmission(roomId, playerId, submission);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        recordSubmission(roomId, activeRound.roundId, playerId, submission);
        socket.emit(SERVER_EVENTS.SUBMISSION_RECEIVED, { roundId: activeRound.roundId, playerId });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── RECONNECT (explicit) ──────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.RECONNECT_PLAYER, ({ roomId, playerId }) => {
      if (!rateCheck(socket, 'reconnect_elimination_player')) return;
      try {
        const result = reconnectPlayer(roomId, playerId, socket.id);
        if (!result.success) return socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
        socket.join(roomId);
        socket.emit(SERVER_EVENTS.ROOM_STATE, result.snapshot);
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── LEAVE ROOM ────────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.LEAVE_ROOM, ({ roomId, playerId }) => {
      socket.leave(roomId);
      handleDisconnect(roomId, playerId);
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      cleanupSocket(socket.id); // remove rate limit entries
      const found = findPlayerBySocket(socket.id);
      if (!found) return;
      const { room, player } = found;
      handleDisconnect(room.roomId, player.playerId);

      if (room.status === ROOM_STATUS.WAITING) {
        emitToRoom(room.roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(room.roomId) });
      }
    });
  });
};