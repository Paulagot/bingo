// src/components/Quiz/game/QuizGamePlayPage.tsx
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import UseExtraModal from './UseExtraModal';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import RoundRouter from './RoundRouter';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { User, Question, LeaderboardEntry, RoomPhase, EnhancedPlayerStats } from '../types/quiz';
import { useRoundExtras } from '../hooks/useRoundExtras';
import { useAnswerSubmission } from '../hooks/useAnswerSubmission';
import LaunchedPhase from './LaunchedPhase';
import { useCountdownEffects } from '../hooks/useCountdownEffects';
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId, QuizConfig, RoundConfig } from '../types/quiz';
import EnhancedPlayerLeaderboard from './EnhancedPlayerLeaderboard';
import QuizCompletionCelebration from './QuizCompletionCelebration';
import RobinHoodRunner from './RobinHoodRunner';
import { useRobinHoodAnimation } from '../hooks/useRobinHoodAnimation';
import FreezeOverlay from './FreezeOverlay';
import TiebreakerRound from './TiebreakerRound';
import { useRouteChangeNotifier } from '../hooks/useRouteChangeNotifier';

type RoomPhaseWithTB = RoomPhase | 'tiebreaker';

const debug = true;

// ✅ helper to narrow server string into RoundTypeId
const asRoundTypeId = (s?: string): RoundTypeId | undefined =>
  s === 'general_trivia' || s === 'wipeout' || s === 'speed_round' ? s : undefined;

// ✅ types for notifications
type NotificationType = 'success' | 'warning' | 'info' | 'error';
interface Notification {
  id: number;
  type: NotificationType;
  message: string;
}

type ServerRoomState = {
  currentRound: number;
  totalRounds: number;
  roundTypeId: string;
  roundTypeName: string;
  totalPlayers: number;
  phase: RoomPhaseWithTB;
};

type TiebreakerQuestion = {
  id: string;
  text: string;
  timeLimit: number;
  questionStartTime?: number;
};

const QuizGamePlayPage = () => {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const { socket, connected } = useQuizSocket();
  const navigate = useNavigate();

  const [showFreezeOverlay, setShowFreezeOverlay] = useState(false);
  const [freezeOverlayTrigger, setFreezeOverlayTrigger] = useState(0);

  // ✅ notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const showNotification = (type: NotificationType, message: string) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications((prev) => prev.filter((n) => n.id !== id)), 4000);
  };

  const { robinHoodData, isAnimationActive, handleAnimationComplete } = useRobinHoodAnimation(socket);

  const selectedAnswerRef = useRef<string>('');
  const answerSubmittedRef = useRef<boolean>(false);

  if (!roomId || !playerId) {
    return (
      <div className="p-8 text-center">
        <h1 className="mb-4 text-2xl font-bold text-red-600">❌ Invalid Game URL</h1>
        <p className="text-fg/70">Missing room ID or player ID in URL.</p>
        <button
          onClick={() => navigate('/quiz')}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white"
        >
          Return to Quiz Home
        </button>
      </div>
    );
  }

  // question/game state
  const [question, setQuestion] = useState<Question | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  const getCurrentQuestionId = useCallback(() => {
    return question?.id ?? currentQuestionIdRef.current;
  }, [question]);

  // room/phase state
  const [phaseMessage, setPhaseMessage] = useState('Waiting for host to start the quiz...');
  const [roomPhase, setRoomPhase] = useState<RoomPhaseWithTB>('waiting');

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roundLeaderboard, setRoundLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isShowingRoundResults, setIsShowingRoundResults] = useState(false);
  const [currentRoundNumber, setCurrentRoundNumber] = useState(1);

  const currentQuestionIdRef = useRef<string | null>(null);
  const currentQuestionIndexRef = useRef<number>(-1);

  // server-driven room state
  const [serverRoomState, setServerRoomState] = useState<ServerRoomState>({
    currentRound: 1,
    totalRounds: 1,
    roundTypeId: '',
    roundTypeName: '',
    totalPlayers: 0,
    phase: 'waiting',
  });

  // position within round
  const [questionInRound, setQuestionInRound] = useState(1);
  const [totalInRound, setTotalInRound] = useState(1);

  // player/extras
  const { config } = useQuizConfig();
  const { players } = usePlayerStore();
  const thisPlayer = players.find((p) => p.id === playerId);
  const availableExtras = thisPlayer?.extras || [];
  const allPlayerExtras = thisPlayer?.extras || [];
  const [usedExtras, setUsedExtras] = useState<Record<string, boolean>>({});
  const [usedExtrasThisRound, setUsedExtrasThisRound] = useState<Record<string, boolean>>({});

  // players list + freeze state
  const [playersInRoom, setPlayersInRoom] = useState<User[]>([]);
  const playersRef = useRef<User[]>([]);
  useEffect(() => {
    playersRef.current = playersInRoom;
  }, [playersInRoom]);

  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenNotice, setFrozenNotice] = useState<string | null>(null);
  const frozenForIndexRef = useRef<number | null>(null);
  const frozenByRef = useRef<string | null>(null);

  const [enhancedStats, setEnhancedStats] = useState<EnhancedPlayerStats | null>(null);

  // --- TIEBREAKER (client-side) ---
  const [tbCorrectAnswer, setTbCorrectAnswer] = useState<number | undefined>();
  const [tbPlayerAnswers, setTbPlayerAnswers] = useState<Record<string, number>>({});
  const [tbShowReview, setTbShowReview] = useState(false);
  const [tbQuestionNumber, setTbQuestionNumber] = useState(1);
  const [tbParticipants, setTbParticipants] = useState<string[]>([]);
  const [tbQuestion, setTbQuestion] = useState<TiebreakerQuestion | null>(null);
  const [tbStillTied, setTbStillTied] = useState<string[]>([]);
  const [tbWinners, setTbWinners] = useState<string[] | null>(null);
  const isTieBreakerParticipant = useMemo(
    () => !!playerId && (tbParticipants || []).includes(playerId),
    [playerId, tbParticipants]
  );
  const [tbAnswer, setTbAnswer] = useState<string>('');
  const [tbHasSubmitted, setTbHasSubmitted] = useState(false);


  const currentRoundType = serverRoomState.roundTypeId;
  const isFrozenNow = isFrozen && frozenForIndexRef.current === currentQuestionIndexRef.current;

  // submit hook
  const { submitAnswer } = useAnswerSubmission({
    socket,
    roomId: roomId!,
    playerId: playerId!,
    getCurrentQuestionId,
    debug,
  });

  // auto-submit on countdown (legacy for non-speed rounds)
  const handleAutoSubmit = useCallback(() => {
    if (debug) console.log('[AutoSubmit] entry');
    const currentAnswer = selectedAnswerRef.current;
    const currentAnswerSubmitted = answerSubmittedRef.current;
    if (currentAnswerSubmitted) return;

    const questionToSubmit = question || { id: currentQuestionIdRef.current };
    if (!questionToSubmit?.id) return;

    setAnswerSubmitted(true);
    submitAnswer(currentAnswer || null, {
      autoTimeout: true,
      isFrozen: isFrozen,
      currentQuestionIndex: currentQuestionIndexRef.current,
      frozenForIndex: frozenForIndexRef.current,
    });
  }, [question, submitAnswer, isFrozen]);

  const { currentEffect, isFlashing, getFlashClasses } = useCountdownEffects(handleAutoSubmit);

  const { roundExtras } = useRoundExtras({
    allPlayerExtras,
    currentRoundType,
    usedExtras,
    debug,
  });

  // keep refs in sync
  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);
  useEffect(() => {
    answerSubmittedRef.current = answerSubmitted;
  }, [answerSubmitted]);

  // anti-cheat tab tracking (kept as-is)
// ✅ ADD: Debounced route change tracking
useRouteChangeNotifier({
  socket,
  roomId,
  playerId,
  routeName: 'play',
  debounceMs: 1000
});

// ✅ KEEP: Anti-cheat tab tracking (but WITHOUT route change emissions)
useEffect(() => {
  if (!roomId || !playerId) return;

  const tabId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem('quiz-play-tab-id', tabId);

  const ACTIVE_KEY = `quiz-active-play-${roomId}-${playerId}`;
  const ACTIVE_TS  = `quiz-active-play-time-${roomId}-${playerId}`;

  const existingTabId = localStorage.getItem(ACTIVE_KEY);
  if (existingTabId && existingTabId !== tabId) {
    showNotification('info', 'This tab is now active. Any other tab will be signed out.');
  }
  localStorage.setItem(ACTIVE_KEY, tabId);
  localStorage.setItem(ACTIVE_TS, String(Date.now()));

  const activityInterval = setInterval(() => {
    localStorage.setItem(ACTIVE_TS, String(Date.now()));
  }, 5000);

  const handleStorageChange = (e: StorageEvent) => {
    if (e.key === ACTIVE_KEY && e.newValue && e.newValue !== tabId) {
      showNotification('warning', 'Another tab took over this quiz. Returning to the waiting page.');
      navigate(`/quiz/game/${roomId}/${playerId}`);
    }
  };
  window.addEventListener('storage', handleStorageChange);

  return () => {
    clearInterval(activityInterval);
    window.removeEventListener('storage', handleStorageChange);

    const currentActiveTab = localStorage.getItem(ACTIVE_KEY);
    if (currentActiveTab === tabId) {
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(ACTIVE_TS);
    }
  };
}, [roomId, playerId, navigate, showNotification]); // ✅ Removed socket and connected from deps


// fast join + full snapshot in one ack (replaces verify→join→request flow)
useEffect(() => {
  if (!socket || !connected || !roomId || !playerId) return;

  setPhaseMessage('Reconnecting…');

 const knownPlayerName =
   (players.find(p => p.id === playerId)?.name) || undefined;

 socket.emit(
   'join_and_recover',
   {
     roomId,
     user: { id: playerId, ...(knownPlayerName ? { name: knownPlayerName } : {}) },
     role: 'player'
   },
   (res?: any) =>  {
     if (!res?.ok) {
  const msg = res?.error || 'Failed to join';
  console.error('[QuizGamePlayPage] join_and_recover failed:', res);

  if (msg.includes('Room not found')) {
    showNotification(
      'error',
      'This quiz room no longer exists or was closed by the host.'
    );
    navigate('/quiz'); // go back to quiz home, not site root
  } else if (msg.includes('Player not found')) {
    showNotification(
      'error',
      'We could not recover your player in this room. Returning to the waiting room.'
    );
    if (roomId && playerId) {
      navigate(`/quiz/game/${roomId}/${playerId}`);
    } else {
      navigate('/');
    }
  } else {
    // For transient / weird errors: show message but don't throw user out
    showNotification('error', msg);
  }
  return;
}


      const { snap } = res;

      // room + phase
      if (snap.roomState) {
        setServerRoomState(snap.roomState);
        setRoomPhase(snap.roomState.phase);
      }
      if (snap.players) setPlayersInRoom(snap.players);

      // asking (normal) or speed_round
      if (snap.question) {
        currentQuestionIdRef.current = snap.question.id;
        setQuestion(snap.question);
        setSelectedAnswer('');
        setAnswerSubmitted(false);
        setClue(null);
        setFeedback(null);
        setUsedExtrasThisRound({});
        if (snap.question.questionNumber && snap.question.totalQuestions) {
          setQuestionInRound(snap.question.questionNumber);
          setTotalInRound(snap.question.totalQuestions);
        }
        setTimerActive((snap.question.timeLimit || 0) > 0);
        setPhaseMessage('');
      }

      if (snap.playerRecovery) {
        const r = snap.playerRecovery;
        setAnswerSubmitted(r.hasAnswered);
        if (r.submittedAnswer) setSelectedAnswer(r.submittedAnswer);
        setIsFrozen(r.isFrozen);
        if (r.isFrozen && r.frozenBy) {
          const frozenByName =
            (snap.players || []).find((p: any) => p.id === r.frozenBy)?.name || 'Someone';
          setFrozenNotice(`❄️ ${frozenByName} froze you out!!!`);
          frozenForIndexRef.current = r.currentQuestionIndex;
          frozenByRef.current = r.frozenBy;
        }
        setUsedExtras(r.usedExtras || {});
        setUsedExtrasThisRound(r.usedExtrasThisRound || {});
        currentQuestionIndexRef.current = r.currentQuestionIndex;
      }

      if (snap.speed) setPhaseMessage(`Speed Round — ${snap.speed.remaining}s left`);

      // reviewing
      if (snap.review) {
        setQuestion({
          id: snap.review.id,
          text: snap.review.text,
          options: snap.review.options || [],
          timeLimit: 0,
          difficulty: snap.review.difficulty,
          category: snap.review.category,
        });
        setClue(null);
        setTimerActive(false);
        setSelectedAnswer(snap.review.submittedAnswer || '');
        setCorrectAnswer(snap.review.correctAnswer);
        setPhaseMessage('Reviewing previous question…');
      }

      // --- TIEBREAKER recovery ---
if (snap.roomState?.phase === 'tiebreaker' && snap.tb) {
  setRoomPhase('tiebreaker' as RoomPhaseWithTB);

  setTbParticipants(snap.tb.participants || []);
  setTbQuestionNumber(snap.tb.questionNumber || 1);

  // Clear all TB view flags, then set based on stage
  setTbShowReview(false);
  setTbCorrectAnswer(undefined);
  setTbPlayerAnswers({});
  setTbWinners(null);
  setTbStillTied([]);

if (snap.tb.stage === 'question' && snap.tb.question) {
  setTbQuestion({
    id: snap.tb.question.id,
    text: snap.tb.question.text,
    timeLimit: snap.tb.question.timeLimit,
    questionStartTime: snap.tb.question.questionStartTime
  });

  // 👇 NEW: if server says you already answered, lock UI and show the notice
  const submitted = snap.tb.question.submittedAnswer;
  if (submitted !== null && submitted !== undefined) {
    setTbAnswer(String(submitted));
    setTbHasSubmitted(true);
  } else {
    setTbHasSubmitted(false);
  }
}
 else if (snap.tb.stage === 'review' && snap.tb.review) {
    setTbQuestion(null);
    setTbShowReview(true);
    setTbCorrectAnswer(snap.tb.review.correctAnswer);
    setTbPlayerAnswers(snap.tb.review.playerAnswers || {});
    if (Array.isArray(snap.tb.review.winnerIds)) {
      setTbWinners(snap.tb.review.winnerIds);
      setTbStillTied([]);
    } else if (Array.isArray(snap.tb.review.stillTiedIds)) {
      setTbStillTied(snap.tb.review.stillTiedIds);
    }
  } else if (snap.tb.stage === 'result' && snap.tb.result) {
    setTbQuestion(null);
    setTbShowReview(true);
    setTbWinners(snap.tb.result.winnerIds || []);
  } else {
    // start stage, just show phase message
    setTbQuestion(null);
  }

  setPhaseMessage('');
}


      // leaderboard / round results
      if (snap.roundLeaderboard) {
        setRoundLeaderboard(snap.roundLeaderboard);
        setIsShowingRoundResults(true);
        setCurrentRoundNumber(snap.roomState?.currentRound || 1);
      } else if (snap.leaderboard) {
        setLeaderboard(snap.leaderboard);
        setIsShowingRoundResults(false);
      }

      setShowFreezeOverlay(false);
    }
  );
}, [socket, connected, roomId, playerId]);

 

  // socket handlers (registered once; use refs to access latest state)
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) return;

    const handleQuestion = (data: any) => {
      currentQuestionIdRef.current = data.id;

      if (debug)
        console.log('[Client] Question:', {
          id: data.id,
          timeLimit: data.timeLimit,
          questionStartTime: data.questionStartTime,
          currentTime: Date.now(),
        });

      if (typeof data.currentQuestionIndex === 'number') {
        currentQuestionIndexRef.current = data.currentQuestionIndex;
      }

      const questionIndex =
        typeof data.currentQuestionIndex === 'number'
          ? data.currentQuestionIndex
          : currentQuestionIndexRef.current;

      // Clear freeze state if different question index
      if (frozenForIndexRef.current !== null && frozenForIndexRef.current !== questionIndex) {
        setIsFrozen(false);
        setFrozenNotice(null);
        setShowFreezeOverlay(false);
      }

      setQuestion({
        ...data,
        questionStartTime: data.questionStartTime,
        timeLimit: data.timeLimit,
      });

      setSelectedAnswer('');
      selectedAnswerRef.current = '';
      setAnswerSubmitted(false);
      answerSubmittedRef.current = false;

      setClue(null);
      setFeedback(null);
      setUsedExtrasThisRound({});

      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
      }

      setTimerActive(true);
      setPhaseMessage('');
    };

    // SPEED ROUND: per-player question (no per-question timer)
    const handleSpeedQuestion = (data: { id: number | string; text: string; options: string[] }) => {
      const qid = String(data.id);
      currentQuestionIdRef.current = qid;

      setQuestion({
        id: qid,
        text: data.text,
        options: Array.isArray(data.options) ? data.options.slice(0, 2) : [],
        timeLimit: 0,
        questionStartTime: Date.now(),
      });

      setSelectedAnswer('');
      selectedAnswerRef.current = '';
      setAnswerSubmitted(false);
      answerSubmittedRef.current = false;

      setTimerActive(false);
      setClue(null);
      setFeedback(null);
      setUsedExtrasThisRound({});
    };

    // SPEED ROUND: global 90s countdown
    const handleRoundTimeRemaining = ({ remaining }: { remaining: number }) => {
      setPhaseMessage(`Speed Round — ${remaining}s left`);
    };

    const handleReviewQuestion = (data: any) => {
      if (debug) console.log('[Client] review question:', data);

      setQuestion({
        id: data.id,
        text: data.text,
        options: data.options || [],
        timeLimit: 0,
        difficulty: data.difficulty,
        category: data.category,
      });

      setClue(null);
      setTimerActive(false);
      setSelectedAnswer(data.submittedAnswer || '');
      setCorrectAnswer(data.correctAnswer);

      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
      }

      const hasAnswered = data.submittedAnswer !== null && data.submittedAnswer !== undefined;
      const isCorrect = hasAnswered && data.submittedAnswer === data.correctAnswer;

      const currentRoundDef = configRef.current?.roundDefinitions?.[serverRoomState.currentRound - 1];
      const roundType = asRoundTypeId(serverRoomState.roundTypeId) as RoundTypeId | undefined;
      const roundMeta = roundType ? roundTypeDefinitions[roundType] : undefined;

      const roundConfig: Partial<RoundConfig> = currentRoundDef?.config || {};
      const defaultConfig: Partial<RoundConfig> = roundMeta?.defaultConfig || {};

      const pointsPerDifficulty =
        roundConfig.pointsPerDifficulty || defaultConfig.pointsPerDifficulty || {};
      const pointsLostPerWrong =
        roundConfig.pointsLostPerWrong ?? defaultConfig.pointsLostPerWrong ?? 0;
      const pointsLostPerUnanswered =
        roundConfig.pointsLostPerUnanswered ?? defaultConfig.pointsLostPerUnanswered ?? 0;

      const diffKey = (data.difficulty || 'medium') as keyof typeof pointsPerDifficulty;
      const pointsIfCorrect = (pointsPerDifficulty as any)[diffKey] ?? 2;

      let pointsEarned = 0;
      if (!hasAnswered) pointsEarned = -pointsLostPerUnanswered;
      else if (isCorrect) pointsEarned = pointsIfCorrect;
      else pointsEarned = -pointsLostPerWrong;

      let feedbackMessage = '';
      if (!hasAnswered) {
        feedbackMessage =
          pointsLostPerUnanswered > 0
            ? `❌ You didn't answer. -${pointsLostPerUnanswered} points. Correct Answer: ${data.correctAnswer}`
            : `❌ You didn't answer. No penalty. Correct Answer: ${data.correctAnswer}`;
      } else if (isCorrect) {
        feedbackMessage = `✅ Correct! +${pointsEarned} points`;
      } else {
        feedbackMessage = `❌ Incorrect. ${pointsEarned} points. Correct Answer: ${data.correctAnswer}`;
      }

      setFeedback(feedbackMessage);
      setPhaseMessage('Reviewing previous question...');
    };

    const handleClue = ({ clue }: { clue: string }) => {
      if (debug) console.log('[Client] clue:', clue);
      setClue(clue);
    };

    const handleAnswerReveal = ({ correctAnswer, playerResult }: any) => {
      if (debug) console.log('[Client] reveal:', correctAnswer, playerResult);
      setFeedback(playerResult?.correct ? '✅ Correct!' : '❌ Incorrect.');
      setTimerActive(false);
    };

    const handleFreezeNotice = ({
      frozenBy,
      frozenForQuestionIndex,
    }: {
      frozenBy: string;
      frozenForQuestionIndex: number;
      message?: string;
    }) => {
      const frozenByName =
        playersRef.current.find((p) => p.id === frozenBy)?.name || 'Someone';
      frozenByRef.current = frozenBy;
      frozenForIndexRef.current = frozenForQuestionIndex;

      setIsFrozen(true);
      setFrozenNotice(`❄️ ${frozenByName} froze you out!!!`);

      setShowFreezeOverlay(true);
      setFreezeOverlayTrigger((prev) => prev + 1);

      if (debug)
        console.log('[Client] freeze notice:', {
          frozenBy: frozenByName,
          frozenForQuestionIndex,
          currentQuestionIndex: currentQuestionIndexRef.current,
        });
    };

    const handleRoomState = (data: ServerRoomState) => {
      if (debug) console.log('[Client] room_state:', data);

      const previousRound = serverRoomState.currentRound;

      if (data.phase === 'reviewing' && roomPhase !== 'reviewing') {
        setIsFrozen(false);
        setFrozenNotice(null);
        setShowFreezeOverlay(false);
        frozenForIndexRef.current = null;
        frozenByRef.current = null;
      }

      if (data.currentRound !== previousRound && data.phase) {
        currentQuestionIndexRef.current = -1;
        setIsShowingRoundResults(false);
        setRoundLeaderboard([]);
      }

      setRoomPhase(data.phase as RoomPhaseWithTB);
      setServerRoomState(data);
    };

    const handleRoundLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) console.log('[Client] round leaderboard:', data);
      setRoundLeaderboard(data);
      setIsShowingRoundResults(true);
      setCurrentRoundNumber(serverRoomState.currentRound);
    };

    const handleLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) console.log('[Client] overall leaderboard:', data);
      setLeaderboard(data);
      setIsShowingRoundResults(false);
    };

    const handleRoundEnd = ({ round }: { round: number }) => {
      if (debug) console.log('[Client] round_end:', round);
      setPhaseMessage(`Round ${round} complete. Waiting for next round...`);
      setQuestion(null);
      setTimerActive(false);
      setIsFrozen(false);
      setFrozenNotice(null);
      setShowFreezeOverlay(false);
    };

    const handleNextRound = ({ round }: { round: number }) => {
      if (debug) console.log('[Client] next_round_starting:', round);
      setPhaseMessage(`Starting Round ${round}...`);
      setIsFrozen(false);
      setFrozenNotice(null);
      setShowFreezeOverlay(false);
    };

    const handleQuizEnd = ({ message }: { message: string }) => {
      if (debug) console.log('[Client] quiz_end:', message);
      setPhaseMessage(message);
      setQuestion(null);
      setTimerActive(false);
    };

    const handlePlayerListUpdated = ({ players }: { players: User[] }) => {
      setPlayersInRoom(players);
    };

    const handleExtraUsedSuccessfully = ({ extraId }: { extraId: string }) => {
      if (debug) console.log('[Client] extra used:', extraId);
      if (extraId !== 'restorePoints') {
        setUsedExtras((prev) => ({ ...prev, [extraId]: true }));
        setUsedExtrasThisRound((prev) => ({ ...prev, [extraId]: true }));
      }
    };

  const handleQuizError = ({ message }: { message: string }) => {
  if (debug) console.error('[Client] quiz_error:', message);

  if (message.includes('Room not found') || message.includes('Player not found')) {
    showNotification('error', message);
    navigate('/quiz/game');
    return;
  }
  // stay on page for other errors (multi-tab, etc.)
  showNotification('error', message);
};


    const handleQuizNotification = ({ type, message }: { type: NotificationType; message: string }) => {
      if (debug) console.log('[Client] notification:', type, message);
      showNotification(type, message);
    };

    const handleQuizCancelled = ({ message }: { message: string }) => {
      if (debug) console.log('[Client] cancelled:', message);
      showNotification('warning', `⚠️ ${message} - Redirecting to waiting page...`);
      setTimeout(() => navigate(`/quiz/game/${roomId}/${playerId}`), 1500);
    };

    const handlePlayerStateRecovery = (data: {
      hasAnswered: boolean;
      isFrozen: boolean;
      frozenBy: string | null;
      usedExtras: Record<string, boolean>;
      usedExtrasThisRound: Record<string, boolean>;
      remainingTime: number;
      currentQuestionIndex: number;
      submittedAnswer: string | null;
    }) => {
      if (debug) console.log('[Client] state_recovery:', data);

      setAnswerSubmitted(data.hasAnswered);
      if (data.submittedAnswer) setSelectedAnswer(data.submittedAnswer);

      setIsFrozen(data.isFrozen);
      if (data.isFrozen && data.frozenBy) {
        const frozenByName =
          playersRef.current.find((p) => p.id === data.frozenBy)?.name || 'Someone';
        setFrozenNotice(`❄️ ${frozenByName} froze you out!!!`);
        frozenForIndexRef.current = data.currentQuestionIndex;
        frozenByRef.current = data.frozenBy;
      }

      setUsedExtras(data.usedExtras);
      setUsedExtrasThisRound(data.usedExtrasThisRound);
      currentQuestionIndexRef.current = data.currentQuestionIndex;
    };

    const handleEnhancedPlayerStats = (data: EnhancedPlayerStats) => {
      if (debug) console.log('[Client] enhanced stats:', data);
      setEnhancedStats(data);
    };

    // --- TIEBREAKER handlers ---
    const handleTbStart = ({ participants, mode }: { participants: string[]; mode: string }) => {
      if (debug) console.log('[Client] tiebreak:start', { participants, mode });
      setRoomPhase('tiebreaker' as RoomPhaseWithTB);

      setTbParticipants(participants);
      setTbQuestion(null);
      setTbStillTied([]);
      setTbWinners(null);
      setPhaseMessage('Tie-breaker in progress…');
    };

 const handleTbQuestion = (q: {
   id: string;
   text: string;
   type: 'numeric';
   timeLimit: number;
   questionStartTime: number;
   submittedAnswer?: number | null; // present in join_and_recover
 }) => {
   if (debug) console.log('[Client] tiebreak:question', q);
   setRoomPhase('tiebreaker' as RoomPhaseWithTB);
   setTbQuestion({ id: q.id, text: q.text, timeLimit: q.timeLimit, questionStartTime: q.questionStartTime });
   setTbAnswer('');
 setTbShowReview(false);
  setTbHasSubmitted(false);
  if (q.submittedAnswer !== null && q.submittedAnswer !== undefined) {
    setTbHasSubmitted(true);
    setTbAnswer(String(q.submittedAnswer));
  } else {
    setTbHasSubmitted(false);
 }
   setPhaseMessage('');
 };


   const handleTbReview = (data: { correctAnswer: number; playerAnswers: Record<string, number>; winnerIds?: string[]; stillTiedIds?: string[]; questionText: string; isFinalAnswer: boolean; }) => {
  if (debug) console.log('[Client] tiebreak:review', data);
  setRoomPhase('tiebreaker' as RoomPhaseWithTB);
  setTbCorrectAnswer(data.correctAnswer);
  setTbPlayerAnswers(data.playerAnswers);
  setTbShowReview(true);

  // 👇 Optional: if we see our id in answers, mark submitted
  if (playerId && Object.prototype.hasOwnProperty.call(data.playerAnswers, playerId)) {
    setTbHasSubmitted(true);
    setTbAnswer(String(data.playerAnswers[playerId] ?? ''));
  }

  if (data.winnerIds) setTbWinners(data.winnerIds);
  else if (data.stillTiedIds) setTbStillTied(data.stillTiedIds);
};


    const handleTbTieAgain = ({ stillTiedIds }: { stillTiedIds: string[] }) => {
      if (debug) console.log('[Client] tiebreak:tie_again', stillTiedIds);
      setTbStillTied(stillTiedIds);
      setTbParticipants(stillTiedIds);
      setTbAnswer('');
      setTbShowReview(false);
      setTbQuestionNumber((prev) => prev + 1);
    };

    const handleTbResult = ({ winnerIds }: { winnerIds: string[] }) => {
      if (debug) console.log('[Client] tiebreak:result', winnerIds);
      setTbWinners(winnerIds);
      setPhaseMessage('Tie-breaker resolved. Finalizing results…');
    };

    // register
    socket.on('tiebreak:review', handleTbReview);
    socket.on('tiebreak:start', handleTbStart);
    socket.on('tiebreak:question', handleTbQuestion);
    socket.on('tiebreak:tie_again', handleTbTieAgain);
    socket.on('tiebreak:result', handleTbResult);

    socket.on('question', handleQuestion);
    socket.on('review_question', handleReviewQuestion);
    socket.on('clue_revealed', handleClue);
    socket.on('answer_reveal', handleAnswerReveal);
    socket.on('freeze_notice', handleFreezeNotice);
    socket.on('round_end', handleRoundEnd);
    socket.on('next_round_starting', handleNextRound);
    socket.on('quiz_end', handleQuizEnd);
    socket.on('player_list_updated', handlePlayerListUpdated);
    socket.on('extra_used_successfully', handleExtraUsedSuccessfully);
    socket.on('quiz_error', handleQuizError);
    socket.on('room_state', handleRoomState);
    socket.on('leaderboard', handleLeaderboard);
    socket.on('round_leaderboard', handleRoundLeaderboard);
    socket.on('quiz_notification', handleQuizNotification);
    socket.on('player_state_recovery', handlePlayerStateRecovery);
    socket.on('quiz_cancelled', handleQuizCancelled);
    socket.on('enhanced_player_stats', handleEnhancedPlayerStats);
    socket.on('speed_question', handleSpeedQuestion);
    socket.on('round_time_remaining', handleRoundTimeRemaining);

    return () => {
      socket.off('tiebreak:review', handleTbReview);
      socket.off('tiebreak:start', handleTbStart);
      socket.off('tiebreak:question', handleTbQuestion);
      socket.off('tiebreak:tie_again', handleTbTieAgain);
      socket.off('tiebreak:result', handleTbResult);

      socket.off('question', handleQuestion);
      socket.off('review_question', handleReviewQuestion);
      socket.off('clue_revealed', handleClue);
      socket.off('answer_reveal', handleAnswerReveal);
      socket.off('freeze_notice', handleFreezeNotice);
      socket.off('round_end', handleRoundEnd);
      socket.off('next_round_starting', handleNextRound);
      socket.off('quiz_end', handleQuizEnd);
      socket.off('player_list_updated', handlePlayerListUpdated);
      socket.off('extra_used_successfully', handleExtraUsedSuccessfully);
      socket.off('quiz_error', handleQuizError);
      socket.off('room_state', handleRoomState);
      socket.off('leaderboard', handleLeaderboard);
      socket.off('round_leaderboard', handleRoundLeaderboard);
      socket.off('quiz_notification', handleQuizNotification);
      socket.off('player_state_recovery', handlePlayerStateRecovery);
      socket.off('quiz_cancelled', handleQuizCancelled);
      socket.off('enhanced_player_stats', handleEnhancedPlayerStats);
      socket.off('speed_question', handleSpeedQuestion);
      socket.off('round_time_remaining', handleRoundTimeRemaining);
    };
  }, [socket, connected, roomId, playerId, navigate, roomPhase, serverRoomState.currentRound]);

  const handleUseExtra = (extraId: string, targetPlayerId?: string) => {
    if (!socket || !roomId || !playerId) return;

    if (usedExtras[extraId]) {
      showNotification('warning', `You have already used ${extraId}`);
      return;
    }

    if (extraId === 'buyHint') {
      socket.emit('use_extra', { roomId, playerId, extraId: 'buyHint' });
    } else if (extraId === 'freezeOutTeam') {
      if (targetPlayerId) {
        socket.emit('use_extra', { roomId, playerId, extraId: 'freezeOutTeam', targetPlayerId });
        setFreezeModalOpen(false);
      } else {
        setFreezeModalOpen(true);
      }
    } else if (extraId === 'robPoints') {
      if (!targetPlayerId) return;
      socket.emit('use_extra', { roomId, playerId, extraId: 'robPoints', targetPlayerId });
    } else {
      socket.emit('use_extra', { roomId, playerId, extraId, targetPlayerId });
    }
  };

  const getMaxRestorePointsFromConfig = (cfg: any): number =>
    cfg?.fundraisingOptions?.restorePoints?.totalRestorePoints ??
    fundraisingExtraDefinitions.restorePoints?.totalRestorePoints ??
    3;

  const handleFreezeOverlayComplete = () => {
    setShowFreezeOverlay(false);
  };

  const handleFreezeConfirm = (targetPlayerId: string) => {
    if (!socket || !roomId || !playerId || !targetPlayerId) return;
    socket.emit('use_extra', { roomId, playerId, extraId: 'freezeOutTeam', targetPlayerId });
    setFreezeModalOpen(false);
  };

  const timeLeft = null; // server-managed timers

  const getCurrentRoundDefinition = () => {
    return config?.roundDefinitions?.[serverRoomState.currentRound - 1];
  };

  // ✅ safe config for completion component
  const safeConfig: QuizConfig = {
    hostName: config?.hostName ?? 'Host',
    hostId: config?.hostId ?? 'host',
    gameType: config?.gameType ?? 'standard',
    teamBased: config?.teamBased ?? false,
    roundCount: config?.roundCount ?? 1,
    timePerQuestion: config?.timePerQuestion ?? 0,
    useMedia: config?.useMedia ?? false,
    entryFee: config?.entryFee ?? '0',
    paymentMethod: config?.paymentMethod ?? 'cash_or_revolut',
    fundraisingOptions: config?.fundraisingOptions ?? {},
    fundraisingPrices: config?.fundraisingPrices ?? {},
    roundDefinitions: config?.roundDefinitions ?? [],
    questions: config?.questions ?? [],
    selectedTemplate: config?.selectedTemplate,
    isCustomQuiz: config?.isCustomQuiz,
    skipRoundConfiguration: config?.skipRoundConfiguration,
    prizeMode: config?.prizeMode,
    prizeSplits: config?.prizeSplits,
    prizes: config?.prizes,
    startTime: config?.startTime,
    roomId: config?.roomId,
    currencySymbol: config?.currencySymbol,
    totalTimeSeconds: config?.totalTimeSeconds,
    web3Chain: config?.web3Chain,
    web3Currency: config?.web3Currency,
    web3Charity: config?.web3Charity,
    web3PrizeSplit: config?.web3PrizeSplit,
    hostWallet: config?.hostWallet,
    eventDateTime: config?.eventDateTime,
    timeZone: config?.timeZone,
    web3ContractAddress: config?.web3ContractAddress,
    web3ChainConfirmed: config?.web3ChainConfirmed,
    hostWalletConfirmed: config?.hostWalletConfirmed,
    contractAddress: config?.contractAddress,
    deploymentTxHash: config?.deploymentTxHash,
    sponsors: config?.sponsors,
    completionMessage: config?.completionMessage,
    theme: config?.theme,
    roomCaps: config?.roomCaps,
    isWeb3Room: config?.isWeb3Room,
    reconciliation: config?.reconciliation,
  };

const submitTieBreaker = useCallback(() => {
  if (!socket || !roomId) return;
  const num = Number(tbAnswer);
  if (!Number.isFinite(num)) return;
  socket.emit('tiebreak:answer', { roomId, answer: num });
  setTbHasSubmitted(true); // 👈 mark as submitted locally
}, [socket, roomId, tbAnswer]);


  return (
    <div className={`p-8 ${getFlashClasses()}`}>
      {roomPhase === 'tiebreaker' ? (
        <TiebreakerRound
          question={tbQuestion}
          isTieBreakerParticipant={isTieBreakerParticipant}
          tbParticipants={tbParticipants}
          tbStillTied={tbStillTied}
          tbWinners={tbWinners}
          tbAnswer={tbAnswer}
          setTbAnswer={setTbAnswer}
          submitTieBreaker={submitTieBreaker}
          currentRound={serverRoomState.currentRound}
          timerActive={timerActive}
          correctAnswer={tbCorrectAnswer}
          showReview={tbShowReview}
          playerAnswers={tbPlayerAnswers}
          playersInRoom={playersInRoom}
          questionNumber={tbQuestionNumber}
          hasSubmitted={tbHasSubmitted} 
          onAutoSubmit={() => {
            if (tbAnswer.trim()) submitTieBreaker();
          }}
        />
      ) : null}

      {roomPhase === 'complete' ? (
        <QuizCompletionCelebration
          leaderboard={leaderboard}
          config={safeConfig}
          playerId={playerId || ''}
          roomId={roomId || ''}
          enhancedStats={enhancedStats}
          onShareResults={() => {
            const score = leaderboard.find((p) => p.id === playerId)?.score ?? 0;
            const shareText = `I just completed a quiz and scored ${score} points! 🎯`;
            if (navigator.share) {
              navigator.share({ text: shareText });
            } else {
              navigator.clipboard.writeText(shareText);
              showNotification('success', 'Results copied to clipboard!');
            }
          }}
          onReturnToHome={() => navigate('/')}
        />
      ) : (
        <>
          {/* countdown overlay */}
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

          {/* toasts */}
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className={`fixed right-4 top-20 z-40 rounded-lg p-4 shadow-lg transition-all duration-300 ${
                n.type === 'success'
                  ? 'bg-green-500 text-white'
                  : n.type === 'warning'
                  ? 'bg-orange-500 text-white'
                  : n.type === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
              style={{ marginTop: `${i * 80}px` }}
            >
              <div className="flex items-center justify-between">
                <span className="pr-4">
                  {n.type === 'success' ? '✅' : n.type === 'warning' ? '⚠️' : n.type === 'error' ? '❌' : 'ℹ️'}{' '}
                  {n.message}
                </span>
                <button
                  onClick={() => setNotifications((prev) => prev.filter((x) => x.id !== n.id))}
                  className="ml-2 text-lg font-bold text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* main content switching */}
          {roomPhase === 'launched' || (roomPhase === 'waiting' && serverRoomState.currentRound > 1) ? (
            <LaunchedPhase
              currentRound={serverRoomState.currentRound}
              config={config}
              totalPlayers={serverRoomState.totalPlayers}
              playerId={playerId || ''}
              playerExtras={thisPlayer?.extras || []}
              roomPhase={roomPhase}
            />
          ) : roomPhase === 'leaderboard' ? (
            isShowingRoundResults && roundLeaderboard.length > 0 ? (
              <EnhancedPlayerLeaderboard
                leaderboard={roundLeaderboard}
                availableExtras={availableExtras}
                usedExtras={usedExtras}
                onUseExtra={handleUseExtra}
                currentPlayerId={playerId || ''}
                cumulativeNegativePoints={
                  roundLeaderboard.find((p) => p.id === playerId)?.cumulativeNegativePoints || 0
                }
                pointsRestored={roundLeaderboard.find((p) => p.id === playerId)?.pointsRestored || 0}
                isRoundResults={true}
                currentRound={currentRoundNumber}
                maxRestorePoints={getMaxRestorePointsFromConfig(config)}
              />
            ) : leaderboard.length > 0 ? (
              <EnhancedPlayerLeaderboard
                leaderboard={leaderboard}
                availableExtras={availableExtras}
                usedExtras={usedExtras}
                onUseExtra={handleUseExtra}
                currentPlayerId={playerId || ''}
                cumulativeNegativePoints={leaderboard.find((p) => p.id === playerId)?.cumulativeNegativePoints || 0}
                pointsRestored={leaderboard.find((p) => p.id === playerId)?.pointsRestored || 0}
                isRoundResults={false}
                maxRestorePoints={getMaxRestorePointsFromConfig(config)}
              />
            ) : (
              <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">Calculating leaderboard...</div>
            )
          ) : (roomPhase === 'reviewing' || roomPhase === 'asking') && question ? (
            <div>
              <RoundRouter
                currentRound={serverRoomState.currentRound}
                roomPhase={roomPhase}
                currentRoundType={asRoundTypeId(serverRoomState.roundTypeId)}
                question={question}
                timeLeft={timeLeft}
                timerActive={timerActive && !answerSubmitted}
                selectedAnswer={selectedAnswer}
                setSelectedAnswer={setSelectedAnswer}
                answerSubmitted={answerSubmitted}
                clue={clue}
                feedback={feedback}
                correctAnswer={correctAnswer ?? undefined}
                isFrozen={isFrozenNow}
                frozenNotice={frozenNotice}
                // ✅ instant submit for speed_round
                onSubmit={(ans?: string) => {
                  if (serverRoomState.roundTypeId === 'speed_round') {
                    setSelectedAnswer(ans ?? '');
                    setAnswerSubmitted(true);
                    socket?.emit('submit_speed_answer', {
                      roomId,
                      playerId,
                      questionId: getCurrentQuestionId(),
                      answer: ans ?? null,
                    });
                  } else {
                    // other rounds: timer-based flow
                  }
                }}
                roomId={roomId!}
                playerId={playerId!}
                roundExtras={roundExtras}
                usedExtras={usedExtras}
                usedExtrasThisRound={usedExtrasThisRound}
                onUseExtra={handleUseExtra}
                questionNumber={questionInRound}
                totalQuestions={totalInRound}
                difficulty={getCurrentRoundDefinition()?.difficulty}
                category={getCurrentRoundDefinition()?.category}
                isHost={false}
                playersInRoom={playersInRoom}
                isFlashing={isFlashing}
  currentEffect={currentEffect}
  getFlashClasses={getFlashClasses}
              />
            </div>
          ) : (
            <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">{phaseMessage}</div>
          )}

          <UseExtraModal
            visible={freezeModalOpen}
            players={playersInRoom.filter((p) => p.id !== playerId)}
            onCancel={() => setFreezeModalOpen(false)}
            onConfirm={handleFreezeConfirm}
          />
        </>
      )}

      {/* robin hood overlay */}
      {robinHoodData && (
        <RobinHoodRunner
          isActive={isAnimationActive}
          onComplete={handleAnimationComplete}
          stolenPoints={robinHoodData.stolenPoints}
          fromTeam={robinHoodData.fromTeam}
          toTeam={robinHoodData.toTeam}
        />
      )}

      {/* freeze overlay */}
      <FreezeOverlay
        key={freezeOverlayTrigger}
        isActive={showFreezeOverlay}
        frozenBy={playersRef.current.find((p) => p.id === frozenByRef.current)?.name || 'Someone'}
        onAnimationComplete={handleFreezeOverlayComplete}
        targetElement=".quiz-content, .round-router, [data-testid='question-card']"
      />
    </div>
  );
};

export default QuizGamePlayPage;















