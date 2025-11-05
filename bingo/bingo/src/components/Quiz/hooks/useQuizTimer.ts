// src/components/Quiz/hooks/useQuizTimer.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TQuestionLite = { id: string; timeLimit: number; questionStartTime: number };
type UseQuizTimerOpts = { question: TQuestionLite | null | undefined; timerActive: boolean; onTimeUp?: () => void };

export function useQuizTimer({ question, timerActive, onTimeUp }: UseQuizTimerOpts) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  const qKey = useMemo(() => {
    if (!question) return null;
    return `${question.id}:${Number(question.questionStartTime)}:${Number(question.timeLimit)}`;
  }, [question?.id, question?.questionStartTime, question?.timeLimit]);

  const clear = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    clear();

    if (!timerActive || !question) {
      setTimeLeft(null);
      return;
    }

    const startMs = Number(question.questionStartTime);
    const limitSec = Number(question.timeLimit);
    if (!isFinite(startMs) || !isFinite(limitSec) || limitSec <= 0) {
      setTimeLeft(null);
      return;
    }

    const now = Date.now();
    const elapsed = Math.floor((now - startMs) / 1000);
    setTimeLeft(Math.max(0, limitSec - elapsed));

    intervalRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clear();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clear;
    // 👇 only qKey & timerActive control re-init; do NOT include `question` itself
  }, [qKey, timerActive, clear]);

  const firedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!timerActive || timeLeft !== 0 || !qKey) return;
    if (firedRef.current !== qKey) {
      firedRef.current = qKey;
      onTimeUpRef.current?.();
    }
  }, [timeLeft, timerActive, qKey]);

  useEffect(() => clear, [clear]);

  return { timeLeft };
}



