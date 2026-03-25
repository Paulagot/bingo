import { roundTypeLabel } from './utils/eliminationHelpers';
import type { RoundType } from './types/elimination';

interface Props {
  playerName: string;
  eliminatedInRound: number;
  activePlayers: number;
  totalPlayers: number;
  // Current round info so spectator knows what's happening
  currentRoundNumber?: number;
  currentRoundType?: RoundType;
  isRoundActive?: boolean;
}

export const EliminationEliminatedView: React.FC<Props> = ({
  playerName,
  eliminatedInRound,
  activePlayers,
  totalPlayers,
  currentRoundNumber,
  currentRoundType,
  isRoundActive,
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={styles.page}>

    {/* X mark */}
    <div style={styles.xMark}>✕</div>

    <h1 style={styles.title}>Eliminated</h1>
    <p style={styles.round}>Round {eliminatedInRound}</p>

    <div style={styles.message}>
      Better luck next time, <span style={styles.name}>{playerName}</span>.
    </div>

    {/* Spectator status */}
    <div style={styles.spectatorBox}>
      <div style={styles.spectatorLabel}>Spectating</div>
      <div style={styles.spectatorCount}>
        <span style={styles.countNum}>{activePlayers}</span>
        <span style={styles.countOf}> / {totalPlayers}</span>
        <span style={styles.countLabel}> players remain</span>
      </div>

      {/* Show what round is happening */}
      {currentRoundNumber && (
        <div style={styles.liveRound}>
          <span style={{
            ...styles.liveDot,
            background: isRoundActive ? '#ff3b5c' : 'rgba(255,255,255,0.2)',
            boxShadow: isRoundActive ? '0 0 6px #ff3b5c' : 'none',
          }} />
          {isRoundActive
            ? `Round ${currentRoundNumber} in progress · ${currentRoundType ? roundTypeLabel(currentRoundType) : ''}`
            : `Round ${currentRoundNumber} results`}
        </div>
      )}
    </div>

    {/* Clear message that they cannot submit */}
    <div style={styles.noSubmitBanner}>
      You have been eliminated — your game is over
    </div>

  </div>
);

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#080c14',
    fontFamily: "'Syne', sans-serif",
    color: '#ffffff',
  },
  xMark: {
    fontSize: '64px',
    color: '#ff3b5c',
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: '24px',
    filter: 'drop-shadow(0 0 20px rgba(255,59,92,0.6))',
  },
  title: {
    fontSize: '44px',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    margin: '0 0 4px',
  },
  round: {
    fontFamily: "'DM Mono', monospace",
    fontSize: '12px',
    color: 'rgba(255,59,92,0.7)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: '24px',
  },
  message: {
    fontSize: '16px',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '32px',
  },
  name: {
    color: '#ffffff',
    fontWeight: 700,
  },
  spectatorBox: {
    padding: '20px 28px',
    borderRadius: '12px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    marginBottom: '20px',
    minWidth: '260px',
  },
  spectatorLabel: {
    fontSize: '12px',
    fontFamily: "'DM Mono', monospace",
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom: '8px',
  },
  spectatorCount: {
    fontSize: '24px',
    marginBottom: '12px',
  },
  countNum: {
    fontFamily: "'DM Mono', monospace",
    fontWeight: 800,
    color: '#00e5ff',
  },
  countOf: {
    fontFamily: "'DM Mono', monospace",
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
    fontFamily: "'DM Mono', monospace",
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: '0.06em',
    borderTop: '1px solid rgba(255,255,255,0.06)',
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
    background: 'rgba(255,59,92,0.08)',
    border: '1px solid rgba(255,59,92,0.25)',
    color: 'rgba(255,59,92,0.7)',
    fontSize: '12px',
    fontFamily: "'DM Mono', monospace",
    letterSpacing: '0.06em',
  },
};