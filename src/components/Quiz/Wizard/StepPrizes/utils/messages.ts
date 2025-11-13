/**
 * Message Generation Utilities
 */

import type { Prize } from '@/components/Quiz/types/quiz';

export interface StatusMessage {
  message: string;
  positive: boolean;
}

/**
 * Get current status message based on prizes
 */
export function getCurrentMessage(prizes: Prize[], currency: string): StatusMessage {
  const hasFirstPlace = prizes.some((p) => p.place === 1 && p.description?.trim());
  const totalValue = prizes.reduce((acc, p) => acc + (p.value || 0), 0);

  if (prizes.length === 0) {
    return { message: "Let's set up prizes. Add physical items or vouchers for winners.", positive: false };
  }
  if (!hasFirstPlace) {
    return { message: 'Great start! Make sure you add a 1st place prize.', positive: false };
  }
  return {
    message: `Nice! ${prizes.length} prize${prizes.length === 1 ? '' : 's'} worth ${currency}${totalValue.toFixed(
      2
    )}. You can add more or continue.`,
    positive: true,
  };
}

