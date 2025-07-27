// wipeoutEngine.js - Updated with complete host notification support

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

// ✅ NEW: Send host activity notification
function sendHostActivityNotification(namespace, roomId, activityData) {
  namespace.to(`${roomId}:host`).emit('host_activity_update', {
    type: activityData.type,
    playerName: activityData.playerName,
    targetName: activityData.targetName,
    context: activityData.context,
    round: activityData.round,
    questionNumber: activityData.questionNumber,
    timestamp: Date.now()
  });

  if (debug) {
    console.log(`[wipeoutEngine] 📡 Host notified: ${activityData.playerName} used ${activityData.type}`);
  }
}

// ✅ NEW: Calculate and send current round stats
function calculateAndSendRoundStats(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return null;

  const roundStats = {
    roundNumber: room.currentRound,
    hintsUsed: 0,
    freezesUsed: 0,
    pointsRobbed: 0,
    pointsRestored: 0,
    extrasByPlayer: {},
    questionsWithExtras: 0,
    totalExtrasUsed: 0
  };

  // Calculate stats from player data
  Object.entries(room.playerData).forEach(([playerId, playerData]) => {
    const player = room.players.find(p => p.id === playerId);
    const playerName = player?.name || playerId;
    
    if (!roundStats.extrasByPlayer[playerName]) {
      roundStats.extrasByPlayer[playerName] = [];
    }

    // Count extras used this round (stored in usedExtrasThisRound)
    if (playerData.usedExtrasThisRound) {
      Object.entries(playerData.usedExtrasThisRound).forEach(([extraId, used]) => {
        if (used) {
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({
            extraId,
            timestamp: Date.now()
          });

          // Count by type
          switch (extraId) {
            case 'buyHint':
              roundStats.hintsUsed++;
              break;
            case 'freezeOutTeam':
              roundStats.freezesUsed++;
              break;
            case 'robPoints':
              roundStats.pointsRobbed++;
              break;
            case 'restorePoints':
              roundStats.pointsRestored++;
              break;
          }
        }
      });
    }

    // ✅ NEW: Also count global extras from usedExtras (for leaderboard phase)
    if (playerData.usedExtras) {
      if (playerData.usedExtras.robPoints) {
        roundStats.pointsRobbed++;
        if (!roundStats.extrasByPlayer[playerName].some(e => e.extraId === 'robPoints')) {
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({
            extraId: 'robPoints',
            timestamp: Date.now()
          });
        }
      }
      
      // Count restore points by actual points restored
      if (playerData.pointsRestored > 0) {
        roundStats.pointsRestored += playerData.pointsRestored;
        if (!roundStats.extrasByPlayer[playerName].some(e => e.extraId === 'restorePoints')) {
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({
            extraId: 'restorePoints',
            timestamp: Date.now()
          });
        }
      }
    }
  });

  // Send to host
  namespace.to(`${roomId}:host`).emit('host_current_round_stats', roundStats);

  if (debug) {
    console.log(`[wipeoutEngine] 📊 Round stats sent to host:`, roundStats);
  }

  return roundStats;
}

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
  
  // ✅ NEW: Reset round stats tracking
  Object.values(room.playerData).forEach(playerData => {
    playerData.usedExtrasThisRound = {};
  });

  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';
  
  // ✅ NEW: Send initial round stats to host
  calculateAndSendRoundStats(roomId, namespace);
  
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

export function handlePlayerAnswer(roomId, playerId, answer, namespace) {
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

  // ✅ TEMPORARY DEBUG: Add this after setting the answer
console.log(`[DEBUG wipepout engine] Player ${playerId} usedExtrasThisRound:`, playerData.usedExtrasThisRound);
console.log(`[DEBUG wipepout engine] Checking hint usage:`, playerData.usedExtrasThisRound?.buyHint);
console.log(`[DEBUG wipepout engine] Namespace exists:`, !!namespace);



  if (debug) {
    console.log(`[wipeoutEngine] 📝 Answer from ${playerId}: ${answer} (${isCorrect ? 'Correct' : 'Wrong'})`);
  }
}

// ✅ NEW: Function to handle freeze extra with host notification
export function handleFreezeExtra(roomId, playerId, targetPlayerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const player = room.players.find(p => p.id === playerId);
  const targetPlayer = room.players.find(p => p.id === targetPlayerId);
  
  if (!player || !targetPlayer) {
    return { success: false, error: 'Player not found' };
  }

  // Execute freeze logic (this would be your existing freeze implementation)
  const targetData = room.playerData[targetPlayerId];
  if (targetData) {
    targetData.frozenNextQuestion = true;
    targetData.frozenForQuestionIndex = room.currentQuestionIndex + 1;
    targetData.frozenBy = player.name;
  }

  // ✅ NEW: Notify host of freeze activity
  sendHostActivityNotification(namespace, roomId, {
    type: 'freeze',
    playerName: player.name,
    targetName: targetPlayer.name,
    context: 'Next Question',
    round: room.currentRound
  });

  // ✅ NEW: Update round stats
  calculateAndSendRoundStats(roomId, namespace);

  return { success: true };
}

// ✅ NEW: Function to handle hint extra with host notification
export function handleHintExtra(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  // ✅ NEW: Notify host of hint activity  
  sendHostActivityNotification(namespace, roomId, {
    type: 'hint',
    playerName: player.name,
    context: `Q${room.currentQuestionIndex + 1}`,
    round: room.currentRound,
    questionNumber: room.currentQuestionIndex + 1
  });

  // ✅ NEW: Update round stats
  calculateAndSendRoundStats(roomId, namespace);

  return { success: true };
}

export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const reviewIndex = room.currentReviewIndex || 0;
  
  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[wipeoutEngine] ✅ Review complete - waiting for host to show results`);
    
    room.currentPhase = 'reviewing';
    emitRoomState(namespace, roomId);
    
    // ✅ NEW: Calculate and send final round stats when review is complete
    const finalRoundStats = calculateAndSendRoundStats(roomId, namespace);
    namespace.to(`${roomId}:host`).emit('host_round_stats', finalRoundStats);

    namespace.to(`${roomId}:host`).emit('review_complete', {
      message: 'All questions reviewed. You can now show round results.',
      roundNumber: room.currentRound,
      totalQuestions: room.questions.length
    });

    if (debug) {
      console.log(`[wipeoutEngine] 📈 Final round ${room.currentRound} stats sent to host`);
    }
    
    return;
  }

  const question = room.questions[reviewIndex];
  const roundAnswerKey = `${question.id}_round${room.currentRound}`;
  
  // ✅ NEW: Calculate answer statistics
  let correctCount = 0;
  let incorrectCount = 0;
  let noAnswerCount = 0;
  const totalPlayers = room.players.length;

  // Analyze all player answers for this question
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

  // ✅ NEW: Send individual review to each player (existing logic + question numbers)
  room.players.forEach(player => {
    const playerData = room.playerData[player.id];
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
        category: question.category,
        // ✅ NEW: Add question positioning
        questionNumber: reviewIndex + 1,
        totalQuestions: room.questions.length,
        currentRound: room.currentRound,
        totalRounds: room.config.roundDefinitions?.length || 1
      });
    }
  });

  // ✅ NEW: Send enhanced review to host with statistics
  namespace.to(`${roomId}:host`).emit('host_review_question', {
    id: question.id,
    text: question.text,
    options: Array.isArray(question.options) ? question.options : [],
    correctAnswer: question.correctAnswer,
    difficulty: question.difficulty,
    category: question.category,
    // ✅ NEW: Add question positioning for host
    questionNumber: reviewIndex + 1,
    totalQuestions: room.questions.length,
    currentRound: room.currentRound,
    totalRounds: room.config.roundDefinitions?.length || 1,
    // ✅ NEW: Add answer statistics for host
    statistics: {
      totalPlayers,
      correctCount,
      incorrectCount,
      noAnswerCount,
      correctPercentage: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0,
      incorrectPercentage: totalPlayers > 0 ? Math.round((incorrectCount / totalPlayers) * 100) : 0,
      noAnswerPercentage: totalPlayers > 0 ? Math.round((noAnswerCount / totalPlayers) * 100) : 0
    }
  });

  room.currentReviewIndex = reviewIndex + 1;

  if (debug) {
    console.log(`[wipeoutEngine] 🔍 Reviewing question ${reviewIndex + 1}/${room.questions.length}`);
    console.log(`[wipeoutEngine] 📊 Stats: ${correctCount} correct, ${incorrectCount} incorrect, ${noAnswerCount} no answer`);
  }
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

// Helper functions
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

// ✅ NEW: Export helper functions for use by handlers
 export { 
  sendHostActivityNotification, 
  calculateAndSendRoundStats, 
 
 
 };










