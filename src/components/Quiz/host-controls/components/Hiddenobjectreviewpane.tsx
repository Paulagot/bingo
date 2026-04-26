// src/components/Quiz/host-controls/components/HiddenObjectReviewPanel.tsx
import { Trophy, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

type ItemDifficulty = 'easy' | 'medium' | 'hard';

type Item = {
  id: string;
  label: string;
  difficulty?: ItemDifficulty;
  bbox: { x: number; y: number; w: number; h: number };
};

type HiddenObjectPuzzle = {
  puzzleId: string;
  imageUrl: string;
  difficulty?: string; // kept for compatibility, not displayed
  category?: string;
  totalSeconds: number;
  itemTarget: number;
  items: Item[];
  puzzleNumber?: number;
  totalPuzzles?: number;
};

type Props = {
  roomPhase: string;
  puzzle: HiddenObjectPuzzle | null;
  foundIds?: string[];
  reviewComplete: boolean;
  currentReviewIndex: number;
  totalReviewQuestions: number;
  onNextReview: () => void;
  onShowRoundResults: () => void;
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
  if (isFound) return 'bg-green-600 text-white border-green-700';

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

export default function HiddenObjectReviewPanel({
  roomPhase,
  puzzle,
  foundIds = [],
  reviewComplete,
  currentReviewIndex,
  totalReviewQuestions,
  onNextReview,
  onShowRoundResults,
}: Props) {
  const [imgReady, setImgReady] = useState(false);

  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);

  if (!puzzle || roomPhase !== 'reviewing') return null;

  const isLastReview = currentReviewIndex >= totalReviewQuestions - 1;
  const foundCount = foundIds.length;
  const itemCount = puzzle.itemTarget || puzzle.items.length;
  const progressText = `${foundCount}/${itemCount}`;

  return (
    <div className="mb-4 h-[calc(100dvh-8rem)] min-h-[520px] overflow-hidden rounded-xl border-2 border-yellow-200 bg-slate-50 p-3 shadow-lg">
      <div className="flex h-full min-h-0 flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">
                Hidden Object Review
              </h3>

              {puzzle.puzzleNumber && puzzle.totalPuzzles && (
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                  Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
                </span>
              )}

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                Found {progressText}
              </span>

              {reviewComplete && (
                <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                  Review complete
                </span>
              )}
            </div>

            <p className="mt-1 hidden text-xs text-slate-500 sm:block">
              Green markers were found. Coloured pins show missed item value.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!isLastReview ? (
              <button
                type="button"
                onClick={onNextReview}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-600"
              >
                <span className="hidden sm:inline">Next Review</span>
                <span className="sm:hidden">Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onShowRoundResults}
                className="flex items-center gap-2 rounded-lg bg-purple-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-purple-600"
              >
                <Trophy className="h-4 w-4" />
                <span className="hidden sm:inline">Show Round Results</span>
                <span className="sm:hidden">Results</span>
              </button>
            )}
          </div>
        </div>

        {/* Main review area */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Image with markers */}
          <div className="min-h-0 rounded-xl border bg-white p-2 shadow-sm">
            <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              {/*
                This wrapper sizes to the rendered image.
                Markers are percentage-positioned inside this wrapper,
                so they stay aligned when the image scales.
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
                          'max-w-[130px] whitespace-nowrap rounded-full border px-2 py-1 text-[11px] font-bold shadow-md',
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

          {/* Desktop item panel */}
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
                          ? 'border-green-700 bg-green-600 text-white'
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

            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">
                {isLastReview
                  ? 'All puzzles reviewed.'
                  : `Reviewing puzzle ${currentReviewIndex + 1} of ${totalReviewQuestions}.`}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                {isLastReview
                  ? 'Show round results when ready.'
                  : 'Click Next Review to continue.'}
              </p>
            </div>
          </aside>
        </div>

        {/* Mobile/tablet item panel */}
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
                      ? 'border-green-700 bg-green-600 text-white'
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
}