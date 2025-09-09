// server/quiz/gameplayEngines/services/SimplifiedScoringService.js
// COMPLETE: All scoring logic with proper no-answer penalties and restore points

import { getRoundScoring } from '../../handlers/scoringUtils.js';

const debug = false;

export class SimplifiedScoringService {
  /**
   * Initialize round tracking for a player
   * Call this at the start of each round
   */
  static initializeRoundTracking(room, playerId) {
    const playerData = room.playerData[playerId];
    if (!playerData) return;

    // Track the score at the start of this round
    playerData.roundStartScore = playerData.score || 0;
    
    // Track round contributions separately
    if (!playerData.roundContributions) {
      playerData.roundContributions = {};
    }
    
    playerData.roundContributions[room.currentRound] = 0;

    if (debug) {
      console.log(`[SimplifiedScoringService] 🔄 Round ${room.currentRound} tracking initialized for ${playerId}: startScore=${playerData.roundStartScore}`);
    }
  }

  /**
   * Get current round score for a player
   * This is what should be shown on round leaderboards
   */
  static getCurrentRoundScore(room, playerId) {
    const playerData = room.playerData[playerId];
    if (!playerData) return 0;

    // Current round score = cumulative score - score at round start
    const roundStartScore = playerData.roundStartScore || 0;
    const currentScore = playerData.score || 0;
    return currentScore - roundStartScore;
  }

  /**
   * Apply points to current round only
   * Updates both cumulative and round tracking
   */
  static applyPointsToCurrentRound(room, playerId, pointsDelta) {
    const playerData = room.playerData[playerId];
    if (!playerData) return false;

    // Only track negative points from wrong answers and no-answers, NOT from rob points
    // Check if this is a penalty from gameplay (not from rob points)
    const isGameplayPenalty = pointsDelta < 0 && room.currentPhase === 'asking';
    
    if (isGameplayPenalty) {
      playerData.cumulativeNegativePoints = (playerData.cumulativeNegativePoints || 0) + Math.abs(pointsDelta);
      if (debug) {
        console.log(`[SimplifiedScoringService] 📊 Updated cumulativeNegativePoints for ${playerId}: +${Math.abs(pointsDelta)} = ${playerData.cumulativeNegativePoints} (gameplay penalty)`);
      }
    } else if (pointsDelta < 0) {
      if (debug) {
        console.log(`[SimplifiedScoringService] 📊 Negative points applied to ${playerId}: ${pointsDelta} (NOT counted as gameplay penalty)`);
      }
    }

    // Update cumulative score
    playerData.score = (playerData.score || 0) + pointsDelta;

    // Update round contribution tracking
    if (!playerData.roundContributions) {
      playerData.roundContributions = {};
    }
    
    const currentContribution = playerData.roundContributions[room.currentRound] || 0;
    playerData.roundContributions[room.currentRound] = currentContribution + pointsDelta;

    if (debug) {
      console.log(`[SimplifiedScoringService] 📊 Applied ${pointsDelta} to round ${room.currentRound} for ${playerId}: cumulative=${playerData.score}, roundContrib=${playerData.roundContributions[room.currentRound]}, cumulativeNegative=${playerData.cumulativeNegativePoints || 0}`);
    }

    return true;
  }

  /**
   * Process a player's answer with simplified scoring
   * FIXED: Don't apply no-answer penalties here - let finalization handle them
   */
  static processAnswer(room, playerId, question, answer) {
    if (!room || !playerId || !question) {
      if (debug) {
        console.error(`[SimplifiedScoringService] ❌ Invalid parameters for processAnswer`);
      }
      return { success: false, error: 'Invalid parameters' };
    }

    const playerData = room.playerData[playerId];
    if (!playerData) {
      if (debug) {
        console.error(`[SimplifiedScoringService] ❌ Player data not found for ${playerId}`);
      }
      return { success: false, error: 'Player data not found' };
    }

    // Get scoring configuration for current round
    const scoring = getRoundScoring(room, room.currentRound - 1);
    const qDifficulty = (question.difficulty || 'medium').toLowerCase();
    
    if (debug) {
      console.log(`[SimplifiedScoringService] 🎯 Processing answer for ${playerId}, question difficulty: ${qDifficulty}`);
      console.log(`[SimplifiedScoringService] 🎯 Scoring config:`, scoring);
    }

    const key = `${question.id}_round${room.currentRound}`;
    
    // Check if already answered
    if (playerData.answers[key]) {
      if (debug) {
        console.log(`[SimplifiedScoringService] ⚠️ Player ${playerId} already answered question ${question.id}`);
      }
      return { success: false, error: 'Already answered' };
    }

    let pointsDelta = 0;
    let isCorrect = false;
    let noAnswer = false;

    // Handle no answer (timeout or explicit null) - DON'T apply penalty here
    if (answer == null || answer === '') {
      noAnswer = true;
      pointsDelta = 0; // Don't apply penalty here - let finalization handle it
      
      if (debug) {
        console.log(`[SimplifiedScoringService] ⏰ No answer - will be penalized during finalization`);
      }
    } else {
      // Check if answer is correct
      isCorrect = String(answer).trim().toLowerCase() === String(question.correctAnswer).trim().toLowerCase();
      
      if (isCorrect) {
        // Award points based on difficulty
        pointsDelta = scoring.pointsPerDifficulty[qDifficulty] ?? scoring.pointsPerDifficulty.medium ?? 2;
        
        if (debug) {
          console.log(`[SimplifiedScoringService] ✅ Correct answer: +${pointsDelta} points`);
        }
      } else {
        // Apply wrong answer penalty if configured
        const penalty = scoring.pointsLostPerWrong || 0;
        if (penalty > 0) {
          pointsDelta = -penalty;
          if (debug) {
            console.log(`[SimplifiedScoringService] ❌ Wrong answer penalty: -${penalty} points`);
          }
        }
      }
    }

    // Apply points using round tracking (only if not no-answer)
    const oldScore = playerData.score || 0;
    if (!noAnswer) {
      this.applyPointsToCurrentRound(room, playerId, pointsDelta);
    }

    // Store answer record
    playerData.answers[key] = {
      submitted: answer,
      correct: isCorrect,
      noAnswer: noAnswer,
      pointsDelta: pointsDelta,
      finalized: !noAnswer // No-answer records are not finalized until sweep
    };

    if (debug) {
      if (noAnswer) {
        console.log(`[SimplifiedScoringService] ⏰ No-answer recorded for ${playerId} on ${question.id} - penalty will be applied during finalization`);
      } else {
        console.log(`[SimplifiedScoringService] 📊 Score update for ${playerId}: ${oldScore} → ${playerData.score} (${pointsDelta >= 0 ? '+' : ''}${pointsDelta})`);
      }
    }

    return {
      success: true,
      pointsDelta: pointsDelta,
      newScore: playerData.score,
      isCorrect: isCorrect,
      noAnswer: noAnswer
    };
  }

  /**
   * Process Rob Points extra - FIXED to NOT affect cumulativeNegativePoints
   */
  static processRobPoints(room, playerId, targetPlayerId) {
    if (!room || !playerId || !targetPlayerId) {
      return { success: false, error: 'Invalid parameters' };
    }

    if (playerId === targetPlayerId) {
      return { success: false, error: 'Cannot rob from yourself' };
    }

    const playerData = room.playerData[playerId];
    const targetData = room.playerData[targetPlayerId];

    if (!playerData || !targetData) {
      return { success: false, error: 'Player data not found' };
    }

    const pointsToRob = 2;

    // Apply to current round only, not cumulative
    const oldPlayerScore = playerData.score || 0;
    const oldTargetScore = targetData.score || 0;

    // Rob points don't count as gameplay penalties
    // Temporarily set phase to prevent cumulativeNegativePoints tracking
    const originalPhase = room.currentPhase;
    room.currentPhase = 'leaderboard'; // Ensure rob points aren't counted as gameplay penalties
    
    // Use round tracking method
    this.applyPointsToCurrentRound(room, playerId, pointsToRob);
    this.applyPointsToCurrentRound(room, targetPlayerId, -pointsToRob);
    
    // Restore original phase
    room.currentPhase = originalPhase;

    if (debug) {
      console.log(`[SimplifiedScoringService] 💰 Rob Points executed (ROUND-BASED, NO gameplay penalty):`);
      console.log(`[SimplifiedScoringService] 📈 Robber: ${oldPlayerScore} → ${playerData.score} (+${pointsToRob} to round)`);
      console.log(`[SimplifiedScoringService] 📉 Target: ${oldTargetScore} → ${targetData.score} (-${pointsToRob} from round, NOT counted as gameplay penalty)`);
    }

    return {
      success: true,
      pointsRobbed: pointsToRob,
      robberNewScore: playerData.score,
      targetNewScore: targetData.score
    };
  }

  /**
   * Process Restore Points extra - Uses configuration
   * Players can restore points up to the amount they've lost (max from config)
   */
  static processRestorePoints(room, playerId) {
    if (!room || !playerId) {
      return { success: false, error: 'Invalid parameters' };
    }

    const playerData = room.playerData[playerId];
    if (!playerData) {
      return { success: false, error: 'Player data not found' };
    }

    // Get max restore from configuration instead of hardcoding
    const fundraisingConfig = room.config?.fundraisingOptions?.restorePoints;
    const maxLifetimeRestores = fundraisingConfig?.totalRestorePoints || 3; // Fallback to 3
    
    const cumulativeNegativePoints = playerData.cumulativeNegativePoints || 0;
    const alreadyRestored = playerData.pointsRestored || 0;

    if (debug) {
      console.log(`[SimplifiedScoringService] 🎯 Restore Points Check:`);
      console.log(`   - Max lifetime restores (from config): ${maxLifetimeRestores}`);
      console.log(`   - Cumulative negative points: ${cumulativeNegativePoints}`);
      console.log(`   - Already restored: ${alreadyRestored}`);
    }

    // Check if player has any negative points to restore
    if (cumulativeNegativePoints <= 0) {
      return { success: false, error: 'No negative points to restore' };
    }

    // Check if player has used all lifetime restores
    if (alreadyRestored >= maxLifetimeRestores) {
      return { success: false, error: `Maximum restore points already used (${alreadyRestored}/${maxLifetimeRestores})` };
    }

    // Check if player has already restored all their negative points
    if (alreadyRestored >= cumulativeNegativePoints) {
      return { success: false, error: 'All negative points already restored' };
    }

    // Calculate how many points can be restored
    const maxRestorableFromNegatives = cumulativeNegativePoints - alreadyRestored;
    const maxRestorableFromLifetime = maxLifetimeRestores - alreadyRestored;
    const pointsToRestore = Math.min(1, maxRestorableFromNegatives, maxRestorableFromLifetime);

    if (pointsToRestore <= 0) {
      return { success: false, error: 'No restore points available' };
    }

    const oldScore = playerData.score || 0;
    
    // Apply to current round only
    this.applyPointsToCurrentRound(room, playerId, pointsToRestore);
    playerData.pointsRestored = alreadyRestored + pointsToRestore;

    const remainingFromNegatives = cumulativeNegativePoints - playerData.pointsRestored;
    const remainingFromLifetime = maxLifetimeRestores - playerData.pointsRestored;
    const remainingRestores = Math.min(remainingFromNegatives, remainingFromLifetime);

    if (debug) {
      console.log(`[SimplifiedScoringService] 🎯 Restore Points executed:`);
      console.log(`[SimplifiedScoringService] 📈 Score: ${oldScore} → ${playerData.score} (+${pointsToRestore} to round)`);
      console.log(`[SimplifiedScoringService] 📊 Restored: ${playerData.pointsRestored}/${maxLifetimeRestores} lifetime, ${playerData.pointsRestored}/${cumulativeNegativePoints} from negatives`);
      console.log(`[SimplifiedScoringService] 🔄 Remaining restores: ${remainingRestores}`);
    }

    return {
      success: true,
      pointsRestored: pointsToRestore,
      newScore: playerData.score,
      totalRestored: playerData.pointsRestored,
      remainingRestores: remainingRestores,
      cumulativeNegativePoints: cumulativeNegativePoints
    };
  }

  /**
   * Calculate round leaderboard - Uses round tracking
   */
  static calculateRoundLeaderboard(room) {
    if (!room) {
      return [];
    }

    if (debug) {
      console.log(`[SimplifiedScoringService] 📊 Calculating round leaderboard for round ${room.currentRound}`);
    }

    const leaderboard = Object.entries(room.playerData).map(([playerId, data]) => {
      const player = room.players.find(p => p.id === playerId);
      
      // Use round score calculation
      const roundScore = this.getCurrentRoundScore(room, playerId);
      
      return {
        id: playerId,
        name: player?.name || 'Unknown',
        score: roundScore, // This is the round score only
        roundScore: roundScore,
        pointsRestored: data.pointsRestored || 0
      };
    });

    // Sort by round score (highest first, allow negative)
    leaderboard.sort((a, b) => b.score - a.score);

    if (debug) {
      console.log(`[SimplifiedScoringService] 🏆 Round leaderboard calculated with ${leaderboard.length} players`);
      leaderboard.slice(0, 3).forEach((entry, index) => {
        console.log(`[SimplifiedScoringService] ${index + 1}. ${entry.name}: ${entry.score} round points`);
      });
    }

    return leaderboard;
  }

  /**
   * Calculate overall leaderboard (cumulative across all completed rounds)
   */
  static calculateOverallLeaderboard(room, previousRoundResults = []) {
    if (!room) {
      return [];
    }

    if (debug) {
      console.log(`[SimplifiedScoringService] 📊 Calculating overall leaderboard through round ${room.currentRound}`);
    }

    // Use cumulative scores from playerData.score
    const leaderboard = Object.entries(room.playerData).map(([playerId, data]) => {
      const player = room.players.find(p => p.id === playerId);
      
      return {
        id: playerId,
        name: player?.name || 'Unknown',
        score: data.score || 0, // This is the cumulative score
        totalScore: data.score || 0,
        pointsRestored: data.pointsRestored || 0
      };
    });

    leaderboard.sort((a, b) => b.totalScore - a.totalScore);

    if (debug) {
      console.log(`[SimplifiedScoringService] 🏆 Overall leaderboard calculated with ${leaderboard.length} players`);
      leaderboard.slice(0, 3).forEach((entry, index) => {
        console.log(`[SimplifiedScoringService] ${index + 1}. ${entry.name}: ${entry.totalScore} total points`);
      });
    }

    return leaderboard;
  }

  /**
   * Finalize previous question for all players
   * FIXED: Properly apply no-answer penalties to players who didn't respond
   */
  static finalizePreviousQuestion(room) {
    if (!room?.questions?.length) return 0;

    const prevIndex = room.currentQuestionIndex - 1;
    if (prevIndex < 0) return 0;

    const prevQuestion = room.questions[prevIndex];
    if (!prevQuestion) return 0;

    const scoring = getRoundScoring(room, room.currentRound - 1);
    const key = `${prevQuestion.id}_round${room.currentRound}`;
    
    let penalizedPlayers = 0;

    if (debug) {
      console.log(`[SimplifiedScoringService] 🔄 Finalizing question ${prevQuestion.id}`);
      console.log(`[SimplifiedScoringService] 🔄 No-answer penalty configured: ${scoring.pointsLostPerUnanswered}`);
    }

    room.players.forEach(player => {
      const playerData = room.playerData[player.id];
      if (!playerData) return;

      const existingAnswer = playerData.answers[key];

      if (!existingAnswer) {
        // Player never submitted anything - create no-answer record with penalty
        const penalty = scoring.pointsLostPerUnanswered || 0;
        const pointsDelta = penalty > 0 ? -penalty : 0;
        
        if (pointsDelta !== 0) {
          this.applyPointsToCurrentRound(room, player.id, pointsDelta);
          penalizedPlayers++;
        }
        
        playerData.answers[key] = {
          submitted: null,
          correct: false,
          noAnswer: true,
          pointsDelta: pointsDelta,
          finalized: true
        };

        if (debug) {
          console.log(`[SimplifiedScoringService] ⏰ ${player.name}: no-answer penalty -${penalty}, new score: ${playerData.score}`);
        }
      } else if (existingAnswer.noAnswer && !existingAnswer.finalized) {
        // Player submitted no-answer but penalty wasn't applied yet
        const penalty = scoring.pointsLostPerUnanswered || 0;
        const pointsDelta = penalty > 0 ? -penalty : 0;
        
        if (pointsDelta !== 0) {
          this.applyPointsToCurrentRound(room, player.id, pointsDelta);
          penalizedPlayers++;
        }

        // Update the existing record
        existingAnswer.pointsDelta = pointsDelta;
        existingAnswer.finalized = true;

        if (debug) {
          console.log(`[SimplifiedScoringService] ⏰ ${player.name}: no-answer penalty applied retroactively -${penalty}, new score: ${playerData.score}`);
        }
      }
    });

    if (debug) {
      console.log(`[SimplifiedScoringService] ✅ Question finalized, ${penalizedPlayers} players penalized`);
    }

    return penalizedPlayers;
  }

  /**
   * Get player's statistics for current round
   */
  static getPlayerStats(room, playerId) {
    if (!room || !playerId) return null;

    const playerData = room.playerData[playerId];
    if (!playerData) return null;

    const answers = playerData.answers || {};
    const currentRoundAnswers = Object.entries(answers).filter(([key]) => 
      key.includes(`_round${room.currentRound}`)
    );

    const roundScore = this.getCurrentRoundScore(room, playerId);

    const stats = {
      score: roundScore, // Use round score for round stats
      cumulativeScore: playerData.score || 0, // Also provide cumulative
      answersSubmitted: currentRoundAnswers.length,
      correctAnswers: currentRoundAnswers.filter(([, answer]) => answer.correct).length,
      wrongAnswers: currentRoundAnswers.filter(([, answer]) => 
        !answer.correct && !answer.noAnswer
      ).length,
      noAnswers: currentRoundAnswers.filter(([, answer]) => answer.noAnswer).length,
      pointsRestored: playerData.pointsRestored || 0
    };

    if (debug) {
      console.log(`[SimplifiedScoringService] 📊 Stats for ${playerId}:`, stats);
    }

    return stats;
  }
}