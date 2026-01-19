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

// useHostRecovery.ts
export function useHostRecovery({ socket, connected, roomId, setters }: UseHostRecoveryArgs) {
  const hasJoinedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const socketIdRef = useRef<string>('');

  const settersRef = useRef(setters);
  useEffect(() => {
    settersRef.current = setters;
  }, [setters]);

  useEffect(() => {
    if (!socket || !connected || !roomId) {
      hasJoinedRef.current = false;
      socketIdRef.current = '';
      return;
    }

    if (hasJoinedRef.current && socketIdRef.current === socket.id) return;

    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    reconnectTimeoutRef.current = setTimeout(() => {
      hasJoinedRef.current = true;
      socketIdRef.current = socket.id;

      socket.emit(
        'join_and_recover',
        { roomId, user: { id: 'host', name: 'Host' }, role: 'host' },
        async (res: any) => {
          if (!res?.ok) {
            hasJoinedRef.current = false;
            socketIdRef.current = '';
            return;
          }

          const { snap } = res;
          const S = settersRef.current;

          // ✅ hydrate config
          if (snap?.config) {
            const { setFullConfig } = (await import('./useQuizConfig')).useQuizConfig.getState();
            setFullConfig({ ...snap.config, roomId });
          }

          hydrateRoomBasicsFromSnap(snap, {
            setRoomState: S.setRoomState,
            setPlayersInRoom: S.setPlayersInRoom,
          });

          hydrateQuestionOrReviewFromSnap(snap, {
            setCurrentQuestion: S.setCurrentQuestion,
            setReviewQuestion: S.setReviewQuestion,
            setIsShowingRoundResults: S.setIsShowingRoundResults,
            setRoundLeaderboard: S.setRoundLeaderboard,
            setLeaderboard: S.setLeaderboard,
            setReviewComplete: S.setReviewComplete,
            setQuestionInRound: S.setQuestionInRound,
            setTotalInRound: S.setTotalInRound,
          });

          hydrateHiddenObjectFromSnap(snap, {
            setHiddenPuzzle: S.setHiddenPuzzle,
            setHiddenFoundIds: S.setHiddenFoundIds,
            setHiddenFinished: S.setHiddenFinished,
            setRoundRemaining: S.setRoundRemaining,
          });

          hydrateOrderImageFromSnap(snap, {
            setOrderImageQuestion: S.setOrderImageQuestion,
            setOrderImageReviewQuestion: S.setOrderImageReviewQuestion,
          });

          hydrateFinalStatsFromSnap(snap, { recoverFinalStats: S.recoverFinalStats });
          hydrateCurrentRoundStatsFromSnap(snap, { updateCurrentRoundStats: S.updateCurrentRoundStats });

          hydrateTiebreakerFromSnap(snap, {
            setRoomState: S.setRoomState,
            setTbParticipants: S.setTbParticipants,
            setTbQuestion: S.setTbQuestion,
            setTbWinners: S.setTbWinners,
            setTbPlayerAnswers: S.setTbPlayerAnswers,
            setTbCorrectAnswer: S.setTbCorrectAnswer,
            setTbShowReview: S.setTbShowReview,
            setTbQuestionNumber: S.setTbQuestionNumber,
            setTbStillTied: S.setTbStillTied,
          });
        }
      );
    }, 100);

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [socket?.id, connected, roomId]); // ✅ setters removed
}
