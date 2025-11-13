/**
 * Pricing Utilities
 */

import type { FundraisingExtraDefinition } from '@/components/Quiz/constants/quizMetadata';

/**
 * Get suggested price range for a fundraising extra
 */
export function getSuggestedPriceRange(suggestedPrice: string, currency: string): string {
  const ranges = {
    'Low-Medium': { min: 1, max: 3 },
    Medium: { min: 3, max: 5 },
    High: { min: 5, max: 10 },
    Low: { min: 1, max: 2 },
    default: { min: 2, max: 5 },
  };
  const base = (ranges as Record<string, { min: number; max: number }>)[suggestedPrice] || ranges.default;
  const adjusted = { ...base };
  switch (currency) {
    case '£':
      adjusted.min = Math.max(1, Math.round(base.min * 0.85));
      adjusted.max = Math.round(base.max * 0.85);
      break;
    case '₹':
      adjusted.min = Math.round(base.min * 80);
      adjusted.max = Math.round(base.max * 80);
      break;
    case '¥':
      adjusted.min = Math.round(base.min * 150);
      adjusted.max = Math.round(base.max * 150);
      break;
    default:
      break;
  }
  return `${adjusted.min}-${adjusted.max} ${currency}`;
}

