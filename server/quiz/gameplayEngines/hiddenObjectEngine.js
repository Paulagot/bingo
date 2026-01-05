// server/quiz/gameplayEngines/hiddenObjectEngine.js
import { getQuizRoom, emitRoomState } from '../quizRoomManager.js';
import { HiddenObjectService } from './services/HiddenObjectService.js';
import { TimerService } from './services/TimerService.js';

const ROUND_TYPE = 'hidden_object';
const debug = true;

let timerService = null;

// ✅ Fallback values if config is missing
const ITEMS_BY_DIFFICULTY = {
  easy: 6,
  medium: 8,
  hard: 10,
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pointInBox(x, y, box) {
  // box uses normalized coords: { x, y, w, h } between 0..1
  return x >= box.x && y >= box.y && x <= box.x + box.w && y <= box.y + box.h;
}

/**
 * ✅ Helper: broadcast to the player room AND host/admin role rooms
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

  // ✅ Initialize TimerService if not already created
  if (!timerService) {
    timerService = new TimerService(namespace);
  }

  const roundIndex = (room.currentRound ?? 1) - 1;
  const rd = room.config?.roundDefinitions?.[roundIndex];
  const difficulty = (rd?.difficulty || 'easy').toLowerCase();
  const category = rd?.category || 'image';

  // ✅ READ FROM hiddenObject CONFIG
  const hoConfig = rd?.config?.hiddenObject || {};
  const questionsPerRound = rd?.config?.questionsPerRound ?? 2;
  
  const timeLimitSeconds = hoConfig.timeLimitSeconds ?? 45;
  
  // ✅ USE CONFIG OR FALLBACK
  const itemTarget = hoConfig.itemCountByDifficulty?.[difficulty] ?? ITEMS_BY_DIFFICULTY[difficulty] ?? `0`;
  
  // ✅ GET SCORING CONFIG
  const pointsPerFindByDifficulty = hoConfig.pointsPerFindByDifficulty || { easy: 1, medium: 2, hard: 3 };
  const secondsToPoints = hoConfig.secondsToPoints ?? 1;

  const now = Date.now();
  room.currentPhase = 'asking';
  room.roundStartTime = now;
  room.currentQuestionIndex = 0; // ✅ Track puzzle progress

  // ✅ Store hidden object round state
  room.hiddenObject = {
    difficulty,
    category,
    questionsPerRound,
    timeLimitSeconds,
    itemTarget,
    pointsPerFindByDifficulty,
    secondsToPoints,
    currentPuzzle: null, // Will be set by loadNextQuestion
    puzzleHistory: [], // Track completed puzzles
    usedPuzzleIds: new Set(), // ✅ NEW: Track used puzzles to prevent duplicates
    player: {}, // playerId -> { foundIds: Set<string>, finishTs?: number, puzzleScores: [] }
  };

  // ✅ Initialize player state
  for (const p of room.players) {
    room.hiddenObject.player[p.id] = {
      foundIds: new Set(),
      finishTs: undefined,
      puzzleScores: [], // Track score per puzzle
    };
    
    // Capture roundStartScore for round leaderboard calc
    const pd = room.playerData[p.id];
    if (pd) pd.roundStartScore = pd.score || 0;
  }

  if (debug) {
    console.log('[hiddenObjectEngine] initRound:', {
      roomId,
      difficulty,
      category,
      questionsPerRound,
      timeLimitSeconds,
      itemTarget,
      pointsPerFindByDifficulty,
      secondsToPoints,
    });
  }

  emitRoomState(namespace, roomId);

  // ✅ Load first puzzle
  loadNextQuestion(roomId, namespace);

  return true;
}

// ════════════════════════════════════════════════════════════════════════════
// LOAD NEXT QUESTION (PUZZLE)
// ════════════════════════════════════════════════════════════════════════════

function loadNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const ho = room.hiddenObject;
  if (!ho) return;

  // ✅ Check if all puzzles completed
  if (room.currentQuestionIndex >= ho.questionsPerRound) {
    if (debug) console.log('[hiddenObjectEngine] All puzzles completed, finalizing round');
    finalizeRound(roomId, namespace);
    return;
  }

  // ✅ Pick a new random puzzle (with retry logic to avoid duplicates)
  let puzzle = null;
  let attempts = 0;
  const maxAttempts = 10;

  while (!puzzle && attempts < maxAttempts) {
    const candidate = HiddenObjectService.pickPuzzle(
      { category: ho.category, difficulty: ho.difficulty },
      debug
    );

    if (!candidate) break;

    // ✅ Check if we've already used this puzzle
    if (!ho.usedPuzzleIds.has(candidate.id)) {
      puzzle = candidate;
      ho.usedPuzzleIds.add(candidate.id); // ✅ Mark as used
      break;
    }

    attempts++;
    if (debug) console.log(`[hiddenObjectEngine] Puzzle ${candidate.id} already used, retrying (attempt ${attempts}/${maxAttempts})...`);
  }

  if (!puzzle) {
    console.warn('[hiddenObjectEngine] No unused puzzle found for category:', ho.category);
    finalizeRound(roomId, namespace);
    return;
  }

  // ✅ Filter items by difficulty (same logic as before)
  const allItems = Array.isArray(puzzle.items) ? puzzle.items : [];
  let itemPool = [];

  if (ho.difficulty === 'easy') {
    itemPool = allItems.filter(item => 
      (item.difficulty || 'easy').toLowerCase() === 'easy'
    );
  } else if (ho.difficulty === 'medium') {
    const easyItems = allItems.filter(item => 
      (item.difficulty || 'easy').toLowerCase() === 'easy'
    );
    const mediumItems = allItems.filter(item => 
      (item.difficulty || '').toLowerCase() === 'medium'
    );
    itemPool = [...easyItems, ...mediumItems];
  } else if (ho.difficulty === 'hard') {
    itemPool = allItems;
  }

  // Take up to itemTarget items
  const items = itemPool.slice(0, Math.min(ho.itemTarget, itemPool.length));

  if (debug) {
    console.log('[hiddenObjectEngine] Item selection:', {
      puzzleNumber: room.currentQuestionIndex + 1,
      puzzleId: puzzle.id,
      difficulty: ho.difficulty,
      itemTarget: ho.itemTarget,
      totalInPuzzle: allItems.length,
      poolSize: itemPool.length,
      selectedCount: items.length,
      itemIds: items.map(i => `${i.id}:${i.difficulty || 'easy'}`)
    });
  }

  // ✅ Validate we have enough items
  if (items.length === 0) {
    console.warn('[hiddenObjectEngine] No items available, skipping puzzle');
    room.currentQuestionIndex++;
    loadNextQuestion(roomId, namespace);
    return;
  }

  if (items.length < ho.itemTarget) {
    console.warn(
      `[hiddenObjectEngine] Puzzle ${puzzle.id} only has ${items.length} items for ${ho.difficulty} difficulty, ` +
      `but config requires ${ho.itemTarget}. Using all available items.`
    );
  }

  const now = Date.now();
  room.puzzleStartTime = now;
  room.puzzleEndTime = now + ho.timeLimitSeconds * 1000;

  // ✅ Store current puzzle state
  ho.currentPuzzle = {
    puzzleId: String(puzzle.id),
    imageUrl: puzzle.imageUrl,
    items,
    itemTarget: items.length,
    startTime: now,
    difficulty: ho.difficulty,
    category: ho.category,
  };

  // ✅ Reset player state for this puzzle
  for (const playerId in ho.player) {
    ho.player[playerId].foundIds = new Set();
    ho.player[playerId].finishTs = undefined;
  }

  emitRoomState(namespace, roomId);

  // ✅ Emit puzzle to players + host/admin
  broadcastToRoomAndStaff(
    namespace,
    roomId,
    'hidden_object_start',
    {
      puzzleNumber: room.currentQuestionIndex + 1,
      totalPuzzles: ho.questionsPerRound,
      ...buildClientPuzzlePayload(ho.currentPuzzle, ho.timeLimitSeconds)
    }
  );

  // ✅ Start countdown timer using TimerService (provides 3-2-1 countdown effects)
  timerService.startQuestionTimer(roomId, ho.timeLimitSeconds, () => {
    // Timer expired - finalize the puzzle
    finalizePuzzle(roomId, namespace);
  });

  // ✅ Also emit round_time_remaining updates for the timer UI
  room._hiddenObjectInterval && clearInterval(room._hiddenObjectInterval);
  room._hiddenObjectInterval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.floor(((room.puzzleEndTime || 0) - Date.now()) / 1000)
    );

    broadcastToRoomAndStaff(namespace, roomId, 'round_time_remaining', { remaining });

    // Clean up when timer expires (TimerService handles the actual expiration)
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
    difficulty: currentPuzzle.difficulty,
    category: currentPuzzle.category,
    totalSeconds: timeLimitSeconds,
    itemTarget: currentPuzzle.itemTarget,
    items: currentPuzzle.items.map((it) => ({
      id: String(it.id),
      label: it.label,
      bbox: it.bbox,
    })),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HANDLE FOUND (PLAYER CLICKS ITEM)
// ════════════════════════════════════════════════════════════════════════════

export function handleFound(roomId, playerId, payload, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  const ho = room.hiddenObject;
  if (!ho?.currentPuzzle) return;

  // Check if time expired
  if (Date.now() >= (room.puzzleEndTime || 0)) return;

  const state = ho.player?.[playerId];
  if (!state) return;

  if (state.finishTs) {
    // Player already completed this puzzle - ignore extra finds
    return;
  }

  const itemId = payload?.itemId != null ? String(payload.itemId) : null;
  if (!itemId) return;

  const x = clamp(Number(payload?.x), 0, 1);
  const y = clamp(Number(payload?.y), 0, 1);

  const item = ho.currentPuzzle.items.find((it) => String(it.id) === itemId);
  if (!item?.bbox) return;

  // Validate click is inside bbox
  if (!pointInBox(x, y, item.bbox)) return;

  if (state.foundIds.has(itemId)) return;

  state.foundIds.add(itemId);

  const foundCount = state.foundIds.size;
  const finished = foundCount >= ho.currentPuzzle.itemTarget;

  // If finished, lock finishTs now
  if (finished) {
    state.finishTs = Date.now();
  }

  // Notify the player
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
// FINALIZE PUZZLE (ONE PUZZLE COMPLETE)
// ════════════════════════════════════════════════════════════════════════════

function finalizePuzzle(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return; // ✅ Stay in 'asking' phase

  // ✅ Clear timers
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

  // ✅ Score each player for this puzzle
  for (const p of room.players) {
    const pd = room.playerData[p.id];
    if (!pd) continue;

    const s = ho.player?.[p.id];
    const foundCount = s?.foundIds?.size ?? 0;

    // Calculate points: sum based on each item's difficulty
    let base = 0;
    const pointsPerFindByDifficulty = ho.pointsPerFindByDifficulty || { easy: 1, medium: 2, hard: 3 };
    
    if (s?.foundIds) {
      for (const itemId of s.foundIds) {
        const item = ho.currentPuzzle.items.find(it => String(it.id) === String(itemId));
        if (item) {
          const itemDifficulty = (item.difficulty || 'easy').toLowerCase();
          const points = pointsPerFindByDifficulty[itemDifficulty] || 1;
          base += points;
        }
      }
    }

    // Time bonus
    let bonus = 0;
    if (s?.finishTs) {
      const remainingSeconds = Math.max(0, Math.floor((endTs - s.finishTs) / 1000));
      const secondsToPoints = ho.secondsToPoints ?? 1;
      bonus = remainingSeconds * secondsToPoints;
    }

    const totalDelta = base + bonus;
    pd.score = (pd.score || 0) + totalDelta;

    // Store puzzle score in player state
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
        newScore: pd.score
      });
    }
  }

  // ✅ Store completed puzzle in history
ho.puzzleHistory.push({
  puzzleNumber: room.currentQuestionIndex + 1,
  puzzleId: ho.currentPuzzle.puzzleId,
  imageUrl: ho.currentPuzzle.imageUrl,
  difficulty: ho.currentPuzzle.difficulty,
  category: ho.currentPuzzle.category,
  items: ho.currentPuzzle.items,
  completedAt: Date.now(),
  // ✅ ADD THIS: Store what each player found for this puzzle
  playerFoundItems: Object.fromEntries(
    Object.entries(ho.player).map(([playerId, state]) => [
      playerId,
      Array.from(state.foundIds || [])
    ])
  ),
});

  // ✅ Move to next puzzle
  room.currentQuestionIndex++;
  
  // ✅ Check if this was the last puzzle
  const isLastPuzzle = room.currentQuestionIndex >= ho.questionsPerRound;
  
  if (isLastPuzzle) {
    // ✅ Last puzzle complete - move to finalizeRound which handles review
    if (debug) console.log('[hiddenObjectEngine] Last puzzle complete, finalizing round');
    finalizeRound(roomId, namespace);
  } else {
    // ✅ More puzzles to go - show brief transition message to players
    namespace.to(roomId).emit('hidden_object_transition', {
      message: `Puzzle ${room.currentQuestionIndex} complete! Next puzzle loading...`,
      completedPuzzle: room.currentQuestionIndex,
      totalPuzzles: ho.questionsPerRound,
    });
    
    emitRoomState(namespace, roomId);

    // ✅ Brief pause before next puzzle
    setTimeout(() => {
      loadNextQuestion(roomId, namespace);
    }, 2000);
  }
}


// ════════════════════════════════════════════════════════════════════════════
// RECOVERY HELPERS (for recoveryHandlers)
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

function finalizeRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const ho = room.hiddenObject;
  if (!ho) return;

  // ✅ Store round metadata for each player
  for (const p of room.players) {
    const pd = room.playerData[p.id];
    if (!pd) continue;

    const s = ho.player?.[p.id];
    
    if (!pd.roundMeta) pd.roundMeta = {};
    pd.roundMeta[`round${room.currentRound}_hidden_object`] = {
      questionsPerRound: ho.questionsPerRound,
      puzzleScores: s?.puzzleScores || [],
      totalItemsFound: s?.puzzleScores?.reduce((sum, ps) => sum + ps.foundCount, 0) || 0,
      totalItemsAvailable: ho.questionsPerRound * ho.itemTarget,
    };
  }

  // ✅ Move to reviewing phase
  room.currentPhase = 'reviewing';
  
  // ✅ CRITICAL FIX: Set up reviewQuestions array with ALL puzzles
  room.reviewQuestions = ho.puzzleHistory.map((puzzle, idx) => ({
    puzzleId: puzzle.puzzleId,
    puzzleNumber: idx + 1,
    totalPuzzles: ho.questionsPerRound,
    imageUrl: puzzle.imageUrl,
    difficulty: puzzle.difficulty,
    category: puzzle.category,
    items: puzzle.items,
    itemTarget: ho.itemTarget,
    totalSeconds: ho.timeLimitSeconds,
  }));
  
  // ✅ Start at first review question
  room.currentReviewIndex = 0;
  room.lastEmittedReviewIndex = -1;

  // ✅ DEBUG: Log what we're about to send
  console.log('[hiddenObjectEngine] 🔍 BEFORE emitRoomState:', {
    currentReviewIndex: room.currentReviewIndex,
    totalReviewQuestions: room.reviewQuestions.length,
    currentPhase: room.currentPhase,
  });

  emitRoomState(namespace, roomId);

  // ✅ Send the FIRST puzzle for review
  if (room.reviewQuestions.length > 0) {
    const firstPuzzle = room.reviewQuestions[0];
    const firstPuzzleHistory = ho.puzzleHistory[0];
    
    console.log('[hiddenObjectEngine] 📤 Emitting first review:', {
      puzzleNumber: 1,
      totalPuzzles: ho.questionsPerRound,
      puzzleId: firstPuzzle.puzzleId,
    });
    
    // ✅ NEW: Send to each player with their specific foundIds
    for (const player of room.players) {
      const playerSocket = namespace.sockets.get(player.socketId);
      if (playerSocket) {
        const playerFoundIds = firstPuzzleHistory.playerFoundItems?.[player.id] || [];
        playerSocket.emit('hidden_object_review', {
          puzzle: firstPuzzle,
          puzzleNumber: 1,
          totalPuzzles: ho.questionsPerRound,
          foundIds: playerFoundIds,  // ✅ Player-specific data
        });
      }
    }
    
    // ✅ Also send to host/admin (they see all items)
    namespace.to(`${roomId}:host`).to(`${roomId}:admin`).emit('hidden_object_review', {
      puzzle: firstPuzzle,
      puzzleNumber: 1,
      totalPuzzles: ho.questionsPerRound,
      puzzles: ho.puzzleHistory,
    });
    
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
export function emitNextReviewQuestion(roomId, namespace) {
  console.log('[hiddenObjectEngine] 🔔 emitNextReviewQuestion CALLED:', { roomId }); // ✅ Debug log
  
  const room = getQuizRoom(roomId);
    console.log('🔵 [HO_ENGINE] emitNextReviewQuestion called:', {
    hasReviewQuestions: !!room?.reviewQuestions,
    currentReviewIndex: room?.currentReviewIndex,
    totalReviews: room?.reviewQuestions?.length,
    timestamp: Date.now()
  });
  if (!room?.reviewQuestions) {
    console.log('[hiddenObjectEngine] ❌ No reviewQuestions found'); // ✅ Debug log
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
    // ✅ All reviews done - emit review_complete
    broadcastToRoomAndStaff(namespace, roomId, 'review_complete', {
      message: 'Hidden Object round complete — ready for results.',
      roundNumber: room.currentRound,
      totalQuestions: room.reviewQuestions.length,
    });
    
    if (debug) {
      console.log('[hiddenObjectEngine] ✅ All reviews complete');
      console.log('🔵 [HO_ENGINE] After review_complete, calling emitRoomState?');
    }
    
    return;
  }

  // ✅ Emit next review puzzle
  const puzzle = room.reviewQuestions[room.currentReviewIndex];
  const puzzleHistory = room.hiddenObject?.puzzleHistory[room.currentReviewIndex];
  
  // ✅ Send to each player with their specific foundIds
  for (const player of room.players) {
    const playerSocket = namespace.sockets.get(player.socketId);
    if (playerSocket) {
      const playerFoundIds = puzzleHistory?.playerFoundItems?.[player.id] || [];
      playerSocket.emit('hidden_object_review', {
        puzzle,
        puzzleNumber: room.currentReviewIndex + 1,
        totalPuzzles: room.reviewQuestions.length,
        foundIds: playerFoundIds,  // ✅ Player-specific data
      });
    }
  }
  
  // Also send to host/admin (they see all items)
  namespace.to(`${roomId}:host`).to(`${roomId}:admin`).emit('hidden_object_review', {
    puzzle,
    puzzleNumber: room.currentReviewIndex + 1,
    totalPuzzles: room.reviewQuestions.length,
    puzzles: room.hiddenObject?.puzzleHistory || [],
  });

  room.lastEmittedReviewIndex = room.currentReviewIndex;
  
  // ✅ UPDATE room state so frontend knows where we are
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