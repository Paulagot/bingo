// src/components/Quiz/host-controls/HostControlsPage.tsx
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useNavigate } from 'react-router-dom';
import { useCountdownEffects } from '../hooks/useCountdownEffects';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';
import RoundRouter from './RoundRouter';
import ActivityTicker from '../host-controls/ActivityTicker';
import RoundStatsDisplay from '../host-controls/RoundStatsDisplay';
import FinalQuizStats from '../host-controls/FinalQuizStats';
import { useHostStats } from '../hooks/useHostStats';
import HostRoundPreview from './HostRoundPreview';
import { 
  Loader,
  Play, 
  SkipForward, 
  Users, 
  Trophy, 
  Timer, 
  Eye,
  XCircle,
  Crown,
  
  Medal,
  Award
} from 'lucide-react';

import { useQuizContract } from '../../../chains/stellar/useQuizContract';
import { useStellarWallet } from '../../../chains/stellar/useStellarWallet';

const debug = false;

type RoomStatePayload = {
  currentRound: number;
  totalRounds: number;
  roundTypeName: string;
  phase: 'waiting' | 'launched' | 'asking' | 'reviewing' | 'leaderboard' | 'complete' | 'distributing_prizes';
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

const HostControlsPage = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useQuizSocket();
  const { config } = useQuizConfig();

  const stellarContract = useQuizContract();
  const stellarWallet = useStellarWallet();

  const [roomState, setRoomState] = useState<RoomStatePayload>({
    currentRound: 1,
    totalRounds: 1,
    roundTypeName: '',
    phase: 'waiting',
    questionsThisRound: 0,
    totalPlayers: 0
  });

  // Prize distribution state
  const [prizeDistributionState, setPrizeDistributionState] = useState<{
    status: 'idle' | 'distributing' | 'success' | 'error';
    txHash?: string;
    error?: string;
  }>({ status: 'idle' });

  // Use host stats hook
  const {
    activities,
    currentRoundStats,
    allRoundsStats,
    clearActivity,
    hasRoundStats,
    hasFinalStats
  } = useHostStats({
    socket,
    roomId: roomId!,
    debug: debug
  });

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
  const timeLeft = null; // Will be removed in next phase

  // Use countdown effects hook (same as players use)
  const { currentEffect, isFlashing, getFlashClasses } = useCountdownEffects();

  // Check if we're on the last question of the round OR if review is complete
  const isLastQuestionOfRound = () => {
    // Method 1: If we're in reviewing phase and no current question, but have review question, check if it's the last review
    if (roomState.phase === 'reviewing' && reviewQuestion && !currentQuestion) {
      if (config?.roundDefinitions) {
        const currentRoundDef = config.roundDefinitions[roomState.currentRound - 1];
        if (currentRoundDef) {
          const questionsPerRound = currentRoundDef.config.questionsPerRound || 6;
          // If we've reviewed the expected number of questions, this is the end
          return questionInRound >= questionsPerRound;
        }
      }
      return true; // Fallback: if we're reviewing and no more questions coming, assume it's the last
    }
    
    // Method 2: Use server-provided question numbers during active questioning
    if (currentQuestion?.questionNumber && currentQuestion?.totalQuestions) {
      return currentQuestion.questionNumber === currentQuestion.totalQuestions;
    }
    
    // Method 3: Use config-based calculation during active questioning
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
    if (!config?.roundDefinitions || currentQuestionIndex < 0) return { questionInRound: 1, totalInRound: 1 };
    
    const currentRoundIndex = roomState.currentRound - 1;
    const currentRoundDef = config.roundDefinitions[currentRoundIndex];
    
    if (!currentRoundDef) return { questionInRound: 1, totalInRound: 1 };
    
    const questionsPerRound = currentRoundDef.config.questionsPerRound || 6;
    const questionInCurrentRound = currentQuestionIndex + 1;
    
    return {
      questionInRound: Math.max(1, questionInCurrentRound),
      totalInRound: questionsPerRound
    };
  };

  // Get current round information
  const currentRoundDef = config?.roundDefinitions?.[roomState.currentRound - 1];
  const roundTypeId = currentRoundDef?.roundType as RoundTypeId;
  const roundMetadata = roundTypeDefinitions[roundTypeId];

  // Join room as host when component mounts
  useEffect(() => {
    if (!socket || !connected || !roomId) return;
    
    if (debug) console.log('[HostControls] Joining room as host:', roomId);
    
    socket.emit('join_quiz_room', {
      roomId,
      user: { id: 'host', name: 'Host' },
      role: 'host'
    });
    
    // Request current state
    setTimeout(() => {
      socket.emit('request_current_state', { roomId });
    }, 100);
    
  }, [socket, connected, roomId]);

  // Listen for room_state updates
  useEffect(() => {
    if (!socket) return;
    const handleRoomState = (data: RoomStatePayload) => {
      if (debug) console.log('[Host] Received room_state update:', data);
      setRoomState(data);
      
      // Reset round leaderboard state when phase changes
      if (data.phase !== 'leaderboard') {
        setIsShowingRoundResults(false);
        setRoundLeaderboard([]);
      }
      
      // Reset review complete flag when leaving reviewing phase
      if (data.phase !== 'reviewing') {
        setReviewComplete(false);
      }
    };
    socket.on('room_state', handleRoomState);
    return () => {
      socket.off('room_state', handleRoomState);
    };
  }, [socket]);

  useEffect(() => {
  if (!socket) return;
  const handleFinalLeaderboard = (data: LeaderboardEntry[]) => {
    if (debug) console.log('[Host] Final leaderboard received:', data);
    setLeaderboard(data); // Use existing leaderboard state
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
      
      // Update question index (same logic as players)
      const isRecovery = currentQuestionIndex >= 0 && 
                        Math.abs(Date.now() - data.questionStartTime) > 5000;
      
      if (!isRecovery) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
      
      setCurrentQuestion(data);
      setReviewQuestion(null);
      
      // Calculate question position (same as players)
      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
      } else if (config?.roundDefinitions) {
        const newIndex = isRecovery ? currentQuestionIndex : currentQuestionIndex + 1;
        const { questionInRound: qInRound, totalInRound: totalInR } = calculateQuestionPosition(newIndex);
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
      setCurrentQuestion(null);
      
      // Update question position from server data
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
      setIsShowingRoundResults(false); // Switch to overall leaderboard
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

  // Show round results
  const handleShowRoundResults = () => {
    if (debug) console.log('[Host] Showing round results...');
    socket?.emit('show_round_results', { roomId });
  };

  // Continue to overall leaderboard
  const handleContinueToOverallLeaderboard = () => {
    if (debug) console.log('[Host] Continuing to overall leaderboard...');
    socket?.emit('continue_to_overall_leaderboard', { roomId });
  };

  const handleLeaderboardConfirm = () => {
    socket?.emit('next_round_or_end', { roomId });
  };

  const handleCancelQuiz = () => {
    if (debug) console.log('HostControls User initiated quiz cancellation');

    if (socket && roomId) {
      socket.emit('delete_quiz_room', { roomId });
      if (debug) console.log('Cancellation request sent to server');
    } else {
      navigate('/quiz');
    }
  };

  // Get round scoring information
  const getRoundScoringInfo = () => {
    if (!currentRoundDef || !roundMetadata) return null;

    const roundConfig = currentRoundDef.config;
    const defaultConfig = roundMetadata.defaultConfig || {};
    
    const pointsPerDifficulty = roundConfig?.pointsPerDifficulty || defaultConfig.pointsPerDifficulty || { easy: 1, medium: 2, hard: 3 };
    const pointsLostPerWrong = roundConfig?.pointsLostPerWrong ?? defaultConfig.pointsLostPerWrong ?? 0;
    const pointsLostPerNoAnswer = roundConfig?.pointsLostPerUnanswered ?? defaultConfig.pointsLostPerUnanswered ?? 0;
    const timePerQuestion = roundConfig?.timePerQuestion || defaultConfig.timePerQuestion || 25;
    const questionsPerRound = roundConfig?.questionsPerRound || defaultConfig.questionsPerRound || 6;
    
    const roundDifficulty = currentRoundDef.difficulty;
    const pointsForThisRound = roundDifficulty ? pointsPerDifficulty[roundDifficulty] : null;

    return {
      pointsPerDifficulty,
      pointsLostPerWrong,
      pointsLostPerNoAnswer,
      timePerQuestion,
      questionsPerRound,
      roundDifficulty,
      pointsForThisRound
    };
  };

  const scoringInfo = getRoundScoringInfo();
  
  useEffect(() => {
    if (roomState.phase === 'complete' && leaderboard.length > 0) {
      if (debug) console.log('[Host] Prize distribution debug:', {
        leaderboardPlayers: leaderboard.map(p => ({
          id: p.id,
          name: p.name,
          score: p.score
        })),
        needWalletAddresses: 'Players need to have joined with Stellar addresses stored'
      });
    }
  }, [roomState.phase, leaderboard]);

  // Add this useEffect to debug wallet state in HostControlsPage.tsx
  useEffect(() => {
    if (debug) console.log('[Host] Stellar wallet state debug:', {
      isReady: stellarContract?.isReady,
      walletAddress: stellarContract?.walletAddress,
      contractAddress: stellarContract?.contractAddress,
      currentNetwork: stellarContract?.currentNetwork
    });
  }, [stellarContract]);

  // Also debug the config and UI state
  useEffect(() => {
    if (debug) console.log('[Host] UI state debug:', {
      paymentMethod: config?.paymentMethod,
      phase: roomState.phase,
      buttonShouldBeVisible: roomState.phase === 'complete' && config?.paymentMethod === 'web3',
      buttonShouldBeEnabled: stellarContract?.isReady
    });
  }, [config, roomState.phase, stellarContract?.isReady]);

  // Prize distribution handler
  const handleDistributePrizes = () => {
    if (debug) console.log('[Host] Initiating prize distribution...');
    
    // Set state to distributing to disable button
    setPrizeDistributionState({ status: 'distributing' });
    
    socket?.emit('end_quiz_and_distribute_prizes', { roomId });
    if (debug) console.log('[Host] Prize distribution initiated');
    if (debug) console.log('[Host] Winners needed:', leaderboard.slice(0, 3).map(p => p.name));
  };

  // Add socket listeners for prize distribution completion
  useEffect(() => {
    if (!socket) return;

    const handlePrizeDistributionCompleted = (data: {
      roomId: string;
      success: boolean;
      txHash?: string;
      error?: string;
    }) => {
      if (debug) console.log('[Host] Prize distribution completed:', data);
      
      if (data.success) {
        setPrizeDistributionState({ 
          status: 'success', 
          txHash: data.txHash 
        });
      } else {
        setPrizeDistributionState({ 
          status: 'error', 
          error: data.error || 'Distribution failed' 
        });
      }
    };

    socket.on('prize_distribution_completed', handlePrizeDistributionCompleted);

    return () => {
      socket.off('prize_distribution_completed', handlePrizeDistributionCompleted);
    };
  }, [socket]);

  // Add socket listeners for prize distribution
  useEffect(() => {
    if (!socket) return;

    const handlePrizeDistribution = async (data: {
      roomId: string;
      winners: string[];
      finalLeaderboard: any[];
      web3Chain?: string;
    }) => {
      if (debug) console.log('[Host] Received prize distribution request:', data);

      try {
        if (!stellarContract) {
          throw new Error('Contract not initialized');
        }

        if (!stellarContract.endRoom) {
          throw new Error('endRoom method not available');
        }

        if (!stellarContract.isReady) {
          throw new Error('Wallet not connected');
        }

        if (debug) console.log('[Host] Calling endRoom with:', {
          roomId: data.roomId,
          winners: data.winners,
          winnersCount: data.winners.length
        });

        const result = await stellarContract.endRoom({
          roomId: data.roomId,
          winners: data.winners
        });

        if (result.success) {
          if (debug) console.log('[Host] Prize distribution successful:', result.txHash);
          socket.emit('prize_distribution_completed', {
            roomId: data.roomId,
            success: true,
            txHash: result.txHash
          });
        } else {
          socket.emit('prize_distribution_completed', {
            roomId: data.roomId,
            success: false,
            error: result.error || 'Unknown error occurred'
          });
        }
      } catch (error: any) {
        console.error('[Host] Prize distribution failed:', error);
        socket.emit('prize_distribution_completed', {
          roomId: data.roomId,
          success: false,
          error: error.message || 'Contract call failed'
        });
      }
    };

    socket.on('initiate_prize_distribution', handlePrizeDistribution);

    return () => {
      socket.off('initiate_prize_distribution', handlePrizeDistribution);
    };
  }, [socket, roomId, stellarContract]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      
      {/* Countdown Effect Overlay (same as players) */}
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

      <div className={`container mx-auto max-w-6xl px-4 py-8 ${getFlashClasses()}`}>
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-fg mb-2 flex items-center justify-center space-x-3 text-3xl font-bold md:text-4xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white">
              👑
            </div>
            <span>Host Dashboard</span>
          </h1>
          <p className="text-fg/70 text-lg">Control your quiz experience</p>
          <p className="text-fg/60 mt-2 text-sm">Room: {roomId}</p>
        </div>

        {/* Status Bar */}
        <div className="bg-muted border-border mb-6 rounded-xl border p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-fg text-lg font-semibold">
                Round {roomState.currentRound} / {roomState.totalRounds}
              </span>
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-fg/70 text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-fg/70 text-sm">{roomState.totalPlayers || 0} players</span>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                roomState.phase === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                roomState.phase === 'launched' ? 'bg-green-100 text-green-800' :
                roomState.phase === 'asking' ? 'bg-blue-100 text-blue-800' :
                roomState.phase === 'reviewing' ? 'bg-orange-100 text-orange-800' :
                roomState.phase === 'leaderboard' ? 'bg-purple-100 text-purple-800' :
                'text-fg bg-gray-100'
              }`}>
                {roomState.phase.charAt(0).toUpperCase() + roomState.phase.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Activity Ticker - Prominently placed for host visibility */}
        <ActivityTicker
          activities={activities}
          onClearActivity={clearActivity}
          maxVisible={8}
        />

       {/* Round Information Card */}
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

        {/* Active Question Display */}
        {currentQuestion && roomState.phase === 'asking' && (
          <div className="bg-muted mb-6 rounded-xl border-2 border-blue-200 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <span>Current Question</span>
                </h3>
                {/* Question Counter */}
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
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                )}
                {timeLeft !== null && (
                  <div className="flex items-center space-x-2">
                    <Timer className="h-4 w-4 text-orange-600" />
                    <span className={`text-lg font-bold ${
                      timeLeft <= 10 ? 'animate-pulse text-red-600' : 
                      timeLeft <= 30 ? 'text-orange-600' : 'text-green-600'
                    }`}>
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
                  <div key={idx} className="bg-muted rounded border p-3 text-sm transition-colors hover:bg-gray-50">
                    <span className="text-fg/70 font-medium">Option {String.fromCharCode(65 + idx)}:</span> {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Question Display with Statistics */}
        {reviewQuestion && roomState.phase === 'reviewing' && (
          <div className="bg-muted mb-6 rounded-xl border-2 border-yellow-200 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-fg text-lg font-bold">📖 Question Review</h3>
                {/* Show question position */}
                {reviewQuestion.questionNumber && reviewQuestion.totalQuestions && (
                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
                    Question {reviewQuestion.questionNumber}/{reviewQuestion.totalQuestions}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {/* Show round results button for last question OR when review is complete */}
                {(isLastQuestionOfRound() || reviewComplete) && (
                  <button 
                    onClick={handleShowRoundResults} 
                    className="flex items-center space-x-2 rounded-lg bg-purple-500 px-4 py-2 font-medium text-white transition hover:bg-purple-600"
                  >
                    <Trophy className="h-4 w-4" />
                    <span>Show Round Results</span>
                  </button>
                )}
                <button 
                  onClick={handleNextReview} 
                  className="flex items-center space-x-2 rounded-lg bg-yellow-500 px-4 py-2 font-medium text-white transition hover:bg-yellow-600"
                  disabled={reviewComplete}
                >
                  <SkipForward className="h-4 w-4" />
                  <span>{reviewComplete ? 'Review Complete' : 'Next Review'}</span>
                </button>
              </div>
            </div>

            {/* Use RoundRouter for consistent display with statistics */}
            <RoundRouter
              roomPhase="reviewing"
              currentRoundType={currentRoundDef?.roundType}
              question={{
                id: reviewQuestion.id,
                text: reviewQuestion.text,
                options: reviewQuestion.options,
                timeLimit: 0,
                difficulty: reviewQuestion.difficulty,
                category: reviewQuestion.category
              }}
              timeLeft={null}
              timerActive={false}
              selectedAnswer=""
              setSelectedAnswer={() => {}}
              answerSubmitted={false}
              clue={null}
              feedback={null}
              correctAnswer={reviewQuestion.correctAnswer}
              isFrozen={false}
              frozenNotice={null}
              onSubmit={() => {}}
              roomId={roomId!}
              playerId="host"
              roundExtras={[]}
              usedExtras={{}}
              usedExtrasThisRound={{}}
              onUseExtra={() => {}}
              questionNumber={reviewQuestion.questionNumber}
              totalQuestions={reviewQuestion.totalQuestions}
              difficulty={reviewQuestion.difficulty}
              category={reviewQuestion.category}
              // Pass statistics and host flag
              statistics={reviewQuestion.statistics}
              isHost={true}
            />
          </div>
        )}

        {/* Round Stats Display (show during round leaderboard) */}
        {roomState.phase === 'leaderboard' && isShowingRoundResults && hasRoundStats && currentRoundStats && (
          <RoundStatsDisplay
            roundStats={currentRoundStats}
            isVisible={true}
          />
        )}

        {/* Round Leaderboard Display */}
        {roomState.phase === 'leaderboard' && isShowingRoundResults && roundLeaderboard.length > 0 && (
          <div className="bg-muted mb-6 rounded-xl border-2 border-purple-200 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
                <Medal className="h-5 w-5 text-purple-600" />
                <span>Round {roomState.currentRound} Results</span>
              </h3>
              <button 
                onClick={handleContinueToOverallLeaderboard} 
                className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition hover:bg-purple-700"
              >
                <Trophy className="h-4 w-4" />
                <span>Show Overall Leaderboard</span>
              </button>
            </div>
            
            <div className="rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-4">
              <div className="mb-4 text-center">
                <h4 className="mb-2 text-xl font-bold text-purple-800">🎉 Round {roomState.currentRound} Complete!</h4>
                <p className="text-purple-600">Here's how everyone performed this round</p>
              </div>
              <div className="space-y-2">
                {roundLeaderboard.map((entry, idx) => (
                  <div key={entry.id} className="bg-muted flex items-center justify-between rounded border-2 border-purple-200 p-3">
                    <div className="flex items-center space-x-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-800 shadow-md' :
                        idx === 1 ? 'text-fg bg-gray-100 shadow-md' :
                        idx === 2 ? 'bg-orange-100 text-orange-800 shadow-md' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">{entry.name}</span>
                      {idx === 0 && <Crown className="h-4 w-4 text-yellow-600" />}
                      {idx === 1 && <Medal className="text-fg/70 h-4 w-4" />}
                      {idx === 2 && <Award className="h-4 w-4 text-orange-600" />}
                    </div>
                    <span className="text-fg font-bold">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Overall Leaderboard Display */}
        {roomState.phase === 'leaderboard' && !isShowingRoundResults && leaderboard.length > 0 && (
          <div className="bg-muted mb-6 rounded-xl border-2 border-green-200 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span>Overall Leaderboard</span>
              </h3>
              <button 
                onClick={handleLeaderboardConfirm} 
                className="flex items-center space-x-2 rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
              >
                <SkipForward className="h-4 w-4" />
                <span>Continue</span>
              </button>
            </div>
            
            <div className="rounded-lg bg-green-50 p-4">
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.id} className="bg-muted flex items-center justify-between rounded border p-3">
                    <div className="flex items-center space-x-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                        idx === 1 ? 'text-fg bg-gray-100' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">{entry.name}</span>
                      {idx === 0 && <Crown className="h-4 w-4 text-yellow-600" />}
                    </div>
                    <span className="text-fg font-bold">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* Quiz Complete */}
        {roomState.phase === 'complete' && (
          <div className="mb-6 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-8 text-center">
            <div className="mb-4 text-6xl">🎉</div>
            <h2 className="mb-2 text-3xl font-bold text-purple-800">Quiz Complete!</h2>
            <p className="text-lg text-purple-600">Thank you for hosting this amazing quiz experience!</p>
            
            {/* Web3 Prize Distribution Button */}
            {config?.paymentMethod === 'web3' && roomState.phase === 'complete' && (
              <div className="mt-6">
                {/* Wallet Connection Section */}
                {!stellarWallet.isConnected && (
                  <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-center">
                    <div className="mb-4 text-4xl">🔗</div>
                    <h3 className="mb-2 text-xl font-bold text-blue-800">
                      Connect Stellar Wallet
                    </h3>
                    <p className="mb-4 text-blue-600">
                      Connect your wallet to distribute prizes to winners
                    </p>
                    
                    <button
                      onClick={() => stellarWallet.connect()}
                      disabled={stellarWallet?.isConnecting}
                      className="mx-auto flex items-center space-x-3 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {stellarWallet?.isConnecting ? (
                        <>
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <span>🔗</span>
                          <span>Connect Wallet</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Connected State */}
                {stellarWallet.isConnected && (
                  <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-2xl">✅</div>
                        <div>
                          <div className="font-semibold text-green-800">Stellar Wallet Connected</div>
                          <div className="text-sm text-green-600">
                            {stellarWallet.address ? `${stellarWallet.address.slice(0, 8)}...${stellarWallet.address.slice(-6)}` : 'Loading address...'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => stellarWallet.disconnect()}
                        className="rounded bg-red-100 px-3 py-1 text-sm text-red-700 hover:bg-red-200"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Prize Distribution Button States */}
                {stellarWallet.isConnected && stellarContract?.isReady && (
                  <div className="text-center">
                    {prizeDistributionState.status === 'idle' && (
                      <>
                        <button
                          onClick={handleDistributePrizes}
                          className="mx-auto flex items-center space-x-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                        >
                          <span>🏆</span>
                          <span>Distribute Prizes via Smart Contract</span>
                        </button>
                        <p className="mt-2 text-sm text-green-600">
                          This will automatically send prizes to the top players using the blockchain
                        </p>
                      </>
                    )}

                    {prizeDistributionState.status === 'distributing' && (
                      <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
                        <div className="flex items-center justify-center space-x-3 text-orange-700">
                          <Loader className="h-6 w-6 animate-spin" />
                          <span className="text-lg font-semibold">Distributing Prizes...</span>
                        </div>
                        <p className="mt-2 text-sm text-orange-600">
                          Transaction is being processed on the blockchain. Please wait...
                        </p>
                      </div>
                    )}

                    {prizeDistributionState.status === 'success' && (
                      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6">
                        <div className="mb-3 text-center">
                          <div className="text-4xl">✅</div>
                          <h3 className="text-xl font-bold text-green-800">Prizes Distributed Successfully!</h3>
                        </div>
                        {prizeDistributionState.txHash && (
                          <p className="text-center text-sm text-green-600">
                            Transaction Hash: <code className="bg-green-100 px-2 py-1 rounded">{prizeDistributionState.txHash}</code>
                          </p>
                        )}
                      </div>
                    )}

                    {prizeDistributionState.status === 'error' && (
                      <div className="rounded-xl border-2 border-red-200 bg-red-50 p-6">
                        <div className="mb-3 text-center">
                          <div className="text-4xl">❌</div>
                          <h3 className="text-xl font-bold text-red-800">Prize Distribution Failed</h3>
                        </div>
                        <p className="text-center text-sm text-red-600">
                          Error: {prizeDistributionState.error}
                        </p>
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setPrizeDistributionState({ status: 'idle' })}
                            className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                          >
                            Try Again
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Prize Distribution Status */}
        {roomState.phase === 'distributing_prizes' && (
          <div className="mb-6 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-8 text-center">
            <div className="mb-4 text-6xl">💰</div>
            <h2 className="mb-2 text-3xl font-bold text-orange-800">Distributing Prizes...</h2>
            <p className="text-lg text-orange-600">Please wait while prizes are sent to winners via smart contract</p>
            <div className="mt-4">
              <Loader className="mx-auto h-8 w-8 animate-spin text-orange-600" />
            </div>
          </div>
        )}

         {/* Final Leaderboard Display */}
    {roomState.phase === 'complete' && leaderboard.length > 0 && (
      <div className="bg-muted mb-6 rounded-xl border-2 border-green-200 p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-center">
          <h3 className="text-fg flex items-center space-x-2 text-2xl font-bold">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <span>Final Quiz Results</span>
          </h3>
        </div>
        
        <div className="rounded-lg bg-gradient-to-r from-green-50 to-blue-50 p-6">
          <div className="mb-4 text-center">
            <h4 className="mb-2 text-xl font-bold text-green-800">🏆 Final Rankings</h4>
            <p className="text-green-600">Congratulations to all participants!</p>
          </div>
          <div className="space-y-3">
            {leaderboard.map((entry, idx) => (
              <div key={entry.id} className="bg-muted flex items-center justify-between rounded-lg border-2 p-4 shadow-sm">
                <div className="flex items-center space-x-4">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400' :
                    idx === 1 ? 'text-fg bg-gray-100 ring-2 ring-gray-400' :
                    idx === 2 ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-400' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="text-lg font-semibold">{entry.name}</span>
                  {idx === 0 && <Crown className="h-6 w-6 text-yellow-600" />}
                  {idx === 1 && <Medal className="text-fg/70 h-6 w-6" />}
                  {idx === 2 && <Award className="h-6 w-6 text-orange-600" />}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-700">{entry.score} pts</div>
                  {(entry.cumulativeNegativePoints || 0) > 0 && (
  <div className="text-sm text-gray-600">
    -{entry.cumulativeNegativePoints || 0} penalties
  </div>
)}
{(entry.pointsRestored || 0) > 0 && (
  <div className="text-sm text-purple-600">
    +{entry.pointsRestored || 0} restored
  </div>
)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

        {/* Final Quiz Statistics (show when quiz is complete) */}
        {debug && roomState.phase === 'complete' && (
          <div className="mb-4 rounded-lg bg-yellow-100 p-4">
            <h4 className="font-semibold text-yellow-800">🐛 Final Stats Debug</h4>
            <div className="text-sm text-yellow-700">
              <div>Phase: {roomState.phase}</div>
              <div>hasFinalStats: {hasFinalStats ? '✅' : '❌'}</div>
              <div>allRoundsStats length: {allRoundsStats.length}</div>
              <div>allRoundsStats: {JSON.stringify(allRoundsStats, null, 2)}</div>
            </div>
          </div>
        )}
        
        {roomState.phase === 'complete' && (hasFinalStats || allRoundsStats.length > 0) && (
          <FinalQuizStats
            allRoundsStats={allRoundsStats}
            totalPlayers={roomState.totalPlayers || 0}
            isVisible={true}
          />
        )}
        
        {/* Fallback: Show even without hasFinalStats if we have data */}
        {roomState.phase === 'complete' && !hasFinalStats && allRoundsStats.length === 0 && (
          <div className="mb-6 rounded-xl bg-blue-50 p-6 text-center">
            <div className="mb-2 text-blue-600">📊</div>
            <h3 className="mb-2 text-lg font-bold text-blue-800">No Statistics Available</h3>
            <p className="text-blue-600">Final quiz statistics are not yet available. They may still be loading.</p>
          </div>
        )}

        {/* Cancel Quiz Section */}
        <div className="text-center">
          <button
            onClick={handleCancelQuiz}
            className="mx-auto flex items-center space-x-2 rounded-xl bg-red-100 px-6 py-2 font-medium text-red-700 transition hover:bg-red-200"
          >
            <XCircle className="h-4 w-4" />
            <span>Cancel Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostControlsPage;