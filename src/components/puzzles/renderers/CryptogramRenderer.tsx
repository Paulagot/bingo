import React, { useState, useCallback, useEffect } from 'react';

interface CryptogramRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

interface CryptogramData {
  encoded:       string;
  uniqueLetters: number;
  hint: {
    cipherLetter: string;
    plainLetter:  string;
  };
}

const CryptogramRenderer: React.FC<CryptogramRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as CryptogramData;

  // letterMap: cipherLetter → playerGuess (one char)
  const getInitialMap = (): Record<string, string> => {
    const saved = currentAnswer?.letterMap as Record<string, string> | undefined;
    const base: Record<string, string> = saved ? { ...saved } : {};
    // Pre-fill the hint
    base[data.hint.cipherLetter] = data.hint.plainLetter;
    return base;
  };

  const [letterMap, setLetterMap] = useState<Record<string, string>>(getInitialMap);
  const [selected, setSelected]   = useState<string | null>(null);

  // Build decoded string from current map
  const decoded = data.encoded.split('').map(ch => {
    if (!/[A-Z]/.test(ch)) return ch;
    return letterMap[ch] ?? '_';
  }).join('');

  const allFilled = data.encoded.split('').filter(ch => /[A-Z]/.test(ch)).every(ch => letterMap[ch]);

  useEffect(() => {
    onAnswerChange({ letterMap, decoded });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letterMap, decoded]);

  const handleCipherClick = useCallback((ch: string) => {
    if (isReadOnly || ch === data.hint.cipherLetter) return;
    setSelected(prev => prev === ch ? null : ch);
  }, [isReadOnly, data.hint.cipherLetter]);

  const handlePlainClick = useCallback((plain: string) => {
    if (!selected || isReadOnly) return;
    setLetterMap(prev => ({ ...prev, [selected]: plain }));
    setSelected(null);
  }, [selected, isReadOnly]);

  // Unique cipher letters in order of appearance

  const alphabet      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const usedPlain     = new Set(Object.values(letterMap));

  return (
    <div className="flex flex-col gap-5">

      {/* Hint badge */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-sm text-indigo-700 text-center">
        Hint: the encoded letter <strong>{data.hint.cipherLetter}</strong> = <strong>{data.hint.plainLetter}</strong>
      </div>

      {/* Encoded phrase with boxes */}
      <div className="flex flex-wrap gap-1 justify-center">
        {data.encoded.split('').map((ch, i) => {
          if (ch === ' ') return <div key={i} className="w-3" />;
          if (!/[A-Z]/.test(ch)) return <span key={i} className="text-gray-400 self-end mb-1">{ch}</span>;

          const isHint     = ch === data.hint.cipherLetter;
          const isSelected = selected === ch;
          const plain      = letterMap[ch] ?? '';

          return (
            <div
              key={i}
              onClick={() => handleCipherClick(ch)}
              className={[
                'flex flex-col items-center cursor-pointer select-none',
                isReadOnly ? 'cursor-default' : '',
              ].join(' ')}
            >
              {/* Plain letter guess */}
              <div className={[
                'w-7 h-7 flex items-center justify-center font-bold text-sm border-b-2 transition-colors',
                isHint      ? 'text-indigo-600 border-indigo-400 bg-indigo-50' :
                isSelected  ? 'bg-indigo-100 border-indigo-500 text-indigo-800' :
                plain       ? 'text-gray-800 border-gray-400' :
                              'text-transparent border-gray-300',
              ].join(' ')}>
                {plain || '·'}
              </div>
              {/* Cipher letter */}
              <div className={[
                'w-7 text-center text-xs font-mono mt-0.5',
                isHint     ? 'text-indigo-500' :
                isSelected ? 'text-indigo-600 font-bold' :
                             'text-gray-400',
              ].join(' ')}>
                {ch}
              </div>
            </div>
          );
        })}
      </div>

      {/* Alphabet picker */}
      {!isReadOnly && selected && (
        <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
          <p className="text-xs text-gray-400 text-center mb-2">
            Pick the plain letter for <strong className="text-indigo-600">{selected}</strong>
          </p>
          <div className="flex flex-wrap gap-1 justify-center">
            {alphabet.map(pl => {
              const isHintPlain = pl === data.hint.plainLetter;
              const taken       = usedPlain.has(pl) && letterMap[selected] !== pl;
              return (
                <button
                  key={pl}
                  onClick={() => !taken && !isHintPlain && handlePlainClick(pl)}
                  disabled={taken || isHintPlain}
                  className={[
                    'w-8 h-8 rounded text-sm font-bold border transition-all',
                    letterMap[selected] === pl ? 'bg-indigo-500 text-white border-indigo-600' :
                    taken || isHintPlain        ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed' :
                                                  'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50',
                  ].join(' ')}
                >
                  {pl}
                </button>
              );
            })}
            <button
              onClick={() => { setLetterMap(prev => { const n = {...prev}; delete n[selected]; return n; }); setSelected(null); }}
              className="w-8 h-8 rounded text-sm border bg-white text-gray-400 border-gray-300 hover:border-red-300 hover:text-red-400"
            >✕</button>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="text-xs text-gray-400 text-center">
        {allFilled
          ? <span className="text-emerald-600 font-semibold">All letters filled — hit Submit to check!</span>
          : <span>Click an encoded letter, then pick its plain equivalent from the alphabet.</span>}
      </div>
    </div>
  );
};

export default CryptogramRenderer;