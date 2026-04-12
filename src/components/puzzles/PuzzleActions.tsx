import React from 'react';
import type { PuzzlePageState } from './puzzleTypes';

interface PuzzleActionsProps {
  pageState: PuzzlePageState;
  onStart: () => void;
  onReset: () => void;
  onSaveAndExit: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

const PuzzleActions: React.FC<PuzzleActionsProps> = ({
  pageState,
  onStart,
  onReset,
  onSaveAndExit,
  onSubmit,
  canSubmit,
}) => {
  if (pageState === 'locked') {
    return (
      <div className="flex justify-center px-6 py-4">
        <span className="text-sm text-gray-400 italic">This puzzle is not yet available.</span>
      </div>
    );
  }

  if (pageState === 'notStarted') {
    return (
      <div className="flex justify-center px-6 py-4">
        <button
          onClick={onStart}
          className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
        >
          Start Puzzle
        </button>
      </div>
    );
  }

  if (pageState === 'submitted' || pageState === 'completed') {
    return null;
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onSaveAndExit}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Save &amp; Exit
        </button>
      </div>

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`px-6 py-2.5 text-sm font-semibold rounded-xl transition-all ${
          canSubmit
            ? 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        Submit Answer
      </button>
    </div>
  );
};

export default PuzzleActions;