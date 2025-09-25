// server/quiz/gameplayEngines/speedRoundEngine.js
// TARGETED FIX: Only affects speed round, leaves other round types untouched

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

export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const roundIndex = (room.currentRound ?? 1) - 1;
  const { questionsPerRound, category, difficulty } =
    QuestionService.getRoundQuestionConfig(room, roundIndex);

  const rd = room.config?.roundDefinitions?.[roundIndex];

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
    console.warn(`[speedRound] No questions available`);
    return false;
  }

  const staged = questions.slice(0, questionsPerRound);
  setQuestionsForCurrentRound(roomId, staged);

  room.playerCursors = {};
  room.players.forEach(p => {
    room.playerCursors[p.id] = 0;
    SimplifiedScoringService.initializeRoundTracking(room, p.id);
  });

  const totalSeconds = rd?.config?.totalTimeSeconds ?? 90;
  const now = Date.now();
  room.roundStartTime = now;
  room.roundEndTime = now + totalSeconds * 1000;

  room.currentPhase = 'asking';
  
  // Initialize host speed stats tracking
  room._hostSpeedStats = {
    totalAnswers: 0,
    correct: 0,
    wrong: 0,
    skipped: 0,
    lastUpdate: now
  };

  StatsService.calculateLiveRoundStats(roomId, namespace);
  emitRoomState(namespace, roomId);

  room._speedRoundInterval && clearInterval(room._speedRoundInterval);
  room._speedRoundInterval = setInterval(() => {
    const remaining = Math.max(0, Math.floor((room.roundEndTime - Date.now()) / 1000));
    namespace.to(roomId).emit('round_time_remaining', { remaining });
    if (remaining <= 0) {
      clearInterval(room._speedRoundInterval);
      finalizeSpeedRound(roomId, namespace);
    }
  }, 1000);

  room.players.forEach(p => emitNextQuestionToPlayer(roomId, p.id, namespace));

  return true;
}

export function emitNextQuestionToPlayer(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  const idx = room.playerCursors?.[playerId] ?? 0;
  if (idx >= room.questions.length) return;

  const q = room.questions[idx];
  const player = room.players.find(p => p.id === playerId);
  if (!player?.socketId) return;

  const sock = namespace.sockets.get(player.socketId);
  if (!sock) return;

  sock.emit('speed_question', {
    id: q.id,
    text: q.text,
    options: Array.isArray(q.options) ? q.options.slice(0, 2) : [],
  });

  if (debug) console.log(`[speedRound] Sent Q#${idx + 1} to ${playerId} (qid=${q.id})`);
}

// KEY FIX: Enhanced answer handling that distinguishes skips from wrong answers
export function handlePlayerAnswer(roomId, playerId, payload, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;
  if (Date.now() >= (room.roundEndTime || 0)) return;

  const cursor = room.playerCursors?.[playerId] ?? 0;
  const q = room.questions[cursor];
  if (!q) return;

  const incomingId = payload?.questionId ?? q.id;
  const submitted = (payload?.answer === '' || payload?.answer === undefined || payload?.answer === null)
    ? null
    : String(payload.answer);

  if (String(incomingId) !== String(q.id)) return;

  const key = `${q.id}_round${room.currentRound}`;
  const playerData = room.playerData[playerId] || (room.playerData[playerId] = { answers: {} });
  if (playerData.answers[key]) return;

  const correctRaw = q.correctAnswer ?? q.answer ?? q.correct ?? q.solution;
  const correctToken = correctRaw == null ? null : String(correctRaw);

  // CLEAR CATEGORIZATION for speed rounds
  const isVoluntarySkip = submitted === null;  // Player chose to skip
  const isCorrect = !isVoluntarySkip && correctToken !== null && submitted === correctToken;
  const isWrong = !isVoluntarySkip && !isCorrect;  // Player tried but got it wrong

  if (debug) {
    console.log(`[speedRound] ${playerId} answer:`, {
      questionId: q.id,
      submitted,
      correctToken,
      isVoluntarySkip,
      isCorrect,
      isWrong
    });
  }

  // Points via scoring service (but speed rounds typically don't have penalties)
  let result = null;
  if (!isVoluntarySkip) {
    result = SimplifiedScoringService.processAnswer(room, playerId, q, submitted);
  }

  // Store answer with clear categorization
  playerData.answers[key] = {
    submitted,
    correct: isCorrect,
    noAnswer: isVoluntarySkip,      // This means "voluntary skip" in speed rounds
    isWrong: isWrong,              // Explicit wrong flag
    pointsDelta: result?.pointsDelta ?? 0,
    finalized: true,
    // Speed round specific flags
    voluntarySkip: isVoluntarySkip  // Makes it crystal clear this was a choice
  };

  // Host activity with correct categorization
  const player = room.players.find(p => p.id === playerId);
  const playerName = player?.name || 'Player';
  
  namespace.to(`${roomId}:host`).emit('host_speed_activity', {
    playerId,
    playerName,
    correct: isCorrect,
    wrong: isWrong,        // Explicit wrong flag
    skipped: isVoluntarySkip,  // Explicit skip flag
    questionId: q.id,
    submittedAnswer: submitted,
    correctAnswer: correctToken,
    ts: Date.now()
  });

  // Update aggregate host stats
  updateHostSpeedStats(room, namespace, roomId);

  room.playerCursors[playerId] = cursor + 1;
  emitNextQuestionToPlayer(roomId, playerId, namespace);

  StatsService.calculateLiveRoundStats(roomId, namespace);
}

// Helper function for consistent host stats calculation (SPEED ROUND ONLY)
function updateHostSpeedStats(room, namespace, roomId) {
  const now = Date.now();
  
  if (now - (room._hostSpeedStats?.lastUpdate || 0) < 1000) {
    return;
  }

  const roundTag = `_round${room.currentRound}`;
  let totalAnswers = 0;
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  for (const player of room.players) {
    const pd = room.playerData[player.id];
    if (!pd?.answers) continue;

    for (const [key, answer] of Object.entries(pd.answers)) {
      if (!key.endsWith(roundTag)) continue;
      
      totalAnswers++;
      
      // Use speed round specific logic
      if (answer.voluntarySkip === true || (answer.noAnswer === true && answer.submitted === null)) {
        skipped++;
      } else if (answer.correct === true) {
        correct++;
      } else {
        wrong++;
      }
    }
  }

  room._hostSpeedStats = {
    totalAnswers,
    correct,
    wrong,
    skipped,
    lastUpdate: now
  };

  const elapsed = Math.max(1, (now - room.roundStartTime) / 1000);
  const answersPerSec = Math.round((totalAnswers / elapsed) * 10) / 10;

  namespace.to(`${roomId}:host`).emit('host_speed_stats', {
    totalAnswers,
    correct,
    wrong,
    skipped,
    answersPerSec
  });

  if (debug) {
    console.log(`[speedRound] Host stats:`, {
      totalAnswers,
      correct,
      wrong,
      skipped,
      answersPerSec
    });
  }
}

function finalizeSpeedRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room || room.currentPhase !== 'asking') return;

  if (room._speedRoundInterval) {
    clearInterval(room._speedRoundInterval);
    room._speedRoundInterval = null;
  }

  // Build review questions from answered/skipped questions
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

  room.reviewQuestions = Array.isArray(room.questions)
    ? room.questions.filter(q => answeredIds.has(Number(q.id)))
    : [];

  // Final stats update
  updateHostSpeedStats(room, namespace, roomId);

  room.currentPhase = 'reviewing';
  room.currentReviewIndex = 0;

  emitRoomState(namespace, roomId);
  emitNextReviewQuestion(roomId, namespace);

  if (debug) {
    console.log(`[speedRound] Round finalized:`, {
      totalQuestions: room.questions.length,
      reviewQuestions: room.reviewQuestions.length,
      finalStats: room._hostSpeedStats
    });
  }
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

