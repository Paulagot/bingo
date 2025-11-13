/**
 * Socket Listeners Hook
 *
 * Custom hook that manages Socket.IO event listeners for the Web3 launch process.
 * Handles room creation success and error events, triggering navigation and state updates.
 *
 * ## Events Handled
 *
 * - `quiz_room_created`: Room successfully created on server
 * - `quiz_error`: Error occurred during room creation
 *
 * ## Responsibilities
 *
 * 1. **Success Handling**: Navigates to host dashboard on successful room creation
 * 2. **Error Handling**: Updates error state on room creation failure
 * 3. **Cleanup**: Removes event listeners on unmount
 * 4. **State Reset**: Clears localStorage and resets store on success
 *
 * ## Usage
 *
 * ```typescript
 * useSocketListeners({
 *   socket,
 *   connected,
 *   setLaunchState,
 *   setLaunchError,
 *   hardReset,
 *   navigate
 * });
 * ```
 *
 * Used by StepWeb3ReviewLaunch component to handle server-side events.
 */

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import type { NavigateFunction } from 'react-router-dom';
import type { Web3LaunchState } from '../types';

/**
 * Hook Configuration
 */
export interface UseSocketListenersConfig {
  /** Socket.IO socket instance */
  socket: Socket | null;
  /** Whether socket is connected */
  connected: boolean;
  /** Function to set launch state */
  setLaunchState: (state: Web3LaunchState) => void;
  /** Function to set launch error */
  setLaunchError: (error: string | null) => void;
  /** Function to hard reset store */
  hardReset: () => void;
  /** Navigation function */
  navigate: NavigateFunction;
}

/**
 * Socket Listeners Hook
 *
 * Sets up Socket.IO event listeners for room creation events.
 * Automatically cleans up listeners on unmount.
 *
 * @param config - Hook configuration
 */
export function useSocketListeners(config: UseSocketListenersConfig): void {
  const { socket, connected, setLaunchState, setLaunchError, hardReset, navigate } = config;

  useEffect(() => {
    if (!connected || !socket) return;

    /**
     * Handle Room Created
     *
     * Called when server successfully creates the quiz room.
     * Cleans up localStorage, resets store, and navigates to dashboard.
     */
    const handleCreated = ({ roomId }: { roomId: string }) => {
      console.log('[useSocketListeners] Room created:', roomId);
      setLaunchState('success');
      
      // Clean up localStorage
      try {
        localStorage.removeItem('current-room-id');
        localStorage.removeItem('current-host-id');
        localStorage.removeItem('current-contract-address');
      } catch (error) {
        console.warn('[useSocketListeners] Failed to cleanup localStorage:', error);
      }
      
      // Reset store and navigate
      hardReset();
      setTimeout(() => {
        navigate(`/quiz/host-dashboard/${roomId}`);
      }, 600);
    };

    /**
     * Handle Error
     *
     * Called when server encounters an error during room creation.
     * Updates error state for user feedback.
     */
    const handleError = ({ message }: { message: string }) => {
      console.error('[useSocketListeners] Socket error:', message);
      setLaunchError(message);
      setLaunchState('error');
    };

    // Register listeners
    socket.on('quiz_room_created', handleCreated);
    socket.on('quiz_error', handleError);

    // Cleanup on unmount
    return () => {
      socket.off('quiz_room_created', handleCreated);
      socket.off('quiz_error', handleError);
    };
  }, [connected, socket, setLaunchState, setLaunchError, hardReset, navigate]);
}

