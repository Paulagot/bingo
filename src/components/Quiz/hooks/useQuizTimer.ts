import { useEffect, useState } from 'react';

interface UseQuizTimerParams {
  question: any;
  timerActive: boolean;
  onTimeUp: () => void;
}

export const useQuizTimer = ({ question, timerActive, onTimeUp }: UseQuizTimerParams) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!question || !timerActive) return;
    
    const now = Date.now();
    const elapsed = (now - question.questionStartTime) / 1000;
    const remainingTime = Math.max(0, (question.timeLimit || 30) - elapsed);
    setTimeLeft(remainingTime);
  }, [question, timerActive]);

  useEffect(() => {
    if (!timerActive || timeLeft === null) return;
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(prev => (prev ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, timerActive, onTimeUp]);

  return { timeLeft };
};
