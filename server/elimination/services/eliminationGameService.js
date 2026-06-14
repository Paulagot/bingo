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
import { saveEliminationGameStats } from './eliminationStatsService.js';

// ─── Wait for full web3 finalize workflow completion ──────────────────────────
const waitForFinalizeWorkflowComplete = async (roomId) => {
  const MAX_WAIT_MS = 15 * 60 * 1000;
  const POLL_INTERVAL_MS = 5000;
  let waited = 0;

  while (waited < MAX_WAIT_MS) {
    await delay(POLL_INTERVAL_MS);
    waited += POLL_INTERVAL_MS;

    const room = getRoom(roomId);
    if (!room) return true;
    if (room.finalizeWorkflowComplete) return true;

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

// ─── Wait for host reconciliation to be approved ──────────────────────────────
const waitForReconciliationOrTimeout = async (roomId) => {
  const MAX_WAIT_MS = 3 * 60 * 60 * 1000; // 3 hours
  const POLL_INTERVAL_MS = 10_000;
  let waited = 0;

  while (waited < MAX_WAIT_MS) {
    await delay(POLL_INTERVAL_MS);
    waited += POLL_INTERVAL_MS;

    const room = getRoom(roomId);
    if (!room) return;

    if (room.reconciliationApproved) {
      console.log(`[Elimination] Reconciliation approved for room ${roomId} — cleaning up`);
      deleteRoom(roomId);
      return;
    }
  }

  console.warn(
    `[Elimination] Room ${roomId} reconciliation not approved after 3 hours — forcing cleanup`
  );
  deleteRoom(roomId);
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

  room.settled = false;
  room.finalizeWorkflowComplete = false;
  room.finalizeTxSignature = null;
  room.settledAt = null;
  room.finalizeCompletedAt = null;
  room.closeAttempted = false;
  room.closeSucceeded = false;
  room.closeTxHash = null;
  room.pendingReconciliation = false;
  room.reconciliationApproved = false;

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
      if (!currentRoom) throw new Error(`Room ${roomId} missing at final round`);

      const roundStateRef = currentRoom.rounds[roundId];

      const winnerId = determineWinner(
        rankedResults,
        roundStateRef.submissions,
        activePlayers.length > 0 ? activePlayers : Object.values(currentRoom.players),
      );

      const winner = currentRoom.players[winnerId];

      emit(SERVER_EVENTS.WINNER_DECLARED, {
        winnerId,
        winnerName: winner?.name ?? 'Unknown',
        finalStandings: resultPayload,
        roomSnapshot: getRoomSnapshot(roomId),
      });

      const roomAfterWin = getRoom(roomId);
      const isWeb3Room = roomAfterWin?.paymentMode === 'web3';

      if (isWeb3Room) {
        await delay(5000);
        await waitForFinalizeWorkflowComplete(roomId);
      }
      // Web2: do NOT delay here — the client drives timing via the winner view.
      // PLAYERS_DISMISSED is sent after a long grace period as a safety net only.

      // ── Save stats to DB (fire-and-forget, non-fatal) ────────────────────
      const roomForStats = getRoom(roomId);
      if (roomForStats) {
        saveEliminationGameStats(roomForStats, winnerId).catch((err) =>
          console.error('[Elimination] saveEliminationGameStats unhandled error:', err.message)
        );
      }

      // ── Mark room as ended in memory ─────────────────────────────────────
      endRoom(roomId, winnerId);

      // ── Set reconciliation flags ──────────────────────────────────────────
      const roomForRec = getRoom(roomId);
      if (roomForRec) {
        roomForRec.pendingReconciliation = true;
        roomForRec.reconciliationApproved = false;
      }

      // ── PLAYERS_DISMISSED: safety-net only ───────────────────────────────
      // The client drives navigation — players leave via the winner/game_over
      // auto-close, and the host clicks "Start Reconciliation" manually.
      // This event fires after 10 minutes as a fallback for clients that are
      // still connected but somehow haven't navigated away on their own.
      // It does NOT fire immediately — do not reduce this delay.
      delay(10 * 60 * 1000).then(() => {
        const stillAlive = getRoom(roomId);
        if (stillAlive) {
          console.log(`[Elimination] Safety-net PLAYERS_DISMISSED firing for room ${roomId}`);
          emit(SERVER_EVENTS.PLAYERS_DISMISSED, {
            roomId,
            reason: 'game_complete',
            hostShouldReconcile: !!(roomForRec?.clubId),
          });
        }
      });

      // ── Wait for reconciliation (non-blocking — runs in background) ───────
      waitForReconciliationOrTimeout(roomId).catch((err) =>
        console.error('[Elimination] waitForReconciliationOrTimeout error:', err.message)
      );

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
