import React, { useState, useEffect } from 'react';
import type { AnagramPuzzleData } from '../puzzleTypes';

interface AnagramRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

const AnagramRenderer: React.FC<AnagramRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as AnagramPuzzleData;

  const [inputValue, setInputValue] = useState<string>(
    (currentAnswer.answer as string) ?? ''
  );

  // Sync external answer changes (e.g. reset)
  useEffect(() => {
    setInputValue((currentAnswer.answer as string) ?? '');
  }, [currentAnswer.answer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setInputValue(val);
    onAnswerChange({ answer: val });
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Optional clue */}
      {data.clue && (
        <p className="text-sm text-gray-500 italic">
          Category: <span className="font-medium text-gray-700">{data.clue}</span>
        </p>
      )}

      {/* Scrambled letters */}
      <div className="flex flex-wrap justify-center gap-2">
        {data.letterBank.map((letter, i) => (
          <span
            key={i}
            className="w-10 h-10 flex items-center justify-center bg-indigo-100 text-indigo-800 font-bold text-lg rounded-lg border-2 border-indigo-200 tracking-wider"
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Answer input */}
      <div className="w-full max-w-xs">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 text-center">
          Your answer
        </label>
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          disabled={isReadOnly}
          maxLength={data.letterBank.length}
          placeholder="Type your answer…"
          className="w-full text-center text-xl font-bold tracking-[0.3em] px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 uppercase"
        />
        <p className="text-center text-xs text-gray-400 mt-1">
          {inputValue.length} / {data.letterBank.length} letters
        </p>
      </div>
    </div>
  );
};

export default AnagramRenderer;