// generalTriviaEngine.js - Centralized scoring + pointsDelta + complete host notification support

import {
  getQuizRoom,
  loadQuestionsForRoundType,
  setQuestionsForCurrentRound,
  advanceToNextQuestion,
  resetRoundExtrasTracking,
  getCurrentQuestion,
  emitRoomState
} from '../quizRoomManager.js';

// ✅ Centralized scoring (1/2/3 defaults; no penalties for General Trivia)
import { getRoundScoring } from '../handlers/scoringUtils.js';

let timers = {}; // per-room timer refs
const debug = false;

// ✅ Host activity notification
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

// ✅ Round stats to host
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

  Object.entries(room.playerData).forEach(([playerId, playerData]) => {
    const player = room.players.find(p => p.id === playerId);
    const playerName = player?.name || playerId;

    if (!roundStats.extrasByPlayer[playerName]) {
      roundStats.extrasByPlayer[playerName] = [];
    }

    if (playerData.usedExtrasThisRound) {
      Object.entries(playerData.usedExtrasThisRound).forEach(([extraId, used]) => {
        if (used) {
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({ extraId, timestamp: Date.now() });

          switch (extraId) {
            case 'buyHint': roundStats.hintsUsed++; break;
            case 'freezeOutTeam': roundStats.freezesUsed++; break;
            case 'robPoints': roundStats.pointsRobbed++; break;
            case 'restorePoints': roundStats.pointsRestored++; break;
          }
        }
      });
    }

    if (playerData.usedExtras) {
      if (playerData.usedExtras.robPoints) {
        roundStats.pointsRobbed++;
        if (!roundStats.extrasByPlayer[playerName].some(e => e.extraId === 'robPoints')) {
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({ extraId: 'robPoints', timestamp: Date.now() });
        }
      }
      if (playerData.pointsRestored > 0) {
        roundStats.pointsRestored += playerData.pointsRestored;
        if (!roundStats.extrasByPlayer[playerName].some(e => e.extraId === 'restorePoints')) {
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({ extraId: 'restorePoints', timestamp: Date.now() });
        }
      }
    }
  });

  namespace.to(`${roomId}:host`).emit('host_current_round_stats', roundStats);
  if (debug) console.log(`[generalTriviaEngine] 📊 Round stats sent to host:`, roundStats);
  return roundStats;
}

export function initRound(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const roundDef = room.config.roundDefinitions?.[room.currentRound - 1];
  const roundType = roundDef?.roundType;
  const questionsPerRound = roundDef?.config?.questionsPerRound || 6;

  const desiredCategory = roundDef?.category;
  const desiredDifficulty = roundDef?.difficulty;

  if (debug) {
    console.log(`[generalTriviaEngine] 🔍 Loading questions for round ${room.currentRound}`);
    console.log(`[generalTriviaEngine] 📋 Type: ${roundType}, Category: ${desiredCategory}, Difficulty: ${desiredDifficulty}`);
    console.log(`[generalTriviaEngine] 🎯 Need: ${questionsPerRound} questions`);
  }

  let allQuestions = loadQuestionsForRoundType(roundType, desiredCategory, desiredDifficulty, questionsPerRound);

  if (allQuestions.length < questionsPerRound) {
    console.warn(`[generalTriviaEngine] ⚠️ Only found ${allQuestions.length} with category+difficulty; trying difficulty-only.`);
    allQuestions = loadQuestionsForRoundType(roundType, null, desiredDifficulty, questionsPerRound);
  }
  if (allQuestions.length < questionsPerRound) {
    console.warn(`[generalTriviaEngine] ⚠️ Still not enough (${allQuestions.length}). Using unfiltered questions.`);
    allQuestions = loadQuestionsForRoundType(roundType);
  }

  const selectedQuestions = shuffleArray(allQuestions).slice(0, questionsPerRound);

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

  setQuestionsForCurrentRound(roomId, selectedQuestions);
  resetRoundExtrasTracking(roomId);

  Object.values(room.playerData).forEach(playerData => {
    playerData.usedExtrasThisRound = {};
  });

  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';

  calculateAndSendRoundStats(roomId, namespace);
  startNextQuestion(roomId, namespace);
  return true;
}

export function startNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  // Advance first, then clear freezes
  const nextQuestion = advanceToNextQuestion(roomId);
  clearExpiredFreezeFlags(room);

  // ✅ CLOSE PREVIOUS QUESTION (record no-answer ONCE; NO penalties in General Trivia)
  if (room.currentQuestionIndex >= 0 && room.questions[room.currentQuestionIndex - 1]) {
    const prev = room.questions[room.currentQuestionIndex - 1];
    const keyFor = (pid) => `${prev.id}_round${room.currentRound}`;

    room.players.forEach(p => {
      const pd = room.playerData[p.id];
      if (!pd) return;

      if (pd.answers[keyFor(p.id)] === undefined) {
        // auto-finalize as no-answer with zero delta
        pd.answers[keyFor(p.id)] = { submitted: null, correct: false, noAnswer: true, pointsDelta: 0, finalized: true };
      } else {
        // if client marked noAnswer earlier, make sure pointsDelta is present and finalize
        if (pd.answers[keyFor(p.id)].noAnswer && typeof pd.answers[keyFor(p.id)].pointsDelta !== 'number') {
          pd.answers[keyFor(p.id)].pointsDelta = 0;
        }
        pd.answers[keyFor(p.id)].finalized = true;
      }
    });
  }

  // If that was the last question, go to review
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

  if (timeLimit >= 3) {
    setTimeout(() => {
      namespace.to(roomId).emit('countdown_effect', { secondsLeft: 3, color: 'green', message: '3...' });
    }, (timeLimit - 3) * 1000);
    setTimeout(() => {
      namespace.to(roomId).emit('countdown_effect', { secondsLeft: 2, color: 'orange', message: '2...' });
    }, (timeLimit - 2) * 1000);
    setTimeout(() => {
      namespace.to(roomId).emit('countdown_effect', { secondsLeft: 1, color: 'red', message: '1...' });
    }, (timeLimit - 1) * 1000);
  }

  // Notify frozen players
  room.players.forEach(player => {
    const pdata = room.playerData[player.id];
    if (pdata?.frozenNextQuestion && pdata.frozenForQuestionIndex === room.currentQuestionIndex) {
      const socket = namespace.sockets.get(player.socketId);
      if (socket) {
        socket.emit('freeze_notice', {
          frozenBy: pdata.frozenBy,
          frozenForQuestionIndex: pdata.frozenForQuestionIndex,
        });
        if (debug) {
          console.log(`[generalTriviaEngine] ❄️ Notified ${player.id} frozen for question index ${room.currentQuestionIndex}`);
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

export function handlePlayerAnswer(roomId, playerId, payload, namespace) {
  const room = getQuizRoom(roomId);
  const question = getCurrentQuestion(roomId);
  if (!room || !question) return;

  // Normalize payload: support strings, { answer }, or { questionId, answer }
  const norm = (typeof payload === 'object' && payload !== null)
    ? payload
    : { answer: payload };

  const questionId = norm.questionId ?? question.id; // default to current question
  const answer = norm.answer;

  // Only accept answers for the currently active question
  if (question.id !== questionId) return;

  const playerData = room.playerData[playerId];
  if (!playerData) return;

  // frozen? then ignore
  if (playerData.frozenNextQuestion && room.currentQuestionIndex === playerData.frozenForQuestionIndex) return;

  // ✅ Centralized scoring (ensures 1/2/3 defaults; no penalties here)
  const scoring = getRoundScoring(room, room.currentRound - 1);
  const qDifficulty = (question.difficulty || 'medium').toLowerCase();

  const key = `${question.id}_round${room.currentRound}`;
  if (playerData.answers[key]) return; // already answered

  // Explicit no-answer (timeout)
  if (answer == null || answer === '') {
    playerData.answers[key] = { submitted: null, correct: false, noAnswer: true, pointsDelta: 0, finalized: true };
    return;
  }

  const isCorrect =
    String(answer).trim().toLowerCase() ===
    String(question.correctAnswer).trim().toLowerCase();

 if (isCorrect) {
  const pts = scoring.pointsPerDifficulty[qDifficulty] ?? scoring.pointsPerDifficulty.medium ?? 2;

  // 👉 NEW: debt-first settlement of current round earnings
  const currentDebt = Math.max(0, playerData.penaltyDebt || 0);
  const paidDebt = Math.min(currentDebt, pts);
  const netToScore = pts - paidDebt;

  if (paidDebt > 0) {
    playerData.penaltyDebt = currentDebt - paidDebt; // reduce outstanding debt
  }
  if (netToScore > 0) {
    playerData.score = (playerData.score || 0) + netToScore; // only net goes to score
  }

  playerData.answers[key] = {
    submitted: answer,
    correct: true,
    pointsDelta: netToScore,   // 👈 leaderboard shows what actually hit score
    paidDebt,                  // (optional) nice to keep for debugging/host UI
    finalized: true
  };

  if (debug) {
    console.log(`[generalTriviaEngine] ✅ ${playerId} correct: raw=${pts}, paidDebt=${paidDebt}, +score=${netToScore}, remainingDebt=${playerData.penaltyDebt || 0}`);
  }
} else {
  // General Trivia: no new penalties
  playerData.answers[key] = { submitted: answer, correct: false, pointsDelta: 0, finalized: true };
}

}

// Review flow (unchanged except for stats payload)
export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const reviewIndex = room.currentReviewIndex || 0;
  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[generalTriviaEngine] ✅ Review complete - waiting for host to show results`);
    room.currentPhase = 'reviewing';
    emitRoomState(namespace, roomId);

    const finalRoundStats = calculateAndSendRoundStats(roomId, namespace);
    namespace.to(`${roomId}:host`).emit('host_round_stats', finalRoundStats);

    namespace.to(`${roomId}:host`).emit('review_complete', {
      message: 'All questions reviewed. You can now show round results.',
      roundNumber: room.currentRound,
      totalQuestions: room.questions.length
    });
    if (debug) console.log(`[generalTriviaEngine] 📈 Final round stats sent to host`);
    return;
  }

  const question = room.questions[reviewIndex];
  const roundAnswerKey = `${question.id}_round${room.currentRound}`;

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
        questionNumber: reviewIndex + 1,
        totalQuestions: room.questions.length,
        currentRound: room.currentRound,
        totalRounds: room.config.roundDefinitions?.length || 1
      });
    }
  });

  namespace.to(`${roomId}:host`).emit('host_review_question', {
    id: question.id,
    text: question.text,
    options: Array.isArray(question.options) ? question.options : [],
    correctAnswer: question.correctAnswer,
    difficulty: question.difficulty,
    category: question.category,
    questionNumber: reviewIndex + 1,
    totalQuestions: room.questions.length,
    currentRound: room.currentRound,
    totalRounds: room.config.roundDefinitions?.length || 1,
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

// Leaderboard helper
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

  if (debug) console.log('[Leaderboard] Final scores:', leaderboard);
  leaderboard.sort((a, b) => b.score - a.score);
  return leaderboard;
}

// State recovery helpers
export function getCurrentReviewQuestion(roomId) {
  const room = getQuizRoom(roomId);
  if (!room || !room.questions || room.currentReviewIndex === undefined) {
    console.warn(`[Engine] ⚠️ getCurrentReviewQuestion: No room or review data for ${roomId}`);
    return null;
  }
  if (room.currentReviewIndex >= room.questions.length) {
    if (debug) console.log(`[Engine] ✅ getCurrentReviewQuestion: Review complete for ${roomId}`);
    return null;
  }
  const reviewQuestion = room.questions[room.currentReviewIndex];
  if (debug) console.log(`[Engine] 📖 getCurrentReviewQuestion: Returning question ${room.currentReviewIndex} for ${roomId}`);
  return reviewQuestion;
}

export function isReviewComplete(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return false;
  const reviewComplete = room.currentReviewIndex >= room.questions.length;
  if (debug) console.log(`[Engine] 🔍 isReviewComplete for ${roomId}: ${reviewComplete} (reviewIndex: ${room.currentReviewIndex}, totalQuestions: ${room.questions.length})`);
  return reviewComplete;
}

// Helpers
function shuffleArray(array) {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function clearExpiredFreezeFlags(room) {
  if (debug) console.log(`[generalTriviaEngine] 🔍 clearExpiredFreezeFlags called, currentQuestionIndex: ${room.currentQuestionIndex}`);
  for (const playerId in room.playerData) {
    const p = room.playerData[playerId];
    if (p.frozenNextQuestion && room.currentQuestionIndex > p.frozenForQuestionIndex) {
      if (debug) console.log(`[generalTriviaEngine] 🧼 Clearing expired freeze for ${playerId} (was frozen for question ${p.frozenForQuestionIndex})`);
      p.frozenNextQuestion = false;
      p.frozenForQuestionIndex = null;
    }
  }
}

// Exports for handlers
export { 
  sendHostActivityNotification, 
  calculateAndSendRoundStats, 
};











