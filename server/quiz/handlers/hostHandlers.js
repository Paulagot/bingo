import {
  createQuizRoom,
  getQuizRoom,
  getCurrentRound,
  getCurrentQuestion,
  getTotalRounds,
  advanceToNextQuestion,
  startNextRound,
  resetRoundClueTracking,
  addAdminToQuizRoom,
  removeQuizRoom,
  emitRoomState   // ✅ <- this must exist in quizRoomManager.js
} from '../quizRoomManager.js';

import { isRateLimited } from '../../socketRateLimiter.js';

const debug = true;

export function setupHostHandlers(socket, namespace) {

  socket.on('create_quiz_room', ({ roomId, hostId, config }) => {
    if (debug) console.log(`[Server] 🧠 create_quiz_room for: ${roomId}, host: ${hostId}`);

    socket.join(roomId);
    console.log(`[Server] 🔌 Socket ${socket.id} joined ${roomId}`);

    const success = createQuizRoom(roomId, hostId, config);
    if (!success) {
      socket.emit('quiz_error', { message: 'Room already exists' });
      socket.leave(roomId);
      return;
    }

    socket.emit('quiz_room_created', { roomId });
    if (debug) console.log(`✅ Room created: ${roomId}`);

    const room = getQuizRoom(roomId);
    if (room) {
      namespace.to(roomId).emit('room_config', room.config);
      emitRoomState(namespace, roomId);
    }
  });

  socket.on('add_player', ({ roomId, players }) => {
    if (debug) console.log(`[add_player] Adding players to ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    for (const player of players) {
      const added = addPlayerToQuizRoom(roomId, player);
      if (debug) console.log(`  ➕ Added: ${player.id} (${added ? 'success' : 'exists'})`);
    }

    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    emitRoomState(namespace, roomId);
  });

  socket.on('start_next_question', async ({ roomId }) => {
    if (debug) console.log(`[start_next_question] For room ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const questionsPerRound = room.config.questionsPerRound || 5;
    const currentIndex = room.currentQuestionIndex || 0;

    if ((currentIndex + 1) >= questionsPerRound) {
      socket.emit('round_limit_reached', { round: getCurrentRound(roomId) });
      return;
    }

    if (room.currentPhase !== 'in_question') {
      room.currentPhase = 'in_question';
      console.log(`[start_next_question] Phase set to in_question`);
    }

    const nextQuestion = advanceToNextQuestion(roomId);
    if (!nextQuestion) {
      namespace.to(roomId).emit('round_end', { round: getCurrentRound(roomId) });
      return;
    }

    emitRoomState(namespace, roomId);

    const currentQuestion = getCurrentQuestion(roomId);
    if (!currentQuestion) {
      socket.emit('quiz_error', { message: 'Failed to fetch question' });
      return;
    }

    const timeLimit = room.config.timePerQuestion || 30;
    namespace.to(roomId).emit('question', {
      id: currentQuestion.id,
      text: currentQuestion.text,
      options: currentQuestion.options || null,
      timeLimit
    });

    const clients = await namespace.in(roomId).allSockets();
    console.log(`[start_next_question] Emitted question to ${clients.size} clients`);
  });

  socket.on('start_next_round', ({ roomId }) => {
    if (debug) console.log(`[start_next_round] For room ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const totalRounds = getTotalRounds(roomId);
    const nextRound = getCurrentRound(roomId) + 1;

    if (nextRound > totalRounds) {
      namespace.to(roomId).emit('quiz_end', { message: 'Quiz complete. Thank you!' });
      return;
    }

    resetRoundClueTracking(roomId);
    startNextRound(roomId);
    room.currentPhase = 'waiting';

    namespace.to(roomId).emit('next_round_starting', { round: getCurrentRound(roomId) });
    emitRoomState(namespace, roomId);
  });

  socket.on('end_quiz', ({ roomId }) => {
    if (debug) console.log(`[end_quiz] For room ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    room.currentPhase = 'complete';
    namespace.to(roomId).emit('quiz_end', { message: 'Quiz ended by host.' });
    emitRoomState(namespace, roomId);
  });

  socket.on('add_admin', ({ roomId, admin }) => {
    if (debug) console.log(`[add_admin] Adding admin: ${admin.id} to ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const existing = room.admins.find(a => a.id === admin.id);
    if (existing) {
      existing.name = admin.name;
    } else {
      const added = addAdminToQuizRoom(roomId, admin);
      if (!added) {
        socket.emit('quiz_error', { message: 'Failed to add admin' });
        return;
      }
    }

    socket.join(roomId);
    socket.join(`${roomId}:admin`);
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  });

  socket.on('rebuild_room_state', ({ roomId, players, admins }) => {
    console.log(`[rebuild_room_state] For room ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) return;

    room.players = players || [];
    room.admins = admins || [];

    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  });

  socket.on('delete_quiz_room', ({ roomId }) => {
    if (debug) console.log(`[delete_quiz_room] For room ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    namespace.to(roomId).emit('quiz_cancelled', { message: 'Quiz cancelled', roomId });
    const removed = removeQuizRoom(roomId);

    if (removed) {
      namespace.in(roomId).socketsLeave(roomId);
      namespace.in(`${roomId}:host`).socketsLeave(`${roomId}:host`);
      namespace.in(`${roomId}:admin`).socketsLeave(`${roomId}:admin`);
      namespace.in(`${roomId}:player`).socketsLeave(`${roomId}:player`);
      console.log(`[delete_quiz_room] ✅ Room ${roomId} deleted`);
    }
  });

}



