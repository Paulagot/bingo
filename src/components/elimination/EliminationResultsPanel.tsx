import { useEffect, useState } from 'react';
import type { RoundResult, EliminationPlayer } from './types/elimination';
import { formatScore, ordinal, roundTypeLabel } from './utils/eliminationHelpers';

interface Props {
  results: RoundResult[];
  players: EliminationPlayer[];
  roundNumber: number;
  roundType: string;
  localPlayerId: string;
  eliminatedIds: string[];
  onContinue?: () => void;
}

export const EliminationResultsPanel: React.FC<Props> = ({
  results, players, roundNumber, roundType, localPlayerId, eliminatedIds, onContinue,
}) => {
  const [revealed, setRevealed] = useState<number>(0);
  const [showElimBanner, setShowElimBanner] = useState(false);

  const playerMap = Object.fromEntries(players.map(p => [p.playerId, p]));
  const localResult = results.find(r => r.playerId === localPlayerId);
  const isLocalEliminated = eliminatedIds.includes(localPlayerId);
  const survived = results.filter(r => r.survived).length;

  // Staggered reveal — one entry every 180ms
  useEffect(() => {
    setRevealed(0);
    const interval = setInterval(() => {
      setRevealed(prev => {
        if (prev >= results.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 180);
    return () => clearInterval(interval);
  }, [results]);

  // Show elimination banner after all revealed
  useEffect(() => {
    if (revealed >= results.length && eliminatedIds.length > 0) {
      const t = setTimeout(() => setShowElimBanner(true), 400);
      return () => clearTimeout(t);
    }
  }, [revealed, results.length, eliminatedIds.length]);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.eyebrow}>
            Round {roundNumber} · {roundTypeLabel(roundType)}
          </div>
          <h2 style={s.title}>Results</h2>
        </div>
        <div style={s.survivorCount}>
          <span style={s.survivorNum}>{survived}</span>
          <span style={s.survivorLabel}> advance</span>
        </div>
      </div>

      {/* Your result highlight */}
      {localResult && (
        <div style={{
          ...s.myResult,
          borderColor: isLocalEliminated
            ? 'rgba(255,59,92,0.4)'
            : 'rgba(255,255,255,0.15)',
          background: isLocalEliminated
            ? 'rgba(255,59,92,0.06)'
            : 'rgba(255,255,255,0.04)',
        }}>
          <div style={s.myRank}>{ordinal(localResult.rank)}</div>
          <div style={s.myInfo}>
            <div style={s.myLabel}>Your result</div>
            <div style={{
              ...s.myScore,
              color: isLocalEliminated ? '#ff3b5c' : '#ffffff',
            }}>
              {formatScore(localResult.score)} pts
            </div>
          </div>
          <div style={{
            ...s.myBadge,
            background: isLocalEliminated
              ? 'rgba(255,59,92,0.15)'
              : 'rgba(255,255,255,0.08)',
            color: isLocalEliminated ? '#ff3b5c' : 'rgba(255,255,255,0.7)',
            border: isLocalEliminated
              ? '1px solid rgba(255,59,92,0.3)'
              : '1px solid rgba(255,255,255,0.12)',
          }}>
            {isLocalEliminated ? 'Eliminated' : 'Survived'}
          </div>
        </div>
      )}

      {/* Elimination banner */}
      {showElimBanner && eliminatedIds.length > 0 && (
        <div style={s.elimBanner}>
          <span style={s.elimBannerX}>✕</span>
          <span style={s.elimBannerText}>
            {eliminatedIds.length} player{eliminatedIds.length > 1 ? 's' : ''} eliminated
          </span>
        </div>
      )}

      {/* Full leaderboard — staggered reveal */}
      <div style={s.list}>
        {results.map((r, i) => {
          const name = playerMap[r.playerId]?.name ?? '—';
          const isLocal = r.playerId === localPlayerId;
          const isElim = eliminatedIds.includes(r.playerId);
          const isVisible = i < revealed;

          return (
            <div
              key={r.playerId}
              style={{
                ...s.row,
                opacity: isVisible ? (isElim ? 0.4 : 1) : 0,
                transform: isVisible ? 'translateX(0)' : 'translateX(-12px)',
                transition: 'opacity 0.25s ease, transform 0.25s ease',
                borderColor: isLocal
                  ? 'rgba(255,255,255,0.2)'
                  : 'rgba(255,255,255,0.05)',
                background: isLocal
                  ? 'rgba(255,255,255,0.04)'
                  : 'transparent',
              }}
            >
              <span style={{
                ...s.rowRank,
                color: r.rank <= 3 ? '#ffffff' : 'rgba(255,255,255,0.25)',
              }}>
                {r.rank <= 3 ? ['①','②','③'][r.rank - 1] : `#${r.rank}`}
              </span>
              <span style={s.rowName}>
                {name}
                {isLocal && <span style={s.youTag}>you</span>}
              </span>
              <span style={{
                ...s.rowScore,
                color: isElim ? 'rgba(255,59,92,0.6)' : 'rgba(255,255,255,0.5)',
              }}>
                {formatScore(r.score)}
              </span>
              {isElim && (
                <span style={s.elimMark}>✕</span>
              )}
            </div>
          );
        })}
      </div>

      {onContinue && (
        <button onClick={onContinue} style={s.continueBtn}>
          Continue
        </button>
      )}
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    background: '#080c14',
    fontFamily: "'Syne', sans-serif",
    color: '#ffffff',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  eyebrow: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: 0,
  },
  survivorCount: {
    textAlign: 'right',
    paddingTop: '4px',
  },
  survivorNum: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '28px',
    fontWeight: 800,
    color: '#ffffff',
  },
  survivorLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.3)',
  },
  myResult: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid',
    marginBottom: '12px',
  },
  myRank: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '24px',
    fontWeight: 800,
    minWidth: '52px',
    color: 'rgba(255,255,255,0.9)',
  },
  myInfo: {
    flex: 1,
  },
  myLabel: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '9px',
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    marginBottom: '2px',
  },
  myScore: {
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: "'DM Mono', monospace",
  },
  myBadge: {
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '10px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  elimBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '6px',
    background: 'rgba(255,59,92,0.08)',
    border: '1px solid rgba(255,59,92,0.2)',
    marginBottom: '12px',
  },
  elimBannerX: {
    color: '#ff3b5c',
    fontSize: '14px',
    fontWeight: 800,
  },
  elimBannerText: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '12px',
    color: 'rgba(255,59,92,0.8)',
    letterSpacing: '0.06em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    flex: 1,
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '6px',
    border: '1px solid',
  },
  rowRank: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '13px',
    minWidth: '28px',
    fontWeight: 600,
  },
  rowName: {
    flex: 1,
    fontSize: '16px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  youTag: {
    fontSize: '9px',
    fontFamily: "'DM Mono', monospace",
    color: 'rgba(255,255,255,0.5)',
    background: 'rgba(255,255,255,0.08)',
    padding: '1px 5px',
    borderRadius: '3px',
    letterSpacing: '0.08em',
  },
  rowScore: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '12px',
  },
  elimMark: {
    color: '#ff3b5c',
    fontSize: '11px',
    fontWeight: 700,
  },
  continueBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '16px',
    background: 'transparent',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '13px',
    fontFamily: "'Syne', sans-serif",
    letterSpacing: '0.08em',
    cursor: 'pointer',
  },
};