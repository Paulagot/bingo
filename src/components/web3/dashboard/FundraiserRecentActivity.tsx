
import type { ActivityItem } from '../../../hooks/useFundraiserDashboard'

interface Props {
  items: ActivityItem[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 30)  return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' })
}

function ChainBadge({ chain }: { chain: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    ethereum: { bg: 'rgba(98,126,234,0.18)', text: '#a0aef8' },
    solana:   { bg: 'rgba(99,255,180,0.15)', text: '#63ffb4' },
    polygon:  { bg: 'rgba(130,71,229,0.18)', text: '#c4a9fa' },
    base:     { bg: 'rgba(0,82,255,0.15)',   text: '#80b8ff' },
    bnb:      { bg: 'rgba(240,185,11,0.15)', text: '#f9d26b' },
  }
  const c = colors[chain?.toLowerCase()] ?? { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.6)' }
  return (
    <span style={{
      background: c.bg, color: c.text,
      fontFamily: 'DM Mono, monospace', fontSize: '9px',
      fontWeight: 500, letterSpacing: '0.1em',
      padding: '2px 8px', borderRadius: '4px',
    }}>
      {chain?.toUpperCase() ?? '??'}
    </span>
  )
}

function ActivityIcon({ type, txType }: { type: 'hosted_room' | 'transaction'; txType: string | null }) {
  if (type === 'hosted_room') return <span className="fl-act-icon fl-act-icon--host">&#x2B21;</span>
  switch (txType) {
    case 'join_payment':  return <span className="fl-act-icon fl-act-icon--player">&#x2191;</span>
    case 'prize_payout':  return <span className="fl-act-icon fl-act-icon--prize">&#x25C6;</span>
    case 'extras':        return <span className="fl-act-icon fl-act-icon--extra">&#x2726;</span>
    default:              return <span className="fl-act-icon fl-act-icon--default">&middot;</span>
  }
}

export function FundraiserRecentActivity({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="fl-act-empty">
        <p>No activity yet. Host or join a room to get started.</p>
      </div>
    )
  }

  return (
    <div className="fl-act-root">
      <div className="fl-act-list">
        {items.map((item, i) => (
          <div key={i} className="fl-act-row">
            <div className="fl-act-left">
              <ActivityIcon type={item.activity_type} txType={item.transaction_type} />
              <div className="fl-act-info">
                <p className="fl-act-label">{item.label}</p>
                <div className="fl-act-meta">
                  <ChainBadge chain={item.chain} />
                  {item.tx_hash && (
                    <span className="fl-act-hash" title={item.tx_hash}>
                      {item.tx_hash.slice(0, 8)}&hellip;{item.tx_hash.slice(-6)}
                    </span>
                  )}
                  {item.fee_token && item.amount != null && (
                    <span className="fl-act-token">
                      {Number(item.amount).toFixed(4)} {item.fee_token.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span className="fl-act-time">{timeAgo(item.created_at)}</span>
          </div>
        ))}
      </div>

      <style>{`
        .fl-act-root {
          background: #0f0f18;
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          /* Ensures this element is never hidden behind sticky bars
             when the browser scrolls it into view */
          scroll-margin-top: 168px;
        }
        .fl-act-list { padding: 0.5rem 0; }
        .fl-act-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.5rem;
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          transition: background 0.12s ease;
        }
        .fl-act-row:last-child { border-bottom: none; }
        .fl-act-row:hover { background: rgba(255,255,255,0.04); }
        .fl-act-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .fl-act-icon {
          width: 32px; height: 32px;
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 13px;
          flex-shrink: 0;
        }
        .fl-act-icon--host   { background: rgba(59,190,245,0.15);  color: #3bbef5; }
        .fl-act-icon--player { background: rgba(99,255,180,0.13);  color: #63ffb4; }
        .fl-act-icon--prize  { background: rgba(245,166,35,0.15);  color: #f5a623; }
        .fl-act-icon--extra  { background: rgba(167,139,250,0.15); color: #c4a9fa; }
        .fl-act-icon--default{ background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
        .fl-act-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .fl-act-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          /* improved: was 0.8, now full white for primary content */
          color: rgba(255,255,255,0.92);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fl-act-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fl-act-hash {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          /* improved: was 0.25, now 0.5 */
          color: rgba(255,255,255,0.5);
        }
        .fl-act-token {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          /* improved: was 0.35, now 0.6 */
          color: rgba(255,255,255,0.6);
        }
        .fl-act-time {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          /* improved: was 0.25, now 0.5 */
          color: rgba(255,255,255,0.5);
          white-space: nowrap;
          margin-left: 16px;
          flex-shrink: 0;
        }
        .fl-act-empty {
          padding: 2rem;
          text-align: center;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.45);
        }

        /* Mobile */
        @media (max-width: 480px) {
          .fl-act-row { padding: 0.75rem 1rem; }
          .fl-act-label { font-size: 12px; }
        }
      `}</style>
    </div>
  )
}