//src/components/Quiz/game/QuizGamePlayPage.tsx
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import UseExtraModal from './UseExtraModal';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import RoundRouter from './RoundRouter';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';

import { useRoundExtras } from '../hooks/useRoundExtras';
import { useAnswerSubmission } from '../hooks/useAnswerSubmission';
import { User, Question, LeaderboardEntry, RoomPhase } from '../types/quiz';
import { useNavigate } from 'react-router-dom';
import LaunchedPhase from './LaunchedPhase';
import { useCountdownEffects } from '../hooks/useCountdownEffects'
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';
import EnhancedPlayerLeaderboard from './EnhancedPlayerLeaderboard';
import QuizCompletionCelebration from './QuizCompletionCelebration';

import RobinHoodRunner from './RobinHoodRunner';
import { useRobinHoodAnimation } from '../hooks/useRobinHoodAnimation';

import FreezeOverlay from './FreezeOverlay';

import type { RoundConfig } from '../types/quiz';
const debug = true;

// ✅ NEW: Type definitions for notifications
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
  phase: RoomPhase;
};

const QuizGamePlayPage = () => {
  // ✅ FIXED: Get playerId from URL params, not localStorage
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const { socket, connected } = useQuizSocket();
  const navigate = useNavigate();

  const [showFreezeOverlay, setShowFreezeOverlay] = useState(false);
  const [freezeOverlayTrigger, setFreezeOverlayTrigger] = useState(0);

  // ✅ NEW: Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { robinHoodData, isAnimationActive, handleAnimationComplete } = useRobinHoodAnimation(socket);

  const selectedAnswerRef = useRef<string>('');
const answerSubmittedRef = useRef<boolean>(false);

  // ✅ VALIDATION: Ensure we have required params
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

  // ✅ NEW: Helper function to show notifications
  const showNotification = (type: NotificationType, message: string) => {
    const id = Date.now() + Math.random();
    const notification: Notification = { id, type, message };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Question and game state
  const [question, setQuestion] = useState<Question | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const getCurrentQuestionId = useCallback(() => {
  return question?.id ?? currentQuestionIdRef.current;
}, [question])
  
  // Room and phase state
  const [phaseMessage, setPhaseMessage] = useState('Waiting for host to start the quiz...');
  const [roomPhase, setRoomPhase] = useState<RoomPhase>('waiting');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // ✅ NEW: Round leaderboard state
  const [roundLeaderboard, setRoundLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isShowingRoundResults, setIsShowingRoundResults] = useState(false);
  const [currentRoundNumber, setCurrentRoundNumber] = useState(1);

 const currentQuestionIdRef = useRef<string | null>(null);

  // Server-driven round state
  const [serverRoomState, setServerRoomState] = useState<ServerRoomState>({
    currentRound: 1,
    totalRounds: 1,
    roundTypeId: '',
    roundTypeName: '',
    totalPlayers: 0,
    phase: 'waiting'
  });

  // Question tracking for position within round
  const [questionInRound, setQuestionInRound] = useState(1);
  const [totalInRound, setTotalInRound] = useState(1);

  // Player and extras state
  const { config } = useQuizConfig();
  const { players } = usePlayerStore();
  const thisPlayer = players.find(p => p.id === playerId);
  const availableExtras = thisPlayer?.extras || [];
  const allPlayerExtras = thisPlayer?.extras || [];
  const [usedExtras, setUsedExtras] = useState<Record<string, boolean>>({});
  const [usedExtrasThisRound, setUsedExtrasThisRound] = useState<Record<string, boolean>>({});
  
  // Player list and freeze state
  const [playersInRoom, setPlayersInRoom] = useState<User[]>([]);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenNotice, setFrozenNotice] = useState<string | null>(null);
  const [wasJustFrozen, setWasJustFrozen] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);

  // Refs for tracking game state
  const currentQuestionIndexRef = useRef<number>(-1);
  const frozenForIndexRef = useRef<number | null>(null);
  const frozenByRef = useRef<string | null>(null);

  const currentRoundType = serverRoomState.roundTypeId;
  const questionCounterDisplay = `${questionInRound}/${totalInRound}`;

const isFrozenNow = isFrozen && 
  frozenForIndexRef.current === currentQuestionIndexRef.current;

  // Custom hooks
const { submitAnswer } = useAnswerSubmission({
  socket,
  roomId: roomId!,
  playerId: playerId!,
  getCurrentQuestionId,
  debug
});

// Move handleAutoSubmit here - BEFORE useCountdownEffects
const handleAutoSubmit = useCallback(() => {
  console.log('[AutoSubmit] 🚨 ENTRY - handleAutoSubmit called');
  
  // Use refs to get current values, not closure-captured values
  const currentAnswer = selectedAnswerRef.current;
  const currentAnswerSubmitted = answerSubmittedRef.current;
  
  console.log('[AutoSubmit] 🚨 currentAnswer from ref:', currentAnswer);
  console.log('[AutoSubmit] 🚨 currentAnswerSubmitted:', currentAnswerSubmitted);
  
  // Don't auto-submit if already submitted
  if (currentAnswerSubmitted) {
    console.log('[AutoSubmit] 🚨 EARLY RETURN - answer already submitted');
    return;
  }
  
  // Use question from state first, fallback to ref
  const questionToSubmit = question || { id: currentQuestionIdRef.current };
  
  if (!questionToSubmit?.id) {
    console.log('[AutoSubmit] 🚨 EARLY RETURN - no question ID available');
    return;
  }
  
  console.log('[AutoSubmit] 🕐 Auto-submitting for question:', questionToSubmit.id, 'answer:', currentAnswer || 'null');
  
  // Mark as submitted immediately to prevent double-submission
  setAnswerSubmitted(true);
  
  submitAnswer(currentAnswer || null, { 
    autoTimeout: true,
    isFrozen: isFrozen,
    currentQuestionIndex: currentQuestionIndexRef.current,
    frozenForIndex: frozenForIndexRef.current
  });
}, [question, submitAnswer, isFrozen]);

const { currentEffect, isFlashing, getFlashClasses } = useCountdownEffects(handleAutoSubmit);

  const { roundExtras } = useRoundExtras({
    allPlayerExtras,
    currentRoundType,
    usedExtras,
    debug
  });

  // ✅ DEBUG: Log the player ID we're using
const debugInfo = useMemo(() => ({
  playerId,
  availableExtras,
  serverRoomState,
  currentRoundType,
  questionCounterDisplay
}), [playerId, availableExtras, serverRoomState, currentRoundType, questionCounterDisplay]);

if (debug) {
  console.log('[QuizGamePlayPage] Debug Info:', debugInfo);
}

useEffect(() => {
  selectedAnswerRef.current = selectedAnswer;
  console.log('[AnswerSync] selectedAnswer updated to:', selectedAnswer);
}, [selectedAnswer]);

// Sync answerSubmitted with ref
useEffect(() => {
  answerSubmittedRef.current = answerSubmitted;
}, [answerSubmitted]);

  // ✅ FIXED: Anti-cheat tab tracking with reconnection support
  useEffect(() => {
    if (!roomId || !playerId) return;

    // Generate unique tab ID for this browser tab
    const tabId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    sessionStorage.setItem('quiz-play-tab-id', tabId);

    // ✅ IMPROVED: Check for existing tabs but allow reconnections
    const existingTabId = localStorage.getItem(`quiz-active-play-${roomId}-${playerId}`);
    const lastActiveTime = localStorage.getItem(`quiz-active-play-time-${roomId}-${playerId}`);
    
    if (existingTabId && existingTabId !== tabId) {
      // ✅ Allow reconnection if the last activity was more than 10 seconds ago
      const now = Date.now();
      const lastActive = lastActiveTime ? parseInt(lastActiveTime) : 0;
      const timeSinceLastActive = now - lastActive;
      
      if (timeSinceLastActive < 10000) { // Less than 10 seconds = likely duplicate tab
        if (debug) console.log('[AntiCheat] 🚫 Blocking duplicate tab access');
        showNotification('error', 'This quiz is already open in another browser tab! Please close the other tab first.');
        navigate(`/quiz/game/${roomId}/${playerId}`);
        return;
      } else {
        if (debug) console.log('[AntiCheat] ✅ Allowing reconnection - previous tab inactive');
      }
    }

    // Mark this tab as the active play tab with timestamp
    localStorage.setItem(`quiz-active-play-${roomId}-${playerId}`, tabId);
    localStorage.setItem(`quiz-active-play-time-${roomId}-${playerId}`, Date.now().toString());

    // ✅ Update activity timestamp periodically
    const activityInterval = setInterval(() => {
      localStorage.setItem(`quiz-active-play-time-${roomId}-${playerId}`, Date.now().toString());
    }, 5000); // Update every 5 seconds

    // Notify server about route change
    if (socket && connected) {
      socket.emit('player_route_change', {
        roomId,
        playerId: playerId,
        route: 'play',
        entering: true
      });
    }

    // Listen for other tabs trying to access the same route
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `quiz-active-play-${roomId}-${playerId}` && e.newValue !== tabId) {
        // ✅ Only redirect if the new tab is actually active (recent timestamp)
        const newTimestamp = localStorage.getItem(`quiz-active-play-time-${roomId}-${playerId}`);
        if (newTimestamp && Date.now() - parseInt(newTimestamp) < 10000) {
          showNotification('warning', 'Quiz opened in another tab. This tab will return to the waiting page.');
          navigate(`/quiz/game/${roomId}/${playerId}`);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup function
    return () => {
      clearInterval(activityInterval);
      window.removeEventListener('storage', handleStorageChange);
      
      const currentActiveTab = localStorage.getItem(`quiz-active-play-${roomId}-${playerId}`);
      if (currentActiveTab === tabId) {
        localStorage.removeItem(`quiz-active-play-${roomId}-${playerId}`);
        localStorage.removeItem(`quiz-active-play-time-${roomId}-${playerId}`);
      }
      
      // Notify server about route change
      if (socket) {
        socket.emit('player_route_change', {
          roomId,
          playerId: playerId,
          route: 'play',
          entering: false
        });
      }
    };
  }, [roomId, playerId, socket, connected, navigate]);

  // ✅ FIXED: Join room with URL playerId
  useEffect(() => {
    if (!socket || !connected) return;

    if (debug) console.log('[Client] 🚪 Joining quiz room on mount:', roomId);
    
    socket.emit('join_quiz_room', {
      roomId,
      user: { id: playerId, name: 'Player ' + playerId },
      role: 'player'
    });
    
    // Request current state after joining
    setTimeout(() => {
      socket.emit('request_current_state', { roomId, playerId: playerId });
      if (debug) console.log('[Client] 🔄 Requested current state for reconnection');
    }, 100);
    
  }, [socket, connected, roomId, playerId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) return;

    const handleQuestion = (data: any) => {

       currentQuestionIdRef.current = data.id;

   if (debug)   console.log('[Client] Question received with timing data:', {
    id: data.id,
    timeLimit: data.timeLimit,
    questionStartTime: data.questionStartTime,
    currentTime: Date.now()
    });
      if (debug) console.log(`[DEBUG] Question received:`, data);
      if (debug) console.log(`[DEBUG] Before update - currentQuestionIndexRef:`, currentQuestionIndexRef.current);
      if (debug) console.log(`[DEBUG] Before update - questionInRound:`, questionInRound, 'totalInRound:', totalInRound);
      
      if (debug) console.log('[Client] 🧐 Received question:', data);
      
   // Use server-provided question index instead of prediction
if (data.currentQuestionIndex !== undefined) {
  currentQuestionIndexRef.current = data.currentQuestionIndex;
  if (debug) console.log(`[DEBUG] Using server question index:`, data.currentQuestionIndex);
} else {
  if (debug) console.log(`[DEBUG] No server index provided, keeping current:`, currentQuestionIndexRef.current);
}

const questionIndex = data.currentQuestionIndex !== undefined ? data.currentQuestionIndex : currentQuestionIndexRef.current;
if (frozenForIndexRef.current !== null && frozenForIndexRef.current !== questionIndex) {
  setIsFrozen(false);
  setFrozenNotice(null);
  setWasJustFrozen(false);
  setShowFreezeOverlay(false); // Hide the overlay when moving to non-frozen question
  
  if (debug) {
    console.log(`[Client] ❄️ Cleared freeze state - frozen for index ${frozenForIndexRef.current}, current index ${questionIndex}`);
  }
}

 currentQuestionIdRef.current = data.id;
      
       setQuestion({
    ...data,
    questionStartTime: data.questionStartTime, // Make sure this is being set
    timeLimit: data.timeLimit
  });
      setSelectedAnswer('');
selectedAnswerRef.current = ''; // Also clear the ref
setAnswerSubmitted(false);
answerSubmittedRef.current = false;
      
      setClue(null);
      setFeedback(null);
      setUsedExtrasThisRound({});

   // Always use server-provided question numbers (no fallback calculation needed)
if (data.questionNumber && data.totalQuestions) {
  setQuestionInRound(data.questionNumber);
  setTotalInRound(data.totalQuestions);
} else {
  if (debug) console.warn('[Client] Server did not provide question numbers');
}

      setTimerActive(true);
      setPhaseMessage('');
    };

    // QuizGamePlayPage.tsx - Updated handleReviewQuestion function
    const handleReviewQuestion = (data: any) => {
      if (debug) console.log('[Client] 🤔 Review question received:', data);
       console.log('[Client] 🔍 Submitted answer:', data.submittedAnswer);
  console.log('[Client] 🔍 Correct answer:', data.correctAnswer);

      setQuestion({
        id: data.id,
        text: data.text,
        options: data.options || [],
        timeLimit: 0,
        difficulty: data.difficulty,
        category: data.category
      });

      setClue(null);
      setTimerActive(false);
      setSelectedAnswer(data.submittedAnswer || '');
      setCorrectAnswer(data.correctAnswer);

      // ✅ NEW: Use server-provided question numbers (persistent across reconnections)
      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
        if (debug) console.log(`[Client] 📍 Review position: ${data.questionNumber}/${data.totalQuestions}`);
      }

      const hasAnswered = data.submittedAnswer !== null && data.submittedAnswer !== undefined;
      const isCorrect = hasAnswered && data.submittedAnswer === data.correctAnswer;

      // ✅ Dynamically calculate score (existing logic)
      const currentRoundDef = config?.roundDefinitions?.[serverRoomState.currentRound - 1];
      const roundType = serverRoomState.roundTypeId as RoundTypeId;
      const roundMeta = roundTypeDefinitions[roundType];

      const roundConfig: Partial<RoundConfig> = currentRoundDef?.config || {};
      const defaultConfig: Partial<RoundConfig> = roundMeta?.defaultConfig || {};

      const pointsPerDifficulty = roundConfig.pointsPerDifficulty || defaultConfig.pointsPerDifficulty || {};
      const pointsLostPerWrong = roundConfig.pointsLostPerWrong ?? defaultConfig.pointsLostPerWrong ?? 0;
      const pointsLostPerUnanswered = roundConfig.pointsLostPerUnanswered ?? defaultConfig.pointsLostPerUnanswered ?? 0;

      const difficulty = (data.difficulty || 'medium') as keyof typeof pointsPerDifficulty;
      const pointsIfCorrect = pointsPerDifficulty[difficulty] ?? 2;

      let pointsEarned = 0;
      if (!hasAnswered) {
        pointsEarned = -pointsLostPerUnanswered;
      } else if (isCorrect) {
        pointsEarned = pointsIfCorrect;
      } else {
        pointsEarned = -pointsLostPerWrong;
      }

      // ✅ FIXED: Feedback message with proper points display
      let feedbackMessage = '';
      if (!hasAnswered) {
        if (pointsLostPerUnanswered > 0) {
          feedbackMessage = `❌ You didn't answer. -${pointsLostPerUnanswered} points. Correct Answer: ${data.correctAnswer}`;
        } else {
          feedbackMessage = `❌ You didn't answer. No penalty. Correct Answer: ${data.correctAnswer}`;
        }
      } else if (isCorrect) {
        feedbackMessage = `✅ Correct! +${pointsEarned} points`;
      } else {
        feedbackMessage = `❌ Incorrect. ${pointsEarned} points. Correct Answer: ${data.correctAnswer}`;
      }

      setFeedback(feedbackMessage);
      setPhaseMessage('Reviewing previous question...');
    };

    const handleClue = ({ clue }: { clue: string }) => {
      if (debug) console.log('[Client] 💡 Clue revealed:', clue);
      setClue(clue);
    };

    const handleAnswerReveal = ({ correctAnswer, playerResult }: any) => {
      if (debug) console.log('[Client] ✅ Answer reveal:', correctAnswer, playerResult);
      setFeedback(playerResult?.correct ? '✅ Correct!' : '❌ Incorrect.');
      setTimerActive(false);
    };

  const handleFreezeNotice = ({ frozenBy, frozenForQuestionIndex }: { frozenBy: string; frozenForQuestionIndex: number; message?: string }) => {
  const frozenByName = playersInRoom.find(p => p.id === frozenBy)?.name || 'Someone';
  frozenByRef.current = frozenBy;
  frozenForIndexRef.current = frozenForQuestionIndex;

  setIsFrozen(true);
  setWasJustFrozen(true);
  setFrozenNotice(`❄️ ${frozenByName} froze you out!!!`);

  // Trigger the freeze overlay animation
  setShowFreezeOverlay(true);
  setFreezeOverlayTrigger(prev => prev + 1);

  console.log(`[Client] ❄️ Freeze Notice received:`, {
    frozenBy: frozenByName,
    frozenForQuestionIndex,
    currentQuestionIndex: currentQuestionIndexRef.current,
    willBeFrozenForIndex: frozenForQuestionIndex
  });
};

    const handleRoomState = (data: ServerRoomState) => {
      if (debug) console.log('[Client] 🧭 room_state update:', data);
      
      const previousRound = serverRoomState.currentRound;
      if (data.currentRound !== previousRound && data.phase) {
        if (debug) console.log(`[Client] 🔄 Round changed from ${previousRound} to ${data.currentRound}, resetting question counter`);
        currentQuestionIndexRef.current = -1;
        // ✅ NEW: Reset round leaderboard state when round changes
        setIsShowingRoundResults(false);
        setRoundLeaderboard([]);
      }
      
      setRoomPhase(data.phase);
      setServerRoomState(data);
    };

    // ✅ NEW: Handle round leaderboard
    const handleRoundLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) console.log('[Client] 🏆 Round leaderboard received:', data);
      setRoundLeaderboard(data);
      setIsShowingRoundResults(true);
      setCurrentRoundNumber(serverRoomState.currentRound);
    };

    // ✅ UPDATED: Handle overall leaderboard (distinguish from round)
    const handleLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) {
        console.log('[Client] 🏆 Overall leaderboard received:', data);
        console.log('[Client] 🔍 Leaderboard structure check:');
        data.forEach(player => {
          console.log(`  - ${player.name}: score=${player.score}, cumulativeNegativePoints=${player.cumulativeNegativePoints}, pointsRestored=${player.pointsRestored}`);
        });
      }
      setLeaderboard(data);
      setIsShowingRoundResults(false); // Switch to overall leaderboard
    };

    const handleRoundEnd = ({ round }: { round: number }) => {
      if (debug) console.log(`[Client] ⏹️ Round ${round} ended`);
      setPhaseMessage(`Round ${round} complete. Waiting for next round...`);
      setQuestion(null);
      setTimerActive(false);
      setIsFrozen(false);
      setFrozenNotice(null);
      setWasJustFrozen(false);
      // ✅ NEW: Clear freeze overlay on round end
      setShowFreezeOverlay(false);
    };

    const handleNextRound = ({ round }: { round: number }) => {
      if (debug) console.log(`[Client] 🔁 Starting Round ${round}`);
      setPhaseMessage(`Starting Round ${round}...`);
      setIsFrozen(false);
      setFrozenNotice(null);
      setWasJustFrozen(false);
      // ✅ NEW: Clear freeze overlay on new round
      setShowFreezeOverlay(false);
    };

    const handleQuizEnd = ({ message }: { message: string }) => {
      if (debug) console.log(`[Client] 🏁 Quiz ended: ${message}`);
      setPhaseMessage(message);
      setQuestion(null);
      setTimerActive(false);
    };

    const handlePlayerListUpdated = ({ players }: { players: User[] }) => {
      setPlayersInRoom(players);
    };

    const handleExtraUsedSuccessfully = ({ extraId }: { extraId: string }) => {
      if (debug) console.log('[Client] ✅ Extra used successfully:', extraId);
      
      // ✅ Don't mark restorePoints as "used" - it has its own limit logic
      if (extraId !== 'restorePoints') {
        setUsedExtras(prev => ({ ...prev, [extraId]: true }));
        setUsedExtrasThisRound(prev => ({ ...prev, [extraId]: true }));
      }
    };

    // ✅ UPDATED: Use toast notifications instead of alerts
    const handleQuizError = ({ message }: { message: string }) => {
      if (debug) console.error('[Client] ❌ Quiz error:', message);
      
      if (message.includes('active game session') || message.includes('already open in another tab')) {
        showNotification('error', `⚠️ ${message}`);
        setTimeout(() => navigate(`/quiz/game/${roomId}/${playerId}`), 2000);
      } else if (message.includes('Room not found') || message.includes('Player not found')) {
        // ✅ NEW: Handle reconnection errors more gracefully
         if (debug) console.log('[Client] 🔄 Attempting to rejoin through waiting page...');
        navigate(`/quiz/game/${roomId}/${playerId}`);
      } else {
        // ✅ FIXED: Use toast instead of alert
        showNotification('error', message);
      }
    };

    // ✅ UPDATED: Use helper function
    const handleQuizNotification = ({ type, message }: { type: NotificationType; message: string }) => {
      if (debug) console.log('[Client] 📢 Quiz notification:', type, message);
      showNotification(type, message);
    };

    const handleQuizCancelled = ({ message }: { message: string }) => {
      if (debug) console.log('[Client] 🚫 Quiz cancelled:', message);
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
      if (debug) console.log('[Client] 🔄 Player state recovery:', data);
      
      setAnswerSubmitted(data.hasAnswered);
      if (data.submittedAnswer) {
        setSelectedAnswer(data.submittedAnswer);
      }
      
      setIsFrozen(data.isFrozen);
      if (data.isFrozen && data.frozenBy) {
        const frozenByName = playersInRoom.find(p => p.id === data.frozenBy)?.name || 'Someone';
        setFrozenNotice(`❄️ ${frozenByName} froze you out!!!`);
        frozenForIndexRef.current = data.currentQuestionIndex;
        frozenByRef.current = data.frozenBy;
      }
      
      setUsedExtras(data.usedExtras);
      setUsedExtrasThisRound(data.usedExtrasThisRound);
      currentQuestionIndexRef.current = data.currentQuestionIndex;
      
       if (debug) console.log(`[Client] ✅ State recovered: answered=${data.hasAnswered}, frozen=${data.isFrozen}, timer=${data.remainingTime}s`);
    };

    if (debug)  console.log('[Client] 🧷 Registering socket listeners for player:', playerId, 'Room:', roomId);

    // Register all socket listeners
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
    // ✅ NEW: Round leaderboard listener
    socket.on('round_leaderboard', handleRoundLeaderboard);
    socket.on('quiz_notification', handleQuizNotification);
    socket.on('player_state_recovery', handlePlayerStateRecovery);
    socket.on('quiz_cancelled', handleQuizCancelled);

    // Cleanup
    return () => {
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
      // ✅ NEW: Round leaderboard cleanup
      socket.off('round_leaderboard', handleRoundLeaderboard);
      socket.off('quiz_notification', handleQuizNotification);
      socket.off('player_state_recovery', handlePlayerStateRecovery);
      socket.off('quiz_cancelled', handleQuizCancelled);
    };
  }, [socket, connected, roomId, playerId, playersInRoom, config?.roundDefinitions, serverRoomState.currentRound]);




  const handleUseExtra = (extraId: string, targetPlayerId?: string) => {
    if (!socket || !roomId || !playerId) return;
    
    if (usedExtras[extraId]) {
      showNotification('warning', `You have already used ${extraId}`);
      return;
    }

    console.log('🐛 [Frontend] handleUseExtra called:', { extraId, targetPlayerId });

    if (extraId === 'buyHint') {
      console.log('🐛 [Frontend] Emitting buyHint');
      socket.emit('use_extra', {
        roomId,
        playerId: playerId,
        extraId: 'buyHint'
      });
    } else if (extraId === 'freezeOutTeam') {
      // ✅ FIXED: Check if this is modal confirmation or initial click
      if (targetPlayerId) {
        // This is from modal confirmation - emit the socket event
        console.log('🐛 [Frontend] Emitting freezeOutTeam with target:', targetPlayerId);
        socket.emit('use_extra', {
          roomId,
          playerId: playerId,
          extraId: 'freezeOutTeam',
          targetPlayerId
        });
        console.log('🐛 [Frontend] freezeOutTeam socket event emitted');
      } else {
        // This is initial click - open the modal
        console.log('🐛 [Frontend] Opening freeze modal (no target provided)');
        setFreezeModalOpen(true);
      }
    } else if (extraId === 'robPoints') {
      if (!targetPlayerId) {
        console.error('[handleUseExtra] robPoints requires targetPlayerId');
        return;
      }
      
      console.log('🐛 [Frontend] Emitting robPoints');
      socket.emit('use_extra', {
        roomId,
        playerId: playerId,
        extraId: 'robPoints',
        targetPlayerId
      });
    } else {
      console.log('🐛 [Frontend] Emitting other extra:', extraId);
      socket.emit('use_extra', {
        roomId,
        playerId: playerId,
        extraId,
        targetPlayerId
      });
    }
  };

  const getMaxRestorePointsFromConfig = (config: any): number => {
  return config?.fundraisingOptions?.restorePoints?.totalRestorePoints 
    ?? fundraisingExtraDefinitions.restorePoints?.totalRestorePoints 
    ?? 3;
};

  // ✅ FIXED: Function placed at component level (not inside useEffect)
  const handleFreezeOverlayComplete = () => {
    setShowFreezeOverlay(false);
    console.log('[FreezeOverlay] Animation completed and overlay hidden');
  };

  const handleFreezeConfirm = (targetPlayerId: string) => {
    if (!socket || !roomId || !playerId || !targetPlayerId) return;
    socket.emit('use_extra', {
      roomId,
      playerId: playerId,
      extraId: 'freezeOutTeam',
      targetPlayerId
    });
    setFreezeModalOpen(false);
  };

  // Timer now managed by server via countdown effects
  const timeLeft = null; // Will be removed in next phase


  // ✅ CORRECT PLACEMENT - Move the completion check to the top level
  return (
    <div className={`p-8 ${getFlashClasses()}`}>
      {/* ✅ Handle quiz completion FIRST, before other phases */}
      {roomPhase === 'complete' ? (
        <QuizCompletionCelebration
          leaderboard={leaderboard}
          config={config}
          playerId={playerId || ''}
          roomId={roomId || ''}
          onShareResults={() => {
            const shareText = `I just completed a quiz and scored ${leaderboard.find(p => p.id === playerId)?.score} points! 🎯`;
            if (navigator.share) {
              navigator.share({ text: shareText });
            } else {
              navigator.clipboard.writeText(shareText);
              showNotification('success', 'Results copied to clipboard!');
            }
          }}
          onReturnToHome={() => navigate('/quiz')}
        />
      ) : (
        <>
          {/* ✅ Countdown message overlay */}
          {currentEffect && isFlashing && (
            <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
              <div className={`animate-bounce text-8xl font-bold ${
                currentEffect.color === 'green' ? 'text-green-500' :
                currentEffect.color === 'orange' ? 'text-orange-500' : 
                'text-red-500'
              }`}>
                {currentEffect.message}
              </div>
            </div>
          )}

          {/* ✅ Toast Notifications */}
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`fixed right-4 top-20 z-40 rounded-lg p-4 shadow-lg transition-all duration-300 ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'warning' ? 'bg-orange-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              }`}
              style={{ marginTop: `${notifications.indexOf(notification) * 80}px` }}
            >
              <div className="flex items-center justify-between">
                <span className="pr-4">
                  {notification.type === 'success' ? '✅' : 
                   notification.type === 'warning' ? '⚠️' : 
                   notification.type === 'error' ? '❌' : 'ℹ️'} {notification.message}
                </span>
                <button
                  onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                  className="ml-2 text-lg font-bold text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {/* ✅ Main game content */}
          {(roomPhase === 'launched' || (roomPhase === 'waiting' && serverRoomState.currentRound > 1)) ? (
            <LaunchedPhase
              currentRound={serverRoomState.currentRound}
              config={config}
              totalPlayers={serverRoomState.totalPlayers}
              playerId={playerId || ''}
              playerExtras={thisPlayer?.extras || []}
              roomPhase={roomPhase}
            />
          ) : roomPhase === 'leaderboard' ? (
            // Enhanced leaderboard display with round context
            isShowingRoundResults && roundLeaderboard.length > 0 ? (
              <EnhancedPlayerLeaderboard
                leaderboard={roundLeaderboard}
                availableExtras={availableExtras}
                usedExtras={usedExtras}
                onUseExtra={handleUseExtra}
                currentPlayerId={playerId || ''}
                cumulativeNegativePoints={roundLeaderboard.find(p => p.id === playerId)?.cumulativeNegativePoints || 0}
                pointsRestored={roundLeaderboard.find(p => p.id === playerId)?.pointsRestored || 0}
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
                cumulativeNegativePoints={leaderboard.find(p => p.id === playerId)?.cumulativeNegativePoints || 0}
                pointsRestored={leaderboard.find(p => p.id === playerId)?.pointsRestored || 0}
                isRoundResults={false}
                maxRestorePoints={getMaxRestorePointsFromConfig(config)}
              />
            ) : (
              <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">
                Calculating leaderboard...
              </div>
            )
          ) : (roomPhase === 'reviewing' || roomPhase === 'asking') && question ? (
            <div>
              <RoundRouter
                roomPhase={roomPhase}
                currentRoundType={currentRoundType}
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
                onSubmit={() => {}}
                roomId={roomId!}
                playerId={playerId!}
                roundExtras={roundExtras}
                usedExtras={usedExtras}
                usedExtrasThisRound={usedExtrasThisRound}
                onUseExtra={handleUseExtra}
                questionNumber={questionInRound}
                totalQuestions={totalInRound}
                difficulty={question?.difficulty}
                category={question?.category}
                isHost={false}
                playersInRoom={playersInRoom}
              />
            </div>
          ) : (
            <div className="text-fg/70 rounded-xl bg-gray-100 p-6 text-center">{phaseMessage}</div>
          )}

          <UseExtraModal
            visible={freezeModalOpen}
            players={playersInRoom.filter(p => p.id !== playerId)}
            onCancel={() => setFreezeModalOpen(false)}
            onConfirm={handleFreezeConfirm}
          />
        </>
      )}

      {/* ✅ Robin Hood Animation Overlay */}
      {robinHoodData && (
        <RobinHoodRunner
          isActive={isAnimationActive}
          onComplete={handleAnimationComplete}
          stolenPoints={robinHoodData.stolenPoints}
          fromTeam={robinHoodData.fromTeam}
          toTeam={robinHoodData.toTeam}
        />
      )}

      {/* ✅ NEW: Freeze Overlay Animation */}
      <FreezeOverlay
        key={freezeOverlayTrigger} // Force re-render on new freeze
        isActive={showFreezeOverlay && isFrozenNow} // ✅ FIXED: Only show when actually frozen
        frozenBy={playersInRoom.find(p => p.id === frozenByRef.current)?.name || 'Someone'}
      
        targetElement=".quiz-content, .round-router, [data-testid='question-card']" // ✅ Better target selection
      />
    </div>
  );
};

export default QuizGamePlayPage;













