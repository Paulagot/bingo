import React, { useState, useCallback, useEffect } from 'react';
import type { SudokuPuzzleData } from '../puzzleTypes';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SudokuRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Grid = number[][];
type FixedCells = boolean[][];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cloneGrid(g: Grid): Grid {
  return g.map(row => [...row]);
}

function isComplete(grid: Grid): boolean {
  return grid.every(row => row.every(cell => cell !== 0));
}

/**
 * Return a set of "conflicting" cell keys for quick highlighting.
 * A conflict is any duplicate in the same row, column, or 3×3 box.
 */
/** Safe cell accessor — returns 0 if out of bounds */
function cell(grid: Grid, r: number, c: number): number {
  return grid[r]?.[c] ?? 0;
}

function getConflicts(grid: Grid): Set<string> {
  const conflicts = new Set<string>();

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const val = cell(grid, r, c);
      if (val === 0) continue;

      // Check row
      for (let cc = 0; cc < 9; cc++) {
        if (cc !== c && cell(grid, r, cc) === val) {
          conflicts.add(`${r}-${c}`);
          conflicts.add(`${r}-${cc}`);
        }
      }

      // Check column
      for (let rr = 0; rr < 9; rr++) {
        if (rr !== r && cell(grid, rr, c) === val) {
          conflicts.add(`${r}-${c}`);
          conflicts.add(`${rr}-${c}`);
        }
      }

      // Check 3×3 box
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let rr = br; rr < br + 3; rr++) {
        for (let cc = bc; cc < bc + 3; cc++) {
          if ((rr !== r || cc !== c) && cell(grid, rr, cc) === val) {
            conflicts.add(`${r}-${c}`);
            conflicts.add(`${rr}-${cc}`);
          }
        }
      }
    }
  }

  return conflicts;
}

// ---------------------------------------------------------------------------
// Cell component
// ---------------------------------------------------------------------------

interface CellProps {
  value:       number;
  row:         number;
  col:         number;
  isFixed:     boolean;
  isSelected:  boolean;
  isHighlighted: boolean; // same row/col/box as selected
  isConflict:  boolean;
  isSameValue: boolean;   // same number as selected (for orientation)
  isReadOnly:  boolean;
  onClick:     (r: number, c: number) => void;
}

const Cell: React.FC<CellProps> = ({
  value, row, col,
  isFixed, isSelected, isHighlighted, isConflict, isSameValue,
  isReadOnly, onClick,
}) => {
  // Border thickness — thicker on box boundaries
  const borderRight  = (col + 1) % 3 === 0 && col !== 8 ? 'border-r-2 border-r-gray-500' : 'border-r border-r-gray-300';
  const borderBottom = (row + 1) % 3 === 0 && row !== 8 ? 'border-b-2 border-b-gray-500' : 'border-b border-b-gray-300';

  let bg = 'bg-white';
  if (isSelected)    bg = 'bg-indigo-200';
  else if (isConflict)    bg = 'bg-red-100';
  else if (isSameValue && value !== 0) bg = 'bg-indigo-100';
  else if (isHighlighted) bg = 'bg-gray-100';

  const textColor = isFixed
    ? 'text-gray-900 font-bold'
    : isConflict
      ? 'text-red-600 font-semibold'
      : 'text-indigo-700 font-semibold';

  return (
    <button
      onClick={() => !isReadOnly && onClick(row, col)}
      disabled={isReadOnly}
      className={[
        'w-full aspect-square flex items-center justify-center text-base',
        'transition-colors duration-75 focus:outline-none',
        borderRight, borderBottom,
        bg, textColor,
        !isReadOnly && !isFixed ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default',
      ].join(' ')}
    >
      {value !== 0 ? value : ''}
    </button>
  );
};

// ---------------------------------------------------------------------------
// Number pad
// ---------------------------------------------------------------------------

interface NumberPadProps {
  onNumber: (n: number) => void;
  onErase:  () => void;
  disabled: boolean;
}

const NumberPad: React.FC<NumberPadProps> = ({ onNumber, onErase, disabled }) => (
  <div className="flex gap-1.5 justify-center flex-wrap max-w-xs w-full">
    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
      <button
        key={n}
        onClick={() => onNumber(n)}
        disabled={disabled}
        className={[
          'w-9 h-9 rounded font-bold text-base border-2 transition-all',
          disabled
            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
            : 'bg-white text-gray-800 border-gray-300 hover:bg-indigo-50 hover:border-indigo-400 active:scale-95 cursor-pointer',
        ].join(' ')}
      >
        {n}
      </button>
    ))}
    <button
      onClick={onErase}
      disabled={disabled}
      className={[
        'w-9 h-9 rounded font-bold text-sm border-2 transition-all',
        disabled
          ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
          : 'bg-white text-gray-500 border-gray-300 hover:bg-red-50 hover:border-red-300 active:scale-95 cursor-pointer',
      ].join(' ')}
    >
      ✕
    </button>
  </div>
);

// ---------------------------------------------------------------------------
// Main renderer
// ---------------------------------------------------------------------------

const SudokuRenderer: React.FC<SudokuRendererProps> = ({
  puzzleData,
  currentAnswer,
  onAnswerChange,
  isReadOnly,
}) => {
  const data = puzzleData as unknown as SudokuPuzzleData;

  // Initialise grid — from saved answer or fresh puzzle
  const getInitialGrid = (): Grid => {
    const saved = currentAnswer?.grid as Grid | undefined;
    if (saved && Array.isArray(saved) && saved.length === 9) return cloneGrid(saved);
    return cloneGrid(data.grid);
  };

  const fixedCells = data.fixedCells as FixedCells;

  const [grid, setGrid]               = useState<Grid>(getInitialGrid);
  const [selected, setSelected]       = useState<[number, number] | null>(null);

  // Sync upward whenever grid changes
  useEffect(() => {
    onAnswerChange({ grid, complete: isComplete(grid) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  const handleCellClick = useCallback((r: number, c: number) => {
    setSelected(prev => {
      // Deselect if tapping the same cell twice
      if (prev && prev[0] === r && prev[1] === c) return null;
      return [r, c];
    });
  }, []);

  const handleNumber = useCallback((n: number) => {
    if (!selected) return;
    const [r, c] = selected;
    if (fixedCells[r]?.[c]) return; // locked cell — ignore

    setGrid(prev => {
      const next    = cloneGrid(prev);
      const row     = next[r];
      if (row) row[c] = n;
      return next;
    });
  }, [selected, fixedCells]);

  const handleErase = useCallback(() => {
    if (!selected) return;
    const [r, c] = selected;
    if (fixedCells[r]?.[c]) return;

    setGrid(prev => {
      const next  = cloneGrid(prev);
      const row   = next[r];
      if (row) row[c] = 0;
      return next;
    });
  }, [selected, fixedCells]);

  // Keyboard support — type numbers directly while a cell is selected
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!selected || isReadOnly) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) handleNumber(n);
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') handleErase();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, isReadOnly, handleNumber, handleErase]);

  // Derived highlighting state
  const conflicts = getConflicts(grid);
  const selVal    = selected ? cell(grid, selected[0], selected[1]) : 0;

  const isHighlighted = (r: number, c: number): boolean => {
    if (!selected) return false;
    const [sr, sc] = selected;
    if (r === sr || c === sc) return true;
    // Same 3×3 box
    return Math.floor(r / 3) === Math.floor(sr / 3) &&
           Math.floor(c / 3) === Math.floor(sc / 3);
  };

  const complete = isComplete(grid);
  const padDisabled = !selected || (selected ? !!fixedCells[selected[0]]?.[selected[1]] : true) || isReadOnly;

  return (
    <div className="flex flex-col items-center gap-5">

      {/* Status */}
      {complete && !isReadOnly && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-center w-full max-w-xs">
          <p className="text-emerald-700 font-semibold">Grid complete!</p>
          <p className="text-emerald-600 text-sm mt-0.5">Hit Submit to check your answer and save your score.</p>
        </div>
      )}

      {/* Grid — outer border forms the puzzle border */}
      <div className="border-2 border-gray-700 inline-grid w-full max-w-xs"
           style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)' }}>
        {grid.map((row, r) =>
          row.map((val, c) => (
            <Cell
              key={`${r}-${c}`}
              value={val}
              row={r}
              col={c}
              isFixed={!!fixedCells[r]?.[c]}
              isSelected={!!selected && selected[0] === r && selected[1] === c}
              isHighlighted={isHighlighted(r, c)}
              isConflict={conflicts.has(`${r}-${c}`)}
              isSameValue={selVal !== 0 && val === selVal}
              isReadOnly={isReadOnly}
              onClick={handleCellClick}
            />
          ))
        )}
      </div>

      {/* Number pad */}
      {!isReadOnly && (
        <>
          <NumberPad
            onNumber={handleNumber}
            onErase={handleErase}
            disabled={padDisabled}
          />
          <p className="text-xs text-gray-400 text-center max-w-xs">
            {selected
              ? fixedCells[selected[0]]?.[selected[1]]
                ? 'This cell is locked — select an empty cell to enter a number.'
                : 'Tap a number to fill the selected cell, or ✕ to erase.'
              : 'Tap a cell to select it, then use the number pad below.'}
          </p>
        </>
      )}

    </div>
  );
};

export default SudokuRenderer;