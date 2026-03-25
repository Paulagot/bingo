import { useRef, useState, useCallback, useEffect } from 'react';
import type { MidpointSplitConfig, MidpointSplitSubmission } from '../types/elimination';
import { getTapPosition } from '../utils/eliminationHelpers';

const PALETTE = [
  { stroke: '#00e5ff', fill: 'rgba(0,229,255,0.12)',  glow: '#00e5ff' },
  { stroke: '#ff3b5c', fill: 'rgba(255,59,92,0.12)',  glow: '#ff3b5c' },
  { stroke: '#ffe600', fill: 'rgba(255,230,0,0.10)',  glow: '#ffe600' },
  { stroke: '#00ff94', fill: 'rgba(0,255,148,0.10)',  glow: '#00ff94' },
  { stroke: '#bf5af2', fill: 'rgba(191,90,242,0.12)', glow: '#bf5af2' },
  { stroke: '#ff9f0a', fill: 'rgba(255,159,10,0.10)', glow: '#ff9f0a' },
];

const paletteForRound = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
};

interface Props {
  config: MidpointSplitConfig;
  roundId: string;
  playerId: string;
  onSubmit: (submission: MidpointSplitSubmission) => void;
  hasSubmitted: boolean;
}

export const MidpointSplitRound: React.FC<Props> = ({
  config, roundId, playerId, onSubmit, hasSubmitted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tapMarker, setTapMarker] = useState<{ x: number; y: number } | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);

  useEffect(() => {
    setTapMarker(null);
    setRipple(null);
  }, [roundId]);

  const handleTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (hasSubmitted || !containerRef.current) return;
    e.preventDefault();
    const { normX, normY } = getTapPosition(e, containerRef.current);
    setTapMarker({ x: normX, y: normY });
    setRipple({ x: normX, y: normY, key: Date.now() });
    onSubmit({
      roundId, playerId,
      roundType: 'midpoint_split',
      submittedAt: Date.now(),
      tapX: normX, tapY: normY,
    });
  }, [hasSubmitted, roundId, playerId, onSubmit]);

  const palette = paletteForRound(roundId);
  const { pointA, pointB, anchorSize = 0.03, lineThickness = 1.2 } = config;

  // Convert to SVG units (viewBox 0–100)
  const ar = anchorSize * 100;
  const lw = lineThickness;
  const ax = pointA.x * 100;
  const ay = pointA.y * 100;
  const bx = pointB.x * 100;
  const by = pointB.y * 100;

  // Label font size scales with anchor size so it's always readable
  const labelSize = Math.max(4.5, ar * 0.9);
  const labelOffset = ar + labelSize * 0.9;

  return (
    <div
      ref={containerRef}
      onPointerDown={handleTap}
      className="relative w-full"
      style={{
        aspectRatio: '1/1',
        touchAction: 'none',
        cursor: hasSubmitted ? 'default' : 'crosshair',
        userSelect: 'none',
      }}
    >
      <style>{`
        @keyframes mpRipple {
          0%  { r: 1; opacity: 0.9; }
          100%{ r: 14; opacity: 0; }
        }
        @keyframes mpMarkerIn {
          0%  { r: 0; opacity: 0; }
          60% { r: 2.8; }
          100%{ r: 2; opacity: 1; }
        }
        @keyframes anchorPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.65; }
        }
      `}</style>

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id={`mpgrid-${roundId}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#mpgrid-${roundId})`} />

        {/* Connecting line — bold, solid, clearly visible */}
        <line
          x1={ax} y1={ay} x2={bx} y2={by}
          stroke={palette.stroke}
          strokeWidth={lw}
          strokeOpacity="0.55"
          strokeLinecap="round"
        />
        {/* Secondary thinner line on top for depth */}
        <line
          x1={ax} y1={ay} x2={bx} y2={by}
          stroke={palette.stroke}
          strokeWidth={lw * 0.35}
          strokeOpacity="0.9"
          strokeLinecap="round"
        />

        {/* Anchor A */}
        <g
          style={{
            filter: `drop-shadow(0 0 ${ar * 0.5}px ${palette.glow}bb)`,
            animation: hasSubmitted ? 'none' : 'anchorPulse 2.2s ease-in-out infinite',
          }}
        >
          {/* Fill circle */}
          <circle cx={ax} cy={ay} r={ar} fill={palette.fill} stroke={palette.stroke} strokeWidth={lw * 0.4} />
          {/* Centre dot */}
          <circle cx={ax} cy={ay} r={ar * 0.28} fill={palette.stroke} />
          {/* Label */}
          <text
            x={ax} y={ay - labelOffset}
            textAnchor="middle"
            fill={palette.stroke}
            fontSize={labelSize}
            fontFamily="'DM Mono', monospace"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            A
          </text>
        </g>

        {/* Anchor B */}
        <g
          style={{
            filter: `drop-shadow(0 0 ${ar * 0.5}px ${palette.glow}bb)`,
            animation: hasSubmitted ? 'none' : `anchorPulse 2.2s ease-in-out infinite 0.4s`,
          }}
        >
          <circle cx={bx} cy={by} r={ar} fill={palette.fill} stroke={palette.stroke} strokeWidth={lw * 0.4} />
          <circle cx={bx} cy={by} r={ar * 0.28} fill={palette.stroke} />
          <text
            x={bx} y={by - labelOffset}
            textAnchor="middle"
            fill={palette.stroke}
            fontSize={labelSize}
            fontFamily="'DM Mono', monospace"
            fontWeight="700"
            letterSpacing="0.05em"
          >
            B
          </text>
        </g>

        {/* Tap ripple */}
        {ripple && (
          <circle
            key={ripple.key}
            cx={ripple.x * 100}
            cy={ripple.y * 100}
            r="1"
            fill="none"
            stroke="#ffffff"
            strokeWidth="0.5"
            style={{ animation: 'mpRipple 0.5s ease-out forwards' }}
          />
        )}

        {/* Tap marker */}
        {tapMarker && (
          <g>
            <circle
              cx={tapMarker.x * 100}
              cy={tapMarker.y * 100}
              r="2"
              fill="#ffffff"
              style={{
                animation: 'mpMarkerIn 0.3s ease-out forwards',
                filter: 'drop-shadow(0 0 3px #ffffff)',
              }}
            />
            <line x1={tapMarker.x*100-4} y1={tapMarker.y*100} x2={tapMarker.x*100+4} y2={tapMarker.y*100} stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
            <line x1={tapMarker.x*100} y1={tapMarker.y*100-4} x2={tapMarker.x*100} y2={tapMarker.y*100+4} stroke="#ffffff" strokeWidth="0.4" opacity="0.5" />
          </g>
        )}
      </svg>

      {hasSubmitted && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'flex-end', justifyContent: 'center',
          paddingBottom: '12px', pointerEvents: 'none',
        }}>
          <div style={{
            padding: '6px 16px',
            borderRadius: '4px',
            background: 'rgba(8,12,20,0.85)',
            border: `1px solid ${palette.stroke}44`,
            color: 'rgba(255,255,255,0.6)',
            fontSize: '10px',
            fontFamily: "'DM Mono', monospace",
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            Answer locked
          </div>
        </div>
      )}
    </div>
  );
};