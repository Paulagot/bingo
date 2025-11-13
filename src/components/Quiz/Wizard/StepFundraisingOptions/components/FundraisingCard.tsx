/**
 * Fundraising Card Component
 *
 * Displays a fundraising extra option with details and add action.
 */

import { FC, useState } from 'react';
import { Eye } from 'lucide-react';
import type { FundraisingExtraDefinition } from '@/components/Quiz/constants/quizMetadata';
import { getApplicabilityInfo } from '../utils/applicability';

export interface FundraisingCardProps {
  extraKey: string;
  details: FundraisingExtraDefinition;
  currency: string;
  onAdd: (key: string) => void;
  getSuggestedPriceRange: (price: string) => string;
}

export const FundraisingCard: FC<FundraisingCardProps> = ({
  extraKey,
  details,
  currency,
  onAdd,
  getSuggestedPriceRange,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const applicability = getApplicabilityInfo(details);

  return (
    <div className="relative cursor-pointer rounded-lg border-2 border-border bg-muted p-3 transition-all hover:border-indigo-300 hover:shadow-md sm:rounded-xl sm:p-4">
      {/* expand / actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails((s) => !s);
        }}
        className="absolute right-2 top-2 rounded p-1 text-fg/60 hover:bg-muted hover:text-fg"
        aria-label="Toggle details"
      >
        <Eye className="h-4 w-4" />
      </button>

      {/* header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-lg sm:h-12 sm:w-12 sm:text-xl">
          {details.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-fg mb-1 truncate text-sm font-semibold sm:text-base">{details.label}</h4>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                details.excitement === 'High'
                  ? 'border-red-200 bg-red-100 text-red-800'
                  : details.excitement === 'Medium'
                  ? 'border-yellow-200 bg-yellow-100 text-yellow-800'
                  : 'border-green-200 bg-green-100 text-green-800'
              }`}
            >
              {details.excitement}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${applicability.color}`}>
              {applicability.icon}
              {applicability.text}
            </span>
          </div>
        </div>
      </div>

      {/* description */}
      <p className="text-fg/80 mb-3 text-xs sm:text-sm">{details.description}</p>

      {/* suggested price */}
      <div className="mb-3 text-xs text-fg/70 sm:text-sm">
        Suggested: <span className="font-medium">{getSuggestedPriceRange(details.suggestedPrice)}</span>
      </div>

      {/* primary action */}
      <button onClick={() => onAdd(extraKey)} className="btn-primary w-full">
        <span>Add Extra</span>
      </button>

      {/* expandable details */}
      {showDetails && (
        <div className="mt-3 rounded-lg border border-border bg-card p-3 sm:p-4">
          <div className="space-y-3 text-xs sm:text-sm">
            {details.strategy && (
              <div>
                <h5 className="text-fg mb-1 font-medium">Strategy</h5>
                <p className="text-fg/70">{details.strategy}</p>
              </div>
            )}
            {details.impact && (
              <div>
                <h5 className="text-fg mb-1 font-medium">Impact</h5>
                <p className="text-fg/70">{details.impact}</p>
              </div>
            )}
            {details.pros?.length ? (
              <div>
                <h5 className="text-fg mb-1 font-medium">Benefits</h5>
                <div className="flex flex-wrap gap-1">
                  {details.pros.map((pro, i) => (
                    <span key={i} className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                      {pro}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

