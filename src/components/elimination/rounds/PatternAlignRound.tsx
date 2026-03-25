import { useAutoSubmit } from '../hooks/useAutoSubmit';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { PatternAlignConfig, PatternAlignSubmission } from '../types/elimination';

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

export const PatternAlignRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt,
}) => {
  const colour = col(roundId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [showTarget, setShowTarget] = useState(true);
  const [pos, setPos] = useState({ x: config.playerStartX, y: config.playerStartY });
  const [rotation, setRotation] = useState(config.playerStartRotation);
  const dragging = useRef<'move' | null>(null);
  const lastPtr = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setShowTarget(true);
    setPos({ x: config.playerStartX, y: config.playerStartY });
    setRotation(config.playerStartRotation);
    const t = setTimeout(() => setShowTarget(false), config.targetVisibleMs);
    return () => clearTimeout(t);
  }, [roundId, config.playerStartX, config.playerStartY, config.playerStartRotation, config.targetVisibleMs]);

  const toNorm = useCallback((e: React.PointerEvent<Element>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
  }, []);

  const onShapeDown = useCallback((e: React.PointerEvent<Element>) => {
    if (hasSubmitted || showTarget) return;
    e.stopPropagation();
    dragging.current = 'move';
    lastPtr.current = toNorm(e);
  }, [hasSubmitted, showTarget, toNorm]);

  const onSvgMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    const curr = toNorm(e);
    const dx = curr.x - lastPtr.current.x;
    const dy = curr.y - lastPtr.current.y;
    lastPtr.current = curr;
    setPos(p => ({
      x: Math.min(0.88, Math.max(0.12, p.x + dx)),
      y: Math.min(0.88, Math.max(0.12, p.y + dy)),
    }));
  }, [toNorm]);

  const onSvgUp = useCallback(() => { dragging.current = null; }, []);

  const rotateBy = useCallback((deg: number) => {
    if (hasSubmitted) return;
    setRotation(r => (r + deg + 360) % 360);
  }, [hasSubmitted]);

  const handleLock = useCallback(() => {
    if (hasSubmitted) return;
    onSubmit({ roundId, playerId, roundType: 'pattern_align', submittedAt: Date.now(),
      position: pos, rotation: Math.round(rotation) });
  }, [hasSubmitted, roundId, playerId, pos, rotation, onSubmit]);

  const { isFlashing } = useAutoSubmit(hasSubmitted, endsAt ?? null, handleLock);

  const r = config.shapeSize * 50;
  const cx = pos.x * 100;
  const cy = pos.y * 100;

  return (
    <div className="w-full flex flex-col items-center gap-4" style={{ touchAction: 'none' }}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        style={{ width: '100%', aspectRatio: '1/1' }}
        onPointerMove={onSvgMove}
        onPointerUp={onSvgUp}
        onPointerLeave={onSvgUp}
      >
        <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />

        {/* Target — shown briefly */}
        {showTarget && (
          <g>
            {renderShape(config.shapeType, config.targetX*100, config.targetY*100, r, config.targetRotation, `${colour}30`, colour)}
            <text x={config.targetX*100} y={config.targetY*100 + r + 6}
              textAnchor="middle" fill={colour} fontSize="3" fontFamily="Inter">Remember this position</text>
          </g>
        )}

        {/* Player shape — draggable */}
        {!showTarget && (
          <g onPointerDown={onShapeDown} style={{ cursor: hasSubmitted ? 'default' : 'grab' }}>
            {renderShape(config.shapeType, cx, cy, r, rotation, `${colour}22`, colour)}
            {/* Centre dot */}
            <circle cx={cx} cy={cy} r="1.5" fill={colour} opacity="0.6" />
          </g>
        )}
      </svg>

      {/* Rotation controls — clearly labelled */}
      {!showTarget && !hasSubmitted && (
        <div className="flex items-center gap-3 w-full" style={{ maxWidth: '280px' }}>
          <button onPointerDown={() => rotateBy(-15)} style={rotBtn(colour)}>↺ 15°</button>
          <button onPointerDown={() => rotateBy(-5)} style={rotBtn(colour)}>↺ 5°</button>
          <div style={{ flex: 1, textAlign: 'center', fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            {Math.round(rotation)}°
          </div>
          <button onPointerDown={() => rotateBy(5)} style={rotBtn(colour)}>5° ↻</button>
          <button onPointerDown={() => rotateBy(15)} style={rotBtn(colour)}>15° ↻</button>
        </div>
      )}

      {!showTarget && !hasSubmitted && (
        <div className="flex gap-3 w-full" style={{ maxWidth: '280px' }}>
          <div style={{ flex: 1, fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: '4px' }}>
            Drag shape to move
          </div>
          <button onPointerDown={handleLock} style={{
            padding: '12px 24px', borderRadius: '8px', cursor: 'pointer',
            background: isFlashing ? `${colour}30` : `${colour}18`,
            border: `1px solid ${isFlashing ? colour + 'cc' : colour + '66'}`,
            color: colour, fontFamily: 'Inter', fontSize: '13px', fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            animation: isFlashing ? 'pulse 0.6s ease-in-out infinite alternate' : 'none',
          }}>
            {isFlashing ? '⚡ Lock!' : 'Lock'}
          </button>
        </div>
      )}

      {showTarget && (
        <p style={{ color: colour, fontFamily: 'Inter', fontSize: '14px', fontWeight: 600, letterSpacing: '0.06em', margin: 0 }}>
          Memorise position &amp; rotation
        </p>
      )}
      {hasSubmitted && (
        <p style={{ color: `${colour}88`, fontFamily: 'Inter', fontSize: '13px', margin: 0 }}>Answer locked</p>
      )}
    </div>
  );
};

const rotBtn = (c: string): React.CSSProperties => ({
  padding: '8px 10px', borderRadius: '6px', cursor: 'pointer',
  background: `${c}12`, border: `1px solid ${c}33`,
  color: c, fontFamily: 'Inter', fontSize: '12px', fontWeight: 600,
  whiteSpace: 'nowrap' as const,
});