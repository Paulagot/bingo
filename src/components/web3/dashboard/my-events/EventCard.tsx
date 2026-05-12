// src/components/web3/dashboard/my-events/EventCard.tsx

import React from 'react'
import {
  Calendar,
  Crosshair,
  Edit3,
  Link2,
  Trash2,
  Trophy,
  Wallet,
} from 'lucide-react'
import type { PublicEvent } from '../../../../services/web3PublicEventsService'
import {
  actionPillBase,
  formatDate,
  formatTime,
  outlineBtn,
  panelStyle,
  platformLabel,
  softMono,
  statusColor,
} from './myEventsHelpers'

interface EventCardProps {
  event: PublicEvent
  origin: string
  onEdit: (event: PublicEvent) => void
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onDelete: (id: string) => void
  loading: boolean
}

export function EventCard({
  event,
  origin,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
  loading,
}: EventCardProps) {
  const sc = statusColor(event.status)

  const launchPath =
    event.event_type === 'quiz'
      ? `${origin}/web3/quiz?action=host&eventId=${encodeURIComponent(event.id)}`
      : `${origin}/web3/elimination?action=host&eventId=${encodeURIComponent(event.id)}`

  return (
    <div style={{ ...panelStyle, padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                ...softMono,
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '3px 8px',
                borderRadius: 6,
                textTransform: 'uppercase',
                background: event.event_type === 'quiz' ? 'rgba(163,245,66,0.10)' : 'rgba(251,146,60,0.10)',
                color: event.event_type === 'quiz' ? '#c8ff79' : '#ffb26a',
                border: `1px solid ${event.event_type === 'quiz' ? 'rgba(163,245,66,0.25)' : 'rgba(251,146,60,0.25)'}`,
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
              fontFamily: "'Syne',sans-serif",
              fontSize: 17,
              fontWeight: 700,
              color: '#fff',
              margin: 0,
              lineHeight: 1.28,
            }}
          >
            {event.title}
          </h3>

          <p style={{ ...softMono, fontSize: 11, color: 'rgba(255,255,255,0.58)', margin: '4px 0 0' }}>
            {event.host_name}
          </p>
        </div>

        {event.status == 'draft' && (
          <button
            type="button"
            onClick={() => onEdit(event)}
            disabled={loading}
            aria-label="Edit event"
            title="Edit event"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.78)',
              cursor: loading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              opacity: loading ? 0.55 : 1,
            }}
          >
            <Edit3 size={14} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1.2rem', paddingTop: 2 }}>
        <MetaItem icon={<Calendar size={12} />} label={`${formatDate(event.event_date)} · ${formatTime(event.start_time, event.time_zone)}`} />
        <MetaItem icon={<Wallet size={12} />} label={`${event.entry_fee} ${event.fee_token} · ${event.charity_name}`} />
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
            {event.event_type === 'quiz'
              ? <><Trophy size={12} />Launch Quiz</>
              : <><Crosshair size={12} />Launch Elimination</>}
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
      <span style={{ color: 'rgba(255,255,255,0.54)', display: 'inline-flex' }}>
        {icon}
      </span>
      {label}
    </span>
  )
}