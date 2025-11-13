/**
 * Prize Calculation Utilities
 */

import type { PrizeSource } from '../types';
import type { Prize } from '@/components/Quiz/types/quiz';

/**
 * Calculate maximum prize pool percentage
 */
export function calculateMaxPrizePool(personalTake: number): number {
  return Math.max(0, 40 - (personalTake || 0));
}

/**
 * Calculate charity percentage
 */
export function calculateCharityPct(
  personalTake: number,
  prizePoolPct: number,
  prizeSource: PrizeSource
): number {
  return (
    40 +
    Math.max(
      0,
      40 - (personalTake || 0) - (prizeSource === 'pool' ? prizePoolPct || 0 : 0)
    )
  );
}

/**
 * Calculate total prize split
 */
export function calculateTotalPrizeSplit(splits: Record<number, number>): number {
  return [1, 2, 3].reduce(
    (acc, p) => acc + (Number.isFinite(splits[p]) ? (splits[p] as number) : 0),
    0
  );
}

/**
 * Check if a prize has been started (has any field filled)
 */
export function isPrizeStarted(prize: Prize): boolean {
  return !!(prize.description?.trim() || prize.tokenAddress?.trim() || (prize.value && prize.value > 0));
}

/**
 * Check if a prize is complete (all required fields filled)
 */
export function isPrizeComplete(prize: Prize): boolean {
  return !!(prize.description?.trim() && prize.tokenAddress?.trim() && prize.value && prize.value > 0);
}

/**
 * Get count of completed prizes
 */
export function getCompletedPrizesCount(prizes: Prize[]): number {
  return prizes.filter(isPrizeComplete).length;
}

