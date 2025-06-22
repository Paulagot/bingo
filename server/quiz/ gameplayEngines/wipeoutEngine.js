// wipeoutEngine.js

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

  const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;
  let questions = loadQuestionsForRoundType(roundType);
  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const questionsPerRound = roundConfig?.config?.questionsPerRound || 6;

  questions = shuffleArray(questions).slice(0, questionsPerRound);
  console.log(`[wipeoutEngine] 🔎 Loaded ${questions.length} randomized questions for ${roundType}`);

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

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1]?.config || {};
  const pointsPerQuestion = roundConfig.pointsPerQuestion || 1;
  const pointsLostPerWrong = roundConfig.pointsLostPerWrong || 0;

  if (isCorrect) {
    playerData.score = (playerData.score || 0) + pointsPerQuestion;
    if (debug) console.log(`[wipeoutEngine] ✅ ${playerId} got it right (+${pointsPerQuestion}), score: ${playerData.score}`);
  } else {
    playerData.score = (playerData.score || 0) - pointsLostPerWrong;
    if (playerData.score < 0) playerData.score = 0;
    if (debug) console.log(`[wipeoutEngine] ❌ ${playerId} got it wrong (-${pointsLostPerWrong}), score: ${playerData.score}`);
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
  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[wipeoutEngine] ✅ Review complete`);
    room.currentPhase = 'leaderboard';
    namespace.to(roomId).emit('leaderboard', buildLeaderboard(room));
    emitRoomState(namespace, roomId);
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

function buildLeaderboard(room) {
  const leaderboard = Object.entries(room.playerData).map(([playerId, data]) => {
    const player = room.players.find(p => p.id === playerId);
    return {
      id: playerId,
      name: player?.name || playerId,
      score: data.score || 0,
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










