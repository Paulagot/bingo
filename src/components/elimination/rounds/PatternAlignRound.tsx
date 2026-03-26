import { useEffect, useRef, useState, useCallback } from 'react';
import type { PatternAlignConfig, PatternAlignSubmission } from '../types/elimination';
import { useAutoSubmit } from '../hooks/useAutoSubmit';

interface Props {
  config: PatternAlignConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: PatternAlignSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

const ngon = (n: number, r: number, cx: number, cy: number, rot: number) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n + (rot * Math.PI) / 180;
    return `${cx + r * Math.sin(a)},${cy - r * Math.cos(a)}`;
  }).join(' ');

const renderShape = (type: string, cx: number, cy: number, r: number, rotation: number, fill: string, stroke: string) => {
  const p = { fill, stroke, strokeWidth: '0.8' as const };
  switch (type) {
    case 'square': return <rect x={cx-r} y={cy-r} width={r*2} height={r*2} transform={`rotate(${rotation},${cx},${cy})`} {...p} />;
    case 'rectangle': return <rect x={cx-r*1.4} y={cy-r*0.7} width={r*2.8} height={r*1.4} transform={`rotate(${rotation},${cx},${cy})`} {...p} />;
    case 'triangle': return <polygon points={ngon(3,r,cx,cy,rotation)} {...p} />;
    case 'pentagon': return <polygon points={ngon(5,r,cx,cy,rotation)} {...p} />;
    case 'diamond': return <polygon points={ngon(4,r,cx,cy,rotation+45)} {...p} />;
    case 'hexagon': return <polygon points={ngon(6,r,cx,cy,rotation)} {...p} />;
    default: return <polygon points={ngon(5,r,cx,cy,rotation)} {...p} />;
  }
};

export const PatternAlignRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt }) => {
  const colour = col(roundId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [showTarget, setShowTarget] = useState(true);
  const [pos, setPos] = useState({ x: config.playerStartX, y: config.playerStartY });
  const [rotation, setRotation] = useState(config.playerStartRotation);
  const [hint, setHint] = useState(true); // show gesture hint briefly

  // Drag state
  const dragMode = useRef<'move' | 'rotate' | null>(null);
  const lastPtr = useRef({ x: 0, y: 0 });
  const shapeCentre = useRef({ x: pos.x, y: pos.y });

  useEffect(() => {
    setShowTarget(true);
    setPos({ x: config.playerStartX, y: config.playerStartY });
    setRotation(config.playerStartRotation);
    setHint(true);
    const t = setTimeout(() => setShowTarget(false), config.targetVisibleMs);
    const h = setTimeout(() => setHint(false), 3000);
    return () => { clearTimeout(t); clearTimeout(h); };
  }, [roundId, config.playerStartX, config.playerStartY, config.playerStartRotation, config.targetVisibleMs]);

  const toNorm = useCallback((e: { clientX: number; clientY: number }) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }, []);

  // Determine if pointer is near centre (move) or edge (rotate)
  const getMode = useCallback((normX: number, normY: number): 'move' | 'rotate' => {
    const dx = normX - shapeCentre.current.x;
    const dy = normY - shapeCentre.current.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const r = config.shapeSize * 0.8; // threshold
    return dist < r ? 'move' : 'rotate';
  }, [config.shapeSize]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (hasSubmitted || showTarget) return;
    const norm = toNorm(e);
    dragMode.current = getMode(norm.x, norm.y);
    lastPtr.current = norm;
    setHint(false);
    (e.target as SVGSVGElement).setPointerCapture?.(e.pointerId);
  }, [hasSubmitted, showTarget, toNorm, getMode]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragMode.current) return;
    const curr = toNorm(e);

    if (dragMode.current === 'move') {
      const dx = curr.x - lastPtr.current.x;
      const dy = curr.y - lastPtr.current.y;
      setPos(p => {
        const nx = Math.min(0.88, Math.max(0.12, p.x + dx));
        const ny = Math.min(0.88, Math.max(0.12, p.y + dy));
        shapeCentre.current = { x: nx, y: ny };
        return { x: nx, y: ny };
      });
    } else {
      // Rotate: angle of pointer relative to shape centre
      const cx = shapeCentre.current.x;
      const cy = shapeCentre.current.y;
      const prevAngle = Math.atan2(lastPtr.current.y - cy, lastPtr.current.x - cx);
      const currAngle = Math.atan2(curr.y - cy, curr.x - cx);
      const delta = (currAngle - prevAngle) * (180 / Math.PI);
      setRotation(r => (r + delta + 360) % 360);
    }
    lastPtr.current = curr;
  }, [toNorm]);

  const onPointerUp = useCallback(() => { dragMode.current = null; }, []);

  const handleLock = useCallback(() => {
    if (hasSubmitted) return;
    onSubmit({ roundId, playerId, roundType: 'pattern_align', submittedAt: Date.now(),
      position: pos, rotation: Math.round(rotation) });
  }, [hasSubmitted, roundId, playerId, pos, rotation, onSubmit]);

  const { isFlashing } = useAutoSubmit(hasSubmitted, endsAt ?? null, handleLock);

  // Keep shapeCentre ref in sync
  useEffect(() => { shapeCentre.current = pos; }, [pos]);

  const r = config.shapeSize * 55; // slightly larger
  const cx = pos.x * 100;
  const cy = pos.y * 100;

  return (
    <div className="w-full flex flex-col items-center gap-3" style={{ touchAction: 'none' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        style={{ width: '100%', aspectRatio: '1/1', maxHeight: 'min(50vh, 300px)', cursor: hasSubmitted ? 'default' : 'crosshair' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />

        {/* Target — shown briefly */}
        {showTarget && (
          <g>
            {renderShape(config.shapeType, config.targetX*100, config.targetY*100, r, config.targetRotation, `${colour}30`, colour)}
            <text x={config.targetX*100} y={config.targetY*100 + r + 7}
              textAnchor="middle" fill={colour} fontSize="3.5" fontFamily="Inter">
              Remember this
            </text>
          </g>
        )}

        {/* Player shape */}
        {!showTarget && (
          <g>
            {/* Rotate zone indicator ring — subtle outer ring */}
            <circle cx={cx} cy={cy} r={r + 8} fill="none"
              stroke={`${colour}18`} strokeWidth="4" strokeDasharray="3,3" />

            {renderShape(config.shapeType, cx, cy, r, rotation, `${colour}25`, colour)}

            {/* Centre dot — drag here to move */}
            <circle cx={cx} cy={cy} r="2.5" fill={colour} opacity="0.7" />

            {/* Gesture hint arrows */}
            {hint && (
              <g opacity="0.5">
                {/* Move arrows */}
                <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                  fill={colour} fontSize="5" fontFamily="Inter">✥</text>
                {/* Rotate hint on outer ring */}
                <text x={cx + r + 10} y={cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fill={colour} fontSize="4" fontFamily="Inter">↻</text>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Gesture instructions */}
      {!showTarget && !hasSubmitted && (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>✥</div>
            Drag centre to move
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
            <div style={{ fontSize: '16px', marginBottom: '2px' }}>↻</div>
            Drag edge to rotate
          </div>
        </div>
      )}

      {!showTarget && !hasSubmitted && (
        <button onPointerDown={handleLock} style={{
          padding: '12px 36px', borderRadius: '8px', cursor: 'pointer',
          background: isFlashing ? `${colour}30` : `${colour}18`,
          border: `1px solid ${isFlashing ? colour+'cc' : colour+'66'}`,
          color: colour, fontFamily: 'Inter', fontSize: '14px', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase' as const,
          animation: isFlashing ? 'pulse 0.6s ease-in-out infinite alternate' : 'none',
        }}>
          {isFlashing ? '⚡ Lock!' : 'Lock Position'}
        </button>
      )}

      {showTarget && (
        <p style={{ color: colour, fontFamily: 'Inter', fontSize: '14px', fontWeight: 600, margin: 0 }}>
          Memorise position &amp; rotation
        </p>
      )}
      {hasSubmitted && (
        <p style={{ color: `${colour}88`, fontFamily: 'Inter', fontSize: '13px', margin: 0 }}>Answer locked</p>
      )}
    </div>
  );
};