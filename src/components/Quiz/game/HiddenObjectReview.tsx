// src/components/Quiz/game/HiddenObjectReview.tsx
import React, { useMemo, useRef, useState } from 'react';
import type { HiddenObjectPuzzle } from './HiddenObjectAsking';

type Props = {
  puzzle: HiddenObjectPuzzle;
  foundIds: string[];
};

const HiddenObjectReview: React.FC<Props> = ({ puzzle, foundIds }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgReady, setImgReady] = useState(false);

  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);

  return (
    <div className="min-h-[100dvh] flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          📋 Review • Hidden Object
          {puzzle.puzzleNumber && puzzle.totalPuzzles && (
            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
              Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
            </span>
          )}
          <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
            {puzzle.difficulty.toUpperCase()}
          </span>
        </div>
        <div className="text-sm text-gray-600">
          Found: <span className="font-semibold">{foundIds.length}</span> / {puzzle.itemTarget}
        </div>
      </div>

      {/* ✅ Image uses remaining height */}
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border bg-white">
        <div className="relative h-full w-full flex items-center justify-center bg-gray-50">
          <img
            ref={imgRef}
            src={puzzle.imageUrl}
            alt="Hidden object review"
            className="max-w-full max-h-full w-auto h-full object-contain select-none"
            draggable={false}
            onLoad={() => setImgReady(true)}
          />

          {imgReady &&
            puzzle.items.map((it) => {
              const b = it.bbox;
              const cx = (b.x + b.w / 2) * 100;
              const cy = (b.y + b.h / 2) * 100;
              const isFound = foundSet.has(it.id);

              return (
                <div
                  key={it.id}
                  className={[
                    'absolute -translate-x-1/2 -translate-y-1/2',
                    'rounded-full border text-xs font-semibold px-2 py-1 shadow-sm',
                    isFound ? 'bg-green-600 text-white border-green-700' : 'bg-white/95 text-gray-900 border-gray-300',
                  ].join(' ')}
                  style={{ left: `${cx}%`, top: `${cy}%` }}
                  title={it.label}
                >
                  {isFound ? '✅' : '📍'} {it.label}
                </div>
              );
            })}
        </div>
      </div>

      {/* Items summary (kept, but won’t push image off-screen) */}
      <div className="rounded-xl border bg-white p-3">
        <div className="text-xs text-gray-600 mb-2">All items</div>
        <div className="flex flex-wrap gap-2">
          {puzzle.items.map((it) => {
            const isFound = foundSet.has(it.id);
            return (
              <span
                key={it.id}
                className={[
                  'text-xs px-2 py-1 rounded-full border',
                  isFound
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-800',
                ].join(' ')}
              >
                {it.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HiddenObjectReview;

