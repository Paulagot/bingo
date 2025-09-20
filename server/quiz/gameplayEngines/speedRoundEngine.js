// server/quiz/gameplayEngines/speedRoundEngine.js
// Speed Round: 90s global timer, per-player rapid progression, two options per question.
// Uses true_false.json via QuestionService source override.

import {
  getQuizRoom,
  setQuestionsForCurrentRound,
  emitRoomState,
} from '../quizRoomManager.js';

import { QuestionService } from './services/QuestionService.js';
import { StatsService } from './services/StatsService.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { ReviewService } from './services/ReviewService.js';
import { SimplifiedScoringService } from './services/SimplifiedScoringService.js';

const ROUND_TYPE = 'speed_round';
const debug = true;

/* ---------------------------- Init round ---------------------------- */
export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  // ✅ Get Q/A filters & count from QuestionService (source of truth)
  const roundIndex = (room.currentRound ?? 1) - 1;
  const { questionsPerRound, category, difficulty } =
    QuestionService.getRoundQuestionConfig(room, roundIndex);

  // 🔁 Also grab the raw roundDef so we can read timer/flags
  const rd = room.config?.roundDefinitions?.[roundIndex];

  // Select from true_false.json with global de-dupe
  const questions = QuestionService.loadAndFilterQuestions(
    roomId,
    ROUND_TYPE,
    category,
    difficulty,
    questionsPerRound,
    true,
    'true_false'
  );

  if (!questions.length) {
    console.warn(`[speedRound] ❌ No questions available`);
    return false;
  }

  // Ensure we stage exactly questionsPerRound
  const staged = questions.slice(0, questionsPerRound);
  setQuestionsForCurrentRound(roomId, staged);

  // Initialize player cursors and round tracking
  room.playerCursors = {};
  room.players.forEach(p => {
    room.playerCursors[p.id] = 0;
    SimplifiedScoringService.initializeRoundTracking(room, p.id);
  });

  // ✅ Use per-round total time (fallback to 90s)
  const totalSeconds = rd?.config?.totalTimeSeconds ?? 90;
  const now = Date.now();
  room.roundStartTime = now;
  room.roundEndTime = now + totalSeconds * 1000;

  room.currentPhase = 'asking';
  StatsService.calculateLiveRoundStats(roomId, namespace);
  emitRoomState(namespace, roomId);

  // Emit ticks
  room._speedRoundInterval && clearInterval(room._speedRoundInterval);
  room._speedRoundInterval = setInterval(() => {
    const remaining = Math.max(0, Math.floor((room.roundEndTime - Date.now()) / 1000));
    namespace.to(roomId).emit('round_time_remaining', { remaining });
    if (remaining <= 0) {
      clearInterval(room._speedRoundInterval);
      finalizeSpeedRound(roomId, namespace);
    }
  }, 1000);

  // First question per player
  room.players.forEach(p => emitNextQuestionToPlayer(roomId, p.id, namespace));

  return true;
}


/* ------------------------ Per-player progression ------------------- */
export function emitNextQuestionToPlayer(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  const idx = room.playerCursors?.[playerId] ?? 0;
  if (idx >= room.questions.length) {
    // Out of staged questions → optionally recycle from start (without reusing ids)
    // For now, just stop emitting to this player.
    return;
  }

  const q = room.questions[idx];
  const player = room.players.find(p => p.id === playerId);
  if (!player?.socketId) return;

  const sock = namespace.sockets.get(player.socketId);
  if (!sock) return;

  // Emit only to this player
  sock.emit('speed_question', {
    id: q.id,
    text: q.text,
    options: Array.isArray(q.options) ? q.options.slice(0, 2) : [],
    // UI can read remaining time from round_time_remaining ticks
  });

  if (debug) console.log(`[speedRound] ➤ Sent Q#${idx + 1} to ${playerId} (qid=${q.id})`);
}

/* ------------------------- Answers: instant ------------------------ */
export function handlePlayerAnswer(roomId, playerId, payload, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;
  if (Date.now() >= (room.roundEndTime || 0)) return;

  const cursor = room.playerCursors?.[playerId] ?? 0;
  const q = room.questions[cursor];
  if (!q) return;

  // incoming
  const incomingId = payload?.questionId ?? q.id;
  const submitted = (payload?.answer === '' || payload?.answer === undefined)
    ? null
    : String(payload.answer);

  // guard: id match (stringify to be safe)
  if (String(incomingId) !== String(q.id)) return;

  const key = `${q.id}_round${room.currentRound}`;
  const playerData = room.playerData[playerId] || (room.playerData[playerId] = { answers: {} });
  if (playerData.answers[key]) return; // already answered

  // Determine correct token from question
  const correctRaw =
    q.correctAnswer ?? q.answer ?? q.correct ?? q.solution;
  const correctToken = correctRaw == null ? null : String(correctRaw);

  // Sole source of truth for correctness
  const isSkip = submitted === null;
  const isCorrect = !isSkip && correctToken !== null && submitted === correctToken;

  // Points via your service (keeps config rules), but we trust isCorrect for UI/storage
  let result = null;
  if (!isSkip) {
    result = SimplifiedScoringService.processAnswer(room, playerId, q, submitted);
  }

  // Store one consistent record
  playerData.answers[key] = {
    submitted,                // exact string or null
    correct: isCorrect,       // our truth
    noAnswer: isSkip,
    pointsDelta: result?.pointsDelta ?? 0,
    finalized: true,
  };

  // Host ticker: use the same isCorrect/isSkip
  const now = Date.now();
  room._hostSpeedLastEmit = room._hostSpeedLastEmit || 0;

  namespace.to(`${roomId}:host`).emit('host_speed_activity', {
    playerId,
    playerName: room.players.find(p => p.id === playerId)?.name || 'Player',
    correct: isCorrect,
    skipped: isSkip,
    questionId: q.id,
    ts: now
  });

  if (now - room._hostSpeedLastEmit >= 1000) {
    room._hostSpeedLastEmit = now;
    const all = Object.values(room.playerData || {})
      .flatMap(pd => Object.values(pd.answers || {}));
    const total = all.length;
    const correct = all.filter(a => a.correct).length;
    const skipped = all.filter(a => a.noAnswer).length;
    const wrong = total - correct - skipped;

    namespace.to(`${roomId}:host`).emit('host_speed_stats', {
      totalAnswers: total,
      correct,
      wrong,
      skipped,
      answersPerSec: Math.round((total / Math.max(1, ((Date.now() - room.roundStartTime) / 1000))) * 10) / 10
    });
  }

  // advance & next
  room.playerCursors[playerId] = cursor + 1;
  emitNextQuestionToPlayer(roomId, playerId, namespace);

  StatsService.calculateLiveRoundStats(roomId, namespace);
}


/* --------------------------- Finalization -------------------------- */
function finalizeSpeedRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  // Build reviewQuestions = only questions that any player answered/skipped this round
  const answeredIds = new Set();
  const roundTag = `_round${room.currentRound}`;

  for (const p of room.players) {
    const pd = room.playerData[p.id];
    if (!pd?.answers) continue;
    for (const key of Object.keys(pd.answers)) {
      if (!key.endsWith(roundTag)) continue;
      const m = key.match(/^(\d+)_round(\d+)$/);
      if (!m) continue;
      const qid = Number(m[1]);
      if (!Number.isNaN(qid)) answeredIds.add(qid);
    }
  }

  // Preserve original order from room.questions
  room.reviewQuestions = Array.isArray(room.questions)
    ? room.questions.filter(q => answeredIds.has(Number(q.id)))
    : [];

  // Start review
  room.currentPhase = 'reviewing';
  room.currentReviewIndex = 0;

  emitRoomState(namespace, roomId);
  emitNextReviewQuestion(roomId, namespace);
}


export function emitNextReviewQuestion(roomId, namespace) {
  const ref = {
    calculateAndSendRoundStats: (rid, ns) => StatsService.calculateFinalRoundStats(rid, ns),
  };
  return ReviewService.emitNextReviewQuestion(roomId, namespace, ref, getQuizRoom, emitRoomState);
}

export function getCurrentReviewQuestion(roomId) {
  return ReviewService.getCurrentReviewQuestion(roomId, getQuizRoom);
}

export function isReviewComplete(roomId) {
  return ReviewService.isReviewComplete(roomId, getQuizRoom);
}

export function buildLeaderboard(room) {
  return LeaderboardService.buildLeaderboard(room);
}

