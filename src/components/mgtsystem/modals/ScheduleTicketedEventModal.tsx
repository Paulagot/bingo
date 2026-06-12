// src/components/mgtsystem/modals/ScheduleTicketedEventModal.tsx
//
// Handles both scheduling (create) and editing a ticketed event room.
// Pass `existingRoom` to enter edit mode — fields pre-fill, submit calls PATCH.
// Without `existingRoom` the modal is in create mode — submit calls POST /schedule.

import { useState, useEffect } from 'react';
import {
  X, DollarSign, Trophy, Gift, Plus, Trash2,
  Heart, Tag, Save, Users, Ticket,
} from 'lucide-react';
import { useAuthStore } from '../../../features/auth';
import { currencySymbol } from '../shared/CurrencySelect';
import ticketedEventMgmtService from '../services/TicketedEventMgmtService';
import type { Event } from '../types/event';
import type { TicketedEventRoomListItem } from '../services/TicketedEventMgmtService';

// ─── Types ────────────────────────────────────────────────────────────────────

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
  existingRoom?: TicketedEventRoomListItem | null; // if present = edit mode
}

type FundraisingMode = 'fixed_fee' | 'donation';

const MAX_PRIZES   = 10;
const MAX_SPONSORS = 3;

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

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

  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [fundraisingMode, setFundraisingMode] = useState<FundraisingMode>('fixed_fee');
  const [entryFee, setEntryFee]               = useState('');
  const [prizes, setPrizes]                   = useState<Prize[]>([]);
  const [eventSponsors, setEventSponsors]     = useState<EventSponsor[]>([{ name: '', role: '' }]);
  const [venueCapacity, setVenueCapacity]     = useState('');

  // Pre-fill date/timezone from the parent event (create mode)
  const scheduledAt = event.start_datetime
    || (event.event_date ? `${event.event_date}T19:00:00` : null);
  const timeZone = event.time_zone
    || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const isDonation = fundraisingMode === 'donation';

  // ── Seed from existing config in edit mode ──────────────────────────────────
  useEffect(() => {
    if (!isEditMode || !existingRoom) return;

    const cfg = ticketedEventMgmtService.parseConfig(existingRoom);
    if (!cfg) return;

    setFundraisingMode(cfg.fundraisingMode ?? 'fixed_fee');
    setEntryFee(cfg.entryFee ?? '');
    setPrizes(
      Array.isArray(cfg.prizes) && cfg.prizes.length > 0
        ? cfg.prizes
        : []
    );
    setEventSponsors(
      Array.isArray(cfg.eventSponsors) && cfg.eventSponsors.length > 0
        ? cfg.eventSponsors
        : [{ name: '', role: '' }]
    );
    // venueCapacity lives in roomCaps
    const cap = cfg.roomCaps?.venueCapacity ?? cfg.roomCaps?.maxPlayers;
    if (cap && cap < 999999) setVenueCapacity(String(cap));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!venueCapacity || isNaN(parseInt(venueCapacity)) || parseInt(venueCapacity) < 1) {
      return 'Venue capacity must be at least 1';
    }
    if (!isDonation) {
      const fee = parseFloat(entryFee);
      if (!entryFee || isNaN(fee) || fee <= 0) return 'Entry fee must be greater than 0';
    }
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);

    try {
      if (isEditMode && existingRoom) {
        // ── EDIT MODE: PATCH existing room ────────────────────────────────
        await ticketedEventMgmtService.updateRoom(existingRoom.room_id, {
          entryFee:        isDonation ? null : entryFee,
          fundraisingMode,
          currency:        clubCurrencyISO,
          currencySymbol:  sym,
          prizes:          prizes.filter(p => p.description.trim()),
          eventSponsors:   eventSponsors.filter(s => s.name.trim()),
        });

        onSaved(existingRoom.room_id);
        onClose();

      } else {
        // ── CREATE MODE: unchanged ────────────────────────────────────────
        const { v4: uuidv4 } = await import('uuid');
        const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();

        const payload = {
          roomId,
          hostId,
          hostName,
          scheduledAt,
          timeZone,
          entryFee:        isDonation ? null : entryFee,
          fundraisingMode,
          currency:        clubCurrencyISO,
          currencySymbol:  sym,
          prizes:          prizes.filter(p => p.description.trim()),
          eventSponsors:   eventSponsors.filter(s => s.name.trim()),
          venueCapacity:   venueCapacity ? parseInt(venueCapacity) : undefined,
          eventTitle:      event.title         || null,
          eventLocation:   event.location_label || null,
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

  // ── Event date display ──────────────────────────────────────────────────────

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

          {/* ── 1. Fundraising Mode ── */}
          <Section>
            <SectionHeader
              icon={<DollarSign className="h-4 w-4" />}
              title="Fundraising Model"
              subtitle="How will attendees contribute?"
            />
            <div className="grid grid-cols-2 gap-3">
              {([
                { mode: 'fixed_fee' as const, icon: <DollarSign className="h-4 w-4" />, label: 'Fixed Ticket Price', desc: 'Every attendee pays the same ticket price' },
                { mode: 'donation'  as const, icon: <Gift className="h-4 w-4" />,       label: 'Donation Based',     desc: 'Attendees donate any amount — or attend free' },
              ]).map(({ mode, icon, label, desc }) => {
                const active = fundraisingMode === mode;
                return (
                  <button key={mode} type="button" onClick={() => setFundraisingMode(mode)}
                    className="rounded-xl border-2 p-4 text-left transition-all"
                    style={active
                      ? { borderColor: '#157f85', background: 'rgba(21,127,133,0.08)' }
                      : { borderColor: '#dce1df', background: '#fff' }}>
                    <div className="flex items-center gap-2 mb-1" style={{ color: active ? '#157f85' : '#8a9bab' }}>
                      {icon}
                      <p className="text-sm font-bold" style={{ color: active ? '#157f85' : '#102532' }}>{label}</p>
                    </div>
                    <p className="text-xs" style={{ color: '#52636f' }}>{desc}</p>
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── 2. Venue Capacity ── */}
          <Section>
            <SectionHeader
              icon={<Users className="h-4 w-4" />}
              title="Venue Capacity"
              subtitle="Maximum number of attendees. Ticket sales stop when this is reached."
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
              Ticket sales and walk-in payments will be blocked once this limit is reached.
            </p>
          </Section>

          {/* ── 3. Entry Fee ── */}
          {!isDonation && (
            <Section>
              <SectionHeader
                icon={<DollarSign className="h-4 w-4" />}
                title="Ticket Price"
                subtitle={`Set the price per ticket — currency: ${sym} (${clubCurrencyISO})`}
              />
              <div className="max-w-[200px]">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
                  Amount <span style={{ color: '#e9574f' }}>*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
                  <input
                    type="number" min="0.01" step="0.01" placeholder="10.00"
                    value={entryFee}
                    onChange={e => setEntryFee(e.target.value)}
                    className={`${inputCls()} pl-7`}
                    disabled={submitting}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs" style={{ color: '#8a9bab' }}>
                Currency is set to your club's reporting currency. Change it in club settings.
              </p>
            </Section>
          )}

          {isDonation && (
            <div className="rounded-lg px-4 py-3 text-xs"
              style={{ background: 'rgba(21,127,133,0.08)', color: '#157f85', border: '1px solid rgba(21,127,133,0.2)' }}>
              Donation-based: attendees can contribute any amount or attend for free.
              Currency: {sym} ({clubCurrencyISO})
            </div>
          )}

          {/* ── 4. Event Sponsors ── */}
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
            <p className="mt-3 text-xs" style={{ color: '#8a9bab' }}>
              Sponsors appear on the event impact report after the event.
            </p>
          </Section>

          {/* ── 5. Prizes ── */}
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