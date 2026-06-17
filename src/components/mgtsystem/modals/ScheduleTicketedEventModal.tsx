// src/components/mgtsystem/modals/ScheduleTicketedEventModal.tsx
//
// UPDATED: Each ticket type now has isEnabled toggle, optional quantity limit,
//          and optional saleEndsAt (stored as UTC, entered in event timezone).

import { useState, useEffect } from 'react';
import {
  X, DollarSign, Trophy, Plus, Trash2,
  Heart, Tag, Save, Users, Ticket, ToggleLeft, ToggleRight,
  Calendar, Hash,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth';
import { currencySymbol } from '../shared/CurrencySelect';
import ticketedEventMgmtService from '../services/TicketedEventMgmtService';
import type { Event } from '../types/event';
import type { TicketedEventRoomListItem } from '../services/TicketedEventMgmtService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketType {
  id:         string;
  name:       string;
  price:      string;
  isEnabled:  boolean;
  quantity:   string;   // empty string = no limit
  saleEndsAt: string;   // local datetime-local input value, e.g. "2026-07-01T23:59"
}

interface Prize {
  place:       number;
  description: string;
  value:       number | null;
  sponsor:     string;
}

interface EventSponsor {
  name: string;
  role: string;
}

interface Props {
  onClose:       () => void;
  onSaved:       (roomId?: string) => void;
  event:         Event;
  existingRoom?: TicketedEventRoomListItem | null;
}

const MAX_PRIZES       = 10;
const MAX_SPONSORS     = 3;
const MAX_TICKET_TYPES = 10;

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `type_${Date.now()}`;
}

/**
 * Convert a local datetime string (e.g. "2026-07-01T23:59") in a given
 * IANA timezone to a UTC ISO string for storage.
 */
function localToUtc(localDatetime: string, timeZone: string): string | null {
  if (!localDatetime) return null;
  try {
    const tIdx     = localDatetime.indexOf('T');
    const datePart = tIdx >= 0 ? localDatetime.slice(0, tIdx) : localDatetime;
    const timePart = tIdx >= 0 ? localDatetime.slice(tIdx + 1) : '23:59';

    const dateParts = datePart.split('-').map(Number);
    const timeParts = timePart.split(':').map(Number);

    const year   = dateParts[0] ?? 0;
    const month  = dateParts[1] ?? 1;
    const day    = dateParts[2] ?? 1;
    const hour   = timeParts[0] ?? 23;
    const minute = timeParts[1] ?? 59;

    // Build a UTC Date from the naive local values
    const naiveUtc = new Date(Date.UTC(year, month - 1, day, hour, minute));

    // Use Intl to find what the formatter thinks the local time is for this UTC instant
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });

    const p: Record<string, number> = {};
    for (const part of formatter.formatToParts(naiveUtc)) {
      if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10);
    }

    const pYear   = p['year']   ?? year;
    const pMonth  = p['month']  ?? month;
    const pDay    = p['day']    ?? day;
    const pHour   = p['hour']   ?? hour;
    const pMinute = p['minute'] ?? minute;
    const pSecond = p['second'] ?? 0;

    const localAsUTC = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMinute, pSecond);
    const offsetMs   = localAsUTC - naiveUtc.getTime();
    const trueUtc    = new Date(naiveUtc.getTime() - offsetMs);

    return trueUtc.toISOString();
  } catch {
    return null;
  }
}

/**
 * Convert a UTC ISO string back to a local datetime-local input value
 * in the given IANA timezone (for pre-filling in edit mode).
 */
function utcToLocalInput(utcIso: string, timeZone: string): string {
  if (!utcIso) return '';
  try {
    const date = new Date(utcIso);
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    });
    // sv-SE gives "YYYY-MM-DD HH:MM" — replace space with T
    return formatter.format(date).replace(' ', 'T');
  } catch {
    return '';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
    {children}
  </div>
);

const SectionHeader = ({ icon, title, subtitle }: {
  icon: React.ReactNode; title: string; subtitle?: string;
}) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
      style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-bold" style={{ color: '#102532' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>{subtitle}</p>}
    </div>
  </div>
);

const inputCls = (err?: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent ${
    err ? 'border-[#e9574f] bg-red-50' : 'border-[#dce1df] bg-white hover:border-[#b8c6b0]'
  }`;

// ─── Main component ───────────────────────────────────────────────────────────

export default function ScheduleTicketedEventModal({ onClose, onSaved, event, existingRoom }: Props) {
  const isEditMode = !!existingRoom;

  const club            = useAuthStore((s: any) => s.club);
  const user            = useAuthStore((s: any) => s.user);
  const clubCurrencyISO = club?.reporting_currency ?? 'EUR';
  const sym             = currencySymbol(clubCurrencyISO);
  const hostId          = user?.id || user?.user_id || user?.club_user_id || '';
  const hostName        = user?.name || user?.full_name || user?.first_name || '';

  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [ticketTypes, setTicketTypes]     = useState<TicketType[]>([
    { id: 'general', name: 'General Admission', price: '', isEnabled: true, quantity: '', saleEndsAt: '' },
  ]);
  const [prizes, setPrizes]               = useState<Prize[]>([]);
  const [eventSponsors, setEventSponsors] = useState<EventSponsor[]>([{ name: '', role: '' }]);
  const [venueCapacity, setVenueCapacity] = useState('');

  const fundraisingMode = 'fixed_fee' as const;

  const scheduledAt = event.start_datetime
    || (event.event_date ? `${event.event_date}T19:00:00` : null);

  const timeZone = event.time_zone
    || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── Seed from existing config in edit mode ──────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !existingRoom) return;
    const cfg = ticketedEventMgmtService.parseConfig(existingRoom);
    if (!cfg) return;

    if (Array.isArray(cfg.ticketTypes) && cfg.ticketTypes.length > 0) {
      setTicketTypes(cfg.ticketTypes.map(t => ({
        id:         t.id   || '',
        name:       t.name || '',
        price:      t.price != null ? String(t.price) : '',
        // isEnabled defaults true if field absent (older records)
        isEnabled:  t.isEnabled !== false,
        // quantity: only set if it's a positive number (field absent on old records)
        quantity:   (t.quantity != null && Number(t.quantity) > 0) ? String(t.quantity) : '',
        // saleEndsAt: convert UTC → local input value (field absent on old records)
        saleEndsAt: t.saleEndsAt ? utcToLocalInput(String(t.saleEndsAt), timeZone) : '',
      })));
    } else if (cfg.entryFee) {
      // Legacy room with no ticketTypes — synthesise a single General Admission type
      setTicketTypes([{
        id: 'general', name: 'General Admission', price: String(cfg.entryFee),
        isEnabled: true, quantity: '', saleEndsAt: '',
      }]);
    }

    setPrizes(Array.isArray(cfg.prizes) && cfg.prizes.length > 0 ? cfg.prizes : []);
    setEventSponsors(
      Array.isArray(cfg.eventSponsors) && cfg.eventSponsors.length > 0
        ? cfg.eventSponsors
        : [{ name: '', role: '' }]
    );

    // Venue capacity — check both roomCaps in config and the room's own room_caps_json
    // (stored as room_caps_json on the room record, parsed into cfg.roomCaps)
    const cap =
      cfg.roomCaps?.venueCapacity ??
      cfg.roomCaps?.maxPlayers    ??
      null;
    if (cap != null && Number(cap) > 0 && Number(cap) < 999999) {
      setVenueCapacity(String(cap));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ticket type handlers ────────────────────────────────────────────────────

  const handleAddTicketType = () => {
    if (ticketTypes.length >= MAX_TICKET_TYPES) return;
    setTicketTypes(prev => [...prev, {
      id: '', name: '', price: '', isEnabled: true, quantity: '', saleEndsAt: '',
    }]);
  };

  const handleTicketTypeChange = (i: number, field: keyof TicketType, val: string | boolean) => {
    setTicketTypes(prev => prev.map((t, idx) => {
      if (idx !== i) return t;
      if (field === 'name' && typeof val === 'string') {
        return { ...t, name: val, id: slugify(val) };
      }
      return { ...t, [field]: val };
    }));
  };

  const handleRemoveTicketType = (i: number) => {
    if (ticketTypes.length <= 1) return;
    setTicketTypes(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Prize handlers ──────────────────────────────────────────────────────────

  const handleAddPrize = () => {
    if (prizes.length >= MAX_PRIZES) return;
    setPrizes(prev => [...prev, { place: prev.length + 1, description: '', value: null, sponsor: '' }]);
  };

  const handlePrizeChange = <K extends keyof Prize>(i: number, field: K, val: Prize[K]) => {
    setPrizes(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const handleRemovePrize = (i: number) => {
    setPrizes(prev =>
      prev.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, place: idx + 1 }))
    );
  };

  // ── Sponsor handlers ────────────────────────────────────────────────────────

  const handleAddSponsor = () => {
    if (eventSponsors.length >= MAX_SPONSORS) return;
    setEventSponsors(prev => [...prev, { name: '', role: '' }]);
  };

  const handleSponsorChange = (i: number, field: keyof EventSponsor, val: string) => {
    setEventSponsors(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const handleRemoveSponsor = (i: number) => {
    setEventSponsors(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Combined quantity warning (non-blocking) ────────────────────────────────
  // Shown when all named types have quantities set and their sum exceeds venue cap.
  // Sales always stop at venue cap at purchase time regardless.
  const combinedQuantityWarning = (() => {
    const cap = parseInt(venueCapacity);
    if (!cap || isNaN(cap)) return null;
    const namedTypes = ticketTypes.filter(t => t.name.trim());
    const typesWithQty = namedTypes.filter(t => t.quantity);
    if (namedTypes.length === 0 || typesWithQty.length < namedTypes.length) return null;
    const total = typesWithQty.reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
    if (total > cap) {
      return `Combined type limits (${total}) exceed venue capacity (${cap}). Sales will stop at ${cap} total regardless.`;
    }
    return null;
  })();

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!venueCapacity || isNaN(parseInt(venueCapacity)) || parseInt(venueCapacity) < 1) {
      return 'Venue capacity must be at least 1';
    }
    const validTypes = ticketTypes.filter(t => t.name.trim());
    if (validTypes.length === 0) {
      return 'At least one ticket type with a name is required';
    }
    for (const t of validTypes) {
      const price = parseFloat(t.price);
      if (!t.price || isNaN(price) || price <= 0) {
        return `"${t.name}" must have a price greater than 0`;
      }
      if (t.quantity) {
        const qty = parseInt(t.quantity);
        if (isNaN(qty) || qty < 1) {
          return `"${t.name}" quantity limit must be at least 1`;
        }
        // Individual type qty can exceed venue cap — warning shown separately.
        // Hard ceiling enforced at purchase time by canPurchaseTickets.
      }
    }
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);

    const validTicketTypes = ticketTypes
      .filter(t => t.name.trim() && t.price)
      .map(t => ({
        id:         t.id || slugify(t.name),
        name:       t.name.trim(),
        price:      t.price,
        isEnabled:  t.isEnabled,
        quantity:   t.quantity ? parseInt(t.quantity) : null,
        // Convert local datetime to UTC for storage
        saleEndsAt: t.saleEndsAt ? localToUtc(t.saleEndsAt, timeZone) : null,
      }));

    const entryFee = validTicketTypes[0]?.price ?? null;

    try {
      if (isEditMode && existingRoom) {
        await ticketedEventMgmtService.updateRoom(existingRoom.room_id, {
          entryFee,
          fundraisingMode,
          currency:       clubCurrencyISO,
          currencySymbol: sym,
          ticketTypes:    validTicketTypes,
          prizes:         prizes.filter(p => p.description.trim()),
          eventSponsors:  eventSponsors.filter(s => s.name.trim()),
        });
        onSaved(existingRoom.room_id);
        onClose();
      } else {
        const { v4: uuidv4 } = await import('uuid');
        const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();

        const payload = {
          roomId,
          hostId,
          hostName,
          scheduledAt,
          timeZone,
          entryFee,
          fundraisingMode,
          currency:       clubCurrencyISO,
          currencySymbol: sym,
          ticketTypes:    validTicketTypes,
          prizes:         prizes.filter(p => p.description.trim()),
          eventSponsors:  eventSponsors.filter(s => s.name.trim()),
          venueCapacity:  venueCapacity ? parseInt(venueCapacity) : undefined,
          eventTitle:     event.title          || null,
          eventLocation:  event.location_label || null,
        };

        const data = await ticketedEventMgmtService.scheduleEvent(payload);
        onSaved(data.roomId ?? roomId);
        onClose();
      }
    } catch (e: any) {
      if (e?.message?.includes('409')) {
        setError('This event can no longer be edited — it may have already started.');
      } else {
        setError(e?.message || `Failed to ${isEditMode ? 'update' : 'schedule'} event. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const eventDateDisplay = scheduledAt
    ? new Date(scheduledAt).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'No date set on event';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #157f85', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
              <Ticket className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                {isEditMode ? 'Edit Ticketed Event' : 'Add Ticketed Event'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>{event.title}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100 disabled:opacity-40"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Date info bar ── */}
        <div className="px-6 py-2.5 flex-shrink-0"
          style={{ background: 'rgba(21,127,133,0.04)', borderBottom: '1px solid #dce1df' }}>
          <p className="text-xs" style={{ color: '#52636f' }}>
            <span className="font-semibold" style={{ color: '#102532' }}>Event date: </span>
            {eventDateDisplay}
            {timeZone && ` · ${timeZone}`}
          </p>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2.5"
              style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
              <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
            </div>
          )}

          {combinedQuantityWarning && !error && (
            <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
              style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
              <p className="text-sm" style={{ color: '#92400e' }}>⚠️ {combinedQuantityWarning}</p>
            </div>
          )}

          {/* ── 1. Venue Capacity ── */}
          <Section>
            <SectionHeader
              icon={<Users className="h-4 w-4" />}
              title="Venue Capacity"
              subtitle="Maximum number of attendees across all ticket types."
            />
            <div className="max-w-[200px]">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
                Max attendees <span style={{ color: '#e9574f' }}>*</span>
              </label>
              <input
                type="number" min="1" step="1" placeholder="e.g. 150"
                value={venueCapacity}
                onChange={e => setVenueCapacity(e.target.value)}
                className={inputCls(!venueCapacity && !!error)}
                disabled={submitting}
              />
            </div>
            <p className="mt-2 text-xs" style={{ color: '#8a9bab' }}>
              This is the hard ceiling. Per-type limits are subsets of this number.
            </p>
          </Section>

          {/* ── 2. Ticket Types ── */}
          <Section>
            <SectionHeader
              icon={<DollarSign className="h-4 w-4" />}
              title="Ticket Types & Prices"
              subtitle={`Define your ticket categories. Currency: ${sym} (${clubCurrencyISO}) · Times in ${timeZone}`}
            />
            <div className="space-y-4">
              {ticketTypes.map((tt, i) => {
                const hasName = tt.name.trim().length > 0;
                return (
                  <div key={i} className="rounded-xl border p-3 space-y-3"
                    style={{
                      borderColor: !tt.isEnabled ? '#dce1df' : hasName ? 'rgba(21,127,133,0.4)' : '#dce1df',
                      background:  !tt.isEnabled ? '#f9fafb' : hasName ? 'rgba(21,127,133,0.04)' : '#fff',
                      opacity:     tt.isEnabled ? 1 : 0.75,
                    }}>

                    {/* Row header: type number + enable toggle + remove */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: '#157f85' }}>
                        Ticket type {i + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Enabled toggle */}
                        <button
                          type="button"
                          onClick={() => handleTicketTypeChange(i, 'isEnabled', !tt.isEnabled)}
                          disabled={submitting}
                          className="flex items-center gap-1.5 text-xs font-medium transition"
                          style={{ color: tt.isEnabled ? '#157f85' : '#8a9bab' }}
                          title={tt.isEnabled ? 'Click to disable' : 'Click to enable'}
                        >
                          {tt.isEnabled
                            ? <ToggleRight className="h-4 w-4" />
                            : <ToggleLeft  className="h-4 w-4" />}
                          {tt.isEnabled ? 'Enabled' : 'Disabled'}
                        </button>
                        {/* Remove button */}
                        {ticketTypes.length > 1 && (
                          <button type="button" onClick={() => handleRemoveTicketType(i)}
                            className="rounded p-1 hover:bg-red-50" disabled={submitting}>
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Name + Price */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                          Name <span style={{ color: '#e9574f' }}>*</span>
                        </label>
                        <input
                          type="text" placeholder="e.g. Early Bird"
                          value={tt.name}
                          onChange={e => handleTicketTypeChange(i, 'name', e.target.value)}
                          className={inputCls(!tt.name.trim() && !!error)}
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                          Price ({sym}) <span style={{ color: '#e9574f' }}>*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
                          <input
                            type="number" min="0.01" step="0.01" placeholder="10.00"
                            value={tt.price}
                            onChange={e => handleTicketTypeChange(i, 'price', e.target.value)}
                            className={`${inputCls(!tt.price && !!error)} pl-7`}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quantity limit + Sale ends */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                          <span className="inline-flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            Quantity limit <span style={{ color: '#8a9bab' }}>(optional)</span>
                          </span>
                        </label>
                        <input
                          type="number" min="1" step="1" placeholder="No limit"
                          value={tt.quantity}
                          onChange={e => handleTicketTypeChange(i, 'quantity', e.target.value)}
                          className={inputCls()}
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Sale ends <span style={{ color: '#8a9bab' }}>(optional)</span>
                          </span>
                        </label>
                        <input
                          type="datetime-local"
                          value={tt.saleEndsAt}
                          onChange={e => handleTicketTypeChange(i, 'saleEndsAt', e.target.value)}
                          className={inputCls()}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {/* Hints */}
                    {(tt.quantity || tt.saleEndsAt) && (
                      <div className="text-xs space-y-0.5" style={{ color: '#8a9bab' }}>
                        {tt.quantity && (
                          <p>Max {tt.quantity} ticket{parseInt(tt.quantity) !== 1 ? 's' : ''} of this type — remaining spots roll into overall capacity.</p>
                        )}
                        {tt.saleEndsAt && (
                          <p>Sale closes at {new Date(tt.saleEndsAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} ({timeZone}) — this type will auto-hide for buyers after that.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {ticketTypes.length < MAX_TICKET_TYPES && (
                <button type="button" onClick={handleAddTicketType}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition"
                  style={{ background: '#f6f1e8', color: '#52636f' }}
                  disabled={submitting}>
                  <Plus className="h-3.5 w-3.5" />
                  {ticketTypes.length === 0 ? 'Add Ticket Type' : 'Add Another Ticket Type'}
                </button>
              )}
            </div>
            <p className="mt-3 text-xs" style={{ color: '#8a9bab' }}>
              Disabled or expired types are hidden from buyers automatically. The first enabled type is shown first.
            </p>
          </Section>

          {/* ── 3. Event Sponsors ── */}
          <Section>
            <SectionHeader
              icon={<Heart className="h-4 w-4" />}
              title="Event Sponsors"
              subtitle={`Organisations supporting this event — up to ${MAX_SPONSORS} (optional)`}
            />
            <div className="space-y-3">
              {eventSponsors.map((sponsor, i) => (
                <div key={i} className="rounded-xl border p-3 space-y-2"
                  style={{
                    borderColor: sponsor.name.trim() ? 'rgba(210,181,130,0.5)' : '#dce1df',
                    background:  sponsor.name.trim() ? 'rgba(210,181,130,0.06)' : '#fff',
                  }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: '#8a6d2f' }}>Sponsor {i + 1}</span>
                    {eventSponsors.length > 1 && (
                      <button type="button" onClick={() => handleRemoveSponsor(i)}
                        className="rounded p-1 hover:bg-red-50" disabled={submitting}>
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>Name</label>
                      <input type="text" placeholder="e.g. Buddies for Paws"
                        value={sponsor.name}
                        onChange={e => handleSponsorChange(i, 'name', e.target.value)}
                        className={inputCls()} disabled={submitting} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                        Role <span style={{ color: '#8a9bab' }}>(optional)</span>
                      </label>
                      <input type="text" placeholder="e.g. Title Sponsor"
                        value={sponsor.role}
                        onChange={e => handleSponsorChange(i, 'role', e.target.value)}
                        className={inputCls()} disabled={submitting} />
                    </div>
                  </div>
                </div>
              ))}
              {eventSponsors.length < MAX_SPONSORS && (
                <button type="button" onClick={handleAddSponsor}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition"
                  style={{ background: '#f6f1e8', color: '#52636f' }}
                  disabled={submitting}>
                  <Plus className="h-3.5 w-3.5" /> Add Sponsor
                </button>
              )}
            </div>
          </Section>

          {/* ── 4. Prizes ── */}
          <Section>
            <SectionHeader
              icon={<Trophy className="h-4 w-4" />}
              title="Prizes"
              subtitle={`Optional — up to ${MAX_PRIZES} prizes`}
            />
            <div className="space-y-3">
              {prizes.map((prize, i) => (
                <div key={i} className="rounded-xl border p-3 space-y-2"
                  style={{
                    borderColor: prize.description.trim() ? '#86efac' : '#dce1df',
                    background:  prize.description.trim() ? '#f0fdf4' : '#fff',
                  }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: '#157f85' }}>
                      {prize.place}{ordinal(prize.place)} Place
                    </span>
                    <button type="button" onClick={() => handleRemovePrize(i)}
                      className="rounded p-1 hover:bg-red-50" disabled={submitting}>
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                        Description <span style={{ color: '#e9574f' }}>*</span>
                      </label>
                      <input type="text" placeholder="e.g. Hamper, Weekend away…"
                        value={prize.description}
                        onChange={e => handlePrizeChange(i, 'description', e.target.value)}
                        className={inputCls()} disabled={submitting} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                        Value ({sym}) <span style={{ color: '#8a9bab' }}>(optional)</span>
                      </label>
                      <input type="number" min="0" step="0.01" placeholder="0.00"
                        value={prize.value ?? ''}
                        onChange={e => handlePrizeChange(i, 'value', parseFloat(e.target.value) || null)}
                        className={inputCls()} disabled={submitting} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" style={{ color: '#157f85' }} />
                        Prize Sponsor <span className="font-normal" style={{ color: '#8a9bab' }}>(optional)</span>
                      </span>
                    </label>
                    <input type="text" placeholder="e.g. Local Business Name"
                      value={prize.sponsor}
                      onChange={e => handlePrizeChange(i, 'sponsor', e.target.value)}
                      className={inputCls()} disabled={submitting} />
                  </div>
                </div>
              ))}
              {prizes.length < MAX_PRIZES && (
                <button type="button" onClick={handleAddPrize}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition"
                  style={{ background: '#f6f1e8', color: '#52636f' }}
                  disabled={submitting}>
                  <Plus className="h-3.5 w-3.5" />
                  {prizes.length === 0 ? 'Add a Prize (optional)' : 'Add Another Prize'}
                </button>
              )}
            </div>
          </Section>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <p className="text-xs" style={{ color: '#8a9bab' }}>
            {isEditMode ? 'Editing will not use a credit' : ''}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: '#dce1df', color: '#52636f' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#157f85' }}>
              {submitting
                ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />{isEditMode ? 'Saving…' : 'Scheduling…'}</>
                : <><Save className="h-3.5 w-3.5" />{isEditMode ? 'Save Changes' : 'Schedule Event'}</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}