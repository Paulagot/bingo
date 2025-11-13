/**
 * Message Generation Utilities
 */

import type { ChainChoice } from '../types';

/**
 * Get current status message based on configuration completeness
 */
export function getCurrentMessage(
  allSectionsComplete: boolean,
  hostComplete: boolean,
  selectedInfo: ChainChoice | undefined
): string {
  const network = selectedInfo?.label || 'your network';
  if (allSectionsComplete)
    return `🎉 Perfect! Your Web3 quiz is configured—host set, ${network} selected, token chosen, and entry fee set.`;
  if (!hostComplete) return "Hi there! Let's set up your quiz together. Start with your host display name.";
  return `Great! Now configure your Web3 payments on ${network}: choose token, charity, and the crypto entry fee.`;
}

