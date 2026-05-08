// src/components/web3/dashboard/my-events/EventGroup.tsx

import  { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { PublicEvent } from '../../../../services/web3PublicEventsService'
import { softMono } from './myEventsHelpers'
import { EventCard } from './EventCard'

interface EventGroupProps {
  title: string
  events: PublicEvent[]
  origin: string
  onEdit: (event: PublicEvent) => void
  onPublish: (id: string) => void
  onUnpublish: (id: string) => void
  onDelete: (id: string) => void
  loading: boolean
  collapsible?: boolean
}

export function EventGroup({
  title,
  events,
  origin,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
  loading,
  collapsible = false,
}: EventGroupProps) {
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

        {collapsible && (
          open
            ? <ChevronUp size={14} color="rgba(255,255,255,0.6)" />
            : <ChevronDown size={14} color="rgba(255,255,255,0.6)" />
        )}
      </button>

      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.95rem' }}>
          {events.map(event => (
            <EventCard
              key={event.id}
              event={event}
              origin={origin}
              onEdit={onEdit}
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