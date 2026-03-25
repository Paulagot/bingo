import {
  getRoom,
  startRoom,
  advanceRound,
  endRoom,
  deleteRoom,
  getActivePlayers,
  getRoomSnapshot,
} from './eliminationRoomManager.js';
import {
  createRound,
  activateRound,
  closeAndScoreRound,
  completeRound,
  recordRoundEliminations,
} from './eliminationRoundService.js';
import { applyEliminations, determineWinner } from './eliminationEliminationService.js';
import { delay } from '../utils/eliminationTimers.js';
import {
  GAME_RULES,
  DEFAULT_ROUND_SEQUENCE,
  ALL_ROUND_TYPES,
  SERVER_EVENTS,
  TIMING,
  ELIMINATION_SCHEDULE,
  ROUND_7_TARGET_FINALISTS,
} from '../utils/eliminationConstants.js';

/**
 * Start the game for a room.
 * Locks the player list, builds the round type sequence, then runs the game loop.
 *
 * @param {string} roomId
 * @param {Function} emit   - fn(event, payload) — broadcasts to the room
 */
export const startGame = async (roomId, emit) => {
  // Build a randomised 8-round sequence — no type appears more than once.
  // We have 10 types and only need 8, so just shuffle and take first 8.
  const buildRoundSequence = () => {
    const pool = [...ALL_ROUND_TYPES];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, GAME_RULES.TOTAL_ROUNDS);
  };

  const roundTypeSequence = buildRoundSequence();

  // We'll store round IDs here; but startRoom takes type sequence for now
  const room = startRoom(roomId, []); // will fill roundSequence below
  if (!room) throw new Error('Failed to start room');

  emit(SERVER_EVENTS.GAME_STARTED, {
    roomId,
    totalRounds: GAME_RULES.TOTAL_ROUNDS,
    players: getActivePlayers(roomId).map((p) => ({
      playerId: p.playerId,
      name: p.name,
    })),
  });

  // ─── Round Loop ────────────────────────────────────────────────────────────
  let lastShape = null; // track last shape to avoid repeats in True Centre
  for (let i = 0; i < GAME_RULES.TOTAL_ROUNDS; i++) {
    const roundNumber = i + 1;
    const roundType = roundTypeSequence[i];

    // Difficulty increases gently each round
    const difficulty = 1 + (roundNumber - 1) * 0.15;

    // Create round state
    const roundState = createRound(roomId, roundNumber, roundType, difficulty, lastShape);
    // Track shape so next True Centre round picks a different one
    if (roundState.generatedConfig?.shapeType) {
      lastShape = roundState.generatedConfig.shapeType;
    }
    const { roundId } = roundState;

    // Track round ID in room sequence
    room.roundSequence.push(roundId);
    room.activeRoundIndex = i;

    // ── INTRO ────────────────────────────────────────────────────────────────
    const activeCount = getActivePlayers(roomId).length;

    // Calculate how many will be eliminated this round
    let eliminationCount = 0;
    let eliminationMode = 'none';
    if (roundNumber <= 2) {
      eliminationCount = 0;
      eliminationMode = 'none';
    } else if (roundNumber === GAME_RULES.TOTAL_ROUNDS) {
      eliminationCount = activeCount - 1;
      eliminationMode = 'final';
    } else if (roundNumber === 7) {
      eliminationCount = Math.max(0, activeCount - 3);
      eliminationMode = 'reduce_to_three';
    } else {
      const schedule = ELIMINATION_SCHEDULE[roundNumber];
      if (typeof schedule === 'number' && schedule > 0) {
        eliminationCount = Math.min(Math.ceil(activeCount * schedule), activeCount - 1);
        eliminationMode = 'percentage';
      }
    }

    emit(SERVER_EVENTS.ROUND_INTRO, {
      roundNumber,
      totalRounds: GAME_RULES.TOTAL_ROUNDS,
      roundType,
      roundId,
      introDurationMs: TIMING.INTRO_DURATION_MS,
      introCountdownMs: TIMING.INTRO_COUNTDOWN_MS,
      activePlayers: activeCount,
      eliminationCount,
      eliminationMode,
    });

    await delay(TIMING.INTRO_DURATION_MS);

    // ── ACTIVE ───────────────────────────────────────────────────────────────
    const activeState = activateRound(roomId, roundId);

    emit(SERVER_EVENTS.ROUND_STARTED, {
      roundId,
      roundNumber,
      roundType,
      config: activeState.generatedConfig,
      startedAt: activeState.startedAt,
      endsAt: activeState.endsAt,
    });

    // Wait for round timer to expire, plus a grace period for network lag
    await delay(activeState.generatedConfig.durationMs);
    await delay(1500); // 1.5s grace — lets late submissions arrive before scoring

    // ── SCORING ──────────────────────────────────────────────────────────────
    const rankedResults = closeAndScoreRound(roomId, roundId);

    // ── ELIMINATION ───────────────────────────────────────────────────────────
    const eliminatedThisRound = applyEliminations(roomId, roundNumber, rankedResults);
    recordRoundEliminations(roomId, roundId, eliminatedThisRound);

    // Annotate results with survived flag
    const resultPayload = rankedResults.map((r) => ({
      ...r,
      survived: !eliminatedThisRound.includes(r.playerId),
    }));

    // ── PHASE 1: REVEAL — show correct answer + each player's answer ─────────
    // Emit reveal data per player so each client can show their own result
    emit(SERVER_EVENTS.ROUND_REVEAL, {
      roundId,
      roundNumber,
      roundType,
      results: resultPayload,        // includes revealData per player
      revealDurationMs: TIMING.REVEAL_DURATION_MS,
    });

    // Server waits the full reveal duration before broadcasting scores
    await delay(TIMING.REVEAL_DURATION_MS);

    // ── PHASE 2: RESULTS — scores and leaderboard ─────────────────────────────
    emit(SERVER_EVENTS.ROUND_RESULTS, {
      roundId,
      roundNumber,
      results: resultPayload,
    });

    if (eliminatedThisRound.length > 0) {
      emit(SERVER_EVENTS.PLAYERS_ELIMINATED, {
        roundNumber,
        eliminatedPlayerIds: eliminatedThisRound,
        activePlayers: getActivePlayers(roomId).length,
      });
    }

    completeRound(roomId, roundId);

    // ── FINAL ROUND? ─────────────────────────────────────────────────────────
    if (roundNumber === GAME_RULES.TOTAL_ROUNDS) {
      const activePlayers = getActivePlayers(roomId);
      const currentRoom = getRoom(roomId);
      const roundStateRef = currentRoom.rounds[roundId];

      const winnerId = determineWinner(
        rankedResults,
        roundStateRef.submissions,
        activePlayers.length > 0 ? activePlayers : Object.values(currentRoom.players),
      );

      endRoom(roomId, winnerId);

      const winner = currentRoom.players[winnerId];
      emit(SERVER_EVENTS.WINNER_DECLARED, {
        winnerId,
        winnerName: winner?.name ?? 'Unknown',
        finalStandings: resultPayload,
        roomSnapshot: getRoomSnapshot(roomId),
      });

      // Wait for winner screen auto-close (60s) then emit ROOM_ENDED and clean up
      await delay(62000);
      emit(SERVER_EVENTS.ROOM_ENDED, { roomId, reason: 'game_complete' });
      deleteRoom(roomId);

      return; // game over
    }

    // ── TRANSITION TO NEXT ROUND ─────────────────────────────────────────────
    emit(SERVER_EVENTS.NEXT_ROUND, {
      nextRoundNumber: roundNumber + 1,
      transitionDelayMs: TIMING.TRANSITION_DELAY_MS,
      activePlayers: getActivePlayers(roomId).length,
    });

    await delay(TIMING.RESULTS_DURATION_MS);
  }
};