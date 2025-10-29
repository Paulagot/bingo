import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as React from 'react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useNavigate } from 'react-router-dom';
import { useCountdownEffects } from '../hooks/useCountdownEffects';
import { useQuizConfig } from '../hooks/useQuizConfig';

import type { RoundTypeId, User } from '../types/quiz';
import ActivityTicker from '../host-controls/components/ActivityTicker';
import RoundStatsDisplay from '../host-controls/components/RoundStatsDisplay';
import { useHostStats } from '../hooks/useHostStats';
import HostRoundPreview from './HostRoundPreview';
import HostHeader from '../host-controls/components/HostHeader';
import RoundLeaderboardCard from '../host-controls/components/RoundLeaderboardCard';
import OverallLeaderboardCard from '../host-controls/components/OverallLeaderboardCard';
import ReviewPanel from '../host-controls/components/ReviewPanel';
import HostTiebreakerPanel from '../host-controls/components/HostTiebreakerPanel';
import { DynamicChainProvider } from '../../chains/DynamicChainProvider';
import SpeedRoundHostPanel from '../host-controls/components/SpeedRoundHostPanel';
import { useHostRecovery } from '../hooks/useHostRecovery';
import HostPostgamePanel from '../host-controls/components/HostPostgamePanel';

import { Eye, Timer } from 'lucide-react';
import { useQuizTimer } from '../hooks/useQuizTimer';

const debug = false;

type RoomStatePayload = {
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
};

interface AnswerStatistics {
  totalPlayers: number;
  correctCount: number;
  incorrectCount: number;
  noAnswerCount: number;
  correctPercentage: number;
  incorrectPercentage: number;
  noAnswerPercentage: number;
}

type QuestionPayload = {
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

type ReviewQuestionPayload = {
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

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  cumulativeNegativePoints?: number;
  pointsRestored?: number;
};

const HostControlsCore = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
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
  } = useHostStats(hostStatsParams);

  // cache the last roomState we actually applied for cheap equality checks
  const lastAppliedRef = useRef<null | {
    currentRound: number | null | undefined;
    totalRounds: number | null | undefined;
    roundTypeName: string | null | undefined;
    phase: string | null | undefined;
    questionsThisRound: number | null | undefined;
    totalPlayers: number | null | undefined;
  }>(null);

  const handleRoomState = useCallback((data: any) => {
    // shallow compare the subset you use frequently to avoid no-op state updates
    const snapshot = {
      currentRound: data?.currentRound ?? null,
      totalRounds: data?.totalRounds ?? null,
      roundTypeName: data?.roundTypeName ?? null,
      phase: data?.phase ?? null,
      questionsThisRound: data?.questionsThisRound ?? null,
      totalPlayers: data?.totalPlayers ?? null,
    };

    const last = lastAppliedRef.current;
    const unchanged =
      last &&
      last.currentRound === snapshot.currentRound &&
      last.totalRounds === snapshot.totalRounds &&
      last.roundTypeName === snapshot.roundTypeName &&
      last.phase === snapshot.phase &&
      last.questionsThisRound === snapshot.questionsThisRound &&
      last.totalPlayers === snapshot.totalPlayers;

    if (!unchanged) {
      lastAppliedRef.current = snapshot;
      setRoomState(data);

      // keep your side-effects, but guard them so they don't thrash
      if (data?.phase !== 'leaderboard') {
        setIsShowingRoundResults(false);
        setRoundLeaderboard([]);
      }
      if (data?.phase !== 'reviewing') {
        setReviewComplete(false);
      }
    }
  }, []);

  // --- TIEBREAKER (host side) ---
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

  // Round leaderboard state
  const [roundLeaderboard, setRoundLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isShowingRoundResults, setIsShowingRoundResults] = useState(false);
  const [reviewComplete, setReviewComplete] = useState(false);

  // Question tracking (same as players)
  const [questionInRound, setQuestionInRound] = useState(1);
  const [, setTotalInRound] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

  // Timer now managed by server - host gets same countdown effects as players
  const timerQuestion = currentQuestion
    ? {
        id: currentQuestion.id,
        timeLimit: currentQuestion.timeLimit,
        questionStartTime: currentQuestion.questionStartTime,
      }
    : null;

  const { timeLeft } = useQuizTimer({
    question: timerQuestion,
    timerActive: roomState.phase === 'asking',
    onTimeUp: undefined,
  });

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

  // Use countdown effects hook (same as players use)
  const { currentEffect, isFlashing, getFlashClasses } = useCountdownEffects();

  // Check if we're on the last question of the round OR if review is complete
  const isLastQuestionOfRound = () => {
    if (roomState.phase === 'reviewing' && reviewQuestion && !currentQuestion) {
      if (config?.roundDefinitions) {
        const currentRoundDef = config.roundDefinitions[roomState.currentRound - 1];
        if (currentRoundDef) {
          const questionsPerRound = currentRoundDef.config.questionsPerRound || 6;
          return questionInRound >= questionsPerRound;
        }
      }
      return true;
    }

    if (currentQuestion?.questionNumber && currentQuestion?.totalQuestions) {
      return currentQuestion.questionNumber === currentQuestion.totalQuestions;
    }

    if (config?.roundDefinitions && currentQuestion) {
      const currentRoundDef = config.roundDefinitions[roomState.currentRound - 1];
      if (currentRoundDef) {
        const questionsPerRound = currentRoundDef.config.questionsPerRound || 6;
        return questionInRound === questionsPerRound;
      }
    }

    return false;
  };

  // Calculate question position (same logic as players)
  const calculateQuestionPosition = (currentQuestionIndex: number) => {
    if (!config?.roundDefinitions || currentQuestionIndex < 0)
      return { questionInRound: 1, totalInRound: 1 };

    const currentRoundIndex = roomState.currentRound - 1;
    const currentRoundDef = config.roundDefinitions[currentRoundIndex];

    if (!currentRoundDef) return { questionInRound: 1, totalInRound: 1 };

    const questionsPerRound = currentRoundDef.config.questionsPerRound || 6;
    const questionInCurrentRound = currentQuestionIndex + 1;

    return {
      questionInRound: Math.max(1, questionInCurrentRound),
      totalInRound: questionsPerRound,
    };
  };

  // Get current round information
  const currentRoundDef = config?.roundDefinitions?.[roomState.currentRound - 1];
  const roundTypeId = currentRoundDef?.roundType as RoundTypeId;

  // --- Prize & tie helpers (host-side preview only) ---
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

  // Tiebreaker & player list listeners
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
      setTbQuestion({
        id: q.id,
        text: q.text,
        timeLimit: q.timeLimit,
        questionStartTime: q.questionStartTime,
      });
      setTbShowReview(false);
      setTbPlayerAnswers({});
    };

    const onRes = ({ winnerIds }: { winnerIds: string[] }) => {
      setTbWinners(winnerIds);
    };

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

      if (data.winnerIds) {
        setTbWinners(data.winnerIds);
      } else if (data.stillTiedIds) {
        setTbStillTied(data.stillTiedIds);
      }
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

  // Listen for room_state updates
  useEffect(() => {
    if (!socket) return;
    socket.on('room_state', handleRoomState);
    return () => {
      socket.off('room_state', handleRoomState);
    };
  }, [socket, handleRoomState]);

  // Final leaderboard (server emits at end)
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

  // Listen for question events
  useEffect(() => {
    if (!socket) return;
    const handleQuestion = (data: QuestionPayload) => {
      if (debug) console.log('[Host] Received question:', data);

      const isRecovery =
        currentQuestionIndex >= 0 && Math.abs(Date.now() - data.questionStartTime) > 5000;

      if (!isRecovery) {
        setCurrentQuestionIndex((prev) => prev + 1);
      }

      setCurrentQuestion(data);
      setTimerActive(true);
      setReviewQuestion(null);

      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
      } else if (config?.roundDefinitions) {
        const newIndex = isRecovery ? currentQuestionIndex : currentQuestionIndex + 1;
        const { questionInRound: qInRound, totalInRound: totalInR } =
          calculateQuestionPosition(newIndex);
        setQuestionInRound(qInRound);
        setTotalInRound(totalInR);
      }
    };
    socket.on('question', handleQuestion);
    return () => {
      socket.off('question', handleQuestion);
    };
  }, [socket, currentQuestionIndex, config?.roundDefinitions]);

  // Listen for review_question events
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
        if (debug) console.log(`[Host] Review position: ${data.questionNumber}/${data.totalQuestions}`);
      }
    };
    socket.on('host_review_question', handleHostReviewQuestion);
    return () => {
      socket.off('host_review_question', handleHostReviewQuestion);
    };
  }, [socket]);

  // Listen for review complete notification from engine
  useEffect(() => {
    if (!socket) return;
    const handleReviewComplete = (data: {
      message: string;
      roundNumber: number;
      totalQuestions: number;
    }) => {
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

  // Listen for overall leaderboard
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

  // Socket emitters for host actions
  const handleStartRound = () => {
    if (debug) console.log('[Host] Starting round...');
    socket?.emit('start_round', { roomId });
  };

  const handleNextReview = () => {
    socket?.emit('next_review', { roomId });
  };

  const handleShowRoundResults = () => {
    if (debug) console.log('[Host] Showing round results...');
    socket?.emit('show_round_results', { roomId });
  };

  const handleContinueToOverallLeaderboard = () => {
    if (debug) console.log('[Host] Continuing to overall leaderboard...');
    socket?.emit('continue_to_overall_leaderboard', { roomId });
  };

  // --- CTA label logic for overall leaderboard ---
 
  const prizeCount = computePrizeCount(config);
  const prizeBoundaryTies =
    roomState.phase === 'leaderboard' && !isShowingRoundResults
      ? findPrizeBoundaryTies(leaderboard, prizeCount)
      : [];
  const hasPrizeTie = prizeBoundaryTies.length > 0;

  const tieParticipantsByName = (() => {
    if (!hasPrizeTie) return [];
    const ids = prizeBoundaryTies[0].playerIds;
    const map = new Map(leaderboard.map((e) => [e.id, e.name]));
    return ids.map((id) => map.get(id) || id);
  })();

  useHostRecovery({
    socket,
    connected,
    roomId,
    setters: {
      setRoomState,
      setPlayersInRoom,

      setCurrentQuestion,
      setReviewQuestion,
      setIsShowingRoundResults,
      setRoundLeaderboard,
      setLeaderboard,
      setReviewComplete,
      setQuestionInRound,
      setTotalInRound,

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

  /**
 * 🧹 End Game Cleanup Handler
 * 
 * Called after successful Web3 prize distribution.
 * Emits cleanup signal to backend, which then notifies all clients.
 * Frontend (QuizSocketProvider) handles the actual redirect based on isWeb3Room flag.
 */
const handleEndGame = useCallback(() => {
  console.log('🧹 [Host] Starting end game cleanup...');
  
  if (!socket || !roomId) {
    console.warn('⚠️ [Host] No socket or roomId available');
    // Fallback: redirect directly based on payment method
    if (config?.paymentMethod === 'web3' || config?.isWeb3Room) {
      navigate('/web3/impact-campaign/');
    } else {
      navigate('/');
    }
    return;
  }

  try {
    // Send cleanup signal to backend
    // Backend will determine if Web3 room and notify all clients with appropriate flag
    socket.emit('end_quiz_cleanup', { roomId });
    
    console.log('✅ [Host] End game cleanup signal sent to backend');
    console.log('⏳ [Host] Waiting for backend to complete cleanup...');
    
    // The rest happens automatically:
    // 1. Backend checks if Web3 room
    // 2. Backend emits quiz_cleanup_complete with isWeb3Room flag
    // 3. QuizSocketProvider receives event and redirects based on flag
    //    - Web3: /web3/impact-campaign/
    //    - Web2: /quiz
    
  } catch (error) {
    console.error('❌ [Host] Error during cleanup:', error);
    // Fallback: navigate directly if socket fails
    if (config?.paymentMethod === 'web3' || config?.isWeb3Room) {
      navigate('/web3/impact-campaign/');
    } else {
      navigate('/');
    }
  }
}, [socket, roomId, navigate, config?.paymentMethod, config?.isWeb3Room]);





  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Countdown Effect Overlay */}
      {currentEffect && isFlashing && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
          <div
            className={`animate-bounce text-8xl font-bold ${
              currentEffect.color === 'green'
                ? 'text-green-500'
                : currentEffect.color === 'orange'
                ? 'text-orange-500'
                : 'text-red-500'
            }`}
          >
            {currentEffect.message}
          </div>
        </div>
      )}

      <div className={`container mx-auto max-w-6xl px-4 py-8 ${getFlashClasses()}`}>
        <HostHeader
          roomId={roomId!}
          connected={connected}
          currentRound={roomState.currentRound}
          totalRounds={roomState.totalRounds}
          phase={roomState.phase}
        />

        <HostTiebreakerPanel
          visible={roomState.phase === 'tiebreaker'}
          participants={tbParticipants}
          question={tbQuestion}
          winners={tbWinners}
          playerAnswers={tbPlayerAnswers}
          correctAnswer={tbCorrectAnswer}
          showReview={tbShowReview}
          playersInRoom={playersInRoom?.length ? playersInRoom : leaderboard}
          questionNumber={tbQuestionNumber}
          stillTied={tbStillTied}
        />

        {/* Activity Ticker */}
        <ActivityTicker activities={activities} onClearActivity={clearActivity} maxVisible={8} />

        {/* Round Info / Launch */}
        {(roomState.phase === 'waiting' || roomState.phase === 'launched') && (
          <HostRoundPreview
            currentRound={roomState.currentRound}
            totalRounds={roomState.totalRounds}
            config={config}
            roomPhase={roomState.phase}
            totalPlayers={roomState.totalPlayers || 0}
            onStartRound={handleStartRound}
          />
        )}

        {/* Speed Round Host Panel */}
        <SpeedRoundHostPanel
          roomId={roomId!}
          visible={roomState.phase === 'asking' && roundTypeId === 'speed_round'}
        />

        {/* Active Question */}
        {currentQuestion && roomState.phase === 'asking' && roundTypeId !== 'speed_round' && (
          <div className="bg-muted mb-6 rounded-xl border-2 border-blue-200 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <span>Current Question</span>
                </h3>
                {(currentQuestion.questionNumber && currentQuestion.totalQuestions) && (
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                    Question {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {currentQuestion.category && (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                    {currentQuestion.category}
                  </span>
                )}
                {currentQuestion.difficulty && (
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      currentQuestion.difficulty === 'easy'
                        ? 'bg-green-100 text-green-700'
                        : currentQuestion.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                )}
                {timeLeft !== null && (
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-orange-600" />
                    <span
                      className={`text-lg font-bold ${
                        timeLeft <= 10
                          ? 'animate-pulse text-red-600'
                          : timeLeft <= 30
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}
                    >
                      {timeLeft}s
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-fg mb-3 text-lg">{currentQuestion.text}</p>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {currentQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="bg-muted rounded border p-3 text-sm transition-colors hover:bg-gray-50"
                  >
                    <span className="text-fg/70 font-medium">
                      Option {String.fromCharCode(65 + idx)}:
                    </span>{' '}
                    {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Panel */}
        <ReviewPanel
          roomPhase={roomState.phase}
          currentRoundDef={currentRoundDef}
          reviewQuestion={reviewQuestion!}
          isLastQuestionOfRound={isLastQuestionOfRound()}
          reviewComplete={reviewComplete}
          onShowRoundResults={handleShowRoundResults}
          onNextReview={handleNextReview}
          roomId={roomId!}
        />

        {/* Round Stats (during round leaderboard) */}
        {roomState.phase === 'leaderboard' && isShowingRoundResults && hasRoundStats && currentRoundStats && (
          <RoundStatsDisplay roundStats={currentRoundStats} isVisible={true} />
        )}

        {/* Round Leaderboard */}
        {roomState.phase === 'leaderboard' && isShowingRoundResults && roundLeaderboard.length > 0 && (
          <RoundLeaderboardCard
            roundNumber={roomState.currentRound}
            leaderboard={roundLeaderboard}
            onContinue={handleContinueToOverallLeaderboard}
          />
        )}

        {/* Overall Leaderboard */}
        {roomState.phase === 'leaderboard' && !isShowingRoundResults && leaderboard.length > 0 && (
          <OverallLeaderboardCard
            leaderboard={leaderboard}
            isFinalRound={roomState.currentRound >= roomState.totalRounds}
            prizeCount={prizeCount}
            hasPrizeTie={hasPrizeTie}
            tieParticipants={tieParticipantsByName}
            onContinue={() => {
              // mid or final both use same server path (server decides)
              socket?.emit('next_round_or_end', { roomId });
            }}
            onConfirmTiebreaker={() => {
              socket?.emit('next_round_or_end', { roomId });
            }}
          />
        )}

      
     {/* ⤵️ Post-game content (complete + distributing) */}
<HostPostgamePanel
  phase={roomState.phase}
  leaderboard={leaderboard}
  totalPlayers={roomState.totalPlayers || 0}
  hasFinalStats={hasFinalStats}
  allRoundsStats={allRoundsStats}
  roomId={roomId!}
  paymentMethod={config?.paymentMethod}
  debug={debug}
  onReturnToDashboard={() =>
    navigate(`/quiz/host-dashboard/${roomId}?tab=prizes&lock=postgame`)
  }
  onEndGame={handleEndGame} 
/>
      </div>
    </div>
  );
};

// Wrapper that selects the chain and wraps HostControlsCore in the right provider
const HostControlsPage: React.FC = () => {
  const { config } = useQuizConfig();

  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center text-sm text-gray-600">Loading host controls…</div>
      </div>
    );
  }

  const selectedChain = (() => {
    const c = config?.web3Chain;
    if (c === 'stellar' || c === 'evm' || c === 'solana') return c;
    return null;
  })();

  if (!config?.isWeb3Room || !selectedChain) {
    return <HostControlsCore />;
  }

  return (
    <DynamicChainProvider selectedChain={selectedChain}>
      <HostControlsCore />
    </DynamicChainProvider>
  );
};

export default HostControlsPage;

