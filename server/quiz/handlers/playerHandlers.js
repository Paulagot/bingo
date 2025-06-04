import { isRateLimited } from '../../socketRateLimiter.js';
import {
  getQuizRoom,
  addPlayerToQuizRoom,
  setHostForQuizRoom,
  addAdminToQuizRoom,
  emitRoomState
} from '../quizRoomManager.js';

const debug = true;

export function setupPlayerHandlers(socket, namespace) {

  // 👤 Player or Admin joins quiz room
  socket.on('join_quiz_room', ({ roomId, user, role }) => {
    if (!roomId || !user || !role) {
      if (debug) {
        console.error(`[join_quiz_room] ❌ Missing data!`, { roomId, user, role });
      }
      socket.emit('quiz_error', { message: 'Invalid join_quiz_room payload; expecting { roomId, user, role }.' });
      return;
    }

    if (debug) {
      console.log(`[Join] ${role} "${user.name || user.id}" is joining room ${roomId}`);
    }

    socket.join(roomId);
    const roleRoom = `${roomId}:${role}`;
    socket.join(roleRoom);

    const room = getQuizRoom(roomId);
    if (!room) {
      if (debug) console.warn(`[join_quiz_room] ⚠️ Room not found: ${roomId}`);
      socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
      socket.leave(roomId);
      socket.leave(roleRoom);
      return;
    }

    if (role === 'player') {
      const added = addPlayerToQuizRoom(roomId, user);
      if (!added && debug) {
        console.warn(`[join_quiz_room] ⚠️ Player ${user.id} might already exist in room ${roomId}`);
      }
      
      // ✅ Send config to player
      if (debug) {
        console.log(`[join_quiz_room] 📋 Sending config to player:`, room.config);
      }
      
      if (room.config && typeof room.config === 'object') {
        socket.emit('room_config', room.config);
        if (debug) console.log(`[join_quiz_room] ✅ Config sent to player`);
      } else {
        if (debug) console.warn(`[join_quiz_room] ⚠️ Invalid config for room ${roomId}:`, room.config);
        socket.emit('quiz_error', { message: 'Room configuration is invalid' });
      }
      
      // Send current state to player
      socket.emit('player_list_updated', { players: room.players });
      socket.emit('admin_list_updated', { admins: room.admins });
      
      // Emit room state
      emitRoomState(namespace, roomId);
    }
    else if (role === 'host') {
      const ok = setHostForQuizRoom(roomId, user);
      if (!ok && debug) {
        console.warn(`[join_quiz_room] ⚠️ Could not set host for room ${roomId}`);
      }

      // Host reconnect: ask frontend to send full state rebuild
      console.log(`[join_quiz_room] 🔄 Host joined, requesting full state from client`);
      socket.emit('request_full_state', { roomId });
      
      // Send current state to host
      if (room.config && typeof room.config === 'object') {
        socket.emit('room_config', room.config);
      }
      socket.emit('player_list_updated', { players: room.players });
      socket.emit('admin_list_updated', { admins: room.admins });
      
      console.log(`[PLAYER-HANDLER - add host] 🎉 role==='host' block reached for user ${user.id}, room ${roomId}`);
      console.log(`[PLAYER-HANDLER - add host] Current room.config:`, room.config);
      console.log(`[PLAYER-HANDLER - add host] Current room.players:`, room.players);
      console.log(`[PLAYER-HANDLER - add host] Current room.admins:`, room.admins);

      // Emit host assigned event
      namespace.to(roomId).emit('host_assigned', { host: { id: user.id, name: user.name } });
      
      // Emit room state
      emitRoomState(namespace, roomId);
    }
    else if (role === 'admin') {
      const existingAdmin = room.admins.find(a => a.id === user.id);
      if (existingAdmin) {
        user.name = existingAdmin.name;
      } else {
        const added = addAdminToQuizRoom(roomId, user);
        if (!added && debug) {
          console.warn(`[join_quiz_room] ⚠️ Admin ${user.id} might already exist in room ${roomId}`);
        }
      }

      const savedAdmin = room.admins.find(a => a.id === user.id);
      if (savedAdmin) savedAdmin.socketId = socket.id;

      console.log(`[PLAYER-HANDLER] 🎉 role==='admin' block reached for user ${user.id}, room ${roomId}`);
      console.log(`[PLAYER-HANDLER] Current room.config:`, room.config);
      console.log(`[PLAYER-HANDLER] Current room.players:`, room.players);
      console.log(`[PLAYER-HANDLER] Current room.admins:`, room.admins);

      // Send current state to admin
      if (room.config && typeof room.config === 'object') {
        socket.emit('room_config', room.config);
      }
      socket.emit('player_list_updated', { players: room.players });
      socket.emit('admin_list_updated', { admins: room.admins });
      
      // Emit room state
      emitRoomState(namespace, roomId);
    }
    else {
      if (debug) console.log(`[PLAYER-HANDLER][join_quiz_room] ❌ Invalid role: ${role}`);
      socket.emit('quiz_error', { message: `Unknown role "${role}".` });
      socket.leave(roomId);
      socket.leave(roleRoom);
      return;
    }

    namespace.to(roomId).emit('user_joined', { user, role });

    if (role === 'player') {
      namespace.to(roomId).emit('player_list_updated', { players: room.players });
    }
    else if (role === 'admin') {
      namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    }
    else if (role === 'host') {
      namespace.to(roomId).emit('host_assigned', { host: { id: room.hostId, name: user.name } });
    }

    setTimeout(() => {
      namespace.in(roomId).allSockets().then((clients) => {
        if (debug) {
          console.log(`[PLAYER-HANDLER][JoinDebug] Clients in ${roomId}:`, [...clients]);
        }
      });
    }, 50);
  });

  // Handle requests for current state
  socket.on('request_current_state', ({ roomId }) => {
    if (debug) console.log(`[request_current_state] 📡 Player requesting current state for room ${roomId}`);
    
    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }
    
    // Send all current state to the requesting player
    if (room.config && typeof room.config === 'object') {
      socket.emit('room_config', room.config);
      if (debug) console.log(`[request_current_state] ✅ Sent config to player`);
    }
    
    socket.emit('player_list_updated', { players: room.players });
    socket.emit('admin_list_updated', { admins: room.admins });
    
    emitRoomState(namespace, roomId);
    
    if (debug) console.log(`[request_current_state] ✅ Sent current state to player`);
  });

  // Admin disconnect cleanup
  socket.on('disconnect', () => {
    // Add a grace period before removing admins
    setTimeout(() => {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      rooms.forEach(roomId => {
        const room = getQuizRoom(roomId);
        if (!room) return;
        
        // Check if the admin has reconnected with a new socket
        const idx = room.admins.findIndex(a => a.socketId === socket.id);
        if (idx !== -1) {
          const admin = room.admins[idx];
          // Only remove if they haven't reconnected
          const hasReconnected = room.admins.some(a => 
            a.id === admin.id && a.socketId !== socket.id
          );
          
          if (!hasReconnected) {
            room.admins.splice(idx, 1);
            if (debug) console.log(`[PLAYER-HANDLER] 🚪 Admin removed after timeout:`, admin);
            namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
          }
        }
      });
    }, 5000); // 5 second grace period
  });

  // Handle state rebuild from host after reconnect
  socket.on('rebuild_room_state', ({ roomId, players, admins }) => {
    console.log(`[rebuild_room_state] 🚧 Received state rebuild for room ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      console.warn(`[rebuild_room_state] ⚠️ Room ${roomId} not found`);
      return;
    }

    room.players = players || [];
    room.admins = admins || [];

    console.log(`[rebuild_room_state] ✅ State rebuilt for room ${roomId}`);
    console.log(`[rebuild_room_state] Players: ${room.players.length}, Admins: ${room.admins.length}`);

    namespace.to(roomId).emit('player_list_updated', { players: room.players });
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  });

  // Player submits answer
  socket.on('submit_answer', ({ roomId, playerId, answer }) => {
    import('../quizRoomManager.js').then(({ getQuizRoom, getCurrentQuestion }) => {
      if (debug) console.log(`[PLAYER-HANDLER][Player] 📝 ${playerId} submitted answer for ${roomId}:`, answer);

      const room = getQuizRoom(roomId);
      if (!room) {
        socket.emit('quiz_error', { message: 'Room not found' });
        return;
      }

      const question = getCurrentQuestion(roomId);
      if (!question) {
        socket.emit('quiz_error', { message: 'No current question' });
        return;
      }

      const playerData = room.playerData[playerId];
      if (!playerData) {
        socket.emit('quiz_error', { message: 'Player not found' });
        return;
      }

      const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      playerData.answers[question.id] = { submitted: answer, correct: isCorrect };
      playerData.score = (playerData.score || 0) + (isCorrect ? 1 : 0);

      if (debug) {
        console.log(`[PLAYER-HANDLER][Player] ✅ Answer recorded: ${isCorrect ? 'Correct' : 'Wrong'}`);
      }

      socket.emit('answer_received', { correct: isCorrect, submitted: answer });
    });
  });
}



