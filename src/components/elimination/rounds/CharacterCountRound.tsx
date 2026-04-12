import { useEffect, useState, useCallback, useRef } from 'react';
import type { CharacterCountConfig, CharacterCountSubmission } from '../types/elimination';
import { useAutoSubmit } from '../hooks/useAutoSubmit';

interface Props {
  config: CharacterCountConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: CharacterCountSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const CharacterCountRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt }) => {
  const colour = col(roundId);
  const [show, setShow] = useState(true);
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShow(true); setValue(''); setLocked(false);
    const t = setTimeout(() => { setShow(false); setTimeout(() => inputRef.current?.focus(), 100); }, config.displayDurationMs);
    return () => clearTimeout(t);
  }, [roundId, config.displayDurationMs]);

  const handleSubmit = useCallback(() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || locked || hasSubmitted) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'character_count', submittedAt: Date.now(), value: num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  const handleAuto = useCallback(() => {
    if (locked || hasSubmitted) return;
    const num = parseInt(value, 10);
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'character_count', submittedAt: Date.now(), value: isNaN(num) ? 0 : num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  useAutoSubmit(hasSubmitted || show, endsAt ?? null, handleAuto);

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* Character canvas */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxHeight: 'min(50vh, 340px)' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
          <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />
          {show && config.characters.map((c, i) => (
            <text
              key={i}
              x={c.x * 100}
              y={c.y * 100}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={c.value === config.targetCharacter ? colour : 'rgba(255,255,255,0.45)'}
              fontSize={c.fontSize * 100}
              fontFamily="'Bebas Neue', Impact, sans-serif"
              fontWeight="700"
              transform={`rotate(${c.rotation}, ${c.x * 100}, ${c.y * 100})`}
              style={{ filter: c.value === config.targetCharacter ? `drop-shadow(0 0 3px ${colour}88)` : 'none' }}
            >
              {c.value}
            </text>
          ))}
          {!show && (
            <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.15)" fontSize="5" fontFamily="Inter">
              How many {config.targetCharacter}'s?
            </text>
          )}
        </svg>
      </div>

      {show && (
        <div style={{
          padding: '8px 20px', borderRadius: '999px',
          background: `${colour}18`, border: `1.5px solid ${colour}66`,
          color: colour, fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '20px', letterSpacing: '0.1em',
        }}>
          Count all the {config.targetCharacter}'s
        </div>
      )}

      {!show && (
        <div className="w-full flex flex-col items-center gap-3" style={{ maxWidth: '260px' }}>
          <div style={{
            padding: '8px 20px', borderRadius: '999px',
            background: `${colour}18`, border: `1.5px solid ${colour}66`,
            color: colour, fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '18px', letterSpacing: '0.1em', marginBottom: '4px',
          }}>
            How many {config.targetCharacter}'s?
          </div>
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={locked || hasSubmitted}
            placeholder="0"
            style={{
              width: '100%', padding: '14px', background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${value ? colour+'66' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px', color: '#ffffff', fontSize: '32px',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textAlign: 'center', outline: 'none',
            }}
          />
          <div className="flex gap-3">
            <button onPointerDown={() => setValue(v => String(Math.max(0, parseInt(v||'0',10)-1)))} style={btnS(colour)}>−</button>
            <button onPointerDown={() => setValue(v => String(parseInt(v||'0',10)+1))} style={btnS(colour)}>+</button>
          </div>
        </div>
      )}
    </div>
  );
};

const btnS = (c: string): React.CSSProperties => ({
  width: '44px', height: '44px', borderRadius: '50%',
  background: `${c}18`, border: `1px solid ${c}44`,
  color: c, fontSize: '22px', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});