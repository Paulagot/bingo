import { useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';

const debug = true;

// ✅ Define type for room_state payload
type RoomStatePayload = {
  currentRound: number;
  totalRounds: number;
  roundTypeId: string;
  roundTypeName: string;
  totalPlayers: number;
  phase: 'waiting' | 'in_question' | 'reviewing' | 'complete';
};


// ✅ Define type for question payload
type QuestionPayload = {
  id: string;
  text: string;
  options?: string[];
  timeLimit?: number;
};

const HostGameControls = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useQuizSocket();

  const [round, setRound] = useState(1);
  const [question, setQuestion] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [phase, setPhase] = useState<'waiting' | 'in_question' | 'reviewing' | 'complete'>('waiting');
  const [status, setStatus] = useState('Waiting to begin');
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [quizEnded, setQuizEnded] = useState(false);
  const [totalRounds, setTotalRounds] = useState<number>(1);
const [roundTypeName, setRoundTypeName] = useState<string>('');


  // ───────────────────────────────────────────────────────
  // Subscribe to room_state event
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

   const handleRoomState = ({ currentRound, totalRounds, roundTypeId, roundTypeName, totalPlayers, phase }: RoomStatePayload) => {
  if (debug) console.log('[Host] 🔄 Received room_state update:', { currentRound, totalRounds, roundTypeId, roundTypeName, totalPlayers, phase });
  setRound(currentRound);
  setTotalPlayers(totalPlayers);
  setPhase(phase);
  setTotalRounds(totalRounds);  // <-- add this new state hook below
  setRoundTypeName(roundTypeName);  // <-- add this new state hook below
};


    socket.on('room_state', handleRoomState);

    return () => {
      socket.off('room_state', handleRoomState);
    };
  }, [socket]);

  // ───────────────────────────────────────────────────────
  // Subscribe to question event
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleQuestion = (data: QuestionPayload) => {
      if (debug) console.log('[Host] 📥 Received question event:', data);
      setCurrentQuestion(data);
      setTimeLeft(data.timeLimit || 30);
      setPhase('in_question');
      setStatus('📤 Question sent');
    };

    socket.on('question', handleQuestion);

    return () => {
      socket.off('question', handleQuestion);
    };
  }, [socket]);

  // ───────────────────────────────────────────────────────
  // Subscribe to quiz_end event
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleQuizEnd = ({ message }: { message: string }) => {
      setStatus(`🏁 ${message}`);
      setQuizEnded(true);
      setPhase('complete');
    };

    socket.on('quiz_end', handleQuizEnd);

    return () => {
      socket.off('quiz_end', handleQuizEnd);
    };
  }, [socket]);

  // ───────────────────────────────────────────────────────
  // Timer countdown
  // ───────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || phase !== 'in_question') return;
    if (timeLeft <= 0) {
      setStatus(`⏱️ Time's up for question ${question}`);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => (prev !== null ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, phase, question]);

  // ───────────────────────────────────────────────────────
  // Host actions
  // ───────────────────────────────────────────────────────
  const handleNextQuestion = () => {
    if (!socket || quizEnded) return;
    socket.emit('start_next_question', { roomId });
  };

  const handleNextRound = () => {
    if (!socket || quizEnded) return;
    socket.emit('start_next_round', { roomId });
  };

  const handleEndQuiz = () => {
    if (!socket) return;
    socket.emit('end_quiz', { roomId });
    setQuizEnded(true);
    setPhase('complete');
  };

  // ───────────────────────────────────────────────────────
  // Render UI
  // ───────────────────────────────────────────────────────
  const phaseColor = {
    waiting: 'bg-gray-400',
    in_question: 'bg-green-500',
    reviewing: 'bg-yellow-500',
    complete: 'bg-red-600'
  }[phase];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-indigo-800 mb-4">🎛 Host Game Controls</h1>
      <p className="text-sm text-gray-500 mb-4">Room ID: {roomId}</p>

      <div className="bg-white p-6 rounded-xl shadow space-y-4">
        <div className="text-sm text-gray-700 space-y-1">
          <p>🟢 Round: {round} / {totalRounds}</p>
<p>🎯 Round Type: {roundTypeName}</p>
<p>👥 Total Players: {totalPlayers}</p>

          <p className="flex items-center gap-2">
            🧭 Phase: <span className={`text-white text-xs font-semibold px-2 py-1 rounded ${phaseColor}`}>{phase.replace('_', ' ').toUpperCase()}</span>
          </p>
          <p className="mt-2 font-medium">📣 Status: {status}</p>
          {timeLeft !== null && phase === 'in_question' && (
            <p className={`text-sm font-semibold ${timeLeft <= 5 ? 'text-red-500' : 'text-gray-700'}`}>
              ⏳ Time left: {timeLeft}s
            </p>
          )}
        </div>

        {currentQuestion && (
          <div className="bg-gray-100 p-4 rounded-xl">
            <p className="text-sm font-semibold text-gray-700">📘 Current Question Preview:</p>
            <p className="text-base text-indigo-700 mt-1">{currentQuestion.text}</p>
            {Array.isArray(currentQuestion.options) && (
              <ul className="mt-2 list-disc list-inside text-sm text-gray-800">
                {currentQuestion.options.map((opt, idx) => (
                  <li key={idx}>{opt}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 mt-4">
          <button
            onClick={handleNextQuestion}
            className={`px-4 py-2 rounded-xl w-full transition text-white font-semibold shadow bg-indigo-600 hover:bg-indigo-700`}
            disabled={quizEnded}
          >
            ▶️ Next Question
          </button>

          <button
            onClick={handleNextRound}
            className={`px-4 py-2 rounded-xl w-full transition text-white font-semibold shadow bg-yellow-500 hover:bg-yellow-600`}
            disabled={quizEnded}
          >
            🔁 Start Next Round
          </button>

          <button
            onClick={handleEndQuiz}
            className="bg-red-600 text-white px-4 py-2 rounded-xl w-full hover:bg-red-700 transition font-semibold shadow"
            disabled={quizEnded}
          >
            ❌ End Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostGameControls;











