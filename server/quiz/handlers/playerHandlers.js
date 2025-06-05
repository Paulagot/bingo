import {
  getQuizRoom,
  emitRoomState,
  addAdminToQuizRoom,
  addOrUpdatePlayer,
  updatePlayerSocketId,
  updateAdminSocketId,
  updateHostSocketId
} from '../quizRoomManager.js';

import { emitFullRoomState } from './sharedUtils.js';
import { isRateLimited } from '../../socketRateLimiter.js';

const debug = true;

export function setupPlayerHandlers(socket, namespace) {

  // 👤 Player/Admin/Host joins quiz room
  socket.on('join_quiz_room', ({ roomId, user, role }) => {
  if (!roomId || !user || !role) {
    console.error(`[join_quiz_room] ❌ Missing data!`, { roomId, user, role });
    socket.emit('quiz_error', { message: 'Invalid join_quiz_room payload.' });
    return;
  }

  // 🔧 Improved logging with name/id
  let displayName = user.name || user.id;
  console.log(`[Join] ${role} "${displayName}" joining room ${roomId}`);

  socket.join(roomId);
  const roleRoom = `${roomId}:${role}`;
  socket.join(roleRoom);

  const room = getQuizRoom(roomId);
  if (!room) {
    console.warn(`[join_quiz_room] ⚠️ Room not found: ${roomId}`);
    socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
    return;
  }

  if (role === 'host') {
    updateHostSocketId(roomId, socket.id);
    console.log(`[Join] Host "${room.config.hostName}" (${user.id}) joined ${roomId}`);
  } 
  else if (role === 'admin') {
    const existingAdmin = room.admins.find(a => a.id === user.id);
    if (existingAdmin) {
      if (user.name) {
        existingAdmin.name = user.name;  // Only update name if one was provided
      }
      existingAdmin.socketId = socket.id;
    } else {
      addAdminToQuizRoom(roomId, { ...user, socketId: socket.id });
    }
    updateAdminSocketId(roomId, user.id, socket.id);

    const nameForLog = existingAdmin?.name || user.name || '(unknown)';
    console.log(`[Join] Admin "${nameForLog}" (${user.id}) joined ${roomId}`);
  } 
  else if (role === 'player') {
    const existingPlayer = room.players.find(p => p.id === user.id);
    if (existingPlayer) user.name = existingPlayer.name;
    else if (!user.name) user.name = `Player ${user.id}`;
    addOrUpdatePlayer(roomId, { ...user, socketId: socket.id });
    updatePlayerSocketId(roomId, user.id, socket.id);

    console.log(`[Join] Player "${user.name}" (${user.id}) joined ${roomId}`);
  } 
  else {
    socket.emit('quiz_error', { message: `Unknown role "${role}".` });
    return;
  }

  emitFullRoomState(socket, namespace, roomId);
  namespace.to(roomId).emit('user_joined', { user, role });

  setTimeout(() => {
    namespace.in(roomId).allSockets().then(clients => {
      console.log(`[JoinDebug] Clients in ${roomId}:`, [...clients]);
    });
  }, 50);
});


  // ✅ Player submits answer
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

  // ✅ Allow full state rehydration
  socket.on('request_current_state', ({ roomId }) => {
    emitFullRoomState(socket, namespace, roomId);
  });

  // ✅ Disconnect cleanup for admins (unchanged)
  socket.on('disconnect', () => {
    setTimeout(() => {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      rooms.forEach(roomId => {
        const room = getQuizRoom(roomId);
        if (!room) return;

        const idx = room.admins.findIndex(a => a.socketId === socket.id);
        if (idx !== -1) {
          const admin = room.admins[idx];
          const stillConnected = room.admins.some(a => a.id === admin.id && a.socketId !== socket.id);

          if (!stillConnected) {
            room.admins.splice(idx, 1);
            console.log(`[DisconnectCleanup] Admin removed after timeout:`, admin);
            namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
          }
        }
      });
    }, 5000);
  });

}





