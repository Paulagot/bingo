import { useEffect, useState } from 'react';
import { roundTypeLabel } from './utils/eliminationHelpers';
import type { RoundType } from './types/elimination';

interface Props {
  playerName: string;
  eliminatedInRound: number;
  activePlayers: number;
  totalPlayers: number;
  currentRoundNumber?: number;
  currentRoundType?: RoundType;
  isRoundActive?: boolean;
  // Set when game is over — triggers auto-cleanup
  gameOver?: boolean;
  winnerName?: string;
  onLeave?: () => void;
  autoLeaveSeconds?: number;
}

export const EliminationEliminatedView: React.FC<Props> = ({
  playerName, eliminatedInRound, activePlayers, totalPlayers,
  currentRoundNumber, currentRoundType, isRoundActive,
  gameOver = false, winnerName, onLeave, autoLeaveSeconds = 60,
}) => {
  const [countdown, setCountdown] = useState(autoLeaveSeconds);

  // Auto-leave countdown when game ends
  useEffect(() => {
    if (!gameOver || !onLeave) return;
    setCountdown(autoLeaveSeconds);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onLeave(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameOver, onLeave, autoLeaveSeconds]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={s.page}>

      <div style={s.xMark}>✕</div>
      <h1 style={s.title}>{gameOver ? 'Game Over' : 'Eliminated'}</h1>
      <p style={s.round}>Round {eliminatedInRound}</p>

      <div style={s.message}>
        Better luck next time, <span style={s.name}>{playerName}</span>.
      </div>

      {/* Game over — show winner */}
      {gameOver && winnerName && (
        <div style={s.winnerBanner}>
          <div style={s.winnerLabel}>Winner</div>
          <div style={s.winnerName}>{winnerName}</div>
        </div>
      )}

      {/* Still playing — show spectator info */}
      {!gameOver && (
        <div style={s.spectatorBox}>
          <div style={s.spectatorLabel}>Spectating</div>
          <div style={s.spectatorCount}>
            <span style={s.countNum}>{activePlayers}</span>
            <span style={s.countOf}> / {totalPlayers}</span>
            <span style={s.countLabel}> players remain</span>
          </div>
          {currentRoundNumber && (
            <div style={s.liveRound}>
              <span style={{
                ...s.liveDot,
                background: isRoundActive ? '#ff3b5c' : 'rgba(255,255,255,0.2)',
                boxShadow: isRoundActive ? '0 0 6px #ff3b5c' : 'none',
              }} />
              {isRoundActive
                ? `Round ${currentRoundNumber} in progress · ${currentRoundType ? roundTypeLabel(currentRoundType) : ''}`
                : `Round ${currentRoundNumber} results`}
            </div>
          )}
        </div>
      )}

      <div style={s.noSubmitBanner}>
        You have been eliminated — your game is over
      </div>

      {/* Cleanup CTA when game ends */}
      {gameOver && onLeave && (
        <div style={s.leaveSection}>
          <button onClick={onLeave} style={s.leaveBtn}>
            Return to lobby
          </button>
          <div style={s.autoLeave}>
            Returning automatically in{' '}
            <span style={{ color: countdown <= 10 ? '#ff3b5c' : 'rgba(255,255,255,0.5)' }}>
              {countdown}s
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {
    background: '#0a0b0f',
    fontFamily: "'Inter', system-ui, sans-serif",
    color: '#ffffff',
  },
  xMark: {
    fontSize: '64px', color: '#ff3b5c', fontWeight: 800, lineHeight: 1,
    marginBottom: '24px', filter: 'drop-shadow(0 0 20px rgba(255,59,92,0.6))',
  },
  title: {
    fontSize: '44px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px',
    fontFamily: "'Bebas Neue', Impact, sans-serif",
  },
  round: {
    fontSize: '12px', color: 'rgba(255,59,92,0.7)', letterSpacing: '0.15em',
    textTransform: 'uppercase', marginBottom: '24px',
  },
  message: {
    fontSize: '16px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px',
  },
  name: { color: '#ffffff', fontWeight: 700 },
  winnerBanner: {
    padding: '16px 28px', borderRadius: '10px',
    background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)',
    marginBottom: '20px',
  },
  winnerLabel: {
    fontSize: '10px', letterSpacing: '0.2em', color: 'rgba(255,215,0,0.6)',
    textTransform: 'uppercase', marginBottom: '4px',
  },
  winnerName: {
    fontSize: '28px', fontFamily: "'Bebas Neue', Impact, sans-serif",
    letterSpacing: '0.04em', color: '#ffd700',
  },
  spectatorBox: {
    padding: '20px 28px', borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
    marginBottom: '20px', minWidth: '260px',
  },
  spectatorLabel: {
    fontSize: '12px', color: 'rgba(255,255,255,0.45)',
    letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '8px',
  },
  spectatorCount: { fontSize: '24px', marginBottom: '12px' },
  countNum: { fontWeight: 800, color: '#00e5ff' },
  countOf: { color: 'rgba(255,255,255,0.25)' },
  countLabel: { fontSize: '14px', color: 'rgba(255,255,255,0.4)' },
  liveRound: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    fontSize: '13px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em',
    borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px',
  },
  liveDot: {
    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, transition: 'all 0.3s',
  },
  noSubmitBanner: {
    padding: '10px 20px', borderRadius: '6px',
    background: 'rgba(255,59,92,0.08)', border: '1px solid rgba(255,59,92,0.25)',
    color: 'rgba(255,59,92,0.7)', fontSize: '12px', letterSpacing: '0.06em',
    marginBottom: '24px',
  },
  leaveSection: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', width: '100%', maxWidth: '300px',
  },
  leaveBtn: {
    width: '100%', padding: '14px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px',
    color: '#ffffff', fontSize: '14px', fontWeight: 600,
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' as const,
  },
  autoLeave: {
    fontSize: '13px', color: 'rgba(255,255,255,0.3)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
};