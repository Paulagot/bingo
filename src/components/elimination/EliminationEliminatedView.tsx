// src/components/elimination/EliminationEliminatedView.tsx

import { useEffect, useState } from 'react';
import { roundTypeLabel } from './utils/eliminationHelpers';
import type { RoundType } from './types/elimination';
import { FeedbackModal } from '../feedback/FeedbackModal';

interface Props {
  playerName: string;
  eliminatedInRound: number;
  activePlayers: number;
  totalPlayers: number;

  currentRoundNumber?: number;
  currentRoundType?: RoundType;
  isRoundActive?: boolean;

  gameOver?: boolean;
  winnerName?: string;

  // ── Prize / sponsor ──
  prizeSponsor?: string | null;
  prizeDescription?: string | null;
  prizeValue?: number | string | null;
  prizeCurrency?: string | null;

  onLeave?: () => void;
  autoLeaveSeconds?: number;

  // ── Feedback ──
  roomId?: string;
  clubId?: number;
}

const formatPrizeValue = (
  value?: number | string | null,
  currency = 'EUR',
) => {
  if (value == null || value === '') return null;

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(value);
  }

  try {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${numeric} ${currency}`;
  }
};

const PrizeCard: React.FC<{
  sponsor?: string | null;
  description?: string | null;
  value?: number | string | null;
  currency?: string | null;
  gameOver?: boolean;
}> = ({
  sponsor,
  description,
  value,
  currency = 'EUR',
  gameOver = false,
}) => {
  const formattedValue = formatPrizeValue(value, currency ?? 'EUR');

  if (!sponsor && !description && !formattedValue) {
    return null;
  }

  return (
    <div style={prize.wrap}>
      <div style={prize.top}>
        <span style={prize.icon}>🏆</span>

        <div>
          <div style={prize.eyebrow}>
            {gameOver
              ? 'The Prize'
              : 'Still Up For Grabs'}
          </div>

          {description && (
            <div style={prize.description}>
              {description}
            </div>
          )}
        </div>
      </div>

      {formattedValue && (
        <div style={prize.value}>
          {formattedValue} value
        </div>
      )}

      {sponsor && (
        <div style={prize.sponsor}>
          <span style={prize.sponsorLabel}>
            Prize sponsored by
          </span>

          <span style={prize.sponsorName}>
            {sponsor}
          </span>
        </div>
      )}
    </div>
  );
};

export const EliminationEliminatedView: React.FC<Props> = ({
  playerName,
  eliminatedInRound,
  activePlayers,
  totalPlayers,

  currentRoundNumber,
  currentRoundType,
  isRoundActive,

  gameOver = false,
  winnerName,

  prizeSponsor,
  prizeDescription,
  prizeValue,
  prizeCurrency = 'EUR',

  onLeave,
  autoLeaveSeconds = 120,

  roomId,
  clubId,
}) => {
  const [countdown, setCountdown] =
    useState(autoLeaveSeconds);

  const [feedbackDone, setFeedbackDone] =
    useState(false);

  const [feedbackReady, setFeedbackReady] =
    useState(false);

  const feedbackOpen =
    gameOver &&
    !!roomId &&
    !feedbackDone &&
    feedbackReady;

  useEffect(() => {
    if (!gameOver || !onLeave) return;

    setCountdown(autoLeaveSeconds);
  }, [
    gameOver,
    onLeave,
    autoLeaveSeconds,
  ]);

  useEffect(() => {
    if (!gameOver || !onLeave || feedbackOpen) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onLeave();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [
    gameOver,
    onLeave,
    feedbackOpen,
  ]);

  // Delay feedback modal so the player gets a moment
  // to see the result, winner and sponsor.
  useEffect(() => {
    if (
      !gameOver ||
      !roomId ||
      feedbackDone
    ) {
      return;
    }

    const t = setTimeout(
      () => setFeedbackReady(true),
      4500,
    );

    return () => clearTimeout(t);
  }, [
    gameOver,
    roomId,
    feedbackDone,
  ]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={s.page}
    >
      <div style={s.xMark}>
        ✕
      </div>

      <h1 style={s.title}>
        {gameOver ? 'Game Over' : 'Eliminated'}
      </h1>

      <p style={s.round}>
        Round {eliminatedInRound}
      </p>

      <div style={s.message}>
        Better luck next time,{' '}
        <span style={s.name}>
          {playerName}
        </span>
        .
      </div>

      {/* ─────────────────────────────────────────
          GAME OVER WINNER
      ───────────────────────────────────────── */}
      {gameOver && winnerName && (
        <div style={s.winnerBanner}>
          <div style={s.winnerLabel}>
            Winner
          </div>

          <div style={s.winnerName}>
            {winnerName}
          </div>

          <div style={s.champion}>
            👑 Last player standing
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────
          PRIZE + SPONSOR

          Shown while spectating AND after game over.
      ───────────────────────────────────────── */}
      <PrizeCard
        sponsor={prizeSponsor}
        description={prizeDescription}
        value={prizeValue}
        currency={prizeCurrency}
        gameOver={gameOver}
      />

      {/* ─────────────────────────────────────────
          STILL PLAYING / SPECTATING
      ───────────────────────────────────────── */}
      {!gameOver && (
        <div style={s.spectatorBox}>
          <div style={s.spectatorLabel}>
            Spectating
          </div>

          <div style={s.spectatorCount}>
            <span style={s.countNum}>
              {activePlayers}
            </span>

            <span style={s.countOf}>
              {' '}
              / {totalPlayers}
            </span>

            <span style={s.countLabel}>
              {' '}
              players remain
            </span>
          </div>

          {currentRoundNumber && (
            <div style={s.liveRound}>
              <span
                style={{
                  ...s.liveDot,

                  background: isRoundActive
                    ? '#ff3b5c'
                    : 'rgba(255,255,255,0.2)',

                  boxShadow: isRoundActive
                    ? '0 0 6px #ff3b5c'
                    : 'none',
                }}
              />

              {isRoundActive
                ? `Round ${currentRoundNumber} in progress · ${
                    currentRoundType
                      ? roundTypeLabel(currentRoundType)
                      : ''
                  }`
                : `Round ${currentRoundNumber} results`}
            </div>
          )}
        </div>
      )}

      <div style={s.noSubmitBanner}>
        You have been eliminated - your game is over
      </div>

      {/* Feedback modal */}
      {gameOver &&
        roomId &&
        !feedbackDone && (
          <FeedbackModal
            roomId={roomId}
            clubId={clubId}
            gameType="elimination"
            onClose={() =>
              setFeedbackDone(true)
            }
          />
        )}

      {/* Auto-leave CTA */}
      {gameOver &&
        onLeave &&
        feedbackDone && (
          <div style={s.leaveSection}>
            <button
              onClick={onLeave}
              style={s.leaveBtn}
            >
              Return to lobby
            </button>

            <div style={s.autoLeave}>
              Returning automatically in{' '}

              <span
                style={{
                  color:
                    countdown <= 10
                      ? '#ff3b5c'
                      : 'rgba(255,255,255,0.5)',
                }}
              >
                {countdown}s
              </span>
            </div>
          </div>
        )}
    </div>
  );
};

// ── Prize styles ──────────────────────────────────────────────────────────────

const prize: Record<string, React.CSSProperties> = {
  wrap: {
    width: '100%',
    maxWidth: '340px',

    padding: '16px 18px',
    borderRadius: '12px',

    background:
      'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.035))',

    border: '1px solid rgba(255,215,0,0.28)',

    marginBottom: '20px',

    textAlign: 'left',
  },

  top: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  icon: {
    fontSize: '28px',
    flexShrink: 0,
  },

  eyebrow: {
    fontSize: '9px',
    color: 'rgba(255,215,0,0.6)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom: '3px',
  },

  description: {
    fontSize: '16px',
    lineHeight: 1.2,
    fontWeight: 700,
    color: '#ffffff',
  },

  value: {
    fontSize: '12px',
    color: '#ffd700',
    fontWeight: 600,
    marginTop: '10px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255,215,0,0.1)',
  },

  sponsor: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
    alignItems: 'baseline',
    marginTop: '8px',
  },

  sponsorLabel: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
  },

  sponsorName: {
    fontSize: '12px',
    color: '#ffd700',
    fontWeight: 700,
  },
};

// ── Main styles ───────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    background: '#0a0b0f',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#ffffff',
  },

  xMark: {
    fontSize: '64px',
    color: '#ff3b5c',
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: '24px',
    filter:
      'drop-shadow(0 0 20px rgba(255,59,92,0.6))',
  },

  title: {
    fontSize: '44px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: '0 0 4px',
    fontFamily:
      "'Bebas Neue', Impact, sans-serif",
  },

  round: {
    fontSize: '12px',
    color: 'rgba(255,59,92,0.7)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: '24px',
  },

  message: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '24px',
  },

  name: {
    color: '#ffffff',
    fontWeight: 700,
  },

  winnerBanner: {
    width: '100%',
    maxWidth: '340px',

    padding: '18px 28px',
    borderRadius: '10px',

    background:
      'rgba(255,215,0,0.06)',

    border:
      '1px solid rgba(255,215,0,0.2)',

    marginBottom: '16px',
  },

  winnerLabel: {
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: 'rgba(255,215,0,0.6)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },

  winnerName: {
    fontSize: '30px',
    fontFamily:
      "'Bebas Neue', Impact, sans-serif",

    letterSpacing: '0.04em',
    color: '#ffd700',
  },

  champion: {
    marginTop: '5px',
    fontSize: '11px',
    color: 'rgba(255,255,255,0.35)',
  },

  spectatorBox: {
    padding: '20px 28px',
    borderRadius: '12px',
    border:
      '1px solid rgba(255,255,255,0.08)',

    background:
      'rgba(255,255,255,0.03)',

    marginBottom: '20px',
    minWidth: '260px',
  },

  spectatorLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },

  spectatorCount: {
    fontSize: '24px',
    marginBottom: '12px',
  },

  countNum: {
    fontWeight: 800,
    color: '#00e5ff',
  },

  countOf: {
    color: 'rgba(255,255,255,0.25)',
  },

  countLabel: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.4)',
  },

  liveRound: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',

    fontSize: '13px',
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.06em',

    borderTop:
      '1px solid rgba(255,255,255,0.06)',

    paddingTop: '12px',
  },

  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'all 0.3s',
  },

  noSubmitBanner: {
    padding: '10px 20px',
    borderRadius: '6px',

    background:
      'rgba(255,59,92,0.08)',

    border:
      '1px solid rgba(255,59,92,0.25)',

    color: 'rgba(255,59,92,0.7)',
    fontSize: '12px',
    letterSpacing: '0.06em',
    marginBottom: '24px',
  },

  leaveSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    maxWidth: '300px',
  },

  leaveBtn: {
    width: '100%',
    padding: '14px',

    background:
      'rgba(255,255,255,0.06)',

    border:
      '1px solid rgba(255,255,255,0.15)',

    borderRadius: '10px',
    color: '#ffffff',

    fontSize: '14px',
    fontWeight: 600,

    fontFamily:
      "'Inter', system-ui, sans-serif",

    letterSpacing: '0.06em',
    cursor: 'pointer',

    textTransform: 'uppercase' as const,
  },

  autoLeave: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    fontFamily:
      "'Inter', system-ui, sans-serif",
  },
};