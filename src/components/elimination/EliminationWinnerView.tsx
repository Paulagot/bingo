import React, { useEffect, useState } from 'react';
import type { RoundResult, EliminationPlayer } from './types/elimination';
import { formatScore } from './utils/eliminationHelpers';
import { FONT_DISPLAY, FONT_BODY, GOLD, DANGER, BASE_BG } from './utils/designTokens';
import { Web3Provider } from '../Web3Provider';
import { EliminationFinalizeSection } from './EliminationFinalizeSection';
import { getTokenByMint } from '../../chains/solana/config/solanaTokenConfig';
import { FeedbackModal } from '../feedback/FeedbackModal';

interface Web3RoomData {
  paymentMode: string;
  roomPda: string;
  feeMint: string;
  entryFee: number;
  solanaCluster: 'devnet' | 'mainnet';
  charityOrgId: number | null;
  onChainRoomId: string;
}

interface Props {
  winnerId: string;
  winnerName: string;
  finalStandings: RoundResult[];
  players: EliminationPlayer[];
  localPlayerId: string;
  /** Called when a non-host player closes the winner screen */
  onClose?: () => void;
  /** Called when the host clicks "Start Reconciliation" — web2 only */
  onStartReconciliation?: () => void;
  autoCloseSeconds?: number;
  // ── web3 ──
  isHost?: boolean;
  hostId?: string;
  roomId?: string;
  roomData?: Web3RoomData | null;
  // ── web2 prize sponsor ──
  prizeSponsor?: string | null;
  // ── feedback ──
  clubId?: number;
}

// ── Prize breakdown card (web3 rooms only) ────────────────────────────────────
const PrizeInfo: React.FC<{
  roomData: Web3RoomData;
  totalPlayers: number;
  isWinner: boolean;
  finalized?: boolean;
}> = ({ roomData, totalPlayers, isWinner, finalized = false }) => {
  const tokenConfig  = getTokenByMint(roomData.feeMint);
  const decimals     = tokenConfig?.decimals ?? 6;
  const tokenSymbol  = tokenConfig?.code ?? 'tokens';
  const totalPool    = (totalPlayers * roomData.entryFee) / Math.pow(10, decimals);
  const fmt = (n: number) => n.toFixed(4);
  const rows: [string, number][] = [
    ['Winner', totalPool * 0.30], ['Host',    totalPool * 0.20],
    ['Charity', totalPool * 0.35], ['Platform', totalPool * 0.15],
  ];

  return (
    <div style={p.card}>
      <div style={p.header}>
        <span style={p.headerLabel}>Prize pool</span>
        {finalized && <span style={p.pill}>Distributed ✓</span>}
      </div>
      {isWinner && (
        <div style={p.spotlight}>
          <div style={p.spotlightEyebrow}>Your winnings</div>
          <div style={p.spotlightAmount}>{fmt(totalPool * 0.30)} {tokenSymbol}</div>
          <div style={p.spotlightSub}>30% of {fmt(totalPool)} {tokenSymbol} pool · {totalPlayers} players</div>
        </div>
      )}
      <div style={p.breakdown}>
        {rows.map(([label, amount], i) => (
          <div key={label} style={p.row}>
            <span style={{ ...p.rowLabel, color: i === 0 && isWinner ? GOLD : 'rgba(255,255,255,0.4)' }}>{label}</span>
            <div style={p.rowRight}>
              <span style={{ ...p.rowAmount, color: i === 0 && isWinner ? GOLD : 'rgba(255,255,255,0.75)' }}>
                {fmt(amount)} {tokenSymbol}
              </span>
              <span style={p.rowPct}>{[30, 20, 35, 15][i]}%</span>
            </div>
          </div>
        ))}
      </div>
      {!isWinner && !finalized && (
        <div style={p.pendingNote}>Waiting for host to distribute prizes on-chain</div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
export const EliminationWinnerView: React.FC<Props> = ({
  winnerId, winnerName, finalStandings, players, localPlayerId,
  onClose, onStartReconciliation, autoCloseSeconds = 120,
  isHost = false, hostId, roomId, roomData,
  prizeSponsor, clubId,
}) => {
  const [countdown, setCountdown]       = useState(autoCloseSeconds);
  const [finalized, setFinalized]       = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const isWinner   = localPlayerId === winnerId;
  const playerMap  = Object.fromEntries(players.map(p => [p.playerId, p]));
  const isWeb3Room = roomData?.paymentMode === 'web3';

  // ── Who sees feedback ─────────────────────────────────────────────────────
  // Everyone (including the host on web2) gets a feedback modal.
  // It renders once the winner screen is shown and pauses any auto-close.
  const showFeedback = !!roomId && !feedbackDone;

  // ── Auto-close (non-host players only) ───────────────────────────────────
  // The host never auto-closes — they must click "Start Reconciliation".
  // Auto-close is also paused while the feedback modal is open.
  const shouldAutoClose = !!onClose && !isHost && !showFeedback;

  useEffect(() => {
    if (!shouldAutoClose) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(interval); onClose?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [shouldAutoClose, onClose]);

  // Reset countdown when feedback closes so the player has the full time left
  const handleFeedbackClose = () => {
    setFeedbackDone(true);
    setCountdown(autoCloseSeconds);
  };

  return (
    <div style={{ ...s.page, background: BASE_BG }}>
      {/* Crown */}
      <div style={s.crown}>◆</div>
      <div style={s.eyebrow}>{isWinner ? 'You won the game' : 'Game over'}</div>
      <h1 style={{ ...s.name, fontFamily: FONT_DISPLAY }}>{winnerName}</h1>
      <div style={s.badge}>Champion</div>

      {isWinner && (
        <p style={{ ...s.congrats, fontFamily: FONT_BODY }}>
          You are the last one standing. Well played.
        </p>
      )}

      {/* ── Web2 sponsor ── */}
      {!isWeb3Room && prizeSponsor && (
        <div style={s.sponsorBadge}>
          Sponsored by <span style={s.sponsorName}>{prizeSponsor}</span>
        </div>
      )}

      {/* ── Web3 prize pool info ── */}
      {isWeb3Room && roomData && (
        <PrizeInfo roomData={roomData} totalPlayers={players.length} isWinner={isWinner} finalized={finalized} />
      )}

      {/* ── Web3 finalize section — host only ── */}
      {isHost && isWeb3Room && roomData && roomId && hostId && (
        <Web3Provider force={true}>
          <EliminationFinalizeSection
            roomId={roomId} hostId={hostId} winnerPlayerId={winnerId}
            roomData={{ ...roomData, totalPlayers: players.length }}
            onComplete={() => setFinalized(true)}
          />
        </Web3Provider>
      )}

      {/* ── Feedback modal — everyone sees this, pauses countdowns ── */}
      {showFeedback && (
        <FeedbackModal
          roomId={roomId!}
          clubId={clubId}
          gameType="elimination"
          onClose={handleFeedbackClose}
        />
      )}

      {/* Final standings */}
      <div style={s.standings}>
        <div style={{ ...s.standingsLabel, fontFamily: FONT_BODY }}>Final standings</div>
        <div style={s.list}>
          {finalStandings.map(r => {
            const name    = playerMap[r.playerId]?.name ?? r.playerId;
            const isLocal = r.playerId === localPlayerId;
            const isWin   = r.playerId === winnerId;
            return (
              <div key={r.playerId} style={{
                ...s.row,
                background: isWin ? 'rgba(255,215,0,0.06)' : isLocal ? 'rgba(255,255,255,0.04)' : 'transparent',
                borderColor: isWin ? 'rgba(255,215,0,0.25)' : isLocal ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
              }}>
                <span style={{ ...s.rank, fontFamily: FONT_DISPLAY, color: isWin ? GOLD : 'rgba(255,255,255,0.3)', fontSize: '20px' }}>
                  {isWin ? '◆' : `#${r.rank}`}
                </span>
                <span style={{ ...s.rowName, fontFamily: FONT_BODY }}>
                  {name}
                  {isLocal && !isWin && <span style={s.youTag}>you</span>}
                  {isWin && <span style={{ marginLeft: '8px', fontSize: '14px' }}>👑</span>}
                </span>
                <span style={{ ...s.rowScore, fontFamily: FONT_BODY }}>{formatScore(r.score)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Host footer: Start Reconciliation (web2) or Return to lobby (web3 after finalize) ── */}
      {isHost && !isWeb3Room && feedbackDone && (
        <div style={s.closeFoot}>
          <button
            onClick={onStartReconciliation}
            style={{ ...s.closeBtn, ...s.reconcileBtn, fontFamily: FONT_BODY }}
          >
            Start Reconciliation
          </button>
          <p style={s.hostHint}>Review payments and approve the final count</p>
        </div>
      )}

      {/* Show the reconciliation button even before feedback is done,
          but only after a short delay so the host sees the winner screen first.
          We use a subtle secondary style so it doesn't distract from the winner reveal. */}
      {isHost && !isWeb3Room && !feedbackDone && (
        <div style={s.closeFoot}>
          <button
            onClick={onStartReconciliation}
            style={{ ...s.closeBtn, ...s.reconcileBtnSecondary, fontFamily: FONT_BODY }}
          >
            Skip to Reconciliation
          </button>
          <p style={s.hostHint}>You can also wait for the feedback form to complete first</p>
        </div>
      )}

      {/* Host web3 — manual close after finalize */}
      {isHost && isWeb3Room && finalized && (
        <div style={s.closeFoot}>
          <button onClick={onClose} style={{ ...s.closeBtn, fontFamily: FONT_BODY }}>
            Return to lobby
          </button>
        </div>
      )}

      {/* ── Non-host player footer: auto-close after feedback ── */}
      {!isHost && onClose && feedbackDone && (
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

// ── Prize card styles ─────────────────────────────────────────────────────────
const p: Record<string, React.CSSProperties> = {
  card: { width: '100%', maxWidth: '340px', background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.18)', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLabel: { fontSize: '11px', letterSpacing: '0.16em', color: 'rgba(255,215,0,0.65)', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif" },
  pill: { fontSize: '10px', padding: '2px 8px', borderRadius: '99px', background: 'rgba(0,210,120,0.12)', border: '1px solid rgba(0,210,120,0.3)', color: 'rgba(0,210,120,0.85)', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.04em' },
  spotlight: { display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '8px', padding: '12px', gap: '2px' },
  spotlightEyebrow: { fontSize: '10px', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif" },
  spotlightAmount: { fontSize: '28px', fontWeight: 700, color: GOLD, fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif", letterSpacing: '0.04em', lineHeight: 1.1 },
  spotlightSub: { fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', system-ui, sans-serif", textAlign: 'center' },
  breakdown: { display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: "'Inter', system-ui, sans-serif", fontSize: '12px' },
  rowLabel: { color: 'rgba(255,255,255,0.4)' },
  rowRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  rowAmount: { fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 },
  rowPct: { fontSize: '11px', color: 'rgba(255,255,255,0.22)', minWidth: '28px', textAlign: 'right' as const },
  pendingNote: { fontSize: '11px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' as const, fontFamily: "'Inter', system-ui, sans-serif", fontStyle: 'italic' },
};

// ── Main view styles ──────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 24px 24px', color: '#ffffff', overflowY: 'auto' },
  crown: { fontSize: '52px', color: GOLD, lineHeight: 1, marginBottom: '16px', filter: `drop-shadow(0 0 24px ${GOLD}99)` },
  eyebrow: { fontSize: '13px', letterSpacing: '0.18em', color: `${GOLD}99`, textTransform: 'uppercase', marginBottom: '8px', fontFamily: "'Inter', system-ui, sans-serif" },
  name: { fontSize: '56px', letterSpacing: '0.04em', margin: '0 0 12px', textAlign: 'center', color: '#ffffff', lineHeight: 1, textTransform: 'uppercase' },
  badge: { padding: '5px 16px', borderRadius: '4px', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', color: GOLD, fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: "'Inter', system-ui, sans-serif", marginBottom: '16px' },
  congrats: { fontSize: '15px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: '8px' },
  sponsorBadge: { fontSize: '12px', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', marginBottom: '20px', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' },
  sponsorName: { color: 'rgba(255,255,255,0.65)', fontWeight: 600 },
  standings: { width: '100%', maxWidth: '340px', marginTop: '8px' },
  standingsLabel: { fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', marginBottom: '8px' },
  list: { display: 'flex', flexDirection: 'column', gap: '3px' },
  row: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid' },
  rank: { minWidth: '32px' },
  rowName: { flex: 1, fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center' },
  youTag: { marginLeft: '8px', fontSize: '10px', color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: '3px', letterSpacing: '0.05em', fontFamily: "'Inter', system-ui, sans-serif" },
  rowScore: { fontSize: '13px', color: 'rgba(255,255,255,0.4)' },
  closeFoot: { marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '340px', paddingBottom: '24px' },
  closeBtn: { width: '100%', padding: '16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '10px', color: '#ffffff', fontSize: '15px', fontWeight: 600, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' },
  reconcileBtn: { background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc' },
  reconcileBtnSecondary: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontSize: '13px', padding: '12px', letterSpacing: '0.04em' },
  hostHint: { fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center' as const, margin: 0, fontFamily: "'Inter', system-ui, sans-serif" },
  autoClose: { fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
};