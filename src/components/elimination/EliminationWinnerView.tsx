import { useEffect, useState } from 'react';
import type { RoundResult, EliminationPlayer } from './types/elimination';
import { formatScore } from './utils/eliminationHelpers';
import { FONT_DISPLAY, FONT_BODY, GOLD, DANGER, BASE_BG } from './utils/designTokens';

interface Props {
  winnerId: string;
  winnerName: string;
  finalStandings: RoundResult[];
  players: EliminationPlayer[];
  localPlayerId: string;
  onClose?: () => void;
  autoCloseSeconds?: number;
}

export const EliminationWinnerView: React.FC<Props> = ({
  winnerId, winnerName, finalStandings, players, localPlayerId,
  onClose, autoCloseSeconds = 60,
}) => {
  const [countdown, setCountdown] = useState(autoCloseSeconds);
  const isWinner = localPlayerId === winnerId;
  const playerMap = Object.fromEntries(players.map(p => [p.playerId, p]));

  // Auto-close countdown
  useEffect(() => {
    if (!onClose) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [onClose]);

  return (
    <div style={{ ...s.page, background: BASE_BG }}>
      {/* Crown */}
      <div style={s.crown}>◆</div>

      <div style={s.eyebrow}>
        {isWinner ? 'You won the game' : 'Game over'}
      </div>

      <h1 style={{ ...s.name, fontFamily: FONT_DISPLAY }}>
        {winnerName}
      </h1>

      <div style={s.badge}>Champion</div>

      {isWinner && (
        <p style={{ ...s.congrats, fontFamily: FONT_BODY }}>
          You are the last one standing. Well played.
        </p>
      )}

      {/* Final standings */}
      <div style={s.standings}>
        <div style={{ ...s.standingsLabel, fontFamily: FONT_BODY }}>
          Final standings
        </div>
        <div style={s.list}>
          {finalStandings.map(r => {
            const name = playerMap[r.playerId]?.name ?? r.playerId;
            const isLocal = r.playerId === localPlayerId;
            const isWin = r.playerId === winnerId;

            return (
              <div key={r.playerId} style={{
                ...s.row,
                background: isWin
                  ? 'rgba(255,215,0,0.06)'
                  : isLocal
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                borderColor: isWin
                  ? 'rgba(255,215,0,0.25)'
                  : isLocal
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.05)',
              }}>
                <span style={{
                  ...s.rank,
                  fontFamily: FONT_DISPLAY,
                  color: isWin ? GOLD : 'rgba(255,255,255,0.3)',
                  fontSize: '20px',
                }}>
                  {isWin ? '◆' : `#${r.rank}`}
                </span>
                <span style={{ ...s.rowName, fontFamily: FONT_BODY }}>
                  {name}
                  {isLocal && !isWin && (
                    <span style={s.youTag}>you</span>
                  )}
                  {isWin && <span style={{ marginLeft: '8px', fontSize: '14px' }}>👑</span>}
                </span>
                <span style={{ ...s.rowScore, fontFamily: FONT_BODY }}>
                  {formatScore(r.score)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Auto-close CTA */}
      {onClose && (
        <div style={s.closeFoot}>
          <button onClick={onClose} style={{ ...s.closeBtn, fontFamily: FONT_BODY }}>
            Return to lobby
          </button>
          <div style={{ ...s.autoClose, fontFamily: FONT_BODY }}>
            Returning automatically in{' '}
            <span style={{ color: countdown <= 10 ? DANGER : 'rgba(255,255,255,0.5)' }}>
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
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px 24px',
    color: '#ffffff',
    overflowY: 'auto',
  },
  crown: {
    fontSize: '52px',
    color: GOLD,
    lineHeight: 1,
    marginBottom: '16px',
    filter: `drop-shadow(0 0 24px ${GOLD}99)`,
  },
  eyebrow: {
    fontSize: '13px',
    letterSpacing: '0.18em',
    color: `${GOLD}99`,
    textTransform: 'uppercase',
    marginBottom: '8px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  name: {
    fontSize: '56px',
    letterSpacing: '0.04em',
    margin: '0 0 12px',
    textAlign: 'center',
    color: '#ffffff',
    lineHeight: 1,
    textTransform: 'uppercase',
  },
  badge: {
    padding: '5px 16px',
    borderRadius: '4px',
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
    color: GOLD,
    fontSize: '11px',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
    marginBottom: '16px',
  },
  congrats: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: '24px',
  },
  standings: {
    width: '100%',
    maxWidth: '340px',
    marginTop: '8px',
  },
  standingsLabel: {
    fontSize: '11px',
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid',
  },
  rank: {
    minWidth: '32px',
  },
  rowName: {
    flex: 1,
    fontSize: '15px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
  },
  youTag: {
    marginLeft: '8px',
    fontSize: '10px',
    color: 'rgba(255,255,255,0.4)',
    background: 'rgba(255,255,255,0.08)',
    padding: '1px 6px',
    borderRadius: '3px',
    letterSpacing: '0.05em',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  rowScore: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.4)',
  },
  closeFoot: {
    marginTop: '32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '340px',
  },
  closeBtn: {
    width: '100%',
    padding: '16px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    cursor: 'pointer',
    textTransform: 'uppercase',
  },
  autoClose: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
  },
};