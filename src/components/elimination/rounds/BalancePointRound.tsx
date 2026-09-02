// src/components/elimination/rounds/BalancePointRound.tsx

import { useRef, useState, useCallback, useEffect } from 'react';
import { useAutoSubmit } from '../hooks/useAutoSubmit';
import type {
  BalancePointConfig,
  BalancePointSubmission,
} from '../types/elimination';

interface Props {
  config: BalancePointConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: BalancePointSubmission) => void;
  hasSubmitted: boolean;
  endsAt?: number;
}

const PALETTE = [
  '#00e5ff',
  '#ff3b5c',
  '#ffe600',
  '#00ff94',
  '#bf5af2',
  '#ff9f0a',
];

const col = (id: string) => {
  let h = 0;

  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }

  return PALETTE[h % PALETTE.length]!;
};

export const BalancePointRound: React.FC<Props> = ({
  config,
  roundId,
  playerId,
  onSubmit,
  hasSubmitted,
  endsAt,
}) => {
  const colour = col(roundId);

  const svgRef = useRef<SVGSVGElement>(null);

  const [locked, setLocked] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);
  const [dragging, setDragging] = useState(false);

  // This is the player's chosen balance point / fulcrum position.
  const [fulcrumX, setFulcrumX] = useState(0.5);

  useEffect(() => {
    // Start the fulcrum away from the correct answer so the player
    // must deliberately position it.
    setFulcrumX(config.centreOfMass > 0.5 ? 0.15 : 0.85);

    setLocked(false);
    setHasDragged(false);
    setDragging(false);
  }, [roundId, config.centreOfMass]);

  const getNormX = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current) return 0.5;

      const rect = svgRef.current.getBoundingClientRect();

      return Math.min(
        0.95,
        Math.max(
          0.05,
          (e.clientX - rect.left) / rect.width,
        ),
      );
    },
    [],
  );

  const onDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (hasSubmitted || locked) return;

      setDragging(true);
      setHasDragged(true);
      setFulcrumX(getNormX(e));

      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [hasSubmitted, locked, getNormX],
  );

  const onMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging || hasSubmitted || locked) return;

      setFulcrumX(getNormX(e));
    },
    [dragging, hasSubmitted, locked, getNormX],
  );

  const onUp = useCallback(
    (e?: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;

      setDragging(false);

      if (e) {
        e.currentTarget.releasePointerCapture?.(e.pointerId);
      }
    },
    [dragging],
  );

  const handleLock = useCallback(() => {
    if (locked || hasSubmitted) return;

    setLocked(true);

    onSubmit({
      roundId,
      playerId,
      roundType: 'balance_point',
      submittedAt: Date.now(),
      x: fulcrumX,
    });
  }, [
    locked,
    hasSubmitted,
    roundId,
    playerId,
    fulcrumX,
    onSubmit,
  ]);

  useAutoSubmit(
    hasSubmitted,
    endsAt ?? null,
    handleLock,
  );

  const maxWeight = Math.max(
    1,
    ...config.weights.map((w) => w.weight),
  );

  const beamStartX = 5;
  const beamEndX = 95;
  const beamWidth = beamEndX - beamStartX;

  const beamY = 31;

  // Convert normalised 0–1 player position to SVG beam coordinates.
  const fulcrumSvgX =
    beamStartX + fulcrumX * beamWidth;

  return (
    <div
      className="w-full flex flex-col items-center gap-3"
      style={{ touchAction: 'none' }}
    >
      {/* Instruction */}
      <div
        style={{
          width: '100%',
          padding: '10px 16px',
          borderRadius: '8px',
          background: `${colour}10`,
          border: `1px solid ${colour}28`,
          textAlign: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            color: colour,
            fontFamily: 'Inter',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Drag the{' '}
          <span style={{ color: '#ffffff' }}>
            triangle
          </span>{' '}
          to where you think the beam would balance
        </p>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 100 75"
        style={{
          width: '100%',
          maxHeight: 'min(45vh, 280px)',
          display: 'block',
          touchAction: 'none',
          cursor: hasSubmitted
            ? 'default'
            : dragging
              ? 'grabbing'
              : 'grab',
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {/* Large transparent hit area */}
        <rect
          x="0"
          y="0"
          width="100"
          height="75"
          fill="transparent"
        />

        {/* Beam */}
        <line
          x1={beamStartX}
          y1={beamY}
          x2={beamEndX}
          y2={beamY}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Beam end markers */}
        <line
          x1={beamStartX}
          y1={beamY - 3}
          x2={beamStartX}
          y2={beamY + 3}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="0.5"
        />

        <line
          x1={beamEndX}
          y1={beamY - 3}
          x2={beamEndX}
          y2={beamY + 3}
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="0.5"
        />

        {/* Fixed numbered weights */}
        {config.weights.map((w, i) => {
          const wx =
            beamStartX + w.position * beamWidth;

          const radius =
            3.5 + (w.weight / maxWeight) * 5.5;

          const hangLineLength = 5;
          const circleY =
            beamY -
            hangLineLength -
            radius;

          return (
            <g key={i}>
              {/* String attaching weight to beam */}
              <line
                x1={wx}
                y1={beamY - 1}
                x2={wx}
                y2={circleY + radius}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="0.5"
              />

              {/* Weight */}
              <circle
                cx={wx}
                cy={circleY}
                r={radius}
                fill={`${colour}25`}
                stroke={colour}
                strokeWidth="0.6"
                style={{
                  filter: `drop-shadow(0 0 3px ${colour}55)`,
                }}
              />

              {/* Weight value */}
              <text
                x={wx}
                y={circleY + 0.6}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={colour}
                fontSize={Math.min(
                  5,
                  radius * 0.9,
                )}
                fontFamily="'Bebas Neue', Impact, sans-serif"
              >
                {w.weight}
              </text>
            </g>
          );
        })}

        {/* Player-controlled fulcrum */}
        <g
          style={{
            cursor: hasSubmitted
              ? 'default'
              : dragging
                ? 'grabbing'
                : 'grab',
          }}
        >
          {/* Small contact point with beam */}
          <circle
            cx={fulcrumSvgX}
            cy={beamY + 0.5}
            r="1.7"
            fill={
              locked
                ? colour
                : '#ffffff'
            }
            style={{
              filter: locked
                ? `drop-shadow(0 0 4px ${colour})`
                : 'drop-shadow(0 0 3px rgba(255,255,255,0.6))',
            }}
          />

          {/* Fulcrum triangle */}
          <polygon
            points={`
              ${fulcrumSvgX},${beamY + 2}
              ${fulcrumSvgX - 7},${beamY + 15}
              ${fulcrumSvgX + 7},${beamY + 15}
            `}
            fill={
              locked
                ? `${colour}35`
                : 'rgba(255,255,255,0.10)'
            }
            stroke={
              locked
                ? colour
                : '#ffffff'
            }
            strokeWidth="0.8"
            strokeLinejoin="round"
            style={{
              filter: locked
                ? `drop-shadow(0 0 5px ${colour}88)`
                : 'drop-shadow(0 0 4px rgba(255,255,255,0.35))',
            }}
          />

          {/* Label */}
          <text
            x={fulcrumSvgX}
            y={beamY + 20}
            textAnchor="middle"
            fill={
              locked
                ? colour
                : 'rgba(255,255,255,0.55)'
            }
            fontSize="3.2"
            fontFamily="'Inter', system-ui, sans-serif"
            fontWeight="600"
          >
            BALANCE POINT
          </text>

          {/* Movement hints */}
          {!locked && !hasSubmitted && (
            <>
              <text
                x={fulcrumSvgX - 12}
                y={beamY + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize="5"
              >
                ←
              </text>

              <text
                x={fulcrumSvgX + 12}
                y={beamY + 9}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(255,255,255,0.3)"
                fontSize="5"
              >
                →
              </text>
            </>
          )}
        </g>
      </svg>

      {/* Lock-in button */}
      {!locked && !hasSubmitted && (
        <button
          onPointerDown={(e) =>
            e.stopPropagation()
          }
          onClick={handleLock}
          style={{
            marginTop: '4px',
            padding: '12px 32px',
            borderRadius: '8px',
            border: `1px solid ${colour}`,
            background: hasDragged
              ? `${colour}20`
              : 'transparent',
            color: hasDragged
              ? colour
              : 'rgba(255,255,255,0.2)',
            fontFamily:
              "'Bebas Neue', Impact, sans-serif",
            fontSize: '16px',
            letterSpacing: '0.05em',
            cursor: hasDragged
              ? 'pointer'
              : 'not-allowed',
            transition: 'all 0.2s',
            pointerEvents: hasDragged
              ? 'auto'
              : 'none',
          }}
        >
          Lock In
        </button>
      )}

      {(locked || hasSubmitted) && (
        <p
          style={{
            margin: 0,
            color: `${colour}88`,
            fontFamily: 'Inter',
            fontSize: '13px',
          }}
        >
          Balance point locked in
        </p>
      )}
    </div>
  );
};