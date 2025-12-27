// server/quiz/gameplayEngines/hiddenObjectEngine.js
import { getQuizRoom, emitRoomState } from '../quizRoomManager.js';
import { HiddenObjectService } from './services/HiddenObjectService.js';

const ROUND_TYPE = 'hidden_object';
const debug = true;

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
 * This prevents "host sees nothing" when host UI is only in `${roomId}:host`.
 */
function broadcastToRoomAndStaff(namespace, roomId, event, payload) {
  namespace
    .to(roomId)
    .to(`${roomId}:host`)
    .to(`${roomId}:admin`)
    .emit(event, payload);
}

export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const roundIndex = (room.currentRound ?? 1) - 1;
  const rd = room.config?.roundDefinitions?.[roundIndex];
  const difficulty = (rd?.difficulty || 'easy').toLowerCase();
  const category = rd?.category || 'image';

  const totalSeconds = rd?.config?.totalTimeSeconds ?? 45; // you can tune this
  const itemTarget = ITEMS_BY_DIFFICULTY[difficulty] ?? 6;

  const puzzle = HiddenObjectService.pickPuzzle({ category, difficulty }, true);
  if (!puzzle) {
    console.warn('[hiddenObjectEngine] No puzzle found');
    return false;
  }

  const allItems = Array.isArray(puzzle.items) ? puzzle.items : [];
  const items = allItems.slice(0, Math.min(itemTarget, allItems.length));

  const now = Date.now();
  room.currentPhase = 'asking';
  room.roundStartTime = now;
  room.roundEndTime = now + totalSeconds * 1000;

  // store hidden object state in room
  room.hiddenObject = {
    puzzleId: String(puzzle.id),
    imageUrl: puzzle.imageUrl, // absolute-ish like "/quiz/hidden-object/3000.jpg"
    difficulty,
    category,
    totalSeconds,
    itemTarget: items.length,
    items, // include bbox for server validation
    player: {}, // playerId -> { foundIds: Set<string>, finishTs?: number }
  };

  // init players
  for (const p of room.players) {
    room.hiddenObject.player[p.id] = {
      foundIds: new Set(),
      finishTs: undefined,
    };
    // capture roundStartScore for round leaderboard calc (hostHandlers uses this pattern)
    const pd = room.playerData[p.id];
    if (pd) pd.roundStartScore = pd.score || 0;
  }

  emitRoomState(namespace, roomId);

  // ✅ emit start payload to players + host/admin
  broadcastToRoomAndStaff(
    namespace,
    roomId,
    'hidden_object_start',
    buildClientPuzzlePayload(room.hiddenObject)
  );

  // countdown interval (reuse your existing pattern)
  room._hiddenObjectInterval && clearInterval(room._hiddenObjectInterval);
  room._hiddenObjectInterval = setInterval(() => {
    const remaining = Math.max(
      0,
      Math.floor(((room.roundEndTime || 0) - Date.now()) / 1000)
    );

    // ✅ timer ticks to players + host/admin
    broadcastToRoomAndStaff(namespace, roomId, 'round_time_remaining', { remaining });

    if (remaining <= 0) {
      clearInterval(room._hiddenObjectInterval);
      room._hiddenObjectInterval = null;
      finalizeHiddenObjectRound(roomId, namespace);
    }
  }, 1000);

  if (debug) {
    console.log('[hiddenObjectEngine] initRound', {
      roomId,
      puzzleId: puzzle.id,
      difficulty,
      itemTarget: items.length,
      totalSeconds,
      imageUrl: room.hiddenObject?.imageUrl,
      itemTarget2: room.hiddenObject?.itemTarget,
    });
  }

  return true;
}

function buildClientPuzzlePayload(hiddenObject) {
  return {
    puzzleId: hiddenObject.puzzleId,
    imageUrl: hiddenObject.imageUrl,
    difficulty: hiddenObject.difficulty,
    category: hiddenObject.category,
    totalSeconds: hiddenObject.totalSeconds,
    itemTarget: hiddenObject.itemTarget,
    items: hiddenObject.items.map((it) => ({
      id: String(it.id),
      label: it.label,
      bbox: it.bbox, // normalized
    })),
  };
}

export function handleFound(roomId, playerId, payload, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  const ho = room.hiddenObject;
  if (!ho) return;

  // round closed?
  if (Date.now() >= (room.roundEndTime || 0)) return;

  const state = ho.player?.[playerId];
  if (!state) return;

  if (state.finishTs) {
    // already completed - ignore extra finds
    return;
  }

  const itemId = payload?.itemId != null ? String(payload.itemId) : null;
  if (!itemId) return;

  const x = clamp(Number(payload?.x), 0, 1);
  const y = clamp(Number(payload?.y), 0, 1);

  const item = ho.items.find((it) => String(it.id) === itemId);
  if (!item?.bbox) return;

  // validate click is inside bbox
  if (!pointInBox(x, y, item.bbox)) return;

  if (state.foundIds.has(itemId)) return;

  state.foundIds.add(itemId);

  const foundCount = state.foundIds.size;
  const finished = foundCount >= ho.itemTarget;

  // if finished, lock finishTs now
  if (finished) {
    state.finishTs = Date.now();
  }

  // notify the player (only)
  const player = room.players.find((p) => p.id === playerId);
  if (player?.socketId) {
    const sock = namespace.sockets.get(player.socketId);
    if (sock) {
      sock.emit('hidden_object_found_confirm', {
        itemId,
        foundCount,
        itemTarget: ho.itemTarget,
        finished,
      });
    }
  }

  if (debug)
    console.log('[hiddenObjectEngine] found', {
      roomId,
      playerId,
      itemId,
      foundCount,
      finished,
    });
}

function finalizeHiddenObjectRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  const ho = room.hiddenObject;
  if (!ho) return;

  const endTs = room.roundEndTime || Date.now();

  for (const p of room.players) {
    const pd = room.playerData[p.id];
    if (!pd) continue;

    const s = ho.player?.[p.id];
    const foundCount = s?.foundIds?.size ?? 0;

    // base points: 1 per item
    const base = foundCount;

    // time bonus only if finished
    let bonus = 0;
    if (s?.finishTs) {
      bonus = Math.max(0, Math.floor((endTs - s.finishTs) / 1000));
    }

    const totalDelta = base + bonus;
    pd.score = (pd.score || 0) + totalDelta;

    if (!pd.roundMeta) pd.roundMeta = {};
    pd.roundMeta[`round${room.currentRound}_hidden_object`] = {
      foundCount,
      itemTarget: ho.itemTarget,
      base,
      bonus,
      totalDelta,
    };
  }

  // move to reviewing phase (so HostControls flow stays consistent)
  room.currentPhase = 'reviewing';
  room.currentReviewIndex = 0;
  room.lastEmittedReviewIndex = -1;

  emitRoomState(namespace, roomId);

  // ✅ NEW: give host/admin a clean review payload too (host UI expects this event)
  broadcastToRoomAndStaff(namespace, roomId, 'hidden_object_review', {
    puzzle: buildClientPuzzlePayload(ho),
  });

  // there is nothing to review — tell clients review is complete
  broadcastToRoomAndStaff(namespace, roomId, 'review_complete', {
    message: 'Hidden Object round complete — ready for results.',
    roundNumber: room.currentRound,
    totalQuestions: 0,
  });

  if (debug) console.log('[hiddenObjectEngine] finalize -> reviewing', { roomId });
}

// review helpers so recoveryHandlers can call engine.getCurrentReviewQuestion/isReviewComplete safely
export function getCurrentReviewQuestion(_roomId) {
  return null;
}
export function isReviewComplete(_roomId) {
  return true;
}
export function emitNextReviewQuestion(roomId, namespace) {
  // ✅ keep consistent: players + host/admin
  broadcastToRoomAndStaff(namespace, roomId, 'review_complete', {
    message: 'Hidden Object round complete — ready for results.',
    roundNumber: getQuizRoom(roomId)?.currentRound || 1,
    totalQuestions: 0,
  });
}

