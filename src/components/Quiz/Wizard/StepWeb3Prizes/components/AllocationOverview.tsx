/**
 * Allocation Overview Component
 *
 * Displays current allocation percentages for charity, personal, prizes, and platform.
 */

import { FC } from 'react';
import { Trophy } from 'lucide-react';
import type { PrizeSource } from '../types';

export interface AllocationOverviewProps {
  charityPct: number;
  personalTake: number;
  prizePoolPct: number;
  prizeSource: PrizeSource;
  platformPct: number;
}

export const AllocationOverview: FC<AllocationOverviewProps> = ({
  charityPct,
  personalTake,
  prizePoolPct,
  prizeSource,
  platformPct,
}) => {
  return (
    <div className="sticky top-4 z-10 rounded-xl border border-indigo-200 bg-indigo-50 p-3 md:p-4">
      <div className="mb-2 flex items-center space-x-2">
        <Trophy className="h-4 w-4 text-indigo-600" />
        <span className="text-sm font-medium text-indigo-800 md:text-base">Current Allocation</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-xs md:text-sm">
        <div className="rounded border bg-red-100 p-2">
          <div className="font-bold text-red-700">{Math.round(charityPct * 10) / 10}%</div>
          <div className="text-red-600">Charity</div>
        </div>
        <div className="rounded border bg-blue-100 p-2">
          <div className="font-bold text-blue-700">{Math.round((personalTake || 0) * 10) / 10}%</div>
          <div className="text-blue-600">Personal</div>
        </div>
        <div className="rounded border bg-yellow-100 p-2">
          <div className="font-bold text-yellow-700">
            {prizeSource === 'pool' ? Math.round((prizePoolPct || 0) * 10) / 10 : 0}%
          </div>
          <div className="text-yellow-600">Prizes</div>
        </div>
        <div className="rounded border bg-gray-100 p-2">
          <div className="text-fg/80 font-bold">{platformPct}%</div>
          <div className="text-fg/70">Platform</div>
        </div>
      </div>
    </div>
  );
};

