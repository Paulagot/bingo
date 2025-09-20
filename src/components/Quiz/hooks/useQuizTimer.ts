import { useEffect, useState, useRef, useCallback } from 'react';

interface UseQuizTimerParams {
  question: any;
  timerActive: boolean;
  onTimeUp: () => void;
}

const debug = false;

/**
 * Upgraded, server-synced countdown with smooth fraction.
 * Supports:
 *  - question.endsAtMs (absolute server ms)  ✅ preferred
 *  - or question.serverNowMs + question.timeLimit (s)
 *  - or legacy question.questionStartTime + timeLimit (assumed server epoch ms)
 */
export const useQuizTimer = ({ question, timerActive, onTimeUp }: UseQuizTimerParams) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);     // whole seconds (ceil)
  const [fractionLeft, setFractionLeft] = useState<number>(1);       // 1..0 smooth
  const [msLeft, setMsLeft] = useState<number>(0);                   // raw ms remaining

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const driftRef = useRef<number>(0);           // serverNow - clientNow
  const endsAtRef = useRef<number | null>(null);
  const durationRef = useRef<number>(30000);    // ms

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearTimer();

    if (!question || !timerActive) {
      setTimeLeft(null);
      setFractionLeft(1);
      setMsLeft(0);
      return;
    }

    // 1) Figure out authoritative endsAt (ms) from server
    const timeLimitSec = question.timeLimit ?? question.totalTimeSeconds ?? 30;
    const serverNowMs: number | undefined = question.serverNowMs;
    const endsAtMs: number | undefined = question.endsAtMs;

    let computedEndsAt: number | null = null;

    if (typeof endsAtMs === 'number') {
      // Preferred: server provided absolute end time
      computedEndsAt = endsAtMs;
    } else if (typeof serverNowMs === 'number') {
      // Fallback: server now + timeLimit
      computedEndsAt = serverNowMs + timeLimitSec * 1000;
    } else if (typeof question.questionStartTime === 'number') {
      // Legacy path: assume startTime is server epoch ms
      computedEndsAt = question.questionStartTime + timeLimitSec * 1000;
    }

    if (!computedEndsAt) {
      // No timing info — behave gracefully
      setTimeLeft(null);
      setFractionLeft(1);
      setMsLeft(0);
      return;
    }

    endsAtRef.current = computedEndsAt;

    // 2) Duration for smooth fraction
    if (typeof serverNowMs === 'number') {
      durationRef.current = Math.max(1000, computedEndsAt - serverNowMs);
    } else {
      durationRef.current = Math.max(1000, timeLimitSec * 1000);
    }

    // 3) One-time drift calculation (serverNow - clientNow)
    const clientNow = Date.now();
    driftRef.current = typeof serverNowMs === 'number' ? (serverNowMs - clientNow) : 0;

    // Helper compute
    const compute = () => {
      const nowCorrected = Date.now() + driftRef.current;
      const left = Math.max(0, computedEndsAt! - nowCorrected); // ms
      const secs = Math.ceil(left / 1000);
      const frac = Math.min(1, Math.max(0, left / durationRef.current));
      return { left, secs, frac };
    };

    // Prime immediately (no flicker)
    const first = compute();
    setMsLeft(first.left);
    setTimeLeft(first.secs);
    setFractionLeft(first.frac);

    if (first.secs <= 0) {
      if (debug) console.log('[Timer] TIME UP immediately');
      onTimeUp();
      return;
    }

    // 4) Drive updates — 100ms gives a smooth ring and visible warnings
    intervalRef.current = setInterval(() => {
      const { left, secs, frac } = compute();

      setMsLeft(prev => (prev !== left ? left : prev));
      setFractionLeft(frac);
      // only set timeLeft when it changes to avoid re-renders
      setTimeLeft(prev => (prev !== secs ? secs : prev));

      if (secs <= 0) {
        if (debug) console.log('[Timer] TIME UP - calling onTimeUp', question.id);
        clearTimer();
        onTimeUp();
      }
    }, 100);

    return clearTimer;
  }, [question, timerActive, onTimeUp, clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return { timeLeft, fractionLeft, msLeft };
};

