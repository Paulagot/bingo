// src/components/Quiz/host-controls/components/HiddenObjectReviewPanel.tsx
import { Trophy, ChevronRight } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

type Item = {
  id: string;
  label: string;
  bbox: { x: number; y: number; w: number; h: number };
};

type HiddenObjectPuzzle = {
  puzzleId: string;
  imageUrl: string;
  difficulty: string;
  category: string;
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
  currentReviewIndex: number;      // ✅ ADD THIS
  totalReviewQuestions: number;    // ✅ ADD THIS
  onNextReview: () => void;        // ✅ ADD THIS
  onShowRoundResults: () => void;
};

export default function HiddenObjectReviewPanel({
  roomPhase,
  puzzle,
  foundIds = [],
  reviewComplete,
  currentReviewIndex,         // ✅ ADD THIS
  totalReviewQuestions,       // ✅ ADD THIS
  onNextReview,               // ✅ ADD THIS
  onShowRoundResults,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgReady, setImgReady] = useState(false);

  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);

  if (!puzzle || roomPhase !== 'reviewing') return null;

  // ✅ Check if this is the last review
  const isLastReview = currentReviewIndex >= totalReviewQuestions - 1;

  return (
    <div className="bg-muted mb-6 rounded-xl border-2 border-yellow-200 p-6 shadow-lg">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-fg text-lg font-bold">🔍 Hidden Object Review</h3>
          {puzzle.puzzleNumber && puzzle.totalPuzzles && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-medium text-purple-700">
              Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
            </span>
          )}
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            {puzzle.difficulty.toUpperCase()} • {puzzle.category}
          </span>
        </div>

        {/* ✅ NAVIGATION BUTTONS */}
        <div className="flex items-center space-x-3">
          {!isLastReview ? (
            <button
              onClick={onNextReview}
              className="flex items-center space-x-2 rounded-lg bg-blue-500 px-4 py-2 font-medium text-white transition hover:bg-blue-600"
            >
              <span>Next Review</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onShowRoundResults}
              className="flex items-center space-x-2 rounded-lg bg-purple-500 px-4 py-2 font-medium text-white transition hover:bg-purple-600"
            >
              <Trophy className="h-4 w-4" />
              <span>Show Round Results</span>
            </button>
          )}
        </div>
      </div>

      {/* Image with markers */}
      <div className="mb-4 rounded-xl overflow-hidden border bg-white">
        <div className="relative">
          <img
            ref={imgRef}
            src={puzzle.imageUrl}
            alt="Hidden object review"
            className="w-full h-auto select-none"
            draggable={false}
            onLoad={() => setImgReady(true)}
          />

          {/* Overlay markers only after image is ready */}
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
                    isFound
                      ? 'bg-green-600 text-white border-green-700'
                      : 'bg-white/95 text-gray-900 border-gray-300',
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

      {/* Items list */}
      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-medium text-gray-700 mb-3">All Items</div>
        <div className="flex flex-wrap gap-2">
          {puzzle.items.map((it) => {
            const isFound = foundSet.has(it.id);
            return (
              <span
                key={it.id}
                className={[
                  'text-xs px-3 py-1 rounded-full border',
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

      {/* ✅ INFO MESSAGE - Updated to show navigation status */}
      <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-blue-700 font-medium">
          {isLastReview 
            ? '✅ All puzzles reviewed. Click "Show Round Results" to continue.'
            : `📋 Reviewing puzzle ${currentReviewIndex + 1} of ${totalReviewQuestions}. Click "Next Review" to continue.`
          }
        </p>
      </div>
    </div>
  );
}