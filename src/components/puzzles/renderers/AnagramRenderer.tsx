import React, { useEffect, useMemo, useState } from 'react';
import type { AnagramAnswer, AnagramPuzzleData } from '../puzzleTypes';

interface AnagramRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly?: boolean;
}

type UsedLetter = {
  letter: string;
  originalIndex: number;
};

const AnagramRenderer: React.FC<AnagramRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly = false,
}) => {
  const data = puzzleData as unknown as AnagramPuzzleData;
  const answerState = currentAnswer as unknown as Partial<AnagramAnswer>;

  const letterBank = Array.isArray(data?.letterBank)
    ? data.letterBank.map(letter => String(letter).toUpperCase())
    : [];

  const maxLength =
    letterBank.length > 0
      ? letterBank.length
      : typeof data?.scrambled === 'string'
      ? data.scrambled.length
      : 0;

  const [pickedLetters, setPickedLetters] = useState<UsedLetter[]>([]);

  const currentWord = useMemo(
    () => pickedLetters.map(item => item.letter).join(''),
    [pickedLetters]
  );

  useEffect(() => {
    const existingAnswer = String(answerState.answer ?? '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, maxLength);

    if (!existingAnswer || letterBank.length === 0) {
      setPickedLetters([]);
      return;
    }

    const usedIndexes = new Set<number>();
    const restored: UsedLetter[] = [];

    existingAnswer.split('').forEach(char => {
      const matchIndex = letterBank.findIndex((letter, index) => {
        return letter === char && !usedIndexes.has(index);
      });

      if (matchIndex !== -1) {
        usedIndexes.add(matchIndex);
        restored.push({
          letter: char,
          originalIndex: matchIndex,
        });
      }
    });

    setPickedLetters(restored);
  }, [answerState.answer, maxLength, puzzleData]);

  useEffect(() => {
    onAnswerChange({ answer: currentWord });
  }, [currentWord, onAnswerChange]);

  const usedIndexes = useMemo(() => {
    return new Set(pickedLetters.map(item => item.originalIndex));
  }, [pickedLetters]);

  const isComplete = currentWord.length === maxLength;

  const handlePickLetter = (letter: string, originalIndex: number) => {
    if (isReadOnly || isComplete || usedIndexes.has(originalIndex)) return;

    setPickedLetters(prev => [
      ...prev,
      {
        letter,
        originalIndex,
      },
    ]);
  };

  const handleRemoveLetter = (answerIndex: number) => {
    if (isReadOnly) return;

    setPickedLetters(prev => prev.filter((_, index) => index !== answerIndex));
  };

  const handleClear = () => {
    if (isReadOnly) return;
    setPickedLetters([]);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (isReadOnly) return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      setPickedLetters(prev => prev.slice(0, -1));
      return;
    }

    const key = event.key.toUpperCase();

    if (!/^[A-Z]$/.test(key)) return;
    if (pickedLetters.length >= maxLength) return;

    const matchIndex = letterBank.findIndex((letter, index) => {
      return letter === key && !usedIndexes.has(index);
    });

    if (matchIndex !== -1) {
      event.preventDefault();
      handlePickLetter(key, matchIndex);
    }
  };

  if (!data?.scrambled || !Array.isArray(data.letterBank)) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Invalid anagram puzzle data.
      </div>
    );
  }

  return (
    <div
      className="space-y-6 outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-label="Anagram puzzle"
    >
      {/* Clue card */}
      {data.clue && (
        <div className="relative overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-5 py-4 shadow-sm">
          <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-100/70" />
          <div className="relative">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-500">
              Clue
            </div>
            <div className="mt-1 text-xl font-black text-slate-900">
              {data.clue}
            </div>
          </div>
        </div>
      )}

      {/* Answer slots */}
      <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Build the word
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              Tap letters below or type on your keyboard
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            {currentWord.length}/{maxLength}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {Array.from({ length: maxLength }).map((_, index) => {
            const item = pickedLetters[index];

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleRemoveLetter(index)}
                disabled={isReadOnly || !item}
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-black uppercase transition sm:h-14 sm:w-14 sm:text-2xl',
                  item
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md'
                    : 'border-dashed border-slate-300 bg-slate-50 text-slate-300',
                  isReadOnly ? 'cursor-default' : '',
                ].join(' ')}
                aria-label={item ? `Remove ${item.letter}` : 'Empty answer slot'}
              >
                {item?.letter ?? ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Letter bank */}
      <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 py-5 shadow-sm">
        <div className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Scrambled letters
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
          {letterBank.map((letter, index) => {
            const used = usedIndexes.has(index);

            return (
              <button
                key={`${letter}-${index}`}
                type="button"
                onClick={() => handlePickLetter(letter, index)}
                disabled={isReadOnly || used || isComplete}
                className={[
                  'flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-black uppercase transition sm:h-14 sm:w-14 sm:text-2xl',
                  used
                    ? 'scale-95 border-slate-200 bg-slate-100 text-slate-300 opacity-60'
                    : 'border-violet-200 bg-white text-violet-700 shadow-sm hover:-translate-y-1 hover:border-violet-300 hover:shadow-md active:scale-95',
                ].join(' ')}
                aria-label={`Use letter ${letter}`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={isReadOnly || pickedLetters.length === 0}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear word
          </button>

          {isComplete && (
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
              Ready to submit
            </div>
          )}
        </div>
      </div>

      {/* Accessibility helper */}
      <p className="text-center text-xs text-slate-400">
        Tip: tap an answer tile to remove it, or press Backspace.
      </p>
    </div>
  );
};

export default AnagramRenderer;