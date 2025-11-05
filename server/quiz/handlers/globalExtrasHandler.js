// server/quiz/handlers/globalExtrasHandler.js
// FIXED: Emit updated leaderboard after restore points usage

import { getQuizRoom } from '../quizRoomManager.js';
import { fundraisingExtraDefinitions } from './../quizMetadata.js';
import { SimplifiedScoringService } from '../gameplayEngines/services/SimplifiedScoringService.js';

const debug = false;

// Send host activity notification
function sendHostActivityNotification(namespace, roomId, activityData) {
  namespace.to(`${roomId}:host`).emit('host_activity_update', {
    type: activityData.type,
    playerName: activityData.playerName,
    targetName: activityData.targetName,
    context: activityData.context || 'Leaderboard',
    round: activityData.round,
    timestamp: Date.now()
  });

  if (debug) {
    console.log(`[GlobalExtrasHandler] 📡 Host notified: ${activityData.playerName} used ${activityData.type}`);
  }
}

// ✅ NEW: Send updated round leaderboard to all players
function sendUpdatedRoundLeaderboard(namespace, roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  // Calculate current round leaderboard with updated data
  const updatedLeaderboard = Object.keys(room.playerData)
    .map(pid => {
      const pData = room.playerData[pid];
      const pInfo = room.players.find(p => p.id === pid);
      
      // Calculate round score (current score - starting score)
      const roundStartScore = pData.roundStartScore || 0;
      const roundScore = (pData.score || 0) - roundStartScore;
      
      return {
        id: pid,
        name: pInfo?.name || 'Unknown',
        score: roundScore, // This is the round score
        roundScore: roundScore,
        penaltyDebt: pData.penaltyDebt || 0,
        settledThisRound: 0,
        cumulativeNegativePoints: pData.cumulativeNegativePoints || 0,
        pointsRestored: pData.pointsRestored || 0, // ✅ CRITICAL: Include updated restore data
        carryDebt: 0
      };
    })
    .sort((a, b) => b.score - a.score);

  // ✅ CRITICAL: Emit the updated leaderboard to ALL players
  namespace.to(roomId).emit('round_leaderboard', updatedLeaderboard);

   namespace.to(`${roomId}:host`).emit('round_leaderboard', updatedLeaderboard);
  
  if (debug) {
    console.log(`[GlobalExtrasHandler] 📊 Updated round leaderboard sent to all players:`, updatedLeaderboard);
  }
}

// Calculate current round stats including all extras used so far
function calculateCurrentRoundStats(room) {
  const stats = {
    roundNumber: room.currentRound,
    hintsUsed: 0,
    freezesUsed: 0,
    pointsRobbed: 0,
    pointsRestored: 0,
    extrasByPlayer: {},
    questionsWithExtras: 0,
    totalExtrasUsed: 0
  };

  // Count asking phase extras from usedExtrasThisRound
  Object.entries(room.playerData).forEach(([playerId, playerData]) => {
    const player = room.players.find(p => p.id === playerId);
    const playerName = player?.name || playerId;
    
    if (!stats.extrasByPlayer[playerName]) {
      stats.extrasByPlayer[playerName] = [];
    }

    // Count round-based extras (hints, freezes) 
    if (playerData.usedExtrasThisRound) {
      Object.entries(playerData.usedExtrasThisRound).forEach(([extraId, used]) => {
        if (used) {
          switch (extraId) {
            case 'buyHint':
              stats.hintsUsed++;
              stats.totalExtrasUsed++;
              stats.extrasByPlayer[playerName].push({
                extraId,
                timestamp: Date.now()
              });
              break;
            case 'freezeOutTeam':
              stats.freezesUsed++;
              stats.totalExtrasUsed++;
              stats.extrasByPlayer[playerName].push({
                extraId,
                timestamp: Date.now()
              });
              break;
          }
        }
      });
    }
  });

  // Count global extras used during leaderboard phase of THIS round
  if (room.globalExtrasUsedThisRound) {
    room.globalExtrasUsedThisRound.forEach(extraUsage => {
      const playerName = extraUsage.playerName;
      
      if (!stats.extrasByPlayer[playerName]) {
        stats.extrasByPlayer[playerName] = [];
      }

      switch (extraUsage.extraId) {
        case 'robPoints':
          stats.pointsRobbed++;
          stats.totalExtrasUsed++;
          stats.extrasByPlayer[playerName].push({
            extraId: 'robPoints',
            target: extraUsage.targetName,
            timestamp: extraUsage.timestamp
          });
          break;
        case 'restorePoints':
          stats.pointsRestored += extraUsage.pointsRestored; // Track actual points restored
          stats.totalExtrasUsed++;
          stats.extrasByPlayer[playerName].push({
            extraId: 'restorePoints',
            pointsRestored: extraUsage.pointsRestored,
            timestamp: extraUsage.timestamp
          });
          break;
      }
    });
  }

  return stats;
}

// Send updated stats to host after any global extra usage
function sendUpdatedStatsToHost(namespace, roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  // Get preserved question stats from stored round stats
  const preservedQuestionStats = room.storedRoundStats?.[room.currentRound] || {};
  
  // Calculate only extras stats
  const extrasStats = calculateCurrentRoundStats(room);
  
  // Merge preserved question stats with updated extras stats
  const completeStats = {
    ...preservedQuestionStats,
    ...extrasStats, // Overwrites extras, preserves questions
    timestamp: Date.now()
  };

  namespace.to(`${roomId}:host`).emit('host_current_round_stats', completeStats);
}

/**
 * Handle global extras that can be used during leaderboard phase
 * @param {string} roomId 
 * @param {string} playerId 
 * @param {string} extraId 
 * @param {string} targetPlayerId 
 * @param {object} namespace 
 * @returns {object} { success: boolean, error?: string }
 */
export function handleGlobalExtra(roomId, playerId, extraId, targetPlayerId, namespace) {
  const room = getQuizRoom(roomId);
  if (!room) {
    return { success: false, error: 'Room not found' };
  }

  // Validate phase - global extras only during leaderboard
  if (room.currentPhase !== 'leaderboard') {
    return { success: false, error: 'Global extras can only be used during leaderboard phase' };
  }

  const playerData = room.playerData[playerId];
  if (!playerData) {
    return { success: false, error: 'Player data not found' };
  }

  // Check if player is frozen
  if (playerData.frozenNextQuestion) {
    console.warn(`[GlobalExtrasHandler] ❄️ ${playerId} is frozen and cannot use extras`);
    return { success: false, error: 'You are frozen and cannot use extras!' };
  }

  if (debug) {
    console.log(`[GlobalExtrasHandler] 🌍 ${playerId} using global extra "${extraId}"${targetPlayerId ? ` on ${targetPlayerId}` : ''}`);
  }

  // Validate purchase
  if (!playerData.purchases[extraId]) {
    return { success: false, error: 'You have not purchased this extra' };
  }

  // Check if already used
  if (playerData.usedExtras[extraId]) {
    return { success: false, error: 'You have already used this extra' };
  }

  // Execute the specific global extra
  const result = executeGlobalExtra(roomId, playerId, extraId, targetPlayerId, namespace);

  if (result.success) {
    // Mark as used (but NOT for restorePoints - it has its own limit logic)
    if (extraId !== 'restorePoints') {
      playerData.usedExtras[extraId] = true;
      playerData.usedExtrasThisRound[extraId] = true;
    }
    
    // Track global extra usage for this round's stats
    if (!room.globalExtrasUsedThisRound) {
      room.globalExtrasUsedThisRound = [];
    }
    
    const player = room.players.find(p => p.id === playerId);
    const targetPlayer = targetPlayerId ? room.players.find(p => p.id === targetPlayerId) : null;
    
    room.globalExtrasUsedThisRound.push({
      extraId,
      playerId,
      playerName: player?.name || 'Unknown',
      targetPlayerId,
      targetName: targetPlayer?.name,
      pointsRestored: result.pointsRestored || 0,
      appliedToDebt: result.appliedToDebt || 0,
      addedToScore: result.addedToScore || 0,
      timestamp: Date.now(),
      round: room.currentRound
    });
    
    // ✅ CRITICAL FIX: Send updated leaderboard to ALL players after any global extra
    sendUpdatedRoundLeaderboard(namespace, roomId);
    
    // Send updated stats to host after any global extra usage
    sendUpdatedStatsToHost(namespace, roomId);
    
    if (debug) console.log(`[GlobalExtrasHandler] ✅ ${extraId} executed successfully for ${playerId}`);
  } else {
    if (debug) console.warn(`[GlobalExtrasHandler] ❌ ${extraId} execution failed for ${playerId}: ${result.error}`);
  }

  return result;
}

/**
 * Execute specific global extra logic
 */
function executeGlobalExtra(roomId, playerId, extraId, targetPlayerId, namespace) {
  switch (extraId) {
    case 'robPoints':
      return executeRobPoints(roomId, playerId, targetPlayerId, namespace);
    case 'restorePoints':
      return executeRestorePoints(roomId, playerId, namespace);
    default:
      return { success: false, error: 'Unknown global extra type' };
  }
}

/**
 * Execute robPoints logic - steal points from another player
 */
function executeRobPoints(roomId, playerId, targetPlayerId, namespace) {
  if (!targetPlayerId) {
    return { success: false, error: 'Target player required for robPoints' };
  }

  const room = getQuizRoom(roomId);

  // Use SimplifiedScoringService
  const result = SimplifiedScoringService.processRobPoints(room, playerId, targetPlayerId);
  
  if (!result.success) {
    return result;
  }

  const player = room.players.find(p => p.id === playerId);
  const targetPlayer = room.players.find(p => p.id === targetPlayerId);
  const playerName = player?.name || 'Someone';
  const targetName = targetPlayer?.name || 'Someone';

  if (debug) {
    console.log(`[RobPoints] 💰 ${playerName} robbed ${result.pointsRobbed} points from ${targetName}`);
    console.log(`[RobPoints] 📊 New scores - ${playerName}: ${result.robberNewScore}, ${targetName}: ${result.targetNewScore}`);
  }

  // Send host notification
  sendHostActivityNotification(namespace, roomId, {
    type: 'rob',
    playerName: playerName,
    targetName: targetName,
    round: room.currentRound
  });

  // Send notifications to players
  if (player?.socketId) {
    const robbingSocket = namespace.sockets.get(player.socketId);
    if (robbingSocket) {
      robbingSocket.emit('quiz_notification', {
        type: 'success',
        message: `You stole ${result.pointsRobbed} points from ${targetName}! 💰`
      });
    }
  }

  if (targetPlayer?.socketId) {
    const targetSocket = namespace.sockets.get(targetPlayer.socketId);
    if (targetSocket) {
      targetSocket.emit('robin_hood_animation', {
        stolenPoints: result.pointsRobbed,
        fromTeam: targetName,
        toTeam: playerName,
        robberName: playerName
      });
    }
  }

  return { success: true };
}

/**
 * Execute restorePoints logic - regain lost points
 */
function executeRestorePoints(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  
  // Use SimplifiedScoringService
  const result = SimplifiedScoringService.processRestorePoints(room, playerId);
  
  if (!result.success) {
    return result;
  }

  const player = room.players.find(p => p.id === playerId);
  const playerName = player?.name || 'Someone';

  if (debug) {
    console.log(`[RestorePoints] 🎯 ${playerName} restored ${result.pointsRestored} points, new score: ${result.newScore}`);
  }

  // Send host notification
  sendHostActivityNotification(namespace, roomId, {
    type: 'restore',
    playerName,
    round: room.currentRound,
    context: 'Leaderboard'
  });

  // Notify player
  if (player?.socketId) {
    const playerSocket = namespace.sockets.get(player.socketId);
    if (playerSocket) {
      playerSocket.emit('quiz_notification', {
        type: 'success',
        message: `You restored ${result.pointsRestored} points! (${result.remainingRestores} restores remaining)`
      });
    }
  }

  return { 
    success: true, 
    pointsRestored: result.pointsRestored,
    appliedToDebt: 0, // For compatibility with existing tracking
    addedToScore: result.pointsRestored 
  };
}

// Export function to get current round stats for final calculation
export function getCurrentRoundStats(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return null;
  
  return calculateCurrentRoundStats(room);
}

// Export function to reset global extras tracking for new round
export function resetGlobalExtrasForNewRound(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return;
  
  room.globalExtrasUsedThisRound = [];
  
  if (debug) {
    console.log(`[GlobalExtrasHandler] 🔄 Global extras tracking reset for round ${room.currentRound}`);
  }
}