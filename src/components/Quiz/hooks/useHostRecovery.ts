// src/components/Quiz/hooks/useHostRecovery.ts
import { useEffect, useRef } from 'react';
import {
  hydrateRoomBasicsFromSnap,
  hydrateQuestionOrReviewFromSnap,
  hydrateTiebreakerFromSnap,
  hydrateHiddenObjectFromSnap,
  hydrateFinalStatsFromSnap, 
  hydrateCurrentRoundStatsFromSnap, 
  hydrateOrderImageFromSnap
} from '../../Quiz/utils/recoveryHydrators';

type UseHostRecoveryArgs = {
  socket: any;
  connected: boolean;
  roomId?: string;
  setters: {
    setRoomState: (s: any) => void;
    setPlayersInRoom: (p: { id: string; name: string }[]) => void;

    setCurrentQuestion: (q: any) => void;
    setReviewQuestion: (r: any) => void;
    setIsShowingRoundResults: (b: boolean) => void;
    setRoundLeaderboard: (rows: any[]) => void;
    setLeaderboard: (rows: any[]) => void;
    setReviewComplete: (b: boolean) => void;
    setQuestionInRound: (n: number) => void;
    setTotalInRound: (n: number) => void;

    setHiddenPuzzle: (puzzle: any) => void;
    setHiddenFoundIds: (ids: string[]) => void;
    setHiddenFinished: (finished: boolean) => void;
    setRoundRemaining: (seconds: number | null) => void;

    setOrderImageQuestion: (q: any) => void;
    setOrderImageReviewQuestion: (r: any) => void;

    recoverFinalStats: (stats: any[]) => void;
    updateCurrentRoundStats: (stats: any) => void;

    setTbParticipants: (ids: string[]) => void;
    setTbQuestion: (q: any) => void;
    setTbWinners: (ids: string[] | null) => void;
    setTbPlayerAnswers: (m: Record<string, number>) => void;
    setTbCorrectAnswer: (n?: number) => void;
    setTbShowReview: (b: boolean) => void;
    setTbQuestionNumber: (n: number) => void;
    setTbStillTied: (ids: string[]) => void;
  };
};

export function useHostRecovery({ socket, connected, roomId, setters }: UseHostRecoveryArgs) {
  const hasJoinedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const socketIdRef = useRef<string>('');

  

  useEffect(() => {
    console.log('[useHostRecovery] 🔍 Effect triggered:', {
      hasSocket: !!socket,
      socketId: socket?.id,
      connected,
      roomId,
      hasJoined: hasJoinedRef.current,
      trackedSocketId: socketIdRef.current
    });

    if (!socket || !connected || !roomId) {
      console.log('[useHostRecovery] ⏸️ Not ready yet, resetting state');
      hasJoinedRef.current = false;
      socketIdRef.current = '';
      return;
    }

    // ✅ Check if this is the SAME socket we already joined with
    if (hasJoinedRef.current && socketIdRef.current === socket.id) {
      console.log('[useHostRecovery] ✅ Already joined with this socket, skipping');
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('[useHostRecovery] 🔗 Attempting to join room:', roomId, 'with socket:', socket.id);
      hasJoinedRef.current = true;
      socketIdRef.current = socket.id;

      socket.emit(
        'join_and_recover',
        {
          roomId,
          user: { id: 'host', name: 'Host' },
          role: 'host',
        },
        (res: any) => {
          console.log('[useHostRecovery] 📨 Received response from join_and_recover:', res);
          
          if (!res?.ok) {
            console.error('[useHostRecovery] ❌ join_and_recover failed:', res?.error);
            hasJoinedRef.current = false;
            socketIdRef.current = '';
            return;
          }
          
          console.log('[useHostRecovery] ✅ Successfully joined and recovered');
          const { snap } = res;

          hydrateRoomBasicsFromSnap(snap, {
            setRoomState: setters.setRoomState,
            setPlayersInRoom: setters.setPlayersInRoom,
          });

          hydrateQuestionOrReviewFromSnap(snap, {
            setCurrentQuestion: setters.setCurrentQuestion,
            setReviewQuestion: setters.setReviewQuestion,
            setIsShowingRoundResults: setters.setIsShowingRoundResults,
            setRoundLeaderboard: setters.setRoundLeaderboard,
            setLeaderboard: setters.setLeaderboard,
            setReviewComplete: setters.setReviewComplete,
            setQuestionInRound: setters.setQuestionInRound,
            setTotalInRound: setters.setTotalInRound,
          });

          hydrateHiddenObjectFromSnap(snap, {
            setHiddenPuzzle: setters.setHiddenPuzzle,
            setHiddenFoundIds: setters.setHiddenFoundIds,
            setHiddenFinished: setters.setHiddenFinished,
            setRoundRemaining: setters.setRoundRemaining,
          });

          hydrateOrderImageFromSnap(snap, {
            setOrderImageQuestion: setters.setOrderImageQuestion,
            setOrderImageReviewQuestion: setters.setOrderImageReviewQuestion,
          });

          hydrateFinalStatsFromSnap(snap, {
            recoverFinalStats: setters.recoverFinalStats,
          });

          hydrateCurrentRoundStatsFromSnap(snap, {
            updateCurrentRoundStats: setters.updateCurrentRoundStats,
          });

          hydrateTiebreakerFromSnap(snap, {
            setRoomState: setters.setRoomState,
            setTbParticipants: setters.setTbParticipants,
            setTbQuestion: setters.setTbQuestion,
            setTbWinners: setters.setTbWinners,
            setTbPlayerAnswers: setters.setTbPlayerAnswers,
            setTbCorrectAnswer: setters.setTbCorrectAnswer,
            setTbShowReview: setters.setTbShowReview,
            setTbQuestionNumber: setters.setTbQuestionNumber,
            setTbStillTied: setters.setTbStillTied,
          });
        }
      );
    }, 100); // ✅ Small delay to ensure socket is stable

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [socket?.id, connected, roomId, setters]);
}
