// server/quiz/gameplayEngines/services/LeaderboardService.js
// Centralized leaderboard calculation service
// Extracts identical leaderboard logic from generalTriviaEngine.js and wipeoutEngine.js
// Handles score sorting, player data aggregation, and leaderboard formatting

const debug = false;

function getTiebreakerBonus(room, playerId) {
  if (!room || !room.tiebreakerAwards) return 0;
  const v = room.tiebreakerAwards[playerId];
  return typeof v === 'number' ? v : 0;
}

export class LeaderboardService {
  /**
   * Build leaderboard from room data
   * Extracted from both engines - identical implementation
   * Aggregates player scores and sorts by highest score first
   * 
   * @param {Object} room - The quiz room object
   * @returns {Array} Sorted leaderboard array with player data
   */
  static buildLeaderboard(room) {
    if (!room) {
      if (debug) {
        console.error(`[LeaderboardService] ❌ Cannot build leaderboard - room is null/undefined`);
      }
      return [];
    }

    if (debug) {
      console.log(`[LeaderboardService] 📊 Building leaderboard for room with ${room.players.length} players`);
    }

    // Map player data to leaderboard entries
    const leaderboard = Object.entries(room.playerData).map(([playerId, data]) => {
      const player = room.players.find(p => p.id === playerId);
      const playerName = player?.name || playerId;

      const entry = {
        id: playerId,
        name: playerName,
        score: data.score || 0,
        cumulativeNegativePoints: data.cumulativeNegativePoints || 0,
        pointsRestored: data.pointsRestored || 0,
       // Include debt for display purposes
      };

      // ✅ apply tiebreaker bonus (if any)
const tbBonus = getTiebreakerBonus(room, playerId);
entry.tiebreakerBonus = tbBonus;     // optional: handy for UI/debug
entry.score += tbBonus;               // <-- make the winner pull ahead numerically

    

      return entry;
    });

    // Sort by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);

    if (debug) {
      console.log(`[LeaderboardService] 🏆 Leaderboard sorted - Top 3:`);
      leaderboard.slice(0, 3).forEach((entry, index) => {
        console.log(`[LeaderboardService] ${index + 1}. ${entry.name}: ${entry.score} points`);
      });
    }

    return leaderboard;
  }

  /**
   * Build detailed leaderboard with additional statistics
   * Enhanced version that includes more player statistics
   * 
   * @param {Object} room - The quiz room object
   * @returns {Array} Detailed leaderboard with extended statistics
   */
  static buildDetailedLeaderboard(room) {
    if (!room) {
      if (debug) {
        console.error(`[LeaderboardService] ❌ Cannot build detailed leaderboard - room is null/undefined`);
      }
      return [];
    }

    if (debug) {
      console.log(`[LeaderboardService] 📊 Building detailed leaderboard for room with ${room.players.length} players`);
    }

    const leaderboard = Object.entries(room.playerData).map(([playerId, data]) => {
      const player = room.players.find(p => p.id === playerId);
      const playerName = player?.name || playerId;

      const tbBonus = getTiebreakerBonus(room, playerId);
entry.tiebreakerBonus = tbBonus;
entry.score += tbBonus;

      // Calculate additional statistics
      const totalAnswers = Object.keys(data.answers || {}).length;
      const correctAnswers = Object.values(data.answers || {}).filter(answer => answer.correct).length;
      const wrongAnswers = Object.values(data.answers || {}).filter(answer => 
        answer.submitted !== null && answer.submitted !== undefined && !answer.correct
      ).length;
      const noAnswers = Object.values(data.answers || {}).filter(answer => 
        answer.submitted === null || answer.submitted === undefined || answer.noAnswer
      ).length;

      const accuracyPercentage = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      // Count extras used
      const extrasUsed = Object.values(data.usedExtras || {}).filter(used => used).length;
      const extrasUsedThisRound = Object.values(data.usedExtrasThisRound || {}).filter(used => used).length;

      const entry = {
        id: playerId,
        name: playerName,
        score: data.score || 0,
        cumulativeNegativePoints: data.cumulativeNegativePoints || 0,
        pointsRestored: data.pointsRestored || 0,
        
        statistics: {
          totalAnswers,
          correctAnswers,
          wrongAnswers,
          noAnswers,
          accuracyPercentage,
          extrasUsed,
          extrasUsedThisRound
        },
        status: data.status || 'active',
        frozen: data.frozenNextQuestion || false
      };

      if (debug) {
        console.log(`[LeaderboardService] 📝 ${playerName}: ${entry.score}pts, ${correctAnswers}/${totalAnswers} correct (${accuracyPercentage}%), ${extrasUsed} extras`);
      }

      return entry;
    });

    // Sort by score (highest first)
    leaderboard.sort((a, b) => b.score - a.score);

    if (debug) {
      console.log(`[LeaderboardService] 🏆 Detailed leaderboard complete with ${leaderboard.length} players`);
    }

    return leaderboard;
  }

  /**
   * Get leaderboard with rank positions
   * Adds rank field to each player entry
   * 
   * @param {Object} room - The quiz room object
   * @returns {Array} Leaderboard with rank positions
   */
  static buildRankedLeaderboard(room) {
    const leaderboard = this.buildLeaderboard(room);

    if (debug) {
      console.log(`[LeaderboardService] 🏅 Adding rank positions to ${leaderboard.length} players`);
    }

    // Add rank positions (handle ties)
    let currentRank = 1;
    let previousScore = null;
    let playersAtCurrentRank = 0;

    leaderboard.forEach((entry, index) => {
      if (previousScore !== null && entry.score < previousScore) {
        currentRank += playersAtCurrentRank;
        playersAtCurrentRank = 1;
      } else {
        playersAtCurrentRank++;
      }

      entry.rank = currentRank;
      previousScore = entry.score;

      if (debug) {
        console.log(`[LeaderboardService] 🏅 Rank ${entry.rank}: ${entry.name} (${entry.score} points)`);
      }
    });

    return leaderboard;
  }

  /**
   * Get top N players from leaderboard
   * 
   * @param {Object} room - The quiz room object
   * @param {number} topN - Number of top players to return
   * @returns {Array} Top N players
   */
  static getTopPlayers(room, topN = 10) {
    const leaderboard = this.buildLeaderboard(room);
    const topPlayers = leaderboard.slice(0, topN);

    if (debug) {
      console.log(`[LeaderboardService] 🏆 Retrieved top ${topPlayers.length} players (requested ${topN})`);
    }

    return topPlayers;
  }

  /**
   * Get leaderboard statistics
   * Calculate aggregate statistics across all players
   * 
   * @param {Object} room - The quiz room object
   * @returns {Object} Leaderboard statistics
   */
  static getLeaderboardStats(room) {
    if (!room || !room.playerData) {
      if (debug) {
        console.error(`[LeaderboardService] ❌ Cannot calculate stats - invalid room data`);
      }
      return null;
    }

    const players = Object.values(room.playerData);
    const activePlayers = players.filter(p => p.status !== 'inactive');

    if (debug) {
      console.log(`[LeaderboardService] 📈 Calculating stats for ${activePlayers.length} active players`);
    }

    const scores = activePlayers.map(p => p.score || 0);
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    const averageScore = activePlayers.length > 0 ? Math.round(totalScore / activePlayers.length) : 0;
    const highestScore = Math.max(...scores, 0);
    const lowestScore = Math.min(...scores, 0);

    // Calculate total extras usage
    const totalExtrasUsed = activePlayers.reduce((total, player) => {
      const extrasCount = Object.values(player.usedExtras || {}).filter(used => used).length;
      return total + extrasCount;
    }, 0);

 

    const stats = {
      totalPlayers: room.players.length,
      activePlayers: activePlayers.length,
      averageScore,
      highestScore,
      lowestScore,
      totalScore,
      totalExtrasUsed,
      
      currentRound: room.currentRound,
      questionsAsked: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length
    };

    if (debug) {
      console.log(`[LeaderboardService] 📈 Stats calculated: avg=${averageScore}, high=${highestScore}, extras=${totalExtrasUsed}`);
    }

    return stats;
  }

  /**
   * Find player position in leaderboard
   * 
   * @param {Object} room - The quiz room object
   * @param {string} playerId - The player ID to find
   * @returns {Object|null} Player position data or null if not found
   */
  static getPlayerPosition(room, playerId) {
    const rankedLeaderboard = this.buildRankedLeaderboard(room);
    const playerEntry = rankedLeaderboard.find(entry => entry.id === playerId);

    if (!playerEntry) {
      if (debug) {
        console.warn(`[LeaderboardService] ⚠️ Player ${playerId} not found in leaderboard`);
      }
      return null;
    }

    const totalPlayers = rankedLeaderboard.length;
    const playersAbove = rankedLeaderboard.filter(entry => entry.score > playerEntry.score).length;
    const playersBelow = rankedLeaderboard.filter(entry => entry.score < playerEntry.score).length;

    const positionData = {
      ...playerEntry,
      totalPlayers,
      playersAbove,
      playersBelow,
      percentile: totalPlayers > 0 ? Math.round(((totalPlayers - playerEntry.rank + 1) / totalPlayers) * 100) : 0
    };

    if (debug) {
      console.log(`[LeaderboardService] 🎯 Player ${playerEntry.name} position: rank ${playerEntry.rank}/${totalPlayers} (${positionData.percentile}th percentile)`);
    }

    return positionData;
  }
}