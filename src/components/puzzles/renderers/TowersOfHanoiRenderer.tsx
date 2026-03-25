import React, { useState, useCallback, useEffect } from 'react';

interface TowersOfHanoiRendererProps {
  puzzleData:     Record<string, unknown>;
  currentAnswer:  Record<string, unknown>;
  onAnswerChange: (answer: Record<string, unknown>) => void;
  isReadOnly:     boolean;
}

interface HanoiData {
  diskCount:   number;
  minMoves:    number;
  initialPegs: number[][];
}

type Pegs = number[][];

const PEG_LABELS = ['A', 'B', 'C'];

// Disk colours from largest to smallest
const DISK_COLORS = [
  'bg-red-400 border-red-500',
  'bg-orange-400 border-orange-500',
  'bg-yellow-400 border-yellow-500',
  'bg-green-400 border-green-500',
  'bg-blue-400 border-blue-500',
];

const TowersOfHanoiRenderer: React.FC<TowersOfHanoiRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as HanoiData;

  const getInitialPegs = (): Pegs => {
    const saved = currentAnswer?.pegs as Pegs | undefined;
    if (saved && Array.isArray(saved) && saved.length === 3) return saved.map(p => [...p]);
    return data.initialPegs.map(p => [...p]);
  };

  const getInitialMoves = (): Array<{from:number;to:number}> => {
    const saved = currentAnswer?.moves as Array<{from:number;to:number}> | undefined;
    return saved ?? [];
  };

  const [pegs, setPegs]     = useState<Pegs>(getInitialPegs);
  const [moves, setMoves]   = useState(getInitialMoves);
  const [selected, setSelected] = useState<number | null>(null); // selected peg index

  const isSolved = (pegs[2]?.length ?? 0) === data.diskCount;

  useEffect(() => {
    onAnswerChange({ pegs, moves, solved: isSolved });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegs, moves]);

  const handlePegClick = useCallback((pegIdx: number) => {
    if (isReadOnly) return;

    if (selected === null) {
      // Select this peg if it has disks
      if ((pegs[pegIdx]?.length ?? 0) > 0) setSelected(pegIdx);
      return;
    }

    if (selected === pegIdx) {
      setSelected(null);
      return;
    }

    // Try to move top disk from selected → pegIdx
    const fromPeg = pegs[selected];
    const toPeg   = pegs[pegIdx];
    if (!fromPeg || !toPeg) { setSelected(null); return; }

    const disk = fromPeg[fromPeg.length - 1];
    if (disk === undefined) { setSelected(null); return; }

    const topOfTo = toPeg[toPeg.length - 1];
    if (topOfTo !== undefined && topOfTo < disk) {
      // Invalid move — shake selection off
      setSelected(null);
      return;
    }

    // Valid move
    setPegs(prev => {
      const next    = prev.map(p => [...p]);
      const srcPeg  = next[selected];
      const dstPeg  = next[pegIdx];
      if (!srcPeg || !dstPeg) return prev;
      const d = srcPeg.pop();
      if (d !== undefined) dstPeg.push(d);
      return next;
    });
    setMoves(prev => [...prev, { from: selected, to: pegIdx }]);
    setSelected(null);
  }, [selected, pegs, isReadOnly]);

  const maxDiskWidth = 80; // px for largest disk
  const minDiskWidth = 24;
  const diskWidth = (size: number) => {
    const frac = (size - 1) / (data.diskCount - 1 || 1);
    return Math.round(minDiskWidth + frac * (maxDiskWidth - minDiskWidth));
  };

  return (
    <div className="flex flex-col items-center gap-5">

      {/* Move counter */}
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <span>Moves: <strong className="text-gray-700">{moves.length}</strong></span>
        <span>·</span>
        <span>Minimum: <strong className="text-gray-700">{data.minMoves}</strong></span>
        {isSolved && <span className="text-emerald-600 font-semibold ml-2">✓ Solved!</span>}
      </div>

      {/* Pegs */}
      <div className="flex items-end justify-center gap-6">
        {pegs.map((pegDisks, pegIdx) => {
          const isSelected = selected === pegIdx;
          const canReceive = selected !== null && selected !== pegIdx &&
            (pegDisks.length === 0 || (pegDisks[pegDisks.length - 1] ?? 0) > (pegs[selected]?.[pegs[selected]?.length - 1] ?? 0));

          return (
            <div
              key={pegIdx}
              onClick={() => handlePegClick(pegIdx)}
              className={[
                'flex flex-col items-center cursor-pointer transition-all',
                isSelected  ? 'opacity-100' : '',
                canReceive  ? 'opacity-100' : '',
                !isReadOnly ? 'hover:opacity-80' : 'cursor-default',
              ].join(' ')}
              style={{ width: maxDiskWidth + 24 }}
            >
              {/* Disk stack (render from bottom) */}
              <div className="flex flex-col-reverse items-center" style={{ minHeight: data.diskCount * 24 + 8 }}>
                {pegDisks.map((diskSize, di) => {
                  const w      = diskWidth(diskSize);
                  const color  = DISK_COLORS[(diskSize - 1) % DISK_COLORS.length] ?? DISK_COLORS[0];
                  const isTop  = di === pegDisks.length - 1;
                  return (
                    <div
                      key={di}
                      className={[
                        'h-5 rounded border-2 flex items-center justify-center text-xs font-bold text-white transition-all',
                        color,
                        isTop && isSelected ? 'ring-2 ring-offset-1 ring-indigo-400' : '',
                      ].join(' ')}
                      style={{ width: w }}
                    >
                      {diskSize}
                    </div>
                  );
                })}
              </div>

              {/* Peg pole */}
              <div className={[
                'w-2 rounded-t transition-colors',
                isSelected  ? 'bg-indigo-400' :
                canReceive  ? 'bg-emerald-400' :
                              'bg-gray-400',
              ].join(' ')} style={{ height: data.diskCount * 24 + 16 }} />

              {/* Base + label */}
              <div className={[
                'w-full h-3 rounded transition-colors',
                isSelected ? 'bg-indigo-300' : canReceive ? 'bg-emerald-300' : 'bg-gray-300',
              ].join(' ')} />
              <span className={[
                'mt-1 font-bold text-sm',
                isSelected ? 'text-indigo-600' : canReceive ? 'text-emerald-600' : 'text-gray-500',
              ].join(' ')}>
                {PEG_LABELS[pegIdx]}
              </span>
            </div>
          );
        })}
      </div>

      {isSolved && !isReadOnly ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-3 text-center">
          <p className="text-emerald-700 font-semibold">Puzzle complete!</p>
          <p className="text-emerald-600 text-sm mt-0.5">
            {moves.length === data.minMoves ? '⭐ Optimal solution!' : `Solved in ${moves.length} moves (optimal: ${data.minMoves}).`} Hit Submit.
          </p>
        </div>
      ) : !isReadOnly ? (
        <p className="text-xs text-gray-400 text-center max-w-xs">
          Click a peg to pick up its top disk, then click another peg to place it.
          Move all disks from peg A to peg C.
        </p>
      ) : null}
    </div>
  );
};

export default TowersOfHanoiRenderer;