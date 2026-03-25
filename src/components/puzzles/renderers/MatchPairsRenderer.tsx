import React, { useState, useEffect } from 'react';
import type { MatchPairsPuzzleData, MatchPairsMatch } from '../puzzleTypes';

interface MatchPairsRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

const MatchPairsRenderer: React.FC<MatchPairsRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as MatchPairsPuzzleData;

  const initMatches = (): MatchPairsMatch[] => {
    return (currentAnswer.matches as MatchPairsMatch[]) ?? [];
  };

  const [matches, setMatches] = useState<MatchPairsMatch[]>(initMatches);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);

  useEffect(() => {
    if (matches.length > 0) {
      onAnswerChange({ matches });
    }
  }, [matches]);

  const getMatchedRight = (leftId: string): string | null => {
    return matches.find((m) => m.leftId === leftId)?.rightId ?? null;
  };

  const getMatchedLeft = (rightId: string): string | null => {
    return matches.find((m) => m.rightId === rightId)?.leftId ?? null;
  };

  const handleLeftClick = (leftId: string) => {
    if (isReadOnly) return;
    setSelectedLeftId((prev) => (prev === leftId ? null : leftId));
  };

  const handleRightClick = (rightId: string) => {
    if (isReadOnly || !selectedLeftId) return;

    setMatches((prev) => {
      // Remove any existing match for selectedLeftId or rightId
      const filtered = prev.filter(
        (m) => m.leftId !== selectedLeftId && m.rightId !== rightId
      );
      return [...filtered, { leftId: selectedLeftId, rightId }];
    });

    setSelectedLeftId(null);
  };

  const handleRemoveMatch = (leftId: string) => {
    if (isReadOnly) return;
    setMatches((prev) => prev.filter((m) => m.leftId !== leftId));
  };

  const matchCount = matches.length;
  const totalPairs = data.leftItems.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{matchCount} / {totalPairs} matched</span>
        {!isReadOnly && selectedLeftId && (
          <span className="text-indigo-600 font-medium animate-pulse">
            Now click a right-side item to pair it
          </span>
        )}
        {!isReadOnly && !selectedLeftId && matchCount < totalPairs && (
          <span className="text-gray-400">Click a left item to start matching</span>
        )}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
            Items
          </p>
          {data.leftItems.map((item) => {
            const isSelected = selectedLeftId === item.id;
            const isMatched = getMatchedRight(item.id) !== null;

            return (
              <button
                key={item.id}
                onClick={() => isMatched ? handleRemoveMatch(item.id) : handleLeftClick(item.id)}
                disabled={isReadOnly}
                className={`px-3 py-2.5 text-sm font-medium rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                    : isMatched
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                } disabled:cursor-default`}
              >
                {item.label}
                {isMatched && (
                  <span className="ml-2 text-emerald-500 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">
            Matches
          </p>
          {data.rightItems.map((item) => {
            const matchedLeftId = getMatchedLeft(item.id);
            const isMatched = matchedLeftId !== null;
            const isTargetable = selectedLeftId !== null && !isReadOnly;

            return (
              <button
                key={item.id}
                onClick={() => handleRightClick(item.id)}
                disabled={isReadOnly || !isTargetable}
                className={`px-3 py-2.5 text-sm font-medium rounded-xl border-2 text-left transition-all ${
                  isMatched
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : isTargetable
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:border-indigo-500 cursor-pointer'
                    : 'border-gray-200 bg-white text-gray-700'
                } disabled:cursor-default`}
              >
                {item.label}
                {isMatched && (
                  <span className="ml-2 text-emerald-500 text-xs">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Connected pairs summary */}
      {matches.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Your pairs
          </p>
          <ul className="flex flex-col gap-1">
            {matches.map((m) => {
              const left = data.leftItems.find((i) => i.id === m.leftId);
              const right = data.rightItems.find((i) => i.id === m.rightId);
              return (
                <li key={m.leftId} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">{left?.label}</span>
                  <span className="text-gray-400">→</span>
                  <span>{right?.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MatchPairsRenderer;