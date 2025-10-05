//server/quiz/handlers/sharedUtils.js
const debug = false;

import { getQuizRoom } from '../quizRoomManager.js';

// NEW: single emitter for standardized room_config payload
// Emits legacy-compatible room_config payload (raw object), now with hostId + roomId
export function emitRoomConfig(namespace, roomId) {
  const room = getQuizRoom(roomId);
  if (!room) return false;

  const cfgWithCaps = {
    ...room.config,
    roomCaps: room.roomCaps,
    roomId,
    hostId: room.hostId ?? room.config?.hostId ?? 'host',
  };

  // ⬅️ Emit RAW object (legacy shape your frontend expects)
  namespace.to(roomId).emit('room_config', cfgWithCaps);

  if (debug) console.log(`[SharedUtils] 🛰️ Emitted room_config (legacy shape) for ${roomId}`);
  return true;
}


export function setupSharedHandlers(socket, namespace) {

  socket.on('request_room_config', ({ roomId }) => {
    import('../quizRoomManager.js').then(({ getQuizRoom }) => {
      const room = getQuizRoom(roomId);
      if (room) {
        emitFullRoomState(socket, namespace, roomId);
      } else {
        socket.emit('quiz_error', { message: 'Room not found' });
      }
    });
  });

socket.on('verify_quiz_room', ({ roomId }) => {
  import('../quizRoomManager.js').then(({ getQuizRoom }) => {
    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_room_verification_result', { 
        exists: false,
      });
      return;
    }

    // pull everything the client will need
    const {
      entryFee    = '0',
      fundraisingOptions = {},
      fundraisingPrices  = {},
      paymentMethod,
      demoMode    = false,
      // Add Web3-specific fields
      web3Chain,
      web3Currency,
      web3ContractAddress,
      hostName,
      gameType,
      roundDefinitions,
      currencySymbol
    } = room.config;

    const response = {
      exists: true,
      paymentMethod: paymentMethod || 'cash',
      entryFee: Number(entryFee),
      fundraisingOptions,
      fundraisingPrices,
      demoMode: !!demoMode,
      caps: room.roomCaps,
      hostName,
      gameType,
      roundDefinitions,
      currencySymbol: currencySymbol || '€'
    };

    // Add Web3-specific fields if it's a Web3 room
    if (paymentMethod === 'web3') {
      response.web3Chain = web3Chain || 'stellar';
      response.web3Currency = web3Currency || 'XLM';
      response.web3ContractAddress = web3ContractAddress;
    }

    socket.emit('quiz_room_verification_result', response);
    if (debug) console.log(`[SharedUtils] 🔍 Room verification for ${roomId}:`, response);
  });
});

socket.on('asset_upload_success', ({ roomId, prizeIndex, txHash }) => {
  import('../quizRoomManager.js').then(({ updateAssetUploadStatus, getQuizRoom }) => {
    const success = updateAssetUploadStatus(roomId, prizeIndex, 'completed', txHash);
    if (success) {
      // Broadcast updated config to all clients in the room
    const room = getQuizRoom(roomId);
if (room) {
  emitRoomConfig(namespace, roomId);
  if (debug) console.log(`[Socket] ✅ Broadcasted updated config for asset upload: ${roomId}`);
}
    } else {
      socket.emit('quiz_error', { message: 'Failed to update asset upload status' });
    }
  });
});


  // ✅ UPDATED: Include room state in verification response
  socket.on('verify_quiz_room_and_player', ({ roomId, playerId }) => {
    import('../quizRoomManager.js').then(({ getQuizRoom }) => {
      const room = getQuizRoom(roomId);
      if (!room) {
        socket.emit('quiz_room_player_verification_result', {
          roomExists: false,
          playerApproved: false,
          roomState: null
        });
        return;
      }
      
      const playerApproved = room.players?.some(p => p.id === playerId);
      
      // ✅ NEW: Include current room state
      const roomState = {
        phase: room.currentPhase,
        currentRound: room.currentRound,
        totalRounds: room.config.roundDefinitions?.length || 1,
        currentQuestionIndex: room.currentQuestionIndex
      };
      
      if (debug)  console.log(`[SharedUtils] 🔍 Player verification: ${playerId} in room ${roomId} - approved: ${playerApproved}, phase: ${room.currentPhase}`);
      
      socket.emit('quiz_room_player_verification_result', {
        roomExists: true,
        playerApproved,
        roomState
      });
    });
  });

  // ✅ NEW: Handler to check if player is in an active game
  socket.on('check_player_in_active_game', ({ roomId, playerId }) => {
    import('../quizRoomManager.js').then(({ getQuizRoom }) => {
      const room = getQuizRoom(roomId);
      
      if (!room) {
        socket.emit('player_active_game_status', { 
          isInActiveGame: false,
          currentPhase: null 
        });
        return;
      }

      const playerExists = room.players.some(p => p.id === playerId);
      const gameIsActive = ['asking', 'reviewing', 'leaderboard', 'launched'].includes(room.currentPhase);
      
      if (debug) console.log(`[SharedUtils] 🎮 Active game check: ${playerId} - exists: ${playerExists}, phase: ${room.currentPhase}, active: ${gameIsActive}`);
      
      socket.emit('player_active_game_status', {
        isInActiveGame: playerExists && gameIsActive,
        currentPhase: room.currentPhase
      });
    });
  });

  // ✅ NEW: Handler for rejoining active games
  socket.on('rejoin_active_game', ({ roomId, playerId }) => {
    import('../quizRoomManager.js').then(({ getQuizRoom, updatePlayerSocketId, emitRoomState }) => {
      const room = getQuizRoom(roomId);
      
      if (!room) {
        socket.emit('quiz_error', { message: 'Room not found' });
        return;
      }

      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('quiz_error', { message: 'Player not found in room' });
        return;
      }

     if (debug)  console.log(`[SharedUtils] 🔄 Player ${playerId} rejoining active game in room ${roomId}`);

      // Add socket to room and update player socket
      socket.join(roomId);
      socket.join(`${roomId}:player`);
      updatePlayerSocketId(roomId, playerId, socket.id);
      
      // Send current state and trigger full room state
      emitRoomState(namespace, roomId);
      emitFullRoomState(socket, namespace, roomId);
      
      if (debug)  console.log(`✅ [SharedUtils] Player ${playerId} rejoined active game in room ${roomId}`);
    });
  });

  socket.on('use_clue', ({ roomId, playerId }) => {
    import('../quizRoomManager.js').then(({ useClue, getQuizRoom }) => {
      const result = useClue(roomId, playerId);
      if (result.success) {
        const room = getQuizRoom(roomId);
        socket.emit('clue_revealed', {
          questionId: room?.questions[room.currentQuestionIndex]?.id,
          clue: result.clue
        });
      } else {
        socket.emit('clue_error', { reason: result.reason });
      }
    });
  });
}



// 🔥 NEW universal emitter function (we'll reuse this everywhere)
export function emitFullRoomState(socket, namespace, roomId) {
  import('../quizRoomManager.js').then(({ getQuizRoom, emitRoomState }) => {
    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
      return;
    }
    emitRoomConfig(namespace, roomId); // spreads room.config (includes reconciliation)
    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);

    // Explicit reconciliation state too (keeps panel logic simple/race-free)
    const rec = room.config?.reconciliation || {
      approvedBy: '',
      notes: '',
      approvedAt: null,
      updatedAt: null,
      updatedBy: null,
    };
    namespace.to(roomId).emit('reconciliation_state', { roomId, data: rec });
  });
}



// Export shared utility functions that might be used by multiple handlers
export function resetRoundExtrasTrackingWrapper(roomId) {
  return import('../quizRoomManager.js').then(({ resetRoundExtrasTracking }) => {
    return resetRoundExtrasTracking(roomId);
  });
}