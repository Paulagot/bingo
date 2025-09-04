// hooks/useAnswerSubmission.ts
import { useCallback } from 'react';

interface UseAnswerSubmissionParams {
  socket: any;
  roomId: string;
  playerId: string;
  getCurrentQuestionId: () => string | null;
  debug?: boolean;
}

export const useAnswerSubmission = ({ socket, roomId, playerId, getCurrentQuestionId, debug = false }: UseAnswerSubmissionParams) => {
  const submitAnswer = useCallback((answer: string | null, opts?: { autoTimeout?: boolean }) => {
    const questionId = getCurrentQuestionId();
    if (!socket || !roomId || !playerId || !questionId) return false;
    socket.emit('submit_answer', {
      roomId,
      playerId,
      questionId,
      answer,                      // string | null
      ts: Date.now(),
      ...(opts?.autoTimeout ? { autoTimeout: true } : {})
    });
    return true;
  }, [socket, roomId, playerId, getCurrentQuestionId, debug]);

  return { submitAnswer };
};


