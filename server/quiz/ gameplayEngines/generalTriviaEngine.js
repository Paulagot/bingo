// generalTriviaEngine.js - Updated with complete host notification support

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
    console.log(`[generalTriviaEngine] 📡 Host notified: ${activityData.playerName} used ${activityData.type}`);
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
    console.log(`[generalTriviaEngine] 📊 Round stats sent to host:`, roundStats);
  }

  return roundStats;
}

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
    questionNumber: room.currentQuestionIndex + 1,
    totalQuestions: room.questions.length
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

export function handlePlayerAnswer(roomId, playerId, answer, namespace) {
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

  // ✅ REMOVED: Hint notification moved to when hint is actually used (in quizRoomManager.js)

  if (debug) {
    console.log(`[generalTriviaEngine] 📝 Answer from ${playerId}: ${answer} (${isCorrect ? 'Correct' : 'Wrong'})`);
    console.log(`[generalTriviaEngine] 🔍 Player ${playerId} freeze status: frozenNextQuestion=${playerData.frozenNextQuestion}, frozenForQuestionIndex=${playerData.frozenForQuestionIndex}, currentQ=${room.currentQuestionIndex}`);
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

// Updated emitNextReviewQuestion function
export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const reviewIndex = room.currentReviewIndex || 0;
  
  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[generalTriviaEngine] ✅ Review complete - waiting for host to show results`);
    
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
      console.log(`[generalTriviaEngine] 📈 Final round ${room.currentRound} stats sent to host`);
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
    console.log(`[generalTriviaEngine] 🔍 Reviewing question ${reviewIndex + 1}/${room.questions.length}`);
    console.log(`[generalTriviaEngine] 📊 Stats: ${correctCount} correct, ${incorrectCount} incorrect, ${noAnswerCount} no answer`);
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

  console.log('[Leaderboard] Final scores:', leaderboard);
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

// ✅ NEW: Export helper functions for use by handlers
export { 
  sendHostActivityNotification, 
  calculateAndSendRoundStats, 

};








