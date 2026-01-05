// src/components/Quiz/host-controls/components/HiddenObjectHostPanel.tsx
import { Timer, Eye } from 'lucide-react';

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
  puzzleNumber?: number;    // ✅ NEW
  totalPuzzles?: number;    // ✅ NEW
};

type Props = {
  visible: boolean;
  puzzle: HiddenObjectPuzzle | null;
  remainingSeconds: number | null;
};

export default function HiddenObjectHostPanel({
  visible,
  puzzle,
  remainingSeconds,
}: Props) {
  if (!visible || !puzzle) return null;

  return (
    <div className="bg-muted mb-6 rounded-xl border-2 border-blue-200 p-6 shadow-lg">
      {/* ✅ Header with puzzle progress */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-fg flex items-center space-x-2 text-lg font-bold">
            <Eye className="h-5 w-5 text-blue-600" />
            <span>🔍 Hidden Object Round</span>
          </h3>
          {puzzle.puzzleNumber && puzzle.totalPuzzles && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
            </span>
          )}
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-700">
            {puzzle.difficulty.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {puzzle.category && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
              {puzzle.category}
            </span>
          )}
          {remainingSeconds !== null && (
            <div className="flex items-center space-x-2">
              <Timer className="h-4 w-4 text-orange-600" />
              <span
                className={`text-lg font-bold ${
                  remainingSeconds <= 10
                    ? 'animate-pulse text-red-600'
                    : remainingSeconds <= 30
                      ? 'text-orange-600'
                      : 'text-green-600'
                }`}
              >
                {remainingSeconds}s
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Puzzle Image - NO MARKERS during asking phase */}
      <div className="mb-4 rounded-xl overflow-hidden border bg-white">
        <img
          src={puzzle.imageUrl}
          alt="Hidden object puzzle"
          className="w-full h-auto select-none"
          draggable={false}
        />
      </div>

      {/* Info Section */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-blue-800 font-medium">
              Players are finding hidden items...
            </p>
            <p className="text-blue-600 text-sm">
              {puzzle.itemTarget} items to find • {puzzle.totalSeconds}s per puzzle
            </p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">{puzzle.itemTarget}</div>
            <div className="text-xs text-blue-600">Items</div>
          </div>
        </div>
      </div>
    </div>
  );
}