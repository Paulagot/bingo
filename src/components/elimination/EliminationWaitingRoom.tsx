import { useState } from 'react';
import type { EliminationPlayer } from './types/elimination';
import { QRCodeSVG } from './utils/qrCode';

interface Props {
  roomId: string;
  players: EliminationPlayer[];
  isHost: boolean;
  localPlayerId: string;
  onStart: () => void;
  onLeave?: () => void;
  minPlayers?: number;
}

export const EliminationWaitingRoom: React.FC<Props> = ({
  roomId, players, isHost, localPlayerId, onStart, onLeave, minPlayers = 2,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const canStart = players.length >= minPlayers;
  const joinUrl = `${window.location.origin}/elimination/join/${roomId}`;

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
        {onLeave && (
          <button onClick={onLeave} style={styles.leaveBtn}>Leave</button>
        )}
      </div>

      {isHost && (
        <div style={styles.sharePanel}>
          <div style={styles.shareLabel}>Share with players</div>

          <div style={styles.roomCodeBox}>
            <span style={styles.roomCodeLabel}>Room Code</span>
            <span style={styles.roomCode}>{roomId}</span>
          </div>

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
                <QRCodeSVG value={joinUrl} size={25} cellSize={9} fgColor="#00e5ff" bgColor="#080c14" />
              </div>
              <p style={styles.qrHint}>Players scan to join on mobile</p>
              <p style={styles.qrDisclaimer}>
                Visual placeholder — install <code>qrcode</code> npm package for scannable QR codes
              </p>
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
            borderColor: p.playerId === localPlayerId ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.06)',
            background: p.playerId === localPlayerId ? 'rgba(0,229,255,0.06)' : 'rgba(255,255,255,0.02)',
          }}>
            <span style={styles.playerIndex}>#{i + 1}</span>
            <span style={styles.playerName}>
              {p.name}
              {p.playerId === localPlayerId && <span style={styles.youBadge}>you</span>}
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
        <div className="mt-auto">
          {!canStart && <p style={styles.hint}>Need at least {minPlayers} players to start</p>}
          <button onClick={onStart} disabled={!canStart} style={{
            ...styles.startBtn,
            opacity: canStart ? 1 : 0.35,
            cursor: canStart ? 'pointer' : 'default',
            boxShadow: canStart ? '0 0 30px rgba(0,229,255,0.25)' : 'none',
          }}>
            Start Game
          </button>
        </div>
      )}

      {!isHost && (
        <div style={styles.waitingMsg}>Waiting for host to start…</div>
      )}
    </div>
  );
};

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
  qrDisclaimer: { fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'IBM Plex Mono', monospace", margin: 0, textAlign: 'center' },
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
};