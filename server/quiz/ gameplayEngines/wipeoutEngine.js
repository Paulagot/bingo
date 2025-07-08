// wipeoutEngine.js - Updated with round leaderboard support

import {
  getQuizRoom,
  loadQuestionsForRoundType,
  setQuestionsForCurrentRound,
  advanceToNextQuestion,
  resetRoundExtrasTracking,
  getCurrentQuestion,
  emitRoomState,
} from '../quizRoomManager.js';

let timers = {}; // per-room timer refs
const debug = true;

export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const roundType = roundConfig.roundType;
  const desiredDifficulty = roundConfig.difficulty || 'medium';
  const desiredCategory = roundConfig.category || null;

  let questions = loadQuestionsForRoundType(roundType);

  // ✅ Filter by difficulty and optional category
  questions = questions.filter((q) => {
    const matchesDifficulty = q.difficulty?.toLowerCase() === desiredDifficulty.toLowerCase();
    const matchesCategory = !desiredCategory || q.category?.toLowerCase() === desiredCategory.toLowerCase();
    return matchesDifficulty && matchesCategory;
  });

  const questionsPerRound = roundConfig.config?.questionsPerRound || 6;

  // ✅ Shuffle and slice
  questions = shuffleArray(questions).slice(0, questionsPerRound);

  console.log(`[wipeoutEngine] 🔎 Loaded ${questions.length} questions for ${roundType} (difficulty=${desiredDifficulty}, category=${desiredCategory})`);
  console.log(`[wipeoutEngine] 🧠 Final difficulties:`, questions.map(q => q.difficulty));

  setQuestionsForCurrentRound(roomId, questions);
  resetRoundExtrasTracking(roomId);
  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';
  startNextQuestion(roomId, namespace);
  return true;
}

export function startNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const nextQuestion = advanceToNextQuestion(roomId);
  clearExpiredFreezeFlags(room);

  // ✅ NEW: Handle unanswered questions from previous question (if there was one)
  if (room.currentQuestionIndex >= 0 && room.questions[room.currentQuestionIndex - 1]) {
    const previousQuestion = room.questions[room.currentQuestionIndex - 1];
    const roundConfig = room.config.roundDefinitions[room.currentRound - 1]?.config || {};
    const pointsLostPerUnanswered = roundConfig.pointslostperunanswered || 0;

    // Check each player to see if they answered the previous question
    room.players.forEach(player => {
      const playerData = room.playerData[player.id];
      if (!playerData) return;

      const roundAnswerKey = `${previousQuestion.id}_round${room.currentRound}`;
      const hasAnswered = playerData.answers[roundAnswerKey] !== undefined;

      if (!hasAnswered && pointsLostPerUnanswered > 0) {
        // Deduct points for not answering
        playerData.score = Math.max(0, (playerData.score || 0) - pointsLostPerUnanswered);
        
        // ✅ Track cumulative negative points
        playerData.cumulativeNegativePoints = (playerData.cumulativeNegativePoints || 0) + pointsLostPerUnanswered;

        if (debug) {
          console.log(`[wipeoutEngine] ⏰ ${player.id} didn't answer question ${previousQuestion.id}, lost ${pointsLostPerUnanswered} points. Score: ${playerData.score}, Cumulative negative: ${playerData.cumulativeNegativePoints}`);
        }
      }
    });
  }

  if (!nextQuestion) {
    if (debug) console.log(`[wipeoutEngine] 🔄 All questions complete for round ${room.currentRound}`);
    room.currentPhase = 'reviewing';
    room.currentReviewIndex = 0;
    emitRoomState(namespace, roomId);
    emitNextReviewQuestion(roomId, namespace);
    return;
  }

  emitRoomState(namespace, roomId);
  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const timeLimit = roundConfig?.config?.timePerQuestion || 25;
  const questionStartTime = Date.now();
  room.questionStartTime = questionStartTime;

  namespace.to(roomId).emit('question', {
    id: nextQuestion.id,
    text: nextQuestion.text,
    options: Array.isArray(nextQuestion.options) ? nextQuestion.options : [],
    timeLimit,
    questionStartTime,
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length,
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

  // Notify frozen players
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
          console.log(`[wipeoutEngine] ❄️ Notified ${player.id} they are frozen for question index ${room.currentQuestionIndex}`);
        }
      }
    }
  });

  if (debug) {
    console.log(`[wipeoutEngine] ▶ Sent question: ${nextQuestion.id} (Q#${room.currentQuestionIndex}, timeLimit: ${timeLimit}s, startTime: ${questionStartTime})`);
  }

  clearTimeout(timers[roomId]);
  timers[roomId] = setTimeout(() => {
    startNextQuestion(roomId, namespace);
  }, timeLimit * 1000);
}

export function handlePlayerAnswer(roomId, playerId, answer) {
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
    console.log(`[wipeoutEngine] ❄️ Player ${playerId} is frozen and cannot answer question ${room.currentQuestionIndex}`);
    return;
  }

  const isCorrect = (answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase());

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const configObj = roundConfig?.config || {};
  const difficulty = roundConfig?.difficulty || 'medium';

  const pointsPerDifficulty = configObj.pointsPerDifficulty || { easy: 2, medium: 3, hard: 4 };
  const pointsPerQuestion = pointsPerDifficulty[difficulty] ?? 2;

  const pointsLostPerWrong = configObj.pointsLostPerWrong ?? 2; // ✅ fallback to 2 if missing

  console.log(`[DEBUG SCORING] question difficulty: ${difficulty}`);
  console.log(`[DEBUG SCORING] pointsPerDifficulty:`, pointsPerDifficulty);
  console.log(`[DEBUG SCORING] pointsLostPerWrong: ${pointsLostPerWrong}`);
  console.log(`[DEBUG SCORING] final pointsPerQuestion: ${pointsPerQuestion}`);

  if (isCorrect) {
    playerData.score = (playerData.score || 0) + pointsPerQuestion;
    if (debug) console.log(`[wipeoutEngine] ✅ ${playerId} got it right (+${pointsPerQuestion}), score: ${playerData.score}`);
  } else {
    playerData.score = (playerData.score || 0) - pointsLostPerWrong;
    if (playerData.score < 0) playerData.score = 0;

    if (pointsLostPerWrong > 0) {
      playerData.cumulativeNegativePoints = (playerData.cumulativeNegativePoints || 0) + pointsLostPerWrong;
    }

    if (debug) console.log(`[wipeoutEngine] ❌ ${playerId} got it wrong (-${pointsLostPerWrong}), score: ${playerData.score}, Cumulative negative: ${playerData.cumulativeNegativePoints}`);
  }

  const roundAnswerKey = `${question.id}_round${room.currentRound}`;
  playerData.answers[roundAnswerKey] = { submitted: answer, correct: isCorrect };

  if (debug) {
    console.log(`[wipeoutEngine] 📝 Answer from ${playerId}: ${answer} (${isCorrect ? 'Correct' : 'Wrong'})`);
  }
}

export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const reviewIndex = room.currentReviewIndex || 0;
  
  // ✅ UPDATED: When review is complete, stay in reviewing phase for host control
  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[wipeoutEngine] ✅ Review complete - waiting for host to show results`);
    
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

  if (debug) console.log(`[wipeoutEngine] 🔍 Reviewing question ${reviewIndex + 1}`);
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
  for (const playerId in room.playerData) {
    const p = room.playerData[playerId];
    if (p.frozenNextQuestion && room.currentQuestionIndex > p.frozenForQuestionIndex) {
      p.frozenNextQuestion = false;
      p.frozenForQuestionIndex = null;
      if (debug) {
        console.log(`[wipeoutEngine] 🧼 Cleared freeze for ${playerId}`);
      }
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










