/**
 * DEV ONLY — /api/elimination/dev
 *
 * Spins up a fake single-player room, runs one round of a chosen type,
 * then cleans up. No auth, no web3, no min-player checks.
 *
 * Add to your server BEFORE the main elimination router:
 *   import devRouter from './elimination/routes/eliminationDevRoutes.js';
 *   app.use('/api/elimination/dev', devRouter);
 *
 * Only mount this in development:
 *   if (process.env.NODE_ENV !== 'production') {
 *     app.use('/api/elimination/dev', devRouter);
 *   }
 */

import express from 'express';
import { createRoom, addPlayer, startRoom, deleteRoom, getRoom } from '../services/eliminationRoomManager.js';
import { createRound, activateRound, closeAndScoreRound, completeRound } from '../services/eliminationRoundService.js';
import { generatePlayerId } from '../utils/eliminationHelpers.js';
import { SERVER_EVENTS, TIMING, ALL_ROUND_TYPES } from '../utils/eliminationConstants.js';
import { delay } from '../utils/eliminationTimers.js';

const router = express.Router();

// ─── GET /api/elimination/dev/round-types ─────────────────────────────────────
// Returns all available round types so the frontend picker can stay in sync
router.get('/round-types', (_req, res) => {
  res.json({ success: true, roundTypes: ALL_ROUND_TYPES });
});

// ─── POST /api/elimination/dev/start-round ────────────────────────────────────
// Body: { roundType: string, difficulty?: number, socketId: string }
//
// 1. Creates a temporary room + one fake player
// 2. Emits the normal socket event sequence: ROUND_INTRO → ROUND_STARTED
// 3. Waits for the round timer to expire (+ 1.5s grace)
// 4. Scores, emits ROUND_REVEAL, waits reveal duration
// 5. Emits ROUND_RESULTS then ROOM_ENDED, deletes room
//
// The frontend connects normally via socket — it just gets a roomId +
// playerId back from this endpoint and joins like any other player.

router.post('/start-round', async (req, res) => {
  const io = req.app.get('io'); // Socket.IO instance — set via app.set('io', io)
  if (!io) {
    return res.status(500).json({ success: false, error: 'Socket.IO not available on app instance. Call app.set("io", io) in your server setup.' });
  }

  const { roundType, difficulty = 1, socketId } = req.body;

  if (!roundType || !ALL_ROUND_TYPES.includes(roundType)) {
    return res.status(400).json({
      success: false,
      error: `Invalid roundType. Must be one of: ${ALL_ROUND_TYPES.join(', ')}`,
    });
  }

  if (!socketId || typeof socketId !== 'string') {
    return res.status(400).json({ success: false, error: 'socketId is required' });
  }

  // ── Create a dev room ──────────────────────────────────────────────────────
  const hostId = generatePlayerId();

  const room = createRoom({
    hostId,
    hostName: 'Dev Host',
    hostSocketId: null,
    paymentMode: 'free',
  });

  const { roomId } = room;

  // Mark it as a dev room so nothing else touches it
  room._devRoom = true;

  // ── Add the dev player ─────────────────────────────────────────────────────
  // addPlayer generates the playerId internally - capture it from the return value
  const { player: devPlayer } = addPlayer(roomId, {
    name: 'Dev Player',
    socketId,
  });
  const playerId = devPlayer.playerId;

  // Start the room (transitions status to 'active', sets up player state)
  startRoom(roomId, []);

  // ── Join the socket to the room channel ───────────────────────────────────
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) {
    deleteRoom(roomId);
    return res.status(400).json({
      success: false,
      error: 'Socket not found. Make sure you connect before calling this endpoint.',
    });
  }
  socket.join(roomId);

  const emit = (event, payload) => io.to(roomId).emit(event, payload);

  // Return room + player info to the frontend immediately
  res.json({
    success: true,
    roomId,
    playerId,
    roundType,
    difficulty,
  });

  // ── Run the round loop async (after response sent) ────────────────────────
  (async () => {
    try {
      const roundNumber = 1;
      const roundState = createRound(roomId, roundNumber, roundType, difficulty, null);
      const { roundId } = roundState;

      // Push roundId into room sequence so scoring service can find it
      room.roundSequence = [roundId];
      room.activeRoundIndex = 0;

      // ── INTRO ──────────────────────────────────────────────────────────────
      emit(SERVER_EVENTS.ROUND_INTRO, {
        roundNumber,
        totalRounds: 1,
        roundType,
        roundId,
        introDurationMs: TIMING.INTRO_DURATION_MS,
        introCountdownMs: TIMING.INTRO_COUNTDOWN_MS,
        activePlayers: 1,
        eliminationCount: 0,
        eliminationMode: 'none',
      });

      await delay(TIMING.INTRO_DURATION_MS);

      // ── ACTIVE ─────────────────────────────────────────────────────────────
      const activeState = activateRound(roomId, roundId);

      emit(SERVER_EVENTS.ROUND_STARTED, {
        roundId,
        roundNumber,
        roundType,
        config: activeState.generatedConfig,
        startedAt: activeState.startedAt,
        endsAt: activeState.endsAt,
      });

      // Wait for round duration + 1.5s grace for late submissions
      await delay(activeState.generatedConfig.durationMs);
      await delay(1500);

      // ── SCORING ────────────────────────────────────────────────────────────
      const rankedResults = closeAndScoreRound(roomId, roundId);

      const resultPayload = rankedResults.map((r) => ({
        ...r,
        survived: true, // dev mode — nobody gets eliminated
      }));

      // ── REVEAL ─────────────────────────────────────────────────────────────
      emit(SERVER_EVENTS.ROUND_REVEAL, {
        roundId,
        roundNumber,
        roundType,
        results: resultPayload,
        revealDurationMs: TIMING.REVEAL_DURATION_MS,
      });

      await delay(TIMING.REVEAL_DURATION_MS);

      // ── RESULTS ────────────────────────────────────────────────────────────
      emit(SERVER_EVENTS.ROUND_RESULTS, {
        roundId,
        roundNumber,
        results: resultPayload,
      });

      completeRound(roomId, roundId);

      await delay(4000);

      // ── CLEANUP ────────────────────────────────────────────────────────────
      emit(SERVER_EVENTS.ROOM_ENDED, { roomId, reason: 'dev_round_complete' });
      await delay(2000);
      deleteRoom(roomId);
      console.log(`[Dev] Round complete — room ${roomId} deleted`);

    } catch (err) {
      console.error('[Dev] Round loop error:', err);
      try { deleteRoom(roomId); } catch {}
    }
  })();
});

export default router;
