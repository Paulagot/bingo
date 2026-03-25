import React, { useState, useCallback, useEffect, useRef } from 'react';

interface MemoryPairsRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

interface CardData { id: number; }
interface MemoryPairsData {
  cards:      CardData[];
  cardEmojis: string[];
  cols:       number;
  pairCount:  number;
}

interface FoundPair { cardId1: number; cardId2: number; }

const MemoryPairsRenderer: React.FC<MemoryPairsRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as MemoryPairsData;
  const { cards, cardEmojis, cols, pairCount } = data;

  const [flipped, setFlipped]       = useState<Set<number>>(new Set());
  const [matched, setMatched]       = useState<Set<number>>(new Set());
  const [foundPairs, setFoundPairs] = useState<FoundPair[]>(
    (currentAnswer?.foundPairs as FoundPair[]) ?? []
  );
  const [attempts, setAttempts]     = useState<number>(
    (currentAnswer?.attempts as number) ?? 0
  );
  const lockRef = useRef(false); // prevent clicks during flip-back delay

  // Restore matched set from saved foundPairs
  useEffect(() => {
    const matchedIds = new Set<number>();
    for (const p of foundPairs) {
      matchedIds.add(p.cardId1);
      matchedIds.add(p.cardId2);
    }
    setMatched(matchedIds);
  }, []);

  useEffect(() => {
    onAnswerChange({ foundPairs, attempts });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foundPairs, attempts]);

  const handleCardClick = useCallback((cardId: number) => {
    if (isReadOnly || lockRef.current) return;
    if (matched.has(cardId) || flipped.has(cardId)) return;

    setFlipped(prev => {
      const next = new Set(prev);
      next.add(cardId);

      if (next.size === 2) {
        lockRef.current = true;
        const [a, b] = [...next] as [number, number];
        setAttempts(c => c + 1);

        if (cardEmojis[a] === cardEmojis[b]) {
          // Match!
          setMatched(m => new Set<number>([...m, a, b]));
          setFoundPairs(fp => [...fp, { cardId1: a, cardId2: b }]);
          lockRef.current = false;
          return new Set<number>();
        } else {
          // No match — flip back after delay
          setTimeout(() => {
            setFlipped(new Set());
            lockRef.current = false;
          }, 900);
          return next;
        }
      }

      return next;
    });
  }, [isReadOnly, matched, flipped, cardEmojis]);

  const allMatched = matched.size === pairCount * 2;

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span>Pairs found: <strong className="text-gray-700">{foundPairs.length} / {pairCount}</strong></span>
        <span>·</span>
        <span>Attempts: <strong className="text-gray-700">{attempts}</strong></span>
      </div>

      {/* Card grid */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: cols * 64 + (cols - 1) * 8 }}
      >
        {cards.map(card => {
          const isFlipped = flipped.has(card.id);
          const isMatched = matched.has(card.id);
          const emoji     = cardEmojis[card.id] ?? '';

          return (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.id)}
              disabled={isReadOnly || isMatched || isFlipped}
              className={[
                'aspect-square rounded-xl border-2 flex items-center justify-center text-2xl',
                'transition-all duration-200 select-none',
                isMatched
                  ? 'bg-emerald-50 border-emerald-300 cursor-default scale-95'
                  : isFlipped
                    ? 'bg-indigo-50 border-indigo-300 cursor-default'
                    : 'bg-white border-gray-300 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer active:scale-95',
              ].join(' ')}
              style={{ width: 56, height: 56 }}
            >
              {(isFlipped || isMatched) ? emoji : '?'}
            </button>
          );
        })}
      </div>

      {allMatched && !isReadOnly ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-center">
          <p className="text-emerald-700 font-semibold">All pairs found!</p>
          <p className="text-emerald-600 text-sm mt-0.5">
            {attempts === pairCount ? '⭐ Perfect — no wrong attempts!' : `Completed in ${attempts} attempts.`} Hit Submit.
          </p>
        </div>
      ) : !isReadOnly ? (
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Tap two cards to flip them. Find all {pairCount} matching pairs.
        </p>
      ) : null}
    </div>
  );
};

export default MemoryPairsRenderer;