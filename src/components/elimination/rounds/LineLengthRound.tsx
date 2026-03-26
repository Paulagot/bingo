import { useAutoSubmit } from '../hooks/useAutoSubmit';
import { useEffect, useRef, useState, useCallback } from 'react';
import type { LineLengthConfig, LineLengthSubmission } from '../types/elimination';

interface Props {
  config: LineLengthConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: LineLengthSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const LineLengthRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt,
}) => {
  const colour = col(roundId);
  const containerRef = useRef<SVGSVGElement>(null);
  const [showRef, setShowRef] = useState(true);
  const [playerLength, setPlayerLength] = useState(0.3);
  const dragging = useRef(false);

  useEffect(() => {
    setShowRef(true);
    setPlayerLength(0.3);
    const t = setTimeout(() => setShowRef(false), config.referenceDurationMs);
    return () => clearTimeout(t);
  }, [roundId, config.referenceDurationMs]);

  const getLengthFromEvent = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = config.playerStartX * rect.width + rect.left;
    const sy = config.playerStartY * rect.height + rect.top;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    return Math.min(1.4, Math.max(0, Math.sqrt(dx*dx+dy*dy) / rect.width));
  }, [config.playerStartX, config.playerStartY]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (hasSubmitted || showRef) return;
    dragging.current = true;
    setPlayerLength(getLengthFromEvent(e));
  }, [hasSubmitted, showRef, getLengthFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    setPlayerLength(getLengthFromEvent(e));
  }, [getLengthFromEvent]);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  const handleLock = useCallback(() => {
    if (hasSubmitted) return;
    onSubmit({ roundId, playerId, roundType: 'line_length', submittedAt: Date.now(), length: playerLength });
  }, [hasSubmitted, roundId, playerId, playerLength, onSubmit]);

  const { isFlashing } = useAutoSubmit(hasSubmitted, endsAt ?? null, handleLock);

  // Reference line coords
  const rx = config.referenceLineX * 100;
  const ry = config.referenceLineY * 100;
  const refLen = config.targetLength * 100;

  // Player line
  const px = config.playerStartX * 100;
  const py = config.playerStartY * 100;
  const pLen = playerLength * 100;

  return (
    <div className="w-full flex flex-col items-center gap-6" style={{ touchAction: 'none' }}>
      <svg
        ref={containerRef}
        viewBox="0 0 100 100"
        style={{ width: '100%', aspectRatio: '1/1', maxHeight: 'min(45vh, 280px)', cursor: hasSubmitted ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <rect width="100" height="100" fill="rgba(255,255,255,0.02)" />

        {/* Reference line — shown briefly */}
        {showRef && (
          <g>
            <line x1={rx - refLen/2} y1={ry} x2={rx + refLen/2} y2={ry}
              stroke={colour} strokeWidth="1.2" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${colour})` }} />
            <text x={rx} y={ry - 3} textAnchor="middle" fill={colour} fontSize="3" fontFamily="Inter">Reference</text>
          </g>
        )}

        {/* Player line */}
        {!showRef && (
          <g>
            <circle cx={px} cy={py} r="1.5" fill={colour} />
            <line x1={px} y1={py} x2={px + pLen} y2={py}
              stroke={colour} strokeWidth="1" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }} />
            <circle cx={px + pLen} cy={py} r="2.5" fill={colour} opacity="0.7" />
            <text x={px + pLen/2} y={py+5} textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="2.5" fontFamily="Inter">
              {(playerLength * 100).toFixed(0)}%
            </text>
          </g>
        )}

        {showRef && (
          <text x="50" y="85" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="3" fontFamily="Inter">
            Memorise the length
          </text>
        )}
      </svg>

      {!showRef && !hasSubmitted && (
        <button onPointerDown={handleLock} style={{
          animation: isFlashing ? 'pulse 0.6s ease-in-out infinite alternate' : 'none',
          padding: '14px 40px', borderRadius: '8px', cursor: 'pointer',
          background: isFlashing ? `${colour}30` : `${colour}18`, border: `1px solid ${isFlashing ? colour+'cc' : colour+'66'}`,
          color: colour, fontFamily: 'Inter', fontSize: '14px', fontWeight: 600,
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Lock Length
        </button>
      )}
      {hasSubmitted && (
        <p style={{ color: `${colour}88`, fontFamily: 'Inter', fontSize: '13px' }}>Answer locked</p>
      )}
    </div>
  );
};