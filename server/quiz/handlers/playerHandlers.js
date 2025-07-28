// playerHandlers.js - FIXED VERSION
import { 
  getQuizRoom, 
  addOrUpdatePlayer, 
  updateHostSocketId, 
  updateAdminSocketId, 
  updatePlayerSocketId, 
  addAdminToQuizRoom, 
  getCurrentQuestion,
  handlePlayerExtra,
  emitRoomState,
  updatePlayerSession,
  getPlayerSession,
  isPlayerInActiveSession,
  cleanExpiredSessions
} from '../quizRoomManager.js';
import { emitFullRoomState } from '../handlers/sharedUtils.js';

const debug = flase;

function getEngine(room) {
  const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;
  
  switch (roundType) {
    case 'general_trivia':
      return import('../ gameplayEngines/generalTriviaEngine.js');
    case 'wipeout':
      return import('../ gameplayEngines/wipeoutEngine.js');
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

    if (debug) console.log(`[Join] 🚪 ${role.toUpperCase()} "${user.name || user.id}" joining room ${roomId}`);

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
      if (debug)  console.log(`[Join] 👑 Host "${room.config.hostName}" (${user.id}) joined with socket ${socket.id}`);
    } else if (role === 'admin') {
      const existingAdmin = room.admins.find(a => a.id === user.id);
      if (existingAdmin) {
        if (user.name) existingAdmin.name = user.name;
        existingAdmin.socketId = socket.id;
      } else {
        addAdminToQuizRoom(roomId, { ...user, socketId: socket.id });
      }
      updateAdminSocketId(roomId, user.id, socket.id);
      if (debug) console.log(`[Join] 🛠️ Admin "${user.name || user.id}" joined with socket ${socket.id}`);
    } else if (role === 'player') {
      // ✅ NEW: Smart session management for players
      cleanExpiredSessions(roomId);
      
      const existingPlayer = room.players.find(p => p.id === user.id);
      const existingSession = getPlayerSession(roomId, user.id);
      
      // ✅ Check if player exists in room
      if (!existingPlayer) {
       if (debug)  console.log(`[Join] ➕ New player "${user.name}" being added to room`);
        // This is a new player - add them normally
        addOrUpdatePlayer(roomId, { ...user, socketId: socket.id });
        updatePlayerSocketId(roomId, user.id, socket.id);
        
        updatePlayerSession(roomId, user.id, {
          socketId: socket.id,
          status: 'waiting',
          inPlayRoute: false
        });
      } else {
        // ✅ Player already exists - this is a socket update/reconnection
       if (debug)  console.log(`[Join] 🔄 Existing player "${existingPlayer.name}" updating socket connection`);
        
        // ✅ SMART LOGIC: Only block if truly duplicate
        if (existingSession && 
            existingSession.status === 'playing' && 
            existingSession.inPlayRoute && 
            existingSession.socketId !== socket.id) {
          
          // Check if the existing socket is still actually connected
          const existingSocket = namespace.sockets.get(existingSession.socketId);
          if (existingSocket && existingSocket.connected) {
            console.warn(`[Join] ❌ Player ${user.id} has active session on different socket`);
            socket.emit('quiz_error', { 
              message: 'You already have an active game session. Please close other tabs or wait 45 seconds if you were disconnected.' 
            });
            return;
          } else {
           if (debug)  console.log(`[Join] 🧹 Previous socket no longer connected, allowing new connection`);
          }
        }
        
        // Update player's socket ID and session
        updatePlayerSocketId(roomId, user.id, socket.id);
        updatePlayerSession(roomId, user.id, {
          socketId: socket.id,
          status: existingSession?.inPlayRoute ? 'playing' : 'waiting',
          inPlayRoute: existingSession?.inPlayRoute || false
        });
      }
      
      if (debug) console.log(`[Join] 🎮 Player "${user.name}" (${user.id}) connected with socket ${socket.id}`);
    } else {
      if (debug) console.error(`[Join] ❌ Unknown role: "${role}"`);
      socket.emit('quiz_error', { message: `Unknown role "${role}".` });
      return;
    }

    // ✅ Emit room state after processing join
    emitRoomState(namespace, roomId);
    emitFullRoomState(socket, namespace, roomId);
    namespace.to(roomId).emit('user_joined', { user, role });

    setTimeout(() => {
      namespace.in(roomId).allSockets().then(clients => {
       if (debug)  console.log(`[JoinDebug] 🔎 Clients in ${roomId}:`, [...clients]);
      });
    }, 50);
  });

  // ✅ NEW: Route change tracking for anti-cheat
  socket.on('player_route_change', ({ roomId, playerId, route, entering }) => {
    if (!roomId || !playerId || !route) {
      console.error(`[RouteChange] ❌ Missing data:`, { roomId, playerId, route, entering });
      return;
    }

    if (debug) console.log(`[RouteChange] 🛣️ Player ${playerId} ${entering ? 'entering' : 'leaving'} route: ${route}`);
    
    if (route === 'play') {
      if (entering) {
        // ✅ FIXED: Don't block here, just update session status
        updatePlayerSession(roomId, playerId, {
          socketId: socket.id,
          status: 'playing',
          inPlayRoute: true
        });
        
       if (debug)  console.log(`[RouteChange] ✅ Player ${playerId} entered play route`);
      } else {
        // Player leaving play route
        updatePlayerSession(roomId, playerId, {
          socketId: socket.id,
          status: 'waiting',
          inPlayRoute: false
        });
        
      if (debug)   console.log(`[RouteChange] ⬅️ Player ${playerId} left play route`);
      }
    }
  });

  // ... rest of the handlers remain the same ...
  
  socket.on('add_admin', ({ roomId, admin }) => {
   if (debug)  console.log(`[AddAdmin] 🛠️ Host adding admin "${admin.name}" to room ${roomId}`);
    
    if (!roomId || !admin || !admin.name || !admin.id) {
      console.error(`[AddAdmin] ❌ Invalid data:`, { roomId, admin });
      socket.emit('quiz_error', { message: 'Invalid admin data provided.' });
      return;
    }

    const room = getQuizRoom(roomId);
    if (!room) {
      console.warn(`[AddAdmin] ❌ Room not found: ${roomId}`);
      socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
      return;
    }

    const existingAdmin = room.admins.find(a => a.name.toLowerCase() === admin.name.toLowerCase());
    if (existingAdmin) {
      console.warn(`[AddAdmin] ❌ Admin name already exists: ${admin.name}`);
      socket.emit('quiz_error', { message: `An admin named "${admin.name}" already exists.` });
      return;
    }

    const success = addAdminToQuizRoom(roomId, admin);
    if (!success) {
      console.error(`[AddAdmin] ❌ Failed to add admin to room ${roomId}`);
      socket.emit('quiz_error', { message: 'Failed to add admin to room.' });
      return;
    }

   if (debug)  console.log(`[AddAdmin] ✅ Admin "${admin.name}" added to room ${roomId}`);
    
    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  });

  socket.on('submit_answer', ({ roomId, playerId, answer }) => {
    const room = getQuizRoom(roomId);
    if (!room) {
      console.warn(`[Answer] ❌ Room not found: ${roomId}`);
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const playerData = room.playerData?.[playerId];
    if (playerData?.frozenNextQuestion && 
        playerData?.frozenForQuestionIndex === room.currentQuestionIndex) {
    if (debug)   console.log(`[Answer] ❄️ Ignoring answer from frozen player: ${playerId}`);
      socket.emit('quiz_error', { message: 'You are frozen for this question and cannot answer!' });
      return;
    }

    const currentQuestion = room.questions?.[room.currentQuestionIndex];
    const roundAnswerKey = `${currentQuestion.id}_round${room.currentRound}`;
    if (currentQuestion && playerData?.answers?.[roundAnswerKey]) {
     if (debug)  console.log(`[Answer] 🔄 Player ${playerId} already answered question ${currentQuestion.id} in round ${room.currentRound}`);
      socket.emit('quiz_error', { message: 'You have already answered this question!' });
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

     if (debug)  console.log(
        `[Answer] ✅ ${playerName} (${playerId}) submitted: "${answer}" → ${isCorrect ? '✅ Correct' : '❌ Wrong'}`
      );

      engine.handlePlayerAnswer(roomId, playerId, answer, namespace);
    }).catch(err => {
      console.error(`[Answer] ❌ Engine import failed:`, err);
      socket.emit('quiz_error', { message: 'Failed to load gameplay engine' });
    });
  });

 // REPLACE the existing use_extra handler in playerHandlers.js with this:

socket.on('use_extra', async ({ roomId, playerId, extraId, targetPlayerId }) => {
 if (debug)  console.log(`[PlayerHandler] 🧪 Received use_extra:`, { roomId, playerId, extraId, targetPlayerId });
  
  const room = getQuizRoom(roomId);
  if (!room) {
    socket.emit('quiz_error', { message: 'Room not found' });
    return;
  }

  // ✅ FIRST: Handle the extra using existing quizRoomManager function
  const result = handlePlayerExtra(roomId, playerId, extraId, targetPlayerId, namespace);
  
  if (!result.success) {
    console.warn(`[PlayerHandler] ❌ Extra ${extraId} failed for ${playerId}: ${result.error}`);
    socket.emit('quiz_error', { message: result.error });
    return;
  }

  // ✅ SUCCESS: Extra was used successfully
 if (debug)  console.log(`[PlayerHandler] ✅ Extra ${extraId} used successfully by ${playerId}`);
  socket.emit('extra_used_successfully', { extraId });

  // ✅ NEW: Send host notifications for specific extras
  try {
    const enginePromise = getEngine(room);
    if (enginePromise) {
      const engine = await enginePromise;
      
      if (extraId === 'buyHint' && engine.handleHintExtra) {
        // Notify host of hint usage
        engine.handleHintExtra(roomId, playerId, namespace);
       if (debug)  console.log(`[PlayerHandler] 📡 Sent hint notification to host for ${playerId}`);
      } 
      else if (extraId === 'freezeOutTeam' && targetPlayerId && engine.handleFreezeExtra) {
        // Notify host of freeze usage
        engine.handleFreezeExtra(roomId, playerId, targetPlayerId, namespace);
       if (debug)  console.log(`[PlayerHandler] 📡 Sent freeze notification to host for ${playerId} -> ${targetPlayerId}`);
      }
    }
  } catch (error) {
    console.error(`[PlayerHandler] ❌ Failed to send host notification:`, error);
    // Don't fail the extra usage, just log the notification error
  }
});

  socket.on('use_clue', ({ roomId, playerId }) => {
   if (debug)  console.log(`[PlayerHandler] 💡 Legacy use_clue from ${playerId} - redirecting to buyHint`);
    
    const result = handlePlayerExtra(roomId, playerId, 'buyHint', null, namespace);
    
    if (result.success) {
     if (debug)  console.log(`[PlayerHandler] ✅ Legacy clue used successfully by ${playerId}`);
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

// REPLACE your existing request_current_state handler in playerHandlers.js with this:

socket.on('request_current_state', ({ roomId, playerId }) => {
  emitFullRoomState(socket, namespace, roomId);
  const room = getQuizRoom(roomId);
  if (!room) return;

  // ✅ EXISTING: Handle asking phase
  if (room.currentPhase === 'asking' && room.currentQuestionIndex >= 0) {
    const question = room.questions[room.currentQuestionIndex];
    const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
    const timeLimit = roundConfig?.config?.timePerQuestion || 10;
    const questionStartTime = room.questionStartTime || Date.now();
    
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    const remainingTime = Math.max(0, timeLimit - elapsed);
    
    const playerData = room.playerData[playerId];
    const roundAnswerKey = `${question.id}_round${room.currentRound}`;
    const hasAnswered = playerData?.answers?.[roundAnswerKey] ? true : false;
    const submittedAnswer = playerData?.answers?.[roundAnswerKey]?.submitted || null;
    const isFrozen = playerData?.frozenNextQuestion && 
                    playerData?.frozenForQuestionIndex === room.currentQuestionIndex;
    
    socket.emit('question', {
      id: question.id,
      text: question.text,
      options: question.options || [],
      timeLimit,
      questionStartTime,
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: room.questions.length
    });
    
    socket.emit('player_state_recovery', {
      hasAnswered,
      submittedAnswer,
      isFrozen,
      frozenBy: playerData?.frozenBy || null,
      usedExtras: playerData?.usedExtras || {},
      usedExtrasThisRound: playerData?.usedExtrasThisRound || {},
      remainingTime,
      currentQuestionIndex: room.currentQuestionIndex
    });

   if (debug)  console.log(`[Recovery] 🔁 Sent complete state recovery for ${playerId}: answered=${hasAnswered}, frozen=${isFrozen}, remaining=${remainingTime}s`);
  }

  // ✅ NEW: Handle reviewing phase
  else if (room.currentPhase === 'reviewing') {
    if (debug) console.log(`[Recovery] 📖 Recovering review phase for ${playerId} in room ${roomId}`);
    
    // Import the engine dynamically
    const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;
    let enginePromise;
    
    if (roundType === 'general_trivia') {
      enginePromise = import('../ gameplayEngines/generalTriviaEngine.js');
    } else if (roundType === 'wipeout') {
      enginePromise = import('../ gameplayEngines/wipeoutEngine.js');
    }
    
    if (enginePromise) {
      enginePromise.then(engine => {
        if (engine && typeof engine.getCurrentReviewQuestion === 'function') {
          const reviewQuestion = engine.getCurrentReviewQuestion(roomId);
          
          if (reviewQuestion) {
            // Check if this is for a host or player
            const isHost = playerId === 'host' || socket.rooms.has(`${roomId}:host`);
            
            if (isHost) {
              // Send host-specific review question
              socket.emit('host_review_question', {
                id: reviewQuestion.id,
                text: reviewQuestion.text,
                options: reviewQuestion.options || [],
                correctAnswer: reviewQuestion.correctAnswer,
                difficulty: reviewQuestion.difficulty,
                category: reviewQuestion.category
              });
              
              if (debug)  console.log(`[Recovery] 🧐 Sent host review question for ${roomId}: ${reviewQuestion.id}`);
            } else {
              // Send player-specific review question with their answer
              const playerData = room.playerData[playerId];
              const roundAnswerKey = `${reviewQuestion.id}_round${room.currentRound}`;
              const playerAnswer = playerData?.answers?.[roundAnswerKey];
              
              socket.emit('review_question', {
                id: reviewQuestion.id,
                text: reviewQuestion.text,
                options: reviewQuestion.options || [],
                correctAnswer: reviewQuestion.correctAnswer,
                submittedAnswer: playerAnswer?.submitted || null,
                difficulty: reviewQuestion.difficulty,
                category: reviewQuestion.category
              });
              
             if (debug)  console.log(`[Recovery] 📖 Sent player review question for ${playerId}: ${reviewQuestion.id}`);
            }
          }
          
          // Check if review is complete
          if (engine.isReviewComplete && engine.isReviewComplete(roomId)) {
            const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
            const questionsPerRound = roundConfig?.config?.questionsPerRound || 6;
            
            socket.emit('review_complete', {
              message: `All ${questionsPerRound} questions have been reviewed`,
              roundNumber: room.currentRound,
              totalQuestions: questionsPerRound
            });
            
           if (debug)  console.log(`[Recovery] ✅ Sent review complete notification for ${roomId}`);
          }
        }
      }).catch(err => {
        console.error(`[Recovery] ❌ Failed to load engine for review recovery:`, err);
      });
    }
  }

  // ✅ NEW: Handle leaderboard phase
  else if (room.currentPhase === 'leaderboard') {
   if (debug)  console.log(`[Recovery] 🏆 Recovering leaderboard phase for ${playerId} in room ${roomId}`);
    
    // Send stored leaderboard data if available
    if (room.currentRoundResults) {
      socket.emit('round_leaderboard', room.currentRoundResults);
     if (debug)  console.log(`[Recovery] 🏆 Sent round leaderboard for room ${roomId}`);
    }
    
    if (room.currentOverallLeaderboard) {
      socket.emit('leaderboard', room.currentOverallLeaderboard);
    if (debug)   console.log(`[Recovery] 🏆 Sent overall leaderboard for room ${roomId}`);
    }
  }
});

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
           if (debug)  console.log(`[DisconnectCleanup] 🧹 Admin "${admin.name}" (${admin.id}) removed from ${roomId}`);
            namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
          }
        }
      });
    }, 5000);
  });
}







