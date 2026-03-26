import { useState, useCallback, useEffect, useRef } from 'react';
import type { TimeEstimationConfig, TimeEstimationSubmission } from '../types/elimination';

interface Props {
  config: TimeEstimationConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: TimeEstimationSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const TimeEstimationRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted, endsAt }) => {
  const colour = col(roundId);
  const [tapped, setTapped] = useState(false);
  const [counting, setCounting] = useState(false);
  const startedRef = useRef(false);
  const targetSec = config.targetTimeMs / 1000;

  useEffect(() => {
    setTapped(false);
    setCounting(false);
    startedRef.current = false;
  }, [roundId]);

  const handleStart = useCallback(() => {
    if (startedRef.current || hasSubmitted) return;
    startedRef.current = true;
    setCounting(true);
  }, [hasSubmitted]);

  const handleTap = useCallback(() => {
    if (!counting || tapped || hasSubmitted) return;
    setTapped(true);
    setCounting(false);
    onSubmit({ roundId, playerId, roundType: 'time_estimation', submittedAt: Date.now() });
  }, [counting, tapped, hasSubmitted, roundId, playerId, onSubmit]);

  // Auto-submit near timer end if not yet tapped
  useEffect(() => {
    if (!endsAt || tapped || hasSubmitted) return;
    const msLeft = endsAt - Date.now() - 800;
    if (msLeft <= 0) return;
    const t = setTimeout(() => {
      if (!tapped && !hasSubmitted) {
        setTapped(true);
        setCounting(false);
        onSubmit({ roundId, playerId, roundType: 'time_estimation', submittedAt: Date.now() });
      }
    }, msLeft);
    return () => clearTimeout(t);
  }, [endsAt, tapped, hasSubmitted, roundId, playerId, onSubmit]);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-8" style={{ minHeight: '300px' }}>
      {/* Target time display */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '64px', color: colour, lineHeight: 1,
          filter: `drop-shadow(0 0 16px ${colour}66)`,
        }}>
          {targetSec % 1 === 0 ? targetSec : targetSec.toFixed(1)}s
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'Inter', fontSize: '14px', margin: '8px 0 0' }}>
          Tap when you think this much time has passed
        </p>
      </div>

      {/* No timer shown — that's the whole point */}
      {!counting && !tapped && !hasSubmitted && (
        <button onPointerDown={handleStart} style={{
          padding: '18px 48px', borderRadius: '12px', cursor: 'pointer',
          background: `${colour}18`, border: `2px solid ${colour}66`,
          color: colour, fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '24px', letterSpacing: '0.12em',
        }}>
          START
        </button>
      )}

      {counting && !tapped && (
        <button onPointerDown={handleTap} style={{
          padding: '24px 60px', borderRadius: '12px', cursor: 'pointer',
          background: `${colour}25`, border: `2px solid ${colour}`,
          color: colour, fontFamily: "'Bebas Neue', Impact, sans-serif",
          fontSize: '28px', letterSpacing: '0.12em',
          boxShadow: `0 0 24px ${colour}44`,
          animation: 'pulse 1s ease-in-out infinite alternate',
        }}>
          TAP NOW
        </button>
      )}

      {(tapped || hasSubmitted) && (
        <div style={{
          padding: '16px 32px', borderRadius: '10px',
          background: `${colour}12`, border: `1px solid ${colour}44`,
          color: colour, fontFamily: 'Inter', fontSize: '15px', fontWeight: 600,
        }}>
          ✓ Tapped — answer locked
        </div>
      )}

      <p style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'Inter', fontSize: '12px', textAlign: 'center', maxWidth: '240px' }}>
        No clock shown. Use your internal sense of time.
      </p>
    </div>
  );
};