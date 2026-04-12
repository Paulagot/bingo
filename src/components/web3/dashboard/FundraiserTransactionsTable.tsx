import  { useState } from 'react'
import type { Transaction } from '../../../hooks/useFundraiserDashboard'

interface Props {
  transactions: Transaction[]
  total: number
  walletAddress: string
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString('en-IE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const TX_LABELS: Record<string, string> = {
  join_payment:      'Join payment',
  prize_payout:      'Prize payout',
  extras:            'Extras',
  host_fee:          'Host fee',
  charity_transfer:  'Charity transfer',
}

// Brighter accent colours for better readability on dark bg
const TX_COLORS: Record<string, string> = {
  join_payment:     '#60c8f5',
  prize_payout:     '#f5b942',
  extras:           '#c4a9fa',
  host_fee:         '#7dffc4',
  charity_transfer: '#ff8fa3',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: 'rgba(99,255,180,0.13)',  text: '#63ffb4' },
  pending:   { bg: 'rgba(245,166,35,0.13)',  text: '#f5a623' },
  failed:    { bg: 'rgba(251,113,133,0.13)', text: '#fb7185' },
}

function TxTypePill({ type }: { type: string }) {
  const color = TX_COLORS[type] ?? 'rgba(255,255,255,0.6)'
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em',
      padding: '2px 8px', borderRadius: '4px',
      background: `${color}1a`, color, border: `0.5px solid ${color}55`,
    }}>
      {TX_LABELS[type] ?? type}
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const s = STATUS_COLORS[status?.toLowerCase()] ?? { bg: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.6)' }
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em',
      padding: '2px 8px', borderRadius: '4px',
      background: s.bg, color: s.text,
    }}>
      {status}
    </span>
  )
}

function DirectionArrow({ direction }: { direction: string }) {
  const isIn = direction === 'in'
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace', fontSize: '14px',
      color: isIn ? '#63ffb4' : 'rgba(255,255,255,0.45)',
    }}>
      {isIn ? '\u2193' : '\u2191'}
    </span>
  )
}

type FilterType = 'all' | 'join_payment' | 'prize_payout' | 'extras'

export function FundraiserTransactionsTable({ transactions, total,  }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter(t => t.transaction_type === filter)

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all',          label: 'All' },
    { key: 'join_payment', label: 'Joins' },
    { key: 'prize_payout', label: 'Prizes' },
    { key: 'extras',       label: 'Extras' },
  ]

  if (transactions.length === 0) {
    return (
      <div style={{
        padding: '2rem', textAlign: 'center',
        fontFamily: 'DM Mono, monospace', fontSize: '12px',
        color: 'rgba(255,255,255,0.45)',
      }}>
        No transactions yet.
      </div>
    )
  }

  return (
    <div className="fl-tx-root">
      <div className="fl-tx-toolbar">
        <span className="fl-tx-total">{total} transaction{total !== 1 ? 's' : ''}</span>
        <div className="fl-tx-filters">
          {filters.map(f => (
            <button
              key={f.key}
              className={`fl-tx-filter-btn${filter === f.key ? ' fl-tx-filter-btn--active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="fl-table-scroll">
        <table className="fl-table">
          <thead>
            <tr>
              <th></th>
              <th>Type</th>
              <th>Room</th>
              <th>Chain</th>
              <th>Token amount</th>
              <th>EUR value</th>
              <th>Status</th>
              <th>Date</th>
              <th>Tx hash</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tx => (
              <tr key={tx.id}>
                <td style={{ paddingRight: 0 }}>
                  <DirectionArrow direction={tx.direction} />
                </td>
                <td><TxTypePill type={tx.transaction_type} /></td>
                <td>
                  <span className="fl-td-room">{tx.room_id.slice(0, 8)}&hellip;</span>
                </td>
                <td>
                  <span className="fl-td-chain">{tx.chain?.toUpperCase()}</span>
                </td>
                <td className="fl-td-mono fl-td-right">
                  {tx.amount != null
                    ? `${Number(tx.amount).toFixed(4)} ${tx.fee_token?.toUpperCase() ?? ''}`
                    : '\u2014'}
                </td>
                <td className="fl-td-mono fl-td-right fl-td-eur">
                  {tx.amount_eur != null ? fmtEur(tx.amount_eur) : '\u2014'}
                </td>
                <td><StatusPill status={tx.status} /></td>
                <td className="fl-td-mono fl-td-date">{fmtDate(tx.created_at)}</td>
                <td>
                  {tx.tx_hash ? (
                    <span className="fl-td-hash" title={tx.tx_hash}>
                      {tx.tx_hash.slice(0, 8)}&hellip;{tx.tx_hash.slice(-6)}
                    </span>
                  ) : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .fl-tx-root {
          background: #0f0f18;
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
          /* Never hidden behind sticky bars on programmatic scroll */
          scroll-margin-top: 168px;
        }
        .fl-tx-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 0.5px solid rgba(255,255,255,0.07);
          flex-wrap: wrap;
          gap: 8px;
        }
        .fl-tx-total {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          /* improved: was 0.3, now 0.55 */
          color: rgba(255,255,255,0.55);
        }
        .fl-tx-filters { display: flex; gap: 6px; flex-wrap: wrap; }
        .fl-tx-filter-btn {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.06em;
          padding: 4px 12px;
          border-radius: 6px;
          border: 0.5px solid rgba(255,255,255,0.15);
          background: transparent;
          /* improved: was 0.35, now 0.6 */
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .fl-tx-filter-btn:hover {
          border-color: rgba(255,255,255,0.35);
          color: rgba(255,255,255,0.9);
        }
        .fl-tx-filter-btn--active {
          background: rgba(59,190,245,0.15);
          border-color: rgba(59,190,245,0.45);
          color: #60c8f5;
        }
        .fl-table-scroll { overflow-x: auto; }
        .fl-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .fl-table thead tr { border-bottom: 0.5px solid rgba(255,255,255,0.08); }
        .fl-table th {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          /* improved: was 0.25, now 0.5 */
          color: rgba(255,255,255,0.5);
          padding: 0.75rem 1rem;
          text-align: left;
          white-space: nowrap;
        }
        .fl-table tbody tr {
          border-bottom: 0.5px solid rgba(255,255,255,0.05);
          transition: background 0.1s ease;
        }
        .fl-table tbody tr:last-child { border-bottom: none; }
        .fl-table tbody tr:hover { background: rgba(255,255,255,0.04); }
        .fl-table td { padding: 0.75rem 1rem; white-space: nowrap; }
        .fl-td-mono {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.8);
        }
        .fl-td-right { text-align: right; }
        /* improved: was 0.7, now 0.9 */
        .fl-td-eur { color: rgba(255,255,255,0.9); font-weight: 500; }
        .fl-td-room {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          /* improved: was 0.3, now 0.55 */
          color: rgba(255,255,255,0.55);
        }
        .fl-td-chain {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          /* improved: was 0.4, now 0.65 */
          color: rgba(255,255,255,0.65);
          letter-spacing: 0.08em;
        }
        .fl-td-date {
          font-size: 11px;
          /* improved: was 0.35, now 0.6 */
          color: rgba(255,255,255,0.6);
        }
        .fl-td-hash {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          /* improved: was 0.25, now 0.5 */
          color: rgba(255,255,255,0.5);
        }

        /* Mobile: horizontal scroll with visible scrollbar hint */
        @media (max-width: 640px) {
          .fl-tx-toolbar { padding: 0.75rem 1rem; }
          .fl-table td, .fl-table th { padding: 0.625rem 0.75rem; }
        }
      `}</style>
    </div>
  )
}