// server/quiz/gameplayEngines/services/ReviewService.js
// Centralized review phase management service
// Extracts identical review logic from generalTriviaEngine.js and wipeoutEngine.js
// Handles question review flow, statistics calculation, and host notifications

const debug = false;

export class ReviewService {
  /**
   * Emit the next review question to players and host
   * Extracted from both engines - identical implementation
   * Handles review flow, statistics calculation, and completion detection
   * 
   * @param {string} roomId - The room ID
   * @param {Object} namespace - Socket.io namespace
   * @param {Object} gameEngine - Reference to the game engine (for stats service)
   * @param {Function} getQuizRoom - Room getter function passed from engine
   * @param {Function} emitRoomState - Room state emitter function passed from engine
   * @returns {boolean} True if review question emitted, false if review complete
   */
  static emitNextReviewQuestion(roomId, namespace, gameEngine, getQuizRoom, emitRoomState) {
    const room = getQuizRoom(roomId);
    if (!room) {
      if (debug) console.error(`[ReviewService] ❌ Room ${roomId} not found`);
      return false;
    }

    // Prefer the engine-scoped review list when present (e.g., speed_round)
    const qList = (Array.isArray(room.reviewQuestions) && room.reviewQuestions.length > 0)
      ? room.reviewQuestions
      : room.questions;

    if (!qList || !Array.isArray(qList)) {
      if (debug) {
        console.error(`[ReviewService] ❌ Room ${roomId} has no valid questions array`);
        console.error(`[ReviewService] 🔍 questions:`, qList);
      }
      return false;
    }

    const reviewIndex = room.currentReviewIndex ?? 0;

    if (debug) {
      console.log(`[ReviewService] 🔍 Processing review for room ${roomId}, index ${reviewIndex}/${qList.length}`);
    }

    // Check if review is complete
    if (reviewIndex >= qList.length) {
      this.handleReviewComplete(roomId, namespace, gameEngine, room, emitRoomState);
      return false;
    }

    const question = qList[reviewIndex];
    const roundAnswerKey = `${question.id}_round${room.currentRound}`;

    if (debug) {
      console.log(`[ReviewService] 📖 Reviewing question ${reviewIndex + 1}/${qList.length}: ${question.id}`);
    }

    // Calculate statistics for this question
    const stats = this.calculateQuestionStatistics(room, roundAnswerKey);

    if (debug) {
      console.log(`[ReviewService] 📊 Question stats: ${stats.correctCount} correct, ${stats.incorrectCount} incorrect, ${stats.noAnswerCount} no answer`);
    }

    // Send review question to all players
    this.emitReviewQuestionToPlayers(room, question, reviewIndex, namespace);

    // Send review question with statistics to host
    this.emitReviewQuestionToHost(roomId, room, question, reviewIndex, stats, namespace);

    // Advance to next question for future calls
    room.currentReviewIndex = reviewIndex + 1;

    if (debug) {
      console.log(`[ReviewService] ✅ Review question ${reviewIndex + 1} emitted, advanced to index ${room.currentReviewIndex}`);
    }

    return true;
  }

  /**
   * Calculate statistics for a specific question
   * Analyzes player answers to generate correct/incorrect/no-answer counts
   * 
   * @param {Object} room - The quiz room object
   * @param {string} roundAnswerKey - The answer key for this question/round
   * @returns {Object} Statistics object with counts and percentages
   */
  static calculateQuestionStatistics(room, roundAnswerKey) {
    let correctCount = 0;
    let incorrectCount = 0;
    let noAnswerCount = 0;
    const totalPlayers = room.players.length;

    if (debug) {
      console.log(`[ReviewService] 📊 Calculating stats for ${totalPlayers} players, key: ${roundAnswerKey}`);
    }

    room.players.forEach(player => {
      const playerData = room.playerData[player.id];
      const answerData = playerData?.answers?.[roundAnswerKey];

      if (!answerData || answerData.submitted === null || answerData.submitted === undefined) {
        noAnswerCount++;
        if (debug) console.log(`[ReviewService] 📊 Player ${player.id}: NO ANSWER`);
      } else if (answerData.correct) {
        correctCount++;
        if (debug) console.log(`[ReviewService] 📊 Player ${player.id}: CORRECT (${answerData.submitted})`);
      } else {
        incorrectCount++;
        if (debug) console.log(`[ReviewService] 📊 Player ${player.id}: INCORRECT (${answerData.submitted})`);
      }
    });

    const stats = {
      totalPlayers,
      correctCount,
      incorrectCount,
      noAnswerCount,
      correctPercentage: totalPlayers > 0 ? Math.round((correctCount / totalPlayers) * 100) : 0,
      incorrectPercentage: totalPlayers > 0 ? Math.round((incorrectCount / totalPlayers) * 100) : 0,
      noAnswerPercentage: totalPlayers > 0 ? Math.round((noAnswerCount / totalPlayers) * 100) : 0
    };

    if (debug) {
      console.log(`[ReviewService] 📊 Final stats: ${correctCount}/${totalPlayers} correct (${stats.correctPercentage}%)`);
    }

    return stats;
  }

  /**
   * Emit review question to all players
   * Sends question data with player's submitted answer
   * 
   * @param {Object} room - The quiz room object
   * @param {Object} question - The question being reviewed
   * @param {number} reviewIndex - Current review index
   * @param {Object} namespace - Socket.io namespace
   */
  static emitReviewQuestionToPlayers(room, question, reviewIndex, namespace) {
    if (debug) {
      console.log(`[ReviewService] 👥 Sending review question to ${room.players.length} players`);
    }

    const roundAnswerKey = `${question.id}_round${room.currentRound}`;

    const totalQuestions = (Array.isArray(room.reviewQuestions) && room.reviewQuestions.length > 0)
      ? room.reviewQuestions.length
      : (room.questions?.length || 0);

    room.players.forEach(player => {
      const playerData = room.playerData[player.id];
      const answerData = playerData?.answers?.[roundAnswerKey] || {};
      const submittedAnswer = (answerData.submitted ?? null);

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
          totalQuestions,
          currentRound: room.currentRound,
          totalRounds: room.config?.roundDefinitions?.length || 1
        });

        if (debug) {
          console.log(`[ReviewService] 📤 Review sent to ${player.id}: submitted="${submittedAnswer}", correct="${question.correctAnswer}"`);
        }
      } else if (debug) {
        console.warn(`[ReviewService] ⚠️ No socket found for player ${player.name} (${player.id})`);
      }
    });
  }

  /**
   * Emit review question to host with statistics
   * Sends question data plus answer statistics for host display
   * 
   * @param {string} roomId - The room ID
   * @param {Object} room - The quiz room object
   * @param {Object} question - The question being reviewed
   * @param {number} reviewIndex - Current review index
   * @param {Object} stats - Question statistics
   * @param {Object} namespace - Socket.io namespace
   */
  static emitReviewQuestionToHost(roomId, room, question, reviewIndex, stats, namespace) {
    if (debug) {
      console.log(`[ReviewService] 🎤 Sending review question to host for room ${roomId}`);
    }

    const totalQuestions = (Array.isArray(room.reviewQuestions) && room.reviewQuestions.length > 0)
      ? room.reviewQuestions.length
      : (room.questions?.length || 0);

    const hostReviewData = {
      id: question.id,
      text: question.text,
      options: Array.isArray(question.options) ? question.options : [],
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty,
      category: question.category,
      questionNumber: reviewIndex + 1,
      totalQuestions,
      currentRound: room.currentRound,
      totalRounds: room.config?.roundDefinitions?.length || 1,
      statistics: stats
    };

    namespace.to(`${roomId}:host`).emit('host_review_question', hostReviewData);

    if (debug) {
      console.log(`[ReviewService] ✅ Host review data sent for room ${roomId}: Q${reviewIndex + 1}, ${stats.correctCount}/${stats.totalPlayers} correct`);
    }
  }

  /**
   * Handle review completion
   * Called when all questions have been reviewed
   * Sends final statistics and completion notification
   * 
   * @param {string} roomId - The room ID
   * @param {Object} namespace - Socket.io namespace
   * @param {Object} gameEngine - Reference to the game engine
   * @param {Object} room - The quiz room object
   * @param {Function} emitRoomState - Room state emitter function
   */
  static handleReviewComplete(roomId, namespace, gameEngine, room, emitRoomState) {
    const totalReviewed = (Array.isArray(room.reviewQuestions) && room.reviewQuestions.length > 0)
      ? room.reviewQuestions.length
      : (room.questions?.length || 0);

    if (debug) {
      console.log(`[ReviewService] ✅ Review complete for room ${roomId} - ${totalReviewed} questions reviewed`);
    }

    // Keep phase as 'reviewing' (completed stage), engines may advance to leaderboard afterwards
    room.currentPhase = 'reviewing';
    emitRoomState(namespace, roomId);

    // Calculate and send final round statistics if game engine has stats service
    if (gameEngine && typeof gameEngine.calculateAndSendRoundStats === 'function') {
      const finalRoundStats = gameEngine.calculateAndSendRoundStats(roomId, namespace);
      if (finalRoundStats) {
        namespace.to(`${roomId}:host`).emit('host_round_stats', finalRoundStats);
        if (debug) {
          console.log(`[ReviewService] 📈 Final round stats sent to host: ${finalRoundStats.totalExtrasUsed} extras used`);
        }
      }
    }

    // Send completion notification to host
    const completionData = {
      message: 'All questions reviewed. You can now show round results.',
      roundNumber: room.currentRound,
      totalQuestions: totalReviewed,
      timestamp: Date.now()
    };

    namespace.to(`${roomId}:host`).emit('review_complete', completionData);

    if (debug) {
      console.log(`[ReviewService] 🎉 Review completion notification sent to host for round ${room.currentRound}`);
    }
  }

  /**
   * Get current review question for state recovery
   * Useful when players reconnect during review phase
   * 
   * @param {string} roomId - The room ID
   * @param {Function} getQuizRoom - Room getter function passed from engine
   * @returns {Object|null} Current review question or null if complete/not found
   */
  static getCurrentReviewQuestion(roomId, getQuizRoom) {
    const room = getQuizRoom(roomId);
    const qList = (Array.isArray(room?.reviewQuestions) && room.reviewQuestions.length > 0)
      ? room.reviewQuestions
      : room?.questions;

    if (!room || !qList || room.currentReviewIndex === undefined) {
      if (debug) {
        console.warn(`[ReviewService] ⚠️ getCurrentReviewQuestion: No room or review data for ${roomId}`);
      }
      return null;
    }

    if (room.currentReviewIndex >= qList.length) {
      if (debug) console.log(`[ReviewService] ✅ getCurrentReviewQuestion: Review complete for ${roomId}`);
      return null;
    }

    const reviewQuestion = qList[room.currentReviewIndex];

    if (debug) {
      console.log(`[ReviewService] 📖 getCurrentReviewQuestion: Returning question ${room.currentReviewIndex + 1}/${qList.length} for ${roomId}`);
    }

    return reviewQuestion;
  }

  /**
   * Check if review is complete for a room
   * 
   * @param {string} roomId - The room ID
   * @param {Function} getQuizRoom - Room getter function passed from engine
   * @returns {boolean} True if review is complete
   */
  static isReviewComplete(roomId, getQuizRoom) {
    const room = getQuizRoom(roomId);
    const qList = (Array.isArray(room?.reviewQuestions) && room.reviewQuestions.length > 0)
      ? room.reviewQuestions
      : room?.questions;

    if (!room) {
      if (debug) console.warn(`[ReviewService] ⚠️ isReviewComplete: Room ${roomId} not found`);
      return false;
    }

    const reviewComplete = (room.currentReviewIndex >= (qList?.length || 0));

    if (debug) {
      console.log(`[ReviewService] 🔍 isReviewComplete for ${roomId}: ${reviewComplete} (reviewIndex: ${room.currentReviewIndex}, totalQuestions: ${qList?.length || 0})`);
    }

    return reviewComplete;
  }
}
