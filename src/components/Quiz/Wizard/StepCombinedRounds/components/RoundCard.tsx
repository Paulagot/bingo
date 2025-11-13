/**
 * Round Card Component
 *
 * Displays and allows editing of a single round configuration.
 */

import { FC } from 'react';
import { Trash2, Trophy, Info, CheckCircle } from 'lucide-react';
import type { RoundDefinition } from '@/components/Quiz/types/quiz';
import { roundTypeDefinitions } from '@/components/Quiz/constants/quizMetadata';
import { availableCategories, availableDifficulties } from '@/components/Quiz/constants/quizMetadata';

export interface RoundCardProps {
  round: RoundDefinition;
  index: number;
  canRemove: boolean;
  onUpdate: (field: keyof RoundDefinition, value: any) => void;
  onRemove: () => void;
}

export const RoundCard: FC<RoundCardProps> = ({ round, index, canRemove, onUpdate, onRemove }) => {
  const roundDef = roundTypeDefinitions[round.roundType];
  const isConfigured = Boolean(round.category && round.difficulty);
  const categories = availableCategories[round.roundType] || [];

  return (
    <div
      className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
        isConfigured ? 'border-green-300 bg-green-50' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="mb-3 flex items-start gap-3 sm:mb-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
          {roundDef.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-fg text-sm font-semibold sm:text-base">
              Round {round.roundNumber}: {roundDef.name}
            </h3>
            {isConfigured && <CheckCircle className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
          </div>
          <p className="text-fg/70 text-xs sm:text-sm">{roundDef.description}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1 text-red-400 transition-colors hover:text-red-600 disabled:opacity-50"
          disabled={!canRemove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-fg/80 text-xs font-medium sm:text-sm">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={round.category || ''}
              onChange={(e) => onUpdate('category', e.target.value)}
              className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
                round.category
                  ? 'border-green-300 bg-green-50 focus:border-green-500'
                  : 'border-border focus:border-indigo-500'
              }`}
            >
              <option value="">Select Category...</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-fg/80 text-xs font-medium sm:text-sm">
              Difficulty <span className="text-red-500">*</span>
            </label>
            <select
              value={round.difficulty || ''}
              onChange={(e) => onUpdate('difficulty', e.target.value)}
              className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
                round.difficulty
                  ? 'border-green-300 bg-green-50 focus:border-green-500'
                  : 'border-border focus:border-indigo-500'
              }`}
            >
              <option value="">Select Difficulty...</option>
              {availableDifficulties.map((diff) => (
                <option key={diff} value={diff}>
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Points preview */}
        {isConfigured && round.config.pointsPerDifficulty && (
          <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-medium text-indigo-900 sm:text-sm">Points System</span>
            </div>

            {round.roundType === 'wipeout' ? (
              <div className="space-y-2">
                <div className="text-center">
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${
                      round.difficulty === 'easy'
                        ? 'bg-green-100 text-green-800'
                        : round.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <Trophy className="h-3 w-3" />
                    +
                    {round.config.pointsPerDifficulty[
                      round.difficulty as keyof typeof round.config.pointsPerDifficulty
                    ]}{' '}
                    points per correct answer
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded border border-red-200 bg-red-50 p-2 text-center">
                    <div className="font-bold text-red-700">-{round.config.pointsLostPerWrong || 2}</div>
                    <div className="text-red-600">Wrong Answer</div>
                  </div>
                  <div className="rounded border border-orange-200 bg-orange-50 p-2 text-center">
                    <div className="font-bold text-orange-700">-{round.config.pointsLostPerUnanswered || 3}</div>
                    <div className="text-orange-600">No Answer</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <span
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-sm font-bold ${
                    round.difficulty === 'easy'
                      ? 'bg-green-100 text-green-800'
                      : round.difficulty === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  <Trophy className="h-3 w-3" />
                  +
                  {round.config.pointsPerDifficulty[
                    round.difficulty as keyof typeof round.config.pointsPerDifficulty
                  ]}{' '}
                  points per correct answer
                </span>
              </div>
            )}
          </div>
        )}

        {/* Help */}
        {!isConfigured && (
          <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <p className="text-xs text-blue-700 sm:text-sm">
              Select both category and difficulty to complete this round configuration.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

