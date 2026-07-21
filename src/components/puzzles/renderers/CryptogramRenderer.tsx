import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';

interface CryptogramRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

interface CryptogramHint {
  cipherLetter: string;
  plainLetter: string;
}

interface CryptogramData {
  encoded: string;
  uniqueLetters: number;
  hints?: CryptogramHint[];
  hint?: CryptogramHint;
}

const CryptogramRenderer: React.FC<CryptogramRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as CryptogramData;
  const hints = useMemo(() => {
    if (Array.isArray(data?.hints) && data.hints.length > 0) return data.hints;
    if (data?.hint?.cipherLetter && data?.hint?.plainLetter) return [data.hint];
    return [];
  }, [data]);

  const hintCipherToPlain = useMemo(() => {
    const map = new Map<string, string>();
    for (const h of hints) map.set(h.cipherLetter, h.plainLetter);
    return map;
  }, [hints]);

  const hintPlainLetters = useMemo(() => new Set(hints.map(h => h.plainLetter)), [hints]);

  const buildMapWithHints = useCallback((saved?: Record<string, string>): Record<string, string> => {
    const base: Record<string, string> = saved ? { ...saved } : {};
    for (const h of hints) base[h.cipherLetter] = h.plainLetter;
    return base;
  }, [hints]);

  const [letterMap, setLetterMap] = useState<Record<string, string>>(() => {
    const saved = (currentAnswer as { letterMap?: Record<string, string> } | undefined)?.letterMap;
    return buildMapWithHints(saved);
  });
  const [selected, setSelected] = useState<string | null>(null);
  const [justAssigned, setJustAssigned] = useState<string | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);

  const puzzleKeyRef = useRef(data.encoded);
  useEffect(() => {
    if (puzzleKeyRef.current !== data.encoded) {
      puzzleKeyRef.current = data.encoded;
      const saved = (currentAnswer as { letterMap?: Record<string, string> } | undefined)?.letterMap;
      setLetterMap(buildMapWithHints(saved));
      setSelected(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.encoded, buildMapWithHints]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterMap, decoded]);

  useEffect(() => {
    if (!selected) return;
    const id = requestAnimationFrame(() => {
      pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [selected]);

  useEffect(() => {
    if (!justAssigned) return;
    const t = setTimeout(() => setJustAssigned(null), 400);
    return () => clearTimeout(t);
  }, [justAssigned]);

  const handleCipherClick = useCallback(
    (ch: string) => {
      if (isReadOnly || hintCipherToPlain.has(ch)) return;
      setSelected((prev) => (prev === ch ? null : ch));
    },
    [isReadOnly, hintCipherToPlain]
  );

  const handlePlainClick = useCallback(
    (plain: string) => {
      if (!selected || isReadOnly) return;
      setLetterMap((prev) => ({ ...prev, [selected]: plain }));
      setJustAssigned(selected);
      setSelected(null);
    },
    [selected, isReadOnly]
  );

  const handleClearSelected = useCallback(() => {
    if (!selected) return;

    setLetterMap((prev) => {
      const next = { ...prev };
      delete next[selected];
      const hintPlain = hintCipherToPlain.get(selected);
      if (hintPlain) next[selected] = hintPlain;
      return next;
    });

    setSelected(null);
  }, [selected, hintCipherToPlain]);

  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedPlain = new Set(Object.values(letterMap));

  const selectedMappedValue = selected ? letterMap[selected] : null;

  if (!data?.encoded || hints.length === 0) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Invalid cryptogram puzzle data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
            Starter hint{hints.length > 1 ? 's' : ''}
          </div>
          <div className="text-xs font-bold text-indigo-700 bg-white rounded-full px-2.5 py-1 shadow-sm shrink-0">
            {filledLetters}/{totalMappableLetters} solved
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-indigo-900">
          {hints.map((h, i) => (
            <span key={i} className="inline-flex items-center gap-1.5">
              <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-lg bg-white px-1.5 py-0.5 font-mono font-bold text-indigo-700 border border-indigo-200 text-sm">
                {h.cipherLetter}
              </span>
              <span className="text-indigo-400 text-xs">→</span>
              <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-lg bg-white px-1.5 py-0.5 font-mono font-bold text-indigo-700 border border-indigo-200 text-sm">
                {h.plainLetter}
              </span>
            </span>
          ))}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-fuchsia-500 transition-all duration-300"
            style={{ width: totalMappableLetters > 0 ? `${(filledLetters / totalMappableLetters) * 100}%` : '0%' }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white px-3 py-4 sm:px-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 text-center">
          {selected ? (
            <span>
              Assigning{' '}
              <span className="font-mono font-bold text-indigo-600">{selected}</span> - pick its letter below
            </span>
          ) : (
            'Tap an encoded letter to start'
          )}
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

            const isHint = hintCipherToPlain.has(ch);
            const isSelected = selected === ch;
            const matchesSelected = selected !== null && ch === selected;
            const plain = letterMap[ch] ?? '';
            const isPopping = justAssigned === ch;

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
                <div
                  className={[
                    'flex h-10 w-10 items-center justify-center rounded-t-lg border-b-2 text-base sm:h-11 sm:w-11 sm:text-lg font-bold transition-all duration-300',
                    isPopping ? 'scale-125' : 'scale-100',
                    isHint
                      ? 'border-indigo-400 bg-indigo-100 text-indigo-700'
                      : isSelected
                      ? 'border-indigo-500 bg-indigo-100 text-indigo-800'
                      : plain
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                      : 'border-gray-300 bg-white text-gray-300',
                  ].join(' ')}
                >
                  {plain || '·'}
                </div>

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

      {!isReadOnly && selected && (
        <div ref={pickerRef} className="sticky bottom-2 z-20" style={{ animation: 'cryptogramPickerIn 0.2s ease-out' }}>
          <div className="rounded-2xl border border-indigo-200 bg-white/95 backdrop-blur px-4 py-4 shadow-[0_8px_30px_rgba(79,70,229,0.25)]">
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

            <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-7 md:grid-cols-9">
              {alphabet.map((pl) => {
                const isHintPlain = hintPlainLetters.has(pl);
                const taken = usedPlain.has(pl) && selectedMappedValue !== pl;

                return (
                  <button
                    key={pl}
                    type="button"
                    onClick={() => !taken && !isHintPlain && handlePlainClick(pl)}
                    disabled={taken || isHintPlain}
                    className={[
                      'h-11 rounded-xl border text-sm font-bold transition-all sm:h-11',
                      selectedMappedValue === pl
                        ? 'border-indigo-600 bg-indigo-500 text-white scale-105'
                        : taken || isHintPlain
                        ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-300'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-400 hover:bg-indigo-50 active:scale-95',
                    ].join(' ')}
                  >
                    {pl}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleClearSelected}
                className="h-11 rounded-xl border border-red-200 bg-white text-sm font-bold text-red-500 transition hover:border-red-300 hover:bg-red-50 active:scale-95"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Decoded preview
        </div>
        <div className="mt-2 break-words font-mono text-sm sm:text-base leading-7 text-emerald-900">
          {decoded}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Current mappings
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {uniqueCipherLetters.map((cipher) => {
            const mapped = letterMap[cipher];
            const isHint = hintCipherToPlain.has(cipher);

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

      {isReadOnly ? null : allFilled ? (
        <div className="rounded-2xl px-5 py-3 text-center bg-gradient-to-r from-amber-100 to-amber-200 shadow-sm">
          <p className="font-semibold text-amber-900">All letters filled! 🏆</p>
          <p className="text-sm mt-0.5 text-amber-700">Hit Submit to check your answer.</p>
        </div>
      ) : (
        <p className="text-center text-xs sm:text-sm text-gray-500">
          Tap any encoded letter in the phrase to start decoding.
        </p>
      )}

      <style>{`
        @keyframes cryptogramPickerIn {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CryptogramRenderer;