// server/quiz/handlers/recoveryHandlers.js
const debug = false;

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
import { normalizePaymentMethod } from '../../utils/paymentMethods.js';
import { markRoomAsOpen } from './roomStatusManager.js';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// buildHiddenObjectSnap
// Used during the 'asking' and 'reviewing' phases for hidden_object rounds.
// ---------------------------------------------------------------------------
function buildHiddenObjectSnap(room, userId, phase) {
  const ho = room.hiddenObject;
  if (!ho) return null;

  const pState = ho.player?.[userId]; // may be undefined for host/admin

  if (phase === 'reviewing') {
    // Use lastEmittedReviewIndex to get the puzzle currently on-screen.
    // NOTE: currentReviewIndex has already advanced past the current puzzle,
    // so we must use lastEmittedReviewIndex here.
    const reviewIndex = room.lastEmittedReviewIndex ?? 0;
    const puzzle = room.reviewQuestions?.[reviewIndex];
    const puzzleHistory = ho.puzzleHistory?.[reviewIndex];

    if (!puzzle) {
      console.warn('[Recovery] No review puzzle found at lastEmittedReviewIndex', reviewIndex);
      return null;
    }

    const playerFoundIds = puzzleHistory?.playerFoundItems?.[userId] || [];

    if (debug) {
      console.log('[Recovery] 🔍 Hidden object review recovery:', {
        userId,
        reviewIndex,
        puzzleId: puzzle.puzzleId,
        playerFoundIds,
        puzzleNumber: reviewIndex + 1,
        totalPuzzles: ho.questionsPerRound,
      });
    }

    return {
      remaining: 0,
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
      finished: true,
    };
  } else {
    // 'asking' phase
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

// ---------------------------------------------------------------------------
// buildReviewSnap
//
// Builds snap.review for standard trivia / wipeout / speed_round / order_image
// during the 'reviewing' phase.
//
// KEY CONTRACT:
//   - We always use room.lastEmittedReviewIndex (the question currently on
//     screen) NOT room.currentReviewIndex (which has already been advanced
//     to point at the NEXT question).
//   - We include a `reviewComplete` boolean so the host UI knows whether all
//     questions have already been reviewed and can skip straight to showing
//     the "Show Results" button rather than re-emitting a question.
// ---------------------------------------------------------------------------
async function buildReviewSnap(room, userId, roundType, roundIndex) {
  const qList =
    Array.isArray(room.reviewQuestions) && room.reviewQuestions.length > 0
      ? room.reviewQuestions
      : room.questions;

  if (!qList || !Array.isArray(qList) || qList.length === 0) return null;

  const totalQuestions = qList.length;

  // Has the host already clicked through every question?
  const reviewComplete = (room.currentReviewIndex ?? 0) >= totalQuestions;

  // The index of the question that is currently on screen.
  // lastEmittedReviewIndex is set immediately AFTER a question is emitted,
  // so it equals the index of the question everyone can see right now.
  const lastIdx = room.lastEmittedReviewIndex ?? -1;

  // Guard: if no question has been emitted yet (shouldn't normally happen but
  // can occur if the host reconnects between phases) use index 0.
  const activeIdx = lastIdx >= 0 && lastIdx < totalQuestions ? lastIdx : 0;

  const question = qList[activeIdx];
  if (!question) return null;

  const pdata = room.playerData?.[userId];
  const key = `${question.id}_round${room.currentRound}`;
  const playerAnswer = pdata?.answers?.[key];

  if (roundType === 'order_image') {
    // order_image stores shuffled images on the room via emittedOptionsByQuestionId
    const emittedQuestion = room.emittedOptionsByQuestionId?.[question.id];

    return {
      reviewComplete,
      activeReviewIndex: activeIdx,
      totalQuestions,
      id: question.id,
      prompt: question.prompt,
      images: emittedQuestion?.images || question.images,
      difficulty: question.difficulty,
      category: question.category,
      playerOrder: playerAnswer?.submitted || null,
      questionNumber: activeIdx + 1,
    };
  }

  // Standard trivia / wipeout / speed_round
  return {
    reviewComplete,
    activeReviewIndex: activeIdx,
    totalQuestions,
    id: question.id,
    text: question.text,
    options: question.options || [],
    correctAnswer: question.correctAnswer,
    submittedAnswer: playerAnswer?.submitted || null,
    difficulty: question.difficulty,
    category: question.category,
    questionNumber: activeIdx + 1,
  };
}

// ---------------------------------------------------------------------------
// setupRecoveryHandlers
// ---------------------------------------------------------------------------
export function setupRecoveryHandlers(socket, namespace) {
  /**
   * One-shot: join + return a full snapshot in the ack.
   * Client emits: socket.emit('join_and_recover', payload, (res) => { ... })
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

      cleanExpiredSessions(roomId);

      const isPlayerRole = role === 'player';

      // ── Capacity check (Web2 players only) ─────────────────────────────────
      const existingPlayer = room.players.find((p) => p.id === user.id);

      if (isPlayerRole && !existingPlayer) {
        const isWeb3 =
          room.config?.paymentMethod === 'web3' || room.config?.isWeb3Room === true;
        if (!isWeb3) {
          const limit =
            room.roomCaps?.maxPlayers ?? room.config?.roomCaps?.maxPlayers ?? 20;
          if (room.players.length >= limit) {
            return sendAck({ ok: false, error: `Room is full (limit ${limit}).` });
          }
        }
      }

      // ── Disconnect any stale socket for this player ─────────────────────────
      const existingSession = getPlayerSession(roomId, user.id);
      const prevSocketId = existingSession?.socketId || existingPlayer?.socketId;

      if (prevSocketId && prevSocketId !== socket.id) {
        const prevSocket = namespace.sockets.get(prevSocketId);
        if (prevSocket && prevSocket.connected) {
          const isSameRoom = prevSocket.rooms.has(roomId);
          const isPlayerSock = prevSocket.rooms.has(`${roomId}:player`);
          const isHostSock = prevSocket.rooms.has(`${roomId}:host`);
          const isAdminSock = prevSocket.rooms.has(`${roomId}:admin`);

          if (isSameRoom && isPlayerSock && !isHostSock && !isAdminSock) {
            if (debug)
              console.log('[Recovery] Disconnecting previous PLAYER socket', prevSocketId);
            prevSocket.emit('quiz_error', {
              message: 'You were signed in from another tab. This session is now active.',
            });
            try {
              prevSocket.disconnect(true);
            } catch {}
          } else {
            if (debug)
              console.warn('[Recovery] Skipping disconnect of non-player socket', {
                prevSocketId,
                rooms: [...prevSocket.rooms],
              });
          }
        }
      }

      // ── Join socket rooms ───────────────────────────────────────────────────
      socket.join(roomId);
      socket.join(`${roomId}:${role}`);

      let joinedUser = null;

      // ── Player registration / merge ─────────────────────────────────────────
      if (isPlayerRole) {
        const normalizedPaymentMethod = user.paymentMethod
          ? normalizePaymentMethod(user.paymentMethod)
          : existingPlayer?.paymentMethod || 'unknown';

        const normalizedExtraPayments = normalizeExtraPayments(user.extraPayments);

        const sanitizedUser = {
          ...user,
          paymentMethod: normalizedPaymentMethod,
          paymentReference: user.paymentReference || existingPlayer?.paymentReference,
          paymentClaimed: user.paymentClaimed ?? existingPlayer?.paymentClaimed ?? false,
          clubPaymentMethodId:
            user.clubPaymentMethodId || existingPlayer?.clubPaymentMethodId,
          extraPayments: normalizedExtraPayments,
          socketId: socket.id,
        };

        const incomingName = sanitizedUser.name;
        const existingName = existingPlayer?.name;
        let nameToUse;

        if (!existingPlayer) {
          nameToUse = !isPlaceholderName(incomingName, user.id)
            ? incomingName
            : `Player ${user.id}`;
        } else {
          if (
            !isPlaceholderName(incomingName, user.id) &&
            isPlaceholderName(existingName, user.id)
          ) {
            nameToUse = incomingName;
          } else {
            nameToUse = existingName || incomingName;
          }
        }

        if (!existingPlayer) {
          if (isPlaceholderName(user.name, user.id) && !user.paymentClaimed && !user.paid) {
            if (debug)
              console.warn('[Recovery] Skipping ghost player creation for', user.id);
            return sendAck({
              ok: false,
              error: 'Player not found. Please join the room first.',
            });
          }
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
          const mergedExisting = {
            ...existingPlayer,
            ...sanitizedUser,
            paymentMethod: sanitizedUser.paymentMethod || existingPlayer.paymentMethod,
            paymentReference: sanitizedUser.paymentReference || existingPlayer.paymentReference,
            paymentClaimed: sanitizedUser.paymentClaimed ?? existingPlayer.paymentClaimed,
            clubPaymentMethodId:
              sanitizedUser.clubPaymentMethodId || existingPlayer.clubPaymentMethodId,
            paid: sanitizedUser.paid ?? existingPlayer.paid,
            extraPayments: {
              ...(existingPlayer.extraPayments || {}),
              ...(sanitizedUser.extraPayments || {}),
            },
            extras: Array.isArray(sanitizedUser.extras)
              ? sanitizedUser.extras
              : existingPlayer.extras || [],
            name: nameToUse,
            socketId: socket.id,
          };

          addOrUpdatePlayer(roomId, mergedExisting);
          joinedUser = mergedExisting;

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
            });
          }
        }
      } else {
        // ── Non-player (host / admin) registration ──────────────────────────
        if (existingPlayer) {
          try {
            room.players = room.players.filter((p) => p.id !== user.id);
            if (room.playerData) delete room.playerData[user.id];
          } catch {}
        }

        if (role === 'host') {
          // Cancel any pending cleanup timer
          if (room.cleanupTimer) {
            console.log(
              `✅ [Recovery] Host reconnected to room ${roomId}, canceling cleanup timer`
            );
            clearTimeout(room.cleanupTimer);
            delete room.cleanupTimer;
          }

          room.hostSocketId = socket.id;
          if (debug) console.log('[Recovery] 👑 Set host socket ID:', socket.id);

          const isWeb2 =
            room.config?.paymentMethod !== 'web3' && !room.config?.isWeb3Room;
          if (isWeb2) {
            try {
              const wasUpdated = await markRoomAsOpen(roomId);
              if (wasUpdated) {
                room.status = 'open';
                console.log(`[Recovery] 🟡 Room ${roomId} marked as open`);
              }
            } catch (e) {
              console.error('[Recovery] ❌ Failed to mark room as open:', e);
            }
          }
        } else if (role === 'admin') {
          updateAdminSocketId(roomId, user.id, socket.id);
        }
      }

      // ── Build snapshot scaffolding ──────────────────────────────────────────
      const totalRounds = room.config.roundDefinitions?.length || 1;
      const roundIndex = (room.currentRound ?? 1) - 1;
      const roundTypeId = room.config.roundDefinitions?.[roundIndex]?.roundType || '';

      const roomState = {
        currentRound: room.currentRound,
        totalRounds,
        roundTypeId,
        roundTypeName: roundTypeId,
        totalPlayers: room.players.length,
        phase: room.currentPhase,
        caps: room.roomCaps,
      };

      const playersLite = room.players.map((p) => ({ id: p.id, name: p.name }));

      const snap = {
        roomState,
        players: playersLite,
        config: {
          roomId: room.config.roomId || roomId,
          hostId: room.config.hostId,
          hostName: room.config.hostName,
          currencySymbol: room.config.currencySymbol || '€',
          fundraisingOptions: room.config.fundraisingOptions || {},
          fundraisingPrices: room.config.fundraisingPrices || {},
          roundDefinitions: room.config.roundDefinitions || [],
          roomCaps: room.roomCaps || room.config.roomCaps || { maxPlayers: 20 },
          prizes: Array.isArray(room.config.prizes) ? room.config.prizes : [],
          reconciliation: room.config.reconciliation || {
            ledger: [],
            prizeAwards: [],
            approvedAt: null,
            approvedBy: null,
          },
          endedAt: room.config.endedAt ?? room.endedAt ?? null,
          finalLeaderboard: room.config.finalLeaderboard ?? null,
          paymentMethod: room.config.paymentMethod,
          isWeb3Room: room.config.isWeb3Room === true,
          entryFee: room.config.entryFee,
        },
      };

      // ══════════════════════════════════════════════════════════════════════
      // Phase-specific hydration
      // ══════════════════════════════════════════════════════════════════════

      const roundCfg = room.config.roundDefinitions?.[roundIndex]?.config || {};
      const roundType = room.config.roundDefinitions?.[roundIndex]?.roundType;

      // ── ASKING ─────────────────────────────────────────────────────────────
      if (room.currentPhase === 'asking') {

        if (roundType === 'hidden_object') {
          const hoSnap = buildHiddenObjectSnap(room, user.id, 'asking');
          if (hoSnap) snap.hiddenObject = hoSnap;

        } else if (roundType === 'order_image') {
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
              pdata?.frozenNextQuestion &&
              pdata?.frozenForQuestionIndex === room.currentQuestionIndex
            );

            const emittedQuestion = room.emittedOptionsByQuestionId?.[q.id];

            snap.orderImageQuestion = {
              id: q.id,
              prompt: q.prompt,
              images: emittedQuestion?.images || q.images,
              difficulty: q.difficulty,
              category: q.category,
              timeLimit,
              questionStartTime,
              questionNumber: room.currentQuestionIndex + 1,
              totalQuestions: room.questions.length,
              currentQuestionIndex: room.currentQuestionIndex,
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

        } else if (roundType === 'speed_round') {
          const remaining = Math.max(
            0,
            Math.floor(((room.roundEndTime || 0) - Date.now()) / 1000)
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
          // Standard trivia / wipeout
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
              pdata?.frozenNextQuestion &&
              pdata?.frozenForQuestionIndex === room.currentQuestionIndex
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

      // ── REVIEWING ──────────────────────────────────────────────────────────
      } else if (room.currentPhase === 'reviewing') {

        if (roundType === 'hidden_object') {
          // hidden_object has its own review structure
          const hoSnap = buildHiddenObjectSnap(room, user.id, 'reviewing');
          if (hoSnap) snap.hiddenObject = hoSnap;

          // Tell client whether all puzzles have been reviewed
          const totalPuzzles =
            Array.isArray(room.reviewQuestions) ? room.reviewQuestions.length : 0;
          snap.reviewComplete =
            (room.currentReviewIndex ?? 0) >= totalPuzzles;

        } else {
          // All other round types share the unified review snap builder.
          // buildReviewSnap uses lastEmittedReviewIndex (the question on-screen)
          // and sets reviewComplete if all questions have been stepped through.
          try {
            const reviewSnap = await buildReviewSnap(room, user.id, roundType, roundIndex);
            if (reviewSnap) {
              snap.review = reviewSnap;
            }
          } catch (e) {
            if (debug)
              console.error('[Recovery] review snap build failed:', e);
          }
        }

        if (debug) {
          console.log('[Recovery] 📝 Review phase snap:', {
            roundType,
            reviewComplete: snap.review?.reviewComplete ?? snap.reviewComplete,
            activeReviewIndex: snap.review?.activeReviewIndex,
            questionNumber: snap.review?.questionNumber,
            hasHiddenObject: !!snap.hiddenObject,
          });
        }

      // ── TIEBREAKER ─────────────────────────────────────────────────────────
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
            typeof submittedRaw === 'number' && Number.isFinite(submittedRaw)
              ? submittedRaw
              : null;

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

      // ── LEADERBOARD / COMPLETE / DISTRIBUTING_PRIZES ───────────────────────
      } else if (
        room.currentPhase === 'leaderboard' ||
        room.currentPhase === 'complete' ||
        room.currentPhase === 'distributing_prizes'
      ) {
        // Keep hidden_object review payload accessible in post-round phases
        if (roundType === 'hidden_object') {
          const hoSnap = buildHiddenObjectSnap(room, user.id, room.currentPhase);
          if (hoSnap) snap.hiddenObject = hoSnap;
        }

        if (role === 'host' || role === 'admin') {
          const recon = room.config?.reconciliation;
          if (recon) {
            snap.reconciliation = {
              ledger: recon.ledger || [],
              prizeAwards: recon.prizeAwards || [],
              approvedAt: recon.approvedAt,
              approvedBy: recon.approvedBy,
              notes: recon.notes,
            };

            if (debug) {
              console.log('[Recovery] 💰 Including reconciliation for', role, ':', {
                ledgerEntries: snap.reconciliation.ledger.length,
                prizeAwards: snap.reconciliation.prizeAwards.length,
                approved: !!snap.reconciliation.approvedAt,
              });
            }
          }
        }

        if (Array.isArray(room.finalLeaderboard) && room.finalLeaderboard.length) {
          snap.leaderboard = room.finalLeaderboard;
        } else if (room.currentRoundResults && !room.currentOverallLeaderboard) {
          snap.roundLeaderboard = room.currentRoundResults;

          if (room.currentRoundStats) {
            snap.currentRoundStats = room.currentRoundStats;
          } else if (room.storedRoundStats && room.storedRoundStats[room.currentRound]) {
            snap.currentRoundStats = room.storedRoundStats[room.currentRound];
          }
        } else if (room.currentOverallLeaderboard) {
          snap.leaderboard = room.currentOverallLeaderboard;
        }

        if (Array.isArray(room.finalQuizStats) && room.finalQuizStats.length > 0) {
          snap.finalQuizStats = room.finalQuizStats;
        }
      }

      // ── Broadcast side-effects ──────────────────────────────────────────────
      emitRoomState(namespace, roomId);
      emitFullRoomState(socket, namespace, roomId);

      // Re-broadcast current question to all players when host recovers during 'asking'
      if (role === 'host' && room.currentPhase === 'asking') {
        if (roundType === 'hidden_object' && room.hiddenObject?.currentPuzzle) {
          const remaining = Math.max(
            0,
            Math.floor(((room.puzzleEndTime || 0) - Date.now()) / 1000)
          );

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

          if (debug)
            console.log(
              `[Recovery] ♻️ Re-broadcast hidden_object_start to players (${remaining}s remaining)`
            );
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

            if (debug)
              console.log(`[Recovery] ♻️ Re-broadcast order_image_question to players`);
          }
        } else if (roundType === 'speed_round') {
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

          if (debug)
            console.log(
              `[Recovery] ♻️ Re-broadcast speed_round questions to individual players`
            );
        } else {
          // Standard trivia / wipeout
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

            if (debug)
              console.log(`[Recovery] ♻️ Re-broadcast question to players`);
          }
        }
      }

      // ── User-joined broadcast ───────────────────────────────────────────────
      const broadcastUser = joinedUser || { ...user, socketId: socket.id };

      if (role === 'player') {
        namespace
          .to(roomId)
          .emit('user_joined', { user: broadcastUser, role: 'player' });
      } else if (role === 'host') {
        namespace.to(roomId).emit('host_joined', {
          user: { id: user.id, name: room.config?.hostName || user.name },
          role: 'host',
        });
      } else if (role === 'admin') {
        namespace
          .to(roomId)
          .emit('admin_joined', { user: { id: user.id, name: user.name }, role: 'admin' });
      }

      namespace.to(roomId).emit('player_list_updated', { players: playersLite });

      return sendAck({ ok: true, snap });
    } catch (err) {
      console.error('[join_and_recover] error:', err);
      return sendAck({ ok: false, error: 'Internal error' });
    }
  });
}



