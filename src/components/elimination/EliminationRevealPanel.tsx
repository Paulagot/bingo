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

  // Derive round number from activeRound or first result
  const roundNumber = activeRound?.roundNumber ?? 0;
  const roundType = activeRound?.roundType ?? results[0]?.revealData?.roundType ?? 'true_centre';

  const rc = getRoundColour(roundNumber);
  const localResult = results.find(r => r.playerId === localPlayerId);
  const reveal = (localResult?.revealData ?? null) as AnyReveal | null;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance countdown — but if player pressed button manually, don't double-fire
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

  return (
    <div style={{
      ...s.page,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.35s ease',
      background: `radial-gradient(ellipse at 50% 0%, ${rc.tint} 0%, #0a0b0f 55%)`,
    }}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.eyebrow}>
          Round {roundNumber} · {roundTypeLabel(roundType)}
        </div>
        <h2 style={s.title}>Answer Reveal</h2>
      </div>

      {/* Visual reveal canvas */}
      <div style={s.canvasWrap}>
        {reveal && activeRound?.config && (
          <RevealCanvas
            reveal={reveal}
            config={activeRound?.config}
            roundId={activeRound?.roundId ?? 'reveal'}
            colour={rc.primary}
          />
        )}
        {!didSubmit && (
          <div style={s.noSubmitOverlay}>
            <span style={{ fontSize: '28px' }}>—</span>
            <span style={{ ...s.noSubmitText, fontFamily: "'Inter', system-ui, sans-serif" }}>
              No answer submitted
            </span>
          </div>
        )}
      </div>

      {/* Score summary */}
      {localResult && (
        <div style={{ ...s.scoreSummary, borderColor: `${rc.primary}30` }}>
          <div style={s.scoreRow}>
            <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
              Your score
            </span>
            <span style={{ ...s.scoreValue, color: rc.primary, fontFamily: "'Bebas Neue', 'Impact', sans-serif", fontSize: '32px' }}>
              {formatScore(localResult?.score ?? 0)}
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
          {(localResult?.speedBonus ?? 0) > 0 && (
            <div style={s.scoreRow}>
              <span style={{ ...s.scoreLabel, fontFamily: "'Inter', system-ui, sans-serif" }}>
                Speed bonus
              </span>
              <span style={{ ...s.scoreStat, color: '#30d158', fontFamily: "'Inter', system-ui, sans-serif" }}>
                +{localResult?.speedBonus} pts ⚡
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

      {/* Continue button + auto countdown */}
      <div style={s.footer}>
        <button onClick={handleContinue} style={{ ...s.continueBtn, borderColor: `${rc.primary}44`, fontFamily: "'Inter', system-ui, sans-serif" }}>
          See scores →
        </button>
        <div style={{ ...s.autoText, fontFamily: "'Inter', system-ui, sans-serif" }}>
          Continuing in <span style={{ color: 'rgba(255,255,255,0.6)' }}>{countdown}s</span>
        </div>
      </div>
    </div>
  );
};

// ─── Per-round-type reveal canvas ─────────────────────────────────────────────

type AnyReveal =
  | TrueCentreReveal | MidpointSplitReveal | StopTheBarReveal
  | DrawAngleReveal | FlashGridReveal | QuickCountReveal
  | FlashMathsReveal | LineLengthReveal | BalancePointReveal | PatternAlignReveal;

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
  return null;
};

// True Centre reveal — shows shape, correct centre (◎), player tap (✕)
const TrueCentreRevealCanvas: React.FC<{
  reveal: TrueCentreReveal; config: TrueCentreConfig; colour: string; roundId: string;
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
      case 'square': case 'rectangle': return <rect x={cx-w/2} y={cy-h/2} width={w} height={h} transform={tr} {...base} />;
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

      {/* Player tap — white X (only if submitted) */}
      {hasTap && (
        <g style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.8))' }}>
          <line x1={tx-3} y1={ty-3} x2={tx+3} y2={ty+3} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
          <line x1={tx+3} y1={ty-3} x2={tx-3} y2={ty+3} stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" />
          <text x={tx+4} y={ty-3} fill="rgba(255,255,255,0.6)" fontSize="2.8" fontFamily="'Inter', system-ui">you</text>
        </g>
      )}

      {/* Correct answer — coloured circle */}
      <g style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }}>
        <circle cx={ax} cy={ay} r="2.2" fill="none" stroke={colour} strokeWidth="0.7" />
        <circle cx={ax} cy={ay} r="0.7" fill={colour} />
        <text x={ax+3} y={ay-1} fill={colour} fontSize="2.8" fontFamily="'Inter', system-ui">centre</text>
      </g>

      {/* Dotted line connecting them */}
      {hasTap && (
        <line x1={tx} y1={ty} x2={ax} y2={ay}
          stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" strokeDasharray="1.5,1.5" />
      )}
    </svg>
  );
};

// Midpoint Split reveal — uses reveal data which already contains pointA/pointB
const MidpointRevealCanvas: React.FC<{
  reveal: MidpointSplitReveal; config: MidpointSplitConfig; colour: string;
}> = ({ reveal, colour }) => {
  // Use reveal data directly — it contains all coords, no need for config
  if (!reveal.pointA || !reveal.pointB || !reveal.actualMidpoint) return null;
  const ax = reveal.pointA.x * 100; const ay = reveal.pointA.y * 100;
  const bx = reveal.pointB.x * 100; const by = reveal.pointB.y * 100;
  const mx = reveal.actualMidpoint.x * 100; const my = reveal.actualMidpoint.y * 100;
  // playerMarker may be null if player didn't submit
  const hasMarker = reveal.playerMarker != null;
  const px = (reveal.playerMarker?.x ?? 0) * 100;
  const py = (reveal.playerMarker?.y ?? 0) * 100;

  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      {/* Line */}
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={`${colour}44`} strokeWidth="0.8" strokeLinecap="round" />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={colour} strokeWidth="0.25" />

      {/* Anchors */}
      {[[ax,ay,'A'],[bx,by,'B']].map(([x,y,l]) => (
        <g key={String(l)}>
          <circle cx={Number(x)} cy={Number(y)} r="2.5" fill={`${colour}18`} stroke={colour} strokeWidth="0.5" />
          <text x={Number(x)} y={Number(y)-3.5} textAnchor="middle" fill={colour} fontSize="3" fontFamily="'Inter', system-ui" fontWeight="700">{l}</text>
        </g>
      ))}

      {/* Player marker — white X (only if submitted) */}
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

// Stop the Bar reveal — horizontal bar view
const StopBarRevealCanvas: React.FC<{
  reveal: StopTheBarReveal; config: StopTheBarConfig; colour: string;
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

      {/* Player stop (only if submitted) */}
      {hasStop && <>
        <rect x={pp - 0.8} y="7" width="1.6" height="16" rx="0.8"
          fill="#ffffff" style={{ filter: 'drop-shadow(0 0 3px #ffffff)' }} />
        <text x={pp} y="26" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="3" fontFamily="'Inter', system-ui">you</text>
      </>}

      {/* Error distance line */}
      {hasStop && Math.abs(pp - tp) > 1 && (
        <line x1={pp} y1="15" x2={tp} y2="15"
          stroke="rgba(255,255,255,0.2)" strokeWidth="0.4" strokeDasharray="1.5,1.5" />
      )}
    </svg>
  );
};

// ─── Draw Angle reveal — shows two lines: player angle vs target angle ────────
const DrawAngleRevealCanvas: React.FC<{ reveal: DrawAngleReveal; config: any; colour: string }> = ({ reveal, config, colour }) => {
  const cx = (config?.anchorX ?? 0.5) * 100;
  const cy = (config?.anchorY ?? 0.5) * 100;
  const len = (config?.lineLength ?? 0.3) * 100;
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  const pRad = toRad(reveal.playerAngle ?? 0);
  const tRad = toRad(reveal.targetAngle);
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
      <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />
      {/* Target line */}
      <line x1={cx} y1={cy} x2={cx + len * Math.cos(tRad)} y2={cy + len * Math.sin(tRad)}
        stroke={colour} strokeWidth="1" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }} />
      <circle cx={cx + len * Math.cos(tRad)} cy={cy + len * Math.sin(tRad)} r="2" fill={colour} />
      <text x={cx + len * Math.cos(tRad) + 3} y={cy + len * Math.sin(tRad)}
        fill={colour} fontSize="3.5" fontFamily="Inter">correct {reveal.targetAngle}°</text>
      {/* Player line */}
      {reveal.playerAngle != null && (
        <>
          <line x1={cx} y1={cy} x2={cx + len * Math.cos(pRad)} y2={cy + len * Math.sin(pRad)}
            stroke="#ffffff" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="2,2" />
          <circle cx={cx + len * Math.cos(pRad)} cy={cy + len * Math.sin(pRad)} r="1.5" fill="#ffffff" />
          <text x={cx + len * Math.cos(pRad) + 3} y={cy + len * Math.sin(pRad) + 4}
            fill="rgba(255,255,255,0.7)" fontSize="3" fontFamily="Inter">you {reveal.playerAngle}°</text>
        </>
      )}
      {/* Pivot */}
      <circle cx={cx} cy={cy} r="2" fill={colour} style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }} />
      {/* Diff label */}
      <text x="50" y="94" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="3" fontFamily="Inter">
        {reveal.difference != null ? `${reveal.difference}° off` : ''}
      </text>
    </svg>
  );
};

// ─── Quick Count reveal — re-show dots with count labels ─────────────────────
const QuickCountRevealCanvas: React.FC<{ reveal: QuickCountReveal; colour: string }> = ({ reveal, colour }) => (
  <svg viewBox="0 0 100 100" style={{ width: '100%', aspectRatio: '1/1', display: 'block' }}>
    <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />
    {reveal.dots?.map((dot, i) => (
      <circle key={i} cx={dot.x * 100} cy={dot.y * 100} r="2.2"
        fill={colour} opacity="0.85"
        style={{ filter: `drop-shadow(0 0 2px ${colour}88)` }} />
    ))}
    {/* Correct count */}
    <text x="50" y="88" textAnchor="middle" fill={colour}
      fontSize="5" fontFamily="'Bebas Neue', Impact, sans-serif" letterSpacing="0.05em">
      {reveal.actualCount} dots
    </text>
    {reveal.playerGuess != null && (
      <text x="50" y="95" textAnchor="middle" fill="rgba(255,255,255,0.4)"
        fontSize="3.2" fontFamily="Inter">
        You guessed {reveal.playerGuess} · {Math.abs(reveal.difference ?? 0) === 0 ? 'Perfect!' : `off by ${Math.abs(reveal.difference ?? 0)}`}
      </text>
    )}
  </svg>
);

// ─── Flash Maths reveal — show numbers + sum ─────────────────────────────────
const FlashMathsRevealCanvas: React.FC<{ reveal: FlashMathsReveal; colour: string }> = ({ reveal, colour }) => (
  <svg viewBox="0 0 100 60" style={{ width: '100%', display: 'block' }}>
    <rect width="100" height="60" fill="rgba(255,255,255,0.01)" />
    {/* Expression */}
    <text x="50" y="20" textAnchor="middle" fill="rgba(255,255,255,0.6)"
      fontSize="5" fontFamily="Inter">{reveal.numbers?.join(' + ')}</text>
    {/* Equals line */}
    <line x1="20" y1="26" x2="80" y2="26" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
    {/* Correct answer */}
    <text x="50" y="38" textAnchor="middle" fill={colour}
      fontSize="9" fontFamily="'Bebas Neue', Impact, sans-serif"
      style={{ filter: `drop-shadow(0 0 4px ${colour}66)` }}>
      = {reveal.actualSum}
    </text>
    {/* Player answer */}
    {reveal.playerAnswer != null && (
      <text x="50" y="52" textAnchor="middle" fill="rgba(255,255,255,0.45)"
        fontSize="3.5" fontFamily="Inter">
        You answered {reveal.playerAnswer} · {reveal.difference === 0 ? 'Correct!' : `off by ${Math.abs(reveal.difference ?? 0)}`}
      </text>
    )}
  </svg>
);

// ─── Line Length reveal — reference line vs player line ───────────────────────
const LineLengthRevealCanvas: React.FC<{ reveal: LineLengthReveal; colour: string }> = ({ reveal, colour }) => {
  const tLen = reveal.targetLength * 80; // scale to SVG
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
      <text x="50" y="52" textAnchor="middle" fill="rgba(255,255,255,0.35)"
        fontSize="3" fontFamily="Inter">
        {reveal.playerLength != null
          ? `Off by ${(Math.abs(reveal.difference ?? 0) * 100).toFixed(1)}%`
          : 'No answer submitted'}
      </text>
    </svg>
  );
};

// ─── Balance Point reveal — beam with weights + markers ──────────────────────
const BalancePointRevealCanvas: React.FC<{ reveal: BalancePointReveal; colour: string }> = ({ reveal, colour }) => {
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
            <circle cx={wx} cy={ly + r + 2} r={r}
              fill={`${colour}15`} stroke={colour} strokeWidth="0.5" />
            <text x={wx} y={ly + r + 3} textAnchor="middle"
              fill={colour} fontSize={Math.max(2, r * 0.75)} fontFamily="Inter" fontWeight="700">{w.weight}</text>
          </g>
        );
      })}
      {/* Correct balance point */}
      <line x1={5 + reveal.centreOfMass * 90} y1={ly - 5} x2={5 + reveal.centreOfMass * 90} y2={ly + 5}
        stroke={colour} strokeWidth="1.2"
        style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }} />
      <text x={5 + reveal.centreOfMass * 90} y={ly - 7} textAnchor="middle"
        fill={colour} fontSize="2.8" fontFamily="Inter">correct</text>
      {/* Player tap */}
      {reveal.playerX != null && (
        <>
          <line x1={5 + reveal.playerX * 90} y1={ly - 4} x2={5 + reveal.playerX * 90} y2={ly + 4}
            stroke="#ffffff" strokeWidth="0.8" strokeDasharray="1.5,1" />
          <text x={5 + reveal.playerX * 90} y={ly + 9} textAnchor="middle"
            fill="rgba(255,255,255,0.5)" fontSize="2.8" fontFamily="Inter">you</text>
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

// ─── Flash Grid reveal — show correct cells vs tapped cells ──────────────────
const FlashGridRevealCanvas: React.FC<{ reveal: FlashGridReveal; colour: string }> = ({ reveal, colour }) => {
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
            <rect x={x + 0.5} y={y + 0.5} width={cs - 1} height={cs - 1} rx="1.5"
              fill={isCorrect && isTapped ? `${colour}40`
                : isCorrect ? `${colour}20`
                : isTapped ? 'rgba(255,59,92,0.2)'
                : 'rgba(255,255,255,0.03)'}
              stroke={isCorrect ? colour : isTapped ? '#ff3b5c' : 'rgba(255,255,255,0.08)'}
              strokeWidth="0.4" />
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

// ─── Pattern Align reveal — target vs player shape overlay ───────────────────
const PatternAlignRevealCanvas: React.FC<{ reveal: PatternAlignReveal; config: any; colour: string }> = ({ reveal, config, colour }) => {
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
      case 'circle': return <circle cx={cx} cy={cy} r={r} {...p} />;
      case 'square': return <rect x={cx-r} y={cy-r} width={r*2} height={r*2} transform={`rotate(${rot},${cx},${cy})`} {...p} />;
      case 'triangle': return <polygon points={ngon(3,cx,cy,rot)} {...p} />;
      case 'pentagon': return <polygon points={ngon(5,cx,cy,rot)} {...p} />;
      case 'diamond': return <polygon points={ngon(4,cx,cy,rot+45)} {...p} />;
      default: return <circle cx={cx} cy={cy} r={r} {...p} />;
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
      {/* Target shape — solid coloured */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    color: '#ffffff',
    padding: '0 0 24px',
  },
  header: {
    padding: '24px 24px 16px',
  },
  eyebrow: {
    fontSize: '11px',
    letterSpacing: '0.18em',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    marginBottom: '4px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
 
    margin: 0,
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
    letterSpacing: '0.04em',
  },
  canvasWrap: {
    flex: 1,
    padding: '0 20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    position: 'relative',
    minHeight: '200px',
  },
  noSubmitOverlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.25)',
  },
  noSubmitText: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.06em',
  },
  scoreSummary: {
    margin: '0 20px',
    padding: '16px 20px',
    borderRadius: '12px',
    border: '1px solid',
    background: 'rgba(255,255,255,0.03)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  scoreRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  scoreValue: {
    fontWeight: 700,
  },
  scoreStat: {
    fontSize: '15px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.7)',
  },
  footer: {
    padding: '20px 20px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    alignItems: 'center',
  },
  continueBtn: {
    width: '100%',
    padding: '14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  autoText: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.25)',
  },
};