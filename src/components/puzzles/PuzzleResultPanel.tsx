import React from 'react';
import type { PuzzleScoreResult } from './puzzleTypes';

interface PuzzleResultPanelProps {
  scoreResult: PuzzleScoreResult;
  timeTakenSeconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

const PuzzleResultPanel: React.FC<PuzzleResultPanelProps> = ({ scoreResult, timeTakenSeconds }) => {
  const { correct, completed, baseScore, bonusScore, penaltyScore, totalScore } = scoreResult;

  const isSuccess = correct && completed;

  return (
    <div
      className={`mx-6 my-4 rounded-2xl p-6 border ${
        isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
      }`}
    >
      {/* Status */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{isSuccess ? '🎉' : '❌'}</span>
        <div>
          <p className={`text-lg font-bold ${isSuccess ? 'text-emerald-800' : 'text-rose-800'}`}>
            {isSuccess ? 'Puzzle Complete!' : 'Not Quite Right'}
          </p>
          <p className="text-sm text-gray-500">
            {isSuccess ? `Completed in ${formatTime(timeTakenSeconds)}` : 'Your answer was incorrect.'}
          </p>
        </div>
      </div>

      {/* Score breakdown */}
      {isSuccess && (
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Base score</span>
            <span className="font-mono font-semibold">+{baseScore}</span>
          </div>
          {bonusScore > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Speed bonus</span>
              <span className="font-mono font-semibold">+{bonusScore}</span>
            </div>
          )}
          {penaltyScore > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Penalty</span>
              <span className="font-mono font-semibold">−{penaltyScore}</span>
            </div>
          )}
          <div className="pt-2 mt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
            <span>Total</span>
            <span className="font-mono text-indigo-700">{totalScore}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PuzzleResultPanel;
