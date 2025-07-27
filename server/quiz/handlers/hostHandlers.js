import {
  createQuizRoom,
  getQuizRoom,
  getCurrentRound,
  getTotalRounds,
  resetRoundExtrasTracking,
  startNextRound,
  removeQuizRoom,
  emitRoomState
} from '../quizRoomManager.js';

import { getEngine } from '../ gameplayEngines/gameplayEngineRouter.js';
import { isRateLimited } from '../../socketRateLimiter.js';

const debug = true;

export function setupHostHandlers(socket, namespace) {

  function emitFullRoomState(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return;
    namespace.to(roomId).emit('room_config', room.config);
    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  }

  // ✅ NEW: Calculate round-specific leaderboard scores
  function calculateRoundLeaderboard(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) {
      console.error(`[RoundLeaderboard] ❌ Room not found: ${roomId}`);
      return [];
    }

    const currentRoundIndex = room.currentRound - 1;
    const roundConfig = room.config.roundDefinitions?.[currentRoundIndex];
    if (!roundConfig) {
      console.error(`[RoundLeaderboard] ❌ Round config not found for round ${room.currentRound}`);
      return [];
    }

    const questionsPerRound = roundConfig.config.questionsPerRound || 6;
    const roundLeaderboard = [];

    if (debug) {
      console.log(`[RoundLeaderboard] 📊 Calculating for Round ${room.currentRound}`);
      console.log(`[RoundLeaderboard] 📝 Questions per round: ${questionsPerRound}`);
      console.log(`[RoundLeaderboard] 🎯 Current question index: ${room.currentQuestionIndex}`);
    }

    // Calculate round scores for each player
    for (const player of room.players) {
      const playerData = room.playerData[player.id];
      if (!playerData) {
        console.warn(`[RoundLeaderboard] ⚠️ No data found for player ${player.id}`);
        continue;
      }

      let roundScore = 0;
      let questionsAnsweredThisRound = 0;

      // Look through all questions to find ones from current round
      for (let questionIndex = 0; questionIndex < room.questions.length; questionIndex++) {
        const question = room.questions[questionIndex];
        if (!question) continue;

        const roundAnswerKey = `${question.id}_round${room.currentRound}`;
        const playerAnswer = playerData.answers?.[roundAnswerKey];

        if (playerAnswer) {
          questionsAnsweredThisRound++;
          
          // Calculate points for this question based on round config
          const difficulty = question.difficulty || 'medium';
          const pointsPerDifficulty = roundConfig.config.pointsPerDifficulty || { easy: 1, medium: 2, hard: 3 };
          const pointsLostPerWrong = roundConfig.config.pointsLostPerWrong || 0;
          const pointsLostPerNoAnswer = roundConfig.config.pointslostperunanswered || 0;

          if (playerAnswer.submitted === null || playerAnswer.submitted === undefined) {
            // No answer submitted
            roundScore -= pointsLostPerNoAnswer;
            if (debug) console.log(`[RoundLeaderboard] 📝 ${player.name}: Q${questionIndex + 1} no answer (-${pointsLostPerNoAnswer})`);
          } else if (playerAnswer.correct) {
            // Correct answer
            const points = pointsPerDifficulty[difficulty] || 2;
            roundScore += points;
            if (debug) console.log(`[RoundLeaderboard] ✅ ${player.name}: Q${questionIndex + 1} correct (+${points})`);
          } else {
            // Wrong answer
            roundScore -= pointsLostPerWrong;
            if (debug) console.log(`[RoundLeaderboard] ❌ ${player.name}: Q${questionIndex + 1} wrong (-${pointsLostPerWrong})`);
          }
        }
      }

      roundLeaderboard.push({
        id: player.id,
        name: player.name,
        score: roundScore,
        cumulativeNegativePoints: playerData.cumulativeNegativePoints || 0,
        pointsRestored: playerData.pointsRestored || 0
      });

      if (debug) {
        console.log(`[RoundLeaderboard] 🎯 ${player.name}: Round ${room.currentRound} score = ${roundScore} (answered ${questionsAnsweredThisRound} questions)`);
      }
    }

    // Sort by score (highest first)
    roundLeaderboard.sort((a, b) => b.score - a.score);

    if (debug) {
      console.log(`[RoundLeaderboard] 🏆 Final Round ${room.currentRound} Rankings:`);
      roundLeaderboard.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.name}: ${entry.score} points`);
      });
    }

    return roundLeaderboard;
  }

  // ✅ NEW: Calculate overall cumulative leaderboard
  function calculateOverallLeaderboard(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) {
      console.error(`[OverallLeaderboard] ❌ Room not found: ${roomId}`);
      return [];
    }

    const overallLeaderboard = [];

    // Calculate cumulative scores for each player
    for (const player of room.players) {
      const playerData = room.playerData[player.id];
      if (!playerData) {
        console.warn(`[OverallLeaderboard] ⚠️ No data found for player ${player.id}`);
        continue;
      }

      overallLeaderboard.push({
        id: player.id,
        name: player.name,
        score: playerData.score || 0,
        cumulativeNegativePoints: playerData.cumulativeNegativePoints || 0,
        pointsRestored: playerData.pointsRestored || 0
      });
    }

    // Sort by score (highest first)
    overallLeaderboard.sort((a, b) => b.score - a.score);

    if (debug) {
      console.log(`[OverallLeaderboard] 🏆 Overall Rankings through Round ${room.currentRound}:`);
      overallLeaderboard.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.name}: ${entry.score} points total`);
      });
    }

    return overallLeaderboard;
  }

  // Add this function after your calculateOverallLeaderboard function in hostHandlers.js

// ✅ NEW: Calculate and send final quiz statistics
function calculateAndSendFinalStats(roomId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) {
    console.error(`[FinalStats] ❌ Room not found: ${roomId}`);
    return;
  }

  const finalStats = [];

  // Calculate stats for each completed round
  for (let roundIndex = 0; roundIndex < room.config.roundDefinitions.length; roundIndex++) {
    const roundNumber = roundIndex + 1;
    const roundConfig = room.config.roundDefinitions[roundIndex];
    
    if (!roundConfig) continue;

    // Initialize round stats
    const roundStats = {
      roundNumber,
      roundType: roundConfig.roundType,
      hintsUsed: 0,
      freezesUsed: 0,
      pointsRobbed: 0,
      pointsRestored: 0,
      extrasByPlayer: {},
      questionsWithExtras: 0,
      totalExtrasUsed: 0,
      questionsAnswered: 0,
      totalQuestions: roundConfig.config.questionsPerRound || 6,
      correctAnswers: 0,
      wrongAnswers: 0,
      noAnswers: 0
    };

    // Initialize player stats
    room.players.forEach(player => {
      roundStats.extrasByPlayer[player.name] = [];
    });

    // Count questions and answers for this round
    let roundQuestionCount = 0;
    
    for (const question of room.questions || []) {
      // Check if this question belongs to this round
      // We'll count questions sequentially by round
      const questionsPerRound = roundConfig.config.questionsPerRound || 6;
      const questionRoundNumber = Math.floor(roundQuestionCount / questionsPerRound) + 1;
      
      if (questionRoundNumber === roundNumber) {
        roundStats.questionsAnswered++;
        
        // Analyze player answers for this question
        room.players.forEach(player => {
          const playerData = room.playerData[player.id];
          const roundAnswerKey = `${question.id}_round${roundNumber}`;
          const playerAnswer = playerData?.answers?.[roundAnswerKey];
          
          if (!playerAnswer || playerAnswer.submitted === null || playerAnswer.submitted === undefined) {
            roundStats.noAnswers++;
          } else if (playerAnswer.correct) {
            roundStats.correctAnswers++;
          } else {
            roundStats.wrongAnswers++;
          }
        });
      }
      
      roundQuestionCount++;
    }

    // Count extras used in this round (from player data)
    room.players.forEach(player => {
      const playerData = room.playerData[player.id];
      const playerName = player.name;
      
      // Count from usedExtras (global extras used during this round)
      if (playerData.usedExtras) {
        if (playerData.usedExtras.robPoints) {
          roundStats.pointsRobbed++;
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({
            extraId: 'robPoints',
            timestamp: Date.now()
          });
        }
        
        if (playerData.pointsRestored > 0) {
          roundStats.pointsRestored += playerData.pointsRestored;
          roundStats.totalExtrasUsed++;
          roundStats.extrasByPlayer[playerName].push({
            extraId: 'restorePoints',
            timestamp: Date.now()
          });
        }
      }
    });

    finalStats.push(roundStats);

    if (debug) {
      console.log(`[FinalStats] 📊 Round ${roundNumber} stats:`, {
        questions: `${roundStats.questionsAnswered}/${roundStats.totalQuestions}`,
        answers: `${roundStats.correctAnswers} correct, ${roundStats.wrongAnswers} wrong, ${roundStats.noAnswers} no answer`,
        extras: `${roundStats.totalExtrasUsed} total`
      });
    }
  }

  // Send final stats to host
  namespace.to(`${roomId}:host`).emit('host_final_stats', finalStats);
  
  if (debug) {
    console.log(`[FinalStats] 📈 Final quiz stats sent to host for ${finalStats.length} rounds`);
  }

  // In calculateAndSendFinalStats function
// console.log(`[FinalStats] 🎯 Sending to room: ${roomId}:host`);
// console.log(`[FinalStats] 📊 Final stats data:`, finalStats);
// namespace.to(`${roomId}:host`).emit('host_final_stats', finalStats);
// console.log(`[FinalStats] ✅ host_final_stats event emitted`);

  return finalStats;
}



// ✅ REPLACE your existing next_round_or_end handler with this:
socket.on('next_round_or_end', ({ roomId }) => {
  if (debug) console.log(`[Host] next_round_or_end for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  const totalRounds = getTotalRounds(roomId);
  const nextRound = getCurrentRound(roomId) + 1;

  if (nextRound > totalRounds) {
    // ✅ NEW: Calculate and send final stats before completing
    calculateAndSendFinalStats(roomId, namespace);
    
    room.currentPhase = 'complete';
    namespace.to(roomId).emit('quiz_end', { message: 'Quiz complete. Thank you!' });
    emitRoomState(namespace, roomId);
    
    if (debug) console.log(`[Host] ✅ Quiz completed for ${roomId} with final stats sent`);
  } else {
    startNextRound(roomId);
    room.currentPhase = 'waiting';
    emitRoomState(namespace, roomId);
  }
});

  socket.on('create_quiz_room', ({ roomId, hostId, config }) => {
    if (debug) console.log(`[Host] create_quiz_room for: ${roomId}, host: ${hostId}`);

    socket.join(roomId);
    const success = createQuizRoom(roomId, hostId, config);
    if (!success) {
      socket.emit('quiz_error', { message: 'Room already exists' });
      socket.leave(roomId);
      return;
    }

    socket.emit('quiz_room_created', { roomId });
    emitFullRoomState(roomId);
  });

  socket.on('start_round', ({ roomId }) => {
    if (debug) console.log(`[Host] start_round for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

   resetRoundExtrasTracking(roomId);
    const engine = getEngine(room);
    if (!engine || typeof engine.initRound !== 'function') {
      socket.emit('quiz_error', { message: 'No gameplay engine found for this round type' });
      return;
    }

    engine.initRound(roomId, namespace);
  });

  socket.on('next_review', ({ roomId }) => {
    if (debug) console.log(`[Host] next_review for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const engine = getEngine(room);
    if (!engine || typeof engine.emitNextReviewQuestion !== 'function') {
      socket.emit('quiz_error', { message: 'No review phase supported for this round type' });
      return;
    }

    engine.emitNextReviewQuestion(roomId, namespace);
  });

  // ✅ NEW: Show round results (triggered by host after last question review)
  socket.on('show_round_results', ({ roomId }) => {
    if (debug) console.log(`[Host] 📊 show_round_results for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    // Validate that the requesting socket is actually the host
    if (room.hostSocketId !== socket.id) {
      socket.emit('quiz_error', { message: 'Only the host can show round results' });
      return;
    }

    // Validate that we're in the right phase
    if (room.currentPhase !== 'reviewing') {
      socket.emit('quiz_error', { message: 'Can only show round results during review phase' });
      return;
    }

    // Calculate round-specific leaderboard
    const roundLeaderboard = calculateRoundLeaderboard(roomId);
    
    if (roundLeaderboard.length === 0) {
      socket.emit('quiz_error', { message: 'No round data available for leaderboard' });
      return;
    }

    // ✅ Store in room for recovery
room.currentRoundResults = roundLeaderboard;

    // Update room phase to leaderboard
    room.currentPhase = 'leaderboard';
    
    // Emit round leaderboard to all participants
    namespace.to(roomId).emit('round_leaderboard', roundLeaderboard);
    emitRoomState(namespace, roomId);
    
    console.log(`[Host] ✅ Round ${room.currentRound} results shown to all players`);
  });

  // ✅ NEW: Continue to overall leaderboard (triggered by host from round results)
  socket.on('continue_to_overall_leaderboard', ({ roomId }) => {
    if (debug) console.log(`[Host] ➡️ continue_to_overall_leaderboard for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    // Validate that the requesting socket is actually the host
    if (room.hostSocketId !== socket.id) {
      socket.emit('quiz_error', { message: 'Only the host can continue to overall leaderboard' });
      return;
    }

    // Validate that we're in leaderboard phase
    if (room.currentPhase !== 'leaderboard') {
      socket.emit('quiz_error', { message: 'Can only continue to overall leaderboard from leaderboard phase' });
      return;
    }

    // Calculate overall cumulative leaderboard
    const overallLeaderboard = calculateOverallLeaderboard(roomId);

    room.currentOverallLeaderboard = overallLeaderboard;
    
    // Emit overall leaderboard (using existing 'leaderboard' event)
    namespace.to(roomId).emit('leaderboard', overallLeaderboard);
    
    console.log(`[Host] ✅ Overall leaderboard shown to all players`);
  });



  socket.on('end_quiz', ({ roomId }) => {
    if (debug) console.log(`[Host] end_quiz for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    room.currentPhase = 'complete';
    namespace.to(roomId).emit('quiz_end', { message: 'Quiz ended by host.' });
    emitRoomState(namespace, roomId);
  });

 socket.on('delete_quiz_room', ({ roomId }) => {
  if (debug) console.log(`[Host] delete_quiz_room for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  // ✅ Notify everyone first
  namespace.to(roomId).emit('quiz_cancelled', { message: 'Quiz cancelled by host', roomId });
  console.log(`[Host] 📢 Sent cancellation notice to room ${roomId}`);

  // ✅ Wait 2 seconds for clients to receive the message, then cleanup
  setTimeout(() => {
    const removed = removeQuizRoom(roomId);
    
    if (removed) {
      namespace.in(roomId).socketsLeave(roomId);
      namespace.in(`${roomId}:host`).socketsLeave(`${roomId}:host`);
      namespace.in(`${roomId}:admin`).socketsLeave(`${roomId}:admin`);
      namespace.in(`${roomId}:player`).socketsLeave(`${roomId}:player`);
      console.log(`[Host] ✅ Room ${roomId} deleted and clients disconnected`);
    }
  }, 2000);
});

 // ✅ NEW: Launch quiz event - redirects all waiting players to play page
  socket.on('launch_quiz', ({ roomId }) => {
    if (debug) console.log(`[Host] launch_quiz for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    // Validate that the requesting socket is actually the host
    if (room.hostSocketId !== socket.id) {
      socket.emit('quiz_error', { message: 'Only the host can launch the quiz' });
      return;
    }

    // Update room phase to indicate quiz has been launched
    room.currentPhase = 'launched';
    
    // Broadcast to all players in the waiting room to redirect to play page
    namespace.to(roomId).emit('quiz_launched', { 
      roomId,
      message: 'Quiz is starting! Redirecting to game...' 
    });
    
    // Also emit room state update
    emitRoomState(namespace, roomId);
    
    console.log(`[Host] ✅ Quiz launched for room ${roomId}, players will be redirected`);
  });
}


