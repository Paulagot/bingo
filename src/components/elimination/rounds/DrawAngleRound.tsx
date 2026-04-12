import { useRef, useState, useCallback, useEffect } from 'react';
import { useAutoSubmit } from '../hooks/useAutoSubmit';
import type { DrawAngleConfig, DrawAngleSubmission } from '../types/elimination';

interface Props {
  config: DrawAngleConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: DrawAngleSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };
const toRad = (d: number) => (d * Math.PI) / 180;

export const DrawAngleRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt,
}) => {
  const colour = col(roundId);
  const [angle, setAngle] = useState(config.initialAngle);
  const [showGuide, setShowGuide] = useState(true);
  const [locked, setLocked] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);
  const containerRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  // Hide guide after guideVisibleMs
  useEffect(() => {
    setAngle(config.initialAngle);
    setShowGuide(true);
    const t = setTimeout(() => setShowGuide(false), config.guideVisibleMs);
    return () => clearTimeout(t);
  }, [roundId, config.initialAngle, config.guideVisibleMs]);

  const getAngleFromEvent = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = config.anchorX * rect.width;
    const cy = config.anchorY * rect.height;
    const dx = e.clientX - rect.left - cx;
    const dy = e.clientY - rect.top - cy;
    let deg = (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360;
    // Clamp to 0–180
    if (deg > 180) deg = 360 - deg;
    return Math.round(deg);
  }, [config.anchorX, config.anchorY]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (hasSubmitted) return;
    dragging.current = true;
    setHasMoved(true);
    setAngle(getAngleFromEvent(e));
  }, [hasSubmitted, getAngleFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || hasSubmitted) return;
    setHasMoved(true);
    setAngle(getAngleFromEvent(e));
  }, [hasSubmitted, getAngleFromEvent]);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  const handleLock = useCallback(() => {
    if (hasSubmitted || locked) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'draw_angle', submittedAt: Date.now(), angle });
  }, [hasSubmitted, locked, roundId, playerId, angle, onSubmit]);

  useAutoSubmit(hasSubmitted, endsAt ?? null, handleLock);

  const cx = config.anchorX * 100;
  const cy = config.anchorY * 100;
  const len = config.lineLength * 100;
  const rad = toRad(angle - 90);
  // Clamp endpoints to stay within SVG viewBox (2–98 range)
  const clampSVG = (v: number) => Math.min(97, Math.max(3, v));
  const ex = clampSVG(cx + len * Math.cos(rad));
  const ey = clampSVG(cy + len * Math.sin(rad));
  const trad = toRad(config.targetAngle - 90);
  const tex = clampSVG(cx + len * Math.cos(trad));
  const tey = clampSVG(cy + len * Math.sin(trad));

  return (
    <div className="w-full flex flex-col items-center gap-6" style={{ touchAction: 'none' }}>
      <svg
        ref={containerRef}
        viewBox="0 0 100 100"
        className="w-full"
        style={{ width: '100%', aspectRatio: '1/1', maxHeight: 'min(50vh, 320px)', cursor: hasSubmitted ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <defs>
          <pattern id={`ag-${roundId}`} width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill={`url(#ag-${roundId})`} />

        {/* Target guide — fades after guideVisibleMs */}
        {showGuide && (
          <g opacity="0.4">
            <line x1={cx} y1={cy} x2={tex} y2={tey} stroke={colour} strokeWidth="0.6" strokeDasharray="2,2" />
            <text x={tex+1} y={tey-1} fill={colour} fontSize="3" fontFamily="Inter">target</text>
          </g>
        )}

        {/* Pivot */}
        <circle cx={cx} cy={cy} r="1.5" fill={colour} style={{ filter: `drop-shadow(0 0 3px ${colour})` }} />

        {/* Player line */}
        <line x1={cx} y1={cy} x2={ex} y2={ey}
          stroke={colour} strokeWidth="0.8" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${colour}88)` }} />
        <circle cx={ex} cy={ey} r="2" fill={colour} opacity="0.8" />


      </svg>

      {!hasSubmitted && !locked && hasMoved && (
        <button onPointerDown={handleLock} style={{
          padding: '10px 32px', borderRadius: '8px', cursor: 'pointer',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)',
          color: '#ffffff', fontFamily: 'Inter, system-ui', fontSize: '13px', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        }}>
          Lock In ✓
        </button>
      )}
      {!hasMoved && !hasSubmitted && (
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', fontFamily: 'Inter, system-ui', margin: 0 }}>
          Drag to rotate the line
        </p>
      )}
      {(locked || hasSubmitted) && (
        <p style={{ color: `${colour}88`, fontFamily: 'Inter, system-ui', fontSize: '12px', margin: 0 }}>Locked in</p>
      )}
    </div>
  );
};