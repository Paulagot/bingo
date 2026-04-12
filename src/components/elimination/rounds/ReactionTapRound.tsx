import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ReactionTapConfig,
  ReactionTapSubmission,
} from '../types/elimination';
import { useAutoSubmit } from '../hooks/useAutoSubmit';
import { getTapPosition } from '../utils/eliminationHelpers';

interface Props {
  config: ReactionTapConfig;
  roundId: string;
  playerId: string;
  onSubmit: (submission: ReactionTapSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff', '#ff3b5c', '#ffe600', '#00ff94', '#bf5af2', '#ff9f0a'];

const colourForRound = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length] ?? '#00e5ff';
};

export const ReactionTapRound: React.FC<Props> = ({
  config,
  roundId,
  playerId,
  onSubmit,
  hasSubmitted,
  endsAt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [tapMarker, setTapMarker] = useState<{ x: number; y: number } | null>(null);
  const submittedRef = useRef(false);

  // Records the exact client timestamp when the target became visible.
  // Sent with the submission so the server can score true reaction time
  // from when the player actually saw the target — not from validTargetAt,
  // which is offset by server→client clock drift.
  const targetVisibleAtRef = useRef<number | null>(null);

  const colour = useMemo(() => colourForRound(roundId), [roundId]);

  useEffect(() => {
    submittedRef.current = false;
    targetVisibleAtRef.current = null;
    setIsActive(false);
    setTapMarker(null);

    const startTs = config.roundStartTimestamp ?? Date.now();
    const delayMs = Math.max(0, startTs + config.preTargetDelayMs - Date.now());

    const timer = window.setTimeout(() => {
      targetVisibleAtRef.current = Date.now(); // stamp when target actually appears
      setIsActive(true);
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [roundId, config.roundStartTimestamp, config.preTargetDelayMs]);

  const submitTap = useCallback((x: number, y: number) => {
    if (submittedRef.current || hasSubmitted) return;
    submittedRef.current = true;
    setTapMarker({ x, y });
    // console.log('[ReactionTap] tap | targetVisibleAt:', targetVisibleAtRef.current, '| submittedAt:', Date.now(), '| isActive:', isActive);

    onSubmit({
      roundId,
      playerId,
      roundType: 'reaction_tap',
      submittedAt: Date.now(),
      targetVisibleAt: targetVisibleAtRef.current ?? undefined,
      tapX: x,
      tapY: y,
    });
  }, [hasSubmitted, onSubmit, playerId, roundId]);

  const handleTap = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || submittedRef.current || hasSubmitted) return;
    e.preventDefault();

    const { normX, normY } = getTapPosition(e, containerRef.current);
    submitTap(normX, normY);
  }, [hasSubmitted, submitTap]);

  useAutoSubmit(hasSubmitted, endsAt ?? null, () => {
    // No forced payload — missed tap scores zero.
  });

  const targetX = config.targetPosition.x * 100;
  const targetY = config.targetPosition.y * 100;
  const targetRadius = config.targetRadius * 100;

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
        cursor: hasSubmitted ? 'default' : 'pointer',
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: '100%', display: 'block' }}>
        <defs>
          <radialGradient id={`reaction-bg-${roundId}`}>
            <stop offset="0%" stopColor={isActive ? `${colour}18` : 'rgba(255,255,255,0.03)'} />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" rx="6" fill={`url(#reaction-bg-${roundId})`} />

        <text
          x="50"
          y="14"
          textAnchor="middle"
          fill="rgba(255,255,255,0.7)"
          style={{ fontFamily: 'Inter, system-ui', fontSize: 4 }}
        >
          {isActive ? 'TAP THE TARGET' : 'WAIT…'}
        </text>

        {/* Outer ring — hidden during wait, lights up when target is live */}
        <circle
          cx={targetX}
          cy={targetY}
          r={targetRadius}
          fill={isActive ? `${colour}22` : 'rgba(255,255,255,0.03)'}
          stroke={isActive ? colour : 'rgba(255,255,255,0.12)'}
          strokeWidth="0.8"
        />
        {/* Inner dot — faintly visible during wait so player knows where to aim */}
        <circle
          cx={targetX}
          cy={targetY}
          r={Math.max(targetRadius * 0.34, 1.2)}
          fill={isActive ? colour : 'rgba(255,255,255,0.06)'}
        />

        {/* Tap marker — X shown after player taps */}
        {tapMarker && (
          <>
            <line
              x1={tapMarker.x * 100 - 2.4}
              y1={tapMarker.y * 100 - 2.4}
              x2={tapMarker.x * 100 + 2.4}
              y2={tapMarker.y * 100 + 2.4}
              stroke="#fff"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            <line
              x1={tapMarker.x * 100 + 2.4}
              y1={tapMarker.y * 100 - 2.4}
              x2={tapMarker.x * 100 - 2.4}
              y2={tapMarker.y * 100 + 2.4}
              stroke="#fff"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    </div>
  );
};