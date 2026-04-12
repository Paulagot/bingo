import React from 'react'
import type { ImpactHeadline, HostedOverview, PlayerOverview } from '../../../hooks/useFundraiserDashboard'

interface Props {
  headline: ImpactHeadline
  hosted: HostedOverview
  player: PlayerOverview
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const fmtShort = (n: number) =>
  n >= 1000
    ? new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : fmt(n)

const num = (n: number) => new Intl.NumberFormat('en-IE').format(Math.round(n))

export function FundraiserHeadlineStats({ headline, hosted, player }: Props) {
  const hasHosted = hosted.rooms_launched > 0
  const hasPlayed = player.rooms_joined > 0

  return (
    <div className="fl-stats-root">

      {/* ── Headline impact ── */}
      <div className="fl-headline">
        <div className="fl-headline-glow" />
        <div className="fl-headline-inner">
          <p className="fl-headline-label">Total charity impact</p>
          <h2 className="fl-headline-value">{fmtShort(headline.total_charity_impact_eur)}</h2>
          <div className="fl-headline-breakdown">
            {hasHosted && (
              <span className="fl-breakdown-pill fl-pill-host">
                <span className="fl-pill-dot" />
                {fmtShort(headline.hosted_charity_eur)} as host
              </span>
            )}
            {hasPlayed && (
              <span className="fl-breakdown-pill fl-pill-player">
                <span className="fl-pill-dot" />
                {fmtShort(headline.player_donation_eur)} as supporter
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── As Host ── */}
      {hasHosted ? (
        <div className="fl-role-section">
          <div className="fl-role-header">
            <div className="fl-role-badge fl-role-badge--host">HOST</div>
            <span className="fl-role-title">Your impact as a host</span>
          </div>
          <div className="fl-cards-grid">
            <StatCard
              label="Charity raised"
              value={fmtShort(hosted.charity_amount_eur)}
              sub={`across ${num(hosted.rooms_launched)} room${hosted.rooms_launched !== 1 ? 's' : ''}`}
              accent="host"
              icon="♥"
            />
            <StatCard
              label="Players reached"
              value={num(hosted.total_players)}
              sub={`avg ${Math.round(hosted.avg_players_per_room)}/room`}
              accent="host"
              icon="◎"
            />
            <StatCard
              label="Unique supporters"
              value={num(hosted.unique_supporter_wallets)}
              sub="distinct wallets"
              accent="host"
              icon="◈"
            />
            <StatCard
              label="Charities supported"
              value={num(hosted.distinct_charities_count)}
              sub={hosted.charity_names.slice(0, 2).map(c => c.charity_name).join(', ')}
              accent="host"
              icon="◇"
            />
          </div>
        </div>
      ) : (
        <div className="fl-empty-role">
          <div className="fl-role-badge fl-role-badge--host">HOST</div>
          <p className="fl-empty-text">Host your first room to see your impact here</p>
        </div>
      )}

      {/* ── As Supporter ── */}
      {hasPlayed ? (
        <div className="fl-role-section">
          <div className="fl-role-header">
            <div className="fl-role-badge fl-role-badge--player">SUPPORTER</div>
            <span className="fl-role-title">Your impact as a supporter</span>
          </div>
          <div className="fl-cards-grid">
            <StatCard
              label="Donation given"
              value={fmtShort(player.total_donation_eur)}
              sub="via entry fees + uplift"
              accent="player"
              icon="↑"
            />
            <StatCard
              label="Rooms joined"
              value={num(player.rooms_joined)}
              sub={player.distinct_chains.join(' · ') || 'across chains'}
              accent="player"
              icon="⬡"
            />
            <StatCard
              label="Extras spent"
              value={fmtShort(player.total_extras_eur)}
              sub="in-game extras"
              accent="player"
              icon="✦"
            />
            <StatCard
              label="Prizes received"
              value={fmtShort(player.prize_payouts_received_eur)}
              sub="total winnings"
              accent="player"
              icon="◆"
            />
          </div>
        </div>
      ) : (
        <div className="fl-empty-role">
          <div className="fl-role-badge fl-role-badge--player">SUPPORTER</div>
          <p className="fl-empty-text">Join a room to start your supporter impact</p>
        </div>
      )}

      <style>{`
        .fl-stats-root {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* Headline */
        .fl-headline {
          position: relative;
          border-radius: 20px;
          background: #0a0a0f;
          overflow: hidden;
          padding: 2.5rem 2rem;
        }
        .fl-headline-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,255,180,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .fl-headline-inner {
          position: relative;
          z-index: 1;
          text-align: center;
        }
        .fl-headline-label {
          font-family: 'DM Mono', 'Courier New', monospace;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(99,255,180,0.7);
          margin: 0 0 0.75rem;
        }
        .fl-headline-value {
          font-family: 'Syne', 'Arial Black', sans-serif;
          font-size: clamp(2.8rem, 6vw, 4.5rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          color: #fff;
          margin: 0 0 1.25rem;
          line-height: 1;
        }
        .fl-headline-breakdown {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .fl-breakdown-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          padding: 5px 14px;
          border-radius: 100px;
          letter-spacing: 0.02em;
        }
        .fl-pill-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        .fl-pill-host {
          background: rgba(59,190,245,0.12);
          color: #7dd8fa;
          border: 0.5px solid rgba(59,190,245,0.25);
        }
        .fl-pill-host .fl-pill-dot { background: #3bbef5; }
        .fl-pill-player {
          background: rgba(99,255,180,0.10);
          color: #63ffb4;
          border: 0.5px solid rgba(99,255,180,0.22);
        }
        .fl-pill-player .fl-pill-dot { background: #63ffb4; }

        /* Role sections */
        .fl-role-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .fl-role-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .fl-role-badge {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.16em;
          padding: 3px 10px;
          border-radius: 4px;
        }
        .fl-role-badge--host {
          background: rgba(59,190,245,0.12);
          color: #3bbef5;
          border: 0.5px solid rgba(59,190,245,0.3);
        }
        .fl-role-badge--player {
          background: rgba(99,255,180,0.10);
          color: #63ffb4;
          border: 0.5px solid rgba(99,255,180,0.25);
        }
        .fl-role-title {
          font-family: 'Syne', sans-serif;
          font-size: 14px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.01em;
        }
        .fl-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }
        @media (max-width: 768px) {
          .fl-cards-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
        }

        /* Empty states */
        .fl-empty-role {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          border: 0.5px dashed rgba(255,255,255,0.1);
        }
        .fl-empty-text {
          font-size: 13px;
          color: rgba(255,255,255,0.3);
          font-family: 'DM Mono', monospace;
          margin: 0;
        }
      `}</style>
    </div>
  )
}

// ─── Individual stat card ─────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  sub: string
  accent: 'host' | 'player'
  icon: string
}

function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  const isHost = accent === 'host'
  return (
    <div className={`fl-stat-card fl-stat-card--${accent}`}>
      <div className="fl-stat-icon">{icon}</div>
      <p className="fl-stat-label">{label}</p>
      <p className="fl-stat-value">{value}</p>
      <p className="fl-stat-sub">{sub}</p>
      <style>{`
        .fl-stat-card {
          border-radius: 14px;
          padding: 1.25rem;
          position: relative;
          overflow: hidden;
          border: 0.5px solid rgba(255,255,255,0.07);
          background: #0f0f18;
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .fl-stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.14);
        }
        .fl-stat-card--host::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #3bbef5, transparent);
          opacity: 0.7;
        }
        .fl-stat-card--player::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #63ffb4, transparent);
          opacity: 0.7;
        }
        .fl-stat-icon {
          font-size: 14px;
          margin-bottom: 0.75rem;
          opacity: 0.5;
          color: ${isHost ? '#3bbef5' : '#63ffb4'};
        }
        .fl-stat-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
          margin: 0 0 6px;
        }
        .fl-stat-value {
          font-family: 'Syne', sans-serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 4px;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .fl-stat-sub {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.3);
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  )
}