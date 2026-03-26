import { useAutoSubmit } from '../hooks/useAutoSubmit';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { BalancePointConfig, BalancePointSubmission } from '../types/elimination';

interface Props {
  config: BalancePointConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: BalancePointSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const BalancePointRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt,
}) => {
  const colour = col(roundId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [moveableX, setMoveableX] = useState(0.5); // normalised 0–1
  const [dragging, setDragging] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    // Start moveable weight at a random position away from the answer
    setMoveableX(config.centreOfMass > 0.5 ? 0.15 : 0.85);
    setLocked(false);
  }, [roundId, config.centreOfMass]);

  const getNormX = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return 0.5;
    const rect = svgRef.current.getBoundingClientRect();
    return Math.min(0.95, Math.max(0.05, (e.clientX - rect.left) / rect.width));
  }, []);

  const onDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (hasSubmitted || locked) return;
    setDragging(true);
    setMoveableX(getNormX(e));
  }, [hasSubmitted, locked, getNormX]);

  const onMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    setMoveableX(getNormX(e));
  }, [dragging, getNormX]);

  const onUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
  }, [dragging]);

  const handleLock = useCallback(() => {
    if (locked || hasSubmitted) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'balance_point', submittedAt: Date.now(), x: moveableX });
  }, [locked, hasSubmitted, moveableX, roundId, playerId, onSubmit]);

  const { isFlashing } = useAutoSubmit(hasSubmitted, endsAt ?? null, handleLock);

  const maxW = Math.max(...config.weights.map(w => w.weight));
  const lineY = 38;

  return (
    <div className="w-full flex flex-col items-center gap-3">
      {/* Clear instruction */}
      <div style={{
        width: '100%', padding: '10px 16px', borderRadius: '8px',
        background: `${colour}10`, border: `1px solid ${colour}28`, textAlign: 'center',
      }}>
        <p style={{ margin: 0, color: colour, fontFamily: 'Inter', fontSize: '13px', fontWeight: 600 }}>
          Drag the <span style={{ color: '#ffffff' }}>white weight</span> to balance the beam
        </p>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 100 75"
        style={{ width: '100%', maxHeight: 'min(45vh, 280px)', display: 'block', touchAction: 'none',
          cursor: hasSubmitted ? 'default' : dragging ? 'grabbing' : 'grab' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {/* Beam */}
        <line x1="5" y1={lineY} x2="95" y2={lineY}
          stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinecap="round" />
        <line x1="5" y1={lineY-3} x2="5" y2={lineY+3} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
        <line x1="95" y1={lineY-3} x2="95" y2={lineY+3} stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />

        {/* Fixed weights — coloured */}
        {config.weights.map((w, i) => {
          const wx = 5 + w.position * 90;
          const r = 3.5 + (w.weight / maxW) * 5.5;
          const hangY = lineY + 3 + r;
          return (
            <g key={i}>
              <line x1={wx} y1={lineY + 1} x2={wx} y2={hangY - r}
                stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
              <circle cx={wx} cy={hangY} r={r}
                fill={`${colour}25`} stroke={colour} strokeWidth="0.6"
                style={{ filter: `drop-shadow(0 0 3px ${colour}55)` }} />
              <text x={wx} y={hangY + 1} textAnchor="middle" dominantBaseline="middle"
                fill={colour} fontSize={Math.min(5, r * 0.9)}
                fontFamily="'Bebas Neue', Impact, sans-serif">{w.weight}</text>
            </g>
          );
        })}

        {/* Moveable weight — white, clearly different */}
        {(() => {
          const mx = 5 + moveableX * 90;
          const mr = 5;
          const hangY = lineY - 3 - mr; // hangs ABOVE the beam
          return (
            <g style={{ cursor: hasSubmitted ? 'default' : 'grab' }}>
              {/* Hang line above beam */}
              <line x1={mx} y1={lineY - 1} x2={mx} y2={hangY + mr}
                stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
              {/* White circle */}
              <circle cx={mx} cy={hangY} r={mr}
                fill="rgba(255,255,255,0.15)"
                stroke={locked ? `${colour}` : '#ffffff'}
                strokeWidth="0.8"
                style={{ filter: locked ? `drop-shadow(0 0 4px ${colour})` : 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }} />
              <text x={mx} y={hangY + 1} textAnchor="middle" dominantBaseline="middle"
                fill={locked ? colour : '#ffffff'} fontSize="4"
                fontFamily="'Bebas Neue', Impact, sans-serif">?</text>
              {/* Arrow hint when not locked */}
              {!locked && !hasSubmitted && (
                <>
                  <text x={mx - 8} y={hangY + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.3)" fontSize="5">←</text>
                  <text x={mx + 8} y={hangY + 1} textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.3)" fontSize="5">→</text>
                </>
              )}
            </g>
          );
        })()}

        {/* Lock indicator */}
        {(locked || hasSubmitted) && (
          <text x="50" y="70" textAnchor="middle"
            fill={`${colour}88`} fontSize="3" fontFamily="Inter">Locked in</text>
        )}
      </svg>

      {!hasSubmitted && !locked && (
        <button onPointerDown={handleLock} style={{
          animation: isFlashing ? 'pulse 0.6s ease-in-out infinite alternate' : 'none',
          padding: '12px 36px', borderRadius: '8px', cursor: 'pointer',
          background: `${colour}18`, border: `1px solid ${colour}66`,
          color: colour, fontFamily: 'Inter', fontSize: '14px', fontWeight: 600,
          letterSpacing: '0.08em', textTransform: 'uppercase' as const,
        }}>
          Lock Position
        </button>
      )}
    </div>
  );
};