// server/quiz/gameplayEngines/services/StatsService.js


import { getQuizRoom } from '../../quizRoomManager.js';

const debug = true;

export class StatsService {
  /**
   * Send host activity notification for player actions
   */
  static sendHostActivityNotification(namespace, roomId, activityData) {
    if (debug) {
      console.log(`[StatsService] 📡 Sending host notification for room ${roomId}`);
      console.log(`[StatsService] 📊 Activity: ${activityData.playerName} used ${activityData.type}${activityData.targetName ? ` on ${activityData.targetName}` : ''}`);
    }

    const notification = {
      type: activityData.type,
      playerName: activityData.playerName,
      targetName: activityData.targetName,
      context: activityData.context,
      round: activityData.round,
      questionNumber: activityData.questionNumber,
      timestamp: Date.now()
    };

    namespace.to(`${roomId}:host`).emit('host_activity_update', notification);

    if (debug) {
      console.log(`[StatsService] ✅ Host notification sent for room ${roomId}:`, notification);
    }
  }

  /**
   * MAIN METHOD: Calculate and send current round statistics to host
   * FIXED: Smart detection of when to include question stats vs extras only
   */
  static calculateAndSendRoundStats(roomId, namespace, forceIncludeQuestions = false) {
    const room = getQuizRoom(roomId);
    
    if (!room) {
      if (debug) {
        console.error(`[StatsService] ❌ Room ${roomId} not found for stats calculation`);
      }
      return null;
    }

    // ✅ SMART DETECTION: Only include questions at end of round or when forced
    const isEndOfRound = room.currentPhase === 'reviewing' || room.currentPhase === 'leaderboard';
    const includeQuestionStats = forceIncludeQuestions || isEndOfRound;

    if (debug) {
      console.log(`[StatsService] 📊 Calculating round stats for room ${roomId}, round ${room.currentRound}`);
      console.log(`[StatsService] 🔍 Include question stats: ${includeQuestionStats} (phase: ${room.currentPhase}, forced: ${forceIncludeQuestions})`);
    }

    // Initialize round statistics
    const roundStats = {
      roundNumber: room.currentRound,
      hintsUsed: 0,
      freezesUsed: 0,
      pointsRobbed: 0,
      pointsRestored: 0,
      extrasByPlayer: {},
      questionsWithExtras: 0,
      totalExtrasUsed: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      noAnswers: 0
    };

    // Process each player's extra usage
    Object.entries(room.playerData).forEach(([playerId, playerData]) => {
      const player = room.players.find(p => p.id === playerId);
      const playerName = player?.name || playerId;

      if (debug) {
        console.log(`[StatsService] 🔍 Processing extras for player ${playerName} (${playerId})`);
      }

      // Initialize player stats if not exists
      if (!roundStats.extrasByPlayer[playerName]) {
        roundStats.extrasByPlayer[playerName] = [];
      }

      // Process per-round extras (usedExtrasThisRound)
      if (playerData.usedExtrasThisRound) {
        Object.entries(playerData.usedExtrasThisRound).forEach(([extraId, used]) => {
          if (used) {
            if (debug) {
              console.log(`[StatsService] 📝 Found round extra: ${playerName} used ${extraId}`);
            }

            roundStats.totalExtrasUsed++;
            roundStats.extrasByPlayer[playerName].push({ 
              extraId, 
              timestamp: Date.now() 
            });

            // Count specific extra types
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

      // Process global/leaderboard-phase extras (usedExtras)
      if (playerData.usedExtras) {
        if (playerData.usedExtras.robPoints) {
          roundStats.pointsRobbed++;
          // Only add if not already counted from round extras
          if (!roundStats.extrasByPlayer[playerName].some(e => e.extraId === 'robPoints')) {
            roundStats.totalExtrasUsed++;
            roundStats.extrasByPlayer[playerName].push({ 
              extraId: 'robPoints', 
              timestamp: Date.now() 
            });
          }
        }

        if (playerData.pointsRestored > 0) {
          roundStats.pointsRestored += playerData.pointsRestored;
          // Only add if not already counted from round extras
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

    // ✅ CONDITIONAL: Only calculate question statistics when appropriate
    if (includeQuestionStats) {
      const currentRound = room.currentRound;
      
      console.log(`[StatsService] 🔍 STARTING question analysis for round ${currentRound} (${isEndOfRound ? 'END OF ROUND' : 'FORCED'})`);
      console.log(`[StatsService] 📋 Room has ${room.questions?.length || 0} questions`);
      console.log(`[StatsService] 👥 Room has ${room.players?.length || 0} players`);
      
      // Process all questions for the current round to get answer statistics
      if (room.questions && room.questions.length > 0) {
        console.log(`[StatsService] 🔍 Processing ${room.questions.length} questions...`);
        
        room.questions.forEach((question, questionIndex) => {
          const questionKey = `${question.id}_round${currentRound}`;
          
          console.log(`[StatsService] 🔍 Processing question ${questionIndex + 1}: ${question.id} (key: ${questionKey})`);
          
          room.players.forEach(player => {
            const playerData = room.playerData[player.id];
            if (!playerData || !playerData.answers) {
              console.log(`[StatsService] ⚠️ No playerData or answers for player ${player.id}`);
              return;
            }
            
            const answerData = playerData.answers[questionKey];
            console.log(`[StatsService] 📊 Player ${player.name || player.id} answer for ${questionKey}:`, answerData);
            
            if (answerData) {
              roundStats.questionsAnswered++;
              
              if (answerData.noAnswer) {
                roundStats.noAnswers++;
                console.log(`[StatsService] ❌ No answer recorded, noAnswers = ${roundStats.noAnswers}`);
              } else if (answerData.correct) {
                roundStats.correctAnswers++;
                console.log(`[StatsService] ✅ Correct answer recorded, correctAnswers = ${roundStats.correctAnswers}`);
              } else {
                roundStats.wrongAnswers++;
                console.log(`[StatsService] ❌ Wrong answer recorded, wrongAnswers = ${roundStats.wrongAnswers}`);
              }
            }
          });
        });
      }
      
      console.log(`[StatsService] 🔍 FINISHED question analysis. Final counts:`, {
        questionsAnswered: roundStats.questionsAnswered,
        correctAnswers: roundStats.correctAnswers,
        wrongAnswers: roundStats.wrongAnswers,
        noAnswers: roundStats.noAnswers
      });
    } else {
      if (debug) {
        console.log(`[StatsService] ⏭️ Skipping question analysis (live update - preserving existing question stats)`);
      }
    }

    // Calculate questions with extras (for future enhancement)
    roundStats.questionsWithExtras = Object.keys(roundStats.extrasByPlayer).length;

    if (debug) {
      console.log(`[StatsService] 📊 Round stats calculated for room ${roomId}:`, {
        totalExtras: roundStats.totalExtrasUsed,
        hints: roundStats.hintsUsed,
        freezes: roundStats.freezesUsed,
        robs: roundStats.pointsRobbed,
        restores: roundStats.pointsRestored,
        questionsAnswered: roundStats.questionsAnswered,
        correctAnswers: roundStats.correctAnswers,
        wrongAnswers: roundStats.wrongAnswers,
        noAnswers: roundStats.noAnswers,
        includeQuestionStats: includeQuestionStats
      });
    }

    // Send stats to host
    namespace.to(`${roomId}:host`).emit('host_current_round_stats', roundStats);

    if (debug) {
      console.log(`[StatsService] ✅ Round stats sent to host for room ${roomId} (question stats ${includeQuestionStats ? 'included' : 'preserved'})`);
    }

    return roundStats;
  }

  /**
   * BACKWARD COMPATIBILITY: Aliases for the new methods
   */
  static calculateFinalRoundStats(roomId, namespace) {
    if (debug) {
      console.log(`[StatsService] 🏁 calculateFinalRoundStats called - forcing question stats inclusion`);
    }
    return this.calculateAndSendRoundStats(roomId, namespace, true);
  }

  static calculateLiveRoundStats(roomId, namespace) {
    if (debug) {
      console.log(`[StatsService] ⚡ calculateLiveRoundStats called - preserving question stats`);
    }
    return this.calculateAndSendRoundStats(roomId, namespace, false);
  }

  /**
   * Track extra usage for a specific player
   */
  static trackExtraUsage(room, playerId, extraId, targetId = null) {
    if (!room || !room.playerData[playerId]) {
      if (debug) {
        console.error(`[StatsService] ❌ Cannot track extra usage - invalid room or player ${playerId}`);
      }
      return;
    }

    const playerData = room.playerData[playerId];
    const player = room.players.find(p => p.id === playerId);
    const playerName = player?.name || playerId;

    if (debug) {
      console.log(`[StatsService] 📝 Tracking extra usage: ${playerName} used ${extraId}${targetId ? ` on ${targetId}` : ''}`);
    }

    // Initialize tracking objects if needed
    if (!playerData.usedExtrasThisRound) {
      playerData.usedExtrasThisRound = {};
    }
    if (!playerData.usedExtras) {
      playerData.usedExtras = {};
    }

    // Mark as used in current round
    playerData.usedExtrasThisRound[extraId] = true;
    
    // Mark as used globally (for non-repeatable extras)
    playerData.usedExtras[extraId] = true;

    // Store target information if applicable
    if (targetId) {
      if (!playerData.extraTargets) {
        playerData.extraTargets = {};
      }
      playerData.extraTargets[extraId] = targetId;
    }

    if (debug) {
      console.log(`[StatsService] ✅ Extra usage tracked for ${playerName}: ${extraId}`);
    }
  }

  /**
   * Get comprehensive stats for a room
   */
  static getRoomStats(roomId) {
    const room = getQuizRoom(roomId);
    
    if (!room) {
      if (debug) {
        console.error(`[StatsService] ❌ Room ${roomId} not found for comprehensive stats`);
      }
      return null;
    }

    if (debug) {
      console.log(`[StatsService] 📊 Generating comprehensive stats for room ${roomId}`);
    }

    const stats = {
      roomId,
      currentRound: room.currentRound,
      currentPhase: room.currentPhase,
      totalPlayers: room.players.length,
      totalQuestions: room.questions.length,
      currentQuestionIndex: room.currentQuestionIndex,
      playerStats: {},
      roundSummary: {
        totalExtrasUsed: 0,
        extrasByType: {},
        topScorers: []
      }
    };

    // Generate per-player statistics
    Object.entries(room.playerData).forEach(([playerId, playerData]) => {
      const player = room.players.find(p => p.id === playerId);
      const playerName = player?.name || playerId;

      stats.playerStats[playerName] = {
        score: playerData.score || 0,
        answersSubmitted: Object.keys(playerData.answers || {}).length,
        extrasUsed: Object.keys(playerData.usedExtras || {}).filter(key => playerData.usedExtras[key]).length,
        frozen: playerData.frozenNextQuestion || false,
        penaltyDebt: playerData.penaltyDebt || 0
      };

      // Count extras by type
      if (playerData.usedExtrasThisRound) {
        Object.entries(playerData.usedExtrasThisRound).forEach(([extraId, used]) => {
          if (used) {
            stats.roundSummary.totalExtrasUsed++;
            stats.roundSummary.extrasByType[extraId] = (stats.roundSummary.extrasByType[extraId] || 0) + 1;
          }
        });
      }
    });

    // Generate top scorers
    stats.roundSummary.topScorers = Object.entries(stats.playerStats)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(0, 5)
      .map(([name, data]) => ({ name, score: data.score }));

    if (debug) {
      console.log(`[StatsService] ✅ Comprehensive stats generated for room ${roomId}`);
    }

    return stats;
  }
}