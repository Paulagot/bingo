// src/components/Quiz/tickets/TicketedEventInfoPanel.tsx

import React from 'react';
import { Calendar, MapPin, Globe, Layers } from 'lucide-react';
import type { EventDetails } from './types';

function formatEventDate(
  startDatetime: string | null,
  eventDate: string | null,
  timeZone: string | null,
): string {
  const raw = startDatetime || eventDate;
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleDateString('en-GB', {
      weekday: 'long',
      day:     'numeric',
      month:   'long',
      year:    'numeric',
      ...(startDatetime ? { hour: '2-digit', minute: '2-digit' } : {}),
      timeZone: timeZone || undefined,
    });
  } catch {
    return raw;
  }
}

function formatLocation(details: EventDetails): string | null {
  if (details.locationType === 'online')
    return details.onlineUrl || details.locationLabel || 'Online';
  if (details.locationType === 'hybrid')
    return `${details.locationLabel || 'Venue TBA'} · also online`;
  return details.locationLabel || null;
}

function LocationIcon({ type }: { type: EventDetails['locationType'] }) {
  if (type === 'online') return <Globe className="h-4 w-4 flex-shrink-0 text-gray-400" />;
  if (type === 'hybrid') return <Layers className="h-4 w-4 flex-shrink-0 text-gray-400" />;
  return <MapPin className="h-4 w-4 flex-shrink-0 text-gray-400" />;
}

export const TicketedEventInfoPanel: React.FC<{ eventDetails: EventDetails }> = ({
  eventDetails,
}) => {
  const dateStr     = formatEventDate(eventDetails.startDatetime, eventDetails.eventDate, eventDetails.timeZone);
  const locationStr = formatLocation(eventDetails);

  return (
    <div className="rounded-xl border border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)] p-4 mb-4">
      <h2 className="text-base font-bold text-[#102532] mb-1">{eventDetails.title}</h2>
      {eventDetails.summary && (
        <p className="text-sm text-[#52636f] mb-3">{eventDetails.summary}</p>
      )}
      <div className="space-y-1.5">
        {dateStr && (
          <div className="flex items-center gap-2 text-sm text-[#52636f]">
            <Calendar className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span>{dateStr}</span>
          </div>
        )}
        {locationStr && (
          <div className="flex items-center gap-2 text-sm text-[#52636f]">
            <LocationIcon type={eventDetails.locationType} />
            {eventDetails.locationType === 'online' && eventDetails.onlineUrl ? (
              <a
                href={eventDetails.onlineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#157f85] underline truncate"
              >
                {eventDetails.locationLabel || eventDetails.onlineUrl}
              </a>
            ) : (
              <span>{locationStr}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};