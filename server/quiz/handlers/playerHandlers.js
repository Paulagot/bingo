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
  emitRoomState,
  updatePlayerSession,
  getPlayerSession,
  isPlayerInActiveSession,
  cleanExpiredSessions
} from '../quizRoomManager.js';
import { emitFullRoomState } from '../handlers/sharedUtils.js';

const debug = true;

function getEngine(room) {
  const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;

  switch (roundType) {
    case 'general_trivia':
      return import('../gameplayEngines/generalTriviaEngine.js');
    case 'wipeout':
      return import('../gameplayEngines/wipeoutEngine.js');
    case 'speed_round':
      return import('../gameplayEngines/speedRoundEngine.js');
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

    if (debug) console.log(`[Join Player Handler] 🚪 ${role.toUpperCase()} "${user.name || user.id}" joining room ${roomId}`);

    const room = getQuizRoom(roomId);
    if (!room) {
      console.warn(`[Join] ⚠️ Room not found: ${roomId}`);
      socket.emit('quiz_error', { message: `Room ${roomId} not found.` });
      return;
    }

    // Validate BEFORE joining rooms
    if (role === 'player') {
      // Capacity checks (Web2 only; allow overflow for Web3 rooms)
      const isWeb3 = room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room === true;
      if (!isWeb3) {
        const limit =
          room.roomCaps?.maxPlayers ??
          room.config?.roomCaps?.maxPlayers ??
          20;

        if (room.players.length >= limit) {
          console.warn(`[Join] 🚫 Player limit reached (${limit}) in room ${roomId}`);
          socket.emit('quiz_error', { message: `Room is full (limit ${limit}).` });
          return;
        }
      }
    }

    // Join AFTER validation
    socket.join(roomId);
    socket.join(`${roomId}:${role}`);

    if (role === 'host') {
      updateHostSocketId(roomId, socket.id);
      if (debug) console.log(`[Join] 👑 Host "${room.config.hostName}" (${user.id}) joined with socket ${socket.id}`);

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
      // ✅ Session housekeeping
      cleanExpiredSessions(roomId);

      // Determine if player exists and/or has a session
      const existingPlayer = room.players.find(p => p.id === user.id);
      const existingSession = getPlayerSession(roomId, user.id);

      // ──────────────────────────────────────────────────────────────
      // 🔒 ENFORCE UNIQUENESS: disconnect any previous socket
      // New join replaces the old socket (best UX for refresh/reconnect)
      // ──────────────────────────────────────────────────────────────
   const prevSocketId = existingSession?.socketId || existingPlayer?.socketId;
if (prevSocketId && prevSocketId !== socket.id) {
  const prevSocket = namespace.sockets.get(prevSocketId);
  if (prevSocket && prevSocket.connected) {
    // ✅ Only boot if the old socket is actually a PLAYER in this room
    const isPrevPlayerSocket =
      prevSocket.rooms.has(roomId) && prevSocket.rooms.has(`${roomId}:player`) && !prevSocket.rooms.has(`${roomId}:host`);

    if (isPrevPlayerSocket) {
      prevSocket.emit('quiz_error', {
        message: 'You were signed in from another tab. This session is now active.',
      });
      try { prevSocket.disconnect(true); } catch {}
    } else {
      // Extra safety: don’t touch hosts/admins
      if (debug) console.warn('[Join] Skipping disconnect of non-player socket:', { prevSocketId, rooms: [...prevSocket.rooms] });
    }
  }
}


      // Add or update player with current socket
      if (!existingPlayer) {
        addOrUpdatePlayer(roomId, { ...user, socketId: socket.id });
        updatePlayerSocketId(roomId, user.id, socket.id);
        updatePlayerSession(roomId, user.id, {
          socketId: socket.id,
          status: 'waiting',
          inPlayRoute: false,
          lastActive: Date.now()
        });
      } else {
        updatePlayerSocketId(roomId, user.id, socket.id);
        updatePlayerSession(roomId, user.id, {
          socketId: socket.id,
          status: existingSession?.status || 'waiting',
          inPlayRoute: !!existingSession?.inPlayRoute,
          lastActive: Date.now()
        });
      }

      if (debug) console.log(`[Join] 🎮 Player "${user.name}" (${user.id}) connected with socket ${socket.id}`);

      // OPTIONAL: store Web3 wallet details for payouts (players only)
      if (user.web3Address && user.web3Chain) {
        if (!room.web3AddressMap) room.web3AddressMap = new Map();
        room.web3AddressMap.set(user.id, {
          address: user.web3Address,
          chain: user.web3Chain,
          txHash: user.web3TxHash || null,
          playerName: user.name || 'Unknown'
        });
        if (!room.config.web3PlayerAddresses) room.config.web3PlayerAddresses = {};
        room.config.web3PlayerAddresses[user.id] = {
          address: user.web3Address,
          chain: user.web3Chain,
          name: user.name
        };
      }

    } else {
      if (debug) console.error(`[Join] ❌ Unknown role: "${role}"`);
      socket.emit('quiz_error', { message: `Unknown role "${role}".` });
      return;
    }

    // Emit room state after processing join
    emitRoomState(namespace, roomId);
    emitFullRoomState(socket, namespace, roomId);
    namespace.to(roomId).emit('user_joined', { user, role });

    setTimeout(() => {
      namespace.in(roomId).allSockets().then(clients => {
        // if (debug) console.log(`[JoinDebug] 🔎 Clients in ${roomId}:`, [...clients]);
      });
    }, 50);
  });

  // --- Tie-breaker: player submits numeric answer ---
  socket.on('tiebreak:answer', async ({ roomId, answer }) => {
    const room = getQuizRoom(roomId);
    if (!room?.tiebreaker?.isActive) return;

    // Only participants can submit
    const player = room.players.find(p => p.socketId === socket.id);
    const playerId = player?.id;
    if (!playerId || !room.tiebreaker.participants.includes(playerId)) return;

    // Lazy import to avoid top-level circular deps
    const mod = await import('../gameplayEngines/services/TiebreakerService.js');
    mod.TiebreakerService.receiveAnswer(room, playerId, Number(answer));
  });

  // ✅ NEW: Route change tracking for anti-cheat
  socket.on('player_route_change', ({ roomId, playerId, route, entering }) => {
    if (!roomId || !playerId || !route) {
      console.error(`[RouteChange] ❌ Missing data:`, { roomId, playerId, route, entering });
      return;
    }

    if (route === 'play') {
      if (entering) {
        updatePlayerSession(roomId, playerId, {
          socketId: socket.id,
          status: 'playing',
          inPlayRoute: true
        });
        if (debug) console.log(`[RouteChange] ✅ Player ${playerId} entered play route`);
      } else {
        updatePlayerSession(roomId, playerId, {
          socketId: socket.id,
          status: 'waiting',
          inPlayRoute: false
        });
        if (debug) console.log(`[RouteChange] ⬅️ Player ${playerId} left play route`);
      }
    }
  });

  socket.on('add_admin', ({ roomId, admin }) => {
    if (debug) console.log(`[AddAdmin] 🛠️ Host adding admin "${admin.name}" to room ${roomId}`);

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

    if (debug) console.log(`[AddAdmin] ✅ Admin "${admin.name}" added to room ${roomId}`);

    namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
    emitRoomState(namespace, roomId);
  });

  socket.on('submit_answer', ({ roomId, playerId, questionId, answer, autoTimeout }) => {
    if (debug) console.log(`[DEBUG] submit_answer received:`, { roomId, playerId, questionId, answer, autoTimeout });
    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const enginePromise = getEngine(room);
    if (!enginePromise) {
      socket.emit('quiz_error', { message: 'No gameplay engine available' });
      return;
    }

    enginePromise.then(engine => {
      if (!engine?.handlePlayerAnswer) {
        socket.emit('quiz_error', { message: 'Invalid gameplay engine' });
        return;
      }
      const normalised = (answer === '' || answer === undefined) ? null : answer;
      engine.handlePlayerAnswer(roomId, playerId, { questionId, answer: normalised, autoTimeout }, namespace);
    }).catch(err => {
      console.error(`[DEBUG] Engine loading failed:`, err);
    });
  });

  // REPLACED: use_extra
  socket.on('use_extra', async ({ roomId, playerId, extraId, targetPlayerId }) => {
    const room = getQuizRoom(roomId);

    const allowedByPlan =
      room.config?.roomCaps?.extrasAllowed === '*' ||
      (Array.isArray(room.config?.roomCaps?.extrasAllowed) &&
       room.config.roomCaps.extrasAllowed.includes(extraId));

    const enabledInConfig = !!room.config?.fundraisingOptions?.[extraId];

    if (!allowedByPlan || !enabledInConfig) {
      if (debug) console.warn(`[PlayerHandler] 🚫 Extra "${extraId}" not permitted (allowedByPlan=${allowedByPlan}, enabled=${enabledInConfig})`);
      socket.emit('quiz_error', { message: `Extra "${extraId}" is not available in this game.` });
      return;
    }

    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }

    const result = handlePlayerExtra(roomId, playerId, extraId, targetPlayerId, namespace);

    if (!result.success) {
      console.warn(`[PlayerHandler] ❌ Extra ${extraId} failed for ${playerId}: ${result.error}`);
      socket.emit('quiz_error', { message: result.error });
      return;
    }

    if (debug) console.log(`[PlayerHandler] ✅ Extra ${extraId} used successfully by ${playerId}`);
    socket.emit('extra_used_successfully', { extraId });

    try {
      const enginePromise = getEngine(room);
      if (enginePromise) {
        const engine = await enginePromise;

        if (extraId === 'buyHint' && engine.handleHintExtra) {
          engine.handleHintExtra(roomId, playerId, namespace);
          if (debug) console.log(`[PlayerHandler] 📡 Sent hint notification to host for ${playerId}`);
        } else if (extraId === 'freezeOutTeam' && targetPlayerId && engine.handleFreezeExtra) {
          engine.handleFreezeExtra(roomId, playerId, targetPlayerId, namespace);
          if (debug) console.log(`[PlayerHandler] 📡 Sent freeze notification to host for ${playerId} -> ${targetPlayerId}`);
        }
      }
    } catch (error) {
      console.error(`[PlayerHandler] ❌ Failed to send host notification:`, error);
    }
  });

  // Speed-round-specific instant submit
  socket.on('submit_speed_answer', ({ roomId, playerId, questionId, answer }) => {
    const room = getQuizRoom(roomId);
    if (!room) {
      socket.emit('quiz_error', { message: 'Room not found' });
      return;
    }
    const enginePromise = getEngine(room);
    if (!enginePromise) {
      socket.emit('quiz_error', { message: 'No gameplay engine available' });
      return;
    }

    Promise.resolve(enginePromise).then(engine => {
      if (!engine?.handlePlayerAnswer) {
        socket.emit('quiz_error', { message: 'Invalid gameplay engine' });
        return;
      }
      engine.handlePlayerAnswer(roomId, playerId, { questionId, answer }, namespace);
    }).catch(err => {
      console.error(`[submit_speed_answer] Engine load error:`, err);
    });
  });

  socket.on('use_clue', ({ roomId, playerId }) => {
    if (debug) console.log(`[PlayerHandler] 💡 Legacy use_clue from ${playerId} - redirecting to buyHint`);

    const result = handlePlayerExtra(roomId, playerId, 'buyHint', null, namespace);

    if (result.success) {
      if (debug) console.log(`[PlayerHandler] ✅ Legacy clue used successfully by ${playerId}`);
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

  // request_current_state handler
  socket.on('request_current_state', ({ roomId, playerId }) => {
    emitFullRoomState(socket, namespace, roomId);
    const room = getQuizRoom(roomId);
    if (!room) return;

    if (room.currentPhase === 'asking') {
      const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;
      if (roundType === 'speed_round') {
        const remaining = Math.max(0, Math.floor(((room.roundEndTime || 0) - Date.now()) / 1000));
        socket.emit('round_time_remaining', { remaining });

        const enginePromise = getEngine(room);
        if (enginePromise) {
          Promise.resolve(enginePromise).then(engine => {
            if (engine?.emitNextQuestionToPlayer) {
              const cursor = room.playerCursors?.[playerId] ?? 0;
              const player = room.players.find(p => p.id === playerId);
              if (player?.socketId && room.questions[cursor]) {
                const q = room.questions[cursor];
                socket.emit('speed_question', {
                  id: q.id,
                  text: q.text,
                  options: Array.isArray(q.options) ? q.options.slice(0, 2) : [],
                });
              }
            }
          });
        }
        return;
      }
    }

    // Handle asking phase (non speed-round)
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
        totalQuestions: room.questions.length,
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

      if (debug) console.log(`[Recovery] 🔁 Sent complete state recovery for ${playerId}: answered=${hasAnswered}, frozen=${isFrozen}, remaining=${remainingTime}s`);
    }

    // Handle reviewing phase
    else if (room.currentPhase === 'reviewing') {
      if (debug) console.log(`[Recovery] 📖 Recovering review phase for ${playerId} in room ${roomId}`);

      const roundType = room.config.roundDefinitions?.[room.currentRound - 1]?.roundType;
      let enginePromise;

      if (roundType === 'general_trivia') {
        enginePromise = import('../gameplayEngines/generalTriviaEngine.js');
      } else if (roundType === 'wipeout') {
        enginePromise = import('../gameplayEngines/wipeoutEngine.js');
      } else if (roundType === 'speed_round') {
        enginePromise = import('../gameplayEngines/speedRoundEngine.js');
      }

      if (enginePromise) {
        enginePromise.then(engine => {
          if (engine && typeof engine.getCurrentReviewQuestion === 'function') {
            const reviewQuestion = engine.getCurrentReviewQuestion(roomId);

            if (reviewQuestion) {
              const isHost = playerId === 'host' || socket.rooms.has(`${roomId}:host`);

              if (isHost) {
                socket.emit('host_review_question', {
                  id: reviewQuestion.id,
                  text: reviewQuestion.text,
                  options: reviewQuestion.options || [],
                  correctAnswer: reviewQuestion.correctAnswer,
                  difficulty: reviewQuestion.difficulty,
                  category: reviewQuestion.category
                });
                if (debug) console.log(`[Recovery] 🧐 Sent host review question for ${roomId}: ${reviewQuestion.id}`);
              } else {
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
                if (debug) console.log(`[Recovery] 📖 Sent player review question for ${playerId}: ${reviewQuestion.id}`);
              }
            }

            if (engine.isReviewComplete && engine.isReviewComplete(roomId)) {
              const roundConfig = room.config.roundDefinitions[room.currentRound - 1];
              const questionsPerRound = roundConfig?.config?.questionsPerRound || 6;

              socket.emit('review_complete', {
                message: `All ${questionsPerRound} questions have been reviewed`,
                roundNumber: room.currentRound,
                totalQuestions: questionsPerRound
              });
              if (debug) console.log(`[Recovery] ✅ Sent review complete notification for ${roomId}`);
            }
          }
        }).catch(err => {
          console.error(`[Recovery] ❌ Failed to load engine for review recovery:`, err);
        });
      }
    }

    // Handle leaderboard phase
    else if (room.currentPhase === 'leaderboard') {
      if (debug) console.log(`[Recovery] 🏆 Recovering leaderboard phase for ${playerId} in room ${roomId}`);

      if (room.currentRoundResults && !room.currentOverallLeaderboard) {
        socket.emit('round_leaderboard', room.currentRoundResults);
        if (debug) console.log(`[Recovery] 🏆 Sent round leaderboard for room ${roomId}`);
      } else if (room.currentOverallLeaderboard) {
        socket.emit('leaderboard', room.currentOverallLeaderboard);
        if (debug) console.log(`[Recovery] 🏆 Sent overall leaderboard for room ${roomId}`);
      } else if (room.currentRoundResults) {
        socket.emit('round_leaderboard', room.currentRoundResults);
        if (debug) console.log(`[Recovery] 🏆 Sent round leaderboard (fallback) for room ${roomId}`);
      }
    }

    // Host extras
    const isHost = !playerId || playerId === 'host' || socket.rooms.has(`${roomId}:host`);
    if (isHost && socket.rooms.has(`${roomId}:host`)) {
      if (debug) console.log(`[Recovery] 📊 Recovering host stats for room ${roomId}`);

      if (room.currentRoundStats) {
        socket.emit('host_current_round_stats', room.currentRoundStats);
      }

      if (room.finalQuizStats) {
        socket.emit('host_final_stats', room.finalQuizStats);
      }

      if (room.cumulativeStatsForRecovery) {
        socket.emit('host_cumulative_stats', room.cumulativeStatsForRecovery);
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
            if (debug) console.log(`[DisconnectCleanup] 🧹 Admin "${admin.name}" (${admin.id}) removed from ${roomId}`);
            namespace.to(roomId).emit('admin_list_updated', { admins: room.admins });
          }
        }
      });
    }, 5000);
  });
}








