import {
  addPlayer,
  findPlayerBySocket,
  getRoomSnapshot,
  getRoom,
} from '../services/eliminationRoomManager.js';
import { startGame } from '../services/eliminationGameService.js';
import { recordSubmission } from '../services/eliminationRoundService.js';
import { reconnectPlayer, handleDisconnect } from '../services/eliminationReconnectionService.js';
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

  io.on('connection', (socket) => {

    // ── HOST JOIN (no player entry, socket room only) ──────────────────────────
    socket.on('host_join_elimination_room', ({ roomId, hostId }) => {
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
      try {
        console.log('🎮 [Elimination] join_elimination_room:', { roomId, playerId, name });

        // Reconnect flow — playerId already exists
        if (playerId) {
          const result = reconnectPlayer(roomId, playerId, socket.id);
          if (!result.success) {
            return socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
          }
          socket.join(roomId);
          socket.emit(SERVER_EVENTS.ROOM_STATE, result.snapshot);
          emitToRoom(roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
          return;
        }

        // New player join flow
        const { valid, error, room } = validateJoin(roomId);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        const { player } = addPlayer(roomId, { name, socketId: socket.id });
        socket.join(roomId);

        // Confirm to joining player
        socket.emit(SERVER_EVENTS.ROOM_STATE, getRoomSnapshot(roomId));

        // Notify everyone in room (including host) of updated player list
        emitToRoom(roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── START GAME ────────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.START_GAME, ({ roomId, hostId }) => {
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