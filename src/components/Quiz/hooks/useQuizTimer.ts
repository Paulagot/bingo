import { useEffect, useState, useRef, useCallback } from 'react';

interface UseQuizTimerParams {
  question: any;
  timerActive: boolean;
  onTimeUp: () => void;
}

export const useQuizTimer = ({ question, timerActive, onTimeUp }: UseQuizTimerParams) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Stable cleanup function
  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Main timer effect
  useEffect(() => {
    // Clear any existing timer first
    clearTimer();

    if (!question || !timerActive) {
      setTimeLeft(null);
      return;
    }

    // Function to calculate current time left based on server time
    const calculateTimeLeft = () => {
      const now = Date.now();
      const elapsed = (now - question.questionStartTime) / 1000;
      const remainingTime = Math.max(0, (question.timeLimit || 30) - elapsed);
      return Math.floor(remainingTime);
    };

    // Set initial time
    const initialTime = calculateTimeLeft();
    setTimeLeft(initialTime);

    // If time is already up, call onTimeUp immediately
    if (initialTime <= 0) {
      onTimeUp();
      return;
    }

    // Update timer every 100ms for smooth updates
    intervalRef.current = setInterval(() => {
      const currentTimeLeft = calculateTimeLeft();
      setTimeLeft(currentTimeLeft);

      // Check if time is up
      if (currentTimeLeft <= 0) {
        clearTimer();
        onTimeUp();
      }
    }, 100);

    // Return cleanup function
    return clearTimer;
  }, [question, timerActive, onTimeUp, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  return { timeLeft };
};
