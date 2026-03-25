import { useRef, useState, useCallback, useEffect } from 'react';
import type { TrueCentreConfig, TrueCentreSubmission } from '../types/elimination';
import { getTapPosition } from '../utils/eliminationHelpers';

interface Props {
  config: TrueCentreConfig;
  roundId: string;
  playerId: string;
  onSubmit: (submission: TrueCentreSubmission) => void;
  hasSubmitted: boolean;
  submittedTap?: { x: number; y: number };
}

const PALETTE = [
  { stroke: '#00e5ff', fill: 'rgba(0,229,255,0.08)', glow: '#00e5ff' },
  { stroke: '#ff3b5c', fill: 'rgba(255,59,92,0.08)',  glow: '#ff3b5c' },
  { stroke: '#ffe600', fill: 'rgba(255,230,0,0.07)',  glow: '#ffe600' },
  { stroke: '#00ff94', fill: 'rgba(0,255,148,0.07)',  glow: '#00ff94' },
  { stroke: '#bf5af2', fill: 'rgba(191,90,242,0.08)', glow: '#bf5af2' },
  { stroke: '#ff9f0a', fill: 'rgba(255,159,10,0.08)', glow: '#ff9f0a' },
];

const paletteForRound = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
};

export const TrueCentreRound: React.FC<Props> = ({
  config, roundId, playerId, onSubmit, hasSubmitted, submittedTap,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tapMarker, setTapMarker] = useState<{ x: number; y: number } | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const [pulsing, setPulsing] = useState(true);

  const palette = paletteForRound(roundId);

  useEffect(() => {
    setTapMarker(submittedTap ?? null);
    setRipple(null);
    setPulsing(true);
  }, [roundId]);

  // Stop pulse animation once submitted
  useEffect(() => {
    if (hasSubmitted) setPulsing(false);
  }, [hasSubmitted]);

  const handleTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (hasSubmitted || !containerRef.current) return;
    e.preventDefault();
    const { normX, normY } = getTapPosition(e, containerRef.current);
    setTapMarker({ x: normX, y: normY });
    setRipple({ x: normX, y: normY, key: Date.now() });
    setPulsing(false);
    onSubmit({
      roundId, playerId,
      roundType: 'true_centre',
      submittedAt: Date.now(),
      tapX: normX, tapY: normY,
    });
  }, [hasSubmitted, roundId, playerId, onSubmit]);

  const { shapeType, shapePosition, shapeSize, rotation } = config;
  const cx = shapePosition.x * 100;
  const cy = shapePosition.y * 100;
  const w = shapeSize.width * 100;
  const h = shapeSize.height * 100;

  // Generate polygon points for regular n-gon centred at (cx, cy)
  const ngon = (n: number, rx: number, ry: number, offsetAngle = 0) =>
    Array.from({ length: n }, (_, i) => {
      const a = (i * 2 * Math.PI) / n + offsetAngle;
      return `${cx + rx * Math.sin(a)},${cy - ry * Math.cos(a)}`;
    }).join(' ');

  const renderShape = () => {
    const transform = `rotate(${rotation}, ${cx}, ${cy})`;
    const base = { fill: palette.fill, stroke: palette.stroke, strokeWidth: '0.6' as const };
    switch (shapeType) {
      case 'circle':
        return <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} {...base} />;
      case 'square':
      case 'rectangle':
        return <rect x={cx - w/2} y={cy - h/2} width={w} height={h} transform={transform} {...base} />;
      case 'triangle': {
        const pts = ngon(3, w/2, h/2);
        return <polygon points={pts} transform={transform} {...base} />;
      }
      case 'diamond': {
        const pts = ngon(4, w/2, h/2, Math.PI/4);
        return <polygon points={pts} transform={transform} {...base} />;
      }
      case 'pentagon': {
        const pts = ngon(5, w/2, h/2);
        return <polygon points={pts} transform={transform} {...base} />;
      }
      case 'hexagon': {
        const pts = ngon(6, w/2, h/2);
        return <polygon points={pts} transform={transform} {...base} />;
      }
      default: return null;
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handleTap}
      className="relative w-full"
      style={{ aspectRatio: '1/1', touchAction: 'none', cursor: hasSubmitted ? 'default' : 'crosshair', userSelect: 'none' }}
    >
      <style>{`
        @keyframes shapePulse {
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 4px ${palette.glow}66); }
          50% { opacity: 0.75; filter: drop-shadow(0 0 12px ${palette.glow}cc); }
        }
        @keyframes rippleOut {
          0% { r: 1; opacity: 0.8; }
          100% { r: 12; opacity: 0; }
        }
        @keyframes markerIn {
          0% { r: 0; opacity: 0; }
          60% { r: 2.2; }
          100% { r: 1.5; opacity: 1; }
        }
      `}</style>

      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <defs>
          <pattern id={`grid-${roundId}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.25" />
          </pattern>
          <radialGradient id={`shapeGrad-${roundId}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={palette.stroke} stopOpacity="0.18" />
            <stop offset="100%" stopColor={palette.stroke} stopOpacity="0.03" />
          </radialGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#grid-${roundId})`} />

        {/* Shape with gradient fill */}
        <g style={{
          animation: pulsing ? 'shapePulse 2s ease-in-out infinite' : 'none',
        }}>
          {/* Gradient fill layer — uses same ngon helper */}
          <g>
            {shapeType === 'circle' && (
              <ellipse cx={cx} cy={cy} rx={w/2} ry={h/2}
                fill={`url(#shapeGrad-${roundId})`} stroke="none" />
            )}
            {(shapeType === 'square' || shapeType === 'rectangle') && (
              <rect x={cx-w/2} y={cy-h/2} width={w} height={h}
                transform={`rotate(${rotation}, ${cx}, ${cy})`}
                fill={`url(#shapeGrad-${roundId})`} stroke="none" />
            )}
            {(shapeType === 'triangle' || shapeType === 'diamond' || shapeType === 'pentagon' || shapeType === 'hexagon') && (
              <polygon
                points={ngon(
                  shapeType === 'triangle' ? 3 : shapeType === 'diamond' ? 4 : shapeType === 'pentagon' ? 5 : 6,
                  w/2, h/2,
                  shapeType === 'diamond' ? Math.PI/4 : 0
                )}
                transform={`rotate(${rotation}, ${cx}, ${cy})`}
                fill={`url(#shapeGrad-${roundId})`} stroke="none" />
            )}
          </g>
          {/* Stroke layer */}
          {renderShape()}
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
            strokeWidth="0.4"
            style={{ animation: 'rippleOut 0.5s ease-out forwards' }}
          />
        )}

        {/* Tap marker */}
        {tapMarker && (
          <g>
            <circle
              cx={tapMarker.x * 100}
              cy={tapMarker.y * 100}
              r="1.5"
              fill="#ffffff"
              style={{ animation: 'markerIn 0.3s ease-out forwards', filter: 'drop-shadow(0 0 2px #ffffff)' }}
            />
            <line x1={tapMarker.x*100-2.5} y1={tapMarker.y*100} x2={tapMarker.x*100+2.5} y2={tapMarker.y*100} stroke="#ffffff" strokeWidth="0.3" opacity="0.6" />
            <line x1={tapMarker.x*100} y1={tapMarker.y*100-2.5} x2={tapMarker.x*100} y2={tapMarker.y*100+2.5} stroke="#ffffff" strokeWidth="0.3" opacity="0.6" />
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
            fontFamily: "'Inter', system-ui, sans-serif",
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