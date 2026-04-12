import React, { useState, useCallback, useEffect } from 'react';

interface WordLadderRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

interface WordLadderData {
  startWord:  string;
  endWord:    string;
  wordLength: number;
  minSteps:   number;
}

const WordLadderRenderer: React.FC<WordLadderRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as WordLadderData;

  // Steps array always includes startWord at [0] and endWord at [last]
  const getInitialSteps = (): string[] => {
    const saved = currentAnswer?.steps as string[] | undefined;
    if (saved && Array.isArray(saved) && saved.length >= 2) return saved;
    return [data.startWord, '', data.endWord];
  };

  const [steps, setSteps] = useState<string[]>(getInitialSteps);

  useEffect(() => {
    onAnswerChange({ steps });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  const addStep = useCallback(() => {
    setSteps(prev => {
      const next = [...prev];
      next.splice(next.length - 1, 0, ''); // insert blank before end word
      return next;
    });
  }, []);

  const removeStep = useCallback((idx: number) => {
    setSteps(prev => {
      if (prev.length <= 3) return prev; // must keep at least one middle step
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  }, []);

  const updateStep = useCallback((idx: number, val: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[idx] = val.toUpperCase().slice(0, data.wordLength);
      return next;
    });
  }, [data.wordLength]);

  const isValid = (word: string) => word.length === data.wordLength;

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Header info */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Min steps: <strong className="text-gray-700">{data.minSteps}</strong></span>
        <span>·</span>
        <span>Your steps: <strong className="text-gray-700">{steps.length - 2}</strong></span>
      </div>

      {/* Ladder */}
      <div className="flex flex-col items-center gap-2 w-full max-w-xs">
        {steps.map((word, idx) => {
          const isFirst = idx === 0;
          const isLast  = idx === steps.length - 1;
          const isFixed = isFirst || isLast;

          return (
            <div key={idx} className="flex items-center gap-2 w-full">
              {/* Connector line */}
              <div className="flex flex-col items-center" style={{ width: 20 }}>
                {idx > 0 && <div className="w-0.5 h-3 bg-gray-300" />}
              </div>

              {/* Word input */}
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="text"
                  value={word}
                  onChange={e => !isFixed && updateStep(idx, e.target.value)}
                  disabled={isFixed || isReadOnly}
                  maxLength={data.wordLength}
                  placeholder={'?'.repeat(data.wordLength)}
                  className={[
                    'w-full text-center font-bold tracking-[0.3em] uppercase px-3 py-2.5 rounded-lg border-2 text-lg',
                    'focus:outline-none transition-colors',
                    isFirst || isLast
                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800 cursor-default'
                      : isValid(word)
                        ? 'bg-white border-emerald-400 text-gray-800 focus:border-emerald-500'
                        : 'bg-white border-gray-300 text-gray-800 focus:border-indigo-400',
                  ].join(' ')}
                />
                {!isFixed && !isReadOnly && (
                  <button
                    onClick={() => removeStep(idx)}
                    className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none"
                    title="Remove step"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add step button */}
      {!isReadOnly && (
        <button
          onClick={addStep}
          className="mt-1 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 text-sm hover:border-indigo-400 hover:text-indigo-500 transition-colors"
        >
          + Add step
        </button>
      )}

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Change one letter at a time. Each word must be real. Try to reach <strong>{data.endWord}</strong> in {data.minSteps} steps or fewer.
      </p>
    </div>
  );
};

export default WordLadderRenderer;
