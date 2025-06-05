// src/components/Quiz/QuizGamePlayPage.tsx

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';

interface User {
  id: string;
  name: string;
}

const debug = true;

const QuizGamePlayPage = () => {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const { socket, connected } = useQuizSocket();

  const [question, setQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phaseMessage, setPhaseMessage] = useState<string>(
    'Waiting for host to start the quiz...'
  );

  // ────────────────────────────────────────────────────────────────────
  // 1) Rejoin room on (re)connect: send { roomId, user, role: 'player' }
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) return;

    if (debug) console.log('[Client] 🚪 Joining quiz room on mount:', roomId);

    // ** UPDATED: emit { roomId, user, role } rather than { roomId, player } **
    // const user: User = {
    //   id: playerId,
    //   name: 'Player ' + playerId,
    // };

   socket.emit('join_quiz_room', {
  roomId,
  user: { id: playerId, name: 'Player ' + playerId },
  role: 'player'
});
  }, [socket, connected, roomId, playerId]);

  // ────────────────────────────────────────────────────────────────────
  // 2) Register game‐play listeners
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) return;

    const handleQuestion = (data: any) => {
      if (debug) console.log('[Client] 🧠 Received question:', data);
      setQuestion(data);
      setSelectedAnswer('');
      setClue(null);
      setFeedback(null);
      setTimeLeft(data.timeLimit ?? 30);
      setTimerActive(true);
      setPhaseMessage('');
    };

    const handleClue = ({ clue }: { clue: string }) => {
      if (debug) console.log('[Client] 💡 Clue revealed:', clue);
      setClue(clue);
    };

    const handleAnswerReveal = ({ correctAnswer, playerResult }: any) => {
      if (debug) console.log(
        '[Client] ✅ Answer reveal:',
        correctAnswer,
        playerResult
      );
      setFeedback(playerResult?.correct ? '✅ Correct!' : '❌ Incorrect.');
      setTimerActive(false);
    };

    const handleRoundEnd = ({ round }: { round: number }) => {
      if (debug) console.log(`[Client] ⏹️ Round ${round} ended`);
      setPhaseMessage(`Round ${round} complete. Waiting for next round...`);
      setQuestion(null);
      setTimerActive(false);
    };

    const handleNextRound = ({ round }: { round: number }) => {
      if (debug) console.log(`[Client] 🔁 Starting Round ${round}`);
      setPhaseMessage(`Starting Round ${round}...`);
    };

    const handleQuizEnd = ({ message }: { message: string }) => {
      if (debug) console.log(`[Client] 🏁 Quiz ended: ${message}`);
      setPhaseMessage(message);
      setQuestion(null);
      setTimerActive(false);
    };

    socket.on('question', handleQuestion);
    socket.on('clue_revealed', handleClue);
    socket.on('answer_reveal', handleAnswerReveal);
    socket.on('round_end', handleRoundEnd);
    socket.on('next_round_starting', handleNextRound);
    socket.on('quiz_end', handleQuizEnd);

    return () => {
      socket.off('question', handleQuestion);
      socket.off('clue_revealed', handleClue);
      socket.off('answer_reveal', handleAnswerReveal);
      socket.off('round_end', handleRoundEnd);
      socket.off('next_round_starting', handleNextRound);
      socket.off('quiz_end', handleQuizEnd);
    };
  }, [socket, connected, roomId, playerId]);

  // ────────────────────────────────────────────────────────────────────
  // 3) Timer countdown logic
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive || timeLeft === null) return;

    if (timeLeft <= 0) {
      setTimerActive(false);
      handleSubmit();
      return;
    }

    const timer = setTimeout(() => setTimeLeft((prev) => (prev ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, timerActive]);

  // ────────────────────────────────────────────────────────────────────
  // 4) Submit answer to server
  // ────────────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!selectedAnswer || !question || !socket || !roomId || !playerId) return;
    if (debug) console.log('[Client] 📤 Submitting answer:', selectedAnswer);

    socket.emit('submit_survivor_answer', {
      roomId,
      playerId,
      answer: selectedAnswer,
    });
  };

  // ────────────────────────────────────────────────────────────────────
  // 5) Request a clue
  // ────────────────────────────────────────────────────────────────────
  const handleClueRequest = () => {
    if (!socket || !roomId || !playerId) return;
    if (debug) console.log('[Client] 🧩 Requesting clue...');
    socket.emit('use_clue', { roomId, playerId });
  };

  // ────────────────────────────────────────────────────────────────────
  // 6) Debug logger: print every incoming event
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const logAnyEvent = (event: string, ...args: any[]) => {
      console.log(`[Client] 📥 Received event: ${event}`, args);
    };

    socket.onAny(logAnyEvent);
    return () => {
      socket.offAny(logAnyEvent);
    };
  }, [socket]);

  // ────────────────────────────────────────────────────────────────────
  // 7) Render UI
  // ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🎮 Quiz In Progress</h1>
      <p className="text-sm text-gray-500 mb-2">Room ID: {roomId}</p>
      <p className="text-sm text-gray-500 mb-4">Player ID: {playerId}</p>

      {question ? (
        <div className="bg-white p-6 rounded-xl shadow space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-indigo-700">{question.text}</h2>
            {clue && (
              <p className="text-sm text-blue-500 mt-1">💡 Clue: {clue}</p>
            )}
          </div>

          {question.options ? (
            <div className="space-y-2">
              {question.options.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedAnswer(opt)}
                  className={`block w-full text-left px-4 py-2 rounded-lg border ${
                    selectedAnswer === opt
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Type your answer"
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
          )}

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleClueRequest}
              className="text-blue-600 text-sm underline"
            >
              🔍 Use Clue
            </button>

            <button
              onClick={handleSubmit}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-indigo-700 transition"
              disabled={!selectedAnswer}
            >
              Submit Answer
            </button>
          </div>

          {feedback && (
            <div className="mt-4 text-lg font-medium text-center text-gray-800">
              {feedback}
            </div>
          )}
          {timerActive && (
            <div className="text-sm text-gray-500 text-right">
              ⏳ Time left: {timeLeft}s
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 p-6 rounded-xl text-center text-gray-600">
          {phaseMessage}
        </div>
      )}
    </div>
  );
};

export default QuizGamePlayPage;






