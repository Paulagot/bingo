import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

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

// Compute run-length clue for a single line, treating only 1 as "filled"
// (mirrors the server engine's normalizeGrid/buildClues logic).
function lineRuns(cells: CellState[]): number[] {
  const runs: number[] = [];
  let count = 0;
  for (const cell of cells) {
    if (cell === 1) { count++; }
    else if (count > 0) { runs.push(count); count = 0; }
  }
  if (count > 0) runs.push(count);
  return runs.length > 0 ? runs : [0];
}

function clueSatisfied(actual: number[], target: number[]): boolean {
  if (actual.length !== target.length) return false;
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== target[i]) return false;
  }
  return true;
}

const NonogramRenderer: React.FC<NonogramRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as NonogramData;
  const { size, rowClues, colClues, patternName } = data;

  const emptyGrid = (): Grid =>
    Array.from({ length: size }, () => new Array(size).fill(0) as CellState[]);

  const getInitialGrid = (): Grid => {
    const saved = currentAnswer?.grid as Grid | undefined;
    if (saved && Array.isArray(saved) && saved.length === size) return saved.map(r => [...r]) as Grid;
    return emptyGrid();
  };

  const [grid, setGrid] = useState<Grid>(getInitialGrid);
  const [mode, setMode] = useState<1 | 2>(1); // 1=fill, 2=cross
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const [justSolved, setJustSolved] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const paintValueRef = useRef<CellState>(0);

  // ---- derived puzzle state ----

  const rowStatus = useMemo(
    () => grid.map((row, r) => clueSatisfied(lineRuns(row), rowClues[r] ?? [0])),
    [grid, rowClues]
  );

  const colStatus = useMemo(
    () => Array.from({ length: size }, (_, c) => {
      const col = grid.map(row => row[c] ?? 0) as CellState[];
      return clueSatisfied(lineRuns(col), colClues[c] ?? [0]);
    }),
    [grid, colClues, size]
  );

  const filledCount = useMemo(
    () => grid.reduce((sum, row) => sum + row.filter(c => c === 1).length, 0),
    [grid]
  );

  const isSolved = rowStatus.every(Boolean) && colStatus.every(Boolean);

  useEffect(() => {
    onAnswerChange({ grid, solved: isSolved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid]);

  useEffect(() => {
    if (isSolved) {
      setJustSolved(true);
      const t = setTimeout(() => setJustSolved(false), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isSolved]);

  // ---- painting (mouse + touch, via pointer events) ----

  const applyCell = useCallback((r: number, c: number, value: CellState) => {
    setGrid(prev => {
      const row = prev[r];
      if (!row || row[c] === undefined || row[c] === value) return prev;
      const next = prev.map(rr => [...rr]) as Grid;
      const nextRow = next[r];
      if (nextRow) nextRow[c] = value;
      return next;
    });
  }, []);

  const startPaint = useCallback((r: number, c: number) => {
    if (isReadOnly) return;
    const current = grid[r]?.[c] ?? 0;
    // The whole drag stroke paints the *same* resulting value - toggling is
    // decided once, at the start of the stroke, not per cell it passes over.
    const value: CellState = current === mode ? 0 : mode;
    paintValueRef.current = value;
    draggingRef.current = true;
    applyCell(r, c, value);
  }, [grid, mode, applyCell, isReadOnly]);

  const paintAtPoint = useCallback((clientX: number, clientY: number) => {
    if (!draggingRef.current) return;
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const cellEl = el?.closest('[data-r]') as HTMLElement | null;
    if (!cellEl) return;
    const r = Number(cellEl.dataset.r);
    const c = Number(cellEl.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return;
    applyCell(r, c, paintValueRef.current);
  }, [applyCell]);

  useEffect(() => {
    const stop = () => { draggingRef.current = false; };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
  }, []);

  // ---- geometry ----

  // 17px was below the ~44px recommended touch target and made hard (15x15)
  // boards genuinely hard to paint accurately with a finger. 22px is still
  // compact but meaningfully easier to hit; the grid wrapper below scrolls
  // horizontally on narrow screens instead of shrinking cells further.
  const cellPx = size <= 7 ? 32 : size <= 10 ? 25 : 22;
  const clueFont = cellPx >= 28 ? 13 : cellPx >= 22 ? 11 : 9;
  const maxRowClueLen = Math.max(...rowClues.map(c => c.length), 1);
  const maxColClueLen = Math.max(...colClues.map(c => c.length), 1);
  const clueW = maxRowClueLen * (clueFont + 6) + 10;
  const colClueH = maxColClueLen * (clueFont + 5) + 6;

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl p-5"
      style={{
        background: 'linear-gradient(180deg, #f7f2e7 0%, #ece2ca 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(184,143,58,0.35), inset 0 2px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* Title / reveal */}
      <div className="text-center">
        <div
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ color: '#9a7b32' }}
        >
          {isSolved ? 'Picture revealed' : 'Mystery picture'}
        </div>
        <div
          className={['text-lg font-bold transition-all duration-300', justSolved ? 'scale-110' : 'scale-100'].join(' ')}
          style={{ color: '#4a3a14' }}
        >
          {isSolved ? `It's a ${patternName}! 🎉` : '?????'}
        </div>
      </div>

      {/* Mode toggle + progress */}
      {!isReadOnly && (
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMode(1)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all"
              style={
                mode === 1
                  ? { background: 'linear-gradient(180deg,#3a3f4a,#1f2330)', color: '#fff', borderColor: '#1f2330' }
                  : { background: '#fff', color: '#8a8a8a', borderColor: '#d9d0ba' }
              }
            >
              ■ Fill
            </button>
            <button
              onClick={() => setMode(2)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all"
              style={
                mode === 2
                  ? { background: 'linear-gradient(180deg,#f87171,#dc2626)', color: '#fff', borderColor: '#dc2626' }
                  : { background: '#fff', color: '#8a8a8a', borderColor: '#d9d0ba' }
              }
            >
              ✕ Cross
            </button>
          </div>
          <span className="text-xs" style={{ color: '#9a7b32' }}>{filledCount} filled</span>
        </div>
      )}

      {/* Grid + clues */}
      <div className="max-w-full overflow-x-auto">
      <div
        ref={gridRef}
        className="select-none"
        style={{ touchAction: 'none' }}
        onMouseLeave={() => setHover(null)}
        onPointerMove={(e) => { paintAtPoint(e.clientX, e.clientY); }}
      >
        {/* Column clues row */}
        <div style={{ display: 'flex', marginLeft: clueW }}>
          {colClues.map((clue, c) => (
            <div
              key={c}
              style={{
                width: cellPx,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                minHeight: colClueH,
                background: hover?.c === c ? 'rgba(184,143,58,0.14)' : 'transparent',
                borderRadius: 4,
              }}
            >
              {clue.map((n, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: clueFont,
                    lineHeight: `${clueFont + 5}px`,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: colStatus[c] ? '#c2b18a' : '#5a4a24',
                    textDecoration: colStatus[c] ? 'line-through' : 'none',
                    transition: 'color 0.2s',
                  }}
                >
                  {n}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Rows */}
        {grid.map((row, r) => (
          <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Row clue */}
            <div
              style={{
                width: clueW,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 5,
                paddingRight: 8,
                background: hover?.r === r ? 'rgba(184,143,58,0.14)' : 'transparent',
                borderRadius: 4,
              }}
            >
              {(rowClues[r] ?? [0]).map((n, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: clueFont,
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                    color: rowStatus[r] ? '#c2b18a' : '#5a4a24',
                    textDecoration: rowStatus[r] ? 'line-through' : 'none',
                    transition: 'color 0.2s',
                  }}
                >
                  {n}
                </span>
              ))}
            </div>

            {/* Cells */}
            {row.map((cell, c) => {
              const isBorderRight  = (c + 1) % 5 === 0 && c !== size - 1;
              const isBorderBottom = (r + 1) % 5 === 0 && r !== size - 1;
              const isHoverLine = hover?.r === r || hover?.c === c;
              return (
                <div
                  key={c}
                  data-r={r}
                  data-c={c}
                  onPointerDown={(e) => { e.preventDefault(); startPaint(r, c); }}
                  onPointerEnter={() => setHover({ r, c })}
                  style={{
                    width: cellPx,
                    height: cellPx,
                    boxSizing: 'border-box',
                    border: '1px solid #d8cba8',
                    borderRight:  isBorderRight  ? '2px solid #9a7b32' : '1px solid #d8cba8',
                    borderBottom: isBorderBottom ? '2px solid #9a7b32' : '1px solid #d8cba8',
                    background:
                      cell === 1
                        ? 'linear-gradient(160deg, #4b5566 0%, #232833 55%, #12151c 100%)'
                        : cell === 2
                        ? '#fbe4e4'
                        : isHoverLine
                        ? 'rgba(184,143,58,0.10)'
                        : '#fffdf6',
                    boxShadow: cell === 1 ? 'inset 0 1px 1px rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.4)' : 'none',
                    cursor: isReadOnly ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: cellPx <= 20 ? 9 : 11,
                    color: '#dc2626',
                    fontWeight: 'bold',
                    userSelect: 'none',
                    transition: 'background 0.12s',
                  }}
                >
                  {cell === 2 ? '✕' : ''}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      </div>

      {isReadOnly ? null : isSolved ? (
        <div
          className="rounded-xl px-5 py-3 text-center"
          style={{ background: 'linear-gradient(180deg, #fff6d8, #f4d478)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
        >
          <p className="font-semibold" style={{ color: '#5a3d0b' }}>Picture complete! 🏆</p>
          <p className="text-sm mt-0.5" style={{ color: '#7a5a15' }}>Hit Submit to lock in your answer.</p>
        </div>
      ) : (
        <p className="text-xs text-center max-w-xs" style={{ color: '#9a7b32' }}>
          Use the row and column clues to fill in the grid - drag to paint multiple cells.
          Switch to Cross to mark cells you're sure are empty.
        </p>
      )}
    </div>
  );
};

export default NonogramRenderer;