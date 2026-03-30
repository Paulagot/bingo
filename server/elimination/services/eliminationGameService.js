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
  ALL_ROUND_TYPES,
  SERVER_EVENTS,
  TIMING,
  ELIMINATION_SCHEDULE,
} from '../utils/eliminationConstants.js';

// ─── Wait for web3 finalize confirmation ─────────────────────────────────────
// Polls room.settled every 5 seconds, up to 15 minutes.
// Returns true if settled, false if timed out.
const waitForFinalize = async (roomId) => {
  const MAX_WAIT_MS = 15 * 60 * 1000;  // 15 minutes
  const POLL_INTERVAL_MS = 5000;        // check every 5 seconds
  let waited = 0;

  console.log(`[Elimination] Web3 room ${roomId} — waiting for finalize_game tx...`);

  while (waited < MAX_WAIT_MS) {
    await delay(POLL_INTERVAL_MS);
    waited += POLL_INTERVAL_MS;

    const room = getRoom(roomId);

    // Room already deleted or settled
    if (!room) return true;
    if (room.settled) {
      console.log(`[Elimination] Room ${roomId} finalized after ${waited / 1000}s`);
      return true;
    }

    // Log progress every minute
    if (waited % 60000 === 0) {
      console.log(`[Elimination] Still waiting for finalize on room ${roomId} (${waited / 1000}s elapsed)`);
    }
  }

  console.warn(`[Elimination] Room ${roomId} not finalized after 15 minutes — forcing cleanup`);
  return false;
};

/**
 * Start the game for a room.
 */
export const startGame = async (roomId, emit) => {
  const buildRoundSequence = () => {
    const pool = [...ALL_ROUND_TYPES];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, GAME_RULES.TOTAL_ROUNDS);
  };

  const roundTypeSequence = buildRoundSequence();
  const room = startRoom(roomId, []);
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
  let lastShape = null;

  for (let i = 0; i < GAME_RULES.TOTAL_ROUNDS; i++) {
    const roundNumber = i + 1;
    const roundType = roundTypeSequence[i];
    const difficulty = 1 + (roundNumber - 1) * 0.15;

    const roundState = createRound(roomId, roundNumber, roundType, difficulty, lastShape);
    if (roundState.generatedConfig?.shapeType) {
      lastShape = roundState.generatedConfig.shapeType;
    }
    const { roundId } = roundState;

    room.roundSequence.push(roundId);
    room.activeRoundIndex = i;

    // ── INTRO ────────────────────────────────────────────────────────────────
    const activeCount = getActivePlayers(roomId).length;

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

    await delay(activeState.generatedConfig.durationMs);
    await delay(1500);

    // ── SCORING ──────────────────────────────────────────────────────────────
    const rankedResults = closeAndScoreRound(roomId, roundId);

    // ── ELIMINATION ───────────────────────────────────────────────────────────
    const eliminatedThisRound = applyEliminations(roomId, roundNumber, rankedResults);
    recordRoundEliminations(roomId, roundId, eliminatedThisRound);

    const resultPayload = rankedResults.map((r) => ({
      ...r,
      survived: !eliminatedThisRound.includes(r.playerId),
    }));

    // ── REVEAL ───────────────────────────────────────────────────────────────
    emit(SERVER_EVENTS.ROUND_REVEAL, {
      roundId,
      roundNumber,
      roundType,
      results: resultPayload,
      revealDurationMs: TIMING.REVEAL_DURATION_MS,
    });

    await delay(TIMING.REVEAL_DURATION_MS);

    // ── RESULTS ───────────────────────────────────────────────────────────────
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

    // ── FINAL ROUND ───────────────────────────────────────────────────────────
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

      // ── Web3 rooms: wait for finalize_game tx before cleanup ──────────────
      const roomAfterWin = getRoom(roomId);
      const isWeb3Room = roomAfterWin?.paymentMode === 'web3';

  if (isWeb3Room) {
  await delay(5000);
  await waitForFinalize(roomId);
} else {
  await delay(62000);
}

// Emit ROOM_ENDED and give clients time to receive it before deleting
emit(SERVER_EVENTS.ROOM_ENDED, { roomId, reason: 'game_complete' });
console.log(`[Elimination] ROOM_ENDED emitted for ${roomId} — waiting 3s before cleanup`);
await delay(3000);  // ← give clients time to receive the event
deleteRoom(roomId);
console.log(`[Elimination] Room ${roomId} deleted`);

      return;
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
