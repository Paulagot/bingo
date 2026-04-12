import React, { useState, useCallback, useEffect } from 'react';
import type { SlidingTilePuzzleData } from '../puzzleTypes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SlidingTileRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const SIZE = 4;

function flatToGrid(flat: number[]): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < SIZE; r++) {
    grid.push(flat.slice(r * SIZE, r * SIZE + SIZE));
  }
  return grid;
}

function gridToFlat(grid: number[][]): number[] {
  return grid.flat();
}

function findEmpty(flat: number[]): number {
  return flat.indexOf(0);
}

function getNeighbours(emptyIdx: number): number[] {
  const row = Math.floor(emptyIdx / SIZE);
  const col = emptyIdx % SIZE;
  const neighbours: number[] = [];
  if (row > 0)        neighbours.push(emptyIdx - SIZE);
  if (row < SIZE - 1) neighbours.push(emptyIdx + SIZE);
  if (col > 0)        neighbours.push(emptyIdx - 1);
  if (col < SIZE - 1) neighbours.push(emptyIdx + 1);
  return neighbours;
}

function isSolved(flat: number[]): boolean {
  const solved = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
  return flat.every((v, i) => v === solved[i]);
}

// ---------------------------------------------------------------------------
// Tile
// ---------------------------------------------------------------------------

interface TileProps {
  value:        number;
  index:        number;
  isSelected:   boolean;
  isReadOnly:   boolean;
  onClick:      (index: number) => void;
}

const Tile: React.FC<TileProps> = ({ value, index, isSelected, isReadOnly, onClick }) => {
  // Empty space — plain grey box, no button
  if (value === 0) {
    return (
      <div className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300" />
    );
  }

  return (
    <button
      onClick={() => !isReadOnly && onClick(index)}
      disabled={isReadOnly}
      className={[
        'aspect-square font-bold text-lg select-none',
        'flex items-center justify-center border-2 transition-all duration-100',
        isSelected
          ? 'bg-indigo-500 text-white border-indigo-700 scale-95 shadow-lg'
          : 'bg-white text-gray-800 border-gray-300 hover:border-gray-400 shadow-sm',
        !isReadOnly ? 'cursor-pointer' : 'cursor-default',
      ].filter(Boolean).join(' ')}
    >
      {value}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

const SlidingTileRenderer: React.FC<SlidingTileRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as SlidingTilePuzzleData;

  const getInitialFlat = (): number[] => {
    const saved = currentAnswer?.grid as number[][] | undefined;
    if (saved && Array.isArray(saved) && saved.length === SIZE) {
      return gridToFlat(saved);
    }
    return gridToFlat(data.grid);
  };

  const [flat, setFlat]           = useState<number[]>(getInitialFlat);
  const [moveCount, setMoveCount] = useState<number>(
    typeof currentAnswer?.moveCount === 'number' ? currentAnswer.moveCount : 0
  );
  // The index of the tile the user has tapped — null means nothing selected
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Sync answer upward on every move
  useEffect(() => {
    onAnswerChange({
      grid:      flatToGrid(flat),
      moveCount,
      solved:    isSolved(flat),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flat, moveCount]);

  const handleTileClick = useCallback((tileIdx: number) => {
    setFlat(prev => {
      const emptyIdx   = findEmpty(prev);
      const neighbours = getNeighbours(emptyIdx);

      // If this tile is adjacent to the empty space, slide it immediately
      if (neighbours.includes(tileIdx)) {
        const next     = [...prev];
        const tileVal  = next[tileIdx]  as number;
        const emptyVal = next[emptyIdx] as number;
        next[emptyIdx] = tileVal;
        next[tileIdx]  = emptyVal;
        setSelectedIdx(null);
        setMoveCount(c => c + 1);
        return next;
      }

      // Otherwise just select it (deselect if tapping same tile again)
      setSelectedIdx(prev2 => prev2 === tileIdx ? null : tileIdx);
      return prev;
    });
  }, []);

  const solved = isSolved(flat);

  return (
    <div className="flex flex-col items-center gap-5">

      {/* Status bar */}
      <div className="flex items-center justify-between w-full max-w-xs text-sm text-gray-500">
        <span>Moves: <strong className="text-gray-700">{moveCount}</strong></span>
        {solved && !isReadOnly && (
          <span className="text-emerald-600 font-semibold">✓ Solved!</span>
        )}
        {isReadOnly && (
          <span className="text-gray-400 italic text-xs">Read only</span>
        )}
      </div>

      {/* Grid */}
      <div
        className="grid gap-1.5 w-full max-w-xs"
        style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
      >
        {flat.map((value, index) => (
          <Tile
            key={index}
            value={value}
            index={index}
            isSelected={index === selectedIdx}
            isReadOnly={isReadOnly}
            onClick={handleTileClick}
          />
        ))}
      </div>

      {/* Hint */}
      {!isReadOnly && !solved && (
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Click a tile next to the empty space to slide it.
          Arrange 1–15 in order with the blank at bottom-right.
        </p>
      )}

      {/* Solved banner */}
      {solved && !isReadOnly && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-center">
          <p className="text-emerald-700 font-semibold">Puzzle complete!</p>
          <p className="text-emerald-600 text-sm mt-0.5">
            Solved in {moveCount} move{moveCount !== 1 ? 's' : ''}. Hit Submit to save your score.
          </p>
        </div>
      )}

    </div>
  );
};

export default SlidingTileRenderer;