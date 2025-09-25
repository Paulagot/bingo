// server/quiz/gameplayEngines/services/TiebreakerService.js
const debug = true;

// Local import of LeaderboardService for recomputing overall standings
// (path is relative to this file)
import { LeaderboardService } from './LeaderboardService.js'; 

export const TiebreakerService = {
  /**
   * Start the tiebreaker phase.
   * IMPORTANT: we require roomId because your room object doesn't store an id.
   */
  start(room, namespace, roomId) {
    if (!room?.tiebreaker?.participants?.length) return;

    room.tiebreaker.isActive = true;
    room.currentPhase = 'tiebreaker';
    
    // Initialize question counter
    room.tiebreaker.questionIndex = 0;

    namespace.to(roomId).emit('tiebreak:start', {
      participants: room.tiebreaker.participants,
      mode: room.tiebreaker.mode
    });

    this.sendNextQuestion(room, namespace, roomId);
  },

  // Pull a numeric question from the separate closest-number bank
  nextNumericQuestion(room) {
    // Keep these neutral and auditable (lives in server/data/questions/closest.json)
    return room.questionBankTiebreak?.shift?.() || null;
  },

  sendNextQuestion(room, namespace, roomId) {
    try {
      if (!Array.isArray(room.questionBankTiebreak)) {
        if (debug) console.warn('[TB] questionBankTiebreak missing; attempting reload…');
        // Lazy reload as a fallback
        import('../../quizRoomManager.js').then(mgr => {
          if (typeof mgr.loadClosestNumberBank === 'function') {
            room.questionBankTiebreak = mgr.loadClosestNumberBank();
          } else {
            // duplicate in case not exported — fallback to local minimal
            room.questionBankTiebreak = [];
          }
          this._emitOrAbort(room, namespace, roomId);
        }).catch(err => {
          console.error('[TB] reload failed:', err?.message);
          namespace.to(`${roomId}:host`).emit('quiz_error', { message: 'No tie-breaker questions available (bank missing).' });
        });
        return;
      }
      this._emitOrAbort(room, namespace, roomId);
    } catch (e) {
      console.error('[TB] sendNextQuestion crashed:', e);
      namespace.to(`${roomId}:host`).emit('quiz_error', { message: 'Tie-breaker failed to send question.' });
    }
  },

  _emitOrAbort(room, namespace, roomId) {
    const q = room.questionBankTiebreak.shift?.();
    if (debug) console.log('[TB] next question:', q);

    if (!q) {
      namespace.to(`${roomId}:host`).emit('quiz_error', { message: 'Out of tie-breaker questions in closest.json' });
      return;
    }

    if (!q.text || !Number.isFinite(q.answerNumber)) {
      if (debug) console.warn('[TB] invalid TB question; skipping');
      return this.sendNextQuestion(room, namespace, roomId); // skip bad, try next
    }

    // ✅ stash current question
    room.currentTiebreakQuestion = q;
    room.tiebreaker.questionIndex = (room.tiebreaker.questionIndex ?? 0) + 1;

    // ✅ ensure history exists and create a record for THIS question immediately
    const tb = room.tiebreaker;
    tb.history = Array.isArray(tb.history) ? tb.history : [];
    tb.history.push({ qid: q.id, answers: {} });

    // broadcast question with timing info
    const questionStartTime = Date.now();
    room.currentTiebreakQuestion.questionStartTime = questionStartTime;

    namespace.to(roomId).emit('tiebreak:question', {
      id: q.id, 
      text: q.text, 
      type: 'numeric', 
      timeLimit: 20,
      questionStartTime
    });

    // score after buffer; guard against crashes
    setTimeout(() => {
      try {
        this.scoreNumeric(room, namespace, roomId);
      } catch (err) {
        console.error('[TB] scoreNumeric crashed:', err);
        namespace.to(`${roomId}:host`).emit('quiz_error', { message: 'Tie-breaker scoring failed.' });
      }
    }, 21000);
  },

  receiveAnswer(room, playerId, answer) {
    const tb = room.tiebreaker;
    if (!tb?.isActive) return;
    if (!tb.participants?.includes(playerId)) return;

    const q = room.currentTiebreakQuestion;
    if (!q) return;

    tb.history = Array.isArray(tb.history) ? tb.history : [];
    let record = tb.history.find(h => h.qid === q.id);
    if (!record) {
      record = { qid: q.id, answers: {} };
      tb.history.push(record);
      if (debug) console.warn('[TB] receiveAnswer: history record missing; created');
    }

    record.answers[playerId] = Number(answer);
    if (debug) console.log(`[TB] Player ${playerId} answered: ${answer}`);
  },

  scoreNumeric(room, namespace, roomId) {
    const q = room.currentTiebreakQuestion;
    const tb = room.tiebreaker;
    if (!q || !tb?.isActive) return;

    tb.history = Array.isArray(tb.history) ? tb.history : [];
    let record = tb.history.find(h => h.qid === q.id);
    if (!record) {
      record = { qid: q.id, answers: {} };
      tb.history.push(record);
      if (debug) console.warn('[TB] scoreNumeric: history record missing; created');
    }

    record.correct = q.answerNumber;

    const participants = tb.participants || [];
    const subset = participants.map(pid => ({
      pid,
      ans: record.answers?.[pid]
    }));

    const ranked = subset
      .map(x => ({
        pid: x.pid,
        dist: (typeof x.ans === 'number' && !Number.isNaN(x.ans))
          ? Math.abs(x.ans - q.answerNumber)
          : Number.POSITIVE_INFINITY
      }))
      .sort((a, b) => a.dist - b.dist);

    const bestDist = ranked.length ? ranked[0].dist : Number.POSITIVE_INFINITY;
    const winners = ranked.filter(r => r.dist === bestDist).map(r => r.pid);
    record.winnerIds = winners;

    if (debug) {
      console.log('[Tiebreaker] Answers:', subset);
      console.log('[Tiebreaker] Ranked:', ranked);
      console.log('[Tiebreaker] Winners:', winners);
    }

    // Show review phase first
    this.showReview(room, namespace, roomId, {
      correctAnswer: q.answerNumber,
      playerAnswers: record.answers,
      winners: winners,
      questionText: q.text
    });

    // Then determine next action after review period
    if (winners.length === 1) {
      // Single winner - resolve after review
      setTimeout(() => {
        tb.winnerIds = winners.slice();
        this.resolve(room, namespace, roomId);
      }, 15000); // 5 second review for final answer
    } else {
      // Still tied - next question after shorter review
      setTimeout(() => {
        namespace.to(roomId).emit('tiebreak:tie_again', { stillTiedIds: winners });
        tb.participants = winners;
        
        // 3 second pause between questions as requested
        setTimeout(() => {
          this.sendNextQuestion(room, namespace, roomId);
        }, 3000);
      }, 15000); // 3 second review for tied answers
    }
  },

  /**
   * Show the review phase with answers and correct answer
   */
  showReview(room, namespace, roomId, data) {
    const { correctAnswer, playerAnswers, winners, questionText } = data;
    
    if (debug) {
      console.log('[TB] Showing review:', {
        correctAnswer,
        playerAnswers,
        winners: winners.length === 1 ? 'Single winner' : 'Still tied'
      });
    }

    if (winners.length === 1) {
      // Final winner review
      namespace.to(roomId).emit('tiebreak:review', {
        correctAnswer,
        playerAnswers,
        winnerIds: winners,
        questionText,
        isFinalAnswer: true
      });
    } else {
      // Tied answer review
      namespace.to(roomId).emit('tiebreak:review', {
        correctAnswer,
        playerAnswers,
        stillTiedIds: winners,
        questionText,
        isFinalAnswer: false
      });
    }
  },

  /**
   * Apply the tiebreak outcome to the final leaderboard ordering and finish.
   */
  async resolve(room, namespace, roomId) {
    const { winnerIds } = room.tiebreaker || {};
    if (!winnerIds || winnerIds.length === 0) return;

    // 1) Announce winners (players show "Finalizing…")
    namespace.to(roomId).emit('tiebreak:result', { winnerIds });

    // 2) Persist bonus exactly once
    if (!room.tiebreaker.awarded) {
      const TB_POINTS = room.config?.tiebreakerBonus ?? 1; // or 4 if you want
      if (!room.tiebreakerAwards) room.tiebreakerAwards = {};
      for (const pid of winnerIds) {
        const pd = room.playerData[pid];
        if (pd) pd.score = (pd.score || 0) + TB_POINTS; // ← permanent
        room.tiebreakerAwards[pid] = (room.tiebreakerAwards[pid] || 0) + TB_POINTS;
      }
      room.tiebreaker.awarded = true;
    }

    // 3) Close TB phase and go to standard leaderboard phase
    room.tiebreaker.isActive = false;
    room.currentPhase = 'leaderboard';

    // 4) Rebuild + emit leaderboard
    const finalBoard = LeaderboardService.buildLeaderboard(room);
    room.finalLeaderboard = finalBoard;

    try {
      const mgr = await import('../../quizRoomManager.js');
      if (mgr?.emitRoomState) mgr.emitRoomState(namespace, roomId);
    } catch (e) {
      if (debug) console.warn('[Tiebreaker] emitRoomState import failed:', e?.message);
    }

    namespace.to(roomId).emit('leaderboard', finalBoard);
    namespace.to(`${roomId}:host`).emit('host_final_leaderboard', finalBoard);

    // 5) DO NOT auto-emit "tiebreak:proceed_to_completion" here.
    //    Let the host click "Continue" (your existing button sends next_round_or_end).
  }
};

