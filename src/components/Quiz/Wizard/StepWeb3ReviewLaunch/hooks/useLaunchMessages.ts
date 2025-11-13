/**
 * Launch Messages Hook
 *
 * Custom hook that generates status messages for the Web3 launch process.
 * Provides user-friendly messages based on launch state, configuration completeness,
 * and wallet connection status.
 *
 * ## Message Types
 *
 * - **State Messages**: Based on current launch state (generating, deploying, etc.)
 * - **Configuration Messages**: Based on setup completeness (missing host, rounds, etc.)
 * - **Wallet Messages**: Based on wallet connection status
 * - **Ready Messages**: When everything is configured and ready to launch
 *
 * ## Usage
 *
 * ```typescript
 * const { getCurrentMessage } = useLaunchMessages({
 *   launchState,
 *   deploymentStep,
 *   configComplete,
 *   isWalletConnected,
 *   getNetworkDisplayName
 * });
 *
 * const message = getCurrentMessage();
 * // { expression: 'ready', message: 'All set! You're ready to deploy...' }
 * ```
 *
 * Used by StepWeb3ReviewLaunch component to display status messages.
 */

import { useMemo } from 'react';
import type { Web3LaunchState, LaunchMessage } from '../types';

/**
 * Hook Configuration
 */
export interface UseLaunchMessagesConfig {
  /** Current launch state */
  launchState: Web3LaunchState;
  /** Current deployment step message */
  deploymentStep: string;
  /** Whether configuration is complete */
  configComplete: boolean;
  /** Whether wallet is connected */
  isWalletConnected: boolean;
  /** Function to get network display name */
  getNetworkDisplayName: () => string;
}

/**
 * Launch Messages Hook
 *
 * Generates appropriate status messages based on launch state and configuration.
 *
 * @param config - Hook configuration
 * @returns Function to get current message
 */
export function useLaunchMessages(config: UseLaunchMessagesConfig) {
  const {
    launchState,
    deploymentStep,
    configComplete,
    isWalletConnected,
    getNetworkDisplayName,
  } = config;

  /**
   * Get Current Message
   *
   * Returns the appropriate status message based on current state.
   * Priority order:
   * 1. Launch state messages (generating, deploying, creating, success, error)
   * 2. Configuration completeness messages
   * 3. Wallet connection messages
   * 4. Ready message
   *
   * @returns Current status message
   */
  const getCurrentMessage = useMemo(
    () => (): LaunchMessage => {
      // State-based messages (highest priority)
      if (launchState === 'generating-ids') {
        return {
          expression: 'generating',
          message: 'Generating unique room and host IDs…',
        };
      }

      if (launchState === 'deploying-contract') {
        return {
          expression: 'deploying',
          message: deploymentStep || `Deploying quiz contract on ${getNetworkDisplayName()}…`,
        };
      }

      if (launchState === 'creating-room') {
        return {
          expression: 'creating',
          message: 'Creating your Web3 quiz room and finalizing…',
        };
      }

      if (launchState === 'success') {
        return {
          expression: 'success',
          message: '🎉 Deployed! Redirecting to your host dashboard…',
        };
      }

      if (launchState === 'error') {
        return {
          expression: 'error',
          message: `Web3 launch failed. Check wallet + network and try again.`,
        };
      }

      // Configuration messages
      if (!configComplete) {
        return {
          expression: 'warning',
          message:
            "Review your config. Ensure host, rounds, and Web3 payment settings are complete. After deployment, structure can't be changed.",
        };
      }

      // Wallet connection messages
      if (!isWalletConnected) {
        return {
          expression: 'wallet',
          message: `Connect your ${getNetworkDisplayName()} wallet to deploy.`,
        };
      }

      // Ready message
      return {
        expression: 'ready',
        message: `All set! You're ready to deploy on ${getNetworkDisplayName()}. Review everything below, then deploy.`,
      };
    },
    [launchState, deploymentStep, configComplete, isWalletConnected, getNetworkDisplayName]
  );

  return { getCurrentMessage };
}

