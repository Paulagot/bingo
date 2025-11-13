/**
 * Launch Status Character Component
 *
 * Displays an animated character with status message during the Web3 launch process.
 * The character's appearance (emoji, color, animation) changes based on the current
 * launch state or status expression.
 *
 * ## Visual States
 *
 * - **ready**: Green gradient, rocket emoji, no animation
 * - **warning**: Yellow/orange gradient, warning emoji, pulse animation
 * - **generating**: Cyan/blue gradient, ID emoji, pulse animation
 * - **deploying**: Purple/pink gradient, lightning emoji, bounce animation
 * - **creating**: Indigo/purple gradient, refresh emoji, spin animation
 * - **success**: Green gradient, celebration emoji, bounce animation
 * - **error**: Red/pink gradient, error emoji, pulse animation
 * - **wallet**: Indigo gradient, wallet emoji, no animation
 *
 * ## Usage
 *
 * ```typescript
 * <LaunchStatusCharacter
 *   expression="deploying"
 *   message="Deploying quiz contract on Solana…"
 * />
 * ```
 *
 * Used by StepWeb3ReviewLaunch component to display launch status.
 */

import { FC, useMemo } from 'react';
import type { LaunchMessage } from '../types';

/**
 * Component Props
 */
export interface LaunchStatusCharacterProps {
  /** Status expression type */
  expression: LaunchMessage['expression'];
  /** Status message text */
  message: string;
}

/**
 * Launch Status Character
 *
 * Animated character component that displays launch status with appropriate
 * visual styling and animations.
 *
 * @param props - Component props
 * @returns Character component
 */
export const LaunchStatusCharacter: FC<LaunchStatusCharacterProps> = ({
  expression,
  message,
}) => {
  // Determine styling based on expression
  const { style, emoji } = useMemo(() => {
    const base = 'w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300';

    const styles: Record<LaunchMessage['expression'], { style: string; emoji: string }> = {
      ready: {
        style: `${base} bg-gradient-to-br from-green-400 to-emerald-500`,
        emoji: '🚀',
      },
      warning: {
        style: `${base} bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse`,
        emoji: '⚠️',
      },
      generating: {
        style: `${base} bg-gradient-to-br from-cyan-400 to-blue-500 animate-pulse`,
        emoji: '🆔',
      },
      deploying: {
        style: `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-bounce`,
        emoji: '⚡',
      },
      creating: {
        style: `${base} bg-gradient-to-br from-indigo-400 to-purple-500 animate-spin`,
        emoji: '🔄',
      },
      success: {
        style: `${base} bg-gradient-to-br from-green-400 to-emerald-500 animate-bounce`,
        emoji: '🎉',
      },
      error: {
        style: `${base} bg-gradient-to-br from-red-400 to-pink-500 animate-pulse`,
        emoji: '❌',
      },
      wallet: {
        style: `${base} bg-gradient-to-br from-indigo-400 to-purple-500`,
        emoji: '💳',
      },
    };

    return styles[expression] || styles.ready;
  }, [expression]);

  return (
    <div className="mb-6 flex items-start space-x-3 md:space-x-4">
      <div className={style}>{emoji}</div>
      <div className="bg-muted border-border relative max-w-sm flex-1 rounded-2xl border-2 p-3 shadow-lg md:max-w-lg md:p-4">
        {/* Speech bubble tail */}
        <div className="absolute left-0 top-6 h-0 w-0 -translate-x-2 transform border-b-8 border-r-8 border-t-8 border-b-transparent border-r-white border-t-transparent"></div>
        <div className="absolute left-0 top-6 h-0 w-0 -translate-x-1 transform border-b-8 border-r-8 border-t-8 border-b-transparent border-r-gray-200 border-t-transparent"></div>
        <p className="text-fg/80 text-sm md:text-base">{message}</p>
      </div>
    </div>
  );
};

