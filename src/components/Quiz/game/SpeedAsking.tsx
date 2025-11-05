import React, { useEffect, useRef, useState } from 'react';
import { RoundComponentProps } from '../types/quiz';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

interface SpeedAskingProps extends RoundComponentProps {
  questionNumber?: number;
  totalQuestions?: number;
  difficulty?: string;
  category?: string;
  currentRound?: number;

  // ✅ accept the flashing props the router passes (optional)
  isFlashing?: boolean;
  currentEffect?: any;
  getFlashClasses?: () => string;
}

const debug = false;

const SpeedAsking: React.FC<SpeedAskingProps> = ({
  question,
  timerActive = true,            // follow the round timer
  answerSubmitted,                // we keep animating even if answered
  setSelectedAnswer,
  onSubmit,
  difficulty ,
  category,
  currentRound,
  clue,

  // ✅ new props (optional)
  isFlashing,
  currentEffect,
  getFlashClasses,
}) => {
  const { socket } = useQuizSocket();

  // ===== Round-level timer state driven by `round_time_remaining` =====
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [fractionLeft, setFractionLeft] = useState<number>(1);

  // Authoritative refs for smooth interpolation between server ticks
  const endsAtRef = useRef<number | null>(null);   // absolute ms when the ROUND ends
  const totalMsRef = useRef<number | null>(null);  // total round ms (first/max remaining we see)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset when the round changes
  useEffect(() => {
    endsAtRef.current = null;
    totalMsRef.current = null;
    setSecondsLeft(null);
    setFractionLeft(1);
  }, [currentRound]);

  // Listen to server's round-level countdown
  useEffect(() => {
    if (!socket) return;

    const onRemain = ({ remaining }: { remaining: number }) => {
      // remaining: authoritative seconds left for the ROUND
      const now = Date.now();
      const endsAt = now + Math.max(0, remaining) * 1000;

      endsAtRef.current = endsAt;

      // Establish/raise total duration so fraction is meaningful
      if (totalMsRef.current == null || remaining * 1000 > totalMsRef.current) {
        totalMsRef.current = remaining * 1000;
      }

      // Prime UI immediately on each server tick
      const msLeft = Math.max(0, endsAt - now);
      setSecondsLeft(Math.ceil(msLeft / 1000));
      if (totalMsRef.current) {
        setFractionLeft(Math.min(1, Math.max(0, msLeft / totalMsRef.current)));
      }

      if (debug) console.log('[SpeedAsking] round_time_remaining:', remaining, 'endsAt=', new Date(endsAt).toISOString());
    };

    socket.on('round_time_remaining', onRemain);
    return () => {
      socket.off('round_time_remaining', onRemain);
    };
  }, [socket]);

  // Smoothly tick between server events
  useEffect(() => {
    // Keep animating based on round timer; do NOT gate on answerSubmitted
    if (!timerActive) {
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      setSecondsLeft(null);
      setFractionLeft(1);
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
    }, 100); // smooth updates for ring & overlay

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, [timerActive]);

  // Optional fallback: if the server hasn't sent a round tick yet, and the question has legacy timing
  useEffect(() => {
    if (endsAtRef.current || !question) return; // already bridged or no question
    const limit = typeof question.timeLimit === 'number' ? question.timeLimit : undefined;
    const startMs = typeof question.questionStartTime === 'number' ? question.questionStartTime : undefined;
    if (!limit || !startMs) return;

    totalMsRef.current = limit * 1000;
    endsAtRef.current = startMs + limit * 1000;
  }, [question]);

  // ===== UI helpers =====
  const left = question?.options?.[0] ?? 'Option A';
  const right = question?.options?.[1] ?? 'Option B';

  const handleInstant = (value?: string) => {
    if (onSubmit) onSubmit(value);
    else if (value) setSelectedAnswer?.(value);
  };

  // Keyboard shortcuts (← / → / Space / S)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleInstant(left);
      else if (e.key === 'ArrowRight') handleInstant(right);
      else if (e.key === ' ' || e.key.toLowerCase() === 's') handleInstant(undefined);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, right, onSubmit]);

// remaining 1..0
  const getTimerClass = () => {
    if (secondsLeft === null) return 'timer-progress';
    if (secondsLeft <= 3) return 'timer-progress danger';
    if (secondsLeft <= 10) return 'timer-progress warning';
    return 'timer-progress';
  };
  const getDifficultyBadgeClass = () => {
    switch ((difficulty || '').toLowerCase()) {
      case 'easy': return 'difficulty-badge easy';
      case 'hard': return 'difficulty-badge hard';
      default: return 'difficulty-badge medium';
    }
  };

  const showClue = Boolean(clue);
  const show321 = typeof secondsLeft === 'number' && secondsLeft > 0 && secondsLeft <= 3;

  // Prefer host-sent “effect” overlay if present; else use 3-2-1 from secondsLeft
  const showEffectOverlay = Boolean(isFlashing && currentEffect?.message);
  const effectSeconds = Math.min(3, Math.max(1, (currentEffect?.secondsLeft ?? secondsLeft ?? 1)));

  return (
    <>
      <style>{`
/* === STRONG FLASH EFFECTS (copied & amped up from Modern) === */
.flash-effect { position: relative; transition: all .2s ease-in-out; }

.flash-effect::before {
  content: '';
  position: absolute;
  top: -8px; left: -8px; right: -8px; bottom: -8px;
  border-radius: 32px;
  pointer-events: none;
  opacity: 0;
  animation: strongFlash 0.6s ease-in-out;
  z-index: 1; /* sits above container bg but below content */
}

.flash-green::before {
  background: linear-gradient(135deg, rgba(34,197,94,0.35), rgba(34,197,94,0.18));
  border: 2px solid rgba(34,197,94,0.45);
  box-shadow: 0 0 30px rgba(34,197,94,0.35), 0 0 60px rgba(34,197,94,0.25), inset 0 0 20px rgba(34,197,94,0.12);
}
.flash-orange::before {
  background: linear-gradient(135deg, rgba(251,146,60,0.35), rgba(251,146,60,0.18));
  border: 2px solid rgba(251,146,60,0.45);
  box-shadow: 0 0 30px rgba(251,146,60,0.35), 0 0 60px rgba(251,146,60,0.25), inset 0 0 20px rgba(251,146,60,0.12);
}
.flash-red::before {
  background: linear-gradient(135deg, rgba(239,68,68,0.38), rgba(239,68,68,0.2));
  border: 2px solid rgba(239,68,68,0.5);
  box-shadow: 0 0 30px rgba(239,68,68,0.4), 0 0 60px rgba(239,68,68,0.28), inset 0 0 20px rgba(239,68,68,0.12);
}

@keyframes strongFlash {
  0%   { opacity: 0; transform: scale(0.96); }
  25%  { opacity: .9; transform: scale(1.03); }
  50%  { opacity: 1; transform: scale(1.06); }
  75%  { opacity: .6; transform: scale(1.01); }
  100% { opacity: 0; transform: scale(1); }
}

/* Full-screen veil for big visual pop */
.fullscreen-flash {
  position: fixed; inset: 0; pointer-events: none; z-index: 999;
  opacity: 0; animation: fullscreenPulse .45s ease-in-out;
}
.fullscreen-flash.flash-green { background: rgba(34,197,94,0.18); }
.fullscreen-flash.flash-orange { background: rgba(251,146,60,0.18); }
.fullscreen-flash.flash-red { background: rgba(239,68,68,0.2); }

@keyframes fullscreenPulse {
  0% { opacity: 0; }
  50% { opacity: .5; }
  100% { opacity: 0; }
}


        .game-container {
          max-width: 800px; width: 100%; margin: 0 auto; padding: 0 16px;
          position: relative; z-index: 1;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        @media (max-width: 768px) { .game-container { padding: 0 12px; } }

        .game-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 24px; background: white; padding: 16px 24px;
          border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          gap: 12px; flex-wrap: wrap;
        }
        @media (max-width: 640px) { .game-header { padding: 12px 16px; margin-bottom: 16px; } }

        .round-info { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .round-badge {
          background: linear-gradient(135deg,#8b5cf6 0%,#a855f7 100%);
          color: white; padding: 8px 16px; border-radius: 12px; font-weight: 600; font-size: 14px;
        }
        @media (max-width: 480px) { .round-badge { font-size: 12px; padding: 6px 12px; } }
        .question-counter {
          background: #f1f5f9; padding: 8px 16px; border-radius: 12px; color: #64748b; font-weight: 500; font-size: 14px;
        }
        @media (max-width: 480px) { .question-counter { font-size: 12px; padding: 6px 12px; } }

        .timer-section { display: flex; align-items: center; }
        .circular-timer { position: relative; width: 60px; height: 60px; }
        @media (max-width: 480px) { .circular-timer { width: 50px; height: 50px; } }
        .timer-ring { position: absolute; width: 100%; height: 100%; transform: rotate(-90deg); }
        .timer-ring circle { fill: none; stroke-width: 4; }
        .timer-bg { stroke: #e2e8f0; }
        .timer-progress { stroke: #10b981; stroke-linecap: round; stroke-dasharray: 157; transition: stroke-dashoffset 0.1s linear, stroke 0.2s ease; }
        .timer-progress.warning { stroke: #f59e0b; }
        .timer-progress.danger { stroke: #ef4444; animation: timerPulse 0.5s infinite; }
        @keyframes timerPulse { 0%,100%{opacity:1;} 50%{opacity:.7;} }
        .timer-text {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          font-weight: 700; font-size: 16px; color: #1e293b;
        }
        @media (max-width: 480px) { .timer-text { font-size: 14px; } }

        .question-card {
          background: white; border-radius: 24px; padding: 32px; margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.08); position: relative; overflow: visible;
          border: 3px solid transparent;
          background-image: linear-gradient(white, white),
                           linear-gradient(45deg, #8b5cf6, #06b6d4, #10b981, #f59e0b, #8b5cf6);
          background-origin: border-box; background-clip: padding-box, border-box;
          animation: borderFlow 4s ease-in-out infinite;
        }
        @keyframes borderFlow {
          0%,100% { filter: hue-rotate(0deg); }
          25% { filter: hue-rotate(90deg); }
          50% { filter: hue-rotate(180deg); }
          75% { filter: hue-rotate(270deg); }
        }
        @media (max-width: 640px) { .question-card { padding: 20px; border-radius: 16px; margin-bottom: 16px; } }

        .question-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
        @media (max-width: 640px) { .question-meta { margin-bottom: 16px; } }
        .difficulty-badge { padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }
        .difficulty-badge.easy { background: #dcfce7; color: #16a34a; }
        .difficulty-badge.medium { background: #fef3c7; color: #d97706; }
        .difficulty-badge.hard { background: #fecaca; color: #dc2626; }
        .category-tag { background: #f1f5f9; color: #64748b; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 500; }

        .question-text { font-size: 24px; font-weight: 600; color: #1e293b; line-height: 1.4; margin-bottom: 24px; text-align: center; }
        @media (max-width: 640px) { .question-text { font-size: 20px; } }
        @media (max-width: 480px) { .question-text { font-size: 18px; } }

        .clue-section {
          background: #fef9c3; border: 2px solid #fbbf24; border-radius: 12px;
          padding: 12px 14px; margin-bottom: 16px; display: flex; align-items: center; gap: 10px;
        }
        .clue-icon { font-size: 18px; }
        .clue-text { color: #92400e; font-weight: 500; flex: 1; }

        /* Two huge options + center Skip */
        .speed-grid { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: stretch; }
        @media (max-width: 640px) { .speed-grid { grid-template-columns: 1fr; gap: 12px; } }

        .speed-option, .speed-skip {
          position: relative;
          background: white; border: 2px solid #e2e8f0; border-radius: 20px;
          padding: 28px 20px; cursor: pointer; transition: all .2s ease; text-align: center;
          min-height: 120px; display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 42px; line-height: 1; color: #0f172a; user-select: none;
        }
        @media (max-width: 640px) { .speed-option, .speed-skip { min-height: 90px; font-size: 34px; } }

        .speed-label { position: absolute; top: 12px; font-size: 14px; font-weight: 600; letter-spacing: .4px; color: #64748b; }
        .speed-label.left-4 { left: 16px; }
        .speed-label.right-4 { right: 16px; }

        .speed-option:hover:not(:disabled) {
          border-color: #8b5cf6; background: #faf5ff; transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(139, 92, 246, .15);
        }
        .speed-option:active:not(:disabled) { transform: translateY(0); }

        .speed-skip { font-size: 18px; font-weight: 800; color: #1f2937; background: #f8fafc; }
        .speed-skip:hover:not(:disabled) { background: #eef2ff; border-color: #6366f1; transform: translateY(-2px); box-shadow: 0 8px 25px rgba(99,102,241,.15); }

        .speed-option:disabled, .speed-skip:disabled { opacity: .6; cursor: not-allowed; transform: none !important; }

        /* Countdown overlay (3-2-1) */
        .countdown-overlay {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
          font-size: 5.5rem; font-weight: 800; z-index: 1000; pointer-events: none;
          opacity: .6; text-shadow: 0 4px 20px rgba(0,0,0,.3);
          animation: gentleBounce .6s ease-in-out;
        }
        @media (max-width: 640px) { .countdown-overlay { font-size: 3.5rem; } }
        @keyframes gentleBounce { 0%{transform:translate(-50%,-50%) scale(.8);opacity:.3;} 50%{transform:translate(-50%,-50%) scale(1.1);opacity:.7;} 100%{transform:translate(-50%,-50%) scale(1);opacity:.6;} }
        .countdown-3 { color: rgba(16,185,129,.7); }
        .countdown-2 { color: rgba(245,158,11,.7); }
        .countdown-1 { color: rgba(239,68,68,.7); }



        
      `}</style>

      <div className={`game-container ${getFlashClasses ? getFlashClasses() : ''}`}>
{isFlashing && currentEffect && (
  <div className={`fullscreen-flash ${getFlashClasses ? getFlashClasses() : ''}`} />
)}

        {/* Prefer server effect overlay if provided; otherwise show 3-2-1 from secondsLeft */}
        {showEffectOverlay ? (
          <div className={`countdown-overlay countdown-${effectSeconds}`}>
            {currentEffect?.message}
          </div>
        ) : show321 ? (
          <div className={`countdown-overlay countdown-${Math.min(3, Math.max(1, secondsLeft!))}`}>
            {secondsLeft}
          </div>
        ) : null}

        {/* Header */}
        <div className="game-header">
          <div className="round-info">
            <div className="round-badge">Round {currentRound}</div>
            {/* <div className="question-counter">Question {questionNumber}/{totalQuestions}</div> */}
          </div>

          <div className="timer-section">
            <div className="circular-timer">
              <svg className="timer-ring" viewBox="0 0 50 50">
                <circle cx="25" cy="25" r="25" className="timer-bg" />
                <circle
                  cx="25" cy="25" r="25"
                  className={getTimerClass()}
                  style={{ strokeDashoffset: 157 - (fractionLeft * 157) }}
                />
              </svg>
              <div className="timer-text">{secondsLeft ?? '0'}</div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="question-card" data-testid="question-card">
          <div className="question-meta">
            <div className={getDifficultyBadgeClass()}>{difficulty}</div>
            <div className="category-tag">{category}</div>
          </div>

          <div className="question-text">{question?.text ?? 'Get ready…'}</div>

          {showClue && (
            <div className="clue-section">
              <div className="clue-icon">💡</div>
              <div className="clue-text">{clue}</div>
            </div>
          )}

          <div className="speed-grid">
            <button
              className="speed-option"
              onClick={() => handleInstant(question?.options?.[0])}
              disabled={!question?.options?.[0] || !!answerSubmitted}
              aria-label={`Choose ${question?.options?.[0] ?? 'left option'}`}
              data-testid="speed-left"
            >
              <span className="speed-label left-4">A</span>
              <span>{question?.options?.[0] ?? 'Option A'}</span>
            </button>

            <button
              className="speed-skip"
              onClick={() => handleInstant(undefined)}
              disabled={!!answerSubmitted}
              aria-label="Skip this question"
              data-testid="speed-skip"
              title="Skip (Space)"
            >
              Skip
            </button>

            <button
              className="speed-option"
              onClick={() => handleInstant(question?.options?.[1])}
              disabled={!question?.options?.[1] || !!answerSubmitted}
              aria-label={`Choose ${question?.options?.[1] ?? 'right option'}`}
              data-testid="speed-right"
            >
              <span className="speed-label right-4">B</span>
              <span>{question?.options?.[1] ?? 'Option B'}</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SpeedAsking;




