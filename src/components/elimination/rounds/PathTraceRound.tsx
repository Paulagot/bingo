import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  PathTraceConfig,
  PathTracePoint,
  PathTraceSubmission,
} from '../types/elimination';
import { getTapPosition } from '../utils/eliminationHelpers';
import { useAutoSubmit } from '../hooks/useAutoSubmit';

interface Props {
  config: PathTraceConfig;
  roundId: string;
  playerId: string;
  onSubmit: (submission: PathTraceSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = ['#00e5ff', '#ff3b5c', '#ffe600', '#00ff94', '#bf5af2', '#ff9f0a'];

const colourForRound = (id: string): string => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length] ?? '#00e5ff';
};

const pointsToSvgPath = (points: { x: number; y: number }[]): string => {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 100} ${p.y * 100}`)
    .join(' ');
};

// Minimum distance between recorded points (normalised 0-1 space).
// Prevents collecting hundreds of near-identical points on fast desktop mice.
const MIN_POINT_DISTANCE = 0.008;

export const PathTraceRound: React.FC<Props> = ({
  config,
  roundId,
  playerId,
  onSubmit,
  hasSubmitted,
  endsAt,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);
  const drawingRef = useRef(false);
  const pointsRef = useRef<PathTracePoint[]>([]);

  const [showPreview, setShowPreview] = useState(true);
  const [points, setPoints] = useState<PathTracePoint[]>([]);
  // localSubmitted drives UI changes immediately on submit — don't wait for
  // the hasSubmitted prop to update from the parent (which has a round-trip delay).
  const [localSubmitted, setLocalSubmitted] = useState(false);

  const colour = useMemo(() => colourForRound(roundId), [roundId]);

  // Convenience: either the parent confirmed submission or we just submitted locally
  const isSubmitted = hasSubmitted || localSubmitted;

  useEffect(() => {
    submittedRef.current = false;
    drawingRef.current = false;
    pointsRef.current = [];
    setPoints([]);
    setShowPreview(true);
    setLocalSubmitted(false);

    const timer = window.setTimeout(() => {
      setShowPreview(false);
    }, config.previewDurationMs);

    return () => window.clearTimeout(timer);
  }, [roundId, config.previewDurationMs]);

  const submitTrace = useCallback((tracePoints: PathTracePoint[]) => {
    if (submittedRef.current || hasSubmitted) return;
    submittedRef.current = true;
    setLocalSubmitted(true); // update UI immediately
    const trimmed = tracePoints.slice(0, config.maxPointCount);
    onSubmit({
      roundId,
      playerId,
      roundType: 'path_trace',
      submittedAt: Date.now(),
      points: trimmed,
    });
  }, [config.maxPointCount, hasSubmitted, onSubmit, playerId, roundId]);

  const addPointFromEvent = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || isSubmitted || submittedRef.current || showPreview) return;
    const { normX, normY } = getTapPosition(e, containerRef.current);

    const current = pointsRef.current;

    // Throttle: only add point if far enough from the last one
    if (current.length > 0) {
      const last = current[current.length - 1];
      if (last) {
        const dx = normX - last.x;
        const dy = normY - last.y;
        if (Math.sqrt(dx * dx + dy * dy) < MIN_POINT_DISTANCE) return;
      }
    }

    if (current.length >= config.maxPointCount) return;

    const newPoint = { x: normX, y: normY, t: Date.now() };
    const next = [...current, newPoint];
    pointsRef.current = next;
    setPoints(next);
  }, [config.maxPointCount, isSubmitted, showPreview]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isSubmitted || showPreview || submittedRef.current) return;
    e.preventDefault();
    drawingRef.current = true;
    addPointFromEvent(e);
  }, [addPointFromEvent, isSubmitted, showPreview]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingRef.current || isSubmitted || submittedRef.current || showPreview) return;
    e.preventDefault();
    addPointFromEvent(e);
  }, [addPointFromEvent, isSubmitted, showPreview]);

  const handlePointerUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  useAutoSubmit(hasSubmitted, endsAt ?? null, () => {
    if (!submittedRef.current && pointsRef.current.length >= 2) {
      submitTrace(pointsRef.current);
    }
  });

  const handleManualFinish = useCallback((e: React.MouseEvent) => {
    // Stop click bubbling to the SVG container to prevent stray points
    e.stopPropagation();
    if (pointsRef.current.length >= 2) {
      submitTrace(pointsRef.current);
    }
  }, [submitTrace]);

  const templatePath = pointsToSvgPath(config.pathPoints);
  const playerPath = pointsToSvgPath(points);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative w-full"
        style={{
          aspectRatio: '1 / 1',
          width: '100%',
          maxWidth: 'min(90vmin, 520px)',
          margin: '0 auto',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <svg viewBox="0 0 100 100" style={{ width: '100%', display: 'block' }}>
          <rect width="100" height="100" rx="6" fill="rgba(255,255,255,0.02)" />

          {/* Start anchor — coloured dot */}
          <circle
            cx={config.startAnchor.x * 100}
            cy={config.startAnchor.y * 100}
            r="2.2"
            fill={colour}
            style={{ filter: `drop-shadow(0 0 3px ${colour}88)` }}
          />
          {/* Finish anchor — white dot */}
          <circle
            cx={config.finishAnchor.x * 100}
            cy={config.finishAnchor.y * 100}
            r="2.2"
            fill="#fff"
            opacity="0.7"
          />

          {/* Preview phase: show full path so player can memorise it */}
          {showPreview && (
            <path
              d={templatePath}
              fill="none"
              stroke={colour}
              strokeWidth={Math.max(config.laneWidth * 100, 3)}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.45"
            />
          )}

          {/* Trace phase: ghost path hidden — player traces from memory.
              Only start/finish anchors remain as positional guides. */}

          {/* Player trace — fades to accent colour once submitted */}
          {points.length >= 2 && (
            <path
              d={playerPath}
              fill="none"
              stroke={isSubmitted ? `${colour}99` : '#ffffff'}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          <text
            x="50"
            y="12"
            textAnchor="middle"
            fill="rgba(255,255,255,0.7)"
            style={{ fontFamily: 'Inter, system-ui', fontSize: 4 }}
          >
            {showPreview ? 'MEMORISE THE PATH' : isSubmitted ? 'LOCKED IN' : 'TRACE THE PATH'}
          </text>
        </svg>
      </div>

      {/* Finish button sits OUTSIDE the pointer-capture div so tapping it
          does not add a stray point to the trace */}
      {!showPreview && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          maxWidth: 'min(90vmin, 520px)',
          margin: '10px auto 0',
        }}>
          <button
            type="button"
            onClick={handleManualFinish}
            disabled={isSubmitted || points.length < 2}
            style={{
              padding: '12px 32px',
              borderRadius: 10,
              border: `1px solid ${isSubmitted ? '#30d158' : `${colour}66`}`,
              background: isSubmitted ? 'rgba(48,209,88,0.15)' : `${colour}18`,
              color: isSubmitted ? '#30d158' : colour,
              fontFamily: 'Inter, system-ui',
              fontSize: 14,
              cursor: isSubmitted ? 'default' : points.length >= 2 ? 'pointer' : 'not-allowed',
              opacity: points.length >= 2 || isSubmitted ? 1 : 0.45,
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitted ? '✓ Locked in' : 'Finish trace'}
          </button>
        </div>
      )}
    </div>
  );
};