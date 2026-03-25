import { useRef, useState, useCallback, useEffect } from 'react';
import type { StopTheBarConfig, StopTheBarSubmission } from '../types/elimination';
import { computeBarPosition } from '../utils/coordinateUtils';

interface Props {
  config: StopTheBarConfig;
  roundId: string;
  playerId: string;
  onSubmit: (submission: StopTheBarSubmission) => void;
  hasSubmitted: boolean;
}

const SHAPE_COLOURS = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const colourForRound = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SHAPE_COLOURS[h % SHAPE_COLOURS.length] ?? '#00e5ff';
};

export const StopTheBarRound: React.FC<Props> = ({
  config, roundId, playerId, onSubmit, hasSubmitted,
}) => {
  const rafRef = useRef<number | null>(null);
  const [markerPos, setMarkerPos] = useState<number>(0);
  const [stoppedPos, setStoppedPos] = useState<number | null>(null);
  const submittedRef = useRef(false);
  const colour = colourForRound(roundId);

  // Reset all state when a new round starts
  useEffect(() => {
    submittedRef.current = false;
    setStoppedPos(null);
    setMarkerPos(0);
  }, [roundId]);

  // Animate marker using server-matching bounce logic
  useEffect(() => {
    if (hasSubmitted || !config.roundStartTimestamp) return;

    const tick = () => {
      const pos = computeBarPosition(
        config.speedWidthsPerSec,
        config.roundStartTimestamp,
        config.durationMs,
        Date.now(),
      );
      setMarkerPos(pos);
      if (!submittedRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [config, hasSubmitted]);

  const handleStop = useCallback(() => {
    if (submittedRef.current || hasSubmitted) return;
    submittedRef.current = true;

    const submittedAt = Date.now();
    const pos = computeBarPosition(
      config.speedWidthsPerSec,
      config.roundStartTimestamp,
      config.durationMs,
      submittedAt,
    );
    setStoppedPos(pos);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    onSubmit({ roundId, playerId, roundType: 'stop_the_bar', submittedAt });
  }, [hasSubmitted, config, roundId, playerId, onSubmit]);

  const displayPos = stoppedPos !== null ? stoppedPos : markerPos;
  const targetL = (config.targetPosition - config.targetWidth / 2) * 100;
  const targetW = config.targetWidth * 100;
  const markerThickness = config.barThickness ?? 4;

  return (
    <div className="w-full px-4 py-8 flex flex-col items-center gap-8">
      {/* Bar */}
      <div className="relative w-full" style={{ height: '80px' }}>
        {/* Track */}
        <div
          className="absolute inset-x-0"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            height: '3px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '2px',
          }}
        />

        {/* Target zone */}
        <div
          className="absolute"
          style={{
            left: `${targetL}%`,
            width: `${targetW}%`,
            top: '50%',
            transform: 'translateY(-50%)',
            height: '28px',
            background: `${colour}18`,
            border: `1px solid ${colour}80`,
            borderRadius: '3px',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-18px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              color: `${colour}99`,
              fontFamily: "'DM Mono', monospace",
              letterSpacing: '0.1em',
              whiteSpace: 'nowrap',
            }}
          >
            TARGET
          </div>
          {/* Centre tick */}
          <div style={{
            position: 'absolute', insetBlock: 0, left: '50%',
            width: '1px', background: `${colour}99`,
          }} />
        </div>

        {/* Moving marker */}
        <div
          style={{
            position: 'absolute',
            left: `${displayPos * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${markerThickness}px`,
            height: '44px',
            background: stoppedPos !== null ? '#ffffff' : colour,
            borderRadius: '2px',
            boxShadow: stoppedPos !== null
              ? '0 0 10px #ffffff, 0 0 20px rgba(255,255,255,0.4)'
              : `0 0 10px ${colour}, 0 0 20px ${colour}66`,
            transition: stoppedPos !== null ? 'background 0.15s, box-shadow 0.15s' : 'none',
          }}
        />
      </div>

      {/* Stop button */}
      <button
        onPointerDown={handleStop}
        disabled={hasSubmitted}
        className="w-full max-w-xs py-5 rounded-lg font-mono tracking-widest uppercase text-sm transition-all"
        style={{
          background: hasSubmitted ? `${colour}08` : `${colour}18`,
          border: hasSubmitted ? `1px solid ${colour}22` : `1px solid ${colour}99`,
          color: hasSubmitted ? `${colour}44` : colour,
          cursor: hasSubmitted ? 'default' : 'pointer',
          boxShadow: hasSubmitted ? 'none' : `0 0 20px ${colour}22`,
          fontSize: '16px',
          letterSpacing: '0.2em',
        }}
      >
        {hasSubmitted ? 'Locked In' : 'STOP'}
      </button>
    </div>
  );
};