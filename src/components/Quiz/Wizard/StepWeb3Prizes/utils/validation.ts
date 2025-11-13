/**
 * Validation Utilities
 */

import type { PrizeSource } from '../types';
import type { Prize } from '@/components/Quiz/types/quiz';
import { isPrizeStarted, isPrizeComplete, calculateTotalPrizeSplit } from './calculations';
import { placeLabel } from '../types';

/**
 * Validate personal take
 */
export function validatePersonalTake(personalTake: number): string | null {
  if (!Number.isFinite(personalTake) || personalTake < 0 || personalTake > 5) {
    return 'Personal take must be between 0% and 5%.';
  }
  return null;
}

/**
 * Validate prize pool configuration
 */
export function validatePrizePool(
  prizePoolPct: number,
  maxPrizePool: number,
  splits: Record<number, number>
): string | null {
  if (!Number.isFinite(prizePoolPct) || prizePoolPct < 0 || prizePoolPct > maxPrizePool) {
    return `Prize pool must be between 0% and ${maxPrizePool}%.`;
  }
  if (prizePoolPct === 0) {
    return 'Set a prize pool percentage (greater than 0) or switch to "External Assets".';
  }
  if (prizePoolPct > 0) {
    const totalSplit = calculateTotalPrizeSplit(splits);
    if (totalSplit > 100) {
      return 'Prize splits cannot total more than 100%.';
    }
    if (!splits[1] || splits[1] <= 0) {
      return '1st place split is required when using a prize pool.';
    }
  }
  return null;
}

/**
 * Validate external assets configuration
 */
export function validateExternalAssets(externalPrizes: Prize[]): string | null {
  // 1st place required + complete
  const firstPrize = externalPrizes.find((p) => p.place === 1);
  if (!firstPrize || !isPrizeComplete(firstPrize)) {
    return '1st place prize is required and must include description, contract address, and quantity.';
  }

  // Optional prizes: if started, must be complete
  const incompleteStarted = externalPrizes
    .filter((p) => p.place > 1)
    .filter((p) => isPrizeStarted(p) && !isPrizeComplete(p));

  if (incompleteStarted.length > 0) {
    const places = incompleteStarted.map((p) => placeLabel(p.place)).join(', ');
    return `Please complete all details for ${places} place prize(s), or clear them if not needed.`;
  }

  return null;
}

