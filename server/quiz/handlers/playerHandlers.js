// playerHandlers.js
import { 
  getQuizRoom, 
  addOrUpdatePlayer, 
  updateHostSocketId, 
  updateAdminSocketId, 
  updatePlayerSocketId, 
  addAdminToQuizRoom, 
  getCurrentQuestion,
  handlePlayerExtra,
  emitRoomState  // ✅ Add this import
} from '../quizRoomManager.js';
import { emitFullRoomState } from '../handlers/sharedUtils.js';

const debug = true;

// ✅ Import engines dynamically to avoid circular dependencies
function getEngine(room) {
  const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;
  
  switch (roundType) {
    case 'general_trivia':
      return import('../ gameplayEngines/generalTriviaEngine.js');
    // case 'speed_round':
    //   return import('../engines/speedRoundEngine.js');
    // case 'wipeout':
    //   return import('../engines/wipeoutEngine.js');
    // case 'head_to_head':
    //   return import('../engines/headToHeadEngine.js');
    // case 'media_puzzle':
    //   return import('../engines/mediaPuzzleEngine.js');
    default:
      console.warn(`[getEngine] ❓ Unknown round type: ${roundType}`);
      return null;
  }
}

export function setupPlayerHandlers(socket, namespace) {

  socket.on('join_quiz_room', ({ roomId, user, role }) => {
    if (!roomId || !user || !role) {
      console.error(`[join_quiz_room] ❌ Missing data:`, { roomId, user, role });
      socket.emit('quiz_error', { message: 'Invalid join_quiz_room payload.' });
      return;
    }

    console.log(`[Join] 🚪 ${role.toUpperCase()} "${user.name || user.id}" joining room ${roomId}`);

    socket.join(roomId);
    socket.join(`${roomId}:${role}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      console.warn(`[Join] ⚠️ Room not found: ${roomId}`);
      socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
      return;
    }

    if (role === 'host') {
      updateHostSocketId(roomId, socket.id);
      console.log(`[Join] 👑 Host "${room.config.hostName}" (${user.id}) joined with socket ${socket.id}`);
    } else if (role === 'admin') {
      const existingAdmin = room.admins.find(a => a.id === user.id);
      if (existingAdmin) {
        if (user.name) existingAdmin.name = user.name;
        existingAdmin.socketId = socket.id;
      } else {
        addAdminToQuizRoom(roomId, { ...user, socketId: socket.id });
      }
      updateAdminSocketId(roomId, user.id, socket.id);
      console.log(`[Join] 🛠️ Admin "${user.name || user.id}" joined with socket ${socket.id}`);
    } else if (role === 'player') {
      const existingPlayer = room.players.find(p => p.id === user.id);
      if (existingPlayer) user.name = existingPlayer.name;
      else if (!user.name) user.name = `Player ${user.id}`;
      addOrUpdatePlayer(roomId, { ...user, socketId: socket.id });
      updatePlayerSocketId(roomId, user.id, socket.id);
      console.log(`[Join] 🎮 Player "${user.name}" (${user.id}) joined with socket ${socket.id}`);
    } else {
      console.error(`[Join] ❌ Unknown role: "${role}"`);
      socket.emit('quiz_error', { message: `Unknown role "${role}".` });
      return;
    }

    // ✅ IMPORTANT: Emit room state after adding player to ensure correct count
    emitRoomState(namespace, roomId);
    emitFullRoomState(socket, namespace, roomId);
    namespace.to(roomId).emit('user_joined', { user, role });

    setTimeout(() => {
      namespace.in(roomId).allSockets().then(clients => {
        console.log(`[JoinDebug] 🔎 Clients in ${roomId}:`, [...clients]);
      });
    }, 50);
  });

  socket.on('submit_answer', ({ roomId, playerId, answer }) => {
    const room = getQuizRoom(roomId);
    if (!room) {
      console.warn(`[Answer] ❌ Room not found: ${roomId}`);
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    // ✅ Check if player is frozen BEFORE processing answer
  const playerData = room.playerData?.[playerId];
if (playerData?.frozenNextQuestion && 
    playerData?.frozenForQuestionIndex === room.currentQuestionIndex) {
  console.log(`[Answer] ❄️ Ignoring answer from frozen player: ${playerId}`);
  socket.emit('quiz_error', { message: 'You are frozen for this question and cannot answer!' });
  return;
}

    const enginePromise = getEngine(room);
    if (!enginePromise) {
      console.warn(`[Answer] ⚠️ No engine for room ${roomId}`);
      socket.emit('quiz_error', { message: 'No gameplay engine available for this round type' });
      return;
    }

    enginePromise.then(engine => {
      if (!engine || typeof engine.handlePlayerAnswer !== 'function') {
        console.warn(`[Answer] ⚠️ Invalid engine for room ${roomId}`);
        socket.emit('quiz_error', { message: 'Invalid gameplay engine for this round type' });
        return;
      }

      const question = room.questions?.[room.currentQuestionIndex];
const isCorrect = question && answer === question.correctAnswer;

const player = room.players.find(p => p.id === playerId);
const playerName = player?.name || 'Unknown';

console.log(
  `[Answer] ✅ ${playerName} (${playerId}) submitted: "${answer}" → ${isCorrect ? '✅ Correct' : '❌ Wrong'}`
);

engine.handlePlayerAnswer(roomId, playerId, answer);
    }).catch(err => {
      console.error(`[Answer] ❌ Engine import failed:`, err);
      socket.emit('quiz_error', { message: 'Failed to load gameplay engine' });
    });
  });

  // ✅ ENHANCED: Use centralized extras handler with better error handling
  socket.on('use_extra', ({ roomId, playerId, extraId, targetPlayerId }) => {
    console.log(`[PlayerHandler] 🧪 Received use_extra:`, { roomId, playerId, extraId, targetPlayerId });
    
    const result = handlePlayerExtra(roomId, playerId, extraId, targetPlayerId, namespace);
    
    console.log(`[PlayerHandler] 🔍 handlePlayerExtra result:`, result);
    
    if (result.success) {
      console.log(`[PlayerHandler] ✅ Extra ${extraId} used successfully by ${playerId}`);
      socket.emit('extra_used_successfully', { extraId });
    } else {
      console.warn(`[PlayerHandler] ❌ Extra ${extraId} failed for ${playerId}: ${result.error}`);
      // ✅ FIXED: Always emit error to client so tests can detect freeze blocking
      socket.emit('quiz_error', { message: result.error });
    }
  });

  // ✅ LEGACY SUPPORT: Keep individual use_clue handler for backward compatibility
  socket.on('use_clue', ({ roomId, playerId }) => {
    console.log(`[PlayerHandler] 💡 Legacy use_clue from ${playerId} - redirecting to buyHint`);
    
    const result = handlePlayerExtra(roomId, playerId, 'buyHint', null, namespace);
    
    if (result.success) {
      console.log(`[PlayerHandler] ✅ Legacy clue used successfully by ${playerId}`);
      // ✅ Emit legacy event for backward compatibility
      const room = getQuizRoom(roomId);
      const question = getCurrentQuestion(roomId);
      if (question?.clue) {
        socket.emit('clue_revealed', { clue: question.clue });
      }
    } else {
      console.warn(`[PlayerHandler] ❌ Legacy clue failed for ${playerId}: ${result.error}`);
      socket.emit('clue_error', { reason: result.error });
    }
  });

  socket.on('request_current_state', ({ roomId }) => {
    emitFullRoomState(socket, namespace, roomId);
    const room = getQuizRoom(roomId);
    if (!room) return;

    // ✅ Resend current question if in asking phase
    if (room.currentPhase === 'asking' && room.currentQuestionIndex >= 0) {
      const question = room.questions[room.currentQuestionIndex];
      const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
      const timeLimit = roundConfig?.timePerQuestion || 25;
      const questionStartTime = room.questionStartTime || Date.now();

      socket.emit('question', {
        id: question.id,
        text: question.text,
        options: question.options || [],
        timeLimit,
        questionStartTime
      });

      console.log(`[Recovery] 🔁 Resent question ${question.id} to reconnecting player`);
    }
  });

  socket.on('disconnect', () => {
    // ✅ Cleanup logic with delay to handle reconnections
    setTimeout(() => {
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      rooms.forEach(roomId => {
        const room = getQuizRoom(roomId);
        if (!room) return;

        // ✅ Clean up admins who are no longer connected
        const idx = room.admins.findIndex(a => a.socketId === socket.id);
        if (idx !== -1) {
          const admin = room.admins[idx];
          // ✅ Only remove if this admin doesn't have other active connections
          const stillConnected = room.admins.some(a => a.id === admin.id && a.socketId !== socket.id);
          if (!stillConnected) {
            room.admins.splice(idx, 1);
            console.log(`[DisconnectCleanup] 🧹 Admin "${admin.name}" (${admin.id}) removed from ${roomId}`);
            namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
          }
        }

        // ✅ NOTE: We don't remove players on disconnect as they might reconnect
        // Players are only removed when the game ends or room is deleted
      });
    }, 5000); // ✅ 5 second delay to allow for quick reconnections
  });
}







