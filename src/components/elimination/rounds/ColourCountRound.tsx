import { useEffect, useState, useCallback, useRef } from 'react';
import type { ColourCountConfig, ColourCountSubmission } from '../types/elimination';
import { useAutoSubmit } from '../hooks/useAutoSubmit';

interface Props {
  config: ColourCountConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: ColourCountSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const col = (id: string) => { const P=['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a']; let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return P[h%P.length]!; };

export const ColourCountRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt }) => {
  const accent = col(roundId);
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
    onSubmit({ roundId, playerId, roundType: 'colour_count', submittedAt: Date.now(), value: num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  const handleAuto = useCallback(() => {
    if (locked || hasSubmitted) return;
    const num = parseInt(value, 10);
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'colour_count', submittedAt: Date.now(), value: isNaN(num) ? 0 : num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  useAutoSubmit(hasSubmitted || show, endsAt ?? null, handleAuto);

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* Shape canvas */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxHeight: 'min(50vh, 340px)' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
          <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />
          {show && config.shapes.map((s, i) => {
            const cx = s.x * 100; const cy = s.y * 100; const r = s.size * 100 / 2;
            return s.shapeType === 'circle'
              ? <circle key={i} cx={cx} cy={cy} r={r} fill={s.hex} opacity="0.9" />
              : <rect key={i} x={cx-r} y={cy-r} width={r*2} height={r*2} rx="1.5" fill={s.hex} opacity="0.9" />;
          })}
          {!show && (
            <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.15)" fontSize="5" fontFamily="Inter">
              How many {config.targetLabel}?
            </text>
          )}
        </svg>
      </div>

      {/* Question pill */}
      {show && (
        <div style={{
          padding: '8px 20px', borderRadius: '999px',
          background: `${config.targetHex}22`,
          border: `2px solid ${config.targetHex}`,
          color: config.targetHex,
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '20px', letterSpacing: '0.1em',
        }}>
          Count the {config.targetLabel} shapes
        </div>
      )}

      {/* Input */}
      {!show && (
        <div className="w-full flex flex-col items-center gap-3" style={{ maxWidth: '260px' }}>
          <div style={{
            padding: '8px 20px', borderRadius: '999px', marginBottom: '4px',
            background: `${config.targetHex}22`, border: `2px solid ${config.targetHex}`,
            color: config.targetHex, fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '18px', letterSpacing: '0.1em',
          }}>
            How many {config.targetLabel}?
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
              border: `1px solid ${value ? accent+'66' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px', color: '#ffffff', fontSize: '32px',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              textAlign: 'center', outline: 'none',
            }}
          />
          <div className="flex gap-3">
            <button onPointerDown={() => setValue(v => String(Math.max(0, parseInt(v||'0',10)-1)))} style={btnS(accent)}>−</button>
            <button onPointerDown={() => setValue(v => String(parseInt(v||'0',10)+1))} style={btnS(accent)}>+</button>
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