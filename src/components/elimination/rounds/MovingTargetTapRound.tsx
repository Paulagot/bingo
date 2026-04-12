import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  MovingTargetTapConfig,
  MovingTargetTapSubmission,
} from '../types/elimination';
import { getTapPosition } from '../utils/eliminationHelpers';

interface Props {
  config: MovingTargetTapConfig;
  roundId: string;
  playerId: string;
  onSubmit: (submission: MovingTargetTapSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff', '#ff3b5c', '#ffe600', '#00ff94', '#bf5af2', '#ff9f0a'];

const colourForRound = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length] ?? '#00e5ff';
};

const reflect01 = (value: number): number => {
  let v = value;
  while (v < 0 || v > 1) {
    if (v < 0) v = -v;
    if (v > 1) v = 2 - v;
  }
  return v;
};

const getMovingTargetPosition = (
  config: MovingTargetTapConfig,
  timestampMs: number,
): { x: number; y: number } => {
  const startedAt = config.roundStartTimestamp ?? Date.now();
  const elapsedSec = Math.max(0, (timestampMs - startedAt) / 1000);

  const baseX = config.startPosition.x + config.velocity.x * elapsedSec + config.phaseOffset;
  const baseY = config.startPosition.y + config.velocity.y * elapsedSec;

  if (config.pathType === 'linear') {
    return { x: reflect01(baseX), y: reflect01(baseY) };
  }

  if (config.pathType === 'bounce') {
    return {
      x: reflect01(baseX),
      y: reflect01(baseY + Math.sin(elapsedSec * Math.PI * 1.6) * config.arcAmplitude),
    };
  }

  // arc
  return {
    x: reflect01(baseX),
    y: reflect01(baseY + Math.sin(elapsedSec * Math.PI * 1.1) * config.arcAmplitude),
  };
};

export const MovingTargetTapRound: React.FC<Props> = ({
  config,
  roundId,
  playerId,
  onSubmit,
  hasSubmitted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const submittedRef = useRef(false);

  // Tracks the last rendered target position so we can send it with the
  // submission — the server uses this to score against what the player
  // actually saw, eliminating clock drift error.
  const currentTargetPosRef = useRef<{ x: number; y: number }>(config.startPosition);

  const [targetPos, setTargetPos] = useState<{ x: number; y: number }>(config.startPosition);
  const [tapMarker, setTapMarker] = useState<{ x: number; y: number } | null>(null);

  const colour = useMemo(() => colourForRound(roundId), [roundId]);

  useEffect(() => {
    submittedRef.current = false;
    currentTargetPosRef.current = config.startPosition;
    setTapMarker(null);
    setTargetPos(config.startPosition);
  }, [roundId, config.startPosition]);

  useEffect(() => {
    if (hasSubmitted) return undefined;

    const tick = (): void => {
      const pos = getMovingTargetPosition(config, Date.now());
      currentTargetPosRef.current = pos; // keep ref in sync with animation
      setTargetPos(pos);
      if (!submittedRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [config, hasSubmitted]);

  const handleTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || hasSubmitted || submittedRef.current) return;
    e.preventDefault();

    const { normX, normY } = getTapPosition(e, containerRef.current);
    submittedRef.current = true;

    // Capture target position at tap time — ref is synchronous so this is
    // the position from the last animation frame, accurate to ~16ms.
    const clientTargetPosition = { ...currentTargetPosRef.current };

    setTapMarker({ x: normX, y: normY });

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
    }

    onSubmit({
      roundId,
      playerId,
      roundType: 'moving_target_tap',
      submittedAt: Date.now(),
      clientTargetPosition,
      tapX: normX,
      tapY: normY,
    });
  }, [hasSubmitted, onSubmit, playerId, roundId]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handleTap}
      className="relative w-full"
      style={{
        aspectRatio: '1 / 1',
        width: '100%',
        maxWidth: 'min(90vmin, 520px)',
        margin: '0 auto',
        touchAction: 'none',
        userSelect: 'none',
        cursor: hasSubmitted ? 'default' : 'crosshair',
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: '100%', display: 'block' }}>
        <rect width="100" height="100" rx="6" fill="rgba(255,255,255,0.02)" />

        {/* Outer ring */}
        <circle
          cx={targetPos.x * 100}
          cy={targetPos.y * 100}
          r={config.targetRadius * 100}
          fill={`${colour}22`}
          stroke={colour}
          strokeWidth="0.8"
        />
        {/* Inner dot */}
        <circle
          cx={targetPos.x * 100}
          cy={targetPos.y * 100}
          r={Math.max(config.targetRadius * 32, 1.2)}
          fill={colour}
        />

        {/* Tap marker — X shown after player taps */}
        {tapMarker && (
          <>
            <line
              x1={tapMarker.x * 100 - 2.6}
              y1={tapMarker.y * 100 - 2.6}
              x2={tapMarker.x * 100 + 2.6}
              y2={tapMarker.y * 100 + 2.6}
              stroke="#fff"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <line
              x1={tapMarker.x * 100 + 2.6}
              y1={tapMarker.y * 100 - 2.6}
              x2={tapMarker.x * 100 - 2.6}
              y2={tapMarker.y * 100 + 2.6}
              stroke="#fff"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </>
        )}

        <text
          x="50"
          y="12"
          textAnchor="middle"
          fill="rgba(255,255,255,0.7)"
          style={{ fontFamily: 'Inter, system-ui', fontSize: 4 }}
        >
          TAP THE MOVING TARGET
        </text>
      </svg>
    </div>
  );
};