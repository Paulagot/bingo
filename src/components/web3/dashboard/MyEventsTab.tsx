// src/components/web3/dashboard/MyEventsTab.tsx

import  { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  deleteEvent,
  getMyEvents,
  publishEvent,
  unpublishEvent,
  type PublicEvent,
} from '../../../services/web3PublicEventsService'
import {
  getOrigin,
  panelStyle,
  softMono,
} from './my-events/myEventsHelpers'
import { EventGroup } from './my-events/EventGroup'
import { ScheduleEventModal } from './my-events/ScheduleEventModal'

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
  const [editingEvent, setEditingEvent] = useState<PublicEvent | null>(null)

  const origin = getOrigin()

  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
    : null

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

  function openCreateModal() {
    setEditingEvent(null)
    setModalOpen(true)
  }

  function openEditModal(event: PublicEvent) {
    setEditingEvent(event)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingEvent(null)
  }

  function handleSaved(savedEvent: PublicEvent) {
    setEvents(prev => {
      const exists = prev.some(event => event.id === savedEvent.id)

      if (exists) {
        return prev.map(event => event.id === savedEvent.id ? savedEvent : event)
      }

      return [savedEvent, ...prev]
    })
  }

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
              fontFamily: "'Syne',sans-serif",
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
            {shortWallet && (
              <span style={{ ...softMono, fontSize: 11, color: 'rgba(255,255,255,0.38)', marginLeft: 8 }}>
                {shortWallet}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={openCreateModal}
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
              fontFamily: "'Syne',sans-serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#ffffff',
              margin: '0 0 0.45rem',
            }}
          >
            No events yet
          </p>

          <p style={{ ...softMono, fontSize: 12, color: 'rgba(255,255,255,0.62)', margin: '0 0 1.5rem' }}>
            Schedule your first event and get it on the discovery page.
          </p>

          <button
            onClick={openCreateModal}
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
            onEdit={openEditModal}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            loading={actionLoading}
          />

          <EventGroup
            title="Upcoming"
            events={upcoming}
            origin={origin}
            onEdit={openEditModal}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            loading={actionLoading}
          />

          <EventGroup
            title="Drafts"
            events={drafts}
            origin={origin}
            onEdit={openEditModal}
            onPublish={handlePublish}
            onUnpublish={handleUnpublish}
            onDelete={handleDelete}
            loading={actionLoading}
          />

          <EventGroup
            title="Past"
            events={ended}
            origin={origin}
            onEdit={openEditModal}
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
          event={editingEvent}
          onClose={closeModal}
          onSaved={handleSaved}
          hostName={hostName}
        />
      )}
    </div>
  )
}

export default MyEventsTab
