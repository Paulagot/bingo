// src/components/Quiz/game/HiddenObjectAsking.tsx
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

type ItemDifficulty = 'easy' | 'medium' | 'hard';

type Item = {
  id: string;
  label: string;
  difficulty?: ItemDifficulty;
  bbox: { x: number; y: number; w: number; h: number };
};

export type HiddenObjectPuzzle = {
  puzzleId: string;
  imageUrl: string;
  difficulty?: string; // kept for backwards compatibility, but not displayed
  category?: string;
  totalSeconds: number;
  itemTarget: number;
  items: Item[];
  puzzleNumber?: number;
  totalPuzzles?: number;
};

type Props = {
  puzzle: HiddenObjectPuzzle;
  foundIds: string[];
  finished: boolean;
  onTap: (itemId: string, x: number, y: number) => void;
};

const getDifficultyClass = (difficulty?: string) => {
  switch (difficulty) {
    case 'medium':
      return 'bg-amber-50 border-amber-300 text-amber-800';
    case 'hard':
      return 'bg-rose-50 border-rose-300 text-rose-800';
    case 'easy':
    default:
      return 'bg-emerald-50 border-emerald-300 text-emerald-800';
  }
};

const getFoundClass = () => {
  return 'bg-green-600 border-green-700 text-white line-through';
};

const HiddenObjectAsking: React.FC<Props> = ({
  puzzle,
  foundIds,
  finished,
  onTap,
}) => {
  const { socket } = useQuizSocket();
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [fractionLeft, setFractionLeft] = useState<number>(1);
  const [countdown, setCountdown] = useState<{
    message: string;
    color: string;
    secondsLeft: number;
  } | null>(null);

  const endsAtRef = useRef<number | null>(null);
  const totalMsRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    endsAtRef.current = null;
    totalMsRef.current = null;
    setSecondsLeft(null);
    setFractionLeft(1);
    setCountdown(null);
  }, [puzzle.puzzleId]);

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

    const onCountdown = (effect: {
      message: string;
      color: string;
      secondsLeft: number;
    }) => {
      setCountdown(effect);
      setTimeout(() => setCountdown(null), 600);
    };

    socket.on('round_time_remaining', onRemain);
    socket.on('countdown_effect', onCountdown);

    return () => {
      socket.off('round_time_remaining', onRemain);
      socket.off('countdown_effect', onCountdown);
    };
  }, [socket]);

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

      setSecondsLeft((prev) => (prev !== secs ? secs : prev));
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

  const foundSet = useMemo(() => new Set(foundIds), [foundIds]);

  const remainingItems = useMemo(
    () => puzzle.items.filter((it) => !foundSet.has(it.id)),
    [puzzle.items, foundSet]
  );

  const progressText = `${foundIds.length}/${puzzle.itemTarget || puzzle.items.length}`;

  const handleClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (finished) return;

    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();

    /**
     * Important:
     * These x/y values are normalized against the rendered IMAGE itself.
     * This keeps bbox clicks correct even when object-contain resizes the image.
     */
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

  return (
    <>
      <style>{`
        .ho-shell {
          height: 100dvh;
          max-height: 100dvh;
          overflow: hidden;
        }

        .circular-timer {
          position: relative;
          width: 54px;
          height: 54px;
          flex: 0 0 auto;
        }

        @media (max-width: 480px) {
          .circular-timer {
            width: 44px;
            height: 44px;
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
          50% { opacity: .7; }
        }

        .timer-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 800;
          font-size: 15px;
          color: #1e293b;
        }

        @media (max-width: 480px) {
          .timer-text {
            font-size: 13px;
          }
        }

        .countdown-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 5.5rem;
          font-weight: 900;
          z-index: 1000;
          pointer-events: none;
          opacity: 0.6;
          text-shadow: 0 4px 20px rgba(0,0,0,0.3);
          animation: gentleBounce 0.6s ease-in-out;
        }

        @media (max-width: 640px) {
          .countdown-overlay {
            font-size: 3.5rem;
          }
        }

        @keyframes gentleBounce {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.7; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        }

        .countdown-3 { color: rgba(16, 185, 129, 0.7); }
        .countdown-2 { color: rgba(245, 158, 11, 0.7); }
        .countdown-1 { color: rgba(239, 68, 68, 0.7); }
      `}</style>

      <div className="ho-shell flex flex-col gap-2 bg-slate-50 p-2 sm:p-3">
        {countdown && (
          <div className={`countdown-overlay ${getCountdownClass()}`}>
            {countdown.message}
          </div>
        )}

        {/* Compact top bar */}
        <div className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
              <span>🔎 Find It Fast</span>

              {puzzle.puzzleNumber && puzzle.totalPuzzles && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                  Puzzle {puzzle.puzzleNumber} of {puzzle.totalPuzzles}
                </span>
              )}

              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                Found {progressText}
              </span>

              {finished && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  Complete
                </span>
              )}
            </div>

            <div className="mt-1 hidden text-xs text-slate-500 sm:block">
              Tap hidden items in the image. Harder items are worth more points.
            </div>
          </div>

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

        {/* Main play area */}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Image card */}
          <div className="min-h-0 rounded-xl border bg-white p-2 shadow-sm">
            <div className="relative flex h-full min-h-0 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100">
              <img
                ref={imgRef}
                src={puzzle.imageUrl}
                alt="Hidden object puzzle"
                className="max-h-full max-w-full cursor-crosshair select-none object-contain"
                onClick={handleClick}
                draggable={false}
              />

              <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-lg">
                Found:{' '}
                <span className="font-semibold text-green-600">
                  {foundIds.length}
                </span>
                / {puzzle.itemTarget || puzzle.items.length}
              </div>
            </div>
          </div>

          {/* Desktop clues panel */}
          <aside className="hidden min-h-0 rounded-xl border bg-white p-3 shadow-sm lg:flex lg:flex-col">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Items to find
                </div>
                <div className="text-xs text-slate-500">
                  Colour shows point value
                </div>
              </div>
              <div className="text-xs font-semibold text-slate-600">
                {progressText}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <div className="flex flex-wrap gap-2">
                {puzzle.items.map((it) => {
                  const isFound = foundSet.has(it.id);

                  return (
                    <span
                      key={it.id}
                      className={[
                        'rounded-full border px-2.5 py-1 text-xs font-medium',
                        isFound
                          ? getFoundClass()
                          : getDifficultyClass(it.difficulty),
                      ].join(' ')}
                    >
                      {it.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1 text-[11px]">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-center text-emerald-800">
                Easy · 1pt
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-center text-amber-800">
                Medium · 2pt
              </div>
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-center text-rose-800">
                Hard · 3pt
              </div>
            </div>
          </aside>
        </div>

        {/* Mobile/tablet compact clues */}
        <div className="max-h-[18dvh] overflow-y-auto rounded-xl border bg-white p-2 shadow-sm lg:hidden">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Items to find</span>
            <span className="font-semibold text-slate-500">{progressText}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {puzzle.items.map((it) => {
              const isFound = foundSet.has(it.id);

              return (
                <span
                  key={it.id}
                  className={[
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    isFound ? getFoundClass() : getDifficultyClass(it.difficulty),
                  ].join(' ')}
                >
                  {it.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default HiddenObjectAsking;
