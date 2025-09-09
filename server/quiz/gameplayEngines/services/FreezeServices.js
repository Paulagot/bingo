// server/quiz/gameplayEngines/services/FreezeService.js
import { getQuizRoom } from '../../quizRoomManager.js';

const debug = false;

export class FreezeService {
  /**
   * Sets a freeze on a target player for the next question
   * @param {string} roomId 
   * @param {string} playerId - Player using the freeze
   * @param {string} targetPlayerId - Player being frozen
   * @returns {object} { success: boolean, error?: string, frozenForQuestionIndex?: number }
   */
  static setFreeze(roomId, playerId, targetPlayerId) {
    if (debug) console.log(`[FreezeService] 🧊 Setting freeze: ${playerId} -> ${targetPlayerId}`);
    
    const room = getQuizRoom(roomId);
    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    // Validation checks
    if (!targetPlayerId) {
      return { success: false, error: 'Target player required for freeze' };
    }

    if (playerId === targetPlayerId) {
      return { success: false, error: 'You cannot freeze yourself!' };
    }

    // Check if it's the last question
    const questionsRemaining = room.questions.length - room.currentQuestionIndex;
    if (questionsRemaining <= 1) {
      return { success: false, error: 'Cannot freeze player - this is the last question of the round!' };
    }

    // Check phase
    if (room.currentPhase !== 'asking') {
      return { success: false, error: 'Can only freeze players during active questions!' };
    }

    // Check question index
    if (room.currentQuestionIndex < 0) {
      return { success: false, error: 'Cannot freeze players during round setup!' };
    }

    // Get target data
    const targetData = room.playerData[targetPlayerId];
    if (!targetData) {
      return { success: false, error: 'Target player not found' };
    }

    // Check if already frozen
    if (targetData.frozenNextQuestion) {
      return { success: false, error: 'That player is already frozen for the next question!' };
    }

    // Check if target player is connected
    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer || !targetPlayer.socketId) {
      return { success: false, error: 'Target player is not actively connected' };
    }

    // Execute the freeze
    const freezeForQuestionIndex = room.currentQuestionIndex + 1;
    targetData.frozenNextQuestion = true;
    targetData.frozenForQuestionIndex = freezeForQuestionIndex;
    targetData.frozenBy = playerId;

    if (debug) {
      console.log(`[FreezeService] ✅ Freeze set: ${targetPlayerId} frozen by ${playerId} for question index ${freezeForQuestionIndex}`);
    }

    return { 
      success: true, 
      frozenForQuestionIndex: freezeForQuestionIndex 
    };
  }

  /**
   * Checks if a player is currently frozen for a specific question
   * @param {string} roomId 
   * @param {string} playerId 
   * @param {number} questionIndex 
   * @returns {boolean}
   */
  static isPlayerFrozen(roomId, playerId, questionIndex) {
    const room = getQuizRoom(roomId);
    if (!room) return false;

    const playerData = room.playerData[playerId];
    if (!playerData) return false;

    return playerData.frozenNextQuestion && 
           playerData.frozenForQuestionIndex === questionIndex;
  }

  /**
   * Sends freeze notification to a player
   * @param {object} namespace - Socket namespace
   * @param {string} roomId 
   * @param {string} targetPlayerId 
   * @param {string} frozenBy 
   * @param {number} frozenForQuestionIndex 
   */
  static sendFreezeNotification(namespace, roomId, targetPlayerId, frozenBy, frozenForQuestionIndex) {
    const room = getQuizRoom(roomId);
    if (!room) return;

    const targetPlayer = room.players.find(p => p.id === targetPlayerId);
    if (!targetPlayer || !targetPlayer.socketId) return;

    const socket = namespace.sockets.get(targetPlayer.socketId);
    if (!socket) return;

    socket.emit('freeze_notice', {
      frozenBy,
      frozenForQuestionIndex,
      message: `You are frozen for this question!`
    });

    if (debug) {
      console.log(`[FreezeService] 📡 Sent freeze notice to ${targetPlayerId} for question index ${frozenForQuestionIndex}`);
    }
  }

  /**
   * Clears expired freeze flags for all players
   * @param {string} roomId 
   * @param {number} currentQuestionIndex 
   */
  static clearExpiredFreezes(roomId, currentQuestionIndex) {
    const room = getQuizRoom(roomId);
    if (!room) return;

    if (debug) {
      console.log(`[FreezeService] 🧹 Clearing expired freezes for ${roomId}, currentQuestionIndex: ${currentQuestionIndex}`);
    }

    let clearedCount = 0;

    for (const playerId in room.playerData) {
      const playerData = room.playerData[playerId];
      if (!playerData?.frozenNextQuestion) continue;

      // Clear freeze if the frozen question has passed
      if (currentQuestionIndex > playerData.frozenForQuestionIndex) {
        const missedQuestion = playerData.frozenForQuestionIndex;
        playerData.frozenNextQuestion = false;
        playerData.frozenForQuestionIndex = undefined;
        playerData.frozenBy = undefined;
        clearedCount++;
        
        if (debug) {
          console.log(`[FreezeService] ❄️ Cleared expired freeze for ${playerId} (missed question ${missedQuestion})`);
        }
      }
    }

    if (debug && clearedCount > 0) {
      console.log(`[FreezeService] ✅ Cleared ${clearedCount} expired freeze(s)`);
    }

    return clearedCount;
  }

  /**
   * Clears ALL freeze flags (used for round reset)
   * @param {string} roomId 
   */
  static clearAllFreezes(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return;

    if (debug) {
      console.log(`[FreezeService] 🧼 Clearing ALL freezes for ${roomId}`);
    }

    let clearedCount = 0;

    for (const playerId in room.playerData) {
      const playerData = room.playerData[playerId];
      if (playerData?.frozenNextQuestion) {
        playerData.frozenNextQuestion = false;
        playerData.frozenForQuestionIndex = undefined;
        playerData.frozenBy = undefined;
        clearedCount++;
      }
    }

    if (debug) {
      console.log(`[FreezeService] ✅ Cleared ${clearedCount} freeze(s) for round reset`);
    }

    return clearedCount;
  }

  /**
   * Notifies all currently frozen players for a specific question
   * @param {object} namespace - Socket namespace
   * @param {string} roomId 
   * @param {number} questionIndex 
   */
  static notifyFrozenPlayers(namespace, roomId, questionIndex) {
    const room = getQuizRoom(roomId);
    if (!room) return;

    let notifiedCount = 0;

    room.players.forEach(player => {
      const playerData = room.playerData[player.id];
      if (playerData?.frozenNextQuestion && 
          playerData.frozenForQuestionIndex === questionIndex) {
        
        this.sendFreezeNotification(
          namespace, 
          roomId, 
          player.id, 
          playerData.frozenBy, 
          playerData.frozenForQuestionIndex
        );
        notifiedCount++;
      }
    });

    if (debug && notifiedCount > 0) {
      console.log(`[FreezeService] 📢 Notified ${notifiedCount} frozen player(s) for question ${questionIndex}`);
    }

    return notifiedCount;
  }

  /**
   * Gets freeze status for a player
   * @param {string} roomId 
   * @param {string} playerId 
   * @returns {object} { isFrozen: boolean, frozenBy?: string, frozenForQuestionIndex?: number }
   */
  static getFreezeStatus(roomId, playerId) {
    const room = getQuizRoom(roomId);
    if (!room) {
      return { isFrozen: false };
    }

    const playerData = room.playerData[playerId];
    if (!playerData) {
      return { isFrozen: false };
    }

    return {
      isFrozen: !!playerData.frozenNextQuestion,
      frozenBy: playerData.frozenBy,
      frozenForQuestionIndex: playerData.frozenForQuestionIndex
    };
  }

  /**
   * Validates if a freeze can be used (checks remaining questions)
   * @param {string} roomId 
   * @returns {object} { canUseFreeze: boolean, error?: string }
   */
  static validateFreezeUsage(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) {
      return { canUseFreeze: false, error: 'Room not found' };
    }

    // Check if it's the last question
    const questionsRemaining = room.questions.length - room.currentQuestionIndex;
    if (questionsRemaining <= 1) {
      return { 
        canUseFreeze: false, 
        error: 'Cannot use freeze - this is the last question of the round!' 
      };
    }

    // Check phase
    if (room.currentPhase !== 'asking') {
      return { 
        canUseFreeze: false, 
        error: 'Can only use freeze during active questions!' 
      };
    }

    return { canUseFreeze: true };
  }
}

export default FreezeService;