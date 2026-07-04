import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { SlidingTilePuzzleData } from '../puzzleTypes';

interface SlidingTileRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

const DEFAULT_SIZE = 4;

type ExtendedSlidingTilePuzzleData = SlidingTilePuzzleData & {
  size?: number;
  imageUrl?: string;
  title?: string;
  mode?: 'numbers' | 'image';
};

function flatToGrid(flat: number[], size: number): number[][] {
  const grid: number[][] = [];

  for (let r = 0; r < size; r++) {
    grid.push(flat.slice(r * size, r * size + size));
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
  isMovable: boolean;
  isSelected: boolean;
  isReadOnly: boolean;
  imageUrl?: string;
  onClick: (index: number) => void;
}

const Tile: React.FC<TileProps> = ({
  value,
  index,
  size,
  isMovable,
  isSelected,
  isReadOnly,
  imageUrl,
  onClick,
}) => {
  if (value === 0) {
    return (
      <div className="relative aspect-square rounded-[1.35rem] border-2 border-dashed border-white/20 bg-black/25 shadow-inner">
        <div className="absolute inset-2 rounded-2xl bg-white/5" />
      </div>
    );
  }

  const hasImage = Boolean(imageUrl);
  const { row, col } = getCorrectTilePosition(value, size);

  const backgroundStyle = hasImage
    ? {
        backgroundImage: `url(${imageUrl})`,
        backgroundSize: `${size * 100}% ${size * 100}%`,
        backgroundPosition: `${(col / (size - 1)) * 100}% ${(row / (size - 1)) * 100}%`,
      }
    : undefined;

  return (
    <button
      type="button"
      onClick={() => !isReadOnly && onClick(index)}
      disabled={isReadOnly}
      style={backgroundStyle}
      className={[
        'group relative aspect-square overflow-hidden rounded-[1.35rem] border transition-all duration-150',
        'flex items-center justify-center select-none',
        hasImage
          ? 'bg-cover bg-no-repeat border-white/20 shadow-lg'
          : 'border-white/20 bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-500 shadow-lg',
        isMovable && !isReadOnly
          ? 'cursor-pointer hover:-translate-y-1 hover:scale-[1.025] hover:shadow-2xl'
          : 'cursor-default',
        isSelected ? 'scale-95 ring-4 ring-white/30' : '',
        !isMovable && !isReadOnly ? 'opacity-95' : '',
      ].join(' ')}
    >
      {hasImage && (
        <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/0 to-black/25" />
      )}

      {!hasImage && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_35%)]" />
      )}

      <span
        className={[
          'relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black shadow-sm',
          hasImage
            ? 'bg-black/50 text-white backdrop-blur-sm ring-1 ring-white/20'
            : 'bg-white text-indigo-700',
        ].join(' ')}
      >
        {value}
      </span>

      {isMovable && !isReadOnly && (
        <span className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-300 shadow-sm" />
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

    if (Array.isArray(data.grid)) {
      return gridToFlat(data.grid);
    }

    return Array.from({ length: size * size - 1 }, (_, index) => index + 1).concat(0);
  };

  const [flat, setFlat] = useState<number[]>(getInitialFlat);
  const [moveCount, setMoveCount] = useState<number>(
    typeof currentAnswer?.moveCount === 'number' ? currentAnswer.moveCount : 0
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  const handleTileClick = useCallback((tileIdx: number) => {
    setFlat(prev => {
      const currentEmptyIdx = findEmpty(prev);

      if (currentEmptyIdx < 0) {
        return prev;
      }

      const neighbours = getNeighbours(currentEmptyIdx, size);

      if (neighbours.includes(tileIdx)) {
        const next = [...prev];
        const tileValue = next[tileIdx];

        if (typeof tileValue !== 'number') {
          return prev;
        }

        next[currentEmptyIdx] = tileValue;
        next[tileIdx] = 0;

        setSelectedIdx(null);
        setMoveCount(count => count + 1);

        return next;
      }

      setSelectedIdx(prevSelected => prevSelected === tileIdx ? null : tileIdx);
      return prev;
    });
  }, [size]);

  return (
    <div className="space-y-6">
      {/* Header card inside the puzzle */}
      <div className="relative overflow-hidden rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 px-5 py-5 shadow-sm">
        <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-100/80" />
        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-cyan-100/70" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-500">
              Picture scramble
            </div>
            <div className="mt-1 text-lg font-black text-slate-900">
              {data.title ?? (hasImage ? 'Rebuild the image' : 'Put the tiles back in order')}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-500">
              Tap a glowing tile beside the empty space to slide it.
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

      {/* Board + preview */}
      <div className="mx-auto grid w-full max-w-3xl gap-5 lg:grid-cols-[1fr_220px] lg:items-start">
        <div className="rounded-[2rem] bg-slate-950 p-3 shadow-2xl ring-1 ring-black/10">
          <div
            className="grid gap-2 rounded-[1.5rem] bg-slate-900 p-2"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {flat.map((value, index) => (
              <Tile
                key={`${value}-${index}`}
                value={value}
                index={index}
                size={size}
                imageUrl={imageUrl}
                isMovable={movableIndexes.has(index)}
                isSelected={index === selectedIdx}
                isReadOnly={isReadOnly}
                onClick={handleTileClick}
              />
            ))}
          </div>
        </div>

        <aside className="space-y-3">
          {hasImage ? (
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
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
                <div className="flex aspect-square w-full items-center justify-center rounded-[1.35rem] bg-slate-100 px-4 text-center text-sm font-bold text-slate-400">
                  Preview hidden
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Goal
              </div>
              <div className="mt-2 text-sm font-bold leading-relaxed text-slate-600">
                Arrange the numbers from 1 to {size * size - 1}, with the empty space at the end.
              </div>
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
              How to play
            </div>
            <ul className="mt-2 space-y-2 text-sm font-medium text-slate-500">
              <li>Only tiles beside the blank space can move.</li>
              <li>Movable tiles have a small green dot.</li>
              <li>Fewer moves means a better score.</li>
            </ul>
          </div>
        </aside>
      </div>

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