// hooks/useAnswerSubmission.ts
import { useCallback } from 'react';

interface UseAnswerSubmissionParams {
  socket: any;
  roomId: string;
  playerId: string;
  debug?: boolean;
}

export const useAnswerSubmission = ({ socket, roomId, playerId, debug = false }: UseAnswerSubmissionParams) => {
  const submitAnswer = useCallback((answer: string) => {
    if (!answer || !socket || !roomId || !playerId) return false;
    
    if (debug) console.log('[useAnswerSubmission] 📤 Submitting answer as', playerId, '→', answer);
    
    socket.emit('submit_answer', {
      roomId,
      playerId,
      answer
    });
    
    return true;
  }, [socket, roomId, playerId, debug]);

  return { submitAnswer };
};

