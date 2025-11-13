/**
 * Prize Card Component
 *
 * Displays and allows editing of a single prize.
 */

import { FC } from 'react';
import { Trash2, Gift, Tag, DollarSign, Target, CheckCircle } from 'lucide-react';
import type { Prize } from '@/components/Quiz/types/quiz';
import { ordinal } from '../utils/formatting';

export interface PrizeCardProps {
  prize: Prize;
  index: number;
  currency: string;
  onUpdate: <K extends keyof Prize>(field: K, value: Prize[K]) => void;
  onRemove: () => void;
}

export const PrizeCard: FC<PrizeCardProps> = ({ prize, index, currency, onUpdate, onRemove }) => {
  const configured = Boolean(prize.description?.trim());

  return (
    <div
      className={`rounded-lg border-2 p-3 transition-all sm:p-4 ${
        configured ? 'border-green-300 bg-green-50' : 'border-border bg-muted'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${
              prize.place === 1
                ? 'bg-yellow-100 text-yellow-800'
                : prize.place === 2
                ? 'bg-gray-100 text-fg'
                : prize.place === 3
                ? 'bg-orange-100 text-orange-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {prize.place}
          </div>
          <div className="flex items-center gap-2">
            <Target className="text-fg/70 h-4 w-4" />
            <span className="text-fg text-sm font-medium sm:text-base">
              {prize.place}
              {ordinal(prize.place)} Place
            </span>
            {configured && <CheckCircle className="h-4 w-4 text-green-600" />}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-1 text-red-500 transition-colors hover:bg-red-100"
          aria-label="Remove prize"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Inputs */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-fg/80 flex items-center gap-1.5 text-xs font-medium sm:text-sm">
            <Gift className="h-4 w-4" />
            <span>
              Prize Description <span className="text-red-500">*</span>
            </span>
          </label>
          <input
            type="text"
            value={prize.description || ''}
            onChange={(e) => onUpdate('description', e.target.value)}
            placeholder="e.g., €50 Gift Card, iPad"
            className={`w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:text-base ${
              prize.description?.trim()
                ? 'border-green-300 bg-green-50 focus:border-green-500'
                : 'border-border bg-card focus:border-indigo-500'
            }`}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-fg/80 flex items-center gap-1.5 text-xs font-medium sm:text-sm">
              <Tag className="h-4 w-4" />
              <span>Sponsor (optional)</span>
            </label>
            <input
              type="text"
              value={prize.sponsor || ''}
              onChange={(e) => onUpdate('sponsor', e.target.value)}
              placeholder="Local Business"
              className="w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-base"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-fg/80 flex items-center gap-1.5 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>Value ({currency})</span>
            </label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={prize.value ?? ''}
              onChange={(e) => onUpdate('value', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className={`w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:text-base ${
                prize.value && prize.value > 0
                  ? 'border-green-300 bg-green-50 focus:border-green-500'
                  : 'border-border bg-card focus:border-indigo-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      {prize.description?.trim() && (
        <div className="mt-3 rounded-lg border border-border bg-card p-2">
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-fg/80">
              <strong>
                {prize.place}
                {ordinal(prize.place)}:
              </strong>{' '}
              {prize.description}
              {prize.value && prize.value > 0 && ` (${currency}${prize.value})`}
              {prize.sponsor && ` — ${prize.sponsor}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

