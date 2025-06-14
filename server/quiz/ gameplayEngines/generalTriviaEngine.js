// generalTriviaEngine.js

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

  const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;
  let questions = loadQuestionsForRoundType(roundType);
  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const questionsPerRound = roundConfig?.questionsPerRound || 6;

  questions = shuffleArray(questions).slice(0, questionsPerRound);
  console.log(`[generalTriviaEngine] 🔎 Loaded ${questions.length} randomized questions for ${roundType}`);

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
  const timeLimit = roundConfig?.timePerQuestion || 25;
  const questionStartTime = Date.now();

  namespace.to(roomId).emit('question', {
    id: nextQuestion.id,
    text: nextQuestion.text,
    options: Array.isArray(nextQuestion.options) ? nextQuestion.options : [],
    timeLimit,
    questionStartTime
  });

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
    console.log(`[generalTriviaEngine] ❄️ Freeze is for question index ${playerData.frozenForQuestionIndex}`);
    return;
  } else {
    console.log(`[generalTriviaEngine] ✅ Player ${playerId} is NOT frozen, processing answer`);
  }

  const isCorrect = (answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase());

  const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
  const pointsPerQuestion = roundConfig?.pointsPerQuestion || 1;

  if (isCorrect) {
    playerData.score = (playerData.score || 0) + pointsPerQuestion;
  }

  playerData.answers[question.id] = { submitted: answer, correct: isCorrect };

  if (debug) {
    console.log(`[generalTriviaEngine] 📝 Answer from ${playerId}: ${answer} (${isCorrect ? 'Correct' : 'Wrong'})`);
    console.log(`[generalTriviaEngine] 🔍 Player ${playerId} freeze status: frozenNextQuestion=${playerData.frozenNextQuestion}, frozenForQuestionIndex=${playerData.frozenForQuestionIndex}, currentQ=${room.currentQuestionIndex}`);
  }
}

export function emitNextReviewQuestion(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const reviewIndex = room.currentReviewIndex || 0;
  if (reviewIndex >= room.questions.length) {
    if (debug) console.log(`[generalTriviaEngine] ✅ Review complete`);
    room.currentPhase = 'leaderboard';
    namespace.to(roomId).emit('leaderboard', buildLeaderboard(room));
    emitRoomState(namespace, roomId);
    return;
  }

  const question = room.questions[reviewIndex];
  room.players.forEach(player => {
    const playerData = room.playerData[player.id];
    const answerData = playerData?.answers?.[question.id] || {};
    const submittedAnswer = answerData.submitted || null;

    const socket = namespace.sockets.get(player.socketId);
    if (socket) {
      socket.emit('review_question', {
        id: question.id,
        text: question.text,
        options: Array.isArray(question.options) ? question.options : [],
        correctAnswer: question.correctAnswer,
        submittedAnswer
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

function buildLeaderboard(room) {
  const leaderboard = Object.entries(room.playerData).map(([playerId, data]) => {
    const player = room.players.find(p => p.id === playerId);
    return {
      id: playerId,
      name: player?.name || playerId,
      score: data.score || 0
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









