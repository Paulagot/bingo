import { useEffect, useRef, useState, useCallback } from 'react';
import type { FlashGridConfig, FlashGridSubmission } from '../types/elimination';

interface Props {
  config: FlashGridConfig;
  roundId: string;
  playerId: string;
  onSubmit: (s: FlashGridSubmission) => void;
  hasSubmitted: boolean;
}

const PALETTE = ['#00e5ff','#ff3b5c','#ffe600','#00ff94','#bf5af2','#ff9f0a'];
const col = (id: string) => { let h=0; for(let i=0;i<id.length;i++) h=(h*31+id.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]!; };

export const FlashGridRound: React.FC<Props> = ({ config, roundId, playerId, onSubmit, hasSubmitted }) => {
  const colour = col(roundId);
  const { gridSize, flashCells, flashDurationMs } = config;
  const [phase, setPhase] = useState<'flashing' | 'hidden' | 'done'>('flashing');
  const [taps, setTaps] = useState<{ row: number; col: number }[]>([]);
  const submitted = useRef(false);

  useEffect(() => {
    submitted.current = false;
    setTaps([]);
    setPhase('flashing');
    const t = setTimeout(() => setPhase('hidden'), flashDurationMs);
    return () => clearTimeout(t);
  }, [roundId, flashDurationMs]);

  const handleCellTap = useCallback((row: number, c: number) => {
    if (hasSubmitted || phase === 'flashing') return;
    setTaps(prev => {
      // Toggle cell
      const exists = prev.some(t => t.row === row && t.col === c);
      const next = exists
        ? prev.filter(t => !(t.row === row && t.col === c))
        : [...prev, { row, col: c }];

      // Auto-submit when correct number tapped
      if (next.length === flashCells.length && !submitted.current) {
        submitted.current = true;
        const normTaps = next.map(t => ({
          x: (t.col + 0.5) / gridSize,
          y: (t.row + 0.5) / gridSize,
        }));
        onSubmit({ roundId, playerId, roundType: 'flash_grid', submittedAt: Date.now(), taps: normTaps });
      }
      return next;
    });
  }, [hasSubmitted, phase, flashCells.length, gridSize, roundId, playerId, onSubmit]);

  const handleLock = useCallback(() => {
    if (submitted.current || hasSubmitted) return;
    submitted.current = true;
    const normTaps = taps.map(t => ({
      x: (t.col + 0.5) / gridSize,
      y: (t.row + 0.5) / gridSize,
    }));
    onSubmit({ roundId, playerId, roundType: 'flash_grid', submittedAt: Date.now(), taps: normTaps });
  }, [hasSubmitted, taps, gridSize, roundId, playerId, onSubmit]);

  const flashSet = new Set(flashCells.map(c => `${c.row},${c.col}`));
  const tapSet = new Set(taps.map(t => `${t.row},${t.col}`));

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {phase === 'flashing' && (
        <p style={{ color: colour, fontFamily: 'Inter, system-ui', fontSize: '14px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Remember!
        </p>
      )}
      {phase === 'hidden' && !hasSubmitted && (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, system-ui', fontSize: '13px' }}>
          Tap the cells that lit up ({flashCells.length} cells)
        </p>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
        gap: '6px',
        width: '100%',
        maxWidth: '320px',
      }}>
        {Array.from({ length: gridSize * gridSize }, (_, i) => {
          const row = Math.floor(i / gridSize);
          const c = i % gridSize;
          const key = `${row},${c}`;
          const isFlashing = flashSet.has(key) && phase === 'flashing';
          const isTapped = tapSet.has(key);

          return (
            <div
              key={key}
              onPointerDown={() => handleCellTap(row, c)}
              style={{
                aspectRatio: '1/1',
                borderRadius: '8px',
                border: `1px solid ${isTapped ? colour : 'rgba(255,255,255,0.1)'}`,
                background: isFlashing
                  ? `${colour}44`
                  : isTapped
                    ? `${colour}28`
                    : 'rgba(255,255,255,0.03)',
                cursor: hasSubmitted || phase === 'flashing' ? 'default' : 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
                boxShadow: isFlashing ? `0 0 12px ${colour}66` : 'none',
              }}
            />
          );
        })}
      </div>

      {phase === 'hidden' && !hasSubmitted && (
        <button onPointerDown={handleLock} style={{
          padding: '12px 32px', borderRadius: '8px', cursor: 'pointer',
          background: `${colour}18`, border: `1px solid ${colour}66`,
          color: colour, fontFamily: 'Inter, system-ui', fontSize: '13px',
          fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Submit ({taps.length}/{flashCells.length})
        </button>
      )}
      {hasSubmitted && (
        <p style={{ color: `${colour}88`, fontFamily: 'Inter, system-ui', fontSize: '13px' }}>Answer locked</p>
      )}
    </div>
  );
};