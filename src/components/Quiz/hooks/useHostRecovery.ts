// src/components/Quiz/hooks/useHostRecovery.ts
import { useEffect, useRef, useCallback } from 'react';
import {
  hydrateRoomBasicsFromSnap,
  hydrateQuestionOrReviewFromSnap,
  hydrateTiebreakerFromSnap,
  hydrateHiddenObjectFromSnap,
  hydrateFinalStatsFromSnap,
  hydrateCurrentRoundStatsFromSnap,
  hydrateOrderImageFromSnap,
} from '../../Quiz/utils/recoveryHydrators';

type UseHostRecoveryArgs = {
  socket: any;
  connected: boolean;
  roomId?: string;
  operatorToken?: string;
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

export function useHostRecovery({
  socket,
  connected,
  roomId,
  operatorToken,
  setters,
}: UseHostRecoveryArgs) {
  const hasJoinedRef = useRef(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryIntervalRef = useRef<NodeJS.Timeout>();
  const socketIdRef = useRef<string>('');
  const isOperator = !!operatorToken;

  const settersRef = useRef(setters);
  useEffect(() => {
    settersRef.current = setters;
  }, [setters]);

  // ── Shared hydration logic ─────────────────────────────────────────────────
  // Extracted so both the initial join and the operator retry loop can use it
  const applySnap = useCallback(async (snap: any) => {
    const S = settersRef.current;

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
  }, [roomId]);

  // ── Initial join (host and operator) ──────────────────────────────────────
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

      const joinPayload = isOperator
        ? { roomId, user: { id: 'operator', name: 'Operator' }, role: 'operator', token: operatorToken }
        : { roomId, user: { id: 'host', name: 'Host' }, role: 'host' };

      socket.emit('join_and_recover', joinPayload, async (res: any) => {
        if (!res?.ok) {
          hasJoinedRef.current = false;
          socketIdRef.current = '';
          // Operator retry loop (below) will handle room-not-found
          console.log('[HostRecovery] join_and_recover failed:', res?.error);
          return;
        }
        await applySnap(res.snap);
      });
    }, 100);

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [socket?.id, connected, roomId, operatorToken, applySnap]);

  // ── Operator-only retry loop ───────────────────────────────────────────────
  // The room may not be in server memory yet when the operator first opens the
  // link (organiser hasn't opened the host dashboard yet). Retry every 5 seconds
  // until the room appears or the component unmounts.
  useEffect(() => {
    if (!isOperator) return;
    if (!socket || !connected || !roomId) return;

    // Clear any existing retry interval
    if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);

    retryIntervalRef.current = setInterval(async () => {
      // Stop retrying once we've successfully joined
      if (hasJoinedRef.current) {
        clearInterval(retryIntervalRef.current);
        return;
      }

      console.log('[HostRecovery] Operator retry: attempting join_and_recover...');

      socket.emit(
        'join_and_recover',
        {
          roomId,
          user: { id: 'operator', name: 'Operator' },
          role: 'operator',
          token: operatorToken,
        },
        async (res: any) => {
          if (!res?.ok) {
            // Room not ready yet — interval will fire again in 5s
            console.log('[HostRecovery] Operator retry: room not ready yet:', res?.error);
            return;
          }

          // Success — stop retrying and apply the snapshot
          hasJoinedRef.current = true;
          socketIdRef.current = socket.id;
          clearInterval(retryIntervalRef.current);
          console.log('[HostRecovery] Operator retry: joined successfully');
          await applySnap(res.snap);
        }
      );
    }, 5000); // retry every 5 seconds

    return () => {
      if (retryIntervalRef.current) clearInterval(retryIntervalRef.current);
    };
  }, [isOperator, socket?.id, connected, roomId, operatorToken, applySnap]);
}
