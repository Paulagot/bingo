/**
 * Add Round Options Component
 *
 * Displays available round types that can be added.
 */

import { FC } from 'react';
import type { RoundTypeId } from '@/components/Quiz/types/quiz';
import { roundTypeDefinitions } from '@/components/Quiz/constants/quizMetadata';

export interface AddRoundOptionsProps {
  onAddRound: (roundType: RoundTypeId) => void;
}

export const AddRoundOptions: FC<AddRoundOptionsProps> = ({ onAddRound }) => {
  return (
    <div className="space-y-3 sm:space-y-4">
      {Object.values(roundTypeDefinitions).map((type) => (
        <div
          key={type.id}
          className="bg-muted hover:shadow-md rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6"
        >
          <div className="mb-3 flex items-start gap-3 sm:mb-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
              {type.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-fg mb-1 text-sm font-semibold sm:text-base">{type.name}</h3>
              <p className="text-fg/70 text-xs sm:text-sm">{type.description}</p>
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-xs font-medium text-blue-800 sm:text-sm">Timing</div>
              <div className="text-xs text-blue-600 sm:text-sm">{type.timing}</div>
            </div>
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="text-xs font-medium text-purple-800 sm:text-sm">Difficulty Level</div>
              <div className="text-xs text-purple-600 sm:text-sm">{type.difficulty}</div>
            </div>
          </div>

          <button
            onClick={() => onAddRound(type.id as RoundTypeId)}
            className="btn-primary w-full sm:rounded-xl sm:py-3 sm:text-base"
          >
            Add {type.name}
          </button>
        </div>
      ))}
    </div>
  );
};

