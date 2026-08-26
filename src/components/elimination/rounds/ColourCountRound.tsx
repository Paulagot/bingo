//src/components/elimination/rounds/ColourCountRound.tsx
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

const col = (id: string) => {
  const P = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return P[h % P.length]!;
};

export const ColourCountRound: React.FC<Props> = ({
  config, roundId, playerId, onSubmit, hasSubmitted, endsAt,
}) => {
  const accent = col(roundId);
  const [show, setShow] = useState(true);
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShow(true);
    setValue('');
    setLocked(false);
    const t = setTimeout(() => {
      setShow(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }, config.displayDurationMs);
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  }, [handleSubmit]);

  const canSubmit = !locked && !hasSubmitted && value !== '' && !isNaN(parseInt(value, 10));

  return (
    <div className="w-full flex flex-col items-center gap-5">

      {/* Shape canvas */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', maxHeight: 'min(50vh, 340px)' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', display: 'block' }}>
          <rect width="100" height="100" fill="rgba(255,255,255,0.01)" />
          {show && config.shapes.map((s, i) => {
            const cx = s.x * 100;
            const cy = s.y * 100;
            const r = s.size * 100 / 2;
            return s.shapeType === 'circle'
              ? <circle key={i} cx={cx} cy={cy} r={r} fill={s.hex} opacity="0.9" />
              : <rect key={i} x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx="1.5" fill={s.hex} opacity="0.9" />;
          })}
          {!show && (
            <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
              fill="rgba(255,255,255,0.15)" fontSize="5" fontFamily="Inter">
              How many {config.targetLabel}?
            </text>
          )}
        </svg>
      </div>

      {/* Question pill - shown during flash */}
      {show && (
        <div style={{
          padding: '8px 20px',
          borderRadius: '999px',
          background: `${config.targetHex}22`,
          border: `2px solid ${config.targetHex}`,
          color: config.targetHex,
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '20px',
          letterSpacing: '0.1em',
        }}>
          Count the {config.targetLabel} shapes
        </div>
      )}

      {/* Input section - shown after flash */}
      {!show && (
        <div className="w-full flex flex-col items-center gap-4" style={{ maxWidth: '300px' }}>

          <div style={{
            padding: '8px 20px',
            borderRadius: '999px',
            background: `${config.targetHex}22`,
            border: `2px solid ${config.targetHex}`,
            color: config.targetHex,
            fontFamily: "'Bebas Neue', Impact, sans-serif",
            fontSize: '18px',
            letterSpacing: '0.1em',
          }}>
            How many {config.targetLabel}?
          </div>

          {!(locked || hasSubmitted) && (
            <>
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={value}
                onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ''))}
                onKeyDown={handleKeyDown}
                disabled={locked || hasSubmitted}
                placeholder="0"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${value ? accent + '66' : 'rgba(255,255,255,0.12)'}`,
                  borderRadius: '10px',
                  color: '#ffffff',
                  fontSize: '32px',
                  fontFamily: "'Bebas Neue', Impact, sans-serif",
                  letterSpacing: '0.08em',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />

              <button
                onPointerDown={handleSubmit}
                disabled={!canSubmit}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: '10px',
                  background: canSubmit ? `${accent}22` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${canSubmit ? accent : 'rgba(255,255,255,0.1)'}`,
                  color: canSubmit ? accent : 'rgba(255,255,255,0.25)',
                  fontSize: 'clamp(13px, 2vmin, 15px)',
                  fontFamily: 'Inter, system-ui',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  cursor: canSubmit ? 'pointer' : 'default',
                  boxShadow: canSubmit ? `0 0 20px ${accent}22` : 'none',
                  transition: 'all 0.15s',
                }}
              >
                Lock In
              </button>
            </>
          )}

          {(locked || hasSubmitted) && (
            <div style={{
              padding: '16px 32px',
              borderRadius: '10px',
              background: `${accent}12`,
              border: `1px solid ${accent}44`,
              color: accent,
              fontFamily: 'Inter',
              fontSize: 'clamp(13px, 2vmin, 15px)',
              fontWeight: 600,
              textAlign: 'center',
            }}>
              ✓ Locked in — waiting for other players
            </div>
          )}

        </div>
      )}
    </div>
  );
};