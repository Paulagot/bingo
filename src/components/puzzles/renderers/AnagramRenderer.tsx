import React, { useEffect, useMemo, useState } from 'react';
import type { AnagramAnswer, AnagramPuzzleData } from '../puzzleTypes';

interface AnagramRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly?: boolean;
}

const AnagramRenderer: React.FC<AnagramRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly = false,
}) => {
 const data = puzzleData as unknown as AnagramPuzzleData;
 const answerState = currentAnswer as unknown as Partial<AnagramAnswer>;

  const maxLength =
    Array.isArray(data.letterBank) && data.letterBank.length > 0
      ? data.letterBank.length
      : typeof data.scrambled === 'string'
      ? data.scrambled.length
      : 0;

  const [localAnswer, setLocalAnswer] = useState(answerState.answer ?? '');

  useEffect(() => {
    setLocalAnswer(answerState.answer ?? '');
  }, [answerState.answer]);

  const normalizedAnswer = useMemo(
    () => (localAnswer ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, maxLength),
    [localAnswer, maxLength]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, maxLength);
    setLocalAnswer(cleaned);
    onAnswerChange({ answer: cleaned });
  };

  const answerSlots = useMemo(() => {
    return Array.from({ length: maxLength }, (_, index) => normalizedAnswer[index] ?? '');
  }, [normalizedAnswer, maxLength]);

  if (!data?.scrambled || !Array.isArray(data.letterBank)) {
    return (
      <div className="text-sm text-rose-600">
        Invalid anagram puzzle data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clue / category */}
      {data.clue && (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-4 sm:px-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
            Category clue
          </div>
          <div className="mt-1 text-base sm:text-lg font-semibold text-indigo-900">
            {data.clue}
          </div>
        </div>
      )}

      {/* Scrambled letters */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white px-4 py-5 sm:px-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center">
          Scrambled letters
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-3">
          {data.letterBank.map((letter, idx) => (
            <div
              key={`${letter}-${idx}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-200 bg-white text-lg sm:h-12 sm:w-12 sm:text-xl font-bold uppercase text-indigo-700 shadow-sm"
            >
              {letter}
            </div>
          ))}
        </div>
      </div>

      {/* Answer slots */}
      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center">
          Your answer
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {answerSlots.map((char, index) => (
            <div
              key={index}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg sm:h-12 sm:w-12 sm:text-xl font-bold uppercase shadow-sm transition
                ${
                  char
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-gray-50 text-gray-300'
                }`}
            >
              {char || '•'}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-2">
        <label
          htmlFor="anagram-answer"
          className="block text-sm font-medium text-gray-700"
        >
          Type your answer
        </label>

        <input
          id="anagram-answer"
          type="text"
          value={localAnswer}
          onChange={handleChange}
          disabled={isReadOnly}
          maxLength={maxLength}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          placeholder="Enter the word"
          className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-center text-lg font-semibold uppercase text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:bg-gray-100 disabled:text-gray-500 sm:text-xl"
        />

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{maxLength} letters</span>
          <span>
            {normalizedAnswer.length}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnagramRenderer;