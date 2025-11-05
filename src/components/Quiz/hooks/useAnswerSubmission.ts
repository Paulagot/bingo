// hooks/useAnswerSubmission.ts
import { useCallback } from 'react';

interface UseAnswerSubmissionParams {
  socket: any;
  roomId: string;
  playerId: string;
  getCurrentQuestionId: () => string | null;
  debug?: boolean;
  questionId?: string; // Deprecated, no longer used
}

export const useAnswerSubmission = ({ socket, roomId, playerId, getCurrentQuestionId, debug = false }: UseAnswerSubmissionParams) => {
const submitAnswer = useCallback((answer: string | null, opts?: { autoTimeout?: boolean, isFrozen?: boolean, currentQuestionIndex?: number, frozenForIndex?: number | null }) => {
  const questionId = getCurrentQuestionId();

    if (!questionId) {
    console.log('[SubmitAnswer] ❌ No question ID available - aborting submission');
    return false;
  }
  
  console.log('[SubmitAnswer] 🚀 Attempting to submit:', {
    questionId,
    answer,
    roomId,
    playerId,
    hasSocket: !!socket,
    opts
  });

  // Check if player is frozen for this specific question
  if (opts?.isFrozen && opts?.frozenForIndex === opts?.currentQuestionIndex) {
    console.log('[SubmitAnswer] ❄️ Player is frozen for this question - blocking submission');
    return false;
  }

  socket.emit('submit_answer', {
    roomId,
    playerId,
    questionId,
    answer,
    ts: Date.now(),
    ...(opts?.autoTimeout ? { autoTimeout: true } : {})
  });
  
  console.log('[SubmitAnswer] ✅ Socket event emitted');
  return true;
}, [socket, roomId, playerId, getCurrentQuestionId, debug]);

  return { submitAnswer };
};


