//src/components/elimination/EliminationGamePage.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEliminationGame } from './hooks/useEliminationGame';
import { useEliminationSocket } from './hooks/useEliminationSocket';
import { useRoundTimer } from './hooks/useRoundTimer';
import { EliminationWaitingRoom } from './EliminationWaitingRoom';
import { EliminationRoundRenderer } from './EliminationRoundRenderer';
import { EliminationRoundIntro } from './EliminationRoundIntro';
import { EliminationResultsPanel } from './EliminationResultsPanel';
import { EliminationRevealPanel } from './EliminationRevealPanel';
import { EliminationHostReveal } from './EliminationHotReveal';
import { EliminationSoundToggle } from './EliminationSoundToggle';
import { playRoundStart, playRoundIntro, playReveal, playEliminated, playWinner, playSubmit, playCountdownTick } from './utils/sounds';
import { useWakeLock } from './hooks/useWakeLock';
import { EliminationEliminatedView } from './EliminationEliminatedView';
import { EliminationWinnerView } from './EliminationWinnerView';
import { EliminationReconciliationPanel } from './reconciliation/EliminationReconciliationPanel';
import {
  emitStartGame,
  emitSubmitAnswer,
  emitReconnect,
  emitHostJoin,
  emitStartPress,
  getSocket,
} from './services/eliminationSocket';
import { roundTypeLabel } from './utils/eliminationHelpers';
import { getRoundColour, BASE_BG } from './utils/designTokens';
import { EliminationHostDashboard } from './host/EliminationHostDashboard';
import type {
  RoundSubmission,
  RoundIntroPayload,
  RoundStartedPayload,
  RoundRevealPayload,
  RoundResultsPayload,
  EliminatedPayload,
  WinnerPayload,
  EliminationRoom,
} from './types/elimination';

// ─── Session storage keys ─────────────────────────────────────────────────────
const SESSION_ROOM_ID         = 'elim_room_id';
const SESSION_PLAYER_ID       = 'elim_player_id';
const SESSION_HOST_ID         = 'elim_host_id';
const SESSION_PLAYER_NAME     = 'elim_player_name';
const SESSION_IS_HOST         = 'elim_is_host';
const SESSION_ONCHAIN_ROOM_ID = 'elim_onchain_room_id';
const SESSION_PAYMENT_MODE    = 'elim_payment_mode';
const SESSION_RECONCILING     = 'elim_reconciling';


const clearEliminationSession = () => {
  [
    SESSION_ROOM_ID, SESSION_PLAYER_ID, SESSION_HOST_ID,
    SESSION_PLAYER_NAME, SESSION_IS_HOST, SESSION_ONCHAIN_ROOM_ID,
    SESSION_PAYMENT_MODE, SESSION_RECONCILING,
  ].forEach(k => sessionStorage.removeItem(k));
};

function isWeb3Room(room: any): boolean {
  const mode = room?.paymentMode ?? sessionStorage.getItem(SESSION_PAYMENT_MODE) ?? '';
  return mode === 'web3';
}

function getPrizeSponsor(room: any): string | null {
  const prizes = room?.prizes ?? (room as any)?.config?.prizes;
  if (Array.isArray(prizes) && prizes.length > 0) {
    return prizes[0]?.sponsor ?? null;
  }
  return null;
}

export const EliminationGamePage: React.FC = () => {
  const navigate = useNavigate();
    const [searchParams] = useSearchParams();

  // ── Session identity ──────────────────────────────────────────────────────
  const [roomId, setRoomId]                   = useState<string | null>(() => sessionStorage.getItem(SESSION_ROOM_ID));
  const [localPlayerId, setLocalPlayerId]     = useState<string | null>(() => sessionStorage.getItem(SESSION_PLAYER_ID));
  const [localPlayerName, setLocalPlayerName] = useState<string>(() => sessionStorage.getItem(SESSION_PLAYER_NAME) ?? '');
  const [isHost, setIsHost]                   = useState<boolean>(() => sessionStorage.getItem(SESSION_IS_HOST) === 'true');
  const [hostId, setHostId]                   = useState<string | null>(() => sessionStorage.getItem(SESSION_HOST_ID));
  const [waitingPlayers, setWaitingPlayers]   = useState<any[]>([]);
  const [introPayload, setIntroPayload]       = useState<RoundIntroPayload | null>(null);
  const [resumeFailed, setResumeFailed]       = useState(false);

  // A naked /elimination route must never expose the legacy create/join lobby.
  // Access is valid only for an existing player session, an existing host session,
  // or a host resume URL supplied by the authenticated event dashboard.
  const urlRoomId = searchParams.get('roomId');
  const urlHostId = searchParams.get('hostId');
  const urlMode   = searchParams.get('mode');
  const isReconciliationResume = urlMode === 'reconcile';
  const hasHostResumeUrl = !resumeFailed && !!urlRoomId && !!urlHostId;

  const hasValidPlayerSession = !!roomId && !isHost && !!localPlayerId;
  const hasValidHostSession   = !!roomId && isHost && !!hostId;
  const hasValidGameAccess    = hasValidPlayerSession || hasValidHostSession || hasHostResumeUrl;

  // ── Game state ────────────────────────────────────────────────────────────
  const {
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
    onEnterReconciliation,
    setError,
  } = useEliminationGame(localPlayerId);

  const roundTimer = useRoundTimer(
    state.activeRound?.endsAt ?? null,
    state.view === 'round_active',
  );

  const gameIsActive = !['lobby', 'waiting', 'reconciliation'].includes(state.view);
  useWakeLock(gameIsActive);

  // Sound effects on view change
  const prevViewRef = React.useRef<string>('');
  useEffect(() => {
    const view = state.view;
    if (view === prevViewRef.current) return;
    prevViewRef.current = view;
    if (view === 'eliminated' || view === 'game_over') playEliminated();
    if (view === 'winner') playWinner();
  }, [state.view]);

  useEffect(() => {
    if (state.view === 'round_active' && roundTimer.secondsRemaining <= 3 && roundTimer.secondsRemaining > 0) {
      playCountdownTick();
    }
  }, [state.view, roundTimer.secondsRemaining]);

  useEffect(() => {
    const mode = (state.room as any)?.paymentMode;
    if (mode) sessionStorage.setItem(SESSION_PAYMENT_MODE, mode);
  }, [(state.room as any)?.paymentMode]);

  // ── Navigation helpers ────────────────────────────────────────────────────

 const getExitRoute = useCallback(() => {
  if (isWeb3Room(state.room)) return '/web3/elimination';
  return '/event-dashboard';
}, [state.room]);

  const handleCleanupAndNavigate = useCallback(() => {
    const exitRoute = getExitRoute();
    clearEliminationSession();
    setRoomId(null);
    setLocalPlayerId(null);
    onRoomEnded();
    navigate(exitRoute, { replace: true });
  }, [getExitRoute, onRoomEnded, navigate]);

  // Host enters reconciliation manually - triggered by button in winner view
  const handleEnterReconciliation = useCallback(() => {
    sessionStorage.setItem(SESSION_RECONCILING, 'true');
    onEnterReconciliation();
  }, [onEnterReconciliation]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEliminationSocket({
onRoomState: useCallback((data: any) => {
  const room: EliminationRoom = data.roomSnapshot ?? data;

  // Always restore the latest room/player list.
  setRoom(room);
  setWaitingPlayers(room.players ?? []);

  // Reconciliation resume is authoritative. Hydration/reconnect snapshots can
  // describe the in-memory room as waiting, but a host who opened the page with
  // ?mode=reconcile (or already entered reconciliation in this session) must not
  // be pushed back to the waiting room by that snapshot.
  const shouldStayInReconciliation =
    isReconciliationResume ||
    sessionStorage.getItem(SESSION_RECONCILING) === 'true';

  if (shouldStayInReconciliation) {
    sessionStorage.setItem(SESSION_RECONCILING, 'true');
    onEnterReconciliation();
    return;
  }

  const mode = (room as any).paymentMode;
  if (mode) {
    sessionStorage.setItem(SESSION_PAYMENT_MODE, mode);
  }

  const currentIsHost =
    sessionStorage.getItem(SESSION_IS_HOST) === 'true';

  // ── Restore this player's identity ─────────────────────────────
  if (!currentIsHost) {
    const restoredPlayerId =
      data.yourPlayerId ??
      data.playerState?.playerId ??
      sessionStorage.getItem(SESSION_PLAYER_ID);

    if (restoredPlayerId) {
      setLocalPlayerId(restoredPlayerId);
      sessionStorage.setItem(
        SESSION_PLAYER_ID,
        restoredPlayerId,
      );
    }

    if (data.playerState?.name) {
      setLocalPlayerName(data.playerState.name);
      sessionStorage.setItem(
        SESSION_PLAYER_NAME,
        data.playerState.name,
      );
    }
  }

 // ── Normal room update vs reconnect ────────────────────────────
//
// Player reconnect:
//   data.playerState + data.activeRound
//
// Host reconnect:
//   data.isHostReconnect === true + data.activeRound
//
const isReconnectSnapshot =
  !!data.playerState ||
  data.isHostReconnect === true;

if (!isReconnectSnapshot) {
  return;
}

console.log('🎮 [Elimination] Applying reconnect snapshot', {
  roomStatus: room.status,
  isHostReconnect: data.isHostReconnect === true,
  playerId: data.playerState?.playerId ?? null,
  eliminated: data.playerState?.eliminated ?? false,
  hasSubmitted: data.playerState?.hasSubmittedCurrentRound ?? false,
  activeRound: data.activeRound,
});

// Waiting room: restoring the room/player list above is enough.
if (room.status === 'waiting') {
  return;
}

// The game is currently running.
if (room.status === 'active') {
  onGameStarted();
}

const activeRound = data.activeRound;

// There may be a moment between rounds where there is no active round.
if (!activeRound) {
  return;
}

// ── Restore an ACTIVE round ────────────────────────────────────
//
// Works for BOTH:
//   • player refresh
//   • host refresh
//
if (activeRound.phase === 'active') {
  const restoredRound: RoundStartedPayload = {
    roundId: activeRound.roundId,
    roundNumber: activeRound.roundNumber,
    roundType: activeRound.roundType,
    config: activeRound.generatedConfig,
    startedAt: activeRound.startedAt,
    endsAt: activeRound.endsAt,
  };

  console.log('🎮 [Elimination] Restoring active round', {
    isHost: data.isHostReconnect === true,
    roundId: restoredRound.roundId,
    roundNumber: restoredRound.roundNumber,
    roundType: restoredRound.roundType,
    endsAt: restoredRound.endsAt,
  });

  setIntroPayload(null);
  onRoundStarted(restoredRound);

  // Only players have submission state.
  // Hosts do not have data.playerState.
  if (data.playerState?.hasSubmittedCurrentRound) {
    onSubmissionSent();
  }

  return;
}

// ── Restore during INTRO ───────────────────────────────────────
//
// We don't currently recreate the whole intro payload.
// The normal ROUND_STARTED event will arrive when intro finishes.
if (activeRound.phase === 'intro') {
  console.log(
    '🎮 [Elimination] Reconnected during round intro - waiting for ROUND_STARTED',
    {
      isHost: data.isHostReconnect === true,
      roundNumber: activeRound.roundNumber,
      roundType: activeRound.roundType,
    }
  );

  return;
}

// ── Restore during REVEAL ─────────────────────────────────────
if (activeRound.phase === 'reveal') {
  const results = activeRound.results ?? [];

  if (!results.length) {
    console.warn(
      '🎮 [Elimination] Reconnected during reveal but no results were available',
      {
        roundNumber: activeRound.roundNumber,
        roundType: activeRound.roundType,
      }
    );

    return;
  }

  // Rebuild the round first so the reveal component has
  // a valid activeRound with roundNumber / roundType / config.
  const restoredRound: RoundStartedPayload = {
    roundId: activeRound.roundId,
    roundNumber: activeRound.roundNumber,
    roundType: activeRound.roundType,
    config: activeRound.generatedConfig,
    startedAt: activeRound.startedAt,
    endsAt: activeRound.endsAt,
  };

  setIntroPayload(null);

  onRoundStarted(restoredRound);

  // Then move into the actual reveal screen.
  onRoundReveal(
    results,
    activeRound.roundNumber,
    activeRound.roundType
  );

  console.log(
    '🎮 [Elimination] Restored reveal screen',
    {
      roundNumber: activeRound.roundNumber,
      roundType: activeRound.roundType,
      resultCount: results.length,
    }
  );

  return;
}

// Reveal/results recovery comes next.
// For now log it rather than trying to reconstruct incomplete state.
console.log(
  '🎮 [Elimination] Reconnected during unsupported recovery phase',
  {
    isHost: data.isHostReconnect === true,
    phase: activeRound.phase,
    roundNumber: activeRound.roundNumber,
    roundType: activeRound.roundType,
  }
);
}, [
  setRoom,
  onEnterReconciliation,
  isReconciliationResume,
  onGameStarted,
  onRoundStarted,
  onSubmissionSent,
    onRoundReveal,
]),

    onWaitingRoomUpdate: useCallback((data: { players: any[] }) => {
      setWaitingPlayers(data.players);
      updatePlayers(data.players);
    }, [updatePlayers]),

    onGameStarted: useCallback(() => { onGameStarted(); }, [onGameStarted]),

    onRoundIntro: useCallback((data: RoundIntroPayload) => {
      setIntroPayload(data);
      playRoundIntro();
      onRoundIntro(data);
    }, [onRoundIntro]),

    onRoundStarted: useCallback((data: RoundStartedPayload) => {
      setIntroPayload(null);
      setWaitingPlayers(prev => prev.map((p: any) => ({ ...p, hasSubmittedCurrentRound: false })));
      playRoundStart();
      onRoundStarted(data);
    }, [onRoundStarted]),

    onSubmissionReceived: useCallback((data: { playerId: string; roundId: string }) => {
      onSubmissionSent();
      if (data?.playerId) {
        setWaitingPlayers(prev =>
          prev.map((p: any) => p.playerId === data.playerId ? { ...p, hasSubmittedCurrentRound: true } : p)
        );
      }
    }, [onSubmissionSent]),

    onRoundReveal: useCallback((data: RoundRevealPayload) => {
      playReveal();
      onRoundReveal(data.results, data.roundNumber, data.roundType);
    }, [onRoundReveal]),

    onRoundResults: useCallback((data: RoundResultsPayload) => {
      onRoundResults(data.results, [], data.roundNumber);
    }, [onRoundResults]),

    onPlayersEliminated: useCallback((data: EliminatedPayload) => {
      onRoundResults(state.lastResults ?? [], data.eliminatedPlayerIds, data.roundNumber);
      setWaitingPlayers(prev =>
        prev.map(p => data.eliminatedPlayerIds.includes(p.playerId) ? { ...p, eliminated: true } : p)
      );
    }, [onRoundResults, state.lastResults]),

    onNextRound: useCallback(() => {}, []),

    onWinnerDeclared: useCallback((data: WinnerPayload) => {
      onWinnerDeclared(data);
    }, [onWinnerDeclared]),

    // ── PLAYERS_DISMISSED ─────────────────────────────────────────────────
    // This is now a 10-minute safety-net from the server - not the primary
    // navigation trigger. By the time it fires, most clients will have already
    // left via the winner/game_over auto-close, and the host will have clicked
    // "Start Reconciliation" manually. We only act on it if the client is
    // somehow still on a post-game view (winner / game_over) - which means
    // the user left their screen open for 10 full minutes without interacting.
    onPlayersDismissed: useCallback(() => {
      const view = state.view; // capture current view at time of event
      if (isHost) {
        // Host hasn't clicked reconciliation yet after 10 minutes - push them
        if (view === 'winner' || view === 'waiting' || view === 'round_results') {
          handleEnterReconciliation();
        }
      } else {
        // Player is still on winner/game_over after 10 minutes - send them home
        if (view === 'winner' || view === 'game_over' || view === 'eliminated') {
          handleCleanupAndNavigate();
        }
        // If they've already navigated (lobby/waiting) - do nothing
      }
    }, [isHost, state.view, handleEnterReconciliation, handleCleanupAndNavigate]),

    onReconciliationApproved: useCallback(() => {
      // Panel handles its own approved state; onComplete calls handleCleanupAndNavigate
    }, []),

    onRoomEnded: useCallback(() => {
      handleCleanupAndNavigate();
    }, [handleCleanupAndNavigate]),

    onRoomCancelled: useCallback(() => {
      handleCleanupAndNavigate();
    }, [handleCleanupAndNavigate]),

    onError: useCallback((data: { message: string }) => {
      if (data.message === 'Room not found') {
        clearEliminationSession();
        setRoomId(null);
        setLocalPlayerId(null);
      } else {
        setError(data.message);
      }
    }, [setError]),
  });

  // ── Reconnect on mount ────────────────────────────────────────────────────
  const initialRoomId   = sessionStorage.getItem(SESSION_ROOM_ID);
  const initialIsHost   = sessionStorage.getItem(SESSION_IS_HOST) === 'true';
  const initialHostId   = sessionStorage.getItem(SESSION_HOST_ID);
  const initialPlayerId = sessionStorage.getItem(SESSION_PLAYER_ID);
  const initialName     = sessionStorage.getItem(SESSION_PLAYER_NAME) ?? '';

useEffect(() => {
  const hasHostSession   = initialRoomId && initialIsHost && initialHostId;
  const hasPlayerSession = initialRoomId && !initialIsHost && initialPlayerId;

  // Fall back to URL params when session storage is empty (resume from dashboard)
  const isResumeFromDashboard = !hasHostSession && !hasPlayerSession && !!urlRoomId && !!urlHostId;

  if (!hasHostSession && !hasPlayerSession && !isResumeFromDashboard) return;

const resolvedRoomId =
  hasHostSession || hasPlayerSession
    ? initialRoomId!
    : urlRoomId!;

const resolvedHostId =
  hasHostSession
    ? initialHostId!
    : urlHostId!;

const resolvedName =
  hasHostSession || hasPlayerSession
    ? initialName
    : '';

  fetch(`/api/elimination/rooms/${resolvedRoomId}`)
    .then(r => r.json())
    .then(data => {
      if (!data.success) {
        clearEliminationSession();
        setRoomId(null);
        setLocalPlayerId(null);
        setHostId(null);
        setIsHost(false);
        if (isResumeFromDashboard) setResumeFailed(true);
        return;
      }

      if (hasHostSession || isResumeFromDashboard) {
        setIsHost(true);
        setHostId(resolvedHostId);
        setLocalPlayerId(resolvedHostId);
        setLocalPlayerName(resolvedName);
        setRoomId(resolvedRoomId);

        // Write session so socket and subsequent navigation work correctly
        sessionStorage.setItem(SESSION_ROOM_ID,     resolvedRoomId);
        sessionStorage.setItem(SESSION_HOST_ID,     resolvedHostId);
        sessionStorage.setItem(SESSION_IS_HOST,     'true');
        sessionStorage.setItem(SESSION_PLAYER_NAME, resolvedName);

        // Mark reconciliation BEFORE joining the socket room so the incoming
        // host reconnect snapshot cannot reset the UI back to the waiting room.
        if (
          isReconciliationResume ||
          sessionStorage.getItem(SESSION_RECONCILING) === 'true'
        ) {
          sessionStorage.setItem(SESSION_RECONCILING, 'true');
          onEnterReconciliation();
        }

        emitHostJoin(resolvedRoomId, resolvedHostId);
} else if (hasPlayerSession) {
  console.log('🎮 [Elimination] Restoring player session', {
    roomId: resolvedRoomId,
    playerId: initialPlayerId,
  });

  // Restore the player's React state from the saved session
  setRoomId(resolvedRoomId);
  setLocalPlayerId(initialPlayerId!);
  setLocalPlayerName(initialName);
  setIsHost(false);

  // Then reconnect that existing player to the new socket
  emitReconnect(resolvedRoomId, initialPlayerId!);
}
    })
    .catch(() => {
      clearEliminationSession();
      setRoomId(null);
      setLocalPlayerId(null);
      setHostId(null);
      setIsHost(false);
      if (isResumeFromDashboard) setResumeFailed(true);
    });
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    if (!roomId || !localPlayerId) return;
    emitStartGame(roomId, localPlayerId);
  }, [roomId, localPlayerId]);

  const handleSubmit = useCallback((submission: RoundSubmission) => {
    if (!roomId || !localPlayerId) return;
    emitSubmitAnswer(roomId, localPlayerId, submission);
    playSubmit();
    onSubmissionSent();
  }, [roomId, localPlayerId, onSubmissionSent]);

  const handleStartPress = useCallback((roundId: string, playerId: string) => {
    if (!roomId) return;
    emitStartPress(roomId, playerId, roundId);
  }, [roomId]);

  const handleReset = useCallback(() => { handleCleanupAndNavigate(); }, [handleCleanupAndNavigate]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const room        = state.room;
  const localPlayer = state.localPlayer ?? room?.players.find(p => p.playerId === localPlayerId);
  const gameEnded   = state.view === 'reconciliation';

  const withDashboard = (children: React.ReactNode) => (
    <>
      {children}
      {isHost && roomId && hostId && (
        <EliminationHostDashboard
          roomId={roomId}
          hostId={hostId}
          socket={getSocket()}
          entryFee={Number((state.room as any)?.entryFee ?? 0)}
          currency={(state.room as any)?.currency ?? '€'}
          initialPlayers={waitingPlayers}
          gameEnded={gameEnded}
        maxPlayers={(state.room as any)?.maxPlayers ?? (state.room as any)?.roomCaps?.maxPlayers}
        />
      )}
    </>
  );

  // ── Views ─────────────────────────────────────────────────────────────────

  // No valid player/host identity: never expose the old free create/join lobby.
  if (!hasValidGameAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={styles.page}>
        <div style={styles.accessCard}>
          <div style={styles.accessEyebrow}>FundRaisely</div>
          <h1 style={styles.accessTitle}>ELIMINATION</h1>
          <p style={styles.accessText}>
            This is the live game area for FundRaisely Elimination events.
          </p>
          <p style={styles.accessText}>
            If you have purchased an entry, use the game link supplied with your ticket to join.
          </p>
          <div style={styles.accessActions}>
            <button
              type="button"
              onClick={() => navigate('/event-formats/elimination')}
              style={styles.accessPrimaryButton}
            >
              Learn about Elimination
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={styles.accessSecondaryButton}
            >
              FundRaisely Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard host resume URLs are valid before roomId has been written to state.
  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={styles.page}>
        <div style={styles.connectingState}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
          <div>Loading your Elimination game…</div>
        </div>
      </div>
    );
  }

  if (state.view === 'lobby' || state.view === 'waiting') {
    return withDashboard(
      <EliminationWaitingRoom
        roomId={roomId} players={waitingPlayers} isHost={isHost}
        localPlayerId={localPlayerId ?? ''} onStart={handleStart} onLeave={handleReset}
        minPlayers={2} roomData={state.room}
        hostId={sessionStorage.getItem(SESSION_HOST_ID) ?? undefined}
        onCancelled={handleReset}
      />
    );
  }

  if (state.view === 'round_intro' && introPayload) {
    return withDashboard(
      <EliminationRoundIntro
        payload={introPayload}
        introDurationMs={introPayload.introDurationMs ?? 10000}
        introCountdownMs={introPayload.introCountdownMs ?? 5000}
      />
    );
  }

  if (state.view === 'round_active' && state.activeRound) {
    const hasSubmitted = localPlayer?.hasSubmittedCurrentRound ?? false;
    const rc           = getRoundColour(state.activeRound.roundNumber);
    const isUrgent     = roundTimer.secondsRemaining <= 3;

    return withDashboard(
      <div className="min-h-screen flex flex-col" style={{ ...styles.page, background: BASE_BG }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '180px',
          background: `linear-gradient(180deg, ${rc.tint} 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        <div style={styles.hud}>
          <div style={styles.hudLeft}>
            <span style={{ ...styles.hudRound, color: `${rc.primary}99` }}>
              Round {state.activeRound.roundNumber} of 8
            </span>
            <span style={{ ...styles.hudType, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '22px', letterSpacing: '0.02em' }}>
              {roundTypeLabel(state.activeRound.roundType).toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <EliminationSoundToggle />
            {state.activeRound.roundType !== 'time_estimation' && (
              <div style={{
                ...styles.hudTimer,
                color: isUrgent ? '#ff3b5c' : rc.primary,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontSize: '42px',
                filter: isUrgent ? 'drop-shadow(0 0 12px #ff2d5566)' : `drop-shadow(0 0 8px ${rc.glow})`,
              }}>
                {roundTimer.secondsRemaining}
              </div>
            )}
          </div>
        </div>

        {state.activeRound.roundType !== 'time_estimation' && (
          <div style={styles.timerTrack}>
            <div style={{
              ...styles.timerBar,
              width: `${(1 - roundTimer.progress) * 100}%`,
              background: isUrgent ? '#ff3b5c' : rc.primary,
              boxShadow: `0 0 8px ${isUrgent ? '#ff3b5c66' : rc.glow}`,
            }} />
          </div>
        )}

        <div style={{
          ...styles.instructionBar,
          borderBottom: `1px solid ${rc.primary}22`,
          color: hasSubmitted ? `${rc.primary}bb` : 'rgba(255,255,255,0.75)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {hasSubmitted ? '✓ Locked in - waiting for others' : ROUND_INSTRUCTIONS[state.activeRound.roundType]}
        </div>

        <div className="flex-1 flex items-center justify-center"
          style={{ padding: '8px', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          {isHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👁</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter', fontSize: '14px', margin: 0 }}>
                You are the host - players are submitting answers on their devices.
              </p>
            </div>
          ) : (
            <div style={{ width: '100%', maxWidth: 'min(420px, 100vw - 16px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <EliminationRoundRenderer
                activeRound={state.activeRound}
                playerId={localPlayerId ?? ''}
                hasSubmitted={hasSubmitted}
                onSubmit={handleSubmit}
                onStartPress={handleStartPress}
              />
            </div>
          )}
        </div>

        {state.error && <div style={styles.errorToast}>{state.error}</div>}
      </div>
    );
  }

  if (state.view === 'round_reveal' && state.lastResults) {
    if (isHost) {
      return withDashboard(
        <EliminationHostReveal
          activeRound={state.activeRound}
          results={state.lastResults}
          players={waitingPlayers}
          onContinue={advanceFromReveal}
          autoAdvanceMs={10000}
        />
      );
    }
    return withDashboard(
      <EliminationRevealPanel
        activeRound={state.activeRound}
        localPlayerId={localPlayerId ?? ''}
        results={state.lastResults}
        onContinue={advanceFromReveal}
        autoAdvanceMs={10000}
      />
    );
  }

  if (state.view === 'round_results' && state.lastResults) {
    return withDashboard(
      <EliminationResultsPanel
        results={state.lastResults}
        players={waitingPlayers}
        roundNumber={state.activeRound?.roundNumber ?? 0}
        roundType={state.activeRound?.roundType ?? 'true_centre'}
        localPlayerId={localPlayerId ?? ''}
        eliminatedIds={state.eliminatedThisRound}
      />
    );
  }

  if (state.view === 'eliminated') {
    return withDashboard(
      <EliminationEliminatedView
        playerName={localPlayerName}
        eliminatedInRound={localPlayer?.eliminatedInRound ?? 0}
        activePlayers={waitingPlayers.filter((p: any) => !p.eliminated).length}
        totalPlayers={waitingPlayers.length}
        currentRoundNumber={state.activeRound?.roundNumber}
        currentRoundType={state.activeRound?.roundType}
        isRoundActive={state.activeRound?.phase === 'active'}
      />
    );
  }

  // ── Game over - eliminated player sees winner announcement + feedback ──────
  if (state.view === 'game_over') {
    return withDashboard(
      <EliminationEliminatedView
        playerName={localPlayerName}
        eliminatedInRound={localPlayer?.eliminatedInRound ?? 0}
        activePlayers={0}
        totalPlayers={waitingPlayers.length}
        gameOver={true}
        winnerName={state.winner?.winnerName}
        prizeSponsor={getPrizeSponsor(state.room)}
        onLeave={handleReset}
        autoLeaveSeconds={120}
        roomId={roomId ?? undefined}
        clubId={(state.room as any)?.clubId ?? undefined}
      />
    );
  }

  // ── Winner view - surviving players + host ────────────────────────────────
  // Host sees a "Start Reconciliation" button instead of "Return to lobby".
  // Players see auto-close after feedback is dismissed.
  if (state.view === 'winner' && state.winner) {
    return withDashboard(
      <EliminationWinnerView
        winnerId={state.winner.winnerId}
        winnerName={state.winner.winnerName}
        finalStandings={state.winner.finalStandings}
        players={waitingPlayers}
        localPlayerId={localPlayerId ?? ''}
        onClose={isHost ? undefined : handleReset}
        onStartReconciliation={isHost ? handleEnterReconciliation : undefined}
        isHost={isHost}
        hostId={sessionStorage.getItem(SESSION_HOST_ID) ?? undefined}
        roomId={roomId ?? undefined}
        roomData={state.room as any}
        prizeSponsor={getPrizeSponsor(state.room)}
        clubId={(state.room as any)?.clubId ?? undefined}
      />
    );
  }

  // ── Reconciliation (host only, after clicking "Start Reconciliation") ─────
  if (state.view === 'reconciliation') {
    return withDashboard(
      <EliminationReconciliationPanel
        roomId={roomId!}
        hostId={hostId!}
        isLoggedIn={!!localStorage.getItem('auth_token')}
        socket={getSocket()}
        room={state.room}
        winner={state.winner}
        onComplete={handleCleanupAndNavigate}
      />
    );
  }

  // Fallback - connecting spinner
  return withDashboard(
    <div className="min-h-screen flex items-center justify-center" style={styles.page}>
      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
        <div>Connecting…</div>
        {state.error && <div style={{ color: '#ff3b5c', marginTop: '8px', fontSize: '13px' }}>{state.error}</div>}
      </div>
    </div>
  );
};

const ROUND_INSTRUCTIONS: Record<string, string> = {
  true_centre:       'Tap the exact centre of the shape',
  midpoint_split:    'Tap the exact midpoint between A and B',
  stop_the_bar:      'Tap STOP when the marker hits the target',
  draw_angle:        'Drag the line to match the target angle',
  flash_grid:        'Tap the cells that lit up',
  quick_count:       'Enter how many dots you saw',
  flash_maths:       'Enter the total of all numbers shown',
  line_length:       'Drag to match the reference line length',
  balance_point:     'Tap where the beam would balance',
  pattern_align:     'Move and rotate the shape to match the target',
  sequence_gap:      'What number is missing from the sequence?',
  colour_count:      'Count the target colour shapes',
  time_estimation:   'Tap when the target time has passed',
  character_count:   'Count the target characters',
  reaction_tap:      'Tap as fast as you can when the target appears',
  moving_target_tap: 'Tap the moving target',
  path_trace:        'Trace the path as accurately as you can',
};

const styles: Record<string, React.CSSProperties> = {
  page:         { background: BASE_BG, fontFamily: "'Bebas Neue', 'Impact', sans-serif", color: '#ffffff', minHeight: '100vh' },
  hud:          { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' },
  hudLeft:      { display: 'flex', flexDirection: 'column', gap: '2px' },
  hudRound:     { fontFamily: "'Inter', system-ui, sans-serif", fontSize: '11px', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase' },
  hudType:      { fontSize: '17px', fontWeight: 700, color: '#ffffff' },
  hudTimer:     { fontFamily: "'Inter', system-ui, sans-serif", fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em', transition: 'color 0.3s' },
  timerTrack:   { height: '3px', background: 'rgba(255,255,255,0.06)', width: '100%' },
  timerBar:     { height: '100%', transition: 'background 0.3s', borderRadius: '0 2px 2px 0' },
  instructionBar: { padding: '10px 20px', fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.03em', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  errorToast:   { position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,59,92,0.15)', border: '1px solid rgba(255,59,92,0.5)', color: '#ff3b5c', padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontFamily: "'Inter', system-ui, sans-serif", whiteSpace: 'nowrap', zIndex: 100 },
  connectingState: { textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontFamily: "'Inter', system-ui, sans-serif" },
  accessCard: { width: '100%', maxWidth: '520px', padding: '40px 32px', borderRadius: '18px', border: '1px solid rgba(0,229,255,0.18)', background: 'rgba(255,255,255,0.035)', boxShadow: '0 24px 80px rgba(0,0,0,0.28)', textAlign: 'center' },
  accessEyebrow: { marginBottom: '10px', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'rgba(0,229,255,0.65)' },
  accessTitle: { margin: '0 0 18px', fontSize: '56px', lineHeight: 1, letterSpacing: '-0.02em', color: '#ffffff' },
  accessText: { margin: '0 auto 12px', maxWidth: '420px', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.58)' },
  accessActions: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '28px' },
  accessPrimaryButton: { width: '100%', padding: '14px 18px', borderRadius: '9px', border: '1px solid rgba(0,229,255,0.6)', background: 'rgba(0,229,255,0.14)', color: '#00e5ff', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '13px', fontWeight: 700, cursor: 'pointer' },
  accessSecondaryButton: { width: '100%', padding: '13px 18px', borderRadius: '9px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.7)', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '13px', fontWeight: 600, cursor: 'pointer' },
};