import React from 'react';
import { useEliminationFinalize } from './hooks/useEliminationFinalize';
import { getTokenByMint } from '../../chains/solana/config/solanaTokenConfig';
import { GOLD } from './utils/designTokens';

interface Props {
  roomId: string;
  hostId: string;
  winnerPlayerId: string;
  roomData: {
    solanaCluster: 'devnet' | 'mainnet';
    feeMint: string;
    entryFee: number;
    onChainRoomId: string;
    roomPda: string;
    charityOrgId: number | null;
    totalPlayers: number;
  };
  onComplete?: () => void;
}

export const EliminationFinalizeSection: React.FC<Props> = ({
  roomId,
  hostId,
  winnerPlayerId,
  roomData,
  onComplete,
}) => {
const {
  state,
  error,
  txHash,
  explorerUrl,
  canFinalize,
  isWorking,
  isConnected,
  connect,
  handleFinalize,
} = useEliminationFinalize({ roomId, hostId, winnerPlayerId, roomData, onComplete });

  const tokenConfig    = getTokenByMint(roomData.feeMint);
  const decimals       = tokenConfig?.decimals ?? 6;
  const tokenSymbol    = tokenConfig?.code ?? 'tokens';
  const totalPoolRaw   = roomData.totalPlayers * roomData.entryFee;
  const totalPoolHuman = totalPoolRaw / Math.pow(10, decimals);

  const winnerAmount   = totalPoolHuman * 0.30;
  const hostAmount     = totalPoolHuman * 0.20;
  const charityAmount  = totalPoolHuman * 0.35;
  const platformAmount = totalPoolHuman * 0.15;

  // ── Success state ──────────────────────────────────────────────────────────
  if (state === 'success') {
    return (
      <div style={s.card}>
        <div style={{ fontSize: '28px', marginBottom: '4px' }}>🎉</div>
        <p style={s.successText}>Prizes distributed on-chain</p>
        {txHash && explorerUrl && (
          
          <a  href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={s.txLink}
          >
            View transaction ↗
          </a>
        )}
        <p style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.2)',
          textAlign: 'center',
          margin: 0,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          Scroll down to return to lobby
        </p>
      </div>
    );
  }

  // ── Default state ──────────────────────────────────────────────────────────
  return (
    <div style={s.card}>
      <div style={s.title}>Distribute Prize Pool</div>

      <div style={s.poolSummary}>
        <span style={s.poolLabel}>Total pool</span>
        <span style={s.poolAmount}>
          {totalPoolHuman.toFixed(4)} {tokenSymbol}
        </span>
        <span style={s.poolSub}>
          {roomData.totalPlayers} players × {(roomData.entryFee / Math.pow(10, decimals)).toFixed(4)} {tokenSymbol}
        </span>
      </div>

      <div style={s.breakdown}>
        <div style={s.row}>
          <span style={s.label}>Winner</span>
          <div style={s.amountGroup}>
            <span style={s.amount}>{winnerAmount.toFixed(4)} {tokenSymbol}</span>
            <span style={s.pct}>30%</span>
          </div>
        </div>
        <div style={s.row}>
          <span style={s.label}>Host (you)</span>
          <div style={s.amountGroup}>
            <span style={s.amount}>{hostAmount.toFixed(4)} {tokenSymbol}</span>
            <span style={s.pct}>20%</span>
          </div>
        </div>
        <div style={s.row}>
          <span style={s.label}>Charity</span>
          <div style={s.amountGroup}>
            <span style={s.amount}>{charityAmount.toFixed(4)} {tokenSymbol}</span>
            <span style={s.pct}>35%</span>
          </div>
        </div>
        <div style={s.row}>
          <span style={s.label}>Platform</span>
          <div style={s.amountGroup}>
            <span style={s.amount}>{platformAmount.toFixed(4)} {tokenSymbol}</span>
            <span style={s.pct}>15%</span>
          </div>
        </div>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {!isConnected ? (
        <button onClick={() => connect()} style={s.btn}>
          Connect Wallet to Distribute
        </button>
      ) : (
        <button
          onClick={handleFinalize}
          disabled={!canFinalize || isWorking}
          style={{
            ...s.btn,
            ...s.btnPrimary,
            opacity: (!canFinalize || isWorking) ? 0.5 : 1,
            cursor: (!canFinalize || isWorking) ? 'not-allowed' : 'pointer',
          }}
        >
          {isWorking
            ? state === 'preparing'
              ? 'Getting charity address...'
              : state === 'signing'
              ? 'Sign in wallet...'
              : state === 'closing'
              ? 'Closing room...'
              : 'Confirming...'
            : 'Distribute Prize Pool'}
        </button>
      )}

      <p style={s.note}>
        This sends the on-chain transaction. Your wallet will prompt you to sign.
      </p>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  card: {
    width: '100%',
    maxWidth: '340px',
    background: 'rgba(255,215,0,0.04)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  title: {
    fontSize: '13px',
    letterSpacing: '0.12em',
    color: 'rgba(255,215,0,0.8)',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  poolSummary: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,215,0,0.06)',
    border: '1px solid rgba(255,215,0,0.12)',
    borderRadius: '8px',
    padding: '12px',
    gap: '2px',
  },
  poolLabel: {
    fontSize: '10px',
    letterSpacing: '0.15em',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  poolAmount: {
    fontSize: '22px',
    fontWeight: 700,
    color: GOLD,
    fontFamily: "'Barlow Condensed', sans-serif",
    letterSpacing: '0.05em',
  },
  poolSub: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  breakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '10px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  label: {
    color: 'rgba(255,255,255,0.4)',
  },
  amountGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  amount: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: 600,
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  pct: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '11px',
    minWidth: '30px',
    textAlign: 'right',
  },
  btn: {
    width: '100%',
    padding: '14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    fontFamily: "'Bebas Neue', 'Impact', sans-serif",
  },
  btnPrimary: {
    background: 'rgba(255,215,0,0.12)',
    border: '1px solid rgba(255,215,0,0.4)',
    color: GOLD,
  },
  note: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    margin: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  error: {
    color: '#ff3b5c',
    fontSize: '12px',
    fontFamily: "'Inter', system-ui, sans-serif",
    margin: 0,
  },
  successText: {
    fontSize: '15px',
    color: 'rgba(255,215,0,0.8)',
    margin: 0,
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  txLink: {
    fontSize: '12px',
    color: 'rgba(0,229,255,0.7)',
    fontFamily: 'monospace',
    textDecoration: 'none',
  },
};