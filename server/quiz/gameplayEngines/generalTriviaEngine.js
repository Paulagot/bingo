// generalTriviaEngine.js - Updated to use centralized StatsService and FreezeService + Combined Questions

import {
  getQuizRoom,
  setQuestionsForCurrentRound,
  advanceToNextQuestion,
  resetRoundExtrasTracking,
  getCurrentQuestion,
  emitRoomState
} from '../quizRoomManager.js';

import { QuestionService } from './services/QuestionService.js';
import { StatsService } from './services/StatsService.js'; // ✅ Import centralized StatsService
import { FreezeService } from './services/FreezeServices.js'; // ✅ Import centralized FreezeService

import { TimerService } from './services/TimerService.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { ReviewService } from './services/ReviewService.js';
import { SimplifiedScoringService } from './services/SimplifiedScoringService.js';
import { _getRoundScoring, isQuestionWindowOpen } from '../handlers/scoringUtils.js';

let timerService = null;
const debug = false;

/* ---------------------------- Init round ---------------------------- */
export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

    room.emittedOptionsByQuestionId = {};

  const roundDef = room.config.roundDefinitions?.[room.currentRound - 1];
  const roundType = roundDef?.roundType;
  const questionsPerRound = roundDef?.config?.questionsPerRound || 6;

  const desiredCategory = roundDef?.category;
  const desiredDifficulty = roundDef?.difficulty;

  if (!timerService) {
    timerService = new TimerService(namespace);
  }

  if (debug) {
    console.log(`[generalTriviaEngine] 🔍 Loading questions for round ${room.currentRound}`);
    console.log(`[generalTriviaEngine] 📋 Type: ${roundType}, Category: ${desiredCategory}, Difficulty: ${desiredDifficulty}`);
    console.log(`[generalTriviaEngine] 🎯 Need: ${questionsPerRound} questions`);
  }

  // ✅ UPDATED: Pass roomId to enable global question tracking
  const selectedQuestions = QuestionService.loadAndFilterQuestions(
    roomId,      // ← NEW: Pass roomId for global tracking
    roundType, 
    desiredCategory, 
    desiredDifficulty, 
    questionsPerRound
  );

  if (debug) {
    console.log(`[generalTriviaEngine] ✅ Selected ${selectedQuestions.length} questions for round ${room.currentRound}`);
    const actualBreakdown = selectedQuestions.reduce((acc, q) => {
      const cat = q.category || 'unknown';
      const diff = q.difficulty || 'unknown';
      const key = `${cat}/${diff}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log(`[generalTriviaEngine] 📊 Selected question breakdown:`, actualBreakdown);
  }

  room.players.forEach(player => {
    SimplifiedScoringService.initializeRoundTracking(room, player.id);
  });

  if (debug) {
    console.log(`[GameEngine] 🔄 Round ${room.currentRound} tracking initialized for ${room.players.length} players`);
  }

  setQuestionsForCurrentRound(roomId, selectedQuestions);
 

  resetRoundExtrasTracking(roomId);

  Object.values(room.playerData).forEach(playerData => {
    playerData.usedExtrasThisRound = {};
  });

  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';

  // ✅ Use StatsService instead of local function
  StatsService.calculateLiveRoundStats(roomId, namespace);
  startNextQuestion(roomId, namespace);
  return true;
}

/* -------------------------- Next question -------------------------- */
export function startNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  // Advance first, then clear freezes
  const nextQuestion = advanceToNextQuestion(roomId);

  // ✅ USE CENTRALIZED FREEZE SERVICE instead of manual clearing
  FreezeService.clearExpiredFreezes(roomId, room.currentQuestionIndex);

  // ✅ CLOSE PREVIOUS QUESTION using SimplifiedScoringService
  if (room.currentQuestionIndex >= 0) {
    const penalizedCount = SimplifiedScoringService.finalizePreviousQuestion(room);
    if (debug && penalizedCount > 0) {
      console.log(`[Engine] ⏰ Finalized previous question, ${penalizedCount} players received no-answer penalties`);
    }
  }

  // If that was the last question, go to review
  if (!nextQuestion) {
    if (debug) console.log(`[generalTriviaEngine] 🔄 All questions complete for round ${room.currentRound}`);
    room.currentPhase = 'reviewing';
    room.currentReviewIndex = 0;
    room.lastEmittedReviewIndex = -1;
    emitRoomState(namespace, roomId);
    emitNextReviewQuestion(roomId, namespace);
    return;
  }

  // 🔀 Shuffle the options we’re about to emit (without mutating the question)
  const shuffledOptions = QuestionService.buildEmittableOptions(nextQuestion);

  // 🧠 Remember emitted options for this question so we can map index -> text in handlePlayerAnswer
  if (!room.emittedOptionsByQuestionId) room.emittedOptionsByQuestionId = {};
  room.emittedOptionsByQuestionId[nextQuestion.id] = shuffledOptions;

  // Emit updated room state before sending the question (kept from your original)
  emitRoomState(namespace, roomId);

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const timeLimit = roundConfig?.config?.timePerQuestion || 10;

  const questionStartTime = Date.now();
  room.questionStartTime = questionStartTime;

  // 📤 Send the question with shuffled options
  namespace.to(roomId).emit('question', {
    id: nextQuestion.id,
    text: nextQuestion.text,
    options: shuffledOptions, // <-- shuffled!
    timeLimit,
    questionStartTime,
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
    currentQuestionIndex: room.currentQuestionIndex
  });

  // Use TimerService for unified timer management
  timerService.startQuestionTimer(roomId, timeLimit, () => {
    startNextQuestion(roomId, namespace);
  });

  // ✅ Notify frozen players for this index
  FreezeService.notifyFrozenPlayers(namespace, roomId, room.currentQuestionIndex);

  if (debug) {
    console.log(
      `[generalTriviaEngine] ▶ Sent question: ${nextQuestion.id} (Q#${room.currentQuestionIndex}, timeLimit: ${timeLimit}s, startTime: ${questionStartTime})`
    );
  }
}


/* ------------------------- Handle an answer ------------------------- */

// CORRECTED handlePlayerAnswer for both engines:
export function handlePlayerAnswer(roomId, playerId, payload, _namespace) {
  const room = getQuizRoom(roomId);
  const question = getCurrentQuestion(roomId);
  if (!room || !question) return;

  const norm = (typeof payload === 'object' && payload !== null) ? payload : { answer: payload };
  const questionId = norm.questionId ?? question.id;
  const answer = norm.answer;

  // 1. Check question window is open (includes grace period)
  if (!isQuestionWindowOpen(room, questionId)) {
    if (debug) console.log(`[Engine] ⏰ Answer window closed for ${questionId}`);
    return;
  }

  // 2. Only accept for active question
  if (question.id !== questionId) return;

  const playerData = room.playerData[playerId];
  if (!playerData) return;

  // 3. Check if frozen
  if (playerData.frozenNextQuestion && room.currentQuestionIndex === playerData.frozenForQuestionIndex) return;

  const key = `${question.id}_round${room.currentRound}`;
  
  // 4. Check if already answered
  if (playerData.answers[key]) {
    if (debug) console.log(`[Engine] 🔄 Player ${playerId} already answered ${questionId}`);
    return;
  }

  // 5. Handle explicit no-answer (but don't finalize yet - let the sweep handle penalties)
  if (answer == null || answer === '') {
    playerData.answers[key] = { 
      submitted: null, 
      correct: false, 
      noAnswer: true, 
      pointsDelta: 0, 
      finalized: false  // Important: let finalization sweep handle this
    };
    if (debug) console.log(`[Engine] ⏰ No-answer recorded for ${playerId} on ${questionId}`);
    return;
  }

  // 6. Process actual answer with SimplifiedScoringService
  const result = SimplifiedScoringService.processAnswer(room, playerId, question, answer);

  if (debug && result.success) {
    console.log(`[Engine] 📊 ${playerId} answer processed: ${result.isCorrect ? '✅' : '❌'} ${result.pointsDelta >= 0 ? '+' : ''}${result.pointsDelta} points`);
  }
}

/* ------------------------------ Review ----------------------------- */
export function emitNextReviewQuestion(roomId, namespace) {
  const gameEngineRef = {
    // ✅ Use StatsService method instead of local function
    calculateAndSendRoundStats: (roomId, namespace) => StatsService.calculateFinalRoundStats(roomId, namespace)
  };
  
  return ReviewService.emitNextReviewQuestion(
    roomId, 
    namespace, 
    gameEngineRef, 
    getQuizRoom, 
    emitRoomState
  );
}

export function getCurrentReviewQuestion(roomId) {
  return ReviewService.getCurrentReviewQuestion(roomId, getQuizRoom);
}

export function isReviewComplete(roomId) {
  return ReviewService.isReviewComplete(roomId, getQuizRoom);
}

/* -------------------------- Leaderboard util ------------------------ */
export function buildLeaderboard(room) {
  return LeaderboardService.buildLeaderboard(room);
}

/* ------------------------ Exports for handlers --------------------- */
export { 
  StatsService as HostNotificationService // Export StatsService under alias for backward compatibility
};

// ✅ Export individual methods for convenience (these now proxy to StatsService)
export const sendHostActivityNotification = (namespace, roomId, activityData) => {
  return StatsService.sendHostActivityNotification(namespace, roomId, activityData);
};

export const calculateAndSendRoundStats = (roomId, namespace) => {
  return StatsService.calculateFinalRoundStats(roomId, namespace);
};











