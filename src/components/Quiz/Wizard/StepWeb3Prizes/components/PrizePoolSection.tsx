/**
 * Prize Pool Section Component
 *
 * Configuration for prize pool allocation and distribution splits.
 */

import { FC } from 'react';
import { Trophy, Target } from 'lucide-react';
import { PRIZE_PLACES, placeLabel } from '../types';

export interface PrizePoolSectionProps {
  prizePoolPct: number;
  maxPrizePool: number;
  splits: Record<number, number>;
  totalPrizeSplit: number;
  onPrizePoolPctChange: (value: number) => void;
  onSplitChange: (place: number, value: number) => void;
}

export const PrizePoolSection: FC<PrizePoolSectionProps> = ({
  prizePoolPct,
  maxPrizePool,
  splits,
  totalPrizeSplit,
  onPrizePoolPctChange,
  onSplitChange,
}) => {
  return (
    <>
      <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md md:p-6">
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 text-2xl">🏆</div>
          <div className="flex-1">
            <h3 className="text-fg text-lg font-semibold">Prize Pool Allocation</h3>
            <p className="text-fg/70 text-sm">How much of your remaining {maxPrizePool}% for prizes?</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3">
            <label className="text-fg/80 flex items-center justify-between text-sm font-medium">
              <div className="flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <span>Prize Pool Percentage</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">{prizePoolPct}%</span>
            </label>
            <div className="relative">
              <input
                type="range"
                min={0}
                max={maxPrizePool}
                step={1}
                value={prizePoolPct}
                onChange={(e) => onPrizePoolPctChange(parseFloat(e.target.value))}
                className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                style={{
                  background: `linear-gradient(to right, #EAB308 0%, #EAB308 ${
                    (prizePoolPct / Math.max(1, maxPrizePool)) * 100
                  }%, #E5E7EB ${(prizePoolPct / Math.max(1, maxPrizePool)) * 100}%, #E5E7EB 100%)`,
                }}
              />
              <div className="text-fg/60 mt-1 flex justify-between text-xs">
                <span>0%</span>
                <span>{Math.round(maxPrizePool / 2)}%</span>
                <span>{maxPrizePool}%</span>
              </div>
            </div>
            <p className="text-fg/60 text-xs">
              Remaining {Math.max(0, maxPrizePool - prizePoolPct)}% goes to charity
            </p>
          </div>
        </div>
      </div>

      {prizePoolPct > 0 && (
        <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">📊</div>
            <div className="flex-1">
              <h4 className="text-fg text-lg font-semibold">Prize Distribution</h4>
              <p className="text-fg/70 text-sm">How to split the {prizePoolPct}% prize pool</p>
            </div>
          </div>

          <div className="space-y-3">
            {PRIZE_PLACES.map((place) => (
              <div key={place} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <Target className="text-fg/70 h-4 w-4" />
                <span className="text-fg/80 w-20 font-medium">{placeLabel(place)} Place</span>
                <input
                  type="number"
                  value={splits[place] ?? ''}
                  onChange={(e) => onSplitChange(place, parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 50"
                  className="border-border w-24 rounded-lg border-2 px-3 py-2 outline-none transition focus:border-indigo-500"
                />
                <span className="text-fg/70">%</span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <p className="text-sm text-yellow-800">
              Total Split: <strong>{totalPrizeSplit}%</strong>
              {totalPrizeSplit > 100 && (
                <span className="ml-2 text-red-600">⚠️ Cannot exceed 100%</span>
              )}
              {totalPrizeSplit <= 100 && (
                <span className="ml-2 text-green-700">
                  ✓ {100 - totalPrizeSplit}% unallocated returns to charity
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

