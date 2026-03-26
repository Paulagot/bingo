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

export const LineLengthRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt }) => {
  const colour = col(roundId);
  const containerRef = useRef<SVGSVGElement>(null);
  const [showRef, setShowRef] = useState(true);
  const [playerLength, setPlayerLength] = useState(0.3);
  const dragging = useRef(false);
  // Lock dragging until reference is hidden — prevents cheating
  const [dragEnabled, setDragEnabled] = useState(false);

  useEffect(() => {
    setShowRef(true);
    setPlayerLength(0.3);
    setDragEnabled(false);
    const t = setTimeout(() => {
      setShowRef(false);
      setDragEnabled(true);
    }, config.referenceDurationMs);
    return () => clearTimeout(t);
  }, [roundId, config.referenceDurationMs]);

  const getLengthFromEvent = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const sx = config.playerStartX * rect.width + rect.left;
    const sy = config.playerStartY * rect.height + rect.top;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    return Math.min(1.4, Math.max(0.01, Math.sqrt(dx*dx+dy*dy) / rect.width));
  }, [config.playerStartX, config.playerStartY]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (hasSubmitted || !dragEnabled) return;
    dragging.current = true;
    setPlayerLength(getLengthFromEvent(e));
  }, [hasSubmitted, dragEnabled, getLengthFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging.current) return;
    setPlayerLength(getLengthFromEvent(e));
  }, [getLengthFromEvent]);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  // Auto-submit only — no manual button
  const handleSubmit = useCallback(() => {
    if (hasSubmitted) return;
    onSubmit({ roundId, playerId, roundType: 'line_length', submittedAt: Date.now(), length: playerLength });
  }, [hasSubmitted, roundId, playerId, playerLength, onSubmit]);

  useAutoSubmit(hasSubmitted, endsAt ?? null, handleSubmit);

  const rx = config.referenceLineX * 100;
  const ry = config.referenceLineY * 100;
  // Ensure minimum visible reference line — at least 20% of viewport
  const refLen = Math.max(20, config.targetLength * 100);

  const px = config.playerStartX * 100;
  const py = config.playerStartY * 100;
  const pLen = Math.max(2, playerLength * 100);

  return (
    <div className="w-full flex flex-col items-center" style={{ touchAction: 'none' }}>
      <svg
        ref={containerRef}
        viewBox="0 0 100 100"
        style={{ width: '100%', aspectRatio: '1/1', maxHeight: 'min(70vh, 380px)',
          cursor: (!dragEnabled || hasSubmitted) ? 'default' : 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <rect width="100" height="100" fill="rgba(255,255,255,0.02)" />

        {/* Reference line */}
        {showRef && (
          <g>
            <line x1={rx - refLen/2} y1={ry} x2={rx + refLen/2} y2={ry}
              stroke={colour} strokeWidth="1.5" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${colour})` }} />
            <circle cx={rx - refLen/2} cy={ry} r="1.5" fill={colour} />
            <circle cx={rx + refLen/2} cy={ry} r="1.5" fill={colour} />
            <text x={rx} y={ry - 4} textAnchor="middle" fill={colour} fontSize="3.5" fontFamily="Inter" fontWeight="600">
              Memorise this length
            </text>
          </g>
        )}

        {/* Player line — no percentage label */}
        {!showRef && (
          <g>
            <circle cx={px} cy={py} r="2" fill={colour}
              style={{ filter: `drop-shadow(0 0 4px ${colour})` }} />
            <line x1={px} y1={py} x2={px + pLen} y2={py}
              stroke={colour} strokeWidth="1.5" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }} />
            {/* Drag handle — bigger for mobile */}
            <circle cx={px + pLen} cy={py} r={hasSubmitted ? 2 : 4} fill={colour} opacity="0.9"
              style={{ filter: `drop-shadow(0 0 4px ${colour})` }} />
            {!hasSubmitted && (
              <text x={px + pLen} y={py + 9} textAnchor="middle"
                fill={colour} fontSize="3" fontFamily="Inter" opacity="0.6">drag</text>
            )}
          </g>
        )}

        {showRef && (
          <text x="50" y="90" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="3" fontFamily="Inter">
            Then drag to match it
          </text>
        )}
        {!showRef && hasSubmitted && (
          <text x="50" y="90" textAnchor="middle" fill={`${colour}88`} fontSize="3" fontFamily="Inter">
            Locked in
          </text>
        )}
      </svg>
    </div>
  );
};