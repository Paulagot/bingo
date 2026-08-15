// src/components/mgtsystem/wizard/steps/activity/TicketedEventActivityStep.tsx
//
// The BODY of the old ScheduleTicketedEventModal, extracted (same pattern
// as EliminationActivityStep) so it renders identically in:
//   • step 3 of CreateFundraiserWizard (create - submit via the
//     registry's createRoom in submitChain)
//   • ScheduleTicketedEventModal (edit - thin wrapper owning updateRoom)
//
// No API calls, no submit button here. Config in via value/onChange,
// event context via draftEvent (sale-deadline hints show the event's
// timezone; the actual local→UTC conversion happens at submit time in
// the registry's createRoom / the modal's update handler).
//
// Validation stays the old modal's single-message style - the registry
// validate() returns it under the 'form' key, rendered as a banner at
// the top of this step, and inputs highlight against it exactly like
// the old `!!error` behaviour.

import {
  DollarSign, Trophy, Plus, Trash2, Heart, Tag, Users,
  ToggleLeft, ToggleRight, Calendar, Hash,
} from 'lucide-react';
import { Section, SectionHeader, inputClass, ErrorBanner } from '../../../shared/ui';
import PaymentMethodSelector, { type PaymentMethodSelection } from '../../../shared/PaymentMethodSelector';
import { currencySymbol } from '../../../shared/CurrencySelect';
import type { ActivityStepProps } from '../../activityRegistry';

// ── Config shape + lifecycle (imported by the registry & edit modal) ─────────

export interface TicketType {
  id:         string;
  name:       string;
  price:      string;
  isEnabled:  boolean;
  quantity:   string;   // empty string = no limit
  saleEndsAt: string;   // local datetime-local input value, e.g. "2026-07-01T23:59"
}

export interface TicketedPrize {
  place:       number;
  description: string;
  value:       number | null;
  sponsor:     string;
}

export interface EventSponsor {
  name: string;
  role: string;
}

export interface TicketedEventConfig {
  venueCapacity:  string;
  ticketTypes:    TicketType[];
  prizes:         TicketedPrize[];
  eventSponsors:  EventSponsor[];
  paymentMethods: PaymentMethodSelection;
}

export const MAX_PRIZES       = 10;
export const MAX_SPONSORS     = 3;
export const MAX_TICKET_TYPES = 10;

export function defaultTicketedEventConfig(): TicketedEventConfig {
  return {
    venueCapacity: '',
    ticketTypes: [
      { id: 'general', name: 'General Admission', price: '', isEnabled: true, quantity: '', saleEndsAt: '' },
    ],
    prizes: [],
    eventSponsors: [{ name: '', role: '' }],
    paymentMethods: { ticketMethodIds: [], onnightMethodIds: [] },
  };
}

export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `type_${Date.now()}`;
}

// Same rules as the old modal's validate() - one message at a time,
// returned under the 'form' key.
export function validateTicketedEventConfig(cfg: TicketedEventConfig): Record<string, string> {
  if (!cfg.venueCapacity || isNaN(parseInt(cfg.venueCapacity)) || parseInt(cfg.venueCapacity) < 1) {
    return { form: 'Venue capacity must be at least 1' };
  }
  const validTypes = cfg.ticketTypes.filter(t => t.name.trim());
  if (validTypes.length === 0) {
    return { form: 'At least one ticket type with a name is required' };
  }
  for (const t of validTypes) {
    const price = parseFloat(t.price);
    if (!t.price || isNaN(price) || price <= 0) {
      return { form: `"${t.name}" must have a price greater than 0` };
    }
    if (t.quantity) {
      const qty = parseInt(t.quantity);
      if (isNaN(qty) || qty < 1) {
        return { form: `"${t.name}" quantity limit must be at least 1` };
      }
      // Individual type qty can exceed venue cap - warning shown separately.
      // Hard ceiling enforced at purchase time by canPurchaseTickets.
    }
  }
  return {};
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TicketedEventActivityStep({
  value, onChange, draftEvent, disabled, errors, currency,
}: ActivityStepProps<TicketedEventConfig>) {
  const sym      = currencySymbol(currency);
  const timeZone = draftEvent.time_zone;
  const error    = errors.form || null;

  const set = <K extends keyof TicketedEventConfig>(key: K, v: TicketedEventConfig[K]) =>
    onChange({ ...value, [key]: v });

  const { ticketTypes, prizes, eventSponsors, venueCapacity } = value;

  // ── Ticket type handlers ─────────────────────────────────────────────────
  const handleAddTicketType = () => {
    if (ticketTypes.length >= MAX_TICKET_TYPES) return;
    set('ticketTypes', [...ticketTypes, { id: '', name: '', price: '', isEnabled: true, quantity: '', saleEndsAt: '' }]);
  };

  const handleTicketTypeChange = (i: number, field: keyof TicketType, val: string | boolean) => {
    set('ticketTypes', ticketTypes.map((t, idx) => {
      if (idx !== i) return t;
      if (field === 'name' && typeof val === 'string') {
        return { ...t, name: val, id: slugify(val) };
      }
      return { ...t, [field]: val };
    }));
  };

  const handleRemoveTicketType = (i: number) => {
    if (ticketTypes.length <= 1) return;
    set('ticketTypes', ticketTypes.filter((_, idx) => idx !== i));
  };

  // ── Prize handlers ───────────────────────────────────────────────────────
  const handleAddPrize = () => {
    if (prizes.length >= MAX_PRIZES) return;
    set('prizes', [...prizes, { place: prizes.length + 1, description: '', value: null, sponsor: '' }]);
  };

  const handlePrizeChange = <K extends keyof TicketedPrize>(i: number, field: K, val: TicketedPrize[K]) => {
    set('prizes', prizes.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  };

  const handleRemovePrize = (i: number) => {
    set('prizes', prizes.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, place: idx + 1 })));
  };

  // ── Sponsor handlers ─────────────────────────────────────────────────────
  const handleAddSponsor = () => {
    if (eventSponsors.length >= MAX_SPONSORS) return;
    set('eventSponsors', [...eventSponsors, { name: '', role: '' }]);
  };

  const handleSponsorChange = (i: number, field: keyof EventSponsor, val: string) => {
    set('eventSponsors', eventSponsors.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const handleRemoveSponsor = (i: number) => {
    set('eventSponsors', eventSponsors.filter((_, idx) => idx !== i));
  };

  // ── Combined quantity warning (non-blocking) ─────────────────────────────
  // Shown when all named types have quantities set and their sum exceeds
  // venue cap. Sales always stop at venue cap at purchase time regardless.
  const combinedQuantityWarning = (() => {
    const cap = parseInt(venueCapacity);
    if (!cap || isNaN(cap)) return null;
    const namedTypes   = ticketTypes.filter(t => t.name.trim());
    const typesWithQty = namedTypes.filter(t => t.quantity);
    if (namedTypes.length === 0 || typesWithQty.length < namedTypes.length) return null;
    const total = typesWithQty.reduce((sum, t) => sum + (parseInt(t.quantity) || 0), 0);
    if (total > cap) {
      return `Combined type limits (${total}) exceed venue capacity (${cap}). Sales will stop at ${cap} total regardless.`;
    }
    return null;
  })();

  return (
    <div className="space-y-4">

      {error && <ErrorBanner message={error} />}

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
            onChange={e => set('venueCapacity', e.target.value)}
            className={inputClass(!venueCapacity && !!error)}
            disabled={disabled}
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
          subtitle={`Define your ticket categories. Currency: ${sym} (${currency}) · Times in ${timeZone}`}
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
                    <button
                      type="button"
                      onClick={() => handleTicketTypeChange(i, 'isEnabled', !tt.isEnabled)}
                      disabled={disabled}
                      className="flex items-center gap-1.5 text-xs font-medium transition"
                      style={{ color: tt.isEnabled ? '#157f85' : '#8a9bab' }}
                      title={tt.isEnabled ? 'Click to disable' : 'Click to enable'}
                    >
                      {tt.isEnabled
                        ? <ToggleRight className="h-4 w-4" />
                        : <ToggleLeft  className="h-4 w-4" />}
                      {tt.isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                    {ticketTypes.length > 1 && (
                      <button type="button" onClick={() => handleRemoveTicketType(i)}
                        className="rounded p-1 hover:bg-red-50" disabled={disabled}>
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
                      className={inputClass(!tt.name.trim() && !!error)}
                      disabled={disabled}
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
                        className={`${inputClass(!tt.price && !!error)} pl-7`}
                        disabled={disabled}
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
                      className={inputClass()}
                      disabled={disabled}
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
                      className={inputClass()}
                      disabled={disabled}
                    />
                  </div>
                </div>

                {/* Hints */}
                {(tt.quantity || tt.saleEndsAt) && (
                  <div className="text-xs space-y-0.5" style={{ color: '#8a9bab' }}>
                    {tt.quantity && (
                      <p>Max {tt.quantity} ticket{parseInt(tt.quantity) !== 1 ? 's' : ''} of this type - remaining spots roll into overall capacity.</p>
                    )}
                    {tt.saleEndsAt && (
                      <p>Sale closes at {new Date(tt.saleEndsAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })} ({timeZone}) - this type will auto-hide for buyers after that.</p>
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
              disabled={disabled}>
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
          subtitle={`Organisations supporting this event - up to ${MAX_SPONSORS} (optional)`}
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
                    className="rounded p-1 hover:bg-red-50" disabled={disabled}>
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
                    className={inputClass()} disabled={disabled} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                    Role <span style={{ color: '#8a9bab' }}>(optional)</span>
                  </label>
                  <input type="text" placeholder="e.g. Title Sponsor"
                    value={sponsor.role}
                    onChange={e => handleSponsorChange(i, 'role', e.target.value)}
                    className={inputClass()} disabled={disabled} />
                </div>
              </div>
            </div>
          ))}
          {eventSponsors.length < MAX_SPONSORS && (
            <button type="button" onClick={handleAddSponsor}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition"
              style={{ background: '#f6f1e8', color: '#52636f' }}
              disabled={disabled}>
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
          subtitle={`Optional - up to ${MAX_PRIZES} prizes`}
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
                  className="rounded p-1 hover:bg-red-50" disabled={disabled}>
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
                    className={inputClass()} disabled={disabled} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                    Value ({sym}) <span style={{ color: '#8a9bab' }}>(optional)</span>
                  </label>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    value={prize.value ?? ''}
                    onChange={e => handlePrizeChange(i, 'value', parseFloat(e.target.value) || null)}
                    className={inputClass()} disabled={disabled} />
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
                  className={inputClass()} disabled={disabled} />
              </div>
            </div>
          ))}
          {prizes.length < MAX_PRIZES && (
            <button type="button" onClick={handleAddPrize}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition"
              style={{ background: '#f6f1e8', color: '#52636f' }}
              disabled={disabled}>
              <Plus className="h-3.5 w-3.5" />
              {prizes.length === 0 ? 'Add a Prize (optional)' : 'Add Another Prize'}
            </button>
          )}
        </div>
      </Section>

      {/* ── 5. Payment Methods ── */}
      <PaymentMethodSelector
        mode="split"
        value={value.paymentMethods}
        onChange={pm => set('paymentMethods', pm)}
        disabled={disabled}
      />

    </div>
  );
}