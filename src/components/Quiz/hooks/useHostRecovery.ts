// src/components/Quiz/hooks/useHostRecovery.ts
import { useEffect } from 'react';
import {
  hydrateRoomBasicsFromSnap,
  hydrateQuestionOrReviewFromSnap,
  hydrateTiebreakerFromSnap,
} from '../utils/recoveryHydrators';

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

    // TB setters
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
  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    socket.emit(
      'join_and_recover',
      {
        roomId,
        user: { id: 'host', name: 'Host' },
        role: 'host',
      },
      (res: any) => {
        if (!res?.ok) {
          console.error('[useHostRecovery] join_and_recover failed:', res?.error);
          return;
        }
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
  }, [socket, connected, roomId]);
}
