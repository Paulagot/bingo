import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { PatternCompletionPuzzleData } from '../puzzleTypes';

interface PatternCompletionRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

type PatternShape =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'star'
  | 'hexagon';

type PatternColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange';

type PatternFill = 'solid' | 'outline';
type PatternSize = 'small' | 'medium' | 'large';

interface PatternCellValue {
  shape: PatternShape | string;
  color: PatternColor | string;
  rotation?: number;
  count?: number;
  fill?: PatternFill | string;
  size?: PatternSize | string;
}

type PatternCell = PatternCellValue | string | null;

type ExtendedPatternCompletionPuzzleData = PatternCompletionPuzzleData & {
  matrix: PatternCell[][];
  options: PatternCellValue[] | string[];
  gridSize?: number;
  optionCount?: number;
  ruleType?: string;
};

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
};

function normaliseCell(value: PatternCell): PatternCellValue | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const [shape, color] = value.split('-');

    if (!shape || !color) return null;

    return {
      shape,
      color,
      rotation: 0,
      count: 1,
      fill: 'solid',
      size: 'medium',
    };
  }

  return {
    shape: value.shape ?? 'circle',
    color: value.color ?? 'blue',
    rotation: value.rotation ?? 0,
    count: value.count ?? 1,
    fill: value.fill ?? 'solid',
    size: value.size ?? 'medium',
  };
}

function cellKey(value: PatternCell): string {
  const cell = normaliseCell(value);

  if (!cell) return 'null';

  return [
    cell.shape,
    cell.color,
    cell.rotation ?? 0,
    cell.count ?? 1,
    cell.fill ?? 'solid',
    cell.size ?? 'medium',
  ].join('|');
}

function cellsEqual(a: PatternCell, b: PatternCell): boolean {
  return cellKey(a) === cellKey(b);
}

function getSymbolSize(sizeName: string | undefined, baseSize: number): number {
  if (sizeName === 'small') return baseSize * 0.34;
  if (sizeName === 'large') return baseSize * 0.58;
  return baseSize * 0.46;
}

function getPositions(count: number): Array<{ x: number; y: number }> {
  if (count <= 1) {
    return [{ x: 50, y: 50 }];
  }

  if (count === 2) {
    return [
      { x: 35, y: 50 },
      { x: 65, y: 50 },
    ];
  }

  return [
    { x: 50, y: 32 },
    { x: 34, y: 66 },
    { x: 66, y: 66 },
  ];
}

interface ShapeProps {
  cell: PatternCellValue;
  baseSize: number;
}

const Shape: React.FC<ShapeProps> = ({ cell, baseSize }) => {
  const fillColor = COLOR_MAP[cell.color] ?? '#64748b';
  const shapeSize = getSymbolSize(String(cell.size ?? 'medium'), baseSize);
  const count = Math.max(1, Math.min(Number(cell.count ?? 1), 3));
  const positions = getPositions(count);
  const strokeWidth = Math.max(3, baseSize * 0.045);
  const isOutline = cell.fill === 'outline';

  const shape = String(cell.shape ?? 'circle');
  const rotation = Number(cell.rotation ?? 0);

  const renderOneShape = (index: number, xPercent: number, yPercent: number) => {
    const s = shapeSize;
    const half = s / 2;
    const pad = s * 0.12;
    const x = (baseSize * xPercent) / 100 - half;
    const y = (baseSize * yPercent) / 100 - half;

    const commonProps = {
      fill: isOutline ? 'transparent' : fillColor,
      stroke: fillColor,
      strokeWidth: isOutline ? strokeWidth : 0,
      strokeLinejoin: 'round' as const,
    };

    const transform = `translate(${x + half} ${y + half}) rotate(${rotation}) translate(${-half} ${-half})`;

    if (shape === 'circle') {
      return (
        <circle
          key={index}
          cx={x + half}
          cy={y + half}
          r={half - pad}
          {...commonProps}
        />
      );
    }

    if (shape === 'square') {
      return (
        <rect
          key={index}
          x={x + pad}
          y={y + pad}
          width={s - pad * 2}
          height={s - pad * 2}
          rx={s * 0.12}
          transform={transform}
          {...commonProps}
        />
      );
    }

    if (shape === 'triangle') {
      return (
        <polygon
          key={index}
          points={`${x + half},${y + pad} ${x + s - pad},${y + s - pad} ${x + pad},${y + s - pad}`}
          transform={transform}
          {...commonProps}
        />
      );
    }

    if (shape === 'diamond') {
      return (
        <polygon
          key={index}
          points={`${x + half},${y + pad} ${x + s - pad},${y + half} ${x + half},${y + s - pad} ${x + pad},${y + half}`}
          transform={transform}
          {...commonProps}
        />
      );
    }

    if (shape === 'star') {
      const points: string[] = [];

      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? half - pad : (half - pad) * 0.45;
        points.push(
          `${x + half + radius * Math.cos(angle)},${y + half + radius * Math.sin(angle)}`
        );
      }

      return (
        <polygon
          key={index}
          points={points.join(' ')}
          transform={transform}
          {...commonProps}
        />
      );
    }

    if (shape === 'hexagon') {
      const points: string[] = [];

      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        points.push(
          `${x + half + (half - pad) * Math.cos(angle)},${y + half + (half - pad) * Math.sin(angle)}`
        );
      }

      return (
        <polygon
          key={index}
          points={points.join(' ')}
          transform={transform}
          {...commonProps}
        />
      );
    }

    return (
      <circle
        key={index}
        cx={x + half}
        cy={y + half}
        r={half - pad}
        {...commonProps}
      />
    );
  };

  return (
    <svg
      width={baseSize}
      height={baseSize}
      viewBox={`0 0 ${baseSize} ${baseSize}`}
      className="overflow-visible"
      aria-hidden="true"
    >
      {positions.map((position, index) =>
        renderOneShape(index, position.x, position.y)
      )}
    </svg>
  );
};

interface CellProps {
  value: PatternCell;
  isMissing?: boolean;
  isOption?: boolean;
  isSelected?: boolean;
  isReadOnly?: boolean;
  onClick?: () => void;
}

const Cell: React.FC<CellProps> = ({
  value,
  isMissing = false,
  isOption = false,
  isSelected = false,
  isReadOnly = false,
  onClick,
}) => {
  const cell = normaliseCell(value);

  const sharedClassName = [
    'relative flex aspect-square h-full w-full items-center justify-center rounded-2xl border transition-all',
    'shadow-sm',
    isMissing
      ? 'border-dashed border-indigo-300 bg-indigo-50'
      : 'border-slate-200 bg-white',
  ].join(' ');

  if (isMissing && !cell) {
    return (
      <div className={sharedClassName}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-black text-indigo-400">
          ?
        </div>
      </div>
    );
  }

  if (isOption) {
    return (
      <button
        type="button"
        onClick={() => !isReadOnly && onClick?.()}
        disabled={isReadOnly}
        className={[
          sharedClassName,
          isSelected
            ? 'border-indigo-500 bg-indigo-50 ring-4 ring-indigo-100'
            : 'hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md',
          isReadOnly ? 'cursor-default' : 'cursor-pointer',
        ].join(' ')}
      >
        {cell && <Shape cell={cell} baseSize={96} />}

        {isSelected && (
          <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-black text-white">
            ✓
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={[
        sharedClassName,
        isMissing ? 'ring-2 ring-indigo-100' : '',
      ].join(' ')}
    >
      {cell && <Shape cell={cell} baseSize={96} />}
    </div>
  );
};

const PatternCompletionRenderer: React.FC<PatternCompletionRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as ExtendedPatternCompletionPuzzleData;

  const matrix = Array.isArray(data.matrix) ? data.matrix : [];
  const options = Array.isArray(data.options) ? data.options : [];

  const gridSize = data.gridSize ?? matrix.length ?? 3;

  const [selected, setSelected] = useState<PatternCellValue | string | null>(
    (currentAnswer?.selectedOption as PatternCellValue | string | null) ?? null
  );

  useEffect(() => {
    // Previously this only fired while something was selected, so tapping a
    // selected tile again to deselect it left the parent's saved answer
    // pointing at the old (now-unselected) option. Always report the current
    // state — including back down to null — so it can never drift from what
    // the player actually sees on screen.
    onAnswerChange({ selectedOption: selected });
  }, [selected, onAnswerChange]);

  const handleOptionClick = useCallback((option: PatternCellValue | string) => {
    setSelected(prev => cellsEqual(prev, option) ? null : option);
  }, []);

  const gridMaxWidth = gridSize <= 3 ? 'max-w-[360px]' : 'max-w-[430px]';
  const optionGridClass =
    options.length > 4
      ? 'grid-cols-3 sm:grid-cols-6'
      : 'grid-cols-2 sm:grid-cols-4';

  const selectedKey = useMemo(() => cellKey(selected), [selected]);

  if (!matrix.length || !options.length) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <div className="font-bold">Pattern puzzle data is missing.</div>
        <div className="mt-1">
          This puzzle needs a matrix and options array in puzzleData.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* Matrix */}
      <div className={`mx-auto w-full ${gridMaxWidth}`}>
        <div className="rounded-[2rem] bg-slate-950 p-3 shadow-2xl ring-1 ring-black/10">
          <div
            className="grid gap-2 rounded-[1.4rem] bg-slate-900 p-2"
            style={
              {
                gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
              } as CSSProperties
            }
          >
            {matrix.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const isMissing = cell === null;
                const displayValue = isMissing && selected ? selected : cell;

                return (
                  <Cell
                    key={`${rowIndex}-${colIndex}`}
                    value={displayValue}
                    isMissing={isMissing}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="mx-auto w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white px-3 py-4 shadow-sm sm:px-4 sm:py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Choose the missing piece
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              {selected
                ? 'Selection previewed in the missing space.'
                : 'Tap one option to preview it in the grid.'}
            </div>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            {options.length} options
          </div>
        </div>

        <div className={`grid gap-3 ${optionGridClass}`}>
          {options.map((option, index) => (
            <Cell
              key={`${cellKey(option)}-${index}`}
              value={option}
              isOption
              isSelected={selectedKey === cellKey(option)}
              isReadOnly={isReadOnly}
              onClick={() => handleOptionClick(option)}
            />
          ))}
        </div>
      </div>

      {/* Help */}
      {!isReadOnly && (
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-500">
          {selected
            ? 'Happy with this tile? Hit Submit Answer.'
            : 'Study the pattern and tap the tile that completes the grid.'}
        </div>
      )}
    </div>
  );
};

export default PatternCompletionRenderer;