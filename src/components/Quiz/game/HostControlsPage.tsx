// src/components/Quiz/host-controls/HostControlsPage.tsx
import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { useNavigate } from 'react-router-dom';

const debug = true;

type RoomStatePayload = {
  currentRound: number;
  totalRounds: number;
  roundTypeName: string;
  phase: 'waiting' | 'launched' | 'asking' | 'reviewing' | 'leaderboard' | 'complete';
  questionsThisRound?: number;
};

type QuestionPayload = {
  id: string;
  text: string;
  options: string[];
  timeLimit: number;
  questionStartTime: number;
};

type ReviewQuestionPayload = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  submittedAnswer?: string | null;
};

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
};

const HostControlsPage = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useQuizSocket();

  const [roomState, setRoomState] = useState<RoomStatePayload>({
    currentRound: 1,
    totalRounds: 1,
    roundTypeName: '',
    phase: 'waiting',
    questionsThisRound: 0
  });

  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [reviewQuestion, setReviewQuestion] = useState<ReviewQuestionPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // ✅ Join room as host when component mounts
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
    };
    socket.on('room_state', handleRoomState);
    return () => {
      socket.off('room_state', handleRoomState);
    };
  }, [socket]);

  // Listen for question events (host sees live questions too)
  useEffect(() => {
    if (!socket) return;
    const handleQuestion = (data: QuestionPayload) => {
      if (debug) console.log('[Host] 📥 Received question:', data);
      setCurrentQuestion(data);
      setReviewQuestion(null); // clear review view
      const now = Date.now();
      const elapsed = (now - data.questionStartTime) / 1000;
      const remainingTime = Math.max(0, (data.timeLimit || 30) - elapsed);
      setTimeLeft(remainingTime);
    };
    socket.on('question', handleQuestion);
    return () => {
      socket.off('question', handleQuestion);
    };
  }, [socket]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || roomState.phase !== 'asking') return;
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, roomState.phase]);

  // Listen for review_question events
  useEffect(() => {
    if (!socket) return;
    const handleHostReviewQuestion = (data: ReviewQuestionPayload) => {
      if (debug) console.log('[Host] 🧐 Received host review question:', data);
      setReviewQuestion(data);
      setCurrentQuestion(null);
      setTimeLeft(null);
    };
    socket.on('host_review_question', handleHostReviewQuestion);
    return () => {
      socket.off('host_review_question', handleHostReviewQuestion);
    };
  }, [socket]);

  // Listen for leaderboard
  useEffect(() => {
    if (!socket) return;
    const handleLeaderboard = (data: LeaderboardEntry[]) => {
      if (debug) console.log('[Host] 🏆 Leaderboard received:', data);
      setLeaderboard(data);
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

  // ✅ Debug info (you can remove this later)
  if (debug) {
    console.log('🔍 [HostControls] Current state:', {
      phase: roomState.phase,
      connected,
      socketId: socket?.id,
      roomId
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <div className="container mx-auto max-w-4xl px-4 py-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎛️ Host Controls</h1>
          <p className="text-gray-600">Control your quiz from here</p>
          <p className="text-sm text-gray-500 mt-2">Room: {roomId}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <p>Round: {roomState.currentRound} / {roomState.totalRounds}</p>
          <p>Round Type: {roomState.roundTypeName}</p>
          <p>Phase: {roomState.phase}</p>

          {/* ✅ Debug info - you can remove this later */}
          {debug && (
            <div className="bg-gray-100 p-2 text-xs rounded">
              <strong>🔧 Debug:</strong> Connected: {connected ? '✅' : '❌'} | 
              Socket: {socket?.id ? '🟢' : '🔴'} | 
              Phase: {roomState.phase}
            </div>
          )}

          {/* Current Question Preview */}
          {currentQuestion && (
            <div className="bg-gray-100 p-4 rounded-xl">
              <p className="text-sm font-semibold text-gray-700">📘 Question:</p>
              <p className="text-base text-indigo-700 mt-1">{currentQuestion.text}</p>
              <ul className="mt-2 list-disc list-inside text-sm text-gray-800">
                {currentQuestion.options.map((opt, idx) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
              {timeLeft !== null && (
                <p className="mt-2 text-sm font-semibold">
                  ⏳ Time left: {timeLeft}s
                </p>
              )}
            </div>
          )}

          {/* Review Question View */}
          {roomState.phase === 'reviewing' && reviewQuestion && (
            <div className="bg-yellow-50 p-4 rounded-xl mt-4">
              <p className="text-sm font-semibold text-gray-800">📖 Reviewing:</p>
              <p className="text-base text-yellow-900 mt-1">{reviewQuestion.text}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {reviewQuestion.options.map((opt, idx) => {
                  const isCorrect = opt === reviewQuestion.correctAnswer;
                  const isSubmitted = opt === reviewQuestion.submittedAnswer;
                  const bgColor = isCorrect
                    ? 'bg-green-200'
                    : isSubmitted
                    ? 'bg-red-200'
                    : 'bg-white';

                  return (
                    <li key={idx} className={`p-1 rounded ${bgColor}`}>
                      {opt}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Leaderboard */}
          {roomState.phase === 'leaderboard' && leaderboard.length > 0 && (
            <div className="bg-green-50 p-4 rounded-xl mt-4">
              <h2 className="text-lg font-bold text-green-900 mb-2">🏆 Leaderboard</h2>
              <ol className="list-decimal list-inside text-sm">
                {leaderboard.map((entry, idx) => (
                  <li key={entry.id}>
                    {entry.name} — {entry.score} pts
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* ✅ FIXED: Host Control Buttons - Added launched phase */}
          {roomState.phase === 'waiting' && (
            <div className="bg-blue-50 p-4 rounded-xl">
              <p className="text-sm text-blue-700 mb-3">🎬 Ready to start the quiz?</p>
              <button onClick={handleStartRound} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold w-full transition">
                ▶ Start Round {roomState.currentRound}
              </button>
            </div>
          )}

          {/* ✅ NEW: Button for launched phase */}
          {roomState.phase === 'launched' && (
            <div className="bg-green-50 p-4 rounded-xl">
              <p className="text-sm text-green-700 mb-3">🚀 Quiz launched! Players are now in the game. Start the first round when ready.</p>
              <button onClick={handleStartRound} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold w-full transition">
                🎬 Start Round {roomState.currentRound}
              </button>
            </div>
          )}

          {roomState.phase === 'reviewing' && (
            <button onClick={handleNextReview} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg font-semibold w-full transition">
              ▶ Next Review
            </button>
          )}

          {roomState.phase === 'leaderboard' && (
            <button onClick={handleLeaderboardConfirm} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold w-full transition">
              ✅ Continue
            </button>
          )}

          {roomState.phase === 'complete' && (
            <div className="bg-purple-50 p-4 rounded-xl text-center">
              <p className="text-lg font-bold text-purple-800">🎉 Quiz Complete!</p>
              <p className="text-sm text-purple-600">Thank you for hosting this quiz!</p>
            </div>
          )}
        </div>
        
        {/* Cancel Quiz Section */}
        <div className="text-center pt-8">
          <button
            onClick={handleCancelQuiz}
            className="bg-red-100 text-red-700 px-6 py-2 rounded-xl font-medium hover:bg-red-200 transition"
          >
            ❌ Cancel Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostControlsPage;