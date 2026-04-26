// server/quiz/gameplayEngines/hiddenObjectEngine.js
import { getQuizRoom, emitRoomState } from '../quizRoomManager.js';
import { HiddenObjectService } from './services/HiddenObjectService.js';
import { TimerService } from './services/TimerService.js';

const ROUND_TYPE = 'hidden_object';
const debug = true;

let timerService = null;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function normDifficulty(value) {
  const d = (value || 'easy').toString().trim().toLowerCase();

  if (d === 'medium') return 'medium';
  if (d === 'hard') return 'hard';
  return 'easy';
}

function pointInBox(x, y, box) {
  // box uses normalized coords: { x, y, w, h } between 0..1
  return (
    x >= box.x &&
    y >= box.y &&
    x <= box.x + box.w &&
    y <= box.y + box.h
  );
}

/**
 * Broadcast to the player room AND host/admin role rooms.
 */
function broadcastToRoomAndStaff(namespace, roomId, event, payload) {
  namespace
    .to(roomId)
    .to(`${roomId}:host`)
    .to(`${roomId}:admin`)
    .emit(event, payload);
}

// ════════════════════════════════════════════════════════════════════════════
// INIT ROUND
// ════════════════════════════════════════════════════════════════════════════

export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  if (!timerService) {
    timerService = new TimerService(namespace);
  }

  const roundIndex = (room.currentRound ?? 1) - 1;
  const rd = room.config?.roundDefinitions?.[roundIndex];

  /**
   * Hidden Object gameplay rule:
   * - Ignore category for gameplay and use all puzzles.
   * - Ignore round difficulty for item selection.
   * - Each puzzle sends all items from the puzzle JSON.
   * - Item difficulty is kept for scoring and UI colour coding.
   */
  const category = 'all';

  const hoConfig = rd?.config?.hiddenObject || {};

  const questionsPerRound = rd?.config?.questionsPerRound ?? 5;
  const timeLimitSeconds =
    hoConfig.timeLimitSeconds ??
    rd?.config?.totalTimeSeconds ??
    rd?.config?.timePerQuestion ??
    45;

  const pointsPerFindByDifficulty =
    hoConfig.pointsPerFindByDifficulty ||
    rd?.config?.pointsPerDifficulty ||
    {
      easy: 1,
      medium: 2,
      hard: 3,
    };

  const secondsToPoints = hoConfig.secondsToPoints ?? 1;

  const now = Date.now();

  room.currentPhase = 'asking';
  room.roundStartTime = now;
  room.currentQuestionIndex = 0;

  room.hiddenObject = {
    category,
    questionsPerRound,
    timeLimitSeconds,

    // Legacy-compatible values. Item target is now determined per puzzle.
    itemTarget: null,

    pointsPerFindByDifficulty,
    secondsToPoints,

    currentPuzzle: null,
    puzzleHistory: [],
    usedPuzzleIds: new Set(),

    // playerId -> { foundIds: Set<string>, finishTs?: number, puzzleScores: [] }
    player: {},
  };

  for (const p of room.players) {
    room.hiddenObject.player[p.id] = {
      foundIds: new Set(),
      finishTs: undefined,
      puzzleScores: [],
    };

    const pd = room.playerData[p.id];
    if (pd) {
      pd.roundStartScore = pd.score || 0;
    }
  }

  if (debug) {
    console.log('[hiddenObjectEngine] initRound:', {
      roomId,
      roundType: ROUND_TYPE,
      category,
      categoryRule: 'all',
      difficultyRule: 'ignored_for_item_selection',
      questionsPerRound,
      timeLimitSeconds,
      pointsPerFindByDifficulty,
      secondsToPoints,
    });
  }

  emitRoomState(namespace, roomId);

  loadNextQuestion(roomId, namespace);

  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// LOAD NEXT QUESTION / PUZZLE
// ════════════════════════════════════════════════════════════════════════════

function loadNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const ho = room.hiddenObject;
  if (!ho) return;

  if (room.currentQuestionIndex >= ho.questionsPerRound) {
    if (debug) {
      console.log('[hiddenObjectEngine] All puzzles completed, finalizing round');
    }

    finalizeRound(roomId, namespace);
    return;
  }

  let puzzle = null;
  let attempts = 0;
  const maxAttempts = 25;

  while (!puzzle && attempts < maxAttempts) {
    const candidate = HiddenObjectService.pickPuzzle(
      {
        category: 'all',
        difficulty: null,
      },
      debug
    );

    if (!candidate) break;

    const candidateId = String(candidate.id);

    if (!ho.usedPuzzleIds.has(candidateId)) {
      puzzle = candidate;
      ho.usedPuzzleIds.add(candidateId);
      break;
    }

    attempts++;

    if (debug) {
      console.log(
        `[hiddenObjectEngine] Puzzle ${candidateId} already used, retrying ` +
          `(attempt ${attempts}/${maxAttempts})...`
      );
    }
  }

  if (!puzzle) {
    console.warn('[hiddenObjectEngine] No unused hidden object puzzle found:', {
      roomId,
      requestedQuestions: ho.questionsPerRound,
      completedQuestions: room.currentQuestionIndex,
      usedPuzzleIds: Array.from(ho.usedPuzzleIds || []),
    });

    finalizeRound(roomId, namespace);
    return;
  }

  /**
   * Hidden Object gameplay rule:
   * Use ALL items from the selected image.
   * Do not filter by round difficulty.
   */
  const allItems = Array.isArray(puzzle.items) ? puzzle.items : [];

  const items = allItems
    .filter((item) => item && item.id != null && item.label && item.bbox)
    .map((item) => ({
      ...item,
      id: String(item.id),
      label: String(item.label),
      difficulty: normDifficulty(item.difficulty),
      bbox: item.bbox,
    }));

  if (debug) {
    console.log('[hiddenObjectEngine] Item selection:', {
      puzzleNumber: room.currentQuestionIndex + 1,
      puzzleId: puzzle.id,
      selectionRule: 'all_items',
      totalInPuzzle: allItems.length,
      selectedCount: items.length,
      itemTarget: items.length,
      itemIds: items.map((i) => `${i.id}:${i.difficulty}`),
    });
  }

  if (items.length === 0) {
    console.warn('[hiddenObjectEngine] Puzzle has no valid items, skipping:', {
      roomId,
      puzzleId: puzzle.id,
    });

    room.currentQuestionIndex++;
    loadNextQuestion(roomId, namespace);
    return;
  }

  const now = Date.now();

  room.puzzleStartTime = now;
  room.puzzleEndTime = now + ho.timeLimitSeconds * 1000;

  ho.currentPuzzle = {
    puzzleId: String(puzzle.id),
    imageUrl: puzzle.imageUrl,
    items,
    itemTarget: items.length,
    startTime: now,

    // Kept for compatibility with existing frontend/review payloads.
    // This is not a host-selected round difficulty.
    difficulty: 'mixed',
    category: 'all',
  };

  for (const playerId in ho.player) {
    ho.player[playerId].foundIds = new Set();
    ho.player[playerId].finishTs = undefined;
  }

  emitRoomState(namespace, roomId);

  broadcastToRoomAndStaff(namespace, roomId, 'hidden_object_start', {
    puzzleNumber: room.currentQuestionIndex + 1,
    totalPuzzles: ho.questionsPerRound,
    ...buildClientPuzzlePayload(ho.currentPuzzle, ho.timeLimitSeconds),
  });

  timerService.startQuestionTimer(roomId, ho.timeLimitSeconds, () => {
    finalizePuzzle(roomId, namespace);
  });

  if (room._hiddenObjectInterval) {
    clearInterval(room._hiddenObjectInterval);
  }

  room._hiddenObjectInterval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.floor(((room.puzzleEndTime || 0) - Date.now()) / 1000)
    );

    broadcastToRoomAndStaff(namespace, roomId, 'round_time_remaining', {
      remaining,
    });

    if (remaining <= 0) {
      clearInterval(room._hiddenObjectInterval);
      room._hiddenObjectInterval = null;
    }
  }, 1000);

  if (debug) {
    console.log('[hiddenObjectEngine] Loaded puzzle:', {
      roomId,
      puzzleNumber: room.currentQuestionIndex + 1,
      puzzleId: puzzle.id,
      itemCount: items.length,
      timeLimitSeconds: ho.timeLimitSeconds,
    });
  }
}

function buildClientPuzzlePayload(currentPuzzle, timeLimitSeconds) {
  return {
    puzzleId: currentPuzzle.puzzleId,
    imageUrl: currentPuzzle.imageUrl,

    // Kept for compatibility. UI should not display this as round difficulty.
    difficulty: currentPuzzle.difficulty,

    category: currentPuzzle.category,
    totalSeconds: timeLimitSeconds,
    itemTarget: currentPuzzle.itemTarget,

    items: currentPuzzle.items.map((it) => ({
      id: String(it.id),
      label: it.label,
      difficulty: normDifficulty(it.difficulty),
      bbox: it.bbox,
    })),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HANDLE FOUND / PLAYER CLICKS ITEM
// ════════════════════════════════════════════════════════════════════════════

export function handleFound(roomId, playerId, payload, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  const ho = room.hiddenObject;
  if (!ho?.currentPuzzle) return;

  if (Date.now() >= (room.puzzleEndTime || 0)) return;

  const state = ho.player?.[playerId];
  if (!state) return;

  if (state.finishTs) {
    return;
  }

  const itemId = payload?.itemId != null ? String(payload.itemId) : null;
  if (!itemId) return;

  const x = clamp(Number(payload?.x), 0, 1);
  const y = clamp(Number(payload?.y), 0, 1);

  const item = ho.currentPuzzle.items.find((it) => String(it.id) === itemId);
  if (!item?.bbox) return;

  if (!pointInBox(x, y, item.bbox)) return;

  if (state.foundIds.has(itemId)) return;

  state.foundIds.add(itemId);

  const foundCount = state.foundIds.size;
  const finished = foundCount >= ho.currentPuzzle.itemTarget;

  if (finished) {
    state.finishTs = Date.now();
  }

  const player = room.players.find((p) => p.id === playerId);
  if (player?.socketId) {
    const sock = namespace.sockets.get(player.socketId);

    if (sock) {
      sock.emit('hidden_object_found_confirm', {
        itemId,
        foundCount,
        itemTarget: ho.currentPuzzle.itemTarget,
        finished,
      });
    }
  }

  if (debug) {
    console.log('[hiddenObjectEngine] found:', {
      roomId,
      playerId,
      itemId,
      foundCount,
      finished,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FINALIZE PUZZLE
// ════════════════════════════════════════════════════════════════════════════

function finalizePuzzle(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  if (room._hiddenObjectInterval) {
    clearInterval(room._hiddenObjectInterval);
    room._hiddenObjectInterval = null;
  }

  if (timerService) {
    timerService.clearTimer(roomId);
  }

  const ho = room.hiddenObject;
  if (!ho?.currentPuzzle) return;

  const endTs = room.puzzleEndTime || Date.now();

  if (debug) {
    console.log('[hiddenObjectEngine] Finalizing puzzle:', {
      roomId,
      puzzleNumber: room.currentQuestionIndex + 1,
      puzzleId: ho.currentPuzzle.puzzleId,
    });
  }

  for (const p of room.players) {
    const pd = room.playerData[p.id];
    if (!pd) continue;

    const s = ho.player?.[p.id];
    if (!s) continue;

    const foundCount = s.foundIds?.size ?? 0;

    let base = 0;

    const pointsPerFindByDifficulty =
      ho.pointsPerFindByDifficulty || {
        easy: 1,
        medium: 2,
        hard: 3,
      };

    if (s.foundIds) {
      for (const itemId of s.foundIds) {
        const item = ho.currentPuzzle.items.find(
          (it) => String(it.id) === String(itemId)
        );

        if (item) {
          const itemDifficulty = normDifficulty(item.difficulty);
          const points = pointsPerFindByDifficulty[itemDifficulty] || 1;
          base += points;
        }
      }
    }

    let bonus = 0;

    if (s.finishTs) {
      const remainingSeconds = Math.max(
        0,
        Math.floor((endTs - s.finishTs) / 1000)
      );

      const secondsToPoints = ho.secondsToPoints ?? 1;
      bonus = remainingSeconds * secondsToPoints;
    }

    const totalDelta = base + bonus;
    pd.score = (pd.score || 0) + totalDelta;

    if (!Array.isArray(s.puzzleScores)) {
      s.puzzleScores = [];
    }

    s.puzzleScores.push({
      puzzleNumber: room.currentQuestionIndex + 1,
      puzzleId: ho.currentPuzzle.puzzleId,
      foundCount,
      itemTarget: ho.currentPuzzle.itemTarget,
      base,
      bonus,
      totalDelta,
    });

    if (debug) {
      console.log(`[hiddenObjectEngine] Scoring for ${p.name}:`, {
        puzzleNumber: room.currentQuestionIndex + 1,
        foundCount,
        itemTarget: ho.currentPuzzle.itemTarget,
        pointsBreakdown: `${base} base + ${bonus} time bonus`,
        totalDelta,
        newScore: pd.score,
      });
    }
  }

  ho.puzzleHistory.push({
    puzzleNumber: room.currentQuestionIndex + 1,
    puzzleId: ho.currentPuzzle.puzzleId,
    imageUrl: ho.currentPuzzle.imageUrl,
    difficulty: ho.currentPuzzle.difficulty,
    category: ho.currentPuzzle.category,
    items: ho.currentPuzzle.items,
    itemTarget: ho.currentPuzzle.itemTarget,
    completedAt: Date.now(),

    playerFoundItems: Object.fromEntries(
      Object.entries(ho.player).map(([playerId, state]) => [
        playerId,
        Array.from(state.foundIds || []),
      ])
    ),
  });

  room.currentQuestionIndex++;

  const isLastPuzzle = room.currentQuestionIndex >= ho.questionsPerRound;

  if (isLastPuzzle) {
    if (debug) {
      console.log('[hiddenObjectEngine] Last puzzle complete, finalizing round');
    }

    finalizeRound(roomId, namespace);
  } else {
    namespace.to(roomId).emit('hidden_object_transition', {
      message: `Puzzle ${room.currentQuestionIndex} complete! Next puzzle loading...`,
      completedPuzzle: room.currentQuestionIndex,
      totalPuzzles: ho.questionsPerRound,
    });

    emitRoomState(namespace, roomId);

    setTimeout(() => {
      loadNextQuestion(roomId, namespace);
    }, 2000);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// RECOVERY HELPERS
// ════════════════════════════════════════════════════════════════════════════

export function getCurrentReviewQuestion(roomId) {
  const room = getQuizRoom(roomId);
  if (!room?.reviewQuestions || room.currentReviewIndex < 0) return null;

  return room.reviewQuestions[room.currentReviewIndex] || null;
}

export function isReviewComplete(roomId) {
  const room = getQuizRoom(roomId);
  if (!room?.reviewQuestions) return true;

  return room.currentReviewIndex >= room.reviewQuestions.length - 1;
}

// ════════════════════════════════════════════════════════════════════════════
// FINALIZE ROUND / SETUP REVIEW
// ════════════════════════════════════════════════════════════════════════════

function finalizeRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const ho = room.hiddenObject;
  if (!ho) return;

  for (const p of room.players) {
    const pd = room.playerData[p.id];
    if (!pd) continue;

    const s = ho.player?.[p.id];

    if (!pd.roundMeta) {
      pd.roundMeta = {};
    }

    const totalItemsFound =
      s?.puzzleScores?.reduce((sum, ps) => sum + ps.foundCount, 0) || 0;

    const totalItemsAvailable =
      ho.puzzleHistory?.reduce(
        (sum, puzzle) => sum + (puzzle.itemTarget || puzzle.items?.length || 0),
        0
      ) || 0;

    pd.roundMeta[`round${room.currentRound}_hidden_object`] = {
      questionsPerRound: ho.questionsPerRound,
      puzzleScores: s?.puzzleScores || [],
      totalItemsFound,
      totalItemsAvailable,
    };
  }

  room.currentPhase = 'reviewing';

  room.reviewQuestions = ho.puzzleHistory.map((puzzle, idx) => ({
    puzzleId: puzzle.puzzleId,
    puzzleNumber: idx + 1,
    totalPuzzles: ho.puzzleHistory.length,
    imageUrl: puzzle.imageUrl,

    // Kept for compatibility. UI should not present this as host difficulty.
    difficulty: puzzle.difficulty,

    category: puzzle.category,
    items: puzzle.items,
    itemTarget: puzzle.itemTarget || puzzle.items?.length || 0,
    totalSeconds: ho.timeLimitSeconds,
  }));

  room.currentReviewIndex = 0;
  room.lastEmittedReviewIndex = -1;

  console.log('[hiddenObjectEngine] 🔍 BEFORE emitRoomState:', {
    currentReviewIndex: room.currentReviewIndex,
    totalReviewQuestions: room.reviewQuestions.length,
    currentPhase: room.currentPhase,
  });

  emitRoomState(namespace, roomId);

  if (room.reviewQuestions.length > 0) {
    const firstPuzzle = room.reviewQuestions[0];
    const firstPuzzleHistory = ho.puzzleHistory[0];

    console.log('[hiddenObjectEngine] 📤 Emitting first review:', {
      puzzleNumber: 1,
      totalPuzzles: room.reviewQuestions.length,
      puzzleId: firstPuzzle.puzzleId,
    });

    for (const player of room.players) {
      const playerSocket = namespace.sockets.get(player.socketId);

      if (playerSocket) {
        const playerFoundIds =
          firstPuzzleHistory.playerFoundItems?.[player.id] || [];

        playerSocket.emit('hidden_object_review', {
          puzzle: firstPuzzle,
          puzzleNumber: 1,
          totalPuzzles: room.reviewQuestions.length,
          foundIds: playerFoundIds,
        });
      }
    }

    namespace.to(`${roomId}:host`).to(`${roomId}:admin`).emit(
      'hidden_object_review',
      {
        puzzle: firstPuzzle,
        puzzleNumber: 1,
        totalPuzzles: room.reviewQuestions.length,
        puzzles: ho.puzzleHistory,
      }
    );

    room.lastEmittedReviewIndex = 0;
  }

  if (debug) {
    console.log('[hiddenObjectEngine] Round finalized:', {
      roomId,
      roundNumber: room.currentRound,
      totalPuzzles: ho.questionsPerRound,
      puzzlesCompleted: ho.puzzleHistory.length,
      reviewQuestionsSetup: room.reviewQuestions.length,
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════
// REVIEW NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

export function emitNextReviewQuestion(roomId, namespace) {
  console.log('[hiddenObjectEngine] 🔔 emitNextReviewQuestion CALLED:', {
    roomId,
  });

  const room = getQuizRoom(roomId);

  console.log('🔵 [HO_ENGINE] emitNextReviewQuestion called:', {
    hasReviewQuestions: !!room?.reviewQuestions,
    currentReviewIndex: room?.currentReviewIndex,
    totalReviews: room?.reviewQuestions?.length,
    timestamp: Date.now(),
  });

  if (!room?.reviewQuestions) {
    console.log('[hiddenObjectEngine] ❌ No reviewQuestions found');

    broadcastToRoomAndStaff(namespace, roomId, 'review_complete', {
      message: 'Hidden Object round complete — ready for results.',
      roundNumber: room?.currentRound || 1,
      totalQuestions: 0,
    });

    return;
  }

  room.currentReviewIndex++;

  if (debug) {
    console.log('[hiddenObjectEngine] 📍 Review navigation:', {
      currentReviewIndex: room.currentReviewIndex,
      totalReviews: room.reviewQuestions.length,
      isComplete: room.currentReviewIndex >= room.reviewQuestions.length,
    });
  }

  if (room.currentReviewIndex >= room.reviewQuestions.length) {
    console.log('🔵 [HO_ENGINE] Reviews complete, emitting review_complete');

    broadcastToRoomAndStaff(namespace, roomId, 'review_complete', {
      message: 'Hidden Object round complete — ready for results.',
      roundNumber: room.currentRound,
      totalQuestions: room.reviewQuestions.length,
    });

    if (debug) {
      console.log('[hiddenObjectEngine] ✅ All reviews complete');
    }

    return;
  }

  const puzzle = room.reviewQuestions[room.currentReviewIndex];
  const puzzleHistory = room.hiddenObject?.puzzleHistory?.[room.currentReviewIndex];

  for (const player of room.players) {
    const playerSocket = namespace.sockets.get(player.socketId);

    if (playerSocket) {
      const playerFoundIds = puzzleHistory?.playerFoundItems?.[player.id] || [];

      playerSocket.emit('hidden_object_review', {
        puzzle,
        puzzleNumber: room.currentReviewIndex + 1,
        totalPuzzles: room.reviewQuestions.length,
        foundIds: playerFoundIds,
      });
    }
  }

  namespace.to(`${roomId}:host`).to(`${roomId}:admin`).emit(
    'hidden_object_review',
    {
      puzzle,
      puzzleNumber: room.currentReviewIndex + 1,
      totalPuzzles: room.reviewQuestions.length,
      puzzles: room.hiddenObject?.puzzleHistory || [],
    }
  );

  room.lastEmittedReviewIndex = room.currentReviewIndex;

  emitRoomState(namespace, roomId);

  if (debug) {
    console.log('[hiddenObjectEngine] Emitted review:', {
      roomId,
      reviewIndex: room.currentReviewIndex,
      puzzleNumber: room.currentReviewIndex + 1,
      totalPuzzles: room.reviewQuestions.length,
    });
  }
}