import React, { useMemo, useRef } from 'react';

type Item = {
  id: string;
  label: string;
  bbox: { x: number; y: number; w: number; h: number };
};

export type HiddenObjectPuzzle = {
  puzzleId: string;
  imageUrl: string;
  difficulty: string;
  category: string;
  totalSeconds: number;
  itemTarget: number;
  items: Item[];
};

type Props = {
  puzzle: HiddenObjectPuzzle;
  foundIds: string[];
  finished: boolean;
  onTap: (itemId: string, x: number, y: number) => void;
  remainingSeconds: number | null;
};

const HiddenObjectAsking: React.FC<Props> = ({
  puzzle,
  foundIds,
  finished,
  onTap,
  remainingSeconds
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);

  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);

  const remainingItems = useMemo(
    () => puzzle.items.filter((it) => !foundSet.has(it.id)),
    [puzzle.items, foundSet]
  );

  const handleClick = (e: React.MouseEvent) => {
    if (finished) return;
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // client-side hit test to pick the itemId (server validates again)
    const hit = remainingItems.find((it) => {
      const b = it.bbox;
      return x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h;
    });

    if (hit) {
      onTap(hit.id, x, y);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Find It Fast • {puzzle.difficulty.toUpperCase()}
        </div>
        <div className="text-sm">
          {remainingSeconds !== null ? `${remainingSeconds}s left` : ''}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border bg-white">
        <div className="relative">
          <img
            ref={imgRef}
            src={puzzle.imageUrl}
            alt="Hidden object puzzle"
            className="w-full h-auto select-none"
            onClick={handleClick}
            draggable={false}
          />

          {/* optional: show “found” ticks (simple, not revealing remaining locations) */}
          <div className="absolute top-3 left-3 bg-white/90 rounded-lg px-3 py-2 text-xs">
            Found: <span className="font-semibold">{foundIds.length}</span> / {puzzle.itemTarget}
            {finished ? <span className="ml-2 font-semibold">✅ Complete</span> : null}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-600 mb-2">Items to find</div>
        <div className="flex flex-wrap gap-2">
          {puzzle.items.map((it) => {
            const isFound = foundSet.has(it.id);
            return (
              <span
                key={it.id}
                className={[
                  'text-xs px-2 py-1 rounded-full border',
                  isFound ? 'bg-green-50 border-green-200 text-green-700 line-through' : 'bg-gray-50 border-gray-200'
                ].join(' ')}
              >
                {it.label}
              </span>
            );
          })}
        </div>

        <div className="mt-3 text-xs text-gray-600">
          Scoring: <span className="font-medium">1</span> per item + <span className="font-medium">1</span> per remaining second (only when you finish).
        </div>
      </div>
    </div>
  );
};

export default HiddenObjectAsking;
