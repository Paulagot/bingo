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

// Allow the new tiebreaker phase locally without touching the global type
type RoomPhaseWithTB = RoomPhase | 'tiebreaker';


const debug = true; // Set to true to enable debug logs

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

  const { robinHoodData, isAnimationActive, handleAnimationComplete } = useRobinHoodAnimation(socket);

  const selectedAnswerRef = useRef<string>('');
  const answerSubmittedRef = useRef<boolean>(false);

  // Validate params
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

  // notifications helper
  const showNotification = (type: NotificationType, message: string) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  // question/game state
  const [question, setQuestion] = useState<Question | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const getCurrentQuestionId = useCallback(() => {
    return question?.id ?? currentQuestionIdRef.current;
  }, [question]);

  // room/phase state
  const [phaseMessage, setPhaseMessage] = useState('Waiting for host to start the quiz...');
 const [roomPhase, setRoomPhase] = useState<RoomPhaseWithTB>('waiting');

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // round leaderboard state
  const [roundLeaderboard, setRoundLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isShowingRoundResults, setIsShowingRoundResults] = useState(false);
  const [currentRoundNumber, setCurrentRoundNumber] = useState(1);

  const currentQuestionIdRef = useRef<string | null>(null);

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
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenNotice, setFrozenNotice] = useState<string | null>(null);

  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
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

  // refs
  const currentQuestionIndexRef = useRef<number>(-1);
  const frozenForIndexRef = useRef<number | null>(null);
  const frozenByRef = useRef<string | null>(null);

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

  // debug
  // const debugInfo = useMemo(
  //   () => ({
  //     playerId,
  //     availableExtras,
  //     serverRoomState,
  //     currentRoundType,
  //     questionCounterDisplay,
  //   }),
  //   [playerId, availableExtras, serverRoomState, currentRoundType, questionCounterDisplay]
  // );
  // if (debug) console.log('[QuizGamePlayPage] Debug Info:', debugInfo);

  // keep refs in sync
  useEffect(() => {
    selectedAnswerRef.current = selectedAnswer;
  }, [selectedAnswer]);
  useEffect(() => {
    answerSubmittedRef.current = answerSubmitted;
  }, [answerSubmitted]);

  // anti-cheat tab tracking
  useEffect(() => {
    if (!roomId || !playerId) return;

    const tabId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('quiz-play-tab-id', tabId);

    const existingTabId = localStorage.getItem(`quiz-active-play-${roomId}-${playerId}`);
    const lastActiveTime = localStorage.getItem(`quiz-active-play-time-${roomId}-${playerId}`);

    if (existingTabId && existingTabId !== tabId) {
      const now = Date.now();
      const lastActive = lastActiveTime ? parseInt(lastActiveTime) : 0;
      const timeSinceLastActive = now - lastActive;

      if (timeSinceLastActive < 10000) {
        showNotification('error', 'This quiz is already open in another browser tab! Please close the other tab first.');
        navigate(`/quiz/game/${roomId}/${playerId}`);
        return;
      }
    }

    localStorage.setItem(`quiz-active-play-${roomId}-${playerId}`, tabId);
    localStorage.setItem(`quiz-active-play-time-${roomId}-${playerId}`, Date.now().toString());

    const activityInterval = setInterval(() => {
      localStorage.setItem(`quiz-active-play-time-${roomId}-${playerId}`, Date.now().toString());
    }, 5000);

    if (socket && connected) {
      socket.emit('player_route_change', {
        roomId,
        playerId: playerId,
        route: 'play',
        entering: true,
      });
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `quiz-active-play-${roomId}-${playerId}` && e.newValue !== tabId) {
        const newTimestamp = localStorage.getItem(`quiz-active-play-time-${roomId}-${playerId}`);
        if (newTimestamp && Date.now() - parseInt(newTimestamp) < 10000) {
          showNotification('warning', 'Quiz opened in another tab. This tab will return to the waiting page.');
          navigate(`/quiz/game/${roomId}/${playerId}`);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('storage', handleStorageChange);

      const currentActiveTab = localStorage.getItem(`quiz-active-play-${roomId}-${playerId}`);
      if (currentActiveTab === tabId) {
        localStorage.removeItem(`quiz-active-play-${roomId}-${playerId}`);
        localStorage.removeItem(`quiz-active-play-time-${roomId}-${playerId}`);
      }

      if (socket) {
        socket.emit('player_route_change', {
          roomId,
          playerId: playerId,
          route: 'play',
          entering: false,
        });
      }
    };
  }, [roomId, playerId, socket, connected, navigate]);

  // join room and request state
  useEffect(() => {
    if (!socket || !connected) return;

    if (debug) console.log('[Client] joining room:', roomId);

    socket.emit('join_quiz_room', {
      roomId,
      user: { id: playerId, name: 'Player ' + playerId },
      role: 'player',
    });

    setTimeout(() => {
      socket.emit('request_current_state', { roomId, playerId: playerId });
      if (debug) console.log('[Client] requested current state');
    }, 100);
  }, [socket, connected, roomId, playerId]);

  // socket handlers
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) return;

const handleQuestion = (data: any) => {
  currentQuestionIdRef.current = data.id;

  if (debug) console.log('[Client] Question:', {
    id: data.id,
    timeLimit: data.timeLimit,
    questionStartTime: data.questionStartTime,
    currentTime: Date.now(),
  });

  if (data.currentQuestionIndex !== undefined) {
    currentQuestionIndexRef.current = data.currentQuestionIndex;
  }

  const questionIndex =
    data.currentQuestionIndex !== undefined
      ? data.currentQuestionIndex
      : currentQuestionIndexRef.current;

  // Clear freeze state if this is a different question index
  if (frozenForIndexRef.current !== null && frozenForIndexRef.current !== questionIndex) {
    setIsFrozen(false);
    setFrozenNotice(null);
    setShowFreezeOverlay(false); // Clear freeze overlay on question change
  }

  currentQuestionIdRef.current = data.id;

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
// SPEED ROUND: per-player question (no per-question timer)
const handleSpeedQuestion = (data: { id: number | string; text: string; options: string[] }) => {
  // ✅ store as string to satisfy your refs/types
  const qid = String(data.id);
  currentQuestionIdRef.current = qid;

  setQuestion({
    id: qid, // ✅ keep Question.id as string
    text: data.text,
    options: Array.isArray(data.options) ? data.options.slice(0, 2) : [],
    timeLimit: 0,
    questionStartTime: Date.now(),
  });

  // reset local answer state
  setSelectedAnswer('');
  selectedAnswerRef.current = '';
  setAnswerSubmitted(false);
  answerSubmittedRef.current = false;

  // IMPORTANT: no per-question timer in speed_round
  setTimerActive(false);
  setClue(null);
  setFeedback(null);
  setUsedExtrasThisRound({});
};


  // SPEED ROUND: global 90s countdown
  const handleRoundTimeRemaining = ({ remaining }: { remaining: number }) => {
    // Show a simple banner (or store remaining if you prefer)
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

      const currentRoundDef = config?.roundDefinitions?.[serverRoomState.currentRound - 1];
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
  const frozenByName = playersInRoom.find((p) => p.id === frozenBy)?.name || 'Someone';
  frozenByRef.current = frozenBy;
  frozenForIndexRef.current = frozenForQuestionIndex;

  setIsFrozen(true);
  setFrozenNotice(`❄️ ${frozenByName} froze you out!!!`);

  // Simple working approach - no complex timing logic
  setShowFreezeOverlay(true);
  setFreezeOverlayTrigger((prev) => prev + 1); // Critical for remount

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
    setShowFreezeOverlay(false); // Simple clear
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
  setShowFreezeOverlay(false); // Simple clear
};

 const handleNextRound = ({ round }: { round: number }) => {
  if (debug) console.log('[Client] next_round_starting:', round);
  setPhaseMessage(`Starting Round ${round}...`);
  setIsFrozen(false);
  setFrozenNotice(null);
  setShowFreezeOverlay(false); // Simple clear
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

      if (message.includes('active game session') || message.includes('already open in another tab')) {
        showNotification('error', `⚠️ ${message}`);
        setTimeout(() => navigate(`/quiz/game/${roomId}/${playerId}`), 2000);
      } else if (message.includes('Room not found') || message.includes('Player not found')) {
        navigate(`/quiz/game/${roomId}/${playerId}`);
      } else {
        showNotification('error', message);
      }
    };

    const handleQuizNotification = ({ type, message }: { type: NotificationType; message: string }) => {
      if (debug) console.log('[Client] notification:', type, message);
      showNotification(type, message);
    };

    const handleQuizCancelled = ({ message }: { message: string }) => {
      if (debug) console.log('[Client] cancelled:', message);
      showNotification('warning', `⚠️ ${message} - Redirecting to waiting page...`);
      setTimeout(() => navigate(`/quiz/game/${roomId}/${playerId}`), 2000);
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
        const frozenByName = playersInRoom.find((p) => p.id === data.frozenBy)?.name || 'Someone';
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

// Update your existing handleTbQuestion
const handleTbQuestion = (q: { id: string; text: string; type: 'numeric'; timeLimit: number; questionStartTime: number }) => {
  if (debug) console.log('[Client] tiebreak:question', q);
  setRoomPhase('tiebreaker' as RoomPhaseWithTB);
  
  setTbQuestion({ 
    id: q.id, 
    text: q.text, 
    timeLimit: q.timeLimit, 
    questionStartTime: q.questionStartTime 
  });
  setTbAnswer('');
  setTbShowReview(false); // Hide review when new question arrives
  setPhaseMessage('');
};

// Add new review handler
const handleTbReview = (data: {
  correctAnswer: number;
  playerAnswers: Record<string, number>;
  winnerIds?: string[];
  stillTiedIds?: string[];
  questionText: string;
  isFinalAnswer: boolean;
}) => {
  if (debug) console.log('[Client] tiebreak:review', data);
  
  setTbCorrectAnswer(data.correctAnswer);
  setTbPlayerAnswers(data.playerAnswers);
  setTbShowReview(true);
  
  if (data.winnerIds) {
    setTbWinners(data.winnerIds);
  } else if (data.stillTiedIds) {
    setTbStillTied(data.stillTiedIds);
  }
};

// Update handleTbTieAgain to increment question counter
const handleTbTieAgain = ({ stillTiedIds }: { stillTiedIds: string[] }) => {
  if (debug) console.log('[Client] tiebreak:tie_again', stillTiedIds);
  setTbStillTied(stillTiedIds);
  setTbParticipants(stillTiedIds);
  setTbAnswer('');
  setTbShowReview(false);
  setTbQuestionNumber(prev => prev + 1);
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
  }, [socket, connected, roomId, playerId, playersInRoom, config?.roundDefinitions]
);

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

  // ✅ build a safe config for the completion component (fixes Partial<QuizConfig> type error)
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
  };

  const submitTieBreaker = useCallback(() => {
  if (!socket || !roomId) return;
  const num = Number(tbAnswer);
  if (!Number.isFinite(num)) return;
  socket.emit('tiebreak:answer', { roomId, answer: num });
  // Optional: lock the input after submit
}, [socket, roomId, tbAnswer]);

  // ✅ render
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
    onAutoSubmit={() => {
      // Handle auto-submit from timer
      if (tbAnswer.trim()) {
        submitTieBreaker();
      }
    }}
  />
) : null}
      {roomPhase === 'complete' ? (
        <QuizCompletionCelebration
          leaderboard={leaderboard}
          config={safeConfig} // ✅ pass safe config
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
                currentRoundType={asRoundTypeId(serverRoomState.roundTypeId)} // ✅ typed
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
    // Update local UI immediately
    setSelectedAnswer(ans ?? '');
    setAnswerSubmitted(true);

    // Send instant submission for speed round
    socket?.emit('submit_speed_answer', {
      roomId,
      playerId,
      questionId: getCurrentQuestionId(), // uses your ref fallback
      answer: ans ?? null,                // null = skip
    });

    // NOTE: do NOT start per-question timers here
  } else {
    // other rounds: keep your existing timer-based flow
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
        frozenBy={playersInRoom.find((p) => p.id === frozenByRef.current)?.name || 'Someone'}
        onAnimationComplete={() => {
          handleFreezeOverlayComplete();
        }}
        targetElement=".quiz-content, .round-router, [data-testid='question-card']"
      />
    </div>
  );
};

export default QuizGamePlayPage;














