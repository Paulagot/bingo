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
  ROUND_7_TARGET_FINALISTS,
} from '../utils/eliminationConstants.js';

// ─── Wait for full web3 finalize workflow completion ──────────────────────────
// We do NOT end the room when payout is merely "settled".
// We only end it when the host has finished the full finalize flow:
// finalize_game -> finalize-confirm -> close_room attempt -> finalize-complete
const waitForFinalizeWorkflowComplete = async (roomId) => {
  const MAX_WAIT_MS = 15 * 60 * 1000;
  const POLL_INTERVAL_MS = 5000;
  let waited = 0;

  while (waited < MAX_WAIT_MS) {
    await delay(POLL_INTERVAL_MS);
    waited += POLL_INTERVAL_MS;

    const room = getRoom(roomId);

    // Room already removed elsewhere — nothing left to wait for
    if (!room) return true;

    if (room.finalizeWorkflowComplete) {
      return true;
    }

    if (waited % 60000 === 0) {
      console.log(
        `[Elimination] Still waiting for finalize workflow completion on room ${roomId} (${waited / 1000}s elapsed)`
      );
    }
  }

  console.warn(
    `[Elimination] Room ${roomId} finalize workflow not completed after 15 minutes — forcing cleanup`
  );
  return false;
};

/**
 * Start the game for a room.
 *
 * All round thresholds (safe rounds, finalist round, final round) are derived
 * from GAME_RULES.TOTAL_ROUNDS — no magic numbers here.
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

  // Reset any stale finalize flags just in case
room.settled = false;
room.finalizeWorkflowComplete = false;
room.finalizeTxSignature = null;
room.settledAt = null;
room.finalizeCompletedAt = null;
room.closeAttempted = false;
room.closeSucceeded = false;
room.closeTxHash = null;

  const finalistRound = GAME_RULES.TOTAL_ROUNDS - 1;

  emit(SERVER_EVENTS.GAME_STARTED, {
    roomId,
    totalRounds: GAME_RULES.TOTAL_ROUNDS,
    players: getActivePlayers(roomId).map((p) => ({
      playerId: p.playerId,
      name: p.name,
    })),
  });

  let lastShape = null;

  for (let i = 0; i < GAME_RULES.TOTAL_ROUNDS; i++) {
    const roundNumber = i + 1;
    const roundType = roundTypeSequence[i];
    const difficulty = 1 + (roundNumber - 1) * 0.15;

    const roundState = createRound(
      roomId,
      roundNumber,
      roundType,
      difficulty,
      lastShape,
      GAME_RULES.TOTAL_ROUNDS,
    );

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

    if (roundNumber < GAME_RULES.FIRST_ELIMINATING_ROUND) {
      eliminationCount = 0;
      eliminationMode = 'none';
    } else if (roundNumber === GAME_RULES.TOTAL_ROUNDS) {
      eliminationCount = activeCount - 1;
      eliminationMode = 'final';
    } else if (roundNumber === finalistRound) {
      eliminationCount = Math.max(0, activeCount - ROUND_7_TARGET_FINALISTS);
      eliminationMode = 'reduce_to_finalists';
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

    // ── ELIMINATION ──────────────────────────────────────────────────────────
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

    // ── RESULTS ──────────────────────────────────────────────────────────────
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
      if (!currentRoom) {
        throw new Error(`Room ${roomId} missing at final round`);
      }

      const roundStateRef = currentRoom.rounds[roundId];

      const winnerId = determineWinner(
        rankedResults,
        roundStateRef.submissions,
        activePlayers.length > 0 ? activePlayers : Object.values(currentRoom.players),
      );

      const winner = currentRoom.players[winnerId];

      // Winner is known now, but for web3 rooms the room is NOT truly ended yet.
      emit(SERVER_EVENTS.WINNER_DECLARED, {
        winnerId,
        winnerName: winner?.name ?? 'Unknown',
        finalStandings: resultPayload,
        roomSnapshot: getRoomSnapshot(roomId),
      });

      const roomAfterWin = getRoom(roomId);
      const isWeb3Room = roomAfterWin?.paymentMode === 'web3';

      if (isWeb3Room) {
        // Wait for the host to finish the full finalize workflow before ending the room
        await delay(5000);
        await waitForFinalizeWorkflowComplete(roomId);
      } else {
        // Web2 behaviour unchanged
        await delay(62000);
      }

      endRoom(roomId, winnerId);

      emit(SERVER_EVENTS.ROOM_ENDED, { roomId, reason: 'game_complete' });

      await delay(3000);
      deleteRoom(roomId);

      return;
    }

    // ── TRANSITION TO NEXT ROUND ─────────────────────────────────────────────
    emit(SERVER_EVENTS.NEXT_ROUND, {
      nextRoundNumber: roundNumber + 1,
      transitionDelayMs: TIMING.RESULTS_DURATION_MS,
      activePlayers: getActivePlayers(roomId).length,
    });

    await delay(TIMING.RESULTS_DURATION_MS);
  }
};
