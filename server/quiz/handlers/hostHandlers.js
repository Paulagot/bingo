import {
  createQuizRoom,
  getQuizRoom,
  getCurrentRound,
  getTotalRounds,
  resetRoundExtrasTracking,
  startNextRound,
  removeQuizRoom,
  emitRoomState
} from '../quizRoomManager.js';

import { getEngine } from '../ gameplayEngines/gameplayEngineRouter.js';
import { isRateLimited } from '../../socketRateLimiter.js';

const debug = true;

export function setupHostHandlers(socket, namespace) {

  function emitFullRoomState(roomId) {
    const room = getQuizRoom(roomId);
    if (!room) return;
    namespace.to(roomId).emit('room_config', room.config);
    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  }

  socket.on('create_quiz_room', ({ roomId, hostId, config }) => {
    if (debug) console.log(`[Host] create_quiz_room for: ${roomId}, host: ${hostId}`);

    socket.join(roomId);
    const success = createQuizRoom(roomId, hostId, config);
    if (!success) {
      socket.emit('quiz_error', { message: 'Room already exists' });
      socket.leave(roomId);
      return;
    }

    socket.emit('quiz_room_created', { roomId });
    emitFullRoomState(roomId);
  });

  socket.on('start_round', ({ roomId }) => {
    if (debug) console.log(`[Host] start_round for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

   resetRoundExtrasTracking(roomId);
    const engine = getEngine(room);
    if (!engine || typeof engine.initRound !== 'function') {
      socket.emit('quiz_error', { message: 'No gameplay engine found for this round type' });
      return;
    }

    engine.initRound(roomId, namespace);
  });

  socket.on('next_review', ({ roomId }) => {
    if (debug) console.log(`[Host] next_review for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const engine = getEngine(room);
    if (!engine || typeof engine.emitNextReviewQuestion !== 'function') {
      socket.emit('quiz_error', { message: 'No review phase supported for this round type' });
      return;
    }

    engine.emitNextReviewQuestion(roomId, namespace);
  });

  socket.on('next_round_or_end', ({ roomId }) => {
    if (debug) console.log(`[Host] next_round_or_end for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const totalRounds = getTotalRounds(roomId);
    const nextRound = getCurrentRound(roomId) + 1;

    if (nextRound > totalRounds) {
      room.currentPhase = 'complete';
      namespace.to(roomId).emit('quiz_end', { message: 'Quiz complete. Thank you!' });
      emitRoomState(namespace, roomId);
    } else {
      startNextRound(roomId);
      room.currentPhase = 'waiting';
      emitRoomState(namespace, roomId);
    }
  });

  socket.on('end_quiz', ({ roomId }) => {
    if (debug) console.log(`[Host] end_quiz for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    room.currentPhase = 'complete';
    namespace.to(roomId).emit('quiz_end', { message: 'Quiz ended by host.' });
    emitRoomState(namespace, roomId);
  });

 socket.on('delete_quiz_room', ({ roomId }) => {
  if (debug) console.log(`[Host] delete_quiz_room for ${roomId}`);

  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  // ✅ Notify everyone first
  namespace.to(roomId).emit('quiz_cancelled', { message: 'Quiz cancelled by host', roomId });
  console.log(`[Host] 📢 Sent cancellation notice to room ${roomId}`);

  // ✅ Wait 2 seconds for clients to receive the message, then cleanup
  setTimeout(() => {
    const removed = removeQuizRoom(roomId);
    
    if (removed) {
      namespace.in(roomId).socketsLeave(roomId);
      namespace.in(`${roomId}:host`).socketsLeave(`${roomId}:host`);
      namespace.in(`${roomId}:admin`).socketsLeave(`${roomId}:admin`);
      namespace.in(`${roomId}:player`).socketsLeave(`${roomId}:player`);
      console.log(`[Host] ✅ Room ${roomId} deleted and clients disconnected`);
    }
  }, 2000);
});
 // ✅ NEW: Launch quiz event - redirects all waiting players to play page
  socket.on('launch_quiz', ({ roomId }) => {
    if (debug) console.log(`[Host] launch_quiz for ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    // Validate that the requesting socket is actually the host
    if (room.hostSocketId !== socket.id) {
      socket.emit('quiz_error', { message: 'Only the host can launch the quiz' });
      return;
    }

    // Update room phase to indicate quiz has been launched
    room.currentPhase = 'launched';
    
    // Broadcast to all players in the waiting room to redirect to play page
    namespace.to(roomId).emit('quiz_launched', { 
      roomId,
      message: 'Quiz is starting! Redirecting to game...' 
    });
    
    // Also emit room state update
    emitRoomState(namespace, roomId);
    
    console.log(`[Host] ✅ Quiz launched for room ${roomId}, players will be redirected`);
  });
}


