import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';

const debug = true;

type RoomStatePayload = {
  currentRound: number;
  totalRounds: number;
  roundTypeName: string;
  phase: 'waiting' | 'asking' | 'reviewing' | 'leaderboard' | 'complete';
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

const HostGameControls = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket } = useQuizSocket();

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

  // ──────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || roomState.phase !== 'asking') return;
    if (timeLeft <= 0) return;
    const timer = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, roomState.phase]);

  // ──────────────────────────────────────────────────────────
  // Listen for review_question events
useEffect(() => {
  if (!socket) return;
  const handleHostReviewQuestion = (data: ReviewQuestionPayload) => {
    if (debug) console.log('[Host] 🧐 Received host review question:', data);
    setReviewQuestion(data);
    setCurrentQuestion(null);
    setTimeLeft(null);
  };
  socket.on('host_review_question', handleHostReviewQuestion); // ✅ NEW
  return () => {
    socket.off('host_review_question', handleHostReviewQuestion);
  };
}, [socket]);


  // ──────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────
  // Socket emitters for host actions
  const handleStartRound = () => {
    socket?.emit('start_round', { roomId });
  };

  const handleNextReview = () => {
    socket?.emit('next_review', { roomId });
  };

  const handleLeaderboardConfirm = () => {
    socket?.emit('next_round_or_end', { roomId });
  };

  // ──────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🎛 Host Controls</h1>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <p>Round: {roomState.currentRound} / {roomState.totalRounds}</p>
        <p>Round Type: {roomState.roundTypeName}</p>
        <p>Phase: {roomState.phase}</p>

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

        {/* Host Control Buttons */}
        {roomState.phase === 'waiting' && (
          <button onClick={handleStartRound} className="btn-blue w-full">
            ▶ Start Round
          </button>
        )}

        {roomState.phase === 'reviewing' && (
          <button onClick={handleNextReview} className="btn-yellow w-full">
            ▶ Next Review
          </button>
        )}

        {roomState.phase === 'leaderboard' && (
          <button onClick={handleLeaderboardConfirm} className="btn-green w-full">
            ✅ Continue
          </button>
        )}
      </div>
    </div>
  );
};

export default HostGameControls;














