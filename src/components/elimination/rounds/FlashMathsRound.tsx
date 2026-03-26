import { useEffect, useState, useCallback, useRef } from 'react';
import type { FlashMathsConfig, FlashMathsSubmission } from '../types/elimination';
import { useAutoSubmit } from '../hooks/useAutoSubmit';

interface Props {
  config: FlashMathsConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: FlashMathsSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const FlashMathsRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt,
}) => {
  const colour = col(roundId);
  const [showNumbers, setShowNumbers] = useState(true);
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowNumbers(true);
    setValue('');
    setLocked(false);
    const t = setTimeout(() => {
      setShowNumbers(false);
      // Auto-focus keyboard input when numbers hide
      setTimeout(() => inputRef.current?.focus(), 100);
    }, config.displayDurationMs);
    return () => clearTimeout(t);
  }, [roundId, config.displayDurationMs]);

  const handleAutoSubmit = useCallback(() => {
    const num = parseInt(value, 10);
    if (locked || hasSubmitted) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'flash_maths', submittedAt: Date.now(), value: isNaN(num) ? 0 : num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  const { isFlashing } = useAutoSubmit(hasSubmitted || showNumbers, endsAt ?? null, handleAutoSubmit);

  const handleSubmit = useCallback(() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || locked || hasSubmitted) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'flash_maths', submittedAt: Date.now(), value: num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Number flash canvas */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxHeight: 'min(50vh, 340px)' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <rect width="100" height="100" fill="transparent" />
          {showNumbers && config.numbers.map((n, i) => {
            const pos = config.positions[i]!;
            return (
              <text key={i} x={pos.x * 100} y={pos.y * 100}
                textAnchor="middle" fill={colour}
                fontSize={pos.fontSize * 100}
                fontFamily="'Bebas Neue', Impact, sans-serif"
                style={{ filter: `drop-shadow(0 0 4px ${colour}88)` }}>
                {n}
              </text>
            );
          })}
          {!showNumbers && (
            <text x="50" y="50" textAnchor="middle" fill="rgba(255,255,255,0.15)"
              fontSize="5" fontFamily="Inter, system-ui">What was the total?</text>
          )}
        </svg>
      </div>

      {/* Input section — shown after flash */}
      {!showNumbers && (
        <div className="w-full flex flex-col items-center gap-4" style={{ maxWidth: '280px' }}>
          {/* Keyboard input */}
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={handleKeyDown}
            disabled={locked || hasSubmitted}
            placeholder="Type your answer"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${value ? colour + '66' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '28px',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              letterSpacing: '0.08em',
              textAlign: 'center',
              outline: 'none',
              MozAppearance: 'textfield',
            }}
          />

          {/* +/− buttons as backup */}
          <div className="flex gap-3 items-center">
            <button onPointerDown={() => setValue(v => String(Math.max(0, parseInt(v||'0',10)-1)))}
              style={btnS(colour)}>−</button>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter', fontSize: '12px' }}>adjust</span>
            <button onPointerDown={() => setValue(v => String(parseInt(v||'0',10)+1))}
              style={btnS(colour)}>+</button>
          </div>

          {!hasSubmitted && (
            <button onPointerDown={handleSubmit} disabled={!value || locked} style={{
              width: '100%', padding: '14px', borderRadius: '8px',
              background: isFlashing ? `${colour}30` : (value ? `${colour}18` : 'rgba(255,255,255,0.04)'),
              border: `1px solid ${isFlashing ? colour+'cc' : (value ? colour+'66' : 'rgba(255,255,255,0.08)')}`,
              color: value ? colour : 'rgba(255,255,255,0.3)',
              fontFamily: 'Inter', fontSize: '14px', fontWeight: 600,
              cursor: value && !locked ? 'pointer' : 'default',
              letterSpacing: '0.1em', textTransform: 'uppercase' as const,
              animation: isFlashing && !locked ? 'pulse 0.6s ease-in-out infinite alternate' : 'none',
            }}>
              {locked ? 'Locked' : isFlashing ? '⚡ Submit Now!' : 'Submit'}
            </button>
          )}
        </div>
      )}

      {showNumbers && (
        <p style={{ color: colour, fontFamily: 'Inter', fontSize: '15px', fontWeight: 700, letterSpacing: '0.08em' }}>
          Add them all up!
        </p>
      )}
    </div>
  );
};

const btnS = (c: string): React.CSSProperties => ({
  width: '40px', height: '40px', borderRadius: '50%',
  background: `${c}18`, border: `1px solid ${c}44`,
  color: c, fontSize: '20px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});