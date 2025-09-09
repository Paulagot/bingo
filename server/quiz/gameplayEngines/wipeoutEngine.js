// wipeoutEngine.js 
import {
  getQuizRoom,
  setQuestionsForCurrentRound,
  advanceToNextQuestion,
  resetRoundExtrasTracking,
  getCurrentQuestion,
  emitRoomState,
} from '../quizRoomManager.js';

import { QuestionEmissionService } from './services/QuestionEmissionService.js';
import { QuestionService } from './services/QuestionService.js';
import { TimerService } from './services/TimerService.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { ReviewService } from './services/ReviewService.js';
import { StatsService } from './services/StatsService.js';
import { SimplifiedScoringService } from './services/SimplifiedScoringService.js';
import { getRoundScoring, isQuestionWindowOpen } from '../handlers/scoringUtils.js';
import { FreezeService } from './services/FreezeServices.js';

let timerService = null;
const debug = true;


/* ---------------------------- Init round ---------------------------- */
export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const roundType = roundConfig.roundType;
  const questionsPerRound = roundConfig.config?.questionsPerRound || 8;

  // Extract filters
  const desiredDifficulty = roundConfig.difficulty;
  const desiredCategory = roundConfig.category;

   room.players.forEach(player => {
    SimplifiedScoringService.initializeRoundTracking(room, player.id);
  });

  if (debug) {
    console.log(`[GameEngine] 🔄 Round ${room.currentRound} tracking initialized for ${room.players.length} players`);
  }

  if (!timerService) {
  timerService = new TimerService(namespace);
}

  if (debug) {
    console.log(`[wipeoutEngine] 🔍 Loading questions for round ${room.currentRound}`);
    console.log(`[wipeoutEngine] 📋 Type: ${roundType}, Category: ${desiredCategory}, Difficulty: ${desiredDifficulty}`);
    console.log(`[wipeoutEngine] 🎯 Need: ${questionsPerRound} questions`);
  }

  // Load w/ filters + fallbacks
const selectedQuestions = QuestionService.loadAndFilterQuestions(
  roundType, 
  desiredCategory, 
  desiredDifficulty, 
  questionsPerRound,
  debug
);

  if (debug) {
   console.log(`[wipeoutEngine] ✅ Selected ${selectedQuestions.length} questions for round ${room.currentRound}`);
  const actualBreakdown = selectedQuestions.reduce((acc, q) => {
  const cat = q.category || 'unknown';
  const diff = q.difficulty || 'unknown';
  const key = `${cat}/${diff}`;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
    console.log(`[wipeoutEngine] 📊 Selected question breakdown:`, actualBreakdown);
  }

setQuestionsForCurrentRound(roomId, selectedQuestions);
  resetRoundExtrasTracking(roomId);

  // ✅ Reset per-round extras tracking AND per-round penalty debt
  Object.values(room.playerData).forEach(pd => {
    pd.usedExtrasThisRound = {};
    // pd.penaltyDebt = 0; // <-- debt is per round
  });

  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';

    StatsService.calculateLiveRoundStats(roomId, namespace);
  startNextQuestion(roomId, namespace);
  return true;
}

/* -------------------------- Next question -------------------------- */
export function startNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const nextQuestion = advanceToNextQuestion(roomId);
 FreezeService.clearExpiredFreezes(roomId, room.currentQuestionIndex);

// ✅ CLOSE PREVIOUS QUESTION using SimplifiedScoringService
if (room.currentQuestionIndex >= 0) {
  const penalizedCount = SimplifiedScoringService.finalizePreviousQuestion(room);
  if (debug && penalizedCount > 0) {
    console.log(`[Engine] ⏰ Finalized previous question, ${penalizedCount} players received no-answer penalties`);
  }
}

  // End-of-round -> review
  if (!nextQuestion) {
    if (debug) console.log(`[wipeoutEngine] 🔄 All questions complete for round ${room.currentRound}`);
    room.currentPhase = 'reviewing';
    room.currentReviewIndex = 0;
    emitRoomState(namespace, roomId);
    emitNextReviewQuestion(roomId, namespace);
    return;
  }

  // Continue with next question
  emitRoomState(namespace, roomId);

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const timeLimit = roundConfig?.config?.timePerQuestion || 25;
  const questionStartTime = Date.now();
  room.questionStartTime = questionStartTime;

 room.players.forEach(player => {
  const socket = namespace.sockets.get(player.socketId);
  if (socket) {
    QuestionEmissionService.emitQuestionToPlayer(socket, room, nextQuestion);
  }
});

// Also send to host
const hostSocket = namespace.sockets.get(room.hostSocketId);
if (hostSocket) {
  QuestionEmissionService.emitQuestionToPlayer(hostSocket, room, nextQuestion);
}

  timerService.startQuestionTimer(roomId, timeLimit, () => {
    startNextQuestion(roomId, namespace);
  });

  // Notify frozen players
FreezeService.notifyFrozenPlayers(namespace, roomId, room.currentQuestionIndex);}
 

/* ------------------------- Handle an answer ------------------------- */
// CORRECTED handlePlayerAnswer for both engines:
export function handlePlayerAnswer(roomId, playerId, payload, namespace) {
  console.log(`[DEBUG] handlePlayerAnswer called:`, { roomId, playerId, payload });
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

/* --------------------------- Extras helpers ------------------------ */
export function handleFreezeExtra(roomId, playerId, targetPlayerId, namespace) {
  const result = FreezeService.setFreeze(roomId, playerId, targetPlayerId);
  
  if (result.success) {
    const room = getQuizRoom(roomId);
    const player = room.players.find(p => p.id === playerId);
    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    
    StatsService.sendHostActivityNotification(namespace, roomId, {
      type: 'freeze',
      playerName: player.name,
      targetName: targetPlayer.name,
      context: 'Next Question',
      round: room.currentRound
    });
    
    StatsService.calculateLiveRoundStats(roomId, namespace);
  }
  
  return result;
}

export function handleHintExtra(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

 StatsService.sendHostActivityNotification(namespace, roomId, {
    type: 'hint',
    playerName: player.name,
    context: `Q${room.currentQuestionIndex + 1}`,
    round: room.currentRound,
    questionNumber: room.currentQuestionIndex + 1
  });

StatsService.calculateLiveRoundStats(roomId, namespace);
  return { success: true };
}

/* ------------------------------ Review ----------------------------- */
export function emitNextReviewQuestion(roomId, namespace) {
  const gameEngineRef = {
    calculateAndSendRoundStats: (roomId, namespace) => StatsService.calculateFinalRoundStats(roomId, namespace) // ✅ FINAL stats for review
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

/* ------------------------------- Helpers --------------------------- */


function clearExpiredFreezeFlags(room) {
  for (const playerId in room.playerData) {
    const p = room.playerData[playerId];
    if (p.frozenNextQuestion && room.currentQuestionIndex > p.frozenForQuestionIndex) {
      p.frozenNextQuestion = false;
      p.frozenForQuestionIndex = null;
      if (debug) console.log(`[wipeoutEngine] 🧼 Cleared freeze for ${playerId}`);
    }
  }
}

/* ------------------------ Exports for handlers --------------------- */
export { 
  StatsService as HostNotificationService // Export StatsService under alias for backward compatibility
};

// Export individual methods for convenience (these now proxy to StatsService)
export const sendHostActivityNotification = (namespace, roomId, activityData) => {
  return StatsService.sendHostActivityNotification(namespace, roomId, activityData);
};

export const calculateAndSendRoundStats = (roomId, namespace) => {
  return StatsService.calculateFinalRoundStats(roomId, namespace);
};















