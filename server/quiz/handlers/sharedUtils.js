const debug = true;

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
      demoMode    = false
    } = room.config;

    socket.emit('quiz_room_verification_result', {
      exists: true,
      paymentMethod: paymentMethod || 'cash',
      entryFee: Number(entryFee),
      fundraisingOptions,
      fundraisingPrices,
      demoMode: !!demoMode
    });
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
      
      console.log(`[SharedUtils] 🔍 Player verification: ${playerId} in room ${roomId} - approved: ${playerApproved}, phase: ${room.currentPhase}`);
      
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
      
      console.log(`[SharedUtils] 🎮 Active game check: ${playerId} - exists: ${playerExists}, phase: ${room.currentPhase}, active: ${gameIsActive}`);
      
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

      console.log(`[SharedUtils] 🔄 Player ${playerId} rejoining active game in room ${roomId}`);

      // Add socket to room and update player socket
      socket.join(roomId);
      socket.join(`${roomId}:player`);
      updatePlayerSocketId(roomId, playerId, socket.id);
      
      // Send current state and trigger full room state
      emitRoomState(namespace, roomId);
      emitFullRoomState(socket, namespace, roomId);
      
      console.log(`✅ [SharedUtils] Player ${playerId} rejoined active game in room ${roomId}`);
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

    // 🔥 KEY CHANGE: emit to the full room, not just the calling socket
    namespace.to(roomId).emit('room_config', room.config);
    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });

    emitRoomState(namespace, roomId);
    if (debug) console.log(`[emitFullRoomState] ✅ Emitted full state for ${roomId}`);
  });
}

// Export shared utility functions that might be used by multiple handlers
export function resetRoundExtrasTrackingWrapper(roomId) {
  return import('../quizRoomManager.js').then(({ resetRoundExtrasTracking }) => {
    return resetRoundExtrasTracking(roomId);
  });
}