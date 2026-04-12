import React from 'react'
import type { HostedOverview } from '../../../hooks/useFundraiserDashboard'

interface Props {
  hosted: HostedOverview
}

const fmtEur = (n: number) =>
  new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    notation: n >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: n >= 10000 ? 1 : 2,
  }).format(n)

interface EarningsCellProps {
  label: string
  value: string
  sub: string
  color: string
}

function EarningsCell({ label, value, sub, color }: EarningsCellProps) {
  return (
    <div className="fl-earn-cell">
      <p className="fl-earn-label">{label}</p>
      <p className="fl-earn-value" style={{ color }}>{value}</p>
      <p className="fl-earn-sub">{sub}</p>
      <style>{`
        .fl-earn-cell { padding: 1.5rem 1.75rem; }
        .fl-earn-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          color: rgba(255,255,255,0.3);
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        .fl-earn-value {
          font-family: 'Syne', sans-serif;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1;
          margin-bottom: 6px;
        }
        .fl-earn-sub {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          margin: 0;
        }
      `}</style>
    </div>
  )
}

export function FundraiserHostEarnings({ hosted }: Props) {
  // Don't render the block at all if the wallet has never hosted
  if (hosted.rooms_launched === 0) return null

  const {
    host_fee_amount_eur,
    avg_host_fee_per_room,
    total_prize_payouts_sent_eur,
    total_raised_eur,
    rooms_launched,
  } = hosted

  return (
    <div className="fl-earn-root">

      <div className="fl-earn-header">
        <span className="fl-earn-badge">HOST</span>
        <span className="fl-earn-title">Host earnings</span>
      </div>

      <div className="fl-earn-card">
        <div className="fl-earn-grid">

          <EarningsCell
            label="Host earnings"
            value={fmtEur(host_fee_amount_eur)}
            sub="your share of the pool"
            color="#3bbef5"
          />

          <div className="fl-earn-divider" />

          <EarningsCell
            label="Avg per room"
            value={fmtEur(avg_host_fee_per_room)}
            sub={`across ${rooms_launched} room${rooms_launched !== 1 ? 's' : ''}`}
            color="rgba(255,255,255,0.75)"
          />

          <div className="fl-earn-divider" />

          <EarningsCell
            label="Prizes facilitated"
            value={fmtEur(total_prize_payouts_sent_eur)}
            sub="winners' pool you distributed"
            color="rgba(245,166,35,0.9)"
          />

          <div className="fl-earn-divider" />

          <EarningsCell
            label="Total pool raised"
            value={fmtEur(total_raised_eur)}
            sub="across all hosted rooms"
            color="rgba(255,255,255,0.45)"
          />

        </div>

        <div className="fl-earn-footer">
          <div className="fl-earn-footnote">
            <span className="fl-earn-dot fl-earn-dot--cyan" />
            <p>Host earnings = your pre-calculated share — split varies by game type</p>
          </div>
          <div className="fl-earn-footnote">
            <span className="fl-earn-dot fl-earn-dot--amber" />
            <p>Prizes facilitated = winners' share — a separate pool, not a cost to you</p>
          </div>
        </div>
      </div>

      <style>{`
        .fl-earn-root {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .fl-earn-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .fl-earn-badge {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.16em;
          padding: 3px 8px;
          border-radius: 4px;
          background: rgba(59,190,245,0.12);
          color: #3bbef5;
          border: 0.5px solid rgba(59,190,245,0.25);
        }
        .fl-earn-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
        }
        .fl-earn-card {
          background: #0f0f1a;
          border: 0.5px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          overflow: hidden;
        }
        .fl-earn-grid {
          display: grid;
          grid-template-columns: 1fr 1px 1fr 1px 1fr 1px 1fr;
          align-items: stretch;
        }
        @media (max-width: 768px) {
          .fl-earn-grid {
            grid-template-columns: 1fr 1px 1fr;
            grid-template-rows: auto 1px auto;
          }
        }
        .fl-earn-divider {
          background: rgba(255,255,255,0.05);
          align-self: stretch;
        }
        .fl-earn-footer {
          border-top: 0.5px solid rgba(255,255,255,0.06);
          padding: 0.875rem 1.75rem;
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .fl-earn-footnote {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .fl-earn-footnote p {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.25);
          margin: 0;
        }
        .fl-earn-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .fl-earn-dot--cyan  { background: #3bbef5; }
        .fl-earn-dot--amber { background: #f5a623; }
      `}</style>
    </div>
  )
}