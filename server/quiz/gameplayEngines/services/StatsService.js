// server/quiz/gameplayEngines/services/StatsService.js
// COMPLETE FILE with speed round enhancements + hidden object support + host activity notifications

import { getQuizRoom } from '../../quizRoomManager.js';

const debug = true;

export class StatsService {
  
  /**
   * Send host activity notification for extras usage
   * This notifies the host dashboard when players use extras (hints, freezes, robs, restores)
   */
  static sendHostActivityNotification(namespace, roomId, activityData) {
    if (!namespace || !roomId) return;
    
    namespace.to(`${roomId}:host`).emit('host_activity_update', {
      type: activityData.type,
      playerName: activityData.playerName,
      targetName: activityData.targetName,
      context: activityData.context || 'Game',
      round: activityData.round,
      questionNumber: activityData.questionNumber,
      timestamp: Date.now()
    });

    if (debug) {
      console.log(`[StatsService] 📡 Host notified: ${activityData.playerName} used ${activityData.type}${activityData.targetName ? ` on ${activityData.targetName}` : ''}`);
    }
  }

  /**
   * Calculate live round stats during gameplay
   * ENHANCED: Adds speed round skip tracking + hidden object support while preserving existing logic
   */
  static calculateLiveRoundStats(roomId, namespace) {
    const room = getQuizRoom(roomId);
    if (!room) return null;

    const roundNumber = room.currentRound;
    const roundTag = `_round${roundNumber}`;
    const roundType = room.config.roundDefinitions?.[roundNumber - 1]?.roundType;
    
    let stats = {
      roundNumber,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      noAnswers: 0,
      hintsUsed: 0,
      freezesUsed: 0,
      pointsRobbed: 0,
      pointsRestored: 0,
      totalExtrasUsed: 0,
      extrasByPlayer: {},
      questionsWithExtras: 0
    };

    // NEW: Add speed round specific tracking
    if (roundType === 'speed_round') {
      stats.skippedAnswers = 0;
    }

    // NEW: Add hidden object specific tracking
    if (roundType === 'hidden_object') {
      stats.itemsFound = 0;
      stats.itemsTarget = 0;
      stats.playersCompleted = 0;
    }

    // Initialize player extras tracking
    room.players.forEach(player => {
      stats.extrasByPlayer[player.name] = [];
    });

    // ✅ SPECIAL CASE: Hidden Object rounds (live tracking)
    if (roundType === 'hidden_object' && room.hiddenObject) {
      const ho = room.hiddenObject;
      stats.itemsTarget = ho.itemTarget || 0;
      
      for (const player of room.players) {
        const playerState = ho.player?.[player.id];
        if (playerState) {
          const foundCount = playerState.foundIds?.size || 0;
          stats.itemsFound += foundCount;
          
          if (playerState.finishTs) {
            stats.playersCompleted++;
          }
        }
      }
      
      stats.questionsAnswered = stats.itemsFound;
      stats.correctAnswers = stats.itemsFound;
      stats.wrongAnswers = 0;
      stats.noAnswers = stats.itemsTarget * room.players.length - stats.itemsFound;

      if (debug) {
        console.log(`[StatsService] 🔍 Hidden Object live stats:`, {
          itemsFound: stats.itemsFound,
          itemsTarget: stats.itemsTarget,
          playersCompleted: stats.playersCompleted,
          accuracyRate: stats.itemsTarget > 0 && room.players.length > 0
            ? Math.round((stats.itemsFound / (stats.itemsTarget * room.players.length)) * 100)
            : 0
        });
      }

      // Emit to host
      if (namespace) {
        namespace.to(`${roomId}:host`).emit('host_live_stats', stats);
      }

      return stats;
    }

    // Analyze all answers for this round (NORMAL Q&A rounds only)
    for (const player of room.players) {
      const pd = room.playerData[player.id];
      if (!pd?.answers) continue;

      for (const [key, answer] of Object.entries(pd.answers)) {
        if (!key.endsWith(roundTag)) continue;

        // EXISTING logic for non-speed rounds (preserves your penalties)
        if (roundType !== 'speed_round') {
          if (answer.noAnswer) {
            stats.noAnswers++;
          } else {
            stats.questionsAnswered++;
            if (answer.correct) {
              stats.correctAnswers++;
            } else {
              stats.wrongAnswers++;
            }
          }
        } else {
          // NEW: Speed round specific logic
          if (answer.voluntarySkip === true || (answer.noAnswer === true && answer.submitted === null)) {
            stats.skippedAnswers++;
          } else {
            stats.questionsAnswered++;
            if (answer.correct) {
              stats.correctAnswers++;
            } else {
              stats.wrongAnswers++;
            }
          }
        }
      }

      // Count extras usage (existing logic)
      if (pd.usedExtrasThisRound) {
        for (const [extraType, used] of Object.entries(pd.usedExtrasThisRound)) {
          if (used) {
            stats.totalExtrasUsed++;
            stats.extrasByPlayer[player.name].push(extraType);
            
            switch (extraType) {
              case 'buyHint':
                stats.hintsUsed++;
                break;
              case 'freezeOutTeam':
                stats.freezesUsed++;
                break;
              case 'robPoints':
                stats.pointsRobbed++;
                break;
              case 'restorePoints':
                stats.pointsRestored++;
                break;
            }
          }
        }
      }
    }

    // Count questions where extras were used
    stats.questionsWithExtras = Object.values(stats.extrasByPlayer)
      .filter(extras => extras.length > 0).length;

    if (debug && roundType === 'speed_round') {
      console.log(`[StatsService] Speed round live stats:`, {
        answered: stats.questionsAnswered,
        correct: stats.correctAnswers,
        wrong: stats.wrongAnswers,
        skipped: stats.skippedAnswers
      });
    }

    // Emit to host for live monitoring
    if (namespace) {
      namespace.to(`${roomId}:host`).emit('host_live_stats', stats);
    }

    return stats;
  }

  /**
   * Calculate and send final round stats
   * This is called by hostHandlers.js
   */
  static calculateAndSendRoundStats(roomId, namespace) {
    return this.calculateFinalRoundStats(roomId, namespace);
  }

  /**
   * Calculate final round stats for completed rounds
   * ENHANCED: Adds speed round skip tracking + hidden object support while preserving existing logic
   */
  static calculateFinalRoundStats(roomId, namespace) {
    const room = getQuizRoom(roomId);
    if (!room) {
      console.error(`[StatsService] ❌ Room not found: ${roomId}`);
      return null;
    }

    const roundNumber = room.currentRound;
    const roundTag = `_round${roundNumber}`;
    const roundConfig = room.config.roundDefinitions?.[roundNumber - 1];
    const roundType = roundConfig?.roundType;
    
    if (debug) {
      console.log(`[StatsService] 📊 Calculating final stats for round ${roundNumber} (${roundType})`);
    }

    let stats = {
      roundNumber,
      roundType: roundType || 'unknown',
      totalQuestions: roundConfig?.config?.questionsPerRound || room.questions?.length || 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      noAnswers: 0,
      hintsUsed: 0,
      freezesUsed: 0,
      pointsRobbed: 0,
      pointsRestored: 0,
      totalExtrasUsed: 0,
      extrasByPlayer: {},
      questionsWithExtras: 0
    };

    // NEW: Add speed round specific field
    if (roundType === 'speed_round') {
      stats.skippedAnswers = 0;
    }

    // NEW: Add hidden object specific fields
    if (roundType === 'hidden_object') {
      stats.itemsFound = 0;
      stats.itemsTarget = 0;
      stats.playersCompleted = 0;
    }

    // Initialize player extras tracking
    room.players.forEach(player => {
      stats.extrasByPlayer[player.name] = [];
    });

    // ✅ SPECIAL CASE: Hidden Object rounds don't use answers object
    if (roundType === 'hidden_object' && room.hiddenObject) {
      const ho = room.hiddenObject;
      stats.totalQuestions = 0; // Hidden object doesn't have "questions"
      stats.itemsTarget = ho.itemTarget || 0;
      
      // Count items found by all players
      for (const player of room.players) {
        const playerState = ho.player?.[player.id];
        if (playerState) {
          const foundCount = playerState.foundIds?.size || 0;
          stats.itemsFound += foundCount;
          
          // Count players who completed (found all items)
          if (playerState.finishTs) {
            stats.playersCompleted++;
          }
        }
      }
      
      // Map hidden object metrics to standard stat fields for consistency
      stats.questionsAnswered = stats.itemsFound;
      stats.correctAnswers = stats.itemsFound;
      stats.wrongAnswers = 0;
      stats.noAnswers = stats.itemsTarget * room.players.length - stats.itemsFound; // Items not found
      // ✅ FIXED: Accuracy should be items found vs items target (per player average)
      stats.accuracyRate = stats.itemsTarget > 0 && room.players.length > 0
        ? Math.round((stats.itemsFound / (stats.itemsTarget * room.players.length)) * 100)
        : 0;
      stats.responseRate = stats.itemsTarget > 0 && room.players.length > 0
        ? Math.round((stats.itemsFound / (stats.itemsTarget * room.players.length)) * 100)
        : 0;

      if (debug) {
        console.log(`[StatsService] 📈 Hidden Object round ${roundNumber} stats:`, {
          itemsTarget: stats.itemsTarget,
          totalItemsPossible: stats.itemsTarget * room.players.length,
          itemsFound: stats.itemsFound,
          playersCompleted: stats.playersCompleted,
          responseRate: stats.responseRate + '%'
        });
      }

      // Still process extras for hidden object rounds
      for (const player of room.players) {
        const pd = room.playerData[player.id];
        if (!pd) continue;

        // Count extras usage for this player
        if (pd.usedExtrasThisRound) {
          for (const [extraType, used] of Object.entries(pd.usedExtrasThisRound)) {
            if (used) {
              stats.totalExtrasUsed++;
              
              if (!stats.extrasByPlayer[player.name]) {
                stats.extrasByPlayer[player.name] = [];
              }
              stats.extrasByPlayer[player.name].push(extraType);
              
              switch (extraType) {
                case 'buyHint':
                  stats.hintsUsed++;
                  break;
                case 'freezeOutTeam':
                  stats.freezesUsed++;
                  break;
                case 'robPoints':
                  stats.pointsRobbed++;
                  break;
                case 'restorePoints':
                  stats.pointsRestored++;
                  break;
              }
            }
          }
        }
      }

      // Send to host and return early (skip normal answer analysis)
      if (namespace) {
        namespace.to(`${roomId}:host`).emit('host_current_round_stats', stats);
      }
      return stats;
    }

    // Analyze all answers for this round (NORMAL Q&A rounds only - not hidden_object)
    const expectedResponses = stats.totalQuestions * room.players.length;
    
    for (const player of room.players) {
      const pd = room.playerData[player.id];
      if (!pd) continue;

      // Count player's answers for this round
      let playerAnswersThisRound = 0;
      
      if (pd.answers) {
        for (const [key, answer] of Object.entries(pd.answers)) {
          if (!key.endsWith(roundTag)) continue;

          playerAnswersThisRound++;

          // PRESERVE existing logic for non-speed rounds
          if (roundType !== 'speed_round') {
            if (answer.noAnswer) {
              stats.noAnswers++;
            } else {
              stats.questionsAnswered++;
              if (answer.correct) {
                stats.correctAnswers++;
              } else {
                stats.wrongAnswers++;
              }
            }
          } else {
            // NEW: Speed round specific categorization
            if (answer.voluntarySkip === true || (answer.noAnswer === true && answer.submitted === null)) {
              stats.skippedAnswers++;
            } else {
              stats.questionsAnswered++;
              if (answer.correct) {
                stats.correctAnswers++;
              } else {
                stats.wrongAnswers++;
              }
            }
          }
        }
      }

      // Count missing responses as no answers (for non-speed rounds)
      const missedQuestions = stats.totalQuestions - playerAnswersThisRound;
      if (missedQuestions > 0 && roundType !== 'speed_round') {
        stats.noAnswers += missedQuestions;
      }

      // Count extras usage for this player
      if (pd.usedExtrasThisRound) {
        for (const [extraType, used] of Object.entries(pd.usedExtrasThisRound)) {
          if (used) {
            stats.totalExtrasUsed++;
            
            // Add to player's extras list
            if (!stats.extrasByPlayer[player.name]) {
              stats.extrasByPlayer[player.name] = [];
            }
            stats.extrasByPlayer[player.name].push(extraType);
            
            // Count specific extra types
            switch (extraType) {
              case 'buyHint':
                stats.hintsUsed++;
                break;
              case 'freezeOutTeam':
                stats.freezesUsed++;
                break;
              case 'robPoints':
                stats.pointsRobbed++;
                break;
              case 'restorePoints':
                stats.pointsRestored++;
                break;
            }
          }
        }
      }
    }

    // Calculate derived metrics
    stats.accuracyRate = stats.questionsAnswered > 0 
      ? Math.round((stats.correctAnswers / stats.questionsAnswered) * 100) 
      : 0;
    
    stats.responseRate = expectedResponses > 0 
      ? Math.round(((stats.questionsAnswered + stats.noAnswers + (stats.skippedAnswers || 0)) / expectedResponses) * 100)
      : 0;

    // Count unique questions where extras were used
    const questionsWithExtras = new Set();
    for (const player of room.players) {
      const pd = room.playerData[player.id];
      if (!pd?.usedExtrasThisRound) continue;
      
      for (const [extraType, used] of Object.entries(pd.usedExtrasThisRound)) {
        if (used && room.questions) {
          // For simplicity, count any extra usage as affecting questions
          questionsWithExtras.add('has_extras');
        }
      }
    }
    stats.questionsWithExtras = questionsWithExtras.size;

    if (debug) {
      console.log(`[StatsService] 📈 Final round ${roundNumber} stats:`, {
        roundType,
        totalQuestions: stats.totalQuestions,
        answered: stats.questionsAnswered,
        correct: stats.correctAnswers,
        wrong: stats.wrongAnswers,
        noAnswers: stats.noAnswers,
        skipped: stats.skippedAnswers || 0,
        accuracy: stats.accuracyRate + '%',
        responseRate: stats.responseRate + '%',
        totalExtras: stats.totalExtrasUsed
      });
    }

    // Send to host
    if (namespace) {
      namespace.to(`${roomId}:host`).emit('host_current_round_stats', stats);
    }

    return stats;
  }

  /**
   * Get player-specific statistics
   * NEW: Includes speed round skip tracking + hidden object support
   */
  static getPlayerStats(roomId, playerId, roundNumber = null) {
    const room = getQuizRoom(roomId);
    if (!room) return null;

    const targetRound = roundNumber || room.currentRound;
    const roundTag = `_round${targetRound}`;
    const roundType = room.config.roundDefinitions?.[targetRound - 1]?.roundType;
    const pd = room.playerData[playerId];
    
    if (!pd) return null;

    let playerStats = {
      playerId,
      roundNumber: targetRound,
      totalResponses: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      noAnswers: 0,
      accuracyRate: 0,
      score: pd.score || 0
    };

    // Add speed round specific tracking
    if (roundType === 'speed_round') {
      playerStats.skippedAnswers = 0;
    }

    // Add hidden object specific tracking
    if (roundType === 'hidden_object') {
      playerStats.itemsFound = 0;
      playerStats.itemsTarget = 0;
      playerStats.completed = false;
    }

    // ✅ SPECIAL CASE: Hidden Object
    if (roundType === 'hidden_object' && room.hiddenObject) {
      const playerState = room.hiddenObject.player?.[playerId];
      if (playerState) {
        playerStats.itemsFound = playerState.foundIds?.size || 0;
        playerStats.itemsTarget = room.hiddenObject.itemTarget || 0;
        playerStats.completed = !!playerState.finishTs;
        playerStats.questionsAnswered = playerStats.itemsFound;
        playerStats.correctAnswers = playerStats.itemsFound;
        // ✅ FIXED: Accuracy is items found vs target
        playerStats.accuracyRate = playerStats.itemsTarget > 0
          ? Math.round((playerStats.itemsFound / playerStats.itemsTarget) * 100)
          : 0;
      }
      return playerStats;
    }

    // Analyze player's answers for the target round (Q&A rounds)
    if (!pd.answers) return playerStats;

    for (const [key, answer] of Object.entries(pd.answers)) {
      if (!key.endsWith(roundTag)) continue;

      playerStats.totalResponses++;
      
      if (roundType !== 'speed_round') {
        // Existing logic for non-speed rounds
        if (answer.noAnswer) {
          playerStats.noAnswers++;
        } else {
          playerStats.questionsAnswered++;
          if (answer.correct) {
            playerStats.correctAnswers++;
          } else {
            playerStats.wrongAnswers++;
          }
        }
      } else {
        // Speed round logic
        if (answer.voluntarySkip === true || (answer.noAnswer === true && answer.submitted === null)) {
          playerStats.skippedAnswers++;
        } else {
          playerStats.questionsAnswered++;
          if (answer.correct) {
            playerStats.correctAnswers++;
          } else {
            playerStats.wrongAnswers++;
          }
        }
      }
    }

    // Calculate accuracy rate (excluding skips and no answers)
    playerStats.accuracyRate = playerStats.questionsAnswered > 0 
      ? Math.round((playerStats.correctAnswers / playerStats.questionsAnswered) * 100) 
      : 0;

    return playerStats;
  }

  /**
   * Calculate cumulative statistics across all completed rounds
   * NEW: Includes speed round skip tracking + hidden object support
   */
  static calculateCumulativeStats(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return null;

    const completedRounds = room.currentRound - 1;
    if (completedRounds <= 0) return null;

    let cumulativeStats = {
      totalRoundsCompleted: completedRounds,
      totalQuestionsAnswered: 0,
      totalCorrectAnswers: 0,
      totalWrongAnswers: 0,
      totalNoAnswers: 0,
      totalSkippedAnswers: 0,
      totalItemsFound: 0,
      totalExtrasUsed: 0,
      totalHintsUsed: 0,
      totalFreezesUsed: 0,
      totalPointsRobbed: 0,
      totalPointsRestored: 0,
      overallAccuracyRate: 0
    };

    // Sum up stats from all completed rounds
    for (let roundNum = 1; roundNum <= completedRounds; roundNum++) {
      const roundStats = room.storedRoundStats?.[roundNum];
      if (roundStats) {
        cumulativeStats.totalQuestionsAnswered += roundStats.questionsAnswered || 0;
        cumulativeStats.totalCorrectAnswers += roundStats.correctAnswers || 0;
        cumulativeStats.totalWrongAnswers += roundStats.wrongAnswers || 0;
        cumulativeStats.totalNoAnswers += roundStats.noAnswers || 0;
        cumulativeStats.totalSkippedAnswers += roundStats.skippedAnswers || 0;
        cumulativeStats.totalItemsFound += roundStats.itemsFound || 0;
        cumulativeStats.totalExtrasUsed += roundStats.totalExtrasUsed || 0;
        cumulativeStats.totalHintsUsed += roundStats.hintsUsed || 0;
        cumulativeStats.totalFreezesUsed += roundStats.freezesUsed || 0;
        cumulativeStats.totalPointsRobbed += roundStats.pointsRobbed || 0;
        cumulativeStats.totalPointsRestored += roundStats.pointsRestored || 0;
      }
    }

    // Calculate overall accuracy rate
    cumulativeStats.overallAccuracyRate = cumulativeStats.totalQuestionsAnswered > 0 
      ? Math.round((cumulativeStats.totalCorrectAnswers / cumulativeStats.totalQuestionsAnswered) * 100) 
      : 0;

    return cumulativeStats;
  }

  /**
   * Validate answer statistics consistency
   * NEW: Includes speed round + hidden object validation
   */
  static validateAnswerConsistency(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return false;

    const issues = [];
    const roundTag = `_round${room.currentRound}`;
    const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;

    // Skip validation for hidden object rounds (different data structure)
    if (roundType === 'hidden_object') {
      return true;
    }

    for (const player of room.players) {
      const pd = room.playerData[player.id];
      if (!pd?.answers) continue;

      for (const [key, answer] of Object.entries(pd.answers)) {
        if (!key.endsWith(roundTag)) continue;

        // Speed round specific validation
        if (roundType === 'speed_round') {
          if (answer.voluntarySkip === true && answer.correct === true) {
            issues.push(`Player ${player.id}, Question ${key}: Voluntary skip marked as correct`);
          }
          if (answer.submitted !== null && answer.voluntarySkip === true) {
            issues.push(`Player ${player.id}, Question ${key}: Has answer but marked as voluntary skip`);
          }
        } else {
          // Standard validation for other round types
          if (answer.noAnswer === true && answer.correct === true) {
            issues.push(`Player ${player.id}, Question ${key}: No answer marked as correct`);
          }
        }
      }
    }

    if (issues.length > 0 && debug) {
      console.warn(`[StatsService] 🚨 Answer consistency issues found:`, issues);
    }

    return issues.length === 0;
  }

  /**
   * Export stats for external analysis or reporting
   * NEW: Includes all round types with proper categorization
   */
  static exportRoomStats(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return null;

    const export_data = {
      roomId,
      hostId: room.hostId,
      gameConfig: room.config,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        finalScore: room.playerData[p.id]?.score || 0
      })),
      roundStats: [],
      finalLeaderboard: room.finalLeaderboard || []
    };

    // Export each round's stats
    for (let roundNum = 1; roundNum <= room.currentRound; roundNum++) {
      const roundStats = room.storedRoundStats?.[roundNum] || this.calculateFinalRoundStats(roomId);
      if (roundStats) {
        export_data.roundStats.push(roundStats);
      }
    }

    return export_data;
  }
}