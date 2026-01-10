import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useCountdownEffects } from './useCountdownEffects';
import { useQuizConfig } from './useQuizConfig';
import { useHostStats } from './useHostStats';
import { useQuizTimer } from './useQuizTimer';
import { useHostRecovery } from './useHostRecovery';

import type { RoundTypeId, User } from '../types/quiz';

const debug = false;

export type RoomStatePayload = {
  currentRound: number;
  totalRounds: number;
  roundTypeName: string;
  phase:
    | 'waiting'
    | 'launched'
    | 'asking'
    | 'reviewing'
    | 'leaderboard'
    | 'complete'
    | 'distributing_prizes'
    | 'tiebreaker';
  questionsThisRound?: number;
  totalPlayers?: number;
  currentReviewIndex?: number;      // ✅ ADDED
  totalReviewQuestions?: number;    // ✅ ADDED
};

export interface AnswerStatistics {
  totalPlayers: number;
  correctCount: number;
  incorrectCount: number;
  noAnswerCount: number;
  correctPercentage: number;
  incorrectPercentage: number;
  noAnswerPercentage: number;
}

export type QuestionPayload = {
  id: string;
  text: string;
  options: string[];
  timeLimit: number;
  questionStartTime: number;
  difficulty?: string;
  category?: string;
  questionNumber?: number;
  totalQuestions?: number;
};

export type ReviewQuestionPayload = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  submittedAnswer?: string | null;
  difficulty?: string;
  category?: string;
  questionNumber?: number;
  totalQuestions?: number;
  statistics?: AnswerStatistics;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  cumulativeNegativePoints?: number;
  pointsRestored?: number;
};

function computePrizeCount(cfg: any): number {
  const s = cfg?.web3PrizeStructure;
  if (s && typeof s === 'object') {
    const keys = ['firstPlace', 'secondPlace', 'thirdPlace', 'fourthPlace', 'fifthPlace'];
    const cnt = keys.reduce((n, k) => {
      const v = Number(s[k]);
      return n + (Number.isFinite(v) && v > 0 ? 1 : 0);
    }, 0);
    if (cnt > 0) return cnt;
  }

  if (Array.isArray(cfg?.web3PrizeSplit)) {
    const cnt = cfg.web3PrizeSplit.filter((x: any) => {
      const v = typeof x === 'number' ? x : Number(x?.amount ?? x?.percent);
      return Number.isFinite(v) && v > 0;
    }).length;
    if (cnt > 0) return cnt;
  }

  if (Array.isArray(cfg?.prizes)) {
    const cnt = cfg.prizes.filter((p: any) => {
      if (p == null) return false;
      const v = Number(p?.amount);
      return Number.isFinite(v) ? v > 0 : true;
    }).length;
    if (cnt > 0) return cnt;
  }

  return 1;
}

function findPrizeBoundaryTies(
  lb: { id: string; name: string; score: number }[],
  prizeCount: number
) {
  if (!lb?.length) return [];
  const ties: { boundary: number; playerIds: string[] }[] = [];

  const topScore = lb[0]?.score ?? 0;
  const firstGroup = lb.filter((e) => (e.score ?? 0) === topScore).map((e) => e.id);
  if (firstGroup.length > 1) ties.push({ boundary: 1, playerIds: firstGroup });

  for (let k = 2; k <= prizeCount; k++) {
    const idx = k - 1;
    const kthScore = lb[idx]?.score;
    if (kthScore == null) continue;
    const group = lb.filter((e) => e.score === kthScore).map((e) => e.id);
    if (group.length > 1) ties.push({ boundary: k, playerIds: group });
  }

  return ties.filter((t, i, a) => a.findIndex((z) => z.boundary === t.boundary) === i);
}

export function useHostControlsController({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const { config } = useQuizConfig();

  const [_timerActive, setTimerActive] = useState(false);
  const [playersInRoom, setPlayersInRoom] = useState<User[]>([]);

  const [roomState, setRoomState] = useState<RoomStatePayload>({
    currentRound: 1,
    totalRounds: 1,
    roundTypeName: '',
    phase: 'waiting',
    questionsThisRound: 0,
    totalPlayers: 0,
    currentReviewIndex: 0,           // ✅ ADDED
    totalReviewQuestions: 0,         // ✅ ADDED
  });

  // ✅ stable reference across renders
  const hostStatsParams = useMemo(() => ({ socket, roomId: roomId!, debug }), [socket, roomId]);

  const {
    activities,
    currentRoundStats,
    allRoundsStats,
    clearActivity,
    hasRoundStats,
    hasFinalStats,
    recoverFinalStats,
    updateCurrentRoundStats,
  } = useHostStats(hostStatsParams);

  // ✅ UPDATED: cache the last roomState we actually applied for cheap equality checks
  const lastAppliedRef = useRef<null | {
    currentRound: number | null | undefined;
    totalRounds: number | null | undefined;
    roundTypeName: string | null | undefined;
    phase: string | null | undefined;
    questionsThisRound: number | null | undefined;
    totalPlayers: number | null | undefined;
    currentReviewIndex: number | null | undefined;      // ✅ ADDED
    totalReviewQuestions: number | null | undefined;    // ✅ ADDED
  }>(null);

  const [roundLeaderboard, setRoundLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isShowingRoundResults, setIsShowingRoundResults] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  // ✅ UPDATED: handleRoomState callback to include the new fields
  const handleRoomState = useCallback((data: any) => {
      console.log('[Host] 🔍 Received room_state:', {
    phase: data?.phase,
    currentReviewIndex: data?.currentReviewIndex,
    totalReviewQuestions: data?.totalReviewQuestions,
    currentRound: data?.currentRound,
  });
    const snapshot = {
      currentRound: data?.currentRound ?? null,
      totalRounds: data?.totalRounds ?? null,
      roundTypeName: data?.roundTypeName ?? null,
      phase: data?.phase ?? null,
      questionsThisRound: data?.questionsThisRound ?? null,
      totalPlayers: data?.totalPlayers ?? null,
      currentReviewIndex: data?.currentReviewIndex ?? null,     // ✅ ADDED
      totalReviewQuestions: data?.totalReviewQuestions ?? null, // ✅ ADDED
    };

    

    const last = lastAppliedRef.current;
    const unchanged =
      last &&
      last.currentRound === snapshot.currentRound &&
      last.totalRounds === snapshot.totalRounds &&
      last.roundTypeName === snapshot.roundTypeName &&
      last.phase === snapshot.phase &&
      last.questionsThisRound === snapshot.questionsThisRound &&
      last.totalPlayers === snapshot.totalPlayers &&
      last.currentReviewIndex === snapshot.currentReviewIndex &&           // ✅ ADDED
      last.totalReviewQuestions === snapshot.totalReviewQuestions;         // ✅ ADDED

    if (!unchanged) {
      lastAppliedRef.current = snapshot;
      setRoomState(data);

      if (data?.phase !== 'leaderboard') {
        setIsShowingRoundResults(false);
        setRoundLeaderboard([]);
      }
      if (data?.phase !== 'reviewing') {
        setReviewComplete(false);
      }
    }
  }, []);

  // --- TIEBREAKER ---
  const [tbParticipants, setTbParticipants] = useState<string[]>([]);
  const [tbQuestion, setTbQuestion] = useState<{
    id: string;
    text: string;
    timeLimit: number;
    questionStartTime?: number;
  } | null>(null);
  const [tbWinners, setTbWinners] = useState<string[] | null>(null);
  const [tbPlayerAnswers, setTbPlayerAnswers] = useState<Record<string, number>>({});
  const [tbCorrectAnswer, setTbCorrectAnswer] = useState<number | undefined>();
  const [tbShowReview, setTbShowReview] = useState(false);
  const [tbQuestionNumber, setTbQuestionNumber] = useState(1);
  const [tbStillTied, setTbStillTied] = useState<string[]>([]);

  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [reviewQuestion, setReviewQuestion] = useState<ReviewQuestionPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const [hiddenObjectPuzzle, setHiddenObjectPuzzle] = useState<any>(null);
  const [hiddenObjectFoundIds, setHiddenObjectFoundIds] = useState<string[]>([]);
  const [hiddenObjectRemainingSeconds, setHiddenObjectRemainingSeconds] = useState<number | null>(
    null
  );

  const [orderImageQuestion, setOrderImageQuestion] = useState<any>(null);
  const [orderImageReviewQuestion, setOrderImageReviewQuestion] = useState<any>(null);

  // Question tracking
  const [questionInRound, setQuestionInRound] = useState(1);
  const [, setTotalInRound] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

  // Derived round info
  const currentRoundDef = config?.roundDefinitions?.[roomState.currentRound - 1];
  const roundTypeId = currentRoundDef?.roundType as RoundTypeId;

  // Timer (server-driven)
  const timerQuestion = orderImageQuestion
    ? {
        id: orderImageQuestion.id,
        timeLimit: orderImageQuestion.timeLimit,
        questionStartTime: orderImageQuestion.questionStartTime,
      }
    : currentQuestion
    ? {
        id: currentQuestion.id,
        timeLimit: currentQuestion.timeLimit,
        questionStartTime: currentQuestion.questionStartTime,
      }
    : null;

  const { timeLeft } = useQuizTimer({
    question: timerQuestion,
    timerActive: roomState.phase === 'asking',
  });

  // countdown FX
  const { currentEffect, isFlashing, getFlashClasses } = useCountdownEffects();

  // Helper: question position calc
  const calculateQuestionPosition = useCallback(
    (idx: number) => {
      if (!config?.roundDefinitions || idx < 0) return { questionInRound: 1, totalInRound: 1 };

      const currentRoundIndex = roomState.currentRound - 1;
      const def = config.roundDefinitions[currentRoundIndex];
      if (!def) return { questionInRound: 1, totalInRound: 1 };

      const questionsPerRound = def.config.questionsPerRound || 6;
      const questionInCurrentRound = idx + 1;

      return {
        questionInRound: Math.max(1, questionInCurrentRound),
        totalInRound: questionsPerRound,
      };
    },
    [config?.roundDefinitions, roomState.currentRound]
  );

  const isLastQuestionOfRound = useCallback(() => {
    if (roomState.phase === 'reviewing' && reviewQuestion && !currentQuestion) {
      if (config?.roundDefinitions) {
        const def = config.roundDefinitions[roomState.currentRound - 1];
        if (def) {
          const questionsPerRound = def.config.questionsPerRound || 6;
          return questionInRound >= questionsPerRound;
        }
      }
      return true;
    }

    if (currentQuestion?.questionNumber && currentQuestion?.totalQuestions) {
      return currentQuestion.questionNumber === currentQuestion.totalQuestions;
    }

    if (config?.roundDefinitions && currentQuestion) {
      const def = config.roundDefinitions[roomState.currentRound - 1];
      if (def) {
        const questionsPerRound = def.config.questionsPerRound || 6;
        return questionInRound === questionsPerRound;
      }
    }

    return false;
  }, [
    roomState.phase,
    reviewQuestion,
    currentQuestion,
    config?.roundDefinitions,
    roomState.currentRound,
    questionInRound,
  ]);

  // Debug tiebreaker snapshot
  useEffect(() => {
    if (roomState.phase === 'tiebreaker') {
      console.log('[Host Debug] Tiebreaker Data:', {
        tbParticipants,
        playersInRoom: playersInRoom?.map((p) => ({ id: p.id, name: p.name })),
        leaderboard: leaderboard?.map((p) => ({ id: p.id, name: p.name })),
        hasPlayersInRoom: !!playersInRoom?.length,
        hasLeaderboard: !!leaderboard?.length,
      });
    }
  }, [roomState.phase, tbParticipants, playersInRoom, leaderboard]);

  // --- Socket listeners ---
  useEffect(() => {
    if (!socket) return;

    const onStart = ({ participants }: { participants: string[] }) => {
      setTbParticipants(participants);
      setTbQuestion(null);
      setTbWinners(null);
      setRoomState((s) => ({ ...s, phase: 'tiebreaker' }));
    };

    const onQ = (q: {
      id: string;
      text: string;
      type: 'numeric';
      timeLimit: number;
      questionStartTime?: number;
    }) => {
      setTbQuestion(
        q.questionStartTime != null
          ? { id: q.id, text: q.text, timeLimit: q.timeLimit, questionStartTime: q.questionStartTime }
          : { id: q.id, text: q.text, timeLimit: q.timeLimit }
      );
      setTbShowReview(false);
      setTbPlayerAnswers({});
    };

    const onRes = ({ winnerIds }: { winnerIds: string[] }) => setTbWinners(winnerIds);

    const onReview = (data: {
      correctAnswer: number;
      playerAnswers: Record<string, number>;
      winnerIds?: string[];
      stillTiedIds?: string[];
      questionText: string;
      isFinalAnswer: boolean;
    }) => {
      if (debug) console.log('[Host] tiebreak:review', data);
      setTbCorrectAnswer(data.correctAnswer);
      setTbPlayerAnswers(data.playerAnswers);
      setTbShowReview(true);

      if (data.winnerIds) setTbWinners(data.winnerIds);
      else if (data.stillTiedIds) setTbStillTied(data.stillTiedIds);
    };

    const onTieAgain = ({ stillTiedIds }: { stillTiedIds: string[] }) => {
      if (debug) console.log('[Host] tiebreak:tie_again', stillTiedIds);
      setTbStillTied(stillTiedIds);
      setTbParticipants(stillTiedIds);
      setTbShowReview(false);
      setTbQuestionNumber((prev) => prev + 1);
    };

    const onPlayerListUpdated = ({ players }: { players: User[] }) => {
      setPlayersInRoom(players);
      if (debug) console.log('[Host] Player list updated:', players);
    };

    socket.on('tiebreak:start', onStart);
    socket.on('tiebreak:question', onQ);
    socket.on('tiebreak:result', onRes);
    socket.on('tiebreak:review', onReview);
    socket.on('tiebreak:tie_again', onTieAgain);
    socket.on('player_list_updated', onPlayerListUpdated);

    return () => {
      socket.off('tiebreak:start', onStart);
      socket.off('tiebreak:question', onQ);
      socket.off('tiebreak:result', onRes);
      socket.off('tiebreak:review', onReview);
      socket.off('tiebreak:tie_again', onTieAgain);
      socket.off('player_list_updated', onPlayerListUpdated);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    socket.on('room_state', handleRoomState);
    return () => {
      socket.off('room_state', handleRoomState);
    };
  }, [socket, handleRoomState]);

  useEffect(() => {
    if (!socket) return;
    const handleFinalLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) console.log('[Host] Final leaderboard received:', data);
      setLeaderboard(data);
    };
    socket.on('host_final_leaderboard', handleFinalLeaderboard);
    return () => {
      socket.off('host_final_leaderboard', handleFinalLeaderboard);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleQuestion = (data: QuestionPayload) => {
      if (debug) console.log('[Host] Received question:', data);

      const isRecovery =
        currentQuestionIndex >= 0 && Math.abs(Date.now() - data.questionStartTime) > 5000;

      if (!isRecovery) setCurrentQuestionIndex((prev) => prev + 1);

      setCurrentQuestion(data);
      setTimerActive(true);
      setReviewQuestion(null);

      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
      } else if (config?.roundDefinitions) {
        const newIndex = isRecovery ? currentQuestionIndex : currentQuestionIndex + 1;
        const pos = calculateQuestionPosition(newIndex);
        setQuestionInRound(pos.questionInRound);
        setTotalInRound(pos.totalInRound);
      }
    };

    socket.on('question', handleQuestion);
    return () => {
      socket.off('question', handleQuestion);
    };
  }, [socket, currentQuestionIndex, config?.roundDefinitions, calculateQuestionPosition]);

  useEffect(() => {
    if (!socket) return;
    const handleHostReviewQuestion = (data: ReviewQuestionPayload) => {
      if (debug) console.log('[Host] Received host review question:', data);
      setReviewQuestion(data);
      setTimerActive(false);
      setCurrentQuestion(null);

      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
        if (debug)
          console.log(`[Host] Review position: ${data.questionNumber}/${data.totalQuestions}`);
      }
    };
    socket.on('host_review_question', handleHostReviewQuestion);
    return () => {
      socket.off('host_review_question', handleHostReviewQuestion);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleReviewComplete = (data: { message: string; roundNumber: number; totalQuestions: number }) => {
      if (debug) console.log('[Host] Review complete notification:', data);
      setReviewComplete(true);
    };
    socket.on('review_complete', handleReviewComplete);
    return () => {
      socket.off('review_complete', handleReviewComplete);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleHiddenObjectStart = (payload: any) => {
      if (debug) console.log('[Host] Received hidden_object_start:', payload);
      setHiddenObjectPuzzle({
        puzzleId: payload.puzzleId,
        imageUrl: payload.imageUrl,
        difficulty: payload.difficulty,
        category: payload.category,
        totalSeconds: payload.totalSeconds,
        itemTarget: payload.itemTarget,
        items: payload.items || [],
        puzzleNumber: payload.puzzleNumber,
        totalPuzzles: payload.totalPuzzles
      });
      setHiddenObjectFoundIds([]);
      setHiddenObjectRemainingSeconds(payload.totalSeconds);
    };
    socket.on('hidden_object_start', handleHiddenObjectStart);
    return () => {
      socket.off('hidden_object_start', handleHiddenObjectStart);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleHiddenObjectReview = (data: { puzzle: any; puzzleNumber?: number; totalPuzzles?: number }) => {
      if (debug) console.log('[Host] Received hidden_object_review:', data);
      setHiddenObjectPuzzle({
        ...data.puzzle,
        puzzleNumber: data.puzzleNumber,
        totalPuzzles: data.totalPuzzles,
      });
      setReviewComplete(true);
      setReviewQuestion(null);
      setCurrentQuestion(null);
    };
    socket.on('hidden_object_review', handleHiddenObjectReview);
    return () => {
      socket.off('hidden_object_review', handleHiddenObjectReview);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handleOrderImageQuestion = (data: any) => {
      if (debug) console.log('[Host] Received order_image_question:', data);
      setOrderImageQuestion(data);
      setOrderImageReviewQuestion(null);
      setReviewQuestion(null);
      setCurrentQuestion(null);
    };

    const handleOrderImageReview = (data: any) => {
      if (debug) console.log('[Host] Received host_order_image_review:', data);
      setOrderImageReviewQuestion(data);
      setOrderImageQuestion(null);
      setReviewQuestion(null);
      setCurrentQuestion(null);
    };

    socket.on('order_image_question', handleOrderImageQuestion);
    socket.on('host_order_image_review', handleOrderImageReview);

    return () => {
      socket.off('order_image_question', handleOrderImageQuestion);
      socket.off('host_order_image_review', handleOrderImageReview);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleRoundTimeRemaining = ({ remaining }: { remaining: number }) => {
      if (roundTypeId === 'hidden_object') setHiddenObjectRemainingSeconds(remaining);
    };
    socket.on('round_time_remaining', handleRoundTimeRemaining);
    return () => {
      socket.off('round_time_remaining', handleRoundTimeRemaining);
    };
  }, [socket, roundTypeId]);

  useEffect(() => {
    if (!socket) return;
    const handleRoundLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) console.log('[Host] Round leaderboard received:', data);
      setRoundLeaderboard(data);
      setIsShowingRoundResults(true);
    };
    socket.on('round_leaderboard', handleRoundLeaderboard);
    return () => {
      socket.off('round_leaderboard', handleRoundLeaderboard);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;
    const handleLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) console.log('[Host] Overall leaderboard received:', data);
      setLeaderboard(data);
      setIsShowingRoundResults(false);
    };
    socket.on('leaderboard', handleLeaderboard);
    return () => {
      socket.off('leaderboard', handleLeaderboard);
    };
  }, [socket]);

  // --- emitters ---
  const handleStartRound = useCallback(() => {
    if (debug) console.log('[Host] Starting round...');
    socket?.emit('start_round', { roomId });
  }, [socket, roomId]);

  const handleNextReview = useCallback(() => {
    socket?.emit('next_review', { roomId });
  }, [socket, roomId]);

  const handleShowRoundResults = useCallback(() => {
    if (debug) console.log('[Host] Showing round results...');
    socket?.emit('show_round_results', { roomId });
  }, [socket, roomId]);

  const handleContinueToOverallLeaderboard = useCallback(() => {
    if (debug) console.log('[Host] Continuing to overall leaderboard...');
    socket?.emit('continue_to_overall_leaderboard', { roomId });
  }, [socket, roomId]);

  const handleReturnToDashboard = useCallback(() => {
    navigate(`/quiz/host-dashboard/${roomId}?tab=prizes&lock=postgame`);
  }, [navigate, roomId]);

  // --- CTA label logic for overall leaderboard ---
  const prizeCount = computePrizeCount(config);
  const prizeBoundaryTies =
    roomState.phase === 'leaderboard' && !isShowingRoundResults
      ? findPrizeBoundaryTies(leaderboard, prizeCount)
      : [];
  const hasPrizeTie = prizeBoundaryTies.length > 0;

  const tieParticipantsByName = useMemo(() => {
    if (!hasPrizeTie) return [] as string[];
    const firstTie = prizeBoundaryTies[0];
    if (!firstTie) return [] as string[];
    const ids = firstTie.playerIds ?? [];
    const map = new Map(leaderboard.map((e) => [e.id, e.name]));
    return ids.map((id) => map.get(id) ?? id);
  }, [hasPrizeTie, prizeBoundaryTies, leaderboard]);

  // Recovery hook
  useHostRecovery({
    socket,
    connected,
    roomId,
    setters: {
      setRoomState,
      setPlayersInRoom,
      setOrderImageQuestion,
      setOrderImageReviewQuestion,
      setCurrentQuestion,
      setReviewQuestion,
      setIsShowingRoundResults,
      setRoundLeaderboard,
      setLeaderboard,
      setReviewComplete,
      setQuestionInRound,
      setTotalInRound,

      setHiddenPuzzle: setHiddenObjectPuzzle,
      setHiddenFoundIds: setHiddenObjectFoundIds,
      setHiddenFinished: () => {},
      setRoundRemaining: setHiddenObjectRemainingSeconds,

      recoverFinalStats,
      updateCurrentRoundStats,

      setTbParticipants,
      setTbQuestion,
      setTbWinners,
      setTbPlayerAnswers,
      setTbCorrectAnswer,
      setTbShowReview,
      setTbQuestionNumber,
      setTbStillTied,
    },
  });

  const handleEndGame = useCallback(async () => {
    console.log('🧹 [Host] Starting end game cleanup...');

    if (!socket || !roomId) {
      console.warn('⚠️ [Host] No socket or roomId available');
      if (config?.paymentMethod === 'web3' || config?.isWeb3Room) navigate('/web3/impact-campaign/');
      else navigate('/');
      return;
    }

    try {
      socket.emit('end_quiz_cleanup', { roomId });
      console.log('✅ [Host] End game cleanup signal sent to backend');
      console.log('⏳ [Host] Waiting for backend to complete cleanup...');
    } catch (error) {
      console.error('❌ [Host] Error during cleanup:', error);
      if (config?.paymentMethod === 'web3' || config?.isWeb3Room) navigate('/web3/impact-campaign/');
      else navigate('/');
    }
  }, [socket, roomId, navigate, config?.paymentMethod, config?.isWeb3Room]);

  return {
    debug,

    // socket/meta
    socket,
    connected,
    config,

    // derived
    currentRoundDef,
    roundTypeId,
    timeLeft,
    currentEffect,
    isFlashing,
    getFlashClasses,
    isLastQuestionOfRound,

    // host stats
    activities,
    currentRoundStats,
    allRoundsStats,
    clearActivity,
    hasRoundStats,
    hasFinalStats,

    // state
    roomState,
    playersInRoom,

    tbParticipants,
    tbQuestion,
    tbWinners,
    tbPlayerAnswers,
    tbCorrectAnswer,
    tbShowReview,
    tbQuestionNumber,
    tbStillTied,

    currentQuestion,
    reviewQuestion,
    leaderboard,

    hiddenObjectPuzzle,
    hiddenObjectFoundIds,
    hiddenObjectRemainingSeconds,

    orderImageQuestion,
    orderImageReviewQuestion,
    

    roundLeaderboard,
    isShowingRoundResults,
    reviewComplete,

    prizeCount,
    hasPrizeTie,
    tieParticipantsByName,

    // handlers
    handleStartRound,
    handleNextReview,
    handleShowRoundResults,
    handleContinueToOverallLeaderboard,
    handleEndGame,
    handleReturnToDashboard,
  };
}

export type HostControlsController = ReturnType<typeof useHostControlsController>;

