import { getQuizRoom } from '../quizRoomManager.js';
import { isRateLimited } from '../../socketRateLimiter.js';

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
      console.log('[Server sharedutils] 🧠 Received verify_quiz_room for:', roomId);
      const room = getQuizRoom(roomId);
      if (!room) {
        console.log('[Server sharedutils] ❌ Room not found:', roomId);
        socket.emit('quiz_room_verification_result', { exists: false, paymentMethod: 'cash' });
      } else {
        console.log('[Server sharedutils] ✅ Room found:', roomId, 'Payment method:', room.config?.paymentMethod);
        socket.emit('quiz_room_verification_result', {
          exists: true,
          paymentMethod: room.config?.paymentMethod || 'cash',
        });
      }
    });
  });

  socket.on('verify_quiz_room_and_player', ({ roomId, playerId }) => {
    import('../quizRoomManager.js').then(({ getQuizRoom }) => {
      const room = getQuizRoom(roomId);
      if (!room) {
        socket.emit('quiz_room_player_verification_result', {
          roomExists: false,
          playerApproved: false,
        });
        return;
      }
      const playerApproved = room.players?.some(p => p.id === playerId);
      socket.emit('quiz_room_player_verification_result', {
        roomExists: true,
        playerApproved,
      });
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
export function resetRoundClueTrackingWrapper(roomId) {
  return import('../quizRoomManager.js').then(({ resetRoundClueTracking }) => {
    return resetRoundClueTracking(roomId);
  });
}