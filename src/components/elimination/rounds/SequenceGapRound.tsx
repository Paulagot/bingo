import { useEffect, useState, useCallback, useRef } from 'react';
import type { SequenceGapConfig, SequenceGapSubmission } from '../types/elimination';
import { useAutoSubmit } from '../hooks/useAutoSubmit';

interface Props {
  config: SequenceGapConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: SequenceGapSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const SequenceGapRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt }) => {
  const colour = col(roundId);
  const [showSeq, setShowSeq] = useState(true);
  const [value, setValue] = useState('');
  const [locked, setLocked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setShowSeq(true); setValue(''); setLocked(false);
    const t = setTimeout(() => { setShowSeq(false); setTimeout(() => inputRef.current?.focus(), 100); }, config.displayDurationMs);
    return () => clearTimeout(t);
  }, [roundId, config.displayDurationMs]);

  const handleSubmit = useCallback(() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || locked || hasSubmitted) return;
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'sequence_gap', submittedAt: Date.now(), value: num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  const handleAutoSubmit = useCallback(() => {
    if (locked || hasSubmitted) return;
    const num = parseInt(value, 10);
    setLocked(true);
    onSubmit({ roundId, playerId, roundType: 'sequence_gap', submittedAt: Date.now(), value: isNaN(num) ? 0 : num });
  }, [value, locked, hasSubmitted, roundId, playerId, onSubmit]);

  useAutoSubmit(hasSubmitted || showSeq, endsAt ?? null, handleAutoSubmit);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* Sequence display */}
      <div style={{ width: '100%', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {showSeq ? (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
            {config.sequence.map((v, i) => (
              <div key={i} style={{
                width: '56px', height: '56px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: v === null ? `${colour}18` : 'rgba(255,255,255,0.06)',
                border: `1px solid ${v === null ? colour : 'rgba(255,255,255,0.15)'}`,
                fontFamily: "'Bebas Neue', Impact, sans-serif",
                fontSize: v === null ? '32px' : '24px',
                color: v === null ? colour : '#ffffff',
                boxShadow: v === null ? `0 0 12px ${colour}44` : 'none',
              }}>
                {v === null ? '?' : v}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter', fontSize: '14px' }}>
            What was the missing number?
          </p>
        )}
      </div>

      {/* Input */}
      {!showSeq && (
        <div className="w-full flex flex-col items-center gap-3" style={{ maxWidth: '260px' }}>
          <input
            ref={inputRef}
            type="number"
            value={value}
            onChange={e => setValue(e.target.value.replace(/[^0-9-]/g, ''))}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            disabled={locked || hasSubmitted}
            placeholder="Your answer"
            style={{
              width: '100%', padding: '14px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${value ? colour+'66' : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '10px', color: '#ffffff', fontSize: '32px',
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              letterSpacing: '0.08em', textAlign: 'center', outline: 'none',
            }}
          />
        </div>
      )}
      {showSeq && <p style={{ color: colour, fontFamily: 'Inter', fontSize: '14px', fontWeight: 600 }}>What number is missing?</p>}
    </div>
  );
};