import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface MatchPairsRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

// Defined locally rather than imported from a shared puzzleTypes module —
// this component only needs this exact shape, and a drifted/renamed field
// on a shared type (the same class of bug that broke the engine's generate()
// function) shouldn't be able to silently break this file too.
interface PairItem {
  id: string;
  label: string;
}

interface MatchPairsMatch {
  leftId: string;
  rightId: string;
}

const parseArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

const normaliseItems = (value: unknown): PairItem[] => {
  return parseArray(value)
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `item-${index + 1}`,
          label: item,
        };
      }

      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;

        return {
          id: String(obj.id ?? obj.value ?? `item-${index + 1}`),
          label: String(
            obj.label ??
              obj.text ??
              obj.title ??
              obj.name ??
              obj.value ??
              ''
          ),
        };
      }

      return null;
    })
    .filter((item): item is PairItem => Boolean(item?.id && item?.label));
};

const MatchPairsRenderer: React.FC<MatchPairsRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as Record<string, unknown>;

  const prompt = useMemo(() => {
    const p = data.prompt ?? data.theme ?? data.instructions;
    return typeof p === 'string' && p.trim() !== '' ? p : null;
  }, [data]);

  const leftItems = useMemo(
    () => normaliseItems(data.leftItems ?? data.left ?? data.items),
    [data]
  );

  const rightItems = useMemo(
    () => normaliseItems(data.rightItems ?? data.right ?? data.matches ?? data.answers),
    [data]
  );

  // Lazy-initialized ONCE from currentAnswer on mount, same pattern as the
  // other puzzle renderers in this set. The previous version re-synced from
  // currentAnswer on every change, which meant a stale/lagging prop update
  // from the parent could silently overwrite the player's newer in-progress
  // matches mid-session. State now flows outward only, via onAnswerChange.
  const getInitialMatches = useCallback((): MatchPairsMatch[] => {
    const saved = currentAnswer?.matches;
    if (!Array.isArray(saved)) return [];
    return saved.filter(
      (m): m is MatchPairsMatch =>
        Boolean(m) && typeof m === 'object' && typeof (m as MatchPairsMatch).leftId === 'string' && typeof (m as MatchPairsMatch).rightId === 'string'
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [matches, setMatches] = useState<MatchPairsMatch[]>(getInitialMatches);

  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);

  useEffect(() => {
    // Always report the current state — including back down to zero matches
    // — so the parent's saved answer can never drift from what's on screen.
    onAnswerChange({ matches });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches]);

  const totalPairs = leftItems.length;
  const matchCount = matches.length;
  const progressPercent = totalPairs > 0 ? Math.round((matchCount / totalPairs) * 100) : 0;
  const isComplete = totalPairs > 0 && matchCount === totalPairs;

  const getMatchedRight = (leftId: string): string | null => {
    return matches.find(match => match.leftId === leftId)?.rightId ?? null;
  };

  const getMatchedLeft = (rightId: string): string | null => {
    return matches.find(match => match.rightId === rightId)?.leftId ?? null;
  };

  const getLeftLabel = (leftId: string): string => {
    return leftItems.find(item => item.id === leftId)?.label ?? leftId;
  };

  const getRightLabel = (rightId: string): string => {
    return rightItems.find(item => item.id === rightId)?.label ?? rightId;
  };

  const handleLeftClick = (leftId: string) => {
    if (isReadOnly) return;

    const existingMatch = getMatchedRight(leftId);

    if (existingMatch) {
      setMatches(prev => prev.filter(match => match.leftId !== leftId));
      setSelectedLeftId(leftId);
      return;
    }

    setSelectedLeftId(prev => (prev === leftId ? null : leftId));
  };

  const handleRightClick = (rightId: string) => {
    if (isReadOnly || !selectedLeftId) return;

    setMatches(prev => {
      const filtered = prev.filter(
        match => match.leftId !== selectedLeftId && match.rightId !== rightId
      );

      return [
        ...filtered,
        {
          leftId: selectedLeftId,
          rightId,
        },
      ];
    });

    setSelectedLeftId(null);
  };

  const handleRemoveMatch = (leftId: string) => {
    if (isReadOnly) return;

    setMatches(prev => prev.filter(match => match.leftId !== leftId));

    if (selectedLeftId === leftId) {
      setSelectedLeftId(null);
    }
  };

  if (!leftItems.length || !rightItems.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <div className="font-bold">No matching pair items found.</div>
        <div className="mt-1">
          This puzzle needs leftItems and rightItems arrays in puzzleData.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Game intro / progress */}
      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-100 bg-gradient-to-br from-fuchsia-50 via-white to-indigo-50 px-4 py-3 sm:px-5 sm:py-4 shadow-sm">
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-fuchsia-100/70" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-fuchsia-500">
              Match the pairs
            </div>
            <div className="mt-1 text-sm font-medium text-slate-600">
              {prompt ?? 'Pick an item on the left, then choose its match on the right.'}
            </div>
          </div>

          <div className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 shrink-0">
            {matchCount}/{totalPairs} matched
          </div>
        </div>

        <div className="relative mt-4 h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-indigo-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Current instruction */}
      {!isReadOnly && (
        <div
          className={[
            'rounded-2xl border px-4 py-3 text-center text-sm font-bold transition',
            selectedLeftId
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
              : isComplete
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-500',
          ].join(' ')}
        >
          {selectedLeftId
            ? `Now choose the match for "${getLeftLabel(selectedLeftId)}"`
            : isComplete
            ? 'All pairs selected. Ready to submit.'
            : 'Start by choosing a card from the left.'}
        </div>
      )}

      {/* Main matching board — always side-by-side, even on mobile, so you
          never have to scroll past one whole column to reach the other. */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:gap-5">
        {/* Left items */}
        <section className="rounded-2xl sm:rounded-[2rem] border border-slate-200 bg-white px-2 py-3 sm:px-4 sm:py-5 shadow-sm">
          <div className="mb-2.5 sm:mb-4">
            <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.22em] text-slate-400">
              Items
            </div>
            <div className="hidden sm:block mt-1 text-xs font-medium text-slate-500">
              Choose one to match
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {leftItems.map(item => {
              const isSelected = selectedLeftId === item.id;
              const matchedRightId = getMatchedRight(item.id);
              const isMatched = Boolean(matchedRightId);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleLeftClick(item.id)}
                  disabled={isReadOnly}
                  className={[
                    'group flex w-full items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left shadow-sm transition',
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-100'
                      : isMatched
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:-translate-y-0.5 hover:border-fuchsia-300 hover:shadow-md',
                    isReadOnly ? 'cursor-default' : '',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl text-xs sm:text-sm font-black',
                      isSelected
                        ? 'bg-indigo-500 text-white'
                        : isMatched
                        ? 'bg-emerald-500 text-white'
                        : 'bg-fuchsia-100 text-fuchsia-700',
                    ].join(' ')}
                  >
                    {isMatched ? '✓' : '?'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-base font-black text-slate-900 break-words">
                      {item.label}
                    </div>

                    {isMatched && matchedRightId && (
                      <div className="hidden sm:block mt-1 text-xs font-semibold text-emerald-700">
                        Paired with {getRightLabel(matchedRightId)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Right items */}
        <section className="rounded-2xl sm:rounded-[2rem] border border-slate-200 bg-white px-2 py-3 sm:px-4 sm:py-5 shadow-sm">
          <div className="mb-2.5 sm:mb-4">
            <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.22em] text-slate-400">
              Matches
            </div>
            <div className="hidden sm:block mt-1 text-xs font-medium text-slate-500">
              Choose the matching card
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {rightItems.map(item => {
              const matchedLeftId = getMatchedLeft(item.id);
              const isMatched = Boolean(matchedLeftId);
              const isTargetable = Boolean(selectedLeftId) && !isReadOnly;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleRightClick(item.id)}
                  disabled={isReadOnly || !isTargetable}
                  className={[
                    'group flex w-full items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border px-2.5 py-2.5 sm:px-4 sm:py-4 text-left shadow-sm transition',
                    isMatched
                      ? 'border-emerald-300 bg-emerald-50'
                      : isTargetable
                      ? 'border-indigo-200 bg-indigo-50 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md'
                      : 'border-slate-200 bg-gradient-to-br from-white to-slate-50 opacity-80',
                    isTargetable && !isMatched ? 'cursor-pointer' : '',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'flex h-6 w-6 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg sm:rounded-2xl text-xs sm:text-sm font-black',
                      isMatched
                        ? 'bg-emerald-500 text-white'
                        : isTargetable
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-100 text-slate-400',
                    ].join(' ')}
                  >
                    {isMatched ? '✓' : selectedLeftId ? '+' : '•'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-base font-black text-slate-900 break-words">
                      {item.label}
                    </div>

                    {isMatched && matchedLeftId && (
                      <div className="hidden sm:block mt-1 text-xs font-semibold text-emerald-700">
                        Paired with {getLeftLabel(matchedLeftId)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Pair summary */}
      {matches.length > 0 && (
        <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-4 py-5">
          <div className="mb-3">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Your pairs
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">
              Review your matches before submitting.
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {matches.map(match => (
              <div
                key={match.leftId}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-3 py-3 text-sm shadow-sm"
              >
                <span className="font-bold text-slate-800">
                  {getLeftLabel(match.leftId)}
                </span>

                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-400">
                  →
                </span>

                <span className="font-bold text-slate-800">
                  {getRightLabel(match.rightId)}
                </span>

                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMatch(match.leftId)}
                    className="ml-1 rounded-full bg-rose-50 px-2 py-1 text-xs font-black text-rose-500 transition hover:bg-rose-100"
                    aria-label="Remove match"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isComplete && !isReadOnly ? (
        <div className="rounded-2xl px-5 py-3 text-center bg-gradient-to-r from-amber-100 to-amber-200 shadow-sm">
          <p className="font-semibold text-amber-900">All pairs matched! 🏆</p>
          <p className="text-sm mt-0.5 text-amber-700">Hit Submit to lock in your answer.</p>
        </div>
      ) : (
        <p className="text-center text-xs text-slate-400">
          Tip: matched cards can be tapped again if you want to change them.
        </p>
      )}
    </div>
  );
};

export default MatchPairsRenderer;