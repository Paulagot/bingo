import { useReducer, useCallback } from 'react';
import type {
  EliminationGameState,
  EliminationRoom,
  EliminationPlayer,
  ActiveRound,
  RoundResult,
  GameView,
  RoundIntroPayload,
  RoundStartedPayload,
  WinnerPayload,
} from '../types/elimination';

// ─── State ────────────────────────────────────────────────────────────────────
const initialState: EliminationGameState = {
  room: null,
  localPlayer: null,
  activeRound: null,
  lastResults: null,
  eliminatedThisRound: [],
  winner: null,
  view: 'lobby',
  error: null,
};

// ─── Actions ──────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SET_ROOM'; room: EliminationRoom; localPlayerId?: string }
  | { type: 'UPDATE_PLAYERS'; players: EliminationPlayer[] }
  | { type: 'SET_LOCAL_PLAYER'; player: EliminationPlayer }
  | { type: 'GAME_STARTED' }
  | { type: 'ROUND_INTRO'; payload: RoundIntroPayload }
  | { type: 'ROUND_STARTED'; payload: RoundStartedPayload }
  | { type: 'SUBMISSION_SENT' }
  | { type: 'ROUND_REVEAL'; results: RoundResult[]; roundNumber: number; roundType: string }
  | { type: 'ROUND_RESULTS'; results: RoundResult[]; eliminatedIds: string[]; roundNumber?: number }
  | { type: 'ADVANCE_FROM_REVEAL' }
  | { type: 'WINNER_DECLARED'; payload: WinnerPayload }
  | { type: 'ROOM_ENDED' }
  | { type: 'SET_VIEW'; view: GameView }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' };

const reducer = (state: EliminationGameState, action: Action): EliminationGameState => {
  switch (action.type) {
    case 'SET_ROOM': {
      const localPlayer = action.localPlayerId
        ? action.room.players.find(p => p.playerId === action.localPlayerId) ?? state.localPlayer
        : state.localPlayer;
      return {
        ...state,
        room: action.room,
        localPlayer: localPlayer ?? state.localPlayer,
        view: action.room.status === 'waiting' ? 'waiting' : state.view,
        error: null,
      };
    }
    case 'UPDATE_PLAYERS':
      if (state.room) {
        return { ...state, room: { ...state.room, players: action.players } };
      }
      // Room not yet hydrated — store players so waiting room can show them
      return state; // room not yet hydrated, waitingPlayers in GamePage handles this

    case 'SET_LOCAL_PLAYER':
      return { ...state, localPlayer: action.player };

    case 'GAME_STARTED':
      return { ...state, view: 'round_intro' };

    case 'ROUND_INTRO': {
      // Eliminated players stay on eliminated view — never go back to round screens
      const isEliminated = state.localPlayer?.eliminated ?? false;
      return {
        ...state,
        view: isEliminated ? 'eliminated' : 'round_intro',
        activeRound: null,
        localPlayer: state.localPlayer
          ? { ...state.localPlayer, hasSubmittedCurrentRound: false }
          : state.localPlayer,
      };
    }

    case 'ROUND_STARTED': {
      // Eliminated players stay on eliminated view
      const isEliminated = state.localPlayer?.eliminated ?? false;
      return {
        ...state,
        view: isEliminated ? 'eliminated' : 'round_active',
        activeRound: {
          roundId: action.payload.roundId,
          roundNumber: action.payload.roundNumber,
          roundType: action.payload.roundType,
          phase: 'active',
          config: action.payload.config,
          startedAt: action.payload.startedAt,
          endsAt: action.payload.endsAt,
        },
        localPlayer: state.localPlayer
          ? { ...state.localPlayer, hasSubmittedCurrentRound: false }
          : state.localPlayer,
      };
    }

    case 'SUBMISSION_SENT':
      return state.localPlayer
        ? { ...state, localPlayer: { ...state.localPlayer, hasSubmittedCurrentRound: true } }
        : state;

    case 'ROUND_REVEAL': {
      // Reveal phase — show correct answer, don't show scores yet
      // Eliminated players skip reveal entirely and stay on eliminated view
      const isAlreadyEliminated = state.localPlayer?.eliminated ?? false;
      return {
        ...state,
        lastResults: action.results,
        view: isAlreadyEliminated ? 'eliminated' : 'round_reveal',
      };
    }

    case 'ROUND_RESULTS': {
      // Scores phase — comes after reveal, now we know who was eliminated
      const isLocalEliminated = state.localPlayer
        ? action.eliminatedIds.includes(state.localPlayer.playerId)
        : false;
      const eliminatedInRound = action.roundNumber ?? state.activeRound?.roundNumber ?? null;
      return {
        ...state,
        lastResults: action.results,
        eliminatedThisRound: action.eliminatedIds,
        view: isLocalEliminated ? 'eliminated' : 'round_results',
        localPlayer: isLocalEliminated && state.localPlayer
          ? { ...state.localPlayer, eliminated: true, eliminatedInRound }
          : state.localPlayer,
      };
    }

    case 'ADVANCE_FROM_REVEAL': {
      // Only surviving players reach this — eliminated players stay on 'eliminated' view
      // and never see reveal, so they never call advanceFromReveal
      return {
        ...state,
        view: 'round_results',
      };
    }

    case 'WINNER_DECLARED':
      return {
        ...state,
        winner: action.payload,
        view: 'winner',
        activeRound: null,
      };

    case 'ROOM_ENDED':
      return { ...state, view: 'lobby' };

    case 'SET_VIEW':
      return { ...state, view: action.view };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useEliminationGame = (localPlayerId: string | null) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setRoom = useCallback((room: EliminationRoom) => {
    dispatch({ type: 'SET_ROOM', room, localPlayerId: localPlayerId ?? undefined });
  }, [localPlayerId]);

  const updatePlayers = useCallback((players: EliminationPlayer[]) => {
    dispatch({ type: 'UPDATE_PLAYERS', players });
  }, []);

  const onGameStarted = useCallback(() => {
    dispatch({ type: 'GAME_STARTED' });
  }, []);

  const onRoundIntro = useCallback((payload: RoundIntroPayload) => {
    dispatch({ type: 'ROUND_INTRO', payload });
  }, []);

  const onRoundStarted = useCallback((payload: RoundStartedPayload) => {
    dispatch({ type: 'ROUND_STARTED', payload });
  }, []);

  const onSubmissionSent = useCallback(() => {
    dispatch({ type: 'SUBMISSION_SENT' });
  }, []);

  const onRoundReveal = useCallback((results: RoundResult[], roundNumber: number, roundType: string) => {
    dispatch({ type: 'ROUND_REVEAL', results, roundNumber, roundType });
  }, []);

  const onRoundResults = useCallback((results: RoundResult[], eliminatedIds: string[], roundNumber?: number) => {
    dispatch({ type: 'ROUND_RESULTS', results, eliminatedIds, roundNumber });
  }, []);

  const onWinnerDeclared = useCallback((payload: WinnerPayload) => {
    dispatch({ type: 'WINNER_DECLARED', payload });
  }, []);

  const advanceFromReveal = useCallback(() => {
    dispatch({ type: 'ADVANCE_FROM_REVEAL' });
  }, []);

  const onRoomEnded = useCallback(() => {
    dispatch({ type: 'ROOM_ENDED' });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  return {
    state,
    setRoom,
    updatePlayers,
    onGameStarted,
    onRoundIntro,
    onRoundStarted,
    onSubmissionSent,
    onRoundReveal,
    onRoundResults,
    onWinnerDeclared,
    advanceFromReveal,
    onRoomEnded,
    setError,
    clearError,
  };
};