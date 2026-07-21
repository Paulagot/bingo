import React, { useState, useRef, useEffect } from 'react';
import type { WordSearchPuzzleData } from '../puzzleTypes';

interface WordSearchRendererProps {
  puzzleData: Record<string, unknown>;
  currentAnswer: Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly: boolean;
}

type Cell = [number, number]; // [row, col]

function cellKey(r: number, c: number): string {
  return `${r},${c}`;
}

// Get all cells in a straight line between two cells (H, V, or diagonal)
function getCellsBetween(start: Cell, end: Cell): Cell[] {
  const [r1, c1] = start;
  const [r2, c2] = end;
  const dr = r2 - r1;
  const dc = c2 - c1;
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return [start];
  // Must be horizontal, vertical or exact diagonal
  if (Math.abs(dr) !== Math.abs(dc) && dr !== 0 && dc !== 0) return [];
  const stepR = dr === 0 ? 0 : dr / Math.abs(dr);
  const stepC = dc === 0 ? 0 : dc / Math.abs(dc);
  const cells: Cell[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push([r1 + stepR * i, c1 + stepC * i]);
  }
  return cells;
}

// Extract word string from grid along cells
function wordFromCells(grid: string[][], cells: Cell[]): string {
  return cells.map(([r, c]) => grid[r]?.[c] ?? '').join('');
}

interface FoundEntry {
  word: string;
  cells: Cell[];
}

const HIGHLIGHT_COLORS = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-sky-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-orange-200',
];

const WordSearchRenderer: React.FC<WordSearchRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as WordSearchPuzzleData;

  const initFound = (): FoundEntry[] => {
    const saved = currentAnswer.foundWords as string[] | undefined;
    return saved ? saved.map((w) => ({ word: w, cells: [] })) : [];
  };

  const [foundEntries, setFoundEntries] = useState<FoundEntry[]>(initFound);
  const [startCell, setStartCell] = useState<Cell | null>(null);
  const [hoverCell, setHoverCell] = useState<Cell | null>(null);
  const isDragging = useRef(false);
  const gridRef = useRef<HTMLTableElement>(null);

  // Derived: all found words as a set
  const foundWords = new Set(foundEntries.map((e) => e.word));

  // Cells covered by found words
  const foundCellMap = new Map<string, number>(); // key -> color index
  foundEntries.forEach((entry, idx) => {
    entry.cells.forEach(([r, c]) => {
      foundCellMap.set(cellKey(r, c), idx % HIGHLIGHT_COLORS.length);
    });
  });

  // Live selection preview
  const previewCells: Cell[] =
    startCell && hoverCell ? getCellsBetween(startCell, hoverCell) : [];
  const previewCellSet = new Set(previewCells.map(([r, c]) => cellKey(r, c)));

  useEffect(() => {
    onAnswerChange({ foundWords: Array.from(foundWords) });
  }, [foundEntries]);

  const handleMouseDown = (r: number, c: number) => {
    if (isReadOnly) return;
    isDragging.current = true;
    setStartCell([r, c]);
    setHoverCell([r, c]);
  };

  const handleMouseEnter = (r: number, c: number) => {
    if (!isDragging.current || isReadOnly) return;
    setHoverCell([r, c]);
  };

  const handleMouseUp = () => {
    if (!isDragging.current || !startCell || !hoverCell) return;
    isDragging.current = false;

    const cells = getCellsBetween(startCell, hoverCell);
    if (cells.length >= 2) {
      const word = wordFromCells(data.grid, cells);
      const wordRev = word.split('').reverse().join('');
      const matched = data.wordList.find(
        (w) => w.toUpperCase() === word || w.toUpperCase() === wordRev
      );
      if (matched && !foundWords.has(matched.toUpperCase())) {
        setFoundEntries((prev) => [
          ...prev,
          { word: matched.toUpperCase(), cells },
        ]);
      }
    }

    setStartCell(null);
    setHoverCell(null);
  };

  // ---- Touch support -------------------------------------------------
  // Touch devices never fire onMouseEnter, so dragging a finger across the
  // grid needs its own path: read the cell under the finger on every
  // touchmove via elementFromPoint (same technique NonogramRenderer uses
  // for its paint-drag), then reuse the existing mouse handlers' logic.
  const cellFromTouch = (touch: React.Touch): Cell | null => {
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const td = el?.closest('td[data-r]') as HTMLElement | null;
    if (!td) return null;
    const r = Number(td.dataset.r);
    const c = Number(td.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return null;
    return [r, c];
  };

  const handleTouchStart = (r: number, c: number, e: React.TouchEvent) => {
    if (isReadOnly) return;
    e.preventDefault(); // stop the page from scrolling while selecting
    isDragging.current = true;
    setStartCell([r, c]);
    setHoverCell([r, c]);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || isReadOnly) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const cell = cellFromTouch(touch);
    if (cell) setHoverCell(cell);
  };

  const handleTouchEnd = () => {
    handleMouseUp();
  };

  return (
    <div
      className="flex flex-col gap-6 select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Word list */}
      <div className="flex flex-wrap gap-2 justify-center">
        {data.wordList.map((word) => {
          const isFound = foundWords.has(word.toUpperCase());
          return (
            <span
              key={word}
              className={`px-3 py-1 rounded-full text-sm font-semibold border transition-all ${
                isFound
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-300 line-through opacity-60'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
            >
              {word}
            </span>
          );
        })}
      </div>

      {/* Grid */}
      {/* Cell size shrinks for larger grids (hard = 15x15) so the board fits
          typical phone viewports without forcing horizontal scroll mid-game.
          touchAction: 'none' stops the browser from panning/scrolling the
          page while the player is dragging a finger across the grid. */}
      <div
        className="overflow-x-auto"
        style={{ cursor: isReadOnly ? 'default' : 'crosshair', touchAction: isReadOnly ? 'auto' : 'none' }}
      >
        <table ref={gridRef} className="mx-auto border-collapse">
          <tbody>
            {data.grid.map((row, r) => (
              <tr key={r}>
                {row.map((letter, c) => {
                  const key = cellKey(r, c);
                  const foundColorIdx = foundCellMap.get(key);
                  const isInPreview = previewCellSet.has(key);
                  const gridSize = data.grid.length;
                  const cellPx = gridSize <= 10 ? 32 : gridSize <= 12 ? 28 : 22;

                  return (
                    <td
                      key={c}
                      data-r={r}
                      data-c={c}
                      onMouseDown={() => handleMouseDown(r, c)}
                      onMouseEnter={() => handleMouseEnter(r, c)}
                      onTouchStart={(e) => handleTouchStart(r, c, e)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      style={{ width: cellPx, height: cellPx, fontSize: cellPx <= 24 ? 12 : 14 }}
                      className={`text-center align-middle font-bold rounded transition-colors select-none ${
                        isInPreview
                          ? 'bg-indigo-300 text-white'
                          : foundColorIdx !== undefined
                          ? `${HIGHLIGHT_COLORS[foundColorIdx]} text-gray-800`
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {letter}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Progress */}
      <p className="text-center text-xs text-gray-400">
        {foundWords.size} / {data.wordList.length} words found
      </p>
    </div>
  );
};

export default WordSearchRenderer;