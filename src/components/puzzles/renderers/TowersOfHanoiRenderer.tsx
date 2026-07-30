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

// Disk gradients (top-highlight -> mid -> shadow), largest disk last matches size 1..n by index
const DISK_GRADIENTS = [
  { top: '#FF8A8A', mid: '#E63946', edge: '#A11E29' }, // red
  { top: '#FFC08A', mid: '#F4762E', edge: '#B4490F' }, // orange
  { top: '#FFE58A', mid: '#F4B93C', edge: '#B87F0B' }, // gold
  { top: '#9CF0B0', mid: '#2ECC71', edge: '#178A48' }, // green
  { top: '#9AB8FF', mid: '#4361EE', edge: '#2439A8' }, // blue
  { top: '#D6B0FF', mid: '#9B5DE5', edge: '#6A2FAE' }, // purple
];

// Non-undefined fallback so indexed lookups always satisfy strict null checks
const DEFAULT_GRADIENT: (typeof DISK_GRADIENTS)[number] = DISK_GRADIENTS[0]!;

const TowersOfHanoiRenderer: React.FC<TowersOfHanoiRendererProps> = ({
  puzzleData, currentAnswer, onAnswerChange, isReadOnly,
}) => {
  const data = puzzleData as unknown as HanoiData;

  const getInitialPegs = (): Pegs => {
    const saved = currentAnswer?.pegs as Pegs | undefined;
    if (saved && Array.isArray(saved) && saved.length === 3) return saved.map(p => [...p]);
    return data.initialPegs.map(p => [...p]);
  };

  const getInitialMoves = (): Array<{ from: number; to: number }> => {
    const saved = currentAnswer?.moves as Array<{ from: number; to: number }> | undefined;
    return saved ?? [];
  };

  const [pegs, setPegs] = useState<Pegs>(getInitialPegs);
  const [moves, setMoves] = useState(getInitialMoves);
  const [selected, setSelected] = useState<number | null>(null);
  const [invalidShake, setInvalidShake] = useState<number | null>(null);
  const [justSolved, setJustSolved] = useState(false);

  const isSolved = (pegs[2]?.length ?? 0) === data.diskCount;

  useEffect(() => {
    onAnswerChange({ pegs, moves, solved: isSolved });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pegs, moves]);

  useEffect(() => {
    if (isSolved) {
      setJustSolved(true);
      const t = setTimeout(() => setJustSolved(false), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isSolved]);

  const handlePegClick = useCallback((pegIdx: number) => {
    if (isReadOnly) return;

    if (selected === null) {
      if ((pegs[pegIdx]?.length ?? 0) > 0) setSelected(pegIdx);
      return;
    }

    if (selected === pegIdx) {
      setSelected(null);
      return;
    }

    const fromPeg = pegs[selected];
    const toPeg = pegs[pegIdx];
    if (!fromPeg || !toPeg) { setSelected(null); return; }

    const disk = fromPeg[fromPeg.length - 1];
    if (disk === undefined) { setSelected(null); return; }

    const topOfTo = toPeg[toPeg.length - 1];
    if (topOfTo !== undefined && topOfTo < disk) {
      setInvalidShake(pegIdx);
      setTimeout(() => setInvalidShake(null), 350);
      setSelected(null);
      return;
    }

    setPegs(prev => {
      const next = prev.map(p => [...p]);
      const srcPeg = next[selected];
      const dstPeg = next[pegIdx];
      if (!srcPeg || !dstPeg) return prev;
      const d = srcPeg.pop();
      if (d !== undefined) dstPeg.push(d);
      return next;
    });
    setMoves(prev => [...prev, { from: selected, to: pegIdx }]);
    setSelected(null);
  }, [selected, pegs, isReadOnly]);

  // ---- geometry ----
  // Scaled down from the original 92/34/46 - those values, combined with
  // the wood base intentionally being wider than its own peg column (a
  // visual "stand" effect) and generous gaps between pegs, added up to
  // roughly 494px minimum width for three pegs. That's wider than the
  // available space on most phones once the page's own padding layers are
  // subtracted, which is what was pushing the board past the edges of its
  // rounded container instead of staying contained inside it.
  const maxDiskWidth = 72;
  const minDiskWidth = 26;
  const diskHeight = 20;
  const diskGap = 3;
  const poleWidth = 10;
  const columnHeight = data.diskCount * (diskHeight + diskGap) + 30;

  const diskWidth = (size: number) => {
    const frac = (size - 1) / (data.diskCount - 1 || 1);
    return Math.round(minDiskWidth + frac * (maxDiskWidth - minDiskWidth));
  };

  const diskStyle = (size: number): React.CSSProperties => {
    const idx = ((size - 1) % DISK_GRADIENTS.length + DISK_GRADIENTS.length) % DISK_GRADIENTS.length;
    const g = DISK_GRADIENTS[idx] ?? DEFAULT_GRADIENT;
    return {
      background: `linear-gradient(180deg, ${g.top} 0%, ${g.mid} 45%, ${g.edge} 100%)`,
      boxShadow: `0 3px 0 ${g.edge}, 0 6px 10px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.5)`,
      border: `1px solid ${g.edge}`,
    };
  };

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-2xl p-3 sm:gap-6 sm:p-6"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #16514f 0%, #0c3634 60%, #072221 100%)',
        boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.25)',
      }}
    >
      {/* Move counter */}
      <div className="flex items-center gap-3 text-sm" style={{ color: '#bfe3d8' }}>
        <span>
          Moves: <strong style={{ color: '#fff' }}>{moves.length}</strong>
        </span>
        <span style={{ color: '#4d8078' }}>·</span>
        <span>
          Minimum: <strong style={{ color: '#fff' }}>{data.minMoves}</strong>
        </span>
        {isSolved && (
          <span
            className={['font-semibold ml-2 px-2 py-0.5 rounded-full', justSolved ? 'animate-[pulse_0.45s_ease]' : ''].join(' ')}
            style={{ color: '#0c3634', background: 'linear-gradient(180deg,#ffe58a,#f4b93c)' }}
          >
            ✓ Solved!
          </span>
        )}
      </div>

      {/* Pegs - overflow-x-auto is a safety net: if the three pegs still
          don't fit on a very narrow phone even after the size/gap
          reductions above, this makes it scroll neatly contained within
          the dark board (which keeps its rounded corners and border)
          instead of visually spilling out past them. */}
      <div className="w-full overflow-x-auto">
      <div className="flex items-end justify-center gap-4 sm:gap-10 min-w-fit mx-auto px-1">
        {pegs.map((pegDisks, pegIdx) => {
          const isSelected = selected === pegIdx;
          const topOfThis = pegDisks[pegDisks.length - 1];
          const topOfSelected = selected !== null ? pegs[selected]?.[pegs[selected].length - 1] : undefined;
          const canReceive =
            selected !== null &&
            selected !== pegIdx &&
            (topOfThis === undefined || (topOfThis ?? 0) > (topOfSelected ?? 0));
          const isShaking = invalidShake === pegIdx;

          return (
            <div key={pegIdx} className="flex flex-col items-center">
              {/* Column: pole (behind) + disks (in front), disks anchored to bottom of pole */}
              <div
                onClick={() => handlePegClick(pegIdx)}
                className={[
                  'relative flex justify-center transition-transform',
                  !isReadOnly ? 'cursor-pointer' : 'cursor-default',
                  isShaking ? 'animate-[shake_0.35s_ease]' : '',
                ].join(' ')}
                style={{ width: maxDiskWidth + 28, height: columnHeight }}
              >
                {/* Pole */}
                <div
                  className="absolute bottom-0 rounded-t-sm"
                  style={{
                    width: poleWidth,
                    height: columnHeight - 6,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isSelected
                      ? 'linear-gradient(90deg, #b7c3ff 0%, #6b7fe0 40%, #3d4fb0 100%)'
                      : canReceive
                      ? 'linear-gradient(90deg, #c9f5d9 0%, #6fdb96 40%, #2fae63 100%)'
                      : 'linear-gradient(90deg, #f2f3f5 0%, #c7cbd1 40%, #8b8f96 100%)',
                    boxShadow: '2px 0 3px rgba(0,0,0,0.35)',
                  }}
                />
                {/* Peg cap */}
                <div
                  className="absolute rounded-full"
                  style={{
                    width: poleWidth + 8,
                    height: poleWidth + 8,
                    left: '50%',
                    top: 2,
                    transform: 'translateX(-50%)',
                    background: 'radial-gradient(circle at 35% 30%, #fff6d8, #d4af37 60%, #8a6d1a 100%)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
                  }}
                />

                {/* Disks stacked bottom-up, absolutely centered over the pole */}
                {pegDisks.map((diskSize, di) => {
                  const w = diskWidth(diskSize);
                  const isTop = di === pegDisks.length - 1;
                  const bottomOffset = 6 + di * (diskHeight + diskGap);
                  const lifted = isTop && isSelected;
                  return (
                    <div
                      key={di}
                      className="absolute rounded-lg flex items-center justify-center text-[11px] font-bold transition-all duration-200"
                      style={{
                        ...diskStyle(diskSize),
                        width: w,
                        height: diskHeight,
                        left: '50%',
                        bottom: lifted ? bottomOffset + 22 : bottomOffset,
                        transform: 'translateX(-50%)',
                        color: 'rgba(255,255,255,0.95)',
                        textShadow: '0 1px 1px rgba(0,0,0,0.35)',
                        zIndex: 10 + di,
                      }}
                    >
                      {diskSize}
                    </div>
                  );
                })}
              </div>

              {/* Wood base */}
              <div
                className="rounded-md mt-0.5"
                style={{
                  width: maxDiskWidth + 30,
                  height: 14,
                  background: isSelected
                    ? 'linear-gradient(180deg,#9fb3ff,#5f74d6)'
                    : canReceive
                    ? 'linear-gradient(180deg,#9fe8b9,#3fbd73)'
                    : 'linear-gradient(180deg,#b9793f,#7a4a20)',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.25)',
                  border: '1px solid rgba(0,0,0,0.25)',
                }}
              />
              <span
                className="mt-2 font-bold text-sm tracking-wide"
                style={{ color: isSelected ? '#a9b8ff' : canReceive ? '#8bf0b0' : '#cfe7de' }}
              >
                {PEG_LABELS[pegIdx]}
              </span>
            </div>
          );
        })}
      </div>
      </div>

      {isSolved && !isReadOnly ? (
        <div
          className="rounded-xl px-5 py-3 text-center"
          style={{
            background: 'linear-gradient(180deg, #fff6d8, #f4d478)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          <p className="font-semibold" style={{ color: '#5a3d0b' }}>Puzzle complete! 🏆</p>
          <p className="text-sm mt-0.5" style={{ color: '#7a5a15' }}>
            {moves.length === data.minMoves
              ? '⭐ Optimal solution!'
              : `Solved in ${moves.length} moves (optimal: ${data.minMoves}).`}{' '}
            Hit Submit.
          </p>
        </div>
      ) : !isReadOnly ? (
        <p className="text-xs text-center max-w-xs" style={{ color: '#7fa89c' }}>
          Click a peg to pick up its top disk, then click another peg to place it.
          Move all disks from peg A to peg C.
        </p>
      ) : null}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default TowersOfHanoiRenderer;