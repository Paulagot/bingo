// generalTriviaEngine.js - Updated with round leaderboard support

import {
  getQuizRoom,
  loadQuestionsForRoundType,
  setQuestionsForCurrentRound,
  advanceToNextQuestion,
  resetRoundExtrasTracking,
  getCurrentQuestion,
  emitRoomState
} from '../quizRoomManager.js';

let timers = {}; // per-room timer refs
const debug = true;

export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const roundDef = room.config.roundDefinitions?.[room.currentRound - 1];
  const roundType = roundDef?.roundType;
  const questionsPerRound = roundDef?.config?.questionsPerRound || 6;
  const desiredCategory = roundDef?.category?.toLowerCase();
  const desiredDifficulty = roundDef?.difficulty?.toLowerCase();

  let allQuestions = loadQuestionsForRoundType(roundType);

  // ✅ First: try to strictly filter by both category and difficulty
  let filteredQuestions = allQuestions.filter((q) => {
    const matchesCategory = q.category?.toLowerCase() === desiredCategory;
    const matchesDifficulty = q.difficulty?.toLowerCase() === desiredDifficulty;
    return matchesCategory && matchesDifficulty;
  });

  // ✅ If too few, fallback to just difficulty filter
  if (filteredQuestions.length < questionsPerRound) {
    console.warn(`[generalTriviaEngine] ⚠️ Only found ${filteredQuestions.length} questions for category="${desiredCategory}", difficulty="${desiredDifficulty}". Falling back to difficulty-only filter.`);
    filteredQuestions = allQuestions.filter((q) =>
      q.difficulty?.toLowerCase() === desiredDifficulty
    );
  }

  // ✅ Final fallback: use all questions unfiltered
  if (filteredQuestions.length < questionsPerRound) {
    console.warn(`[generalTriviaEngine] ⚠️ Still not enough questions. Using unfiltered questions as last resort.`);
    filteredQuestions = allQuestions;
  }

  // ✅ Finalize selection
  const selectedQuestions = shuffleArray(filteredQuestions).slice(0, questionsPerRound);

  console.log(`[generalTriviaEngine] ✅ Selected ${selectedQuestions.length} questions for round ${room.currentRound}`);

  setQuestionsForCurrentRound(roomId, selectedQuestions);
  resetRoundExtrasTracking(roomId);
  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';
  startNextQuestion(roomId, namespace);
  return true;
}

export function startNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  // ✅ FIRST: clear expired freeze flags BEFORE advancing question index
  const nextQuestion = advanceToNextQuestion(roomId);
  clearExpiredFreezeFlags(room);
  
  if (!nextQuestion) {
    if (debug) console.log(`[generalTriviaEngine] 🔄 All questions complete for round ${room.currentRound}`);
    room.currentPhase = 'reviewing';
    room.currentReviewIndex = 0;
    emitRoomState(namespace, roomId);
    emitNextReviewQuestion(roomId, namespace);
    return;
  }

  emitRoomState(namespace, roomId);
  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const timeLimit = roundConfig?.config?.timePerQuestion || 10;
  const questionStartTime = Date.now();
  room.questionStartTime = questionStartTime;

  namespace.to(roomId).emit('question', {
    id: nextQuestion.id,
    text: nextQuestion.text,
    options: Array.isArray(nextQuestion.options) ? nextQuestion.options : [],
    timeLimit,
    questionStartTime,
    questionNumber: room.currentQuestionIndex + 1,    // ← ADD
    totalQuestions: room.questions.length             // ← ADD
  });

  // ✅ NEW: Schedule countdown effects
  if (timeLimit >= 3) {
    // 3 seconds left - GREEN flash + beep
    setTimeout(() => {
      namespace.to(roomId).emit('countdown_effect', { 
        secondsLeft: 3, 
        color: 'green',
        message: '3...' 
      });
    }, (timeLimit - 3) * 1000);

    // 2 seconds left - ORANGE flash + beep  
    setTimeout(() => {
      namespace.to(roomId).emit('countdown_effect', { 
        secondsLeft: 2, 
        color: 'orange',
        message: '2...' 
      });
    }, (timeLimit - 2) * 1000);

    // 1 second left - RED flash + beep
    setTimeout(() => {
      namespace.to(roomId).emit('countdown_effect', { 
        secondsLeft: 1, 
        color: 'red',
        message: '1...' 
      });
    }, (timeLimit - 1) * 1000);
  }

  // ✅ Notify frozen players
  room.players.forEach(player => {
    const pdata = room.playerData[player.id];
    if (
      pdata?.frozenNextQuestion &&
      pdata.frozenForQuestionIndex === room.currentQuestionIndex
    ) {
      const socket = namespace.sockets.get(player.socketId);
      if (socket) {
        socket.emit('freeze_notice', {
          frozenBy: pdata.frozenBy,
          frozenForQuestionIndex: pdata.frozenForQuestionIndex,
          message: `You are frozen for this question!`
        });

        if (debug) {
          console.log(`[generalTriviaEngine] ❄️ Notified ${player.id} they are frozen for question index ${room.currentQuestionIndex}`);
        }
      }
    }
  });

  if (debug) {
    console.log(`[generalTriviaEngine] ▶ Sent question: ${nextQuestion.id} (Q#${room.currentQuestionIndex}, timeLimit: ${timeLimit}s, startTime: ${questionStartTime})`);
  }

  clearTimeout(timers[roomId]);
  timers[roomId] = setTimeout(() => {
    startNextQuestion(roomId, namespace);
  }, timeLimit * 1000);
}

export function handlePlayerAnswer(roomId, playerId, answer) {
  console.log(`[generalTriviaEngine] 🔍 handlePlayerAnswer called for ${playerId}: ${answer}`);

  const room = getQuizRoom(roomId);
  if (!room) return;

  const question = getCurrentQuestion(roomId);
  if (!question) return;

  const playerData = room.playerData[playerId];
  if (!playerData) return;

  if (
    playerData.frozenNextQuestion &&
    room.currentQuestionIndex === playerData.frozenForQuestionIndex
  ) {
    console.log(`[generalTriviaEngine] ❄️ Player ${playerId} is frozen and cannot answer question ${room.currentQuestionIndex}`);
    return;
  }

  const isCorrect = (answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase());

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const configObj = roundConfig?.config || {};
  const difficulty = roundConfig?.difficulty || 'medium';

  const pointsPerDifficulty = configObj.pointsPerDifficulty || { easy: 5, medium: 6, hard: 7 };
  const pointsPerQuestion = pointsPerDifficulty[difficulty] ?? 2; // ✅ safe fallback

  console.log(`[DEBUG SCORING] question difficulty: ${difficulty}`);
  console.log(`[DEBUG SCORING] pointsPerDifficulty:`, pointsPerDifficulty);
  console.log(`[DEBUG SCORING] final pointsPerQuestion:`, pointsPerQuestion);

  if (isCorrect) {
    playerData.score = (playerData.score || 0) + pointsPerQuestion;
    console.log(`[DEBUG SCORING] Player ${playerId} scored! New total:`, playerData.score);
  }

  const roundAnswerKey = `${question.id}_round${room.currentRound}`;
  playerData.answers[roundAnswerKey] = { submitted: answer, correct: isCorrect };

  if (debug) {
    console.log(`[generalTriviaEngine] 📝 Answer from ${playerId}: ${answer} (${isCorrect ? 'Correct' : 'Wrong'})`);
    console.log(`[generalTriviaEngine] 🔍 Player ${playerId} freeze status: frozenNextQuestion=${playerData.frozenNextQuestion}, frozenForQuestionIndex=${playerData.frozenForQuestionIndex}, currentQ=${room.currentQuestionIndex}`);
  }
}

export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const reviewIndex = room.currentReviewIndex || 0;
  
  // ✅ UPDATED: When review is complete, stay in reviewing phase for host control
  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[generalTriviaEngine] ✅ Review complete - waiting for host to show results`);
    
    // ✅ NEW: Stay in reviewing phase, don't automatically show leaderboard
    // The host will manually trigger round results when ready
    room.currentPhase = 'reviewing';
    emitRoomState(namespace, roomId);
    
    // ✅ NEW: Notify host that review is complete (optional)
    namespace.to(`${roomId}:host`).emit('review_complete', {
      message: 'All questions reviewed. You can now show round results.',
      roundNumber: room.currentRound,
      totalQuestions: room.questions.length
    });
    
    return;
  }

  const question = room.questions[reviewIndex];
  room.players.forEach(player => {
    const playerData = room.playerData[player.id];
    const roundAnswerKey = `${question.id}_round${room.currentRound}`;
    const answerData = playerData?.answers?.[roundAnswerKey] || {};
    const submittedAnswer = answerData.submitted || null;

    const socket = namespace.sockets.get(player.socketId);
    if (socket) {
      socket.emit('review_question', {
        id: question.id,
        text: question.text,
        options: Array.isArray(question.options) ? question.options : [],
        correctAnswer: question.correctAnswer,
        submittedAnswer,
        difficulty: question.difficulty,
      });
    }
  });

  namespace.to(roomId).emit('host_review_question', {
    id: question.id,
    text: question.text,
    options: Array.isArray(question.options) ? question.options : [],
    correctAnswer: question.correctAnswer,
  });

  room.currentReviewIndex = reviewIndex + 1;

  if (debug) console.log(`[generalTriviaEngine] 🔍 Reviewing question ${reviewIndex + 1}`);
}

// ✅ MOVED: buildLeaderboard function for use by hostHandlers
export function buildLeaderboard(room) {
  const leaderboard = Object.entries(room.playerData).map(([playerId, data]) => {
    const player = room.players.find(p => p.id === playerId);
    return {
      id: playerId,
      name: player?.name || playerId,
      score: data.score || 0,
      cumulativeNegativePoints: data.cumulativeNegativePoints || 0,
      pointsRestored: data.pointsRestored || 0
    };
  });

  console.log('[Leaderboard] Final scores:', leaderboard);
  leaderboard.sort((a, b) => b.score - a.score);
  return leaderboard;
}

function shuffleArray(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function clearExpiredFreezeFlags(room) {
  console.log(`[generalTriviaEngine] 🔍 clearExpiredFreezeFlags called, currentQuestionIndex: ${room.currentQuestionIndex}`);
  
  for (const playerId in room.playerData) {
    const p = room.playerData[playerId];
    if (p.frozenNextQuestion && room.currentQuestionIndex > p.frozenForQuestionIndex) {
      console.log(`[generalTriviaEngine] 🔍 Player ${playerId}: frozenForQuestionIndex=${p.frozenForQuestionIndex}, currentQuestionIndex=${room.currentQuestionIndex}`);
      if (debug) {
        console.log(`[generalTriviaEngine] 🧼 Clearing expired freeze for ${playerId} (was frozen for question ${p.frozenForQuestionIndex})`);
      }
      p.frozenNextQuestion = false;
      p.frozenForQuestionIndex = null;
    } else if (p.frozenNextQuestion) {
      console.log(`[generalTriviaEngine] 🔍 NOT clearing ${playerId}: frozenNext=${p.frozenNextQuestion}, frozenForIndex=${p.frozenForQuestionIndex}, currentQ=${room.currentQuestionIndex}`);
    }
  }
}

// ADD THESE TWO FUNCTIONS TO THE END OF BOTH wipeoutEngine.js AND generalTriviaEngine.js
// (Just copy and paste at the bottom, before the helper functions)

// ✅ NEW: Get current review question for state recovery
export function getCurrentReviewQuestion(roomId) {
  const room = getQuizRoom(roomId);
  if (!room || !room.questions || room.currentReviewIndex === undefined) {
    console.warn(`[Engine] ⚠️ getCurrentReviewQuestion: No room or review data for ${roomId}`);
    return null;
  }
  
  // If we're past all questions, return null
  if (room.currentReviewIndex >= room.questions.length) {
    console.log(`[Engine] ✅ getCurrentReviewQuestion: Review complete for ${roomId}`);
    return null;
  }
  
  const reviewQuestion = room.questions[room.currentReviewIndex];
  console.log(`[Engine] 📖 getCurrentReviewQuestion: Returning question ${room.currentReviewIndex} for ${roomId}`);
  return reviewQuestion;
}

// ✅ NEW: Check if review is complete
export function isReviewComplete(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return false;
  
  // Review is complete if we've reviewed all questions
  const reviewComplete = room.currentReviewIndex >= room.questions.length;
  
  console.log(`[Engine] 🔍 isReviewComplete for ${roomId}: ${reviewComplete} (reviewIndex: ${room.currentReviewIndex}, totalQuestions: ${room.questions.length})`);
  return reviewComplete;
}








