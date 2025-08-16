// server/quiz/handlers/globalExtrasHandler.js

import { getQuizRoom } from '../quizRoomManager.js';
import { fundraisingExtraDefinitions } from './../quizMetadata.js';

const debug = true;

// ✅ NEW: Send host activity notification
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

// ✅ FIXED: Calculate current round stats including all extras used so far
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

    // ✅ Count round-based extras (hints, freezes) 
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

  // ✅ NEW: Count global extras used during leaderboard phase of THIS round
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

// ✅ NEW: Send updated stats to host
function sendUpdatedStatsToHost(namespace, roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return;

  const updatedStats = calculateCurrentRoundStats(room);
  namespace.to(`${roomId}:host`).emit('host_current_round_stats', updatedStats);

  if (debug) {
    console.log(`[GlobalExtrasHandler] 📊 Updated stats sent to host:`, updatedStats);
  }
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

  // ✅ Validate phase - global extras only during leaderboard
  if (room.currentPhase !== 'leaderboard') {
    return { success: false, error: 'Global extras can only be used during leaderboard phase' };
  }

  const playerData = room.playerData[playerId];
  if (!playerData) {
    return { success: false, error: 'Player data not found' };
  }

  // ✅ Check if player is frozen
  if (playerData.frozenNextQuestion) {
    console.warn(`[GlobalExtrasHandler] ❄️ ${playerId} is frozen and cannot use extras`);
    return { success: false, error: 'You are frozen and cannot use extras!' };
  }

  if (debug) {
    console.log(`[GlobalExtrasHandler] 🌍 ${playerId} using global extra "${extraId}"${targetPlayerId ? ` on ${targetPlayerId}` : ''}`);
  }

  // ✅ Validate purchase
  if (!playerData.purchases[extraId]) {
    return { success: false, error: 'You have not purchased this extra' };
  }

  // ✅ Check if already used
  if (playerData.usedExtras[extraId]) {
    return { success: false, error: 'You have already used this extra' };
  }

  // ✅ Execute the specific global extra
  const result = executeGlobalExtra(roomId, playerId, extraId, targetPlayerId, namespace);

  if (result.success) {
    // ✅ Mark as used (but NOT for restorePoints - it has its own limit logic)
    if (extraId !== 'restorePoints') {
      playerData.usedExtras[extraId] = true;
      playerData.usedExtrasThisRound[extraId] = true;
    }
    
    // ✅ NEW: Track global extra usage for this round's stats
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
      pointsRestored: result.pointsRestored || 0, // For restorePoints tracking
      timestamp: Date.now(),
      round: room.currentRound
    });
    
    // ✅ Send updated stats to host after any global extra usage
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
    // ✅ Future global extras can be added here
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
  
  // ✅ Validate players exist
  if (playerId === targetPlayerId) {
    return { success: false, error: 'You cannot rob points from yourself!' };
  }

  const playerData = room.playerData[playerId];
  const targetData = room.playerData[targetPlayerId];
  
  if (!targetData) {
    return { success: false, error: 'Target player not found' };
  }

  // ✅ Get points to rob from metadata
  const pointsToRob = fundraisingExtraDefinitions.robPoints?.pointsToRob || 2;

  // ✅ Validate target has enough points
  if (targetData.score < pointsToRob) {
    return { success: false, error: `Target player only has ${targetData.score} points (need ${pointsToRob}+)` };
  }

  // ✅ Get player names for notifications
  const player = room.players.find(p => p.id === playerId);
  const targetPlayer = room.players.find(p => p.id === targetPlayerId);
  const playerName = player?.name || 'Someone';
  const targetName = targetPlayer?.name || 'Someone';

  // ✅ Execute the point transfer
  const oldPlayerScore = playerData.score;
  const oldTargetScore = targetData.score;
  
  playerData.score += pointsToRob;
  targetData.score -= pointsToRob;

  if (debug) {
    console.log(`[RobPoints] 💰 Point transfer executed:`);
    console.log(`  - ${playerName}: ${oldPlayerScore} → ${playerData.score} (+${pointsToRob})`);
    console.log(`  - ${targetName}: ${oldTargetScore} → ${targetData.score} (-${pointsToRob})`);
  }

  // ✅ Notify host of rob points activity
  sendHostActivityNotification(namespace, roomId, {
    type: 'rob',
    playerName: playerName,
    targetName: targetName,
    round: room.currentRound
  });

  // ✅ FIXED: Generate updated leaderboard data but don't auto-switch display
  const updatedLeaderboard = Object.keys(room.playerData)
    .map(pid => {
      const pData = room.playerData[pid];
      const pInfo = room.players.find(p => p.id === pid);
      return {
        id: pid,
        name: pInfo?.name || 'Unknown',
        score: pData.score,
        cumulativeNegativePoints: pData.cumulativeNegativePoints || 0,
        pointsRestored: pData.pointsRestored || 0
      };
    })
    .sort((a, b) => b.score - a.score);

  // ✅ FIXED: Check what's currently being displayed and update accordingly
  // If showing round results, update round leaderboard. If showing overall, update overall.
  // DON'T force a transition between them.
  
  if (room.currentRoundResults) {
    // Currently showing round results - update round leaderboard
    room.currentRoundResults = updatedLeaderboard;
    namespace.to(roomId).emit('round_leaderboard', updatedLeaderboard);
    if (debug) console.log(`[RobPoints] 📊 Updated round leaderboard with new scores`);
  } else if (room.currentOverallLeaderboard) {
    // Currently showing overall leaderboard - update overall leaderboard
    room.currentOverallLeaderboard = updatedLeaderboard;
    namespace.to(roomId).emit('leaderboard', updatedLeaderboard);
    if (debug) console.log(`[RobPoints] 📊 Updated overall leaderboard with new scores`);
  } else {
    // ✅ FALLBACK: We're in leaderboard phase but don't know which view is active
    // Since global extras only work during leaderboard phase, assume round results
    if (room.currentPhase === 'leaderboard') {
      room.currentRoundResults = updatedLeaderboard;
      namespace.to(roomId).emit('round_leaderboard', updatedLeaderboard);
      if (debug) console.log(`[RobPoints] 📊 Updated round leaderboard (fallback) with new scores`);
    } else {
      if (debug) console.log(`[RobPoints] 📊 Data updated but no leaderboard display change (not in leaderboard phase)`);
    }
  }

  // ✅ Send success notification to robbing player
  if (player?.socketId) {
    const robbingSocket = namespace.sockets.get(player.socketId);
    if (robbingSocket) {
      robbingSocket.emit('quiz_notification', {
        type: 'success',
        message: `You stole ${pointsToRob} points from ${targetName}! 💰`
      });
    }
  }

  // ✅ Send notification to robbed player
 if (targetPlayer?.socketId) {
    const targetSocket = namespace.sockets.get(targetPlayer.socketId);
    if (targetSocket) {
      targetSocket.emit('robin_hood_animation', {
        stolenPoints: pointsToRob,
        fromTeam: targetName,
        toTeam: playerName,
        robberName: playerName
      });
    }
  }

  if (debug) {
    console.log(`[RobPoints] ✅ robPoints completed: ${playerName} stole ${pointsToRob} points from ${targetName}`);
  }

  return { success: true };
}

/**
 * Execute restorePoints logic - restore up to 3 points from cumulative negative points
 */
function executeRestorePoints(roomId, playerId, namespace) {
  const room = getQuizRoom(roomId);
  
  const playerData = room.playerData[playerId];
  if (!playerData) {
    return { success: false, error: 'Player data not found' };
  }

  // ✅ Get restore points limit from metadata
  const maxRestorePoints = fundraisingExtraDefinitions.restorePoints?.totalRestorePoints || 3;
  
  // ✅ Calculate how many points can be restored
  const cumulativeNegative = playerData.cumulativeNegativePoints || 0;
  const alreadyRestored = playerData.pointsRestored || 0;
  const totalAllowedToRestore = maxRestorePoints; // 3 points total lifetime limit
  const remainingAllowance = Math.max(0, totalAllowedToRestore - alreadyRestored);
  const availableFromLosses = Math.max(0, cumulativeNegative - alreadyRestored);
  const pointsToRestore = Math.min(remainingAllowance, availableFromLosses);

  // ✅ Validate player has points to restore
  if (remainingAllowance <= 0) {
    return { success: false, error: 'You have already restored the maximum number of points' };
  }

  if (pointsToRestore <= 0) {
    return { success: false, error: 'No points available to restore' };
  }

  // ✅ Get player name for notifications
  const player = room.players.find(p => p.id === playerId);
  const playerName = player?.name || 'Someone';

  // ✅ Execute the point restoration
  const oldScore = playerData.score;
  const oldRestored = playerData.pointsRestored;
  
  playerData.score += pointsToRestore;
  playerData.pointsRestored += pointsToRestore;

  if (debug) {
    console.log(`[RestorePoints] 🎯 Point restoration executed:`);
    console.log(`  - ${playerName}: ${oldScore} → ${playerData.score} (+${pointsToRestore})`);
    console.log(`  - Points restored: ${oldRestored} → ${playerData.pointsRestored}`);
    console.log(`  - Cumulative negative: ${cumulativeNegative}`);
    console.log(`  - Remaining restorable: ${remainingAllowance - pointsToRestore}`);
  }

  // ✅ Notify host of restore points activity
  sendHostActivityNotification(namespace, roomId, {
    type: 'restore',
    playerName: playerName,
    round: room.currentRound
  });

  // ✅ FIXED: Generate updated leaderboard data but don't auto-switch display
  const updatedLeaderboard = Object.keys(room.playerData)
    .map(pid => {
      const pData = room.playerData[pid];
      const pInfo = room.players.find(p => p.id === pid);
      return {
        id: pid,
        name: pInfo?.name || 'Unknown',
        score: pData.score,
        cumulativeNegativePoints: pData.cumulativeNegativePoints || 0,
        pointsRestored: pData.pointsRestored || 0
      };
    })
    .sort((a, b) => b.score - a.score);

  // ✅ FIXED: Check what's currently being displayed and update accordingly
  // If showing round results, update round leaderboard. If showing overall, update overall.
  // DON'T force a transition between them.
  
  if (room.currentRoundResults) {
    // Currently showing round results - update round leaderboard
    room.currentRoundResults = updatedLeaderboard;
    namespace.to(roomId).emit('round_leaderboard', updatedLeaderboard);
    if (debug) console.log(`[RestorePoints] 📊 Updated round leaderboard with new scores`);
  } else if (room.currentOverallLeaderboard) {
    // Currently showing overall leaderboard - update overall leaderboard
    room.currentOverallLeaderboard = updatedLeaderboard;
    namespace.to(roomId).emit('leaderboard', updatedLeaderboard);
    if (debug) console.log(`[RestorePoints] 📊 Updated overall leaderboard with new scores`);
  } else {
    // ✅ FALLBACK: We're in leaderboard phase but don't know which view is active
    // Since global extras only work during leaderboard phase, assume round results
    if (room.currentPhase === 'leaderboard') {
      room.currentRoundResults = updatedLeaderboard;
      namespace.to(roomId).emit('round_leaderboard', updatedLeaderboard);
      if (debug) console.log(`[RestorePoints] 📊 Updated round leaderboard (fallback) with new scores`);
    } else {
      if (debug) console.log(`[RestorePoints] 📊 Data updated but no leaderboard display change (not in leaderboard phase)`);
    }
  }

  // ✅ Send success notification to player
  if (player?.socketId) {
    const playerSocket = namespace.sockets.get(player.socketId);
    if (playerSocket) {
      playerSocket.emit('quiz_notification', {
        type: 'success',
        message: `You restored ${pointsToRestore} points! 🎯`
      });
    }
  }

  if (debug) {
    console.log(`[RestorePoints] ✅ restorePoints completed: ${playerName} restored ${pointsToRestore} points`);
  }

  // ✅ RETURN the points restored for tracking
  return { success: true, pointsRestored: pointsToRestore };
}


// ✅ NEW: Export function to get current round stats for final calculation
export function getCurrentRoundStats(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return null;
  
  return calculateCurrentRoundStats(room);
}

// ✅ NEW: Export function to reset global extras tracking for new round
export function resetGlobalExtrasForNewRound(roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return;
  
  room.globalExtrasUsedThisRound = [];
  
  if (debug) {
    console.log(`[GlobalExtrasHandler] 🔄 Global extras tracking reset for round ${room.currentRound}`);
  }
}