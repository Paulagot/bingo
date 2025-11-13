/**
 * Selected Extra Card Component
 *
 * Displays a selected fundraising extra with price configuration.
 */

import { FC } from 'react';
import { Trash2, CheckCircle } from 'lucide-react';
import type { FundraisingExtraDefinition } from '@/components/Quiz/constants/quizMetadata';
import { getApplicabilityInfo } from '../utils/applicability';

export interface SelectedExtraCardProps {
  extraKey: string;
  details: FundraisingExtraDefinition;
  currency: string;
  price: number | undefined;
  onRemove: () => void;
  onPriceChange: (value: string) => void;
  getSuggestedPriceRange: (price: string) => string;
}

export const SelectedExtraCard: FC<SelectedExtraCardProps> = ({
  extraKey,
  details,
  currency,
  price,
  onRemove,
  onPriceChange,
  getSuggestedPriceRange,
}) => {
  const applicability = getApplicabilityInfo(details);
  const priceSet = typeof price === 'number' && price > 0;
  const priceValue = price ?? '';

  return (
    <div
      className={`rounded-lg border-2 p-3 transition-all sm:rounded-xl sm:p-4 ${
        priceSet ? 'border-green-300 bg-green-50' : 'border-border bg-muted'
      }`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-lg sm:h-12 sm:w-12 sm:text-xl">
            {details.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-fg text-sm font-semibold sm:text-base">{details.label}</h4>
              {priceSet && <CheckCircle className="h-4 w-4 text-green-600" />}
            </div>
            <p className="text-fg/70 text-xs sm:text-sm">{details.description}</p>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${applicability.color}`}>
                {applicability.icon}
                <span className="ml-1">{applicability.text}</span>
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onRemove}
          className="flex-shrink-0 rounded p-1 transition-colors hover:bg-red-100"
          title="Remove extra"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label className="text-fg/80 text-xs font-medium sm:text-sm">Price ({currency})</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={priceValue}
            onChange={(e) => onPriceChange(e.target.value)}
            className={`w-24 rounded-lg border-2 px-2 py-1 text-xs outline-none transition focus:ring-2 focus:ring-indigo-200 sm:w-28 sm:text-sm ${
              priceSet
                ? 'border-green-300 bg-green-50 focus:border-green-500'
                : 'border-border focus:border-indigo-500'
            }`}
            placeholder="0.00"
          />
          <span className="text-fg/60 hidden text-xs sm:inline">
            Suggested: {getSuggestedPriceRange(details.suggestedPrice)}
          </span>
        </div>
      </div>
    </div>
  );
};

