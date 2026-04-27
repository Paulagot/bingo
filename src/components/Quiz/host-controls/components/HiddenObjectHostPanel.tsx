// src/components/Quiz/host-controls/components/HiddenObjectHostPanel.tsx
import { Timer, Eye } from 'lucide-react';

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
  visible: boolean;
  puzzle: HiddenObjectPuzzle | null;
  remainingSeconds: number | null;
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

const getTimerTextClass = (remainingSeconds: number | null) => {
  if (remainingSeconds === null) return 'text-slate-700';
  if (remainingSeconds <= 10) return 'animate-pulse text-red-600';
  if (remainingSeconds <= 30) return 'text-orange-600';
  return 'text-green-600';
};

export default function HiddenObjectHostPanel({
  visible,
  puzzle,
  remainingSeconds,
}: Props) {
  if (!visible || !puzzle) return null;

  const itemCount = puzzle.itemTarget || puzzle.items.length;

  return (
    <div className="mb-4 h-[calc(100dvh-8rem)] min-h-[520px] overflow-hidden rounded-xl border-2 border-blue-200 bg-slate-50 p-3 shadow-lg">
      <div className="flex h-full min-h-0 flex-col gap-3">
        {/* Compact header */}
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
                <Eye className="h-5 w-5 text-blue-600" />
                <span>Hidden Object Round</span>
              </h3>

              {puzzle.puzzleNumber && puzzle.totalPuzzles && (
                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                  Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
                </span>
              )}

              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                {itemCount} items
              </span>
            </div>

            <p className="mt-1 hidden text-xs text-slate-500 sm:block">
              Players are finding every hidden item. Colour shows item value.
            </p>
          </div>

          {remainingSeconds !== null && (
            <div className="flex shrink-0 items-center gap-2 rounded-lg border bg-white px-3 py-2">
              <Timer className="h-4 w-4 text-orange-600" />
              <span className={`text-lg font-bold ${getTimerTextClass(remainingSeconds)}`}>
                {remainingSeconds}s
              </span>
            </div>
          )}
        </div>

        {/* Main host area */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Image */}
          <div className="min-h-0 rounded-xl border bg-white p-2 shadow-sm">
            <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              <img
                src={puzzle.imageUrl}
                alt="Hidden object puzzle"
                className="block max-h-full max-w-full select-none object-contain"
                draggable={false}
              />
            </div>
          </div>

          {/* Desktop item panel */}
          <aside className="hidden min-h-0 rounded-xl border bg-white p-3 shadow-sm lg:flex lg:flex-col">
            <div className="mb-2">
              <div className="text-sm font-semibold text-slate-900">
                Items players are finding
              </div>
              <div className="text-xs text-slate-500">
                Easy = 1pt, medium = 2pts, hard = 3pts
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {puzzle.items.map((it) => (
                  <span
                    key={it.id}
                    className={[
                      'rounded-full border px-2.5 py-1 text-xs font-medium',
                      getDifficultyClass(it.difficulty),
                    ].join(' ')}
                  >
                    {it.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm font-medium text-blue-800">
                Live asking phase
              </p>
              <p className="mt-1 text-xs text-blue-700">
                The host image is display-only during asking. Click validation happens on each player screen.
              </p>
            </div>
          </aside>
        </div>

        {/* Mobile/tablet compact item panel */}
        <div className="max-h-[18dvh] overflow-y-auto rounded-xl border bg-white p-2 shadow-sm lg:hidden">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Items</span>
            <span className="font-semibold text-slate-500">{itemCount}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {puzzle.items.map((it) => (
              <span
                key={it.id}
                className={[
                  'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                  getDifficultyClass(it.difficulty),
                ].join(' ')}
              >
                {it.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}