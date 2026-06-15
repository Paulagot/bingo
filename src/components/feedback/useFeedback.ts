// components/feedback/useFeedback.ts
//
// State machine for the feedback flow:
//   answering → submitting → done | error
//
// Usage:
//   const feedback = useFeedback({ roomId, gameType });
//   feedback.setAnswer('enjoyed_game', true);
//   feedback.submit();

import { useState, useCallback } from 'react';
import { feedbackService, type FeedbackAnswers } from './FeedbackService';

type FeedbackState = 'answering' | 'submitting' | 'done' | 'error';

interface UseFeedbackOptions {
  roomId: string;
  gameType?: string;
   clubId?:   number;
}

interface UseFeedbackReturn {
  state:        FeedbackState;
  answers:      FeedbackAnswers;
  setAnswer:    (key: keyof FeedbackAnswers, value: boolean) => void;
  submit:       () => Promise<void>;
  isDone:       boolean;
  hasAnyAnswer: boolean;
  errorMessage: string | null;
}

export function useFeedback({ roomId, gameType }: UseFeedbackOptions): UseFeedbackReturn {
  const [state, setState]           = useState<FeedbackState>('answering');
  const [answers, setAnswers]       = useState<FeedbackAnswers>({
    enjoyed_game: null,
    play_again:   null,
    recommend:    null,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setAnswer = useCallback((key: keyof FeedbackAnswers, value: boolean) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const hasAnyAnswer =
    answers.enjoyed_game !== null ||
    answers.play_again   !== null ||
    answers.recommend    !== null;

  const submit = useCallback(async () => {
    if (!hasAnyAnswer) return;

    setState('submitting');
    setErrorMessage(null);

    try {
      const result = await feedbackService.submitFeedback({
        room_id:  roomId,
        game_type: gameType,
        ...answers,
      });

      if (result.ok) {
        setState('done');
      } else {
        setErrorMessage(result.error ?? 'Something went wrong');
        setState('error');
      }
    } catch (err) {
      console.error('[useFeedback] submit error:', err);
      setErrorMessage('Could not submit feedback. Please try again.');
      setState('error');
    }
  }, [roomId, gameType, answers, hasAnyAnswer]);

  return {
    state,
    answers,
    setAnswer,
    submit,
    isDone:       state === 'done',
    hasAnyAnswer,
    errorMessage,
  };
}