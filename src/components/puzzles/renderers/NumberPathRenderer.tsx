import React, { useState, useCallback, useEffect } from 'react';

interface NumberPathRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

interface Endpoint { id: number; start: [number, number]; end: [number, number]; }
interface NumberPathData { size: number; endpoints: Endpoint[]; }

// Distinct colours per path id (up to 8 paths)
const PATH_COLORS: Record<number, { bg: string; text: string; border: string; light: string }> = {
  1: { bg: 'bg-red-500',    text: 'text-white', border: 'border-red-600',    light: 'bg-red-200'    },
  2: { bg: 'bg-blue-500',   text: 'text-white', border: 'border-blue-600',   light: 'bg-blue-200'   },
  3: { bg: 'bg-green-500',  text: 'text-white', border: 'border-green-600',  light: 'bg-green-200'  },
  4: { bg: 'bg-yellow-400', text: 'text-gray-800', border: 'border-yellow-500', light: 'bg-yellow-200' },
  5: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600', light: 'bg-purple-200' },
  6: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600', light: 'bg-orange-200' },
  7: { bg: 'bg-teal-500',   text: 'text-white', border: 'border-teal-600',   light: 'bg-teal-200'   },
  8: { bg: 'bg-pink-500',   text: 'text-white', border: 'border-pink-600',   light: 'bg-pink-200'   },
};

const NumberPathRenderer: React.FC<NumberPathRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as NumberPathData;
  const size      = data?.size ?? 4;
  const endpoints = Array.isArray(data?.endpoints) ? data.endpoints : [];

  // gridState[r][c] = path id (0 = empty)
  type GridState = number[][];
  const emptyGrid = (): GridState => Array.from({ length: size }, () => new Array(size).fill(0));

  const getInitialGrid = (): GridState => {
    const saved = currentAnswer?.gridState as GridState | undefined;
    if (saved && Array.isArray(saved) && saved.length === size) return saved;
    const g = emptyGrid();
    // Pre-fill endpoints
    for (const ep of endpoints) {
      const sr = ep.start[0]; const sc = ep.start[1];
      const er = ep.end[0];   const ec = ep.end[1];
      if (g[sr]) g[sr][sc] = ep.id;
      if (g[er]) g[er][ec] = ep.id;
    }
    return g;
  };

  const [gridState, setGridState] = useState<GridState>(getInitialGrid);
  const [drawing, setDrawing]     = useState<number | null>(null); // active path id being drawn
  const [currentPath, setCurrentPath] = useState<[number,number][]>([]);

  // Build endpoint lookup
  const endpointSet = new Set<string>();
  const endpointIdMap: Record<string, number> = {};
  for (const ep of endpoints) {
    const sk = `${ep.start[0]},${ep.start[1]}`; const ek = `${ep.end[0]},${ep.end[1]}`;
    endpointSet.add(sk); endpointSet.add(ek);
    endpointIdMap[sk] = ep.id; endpointIdMap[ek] = ep.id;
  }

  useEffect(() => {
    // Build paths from gridState for submission
    const pathMap: Record<number, [number,number][]> = {};
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const id = gridState[r]?.[c] ?? 0;
        if (id > 0) {
          if (!pathMap[id]) pathMap[id] = [];
          pathMap[id].push([r, c]);
        }
      }
    }
    const paths = Object.entries(pathMap).map(([id, cells]) => ({ id: Number(id), cells }));
    onAnswerChange({ paths, gridState });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridState]);

  const isEndpoint = (r: number, c: number) => endpointSet.has(`${r},${c}`);
  const getEndpointId = (r: number, c: number) => endpointIdMap[`${r},${c}`] ?? 0;

  const handleCellDown = useCallback((r: number, c: number) => {
    if (isReadOnly) return;
    const id = getEndpointId(r, c) || (gridState[r]?.[c] ?? 0);
    if (id > 0) {
      setDrawing(id);
      setCurrentPath([[r, c]]);
    }
  }, [isReadOnly, gridState, endpointIdMap]);

  const handleCellEnter = useCallback((r: number, c: number) => {
    if (!drawing || isReadOnly) return;
    setCurrentPath(prev => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      const dr = Math.abs(r - last[0]);
      const dc = Math.abs(c - last[1]);
      if (dr + dc !== 1) return prev; // must be adjacent
      // Don't overwrite a different path's endpoint
      const cellId = getEndpointId(r, c);
      if (cellId > 0 && cellId !== drawing) return prev;
      return [...prev, [r, c]];
    });
  }, [drawing, isReadOnly]);

  const handleCellUp = useCallback(() => {
    if (!drawing) return;
    setGridState(prev => {
      const next = prev.map(row => [...row]);
      // Clear old cells for this path that aren't endpoints
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const row = next[r];
          if (row && row[c] === drawing && !isEndpoint(r, c)) {
            row[c] = 0;
          }
        }
      }
      // Paint new path
      for (const [r, c] of currentPath) {
        if (next[r]) next[r][c] = drawing;
      }
      return next;
    });
    setDrawing(null);
    setCurrentPath([]);
  }, [drawing, currentPath, size]);

  const coveredCount = gridState.flat().filter(v => v > 0).length;
  const allCovered   = coveredCount === size * size;

  const cellSize = size <= 4 ? 'w-14 h-14 text-base' : size <= 6 ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';

  return (
    <div
      className="flex flex-col items-center gap-4"
      onMouseUp={handleCellUp}
      onTouchEnd={handleCellUp}
    >
      {allCovered && !isReadOnly && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-emerald-700 text-sm font-semibold">
          All cells covered! Hit Submit to check.
        </div>
      )}

      <div
        className="border-2 border-gray-400 inline-block select-none"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {Array.from({ length: size }, (_, r) =>
          Array.from({ length: size }, (_, c) => {
            const id       = gridState[r]?.[c] ?? 0;
            const inDraw   = drawing !== null && currentPath.some(([pr, pc]) => pr === r && pc === c);
            const drawId   = inDraw ? drawing : 0;
            const effectId = drawId || id;
            const colors   = effectId > 0 ? PATH_COLORS[effectId] : null;
            const ep       = isEndpoint(r, c);

            return (
              <div
                key={`${r}-${c}`}
                onMouseDown={() => handleCellDown(r, c)}
                onMouseEnter={() => handleCellEnter(r, c)}
                onTouchStart={() => handleCellDown(r, c)}
                className={[
                  cellSize,
                  'flex items-center justify-center border border-gray-200 cursor-crosshair font-bold transition-colors',
                  colors
                    ? ep ? `${colors.bg} ${colors.text} ${colors.border}` : colors.light
                    : 'bg-white',
                ].join(' ')}
              >
                {ep ? getEndpointId(r, c) : ''}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-gray-400 text-center max-w-xs">
        Click and drag from a numbered cell to draw its path. Cover every cell without crossing paths.
      </p>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 justify-center">
        {endpoints.map(ep => {
          const colors = PATH_COLORS[ep.id];
          return (
            <div key={ep.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${colors?.bg} ${colors?.text}`}>
              {ep.id}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NumberPathRenderer;