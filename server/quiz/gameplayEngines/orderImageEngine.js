// server/quiz/gameplayEngines/orderImageEngine.js
import {
  getQuizRoom,
  setQuestionsForCurrentRound,
  advanceToNextQuestion,
  resetRoundExtrasTracking,
  getCurrentQuestion,
  emitRoomState
} from '../quizRoomManager.js';

import { OrderImageService } from './services/OrderImageService.js';
import { StatsService } from './services/StatsService.js';
import { FreezeService } from './services/FreezeServices.js';
import { TimerService } from './services/TimerService.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { SimplifiedScoringService } from './services/SimplifiedScoringService.js';
import { isQuestionWindowOpen } from '../handlers/scoringUtils.js';

let timerService = null;
const debug = true;

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
    console.log(`\n========== [orderImageEngine] Init Round ${room.currentRound} ==========`);
    console.log(`[orderImageEngine] 📋 Type: ${roundType}`);
    console.log(`[orderImageEngine] 📁 Category: ${desiredCategory || 'any'}`);
    console.log(`[orderImageEngine] 🎯 Difficulty: ${desiredDifficulty || 'any'}`);
    console.log(`[orderImageEngine] 🎲 Need: ${questionsPerRound} questions`);
  }

  // Load questions using OrderImageService
  const selectedQuestions = OrderImageService.loadQuestions(
    roomId,
    desiredCategory,
    desiredDifficulty,
    questionsPerRound
  );

  if (selectedQuestions.length === 0) {
    console.error('[orderImageEngine] ❌ No questions available!');
    return false;
  }

  if (debug) {
    console.log(`[orderImageEngine] ✅ Selected ${selectedQuestions.length} questions`);
    selectedQuestions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.id} (${q.difficulty}) - ${q.images.length} images`);
    });
  }

  // Initialize player tracking
  room.players.forEach(player => {
    SimplifiedScoringService.initializeRoundTracking(room, player.id);
  });

  if (debug) {
    console.log(`[orderImageEngine] 👥 Initialized tracking for ${room.players.length} players`);
  }

  setQuestionsForCurrentRound(roomId, selectedQuestions);
  resetRoundExtrasTracking(roomId);

  Object.values(room.playerData).forEach(playerData => {
    playerData.usedExtrasThisRound = {};
  });

  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';

  StatsService.calculateLiveRoundStats(roomId, namespace);
  startNextQuestion(roomId, namespace);
  
  if (debug) {
    console.log(`[orderImageEngine] ✅ Round ${room.currentRound} initialized`);
    console.log('==========================================================\n');
  }
  
  return true;
}

/* -------------------------- Next question -------------------------- */
export function startNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const nextQuestion = advanceToNextQuestion(roomId);

  // Clear expired freezes
  FreezeService.clearExpiredFreezes(roomId, room.currentQuestionIndex);

  // Finalize previous question
  if (room.currentQuestionIndex >= 0) {
    const penalizedCount = SimplifiedScoringService.finalizePreviousQuestion(room);
    if (debug && penalizedCount > 0) {
      console.log(`[orderImageEngine] ⏰ Finalized previous question, ${penalizedCount} players received no-answer penalties`);
    }
  }

  // Check if round is complete
  if (!nextQuestion) {
    if (debug) {
      console.log(`[orderImageEngine] 🏁 All questions complete for round ${room.currentRound}`);
    }
    room.currentPhase = 'reviewing';
    room.currentReviewIndex = 0;
    room.lastEmittedReviewIndex = -1;
    emitRoomState(namespace, roomId);
    emitNextReviewQuestion(roomId, namespace);
    return;
  }

  // Build emittable question (images shuffled, no 'order' field sent to client)
  const emittableQuestion = OrderImageService.buildEmittableQuestion(nextQuestion);
  
  if (!emittableQuestion) {
    console.error('[orderImageEngine] ❌ Failed to build emittable question');
    return;
  }

  // Store the emittable question so we can use it in review
  if (!room.emittedOptionsByQuestionId) room.emittedOptionsByQuestionId = {};
  room.emittedOptionsByQuestionId[nextQuestion.id] = emittableQuestion;

  emitRoomState(namespace, roomId);

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const timeLimit = roundConfig?.config?.timePerQuestion || 30;

  const questionStartTime = Date.now();
  room.questionStartTime = questionStartTime;

  if (debug) {
    console.log(`\n[orderImageEngine] 📤 Emitting question ${room.currentQuestionIndex + 1}/${room.questions.length}`);
    console.log(`[orderImageEngine] 📋 Prompt: ${emittableQuestion.prompt}`);
    console.log(`[orderImageEngine] 🖼️  Images: ${emittableQuestion.images.map(img => img.label).join(', ')}`);
    console.log(`[orderImageEngine] ⏱️  Time limit: ${timeLimit}s`);
  }

  // Emit question to players
  namespace.to(roomId).emit('order_image_question', {
    id: emittableQuestion.id,
    prompt: emittableQuestion.prompt,
    images: emittableQuestion.images, // Already shuffled, no 'order' field
    difficulty: emittableQuestion.difficulty,
    category: emittableQuestion.category,
    timeLimit,
    questionStartTime,
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
    currentQuestionIndex: room.currentQuestionIndex
  });

  // ✅ ALSO EMIT TO HOST (for timer and display)
  namespace.to(`${roomId}:host`).emit('order_image_question', {
    id: emittableQuestion.id,
    prompt: emittableQuestion.prompt,
    images: emittableQuestion.images,
    difficulty: emittableQuestion.difficulty,
    category: emittableQuestion.category,
    timeLimit,
    questionStartTime,
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
    currentQuestionIndex: room.currentQuestionIndex
  });

  // Start timer
  timerService.startQuestionTimer(roomId, timeLimit, () => {
    startNextQuestion(roomId, namespace);
  });

  // Notify frozen players
  FreezeService.notifyFrozenPlayers(namespace, roomId, room.currentQuestionIndex);

  if (debug) {
    console.log(`[orderImageEngine] ✅ Question sent, timer started\n`);
  }
}


/* ------------------------- Handle player answer ------------------------- */
export function handlePlayerAnswer(roomId, playerId, payload, _namespace) {
  const room = getQuizRoom(roomId);
  const question = getCurrentQuestion(roomId);
  
  if (!room || !question) {
    if (debug) console.log('[orderImageEngine] ❌ No room or question');
    return;
  }

  const norm = (typeof payload === 'object' && payload !== null) ? payload : { answer: payload };
  const questionId = norm.questionId ?? question.id;
  const playerOrder = norm.answer; // Should be array of image IDs

  if (debug) {
    console.log(`\n[orderImageEngine] 📥 Answer received from ${playerId}`);
    console.log(`[orderImageEngine] 🎯 Question: ${questionId}`);
    console.log(`[orderImageEngine] 📋 Order: ${JSON.stringify(playerOrder)}`);
  }

  // 1. Check question window is open
  if (!isQuestionWindowOpen(room, questionId)) {
    if (debug) console.log('[orderImageEngine] ⏰ Answer window closed');
    return;
  }

  // 2. Only accept for active question
  if (question.id !== questionId) {
    if (debug) console.log('[orderImageEngine] ❌ Question ID mismatch');
    return;
  }

  const playerData = room.playerData[playerId];
  if (!playerData) {
    if (debug) console.log('[orderImageEngine] ❌ No player data');
    return;
  }

  // 3. Check if frozen
  if (playerData.frozenNextQuestion && room.currentQuestionIndex === playerData.frozenForQuestionIndex) {
    if (debug) console.log('[orderImageEngine] ❄️ Player is frozen');
    return;
  }

  const key = `${question.id}_round${room.currentRound}`;
  
  // 4. Check if already answered
  if (playerData.answers[key]) {
    if (debug) console.log('[orderImageEngine] 🔄 Already answered');
    return;
  }

  // 5. Handle no answer (null or empty array)
  if (!playerOrder || !Array.isArray(playerOrder) || playerOrder.length === 0) {
    playerData.answers[key] = { 
      submitted: null, 
      correct: false, 
      noAnswer: true, 
      pointsDelta: 0, 
      finalized: false
    };
    if (debug) console.log('[orderImageEngine] ⏰ No-answer recorded');
    return;
  }

  // 6. Validate answer using OrderImageService
  const isCorrect = OrderImageService.validateAnswer(question, playerOrder);
  
  // 7. Calculate points (all-or-nothing scoring)
  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const pointsPerDifficulty = roundConfig?.config?.pointsPerDifficulty || { easy: 2, medium: 4, hard: 6 };
  const difficulty = (question.difficulty || 'medium').toLowerCase();
  const basePoints = pointsPerDifficulty[difficulty] || 4;
  
  const pointsDelta = isCorrect ? basePoints : 0;

  // 8. Store answer
  playerData.answers[key] = {
    submitted: playerOrder, // Store the order array
    correct: isCorrect,
    noAnswer: false,
    pointsDelta,
    finalized: true
  };

  // 9. Update score
  playerData.score = (playerData.score || 0) + pointsDelta;

  if (debug) {
    console.log(`[orderImageEngine] ${isCorrect ? '✅' : '❌'} Answer ${isCorrect ? 'correct' : 'incorrect'}`);
    console.log(`[orderImageEngine] 💰 Points: ${pointsDelta >= 0 ? '+' : ''}${pointsDelta}`);
    console.log(`[orderImageEngine] 📊 New score: ${playerData.score}\n`);
  }

  // 10. Send immediate feedback to player
  const player = room.players.find(p => p.id === playerId);
  if (player?.socketId) {
    const socket = _namespace.sockets.get(player.socketId);
    if (socket) {
      socket.emit('answer_feedback', {
        questionId,
        correct: isCorrect,
        pointsDelta,
        newScore: playerData.score
      });
    }
  }
}

/* ------------------------------ Review ----------------------------- */
function calculateQuestionStatistics(room, roundAnswerKey) {
  let correctCount = 0;
  let incorrectCount = 0;
  let noAnswerCount = 0;
  const totalPlayers = room.players.length;

  room.players.forEach(player => {
    const playerData = room.playerData[player.id];
    const answerData = playerData?.answers?.[roundAnswerKey];

    if (!answerData || answerData.submitted === null || answerData.submitted === undefined) {
      noAnswerCount++;
    } else if (answerData.correct) {
      correctCount++;
    } else {
      incorrectCount++;
    }
  });

  return {
    totalPlayers,
    correctCount,
    incorrectCount,
    noAnswerCount,
    correctPercentage: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0,
    incorrectPercentage: totalPlayers > 0 ? Math.round((incorrectCount / totalPlayers) * 100) : 0,
    noAnswerPercentage: totalPlayers > 0 ? Math.round((noAnswerCount / totalPlayers) * 100) : 0
  };
}

export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) {
    if (debug) console.error(`[orderImageEngine] ❌ Room ${roomId} not found`);
    return false;
  }

  const qList = room.questions;
  if (!qList || !Array.isArray(qList)) {
    if (debug) console.error(`[orderImageEngine] ❌ No questions array`);
    return false;
  }

  const reviewIndex = room.currentReviewIndex ?? 0;

  if (debug) {
    console.log(`[orderImageEngine] 🔍 Review index ${reviewIndex}/${qList.length}`);
  }

  // Check if review is complete
  if (reviewIndex >= qList.length) {
    if (debug) console.log(`[orderImageEngine] ✅ Review complete`);
    room.currentPhase = 'reviewing';
    emitRoomState(namespace, roomId);
    
    // Calculate final stats
    const finalRoundStats = StatsService.calculateFinalRoundStats(roomId, namespace);
    if (finalRoundStats) {
      namespace.to(`${roomId}:host`).emit('host_round_stats', finalRoundStats);
    }
    
    namespace.to(`${roomId}:host`).emit('review_complete', {
      message: 'All questions reviewed.',
      roundNumber: room.currentRound,
      totalQuestions: qList.length,
      timestamp: Date.now()
    });
    
    return false;
  }

  const question = qList[reviewIndex];
  const roundAnswerKey = `${question.id}_round${room.currentRound}`;

  if (debug) {
    console.log(`[orderImageEngine] 📖 Reviewing question ${reviewIndex + 1}: ${question.id}`);
  }

  // Send review to each player with their submitted answer
  room.players.forEach(player => {
    const playerData = room.playerData[player.id];
    const answerData = playerData?.answers?.[roundAnswerKey] || {};
    const submittedOrder = answerData.submitted || null; // Array of IDs or null

    const socket = namespace.sockets.get(player.socketId);
    if (socket) {
      socket.emit('order_image_review', {
        id: question.id,
        prompt: question.prompt,
        images: question.images, // Full array with order property
        difficulty: question.difficulty,
        category: question.category,
        playerOrder: submittedOrder, // Their submitted order
        questionNumber: reviewIndex + 1,
        totalQuestions: qList.length,
        currentRound: room.currentRound,
        totalRounds: room.config?.roundDefinitions?.length || 1
      });

      if (debug) {
        console.log(`[orderImageEngine] 📤 Review sent to ${player.id}, order: ${JSON.stringify(submittedOrder)}`);
      }
    }
  });

  // Send review to host with statistics
  const stats = calculateQuestionStatistics(room, roundAnswerKey);
  namespace.to(`${roomId}:host`).emit('host_order_image_review', {
    id: question.id,
    prompt: question.prompt,
    images: question.images,
    difficulty: question.difficulty,
    category: question.category,
    questionNumber: reviewIndex + 1,
    totalQuestions: qList.length,
    currentRound: room.currentRound,
    totalRounds: room.config?.roundDefinitions?.length || 1,
    statistics: stats
  });

  // Advance to next question
  room.currentReviewIndex = reviewIndex + 1;
  room.lastEmittedReviewIndex = reviewIndex;

  if (debug) {
    console.log(`[orderImageEngine] ✅ Review ${reviewIndex + 1} emitted\n`);
  }

  return true;
}

export function getCurrentReviewQuestion(roomId) {
  const room = getQuizRoom(roomId);
  const qList = room?.questions;

  if (!room || !qList) {
    if (debug) console.warn(`[orderImageEngine] ⚠️ getCurrentReviewQuestion: No room or questions for ${roomId}`);
    return null;
  }

  const idx = room.lastEmittedReviewIndex;

  // Before the first review is emitted or after review is finished
  if (idx == null || idx < 0 || idx >= qList.length) {
    if (debug) console.log(`[orderImageEngine] ℹ️ getCurrentReviewQuestion: idx=${idx}, no active review question`);
    return null;
  }

  const reviewQuestion = qList[idx];

  if (debug) {
    console.log(`[orderImageEngine] 📖 getCurrentReviewQuestion: Returning question ${idx + 1}/${qList.length}`);
  }

  return reviewQuestion;
}

export function isReviewComplete(roomId) {
  const room = getQuizRoom(roomId);
  const qList = room?.questions;

  if (!room) {
    if (debug) console.warn(`[orderImageEngine] ⚠️ isReviewComplete: Room ${roomId} not found`);
    return false;
  }

  const reviewComplete = (room.currentReviewIndex >= (qList?.length || 0));

  if (debug) {
    console.log(`[orderImageEngine] 🔍 isReviewComplete: ${reviewComplete} (reviewIndex: ${room.currentReviewIndex}, totalQuestions: ${qList?.length || 0})`);
  }

  return reviewComplete;
}

/* -------------------------- Leaderboard util ------------------------ */
export function buildLeaderboard(room) {
  return LeaderboardService.buildLeaderboard(room);
}

/* ------------------------ Exports for handlers --------------------- */
export { 
  StatsService as HostNotificationService
};

export const sendHostActivityNotification = (namespace, roomId, activityData) => {
  return StatsService.sendHostActivityNotification(namespace, roomId, activityData);
};

export const calculateAndSendRoundStats = (roomId, namespace) => {
  return StatsService.calculateFinalRoundStats(roomId, namespace);
};