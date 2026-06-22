import React from 'react';

interface SqProgressRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  colour?: string;
  label?: string;
  sublabel?: string;
}

export function SqProgressRing({
  progress,
  size = 88,
  strokeWidth = 8,
  colour = 'var(--sq-orange)',
  label,
  sublabel,
}: SqProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - clamped);

  return (
    <div className="sq-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--sq-soft-orange)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
      </svg>
      {(label || sublabel) && (
        <div className="sq-ring-center">
          {label && <span className="sq-ring-label">{label}</span>}
          {sublabel && <span className="sq-ring-sublabel">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}

export const SQ_RING_CSS = `
.sq-ring-wrap { position: relative; display: inline-flex; }
.sq-ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.sq-ring-label { font-size: 20px; font-weight: 800; color: var(--sq-black); line-height: 1; }
.sq-ring-sublabel { font-size: 11px; color: var(--sq-grey); font-weight: 700; }
`;
