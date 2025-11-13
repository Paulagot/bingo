/**
 * Shared Character Component
 *
 * A reusable character component with speech bubble used across wizard steps.
 * Supports multiple color schemes based on message content or explicit tone.
 *
 * ## Usage
 *
 * ```typescript
 * <Character message="Perfect! Your quiz is ready." />
 * <Character message="Warning message" tone="warning" />
 * <Character message="Success!" positive />
 * ```
 */

import { FC, useMemo } from 'react';

/**
 * Character Component Props
 */
export interface CharacterProps {
  /** Message text to display */
  message: string;
  /** Optional explicit tone (overrides message-based detection) */
  tone?: 'ready' | 'warning' | 'positive' | 'negative';
  /** Optional positive flag (alternative to tone) */
  positive?: boolean;
}

/**
 * Get bubble color based on message content or explicit tone
 */
function getBubbleColor(message: string, tone?: CharacterProps['tone'], positive?: boolean): string {
  // Explicit tone takes precedence
  if (tone === 'ready' || positive === true) return 'bg-green-50 border-green-200';
  if (tone === 'warning') return 'bg-yellow-50 border-yellow-200';
  if (tone === 'positive') return 'bg-green-50 border-green-200';
  if (tone === 'negative') return 'bg-red-50 border-red-200';

  // Message-based detection (comprehensive pattern matching)
  if (message.includes('Perfect!') || message.includes('🎉') || message.includes('configured!')) {
    return 'bg-green-50 border-green-200';
  }
  if (message.includes('Excellent!') || message.includes('choice!') || message.includes('Great!')) {
    return 'bg-blue-50 border-blue-200';
  }
  if (message.includes('ready') || message.includes('configured') || message.includes('allocate') || message.includes('prizes')) {
    return 'bg-indigo-50 border-indigo-200';
  }
  if (message.includes('enabled')) {
    return 'bg-green-50 border-green-200';
  }
  if (message.includes('template') || message.includes('Great choice')) {
    return 'bg-blue-50 border-blue-200';
  }
  if (message.includes('build') || message.includes('custom')) {
    return 'bg-orange-50 border-orange-200';
  }
  if (message.includes('Keep going!')) {
    return 'bg-yellow-50 border-yellow-200';
  }

  // Default
  return 'bg-gray-50 border-border';
}

/**
 * Character Component
 *
 * Displays a character avatar with a speech bubble containing a message.
 * Automatically determines bubble color based on message content or uses explicit tone.
 *
 * @param props - Component props
 * @returns Character component
 */
export const Character: FC<CharacterProps> = ({ message, tone, positive }) => {
  const bubbleColor = useMemo(
    () => getBubbleColor(message, tone, positive),
    [message, tone, positive]
  );

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-300 bg-gray-200 sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${bubbleColor}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

export default Character;

