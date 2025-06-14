import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import UseExtraModal from './UseExtraModal';
import ExtrasPanel from './ExtrasPanel';

interface User {
  id: string;
  name: string;
}

type Question = {
  id: string;
  text: string;
  options: string[];
  clue?: string;
  timeLimit: number;
  questionStartTime?: number;
};

const debug = true;

const QuizGamePlayPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { socket, connected } = useQuizSocket();

  const storedPlayerId = roomId ? localStorage.getItem(`quizPlayerId:${roomId}`) : null;

  const [question, setQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [clue, setClue] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phaseMessage, setPhaseMessage] = useState('Waiting for host to start the quiz...');

  const [availableExtras, setAvailableExtras] = useState<string[]>(['buyHint', 'freezeOutTeam']);
  const [usedExtras, setUsedExtras] = useState<Record<string, boolean>>({});
  const [usedExtrasThisRound, setUsedExtrasThisRound] = useState<Record<string, boolean>>({});
  const [playersInRoom, setPlayersInRoom] = useState<User[]>([]);
  const [freezeModalOpen, setFreezeModalOpen] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenNotice, setFrozenNotice] = useState<string | null>(null);
  const [wasJustFrozen, setWasJustFrozen] = useState(false);

  const currentQuestionIndexRef = useRef<number>(-1);
  const frozenForIndexRef = useRef<number | null>(null);
  const frozenByRef = useRef<string | null>(null);

  const isFrozenNow =
    isFrozen &&
    frozenForIndexRef.current !== null &&
    frozenForIndexRef.current === currentQuestionIndexRef.current;

  useEffect(() => {
    if (!socket || !connected || !roomId || !storedPlayerId) return;
    if (debug) console.log('[Client] 🚪 Joining quiz room on mount:', roomId);
    socket.emit('join_quiz_room', {
      roomId,
      user: { id: storedPlayerId, name: 'Player ' + storedPlayerId },
      role: 'player'
    });
  }, [socket, connected, roomId, storedPlayerId]);

  useEffect(() => {
    if (!socket || !connected || !roomId || !storedPlayerId) return;

    const handleQuestion = (data: any) => {
      if (debug) console.log('[Client] 🧐 Received question:', data);
      currentQuestionIndexRef.current += 1;
      setQuestion(data);
      setSelectedAnswer('');
      setAnswerSubmitted(false);
      setClue(null);
      setFeedback(null);
      setUsedExtrasThisRound({});

      if (frozenForIndexRef.current !== null && frozenForIndexRef.current !== currentQuestionIndexRef.current) {
        setIsFrozen(false);
        setFrozenNotice(null);
        frozenForIndexRef.current = null;
        frozenByRef.current = null;
        if (debug) console.log('[Client] ❄️ Freeze cleared for new question');
        console.log('[Client] ❄️ frozenForIndexRef cleared:', frozenForIndexRef.current);
        console.log(`[Client] 🎯 Frontend sees question index: ${currentQuestionIndexRef.current}`);
        console.log(`[Client] 🧊 frozenForIndexRef: ${frozenForIndexRef.current}`);



      }

      if (debug) {
  console.log('[Client] 🧠 Current index:', currentQuestionIndexRef.current);
  console.log('[Client] ❄️ Frozen index ref:', frozenForIndexRef.current);
  console.log('[Client] ❄️ isFrozenNow:', isFrozenNow);
}


      const now = Date.now();
      const elapsed = (now - data.questionStartTime) / 1000;
      const remainingTime = Math.max(0, (data.timeLimit || 30) - elapsed);
      setTimeLeft(remainingTime);
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
      setTimeLeft(null);
      setSelectedAnswer('');
      setFeedback(`✅ Correct Answer: ${data.correctAnswer}${data.submittedAnswer ? ` | You answered: ${data.submittedAnswer}` : ''}`);
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
        console.log(`[Client] ❄️ Freeze Notice: You are frozen by ${frozenByName} for question ${currentQuestionIndexRef.current + 1}`);
      }

      setTimeout(() => {
        alert(`⚠️ ${frozenByName} froze you out! You cannot answer the next question.`);
      }, 100);
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
      if (debug) console.log(`[Client] 🏍️ Quiz ended: ${message}`);
      setPhaseMessage(message);
      setQuestion(null);
      setTimerActive(false);
    };

    const handlePlayerListUpdated = ({ players }: { players: { id: string, name: string }[] }) => {
      setPlayersInRoom(players);
    };

    const handleExtraUsedSuccessfully = ({ extraId }: { extraId: string }) => {
      if (debug) console.log('[Client] ✅ Extra used successfully:', extraId);
      setUsedExtras(prev => ({ ...prev, [extraId]: true }));
      setUsedExtrasThisRound(prev => ({ ...prev, [extraId]: true }));
    };

    const handleQuizError = ({ message }: { message: string }) => {
      if (debug) console.error('[Client] ❌ Quiz error:', message);
      alert(`Error: ${message}`);
    };

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
    };
  }, [socket, connected, roomId, storedPlayerId, playersInRoom]);

  useEffect(() => {
    if (!timerActive || timeLeft === null) return;
    if (timeLeft <= 0) {
      setTimerActive(false);
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => (prev ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, timerActive]);

  const handleSubmit = () => {
    if (!selectedAnswer || !question || !socket || !roomId || !storedPlayerId) return;
    if (isFrozenNow || answerSubmitted) return;
    if (debug) console.log('[Client] 📤 Submitting answer as', storedPlayerId, '→', selectedAnswer);
    if (isFrozenNow) {
  if (debug) console.warn('[Client] ❄️ BLOCKED: You are currently frozen and cannot submit an answer');
  return;
}


    socket.emit('submit_answer', {
      roomId,
      playerId: storedPlayerId,
      answer: selectedAnswer
    });

    setAnswerSubmitted(true);
  };

  const handleUseExtra = (extraId: string) => {
    if (!socket || !roomId || !storedPlayerId) return;

    if (usedExtras[extraId]) {
      if (debug) console.log(`⚠️ Already used ${extraId}`);
      alert(`You have already used ${extraId}`);
      return;
    }

    const usedAnyThisRound = Object.values(usedExtrasThisRound).some(v => v);
    if (usedAnyThisRound) {
      if (debug) console.warn(`❌ Already used an extra this round`);
      alert('You can only use one extra per round!');
      return;
    }

    if (extraId === 'buyHint') {
      socket.emit('use_extra', {
        roomId,
        playerId: storedPlayerId,
        extraId: 'buyHint'
      });
    }

    if (extraId === 'freezeOutTeam') {
      setFreezeModalOpen(true);
    }
  };

  const handleFreezeConfirm = (targetPlayerId: string) => {
    if (!socket || !roomId || !storedPlayerId || !targetPlayerId) return;
    if (debug) console.log('[Client] ❄️ Submitting freezeout for player:', targetPlayerId);
    socket.emit('use_extra', {
      roomId,
      playerId: storedPlayerId,
      extraId: 'freezeOutTeam',
      targetPlayerId
    });
    setFreezeModalOpen(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">🎮 Quiz In Progress</h1>
      <p className="text-sm text-gray-500 mb-2">Room ID: {roomId}</p>
      <p className="text-sm text-gray-500 mb-4">Player ID: {storedPlayerId || '(not set)'}</p>

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

      {question ? (
        <div className={`bg-white p-6 rounded-xl shadow space-y-4 ${isFrozen ? 'opacity-75 border-2 border-red-300' : ''}`}>
          <div>
            <h2 className="text-xl font-semibold text-indigo-700">{question.text}</h2>
            {clue && <p className="text-sm text-blue-500 mt-1">💡 Clue: {clue}</p>}
          </div>

          {question.options && (
            <div className="space-y-2">
              {question.options.map((opt: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => !isFrozen && setSelectedAnswer(opt)}
                  className={`block w-full text-left px-4 py-2 rounded-lg border transition-all
                    ${isFrozen
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : selectedAnswer === opt
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  disabled={isFrozen}
                >
                  {opt} {isFrozen && '❄️'}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <button
              onClick={handleSubmit}
              className={`px-4 py-2 rounded-lg font-semibold shadow transition
                ${isFrozen || !selectedAnswer || answerSubmitted
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              disabled={!selectedAnswer || isFrozen || answerSubmitted}
            >
              {isFrozen
                ? '❄️ Frozen - Cannot Submit'
                : answerSubmitted
                  ? '✅ Submitted'
                  : 'Submit Answer'}
            </button>
          </div>

          <ExtrasPanel
            roomId={roomId!}
            playerId={storedPlayerId!}
            availableExtras={availableExtras}
            usedExtras={usedExtras}
            usedExtrasThisRound={usedExtrasThisRound}
            onUseExtra={handleUseExtra}
          />

          {feedback && (
            <div className="mt-4 text-lg font-medium text-center text-gray-800">{feedback}</div>
          )}
          {timerActive && (
            <div className="text-sm text-gray-500 text-right">⏳ Time left: {Math.floor(timeLeft!)}s</div>
          )}
        </div>
      ) : (
        <div className="bg-gray-100 p-6 rounded-xl text-center text-gray-600">{phaseMessage}</div>
      )}

      <UseExtraModal
        visible={freezeModalOpen}
        players={playersInRoom.filter(p => p.id !== storedPlayerId)}
        onCancel={() => setFreezeModalOpen(false)}
        onConfirm={handleFreezeConfirm}
      />
    </div>
  );
};

export default QuizGamePlayPage;













