import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import UseExtraModal from './UseExtraModal';
import GlobalExtrasDuringLeaderboard from './GlobalExtrasDuringLeaderboard';
import RoundRouter from './RoundRouter';
import { usePlayerStore } from '../usePlayerStore';
import { useQuizConfig } from '../useQuizConfig';
import { useQuizTimer } from './../hooks/useQuizTimer';
import { useRoundExtras } from './../hooks/useRoundExtras';
import { useAnswerSubmission } from './../hooks/useAnswerSubmission';
import { User, Question, LeaderboardEntry, RoomPhase, RoundDefinition } from './../types/quiz';
import { useNavigate } from 'react-router-dom';
import LaunchedPhase from './LaunchedPhase';
import { roundTypeDefinitions } from '../../../constants/quizMetadata';
import { useCountdownEffects } from './../hooks/useCountdownEffects'

const debug = true;

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

  // ✅ VALIDATION: Ensure we have required params
  if (!roomId || !playerId) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600">❌ Invalid Game URL</h1>
        <p className="text-gray-600">Missing room ID or player ID in URL.</p>
        <button 
          onClick={() => navigate('/quiz')}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Return to Quiz Home
        </button>
      </div>
    );
  }

  // Question and game state
  const [question, setQuestion] = useState<Question | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  // Room and phase state
  const [phaseMessage, setPhaseMessage] = useState('Waiting for host to start the quiz...');
  const [roomPhase, setRoomPhase] = useState<RoomPhase>('waiting');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

   const { currentEffect, isFlashing, getFlashClasses } = useCountdownEffects();

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

  const calculateQuestionPosition = (currentQuestionIndex: number, roundDefs: RoundDefinition[]) => {
    if (!roundDefs || currentQuestionIndex < 0) return { questionInRound: 1, totalInRound: 1 };
    
    const currentRoundIndex = serverRoomState.currentRound - 1;
    const currentRoundDef = roundDefs[currentRoundIndex];
    
    if (!currentRoundDef) return { questionInRound: 1, totalInRound: 1 };
    
    const questionsPerRound = currentRoundDef.config.questionsPerRound;
    const questionInCurrentRound = currentQuestionIndex + 1;
    
    return {
      questionInRound: Math.max(1, questionInCurrentRound),
      totalInRound: questionsPerRound
    };
  };

  const isFrozenNow = (() => {
    if (!isFrozen || frozenForIndexRef.current === null) return false;
    
    const questionsPerRound = config?.roundDefinitions?.[serverRoomState.currentRound - 1]?.config?.questionsPerRound || 6;
    const roundRelativeIndex = currentQuestionIndexRef.current % questionsPerRound;
    
    const shouldBeFrozen = frozenForIndexRef.current === roundRelativeIndex;
    
    if (debug && frozenForIndexRef.current !== null) {
      console.log(`[FREEZE CHECK] globalIndex: ${currentQuestionIndexRef.current}, roundRelative: ${roundRelativeIndex}, frozenFor: ${frozenForIndexRef.current}, shouldBeFrozen: ${shouldBeFrozen}`);
    }
    
    return shouldBeFrozen;
  })();

  // Custom hooks
  const { submitAnswer } = useAnswerSubmission({
    socket,
    roomId: roomId!,
    playerId: playerId!,
    debug
  });

  const { roundExtras } = useRoundExtras({
    allPlayerExtras,
    currentRoundType,
    debug
  });

  const { timeLeft } = useQuizTimer({
    question,
    timerActive,
    onTimeUp: handleSubmit
  });

  // ✅ DEBUG: Log the player ID we're using
  if (debug) {
    console.log('[QuizGamePlayPage] 🆔 Using playerId from URL:', playerId);
    console.log('[QuizGamePlayPage] 👤 Player extras loaded:', availableExtras);
    console.log('[QuizGamePlayPage] 🎯 Server round state:', serverRoomState);
    console.log('[QuizGamePlayPage] 🧩 currentRoundType:', currentRoundType);
    console.log('[QuizGamePlayPage] 📊 questionPosition:', questionCounterDisplay);
  }

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
        alert('This quiz is already open in another browser tab! Please close the other tab first.');
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
          alert('Quiz opened in another tab. This tab will return to the waiting page.');
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
      console.log(`[DEBUG] Question received:`, data);
      console.log(`[DEBUG] Before update - currentQuestionIndexRef:`, currentQuestionIndexRef.current);
      console.log(`[DEBUG] Before update - questionInRound:`, questionInRound, 'totalInRound:', totalInRound);
      
      if (debug) console.log('[Client] 🧐 Received question:', data);
      
      const isRecovery = currentQuestionIndexRef.current >= 0 && 
                        Math.abs(Date.now() - data.questionStartTime) > 5000;
      
      if (!isRecovery) {
        currentQuestionIndexRef.current += 1;
        console.log(`[DEBUG] Incremented currentQuestionIndexRef to:`, currentQuestionIndexRef.current);
      } else {
        console.log(`[DEBUG] Recovery detected - keeping currentQuestionIndexRef:`, currentQuestionIndexRef.current);
      }
      
      setQuestion(data);
      setSelectedAnswer('');
      setAnswerSubmitted(false);
      setClue(null);
      setFeedback(null);
      setUsedExtrasThisRound({});

      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
      } else if (config?.roundDefinitions) {
        const { questionInRound: qInRound, totalInRound: totalInR } = calculateQuestionPosition(
          currentQuestionIndexRef.current, 
          config.roundDefinitions
        );
        setQuestionInRound(qInRound);
        setTotalInRound(totalInR);
      }

      if (frozenForIndexRef.current !== null && frozenForIndexRef.current !== currentQuestionIndexRef.current) {
        setIsFrozen(false);
        setFrozenNotice(null);
        frozenForIndexRef.current = null;
        frozenByRef.current = null;
        if (debug) console.log('[Client] ❄️ Freeze cleared for new question');
      }

      setTimerActive(true);
      setPhaseMessage('');
    };

  const handleReviewQuestion = (data: any) => {
  if (debug) console.log('[Client] 🤔 Review question received:', data);
  setQuestion({
    id: data.id,
    text: data.text,
    options: data.options || [],
    timeLimit: 0
  });
  setClue(null);
  setTimerActive(false);
  setSelectedAnswer(data.submittedAnswer || '');
   setCorrectAnswer(data.correctAnswer);
  
  // ✅ 3. Calculate points using existing config data
  const currentRoundDef = config?.roundDefinitions?.[serverRoomState.currentRound - 1];
  const roundConfig = currentRoundDef?.config;
  const pointsPerQuestion = roundConfig?.pointsPerQuestion || 2;
  const pointsLostPerWrong = roundConfig?.pointsLostPerWrong || 0;
  
  const hasAnswered = data.submittedAnswer !== null && data.submittedAnswer !== undefined;
  const isCorrect = hasAnswered && data.submittedAnswer === data.correctAnswer;
  
  let pointsEarned = 0;
  if (hasAnswered) {
    if (isCorrect) {
      pointsEarned = pointsPerQuestion;
    } else if (pointsLostPerWrong > 0) {
      pointsEarned = -pointsLostPerWrong;
    }
  }
  
  // ✅ 4. FIXED: Improved feedback with points and correct color logic
  let feedbackMessage = '';
  
  if (!hasAnswered) {
    feedbackMessage = `❌ You didn't answer. Correct Answer: ${data.correctAnswer}`;
  } else if (isCorrect) {
    feedbackMessage = `✅ Correct! +${pointsEarned} points`;
  } else {
    const pointsText = pointsEarned < 0 ? `${pointsEarned}` : '0';
    feedbackMessage = `❌ Incorrect. ${pointsText} points. Correct Answer: ${data.correctAnswer}`;
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

    const handleFreezeNotice = ({ frozenBy, frozenForQuestionIndex, message }: { frozenBy: string; frozenForQuestionIndex: number; message?: string }) => {
      const frozenByName = playersInRoom.find(p => p.id === frozenBy)?.name || 'Someone';
      frozenByRef.current = frozenBy;
      frozenForIndexRef.current = frozenForQuestionIndex;

      setIsFrozen(true);
      setWasJustFrozen(true);
      setFrozenNotice(`❄️ ${frozenByName} froze you out!!!`);

      if (debug) {
        console.log(`[Client] ❄️ Freeze Notice Details:`);
        console.log(`  - Frozen by: ${frozenByName}`);
        console.log(`  - Frozen for question INDEX: ${frozenForQuestionIndex}`);
        console.log(`  - Current question INDEX: ${currentQuestionIndexRef.current}`);
        console.log(`  - Current question NUMBER: ${currentQuestionIndexRef.current + 1}`);
        console.log(`[Client] ❄️ Freeze Notice: You are frozen by ${frozenByName} for question index ${frozenForQuestionIndex} (question ${frozenForQuestionIndex + 1} to user)`);
      }

      setTimeout(() => {
        alert(`⚠️ ${frozenByName} froze you out! You cannot answer the next question.`);
      }, 100);
    };

    const handleRoomState = (data: ServerRoomState) => {
      if (debug) console.log('[Client] 🧭 room_state update:', data);
      
      const previousRound = serverRoomState.currentRound;
      if (data.currentRound !== previousRound && data.phase) {
        if (debug) console.log(`[Client] 🔄 Round changed from ${previousRound} to ${data.currentRound}, resetting question counter`);
        currentQuestionIndexRef.current = -1;
      }
      
      setRoomPhase(data.phase);
      setServerRoomState(data);
    };

  const handleLeaderboard = (data: LeaderboardEntry[]) => {
  if (debug) {
    console.log('[Client] 🏆 Leaderboard received:', data);
    console.log('[Client] 🔍 Leaderboard structure check:');
    data.forEach(player => {
      console.log(`  - ${player.name}: score=${player.score}, cumulativeNegativePoints=${player.cumulativeNegativePoints}, pointsRestored=${player.pointsRestored}`);
    });
  }
  setLeaderboard(data);
};

    const handleRoundEnd = ({ round }: { round: number }) => {
      if (debug) console.log(`[Client] ⏹️ Round ${round} ended`);
      setPhaseMessage(`Round ${round} complete. Waiting for next round...`);
      setQuestion(null);
      setTimerActive(false);
      setIsFrozen(false);
      setFrozenNotice(null);
      setWasJustFrozen(false);
    };

    const handleNextRound = ({ round }: { round: number }) => {
      if (debug) console.log(`[Client] 🔁 Starting Round ${round}`);
      setPhaseMessage(`Starting Round ${round}...`);
      setIsFrozen(false);
      setFrozenNotice(null);
      setWasJustFrozen(false);
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

 const handleQuizError = ({ message }: { message: string }) => {
  if (debug) console.error('[Client] ❌ Quiz error:', message);
  
  if (message.includes('active game session') || message.includes('already open in another tab')) {
    alert(`⚠️ ${message}\n\nRedirecting to waiting page...`);
    navigate(`/quiz/game/${roomId}/${playerId}`);
  } else if (message.includes('Room not found') || message.includes('Player not found')) {
    // ✅ NEW: Handle reconnection errors more gracefully
    console.log('[Client] 🔄 Attempting to rejoin through waiting page...');
    navigate(`/quiz/game/${roomId}/${playerId}`);
  } else {
    alert(`Error: ${message}`);
  }
};

    const handleQuizNotification = ({ type, message }: { type: 'success' | 'warning' | 'info' | 'error'; message: string }) => {
      if (debug) console.log('[Client] 📢 Quiz notification:', type, message);
      alert(`${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'} ${message}`);
    };

    const handleQuizCancelled = ({ message }: { message: string }) => {
      if (debug) console.log('[Client] 🚫 Quiz cancelled:', message);
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
      
      console.log(`[Client] ✅ State recovered: answered=${data.hasAnswered}, frozen=${data.isFrozen}, timer=${data.remainingTime}s`);
    };

    console.log('[Client] 🧷 Registering socket listeners for player:', playerId, 'Room:', roomId);

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
      socket.off('quiz_notification', handleQuizNotification);
      socket.off('player_state_recovery', handlePlayerStateRecovery);
      socket.off('quiz_cancelled', handleQuizCancelled);
    };
  }, [socket, connected, roomId, playerId, playersInRoom, config?.roundDefinitions, serverRoomState.currentRound]);

  function handleSubmit() {
    if (!selectedAnswer || !question || isFrozenNow || answerSubmitted) return;
    
    const success = submitAnswer(selectedAnswer);
    if (success) {
      setAnswerSubmitted(true);
    }
  }

  const handleUseExtra = (extraId: string, targetPlayerId?: string) => {
    if (!socket || !roomId || !playerId) return;
    
    if (usedExtras[extraId]) {
      alert(`You have already used ${extraId}`);
      return;
    }
    
    if (Object.values(usedExtrasThisRound).some(v => v)) {
      alert('You can only use one extra per round!');
      return;
    }

    if (extraId === 'buyHint') {
      socket.emit('use_extra', {
        roomId,
        playerId: playerId,
        extraId: 'buyHint'
      });
    } else if (extraId === 'freezeOutTeam') {
      setFreezeModalOpen(true);
    } else if (extraId === 'robPoints') {
      if (!targetPlayerId) {
        console.error('[handleUseExtra] robPoints requires targetPlayerId');
        return;
      }
      
      socket.emit('use_extra', {
        roomId,
        playerId: playerId,
        extraId: 'robPoints',
        targetPlayerId
      });
    } else {
      socket.emit('use_extra', {
        roomId,
        playerId: playerId,
        extraId,
        targetPlayerId
      });
    }
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🎮 Quiz In Progress</h1>
      <p className="text-sm text-gray-500 mb-2">Room ID: {roomId}</p>
      <p className="text-sm text-gray-500 mb-4">Player ID: {playerId}</p>

      {/* ✅ NEW: Countdown message overlay */}
      {currentEffect && isFlashing && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className={`text-8xl font-bold animate-bounce ${
            currentEffect.color === 'green' ? 'text-green-500' :
            currentEffect.color === 'orange' ? 'text-orange-500' : 
            'text-red-500'
          }`}>
            {currentEffect.message}
          </div>
        </div>
      )}

      {isFrozenNow && frozenNotice && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded">
          <div className="flex items-center">
            <div className="text-2xl mr-2">❄️</div>
            <div>
              <p className="font-bold">You are frozen!</p>
              <p className="text-sm">{frozenNotice}</p>
            </div>
          </div>
        </div>
      )}

      

     {/* ✅ 5. NEW: Add LaunchedPhase component using existing data */}
     {(roomPhase === 'launched' || (roomPhase === 'waiting' && serverRoomState.currentRound > 1)) ? (
  <LaunchedPhase
    currentRound={serverRoomState.currentRound}
    config={config}
    totalPlayers={serverRoomState.totalPlayers}
    playerId={playerId || ''}
    playerExtras={thisPlayer?.extras || []}
    roomPhase={roomPhase}
  />
) : roomPhase === 'leaderboard' && leaderboard.length > 0 ? (
  <div className="bg-green-50 p-6 rounded-xl text-center">
    <h2 className="text-lg font-bold text-green-900 mb-2">🏆 Leaderboard</h2>
    <ol className="list-decimal list-inside text-sm text-gray-800 mb-4">
      {leaderboard.map((entry) => (
        <li key={entry.id}>
          {entry.name} — {entry.score} pts
        </li>
      ))}
    </ol>
<GlobalExtrasDuringLeaderboard
      availableExtras={availableExtras}
      usedExtras={usedExtras}
      onUseExtra={handleUseExtra}
      leaderboard={leaderboard}
      currentPlayerId={playerId || ''}
      cumulativeNegativePoints={leaderboard.find(p => p.id === playerId)?.cumulativeNegativePoints || 0}
      pointsRestored={leaderboard.find(p => p.id === playerId)?.pointsRestored || 0}
    />
  </div>
) : (roomPhase === 'reviewing' || roomPhase === 'asking') && question ? (
      <div>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-gray-600">
            Round {serverRoomState.currentRound}/{serverRoomState.totalRounds} - Question {questionCounterDisplay}
          </span>
         
        </div>

        <RoundRouter
          roomPhase={roomPhase}
          currentRoundType={currentRoundType}
          question={question}
          timeLeft={null}
          timerActive={timerActive}
          selectedAnswer={selectedAnswer}
          setSelectedAnswer={setSelectedAnswer}
          answerSubmitted={answerSubmitted}
          clue={clue}
          feedback={feedback}
           correctAnswer={correctAnswer ?? undefined} 
          isFrozen={isFrozenNow}
          frozenNotice={frozenNotice}
          onSubmit={handleSubmit}
          roomId={roomId!}
          playerId={playerId!}
          roundExtras={roundExtras}
          usedExtras={usedExtras}
          usedExtrasThisRound={usedExtrasThisRound}
          onUseExtra={handleUseExtra}
        />
      </div>
    ) : (
      <div className="bg-gray-100 p-6 rounded-xl text-center text-gray-600">{phaseMessage}</div>
    )}

    <UseExtraModal
      visible={freezeModalOpen}
      players={playersInRoom.filter(p => p.id !== playerId)}
      onCancel={() => setFreezeModalOpen(false)}
      onConfirm={handleFreezeConfirm}
    />
  </div>
);
  
};

export default QuizGamePlayPage;













