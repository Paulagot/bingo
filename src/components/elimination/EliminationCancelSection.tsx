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
  players: Array<{ walletAddress?: string | null; [key: string]: any }>; // ← accept any object with optional walletAddress
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
          
         <a   href={`https://explorer.solana.com/tx/${refundTxHash}?cluster=${roomData.solanaCluster}`}
            target="_blank"
            rel="noopener noreferrer"
            style={s.txLink}
          >
            View refund transaction
          </a>
        )}
      </div>
    );
  }

  return (
    <div style={s.card}>
      {error && (
        <p style={s.error}>{error}</p>
      )}

      {!isConnected ? (
        <button onClick={() => connect()} style={s.cancelBtn}>
          Connect Wallet to Cancel
        </button>
      ) : (
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
            : `Cancel Room${players.length > 0 ? ` & Refund ${players.length} Player${players.length !== 1 ? 's' : ''}` : ''}`}
        </button>
      )}

      <p style={s.note}>
        {players.length > 0
          ? 'All players will receive their entry fee back on-chain. Your wallet will prompt you to sign.'
          : 'No players have joined yet. Your wallet will prompt you to sign the cancellation.'}
      </p>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  cancelBtn: {
    width: '100%',
    padding: '14px',
    background: 'rgba(255,59,92,0.08)',
    border: '1px solid rgba(255,59,92,0.3)',
    borderRadius: '8px',
    color: '#ff3b5c',
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    fontFamily: "'IBM Plex Mono', monospace",
  },
  note: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center' as const,
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