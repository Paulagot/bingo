import React from 'react';
import { RoundComponentProps } from '../types/quiz';
import ExtrasPanel from '../game/ExtrasPanel';

const StandardRound: React.FC<RoundComponentProps> = ({
  question,
  timeLeft,
  timerActive,
  selectedAnswer,
  setSelectedAnswer,
  answerSubmitted,
  clue,
  feedback,
  isFrozen,
  frozenNotice,
  onSubmit,
  roomId,
  playerId,
  roundExtras,
  usedExtras,
  usedExtrasThisRound,
  onUseExtra,
}) => {
  return (
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
          onClick={onSubmit}
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
        roomId={roomId}
        playerId={playerId}
        availableExtras={roundExtras}
        usedExtras={usedExtras}
        usedExtrasThisRound={usedExtrasThisRound}
        onUseExtra={onUseExtra}
      />

      {feedback && (
        <div className="mt-4 text-lg font-medium text-center text-gray-800">{feedback}</div>
      )}
      {timerActive && timeLeft && (
  <div className="text-sm text-gray-500 text-right">⏱️ Time left: {Math.floor(timeLeft)}s</div>
)}
    </div>
  );
};

export default StandardRound;