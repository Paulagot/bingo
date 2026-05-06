// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/LinkPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import {
  eventIntegrationsService,
  type ClubEventOption,
} from '../../../services/EventIntegrationsService';

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

interface LinkPanelProps {
  room: Room | null;
  onClose: () => void;
  onLinked?: () => void;
}

export default function LinkPanel({ room, onClose, onLinked }: LinkPanelProps) {
  const [events, setEvents] = useState<ClubEventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!room) return;
    setSelectedEventId('');
    setLinkError(null);
    setEventsError(null);

    const load = async () => {
      try {
        setEventsLoading(true);
        const res = await eventIntegrationsService.listClubEvents();
        setEvents(res.events || []);
      } catch (e: any) {
        setEventsError(e?.message || 'Failed to load events');
      } finally {
        setEventsLoading(false);
      }
    };
    load();
  }, [room]);

  const sortedEvents = useMemo(() => [...events], [events]);

  const confirmLink = async () => {
    if (!room) return;
    const eventId = selectedEventId.trim();
    if (!eventId) { setLinkError('Please select an event'); return; }

    try {
      setLinkLoading(true);
      setLinkError(null);
      await eventIntegrationsService.link(eventId, {
        integration_type: 'quiz_web2',
        external_ref: room.room_id,
      });
      onLinked?.();
      onClose();
    } catch (e: any) {
      setLinkError(e?.message || 'Failed to link quiz to event');
    } finally {
      setLinkLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-5 space-y-4">
        {room && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
            Room: <span className="font-mono font-medium text-gray-900">{room.room_id}</span>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Select event
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
            <p className="mt-2 text-sm text-red-600">{eventsError}</p>
          )}
          {linkError && (
            <p className="mt-2 text-sm text-red-600">{linkError}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={linkLoading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirmLink}
            disabled={linkLoading || eventsLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Link2 className="h-4 w-4" />
            {linkLoading ? 'Linking…' : 'Link to Event'}
          </button>
        </div>
      </div>
    </div>
  );
}