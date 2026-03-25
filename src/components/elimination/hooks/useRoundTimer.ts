import { useState, useEffect, useRef } from 'react';

interface TimerState {
  msRemaining: number;
  secondsRemaining: number;
  progress: number; // 0 = full time, 1 = expired
  isExpired: boolean;
}

/**
 * Countdown timer for elimination rounds.
 * @param endsAt   - epoch ms when the round ends (from server)
 * @param active   - only ticks when true
 */
export const useRoundTimer = (endsAt: number | null, active: boolean): TimerState => {
  const [msRemaining, setMsRemaining] = useState<number>(0);
  const rafRef = useRef<number | null>(null);
  const totalDurationRef = useRef<number>(0);

  useEffect(() => {
    if (!endsAt || !active) {
      setMsRemaining(0);
      return;
    }

    const now = Date.now();
    const total = endsAt - now;
    totalDurationRef.current = Math.max(1, total);
    setMsRemaining(Math.max(0, total));

    const tick = () => {
      const remaining = endsAt - Date.now();
      setMsRemaining(Math.max(0, remaining));
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [endsAt, active]);

  const progress = totalDurationRef.current > 0
    ? 1 - msRemaining / totalDurationRef.current
    : 0;

  return {
    msRemaining,
    secondsRemaining: Math.ceil(msRemaining / 1000),
    progress: Math.min(1, Math.max(0, progress)),
    isExpired: msRemaining <= 0,
  };
};