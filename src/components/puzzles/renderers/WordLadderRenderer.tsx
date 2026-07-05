import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface WordLadderRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

interface WordLadderData {
  theme?: string;
  startWord: string;
  endWord: string;
  wordLength: number;
  minSteps: number;
  middleStepCount?: number;
  starterRows?: number;
  maxExtraSteps?: number;
}

function normaliseWord(value: string, maxLength: number): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, maxLength);
}

function differenceCount(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 999;

  let diff = 0;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) diff++;
  }

  return diff;
}

function isCompleteWord(word: string, length: number): boolean {
  return word.length === length;
}

function getChangedIndexes(previous: string, current: string): Set<number> {
  const changed = new Set<number>();

  if (!previous || !current || previous.length !== current.length) {
    return changed;
  }

  for (let i = 0; i < current.length; i++) {
    if (previous[i] !== current[i]) {
      changed.add(i);
    }
  }

  return changed;
}

interface LetterBoxesProps {
  word: string;
  wordLength: number;
  previousWord?: string;
  isFixed?: boolean;
  isEditable?: boolean;
  isInvalid?: boolean;
  onChange?: (value: string) => void;
}

const LetterBoxes: React.FC<LetterBoxesProps> = ({
  word,
  wordLength,
  previousWord,
  isFixed = false,
  isEditable = false,
  isInvalid = false,
  onChange,
}) => {
  const changedIndexes = previousWord
    ? getChangedIndexes(previousWord, word)
    : new Set<number>();

  const letters = Array.from({ length: wordLength }, (_, index) => word[index] ?? '');

  if (!isEditable) {
    return (
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${wordLength}, minmax(0, 1fr))` }}>
        {letters.map((letter, index) => {
          const changed = changedIndexes.has(index);

          return (
            <div
              key={index}
              className={[
                'flex aspect-square items-center justify-center rounded-2xl border text-xl font-black uppercase shadow-sm sm:text-2xl',
                isFixed
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                  : changed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-800',
              ].join(' ')}
            >
              {letter}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={word}
      onChange={event => onChange?.(normaliseWord(event.target.value, wordLength))}
      maxLength={wordLength}
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      inputMode="text"
      className={[
        'w-full rounded-2xl border-2 px-4 py-3 text-center text-2xl font-black uppercase tracking-[0.35em] outline-none transition sm:text-3xl',
        isInvalid
          ? 'border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-400 focus:ring-4 focus:ring-rose-100'
          : isCompleteWord(word, wordLength)
            ? 'border-emerald-300 bg-white text-slate-900 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100'
            : 'border-slate-300 bg-white text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100',
      ].join(' ')}
      placeholder={'_'.repeat(wordLength)}
    />
  );
};

interface RowStatus {
  label: string;
  tone: 'locked' | 'empty' | 'valid' | 'invalid' | 'neutral';
}

function getRowStatus({
  word,
  previousWord,
  wordLength,
  isFixed,
}: {
  word: string;
  previousWord?: string;
  wordLength: number;
  isFixed: boolean;
}): RowStatus {
  if (isFixed) {
    return { label: 'Locked', tone: 'locked' };
  }

  if (!word) {
    return { label: 'Fill this word', tone: 'empty' };
  }

  if (word.length !== wordLength) {
    return { label: `${word.length}/${wordLength} letters`, tone: 'neutral' };
  }

  if (previousWord && previousWord.length === wordLength) {
    const diff = differenceCount(previousWord, word);

    if (diff === 1) {
      return { label: 'One letter changed', tone: 'valid' };
    }

    return { label: `${diff} letters changed`, tone: 'invalid' };
  }

  return { label: 'Ready', tone: 'valid' };
}

const WordLadderRenderer: React.FC<WordLadderRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as WordLadderData;

  const startWord = normaliseWord(data.startWord ?? '', data.wordLength ?? 4);
  const endWord = normaliseWord(data.endWord ?? '', data.wordLength ?? 4);
  const wordLength = Number(data.wordLength ?? startWord.length ?? 4);
  const starterRows = Number(data.starterRows ?? data.middleStepCount ?? Math.max(1, data.minSteps - 1));
  const maxExtraSteps = Number(data.maxExtraSteps ?? 3);

  const buildInitialSteps = (): string[] => {
    const saved = currentAnswer?.steps as string[] | undefined;

    if (saved && Array.isArray(saved) && saved.length >= 3) {
      return saved.map(step => normaliseWord(String(step), wordLength));
    }

    return [
      startWord,
      ...Array.from({ length: starterRows }, () => ''),
      endWord,
    ];
  };

  const [steps, setSteps] = useState<string[]>(buildInitialSteps);

  useEffect(() => {
    onAnswerChange({ steps });
  }, [steps, onAnswerChange]);

  const middleRowsUsed = Math.max(0, steps.length - 2);
  const extraRowsUsed = Math.max(0, middleRowsUsed - starterRows);
  const canAddStep = !isReadOnly && extraRowsUsed < maxExtraSteps;

  const updateStep = useCallback((index: number, value: string) => {
    setSteps(previous => {
      const next = [...previous];
      next[index] = normaliseWord(value, wordLength);
      return next;
    });
  }, [wordLength]);

  const addStep = useCallback(() => {
    if (!canAddStep) return;

    setSteps(previous => {
      const next = [...previous];
      next.splice(next.length - 1, 0, '');
      return next;
    });
  }, [canAddStep]);

  const removeStep = useCallback((index: number) => {
    setSteps(previous => {
      if (index <= 0 || index >= previous.length - 1) return previous;
      if (previous.length <= 3) return previous;

      const next = [...previous];
      next.splice(index, 1);
      return next;
    });
  }, []);

  const clearMiddleSteps = useCallback(() => {
    setSteps([
      startWord,
      ...Array.from({ length: starterRows }, () => ''),
      endWord,
    ]);
  }, [startWord, endWord, starterRows]);

  const completedMiddleRows = steps
    .slice(1, -1)
    .filter(word => word.length === wordLength)
    .length;

  const localValidity = useMemo(() => {
    const issues: string[] = [];

    for (let i = 1; i < steps.length; i++) {
      const previous = steps[i - 1];
      const current = steps[i];

      if (!previous || !current) continue;
      if (previous.length !== wordLength || current.length !== wordLength) continue;

      const diff = differenceCount(previous, current);

      if (diff !== 1) {
        issues.push(`${previous} → ${current} changes ${diff} letters`);
      }
    }

    return issues;
  }, [steps, wordLength]);

  if (!startWord || !endWord) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <div className="font-bold">Word ladder data is missing.</div>
        <div className="mt-1">
          This puzzle needs startWord, endWord, wordLength and minSteps.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-indigo-50 px-5 py-5 shadow-sm">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-sky-100/80" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-indigo-100/60" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-500">
              Word ladder
            </div>

            <div className="mt-1 text-xl font-black text-slate-900">
              {data.theme ?? `${startWord} to ${endWord}`}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
              Change one letter at a time. Every step must be a real word.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Target
              </div>
              <div className="text-xl font-black text-slate-900">
                {data.minSteps}
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Filled
              </div>
              <div className="text-xl font-black text-slate-900">
                {completedMiddleRows}/{middleRowsUsed}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Start/end summary */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Start
          </div>
          <div className="mt-1 text-2xl font-black tracking-widest text-indigo-800">
            {startWord}
          </div>
        </div>

        <div className="text-2xl font-black text-slate-300">
          →
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
          <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
            Goal
          </div>
          <div className="mt-1 text-2xl font-black tracking-widest text-emerald-800">
            {endWord}
          </div>
        </div>
      </div>

      {/* Ladder */}
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-200 bg-white px-4 py-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Build the chain
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              Each row should change exactly one letter.
            </div>
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={clearMiddleSteps}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-500 transition hover:bg-slate-100"
            >
              Reset
            </button>
          )}
        </div>

        <div className="space-y-3">
          {steps.map((word, index) => {
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;
            const isFixed = isFirst || isLast;
            const previousWord = index > 0 ? steps[index - 1] : undefined;

            const rowStatus = getRowStatus({
              word,
              previousWord,
              wordLength,
              isFixed,
            });

            const isInvalid = rowStatus.tone === 'invalid';

            return (
              <div key={`${index}-${isFixed ? word : 'row'}`} className="relative">
                {index > 0 && (
                  <div className="mx-auto mb-2 h-5 w-1 rounded-full bg-slate-200" />
                )}

                <div
                  className={[
                    'rounded-3xl border px-3 py-3 transition',
                    isFixed
                      ? 'border-indigo-100 bg-indigo-50/60'
                      : isInvalid
                        ? 'border-rose-200 bg-rose-50'
                        : rowStatus.tone === 'valid'
                          ? 'border-emerald-200 bg-emerald-50/50'
                          : 'border-slate-200 bg-slate-50',
                  ].join(' ')}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {isFirst ? 'Start word' : isLast ? 'End word' : `Step ${index}`}
                    </div>

                    <div
                      className={[
                        'rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide',
                        rowStatus.tone === 'valid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : rowStatus.tone === 'invalid'
                            ? 'bg-rose-100 text-rose-700'
                            : rowStatus.tone === 'locked'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-slate-100 text-slate-500',
                      ].join(' ')}
                    >
                      {rowStatus.label}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <LetterBoxes
                        word={word}
                        wordLength={wordLength}
                        previousWord={previousWord}
                        isFixed={isFixed}
                        isEditable={!isFixed && !isReadOnly}
                        isInvalid={isInvalid}
                        onChange={value => updateStep(index, value)}
                      />
                    </div>

                    {!isFixed && !isReadOnly && steps.length > 3 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                        title="Remove step"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!isReadOnly && (
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={addStep}
              disabled={!canAddStep}
              className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-black text-slate-500 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add another step
            </button>

            {!canAddStep && (
              <div className="text-center text-xs font-medium text-slate-400">
                Extra step limit reached.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Local validation notes */}
      {localValidity.length > 0 && (
        <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <div className="font-black">Check these rows:</div>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {localValidity.slice(0, 3).map(issue => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Help */}
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-500">
        Example rule: COLD → CORD is valid because only one letter changed.
      </div>
    </div>
  );
};

export default WordLadderRenderer;
