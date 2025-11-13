/**
 * Prize Source Selector Component
 *
 * Allows user to choose between prize pool and external assets.
 */

import { FC } from 'react';
import { Percent, Gift } from 'lucide-react';
import type { PrizeSource } from '../types';

export interface PrizeSourceSelectorProps {
  prizeSource: PrizeSource;
  onSourceChange: (source: PrizeSource) => void;
}

export const PrizeSourceSelector: FC<PrizeSourceSelectorProps> = ({
  prizeSource,
  onSourceChange,
}) => {
  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md md:p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">🎁</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">Prize Source</h3>
          <p className="text-fg/70 text-sm">How will you provide prizes to winners?</p>
        </div>
      </div>

      <div className="space-y-3">
        <label
          className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
            prizeSource === 'pool'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-border hover:border-indigo-400'
          }`}
        >
          <input
            type="radio"
            name="prizeSource"
            checked={prizeSource === 'pool'}
            onChange={() => onSourceChange('pool')}
            className="hidden"
          />
          <Percent className="h-6 w-6 text-indigo-600" />
          <div className="flex-1">
            <p className="text-fg font-medium">Use Prize Pool</p>
            <p className="text-fg/70 text-sm">Allocate part of collected funds for automatic distribution</p>
          </div>
        </label>

        <label
          className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
            prizeSource === 'assets'
              ? 'border-indigo-600 bg-indigo-50'
              : 'border-border hover:border-indigo-400'
          }`}
        >
          <input
            type="radio"
            name="prizeSource"
            checked={prizeSource === 'assets'}
            onChange={() => onSourceChange('assets')}
            className="hidden"
          />
          <Gift className="h-6 w-6 text-indigo-600" />
          <div className="flex-1">
            <p className="text-fg font-medium">External Assets</p>
            <p className="text-fg/70 text-sm">Provide your own NFTs, tokens, or digital assets</p>
          </div>
        </label>
      </div>
    </div>
  );
};

