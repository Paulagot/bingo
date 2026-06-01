// src/components/mgtsystem/components/cards/FundraiselyEventCard.tsx

import { useState, useEffect, useRef } from 'react';
import {
  Calendar, MapPin, Globe, Layers, Target, Ticket,
  Trophy, Play, FileText, Eye, PlusCircle,
  TrendingUp, ChevronDown, Pencil,
} from 'lucide-react';
import type { Event } from '../../types/event';
import type { RoomStats } from '../../services/quizRoomServices';
import { useCurrency } from '../../hooks/useCurrency';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LinkedActivity {
  room_id: string;
  game_type: 'quiz' | 'elimination';
  status: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';
}

export interface FundraiselyEventCardProps {
  event: Event;
  campaignName?: string;
  linkedActivity?: LinkedActivity;
  activityStats?: RoomStats;
  outstandingCount?: number;
  onOpenDrawer: () => void;
  onAddActivity: (type: 'quiz' | 'elimination') => void;
  onEdit: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}



function getTicketsSold(stats?: RoomStats): number {
  if (!stats) return 0;
  const n = stats.ticketsSold ?? (stats as any).uniquePlayers ?? 0;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

// ── Colour system ─────────────────────────────────────────────────────────────
// Status drives the card's left border accent — strong, distinct, instantly readable

interface ActivityTheme {
  stripe: string;       // top 3px stripe
  border: string;       // full card left accent border colour
  badgeBg: string;
  badgeColor: string;
  badgeBorder: string;
}

function activityTheme(status: LinkedActivity['status']): ActivityTheme {
  switch (status) {
    case 'live':
      return {
        stripe: '#22c55e',
        border: '#22c55e',
        badgeBg: '#dcf5e7', badgeColor: '#166534', badgeBorder: '#bbf0d0',
      };
    case 'open':
      return {
        stripe: '#f59e0b',
        border: '#f59e0b',
        badgeBg: '#fef3c7', badgeColor: '#92400e', badgeBorder: '#fde68a',
      };
    case 'scheduled':
      return {
        stripe: '#157f85',
        border: '#157f85',
        badgeBg: 'rgba(21,127,133,0.12)', badgeColor: '#157f85', badgeBorder: 'rgba(21,127,133,0.3)',
      };
    case 'completed':
      return {
        stripe: '#6366f1',
        border: '#6366f1',
        badgeBg: '#eef2ff', badgeColor: '#4338ca', badgeBorder: '#c7d2fe',
      };
    case 'cancelled':
      return {
        stripe: '#e9574f',
        border: '#e9574f',
        badgeBg: 'rgba(233,87,79,0.1)', badgeColor: '#c8423b', badgeBorder: 'rgba(233,87,79,0.3)',
      };
  }
}

// Game type gets its own distinct colour — different from status
function gameTypeBadgeStyle(type: 'quiz' | 'elimination'): React.CSSProperties {
  if (type === 'elimination') {
    return { background: '#fff1f0', color: '#c8423b', borderColor: '#fca5a5' };
  }
  return { background: '#f0fdf4', color: '#15803d', borderColor: '#86efac' };
}

function drawerActionMeta(status: string) {
  if (status === 'completed') return { label: 'Report',   Icon: FileText };
  if (status === 'live' || status === 'open') return { label: 'View', Icon: Eye };
  return { label: 'Settings', Icon: Play };
}

// ── Add Activity dropdown ─────────────────────────────────────────────────────

interface AddActivityDropdownProps {
  open: boolean;
  onToggle: () => void;
  onSelect: (type: 'quiz' | 'elimination') => void;
}

function AddActivityDropdown({ open, onToggle, onSelect }: AddActivityDropdownProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onToggle]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
        style={{ background: '#157f85', color: '#fff' }}
      >
        <PlusCircle className="h-3.5 w-3.5" />
        Add Activity
        <ChevronDown className="h-3 w-3" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            zIndex: 9999,
            width: '208px',
            background: '#fff',
            border: '1px solid #dce1df',
            borderRadius: '12px',
            boxShadow: '0 12px 34px rgba(16,37,50,0.15)',
            overflow: 'hidden',
          }}
          ref={el => {
            if (el && ref.current) {
              const btn = ref.current.querySelector('button');
              if (btn) {
                const rect = btn.getBoundingClientRect();
                el.style.top  = `${rect.top - el.offsetHeight - 6}px`;
                el.style.left = `${rect.right - 208}px`;
              }
            }
          }}
        >
          <button type="button" onClick={() => onSelect('quiz')}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f6f1e8]">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: '#f0fdf4' }}>
              <Play className="h-3.5 w-3.5" style={{ color: '#15803d' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#102532' }}>Quiz Night</p>
              <p className="text-xs" style={{ color: '#52636f' }}>Ticketed fundraising quiz</p>
            </div>
          </button>

          <div style={{ borderTop: '1px solid #dce1df' }} />

          <button type="button" onClick={() => onSelect('elimination')}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f6f1e8]">
            <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
              style={{ background: '#fff1f0' }}>
              <Trophy className="h-3.5 w-3.5" style={{ color: '#c8423b' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#102532' }}>Elimination</p>
              <p className="text-xs" style={{ color: '#52636f' }}>Last player standing game</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function FundraiselyEventCard({
  event,
  campaignName,
  linkedActivity,
  activityStats,
  outstandingCount = 0,
  onOpenDrawer,
  onAddActivity,
  onEdit,
}: FundraiselyEventCardProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { fmt: formatMoney } = useCurrency();

  const hasActivity  = !!linkedActivity;
  const ticketsSold  = getTicketsSold(activityStats);
  const totalIncome  = activityStats?.totalIncome ?? 0;
  const goalAmount   = Number(event.goal_amount || 0);
  const raisedAmount = Number(event.actual_amount || 0);
  const progress     = goalAmount > 0 ? Math.min(Math.round((raisedAmount / goalAmount) * 100), 100) : 0;

  const displayDate = event.start_datetime ? formatDate(event.start_datetime) : formatDate(event.event_date);
  const displayTime = event.start_datetime ? formatTime(event.start_datetime) : '';

  const LocationIcon = event.location_type === 'online' ? Globe
    : event.location_type === 'hybrid' ? Layers : MapPin;

  const locationText = event.location_type === 'online'
    ? event.location_label || 'Online'
    : event.location_type === 'hybrid'
    ? `${event.location_label || 'Venue TBA'} + Online`
    : event.location_label || (event as any).venue || 'Venue TBA';

  const theme      = hasActivity ? activityTheme(linkedActivity!.status) : null;
  const drawerMeta = hasActivity ? drawerActionMeta(linkedActivity!.status) : null;
  const DrawerIcon = drawerMeta?.Icon;

  const handleActivitySelect = (type: 'quiz' | 'elimination') => {
    setDropdownOpen(false);
    onAddActivity(type);
  };

  return (
    <div
      className="group relative flex flex-col rounded-xl shadow-sm transition-shadow hover:shadow-md overflow-hidden"
      style={{ background: '#ffffff', border: '1px solid #dce1df' }}
    >
      {/* Top stripe — status colour, thick enough to read at a glance */}
      <div className="h-1.5 w-full flex-shrink-0"
        style={{ background: theme?.stripe ?? '#dce1df' }} />

      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">

          {/* Badges row — status + game type only (published/draft commented out) */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">

            {/* Activity status badge */}
            {hasActivity && theme && (
              <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{ background: theme.badgeBg, color: theme.badgeColor, borderColor: theme.badgeBorder }}>
                {linkedActivity!.status === 'live' && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                )}
                {linkedActivity!.status.charAt(0).toUpperCase() + linkedActivity!.status.slice(1)}
              </span>
            )}

            {/* Game type badge — distinct green/red so it doesn't clash with status */}
            {hasActivity && (
              linkedActivity!.game_type === 'elimination' ? (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={gameTypeBadgeStyle('elimination')}>
                  <Trophy className="h-3 w-3" /> Elimination
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={gameTypeBadgeStyle('quiz')}>
                  <Play className="h-3 w-3" /> Quiz
                </span>
              )
            )}

            {/* No activity — show a subtle placeholder */}
            {!hasActivity && (
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                style={{ background: '#f6f1e8', color: '#8a9bab', borderColor: '#dce1df' }}>
                No activity yet
              </span>
            )}

            {/*
              PUBLISH PILL — commented out until full mgt system is merged
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={event.is_published
                  ? { background: 'rgba(21,127,133,0.12)', color: '#157f85', borderColor: 'rgba(21,127,133,0.3)' }
                  : { background: 'rgba(210,181,130,0.2)', color: '#8a6d2f', borderColor: 'rgba(210,181,130,0.5)' }
                }>
                {event.is_published ? 'Published' : 'Draft'}
              </span>
            */}
          </div>

          {/* Edit button — Pencil icon with tooltip */}
          <button type="button" onClick={onEdit}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[#f6f1e8] relative group/edit"
            style={{ color: '#8a9bab' }}
            title="Edit event">
            <Pencil className="h-3.5 w-3.5" />
            <span className="pointer-events-none absolute -bottom-7 right-0 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-semibold opacity-0 group-hover/edit:opacity-100 transition-opacity z-10"
              style={{ background: '#102532', color: '#fff' }}>
              Edit event
            </span>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold leading-snug mb-1" style={{ color: '#102532' }}>
          {event.title || 'Untitled Event'}
        </h3>

        {/* Event type chip */}
        {event.type && (
          <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium mb-2"
            style={{ background: '#f6f1e8', color: '#52636f' }}>
            {event.type}
          </span>
        )}

        {/* Date + location */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#52636f' }}>
            <Calendar className="h-3.5 w-3.5 flex-shrink-0" style={{ color: theme?.stripe ?? '#157f85' }} />
            <span className="font-medium">{displayDate}</span>
            {displayTime && <span style={{ color: '#8a9bab' }}>at {displayTime}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#52636f' }}>
            <LocationIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#8a9bab' }} />
            <span className="truncate">{locationText}</span>
          </div>
          {campaignName && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: '#52636f' }}>
              <Target className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#8a9bab' }} />
              <span className="truncate">{campaignName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid — only when activity linked */}
      {hasActivity && (
        <div className="grid grid-cols-2 gap-px" style={{ background: '#dce1df', borderTop: '1px solid #dce1df' }}>
          <div className="px-3 py-2.5" style={{ background: '#ffffff' }}>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#52636f' }}>Tickets sold</p>
            <p className="text-sm font-bold" style={{ color: ticketsSold > 0 ? '#4f46e5' : '#d1d5db' }}>
              {ticketsSold > 0
                ? <span className="flex items-center gap-1"><Ticket className="h-3 w-3" />{ticketsSold}</span>
                : '—'}
            </p>
          </div>
          <div className="px-3 py-2.5" style={{ background: '#ffffff' }}>
            <p className="text-xs font-medium mb-0.5" style={{ color: '#52636f' }}>Income</p>
            <p className="text-sm font-bold" style={{ color: totalIncome > 0 ? '#16a34a' : '#d1d5db' }}>
              {totalIncome > 0 ? formatMoney(totalIncome) : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Goal progress */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #f1f0ee' }}>
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span style={{ color: '#52636f' }}>
            Goal: <span className="font-semibold" style={{ color: '#102532' }}>{formatMoney(goalAmount)}</span>
          </span>
          {raisedAmount > 0 && (
            <span className="flex items-center gap-1 font-semibold" style={{ color: '#16a34a' }}>
              <TrendingUp className="h-3 w-3" />{progress}%
            </span>
          )}
        </div>
        <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: '#f1f0ee' }}>
          <div className="h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%`, background: progress >= 100 ? '#22c55e' : theme?.stripe ?? '#157f85' }} />
        </div>
        {raisedAmount > 0 && (
          <p className="mt-1 text-xs" style={{ color: '#52636f' }}>{formatMoney(raisedAmount)} raised</p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between gap-2 px-4 py-2.5"
        style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>

        {/*
          PUBLISH BUTTON — commented out until full mgt system is merged
          <button type="button"
            onClick={event.is_published ? onUnpublish : onPublish}
            className="text-xs font-medium transition-colors hover:underline"
            style={{ color: event.is_published ? '#8a9bab' : '#157f85' }}>
            {event.is_published ? 'Unpublish' : 'Publish'}
          </button>
        */}
        <div /> {/* spacer so action stays right-aligned */}

        <div className="flex items-center gap-2">
          {hasActivity && drawerMeta && DrawerIcon && (
            <>
              {outstandingCount > 0 && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700">
                  {outstandingCount} unpaid
                </span>
              )}
              <button type="button" onClick={onOpenDrawer}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                style={{ background: theme?.border ?? '#157f85', color: '#fff' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                <DrawerIcon className="h-3.5 w-3.5" />
                {drawerMeta.label}
              </button>
            </>
          )}

          {!hasActivity && (
            <AddActivityDropdown
              open={dropdownOpen}
              onToggle={() => setDropdownOpen(v => !v)}
              onSelect={handleActivitySelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FundraiselyEventCard;