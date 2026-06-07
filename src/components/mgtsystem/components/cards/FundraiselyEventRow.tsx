// src/components/mgtsystem/components/cards/FundraiselyEventRow.tsx

import {
  MapPin, Globe, Layers,
  Trophy, Play, Settings, FileText, Eye, PlusCircle,
  Ticket,
} from 'lucide-react';

import type { RoomStats } from '../../services/quizRoomServices';
import type { FundraiselyEventCardProps } from './FundraiselyEventCard';
import { useCurrency } from '../../hooks/useCurrency';

// FIX: import the shared UTC-aware helpers instead of using new Date() directly.
// See src/utils/dateUtils.ts for full explanation.
import { utcToLocalDate, utcToLocalTime } from '../../../../utils/dateUtils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTicketsSold(stats?: RoomStats): number {
  if (!stats) return 0;
  const n = stats.ticketsSold ?? (stats as any).uniquePlayers ?? 0;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function activityBadgeStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    live:      { background: '#dcf5e7', color: '#166534', borderColor: '#bbf0d0' },
    scheduled: { background: 'rgba(21,127,133,0.12)', color: '#157f85', borderColor: 'rgba(21,127,133,0.3)' },
    completed: { background: '#f1f0ee', color: '#52636f', borderColor: '#dce1df' },
    cancelled: { background: 'rgba(233,87,79,0.1)', color: '#c8423b', borderColor: 'rgba(233,87,79,0.3)' },
    open:      { background: 'rgba(210,181,130,0.2)', color: '#8a6d2f', borderColor: 'rgba(210,181,130,0.5)' },
  };
  return map[status] ?? { background: 'rgba(21,127,133,0.12)', color: '#157f85', borderColor: 'rgba(21,127,133,0.3)' };
}

function drawerActionMeta(status: string) {
  if (status === 'completed') return { label: 'Report',   Icon: FileText };
  if (status === 'live' || status === 'open') return { label: 'View', Icon: Eye };
  return { label: 'Settings', Icon: Settings };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FundraiselyEventRow({
  event,
  linkedActivity,
  activityStats,
  outstandingCount = 0,
  onOpenDrawer,
  onAddActivity,
  onEdit,
  onPublish,
  onUnpublish,
}: FundraiselyEventCardProps) {
  const hasActivity  = !!linkedActivity;
  const ticketsSold  = getTicketsSold(activityStats);
  const totalIncome  = activityStats?.totalIncome ?? 0;
  const goalAmount   = Number(event.goal_amount || 0);
  const raisedAmount = Number(event.actual_amount || 0);
  const progress     = goalAmount > 0 ? Math.min(Math.round((raisedAmount / goalAmount) * 100), 100) : 0;

  // FIX: use UTC-aware helpers with the event's stored timezone.
  // Old code used formatDate/formatTime which called new Date(value).toLocaleDateString()
  // — fine with a Z suffix but breaks with bare strings like "2025-06-07T18:00:00" (no Z).
  // utcToLocalDate/Time normalise to UTC first, then convert to the event's local timezone.
  const tz          = event.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const displayDate = event.start_datetime
    ? utcToLocalDate(event.start_datetime, tz)
    : utcToLocalDate(event.event_date, tz);
  const displayTime = event.start_datetime
    ? utcToLocalTime(event.start_datetime, tz)
    : '';

  const { fmt: formatMoney } = useCurrency();

  const LocationIcon = event.location_type === 'online' ? Globe
    : event.location_type === 'hybrid' ? Layers : MapPin;

  const locationText = event.location_type === 'online'
    ? event.location_label || 'Online'
    : event.location_label || event.venue || 'Venue TBA';

  const drawerMeta = hasActivity ? drawerActionMeta(linkedActivity!.status) : null;
  const DrawerIcon = drawerMeta?.Icon;

  return (
    <div
      className="group grid grid-cols-[2fr_1fr_1fr_1fr_1fr_120px] gap-4 items-center px-4 py-3 transition-colors hover:bg-[#fbf8f2]"
      style={{ borderBottom: '1px solid #f1f0ee' }}
    >
      {/* Event title + location */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-bold flex-shrink-0"
            style={event.is_published
              ? { background: 'rgba(21,127,133,0.10)', color: '#157f85', borderColor: 'rgba(21,127,133,0.25)' }
              : { background: 'rgba(210,181,130,0.15)', color: '#8a6d2f', borderColor: 'rgba(210,181,130,0.4)' }}>
            {event.is_published ? 'Live' : 'Draft'}
          </span>
          <span className="text-sm font-semibold truncate" style={{ color: '#102532' }}>
            {event.title || 'Untitled Event'}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: '#8a9bab' }}>
          <LocationIcon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{locationText}</span>
        </div>
        {goalAmount > 0 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: '#f1f0ee' }}>
              <div className="h-1 rounded-full"
                style={{ width: `${progress}%`, background: progress >= 100 ? '#22c55e' : '#157f85' }} />
            </div>
            <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#52636f' }}>
              {progress}%
            </span>
          </div>
        )}
      </div>

      {/* Date */}
      <div>
        <p className="text-xs font-semibold" style={{ color: '#102532' }}>{displayDate}</p>
        {displayTime && <p className="text-xs" style={{ color: '#8a9bab' }}>{displayTime}</p>}
      </div>

      {/* Activity type + status */}
      <div className="flex flex-col gap-1">
        {hasActivity ? (
          <>
            {linkedActivity!.game_type === 'elimination' ? (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit"
                style={{ background: 'rgba(233,87,79,0.1)', color: '#c8423b', borderColor: 'rgba(233,87,79,0.3)' }}>
                <Trophy className="h-2.5 w-2.5" /> Elimination
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit"
                style={{ background: 'rgba(21,127,133,0.1)', color: '#157f85', borderColor: 'rgba(21,127,133,0.3)' }}>
                <Play className="h-2.5 w-2.5" /> Quiz
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold w-fit"
              style={activityBadgeStyle(linkedActivity!.status)}>
              {linkedActivity!.status === 'live' && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                </span>
              )}
              {linkedActivity!.status.charAt(0).toUpperCase() + linkedActivity!.status.slice(1)}
            </span>
          </>
        ) : (
          <span className="text-xs" style={{ color: '#b8c6b0' }}>No activity</span>
        )}
      </div>

      {/* Tickets */}
      <div>
        {hasActivity ? (
          <span className="text-sm font-bold flex items-center gap-1"
            style={{ color: ticketsSold > 0 ? '#4f46e5' : '#d1d5db' }}>
            {ticketsSold > 0 ? <><Ticket className="h-3 w-3" />{ticketsSold}</> : '—'}
          </span>
        ) : <span style={{ color: '#d1d5db' }}>—</span>}
      </div>

      {/* Income */}
      <div>
        {hasActivity ? (
          <span className="text-sm font-bold" style={{ color: totalIncome > 0 ? '#16a34a' : '#d1d5db' }}>
            {totalIncome > 0 ? formatMoney(totalIncome) : '—'}
          </span>
        ) : <span style={{ color: '#d1d5db' }}>—</span>}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1.5">
        {outstandingCount > 0 && (
          <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-700">
            {outstandingCount} unpaid
          </span>
        )}
        <button type="button" onClick={onEdit} title="Edit event"
          className="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
          style={{ color: '#8a9bab' }}>
          <Settings className="h-3.5 w-3.5" />
        </button>
        <button type="button"
          onClick={event.is_published ? onUnpublish : onPublish}
          className="hidden lg:block rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors"
          style={event.is_published
            ? { background: '#f1f0ee', color: '#8a9bab' }
            : { background: 'rgba(21,127,133,0.1)', color: '#157f85' }}>
          {event.is_published ? 'Unpublish' : 'Publish'}
        </button>
        {hasActivity && drawerMeta && DrawerIcon ? (
          <button type="button" onClick={onOpenDrawer}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: '#157f85', color: '#fff' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#0e6268')}
            onMouseLeave={e => (e.currentTarget.style.background = '#157f85')}>
            <DrawerIcon className="h-3 w-3" />
            {drawerMeta.label}
          </button>
        ) : (
          <button type="button"
            onClick={() => onAddActivity('quiz')}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors"
            style={{ background: '#f6f1e8', color: '#157f85', border: '1px solid rgba(21,127,133,0.3)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(21,127,133,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f6f1e8')}>
            <PlusCircle className="h-3 w-3" /> Add
          </button>
        )}
      </div>
    </div>
  );
}

export default FundraiselyEventRow;