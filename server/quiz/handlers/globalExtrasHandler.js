// server/quiz/handlers/globalExtrasHandler.js

import { getQuizRoom } from '../quizRoomManager.js';
import { fundraisingExtraDefinitions } from './../quizMetadata.js';

const debug = true;

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
    // ✅ Mark as used
    playerData.usedExtras[extraId] = true;
    playerData.usedExtrasThisRound[extraId] = true;
    console.log(`[GlobalExtrasHandler] ✅ ${extraId} executed successfully for ${playerId}`);
  } else {
    console.warn(`[GlobalExtrasHandler] ❌ ${extraId} execution failed for ${playerId}: ${result.error}`);
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

  // ✅ Generate updated leaderboard (sorted by score descending)
  const updatedLeaderboard = Object.keys(room.playerData)
    .map(pid => {
      const pData = room.playerData[pid];
      const pInfo = room.players.find(p => p.id === pid);
      return {
        id: pid,
        name: pInfo?.name || 'Unknown',
        score: pData.score
      };
    })
    .sort((a, b) => b.score - a.score); // ✅ Sort by score descending

  // ✅ Emit updated leaderboard to all players
  namespace.to(roomId).emit('leaderboard', updatedLeaderboard);

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
      targetSocket.emit('quiz_notification', {
        type: 'warning',
        message: `${playerName} stole ${pointsToRob} points from you! ⚡`
      });
    }
  }

  if (debug) {
    console.log(`[RobPoints] ✅ robPoints completed: ${playerName} stole ${pointsToRob} points from ${targetName}`);
    console.log(`[RobPoints] 📊 Updated leaderboard emitted with ${updatedLeaderboard.length} players`);
  }

  return { success: true };
}