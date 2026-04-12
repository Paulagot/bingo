import { useEffect, useState } from 'react';
import type {
  RoundResult,
  ActiveRound,
  TrueCentreReveal,
  MidpointSplitReveal,
  StopTheBarReveal,
  DrawAngleReveal,
  FlashGridReveal,
  QuickCountReveal,
  FlashMathsReveal,
  LineLengthReveal,
  BalancePointReveal,
  PatternAlignReveal,
  TrueCentreConfig,
  MidpointSplitConfig,
  StopTheBarConfig,
  ReactionTapReveal,
  MovingTargetTapReveal,
  PathTraceReveal,
  ReactionTapConfig,
  MovingTargetTapConfig,
  PathTraceConfig,
  SequenceGapReveal,
  ColourCountReveal,
  TimeEstimationReveal,
  CharacterCountReveal,
} from './types/elimination';

import { formatScore, roundTypeLabel } from './utils/eliminationHelpers';
import { getRoundColour } from './utils/designTokens';

interface Props {
  activeRound: ActiveRound | null;
  localPlayerId: string;
  results: RoundResult[];
  onContinue: () => void;
  autoAdvanceMs?: number;
}

export const EliminationRevealPanel: React.FC<Props> = ({
  activeRound, localPlayerId, results, onContinue, autoAdvanceMs = 10000,
}) => {
  const [countdown, setCountdown] = useState(Math.ceil(autoAdvanceMs / 1000));
  const [visible, setVisible] = useState(false);
  const [manualContinue, setManualContinue] = useState(false);

  const roundNumber = activeRound?.roundNumber ?? 0;
  const roundType = activeRound?.roundType ?? results[0]?.revealData?.roundType ?? 'true_centre';

  const rc = getRoundColour(roundNumber);
  const localResult = results.find(r => r.playerId === localPlayerId);
  const reveal = (localResult?.revealData ?? null) as AnyReveal | null;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!manualContinue) onContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onContinue, manualContinue]);

  const handleContinue = () => {
    setManualContinue(true);
    onContinue();
  };

  const errorPct = reveal ? `${(reveal.errorDistance * 100).toFixed(1)}%` : '—';
  const didSubmit = localResult?.didSubmit ?? false;

  const reactionTapReveal = reveal?.roundType === 'reaction_tap' ? (reveal as ReactionTapReveal) : null;
  const hasValidReactionMs =
    reactionTapReveal != null &&
    reactionTapReveal.reactionMs != null &&
    !isNaN(reactionTapReveal.reactionMs) &&
    !reactionTapReveal.earlyTap;

  return (
    // Full-screen backdrop — centres the content column on desktop
    <div style={{
      minHeight: '100svh',
      background: `radial-gradient(ellipse at 50% 0%, ${rc.tint} 0%, #0a0b0f 55%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.35s ease',
      overflowY: 'auto',
    }}>
      {/* Content column — max 520px on desktop, full width on mobile */}
      <div style={{
        width: '100%',
        maxWidth: '520px',
        display: 'flex',
        flexDirection: 'column',
        padding: '0 0 32px',
        color: '#ffffff',
        minHeight: '100svh',
      }}>

        {/* Header */}
        <div style={{ padding: '24px 24px 12px' }}>
          <div style={{
            fontSize: '11px',
            letterSpacing: '0.18em',
            color: 'rgba(255,255,255,0.3)',
            textTransform: 'uppercase',
            marginBottom: '4px',
            fontFamily: "'Inter', system-ui, sans-serif",
          }}>
            Round {roundNumber} · {roundTypeLabel(roundType)}
          </div>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 800,
            letterSpacing: '-0.01em',
            margin: 0,
            fontFamily: "'Bebas Neue', 'Impact', sans-serif",
          }}>
            Answer Reveal
          </h2>
        </div>

        {/* Visual reveal canvas — natural square size, never stretches */}
        <div style={{ padding: '0 20px', position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: '480px', margin: '0 auto', position: 'relative' }}>
            {reveal && activeRound?.config && (
              <RevealCanvas
                reveal={reveal}
                config={activeRound.config}
                roundId={activeRound.roundId ?? 'reveal'}
                colour={rc.primary}
              />
            )}
            {!didSubmit && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                pointerEvents: 'none',
              }}>
                <span style={{ fontSize: '28px', color: 'rgba(255,255,255,0.25)' }}>—</span>
                <span style={{
                  fontSize: '14px',
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.06em',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  No answer submitted
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Score summary */}
        {localResult && (
          <div style={{
            margin: '16px 20px 0',
            padding: '16px 20px',
            borderRadius: '12px',
            border: `1px solid ${rc.primary}30`,
            background: 'rgba(255,255,255,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={s.scoreRow}>
              <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Your score
              </span>
              <span style={{
                fontWeight: 700,
                color: rc.primary,
                fontFamily: "'Bebas Neue', 'Impact', sans-serif",
                fontSize: '32px',
              }}>
                {formatScore(localResult.score ?? 0)}
              </span>
            </div>

            <div style={s.scoreRow}>
              <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Error distance
              </span>
              <span style={{ ...s.scoreStat, fontFamily: "'Inter', system-ui, sans-serif" }}>
                {errorPct} off
              </span>
            </div>

            {(localResult.speedBonus ?? 0) > 0 && (
              <div style={s.scoreRow}>
                <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Speed bonus
                </span>
                <span style={{ ...s.scoreStat, color: '#30d158', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  +{localResult.speedBonus} pts ⚡
                </span>
              </div>
            )}

            {/* Reaction tap: reaction time */}
            {hasValidReactionMs && (
              <div style={s.scoreRow}>
                <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Reaction time
                </span>
                <span style={{ ...s.scoreStat, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  {Math.max(0, Math.round(reactionTapReveal!.reactionMs!))}ms
                </span>
              </div>
            )}

            {/* Reaction tap: early tap warning */}
            {reactionTapReveal?.earlyTap && (
              <div style={s.scoreRow}>
                <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Reaction time
                </span>
                <span style={{ ...s.scoreStat, color: '#ff3b5c', fontFamily: "'Inter', system-ui, sans-serif" }}>
                  Early tap ✕
                </span>
              </div>
            )}

            <div style={s.scoreRow}>
              <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Rank
              </span>
              <span style={{ ...s.scoreStat, fontFamily: "'Inter', system-ui, sans-serif" }}>
                #{localResult.rank} of {results.length}
              </span>
            </div>
          </div>
        )}

        {/* Flexible spacer — pushes footer down on tall screens */}
        <div style={{ flex: 1, minHeight: '16px' }} />

        {/* Footer */}
        <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={handleContinue}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${rc.primary}44`,
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              cursor: 'pointer',
              textTransform: 'uppercase',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            See scores →
          </button>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', system-ui, sans-serif" }}>
            Continuing in <span style={{ color: 'rgba(255,255,255,0.6)' }}>{countdown}s</span>
          </div>
        </div>

      </div>
    </div>
  );
};

// ─── Per-round-type reveal canvas ─────────────────────────────────────────────

type AnyReveal =
  | TrueCentreReveal | MidpointSplitReveal | StopTheBarReveal
  | DrawAngleReveal | FlashGridReveal | QuickCountReveal
  | FlashMathsReveal | LineLengthReveal | BalancePointReveal
  | PatternAlignReveal | SequenceGapReveal | ColourCountReveal
  | TimeEstimationReveal | CharacterCountReveal
  | ReactionTapReveal | MovingTargetTapReveal | PathTraceReveal;

interface RevealCanvasProps {
  reveal: AnyReveal;
  config: any;
  roundId: string;
  colour: string;
}

const RevealCanvas: React.FC<RevealCanvasProps> = ({ reveal, config, roundId, colour }) => {
  if (reveal.roundType === 'true_centre') {
    return <TrueCentreRevealCanvas reveal={reveal} config={config as TrueCentreConfig} colour={colour} roundId={roundId} />;
  }
  if (reveal.roundType === 'midpoint_split') {
    return <MidpointRevealCanvas reveal={reveal} config={config as MidpointSplitConfig} colour={colour} />;
  }
  if (reveal.roundType === 'stop_the_bar') {
    return <StopBarRevealCanvas reveal={reveal} config={config as StopTheBarConfig} colour={colour} />;
  }
  if (reveal.roundType === 'draw_angle') {
    return <DrawAngleRevealCanvas reveal={reveal as DrawAngleReveal} config={config} colour={colour} />;
  }
  if (reveal.roundType === 'quick_count') {
    return <QuickCountRevealCanvas reveal={reveal as QuickCountReveal} colour={colour} />;
  }
  if (reveal.roundType === 'flash_maths') {
    return <FlashMathsRevealCanvas reveal={reveal as FlashMathsReveal} colour={colour} />;
  }
  if (reveal.roundType === 'line_length') {
    return <LineLengthRevealCanvas reveal={reveal as LineLengthReveal} colour={colour} />;
  }
  if (reveal.roundType === 'balance_point') {
    return <BalancePointRevealCanvas reveal={reveal as BalancePointReveal} colour={colour} />;
  }
  if (reveal.roundType === 'flash_grid') {
    return <FlashGridRevealCanvas reveal={reveal as FlashGridReveal} colour={colour} />;
  }
  if (reveal.roundType === 'pattern_align') {
    return <PatternAlignRevealCanvas reveal={reveal as PatternAlignReveal} config={config} colour={colour} />;
  }
  if (reveal.roundType === 'sequence_gap') {
    return <SequenceGapRevealCanvas reveal={reveal as SequenceGapReveal} colour={colour} />;
  }
  if (reveal.roundType === 'colour_count') {
    return <ColourCountRevealCanvas reveal={reveal as ColourCountReveal} colour={colour} />;
  }
  if (reveal.roundType === 'time_estimation') {
    return <TimeEstimationRevealCanvas reveal={reveal as TimeEstimationReveal} colour={colour} />;
  }
  if (reveal.roundType === 'character_count') {
    return <CharacterCountRevealCanvas reveal={reveal as CharacterCountReveal} colour={colour} />;
  }
  if (reveal.roundType === 'reaction_tap') {
    return <ReactionTapRevealCanvas reveal={reveal as ReactionTapReveal} config={config as ReactionTapConfig} colour={colour} />;
  }
  if (reveal.roundType === 'moving_target_tap') {
    return <MovingTargetTapRevealCanvas reveal={reveal as MovingTargetTapReveal} config={config as MovingTargetTapConfig} colour={colour} />;
  }
  if (reveal.roundType === 'path_trace') {
    return <PathTraceRevealCanvas reveal={reveal as PathTraceReveal} config={config as PathTraceConfig} colour={colour} />;
  }
  return null;
};

// ─── Reaction Tap reveal ──────────────────────────────────────────────────────
const ReactionTapRevealCanvas: React.FC<{
  reveal: ReactionTapReveal;
  config: ReactionTapConfig;
  colour: string;
}> = ({ reveal, colour }) => {
  const reactionLabel = (() => {
    if (reveal.earlyTap) return 'EARLY TAP';
    if (reveal.reactionMs == null || isNaN(reveal.reactionMs)) return '—';
    return `${Math.max(0, Math.round(reveal.reactionMs))}ms`;
  })();

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.02)" />

      {/* Target zone — outer ring */}
      <circle
        cx={reveal.targetPosition.x * 100}
        cy={reveal.targetPosition.y * 100}
        r={reveal.targetRadius * 100}
        fill={`${colour}18`}
        stroke={colour}
        strokeWidth="0.8"
      />
      {/* Target zone — inner dot */}
      <circle
        cx={reveal.targetPosition.x * 100}
        cy={reveal.targetPosition.y * 100}
        r={Math.max(reveal.targetRadius * 100 * 0.34, 1.2)}
        fill={`${colour}55`}
      />

      {/* Player tap — white X with dotted line to target */}
      {reveal.playerTap && (
        <>
          <line
            x1={reveal.playerTap.x * 100 - 2.4} y1={reveal.playerTap.y * 100 - 2.4}
            x2={reveal.playerTap.x * 100 + 2.4} y2={reveal.playerTap.y * 100 + 2.4}
            stroke="#fff" strokeWidth="0.9" strokeLinecap="round"
          />
          <line
            x1={reveal.playerTap.x * 100 + 2.4} y1={reveal.playerTap.y * 100 - 2.4}
            x2={reveal.playerTap.x * 100 - 2.4} y2={reveal.playerTap.y * 100 + 2.4}
            stroke="#fff" strokeWidth="0.9" strokeLinecap="round"
          />
          <line
            x1={reveal.playerTap.x * 100} y1={reveal.playerTap.y * 100}
            x2={reveal.targetPosition.x * 100} y2={reveal.targetPosition.y * 100}
            stroke="rgba(255,255,255,0.18)" strokeWidth="0.35" strokeDasharray="1.5,1.5"
          />
          <text
            x={reveal.playerTap.x * 100 + 3} y={reveal.playerTap.y * 100 - 2}
            fill="rgba(255,255,255,0.5)" fontSize="3" fontFamily="'Inter', system-ui"
          >
            you
          </text>
        </>
      )}

      {/* Reaction time label */}
      <text
        x="50" y="10" textAnchor="middle"
        fill={reveal.earlyTap ? '#ff3b5c' : colour}
        fontSize="4.5"
        fontFamily="'Bebas Neue', 'Impact', sans-serif"
        letterSpacing="0.04em"
      >
        {reactionLabel}
      </text>
    </svg>
  );
};

// ─── Moving Target Tap reveal ─────────────────────────────────────────────────
const MovingTargetTapRevealCanvas: React.FC<{
  reveal: MovingTargetTapReveal;
  config: MovingTargetTapConfig;
  colour: string;
}> = ({ reveal, colour }) => {
  if (!reveal.targetPosition || !reveal.playerTap) return null;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.02)" />

      {/* Where the target was when player tapped */}
      <circle
        cx={reveal.targetPosition.x * 100}
        cy={reveal.targetPosition.y * 100}
        r={reveal.targetRadius * 100}
        fill={`${colour}18`}
        stroke={colour}
        strokeWidth="0.8"
      />
      <circle
        cx={reveal.targetPosition.x * 100}
        cy={reveal.targetPosition.y * 100}
        r={Math.max(reveal.targetRadius * 100 * 0.34, 1.2)}
        fill={`${colour}55`}
      />

      {/* Player tap — white X */}
      <line
        x1={reveal.playerTap.x * 100 - 2.4} y1={reveal.playerTap.y * 100 - 2.4}
        x2={reveal.playerTap.x * 100 + 2.4} y2={reveal.playerTap.y * 100 + 2.4}
        stroke="#fff" strokeWidth="0.9" strokeLinecap="round"
      />
      <line
        x1={reveal.playerTap.x * 100 + 2.4} y1={reveal.playerTap.y * 100 - 2.4}
        x2={reveal.playerTap.x * 100 - 2.4} y2={reveal.playerTap.y * 100 + 2.4}
        stroke="#fff" strokeWidth="0.9" strokeLinecap="round"
      />

      {/* Dotted line from tap to target */}
      <line
        x1={reveal.playerTap.x * 100} y1={reveal.playerTap.y * 100}
        x2={reveal.targetPosition.x * 100} y2={reveal.targetPosition.y * 100}
        stroke="rgba(255,255,255,0.25)" strokeDasharray="1.5 1.5" strokeWidth="0.4"
      />

      <text
        x={reveal.playerTap.x * 100 + 3} y={reveal.playerTap.y * 100 - 2}
        fill="rgba(255,255,255,0.5)" fontSize="3" fontFamily="'Inter', system-ui"
      >
        you
      </text>
    </svg>
  );
};

// ─── Path Trace reveal ────────────────────────────────────────────────────────
const pointsToRevealPath = (points: { x: number; y: number }[]): string =>
  points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 100} ${p.y * 100}`).join(' ');

const PathTraceRevealCanvas: React.FC<{
  reveal: PathTraceReveal;
  config: PathTraceConfig;
  colour: string;
}> = ({ reveal, colour }) => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1 / 1', display: 'block' }}>
    <rect width="100" height="100" fill="rgba(255,255,255,0.02)" />

    {/* Ideal path — faint coloured lane */}
    <path
      d={pointsToRevealPath(reveal.pathPoints)}
      fill="none"
      stroke={colour}
      strokeWidth={Math.max(reveal.laneWidth * 100 * 0.5, 1.8)}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.28"
    />

    {/* Player trace — white */}
    <path
      d={pointsToRevealPath(reveal.playerPoints)}
      fill="none"
      stroke="#fff"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── True Centre reveal ───────────────────────────────────────────────────────
const TrueCentreRevealCanvas: React.FC<{
  reveal: TrueCentreReveal;
  config: TrueCentreConfig;
  colour: string;
  roundId: string;
}> = ({ reveal, config, colour, roundId }) => {
  if (!config?.shapePosition || !reveal?.trueCentre) return null;

  const { shapeType, shapePosition, shapeSize, rotation } = config;
  const cx = shapePosition.x * 100;
  const cy = shapePosition.y * 100;
  const w = shapeSize.width * 100;
  const h = shapeSize.height * 100;
  const hasTap = reveal.playerTap != null;
  const tx = (reveal.playerTap?.x ?? 0) * 100;
  const ty = (reveal.playerTap?.y ?? 0) * 100;
  const ax = reveal.trueCentre.x * 100;
  const ay = reveal.trueCentre.y * 100;

  const ngon = (n: number, rx: number, ry: number, off = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n + off;
      return `${cx + rx * Math.sin(a)},${cy - ry * Math.cos(a)}`;
    }).join(' ');

  const renderShape = () => {
    const base = { fill: `${colour}12`, stroke: colour, strokeWidth: '0.5' as const };
    const tr = `rotate(${rotation}, ${cx}, ${cy})`;
    switch (shapeType) {
      case 'circle': return <ellipse cx={cx} cy={cy} rx={w/2} ry={h/2} {...base} />;
      case 'square':
      case 'rectangle': return <rect x={cx-w/2} y={cy-h/2} width={w} height={h} transform={tr} {...base} />;
      case 'triangle': return <polygon points={ngon(3,w/2,h/2)} transform={tr} {...base} />;
      case 'diamond': return <polygon points={ngon(4,w/2,h/2,Math.PI/4)} transform={tr} {...base} />;
      case 'pentagon': return <polygon points={ngon(5,w/2,h/2)} transform={tr} {...base} />;
      case 'hexagon': return <polygon points={ngon(6,w/2,h/2)} transform={tr} {...base} />;
      default: return null;
    }
  };

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      <defs>
        <pattern id={`rg-${roundId}`} width="10" height="10" patternUnits="userSpaceOnUse">
          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.25" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill={`url(#rg-${roundId})`} />
      {renderShape()}

      {/* Player tap — white X */}
      {hasTap && (
        <g style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' }}>
          <line x1={tx-3} y1={ty-3} x2={tx+3} y2={ty+3} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
          <line x1={tx+3} y1={ty-3} x2={tx-3} y2={ty+3} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
          <text x={tx+4} y={ty-3} fill="rgba(255,255,255,0.6)" fontSize="2.8" fontFamily="'Inter', system-ui">you</text>
        </g>
      )}

      {/* Correct centre — coloured ring */}
      <g style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }}>
        <circle cx={ax} cy={ay} r="2.2" fill="none" stroke={colour} strokeWidth="0.7" />
        <circle cx={ax} cy={ay} r="0.7" fill={colour} />
        <text x={ax+3} y={ay-1} fill={colour} fontSize="2.8" fontFamily="'Inter', system-ui">centre</text>
      </g>

      {/* Error line */}
      {hasTap && (
        <line x1={tx} y1={ty} x2={ax} y2={ay}
          stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" strokeDasharray="1.5,1.5" />
      )}
    </svg>
  );
};

// ─── Midpoint Split reveal ────────────────────────────────────────────────────
const MidpointRevealCanvas: React.FC<{
  reveal: MidpointSplitReveal;
  config: MidpointSplitConfig;
  colour: string;
}> = ({ reveal, colour }) => {
  if (!reveal.pointA || !reveal.pointB || !reveal.actualMidpoint) return null;

  const ax = reveal.pointA.x * 100; const ay = reveal.pointA.y * 100;
  const bx = reveal.pointB.x * 100; const by = reveal.pointB.y * 100;
  const mx = reveal.actualMidpoint.x * 100; const my = reveal.actualMidpoint.y * 100;
  const hasMarker = reveal.playerMarker != null;
  const px = (reveal.playerMarker?.x ?? 0) * 100;
  const py = (reveal.playerMarker?.y ?? 0) * 100;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      {/* Line between anchors */}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={`${colour}44`} strokeWidth="0.8" strokeLinecap="round" />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={colour} strokeWidth="0.25" />

      {/* Anchor labels */}
      {([[ax,ay,'A'],[bx,by,'B']] as const).map(([x,y,l]) => (
        <g key={String(l)}>
          <circle cx={Number(x)} cy={Number(y)} r="2.5" fill={`${colour}18`} stroke={colour} strokeWidth="0.5" />
          <text x={Number(x)} y={Number(y)-3.5} textAnchor="middle" fill={colour} fontSize="3" fontFamily="'Inter', system-ui" fontWeight="700">{l}</text>
        </g>
      ))}

      {/* Player marker — white X */}
      {hasMarker && (
        <g style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' }}>
          <line x1={px-3} y1={py-3} x2={px+3} y2={py+3} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
          <line x1={px+3} y1={py-3} x2={px-3} y2={py+3} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
          <text x={px+4} y={py-2} fill="rgba(255,255,255,0.6)" fontSize="2.8" fontFamily="'Inter', system-ui">you</text>
        </g>
      )}

      {/* Correct midpoint */}
      <g style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }}>
        <circle cx={mx} cy={my} r="2.2" fill="none" stroke={colour} strokeWidth="0.7" />
        <circle cx={mx} cy={my} r="0.7" fill={colour} />
        <text x={mx+3} y={my-1} fill={colour} fontSize="2.8" fontFamily="'Inter', system-ui">midpoint</text>
      </g>

      {/* Error line */}
      <line x1={px} y1={py} x2={mx} y2={my}
        stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" strokeDasharray="1.5,1.5" />
    </svg>
  );
};

// ─── Stop the Bar reveal ──────────────────────────────────────────────────────
const StopBarRevealCanvas: React.FC<{
  reveal: StopTheBarReveal;
  config: StopTheBarConfig;
  colour: string;
}> = ({ reveal, config, colour }) => {
  if (reveal.targetPosition == null) return null;

  const tp = reveal.targetPosition * 100;
  const hasStop = reveal.playerStopPosition != null;
  const pp = (reveal.playerStopPosition ?? 0) * 100;
  const tw = (config.targetWidth ?? 0.08) * 100;

  return (
    <svg viewBox="0 0 100 30" style={{ width: '100%', display: 'block' }}>
      {/* Track */}
      <rect x="2" y="13" width="96" height="4" rx="2" fill="rgba(255,255,255,0.06)" />

      {/* Target zone */}
      <rect x={tp - tw/2} y="9" width={tw} height="12" rx="2"
        fill={`${colour}12`} stroke={colour} strokeWidth="0.4" strokeOpacity="0.7" />
      <text x={tp} y="7" textAnchor="middle" fill={colour} fontSize="3" fontFamily="'Inter', system-ui">target</text>
      <line x1={tp} y1="9" x2={tp} y2="21" stroke={colour} strokeWidth="0.4" strokeOpacity="0.8" />

      {/* Player stop */}
      {hasStop && (
        <>
          <rect x={pp - 0.8} y="7" width="1.6" height="16" rx="0.8"
            fill="#ffffff" style={{ filter: 'drop-shadow(0 0 3px #ffffff)' }} />
          <text x={pp} y="26" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="3" fontFamily="'Inter', system-ui">you</text>
        </>
      )}

      {/* Error distance line */}
      {hasStop && Math.abs(pp - tp) > 1 && (
        <line x1={pp} y1="15" x2={tp} y2="15"
          stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" strokeDasharray="1.5,1.5" />
      )}
    </svg>
  );
};

// ─── Draw Angle reveal ────────────────────────────────────────────────────────
const DrawAngleRevealCanvas: React.FC<{
  reveal: DrawAngleReveal;
  config: any;
  colour: string;
}> = ({ reveal, config, colour }) => {
  const cx = (config?.anchorX ?? 0.5) * 100;
  const cy = (config?.anchorY ?? 0.5) * 100;
  const len = (config?.lineLength ?? 0.3) * 100;
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const pRad = toRad(reveal.playerAngle ?? 0);
  const tRad = toRad(reveal.targetAngle);

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />

      {/* Target angle line */}
      <line
        x1={cx} y1={cy}
        x2={cx + len * Math.cos(tRad)} y2={cy + len * Math.sin(tRad)}
        stroke={colour} strokeWidth="1" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }}
      />
      <circle cx={cx + len * Math.cos(tRad)} cy={cy + len * Math.sin(tRad)} r="2" fill={colour} />
      <text
        x={cx + len * Math.cos(tRad) + 3} y={cy + len * Math.sin(tRad)}
        fill={colour} fontSize="3.5" fontFamily="Inter"
      >
        correct {reveal.targetAngle}°
      </text>

      {/* Player angle line */}
      {reveal.playerAngle != null && (
        <>
          <line
            x1={cx} y1={cy}
            x2={cx + len * Math.cos(pRad)} y2={cy + len * Math.sin(pRad)}
            stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2,2"
          />
          <circle cx={cx + len * Math.cos(pRad)} cy={cy + len * Math.sin(pRad)} r="1.5" fill="#ffffff" />
          <text
            x={cx + len * Math.cos(pRad) + 3} y={cy + len * Math.sin(pRad) + 4}
            fill="rgba(255,255,255,0.7)" fontSize="3" fontFamily="Inter"
          >
            you {reveal.playerAngle}°
          </text>
        </>
      )}

      {/* Pivot point */}
      <circle cx={cx} cy={cy} r="2" fill={colour} style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }} />

      {/* Diff label */}
      <text x="50" y="94" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="3" fontFamily="Inter">
        {reveal.difference != null ? `${reveal.difference}° off` : ''}
      </text>
    </svg>
  );
};

// ─── Quick Count reveal ───────────────────────────────────────────────────────
const QuickCountRevealCanvas: React.FC<{
  reveal: QuickCountReveal;
  colour: string;
}> = ({ reveal, colour }) => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
    <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />

    {reveal.dots?.map((dot, i) => (
      <circle
        key={i}
        cx={dot.x * 100} cy={dot.y * 100} r="2.2"
        fill={colour} opacity="0.85"
        style={{ filter: `drop-shadow(0 0 2px ${colour}88)` }}
      />
    ))}

    <text x="50" y="88" textAnchor="middle" fill={colour}
      fontSize="5" fontFamily="'Bebas Neue', Impact, sans-serif" letterSpacing="0.05em">
      {reveal.actualCount} dots
    </text>

    {reveal.playerGuess != null && (
      <text x="50" y="95" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="3.2" fontFamily="Inter">
        You guessed {reveal.playerGuess}
        {reveal.difference != null
          ? reveal.difference === 0 ? ' · Perfect!' : ` · off by ${Math.abs(reveal.difference)}`
          : ''}
      </text>
    )}
  </svg>
);

// ─── Flash Maths reveal ───────────────────────────────────────────────────────
const FlashMathsRevealCanvas: React.FC<{
  reveal: FlashMathsReveal;
  colour: string;
}> = ({ reveal, colour }) => (
  <svg viewBox="0 0 100 60" style={{ width: '100%', display: 'block' }}>
    <rect width="100" height="60" fill="rgba(255,255,255,0.01)" />

    {/* Numbers expression */}
    <text x="50" y="20" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="5" fontFamily="Inter">
      {reveal.numbers?.join(' + ')}
    </text>

    {/* Divider line */}
    <line x1="20" y1="26" x2="80" y2="26" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

    {/* Correct answer */}
    <text x="50" y="38" textAnchor="middle" fill={colour}
      fontSize="9" fontFamily="'Bebas Neue', Impact, sans-serif"
      style={{ filter: `drop-shadow(0 0 4px ${colour}66)` }}>
      = {reveal.actualSum}
    </text>

    {/* Player answer */}
    {reveal.playerAnswer != null && (
      <text x="50" y="52" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="3.5" fontFamily="Inter">
        You answered {reveal.playerAnswer}{reveal.difference === 0 ? ' · Correct!' : ''}
      </text>
    )}
  </svg>
);

// ─── Line Length reveal ───────────────────────────────────────────────────────
const LineLengthRevealCanvas: React.FC<{
  reveal: LineLengthReveal;
  colour: string;
}> = ({ reveal, colour }) => {
  const tLen = reveal.targetLength * 80;
  const pLen = (reveal.playerLength ?? 0) * 80;

  return (
    <svg viewBox="0 0 100 60" style={{ width: '100%', display: 'block' }}>
      <rect width="100" height="60" fill="rgba(255,255,255,0.01)" />

      {/* Target line */}
      <line x1={10} y1={20} x2={10 + tLen} y2={20}
        stroke={colour} strokeWidth="1.5" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }} />
      <text x={10 + tLen + 2} y={21} fill={colour} fontSize="3.2" fontFamily="Inter">correct</text>

      {/* Player line */}
      {reveal.playerLength != null && (
        <>
          <line x1={10} y1={34} x2={10 + pLen} y2={34}
            stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeDasharray="2,1.5" />
          <text x={10 + pLen + 2} y={35} fill="rgba(255,255,255,0.6)" fontSize="3.2" fontFamily="Inter">you</text>
        </>
      )}

      <text x="50" y="52" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="3" fontFamily="Inter">
        {reveal.playerLength != null
          ? reveal.difference === 0
            ? 'Perfect match!'
            : `Off by ${(Math.abs(reveal.difference ?? 0) * 100).toFixed(0)} units`
          : 'No answer submitted'}
      </text>
    </svg>
  );
};

// ─── Balance Point reveal ─────────────────────────────────────────────────────
const BalancePointRevealCanvas: React.FC<{
  reveal: BalancePointReveal;
  colour: string;
}> = ({ reveal, colour }) => {
  const maxW = Math.max(...(reveal.weights?.map(w => w.weight) ?? [1]));
  const ly = 35;

  return (
    <svg viewBox="0 0 100 60" style={{ width: '100%', display: 'block' }}>
      <rect width="100" height="60" fill="rgba(255,255,255,0.01)" />

      {/* Beam */}
      <line x1="5" y1={ly} x2="95" y2={ly} stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeLinecap="round" />

      {/* Weights */}
      {reveal.weights?.map((w, i) => {
        const wx = 5 + w.position * 90;
        const r = 2 + (w.weight / maxW) * 5;
        return (
          <g key={i}>
            <line x1={wx} y1={ly} x2={wx} y2={ly + r + 1} stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" />
            <circle cx={wx} cy={ly + r + 2} r={r} fill={`${colour}15`} stroke={colour} strokeWidth="0.5" />
            <text x={wx} y={ly + r + 3} textAnchor="middle"
              fill={colour} fontSize={Math.max(2, r * 0.75)} fontFamily="Inter" fontWeight="700">
              {w.weight}
            </text>
          </g>
        );
      })}

      {/* Correct balance point */}
      <line
        x1={5 + reveal.centreOfMass * 90} y1={ly - 5}
        x2={5 + reveal.centreOfMass * 90} y2={ly + 5}
        stroke={colour} strokeWidth="1.2"
        style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }}
      />
      <text x={5 + reveal.centreOfMass * 90} y={ly - 7} textAnchor="middle"
        fill={colour} fontSize="2.8" fontFamily="Inter">
        correct
      </text>

      {/* Player tap */}
      {reveal.playerX != null && (
        <>
          <line
            x1={5 + reveal.playerX * 90} y1={ly - 4}
            x2={5 + reveal.playerX * 90} y2={ly + 4}
            stroke="#ffffff" strokeWidth="0.8" strokeDasharray="1.5,1"
          />
          <text x={5 + reveal.playerX * 90} y={ly + 9} textAnchor="middle"
            fill="rgba(255,255,255,0.5)" fontSize="2.8" fontFamily="Inter">
            you
          </text>
        </>
      )}

      <text x="50" y="57" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="2.8" fontFamily="Inter">
        {reveal.playerX != null
          ? `${(reveal.errorDistance * 100).toFixed(1)}% off`
          : 'No answer submitted'}
      </text>
    </svg>
  );
};

// ─── Flash Grid reveal ────────────────────────────────────────────────────────
const FlashGridRevealCanvas: React.FC<{
  reveal: FlashGridReveal;
  colour: string;
}> = ({ reveal, colour }) => {
  const { gridSize, flashCells, playerTaps } = reveal;
  const cellSize = 1 / gridSize;
  const correctSet = new Set((flashCells ?? []).map((c: any) => `${c.row},${c.col}`));
  const tapSet = new Set((playerTaps ?? []).map((t: any) => {
    const col = Math.floor(t.x / cellSize);
    const row = Math.floor(t.y / cellSize);
    return `${row},${col}`;
  }));
  const pad = 5;
  const total = 90;
  const cs = total / gridSize;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />

      {Array.from({ length: gridSize * gridSize }, (_, i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const key = `${row},${col}`;
        const isCorrect = correctSet.has(key);
        const isTapped = tapSet.has(key);
        const x = pad + col * cs;
        const y = pad + row * cs;
        return (
          <g key={key}>
            <rect
              x={x + 0.5} y={y + 0.5} width={cs - 1} height={cs - 1} rx="1.5"
              fill={
                isCorrect && isTapped ? `${colour}40`
                : isCorrect ? `${colour}20`
                : isTapped ? 'rgba(255,59,92,0.2)'
                : 'rgba(255,255,255,0.03)'
              }
              stroke={isCorrect ? colour : isTapped ? '#ff3b5c' : 'rgba(255,255,255,0.08)'}
              strokeWidth="0.4"
            />
            {isCorrect && (
              <text x={x + cs/2} y={y + cs/2 + 1.5} textAnchor="middle"
                fill={colour} fontSize="3.5" fontFamily="Inter">✓</text>
            )}
            {isTapped && !isCorrect && (
              <text x={x + cs/2} y={y + cs/2 + 1.5} textAnchor="middle"
                fill="#ff3b5c" fontSize="3.5" fontFamily="Inter">✕</text>
            )}
          </g>
        );
      })}

      <text x="50" y="98" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="2.8" fontFamily="Inter">
        Correct cells highlighted · wrong taps marked ✕
      </text>
    </svg>
  );
};

// ─── Pattern Align reveal ─────────────────────────────────────────────────────
const PatternAlignRevealCanvas: React.FC<{
  reveal: PatternAlignReveal;
  config: any;
  colour: string;
}> = ({ reveal, config, colour }) => {
  const r = (config?.shapeSize ?? 0.18) * 50;
  const shapeType = config?.shapeType ?? 'circle';

  const ngon = (n: number, cx: number, cy: number, rot: number) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n + (rot * Math.PI) / 180;
      return `${cx + r * Math.sin(a)},${cy - r * Math.cos(a)}`;
    }).join(' ');

  const shape = (cx: number, cy: number, rot: number, fill: string, stroke: string, dashed = false) => {
    const p = { fill, stroke, strokeWidth: '0.6' as const, strokeDasharray: dashed ? '2,1.5' : undefined };
    switch (shapeType) {
      case 'square': return <rect x={cx-r} y={cy-r} width={r*2} height={r*2} transform={`rotate(${rot},${cx},${cy})`} {...p} />;
      case 'rectangle': return <rect x={cx-r*1.4} y={cy-r*0.7} width={r*2.8} height={r*1.4} transform={`rotate(${rot},${cx},${cy})`} {...p} />;
      case 'triangle': return <polygon points={ngon(3,cx,cy,rot)} {...p} />;
      case 'pentagon': return <polygon points={ngon(5,cx,cy,rot)} {...p} />;
      case 'hexagon': return <polygon points={ngon(6,cx,cy,rot)} {...p} />;
      case 'diamond': return <polygon points={ngon(4,cx,cy,rot+45)} {...p} />;
      default: return <polygon points={ngon(5,cx,cy,rot)} {...p} />;
    }
  };

  const tx = (reveal.targetX ?? 0.5) * 100;
  const ty = (reveal.targetY ?? 0.5) * 100;
  const px = (reveal.playerX ?? 0.5) * 100;
  const py = (reveal.playerY ?? 0.5) * 100;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />

      {/* Player shape — dashed */}
      {shape(px, py, reveal.playerRotation ?? 0, 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.5)', true)}
      <text x={px} y={py + r + 5} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="2.8" fontFamily="Inter">you</text>

      {/* Target shape — solid */}
      {shape(tx, ty, reveal.targetRotation ?? 0, `${colour}20`, colour, false)}
      <text x={tx} y={ty + r + 5} textAnchor="middle" fill={colour} fontSize="2.8" fontFamily="Inter">correct</text>

      {/* Error line between centres */}
      {(px !== tx || py !== ty) && (
        <line x1={px} y1={py} x2={tx} y2={ty}
          stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" strokeDasharray="1.5,1.5" />
      )}

      <text x="50" y="96" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="2.8" fontFamily="Inter">
        {reveal.rotationDiff != null ? `${reveal.rotationDiff.toFixed(0)}° rotation off` : ''}
      </text>
    </svg>
  );
};

// ─── Sequence Gap reveal ──────────────────────────────────────────────────────
const SequenceGapRevealCanvas: React.FC<{
  reveal: SequenceGapReveal;
  colour: string;
}> = ({ reveal, colour }) => {
  const fullSeq = [...reveal.sequence];
  fullSeq[reveal.missingIndex] = reveal.actualValue;

  return (
    <div style={{ padding: '8px 0', width: '100%' }}>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
        {fullSeq.map((v, i) => (
          <div key={i} style={{
            width: '52px', height: '52px', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: i === reveal.missingIndex ? `${colour}18` : 'rgba(255,255,255,0.05)',
            border: `1px solid ${i === reveal.missingIndex ? colour : 'rgba(255,255,255,0.1)'}`,
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '22px',
            color: i === reveal.missingIndex ? colour : 'rgba(255,255,255,0.7)',
            boxShadow: i === reveal.missingIndex ? `0 0 8px ${colour}44` : 'none',
          }}>
            {v}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
        Missing value was <strong style={{ color: colour }}>{reveal.actualValue}</strong>
        {reveal.playerAnswer != null && ` · You guessed ${reveal.playerAnswer} · off by ${Math.abs(reveal.difference ?? 0)}`}
      </div>
    </div>
  );
};

// ─── Colour Count reveal ──────────────────────────────────────────────────────
const ColourCountRevealCanvas: React.FC<{
  reveal: ColourCountReveal;
  colour: string;
}> = ({ reveal }) => (
  <div style={{ width: '100%' }}>
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />
      {reveal.shapes?.map((s: any, i: number) => {
        const cx = s.x * 100;
        const cy = s.y * 100;
        const r = s.size * 100 / 2;
        const isTarget = s.colour === reveal.targetColour;
        const opacity = isTarget ? 1 : 0.25;
        return s.shapeType === 'circle'
          ? <circle key={i} cx={cx} cy={cy} r={r} fill={s.hex} opacity={opacity} />
          : <rect key={i} x={cx-r} y={cy-r} width={r*2} height={r*2} rx="1.5" fill={s.hex} opacity={opacity} />;
      })}
    </svg>
    <div style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
      <strong style={{ color: reveal.targetHex }}>{reveal.actualCount} {reveal.targetLabel}</strong> shapes
      {reveal.playerAnswer != null && ` · You guessed ${reveal.playerAnswer}`}
    </div>
  </div>
);

// ─── Time Estimation reveal ───────────────────────────────────────────────────
const TimeEstimationRevealCanvas: React.FC<{
  reveal: TimeEstimationReveal;
  colour: string;
}> = ({ reveal, colour }) => {
  const target = (reveal.targetTimeMs ?? 0) / 1000;
  const player = (reveal.playerTimeMs ?? 0) / 1000;
  const diff = Math.abs(reveal.difference ?? 0) / 1000;
  const maxBar = Math.max(target, player || target) * 1.2 || 1;
  const targetW = (target / maxBar) * 80;
  const playerW = (player / maxBar) * 80;

  return (
    <svg viewBox="0 0 100 50" style={{ width: '100%', display: 'block' }}>
      <rect width="100" height="50" fill="rgba(255,255,255,0.01)" />

      {/* Target bar */}
      <rect x="10" y="8" width={targetW} height="10" rx="2"
        fill={`${colour}40`} stroke={colour} strokeWidth="0.5" />
      <text x={10 + targetW + 2} y="15" fill={colour} fontSize="3.5" fontFamily="Inter">
        {target}s target
      </text>

      {/* Player bar */}
      <rect x="10" y="24" width={playerW} height="10" rx="2"
        fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <text x={10 + playerW + 2} y="31" fill="rgba(255,255,255,0.6)" fontSize="3.5" fontFamily="Inter">
        {player.toFixed(1)}s you
      </text>

      {/* Diff label */}
      <text x="50" y="46" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="3.2" fontFamily="Inter">
        {player > 0
          ? diff < 0.3 ? 'Almost perfect!' : `${diff.toFixed(1)}s off`
          : 'No answer recorded'}
      </text>
    </svg>
  );
};

// ─── Character Count reveal ───────────────────────────────────────────────────
const CharacterCountRevealCanvas: React.FC<{
  reveal: CharacterCountReveal;
  colour: string;
}> = ({ reveal, colour }) => (
  <div style={{ width: '100%' }}>
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />
      {reveal.characters?.map((c: any, i: number) => (
        <text
          key={i}
          x={c.x * 100} y={c.y * 100}
          textAnchor="middle" dominantBaseline="middle"
          fill={c.value === reveal.targetCharacter ? colour : 'rgba(255,255,255,0.2)'}
          fontSize={c.fontSize * 100}
          fontFamily="'Bebas Neue', Impact, sans-serif"
          fontWeight="700"
          transform={`rotate(${c.rotation}, ${c.x * 100}, ${c.y * 100})`}
        >
          {c.value}
        </text>
      ))}
    </svg>
    <div style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '8px' }}>
      <strong style={{ color: colour }}>{reveal.actualCount}× '{reveal.targetCharacter}'</strong> in the grid
      {reveal.playerAnswer != null && ` · You guessed ${reveal.playerAnswer}`}
    </div>
  </div>
);

// ─── Shared style fragments ───────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  scoreStat: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
  },
};