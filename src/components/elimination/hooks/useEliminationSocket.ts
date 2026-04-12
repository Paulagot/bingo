import { useEffect, useRef } from 'react';
import { getSocket } from '../services/eliminationSocket';
import type {

  RoundIntroPayload,
  RoundStartedPayload,
  RoundRevealPayload,
  RoundResultsPayload,
  EliminatedPayload,
  WinnerPayload,
} from '../types/elimination';

interface UseEliminationSocketOptions {
  onRoomState: (snapshot: any) => void;
  onWaitingRoomUpdate: (data: { players: any[] }) => void;
  onGameStarted: (data: { totalRounds: number; players: any[] }) => void;
  onRoundIntro: (data: RoundIntroPayload) => void;
  onRoundStarted: (data: RoundStartedPayload) => void;
  onRoundReveal: (data: RoundRevealPayload) => void;
  onSubmissionReceived: (data: { roundId: string; playerId: string }) => void;
  onRoundResults: (data: RoundResultsPayload) => void;
  onPlayersEliminated: (data: EliminatedPayload) => void;
  onNextRound: (data: { nextRoundNumber: number; transitionDelayMs: number }) => void;
  onWinnerDeclared: (data: WinnerPayload) => void;
  onRoomEnded: () => void;
  onRoomCancelled: () => void;  // ← add this
  onError: (data: { message: string }) => void;
}

export const useEliminationSocket = (options: UseEliminationSocketOptions) => {
  // Keep a ref to the latest options so socket listeners always call current callbacks
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  useEffect(() => {
    const socket = getSocket();

    // Stable wrappers that always delegate to the latest callback via ref
    const handlers = {
      onRoomState:           (d: any)                  => optionsRef.current.onRoomState(d),
      onWaitingRoomUpdate:   (d: { players: any[] })   => optionsRef.current.onWaitingRoomUpdate(d),
      onGameStarted:         (d: any)                  => optionsRef.current.onGameStarted(d),
      onRoundIntro:          (d: RoundIntroPayload)     => optionsRef.current.onRoundIntro(d),
      onRoundStarted:        (d: RoundStartedPayload)   => optionsRef.current.onRoundStarted(d),
      onRoundReveal:         (d: RoundRevealPayload)    => optionsRef.current.onRoundReveal(d),
      onSubmissionReceived:  (d: any)                  => optionsRef.current.onSubmissionReceived(d),
      onRoundResults:        (d: RoundResultsPayload)   => optionsRef.current.onRoundResults(d),
      onPlayersEliminated:   (d: EliminatedPayload)     => optionsRef.current.onPlayersEliminated(d),
      onNextRound:           (d: any)                  => optionsRef.current.onNextRound(d),
      onWinnerDeclared:      (d: WinnerPayload)         => optionsRef.current.onWinnerDeclared(d),
      onRoomEnded:           ()                        => optionsRef.current.onRoomEnded(),
      onError:               (d: { message: string })  => optionsRef.current.onError(d),
      onRoomCancelled:       ()                        => optionsRef.current.onRoomCancelled?.(),
    };

    socket.on('elimination_room_state',          handlers.onRoomState);
    socket.on('elimination_waiting_room_update', handlers.onWaitingRoomUpdate);
    socket.on('elimination_game_started',        handlers.onGameStarted);
    socket.on('elimination_round_intro',         handlers.onRoundIntro);
    socket.on('elimination_round_started',       handlers.onRoundStarted);
    socket.on('elimination_round_reveal',         handlers.onRoundReveal);
    socket.on('elimination_submission_received', handlers.onSubmissionReceived);
    socket.on('elimination_round_results',       handlers.onRoundResults);
    socket.on('elimination_players_eliminated',  handlers.onPlayersEliminated);
    socket.on('elimination_next_round',          handlers.onNextRound);
    socket.on('elimination_winner_declared',     handlers.onWinnerDeclared);
    socket.on('elimination_room_ended',          handlers.onRoomEnded);
    socket.on('elimination_error',               handlers.onError);
    socket.on('elimination_room_cancelled', handlers.onRoomCancelled);

    return () => {
      socket.off('elimination_room_state',          handlers.onRoomState);
      socket.off('elimination_waiting_room_update', handlers.onWaitingRoomUpdate);
      socket.off('elimination_game_started',        handlers.onGameStarted);
      socket.off('elimination_round_intro',         handlers.onRoundIntro);
      socket.off('elimination_round_started',       handlers.onRoundStarted);
      socket.off('elimination_round_reveal',         handlers.onRoundReveal);
      socket.off('elimination_submission_received', handlers.onSubmissionReceived);
      socket.off('elimination_round_results',       handlers.onRoundResults);
      socket.off('elimination_players_eliminated',  handlers.onPlayersEliminated);
      socket.off('elimination_next_round',          handlers.onNextRound);
      socket.off('elimination_winner_declared',     handlers.onWinnerDeclared);
      socket.off('elimination_room_ended',          handlers.onRoomEnded);
      socket.off('elimination_error',               handlers.onError);
      socket.off('elimination_room_cancelled', handlers.onRoomCancelled);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
};