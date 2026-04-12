import React, { useEffect, useState } from 'react';
import type { RoundResult, EliminationPlayer } from './types/elimination';
import { formatScore } from './utils/eliminationHelpers';
import { FONT_DISPLAY, FONT_BODY, GOLD, DANGER, BASE_BG } from './utils/designTokens';
import { Web3Provider } from '../Web3Provider';
import { EliminationFinalizeSection } from './EliminationFinalizeSection';
import { getTokenByMint } from '../../chains/solana/config/solanaTokenConfig';

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
  onClose?: () => void;
  autoCloseSeconds?: number;
  // ── web3 additions ──
  isHost?: boolean;
  hostId?: string;
  roomId?: string;
  roomData?: Web3RoomData | null;
}

// ── Prize breakdown card (shown to winner and observers in web3 rooms) ────────
interface PrizeInfoProps {
  roomData: Web3RoomData;
  totalPlayers: number;
  isWinner: boolean;
  finalized?: boolean;
}

const PrizeInfo: React.FC<PrizeInfoProps> = ({
  roomData,
  totalPlayers,
  isWinner,
  finalized = false,
}) => {
  const tokenConfig   = getTokenByMint(roomData.feeMint);
  const decimals      = tokenConfig?.decimals ?? 6;
  const tokenSymbol   = tokenConfig?.code ?? 'tokens';
  const totalPoolRaw  = totalPlayers * roomData.entryFee;
  const totalPool     = totalPoolRaw / Math.pow(10, decimals);

  const fmt = (n: number) => n.toFixed(4);

  const rows: [string, number][] = [
    ['Winner',   totalPool * 0.30],
    ['Host',     totalPool * 0.20],
    ['Charity',  totalPool * 0.35],
    ['Platform', totalPool * 0.15],
  ];

  return (
    <div style={p.card}>
      {/* Header */}
      <div style={p.header}>
        <span style={p.headerLabel}>Prize pool</span>
        {finalized && <span style={p.pill}>Distributed ✓</span>}
      </div>

      {/* Winner spotlight */}
{isWinner && (
  <div style={p.spotlight}>
    <div style={p.spotlightEyebrow}>Your winnings</div>
    <div style={p.spotlightAmount}>
      {fmt(totalPool * 0.30)} {tokenSymbol}
    </div>
    <div style={p.spotlightSub}>
      30% of {fmt(totalPool)} {tokenSymbol} pool
      {' · '}
      {totalPlayers} players
    </div>
  </div>
)}

      {/* Breakdown */}
      <div style={p.breakdown}>
        {rows.map(([label, amount], i) => (
          <div key={label} style={p.row}>
            <span style={{ ...p.rowLabel, color: i === 0 && isWinner ? GOLD : 'rgba(255,255,255,0.4)' }}>
              {label}
            </span>
            <div style={p.rowRight}>
              <span style={{ ...p.rowAmount, color: i === 0 && isWinner ? GOLD : 'rgba(255,255,255,0.75)' }}>
                {fmt(amount)} {tokenSymbol}
              </span>
              <span style={p.rowPct}>
                {[30, 20, 35, 15][i]}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pending note — only shown to non-host, non-winner observers before finalize */}
      {!isWinner && !finalized && (
        <div style={p.pendingNote}>
          Waiting for host to distribute prizes on-chain
        </div>
      )}
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
export const EliminationWinnerView: React.FC<Props> = ({
  winnerId,
  winnerName,
  finalStandings,
  players,
  localPlayerId,
  onClose,
  autoCloseSeconds = 60,
  isHost = false,
  hostId,
  roomId,
  roomData,
}) => {
  const [countdown, setCountdown] = useState(autoCloseSeconds);
  const [finalized, setFinalized] = useState(false);

  const isWinner     = localPlayerId === winnerId;
  const playerMap    = Object.fromEntries(players.map(p => [p.playerId, p]));
  const isWeb3Room   = roomData?.paymentMode === 'web3';
  const totalPlayers = players.length;

  // Auto-close countdown — pause if host needs to finalize
  const shouldAutoClose = onClose && !(isHost && isWeb3Room && !finalized);

  useEffect(() => {
    if (!shouldAutoClose) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [shouldAutoClose, onClose]);

  const handleFinalized = () => {
    setFinalized(true);
    // Resume the auto-close countdown for the host now that finalize is done
  };

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

      {/* ── Prize pool info (all players in web3 rooms) ── */}
      {isWeb3Room && roomData && (
        <PrizeInfo
          roomData={roomData}
          totalPlayers={totalPlayers}
          isWinner={isWinner}
          finalized={finalized}
        />
      )}

      {/* ── Web3 finalize section — host only ── */}
      {isHost && isWeb3Room && roomData && roomId && hostId && !finalized && (
        <Web3Provider force={true}>
          <EliminationFinalizeSection
            roomId={roomId}
            hostId={hostId}
            winnerPlayerId={winnerId}
            roomData={{ ...roomData, totalPlayers }}
            onComplete={() => {
              handleFinalized();
              onClose?.();
            }}
          />
        </Web3Provider>
      )}

      {/* Final standings */}
      <div style={s.standings}>
        <div style={{ ...s.standingsLabel, fontFamily: FONT_BODY }}>
          Final standings
        </div>
        <div style={s.list}>
          {finalStandings.map(r => {
            const name    = playerMap[r.playerId]?.name ?? r.playerId;
            const isLocal = r.playerId === localPlayerId;
            const isWin   = r.playerId === winnerId;

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
                  {isLocal && !isWin && <span style={s.youTag}>you</span>}
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
      {onClose && shouldAutoClose && (
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

      {/* Host on web3 — manual close after finalize */}
      {onClose && isHost && isWeb3Room && finalized && (
        <div style={s.closeFoot}>
          <button onClick={onClose} style={{ ...s.closeBtn, fontFamily: FONT_BODY }}>
            Return to lobby
          </button>
        </div>
      )}
    </div>
  );
};

// ── Prize card styles ─────────────────────────────────────────────────────────
const p: Record<string, React.CSSProperties> = {
  card: {
    width: '100%',
    maxWidth: '340px',
    background: 'rgba(255,215,0,0.04)',
    border: '1px solid rgba(255,215,0,0.18)',
    borderRadius: '12px',
    padding: '16px 18px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontSize: '11px',
    letterSpacing: '0.16em',
    color: 'rgba(255,215,0,0.65)',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  pill: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '99px',
    background: 'rgba(0,210,120,0.12)',
    border: '1px solid rgba(0,210,120,0.3)',
    color: 'rgba(0,210,120,0.85)',
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '0.04em',
  },
  spotlight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,215,0,0.06)',
    border: '1px solid rgba(255,215,0,0.1)',
    borderRadius: '8px',
    padding: '12px',
    gap: '2px',
  },
  spotlightEyebrow: {
    fontSize: '10px',
    letterSpacing: '0.14em',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  spotlightAmount: {
    fontSize: '28px',
    fontWeight: 700,
    color: GOLD,
    fontFamily: "'Barlow Condensed', 'Bebas Neue', sans-serif",
    letterSpacing: '0.04em',
    lineHeight: 1.1,
  },
  spotlightSub: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.25)',
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: 'center',
  },
  breakdown: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    paddingTop: '10px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: '12px',
  },
  rowLabel: {
    color: 'rgba(255,255,255,0.4)',
  },
  rowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  rowAmount: {
    fontFamily: 'monospace',
    fontSize: '12px',
    fontWeight: 600,
  },
  rowPct: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.22)',
    minWidth: '28px',
    textAlign: 'right' as const,
  },
  pendingNote: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center' as const,
    fontFamily: "'Inter', system-ui, sans-serif",
    fontStyle: 'italic',
  },
};

// ── Main view styles ──────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
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
    marginBottom: '8px',
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
  rank: { minWidth: '32px' },
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