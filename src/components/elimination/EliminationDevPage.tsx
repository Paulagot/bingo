/**
 * EliminationDevPage.tsx
 *
 * Route: /elimination/dev
 *
 * A developer tool for testing individual round types without going through
 * the full lobby/room/player flow. Connects to the real socket, calls the
 * dev endpoint, and renders the full player experience.
 */

import React, { useState, useCallback, useEffect} from 'react';
import { useEliminationGame } from './hooks/useEliminationGame';
import { useEliminationSocket } from './hooks/useEliminationSocket';
import { useRoundTimer } from './hooks/useRoundTimer';
import { EliminationRoundRenderer } from './EliminationRoundRenderer';
import { EliminationRoundIntro } from './EliminationRoundIntro';
import { EliminationRevealPanel } from './EliminationRevealPanel';
import { EliminationResultsPanel } from './EliminationResultsPanel';
import { EliminationSoundToggle } from './EliminationSoundToggle';
import { emitSubmitAnswer, emitStartPress, getSocket } from './services/eliminationSocket';
import { roundTypeLabel } from './utils/eliminationHelpers';
import { getRoundColour, BASE_BG } from './utils/designTokens';
import { playRoundStart, playRoundIntro, playReveal, playSubmit, playCountdownTick } from './utils/sounds';
import type {
  RoundSubmission,
  RoundIntroPayload,
  RoundStartedPayload,
  RoundRevealPayload,
  RoundResultsPayload,
  RoundType,
} from './types/elimination';

// ─── All 17 round types ───────────────────────────────────────────────────────
const ROUND_TYPES: { type: RoundType; label: string; icon: string; description: string }[] = [
  { type: 'true_centre',      label: 'True Centre',      icon: '🎯', description: 'Tap the geometric centre of a shape' },
  { type: 'midpoint_split',   label: 'Midpoint Split',   icon: '📍', description: 'Drag the marker to the midpoint between two anchors' },
  { type: 'stop_the_bar',     label: 'Stop the Bar',     icon: '⏱', description: 'Tap STOP when the bar hits the target zone' },
  { type: 'draw_angle',       label: 'Draw Angle',       icon: '📐', description: 'Rotate the line to match the target angle' },
  { type: 'flash_grid',       label: 'Flash Grid',       icon: '🔲', description: 'Recall which cells lit up in the grid' },
  { type: 'quick_count',      label: 'Quick Count',      icon: '🔢', description: 'Count the dots shown briefly' },
  { type: 'flash_maths',      label: 'Flash Maths',      icon: '➕', description: 'Sum the numbers shown briefly' },
  { type: 'line_length',      label: 'Line Length',      icon: '📏', description: 'Drag to match the memorised line length' },
  { type: 'balance_point',    label: 'Balance Point',    icon: '⚖️', description: 'Tap where the beam would balance' },
  { type: 'pattern_align',    label: 'Pattern Align',    icon: '🔄', description: 'Move and rotate the shape to match the target' },
  { type: 'sequence_gap',     label: 'Sequence Gap',     icon: '🔍', description: 'Estimate the missing value in the sequence' },
  { type: 'colour_count',     label: 'Colour Count',     icon: '🎨', description: 'Count the target colour shapes' },
  { type: 'time_estimation',  label: 'Time Estimation',  icon: '⏰', description: 'Tap when the target time has elapsed' },
  { type: 'character_count',  label: 'Character Count',  icon: '🔤', description: 'Count the target character occurrences' },

  { type: 'reaction_tap',      label: 'Reaction Tap',      icon: '⚡', description: 'Tap as fast as possible when the target appears' },
  { type: 'moving_target_tap', label: 'Moving Target Tap', icon: '🎯', description: 'Tap the moving target as accurately as possible' },
  { type: 'path_trace',        label: 'Path Trace',        icon: '✏️', description: 'Memorise the path, then trace it from memory' },
];

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
   reaction_tap:      'Wait for the target, then tap it as fast as you can',
  moving_target_tap: 'Tap the moving target as accurately as possible',
  path_trace:        'Memorise the path, then trace it from start to finish',
};

// ─── Component ────────────────────────────────────────────────────────────────
export const EliminationDevPage: React.FC = () => {

  const [selectedType, setSelectedType] = useState<string>('flash_grid');
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const difficulty = 1 + (roundNumber - 1) * 0.15;
  const [status, setStatus] = useState<'idle' | 'connecting' | 'playing' | 'done'>('idle');
  const [error, setErrorMsg] = useState<string | null>(null);

  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [introPayload, setIntroPayload] = useState<RoundIntroPayload | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);

  const {
    state,
    setRoom,
    onGameStarted,
    onRoundIntro,
    onRoundStarted,
    onSubmissionSent,
    onRoundReveal,
    onRoundResults,
    advanceFromReveal,
    onRoomEnded,
  } = useEliminationGame(playerId);

  const roundTimer = useRoundTimer(
    state.activeRound?.endsAt ?? null,
    state.view === 'round_active',
  );

  useEffect(() => {
    if (
      state.view === 'round_active' &&
      roundTimer.secondsRemaining <= 3 &&
      roundTimer.secondsRemaining > 0
    ) {
      playCountdownTick();
    }
  }, [state.view, roundTimer.secondsRemaining]);

  useEliminationSocket({
    onRoomState: useCallback((data: any) => {
      setRoom(data.roomSnapshot ?? data);
    }, [setRoom]),

    onWaitingRoomUpdate: useCallback(() => {}, []),

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
      playRoundStart();
      onRoundStarted(data);
    }, [onRoundStarted]),

    onSubmissionReceived: useCallback(() => {
      onSubmissionSent();
    }, [onSubmissionSent]),

    onRoundReveal: useCallback((data: RoundRevealPayload) => {
      playReveal();
      const myResult = data.results?.find((r: any) => r.playerId === playerId);
      if (myResult) setLastScore(myResult.score);
      onRoundReveal(data.results, data.roundNumber, data.roundType);
    }, [onRoundReveal, playerId]),

    onRoundResults: useCallback((data: RoundResultsPayload) => {
      onRoundResults(data.results, [], data.roundNumber);
    }, [onRoundResults]),

    onPlayersEliminated: useCallback(() => {}, []),
    onNextRound: useCallback(() => {}, []),
    onWinnerDeclared: useCallback(() => {}, []),

    onRoomEnded: useCallback(() => {
      onRoomEnded();
      setStatus('done');
    }, [onRoomEnded]),

    onRoomCancelled: useCallback(() => {
      onRoomEnded();
      setStatus('done');
    }, [onRoomEnded]),

    onError: useCallback((data: { message: string }) => {
      setErrorMsg(data.message);
      setStatus('idle');
    }, []),
  });

  const handleStart = useCallback(async () => {
    setErrorMsg(null);
    setLastScore(null);
    setStatus('connecting');

    try {
      const socket = getSocket();
      if (!socket?.id) throw new Error('Socket not connected. Reload the page and try again.');

      const res = await fetch('/api/elimination/dev/start-round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundType: selectedType, difficulty, socketId: socket.id }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Failed to start round');

      setRoomId(data.roomId);
      setPlayerId(data.playerId);
      setStatus('playing');

    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('idle');
    }
  }, [selectedType, roundNumber]);

  const handleSubmit = useCallback((submission: RoundSubmission) => {
    if (!roomId || !playerId) return;
    emitSubmitAnswer(roomId, playerId, submission);
    playSubmit();
    onSubmissionSent();
  }, [roomId, playerId, onSubmissionSent]);

  // Emits server-side START press timestamp for Time Estimation scoring
  const handleStartPress = useCallback((roundId: string, pid: string) => {
    if (!roomId) return;
    emitStartPress(roomId, pid, roundId);
  }, [roomId]);

  const handlePlayAgain = useCallback(() => {
    setStatus('idle');
    setRoomId(null);
    setPlayerId(null);
    setIntroPayload(null);
    setLastScore(null);
  }, []);

  // ── Render: playing states ─────────────────────────────────────────────────
  if (status === 'playing' || status === 'done') {

    if (state.view === 'round_intro' && introPayload) {
      return (
        <div>
          <DevBanner onExit={handlePlayAgain} roundType={selectedType} roundNumber={roundNumber} />
          <EliminationRoundIntro
            payload={introPayload}
            introDurationMs={introPayload.introDurationMs ?? 10000}
            introCountdownMs={introPayload.introCountdownMs ?? 5000}
          />
        </div>
      );
    }

    if (state.view === 'round_active' && state.activeRound) {
      const hasSubmitted = state.localPlayer?.hasSubmittedCurrentRound ?? false;
      const rc = getRoundColour(state.activeRound.roundNumber);
      const isUrgent = roundTimer.secondsRemaining <= 3;

      return (
        <div style={{ background: BASE_BG, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
          <DevBanner onExit={handlePlayAgain} roundType={selectedType} roundNumber={roundNumber} />

          <div style={{
            position: 'absolute', top: 44, left: 0, right: 0, height: '160px',
            background: `linear-gradient(180deg, ${rc.tint} 0%, transparent 100%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px 10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontFamily: "'Inter', system-ui", fontSize: '11px', color: `${rc.primary}99`, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Round 1 of 1
              </span>
              <span style={{ fontFamily: "'Bebas Neue', Impact, sans-serif", fontSize: '22px', letterSpacing: '0.02em', color: '#fff' }}>
                {roundTypeLabel(state.activeRound.roundType).toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <EliminationSoundToggle />
              {state.activeRound.roundType !== 'time_estimation' && (
                <div style={{
                  fontFamily: "'Inter', system-ui",
                  fontSize: '42px',
                  fontWeight: 800,
                  color: isUrgent ? '#ff3b5c' : rc.primary,
                  filter: isUrgent ? 'drop-shadow(0 0 12px #ff2d5566)' : `drop-shadow(0 0 8px ${rc.glow})`,
                }}>
                  {roundTimer.secondsRemaining}
                </div>
              )}
            </div>
          </div>

          {state.activeRound.roundType !== 'time_estimation' && (
            <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', width: '100%' }}>
              <div style={{
                height: '100%',
                width: `${(1 - roundTimer.progress) * 100}%`,
                background: isUrgent ? '#ff3b5c' : rc.primary,
                boxShadow: `0 0 8px ${isUrgent ? '#ff3b5c66' : rc.glow}`,
                borderRadius: '0 2px 2px 0',
                transition: 'background 0.3s',
              }} />
            </div>
          )}

          <div style={{
            padding: '10px 20px',
            fontSize: '15px',
            color: hasSubmitted ? `${rc.primary}bb` : 'rgba(255,255,255,0.75)',
            fontFamily: "'Inter', system-ui",
            letterSpacing: '0.03em',
            borderBottom: `1px solid ${rc.primary}22`,
          }}>
            {hasSubmitted ? '✓ Locked in — waiting for round to end' : ROUND_INSTRUCTIONS[state.activeRound.roundType]}
          </div>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', overflowY: 'auto', minHeight: 0 }}>
            <div style={{ width: '100%', maxWidth: 'min(420px, 100vw - 16px)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <EliminationRoundRenderer
                activeRound={state.activeRound}
                playerId={playerId ?? ''}
                hasSubmitted={hasSubmitted}
                onSubmit={handleSubmit}
                onStartPress={handleStartPress}
              />
            </div>
          </div>
        </div>
      );
    }

    if (state.view === 'round_reveal' && state.lastResults) {
      return (
        <div>
          <DevBanner onExit={handlePlayAgain} roundType={selectedType} roundNumber={roundNumber} />
          <EliminationRevealPanel
            activeRound={state.activeRound}
            localPlayerId={playerId ?? ''}
            results={state.lastResults}
            onContinue={advanceFromReveal}
            autoAdvanceMs={10000}
          />
        </div>
      );
    }

    if (state.view === 'round_results' && state.lastResults) {
      return (
        <div>
          <DevBanner onExit={handlePlayAgain} roundType={selectedType} roundNumber={roundNumber} />
          <EliminationResultsPanel
            results={state.lastResults}
            players={[]}
            roundNumber={1}
            roundType={selectedType}
            localPlayerId={playerId ?? ''}
            eliminatedIds={[]}
          />
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <button onClick={handlePlayAgain} style={btnStyle}>← Back to picker</button>
          </div>
        </div>
      );
    }

    if (status === 'done') {
      return (
        <div style={{ background: BASE_BG, minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>✓</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', system-ui", fontSize: '16px', marginBottom: '8px' }}>Round complete</div>
            {lastScore !== null && (
              <div style={{ color: '#00e5ff', fontFamily: "'Inter', system-ui", fontSize: '28px', fontWeight: 800 }}>
                Score: {Math.round(lastScore)}
              </div>
            )}
          </div>
          <button onClick={handlePlayAgain} style={btnStyle}>← Back to picker</button>
        </div>
      );
    }

    return (
      <div style={{ background: BASE_BG, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', system-ui", textAlign: 'center' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>⟳</div>
          Connecting…
        </div>
      </div>
    );
  }

  // ── Render: PICKER (idle) ─────────────────────────────────────────────────
  return (
    <div style={{ background: BASE_BG, minHeight: '100dvh', fontFamily: "'Inter', system-ui, sans-serif", color: '#fff', overflowY: 'auto' }}>

      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          display: 'inline-block', background: 'rgba(255,59,92,0.15)',
          border: '1px solid rgba(255,59,92,0.4)', borderRadius: '4px',
          padding: '3px 10px', fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.15em', color: '#ff3b5c', marginBottom: '12px', textTransform: 'uppercase',
        }}>
          Dev Mode
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 800, fontFamily: "'Bebas Neue', Impact, sans-serif", letterSpacing: '0.02em' }}>
          ROUND TESTER
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Pick any round, set difficulty, play it solo. No lobby. No players. No web3.
        </p>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Round Feel</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', system-ui" }}>difficulty {difficulty.toFixed(2)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '6px' }}>
          {[1,2,3,4,5,6,7,8].map((r) => {
            const selected = roundNumber === r;
            const label = r <= 2 ? 'Safe' : r <= 4 ? 'Easy' : r <= 6 ? 'Mid' : r === 7 ? 'Hard' : 'Final';
            const colour = r <= 2 ? '#00e5ff' : r <= 4 ? '#4ade80' : r <= 6 ? '#ffd60a' : '#ff3b5c';
            return (
              <button key={r} onClick={() => setRoundNumber(r)} style={{
                background: selected ? `${colour}22` : 'rgba(255,255,255,0.04)',
                border: selected ? `1.5px solid ${colour}99` : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px', padding: '8px 4px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              }}>
                <span style={{ fontSize: '15px', fontWeight: 800, color: selected ? colour : 'rgba(255,255,255,0.6)', fontFamily: "'Inter', system-ui" }}>{r}</span>
                <span style={{ fontSize: '8px', color: selected ? `${colour}cc` : 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
              </button>
            );
          })}
        </div>
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', system-ui" }}>
          Matches the exact difficulty a player would experience in round {roundNumber} of a real game.
        </p>
      </div>

      <div style={{ padding: '0 20px 100px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: '12px' }}>
          Pick a Round
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {ROUND_TYPES.map(({ type, label, icon, description }) => {
            const selected = selectedType === type;
            return (
              <button key={type} onClick={() => setSelectedType(type)} style={{
                background: selected ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.04)',
                border: selected ? '1.5px solid rgba(0,229,255,0.6)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px', padding: '12px', textAlign: 'left',
                cursor: 'pointer', transition: 'all 0.15s', color: '#fff',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '3px', color: selected ? '#00e5ff' : '#fff' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>{description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div style={{
          position: 'fixed', bottom: '96px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,59,92,0.15)', border: '1px solid rgba(255,59,92,0.5)',
          color: '#ff3b5c', padding: '10px 20px', borderRadius: '8px',
          fontSize: '13px', whiteSpace: 'nowrap', zIndex: 100,
        }}>
          {error}
        </div>
      )}

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px',
        background: `linear-gradient(0deg, ${BASE_BG} 60%, transparent)`, zIndex: 10,
      }}>
        <button onClick={handleStart} disabled={status === 'connecting'} style={{
          ...btnStyle, width: '100%', fontSize: '16px', padding: '16px',
          opacity: status === 'connecting' ? 0.6 : 1,
        }}>
          {status === 'connecting' ? 'Starting…' : `▶ Play ${ROUND_TYPES.find(r => r.type === selectedType)?.label ?? selectedType}`}
        </button>
      </div>
    </div>
  );
};

// ─── Dev banner ───────────────────────────────────────────────────────────────
const DevBanner: React.FC<{ onExit: () => void; roundType: string; roundNumber: number }> = ({ onExit, roundType, roundNumber }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, height: '36px',
    background: 'rgba(255,59,92,0.12)', borderBottom: '1px solid rgba(255,59,92,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', zIndex: 9999, backdropFilter: 'blur(8px)',
  }}>
    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', color: '#ff3b5c', textTransform: 'uppercase' }}>
      🛠 DEV · {roundType} · Round {roundNumber} feel
    </span>
    <button onClick={onExit} style={{
      background: 'rgba(255,59,92,0.2)', border: '1px solid rgba(255,59,92,0.4)',
      borderRadius: '4px', color: '#ff3b5c', fontSize: '10px', fontWeight: 700,
      letterSpacing: '0.1em', padding: '3px 10px', cursor: 'pointer', textTransform: 'uppercase',
    }}>
      Exit
    </button>
  </div>
);

// ─── Shared button style ──────────────────────────────────────────────────────
const btnStyle: React.CSSProperties = {
  background: 'rgba(0,229,255,0.12)',
  border: '1.5px solid rgba(0,229,255,0.5)',
  borderRadius: '12px',
  color: '#00e5ff',
  fontFamily: "'Inter', system-ui",
  fontSize: '14px',
  fontWeight: 700,
  padding: '14px 24px',
  cursor: 'pointer',
  letterSpacing: '0.03em',
  transition: 'all 0.15s',
};