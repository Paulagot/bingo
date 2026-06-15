// src/components/mgtsystem/components/cards/FundraiselyEventCard.tsx

import { useState, useEffect, useRef } from 'react';
import {
  Calendar, MapPin, Globe, Layers, Target, Ticket,
  Trophy, Play, FileText, Eye, PlusCircle,
  TrendingUp, ChevronDown, Pencil, Settings,
} from 'lucide-react';
import type { Event } from '../../types/event';
import type { RoomStats } from '../../services/quizRoomServices';
import { useCurrency } from '../../hooks/useCurrency';
import { EventGoalProgress } from '../progress/EventGoalProgress';
import { utcToLocalDate, utcToLocalTime } from '../../../../utils/dateUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LinkedActivity {
  room_id: string;
  game_type: 'quiz' | 'elimination' | 'ticketed_event';
  status: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';
}

export interface FundraiselyEventCardProps {
  event: Event;
  campaignName?: string;
  linkedActivity?: LinkedActivity;
  activityStats?: RoomStats;
  outstandingCount?: number;
  onOpenDrawer: () => void;
  onAddActivity: (type: 'quiz' | 'elimination' | 'ticketed_event') => void;
  onEdit: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
}

// ── Colour system ─────────────────────────────────────────────────────────────

/**
 * LAYER 1 — Top stripe: game type identity
 * Lets you scan a column of cards and instantly know what kind of activity it is.
 */
const GAME_TYPE_COLOURS = {
  quiz:           { stripe: '#15803d', label: 'Quiz Night' },
  elimination:    { stripe: '#c8423b', label: 'Elimination' },
  ticketed_event: { stripe: '#0369a1', label: 'Ticketed Event' },
} satisfies Record<LinkedActivity['game_type'], { stripe: string; label: string }>;

/**
 * LAYER 2 — Status pill: current state of the activity
 * Independent of game type so you can see "what it is" vs "where it's at" at a glance.
 */
const STATUS_PILL = {
  live: {
    bg: '#dcf5e7', color: '#166534', border: '#bbf0d0', label: 'Live',
  },
  open: {
    bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: 'Open',
  },
  scheduled: {
    bg: 'rgba(21,127,133,0.1)', color: '#157f85', border: 'rgba(21,127,133,0.25)', label: 'Scheduled',
  },
  completed: {
    bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe', label: 'Completed',
  },
  cancelled: {
    bg: 'rgba(233,87,79,0.08)', color: '#c8423b', border: 'rgba(233,87,79,0.25)', label: 'Cancelled',
  },
} satisfies Record<LinkedActivity['status'], { bg: string; color: string; border: string; label: string }>;

/**
 * LAYER 3 — Action button: what happens when you click
 * Colour signals intent, not state.
 *   Settings/configure → teal (neutral, informational)
 *   View live / View open → amber (active, attention)
 *   Report → indigo (archival, data)
 */
const ACTION_BUTTON = {
  scheduled: {
    label: 'Settings', Icon: Settings,
    bg: '#157f85', hover: '#0e6168',
  },
  open: {
    label: 'View', Icon: Eye,
    bg: '#d97706', hover: '#b45309',
  },
  live: {
    label: 'View Live', Icon: Eye,
    bg: '#16a34a', hover: '#15803d',
  },
  completed: {
    label: 'Report', Icon: FileText,
    bg: '#4f46e5', hover: '#4338ca',
  },
  cancelled: {
    label: 'View', Icon: Eye,
    bg: '#6b7280', hover: '#4b5563',
  },
} satisfies Record<LinkedActivity['status'], { label: string; Icon: React.ElementType; bg: string; hover: string }>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTicketsSold(stats?: RoomStats): number {
  if (!stats) return 0;
  const n = stats.ticketsSold ?? (stats as any).uniquePlayers ?? 0;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function GameTypeIcon({ type, size = 14 }: { type: LinkedActivity['game_type']; size?: number }) {
  const s = { width: size, height: size };
  if (type === 'elimination') return <Trophy style={s} />;
  if (type === 'ticketed_event') return <Ticket style={s} />;
  return <Play style={s} />;
}

// ── Add Activity dropdown ─────────────────────────────────────────────────────

interface AddActivityDropdownProps {
  open: boolean;
  onToggle: () => void;
  onSelect: (type: 'quiz' | 'elimination' | 'ticketed_event') => void;
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

  const options: Array<{
    type: LinkedActivity['game_type'];
    label: string;
    sub: string;
    Icon: React.ElementType;
  }> = [
    { type: 'quiz',           label: 'Quiz Night',     sub: 'Ticketed fundraising quiz',   Icon: Play   },
    { type: 'ticketed_event', label: 'Ticketed Event',  sub: 'Dinner, raffle, charity event…', Icon: Ticket },
    { type: 'elimination',    label: 'Elimination',     sub: 'Last player standing game',   Icon: Trophy },
  ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
        style={{ background: '#157f85', color: '#fff' }}
      >
        <PlusCircle className="h-3.5 w-3.5" />
        Add Activity
        <ChevronDown
          className="h-3 w-3"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'fixed', zIndex: 9999, width: 212,
            background: '#fff', border: '1px solid #dce1df',
            borderRadius: 12, boxShadow: '0 12px 34px rgba(16,37,50,0.15)',
            overflow: 'hidden',
          }}
          ref={el => {
            if (el && ref.current) {
              const btn = ref.current.querySelector('button');
              if (btn) {
                const r = btn.getBoundingClientRect();
                el.style.top  = `${r.top - el.offsetHeight - 6}px`;
                el.style.left = `${r.right - 212}px`;
              }
            }
          }}
        >
          {options.map(({ type, label, sub, Icon }, i) => {
            const stripe = GAME_TYPE_COLOURS[type].stripe;
            return (
              <div key={type}>
                {i > 0 && <div style={{ borderTop: '1px solid #f1f0ee' }} />}
                <button
                  type="button"
                  onClick={() => onSelect(type)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f6f1e8]"
                >
                  {/* Stripe swatch so the game-type colour system is visible even in the dropdown */}
                  <div
                    className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${stripe}18` }}
                  >
                    <Icon style={{ width: 14, height: 14, color: stripe }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#102532' }}>{label}</p>
                    <p className="text-xs" style={{ color: '#52636f' }}>{sub}</p>
                  </div>
                </button>
              </div>
            );
          })}
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
  const goalAmount   = Number(event.goal_amount  || 0);
  const raisedAmount = Number(event.actual_amount || 0);

  const tz          = event.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const displayDate = event.start_datetime
    ? utcToLocalDate(event.start_datetime, tz)
    : utcToLocalDate(event.event_date, tz);
  const displayTime = event.start_datetime ? utcToLocalTime(event.start_datetime, tz) : '';

  const LocationIcon = event.location_type === 'online' ? Globe
    : event.location_type === 'hybrid' ? Layers : MapPin;

  const locationText = event.location_type === 'online'
    ? event.location_label || 'Online'
    : event.location_type === 'hybrid'
    ? `${event.location_label || 'Venue TBA'} + Online`
    : event.location_label || (event as any).venue || 'Venue TBA';

  // Derive the three colour layers
  const gameColour   = hasActivity ? GAME_TYPE_COLOURS[linkedActivity!.game_type] : null;
  const statusPill   = hasActivity ? STATUS_PILL[linkedActivity!.status] : null;
  const actionButton = hasActivity ? ACTION_BUTTON[linkedActivity!.status] : null;
  const ActionIcon   = actionButton?.Icon;

  return (
    <div
      className="group relative flex flex-col rounded-xl shadow-sm transition-shadow hover:shadow-md overflow-hidden"
      style={{ background: '#ffffff', border: '1px solid #dce1df' }}
    >
      {/* ── LAYER 1: game type stripe ───────────────────────────────────────── */}
      <div
        className="h-1.5 w-full flex-shrink-0"
        style={{ background: gameColour?.stripe ?? '#dce1df' }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-start justify-between gap-2 mb-2">

          {/* LAYER 2: status pill + game type label pill */}
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">

            {hasActivity && statusPill && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{ background: statusPill.bg, color: statusPill.color, borderColor: statusPill.border }}
              >
                {linkedActivity!.status === 'live' && (
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                )}
                {statusPill.label}
              </span>
            )}

            {/* Game type pill — uses the same stripe colour, keeps the system coherent */}
            {hasActivity && gameColour && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: `${gameColour.stripe}14`,
                  color: gameColour.stripe,
                  borderColor: `${gameColour.stripe}30`,
                }}
              >
                <GameTypeIcon type={linkedActivity!.game_type} size={11} />
                {gameColour.label}
              </span>
            )}

            {!hasActivity && (
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium"
                style={{ background: '#f6f1e8', color: '#8a9bab', borderColor: '#dce1df' }}
              >
                No activity yet
              </span>
            )}
          </div>

          {/* Edit button */}
          <button
            type="button"
            onClick={onEdit}
            className="flex-shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[#f6f1e8] relative group/edit"
            style={{ color: '#8a9bab' }}
            title="Edit event"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span
              className="pointer-events-none absolute -bottom-7 right-0 whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-semibold opacity-0 group-hover/edit:opacity-100 transition-opacity z-10"
              style={{ background: '#102532', color: '#fff' }}
            >
              Edit event
            </span>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold leading-snug mb-1" style={{ color: '#102532' }}>
          {event.title || 'Untitled Event'}
        </h3>

        {event.type && (
          <span
            className="inline-block rounded-md px-2 py-0.5 text-xs font-medium mb-2"
            style={{ background: '#f6f1e8', color: '#52636f' }}
          >
            {event.type}
          </span>
        )}

        {/* Meta */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs" style={{ color: '#52636f' }}>
            <Calendar
              className="h-3.5 w-3.5 flex-shrink-0"
              style={{ color: gameColour?.stripe ?? '#157f85' }}
            />
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

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
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

      {/* ── Goal progress ───────────────────────────────────────────────────── */}
      <div className="px-4" style={{ borderTop: '1px solid #f1f0ee' }}>
        <EventGoalProgress
          event={event}
          activityStats={activityStats}
          accentColor={gameColour?.stripe}
        />
      </div>

      {/* ── LAYER 3: action button footer ──────────────────────────────────── */}
      <div
        className="mt-auto flex items-center justify-between gap-2 px-4 py-2.5"
        style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}
      >
        <div />
        <div className="flex items-center gap-2">

          {hasActivity && actionButton && ActionIcon && (
            <>
              {outstandingCount > 0 && (
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-amber-100 text-amber-700">
                  {outstandingCount} unpaid
                </span>
              )}
              <button
                type="button"
                onClick={onOpenDrawer}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-85"
                style={{ background: actionButton.bg, color: '#fff' }}
              >
                <ActionIcon className="h-3.5 w-3.5" />
                {actionButton.label}
              </button>
            </>
          )}

          {!hasActivity && (
            <AddActivityDropdown
              open={dropdownOpen}
              onToggle={() => setDropdownOpen(v => !v)}
              onSelect={type => { setDropdownOpen(false); onAddActivity(type); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default FundraiselyEventCard;