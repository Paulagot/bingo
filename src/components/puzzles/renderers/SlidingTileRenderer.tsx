import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { SlidingTilePuzzleData } from '../puzzleTypes';

interface SlidingTileRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

type ExtendedSlidingTilePuzzleData = SlidingTilePuzzleData & {
  size?: number;
  imageUrl?: string;
  title?: string;
  mode?: 'numbers' | 'image';
};

const DEFAULT_SIZE = 4;

function flatToGrid(flat: number[], size: number): number[][] {
  const grid: number[][] = [];

  for (let row = 0; row < size; row++) {
    grid.push(flat.slice(row * size, row * size + size));
  }

  return grid;
}

function gridToFlat(grid: number[][]): number[] {
  return grid.flat();
}

function findEmpty(flat: number[]): number {
  return flat.indexOf(0);
}

function getNeighbours(emptyIdx: number, size: number): number[] {
  const row = Math.floor(emptyIdx / size);
  const col = emptyIdx % size;
  const neighbours: number[] = [];

  if (row > 0) neighbours.push(emptyIdx - size);
  if (row < size - 1) neighbours.push(emptyIdx + size);
  if (col > 0) neighbours.push(emptyIdx - 1);
  if (col < size - 1) neighbours.push(emptyIdx + 1);

  return neighbours;
}

function isSolved(flat: number[], size: number): boolean {
  const solved = Array.from({ length: size * size - 1 }, (_, index) => index + 1);
  solved.push(0);

  return flat.every((value, index) => value === solved[index]);
}

function getCorrectTilePosition(value: number, size: number) {
  const correctIndex = value - 1;
  const row = Math.floor(correctIndex / size);
  const col = correctIndex % size;

  return { row, col };
}

interface TileProps {
  value: number;
  index: number;
  size: number;
  imageUrl?: string;
  isMovable: boolean;
  isReadOnly: boolean;
  onClick: (index: number) => void;
}

const Tile: React.FC<TileProps> = ({
  value,
  index,
  size,
  imageUrl,
  isMovable,
  isReadOnly,
  onClick,
}) => {
  if (value === 0) {
    return (
      <div className="h-full w-full rounded-xl border-2 border-dashed border-slate-500/70 bg-slate-800 shadow-inner">
        <div className="h-full w-full rounded-xl bg-white/5" />
      </div>
    );
  }

  const hasImage = Boolean(imageUrl);
  const { row, col } = getCorrectTilePosition(value, size);

  const backgroundStyle: CSSProperties | undefined = hasImage
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: `${size * 100}% ${size * 100}%`,
        backgroundPosition: `${(col / (size - 1)) * 100}% ${
          (row / (size - 1)) * 100
        }%`,
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={() => !isReadOnly && onClick(index)}
      disabled={isReadOnly}
      style={backgroundStyle}
      className={[
        'relative h-full w-full overflow-hidden rounded-xl border border-white/20 bg-cover bg-no-repeat shadow-md transition-all duration-150',
        hasImage ? 'bg-slate-700' : 'bg-gradient-to-br from-indigo-500 to-sky-500',
        isMovable && !isReadOnly
          ? 'cursor-pointer hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-xl'
          : 'cursor-default',
        !isMovable && !isReadOnly ? 'opacity-95' : '',
      ].join(' ')}
    >
      <div className="absolute inset-0 bg-black/10" />

      <span className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-xs font-black text-white shadow-sm backdrop-blur-sm ring-1 ring-white/20">
        {value}
      </span>

      {isMovable && !isReadOnly && (
        <span className="absolute bottom-1.5 right-1.5 z-10 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow" />
      )}
    </button>
  );
};

const SlidingTileRenderer: React.FC<SlidingTileRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as ExtendedSlidingTilePuzzleData;

  const size = data.size ?? DEFAULT_SIZE;
  const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : undefined;
  const hasImage = Boolean(imageUrl);

  const getInitialFlat = (): number[] => {
    const saved = currentAnswer?.grid as number[][] | undefined;

    if (saved && Array.isArray(saved) && saved.length === size) {
      return gridToFlat(saved);
    }

    if (Array.isArray(data.grid) && data.grid.length === size) {
      return gridToFlat(data.grid);
    }

    return Array.from({ length: size * size - 1 }, (_, index) => index + 1).concat(0);
  };

  const [flat, setFlat] = useState<number[]>(getInitialFlat);
  const [moveCount, setMoveCount] = useState<number>(
    typeof currentAnswer?.moveCount === 'number' ? currentAnswer.moveCount : 0
  );
  const [showPreview, setShowPreview] = useState(true);

  const solved = useMemo(() => isSolved(flat, size), [flat, size]);
  const emptyIdx = useMemo(() => findEmpty(flat), [flat]);

  const movableIndexes = useMemo(() => {
    if (emptyIdx < 0) return new Set<number>();
    return new Set(getNeighbours(emptyIdx, size));
  }, [emptyIdx, size]);

  useEffect(() => {
    onAnswerChange({
      grid: flatToGrid(flat, size),
      moveCount,
      solved,
    });
  }, [flat, moveCount, solved, size, onAnswerChange]);

  const handleTileClick = useCallback(
    (tileIdx: number) => {
      setFlat(prev => {
        const currentEmptyIdx = findEmpty(prev);

        if (currentEmptyIdx < 0) {
          return prev;
        }

        const neighbours = getNeighbours(currentEmptyIdx, size);

        if (!neighbours.includes(tileIdx)) {
          return prev;
        }

        const next = [...prev];
        const tileValue = next[tileIdx];

        if (typeof tileValue !== 'number') {
          return prev;
        }

        next[currentEmptyIdx] = tileValue;
        next[tileIdx] = 0;

        setMoveCount(count => count + 1);

        return next;
      });
    },
    [size]
  );

  const boardMaxWidth = size === 3 ? 'max-w-[520px]' : 'max-w-[540px]';
  const boardPadding = size === 3 ? 'p-4' : 'p-3';
  const gridGap = size === 3 ? 'gap-3' : 'gap-2.5';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Puzzle intro */}
      <div className="relative overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-100/80" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-cyan-100/70" />

        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500">
              Picture scramble
            </div>

            <div className="mt-1 text-xl font-black text-slate-900">
              {data.title ?? (hasImage ? 'Rebuild the image' : 'Put the tiles back in order')}
            </div>

            <div className="mt-1 text-sm font-medium text-slate-500">
              Tap a tile beside the blank space to slide it.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Moves
              </div>
              <div className="text-xl font-black text-slate-900">
                {moveCount}
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-sm ring-1 ring-slate-200">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Grid
              </div>
              <div className="text-xl font-black text-slate-900">
                {size}×{size}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main board */}
      <div className={`mx-auto w-full ${boardMaxWidth}`}>
        <div
          className={`w-full rounded-[2rem] bg-slate-950 ${boardPadding} shadow-2xl ring-1 ring-black/10`}
          style={{
            aspectRatio: '1 / 1',
          }}
        >
          <div
            className={`grid h-full w-full ${gridGap} rounded-[1.5rem] bg-slate-900 p-2`}
            style={{
              gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${size}, minmax(0, 1fr))`,
            }}
          >
            {flat.map((value, index) => (
              <Tile
                key={`${value}-${index}`}
                value={value}
                index={index}
                size={size}
                imageUrl={imageUrl}
                isMovable={movableIndexes.has(index)}
                isReadOnly={isReadOnly}
                onClick={handleTileClick}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Preview */}
      {hasImage && (
        <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              Preview
            </span>

            <button
              type="button"
              onClick={() => setShowPreview(prev => !prev)}
              className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600"
            >
              {showPreview ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPreview ? (
            <img
              src={imageUrl}
              alt="Sliding puzzle preview"
              className="aspect-square w-full rounded-[1.35rem] object-cover"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-[1.35rem] bg-slate-100 text-sm font-bold text-slate-400">
              Preview hidden
            </div>
          )}
        </div>
      )}

      {/* How to play now lives in the shared overlay button (see PuzzleShell) -
          this used to duplicate that same content in its own card here,
          which was one of the larger contributors to mobile scroll length. */}

      {/* Solved state */}
      {solved && !isReadOnly && (
        <div className="mx-auto max-w-md rounded-[2rem] border border-emerald-200 bg-emerald-50 px-5 py-4 text-center shadow-sm">
          <p className="text-lg font-black text-emerald-700">
            Puzzle complete!
          </p>

          <p className="mt-1 text-sm font-semibold text-emerald-600">
            Solved in {moveCount} move{moveCount !== 1 ? 's' : ''}. Hit Submit to save your score.
          </p>
        </div>
      )}
    </div>
  );
};

export default SlidingTileRenderer;