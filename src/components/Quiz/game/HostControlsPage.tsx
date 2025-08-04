// src/components/Quiz/host-controls/HostControlsPage.tsx
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useNavigate } from 'react-router-dom';
import { useQuizTimer } from '../hooks/useQuizTimer';
import { useCountdownEffects } from '../hooks/useCountdownEffects';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';
import RoundRouter from './RoundRouter';
import ActivityTicker from '../host-controls/ActivityTicker';
import RoundStatsDisplay from '../host-controls/RoundStatsDisplay';
import FinalQuizStats from '../host-controls/FinalQuizStats';
import { useHostStats } from '../hooks/useHostStats';
import { 
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

const debug = false;

type RoomStatePayload = {
  currentRound: number;
  totalRounds: number;
  roundTypeName: string;
  phase: 'waiting' | 'launched' | 'asking' | 'reviewing' | 'leaderboard' | 'complete';
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

  const [roomState, setRoomState] = useState<RoomStatePayload>({
    currentRound: 1,
    totalRounds: 1,
    roundTypeName: '',
    phase: 'waiting',
    questionsThisRound: 0,
    totalPlayers: 0
  });

  // ✅ Use host stats hook
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
  const [totalInRound, setTotalInRound] = useState(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);

  // Use the timer hook (same as players use)
  const { timeLeft } = useQuizTimer({
    question: currentQuestion,
    timerActive: roomState.phase === 'asking',
    onTimeUp: () => {
      if (debug) console.log('[Host] ⏰ Timer reached zero - server will advance question');
    }
  });

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
    
    if (debug) console.log('[HostControls] 🚪 Joining room as host:', roomId);
    
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
      if (debug) console.log('[Host] 🔄 Received room_state update:', data);
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

  // Listen for question events
  useEffect(() => {
    if (!socket) return;
    const handleQuestion = (data: QuestionPayload) => {
      if (debug) console.log('[Host] 📥 Received question:', data);
      
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
      if (debug) console.log('[Host] 🧐 Received host review question:', data);
      setReviewQuestion(data);
      setCurrentQuestion(null);
      
      // Update question position from server data
      if (data.questionNumber && data.totalQuestions) {
        setQuestionInRound(data.questionNumber);
        setTotalInRound(data.totalQuestions);
        if (debug) console.log(`[Host] 📍 Review position: ${data.questionNumber}/${data.totalQuestions}`);
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
      if (debug) console.log('[Host] 📝 Review complete notification:', data);
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
      if (debug) console.log('[Host] 🏆 Round leaderboard received:', data);
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
      if (debug) console.log('[Host] 🏆 Overall leaderboard received:', data);
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
    if (debug) console.log('[Host] 🎬 Starting round...');
    socket?.emit('start_round', { roomId });
  };

  const handleNextReview = () => {
    socket?.emit('next_review', { roomId });
  };

  // Show round results
  const handleShowRoundResults = () => {
    if (debug) console.log('[Host] 📊 Showing round results...');
    socket?.emit('show_round_results', { roomId });
  };

  // Continue to overall leaderboard
  const handleContinueToOverallLeaderboard = () => {
    if (debug) console.log('[Host] ➡️ Continuing to overall leaderboard...');
    socket?.emit('continue_to_overall_leaderboard', { roomId });
  };

  const handleLeaderboardConfirm = () => {
    socket?.emit('next_round_or_end', { roomId });
  };

  const handleCancelQuiz = () => {
    if (debug) console.log('👤 [HostControls] 🚫 User initiated quiz cancellation');

    if (socket && roomId) {
      socket.emit('delete_quiz_room', { roomId });
      if (debug) console.log('✅ Cancellation request sent to server');
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
    const pointsLostPerNoAnswer = roundConfig?.pointslostperunanswered ?? defaultConfig.pointslostperunanswered ?? 0;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      
      {/* Countdown Effect Overlay (same as players) */}
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

      <div className={`container mx-auto max-w-6xl px-4 py-8 ${getFlashClasses()}`}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl">
              👑
            </div>
            <span>Host Dashboard</span>
          </h1>
          <p className="text-gray-600 text-lg">Control your quiz experience</p>
          <p className="text-sm text-gray-500 mt-2">Room: {roomId}</p>
        </div>

        {/* Status Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <span className="text-lg font-semibold text-gray-800">
                Round {roomState.currentRound} / {roomState.totalRounds}
              </span>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">{connected ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-600">{roomState.totalPlayers || 0} players</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                roomState.phase === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                roomState.phase === 'launched' ? 'bg-green-100 text-green-800' :
                roomState.phase === 'asking' ? 'bg-blue-100 text-blue-800' :
                roomState.phase === 'reviewing' ? 'bg-orange-100 text-orange-800' :
                roomState.phase === 'leaderboard' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {roomState.phase.charAt(0).toUpperCase() + roomState.phase.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* ✅ Activity Ticker - Prominently placed for host visibility */}
        <ActivityTicker
          activities={activities}
          onClearActivity={clearActivity}
          maxVisible={8}
        />

        {/* Round Information Card (when in waiting/launched phase) */}
        {(roomState.phase === 'waiting' || roomState.phase === 'launched') && roundMetadata && currentRoundDef && (
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-8 rounded-xl border border-purple-200 shadow-lg mb-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-3">{roundMetadata.icon}</div>
              <h2 className="text-3xl font-bold text-indigo-900 mb-2">
                {roomState.phase === 'waiting' ? 'Preparing' : 'Ready to Start'} Round {roomState.currentRound}
              </h2>
              <h3 className="text-xl text-indigo-700 font-semibold">{roundMetadata.name}</h3>
              
              {/* Round details */}
              <div className="flex justify-center items-center space-x-4 mt-3">
                {currentRoundDef.category && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    📚 {currentRoundDef.category}
                  </span>
                )}
                {currentRoundDef.difficulty && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    currentRoundDef.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    currentRoundDef.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {currentRoundDef.difficulty.charAt(0).toUpperCase() + currentRoundDef.difficulty.slice(1)} Level
                  </span>
                )}
              </div>
            </div>

            {/* Round Rules */}
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 mb-6">
              <h4 className="text-lg font-bold text-gray-800 mb-3">📋 Round Configuration</h4>
              <p className="text-gray-700 mb-4">{roundMetadata.description}</p>
              
              {scoringInfo && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-blue-800 mb-2">⏱️ Timing & Scoring</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• {scoringInfo.questionsPerRound} questions this round</li>
                      <li>• {scoringInfo.timePerQuestion} seconds per question</li>
                      
                      {scoringInfo.pointsForThisRound !== null ? (
                        <li className={`${
                          scoringInfo.roundDifficulty === 'easy' ? 'text-green-700' :
                          scoringInfo.roundDifficulty === 'medium' ? 'text-blue-700' :
                          'text-purple-700'
                        }`}>
                          • +{scoringInfo.pointsForThisRound} points for correct answers
                        </li>
                      ) : (
                        <>
                          <li className="text-green-700">• +{scoringInfo.pointsPerDifficulty.easy} points for easy questions</li>
                          <li className="text-blue-700">• +{scoringInfo.pointsPerDifficulty.medium} points for medium questions</li>
                          <li className="text-purple-700">• +{scoringInfo.pointsPerDifficulty.hard} points for hard questions</li>
                        </>
                      )}
                      
                      {scoringInfo.pointsLostPerWrong > 0 && (
                        <li className="text-red-600">• -{scoringInfo.pointsLostPerWrong} points for wrong answers</li>
                      )}
                      {scoringInfo.pointsLostPerNoAnswer > 0 && (
                        <li className="text-orange-600">• -{scoringInfo.pointsLostPerNoAnswer} points for not answering</li>
                      )}
                      {scoringInfo.pointsLostPerWrong === 0 && scoringInfo.pointsLostPerNoAnswer === 0 && (
                        <li className="text-gray-600">• No penalties for wrong/missed answers</li>
                      )}
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h5 className="font-semibold text-green-800 mb-2">🎯 Host Controls</h5>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Start round when players are ready</li>
                      <li>• Monitor question timer during play</li>
                      <li>• Review answers with players</li>
                      <li>• Control leaderboard transitions</li>
                      <li>• Cancel quiz if needed</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Host Action Buttons */}
            {roomState.phase === 'waiting' && (
              <div className="text-center">
                <button 
                  onClick={handleStartRound} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-3 mx-auto"
                >
                  <Play className="w-6 h-6" />
                  <span>Launch Quiz & Start Round {roomState.currentRound}</span>
                </button>
              </div>
            )}

            {roomState.phase === 'launched' && (
              <div className="text-center">
                <div className="bg-green-50 p-4 rounded-lg mb-4">
                  <p className="text-green-700 font-medium">🚀 Quiz launched! Players are now ready.</p>
                </div>
                <button 
                  onClick={handleStartRound} 
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-3 mx-auto"
                >
                  <Play className="w-6 h-6" />
                  <span>Start Round {roomState.currentRound}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Question Display */}
        {currentQuestion && roomState.phase === 'asking' && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-blue-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <span>Current Question</span>
                </h3>
                {/* Question Counter */}
                {(currentQuestion.questionNumber && currentQuestion.totalQuestions) && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    Question {currentQuestion.questionNumber}/{currentQuestion.totalQuestions}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                {currentQuestion.category && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {currentQuestion.category}
                  </span>
                )}
                {currentQuestion.difficulty && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                )}
                {timeLeft !== null && (
                  <div className="flex items-center space-x-2">
                    <Timer className="w-4 h-4 text-orange-600" />
                    <span className={`font-bold text-lg ${
                      timeLeft <= 10 ? 'text-red-600 animate-pulse' : 
                      timeLeft <= 30 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {timeLeft}s
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-lg text-gray-800 mb-3">{currentQuestion.text}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentQuestion.options.map((opt, idx) => (
                  <div key={idx} className="bg-white p-3 rounded border text-sm hover:bg-gray-50 transition-colors">
                    <span className="font-medium text-gray-600">Option {String.fromCharCode(65 + idx)}:</span> {opt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Review Question Display with Statistics */}
        {reviewQuestion && roomState.phase === 'reviewing' && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-yellow-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-gray-800">📖 Question Review</h3>
                {/* Show question position */}
                {reviewQuestion.questionNumber && reviewQuestion.totalQuestions && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    Question {reviewQuestion.questionNumber}/{reviewQuestion.totalQuestions}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                {/* Show round results button for last question OR when review is complete */}
                {(isLastQuestionOfRound() || reviewComplete) && (
                  <button 
                    onClick={handleShowRoundResults} 
                    className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2"
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Show Round Results</span>
                  </button>
                )}
                <button 
                  onClick={handleNextReview} 
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2"
                  disabled={reviewComplete}
                >
                  <SkipForward className="w-4 h-4" />
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
          <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <Medal className="w-5 h-5 text-purple-600" />
                <span>Round {roomState.currentRound} Results</span>
              </h3>
              <button 
                onClick={handleContinueToOverallLeaderboard} 
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2"
              >
                <Trophy className="w-4 h-4" />
                <span>Show Overall Leaderboard</span>
              </button>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
              <div className="text-center mb-4">
                <h4 className="text-xl font-bold text-purple-800 mb-2">🎉 Round {roomState.currentRound} Complete!</h4>
                <p className="text-purple-600">Here's how everyone performed this round</p>
              </div>
              <div className="space-y-2">
                {roundLeaderboard.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center justify-between bg-white p-3 rounded border-2 border-purple-200">
                    <div className="flex items-center space-x-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-800 shadow-md' :
                        idx === 1 ? 'bg-gray-100 text-gray-800 shadow-md' :
                        idx === 2 ? 'bg-orange-100 text-orange-800 shadow-md' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">{entry.name}</span>
                      {idx === 0 && <Crown className="w-4 h-4 text-yellow-600" />}
                      {idx === 1 && <Medal className="w-4 h-4 text-gray-600" />}
                      {idx === 2 && <Award className="w-4 h-4 text-orange-600" />}
                    </div>
                    <span className="font-bold text-gray-800">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Overall Leaderboard Display */}
        {roomState.phase === 'leaderboard' && !isShowingRoundResults && leaderboard.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border-2 border-green-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-600" />
                <span>Overall Leaderboard</span>
              </h3>
              <button 
                onClick={handleLeaderboardConfirm} 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center space-x-2"
              >
                <SkipForward className="w-4 h-4" />
                <span>Continue</span>
              </button>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="space-y-2">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.id} className="flex items-center justify-between bg-white p-3 rounded border">
                    <div className="flex items-center space-x-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                        idx === 1 ? 'bg-gray-100 text-gray-800' :
                        idx === 2 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="font-medium">{entry.name}</span>
                      {idx === 0 && <Crown className="w-4 h-4 text-yellow-600" />}
                    </div>
                    <span className="font-bold text-gray-800">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quiz Complete */}
        {roomState.phase === 'complete' && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-8 rounded-xl border-2 border-purple-200 text-center mb-6">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold text-purple-800 mb-2">Quiz Complete!</h2>
            <p className="text-purple-600 text-lg">Thank you for hosting this amazing quiz experience!</p>
          </div>
        )}

        {/* Final Quiz Statistics (show when quiz is complete) */}
        {debug && roomState.phase === 'complete' && (
          <div className="bg-yellow-100 rounded-lg p-4 mb-4">
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
          <div className="bg-blue-50 rounded-xl p-6 mb-6 text-center">
            <div className="text-blue-600 mb-2">📊</div>
            <h3 className="text-lg font-bold text-blue-800 mb-2">No Statistics Available</h3>
            <p className="text-blue-600">Final quiz statistics are not yet available. They may still be loading.</p>
          </div>
        )}

        {/* Debug Panel (removable) */}
        {/* {debug && (
          <div className="bg-gray-100 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span>Debug Information</span>
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div>Phase: {roomState.phase} | Connected: {connected ? '✅' : '❌'}</div>
              <div>Socket ID: {socket?.id || 'None'} | Timer: {timeLeft}s</div>
              <div>Round: {roomState.currentRound}/{roomState.totalRounds} | Type: {roomState.roundTypeName}</div>
              <div>Question: {questionInRound}/{totalInRound} | Last Question: {isLastQuestionOfRound() ? '✅' : '❌'}</div>
              <div>Round Results: {isShowingRoundResults ? '✅' : '❌'} | Round Leaderboard: {roundLeaderboard.length} entries</div>
              <div>Review Complete: {reviewComplete ? '✅' : '❌'} | Review Question: {reviewQuestion ? '✅' : '❌'}</div>
              <div>Activities: {activities.length} | Round Stats: {hasRoundStats ? '✅' : '❌'} | Final Stats: {hasFinalStats ? '✅' : '❌'}</div>
            </div>
          </div>
        )} */}

        {/* Cancel Quiz Section */}
        <div className="text-center">
          <button
            onClick={handleCancelQuiz}
            className="bg-red-100 text-red-700 px-6 py-2 rounded-xl font-medium hover:bg-red-200 transition flex items-center space-x-2 mx-auto"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel Quiz</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostControlsPage;