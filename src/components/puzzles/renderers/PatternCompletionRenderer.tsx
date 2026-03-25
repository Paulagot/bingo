import React, { useCallback, useEffect, useState } from 'react';
import type { PatternCompletionPuzzleData } from '../puzzleTypes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PatternCompletionRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

// ---------------------------------------------------------------------------
// SVG shape renderer
// Each cell value is "shape-color" e.g. "circle-red", "triangle-blue"
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<string, string> = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
};

interface ShapeProps {
  shape: string;
  color: string;
  size:  number;
}

const Shape: React.FC<ShapeProps> = ({ shape, color, size }) => {
  const fill   = COLOR_MAP[color] ?? '#6b7280';
  const s      = size;
  const half   = s / 2;
  const pad    = s * 0.1; // padding inside SVG viewport

  switch (shape) {
    case 'circle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <circle cx={half} cy={half} r={half - pad} fill={fill} />
        </svg>
      );

    case 'square':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <rect x={pad} y={pad} width={s - pad * 2} height={s - pad * 2} fill={fill} />
        </svg>
      );

    case 'triangle':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon
            points={`${half},${pad} ${s - pad},${s - pad} ${pad},${s - pad}`}
            fill={fill}
          />
        </svg>
      );

    case 'diamond':
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon
            points={`${half},${pad} ${s - pad},${half} ${half},${s - pad} ${pad},${half}`}
            fill={fill}
          />
        </svg>
      );

    case 'star': {
      // 5-pointed star via polygon
      const points: string[] = [];
      for (let i = 0; i < 10; i++) {
        const angle  = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? half - pad : (half - pad) * 0.45;
        points.push(`${half + radius * Math.cos(angle)},${half + radius * Math.sin(angle)}`);
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={points.join(' ')} fill={fill} />
        </svg>
      );
    }

    case 'hexagon': {
      const pts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${half + (half - pad) * Math.cos(angle)},${half + (half - pad) * Math.sin(angle)}`);
      }
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <polygon points={pts.join(' ')} fill={fill} />
        </svg>
      );
    }

    default:
      return (
        <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}>
          <circle cx={half} cy={half} r={half - pad} fill={fill} />
        </svg>
      );
  }
};

// ---------------------------------------------------------------------------
// Cell — used in both the matrix and options row
// ---------------------------------------------------------------------------

interface CellProps {
  value:      string | null;
  size:       number;
  isSelected?: boolean;
  isMissing?:  boolean;
  isOption?:   boolean;
  isReadOnly?: boolean;
  onClick?:    () => void;
}

const Cell: React.FC<CellProps> = ({
  value, size, isSelected, isMissing, isOption, isReadOnly, onClick,
}) => {
  const [shape, color] = value ? value.split('-') : ['', ''];

  if (isMissing) {
    return (
      <div
        className="flex items-center justify-center border-2 border-dashed border-indigo-300 bg-indigo-50 rounded"
        style={{ width: size, height: size }}
      >
        <span className="text-indigo-300 text-2xl font-bold">?</span>
      </div>
    );
  }

  if (isOption) {
    return (
      <button
        onClick={() => !isReadOnly && onClick?.()}
        disabled={isReadOnly}
        className={[
          'flex items-center justify-center rounded border-2 transition-all duration-100',
          isSelected
            ? 'border-indigo-500 bg-indigo-50 scale-105 shadow-md'
            : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50',
          isReadOnly ? 'cursor-default' : 'cursor-pointer',
        ].join(' ')}
        style={{ width: size, height: size }}
      >
        {shape && color && <Shape shape={shape} color={color} size={size * 0.65} />}
      </button>
    );
  }

  // Regular matrix cell
  return (
    <div
      className="flex items-center justify-center border border-gray-200 bg-white rounded"
      style={{ width: size, height: size }}
    >
      {shape && color && <Shape shape={shape} color={color} size={size * 0.65} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

const PatternCompletionRenderer: React.FC<PatternCompletionRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as PatternCompletionPuzzleData;

  const [selected, setSelected] = useState<string | null>(
    (currentAnswer?.selectedOption as string) ?? null
  );

  useEffect(() => {
    if (selected !== null) {
      onAnswerChange({ selectedOption: selected });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const handleOptionClick = useCallback((option: string) => {
    setSelected(prev => prev === option ? null : option);
  }, []);

  // Cell sizes — matrix cells slightly larger than option tiles
  const cellSize   = 80;
  const optionSize = 68;

  return (
    <div className="flex flex-col items-center gap-8">

      {/* 3×3 matrix */}
      <div className="flex flex-col gap-1.5">
        {data.matrix.map((row, r) => (
          <div key={r} className="flex gap-1.5">
            {row.map((cell, c) => {
              const isMissing = cell === null;
              // Show selected option in the missing cell as a preview
              const displayValue = isMissing && selected ? selected : cell;

              return (
                <Cell
                  key={`${r}-${c}`}
                  value={isMissing && selected ? displayValue : cell}
                  size={cellSize}
                  isMissing={isMissing && !selected}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="w-full max-w-xs flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">Choose the missing piece</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Options row */}
      <div className="flex gap-3 flex-wrap justify-center">
        {data.options.map((option: string) => (
          <Cell
            key={option}
            value={option}
            size={optionSize}
            isOption
            isSelected={selected === option}
            isReadOnly={isReadOnly}
            onClick={() => handleOptionClick(option)}
          />
        ))}
      </div>

      {/* Hint */}
      {!isReadOnly && (
        <p className="text-xs text-gray-400 text-center max-w-xs">
          {selected
            ? 'Tap your selection again to change it, then hit Submit.'
            : 'Study the pattern and tap the tile that completes the grid.'}
        </p>
      )}

    </div>
  );
};

export default PatternCompletionRenderer;