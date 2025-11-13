/**
 * Message Generation Utilities
 */

import type { PrizeSource } from '../types';
import type { Prize } from '@/components/Quiz/types/quiz';
import { getCompletedPrizesCount, isPrizeComplete } from './calculations';

/**
 * Get current status message based on prize configuration
 */
export function getCurrentMessage(
  prizeSource: PrizeSource,
  personalTake: number,
  prizePoolPct: number,
  charityPct: number,
  maxPrizePool: number,
  externalPrizes: Prize[]
): string {
  if (prizeSource === 'assets') {
    const completed = getCompletedPrizesCount(externalPrizes);
    if (completed === 0) {
      return "You'll provide your own assets as prizes. Set up the 1st place prize (required). Optional prizes must be fully completed if started.";
    }
    return `Great! You have ${completed} prize${completed > 1 ? 's' : ''} configured. ${
      personalTake > 0 ? `You're taking ${personalTake}% personally, and` : 'The remaining'
    } ${charityPct}% goes to charity.`;
  }

  if (!prizePoolPct || prizePoolPct === 0) {
    return `You're taking ${personalTake}% personally, and ${charityPct}% goes directly to charity. You can allocate up to ${maxPrizePool}% for prizes if you want.`;
  }

  if (prizePoolPct === maxPrizePool) {
    return `🎉 Perfect! Full allocation in use — ${personalTake}% personal, ${prizePoolPct}% prizes, ${charityPct}% to charity.`;
  }

  return `You're allocating ${prizePoolPct}% to prizes and ${charityPct}% to charity. You could allocate up to ${
    maxPrizePool - prizePoolPct
  }% more to prizes.`;
}

