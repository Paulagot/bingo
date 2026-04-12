import React, { useState, useCallback, useEffect } from 'react';

interface NonogramRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

interface NonogramData {
  size:        number;
  rowClues:    number[][];
  colClues:    number[][];
  patternName: string;
}

type CellState = 0 | 1 | 2; // 0=empty, 1=filled, 2=crossed (player marks X)
type Grid = CellState[][];

const NonogramRenderer: React.FC<NonogramRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as NonogramData;
  const { size, rowClues, colClues } = data;

  const emptyGrid = (): Grid =>
    Array.from({ length: size }, () => new Array(size).fill(0) as CellState[]);

  const getInitialGrid = (): Grid => {
    const saved = currentAnswer?.grid as Grid | undefined;
    if (saved && Array.isArray(saved) && saved.length === size) return saved.map(r => [...r]) as Grid;
    return emptyGrid();
  };

  const [grid, setGrid]       = useState<Grid>(getInitialGrid);
  const [mode, setMode]       = useState<1 | 2>(1); // 1=fill, 2=cross
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    onAnswerChange({ grid });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  const toggleCell = useCallback((r: number, c: number) => {
    setGrid(prev => {
      const next = prev.map(row => [...row]) as Grid;
      const cur  = next[r]?.[c] ?? 0;
      const row  = next[r];
      if (row) row[c] = cur === mode ? 0 : mode;
      return next;
    });
  }, [mode]);

  const maxClueLen = Math.max(...rowClues.map(c => c.length), 1);
  const maxColClueLen = Math.max(...colClues.map(c => c.length), 1);
  const cellPx = size <= 5 ? 32 : size <= 10 ? 24 : 18;
  const clueW  = maxClueLen * (cellPx - 4) + 8;

  return (
    <div className="flex flex-col items-center gap-4">

      {/* Mode toggle */}
      {!isReadOnly && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode(1)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${mode === 1 ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}`}
          >■ Fill</button>
          <button
            onClick={() => setMode(2)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${mode === 2 ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400'}`}
          >✕ Cross</button>
        </div>
      )}

      {/* Grid + clues */}
      <div
        className="select-none"
        onMouseLeave={() => setDragging(false)}
        onMouseUp={() => setDragging(false)}
      >
        {/* Column clues row */}
        <div style={{ display: 'flex', marginLeft: clueW }}>
          {colClues.map((clue, c) => (
            <div
              key={c}
              style={{ width: cellPx, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', minHeight: maxColClueLen * 16 + 4 }}
            >
              {clue.map((n, i) => (
                <span key={i} style={{ fontSize: cellPx <= 20 ? 9 : 11, lineHeight: '16px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{n}</span>
              ))}
            </div>
          ))}
        </div>

        {/* Rows */}
        {grid.map((row, r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Row clue */}
            <div style={{ width: clueW, display: 'flex', justifyContent: 'flex-end', gap: 2, paddingRight: 6 }}>
              {(rowClues[r] ?? []).map((n, i) => (
                <span key={i} style={{ fontSize: cellPx <= 20 ? 9 : 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>{n}</span>
              ))}
            </div>

            {/* Cells */}
            {row.map((cell, c) => {
              const isBorderRight  = (c + 1) % 5 === 0 && c !== size - 1;
              const isBorderBottom = (r + 1) % 5 === 0 && r !== size - 1;
              return (
                <div
                  key={c}
                  onMouseDown={() => { if (!isReadOnly) { setDragging(true); toggleCell(r, c); } }}
                  onMouseEnter={() => { if (dragging && !isReadOnly) toggleCell(r, c); }}
                  style={{
                    width: cellPx, height: cellPx,
                    border: '1px solid #d1d5db',
                    borderRight:  isBorderRight  ? '2px solid #6b7280' : '1px solid #d1d5db',
                    borderBottom: isBorderBottom ? '2px solid #6b7280' : '1px solid #d1d5db',
                    background: cell === 1 ? '#1f2937' : cell === 2 ? '#fee2e2' : '#ffffff',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: cellPx <= 20 ? 8 : 10, color: '#ef4444', fontWeight: 'bold',
                    userSelect: 'none',
                  }}
                >
                  {cell === 2 ? '✕' : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Use the row and column number clues to fill in the grid. Switch between Fill and Cross modes.
      </p>
    </div>
  );
};

export default NonogramRenderer;