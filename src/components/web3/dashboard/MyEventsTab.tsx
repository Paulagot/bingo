// src/components/web3/dashboard/MyEventsTab.tsx
//
// "My Events" tab for the fundraiser dashboard.
// Shows all events owned by the connected wallet across all statuses.
// Provides: create (via modal), publish, unpublish, launch, delete.
//
// Launch routing:
//   quiz        → /web3/quiz        (quiz wizard modal opens)
//   elimination → /web3/elimination (setup modal opens)

import React, { useEffect, useState, useCallback, useRef } from 'react'
import {
  Trophy,
  Crosshair,
  Plus,
  Calendar,
  Link2,
  Wallet,
  ChevronDown,
  ChevronUp,
  Trash2,
} from 'lucide-react'
import {
  getMyEvents,
  publishEvent,
  unpublishEvent,
  deleteEvent,
  createEvent,
  type PublicEvent,
  type CreateEventPayload,
  type EventType,
  type ContactType,
  type Chain,
} from '../../../services/web3PublicEventsService'
import { CHARITIES } from '../../../chains/evm/config/gbcharities'
import { SOLANA_TOKENS } from '../../../chains/solana/config/solanaTokenConfig'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrigin(): string {
  return typeof window !== 'undefined'
    ? window.location.origin.replace(/\/$/, '')
    : 'https://fundraisely.ie'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(timeStr: string, tz: string): string {
  return `${timeStr.slice(0, 5)} ${tz}`
}

function statusColor(status: PublicEvent['status']): { bg: string; color: string; border: string } {
  switch (status) {
    case 'draft':
      return {
        bg: 'rgba(255,255,255,0.06)',
        color: 'rgba(255,255,255,0.72)',
        border: 'rgba(255,255,255,0.14)',
      }
    case 'published':
      return {
        bg: 'rgba(99,255,180,0.12)',
        color: '#7affc1',
        border: 'rgba(99,255,180,0.34)',
      }
    case 'live':
      return {
        bg: 'rgba(59,190,245,0.12)',
        color: '#6cd2ff',
        border: 'rgba(59,190,245,0.34)',
      }
    case 'ended':
      return {
        bg: 'rgba(255,255,255,0.04)',
        color: 'rgba(255,255,255,0.50)',
        border: 'rgba(255,255,255,0.10)',
      }
  }
}

function platformLabel(platform: string | null): string {
  const map: Record<string, string> = {
    discord: 'Discord',
    zoom: 'Zoom',
    x: 'X Space',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    luma: 'Luma',
    eventbrite: 'Eventbrite',
    meet: 'Google Meet',
  }
  return map[platform ?? ''] ?? 'Link'
}

// ─── Solana token list ────────────────────────────────────────────────────────

const FIXED_CHAIN: Chain = 'solana'
const SOLANA_TOKEN_CODES = Object.keys(SOLANA_TOKENS)

function getTokensForChain(chain: Chain) {
  if (chain === 'base') {
    return [{ code: 'USDC', name: 'USDC (Base)' }]
  }

  return SOLANA_TOKEN_CODES.map(code => ({
    code,
    name: SOLANA_TOKENS[code as keyof typeof SOLANA_TOKENS].name,
  }))
}

// ─── Shared inline style helpers ──────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, rgba(19,19,31,0.98) 0%, rgba(13,13,23,0.98) 100%)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 18,
  boxShadow: '0 16px 50px rgba(0,0,0,0.28)',
}

const softMono: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
}

const sectionCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.95rem',
}

const actionPillBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: "'DM Mono', monospace",
  fontSize: 11,
  fontWeight: 500,
  padding: '7px 14px',
  borderRadius: 9,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
}

// ─── Schedule Event Modal ─────────────────────────────────────────────────────

interface ScheduleModalProps {
  onClose: () => void
  onSaved: (event: PublicEvent) => void
  hostName: string
}

const EMPTY_FORM: CreateEventPayload = {
  host_name: '',
  title: '',
  event_type: 'quiz',
  description: '',
  event_date: '',
  start_time: '',
  time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  join_url: '',
  contact_handle: '',
  contact_type: 'telegram',
  chain: FIXED_CHAIN,
  entry_fee: 0,
  fee_token: 'SOL',
  charity_id: CHARITIES[0]?.id ?? 0,
  charity_name: CHARITIES[0]?.name ?? '',
}

function ScheduleEventModal({ onClose, onSaved, hostName }: ScheduleModalProps) {
  const [form, setForm] = useState<CreateEventPayload>({
    ...EMPTY_FORM,
    host_name: hostName,
    chain: FIXED_CHAIN,
    fee_token: 'SOL',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTopButton, setShowTopButton] = useState(false)
  const bodyRef = useRef<HTMLDivElement | null>(null)

  function set<K extends keyof CreateEventPayload>(key: K, value: CreateEventPayload[K]) {
    setForm(prev => {
      const next = { ...prev, [key]: value }

      next.chain = FIXED_CHAIN

      if (key === 'chain') {
        next.fee_token = 'SOL'
      }

      if (key === 'event_type' && value === 'elimination') {
        next.chain = FIXED_CHAIN
        next.fee_token = 'SOL'
      }

      return next
    })
  }

  function onCharityChange(id: number) {
    const charity = CHARITIES.find(c => c.id === id)
    if (charity) {
      setForm(prev => ({
        ...prev,
        charity_id: charity.id,
        charity_name: charity.name,
      }))
    }
  }

  function handleBodyScroll() {
    const el = bodyRef.current
    if (!el) return
    setShowTopButton(el.scrollTop > 220)
  }

  function scrollToTop() {
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave(publish: boolean) {
    setError(null)

    const url = form.join_url.trim()
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setError('Please enter a valid URL for "Where to join" — it must start with https://')
      return
    }

    const fee = parseFloat(String(form.entry_fee))
    if (!form.entry_fee || isNaN(fee) || fee <= 0) {
      setError('Please enter a valid entry fee greater than 0')
      return
    }

    if (!form.description?.trim()) {
      setError('Description is required')
      return
    }

    setSaving(true)
    try {
      const payload: CreateEventPayload = {
        ...form,
        chain: FIXED_CHAIN,
      }

      const result = await createEvent(payload)

      if (publish && result.event) {
        await publishEvent(result.event.id)
        const published = await import('../../../services/web3PublicEventsService').then(m =>
          m.getEventById(result.event.id),
        )
        onSaved(published.event)
      } else {
        onSaved(result.event)
      }

      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save event')
    } finally {
      setSaving(false)
    }
  }

  const tokens = getTokensForChain(FIXED_CHAIN)
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <style>{`
        .fl-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(3, 3, 8, 0.86);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        @media (min-width: 640px) {
          .fl-modal-overlay {
            align-items: center;
            padding: 1.5rem;
          }
        }

        .fl-modal-sheet {
          position: relative;
          width: 100%;
          max-width: 720px;
          border-radius: 24px 24px 0 0;
          display: flex;
          flex-direction: column;
          max-height: 92dvh;
          font-family: 'DM Sans', sans-serif;
          overflow: hidden;
          background: linear-gradient(180deg, #121220 0%, #0b0b14 100%);
          border: 1px solid rgba(255,255,255,0.09);
          box-shadow: 0 24px 80px rgba(0,0,0,0.45);
        }

        @media (min-width: 640px) {
          .fl-modal-sheet {
            border-radius: 22px;
            max-height: 88vh;
          }
        }

        .fl-modal-handle {
          width: 42px;
          height: 5px;
          background: rgba(255,255,255,0.26);
          border-radius: 999px;
          margin: 12px auto 0;
          flex-shrink: 0;
        }

        @media (min-width: 640px) {
          .fl-modal-handle {
            display: none;
          }
        }

        .fl-modal-header {
          flex-shrink: 0;
          padding: 1.25rem 1.5rem 1rem;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          position: relative;
          z-index: 3;
        }

        .fl-modal-body {
          flex: 1;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          padding: 1.25rem 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          scrollbar-width: none;
          position: relative;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0) 100%);
        }

        .fl-modal-body::-webkit-scrollbar {
          display: none;
        }

        @media (min-width: 640px) {
          .fl-modal-body {
            scrollbar-width: thin;
            scrollbar-color: rgba(255,255,255,0.22) transparent;
          }

          .fl-modal-body::-webkit-scrollbar {
            display: block;
            width: 8px;
          }

          .fl-modal-body::-webkit-scrollbar-track {
            background: transparent;
          }

          .fl-modal-body::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.22);
            border-radius: 999px;
          }

          .fl-modal-body::-webkit-scrollbar-thumb:hover {
            background: rgba(255,255,255,0.34);
          }
        }

        .fl-modal-footer {
          flex-shrink: 0;
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255,255,255,0.07);
          display: flex;
          gap: 0.75rem;
          background: rgba(10,10,17,0.96);
          position: relative;
          z-index: 3;
        }

        .fl-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }

        @media (max-width: 520px) {
          .fl-form-row {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 420px) {
          .fl-modal-header {
            padding: 1rem 1.25rem 0.875rem;
          }

          .fl-modal-body {
            padding: 1rem 1.25rem 1.25rem;
          }

          .fl-modal-footer {
            padding: 0.875rem 1.25rem;
            flex-direction: column;
          }
        }

        .fl-section-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
        }

        .fl-section-head {
          display: flex;
          flex-direction: column;
          gap: 0.22rem;
          margin-bottom: 0.1rem;
        }

        .fl-section-kicker {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(99,255,180,0.92);
        }

        .fl-section-title {
          font-family: 'Syne', sans-serif;
          font-size: 17px;
          line-height: 1.15;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .fl-section-copy {
          font-size: 12px;
          line-height: 1.5;
          color: rgba(255,255,255,0.62);
          margin: 0;
        }

        .fl-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
        }

        .fl-field-label {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.84);
        }

        .fl-field-label .fl-req {
          color: #7affc1;
          margin-left: 2px;
        }

        .fl-input,
        .fl-select,
        .fl-textarea {
          width: 100%;
          box-sizing: border-box;
          background: rgba(7,7,15,0.96);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          padding: 12px 13px;
          color: #ffffff;
          font-size: 14px;
          line-height: 1.4;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
        }

        .fl-input:hover,
        .fl-select:hover,
        .fl-textarea:hover {
          border-color: rgba(255,255,255,0.24);
        }

        .fl-input:focus,
        .fl-select:focus,
        .fl-textarea:focus {
          border-color: rgba(99,255,180,0.52);
          box-shadow: 0 0 0 3px rgba(99,255,180,0.14);
          background: rgba(9,9,18,1);
        }

        .fl-input::placeholder,
        .fl-textarea::placeholder {
          color: rgba(255,255,255,0.40);
        }

        .fl-input[disabled] {
          opacity: 0.88;
          cursor: not-allowed;
          color: rgba(255,255,255,0.88);
          background: rgba(255,255,255,0.06);
        }

        .fl-select {
          appearance: none;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.72)' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
          cursor: pointer;
        }

        .fl-select option {
          background: #0f0f18;
          color: #fff;
        }

        .fl-select.fl-placeholder {
          color: rgba(255,255,255,0.55);
        }

        .fl-textarea {
          resize: vertical;
          min-height: 104px;
          line-height: 1.5;
        }

        .fl-input[type="date"],
        .fl-input[type="time"] {
          color-scheme: dark;
          cursor: pointer;
        }

        .fl-char-count {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          color: rgba(255,255,255,0.56);
          text-align: right;
          margin-top: 2px;
        }

        .fl-error-banner {
          background: rgba(251,113,133,0.12);
          border: 1px solid rgba(251,113,133,0.34);
          border-radius: 12px;
          padding: 0.85rem 1rem;
          color: #ffc0cb;
          font-size: 13px;
          line-height: 1.5;
        }

        .fl-btn-draft {
          flex: 1;
          padding: 12px 0;
          border-radius: 11px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.18);
          color: rgba(255,255,255,0.88);
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
          white-space: nowrap;
        }

        .fl-btn-draft:hover:not(:disabled) {
          border-color: rgba(255,255,255,0.28);
          background: rgba(255,255,255,0.08);
        }

        .fl-btn-publish {
          flex: 1.35;
          padding: 12px 0;
          border-radius: 11px;
          background: rgba(99,255,180,0.13);
          border: 1px solid rgba(99,255,180,0.42);
          color: #7affc1;
          font-family: 'DM Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.12s;
          white-space: nowrap;
        }

        .fl-btn-publish:hover:not(:disabled) {
          background: rgba(99,255,180,0.18);
          border-color: rgba(99,255,180,0.58);
        }

        .fl-btn-draft:disabled,
        .fl-btn-publish:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .fl-help-text {
          font-size: 12px;
          line-height: 1.45;
          color: rgba(255,255,255,0.62);
          margin-top: 2px;
        }

        .fl-scroll-top {
          position: absolute;
          right: 16px;
          bottom: 84px;
          z-index: 4;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(19,19,32,0.96);
          color: rgba(255,255,255,0.9);
          padding: 8px 12px;
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0,0,0,0.28);
          backdrop-filter: blur(8px);
        }

        .fl-scroll-top:hover {
          color: #fff;
          border-color: rgba(255,255,255,0.3);
        }

        @media (max-width: 639px) {
          .fl-scroll-top {
            display: none;
          }
        }

        .fl-bottom-spacer {
          height: 0.2rem;
        }
      `}</style>

      <div
        className="fl-modal-overlay"
        onClick={e => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="fl-modal-sheet">
          <div className="fl-modal-handle" />

          <div className="fl-modal-header">
            <div>
              <h2
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#fff',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                List an Event
              </h2>
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'rgba(255,255,255,0.68)',
                  margin: '6px 0 0',
                  maxWidth: 460,
                }}
              >
                Create a public event listing for the marketplace so people can discover and join your fundraiser.
              </p>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.72)',
                fontSize: 22,
                cursor: 'pointer',
                lineHeight: 1,
                width: 38,
                height: 38,
                borderRadius: 10,
                flexShrink: 0,
              }}
              aria-label="Close"
              type="button"
            >
              ×
            </button>
          </div>

          {showTopButton && (
            <button type="button" className="fl-scroll-top" onClick={scrollToTop}>
              Top
            </button>
          )}

          <div ref={bodyRef} className="fl-modal-body" onScroll={handleBodyScroll}>
            {error && <div className="fl-error-banner">{error}</div>}

            <section className="fl-section-card">
              <div className="fl-section-head">
                <span className="fl-section-kicker">Section 1</span>
                <h3 className="fl-section-title">About your event</h3>
                <p className="fl-section-copy">
                  Add the basics people will see first when they discover your event.
                </p>
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Community / host name <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  value={form.host_name}
                  onChange={e => set('host_name', e.target.value)}
                  placeholder="e.g. DeFi Dublin"
                  maxLength={255}
                />
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Event title <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Web3 Trivia Night #5"
                  maxLength={255}
                />
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Event type <span className="fl-req">*</span>
                </label>
                <select
                  className={`fl-select${!form.event_type ? ' fl-placeholder' : ''}`}
                  value={form.event_type}
                  onChange={e => set('event_type', e.target.value as EventType)}
                >
                  <option value="" disabled>
                    Please select…
                  </option>
                  <option value="quiz">Quiz</option>
                  <option value="elimination">Elimination</option>
                </select>
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Description <span className="fl-req">*</span>
                </label>
                <textarea
                  className="fl-textarea"
                  value={form.description ?? ''}
                  onChange={e => set('description', e.target.value)}
                  placeholder="e.g. Join us for a fun live fundraiser where every entry has real impact and supports a verified cause."
                  maxLength={280}
                  rows={4}
                />
                <div className="fl-char-count">{(form.description ?? '').length} / 280</div>
              </div>
            </section>

            <section className="fl-section-card">
              <div className="fl-section-head">
                <span className="fl-section-kicker">Section 2</span>
                <h3 className="fl-section-title">Date &amp; time</h3>
                <p className="fl-section-copy">
                  Set when your event starts and confirm the timezone people should follow.
                </p>
              </div>

              <div className="fl-form-row">
                <div className="fl-field">
                  <label className="fl-field-label">
                    Date <span className="fl-req">*</span>
                  </label>
                  <input
                    className="fl-input"
                    type="date"
                    value={form.event_date}
                    min={today}
                    onChange={e => set('event_date', e.target.value)}
                  />
                </div>

                <div className="fl-field">
                  <label className="fl-field-label">
                    Start time <span className="fl-req">*</span>
                  </label>
                  <input
                    className="fl-input"
                    type="time"
                    value={form.start_time}
                    onChange={e => set('start_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Timezone <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  value={form.time_zone}
                  onChange={e => set('time_zone', e.target.value)}
                  placeholder="e.g. Europe/Dublin"
                />
                <span className="fl-help-text">
                  Auto-detected from your browser. Change it if your audience is following a different timezone.
                </span>
              </div>
            </section>

            <section className="fl-section-card">
              <div className="fl-section-head">
                <span className="fl-section-kicker">Section 3</span>
                <h3 className="fl-section-title">Where &amp; how to join</h3>
                <p className="fl-section-copy">
                  Add the main link people should use and the best contact method for questions.
                </p>
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Join link <span className="fl-req">*</span>
                </label>
                <input
                  className="fl-input"
                  type="text"
                  value={form.join_url}
                  onChange={e => set('join_url', e.target.value)}
                  onBlur={e => {
                    const v = e.target.value.trim()
                    if (v && !v.startsWith('http://') && !v.startsWith('https://')) {
                      set('join_url', `https://${v}`)
                    }
                  }}
                  placeholder="https://discord.gg/your-server"
                />
                <span className="fl-help-text">
                  Use the main place people should go to join or register: Discord, Zoom, X Space, Telegram, Luma, Eventbrite, and similar.
                </span>
              </div>

              <div className="fl-form-row">
                <div className="fl-field">
                  <label className="fl-field-label">
                    Contact type <span className="fl-req">*</span>
                  </label>
                  <select
                    className={`fl-select${!form.contact_type ? ' fl-placeholder' : ''}`}
                    value={form.contact_type}
                    onChange={e => set('contact_type', e.target.value as ContactType)}
                  >
                    <option value="" disabled>
                      Please select…
                    </option>
                    {(['telegram', 'x', 'discord', 'whatsapp', 'email', 'other'] as ContactType[]).map(
                      t => (
                        <option key={t} value={t}>
                          {t === 'x' ? 'X (Twitter)' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="fl-field">
                  <label className="fl-field-label">
                    Contact handle <span className="fl-req">*</span>
                  </label>
                  <input
                    className="fl-input"
                    value={form.contact_handle}
                    onChange={e => set('contact_handle', e.target.value)}
                    placeholder="@handle or email"
                    maxLength={255}
                  />
                </div>
              </div>
            </section>

            <section className="fl-section-card">
              <div className="fl-section-head">
                <span className="fl-section-kicker">Section 4</span>
                <h3 className="fl-section-title">Entry &amp; charity</h3>
                <p className="fl-section-copy">
                  Confirm the chain, price to join, token, and the cause this event supports.
                </p>
              </div>

              <div className="fl-field">
                <label className="fl-field-label">Chain</label>
                <input className="fl-input" value="Solana" disabled />
              </div>

              <div className="fl-form-row">
                <div className="fl-field">
                  <label className="fl-field-label">
                    Entry fee <span className="fl-req">*</span>
                  </label>
                  <input
                    className="fl-input"
                    type="text"
                    inputMode="decimal"
                    value={form.entry_fee || ''}
                    onChange={e => {
                      const v = e.target.value
                      if (v === '' || /^\d*\.?\d{0,8}$/.test(v)) {
                        set('entry_fee', v as any)
                      }
                    }}
                    placeholder="e.g. 0.01"
                  />
                </div>

                <div className="fl-field">
                  <label className="fl-field-label">
                    Token <span className="fl-req">*</span>
                  </label>
                  <select
                    className="fl-select"
                    value={form.fee_token}
                    onChange={e => set('fee_token', e.target.value)}
                  >
                    {tokens.map(t => (
                      <option key={t.code} value={t.code}>
                        {t.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fl-field">
                <label className="fl-field-label">
                  Charity / cause <span className="fl-req">*</span>
                </label>
                <select
                  className={`fl-select${!form.charity_id ? ' fl-placeholder' : ''}`}
                  value={form.charity_id || ''}
                  onChange={e => onCharityChange(parseInt(e.target.value))}
                >
                  <option value="" disabled>
                    Please select a charity…
                  </option>
                  {CHARITIES.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <div className="fl-bottom-spacer" />
          </div>

          <div className="fl-modal-footer">
            <button className="fl-btn-draft" onClick={() => handleSave(false)} disabled={saving} type="button">
              {saving ? 'Saving…' : 'Save draft'}
            </button>
            <button
              className="fl-btn-publish"
              onClick={() => handleSave(true)}
              disabled={saving}
              type="button"
            >
              {saving ? 'Publishing…' : 'Save & publish'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: PublicEvent
  origin: string
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onDelete: (id: string) => void
  loading: boolean
}

function EventCard({ event, origin, onPublish, onUnpublish, onDelete, loading }: EventCardProps) {
  const sc = statusColor(event.status)

  const launchPath =
    event.event_type === 'quiz'
      ? `${origin}/web3/quiz?action=host`
      : `${origin}/web3/elimination?action=host`

  return (
    <div
      style={{
        ...panelStyle,
        padding: '1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                ...softMono,
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '3px 8px',
                borderRadius: 6,
                textTransform: 'uppercase',
                background:
                  event.event_type === 'quiz'
                    ? 'rgba(163,245,66,0.10)'
                    : 'rgba(251,146,60,0.10)',
                color: event.event_type === 'quiz' ? '#c8ff79' : '#ffb26a',
                border: `1px solid ${
                  event.event_type === 'quiz'
                    ? 'rgba(163,245,66,0.25)'
                    : 'rgba(251,146,60,0.25)'
                }`,
              }}
            >
              {event.event_type}
            </span>

            <span
              style={{
                ...softMono,
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '3px 8px',
                borderRadius: 6,
                textTransform: 'uppercase',
                background: sc.bg,
                color: sc.color,
                border: `1px solid ${sc.border}`,
              }}
            >
              {event.status}
            </span>
          </div>

          <h3
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: '#fff',
              margin: 0,
              lineHeight: 1.28,
            }}
          >
            {event.title}
          </h3>

          <p
            style={{
              ...softMono,
              fontSize: 11,
              color: 'rgba(255,255,255,0.58)',
              margin: '4px 0 0',
            }}
          >
            {event.host_name}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem 1.2rem',
          paddingTop: 2,
        }}
      >
        <MetaItem
          icon={<Calendar size={12} />}
          label={`${formatDate(event.event_date)} · ${formatTime(event.start_time, event.time_zone)}`}
        />
        <MetaItem
          icon={<Wallet size={12} />}
          label={`${event.entry_fee} ${event.fee_token} · ${event.charity_name}`}
        />
        <MetaItem icon={<Link2 size={12} />} label={platformLabel(event.platform)} />
      </div>

      <div style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap' }}>
        {event.status !== 'ended' && (
          <a
            href={launchPath}
            style={{
              ...actionPillBase,
              background: 'rgba(99,255,180,0.10)',
              border: '1px solid rgba(99,255,180,0.32)',
              color: '#7affc1',
            }}
          >
            {event.event_type === 'quiz' ? (
              <>
                <Trophy size={12} />
                Launch Quiz
              </>
            ) : (
              <>
                <Crosshair size={12} />
                Launch Elimination
              </>
            )}
          </a>
        )}

        {event.status === 'draft' && (
          <button
            onClick={() => onPublish(event.id)}
            disabled={loading}
            style={outlineBtn('rgba(99,255,180,0.3)', '#7affc1')}
            type="button"
          >
            Publish
          </button>
        )}

        {event.status === 'published' && (
          <button
            onClick={() => onUnpublish(event.id)}
            disabled={loading}
            style={outlineBtn('rgba(255,255,255,0.18)', 'rgba(255,255,255,0.82)')}
            type="button"
          >
            Unpublish
          </button>
        )}

        {event.status === 'draft' && (
          <button
            onClick={() => onDelete(event.id)}
            disabled={loading}
            style={outlineBtn('rgba(251,113,133,0.24)', '#ff8ea3')}
            type="button"
            aria-label="Delete draft"
          >
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

function MetaItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        ...softMono,
        fontSize: 11,
        lineHeight: 1.45,
        color: 'rgba(255,255,255,0.72)',
      }}
    >
      <span style={{ color: 'rgba(255,255,255,0.54)', display: 'inline-flex' }}>{icon}</span>
      {label}
    </span>
  )
}

function outlineBtn(borderColor: string, color: string): React.CSSProperties {
  return {
    ...actionPillBase,
    background: 'transparent',
    border: `1px solid ${borderColor}`,
    color,
    cursor: 'pointer',
  }
}

// ─── MyEventsTab ──────────────────────────────────────────────────────────────

interface MyEventsTabProps {
  walletAddress: string
  hostName: string
}

export function MyEventsTab({ walletAddress, hostName }: MyEventsTabProps) {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const origin = getOrigin()

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getMyEvents()
      setEvents(res.events)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handlePublish(id: string) {
    setActionLoading(true)
    try {
      await publishEvent(id)
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to publish')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleUnpublish(id: string) {
    setActionLoading(true)
    try {
      await unpublishEvent(id)
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to unpublish')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this draft event? This cannot be undone.')) return
    setActionLoading(true)
    try {
      await deleteEvent(id)
      await load()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to delete')
    } finally {
      setActionLoading(false)
    }
  }

  function handleSaved(event: PublicEvent) {
    setEvents(prev => [event, ...prev])
  }

  const upcoming = events.filter(e => e.status === 'published')
  const drafts = events.filter(e => e.status === 'draft')
  const live = events.filter(e => e.status === 'live')
  const ended = events.filter(e => e.status === 'ended')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          ...panelStyle,
          padding: '1rem 1.1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            My Events
          </h2>
          <p
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.70)',
              margin: '6px 0 0',
              maxWidth: 560,
            }}
          >
            Schedule and manage the events you want listed on the public marketplace.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            ...softMono,
            fontSize: 12,
            fontWeight: 600,
            padding: '10px 18px',
            borderRadius: 11,
            background: 'rgba(99,255,180,0.10)',
            border: '1px solid rgba(99,255,180,0.34)',
            color: '#7affc1',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          type="button"
        >
          <Plus size={14} /> List an Event
        </button>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(251,113,133,0.12)',
            border: '1px solid rgba(251,113,133,0.28)',
            borderRadius: 12,
            padding: '0.85rem 1rem',
            color: '#ffc0cb',
            fontSize: 13,
            lineHeight: 1.5,
            ...softMono,
          }}
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          style={{
            ...panelStyle,
            padding: '3rem',
            textAlign: 'center',
            ...softMono,
            fontSize: 11,
            color: 'rgba(255,255,255,0.52)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Loading events…
        </div>
      )}

      {!loading && events.length === 0 && (
        <div
          style={{
            ...panelStyle,
            borderStyle: 'dashed',
            borderColor: 'rgba(99,255,180,0.16)',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 0.45rem',
            }}
          >
            No events yet
          </p>

          <p
            style={{
              ...softMono,
              fontSize: 12,
              color: 'rgba(255,255,255,0.62)',
              margin: '0 0 1.5rem',
            }}
          >
            Schedule your first event and get it on the discovery page.
          </p>

          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              ...softMono,
              fontSize: 12,
              padding: '9px 18px',
              borderRadius: 10,
              background: 'rgba(99,255,180,0.10)',
              border: '1px solid rgba(99,255,180,0.32)',
              color: '#7affc1',
              cursor: 'pointer',
            }}
            type="button"
          >
            <Plus size={14} /> List an Event
          </button>
        </div>
      )}

      {!loading && events.length > 0 && (
        <>
          <EventGroup
            title="Live now"
            events={live}
            origin={origin}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            loading={actionLoading}
          />
          <EventGroup
            title="Upcoming"
            events={upcoming}
            origin={origin}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            loading={actionLoading}
          />
          <EventGroup
            title="Drafts"
            events={drafts}
            origin={origin}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            loading={actionLoading}
          />
          <EventGroup
            title="Past"
            events={ended}
            origin={origin}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            loading={actionLoading}
            collapsible
          />
        </>
      )}

      {modalOpen && (
        <ScheduleEventModal
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          hostName={hostName}
        />
      )}
    </div>
  )
}

// ─── Event group ──────────────────────────────────────────────────────────────

function EventGroup({
  title,
  events,
  origin,
  onPublish,
  onUnpublish,
  onDelete,
  loading,
  collapsible = false,
}: {
  title: string
  events: PublicEvent[]
  origin: string
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onDelete: (id: string) => void
  loading: boolean
  collapsible?: boolean
}) {
  const [open, setOpen] = useState(!collapsible)

  if (!events.length) return null

  return (
    <div>
      <button
        onClick={() => collapsible && setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          cursor: collapsible ? 'pointer' : 'default',
          padding: '0 0 0.8rem',
          width: '100%',
        }}
        type="button"
      >
        <span
          style={{
            ...softMono,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          {title}
        </span>

        <span
          style={{
            ...softMono,
            fontSize: 10,
            color: 'rgba(255,255,255,0.74)',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 999,
            padding: '2px 8px',
          }}
        >
          {events.length}
        </span>

        {collapsible &&
          (open ? (
            <ChevronUp size={14} color="rgba(255,255,255,0.6)" />
          ) : (
            <ChevronDown size={14} color="rgba(255,255,255,0.6)" />
          ))}
      </button>

      {open && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '0.95rem',
          }}
        >
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              origin={origin}
              onPublish={onPublish}
              onUnpublish={onUnpublish}
              onDelete={onDelete}
              loading={loading}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default MyEventsTab