// server/quiz/handlers/recoveryHandlers.js
const debug = true;

import {
  getQuizRoom,
  addOrUpdatePlayer,
  updatePlayerSocketId,
  updatePlayerSession,
  getPlayerSession,
  emitRoomState,
} from '../quizRoomManager.js';
import { emitFullRoomState } from './sharedUtils.js';

// local helper (same logic you use elsewhere)
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
      if (debug) console.warn(`[recovery] Unknown round type: ${roundType}`);
      return null;
  }
}

export function setupRecoveryHandlers(socket, namespace) {
  /**
   * One-shot: join + return a full snapshot in the ack
   * Client emits with a callback: socket.emit('join_and_recover', payload, (res) => { ... })
   */
  socket.on('join_and_recover', async (payload, ack) => {
    const sendAck = (obj) => (typeof ack === 'function' ? ack(obj) : undefined);

    try {
      const { roomId, user, role = 'player' } = payload || {};
      if (!roomId || !user?.id) {
        return sendAck({ ok: false, error: 'Invalid payload' });
      }

      const room = getQuizRoom(roomId);
      if (!room) {
        return sendAck({ ok: false, error: 'Room not found' });
      }

      const isPlayerRole = role === 'player';

      // Capacity (Web2 only) — only enforce for players
      if (isPlayerRole) {
        const isWeb3 = room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room === true;
        if (!isWeb3) {
          const limit = room.roomCaps?.maxPlayers ?? room.config?.roomCaps?.maxPlayers ?? 20;
          if (room.players.length >= limit) {
            return sendAck({ ok: false, error: `Room is full (limit ${limit}).` });
          }
        }
      }

      // Uniqueness: disconnect any previous socket for this *player*
      const existingPlayer = room.players.find((p) => p.id === user.id);
      const existingSession = getPlayerSession(roomId, user.id);
      const prevSocketId = existingSession?.socketId || existingPlayer?.socketId;

      if (prevSocketId && prevSocketId !== socket.id) {
        const prevSocket = namespace.sockets.get(prevSocketId);
        if (prevSocket && prevSocket.connected) {
          // Only boot if it’s actually a PLAYER socket for this room
          const isSameRoom   = prevSocket.rooms.has(roomId);
          const isPlayerSock = prevSocket.rooms.has(`${roomId}:player`);
          const isHostSock   = prevSocket.rooms.has(`${roomId}:host`);
          const isAdminSock  = prevSocket.rooms.has(`${roomId}:admin`);

          if (isSameRoom && isPlayerSock && !isHostSock && !isAdminSock) {
            if (debug) console.log('[Recovery] Disconnecting previous PLAYER socket', prevSocketId);
            prevSocket.emit('quiz_error', {
              message: 'You were signed in from another tab. This session is now active.',
            });
            try { prevSocket.disconnect(true); } catch {}
          } else {
            // Safety: never touch host/admin sockets (or sockets from other rooms)
            if (debug) console.warn('[Recovery] Skipping disconnect of non-player socket', {
              prevSocketId, rooms: [...prevSocket.rooms]
            });
          }
        }
      }

      // Join rooms
      socket.join(roomId);
      socket.join(`${roomId}:${role}`);

      // ✅ Only treat as a player if role === 'player'
      if (isPlayerRole) {
        if (!existingPlayer) {
          addOrUpdatePlayer(roomId, { ...user, socketId: socket.id });
        }
        updatePlayerSocketId(roomId, user.id, socket.id);
        updatePlayerSession(roomId, user.id, {
          socketId: socket.id,
          status: existingSession?.status || 'waiting',
          inPlayRoute: !!existingSession?.inPlayRoute,
          lastActive: Date.now(),
        });
      } else {
        // 🧹 If this id was previously (incorrectly) added as a player, remove it now
        if (existingPlayer) {
          try {
            room.players = room.players.filter(p => p.id !== user.id);
            if (room.playerData) delete room.playerData[user.id];
          } catch {}
        }
      }

      // Minimal snapshot scaffolding (compute after cleanup above)
      const totalRounds = room.config.roundDefinitions?.length || 1;
      const roundIndex = room.currentRound - 1;
      const roundTypeId = room.config.roundDefinitions?.[roundIndex]?.roundType || '';
      const roomState = {
        currentRound: room.currentRound,
        totalRounds,
        roundTypeId,
        roundTypeName: roundTypeId,
        totalPlayers: room.players.length, // host/admin no longer inflate this
        phase: room.currentPhase,
        caps: room.roomCaps,
      };

      const playersLite = room.players.map((p) => ({ id: p.id, name: p.name }));

      const snap = {
        roomState,
        players: playersLite,
        config: {
          hostName: room.config.hostName,
          currencySymbol: room.config.currencySymbol || '€',
          fundraisingOptions: room.config.fundraisingOptions || {},
          fundraisingPrices: room.config.fundraisingPrices || {},
          roundDefinitions: room.config.roundDefinitions || [],
          roomCaps: room.roomCaps || room.config.roomCaps || { maxPlayers: 20 },
        },
      };

      // Phase-specific hydration
      if (room.currentPhase === 'asking') {
        const roundCfg = room.config.roundDefinitions[roundIndex]?.config || {};
        const roundType = room.config.roundDefinitions[roundIndex]?.roundType;

        if (roundType === 'speed_round') {
          const remaining = Math.max(
            0,
            Math.floor(((room.roundEndTime || 0) - Date.now()) / 1000),
          );
          const cursor = room.playerCursors?.[user.id] ?? 0;
          const q = room.questions?.[cursor];
          if (q) {
            snap.speed = { remaining };
            snap.question = {
              id: String(q.id),
              text: q.text,
              options: Array.isArray(q.options) ? q.options.slice(0, 2) : [],
              timeLimit: 0,
              questionStartTime: Date.now(),
            };
          }
        } else {
          const q = room.questions?.[room.currentQuestionIndex];
          if (q) {
            const timeLimit = roundCfg?.timePerQuestion || 10;
            const questionStartTime = room.questionStartTime || Date.now();
            const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
            const remainingTime = Math.max(0, timeLimit - elapsed);

            const pdata = room.playerData[user.id];
            const key = `${q.id}_round${room.currentRound}`;
            const submittedAnswer = pdata?.answers?.[key]?.submitted ?? null;
            const isFrozen =
              !!(pdata?.frozenNextQuestion && pdata?.frozenForQuestionIndex === room.currentQuestionIndex);

            snap.question = {
              id: q.id,
              text: q.text,
              options: q.options || [],
              timeLimit,
              questionStartTime,
              questionNumber: room.currentQuestionIndex + 1,
              totalQuestions: room.questions.length,
            };
            snap.playerRecovery = {
              hasAnswered: submittedAnswer !== null && submittedAnswer !== undefined,
              submittedAnswer,
              isFrozen,
              frozenBy: pdata?.frozenBy || null,
              usedExtras: pdata?.usedExtras || {},
              usedExtrasThisRound: pdata?.usedExtrasThisRound || {},
              remainingTime,
              currentQuestionIndex: room.currentQuestionIndex,
            };
          }
        }

      } else if (room.currentPhase === 'reviewing') {
        const enginePromise = getEngine(room);
        if (enginePromise) {
          try {
            const engine = await enginePromise;
            if (engine?.getCurrentReviewQuestion) {
              const rq = engine.getCurrentReviewQuestion(roomId);
              if (rq) {
                const pdata = room.playerData[user.id];
                const key = `${rq.id}_round${room.currentRound}`;
                const playerAnswer = pdata?.answers?.[key];

                snap.review = {
                  id: rq.id,
                  text: rq.text,
                  options: rq.options || [],
                  correctAnswer: rq.correctAnswer,
                  submittedAnswer: playerAnswer?.submitted || null,
                  difficulty: rq.difficulty,
                  category: rq.category,
                  questionNumber: (room.lastEmittedReviewIndex ?? -1) + 1,
                  totalQuestions: (Array.isArray(room.reviewQuestions) && room.reviewQuestions.length > 0)
                    ? room.reviewQuestions.length
                    : (room.questions?.length || 0),
                };
              }
            }
          } catch (e) {
            if (debug) console.error('[recovery] review engine load failed:', e);
          }
        }

      } else if (room.currentPhase === 'tiebreaker') {
        const tb = room.tiebreaker || {};
        const base = {
          participants: tb.participants || [],
          mode: tb.mode,
          questionNumber: tb.questionIndex || 0,
          stage: tb.stage || 'start'
        };

        // QUESTION stage: include user's submittedAnswer to lock UI after refresh
        if (tb.stage === 'question' && room.currentTiebreakQuestion) {
          const q = room.currentTiebreakQuestion;

          // Look up this question's record in TB history and pull this user's answer (if any)
          const record = Array.isArray(tb.history)
            ? tb.history.find(h => String(h.qid) === String(q.id))
            : null;

          const submittedRaw = record?.answers?.[user.id];
          const submittedAnswer =
            typeof submittedRaw === 'number' && Number.isFinite(submittedRaw) ? submittedRaw : null;

          snap.tb = {
            ...base,
            question: {
              id: q.id,
              text: q.text,
              timeLimit: 20, // matches emitter in TiebreakerService
              questionStartTime: q.questionStartTime,
              submittedAnswer, // used by client to hide the input if already answered
            }
          };

        // REVIEW stage: reconstruct review payload
        } else if (tb.stage === 'review' && tb.lastReview) {
          snap.tb = {
            ...base,
            review: {
              correctAnswer: tb.lastReview.correctAnswer,
              playerAnswers: tb.lastReview.playerAnswers || {},
              winnerIds: tb.lastReview.winnerIds,
              stillTiedIds: tb.lastReview.stillTiedIds,
              questionText: tb.lastReview.questionText,
              isFinalAnswer: !!tb.lastReview.isFinalAnswer
            }
          };

        // RESULT stage: final winners (leaderboard will follow)
        } else if (tb.stage === 'result' && Array.isArray(tb.winnerIds)) {
          snap.tb = { ...base, result: { winnerIds: tb.winnerIds } };

        // START / unknown stage: send base metadata so client can show phase text
        } else {
          snap.tb = base;
        }

      } else if (room.currentPhase === 'leaderboard' || room.currentPhase === 'complete') {
        if (Array.isArray(room.finalLeaderboard) && room.finalLeaderboard.length) {
          // Prefer final leaderboard (includes tiebreaker bonus if awarded)
          snap.leaderboard = room.finalLeaderboard;
        } else if (room.currentRoundResults && !room.currentOverallLeaderboard) {
          snap.roundLeaderboard = room.currentRoundResults;
        } else if (room.currentOverallLeaderboard) {
          snap.leaderboard = room.currentOverallLeaderboard;
        }
      }

      // Broadcast normal events so rest of app stays in sync
      emitRoomState(namespace, roomId);
      emitFullRoomState(socket, namespace, roomId);

      // Keep user_joined event (clients can ignore non-players if they want)
      namespace.to(roomId).emit('user_joined', { user, role });

      // Also push current players list to everyone (optional but handy)
      namespace.to(roomId).emit('player_list_updated', { players: playersLite });

      return sendAck({ ok: true, snap });
    } catch (err) {
      console.error('[join_and_recover] error:', err);
      return sendAck({ ok: false, error: 'Internal error' });
    }
  });
}

