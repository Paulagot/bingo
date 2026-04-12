import { useEffect, useState } from 'react';
import type { RoundIntroPayload, RoundType } from './types/elimination';
import { getRoundColour } from './utils/designTokens';

interface Props {
  payload: RoundIntroPayload;
  introDurationMs: number;
  introCountdownMs: number;
}

const ROUND_TYPE_META: Record<RoundType, { label: string; glyph: string; description: string }> = {
  true_centre: {
    label: 'True Centre',
    glyph: '◎',
    description: 'Tap the exact geometric centre of the shape',
  },
  midpoint_split: {
    label: 'Midpoint Split',
    glyph: '⊕',
    description: 'Tap the exact midpoint between the two markers',
  },
  stop_the_bar: {
    label: 'Stop the Bar',
    glyph: '⏸',
    description: 'Tap STOP when the marker aligns with the target zone',
  },
  draw_angle: {
    label: 'Draw Angle',
    glyph: '∠',
    description: 'Drag the line to match the target angle shown briefly',
  },
  flash_grid: {
    label: 'Flash Grid',
    glyph: '⊞',
    description: 'Remember which cells light up, then tap them from memory',
  },
  quick_count: {
    label: 'Quick Count',
    glyph: '∷',
    description: 'Count the dots before they disappear and enter the total',
  },
  flash_maths: {
    label: 'Flash Maths',
    glyph: '∑',
    description: 'Add up the numbers shown on screen before they vanish',
  },
  line_length: {
    label: 'Line Length',
    glyph: '↔',
    description: 'Drag to match the length of the reference line from memory',
  },
  balance_point: {
    label: 'Balance Point',
    glyph: '⚖',
    description: 'Tap where the weighted beam would perfectly balance',
  },
  pattern_align: {
    label: 'Pattern Align',
    glyph: '◈',
    description: 'Move and rotate the shape to match the target position shown briefly',
  },
  sequence_gap: {
    label: 'Sequence Gap',
    glyph: '…',
    description: 'A number sequence flashes with one value missing — estimate what it was',
  },
  colour_count: {
    label: 'Colour Count',
    glyph: '⬤',
    description: 'Coloured shapes flash — count how many match the target colour',
  },
  time_estimation: {
    label: 'Time Estimation',
    glyph: '⏱',
    description: 'No clock shown — tap when you think the target time has passed',
  },
  character_count: {
    label: 'Character Count',
    glyph: 'A?',
    description: 'Letters flash on screen — count how many match the target character',
  },
  reaction_tap: {
  label: 'Reaction Tap',
  glyph: '⚡',
  description: 'Tap as fast as possible in the center of the target when the target flashes',
},
moving_target_tap: {
  label: 'Moving Target',
  glyph: '🎯',
  description: 'Tap the moving target as accurately as possible',
},
path_trace: {
  label: 'Path Trace',
  glyph: '✏️',
  description: 'Trace the path as closely as possible from memory',
},
};

const ELIMINATION_DESCRIPTIONS: Record<string, (count: number, active: number) => string> = {
  none: () => 'No eliminations this round — precision practice',
  percentage: (count) => `The ${count} least precise player${count === 1 ? '' : 's'} will be eliminated`,
  reduce_to_three: (count) => `${count} players will be cut — only 3 advance to the final`,
  final: () => 'One player wins — everyone else is eliminated',
};

// Typewriter text component with blinking cursor
const TypewriterText: React.FC<{ text: string; style?: React.CSSProperties }> = ({ text, style }) => {
  const displayed = useTypewriter(text, 90);
  const done = displayed.length >= text.length;
  return (
    <p style={style}>
      {displayed}
      {!done && (
        <span style={{
          display: 'inline-block',
          width: '2px',
          height: '1em',
          background: 'currentColor',
          marginLeft: '2px',
          verticalAlign: 'text-bottom',
          animation: 'blink 0.7s step-end infinite',
        }} />
      )}
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </p>
  );
};

// Typewriter hook — reveals text one character at a time
const useTypewriter = (text: string, delay = 35): string => {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, delay);
    return () => clearInterval(interval);
  }, [text, delay]);
  return displayed;
};

export const EliminationRoundIntro: React.FC<Props> = ({
  payload,
  introDurationMs,
  introCountdownMs,
}) => {
  const [phase, setPhase] = useState<'reading' | 'countdown'>('reading');
  const [countdown, setCountdown] = useState(Math.ceil(introCountdownMs / 1000));
  const [visible, setVisible] = useState(false);

  const readingMs = introDurationMs - introCountdownMs;
  const meta = ROUND_TYPE_META[payload.roundType];
  const rc = getRoundColour(payload.roundNumber);
  const elimDesc = ELIMINATION_DESCRIPTIONS[payload.eliminationMode]?.(
    payload.eliminationCount,
    payload.activePlayers,
  ) ?? '';

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Switch from reading to countdown phase
  useEffect(() => {
    const t = setTimeout(() => setPhase('countdown'), readingMs);
    return () => clearTimeout(t);
  }, [readingMs]);

  // Tick countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const isEliminating = payload.eliminationMode !== 'none';
  const isFinal = payload.roundNumber === payload.totalRounds;

  return (
    <div
      style={{
        ...s.page,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      {/* Top bar */}
      <div style={s.topBar}>
        <span style={s.roundLabel}>
          Round {payload.roundNumber} / {payload.totalRounds}
        </span>
        <span style={{
          ...s.roundBadge,
          background: isFinal ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)',
          color: isFinal ? '#ffd700' : 'rgba(255,255,255,0.4)',
          border: isFinal ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.1)',
        }}>
          {isFinal ? 'FINAL ROUND' : `${payload.activePlayers} players`}
        </span>
      </div>

      {/* Main content */}
      <div style={s.body}>
        {/* Round type glyph */}
        <div style={{ ...s.glyph, color: rc.primary, filter: `drop-shadow(0 0 24px ${rc.glow})` }}>{meta.glyph}</div>

        {/* Round type name */}
        <h1 style={s.title}>{meta.label}</h1>

        {/* Instruction */}
        <TypewriterText text={meta.description} style={s.instruction} />

        {/* Divider */}
        <div style={s.divider} />

        {/* Elimination info */}
        <div style={{
          ...s.elimBox,
          borderColor: isEliminating
            ? isFinal ? 'rgba(255,215,0,0.2)' : 'rgba(255,59,92,0.2)'
            : 'rgba(255,255,255,0.06)',
          background: isEliminating
            ? isFinal ? 'rgba(255,215,0,0.05)' : 'rgba(255,59,92,0.05)'
            : 'rgba(255,255,255,0.02)',
        }}>
          <div style={s.elimLabel}>
            {isEliminating ? (isFinal ? '◆ FINAL' : '✕ ELIMINATION') : '○ NO ELIMINATION'}
          </div>
          <div style={{
            ...s.elimText,
            color: isEliminating
              ? isFinal ? '#ffd700' : '#ff3b5c'
              : 'rgba(255,255,255,0.35)',
          }}>
            {elimDesc}
          </div>
          {isEliminating && !isFinal && (
            <div style={s.elimRule}>
              Furthest from the correct answer is eliminated
            </div>
          )}
        </div>
      </div>

      {/* Bottom countdown */}
      <div style={s.bottom}>
        {phase === 'reading' ? (
          <div style={s.getReadyText}>Get ready…</div>
        ) : (
          <div style={s.countdownWrapper}>
            <div style={{
              ...s.countdownNumber,
              color: countdown <= 2 ? '#ff3b5c' : '#ffffff',
              transform: `scale(${countdown === 0 ? 1.2 : 1})`,
              transition: 'transform 0.15s ease, color 0.3s ease',
            }}>
              {countdown === 0 ? 'GO' : countdown}
            </div>
            <div style={s.countdownLabel}>
              {countdown === 0 ? '' : 'starting in'}
            </div>
          </div>
        )}
      </div>

      {/* Progress bar at very bottom */}
      <div style={s.progressTrack}>
        <div style={{
          ...s.progressBar,
          width: phase === 'reading' ? '50%' : `${50 + 50 * (1 - countdown / Math.ceil(introCountdownMs / 1000))}%`,
          transition: phase === 'reading' ? `width ${readingMs}ms linear` : 'width 1s linear',
        }} />
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0a0a0f',
    fontFamily: "'Barlow Condensed', sans-serif",
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 0',
  },
  roundLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '11px',
    letterSpacing: '0.2em',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
  },
  roundBadge: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 28px',
    textAlign: 'center',
    gap: '16px',
  },
  glyph: {
    fontSize: '56px',
    lineHeight: 1,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: '4px',
    filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.15))',
  },
  title: {
    fontSize: '52px',
    fontWeight: 900,
    letterSpacing: '0.01em',
    margin: '0',
    lineHeight: 1.0,
    fontFamily: "'Barlow Condensed', sans-serif",
    textTransform: 'uppercase',
  },
  instruction: {
    fontSize: '17px',
    color: 'rgba(255,255,255,0.65)',
    margin: '0',
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.6,
    maxWidth: '300px',
  },
  divider: {
    width: '32px',
    height: '1px',
    background: 'rgba(255,255,255,0.1)',
    margin: '4px 0',
  },
  elimBox: {
    width: '100%',
    maxWidth: '320px',
    padding: '16px 20px',
    borderRadius: '10px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    textAlign: 'left',
  },
  elimLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
  },
  elimText: {
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  elimRule: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.02em',
    marginTop: '4px',
  },
  bottom: {
    padding: '0 24px 40px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100px',
  },
  getReadyText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '13px',
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
  },
  countdownWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  countdownNumber: {
    fontSize: '80px',
    fontWeight: 800,
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1,
    letterSpacing: '-0.04em',
  },
  countdownLabel: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: 'rgba(255,255,255,0.06)',
  },
  progressBar: {
    height: '100%',
    background: 'rgba(255,255,255,0.4)',
    borderRadius: '0 1px 1px 0',
  },
};