import type { EliminationPlayer } from './types/elimination';
import { formatScore } from './utils/eliminationHelpers';

interface Props {
  players: EliminationPlayer[];
  localPlayerId: string;
  roundNumber?: number;
}

export const EliminationLeaderboard: React.FC<Props> = ({
  players, localPlayerId, roundNumber,
}) => {
  const active = players
    .filter(p => !p.eliminated)
    .sort((a, b) => b.cumulativeScore - a.cumulativeScore);

  const eliminated = players
    .filter(p => p.eliminated)
    .sort((a, b) => (b.eliminatedInRound ?? 0) - (a.eliminatedInRound ?? 0));

  return (
    <div style={styles.container}>
      {roundNumber && (
        <div style={styles.roundTag}>Round {roundNumber}</div>
      )}

      <div style={styles.section}>
        <div style={styles.sectionLabel}>
          Active · {active.length}
        </div>
        {active.map((p, i) => (
          <div key={p.playerId} style={{
            ...styles.row,
            borderColor: p.playerId === localPlayerId
              ? 'rgba(0,229,255,0.3)'
              : 'rgba(255,255,255,0.05)',
          }}>
            <span style={styles.rank}>#{i + 1}</span>
            <span style={styles.name}>
              {p.name}
              {p.playerId === localPlayerId && (
                <span style={styles.youTag}>you</span>
              )}
            </span>
            <span style={styles.score}>{formatScore(p.cumulativeScore)}</span>
          </div>
        ))}
      </div>

      {eliminated.length > 0 && (
        <div style={{ ...styles.section, marginTop: '12px' }}>
          <div style={{ ...styles.sectionLabel, color: 'rgba(255,59,92,0.5)' }}>
            Eliminated · {eliminated.length}
          </div>
          {eliminated.slice(0, 5).map(p => (
            <div key={p.playerId} style={{ ...styles.row, opacity: 0.35, borderColor: 'transparent' }}>
              <span style={styles.rank}>R{p.eliminatedInRound}</span>
              <span style={styles.name}>{p.name}</span>
            </div>
          ))}
          {eliminated.length > 5 && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono', monospace", padding: '4px 0' }}>
              +{eliminated.length - 5} more
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Syne', sans-serif",
    color: '#ffffff',
  },
  roundTag: {
    fontSize: '10px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.2em',
    color: 'rgba(0,229,255,0.5)',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  section: {},
  sectionLabel: {
    fontSize: '10px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.15em',
    color: 'rgba(0,229,255,0.4)',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '7px 10px',
    borderRadius: '6px',
    border: '1px solid',
    background: 'rgba(255,255,255,0.02)',
    marginBottom: '2px',
  },
  rank: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    minWidth: '24px',
  },
  name: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  youTag: {
    fontSize: '9px',
    fontFamily: "'DM Mono', monospace",
    color: '#00e5ff',
    background: 'rgba(0,229,255,0.1)',
    padding: '1px 5px',
    borderRadius: '3px',
  },
  score: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
  },
};