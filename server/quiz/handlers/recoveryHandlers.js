// server/quiz/handlers/recoveryHandlers.js
const debug = true;

import {
  getQuizRoom,
  addOrUpdatePlayer,
  updatePlayerSocketId,
  updatePlayerSession,
  getPlayerSession,
  emitRoomState,
  cleanExpiredSessions,
  updateAdminSocketId,
} from '../quizRoomManager.js';
import { emitFullRoomState } from './sharedUtils.js';
// ✅ ADD THIS at top of playerHandlers.js (after other imports)
import { normalizePaymentMethod }  from '../../utils/paymentMethods.js';

// --- Payment method normalization (keep in sync with playerHandlers.js) ---


function isPlaceholderName(name, id) {
  if (!name) return true;
  const n = String(name).trim();
  return n.toLowerCase() === 'player' || n === id || n.startsWith('Player ');
}

function normalizeExtraPayments(extraPayments) {
  if (!extraPayments || typeof extraPayments !== 'object') return {};
  return Object.fromEntries(
    Object.entries(extraPayments).map(([key, val]) => {
      const method = normalizePaymentMethod(val?.method);
      const amount = Number(val?.amount || 0);
      return [key, { method, amount }];
    })
  );
}

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
    case 'hidden_object':
      return import('../gameplayEngines/hiddenObjectEngine.js');
    case 'order_image':
      return import('../gameplayEngines/orderImageEngine.js');
    default:
      if (debug) console.warn(`[recovery] Unknown round type: ${roundType}`);
      return null;
  }
}

// ✅ helper: build a safe hidden-object snapshot for ANY role (player/host/admin)
function buildHiddenObjectSnap(room, userId, phase) {
  const ho = room.hiddenObject;
  if (!ho) return null;

  const pState = ho.player?.[userId]; // may be undefined for host/admin (that's fine)
  
  // ✅ PHASE-SPECIFIC LOGIC
  if (phase === 'reviewing') {
    // During review, use room.currentReviewIndex to get the correct puzzle
    const reviewIndex = room.currentReviewIndex ?? 0;
    const puzzle = room.reviewQuestions?.[reviewIndex];
    const puzzleHistory = ho.puzzleHistory?.[reviewIndex];
    
    if (!puzzle) {
      console.warn('[Recovery] No review puzzle found at index', reviewIndex);
      return null;
    }
    
    // Get player's foundIds for THIS specific puzzle from history
    const playerFoundIds = puzzleHistory?.playerFoundItems?.[userId] || [];
    
    if (debug) {
      console.log('[Recovery] 🔍 Hidden object review recovery:', {
        userId,
        reviewIndex,
        puzzleId: puzzle.puzzleId,
        playerFoundIds,
        puzzleNumber: reviewIndex + 1,
        totalPuzzles: ho.questionsPerRound
      });
    }
    
    return {
      remaining: 0, // No timer during review
      puzzleNumber: reviewIndex + 1,
      totalPuzzles: ho.questionsPerRound,
      puzzle: {
        puzzleId: puzzle.puzzleId,
        imageUrl: puzzle.imageUrl,
        difficulty: puzzle.difficulty,
        category: puzzle.category,
        totalSeconds: puzzle.totalSeconds || ho.timeLimitSeconds,
        itemTarget: puzzle.itemTarget,
        items: (puzzle.items || []).map((it) => ({
          id: String(it.id),
          label: it.label,
          bbox: it.bbox,
        })),
      },
      foundIds: playerFoundIds,
      finished: true, // Always finished during review
    };
  } else {
    // During 'asking' phase - use current puzzle
    const remaining = Math.max(0, Math.floor(((room.puzzleEndTime || 0) - Date.now()) / 1000));

    return {
      remaining,
      puzzleNumber: room.currentQuestionIndex + 1,
      totalPuzzles: ho.questionsPerRound,
      puzzle: {
        puzzleId: ho.currentPuzzle?.puzzleId || ho.puzzleId,
        imageUrl: ho.currentPuzzle?.imageUrl || ho.imageUrl,
        difficulty: ho.difficulty,
        category: ho.category,
        totalSeconds: ho.timeLimitSeconds,
        itemTarget: ho.currentPuzzle?.itemTarget || ho.itemTarget,
        items: (ho.currentPuzzle?.items || ho.items || []).map((it) => ({
          id: String(it.id),
          label: it.label,
          bbox: it.bbox,
        })),
      },
      foundIds: pState?.foundIds ? Array.from(pState.foundIds) : [],
      finished: !!pState?.finishTs,
    };
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

      // Keep session table tidy (same as playerHandlers)
      cleanExpiredSessions(roomId);

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
          // Only boot if it's actually a PLAYER socket for this room
          const isSameRoom = prevSocket.rooms.has(roomId);
          const isPlayerSock = prevSocket.rooms.has(`${roomId}:player`);
          const isHostSock = prevSocket.rooms.has(`${roomId}:host`);
          const isAdminSock = prevSocket.rooms.has(`${roomId}:admin`);

          if (isSameRoom && isPlayerSock && !isHostSock && !isAdminSock) {
            if (debug) console.log('[Recovery] Disconnecting previous PLAYER socket', prevSocketId);
            prevSocket.emit('quiz_error', {
              message: 'You were signed in from another tab. This session is now active.',
            });
            try {
              prevSocket.disconnect(true);
            } catch {}
          } else {
            // Safety: never touch host/admin sockets (or sockets from other rooms)
            if (debug)
              console.warn('[Recovery] Skipping disconnect of non-player socket', {
                prevSocketId,
                rooms: [...prevSocket.rooms],
              });
          }
        }
      }

      // Join rooms
      socket.join(roomId);
      socket.join(`${roomId}:${role}`);

      // we'll broadcast this later; players get a normalized user object
      let joinedUser = null;

      // ✅ Only treat as a player if role === 'player'
      if (isPlayerRole) {
        // Normalize payment fields from the client
       const normalizedPaymentMethod = user.paymentMethod 
  ? normalizePaymentMethod(user.paymentMethod)
  : (existingPlayer?.paymentMethod || 'unknown');

const normalizedExtraPayments = normalizeExtraPayments(user.extraPayments);

const sanitizedUser = {
  ...user,
  paymentMethod: normalizedPaymentMethod,
  paymentReference: user.paymentReference || existingPlayer?.paymentReference, // ✅ Preserve reference
  paymentClaimed: user.paymentClaimed ?? existingPlayer?.paymentClaimed ?? false, // ✅ Preserve claimed status
  clubPaymentMethodId: user.clubPaymentMethodId || existingPlayer?.clubPaymentMethodId, // ✅ Preserve method ID
  extraPayments: normalizedExtraPayments,
  socketId: socket.id,
};

// Decide which name to keep (protect real names from placeholder overwrites)
const incomingName = sanitizedUser.name;
const existingName = existingPlayer?.name;
let nameToUse;

if (!existingPlayer) {
  // brand new player
  nameToUse = !isPlaceholderName(incomingName, user.id)
    ? incomingName
    : `Player ${user.id}`;
} else {
  // existing player: keep existing real name; only upgrade placeholder → real
  if (!isPlaceholderName(incomingName, user.id) && isPlaceholderName(existingName, user.id)) {
    nameToUse = incomingName;
  } else {
    nameToUse = existingName || incomingName;
  }
}

if (!existingPlayer) {
  addOrUpdatePlayer(roomId, { ...sanitizedUser, name: nameToUse });
  joinedUser = { ...sanitizedUser, name: nameToUse };

  updatePlayerSocketId(roomId, user.id, socket.id);
  updatePlayerSession(roomId, user.id, {
    socketId: socket.id,
    status: 'waiting',
    inPlayRoute: false,
    lastActive: Date.now(),
  });
} else {
  // ✅ CRITICAL: Preserve payment data when merging
  const mergedExisting = {
    ...existingPlayer,
    ...sanitizedUser,
    // ✅ Preserve payment fields from existing player if not provided by client
    paymentMethod: sanitizedUser.paymentMethod || existingPlayer.paymentMethod,
    paymentReference: sanitizedUser.paymentReference || existingPlayer.paymentReference,
    paymentClaimed: sanitizedUser.paymentClaimed ?? existingPlayer.paymentClaimed,
    clubPaymentMethodId: sanitizedUser.clubPaymentMethodId || existingPlayer.clubPaymentMethodId,
    paid: sanitizedUser.paid ?? existingPlayer.paid, // ✅ Preserve paid status
    extraPayments: {
      ...(existingPlayer.extraPayments || {}),
      ...(sanitizedUser.extraPayments || {}),
    },
    extras: Array.isArray(sanitizedUser.extras) ? sanitizedUser.extras : existingPlayer.extras || [],
    name: nameToUse,
    socketId: socket.id,
  };

  addOrUpdatePlayer(roomId, mergedExisting);
  joinedUser = mergedExisting;

  // Mirror playerHandlers: remember web3 payout address if provided
  if (user.web3Address && user.web3Chain) {
    if (!room.web3AddressMap) room.web3AddressMap = new Map();
    room.web3AddressMap.set(user.id, {
      address: user.web3Address,
      chain: user.web3Chain,
      txHash: user.web3TxHash || null,
      playerName: user.name || 'Unknown',
    });
    if (!room.config.web3PlayerAddresses) room.config.web3PlayerAddresses = {};
    room.config.web3PlayerAddresses[user.id] = {
      address: user.web3Address,
      chain: user.web3Chain,
      name: user.name,
    };
  }

  updatePlayerSocketId(roomId, user.id, socket.id);
  updatePlayerSession(roomId, user.id, {
    socketId: socket.id,
    status: existingSession?.status || 'waiting',
    inPlayRoute: !!existingSession?.inPlayRoute,
    lastActive: Date.now(),
  });

  if (debug) {
    console.log('[Recovery] ✅ Merged existing player:', {
      playerId: user.id,
      name: nameToUse,
      paid: mergedExisting.paid,
      paymentMethod: mergedExisting.paymentMethod,
      paymentReference: mergedExisting.paymentReference, // ✅ Log this
      paymentClaimed: mergedExisting.paymentClaimed, // ✅ Log this
      clubPaymentMethodId: mergedExisting.clubPaymentMethodId, // ✅ Log this
      extras: mergedExisting.extras,
      extraPayments: mergedExisting.extraPayments,
    });

    const playerData = room.playerData?.[user.id];
    if (playerData) {
      console.log('[Recovery] 🔍 playerData.purchases:', playerData.purchases);
      console.log('[Recovery] 🔍 playerData.paymentMethod:', playerData.paymentMethod);
    }
  }
}
      } else {
        // 🧹 If this id was previously (incorrectly) added as a player, remove it now
        if (existingPlayer) {
          try {
            room.players = room.players.filter((p) => p.id !== user.id);
            if (room.playerData) delete room.playerData[user.id];
          } catch {}
        }
        
        // ✅ Set host/admin socket ID for non-player roles
        if (role === 'host') {
          // ✅ CRITICAL: Cancel cleanup timer when host reconnects
          if (room.cleanupTimer) {
            console.log(`✅ [Recovery] Host reconnected to room ${roomId}, canceling cleanup timer`);
            clearTimeout(room.cleanupTimer);
            delete room.cleanupTimer;
          }
          
          room.hostSocketId = socket.id;
          if (debug) console.log('[Recovery] 👑 Set host socket ID:', socket.id);
        } else if (role === 'admin') {
          // Admin handling if needed
          updateAdminSocketId(roomId, user.id, socket.id);
        }
      }

      // Minimal snapshot scaffolding
      const totalRounds = room.config.roundDefinitions?.length || 1;
      const roundIndex = (room.currentRound ?? 1) - 1;
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

      // ----------------------------
      // Phase-specific hydration
      // ----------------------------

      if (room.currentPhase === 'asking') {
        const roundCfg = room.config.roundDefinitions?.[roundIndex]?.config || {};
        const roundType = room.config.roundDefinitions?.[roundIndex]?.roundType;

        // ✅ hidden_object asking hydration
        if (roundType === 'hidden_object') {
          const hoSnap = buildHiddenObjectSnap(room, user.id, 'asking');
          if (hoSnap) snap.hiddenObject = hoSnap;
        }
        // ✅ order_image asking hydration
        else if (roundType === 'order_image') {
          const q = room.questions?.[room.currentQuestionIndex];
          if (q) {
            const timeLimit = roundCfg?.timePerQuestion || 30;
            const questionStartTime = room.questionStartTime || Date.now();
            const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
            const remainingTime = Math.max(0, timeLimit - elapsed);

            const pdata = room.playerData?.[user.id];
            const key = `${q.id}_round${room.currentRound}`;
            const submittedOrder = pdata?.answers?.[key]?.submitted ?? null;
            const isFrozen = !!(
              pdata?.frozenNextQuestion && pdata?.frozenForQuestionIndex === room.currentQuestionIndex
            );

            // Get the shuffled version that was originally emitted
            const emittedQuestion = room.emittedOptionsByQuestionId?.[q.id];
            
            snap.orderImageQuestion = {
              id: q.id,
              prompt: q.prompt,
              images: emittedQuestion?.images || q.images, // Use shuffled version if available
              difficulty: q.difficulty,
              category: q.category,
              timeLimit,
              questionStartTime,
              questionNumber: room.currentQuestionIndex + 1,
              totalQuestions: room.questions.length,
              currentQuestionIndex: room.currentQuestionIndex
            };

            snap.playerRecovery = {
              hasAnswered: submittedOrder !== null && submittedOrder !== undefined,
              submittedOrder,
              isFrozen,
              frozenBy: pdata?.frozenBy || null,
              usedExtras: pdata?.usedExtras || {},
              usedExtrasThisRound: pdata?.usedExtrasThisRound || {},
              remainingTime,
              currentQuestionIndex: room.currentQuestionIndex,
            };
          }
        }
        // ✅ speed round asking hydration
        else if (roundType === 'speed_round') {
          const remaining = Math.max(0, Math.floor(((room.roundEndTime || 0) - Date.now()) / 1000));
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
        }
        // ✅ normal per-question rounds
        else {
          const q = room.questions?.[room.currentQuestionIndex];
          if (q) {
            const timeLimit = roundCfg?.timePerQuestion || 10;
            const questionStartTime = room.questionStartTime || Date.now();
            const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
            const remainingTime = Math.max(0, timeLimit - elapsed);

            const pdata = room.playerData?.[user.id];
            const key = `${q.id}_round${room.currentRound}`;
            const submittedAnswer = pdata?.answers?.[key]?.submitted ?? null;
            const isFrozen = !!(
              pdata?.frozenNextQuestion && pdata?.frozenForQuestionIndex === room.currentQuestionIndex
            );

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
        const roundType = room.config.roundDefinitions?.[roundIndex]?.roundType;

        // ✅ FIXED: hidden_object review hydration - pass phase parameter
        if (roundType === 'hidden_object') {
          const hoSnap = buildHiddenObjectSnap(room, user.id, 'reviewing');
          if (hoSnap) {
            snap.hiddenObject = hoSnap;
            
            if (debug) {
              console.log('[Recovery] ✅ Hidden object review snap:', {
                userId: user.id,
                phase: room.currentPhase,
                reviewIndex: room.currentReviewIndex,
                puzzleNumber: hoSnap.puzzleNumber,
                foundIds: hoSnap.foundIds.length
              });
            }
          }
        } else if (roundType === 'order_image') {
          // ✅ order_image review hydration
          const enginePromise = getEngine(room);
          if (enginePromise) {
            try {
              const engine = await enginePromise;
              if (engine?.getCurrentReviewQuestion) {
                const rq = engine.getCurrentReviewQuestion(roomId);
                if (rq) {
                  const pdata = room.playerData?.[user.id];
                  const key = `${rq.id}_round${room.currentRound}`;
                  const playerAnswer = pdata?.answers?.[key];

                  snap.review = {
                    id: rq.id,
                    prompt: rq.prompt,
                    images: rq.images, // Full array with order property
                    difficulty: rq.difficulty,
                    category: rq.category,
                    playerOrder: playerAnswer?.submitted || null,
                    questionNumber: (room.lastEmittedReviewIndex ?? -1) + 1,
                    totalQuestions: room.questions?.length || 0,
                  };
                  
                  if (debug) {
                    console.log('[Recovery] ✅ order_image review hydrated:', {
                      questionId: rq.id,
                      prompt: rq.prompt?.substring(0, 50),
                      hasImages: !!rq.images,
                      playerOrder: playerAnswer?.submitted
                    });
                  }
                }
              }
            } catch (e) {
              if (debug) console.error('[recovery] order_image review engine load failed:', e);
            }
          }
        } else {
          // existing standard trivia engine-based reviewing hydration
          const enginePromise = getEngine(room);
          if (enginePromise) {
            try {
              const engine = await enginePromise;
              if (engine?.getCurrentReviewQuestion) {
                const rq = engine.getCurrentReviewQuestion(roomId);
                if (rq) {
                  const pdata = room.playerData?.[user.id];
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
                    totalQuestions:
                      Array.isArray(room.reviewQuestions) && room.reviewQuestions.length > 0
                        ? room.reviewQuestions.length
                        : room.questions?.length || 0,
                  };
                }
              }
            } catch (e) {
              if (debug) console.error('[recovery] review engine load failed:', e);
            }
          }
        }
      } else if (room.currentPhase === 'tiebreaker') {
        const tb = room.tiebreaker || {};
        const base = {
          participants: tb.participants || [],
          mode: tb.mode,
          questionNumber: tb.questionIndex || 0,
          stage: tb.stage || 'start',
        };

        if (tb.stage === 'question' && room.currentTiebreakQuestion) {
          const q = room.currentTiebreakQuestion;

          const record = Array.isArray(tb.history)
            ? tb.history.find((h) => String(h.qid) === String(q.id))
            : null;

          const submittedRaw = record?.answers?.[user.id];
          const submittedAnswer =
            typeof submittedRaw === 'number' && Number.isFinite(submittedRaw) ? submittedRaw : null;

          snap.tb = {
            ...base,
            question: {
              id: q.id,
              text: q.text,
              timeLimit: 20,
              questionStartTime: q.questionStartTime,
              submittedAnswer,
            },
          };
        } else if (tb.stage === 'review' && tb.lastReview) {
          snap.tb = {
            ...base,
            review: {
              correctAnswer: tb.lastReview.correctAnswer,
              playerAnswers: tb.lastReview.playerAnswers || {},
              winnerIds: tb.lastReview.winnerIds,
              stillTiedIds: tb.lastReview.stillTiedIds,
              questionText: tb.lastReview.questionText,
              isFinalAnswer: !!tb.lastReview.isFinalAnswer,
            },
          };
        } else if (tb.stage === 'result' && Array.isArray(tb.winnerIds)) {
          snap.tb = { ...base, result: { winnerIds: tb.winnerIds } };
        } else {
          snap.tb = base;
        }
      } else if (room.currentPhase === 'leaderboard' || room.currentPhase === 'complete' || room.currentPhase === 'distributing_prizes') {
        // ✅ helpful: keep hidden_object review payload accessible in leaderboard/complete too
        const roundType = room.config.roundDefinitions?.[roundIndex]?.roundType;
        if (roundType === 'hidden_object') {
          const hoSnap = buildHiddenObjectSnap(room, user.id, room.currentPhase);
          if (hoSnap) snap.hiddenObject = hoSnap;
        }

        if (Array.isArray(room.finalLeaderboard) && room.finalLeaderboard.length) {
          snap.leaderboard = room.finalLeaderboard;
        } else if (room.currentRoundResults && !room.currentOverallLeaderboard) {
          snap.roundLeaderboard = room.currentRoundResults;
          
          // ✅ Send current round stats along with round leaderboard
          if (room.currentRoundStats) {
            snap.currentRoundStats = room.currentRoundStats;
            if (debug) {
              console.log('[recovery] ✅ Including current round stats:', {
                roundNumber: room.currentRoundStats.roundNumber,
                phase: room.currentPhase
              });
            }
          } else if (room.storedRoundStats && room.storedRoundStats[room.currentRound]) {
            // Fallback: try to get from stored stats
            snap.currentRoundStats = room.storedRoundStats[room.currentRound];
            if (debug) {
              console.log('[recovery] ✅ Including stored round stats:', {
                roundNumber: room.currentRound,
                phase: room.currentPhase
              });
            }
          }
        } else if (room.currentOverallLeaderboard) {
          snap.leaderboard = room.currentOverallLeaderboard;
        }

        // ✅ Send final quiz stats for post-game recovery
        if (Array.isArray(room.finalQuizStats) && room.finalQuizStats.length > 0) {
          snap.finalQuizStats = room.finalQuizStats;
          if (debug) {
            console.log('[recovery] ✅ Including final quiz stats:', {
              phase: room.currentPhase,
              statsCount: room.finalQuizStats.length,
              role: role
            });
          }
        }
      }

      // Broadcast normal events so rest of app stays in sync
      emitRoomState(namespace, roomId);
      emitFullRoomState(socket, namespace, roomId);

      // ✅✅✅ NEW: Re-broadcast current question to all players when host recovers during 'asking'
      if (role === 'host' && room.currentPhase === 'asking') {
        const roundCfg = room.config.roundDefinitions?.[roundIndex]?.config || {};
        const roundType = room.config.roundDefinitions?.[roundIndex]?.roundType;

        if (roundType === 'hidden_object' && room.hiddenObject?.currentPuzzle) {
          const remaining = Math.max(0, Math.floor(((room.puzzleEndTime || 0) - Date.now()) / 1000));
          
          namespace.to(`${roomId}:player`).emit('hidden_object_start', {
            puzzleId: room.hiddenObject.currentPuzzle.puzzleId,
            imageUrl: room.hiddenObject.currentPuzzle.imageUrl,
            difficulty: room.hiddenObject.difficulty,
            category: room.hiddenObject.category,
            totalSeconds: room.hiddenObject.timeLimitSeconds,
            itemTarget: room.hiddenObject.currentPuzzle.itemTarget,
            items: room.hiddenObject.currentPuzzle.items,
            puzzleNumber: room.currentQuestionIndex + 1,
            totalPuzzles: room.hiddenObject.questionsPerRound,
          });
          
          if (debug) console.log(`[Recovery] ♻️ Re-broadcast hidden_object_start to players (${remaining}s remaining)`);
          
        } else if (roundType === 'order_image') {
          const q = room.questions?.[room.currentQuestionIndex];
          if (q) {
            const emittedQuestion = room.emittedOptionsByQuestionId?.[q.id];
            const timeLimit = roundCfg?.timePerQuestion || 30;
            
            namespace.to(`${roomId}:player`).emit('order_image_question', {
              id: q.id,
              prompt: q.prompt,
              images: emittedQuestion?.images || q.images,
              difficulty: q.difficulty,
              category: q.category,
              timeLimit,
              questionStartTime: room.questionStartTime,
              questionNumber: room.currentQuestionIndex + 1,
              totalQuestions: room.questions.length,
            });
            
            if (debug) console.log(`[Recovery] ♻️ Re-broadcast order_image_question to players`);
          }
          
        } else if (roundType === 'speed_round') {
          // Speed round: each player gets their own question, so we emit to each individually
          for (const player of room.players) {
            const cursor = room.playerCursors?.[player.id] ?? 0;
            const q = room.questions?.[cursor];
            if (q && player.socketId) {
              const playerSocket = namespace.sockets.get(player.socketId);
              if (playerSocket) {
                playerSocket.emit('question', {
                  id: String(q.id),
                  text: q.text,
                  options: Array.isArray(q.options) ? q.options.slice(0, 2) : [],
                  timeLimit: 0,
                  questionStartTime: Date.now(),
                });
              }
            }
          }
          
          if (debug) console.log(`[Recovery] ♻️ Re-broadcast speed_round questions to individual players`);
          
        } else {
          // Standard trivia question
          const q = room.questions?.[room.currentQuestionIndex];
          if (q) {
            const timeLimit = roundCfg?.timePerQuestion || 10;
            
            namespace.to(`${roomId}:player`).emit('question', {
              id: q.id,
              text: q.text,
              options: q.options || [],
              timeLimit,
              questionStartTime: room.questionStartTime,
              questionNumber: room.currentQuestionIndex + 1,
              totalQuestions: room.questions.length,
            });
            
            if (debug) console.log(`[Recovery] ♻️ Re-broadcast question to players`);
          }
        }
      }

      // Keep user_joined event (clients can ignore non-players if they want)
      const broadcastUser = joinedUser || { ...user, socketId: socket.id };

      if (role === 'player') {
        namespace.to(roomId).emit('user_joined', { user: broadcastUser, role: 'player' });
      } else if (role === 'host') {
        namespace
          .to(roomId)
          .emit('host_joined', { user: { id: user.id, name: room.config?.hostName || user.name }, role: 'host' });
      } else if (role === 'admin') {
        namespace.to(roomId).emit('admin_joined', { user: { id: user.id, name: user.name }, role: 'admin' });
      }

      // Also push current players list to everyone (optional but handy)
      namespace.to(roomId).emit('player_list_updated', { players: playersLite });

      return sendAck({ ok: true, snap });
    } catch (err) {
      console.error('[join_and_recover] error:', err);
      return sendAck({ ok: false, error: 'Internal error' });
    }
  });
}



