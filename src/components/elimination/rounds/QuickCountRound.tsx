import { useEffect, useState, useCallback  } from 'react';
import type { QuickCountConfig, QuickCountSubmission } from '../types/elimination';

interface Props {
  config: QuickCountConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: QuickCountSubmission) => void;
  hasSubmitted: boolean;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const QuickCountRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted }) => {
  const colour = col(roundId);
  const [showDots, setShowDots] = useState(true);
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setShowDots(true);
    setValue('');
    setLocked(false);
    const t = setTimeout(() => setShowDots(false), config.displayDurationMs);
    return () => clearTimeout(t);
  }, [roundId, config.displayDurationMs]);

  const handleSubmit = useCallback(() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || locked || hasSubmitted) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'quick_count', submittedAt: Date.now(), value: num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  const dotRadius = config.dotRadius * 100;

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Dot canvas */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id={`qcg-${roundId}`} width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.25" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill={`url(#qcg-${roundId})`} />

          {showDots && config.dots.map((dot, i) => (
            <circle
              key={i}
              cx={dot.x * 100}
              cy={dot.y * 100}
              r={dotRadius}
              fill={colour}
              opacity="0.9"
              style={{ filter: `drop-shadow(0 0 2px ${colour}88)` }}
            />
          ))}

          {!showDots && (
            <text x="50" y="52" textAnchor="middle" fill="rgba(255,255,255,0.2)"
              fontSize="6" fontFamily="Inter, system-ui">How many dots?</text>
          )}
        </svg>
      </div>

      {/* Number input */}
      {!showDots && (
        <div className="flex gap-3 items-center">
          <button onPointerDown={() => setValue(v => String(Math.max(0, parseInt(v||'0',10)-1)))}
            style={btnStyle(colour)}>−</button>
          <div style={{
            minWidth: '72px', textAlign: 'center',
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '42px', color: '#ffffff', lineHeight: 1,
          }}>
            {value || '—'}
          </div>
          <button onPointerDown={() => setValue(v => String(parseInt(v||'0',10)+1))}
            style={btnStyle(colour)}>+</button>
        </div>
      )}

      {!showDots && !hasSubmitted && (
        <button onPointerDown={handleSubmit} disabled={!value || locked} style={{
          padding: '14px 40px', borderRadius: '8px',
          background: value ? `${colour}18` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${value ? colour+'66' : 'rgba(255,255,255,0.1)'}`,
          color: value ? colour : 'rgba(255,255,255,0.3)',
          fontFamily: 'Inter, system-ui', fontSize: '14px', fontWeight: 600,
          cursor: value && !locked ? 'pointer' : 'default',
          letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          {locked ? 'Locked' : 'Submit'}
        </button>
      )}
      {showDots && (
        <p style={{ color: colour, fontFamily: 'Inter', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em' }}>
          Count the dots!
        </p>
      )}
    </div>
  );
};

const btnStyle = (colour: string): React.CSSProperties => ({
  width: '44px', height: '44px', borderRadius: '50%',
  background: `${colour}18`, border: `1px solid ${colour}44`,
  color: colour, fontSize: '22px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});