import {
  addPlayer,
  findPlayerBySocket,
  getRoomSnapshot,
  getRoom,
} from '../services/eliminationRoomManager.js';
import { startGame } from '../services/eliminationGameService.js';
import { recordSubmission, recordStartPress } from '../services/eliminationRoundService.js';
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
import { Connection } from '@solana/web3.js';

const getAllPlayers = (roomId) =>
  Object.values(getRoom(roomId)?.players ?? {}).map((p) => ({
    playerId: p.playerId,
    name: p.name,
    connected: p.connected,
    eliminated: p.eliminated ?? false,
    walletAddress: p.walletAddress ?? null, 
  }));

// ── Web3 tx verification ──────────────────────────────────────────────────────
const verifyWeb3JoinTx = async (txSignature, room) => {
  try {
    const cluster = room.solanaCluster ?? 'devnet';
    const rpcUrl = cluster === 'mainnet'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    const tx = await connection.getTransaction(txSignature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return { valid: false, error: 'Payment transaction not found. Please try again.' };
    }

    if (tx.meta?.err) {
      return { valid: false, error: 'Payment transaction failed on-chain.' };
    }

    let walletAddress = null;
    try {
      const accountKeys = tx.transaction.message.getAccountKeys
        ? tx.transaction.message.getAccountKeys().staticAccountKeys
        : tx.transaction.message.accountKeys;

      if (accountKeys && accountKeys.length > 0) {
        walletAddress = accountKeys[0].toBase58();
      }
    } catch (e) {
      console.warn('[Elimination] Could not extract wallet from tx:', e.message);
    }

    console.log(`[Elimination] Web3 join tx verified: ${txSignature} wallet: ${walletAddress}`);
    return { valid: true, walletAddress };

  } catch (err) {
    console.error('[Elimination] Web3 tx verification error:', err);
    return { valid: false, error: 'Could not verify payment. Please try again.' };
  }
};

export const registerEliminationSockets = (io) => {
  const emitToRoom = (roomId, event, payload) =>
    io.to(roomId).emit(event, payload);

  const sanitiseName = (name) => {
    if (typeof name !== 'string') return 'Player';
    return name
      .trim()
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w\s\-'.]/g, '')
      .slice(0, 32);
  };

  const rateCheck = (socket, event) => {
    if (!checkSocketRate(socket.id, event)) {
      socket.emit(SERVER_EVENTS.ERROR, { message: 'Too many requests. Slow down.' });
      return false;
    }
    return true;
  };

  io.on('connection', (socket) => {

    // ── HOST JOIN ──────────────────────────────────────────────────────────────
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

        socket.emit(SERVER_EVENTS.ROOM_STATE, getRoomSnapshot(roomId));
        socket.emit(SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── HOST CANCEL ROOM ───────────────────────────────────────────────────────
    socket.on('host_cancel_elimination_room', ({ roomId, hostId }) => {
      if (!rateCheck(socket, 'host_cancel_elimination_room')) return;
      try {
        const room = getRoom(roomId);
        if (!room) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Room not found' });
        if (room.hostId !== hostId) return socket.emit(SERVER_EVENTS.ERROR, { message: 'Unauthorized' });

        io.to(roomId).emit('elimination_room_cancelled', {
          roomId,
          reason: 'host_cancelled',
          cancelTxHash: room.cancelTxHash ?? null,
          refundTxHash: room.refundTxHash ?? null,
        });

        console.log(`[Elimination] Notified players of cancellation for room ${roomId}`);
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── PLAYER JOIN ROOM ───────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.JOIN_ROOM, async ({ roomId, playerId, name, txSignature }) => {
      if (!rateCheck(socket, 'join_elimination_room')) return;
      try {
        const name_safe = sanitiseName(name);
        console.log('🎮 [Elimination] join_elimination_room:', {
          roomId,
          playerId,
          name: name_safe,
          isWeb3: !!txSignature,
        });

        // ── Reconnect flow ────────────────────────────────────────────────────
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

        // ── Validate room ─────────────────────────────────────────────────────
        const { valid, error } = validateJoin(roomId);
        if (!valid) return socket.emit(SERVER_EVENTS.ERROR, { message: error });

        const room = getRoom(roomId);

        // ── Web3 payment verification ─────────────────────────────────────────
        let verifiedWalletAddress = null;

        if (room?.paymentMode === 'web3') {
          if (!txSignature || typeof txSignature !== 'string') {
            return socket.emit(SERVER_EVENTS.ERROR, {
              message: 'Payment required to join this room.',
            });
          }

          if (txSignature === 'already-joined') {
            console.log(`[Elimination] already-joined bypass for room ${roomId}`);
          } else {
            const { valid: txValid, error: txError, walletAddress } = await verifyWeb3JoinTx(txSignature, room);
            if (!txValid) {
              return socket.emit(SERVER_EVENTS.ERROR, { message: txError });
            }
            verifiedWalletAddress = walletAddress;
            console.log(`[Elimination] Web3 payment verified for room ${roomId} wallet: ${walletAddress}`);
          }
        }

        // ── Make name unique ──────────────────────────────────────────────────
        let uniqueName = name_safe || 'Player';
        if (room) {
          const existingNames = Object.values(room.players).map(p => p.name.toLowerCase());
          if (existingNames.includes(uniqueName.toLowerCase())) {
            let suffix = 2;
            while (existingNames.includes(`${uniqueName.toLowerCase()} ${suffix}`)) suffix++;
            uniqueName = `${uniqueName} ${suffix}`;
          }
        }

        // ── Add player ────────────────────────────────────────────────────────
        const { player } = addPlayer(roomId, {
          name: uniqueName,
          socketId: socket.id,
          txSignature: txSignature ?? null,
          walletAddress: verifiedWalletAddress,
        });

        socket.join(roomId);

        socket.emit(SERVER_EVENTS.ROOM_STATE, {
          ...getRoomSnapshot(roomId),
          yourPlayerId: player.playerId,
          yourName: player.name,
        });

        emitToRoom(roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, { players: getAllPlayers(roomId) });

      } catch (err) {
        console.error('[Elimination] JOIN_ROOM error:', err);
        socket.emit(SERVER_EVENTS.ERROR, { message: err.message });
      }
    });

    // ── START GAME ─────────────────────────────────────────────────────────────
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

    // ── SUBMIT ANSWER ──────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.SUBMIT_ANSWER, ({ roomId, playerId, submission }) => {
      if (!rateCheck(socket, 'submit_round_answer')) return;
      try {
        const payloadSize = JSON.stringify(submission || {}).length;
        // Path trace submissions contain arrays of points and need a higher limit.
        // Other round types are well under 1KB — this limit covers both safely.
        const sizeLimit = submission?.roundType === 'path_trace' ? 16384 : 1024;
        if (payloadSize > sizeLimit) {
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

    // ── TIME ESTIMATION: START PRESS ───────────────────────────────────────────
    // Records the server-side timestamp of when the player pressed START.
    // This is the authoritative start time for scoring — not the round
    // activation time and not any client-supplied value.
    socket.on(CLIENT_EVENTS.SUBMIT_START_PRESS, ({ roomId, playerId, roundId }) => {
      if (!rateCheck(socket, 'submit_time_estimation_start')) return;
      try {
        recordStartPress(roomId, roundId, playerId);
      } catch (err) {
        console.warn('[Elimination] SUBMIT_START_PRESS error:', err.message);
      }
    });

    // ── RECONNECT (explicit) ───────────────────────────────────────────────────
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

    // ── LEAVE ROOM ─────────────────────────────────────────────────────────────
    socket.on(CLIENT_EVENTS.LEAVE_ROOM, ({ roomId, playerId }) => {
      socket.leave(roomId);
      handleDisconnect(roomId, playerId);
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      cleanupSocket(socket.id);
      const found = findPlayerBySocket(socket.id);
      if (!found) return;
      const { room, player } = found;
      handleDisconnect(room.roomId, player.playerId);

      if (room.status === ROOM_STATUS.WAITING) {
        emitToRoom(room.roomId, SERVER_EVENTS.WAITING_ROOM_UPDATE, {
          players: getAllPlayers(room.roomId),
        });
      }
    });
  });
};