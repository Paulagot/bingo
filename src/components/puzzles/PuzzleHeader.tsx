import React from 'react';
import type { PuzzleDifficulty, PuzzlePageState, PuzzleType } from './puzzleTypes';

interface PuzzleHeaderProps {
  title: string;
  puzzleType: PuzzleType;
  difficulty: PuzzleDifficulty;
  pageState: PuzzlePageState;
  elapsedSeconds: number;
}

const DIFFICULTY_STYLES: Record<PuzzleDifficulty, string> = {
  easy: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  hard: 'bg-rose-100 text-rose-800',
};

const STATE_LABELS: Record<PuzzlePageState, string> = {
  locked: 'Locked',
  notStarted: 'Not Started',
  inProgress: 'In Progress',
  submitted: 'Submitted',
  completed: 'Completed',
  failedValidation: 'Failed — Try Again',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PuzzleHeader: React.FC<PuzzleHeaderProps> = ({
  title,
  difficulty,
  pageState,
  elapsedSeconds,
}) => {
  const showTimer = pageState === 'inProgress';

  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${DIFFICULTY_STYLES[difficulty]}`}
        >
          {difficulty}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="font-medium">{STATE_LABELS[pageState]}</span>
        {showTimer && (
          <span className="font-mono text-gray-800 font-semibold tabular-nums">
            {formatTime(elapsedSeconds)}
          </span>
        )}
      </div>
    </div>
  );
};

export default PuzzleHeader;