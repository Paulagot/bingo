// src/components/Quiz/shared/recoveryHydrators.ts
export function hydrateRoomBasicsFromSnap(
  snap: any,
  {
    setRoomState,
    setPlayersInRoom,
  }: {
    setRoomState: (s: any) => void;
    setPlayersInRoom: (p: { id: string; name: string }[]) => void;
  }
) {
  if (snap?.roomState) setRoomState(snap.roomState);
  if (Array.isArray(snap?.players)) setPlayersInRoom(snap.players);
}

export function hydrateOrderImageFromSnap(snap: any, setters: {
  setOrderImageQuestion: (q: any) => void;
  setOrderImageReviewQuestion: (r: any) => void;
}) {
  // Asking phase - order_image question
  if (snap.orderImageQuestion) {
    setters.setOrderImageQuestion(snap.orderImageQuestion);
  }
  
  // ✅ FIXED: Check for snap.review.images (order_image review is in snap.review)
  if (snap.review && Array.isArray(snap.review.images)) {
    setters.setOrderImageReviewQuestion(snap.review);
  }
}

export function hydrateQuestionOrReviewFromSnap(
  snap: any,
  {
    setCurrentQuestion,
    setReviewQuestion,
    setIsShowingRoundResults,
    setRoundLeaderboard,
    setLeaderboard,
    setReviewComplete,
    setQuestionInRound,
    setTotalInRound,
  }: {
    setCurrentQuestion: (q: any) => void;
    setReviewQuestion: (r: any) => void;
    setIsShowingRoundResults: (b: boolean) => void;
    setRoundLeaderboard: (rows: any[]) => void;
    setLeaderboard: (rows: any[]) => void;
    setReviewComplete: (b: boolean) => void;
    setQuestionInRound: (n: number) => void;
    setTotalInRound: (n: number) => void;
  }
) {
  if (snap?.question) {
    const q = snap.question;
    setCurrentQuestion({
      id: String(q.id),
      text: q.text,
      options: q.options || [],
      timeLimit: q.timeLimit ?? 10,
      questionStartTime: q.questionStartTime ?? Date.now(),
      questionNumber: q.questionNumber,
      totalQuestions: q.totalQuestions,
    });
    if (q.questionNumber && q.totalQuestions) {
      setQuestionInRound(q.questionNumber);
      setTotalInRound(q.totalQuestions);
    }
    setReviewQuestion(null);
    setIsShowingRoundResults(false);
    setRoundLeaderboard([]);
  }

  if (snap?.review) {
    const r = snap.review;
    setReviewQuestion({
      id: String(r.id),
      text: r.text,
      options: r.options || [],
      correctAnswer: r.correctAnswer,
      submittedAnswer: r.submittedAnswer ?? null,
      difficulty: r.difficulty,
      category: r.category,
      questionNumber: r.questionNumber,
      totalQuestions: r.totalQuestions,
    });
    if (r.questionNumber && r.totalQuestions) {
      setQuestionInRound(r.questionNumber);
      setTotalInRound(r.totalQuestions);
    }
    setIsShowingRoundResults(false);
    setRoundLeaderboard([]);
  }

  if (Array.isArray(snap?.roundLeaderboard)) {
    setRoundLeaderboard(snap.roundLeaderboard);
    setIsShowingRoundResults(true);
    setLeaderboard([]);
  } else if (Array.isArray(snap?.leaderboard)) {
    setLeaderboard(snap.leaderboard);
    setIsShowingRoundResults(false);
  }

  if (snap?.review?.questionNumber && snap?.review?.totalQuestions) {
    const done = snap.review.questionNumber >= snap.review.totalQuestions;
    setReviewComplete(done);
  }
}

export function hydrateTiebreakerFromSnap(
  snap: any,
  {
    setRoomState,
    setTbParticipants,
    setTbQuestion,
    setTbWinners,
    setTbPlayerAnswers,
    setTbCorrectAnswer,
    setTbShowReview,
    setTbQuestionNumber,
    setTbStillTied,
  }: {
    setRoomState: (updater: any) => void;
    setTbParticipants: (ids: string[]) => void;
    setTbQuestion: (q: { id: string; text: string; timeLimit: number; questionStartTime?: number } | null) => void;
    setTbWinners: (ids: string[] | null) => void;
    setTbPlayerAnswers: (m: Record<string, number>) => void;
    setTbCorrectAnswer: (n?: number) => void;
    setTbShowReview: (b: boolean) => void;
    setTbQuestionNumber: (n: number) => void;
    setTbStillTied: (ids: string[]) => void;
  }
) {
  const tb = snap?.tb;
  if (!tb) return;

  if (tb.stage && (snap?.roomState?.phase === 'tiebreaker' || tb.stage !== 'result')) {
    setRoomState((prev: any) => ({ ...prev, phase: 'tiebreaker' }));
  }

  if (Array.isArray(tb.participants)) setTbParticipants(tb.participants);
  if (typeof tb.questionNumber === 'number') setTbQuestionNumber(Math.max(1, tb.questionNumber));
  if (Array.isArray(tb.stillTiedIds)) setTbStillTied(tb.stillTiedIds);

  switch (tb.stage) {
    case 'start':
      setTbQuestion(null);
      setTbWinners(null);
      setTbPlayerAnswers({});
      setTbCorrectAnswer(undefined);
      setTbShowReview(false);
      break;
    case 'question':
      if (tb.question) {
        setTbQuestion({
          id: String(tb.question.id),
          text: tb.question.text,
          timeLimit: tb.question.timeLimit ?? 20,
          questionStartTime: tb.question.questionStartTime ?? Date.now(),
        });
      }
      setTbShowReview(false);
      setTbWinners(null);
      setTbPlayerAnswers({});
      setTbCorrectAnswer(undefined);
      break;
    case 'review':
      setTbQuestion(null);
      setTbShowReview(true);
      setTbCorrectAnswer(tb.review?.correctAnswer ?? undefined);
      setTbPlayerAnswers(tb.review?.playerAnswers || {});
      setTbWinners(Array.isArray(tb.review?.winnerIds) ? tb.review!.winnerIds! : null);
      if (Array.isArray(tb.review?.stillTiedIds)) setTbStillTied(tb.review!.stillTiedIds!);
      break;
    case 'result':
      setTbShowReview(true);
      setTbQuestion(null);
      setTbCorrectAnswer(undefined);
      setTbPlayerAnswers({});
      if (Array.isArray(tb.result?.winnerIds)) setTbWinners(tb.result!.winnerIds!);
      break;
    default:
      setTbShowReview(false);
  }
}

// ✅ NEW: Hydrate hidden object state for both asking and reviewing phases
export function hydrateHiddenObjectFromSnap(
  snap: any,
  {
    setHiddenPuzzle,
    setHiddenFoundIds,
    setHiddenFinished,
    setRoundRemaining,
  }: {
    setHiddenPuzzle: (puzzle: any) => void;
    setHiddenFoundIds: (ids: string[]) => void;
    setHiddenFinished: (finished: boolean) => void;
    setRoundRemaining: (seconds: number | null) => void;
  }
) {
  if (snap?.hiddenObject) {
    const ho = snap.hiddenObject;
    
    // Set the puzzle
    if (ho.puzzle) {
      setHiddenPuzzle({
        puzzleId: ho.puzzle.puzzleId,
        imageUrl: ho.puzzle.imageUrl,
        difficulty: ho.puzzle.difficulty,
        category: ho.puzzle.category,
        totalSeconds: ho.puzzle.totalSeconds,
        itemTarget: ho.puzzle.itemTarget,
        items: ho.puzzle.items || [],
        puzzleNumber: ho.puzzleNumber,      // ✅ ADD THIS
        totalPuzzles: ho.totalPuzzles,      // ✅ ADD THIS
      });
    }
    
    // Set found items (empty array for host, player's items for player)
    if (Array.isArray(ho.foundIds)) {
      setHiddenFoundIds(ho.foundIds);
    }
    
    // Set finished state
    if (typeof ho.finished === 'boolean') {
      setHiddenFinished(ho.finished);
    }
    
    // Set remaining time
    if (typeof ho.remaining === 'number') {
      setRoundRemaining(ho.remaining);
    } else {
      setRoundRemaining(null);
    }
  }
}

// ✅ NEW: Hydrate final quiz stats for post-game recovery
export function hydrateFinalStatsFromSnap(
  snap: any,
  {
    recoverFinalStats,
  }: {
    recoverFinalStats: (stats: any[]) => void;
  }
) {
  if (Array.isArray(snap?.finalQuizStats) && snap.finalQuizStats.length > 0) {
    recoverFinalStats(snap.finalQuizStats);
    console.log('[hydrateFinalStats] ✅ Recovered final quiz stats:', snap.finalQuizStats.length, 'rounds');
  }
}

// ✅ NEW: Hydrate current round stats for round leaderboard
export function hydrateCurrentRoundStatsFromSnap(
  snap: any,
  {
    updateCurrentRoundStats,
  }: {
    updateCurrentRoundStats: (stats: any) => void;
  }
) {
  if (snap?.currentRoundStats) {
    updateCurrentRoundStats(snap.currentRoundStats);
    console.log('[hydrateCurrentRoundStats] ✅ Recovered current round stats:', snap.currentRoundStats.roundNumber);
  }
}
