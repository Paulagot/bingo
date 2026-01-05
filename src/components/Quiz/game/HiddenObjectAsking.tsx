// src/components/Quiz/game/HiddenObjectAsking.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

type Item = {
  id: string;
  label: string;
  bbox: { x: number; y: number; w: number; h: number };
};

export type HiddenObjectPuzzle = {
  puzzleId: string;
  imageUrl: string;
  difficulty: string;
  category: string;
  totalSeconds: number;
  itemTarget: number;
  items: Item[];
  puzzleNumber?: number;    // ✅ NEW
  totalPuzzles?: number;    // ✅ NEW
};

type Props = {
  puzzle: HiddenObjectPuzzle;
  foundIds: string[];
  finished: boolean;
  onTap: (itemId: string, x: number, y: number) => void;
};

const HiddenObjectAsking: React.FC<Props> = ({
  puzzle,
  foundIds,
  finished,
  onTap
}) => {
  const { socket } = useQuizSocket();
  const imgRef = useRef<HTMLImageElement | null>(null);

  // ===== Timer state (similar to SpeedAsking) =====
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [fractionLeft, setFractionLeft] = useState<number>(1);
  const [countdown, setCountdown] = useState<{ message: string; color: string; secondsLeft: number } | null>(null);

  // Authoritative refs for smooth interpolation
  const endsAtRef = useRef<number | null>(null);
  const totalMsRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when puzzle changes
  useEffect(() => {
    endsAtRef.current = null;
    totalMsRef.current = null;
    setSecondsLeft(null);
    setFractionLeft(1);
    setCountdown(null);
  }, [puzzle.puzzleId]);

  // Listen to server's countdown
  useEffect(() => {
    if (!socket) return;

    const onRemain = ({ remaining }: { remaining: number }) => {
      const now = Date.now();
      const endsAt = now + Math.max(0, remaining) * 1000;

      endsAtRef.current = endsAt;

      if (totalMsRef.current == null || remaining * 1000 > totalMsRef.current) {
        totalMsRef.current = remaining * 1000;
      }

      const msLeft = Math.max(0, endsAt - now);
      setSecondsLeft(Math.ceil(msLeft / 1000));
      if (totalMsRef.current) {
        setFractionLeft(Math.min(1, Math.max(0, msLeft / totalMsRef.current)));
      }
    };

    // Listen for countdown effects (3-2-1)
    const onCountdown = (effect: { message: string; color: string; secondsLeft: number }) => {
      setCountdown(effect);
      // Clear countdown after animation
      setTimeout(() => setCountdown(null), 600);
    };

    socket.on('round_time_remaining', onRemain);
    socket.on('countdown_effect', onCountdown);
    
    return () => {
      socket.off('round_time_remaining', onRemain);
      socket.off('countdown_effect', onCountdown);
    };
  }, [socket]);

  // Smoothly tick between server events
  useEffect(() => {
    if (finished) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const endsAt = endsAtRef.current;
      const total = totalMsRef.current ?? 0;
      if (!endsAt || total <= 0) return;

      const now = Date.now();
      const msLeft = Math.max(0, endsAt - now);
      const secs = Math.ceil(msLeft / 1000);
      const frac = Math.min(1, Math.max(0, msLeft / total));

      setSecondsLeft(prev => (prev !== secs ? secs : prev));
      setFractionLeft(frac);

      if (msLeft <= 0 && tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    }, 100);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [finished]);

  // Helper functions for styling
  const getTimerClass = () => {
    if (secondsLeft === null) return 'timer-progress';
    if (secondsLeft <= 3) return 'timer-progress danger';
    if (secondsLeft <= 10) return 'timer-progress warning';
    return 'timer-progress';
  };

  const getCountdownClass = () => {
    if (!countdown) return '';
    if (countdown.secondsLeft === 3) return 'countdown-3';
    if (countdown.secondsLeft === 2) return 'countdown-2';
    if (countdown.secondsLeft === 1) return 'countdown-1';
    return 'countdown-3';
  };

  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);

  const remainingItems = useMemo(
    () => puzzle.items.filter((it) => !foundSet.has(it.id)),
    [puzzle.items, foundSet]
  );

  const handleClick = (e: React.MouseEvent) => {
    if (finished) return;
    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const hit = remainingItems.find((it) => {
      const b = it.bbox;
      return x >= b.x && y >= b.y && x <= b.x + b.w && y <= b.y + b.h;
    });

    if (hit) {
      onTap(hit.id, x, y);
    }
  };

  return (
    <>
      <style>{`
        /* Circular Timer Styles (from SpeedAsking) */
        .circular-timer {
          position: relative;
          width: 60px;
          height: 60px;
        }
        @media (max-width: 480px) {
          .circular-timer {
            width: 50px;
            height: 50px;
          }
        }
        .timer-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .timer-ring circle {
          fill: none;
          stroke-width: 4;
        }
        .timer-bg {
          stroke: #e2e8f0;
        }
        .timer-progress {
          stroke: #10b981;
          stroke-linecap: round;
          stroke-dasharray: 157;
          transition: stroke-dashoffset 0.1s linear, stroke 0.2s ease;
        }
        .timer-progress.warning {
          stroke: #f59e0b;
        }
        .timer-progress.danger {
          stroke: #ef4444;
          animation: timerPulse 0.5s infinite;
        }
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .timer-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 700;
          font-size: 16px;
          color: #1e293b;
        }
        @media (max-width: 480px) {
          .timer-text {
            font-size: 14px;
          }
        }

        /* Countdown Overlay (3-2-1) */
        .countdown-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 5.5rem;
          font-weight: 800;
          z-index: 1000;
          pointer-events: none;
          opacity: 0.6;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          animation: gentleBounce 0.6s ease-in-out;
        }
        @media (max-width: 640px) {
          .countdown-overlay {
            font-size: 3.5rem;
          }
        }
        @keyframes gentleBounce {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0.3;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.7;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.6;
          }
        }
        .countdown-3 {
          color: rgba(16, 185, 129, 0.7);
        }
        .countdown-2 {
          color: rgba(245, 158, 11, 0.7);
        }
        .countdown-1 {
          color: rgba(239, 68, 68, 0.7);
        }
      `}</style>

      <div className="space-y-3">
        {/* Countdown overlay (3-2-1) */}
        {countdown && (
          <div className={`countdown-overlay ${getCountdownClass()}`}>
            {countdown.message}
          </div>
        )}

        {/* Header with timer and progress */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            🔎 Find It Fast
            {puzzle.puzzleNumber && puzzle.totalPuzzles && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
              </span>
            )}
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
              {puzzle.difficulty.toUpperCase()}
            </span>
          </div>
          
          {/* Circular Timer */}
          <div className="circular-timer">
            <svg className="timer-ring" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="25" className="timer-bg" />
              <circle
                cx="25"
                cy="25"
                r="25"
                className={getTimerClass()}
                style={{ strokeDashoffset: 157 - fractionLeft * 157 }}
              />
            </svg>
            <div className="timer-text">{secondsLeft ?? '0'}</div>
          </div>
        </div>

        {/* Items checklist */}
        <div className="rounded-xl border bg-white p-3">
          <div className="text-xs text-gray-600 mb-2">Items to find</div>
          <div className="flex flex-wrap gap-2">
            {puzzle.items.map((it) => {
              const isFound = foundSet.has(it.id);
              return (
                <span
                  key={it.id}
                  className={[
                    'text-xs px-2 py-1 rounded-full border',
                    isFound
                      ? 'bg-green-50 border-green-200 text-green-700 line-through'
                      : 'bg-gray-50 border-gray-200',
                  ].join(' ')}
                >
                  {it.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Clickable puzzle image */}
        <div className="rounded-xl overflow-hidden border bg-white">
          <div className="relative">
            <img
              ref={imgRef}
              src={puzzle.imageUrl}
              alt="Hidden object puzzle"
              className="w-full h-auto select-none cursor-crosshair"
              onClick={handleClick}
              draggable={false}
            />

            {/* Progress overlay */}
            <div className="absolute top-3 left-3 bg-white/90 rounded-lg px-3 py-2 text-xs shadow-lg">
              Found:{' '}
              <span className="font-semibold text-green-600">{foundIds.length}</span> /{' '}
              {puzzle.itemTarget}
              {finished && (
                <span className="ml-2 font-semibold text-green-600">✅ Complete!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HiddenObjectAsking;
