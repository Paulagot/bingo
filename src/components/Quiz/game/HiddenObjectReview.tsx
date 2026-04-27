// src/components/Quiz/game/HiddenObjectReview.tsx
import React, { useMemo, useState } from 'react';
import type { HiddenObjectPuzzle } from './HiddenObjectAsking';

type Props = {
  puzzle: HiddenObjectPuzzle;
  foundIds: string[];
};

const getDifficultyClass = (difficulty?: string) => {
  switch (difficulty) {
    case 'medium':
      return 'bg-amber-50 border-amber-300 text-amber-800';
    case 'hard':
      return 'bg-rose-50 border-rose-300 text-rose-800';
    case 'easy':
    default:
      return 'bg-emerald-50 border-emerald-300 text-emerald-800';
  }
};

const getMarkerClass = (difficulty?: string, isFound?: boolean) => {
  if (isFound) {
    return 'bg-green-600 text-white border-green-700';
  }

  switch (difficulty) {
    case 'medium':
      return 'bg-amber-500 text-white border-amber-700';
    case 'hard':
      return 'bg-rose-600 text-white border-rose-800';
    case 'easy':
    default:
      return 'bg-emerald-600 text-white border-emerald-800';
  }
};

const HiddenObjectReview: React.FC<Props> = ({ puzzle, foundIds }) => {
  const [imgReady, setImgReady] = useState(false);

  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);

  const progressText = `${foundIds.length}/${puzzle.itemTarget || puzzle.items.length}`;

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-slate-50 p-2 sm:p-3">
      <div className="flex h-full min-h-0 flex-col gap-2">
        {/* Compact top bar */}
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              <span>📋 Review · Hidden Object</span>

              {puzzle.puzzleNumber && puzzle.totalPuzzles && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                  Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
                </span>
              )}

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                Found {progressText}
              </span>
            </div>

            <div className="mt-1 hidden text-xs text-slate-500 sm:block">
              Green ticks were found. Coloured pins show missed item value.
            </div>
          </div>
        </div>

        {/* Main review area */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Image card */}
          <div className="min-h-0 rounded-xl border bg-white p-2 shadow-sm">
            <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {/*
                Important:
                This wrapper becomes the same size as the rendered image.
                Markers use percentage positions inside this wrapper,
                so they stay aligned even when object-contain resizes the image.
              */}
              <div className="relative inline-block max-h-full max-w-full">
                <img
                  src={puzzle.imageUrl}
                  alt="Hidden object review"
                  className="block max-h-full max-w-full select-none object-contain"
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
                          'max-w-[130px] rounded-full border px-2 py-1 text-[11px] font-bold shadow-md',
                          'whitespace-nowrap',
                          getMarkerClass(it.difficulty, isFound),
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
          </div>

          {/* Desktop summary panel */}
          <aside className="hidden min-h-0 rounded-xl border bg-white p-3 shadow-sm lg:flex lg:flex-col">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Review items
                </div>
                <div className="text-xs text-slate-500">
                  Found items are checked
                </div>
              </div>

              <div className="text-xs font-semibold text-slate-600">
                {progressText}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {puzzle.items.map((it) => {
                  const isFound = foundSet.has(it.id);

                  return (
                    <span
                      key={it.id}
                      className={[
                        'rounded-full border px-2.5 py-1 text-xs font-medium',
                        isFound
                          ? 'bg-green-600 border-green-700 text-white'
                          : getDifficultyClass(it.difficulty),
                      ].join(' ')}
                    >
                      {isFound ? '✅ ' : ''}
                      {it.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 text-[11px]">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-center text-emerald-800">
                Easy · 1pt
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-center text-amber-800">
                Medium · 2pt
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-center text-rose-800">
                Hard · 3pt
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile/tablet summary */}
        <div className="max-h-[18dvh] overflow-y-auto rounded-xl border bg-white p-2 shadow-sm lg:hidden">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Review items</span>
            <span className="font-semibold text-slate-500">{progressText}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {puzzle.items.map((it) => {
              const isFound = foundSet.has(it.id);

              return (
                <span
                  key={it.id}
                  className={[
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    isFound
                      ? 'bg-green-600 border-green-700 text-white'
                      : getDifficultyClass(it.difficulty),
                  ].join(' ')}
                >
                  {isFound ? '✅ ' : ''}
                  {it.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HiddenObjectReview;

