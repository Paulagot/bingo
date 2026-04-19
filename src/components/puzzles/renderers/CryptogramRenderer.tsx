import React, { useState, useCallback, useEffect, useMemo } from 'react';

interface CryptogramRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

interface CryptogramData {
  encoded: string;
  uniqueLetters: number;
  hint: {
    cipherLetter: string;
    plainLetter: string;
  };
}

const CryptogramRenderer: React.FC<CryptogramRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as CryptogramData;
  const savedAnswer = currentAnswer as unknown as
    | { letterMap?: Record<string, string>; decoded?: string }
    | undefined;

  const getInitialMap = useCallback((): Record<string, string> => {
    const saved = savedAnswer?.letterMap;
    const base: Record<string, string> = saved ? { ...saved } : {};

    // Always preserve the starter hint
    if (data?.hint?.cipherLetter && data?.hint?.plainLetter) {
      base[data.hint.cipherLetter] = data.hint.plainLetter;
    }

    return base;
  }, [savedAnswer?.letterMap, data?.hint?.cipherLetter, data?.hint?.plainLetter]);

  const [letterMap, setLetterMap] = useState<Record<string, string>>(getInitialMap);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setLetterMap(getInitialMap());
  }, [getInitialMap]);

  const encodedChars = useMemo(() => data.encoded.split(''), [data.encoded]);

  const decoded = useMemo(() => {
    return encodedChars
      .map((ch) => {
        if (!/[A-Z]/.test(ch)) return ch;
        return letterMap[ch] ?? '_';
      })
      .join('');
  }, [encodedChars, letterMap]);

  const uniqueCipherLetters = useMemo(() => {
    return [...new Set(encodedChars.filter((ch) => /[A-Z]/.test(ch)))];
  }, [encodedChars]);

  const totalMappableLetters = uniqueCipherLetters.length;
  const filledLetters = uniqueCipherLetters.filter((ch) => !!letterMap[ch]).length;
  const allFilled = totalMappableLetters > 0 && filledLetters === totalMappableLetters;

  useEffect(() => {
    onAnswerChange({ letterMap, decoded });
  }, [letterMap, decoded, onAnswerChange]);

  const handleCipherClick = useCallback(
    (ch: string) => {
      if (isReadOnly || ch === data.hint.cipherLetter) return;
      setSelected((prev) => (prev === ch ? null : ch));
    },
    [isReadOnly, data.hint.cipherLetter]
  );

  const handlePlainClick = useCallback(
    (plain: string) => {
      if (!selected || isReadOnly) return;
      setLetterMap((prev) => ({ ...prev, [selected]: plain }));
      setSelected(null);
    },
    [selected, isReadOnly]
  );

  const handleClearSelected = useCallback(() => {
    if (!selected) return;

    setLetterMap((prev) => {
      const next = { ...prev };
      delete next[selected];

      // Never allow the starter hint mapping to be removed
      if (selected === data.hint.cipherLetter) {
        next[data.hint.cipherLetter] = data.hint.plainLetter;
      }

      return next;
    });

    setSelected(null);
  }, [selected, data.hint.cipherLetter, data.hint.plainLetter]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedPlain = new Set(Object.values(letterMap));

  const selectedMappedValue = selected ? letterMap[selected] : null;

  if (!data?.encoded || !data?.hint?.cipherLetter || !data?.hint?.plainLetter) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Invalid cryptogram puzzle data.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hint */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
          Starter hint
        </div>
        <div className="mt-1 text-sm sm:text-base text-indigo-900">
          Encoded letter{' '}
          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-white px-2 py-1 font-mono font-bold text-indigo-700 border border-indigo-200">
            {data.hint.cipherLetter}
          </span>{' '}
          means{' '}
          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-white px-2 py-1 font-mono font-bold text-indigo-700 border border-indigo-200">
            {data.hint.plainLetter}
          </span>
        </div>
        <div className="mt-2 text-xs text-indigo-700/80">
          Unique letters to solve: {data.uniqueLetters}
        </div>
      </div>

      {/* Decoded preview */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Decoded preview
        </div>
        <div className="mt-2 break-words font-mono text-sm sm:text-base leading-7 text-emerald-900">
          {decoded}
        </div>
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-gray-700">
          Solved mappings:{' '}
          <span className="font-semibold text-gray-900">
            {filledLetters}/{totalMappableLetters}
          </span>
        </div>

        <div className="text-xs sm:text-sm text-gray-500">
          {allFilled ? (
            <span className="font-semibold text-emerald-600">
              All letters filled — hit Submit to check.
            </span>
          ) : (
            <span>
              Tap an encoded letter, then choose its plain letter.
            </span>
          )}
        </div>
      </div>

      {/* Encoded phrase */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white px-3 py-4 sm:px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center">
          Encoded phrase
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-x-1 gap-y-3 sm:gap-x-2 sm:gap-y-4">
          {encodedChars.map((ch, i) => {
            if (ch === ' ') {
              return <div key={`space-${i}`} className="w-3 sm:w-4" />;
            }

            if (!/[A-Z]/.test(ch)) {
              return (
                <span
                  key={`punct-${i}`}
                  className="self-end text-sm sm:text-base text-gray-400 pb-1"
                >
                  {ch}
                </span>
              );
            }

            const isHint = ch === data.hint.cipherLetter;
            const isSelected = selected === ch;
            const matchesSelected = selected !== null && ch === selected;
            const plain = letterMap[ch] ?? '';

            return (
              <button
                key={`${ch}-${i}`}
                type="button"
                onClick={() => handleCipherClick(ch)}
                disabled={isReadOnly || isHint}
                className={[
                  'flex flex-col items-center rounded-xl px-1 py-1 transition select-none',
                  isReadOnly || isHint ? 'cursor-default' : 'cursor-pointer hover:bg-indigo-50',
                  matchesSelected ? 'bg-indigo-50 ring-2 ring-indigo-300' : '',
                ].join(' ')}
              >
                {/* Plain letter guess */}
                <div
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-t-lg border-b-2 text-base sm:h-11 sm:w-11 sm:text-lg font-bold transition-colors',
                    isHint
                      ? 'border-indigo-400 bg-indigo-100 text-indigo-700'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-100 text-indigo-800'
                      : plain
                      ? 'border-gray-400 bg-white text-gray-900'
                      : 'border-gray-300 bg-white text-gray-300',
                  ].join(' ')}
                >
                  {plain || '·'}
                </div>

                {/* Cipher letter */}
                <div
                  className={[
                    'mt-1 w-10 text-center font-mono text-[11px] sm:w-11 sm:text-xs',
                    isHint
                      ? 'font-semibold text-indigo-500'
                      : matchesSelected
                      ? 'font-bold text-indigo-700'
                      : 'text-gray-400',
                  ].join(' ')}
                >
                  {ch}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current mappings summary */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Current mappings
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {uniqueCipherLetters.map((cipher) => {
            const mapped = letterMap[cipher];
            const isHint = cipher === data.hint.cipherLetter;

            return (
              <div
                key={cipher}
                className={[
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs sm:text-sm',
                  isHint
                    ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                    : mapped
                    ? 'border-gray-300 bg-white text-gray-700'
                    : 'border-gray-200 bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                <span className="font-mono font-semibold">{cipher}</span>
                <span>→</span>
                <span className="font-mono font-semibold">{mapped || '·'}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alphabet picker */}
      {!isReadOnly && selected && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <div className="text-center">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Assign letter
            </div>
            <div className="mt-1 text-sm text-gray-700">
              Pick the plain letter for{' '}
              <span className="inline-flex min-w-[2rem] items-center justify-center rounded-lg bg-indigo-100 px-2 py-1 font-mono font-bold text-indigo-700">
                {selected}
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-7 md:grid-cols-9">
            {alphabet.map((pl) => {
              const isHintPlain = pl === data.hint.plainLetter;
              const taken = usedPlain.has(pl) && selectedMappedValue !== pl;

              return (
                <button
                  key={pl}
                  type="button"
                  onClick={() => !taken && !isHintPlain && handlePlainClick(pl)}
                  disabled={taken || isHintPlain}
                  className={[
                    'h-10 rounded-xl border text-sm font-bold transition-all sm:h-11',
                    selectedMappedValue === pl
                      ? 'border-indigo-600 bg-indigo-500 text-white'
                      : taken || isHintPlain
                      ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50',
                  ].join(' ')}
                >
                  {pl}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleClearSelected}
              className="h-10 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-500 transition hover:border-red-300 hover:bg-red-50 sm:h-11"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Bottom helper */}
      <div className="text-center text-xs sm:text-sm text-gray-500">
        {selected ? (
          <span>
            You are assigning a plain letter to{' '}
            <span className="font-mono font-semibold text-indigo-700">{selected}</span>.
          </span>
        ) : (
          <span>
            Tap any encoded letter in the phrase to start decoding.
          </span>
        )}
      </div>
    </div>
  );
};

export default CryptogramRenderer;