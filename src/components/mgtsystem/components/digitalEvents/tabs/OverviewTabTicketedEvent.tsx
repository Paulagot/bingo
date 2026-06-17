// src/components/mgtsystem/components/digitalEvents/tabs/OverviewTabTicketedEvent.tsx
// UPDATED: Pricing section now shows all ticket types and prices.
//          Income stat card shows price range instead of single "per ticket" label.

import type { ReactNode } from 'react';
import {
  Calendar, DollarSign, Users, Trophy, Hash, Link2,
  Clock, MapPin, Wallet, Sparkles, CheckCircle, CircleDollarSign,
  Heart, Tag, Ticket,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import type { RoomStats } from '../../../services/quizRoomServices';
import { useCurrency } from '../../../hooks/useCurrency';

interface TicketType {
  id:          string;
  name:        string;
  price:       string;
  isEnabled?:  boolean;
  quantity?:   number | null;
  saleEndsAt?: string | null;
}

interface Props {
  room:             Room;
  config:           any;
  stats?:           RoomStats;
  linkedEventTitle?: string | null;
}

type Tone = 'gray' | 'indigo' | 'green' | 'amber' | 'purple' | 'blue' | 'rose' | 'orange';

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function money(sym: string, value: number | string | null | undefined, decimals = 2) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return `${sym}0.00`;
  return `${sym}${n.toFixed(decimals)}`;
}

function titleCase(value: string | null | undefined) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatStatus(value: string | null | undefined) {
  const v = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    scheduled: 'Scheduled', live: 'Live', completed: 'Completed',
    cancelled: 'Cancelled', draft: 'Draft',
  };
  return labels[v] || titleCase(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return { compact: 'Not scheduled' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { compact: 'Not scheduled' };
  const date = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { compact: `${date} at ${time}` };
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

function StatCard({ icon, label, value, helper, tone = 'gray' }: {
  icon: ReactNode; label: string; value: ReactNode; helper?: string; tone?: Tone;
}) {
  const toneMap: Record<Tone, string> = {
    gray:   'border-gray-200 bg-white',
    indigo: 'border-indigo-200 bg-indigo-50',
    green:  'border-green-200 bg-green-50',
    amber:  'border-amber-200 bg-amber-50',
    purple: 'border-purple-200 bg-purple-50',
    blue:   'border-blue-200 bg-blue-50',
    rose:   'border-rose-200 bg-rose-50',
    orange: 'border-orange-200 bg-orange-50',
  };
  const iconMap: Record<Tone, string> = {
    gray: 'text-gray-500', indigo: 'text-[#157f85]', green: 'text-green-600',
    amber: 'text-amber-600', purple: 'text-purple-600', blue: 'text-[#157f85]',
    rose: 'text-rose-600', orange: 'text-orange-600',
  };
  const labelMap: Record<Tone, string> = {
    gray: 'text-gray-600', indigo: 'text-[#157f85]', green: 'text-green-700',
    amber: 'text-amber-700', purple: 'text-purple-700', blue: 'text-[#157f85]',
    rose: 'text-rose-700', orange: 'text-orange-700',
  };
  return (
    <div className={cn('rounded-xl border p-4', toneMap[tone])}>
      <div className={cn('mb-2', iconMap[tone])}>{icon}</div>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', labelMap[tone])}>{label}</p>
      <div className="mt-1 text-xl font-black text-gray-900">{value}</div>
      {helper && <p className="mt-1 text-[11px] text-gray-600">{helper}</p>}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0 text-gray-600">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children, muted = false }: {
  icon: ReactNode; label: string; children: ReactNode; muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <div className={cn('mt-0.5 flex-shrink-0', muted ? 'text-[#b8c6b0]' : 'text-gray-400')}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className={cn('mt-0.5 text-sm font-semibold', muted ? 'text-gray-600' : 'text-gray-900')}>{children}</div>
      </div>
    </div>
  );
}

function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    gray:   'bg-gray-100 text-gray-600 ring-[#dce1df]',
    indigo: 'bg-[rgba(21,127,133,0.08)] text-[#157f85] ring-indigo-200',
    green:  'bg-green-50 text-[#157f85] ring-green-200',
    amber:  'bg-amber-50 text-amber-700 ring-amber-200',
    purple: 'bg-purple-50 text-gray-600 ring-purple-200',
    blue:   'bg-blue-50 text-[#157f85] ring-blue-200',
    rose:   'bg-rose-50 text-red-600 ring-rose-200',
    orange: 'bg-orange-50 text-amber-700 ring-orange-200',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', map[tone])}>
      {children}
    </span>
  );
}

function getStatusTone(status: string | null | undefined): Tone {
  const v = String(status || '').toLowerCase();
  if (v === 'completed') return 'indigo';
  if (v === 'live')      return 'green';
  if (v === 'scheduled') return 'indigo';
  if (v === 'cancelled') return 'rose';
  return 'gray';
}

// Format a UTC ISO string back to a human-readable date in the event timezone
function formatSaleEndsAt(utcIso: string, timeZone: string | null): string {
  try {
    return new Date(utcIso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: timeZone || undefined,
    });
  } catch {
    return utcIso;
  }
}

export default function OverviewTabTicketedEvent({ room, config, stats, linkedEventTitle }: Props) {
  const { sym } = useCurrency(config);

  const statusTone    = getStatusTone(room.status);
  const statIncome    = typeof stats?.totalIncome === 'number' ? money(sym, stats.totalIncome) : '—';
  const isDonation    = config?.fundraisingMode === 'donation';
  const venueCapacity = Number(config?.roomCaps?.venueCapacity ?? config?.venueCapacity ?? config?.roomCaps?.maxPlayers ?? 0);
  const scheduled     = formatDateTime(config?.eventDateTime || room.scheduled_at);
  const timeZone      = config?.timeZone || (room as any).time_zone || null;

  // Ticket types — prefer the array, fall back to legacy single entryFee
  const ticketTypes: TicketType[] = (() => {
    if (Array.isArray(config?.ticketTypes) && config.ticketTypes.length > 0) {
      return config.ticketTypes;
    }
    if (config?.entryFee) {
      return [{ id: 'general', name: 'General Admission', price: String(config.entryFee), isEnabled: true }];
    }
    return [];
  })();

  const enabledTypes = ticketTypes.filter(t => t.isEnabled !== false);

  // Price range for the income stat card
  const priceHelper = (() => {
    if (isDonation) return 'Donation based';
    if (enabledTypes.length === 0) return 'No ticket types set';
    const prices = enabledTypes.map(t => parseFloat(t.price)).filter(p => !isNaN(p));
    if (prices.length === 0) return '';
    const min = Math.min(...prices), max = Math.max(...prices);
    if (min === max) return `${money(sym, min)} per ticket`;
    return `${money(sym, min)} – ${money(sym, max)} per ticket`;
  })();

  const prizes: any[]        = Array.isArray(config?.prizes) ? config.prizes : [];
  const prizeTotal           = prizes.reduce((sum: number, p: any) => sum + Number(p?.value || 0), 0);
  const eventSponsors: any[] = Array.isArray(config?.eventSponsors) ? config.eventSponsors : [];

  return (
    <div className="space-y-5 p-5">

      {/* ── Hero banner ── */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.04)]">
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone={statusTone}>{formatStatus(room.status)}</Pill>
                <Pill tone="blue">
                  <TicketIconInline className="mr-1 h-3 w-3" />
                  Ticketed Event
                </Pill>
                {isDonation && <Pill tone="green">Donation based</Pill>}
                {linkedEventTitle && <Pill tone="purple">Linked to event</Pill>}
              </div>
              <h2 className="text-lg font-black text-gray-900">Ticketed event overview</h2>
              <p className="mt-1 text-sm text-gray-600">
                A snapshot of the event setup, ticket pricing, prizes and sponsors.
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Room ID</p>
              <p className="mt-1 font-mono text-xs font-semibold text-[#1e3040]">{room.room_id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Attendees"
          value={stats?.uniquePlayers ?? 0}
          helper={venueCapacity > 0 ? `Capacity ${venueCapacity}` : 'No cap set'}
          tone="indigo"
        />
        <StatCard
          icon={<TicketIconLg />}
          label="Tickets sold"
          value={stats?.ticketsSold ?? 0}
          helper={venueCapacity > 0 ? `of ${venueCapacity} capacity` : 'No cap set'}
          tone="orange"
        />
        <StatCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          label={isDonation ? 'Raised' : 'Income'}
          value={statIncome}
          helper={priceHelper}
          tone="green"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Prizes"
          value={prizeTotal > 0 ? money(sym, prizeTotal, 0) : prizes.length}
          helper={prizes.length
            ? `${prizes.length} prize${prizes.length === 1 ? '' : 's'} configured`
            : 'No prizes configured'}
          tone="amber"
        />
      </div>

      {/* ── Event details + pricing ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Calendar className="h-4 w-4" />}
            title="Event details"
            subtitle="Core setup details for the ticketed event."
          />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Schedule">
              {scheduled.compact}
            </DetailRow>
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Time zone">
              {timeZone || 'Europe/Dublin'}
            </DetailRow>
            {venueCapacity > 0 && (
              <DetailRow icon={<Users className="h-4 w-4" />} label="Venue capacity">
                {venueCapacity} attendees
              </DetailRow>
            )}
            {linkedEventTitle && (
              <DetailRow icon={<Link2 className="h-4 w-4" />} label="Linked event">
                <span className="text-[#157f85]">{linkedEventTitle}</span>
              </DetailRow>
            )}
          </div>
        </div>

        {/* ── Ticket types & pricing ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Wallet className="h-4 w-4" />}
            title="Ticket types & pricing"
            subtitle={isDonation ? 'Donation-based event' : `${ticketTypes.length} ticket type${ticketTypes.length !== 1 ? 's' : ''} configured`}
          />

          {isDonation ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
              <DetailRow icon={<DollarSign className="h-4 w-4" />} label="Fundraising model">
                Donation — attendees choose their amount
              </DetailRow>
              <DetailRow icon={<Sparkles className="h-4 w-4" />} label="Currency">
                {sym} ({config?.currency ?? 'club currency'})
              </DetailRow>
            </div>
          ) : ticketTypes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 text-center">
              No ticket types configured
            </div>
          ) : (
            <div className="space-y-2">
              {ticketTypes.map((tt) => {
                const price     = parseFloat(tt.price);
                const disabled  = tt.isEnabled === false;
                const hasLimit  = tt.quantity != null && tt.quantity > 0;
                const hasExpiry = !!tt.saleEndsAt;

                return (
                  <div key={tt.id}
                    className={cn(
                      'rounded-xl border p-3 transition-opacity',
                      disabled
                        ? 'border-gray-200 bg-gray-50 opacity-60'
                        : 'border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.04)]'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn(
                            'text-sm font-bold',
                            disabled ? 'text-gray-400' : 'text-gray-900'
                          )}>
                            {tt.name}
                          </span>
                          {disabled && (
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
                              Disabled
                            </span>
                          )}
                          {hasLimit && (
                            <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                              Max {tt.quantity}
                            </span>
                          )}
                        </div>
                        {hasExpiry && tt.saleEndsAt && (
                          <p className="mt-0.5 text-xs text-gray-400">
                            Sale ends {formatSaleEndsAt(tt.saleEndsAt, timeZone)}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className={cn(
                          'text-base font-black',
                          disabled ? 'text-gray-400' : 'text-[#157f85]'
                        )}>
                          {isNaN(price) ? tt.price : money(sym, price)}
                        </span>
                        <p className="text-[10px] text-gray-400">per ticket</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 px-1">
                <Sparkles className="h-3 w-3" />
                Currency: {sym} ({config?.currency ?? 'club currency'})
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Event sponsors ── */}
      {eventSponsors.length > 0 && (
        <div className="rounded-2xl border border-[rgba(210,181,130,0.4)] bg-[rgba(210,181,130,0.06)] p-4">
          <SectionHeader
            icon={<Heart className="h-4 w-4" />}
            title="Event sponsors"
            subtitle={`${eventSponsors.length} organisation${eventSponsors.length === 1 ? '' : 's'} supporting this event.`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {eventSponsors.map((sponsor: any, index: number) => (
              <div key={index} className="rounded-xl border p-3"
                style={{ borderColor: 'rgba(210,181,130,0.5)', background: '#fff' }}>
                <div className="flex items-start gap-2">
                  <Heart className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{sponsor.name}</p>
                    {sponsor.role && <p className="mt-0.5 text-xs text-gray-500">{sponsor.role}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Prizes ── */}
      {prizes.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Trophy className="h-4 w-4" />}
            title="Prize setup"
            subtitle={`${prizes.length} prize${prizes.length === 1 ? '' : 's'} configured${prizeTotal > 0 ? ` with a declared total of ${money(sym, prizeTotal)}` : ''}.`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {prizes.map((prize: any, index: number) => (
              <div key={`${prize?.place || index}-${prize?.description || 'prize'}`}
                className="rounded-xl border border-green-200 bg-green-50/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Pill tone="green">
                    {prize?.place ?? index + 1}{ordinal(prize?.place ?? index + 1)} Place
                  </Pill>
                  {Number(prize?.value || 0) > 0 && (
                    <span className="text-sm font-black text-gray-900">{money(sym, prize.value)}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">{prize?.description || 'Prize'}</p>
                {prize?.sponsor && (
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                    <Tag className="h-3 w-3 flex-shrink-0" />
                    Sponsored by {prize.sponsor}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Internal reference ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <SectionHeader
          icon={<CheckCircle className="h-4 w-4" />}
          title="Internal reference"
        />
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
          <DetailRow icon={<Hash className="h-4 w-4" />} label="Room ID">
            <span className="break-all font-mono text-xs text-gray-600">{room.room_id}</span>
          </DetailRow>
          <DetailRow icon={<Sparkles className="h-4 w-4" />} label="Game type">
            Ticketed Event
          </DetailRow>
        </div>
      </div>

    </div>
  );
}

function TicketIconInline({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  );
}

function TicketIconLg() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  );
}