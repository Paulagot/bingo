/**
 * External Assets Section Component
 *
 * Configuration for external asset prizes (NFTs, tokens, etc.).
 */

import { FC } from 'react';
import { Info } from 'lucide-react';
import type { Prize } from '@/components/Quiz/types/quiz';
import { PRIZE_PLACES, placeLabel } from '../types';
import { isPrizeComplete, isPrizeStarted } from '../utils/calculations';

export interface ExternalAssetsSectionProps {
  externalPrizes: Prize[];
  onPrizeChange: <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => void;
  onClearPrize: (index: number) => void;
}

export const ExternalAssetsSection: FC<ExternalAssetsSectionProps> = ({
  externalPrizes,
  onPrizeChange,
  onClearPrize,
}) => {
  return (
    <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
      <div className="mb-4 flex items-center space-x-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">🎨</div>
        <div className="flex-1">
          <h3 className="text-fg text-lg font-semibold">External Asset Prizes</h3>
          <p className="text-fg/70 text-sm">
            1st place is required. Others are optional but must be completed if started.
          </p>
        </div>
      </div>

      {/* Status overview */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="mb-2 flex items-center space-x-2">
          <Info className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">Prize Configuration Status</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {PRIZE_PLACES.map((place) => {
            const prize =
              externalPrizes.find((p) => p.place === place) ||
              ({ place, description: '', tokenAddress: '', value: 0 } as Prize);
            const complete = isPrizeComplete(prize);
            const started = isPrizeStarted(prize);
            const required = place === 1;

            return (
              <div
                key={place}
                className={`rounded p-2 text-center ${
                  complete
                    ? 'bg-green-100 text-green-700'
                    : started
                    ? 'bg-yellow-100 text-yellow-700'
                    : required
                    ? 'bg-red-100 text-red-700'
                    : 'text-fg/70 bg-gray-100'
                }`}
              >
                <div className="font-medium">{placeLabel(place)}</div>
                <div className="text-xs">
                  {complete ? '✓ Complete' : started ? '⚠ Incomplete' : required ? '✗ Required' : 'Optional'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        {externalPrizes.map((prize, index) => {
          const complete = isPrizeComplete(prize);
          const started = isPrizeStarted(prize);
          const required = prize.place === 1;

          return (
            <div
              key={index}
              className={`rounded-lg border-2 p-4 transition-all ${
                complete
                  ? 'border-green-200 bg-green-50'
                  : started
                  ? 'border-yellow-200 bg-yellow-50'
                  : required
                  ? 'border-red-200 bg-red-50'
                  : 'border-border bg-gray-50'
              }`}
            >
              <div className="mb-3 flex items-center space-x-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                    complete ? 'bg-green-600' : started ? 'bg-yellow-600' : required ? 'bg-red-600' : 'bg-gray-600'
                  }`}
                >
                  {prize.place}
                </div>
                <h4 className="text-fg flex-1 font-medium">
                  {placeLabel(prize.place)} Place Prize {required && <span className="ml-1 text-red-500">*</span>}
                </h4>
                {complete && <div className="text-sm text-green-600">✓ Complete</div>}
                {started && !complete && <div className="text-sm text-yellow-600">⚠ Incomplete</div>}
              </div>

              <div className="grid gap-3">
                <div>
                  <label className="text-fg/80 mb-1 block text-xs font-medium">
                    Prize Description {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={prize.description || ''}
                    onChange={(e) => onPrizeChange(index, 'description', e.target.value)}
                    placeholder="e.g., Rare Dragon NFT, 500 USDC Tokens"
                    className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-fg/80 mb-1 block text-xs font-medium">
                    Contract Address {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={prize.tokenAddress || ''}
                    onChange={(e) => onPrizeChange(index, 'tokenAddress', e.target.value)}
                    placeholder="e.g., 0x1234...abcd or G1234...xyz"
                    className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-fg/80 mb-1 block text-xs font-medium">
                    Quantity/Token ID {required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={prize.value || ''}
                    onChange={(e) => onPrizeChange(index, 'value', parseFloat(e.target.value) || 0)}
                    placeholder="e.g., 1 (for NFTs) or 500 (for tokens)"
                    className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-fg/80 mb-1 block text-xs font-medium">Sponsor (Optional)</label>
                  <input
                    type="text"
                    value={prize.sponsor || ''}
                    onChange={(e) => onPrizeChange(index, 'sponsor', e.target.value)}
                    placeholder="e.g., CompanyXYZ"
                    className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                  />
                </div>

                {/* Clear button for optional prizes that are started */}
                {!required && started && (
                  <div className="border-border border-t pt-2">
                    <button
                      type="button"
                      onClick={() => onClearPrize(index)}
                      className="text-fg/60 text-xs transition-colors hover:text-red-600"
                    >
                      Clear this prize
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start space-x-2">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="mb-1 font-medium">Important Notes:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>1st place prize is required</strong> and must be complete</li>
              <li>• Other prizes (2nd–3rd) are optional but must be fully complete if started</li>
              <li>• Assets should be available and verifiable for escrow before launch</li>
              <li>• Use correct contract addresses for your blockchain</li>
              <li>• For NFTs, use Token ID; for fungible tokens, use quantity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

