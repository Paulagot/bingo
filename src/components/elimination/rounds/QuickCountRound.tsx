import { useEffect, useState, useCallback, useRef } from 'react';
import type { QuickCountConfig, QuickCountSubmission } from '../types/elimination';
import { useAutoSubmit } from '../hooks/useAutoSubmit';

interface Props {
  config: QuickCountConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: QuickCountSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const QuickCountRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt }) => {
  const colour = col(roundId);
  const [showDots, setShowDots] = useState(true);
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowDots(true);
    setValue('');
    setLocked(false);
    const t = setTimeout(() => {
      setShowDots(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }, config.displayDurationMs);
    return () => clearTimeout(t);
  }, [roundId, config.displayDurationMs]);

  const handleSubmit = useCallback(() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || locked || hasSubmitted) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'quick_count', submittedAt: Date.now(), value: num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  // Auto-submit with current value (default 0 if nothing entered)
  const handleAutoSubmit = useCallback(() => {
    if (locked || hasSubmitted) return;
    const num = parseInt(value, 10);
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'quick_count', submittedAt: Date.now(), value: isNaN(num) ? 0 : num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  useAutoSubmit(hasSubmitted || showDots, endsAt ?? null, handleAutoSubmit);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  const dotRadius = config.dotRadius * 100;

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* Dot canvas */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxHeight: 'min(50vh, 340px)' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id={`qcg-${roundId}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.25" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#qcg-${roundId})`} />
          {showDots && config.dots.map((dot, i) => (
            <circle key={i} cx={dot.x * 100} cy={dot.y * 100} r={dotRadius}
              fill={colour} opacity="0.9"
              style={{ filter: `drop-shadow(0 0 2px ${colour}88)` }} />
          ))}
          {!showDots && (
            <text x="50" y="52" textAnchor="middle" fill="rgba(255,255,255,0.15)"
              fontSize="5.5" fontFamily="Inter, system-ui">How many dots?</text>
          )}
        </svg>
      </div>

      {/* Input section */}
      {!showDots && (
        <div className="w-full flex flex-col items-center gap-3" style={{ maxWidth: '260px' }}>
          {/* Keyboard input */}
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={handleKeyDown}
            disabled={locked || hasSubmitted}
            placeholder="Type a number"
            style={{
              width: '100%', padding: '14px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${value ? colour + '66' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px', color: '#ffffff',
              fontSize: '32px', fontFamily: "'Bebas Neue', Impact, sans-serif",
              letterSpacing: '0.08em', textAlign: 'center', outline: 'none',
            }}
          />


        </div>
      )}

      {showDots && (
        <p style={{ color: colour, fontFamily: 'Inter', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em', margin: 0 }}>
          Count the dots!
        </p>
      )}
    </div>
  );
};