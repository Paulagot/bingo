// wipeoutEngine.js - Debt model + centralized scoring + pointsDelta + host notifications

import {
  getQuizRoom,
  loadQuestionsForRoundType,
  setQuestionsForCurrentRound,
  advanceToNextQuestion,
  resetRoundExtrasTracking,
  getCurrentQuestion,
  emitRoomState,
} from '../quizRoomManager.js';

// Centralized scoring (per-round config + defaults)
import { getRoundScoring } from '../handlers/scoringUtils.js';

let timers = {}; // per-room timer refs
const debug = true;

/* ------------------------ Host notifications ------------------------ */
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

/* ----------------------- Round stats to host ------------------------ */
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

    // Per-round extras
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

    // Leaderboard-phase extras (global)
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
  if (debug) console.log(`[wipeoutEngine] 📊 Round stats sent to host:`, roundStats);
  return roundStats;
}

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

  if (debug) {
    console.log(`[wipeoutEngine] 🔍 Loading questions for round ${room.currentRound}`);
    console.log(`[wipeoutEngine] 📋 Type: ${roundType}, Category: ${desiredCategory}, Difficulty: ${desiredDifficulty}`);
    console.log(`[wipeoutEngine] 🎯 Need: ${questionsPerRound} questions`);
  }

  // Load w/ filters + fallbacks
  let questions = loadQuestionsForRoundType(roundType, desiredCategory, desiredDifficulty, questionsPerRound);
  if (questions.length < questionsPerRound) {
    console.warn(`[wipeoutEngine] ⚠️ Only found ${questions.length} with category+difficulty; trying difficulty-only.`);
    questions = loadQuestionsForRoundType(roundType, null, desiredDifficulty, questionsPerRound);
  }
  if (questions.length < questionsPerRound) {
    console.warn(`[wipeoutEngine] ⚠️ Still not enough (${questions.length}). Using unfiltered questions.`);
    questions = loadQuestionsForRoundType(roundType);
  }

  questions = shuffleArray(questions).slice(0, questionsPerRound);

  if (debug) {
    console.log(`[wipeoutEngine] ✅ Selected ${questions.length} questions for round ${room.currentRound}`);
    const actualBreakdown = questions.reduce((acc, q) => {
      const cat = q.category || 'unknown';
      const diff = q.difficulty || 'unknown';
      const key = `${cat}/${diff}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log(`[wipeoutEngine] 📊 Selected question breakdown:`, actualBreakdown);
  }

  setQuestionsForCurrentRound(roomId, questions);
  resetRoundExtrasTracking(roomId);

  // ✅ Reset per-round extras tracking AND per-round penalty debt
  Object.values(room.playerData).forEach(pd => {
    pd.usedExtrasThisRound = {};
    // pd.penaltyDebt = 0; // <-- debt is per round
  });

  room.currentQuestionIndex = -1;
  room.currentPhase = 'asking';

  calculateAndSendRoundStats(roomId, namespace);
  startNextQuestion(roomId, namespace);
  return true;
}

/* -------------------------- Next question -------------------------- */
export function startNextQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const nextQuestion = advanceToNextQuestion(roomId);
  clearExpiredFreezeFlags(room);

  // ✅ Finalize previous question:
  //    - If player never answered → write noAnswer record and add NO-ANSWER DEBT once
  //    - If player answered with noAnswer earlier → add debt here (once), then finalize
  if (room.currentQuestionIndex >= 0 && room.questions[room.currentQuestionIndex - 1]) {
    const prev = room.questions[room.currentQuestionIndex - 1];
    const scoring = getRoundScoring(room, room.currentRound - 1);
    const keyFor = (pid) => `${prev.id}_round${room.currentRound}`;

    room.players.forEach(p => {
      const pd = room.playerData[p.id];
      if (!pd) return;

      let rec = pd.answers[keyFor(p.id)];

      const needToAddNoAnswerDebt =
        (!rec) || (rec && rec.noAnswer && !rec.finalized);

      if (needToAddNoAnswerDebt) {
        // ensure record exists
        if (!rec) {
          rec = { submitted: null, correct: false, noAnswer: true };
          pd.answers[keyFor(p.id)] = rec;
        }
        // add no-answer debt (no immediate score change)
        const penalty = Math.max(0, scoring.pointsLostPerUnanswered || 0);
        pd.penaltyDebt = Math.max(0, (pd.penaltyDebt || 0) + penalty);

        // finalize record with zero delta (no score impact now)
        rec.pointsDelta = 0;
        rec.finalized = true;

        if (debug && penalty > 0) {
          console.log(`[wipeoutEngine] 🧾 No-answer debt +${penalty} for ${p.name} on ${prev.id}; total debt=${pd.penaltyDebt}`);
        }
      } else if (rec && !rec.finalized) {
        // just finalize if needed
        if (typeof rec.pointsDelta !== 'number') rec.pointsDelta = 0;
        rec.finalized = true;
      }
    });
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

  // Countdown effects
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
          message: `You are frozen for this question!`
        });
        if (debug) console.log(`[wipeoutEngine] ❄️ Notified ${player.id} they are frozen for question index ${room.currentQuestionIndex}`);
      }
    }
  });

  if (debug) {
    console.log(
      `[wipeoutEngine] ▶ Sent question: ${nextQuestion.id} (Q#${room.currentQuestionIndex}, timeLimit: ${timeLimit}s, startTime: ${questionStartTime})`
    );
  }

  clearTimeout(timers[roomId]);
  timers[roomId] = setTimeout(() => {
    startNextQuestion(roomId, namespace);
  }, timeLimit * 1000);
}

/* ------------------------- Handle an answer ------------------------- */
export function handlePlayerAnswer(roomId, playerId, payload, namespace) {
  const room = getQuizRoom(roomId);
  const question = getCurrentQuestion(roomId);
  if (!room || !question) return;

  // Normalize payload
  const norm = (typeof payload === 'object' && payload !== null) ? payload : { answer: payload };
  const questionId = norm.questionId ?? question.id;
  const answer = norm.answer;

  // Only accept for active question
  if (question.id !== questionId) return;

  const pd = room.playerData[playerId];
  if (!pd) return;

  // Frozen players cannot answer
  if (pd.frozenNextQuestion && room.currentQuestionIndex === pd.frozenForQuestionIndex) return;

  const scoring = getRoundScoring(room, room.currentRound - 1);
  const qDifficulty = (question.difficulty || 'medium').toLowerCase();

  const key = `${question.id}_round${room.currentRound}`;
  if (pd.answers[key]) return; // already answered

  // Explicit no-answer (timeout clicked/auto)
  if (answer == null || answer === '') {
    // Record as no-answer now; debt is added at finalize sweep (once)
    pd.answers[key] = { submitted: null, correct: false, noAnswer: true, pointsDelta: 0, finalized: false };
    return;
  }

  const isCorrect =
    String(answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();

  if (isCorrect) {
    const rawPts =
      scoring.pointsPerDifficulty[qDifficulty] ??
      scoring.pointsPerDifficulty.medium ??
      2;

    const currentDebt = Math.max(0, pd.penaltyDebt || 0);
    const payDebt = Math.min(currentDebt, rawPts);
    const addToScore = rawPts - payDebt;

    // Pay debt first
    pd.penaltyDebt = currentDebt - payDebt;

    // Then add whatever remains to score
    if (addToScore > 0) {
      pd.score = (pd.score || 0) + addToScore;
    }

    pd.answers[key] = {
      submitted: answer,
      correct: true,
      pointsDelta: addToScore, // net that actually hit the score
      finalized: true
    };

    if (debug) {
      console.log(`[wipeoutEngine] ✅ ${playerId} correct: raw=${rawPts}, paidDebt=${payDebt}, +score=${addToScore}, remainingDebt=${pd.penaltyDebt}`);
    }
  } else {
    // Wrong answer → add debt now; no immediate score change
    const penalty = Math.max(0, scoring.pointsLostPerWrong || 0);
    pd.penaltyDebt = Math.max(0, (pd.penaltyDebt || 0) + penalty);

    pd.answers[key] = {
      submitted: answer,
      correct: false,
      pointsDelta: 0, // no score change now
      finalized: true
    };

    if (debug && penalty > 0) {
      console.log(`[wipeoutEngine] ❌ ${playerId} wrong: +debt=${penalty}, totalDebt=${pd.penaltyDebt}`);
    }
  }
}

/* --------------------------- Extras helpers ------------------------ */
export function handleFreezeExtra(roomId, playerId, targetPlayerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const player = room.players.find(p => p.id === playerId);
  const targetPlayer = room.players.find(p => p.id === targetPlayerId);
  if (!player || !targetPlayer) {
    return { success: false, error: 'Player not found' };
  }

  const targetData = room.playerData[targetPlayerId];
  if (targetData) {
    targetData.frozenNextQuestion = true;
    targetData.frozenForQuestionIndex = room.currentQuestionIndex + 1;
    targetData.frozenBy = player.name;
  }

  sendHostActivityNotification(namespace, roomId, {
    type: 'freeze',
    playerName: player.name,
    targetName: targetPlayer.name,
    context: 'Next Question',
    round: room.currentRound
  });

  calculateAndSendRoundStats(roomId, namespace);
  return { success: true };
}

export function handleHintExtra(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return { success: false, error: 'Room not found' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { success: false, error: 'Player not found' };

  sendHostActivityNotification(namespace, roomId, {
    type: 'hint',
    playerName: player.name,
    context: `Q${room.currentQuestionIndex + 1}`,
    round: room.currentRound,
    questionNumber: room.currentQuestionIndex + 1
  });

  calculateAndSendRoundStats(roomId, namespace);
  return { success: true };
}

/* ------------------------------ Review ----------------------------- */
export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const reviewIndex = room.currentReviewIndex || 0;

  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[wipeoutEngine] ✅ Review complete - waiting for host to show results`);

    room.currentPhase = 'reviewing';
    emitRoomState(namespace, roomId);

    const finalRoundStats = calculateAndSendRoundStats(roomId, namespace);
    namespace.to(`${roomId}:host`).emit('host_round_stats', finalRoundStats);

    namespace.to(`${roomId}:host`).emit('review_complete', {
      message: 'All questions reviewed. You can now show round results.',
      roundNumber: room.currentRound,
      totalQuestions: room.questions.length
    });

    if (debug) console.log(`[wipeoutEngine] 📈 Final round ${room.currentRound} stats sent to host`);
    return;
  }

  const question = room.questions[reviewIndex];
  const roundAnswerKey = `${question.id}_round${room.currentRound}`;

  // Per-question stats
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

  // Player review
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

  // Host review w/ stats
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
    console.log(`[wipeoutEngine] 🔍 Reviewing question ${reviewIndex + 1}/${room.questions.length}`);
    console.log(`[wipeoutEngine] 📊 Stats: ${correctCount} correct, ${incorrectCount} incorrect, ${noAnswerCount} no answer`);
  }
}

/* -------------------------- Leaderboard util ------------------------ */
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

/* ------------------------ State recovery utils --------------------- */
export function getCurrentReviewQuestion(roomId) {
  const room = getQuizRoom(roomId);
  if (!room || !room.questions || room.currentReviewIndex === undefined) {
    console.warn(`[Engine] ⚠️ getCurrentReviewQuestion: No room or review data for ${roomId}`);
    return null;
  }
  if (room.currentReviewIndex >= room.questions.length) {
    console.log(`[Engine] ✅ getCurrentReviewQuestion: Review complete for ${roomId}`);
    return null;
  }
  const reviewQuestion = room.questions[room.currentReviewIndex];
  console.log(`[Engine] 📖 getCurrentReviewQuestion: Returning question ${room.currentReviewIndex} for ${roomId}`);
  return reviewQuestion;
}

export function isReviewComplete(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const reviewComplete = room.currentReviewIndex >= room.questions.length;
  console.log(`[Engine] 🔍 isReviewComplete for ${roomId}: ${reviewComplete} (reviewIndex: ${room.currentReviewIndex}, totalQuestions: ${room.questions.length})`);
  return reviewComplete;
}

/* ------------------------------- Helpers --------------------------- */
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
      if (debug) console.log(`[wipeoutEngine] 🧼 Cleared freeze for ${playerId}`);
    }
  }
}

/* ------------------------ Exports for handlers --------------------- */
export {
  sendHostActivityNotification,
  calculateAndSendRoundStats,
};















