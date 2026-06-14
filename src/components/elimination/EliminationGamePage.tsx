import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEliminationGame } from './hooks/useEliminationGame';
import { useEliminationSocket } from './hooks/useEliminationSocket';
import { useRoundTimer } from './hooks/useRoundTimer';
import { EliminationLobbyPage } from './EliminationLobbyPage';
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
import { emitStartGame, emitSubmitAnswer, emitJoinRoom, emitHostJoin, emitStartPress, getSocket } from './services/eliminationSocket';
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

  // ── Session identity ──────────────────────────────────────────────────────
  const [roomId, setRoomId]                   = useState<string | null>(() => sessionStorage.getItem(SESSION_ROOM_ID));
  const [localPlayerId, setLocalPlayerId]     = useState<string | null>(() => sessionStorage.getItem(SESSION_PLAYER_ID));
  const [localPlayerName, setLocalPlayerName] = useState<string>(() => sessionStorage.getItem(SESSION_PLAYER_NAME) ?? '');
  const [isHost, setIsHost]                   = useState<boolean>(() => sessionStorage.getItem(SESSION_IS_HOST) === 'true');
  const [hostId, setHostId]                   = useState<string | null>(() => sessionStorage.getItem(SESSION_HOST_ID));
  const [waitingPlayers, setWaitingPlayers]   = useState<any[]>([]);
  const [introPayload, setIntroPayload]       = useState<RoundIntroPayload | null>(null);

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
    return isWeb3Room(state.room) ? '/web3/elimination' : '/';
  }, [state.room]);

  const handleCleanupAndNavigate = useCallback(() => {
    const exitRoute = getExitRoute();
    clearEliminationSession();
    setRoomId(null);
    setLocalPlayerId(null);
    onRoomEnded();
    navigate(exitRoute, { replace: true });
  }, [getExitRoute, onRoomEnded, navigate]);

  // Host enters reconciliation manually — triggered by button in winner view
  const handleEnterReconciliation = useCallback(() => {
    sessionStorage.setItem(SESSION_RECONCILING, 'true');
    onEnterReconciliation();
  }, [onEnterReconciliation]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEliminationSocket({
    onRoomState: useCallback((data: any) => {
      const room: EliminationRoom = data.roomSnapshot ?? data;
      setRoom(room);
      setWaitingPlayers(room.players ?? []);
      const mode = (room as any).paymentMode;
      if (mode) sessionStorage.setItem(SESSION_PAYMENT_MODE, mode);

      const currentIsHost = sessionStorage.getItem(SESSION_IS_HOST) === 'true';
      if (!currentIsHost) {
        const currentPlayerId = sessionStorage.getItem(SESSION_PLAYER_ID);
        const currentName     = sessionStorage.getItem(SESSION_PLAYER_NAME);
        if ((!currentPlayerId || currentPlayerId === '') && currentName) {
          const match = room.players.find((p: any) => p.name === currentName);
          if (match) {
            setLocalPlayerId(match.playerId);
            sessionStorage.setItem(SESSION_PLAYER_ID, match.playerId);
          }
        }
      }
    }, [setRoom]),

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
    // This is now a 10-minute safety-net from the server — not the primary
    // navigation trigger. By the time it fires, most clients will have already
    // left via the winner/game_over auto-close, and the host will have clicked
    // "Start Reconciliation" manually. We only act on it if the client is
    // somehow still on a post-game view (winner / game_over) — which means
    // the user left their screen open for 10 full minutes without interacting.
    onPlayersDismissed: useCallback(() => {
      const view = state.view; // capture current view at time of event
      if (isHost) {
        // Host hasn't clicked reconciliation yet after 10 minutes — push them
        if (view === 'winner' || view === 'waiting' || view === 'round_results') {
          handleEnterReconciliation();
        }
      } else {
        // Player is still on winner/game_over after 10 minutes — send them home
        if (view === 'winner' || view === 'game_over' || view === 'eliminated') {
          handleCleanupAndNavigate();
        }
        // If they've already navigated (lobby/waiting) — do nothing
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
    if (!hasHostSession && !hasPlayerSession) return;

    fetch(`/api/elimination/rooms/${initialRoomId}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) { clearEliminationSession(); return; }
        if (hasHostSession) {
          setIsHost(true);
          setHostId(initialHostId);
          setLocalPlayerId(initialHostId!);
          setLocalPlayerName(initialName);
          setRoomId(initialRoomId!);
          emitHostJoin(initialRoomId!, initialHostId!);

          if (sessionStorage.getItem(SESSION_RECONCILING) === 'true') {
            onEnterReconciliation();
          }
        } else if (hasPlayerSession) {
          emitJoinRoom(initialRoomId!, initialName, initialPlayerId!);
        }
      })
      .catch(() => clearEliminationSession());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleJoined = useCallback((
    newRoomId: string, newPlayerId: string, name: string, host: boolean,
  ) => {
    setRoomId(newRoomId);
    setLocalPlayerId(newPlayerId);
    setLocalPlayerName(name);
    setIsHost(host);
    sessionStorage.setItem(SESSION_ROOM_ID, newRoomId);
    sessionStorage.setItem(SESSION_PLAYER_NAME, name);
    sessionStorage.setItem(SESSION_IS_HOST, String(host));
    if (host) {
      sessionStorage.setItem(SESSION_HOST_ID, newPlayerId);
      sessionStorage.removeItem(SESSION_PLAYER_ID);
      setHostId(newPlayerId);
      emitHostJoin(newRoomId, newPlayerId);
    } else {
      sessionStorage.setItem(SESSION_PLAYER_ID, newPlayerId);
      sessionStorage.removeItem(SESSION_HOST_ID);
    }
  }, []);

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
        />
      )}
    </>
  );

  // ── Views ─────────────────────────────────────────────────────────────────

  if (!roomId) return <EliminationLobbyPage onJoined={handleJoined} />;

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
          {hasSubmitted ? '✓ Locked in — waiting for others' : ROUND_INSTRUCTIONS[state.activeRound.roundType]}
        </div>

        <div className="flex-1 flex items-center justify-center"
          style={{ padding: '8px', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          {isHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👁</div>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter', fontSize: '14px', margin: 0 }}>
                You are the host — players are submitting answers on their devices.
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

  // ── Game over — eliminated player sees winner announcement + feedback ──────
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

  // ── Winner view — surviving players + host ────────────────────────────────
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

  // Fallback — connecting spinner
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
};