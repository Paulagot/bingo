import { useEffect, useMemo, useState } from 'react';
import { XCircle, Link2 } from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../shared/api/quiz.api';
import {
  eventIntegrationsService,
  type ClubEventOption,
} from '../services/EventIntegrationsService';

type Props = {
  open: boolean;
  room: Room | null;
  onClose: () => void;
  onLinked?: () => void; // optional callback to refresh room list / linked titles
};

function formatEventOption(ev: ClubEventOption) {
  const dt = ev.start_datetime || ev.event_date || null;

  let suffix = '';
  if (dt) {
    const d = new Date(dt);
    if (!Number.isNaN(d.getTime())) {
      suffix = ` — ${d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`;
    }
  }

  return `${ev.title}${suffix}`;
}

export default function LinkQuizToEventModal({ open, room, onClose, onLinked }: Props) {
  const [events, setEvents] = useState<ClubEventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const canClose = !linkLoading;

  // Reset state on open
  useEffect(() => {
    if (!open) return;
    setSelectedEventId('');
    setLinkError(null);
    setEventsError(null);
  }, [open]);

  // Load events when opening
  useEffect(() => {
    const load = async () => {
      if (!open) return;

      try {
        setEventsLoading(true);
        setEventsError(null);
        const res = await eventIntegrationsService.listClubEvents();
        setEvents(res.events || []);
      } catch (e: any) {
        console.error('[LinkQuizToEventModal] ❌ listClubEvents failed:', e);
        setEvents([]);
        setEventsError(e?.message || 'Failed to load events');
      } finally {
        setEventsLoading(false);
      }
    };

    load();
  }, [open]);

  const sortedEvents = useMemo(() => {
    // optional: stable sort by most recent first if you want
    return [...events];
  }, [events]);

  const confirmLink = async () => {
    if (!room) return;

    const eventId = selectedEventId.trim();
    if (!eventId) {
      setLinkError('Please select an event');
      return;
    }

    try {
      setLinkLoading(true);
      setLinkError(null);

      await eventIntegrationsService.link(eventId, {
        integration_type: 'quiz_web2',
        external_ref: room.room_id,
      });

      // done
      onLinked?.();
      onClose();
    } catch (e: any) {
      console.error('[LinkQuizToEventModal] ❌ link failed:', e);
      setLinkError(e?.message || 'Failed to link quiz to event');
    } finally {
      setLinkLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!canClose) return;
          onClose();
        }}
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Link quiz to event</h3>
            <p className="text-xs text-gray-600 mt-1">
              Room:{' '}
              <span className="font-mono">
                {room?.room_id ? room.room_id : '—'}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => canClose && onClose()}
            disabled={!canClose}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title="Close"
          >
            <XCircle className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Event
          </label>

          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={eventsLoading || linkLoading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
          >
            <option value="">
              {eventsLoading ? 'Loading events…' : 'Choose an event…'}
            </option>

            {sortedEvents.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {formatEventOption(ev)}
              </option>
            ))}
          </select>

          {eventsError && (
            <div className="mt-3 text-sm text-red-600">{eventsError}</div>
          )}

          {linkError && (
            <div className="mt-3 text-sm text-red-600">{linkError}</div>
          )}

          {/* Actions */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => canClose && onClose()}
              disabled={!canClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={confirmLink}
              disabled={linkLoading || eventsLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              <Link2 className="h-4 w-4" />
              {linkLoading ? 'Linking…' : 'Link to Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
