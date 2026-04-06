import React from 'react';
import { useEliminationHostCancel } from './hooks/useEliminationHostCancel';

interface Props {
  roomId: string;
  hostId: string;
  roomData: {
    solanaCluster: 'devnet' | 'mainnet';
    feeMint: string;
    roomPda: string;
  };
  players: Array<{ walletAddress?: string | null; [key: string]: any }>;
  onCancelled: () => void;
}

export const EliminationCancelSection: React.FC<Props> = ({
  roomId,
  hostId,
  roomData,
  players,
  onCancelled,
}) => {
  const {
    cancelState,
    error,
    refundTxHash,
    isWorking,
    isConnected,
    connect,
    handleCancel,
  } = useEliminationHostCancel({ roomId, hostId, roomData, players, onCancelled });

  const [showConfirm, setShowConfirm] = React.useState(false);

  // ── Success state ─────────────────────────────────────────────────────────
  if (cancelState === 'success') {
    return (
      <div style={s.card}>
        <p style={s.successText}>✓ Room cancelled</p>
        {players.length > 0 && (
          <p style={s.successSub}>
            {players.length} player{players.length !== 1 ? 's' : ''} refunded on-chain
          </p>
        )}
        {refundTxHash && (
          <a
            href={`https://explorer.solana.com/tx/${refundTxHash}?cluster=${roomData.solanaCluster}`}
            target="_blank"
            rel="noopener noreferrer"
            style={s.txLink}
          >
            View refund transaction ↗
          </a>
        )}
      </div>
    );
  }

  // ── Normal state ──────────────────────────────────────────────────────────
  return (
    <div style={s.card}>
      {error && <p style={s.error}>{error}</p>}

      {!isConnected ? (
        <button onClick={() => connect()} style={s.connectBtn}>
          Connect Wallet to Cancel Room
        </button>
      ) : !showConfirm ? (
        <button onClick={() => setShowConfirm(true)} style={s.triggerLink}>
          Cancel room
        </button>
      ) : (
        <div style={s.confirmBox}>
          <p style={s.confirmWarning}>
            ⚠ This will cancel the room and refund all players on-chain. Are you sure?
          </p>
          <button
            onClick={handleCancel}
            disabled={isWorking}
            style={{
              ...s.cancelBtn,
              opacity: isWorking ? 0.5 : 1,
              cursor: isWorking ? 'not-allowed' : 'pointer',
            }}
          >
            {isWorking
              ? cancelState === 'signing_cancel'
                ? 'Cancelling room...'
                : cancelState === 'signing_refund'
                ? `Refunding ${players.length} player${players.length !== 1 ? 's' : ''}...`
                : 'Confirming...'
              : `Yes, cancel & refund ${players.length} player${players.length !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            style={s.dismissLink}
          >
            Never mind
          </button>
        </div>
      )}

      {!showConfirm && (
        <p style={s.note}>
          {players.length > 0
            ? `${players.length} player${players.length !== 1 ? 's' : ''} will be refunded on-chain`
            : 'No players have joined yet'}
        </p>
      )}
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  triggerLink: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,59,92,0.4)',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
    padding: '4px 0',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    alignSelf: 'center',
    letterSpacing: '0.05em',
  },
  connectBtn: {
    background: 'none',
    border: '1px solid rgba(255,59,92,0.2)',
    borderRadius: '6px',
    color: 'rgba(255,59,92,0.5)',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
    padding: '8px 12px',
    letterSpacing: '0.05em',
  },
  confirmBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  confirmWarning: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.45)',
    fontFamily: "'IBM Plex Mono', monospace",
    margin: 0,
    lineHeight: 1.5,
  },
  cancelBtn: {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,59,92,0.08)',
    border: '1px solid rgba(255,59,92,0.3)',
    borderRadius: '8px',
    color: '#ff3b5c',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
  },
  dismissLink: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.25)',
    fontSize: '11px',
    fontFamily: "'IBM Plex Mono', monospace",
    cursor: 'pointer',
    padding: '2px 0',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
    alignSelf: 'center',
  },
  note: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    margin: 0,
    fontFamily: "'IBM Plex Mono', monospace",
    lineHeight: 1.5,
  },
  error: {
    color: '#ff3b5c',
    fontSize: '12px',
    fontFamily: "'IBM Plex Mono', monospace",
    margin: 0,
  },
  successText: {
    fontSize: '14px',
    color: 'rgba(0,229,255,0.8)',
    margin: 0,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  successSub: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    margin: 0,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  txLink: {
    fontSize: '11px',
    color: 'rgba(0,229,255,0.6)',
    fontFamily: 'monospace',
    textDecoration: 'none',
  },
};