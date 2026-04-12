import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDisconnect } from '@reown/appkit/react'
import { Trophy, Crosshair } from 'lucide-react'
import { Web3Header } from '../../components/GeneralSite2/Web3Header'
import { useFundraiserDashboard } from '../../hooks/useFundraiserDashboard'
import { FundraiserHeadlineStats } from '../../components/web3/dashboard/FundraiserHeadlineStats'
import { FundraiserImpactCharts } from '../../components/web3/dashboard/FundraiserImpactCharts'
import { FundraiserHostEarnings } from '../../components/web3/dashboard/FundraiserHostEarnings'
import { FundraiserRecentActivity } from '../../components/web3/dashboard/FundraiserRecentActivity'
import { FundraiserHostedRoomsTable } from '../../components/web3/dashboard/FundraiserHostedRoomsTable'
import { FundraiserTransactionsTable } from '../../components/web3/dashboard/FundraiserTransactionsTable'
import { ComingSoonModal } from '../../components/web3/dashboard/ComingSoonModal'
import { MyEventsTab } from '../../components/web3/dashboard/MyEventsTab'


// ─── Fonts ────────────────────────────────────────────────────────────────────
const FONT_LINK = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500&display=swap');
`

// ─── Dynamic base URL ─────────────────────────────────────────────────────────
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '')
  }
  return 'https://fundraisely.ie'
}

// ─── Tab definition (Launch tab removed) ─────────────────────────────────────
type TabId = 'overview' | 'events' | 'hosted' | 'activity' | 'transactions' | 'tools'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',      label: 'Overview' },
  { id: 'events',        label: 'My events' },
  { id: 'hosted',        label: 'Hosted rooms' },
  { id: 'activity',      label: 'My activity' },
  { id: 'transactions',  label: 'Transactions' },
  { id: 'tools',         label: 'Tools' },
]

// ─── JWT decode helper ────────────────────────────────────────────────────────
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    const b64 = parts[1]
    if (!b64) return null
    return JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FundraisersDashboardPage() {
  const navigate = useNavigate()
  const { disconnect } = useDisconnect()

  const token   = sessionStorage.getItem('web3_fundraiser_session') ?? ''
  const payload = decodeJwtPayload(token)
  const walletAddress = (payload?.wallet_address as string) ?? ''
  const chainFamily   = (payload?.chain_family   as string) ?? ''

  // Redirect if no session
  React.useEffect(() => {
    if (!token) navigate('/web3', { replace: true })
  }, [token, navigate])

  const [activeTab, setActiveTab]           = useState<TabId>('overview')
  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState('')

  const { data, loading, error, refetch } = useFundraiserDashboard()

  function handleDisconnect() {
    disconnect()
    sessionStorage.removeItem('web3_fundraiser_session')
    navigate('/web3', { replace: true })
  }

  function openComingSoon(feature: string) {
    setComingSoonFeature(feature)
    setComingSoonOpen(true)
  }

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}\u2026${walletAddress.slice(-4)}`
    : ''

  const origin = getOrigin()

  return (
    <div className="fl-page">
      <style>{FONT_LINK}</style>

      {/* ── Web3 Header (handles wallet state) ── */}
      <Web3Header />

      {/* ── Sticky launch bar (below fixed header, above tab nav) ── */}
      {/* <div className="fl-launch-bar">
        <div className="fl-launch-bar-inner">
          <span className="fl-launch-label">Launch a room</span>
          <div className="fl-launch-buttons">
            <a
              href={`${origin}/web3/quiz`}
              className="fl-launch-btn fl-launch-btn--quiz"
            >
              <Trophy className="fl-launch-btn-icon" />
              Host Quiz
            </a>
            <a
              href={`${origin}/web3/elimination`}
              className="fl-launch-btn fl-launch-btn--elim"
            >
              <Crosshair className="fl-launch-btn-icon" />
              Host Elimination
            </a>
          </div>
        </div>
      </div> */}

      {/* ── Tab nav ── */}
      <nav className="fl-tabnav">
        <div className="fl-tabnav-inner">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`fl-tab${activeTab === tab.id ? ' fl-tab--active' : ''}`}
              onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: 'instant' }) }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="fl-main">
        {loading && <LoadingState />}
        {!loading && error && <ErrorState error={error} onRetry={refetch} />}

        {!loading && !error && data && (
          <>
            {activeTab === 'overview' && (
              <div className="fl-tab-content">
                <FundraiserHeadlineStats
                  headline={data.impactHeadline}
                  hosted={data.hostedOverview}
                  player={data.playerOverview}
                />
                <SectionDivider />
                <SectionLabel badge="both">Impact over time</SectionLabel>
                <FundraiserImpactCharts charts={data.charts} />
                <SectionDivider />
                <FundraiserHostEarnings hosted={data.hostedOverview} />

                {/* If user has never hosted — show launch CTAs */}
                {data.hostedOverview.rooms_launched === 0 && (
                  <>
                    <SectionDivider />
                    <NoHostedRooms origin={origin} />
                  </>
                )}

                <SectionDivider />
                <div className="fl-overview-bottom">
                  <div className="fl-overview-activity">
                    <SectionLabel badge="both">Recent activity</SectionLabel>
                    {/* Cap at last 10 — full list is on the Activity tab */}
                    <FundraiserRecentActivity items={data.recentActivity.slice(0, 10)} />
                  </div>
                  <div className="fl-overview-coming-soon">
                    <SectionLabel badge="both">Unlock more</SectionLabel>
                    <div className="fl-cta-grid">
                      {[
                        'Create public profile',
                        'Supporter insights',
                        'Linked wallets',
                      ].map(feat => (
                        <button
                          key={feat}
                          className="fl-cta-card"
                          onClick={() => openComingSoon(feat)}
                        >
                          <span className="fl-cta-label">{feat}</span>
                          <span className="fl-cta-tag">Coming soon</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

              {activeTab === 'events' && (
     <div className="fl-tab-content">
         <MyEventsTab
          walletAddress={walletAddress}
           hostName={(payload?.host_name as string) ?? ''}
         />
       </div>
     )}

            {activeTab === 'hosted' && (
              <div className="fl-tab-content">
                <FundraiserHostedRoomsTable
                  rooms={data.hostedRooms.rows}
                  total={data.hostedRooms.total}
                />
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="fl-tab-content">
                <FundraiserRecentActivity items={data.recentActivity} />
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="fl-tab-content">
                <FundraiserTransactionsTable
                  transactions={data.transactions.rows}
                  total={data.transactions.total}
                  walletAddress={walletAddress}
                />
              </div>
            )}

            {activeTab === 'tools' && (
              <div className="fl-tab-content fl-tab-placeholder">
                <div className="fl-placeholder-inner">
                  <div className="fl-placeholder-icon">&#9672;</div>
                  <h2 className="fl-placeholder-title">Tools</h2>
                  <p className="fl-placeholder-sub">This section is coming soon.</p>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Coming soon modal ── */}
      <ComingSoonModal
        isOpen={comingSoonOpen}
        onClose={() => setComingSoonOpen(false)}
        featureName={comingSoonFeature}
      />

      <style>{`
        .fl-page {
          min-height: 100vh;
          background: #07070f;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          /* Web3Header is position:fixed so it's out of flow.
             This padding-top pushes everything down by the header height
             so the sticky launch bar appears directly below it. */
          padding-top: 64px;
          scroll-padding-top: 160px;
        }

        /* ── Launch bar ────────────────────────────────────────────── */
        .fl-launch-bar {
          /* sits below the fixed Web3Header (64px) */
          position: sticky;
          top: 64px;
          z-index: 98;
          background: rgba(7,7,15,0.97);
          border-bottom: 0.5px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(12px);
        }
        .fl-launch-bar-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          height: 44px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .fl-launch-label {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .fl-launch-buttons {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .fl-launch-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.04em;
          padding: 5px 14px;
          border-radius: 8px;
          border: 0.5px solid;
          text-decoration: none;
          transition: all 0.12s ease;
          white-space: nowrap;
        }
        .fl-launch-btn-icon {
          width: 12px;
          height: 12px;
          flex-shrink: 0;
        }
        .fl-launch-btn--quiz {
          background: rgba(163,245,66,0.08);
          border-color: rgba(163,245,66,0.3);
          color: #a3f542;
        }
        .fl-launch-btn--quiz:hover {
          background: rgba(163,245,66,0.16);
          border-color: rgba(163,245,66,0.6);
        }
        .fl-launch-btn--elim {
          background: rgba(251,146,60,0.08);
          border-color: rgba(251,146,60,0.3);
          color: #fb923c;
        }
        .fl-launch-btn--elim:hover {
          background: rgba(251,146,60,0.16);
          border-color: rgba(251,146,60,0.6);
        }

        /* ── Tab nav ───────────────────────────────────────────────── */
        .fl-tabnav {
          border-bottom: 0.5px solid rgba(255,255,255,0.06);
          background: #07070f;
          /* sits below the fixed header (64px) + launch bar (44px) */
          position: sticky;
          top: 64px;
          z-index: 97;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .fl-tabnav::-webkit-scrollbar { display: none; }
        .fl-tabnav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          display: flex;
          gap: 0;
          min-width: max-content;
        }
        .fl-tab {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.06em;
          padding: 14px 16px;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.55);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.12s ease;
          white-space: nowrap;
        }
        .fl-tab:hover { color: rgba(255,255,255,0.85); }
        .fl-tab--active {
          color: #fff;
          border-bottom-color: #63ffb4;
        }

        /* ── Main ──────────────────────────────────────────────────── */
        .fl-main {
          max-width: 1200px;
          margin: 0 auto;
          /* launch bar + tab nav are sticky-in-flow so main naturally sits
             below them. Just needs comfortable breathing room. */
          padding: 1.5rem 1.5rem 4rem;
          min-height: calc(100vh - 151px);
        }
        .fl-tab-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          /* Ensures programmatic scrolls (tab switch) always land below sticky bars */
          scroll-margin-top: 116px;
        }

        /* ── Overview layout ───────────────────────────────────────── */
        .fl-overview-bottom {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 1.5rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .fl-overview-bottom { grid-template-columns: 1fr; }
        }

        /* ── No-hosted-rooms CTA ───────────────────────────────────── */
        .fl-no-hosted {
          border: 0.5px dashed rgba(163,245,66,0.2);
          border-radius: 16px;
          padding: 2rem 1.5rem;
          text-align: center;
        }
        .fl-no-hosted-title {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 700;
          color: rgba(255,255,255,0.6);
          margin: 0 0 0.4rem;
        }
        .fl-no-hosted-sub {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          margin: 0 0 1.25rem;
        }
        .fl-no-hosted-btns {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .fl-no-hosted-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 500;
          padding: 8px 20px;
          border-radius: 10px;
          border: 0.5px solid;
          text-decoration: none;
          transition: all 0.12s ease;
        }
        .fl-no-hosted-btn-icon {
          width: 14px;
          height: 14px;
        }
        .fl-no-hosted-btn--quiz {
          background: rgba(163,245,66,0.08);
          border-color: rgba(163,245,66,0.35);
          color: #a3f542;
        }
        .fl-no-hosted-btn--quiz:hover {
          background: rgba(163,245,66,0.16);
          border-color: rgba(163,245,66,0.7);
        }
        .fl-no-hosted-btn--elim {
          background: rgba(251,146,60,0.08);
          border-color: rgba(251,146,60,0.35);
          color: #fb923c;
        }
        .fl-no-hosted-btn--elim:hover {
          background: rgba(251,146,60,0.16);
          border-color: rgba(251,146,60,0.7);
        }

        /* ── CTA cards ─────────────────────────────────────────────── */
        .fl-cta-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .fl-cta-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1rem;
          background: #0f0f18;
          border: 0.5px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          text-align: left;
        }
        .fl-cta-card:hover {
          border-color: rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.03);
        }
        .fl-cta-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: rgba(255,255,255,0.65);
        }
        .fl-cta-tag {
          font-family: 'DM Mono', monospace;
          font-size: 9px;
          letter-spacing: 0.1em;
          padding: 2px 8px;
          border-radius: 4px;
          background: rgba(245,166,35,0.1);
          color: #f5a623;
          border: 0.5px solid rgba(245,166,35,0.2);
        }

        /* ── Divider ───────────────────────────────────────────────── */
        .fl-divider {
          border: none;
          border-top: 0.5px solid rgba(255,255,255,0.06);
          margin: 0;
        }

        /* ── Placeholder ───────────────────────────────────────────── */
        .fl-tab-placeholder {
          min-height: 400px;
          align-items: center;
          justify-content: center;
        }
        .fl-placeholder-inner {
          text-align: center;
          padding: 4rem 2rem;
        }
        .fl-placeholder-icon {
          font-size: 32px;
          color: rgba(99,255,180,0.3);
          margin-bottom: 1.25rem;
        }
        .fl-placeholder-title {
          font-family: 'Syne', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: rgba(255,255,255,0.5);
          margin: 0 0 0.5rem;
        }
        .fl-placeholder-sub {
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
        }

        /* ── Responsive ────────────────────────────────────────────── */
        @media (max-width: 640px) {
          .fl-launch-bar-inner { padding: 0 1rem; gap: 8px; }
          .fl-launch-label { display: none; }
          .fl-main { padding: 1.5rem 1rem 3rem; }
        }
      `}</style>
    </div>
  )
}

// ─── No hosted rooms CTA ──────────────────────────────────────────────────────
function NoHostedRooms({ origin }: { origin: string }) {
  return (
    <div className="fl-no-hosted">
      <p className="fl-no-hosted-title">Ready to host your first room?</p>
      <p className="fl-no-hosted-sub">
        Pick a game, set your entry fee, choose a charity and go live. Smart contracts handle all payouts automatically.
      </p>
      <div className="fl-no-hosted-btns">
        <a href={`${origin}/web3/quiz`} className="fl-no-hosted-btn fl-no-hosted-btn--quiz">
          <Trophy className="fl-no-hosted-btn-icon" />
          Host a Quiz Night
        </a>
        <a href={`${origin}/web3/elimination`} className="fl-no-hosted-btn fl-no-hosted-btn--elim">
          <Crosshair className="fl-no-hosted-btn-icon" />
          Host Elimination
        </a>
      </div>
    </div>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function SectionDivider() {
  return (
    <hr
      className="fl-divider"
      style={{ border: 'none', borderTop: '0.5px solid rgba(255,255,255,0.06)', margin: '0.5rem 0' }}
    />
  )
}

function SectionLabel({
  children,
  badge,
}: {
  children: React.ReactNode
  badge: 'host' | 'player' | 'both'
}) {
  const colors = {
    host:   { bg: 'rgba(59,190,245,0.12)',  text: '#3bbef5', border: 'rgba(59,190,245,0.25)' },
    player: { bg: 'rgba(99,255,180,0.10)',  text: '#63ffb4', border: 'rgba(99,255,180,0.22)' },
    both:   { bg: 'rgba(245,166,35,0.12)',  text: '#f5a623', border: 'rgba(245,166,35,0.22)' },
  }
  const c = colors[badge]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.5rem' }}>
      <span style={{
        fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.16em',
        padding: '3px 8px', borderRadius: '4px',
        background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
      }}>
        {badge === 'both' ? 'ALL' : badge.toUpperCase()}
      </span>
      <span style={{
        fontFamily: 'Syne, sans-serif', fontSize: '14px', fontWeight: 600,
        color: 'rgba(255,255,255,0.65)',
      }}>
        {children}
      </span>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <div style={{
        fontFamily: 'DM Mono, monospace', fontSize: '11px',
        letterSpacing: '0.14em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase',
      }}>
        Loading impact data&hellip;
      </div>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '12px', color: '#fb7185', marginBottom: '1rem' }}>
        {error}
      </p>
      <button
        onClick={onRetry}
        style={{
          fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.08em',
          padding: '8px 20px', borderRadius: '8px',
          border: '0.5px solid rgba(251,113,133,0.3)',
          background: 'rgba(251,113,133,0.08)', color: '#fb7185',
          cursor: 'pointer',
        }}
      >
        Retry
      </button>
    </div>
  )
}