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
import { emitStartGame, emitSubmitAnswer, emitJoinRoom, emitHostJoin } from './services/eliminationSocket';
import { roundTypeLabel } from './utils/eliminationHelpers';
import { getRoundColour, BASE_BG } from './utils/designTokens';
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

// ─── Local session storage keys ───────────────────────────────────────────────
const SESSION_ROOM_ID = 'elim_room_id';
const SESSION_PLAYER_ID = 'elim_player_id';
const SESSION_HOST_ID = 'elim_host_id';
const SESSION_PLAYER_NAME = 'elim_player_name';
const SESSION_IS_HOST = 'elim_is_host';
const SESSION_ONCHAIN_ROOM_ID = 'elim_onchain_room_id';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const clearEliminationSession = () => {
  sessionStorage.removeItem(SESSION_ROOM_ID);
  sessionStorage.removeItem(SESSION_PLAYER_ID);
  sessionStorage.removeItem(SESSION_HOST_ID);
  sessionStorage.removeItem(SESSION_PLAYER_NAME);
  sessionStorage.removeItem(SESSION_IS_HOST);
  sessionStorage.removeItem(SESSION_ONCHAIN_ROOM_ID);
};

export const EliminationGamePage: React.FC = () => {
  const navigate = useNavigate();

  // ── Session identity ──────────────────────────────────────────────────────
  const [roomId, setRoomId] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_ROOM_ID),
  );
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(
    () => sessionStorage.getItem(SESSION_PLAYER_ID),
  );
  const [localPlayerName, setLocalPlayerName] = useState<string>(
    () => sessionStorage.getItem(SESSION_PLAYER_NAME) ?? '',
  );
  const [isHost, setIsHost] = useState<boolean>(
    () => sessionStorage.getItem(SESSION_IS_HOST) === 'true',
  );

  // ── Local player list ─────────────────────────────────────────────────────
  const [waitingPlayers, setWaitingPlayers] = useState<any[]>([]);

  // ── Intro countdown state ─────────────────────────────────────────────────
  const [introPayload, setIntroPayload] = useState<RoundIntroPayload | null>(null);

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
    setError,
  } = useEliminationGame(localPlayerId);

  // ── Timers ────────────────────────────────────────────────────────────────
  const roundTimer = useRoundTimer(
    state.activeRound?.endsAt ?? null,
    state.view === 'round_active',
  );

  // ── Wake lock during active game ──────────────────────────────────────────
  const gameIsActive = !['lobby', 'waiting'].includes(state.view);
  useWakeLock(gameIsActive);

  // ── Sound effects on view changes ─────────────────────────────────────────
  const prevViewRef = React.useRef<string>('');
  useEffect(() => {
    const view = state.view;
    if (view === prevViewRef.current) return;
    prevViewRef.current = view;
    if (view === 'eliminated' || view === 'game_over') playEliminated();
    if (view === 'winner') playWinner();
  }, [state.view]);

  // ── Countdown tick in last 3 seconds ──────────────────────────────────────
  useEffect(() => {
    if (
      state.view === 'round_active' &&
      roundTimer.secondsRemaining <= 3 &&
      roundTimer.secondsRemaining > 0
    ) {
      playCountdownTick();
    }
  }, [state.view, roundTimer.secondsRemaining]);

  

  // ── Full cleanup + navigate ───────────────────────────────────────────────
  const handleCleanupAndNavigate = useCallback((room?: any) => {
    const wasWeb3 = room?.paymentMode === 'web3'
      || (state.room as any)?.paymentMode === 'web3';

    clearEliminationSession();
    setRoomId(null);
    setLocalPlayerId(null);
    onRoomEnded();

    navigate(wasWeb3 ? '/web3/elimination' : '/elimination', { replace: true });
  }, [onRoomEnded, navigate, state.room]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEliminationSocket({
    onRoomState: useCallback((data: any) => {
      const room: EliminationRoom = data.roomSnapshot ?? data;
      console.log('🎮 [onRoomState] received, players:', room.players?.length, room.players?.map((p: any) => p.name));
      setRoom(room);
      setWaitingPlayers(room.players ?? []);

      const currentIsHost = sessionStorage.getItem(SESSION_IS_HOST) === 'true';
      if (!currentIsHost) {
        const currentPlayerId = sessionStorage.getItem(SESSION_PLAYER_ID);
        const currentName = sessionStorage.getItem(SESSION_PLAYER_NAME);
        if ((!currentPlayerId || currentPlayerId === '') && currentName) {
          const match = room.players.find((p: any) => p.name === currentName);
          if (match) {
            console.log('🎮 [onRoomState] resolved player playerId:', match.playerId);
            setLocalPlayerId(match.playerId);
            sessionStorage.setItem(SESSION_PLAYER_ID, match.playerId);
          }
        }
      }
    }, [setRoom]),

    onWaitingRoomUpdate: useCallback((data: { players: any[] }) => {
      console.log('🎮 [Elimination] waiting room update, players:', data.players.length);
      setWaitingPlayers(data.players);
      updatePlayers(data.players);
    }, [updatePlayers]),

    onGameStarted: useCallback(() => {
      onGameStarted();
    }, [onGameStarted]),

    onRoundIntro: useCallback((data: RoundIntroPayload) => {
      setIntroPayload(data);
      playRoundIntro();
      onRoundIntro(data);
    }, [onRoundIntro]),

    onRoundStarted: useCallback((data: RoundStartedPayload) => {
      setIntroPayload(null);
      setWaitingPlayers(prev =>
        prev.map((p: any) => ({ ...p, hasSubmittedCurrentRound: false }))
      );
      playRoundStart();
      onRoundStarted(data);
    }, [onRoundStarted]),

    onSubmissionReceived: useCallback((data: { playerId: string; roundId: string }) => {
      onSubmissionSent();
      if (data?.playerId) {
        setWaitingPlayers(prev =>
          prev.map((p: any) =>
            p.playerId === data.playerId
              ? { ...p, hasSubmittedCurrentRound: true }
              : p
          )
        );
      }
    }, [onSubmissionSent]),

    onRoundReveal: useCallback((data: RoundRevealPayload) => {
      console.log('🎮 [Elimination] round reveal, round:', data.roundNumber);
      playReveal();
      onRoundReveal(data.results, data.roundNumber, data.roundType);
    }, [onRoundReveal]),

    onRoundResults: useCallback((data: RoundResultsPayload) => {
      onRoundResults(data.results, [], data.roundNumber);
    }, [onRoundResults]),

    onPlayersEliminated: useCallback((data: EliminatedPayload) => {
      onRoundResults(state.lastResults ?? [], data.eliminatedPlayerIds, data.roundNumber);
      setWaitingPlayers(prev =>
        prev.map(p =>
          data.eliminatedPlayerIds.includes(p.playerId)
            ? { ...p, eliminated: true }
            : p
        )
      );
    }, [onRoundResults, state.lastResults]),

    onNextRound: useCallback(() => {
      // transition handled by round intro socket event
    }, []),

    onWinnerDeclared: useCallback((data: WinnerPayload) => {
      onWinnerDeclared(data);
    }, [onWinnerDeclared]),

    onRoomEnded: useCallback(() => {
      console.log('🎮 [Elimination] ROOM_ENDED received — cleaning up');
      handleCleanupAndNavigate();
    }, [handleCleanupAndNavigate]),

    onRoomCancelled: useCallback(() => {
  console.log('🎮 [Elimination] Room cancelled — cleaning up');
  handleCleanupAndNavigate();
}, [handleCleanupAndNavigate]),

    onError: useCallback((data: { message: string }) => {
      console.warn('🎮 [Elimination] Socket error:', data.message);
      if (data.message === 'Room not found') {
        console.log('🎮 [Elimination] Stale session — clearing and returning to lobby');
        clearEliminationSession();
        setRoomId(null);
        setLocalPlayerId(null);
      } else {
        setError(data.message);
      }
    }, [setError]),
  });

  // ── Reconnect on mount ────────────────────────────────────────────────────
  const initialRoomId = sessionStorage.getItem(SESSION_ROOM_ID);
  const initialIsHost = sessionStorage.getItem(SESSION_IS_HOST) === 'true';
  const initialHostId = sessionStorage.getItem(SESSION_HOST_ID);
  const initialPlayerId = sessionStorage.getItem(SESSION_PLAYER_ID);
  const initialName = sessionStorage.getItem(SESSION_PLAYER_NAME) ?? '';

  useEffect(() => {
    const hasHostSession = initialRoomId && initialIsHost && initialHostId;
    const hasPlayerSession = initialRoomId && !initialIsHost && initialPlayerId;
    if (!hasHostSession && !hasPlayerSession) return;

    const idToCheck = initialRoomId!;

    fetch(`/api/elimination/rooms/${idToCheck}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          console.log('🎮 [Elimination] Stale session — room gone, clearing');
          clearEliminationSession();
          return;
        }
        if (hasHostSession) {
          console.log('🎮 [Elimination] Reconnecting host:', { roomId: idToCheck, hostId: initialHostId });
          setIsHost(true);
          setLocalPlayerId(initialHostId!);
          setLocalPlayerName(initialName);
          setRoomId(idToCheck);
          emitHostJoin(idToCheck, initialHostId!);
        } else if (hasPlayerSession) {
          console.log('🎮 [Elimination] Reconnecting player:', { roomId: idToCheck, playerId: initialPlayerId });
          emitJoinRoom(idToCheck, initialName, initialPlayerId!);
        }
      })
      .catch(() => {
        clearEliminationSession();
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleJoined = useCallback((
    newRoomId: string,
    newPlayerId: string,
    name: string,
    host: boolean,
  ) => {
    console.log('🎮 [Elimination] handleJoined called:', { newRoomId, newPlayerId, name, host });
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

  // handleReset — manual "Return to lobby" button
  const handleReset = useCallback(() => {
    handleCleanupAndNavigate();
  }, [handleCleanupAndNavigate]);

  // ── Render ────────────────────────────────────────────────────────────────
  const room = state.room;
  const localPlayer = state.localPlayer ?? room?.players.find(p => p.playerId === localPlayerId);

  // LOBBY — no room joined yet
  if (!roomId) {
    return <EliminationLobbyPage onJoined={handleJoined} />;
  }

  // WAITING ROOM
  if (state.view === 'lobby' || state.view === 'waiting') {
    return (
 <EliminationWaitingRoom
  roomId={roomId}
  players={waitingPlayers}
  isHost={isHost}
  localPlayerId={localPlayerId ?? ''}
  onStart={handleStart}
  onLeave={handleReset}
  minPlayers={2}
  roomData={state.room}
  hostId={sessionStorage.getItem(SESSION_HOST_ID) ?? undefined}
  onCancelled={handleReset}
/>
    );
  }

  // ROUND INTRO
  if (state.view === 'round_intro' && introPayload) {
    return (
      <EliminationRoundIntro
        payload={introPayload}
        introDurationMs={introPayload.introDurationMs ?? 10000}
        introCountdownMs={introPayload.introCountdownMs ?? 5000}
      />
    );
  }

  // ROUND ACTIVE
  if (state.view === 'round_active' && state.activeRound) {
    const hasSubmitted = localPlayer?.hasSubmittedCurrentRound ?? false;
    const rc = getRoundColour(state.activeRound.roundNumber);
    const isUrgent = roundTimer.secondsRemaining <= 3;

    return (
      <div className="min-h-screen flex flex-col" style={{ ...styles.page, background: BASE_BG }}>
        {/* Colour bleed */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '180px',
          background: `linear-gradient(180deg, ${rc.tint} 0%, transparent 100%)`,
          pointerEvents: 'none',
        }} />

        {/* HUD */}
        <div style={styles.hud}>
          <div style={styles.hudLeft}>
            <span style={{ ...styles.hudRound, color: `${rc.primary}99` }}>
              Round {state.activeRound.roundNumber} of 8
            </span>
            <span style={{
              ...styles.hudType,
              fontFamily: "'Bebas Neue', 'Impact', sans-serif",
              fontSize: '22px',
              letterSpacing: '0.02em',
            }}>
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
                filter: isUrgent
                  ? 'drop-shadow(0 0 12px #ff2d5566)'
                  : `drop-shadow(0 0 8px ${rc.glow})`,
              }}>
                {roundTimer.secondsRemaining}
              </div>
            )}
          </div>
        </div>

        {/* Timer bar */}
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

        {/* Instruction bar */}
        <div style={{
          ...styles.instructionBar,
          borderBottom: `1px solid ${rc.primary}22`,
          color: hasSubmitted ? `${rc.primary}bb` : 'rgba(255,255,255,0.75)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {hasSubmitted
            ? '✓ Locked in — waiting for others'
            : ROUND_INSTRUCTIONS[state.activeRound.roundType]}
        </div>

        <style>{`
          @keyframes pulse {
            from { opacity: 1; box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
            to   { opacity: 0.85; box-shadow: 0 0 0 6px rgba(255,255,255,0); }
          }
        `}</style>

        {/* Round component */}
        <div
          className="flex-1 flex items-center justify-center"
          style={{ padding: '8px', overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}
        >
          {isHost ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: '12px', padding: '24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👁</div>
              <p style={{
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Inter',
                fontSize: '14px',
                margin: 0,
              }}>
                You are the host — watching live
              </p>
              <div style={{
                marginTop: '8px', padding: '12px 20px', borderRadius: '8px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <p style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  margin: 0,
                  letterSpacing: '0.06em',
                }}>
                  {waitingPlayers.filter((p: any) => p.hasSubmittedCurrentRound).length}
                  {' / '}
                  {waitingPlayers.filter((p: any) => !p.eliminated).length} submitted
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              maxWidth: 'min(420px, 100vw - 16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              <EliminationRoundRenderer
                activeRound={state.activeRound}
                playerId={localPlayerId ?? ''}
                hasSubmitted={hasSubmitted}
                onSubmit={handleSubmit}
              />
            </div>
          )}
        </div>

        {/* Error toast */}
        {state.error && (
          <div style={styles.errorToast}>{state.error}</div>
        )}
      </div>
    );
  }

  // REVEAL
  if (state.view === 'round_reveal' && state.lastResults) {
    if (isHost) {
      return (
        <EliminationHostReveal
          activeRound={state.activeRound}
          results={state.lastResults}
          players={waitingPlayers}
          onContinue={advanceFromReveal}
          autoAdvanceMs={10000}
        />
      );
    }
    return (
      <EliminationRevealPanel
        activeRound={state.activeRound}
        localPlayerId={localPlayerId ?? ''}
        results={state.lastResults}
        onContinue={advanceFromReveal}
        autoAdvanceMs={10000}
      />
    );
  }

  // RESULTS
  if (state.view === 'round_results' && state.lastResults) {
    return (
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

  // ELIMINATED
  if (state.view === 'eliminated') {
    return (
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

  // GAME OVER for eliminated players
  if (state.view === 'game_over') {
    return (
      <EliminationEliminatedView
        playerName={localPlayerName}
        eliminatedInRound={localPlayer?.eliminatedInRound ?? 0}
        activePlayers={0}
        totalPlayers={waitingPlayers.length}
        gameOver={true}
        winnerName={state.winner?.winnerName}
        onLeave={handleReset}
        autoLeaveSeconds={60}
      />
    );
  }

  // WINNER
  if (state.view === 'winner' && state.winner) {
    return (
      <EliminationWinnerView
        winnerId={state.winner.winnerId}
        winnerName={state.winner.winnerName}
        finalStandings={state.winner.finalStandings}
        players={waitingPlayers}
        localPlayerId={localPlayerId ?? ''}
        onClose={handleReset}
        isHost={isHost}
        hostId={sessionStorage.getItem(SESSION_HOST_ID) ?? undefined}
        roomId={roomId ?? undefined}
        roomData={state.room as any}
      />
    );
  }

  // FALLBACK
  return (
    <div className="min-h-screen flex items-center justify-center" style={styles.page}>
      <div style={{
        textAlign: 'center',
        color: 'rgba(255,255,255,0.3)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>⟳</div>
        <div>Connecting…</div>
        {state.error && (
          <div style={{ color: '#ff3b5c', marginTop: '8px', fontSize: '13px' }}>
            {state.error}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Round instructions ───────────────────────────────────────────────────────
const ROUND_INSTRUCTIONS: Record<string, string> = {
  true_centre:      'Tap the exact centre of the shape',
  midpoint_split:   'Tap the exact midpoint between A and B',
  stop_the_bar:     'Tap STOP when the marker hits the target',
  draw_angle:       'Drag the line to match the target angle',
  flash_grid:       'Tap the cells that lit up',
  quick_count:      'Enter how many dots you saw',
  flash_maths:      'Enter the total of all numbers shown',
  line_length:      'Drag to match the reference line length',
  balance_point:    'Tap where the beam would balance',
  pattern_align:    'Move and rotate the shape to match the target',
  sequence_gap:     'What number is missing from the sequence?',
  colour_count:     'Count the target colour shapes',
  time_estimation:  'Tap when the target time has passed',
  character_count:  'Count the target characters',
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    background: BASE_BG,
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
    color: '#ffffff',
    minHeight: '100vh',
  },
  hud: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px 10px',
  },
  hudLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  hudRound: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
  },
  hudType: {
    fontSize: '17px',
    fontWeight: 700,
    color: '#ffffff',
  },
  hudTimer: {
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    transition: 'color 0.3s',
  },
  timerTrack: {
    height: '3px',
    background: 'rgba(255,255,255,0.06)',
    width: '100%',
  },
  timerBar: {
    height: '100%',
    transition: 'background 0.3s',
    borderRadius: '0 2px 2px 0',
  },
  instructionBar: {
    padding: '10px 20px',
    fontSize: '15px',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '0.03em',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  roundEyebrow: {
    fontSize: '11px',
    letterSpacing: '0.25em',
    color: 'rgba(0,229,255,0.5)',
    fontFamily: "'Inter', system-ui, sans-serif",
    textTransform: 'uppercase',
    marginBottom: '12px',
  },
  roundIntroTitle: {
    fontSize: '42px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: '0 0 12px',
  },
  roundInstruction: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.45)',
    marginBottom: '32px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  introCountdown: {
    fontSize: '96px',
    fontWeight: 800,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#00e5ff',
    lineHeight: 1,
    filter: 'drop-shadow(0 0 30px rgba(0,229,255,0.5))',
    marginBottom: '16px',
  },
  activePlayers: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '0.1em',
  },
  errorToast: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(255,59,92,0.15)',
    border: '1px solid rgba(255,59,92,0.5)',
    color: '#ff3b5c',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '13px',
    fontFamily: "'Inter', system-ui, sans-serif",
    whiteSpace: 'nowrap',
    zIndex: 100,
  },
};