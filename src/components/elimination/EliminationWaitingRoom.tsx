import React, { useState } from 'react';
import type { EliminationPlayer } from './types/elimination';
import { QRCodeSVG } from 'qrcode.react';
import { Web3Provider } from '../Web3Provider';
import { EliminationCancelSection } from './EliminationCancelSection';
import { getTokenByMint } from '../../chains/solana/config/solanaTokenConfig';

interface Props {
  roomId: string;
  players: EliminationPlayer[];
  isHost: boolean;
  localPlayerId: string;
  onStart: () => void;
  onLeave?: () => void;
  minPlayers?: number;
  // ── web3 additions ──
  roomData?: any;
  hostId?: string;
  onCancelled?: () => void;
}

// ── Live prize pool panel — shown for web3 rooms only ────────────────────────
const PrizePoolPanel: React.FC<{ roomData: any; playerCount: number }> = ({
  roomData,
  playerCount,
}) => {
  const tokenConfig   = getTokenByMint(roomData.feeMint);
  const decimals      = tokenConfig?.decimals ?? 6;
  const tokenSymbol   = tokenConfig?.code ?? 'tokens';
  const divisor       = Math.pow(10, decimals);
  const entryHuman    = roomData.entryFee / divisor;
  const totalPoolRaw  = playerCount * roomData.entryFee;
  const totalHuman    = totalPoolRaw / divisor;

  const winnerAmt   = (totalHuman * 0.30).toFixed(4);
  const hostAmt     = (totalHuman * 0.20).toFixed(4);
  const charityAmt  = (totalHuman * 0.35).toFixed(4);
  const platformAmt = (totalHuman * 0.15).toFixed(4);

  return (
    <div style={pool.wrap}>
      {/* Header */}
      <div style={pool.header}>
        <span style={pool.eyebrow}>Prize Pool</span>
        <div style={pool.total}>
          <span style={pool.totalAmount}>{totalHuman.toFixed(4)}</span>
          <span style={pool.totalSymbol}>{tokenSymbol}</span>
        </div>
        <span style={pool.totalSub}>
          {playerCount} {playerCount === 1 ? 'player' : 'players'} × {entryHuman.toFixed(4)} {tokenSymbol}
        </span>
      </div>

      {/* Breakdown */}
      {playerCount > 0 && (
        <div style={pool.rows}>
          <div style={pool.row}>
            <span style={pool.rowLabel}>🏆 Winner</span>
            <div style={pool.rowRight}>
              <span style={pool.rowAmount}>{winnerAmt}</span>
              <span style={pool.rowPct}>30%</span>
            </div>
          </div>
          <div style={pool.row}>
            <span style={pool.rowLabel}>🎙 Host</span>
            <div style={pool.rowRight}>
              <span style={pool.rowAmount}>{hostAmt}</span>
              <span style={pool.rowPct}>20%</span>
            </div>
          </div>
          <div style={pool.row}>
            <span style={pool.rowLabel}>💚 Charity</span>
            <div style={pool.rowRight}>
              <span style={pool.rowAmount}>{charityAmt}</span>
              <span style={pool.rowPct}>35%</span>
            </div>
          </div>
          <div style={pool.row}>
            <span style={pool.rowLabel}>⚙️ Platform</span>
            <div style={pool.rowRight}>
              <span style={pool.rowAmount}>{platformAmt}</span>
              <span style={pool.rowPct}>15%</span>
            </div>
          </div>
        </div>
      )}

      {playerCount === 0 && (
        <p style={pool.empty}>Pool grows as players join</p>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const EliminationWaitingRoom: React.FC<Props> = ({
  roomId,
  players,
  isHost,
  localPlayerId,
  onStart,
  onLeave,
  minPlayers = 2,
  roomData,
  hostId,
  onCancelled,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const canStart   = players.length >= minPlayers;
  const isWeb3Room = roomData?.paymentMode === 'web3';
  const joinUrl    = `${window.location.origin}/elimination/join/${roomId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = joinUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6" style={styles.page}>
      <div className="mb-6" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={styles.eyebrow}>{isHost ? 'Hosting' : 'Waiting Room'}</div>
          <h1 style={styles.title}>ELIMINATION</h1>
        </div>
        {onLeave && !isWeb3Room && (
          <button onClick={onLeave} style={styles.leaveBtn}>Leave</button>
        )}
      </div>

      {/* ── Live prize pool — web3 rooms only ── */}
      {isWeb3Room && roomData?.feeMint && roomData?.entryFee && (
        <PrizePoolPanel roomData={roomData} playerCount={players.length} />
      )}

      {isHost && (
        <div style={styles.sharePanel}>
          <div style={styles.shareLabel}>Share with players</div>

          <div style={styles.roomCodeBox}>
            <span style={styles.roomCodeLabel}>Room Code</span>
            <span style={styles.roomCode}>{roomId}</span>
          </div>

          {/* ── On-chain contract link — web3 rooms only ── */}
{isWeb3Room && roomData?.roomPda && (
  <a ref={`https://explorer.solana.com/address/${roomData.roomPda}${roomData.solanaCluster === 'devnet' ? '?cluster=devnet' : ''}`}
    target="_blank"
    rel="noopener noreferrer"
    style={styles.contractLink}
  >
    <span style={styles.contractLinkLabel}>On-chain contract</span>
    <span style={styles.contractLinkAddr}>
      {roomData.roomPda.slice(0, 8)}…{roomData.roomPda.slice(-6)} ↗
    </span>
  </a>
)}

          <div style={styles.linkRow}>
            <span style={styles.linkText} title={joinUrl}>
              {joinUrl.length > 42 ? joinUrl.slice(0, 42) + '…' : joinUrl}
            </span>
            <button onClick={handleCopy} style={{
              ...styles.copyBtn,
              background: copied ? 'rgba(0,229,255,0.2)' : 'rgba(0,229,255,0.1)',
            }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          <button onClick={() => setShowQR(v => !v)} style={styles.qrToggle}>
            {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>

          {showQR && (
            <div style={styles.qrWrapper}>
              <div style={styles.qrFrame}>
                <QRCodeSVG value={joinUrl} size={180} fgColor="#00e5ff" bgColor="#0a0b0f" />
              </div>
              <p style={styles.qrHint}>Players scan to join on mobile</p>
            </div>
          )}
        </div>
      )}

      <div style={styles.countRow}>
        <span style={styles.countNum}>{players.length}</span>
        <span style={styles.countLabel}>
          {players.length === 1 ? 'player' : 'players'} joined
          {!canStart && ` · need ${minPlayers - players.length} more`}
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-2 my-4 overflow-y-auto">
        {players.map((p, i) => (
          <div key={p.playerId} style={{
            ...styles.playerRow,
            borderColor: p.playerId === localPlayerId
              ? 'rgba(0,229,255,0.5)'
              : 'rgba(255,255,255,0.06)',
            background: p.playerId === localPlayerId
              ? 'rgba(0,229,255,0.06)'
              : 'rgba(255,255,255,0.02)',
          }}>
            <span style={styles.playerIndex}>#{i + 1}</span>
            <span style={styles.playerName}>
              {p.name}
              {p.playerId === localPlayerId && (
                <span style={styles.youBadge}>you</span>
              )}
            </span>
            <span style={{
              ...styles.dot,
              background: p.connected ? '#00e5ff' : 'rgba(255,255,255,0.2)',
              boxShadow: p.connected ? '0 0 6px #00e5ff' : 'none',
            }} />
          </div>
        ))}
        {players.length === 0 && (
          <div style={styles.emptyState}>Waiting for players to join…</div>
        )}
      </div>

      {isHost && (
        <div className="mt-auto" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!canStart && (
            <p style={styles.hint}>Need at least {minPlayers} players to start</p>
          )}

          <button
            onClick={onStart}
            disabled={!canStart}
            style={{
              ...styles.startBtn,
              opacity: canStart ? 1 : 0.35,
              cursor: canStart ? 'pointer' : 'default',
              boxShadow: canStart ? '0 0 30px rgba(0,229,255,0.25)' : 'none',
            }}
          >
            Start Game
          </button>

          {isWeb3Room && roomData && hostId && onCancelled && (
            <Web3Provider force={true}>
              <EliminationCancelSection
                roomId={roomId}
                hostId={hostId}
                roomData={roomData}
                players={players}
                onCancelled={onCancelled}
              />
            </Web3Provider>
          )}
        </div>
      )}

      {!isHost && (
        <div style={styles.waitingMsg}>Waiting for host to start…</div>
      )}
    </div>
  );
};

// ── Prize pool panel styles ───────────────────────────────────────────────────
const pool: Record<string, React.CSSProperties> = {
  wrap: {
    background: 'rgba(255,215,0,0.04)',
    border: '1px solid rgba(255,215,0,0.2)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  eyebrow: {
    fontSize: '10px',
    letterSpacing: '0.2em',
    color: 'rgba(255,215,0,0.5)',
    textTransform: 'uppercase',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  total: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  totalAmount: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#ffd700',
    fontFamily: "'Barlow Condensed', sans-serif",
    letterSpacing: '-0.01em',
  },
  totalSymbol: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'rgba(255,215,0,0.7)',
    fontFamily: "'Barlow Condensed', sans-serif",
  },
  totalSub: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  rows: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderTop: '1px solid rgba(255,215,0,0.1)',
    paddingTop: '10px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.4)',
    fontFamily: "'IBM Plex Mono', monospace",
  },
  rowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rowAmount: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'monospace',
  },
  rowPct: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    minWidth: '30px',
    textAlign: 'right',
  },
  empty: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    fontFamily: "'IBM Plex Mono', monospace",
    textAlign: 'center',
    margin: 0,
  },
};

// ── Main page styles (unchanged) ──────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: { background: '#0a0a0f', fontFamily: "'Barlow Condensed', sans-serif", color: '#ffffff' },
  eyebrow: { fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.55)', fontFamily: "'IBM Plex Mono', monospace", textTransform: 'uppercase', marginBottom: '4px' },
  title: { fontSize: '36px', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: '0' },
  sharePanel: { padding: '16px', borderRadius: '12px', border: '1px solid rgba(0,229,255,0.15)', background: 'rgba(0,229,255,0.04)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  shareLabel: { fontSize: '10px', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.2em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' },
  roomCodeBox: { display: 'flex', alignItems: 'center', gap: '12px' },
  roomCodeLabel: { fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: "'IBM Plex Mono', monospace" },
  roomCode: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '13px', color: '#00e5ff', background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', padding: '4px 10px', borderRadius: '4px', letterSpacing: '0.1em', wordBreak: 'break-all' },
  linkRow: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '8px 12px' },
  linkText: { flex: 1, fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", color: 'rgba(255,255,255,0.45)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  copyBtn: { border: '1px solid rgba(0,229,255,0.4)', borderRadius: '4px', color: '#00e5ff', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 },
  qrToggle: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', fontSize: '12px', fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer', padding: '0', textDecoration: 'underline', textUnderlineOffset: '3px', alignSelf: 'flex-start' },
  qrWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', paddingTop: '4px' },
  qrFrame: { padding: '12px', background: '#0a0a0f', border: '1px solid rgba(0,229,255,0.25)', borderRadius: '8px', display: 'inline-block' },
  qrHint: { fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: "'IBM Plex Mono', monospace", margin: 0 },
  countRow: { display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' },
  countNum: { fontSize: '40px', fontWeight: 800, color: '#00e5ff', fontFamily: "'IBM Plex Mono', monospace" },
  countLabel: { fontSize: '13px', color: 'rgba(255,255,255,0.4)' },
  playerRow: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid', transition: 'all 0.2s' },
  playerIndex: { fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: 'rgba(255,255,255,0.25)', minWidth: '24px' },
  playerName: { flex: 1, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' },
  youBadge: { fontSize: '9px', fontFamily: "'IBM Plex Mono', monospace", color: '#00e5ff', background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.1em' },
  dot: { width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, transition: 'all 0.3s' },
  emptyState: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', paddingTop: '20px' },
  startBtn: { width: '100%', padding: '18px', background: 'rgba(0,229,255,0.15)', border: '1px solid rgba(0,229,255,0.6)', borderRadius: '10px', color: '#00e5ff', fontSize: '15px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, fontFamily: "'Barlow Condensed', sans-serif", transition: 'all 0.2s' },
  hint: { textAlign: 'center' as const, fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: "'IBM Plex Mono', monospace", marginBottom: '12px' },
  leaveBtn: { background: 'none', border: '1px solid rgba(255,59,92,0.3)', borderRadius: '6px', color: 'rgba(255,59,92,0.6)', fontSize: '11px', fontFamily: "'IBM Plex Mono', monospace", padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.1em' },
  waitingMsg: { textAlign: 'center' as const, fontSize: '13px', color: 'rgba(255,255,255,0.35)', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', paddingBottom: '16px' },
  contractLink: {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '2px',
  padding: '8px 12px',
  background: 'rgba(0,229,255,0.04)',
  border: '1px solid rgba(0,229,255,0.15)',
  borderRadius: '6px',
  textDecoration: 'none',
  cursor: 'pointer',
},
contractLinkLabel: {
  fontSize: '9px',
  fontFamily: "'IBM Plex Mono', monospace",
  letterSpacing: '0.2em',
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase' as const,
},
contractLinkAddr: {
  fontSize: '12px',
  fontFamily: "'IBM Plex Mono', monospace",
  color: '#00e5ff',
  letterSpacing: '0.05em',
},
};