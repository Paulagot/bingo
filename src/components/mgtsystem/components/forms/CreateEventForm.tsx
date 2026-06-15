// src/components/mgtsystem/components/forms/CreateEventForm.tsx

import React, { useState, useEffect } from 'react';
import {
  X, Calendar, MapPin, Globe, Layers,
  DollarSign, FileText, Clock, AlertCircle, CreditCard, CheckSquare, Square,
} from 'lucide-react';

import { useCurrency } from '../../hooks/useCurrency';

import type {
  CreateEventForm as CreateEventFormData,
  UpdateEventForm,
  Event,
  LocationType,
  EventValidationErrors,
} from '../../types/event';

import { LOCATION_TYPE_META } from '../../types/event';
import { quizPaymentMethodsService } from '../../services/QuizPaymentMethodsService';
import type { PaymentMethod } from '../../services/QuizPaymentMethodsService';

interface Campaign { id: string; name: string; }

interface CreateEventFormProps {
  onSubmit:       (data: CreateEventFormData | UpdateEventForm) => Promise<any>;
  onCancel:       () => void;
  campaigns?:     Campaign[];
  editMode?:      boolean;
  existingEvent?: Event | null;
}

// ── Timezone helpers ───────────────────────────────────────────────────────────
//
// THE CORE PROBLEM:
//   A <input type="datetime-local"> gives you a string like "2025-06-07T19:00"
//   with NO timezone info. The browser treats it as local time (Dublin = UTC+1
//   in summer), but if you send that bare string to the backend and store it in
//   MySQL, it gets saved as "19:00" with no offset — and Railway/MySQL running
//   in UTC will later treat it as "19:00 UTC", which is 20:00 Dublin. Wrong.
//
// THE SOLUTION:
//   1. On SUBMIT  → convert "2025-06-07T19:00" (local) → "2025-06-07T18:00:00.000Z" (UTC)
//   2. On LOAD    → convert "2025-06-07T18:00:00.000Z" (UTC from DB) → "2025-06-07T19:00" (local)
//   The browser's own timezone is used for both, which is correct because
//   `detectTimezone()` already captures it as "Europe/Dublin".

function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Convert a datetime-local string ("YYYY-MM-DDTHH:MM") entered in the
 * browser's local timezone into a UTC ISO string for storage.
 *
 * Why `new Date(str)` works here:
 *   Browsers parse "YYYY-MM-DDTHH:MM" (no Z, no offset) as LOCAL time.
 *   So new Date("2025-06-07T19:00") in a Dublin browser = 19:00 IST = 18:00 UTC.
 *   .toISOString() then gives us "2025-06-07T18:00:00.000Z" — correct for storage.
 */
function localInputToUTC(localDateTimeStr: string): string {
  if (!localDateTimeStr) return '';
  return new Date(localDateTimeStr).toISOString();
}

/**
 * Convert a UTC datetime string from the database back to the "YYYY-MM-DDTHH:MM"
 * format that <input type="datetime-local"> needs, expressed in the user's
 * local timezone so the form shows the correct local time.
 *
 * Example: "2025-06-07T18:00:00.000Z" → "2025-06-07T19:00" (in Dublin, UTC+1)
 */
function utcToLocalInput(utcString: string, timeZone: string): string {
  if (!utcString) return '';
  const date = new Date(utcString);
  if (isNaN(date.getTime())) return '';

  // Intl.DateTimeFormat gives us the correct local time parts for the given timezone
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00';

  // datetime-local expects exactly "YYYY-MM-DDTHH:MM"
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

// ── Other helpers ──────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

function isOnnightOnly(method: PaymentMethod): boolean {
  const provider = String(method.provider_name || '').toLowerCase();
  return provider === 'cash' || provider === 'card_tap';
}

function getMethodSubtitle(method: PaymentMethod): string {
  const cat = method.method_category;
  if (cat === 'stripe') return 'Online card payment via Stripe';
  if (cat === 'crypto') return 'Crypto / Web3 payment';
  if (cat === 'instant_payment') return method.player_instructions || 'Instant transfer (Revolut, bank, etc.)';
  if (method.provider_name === 'cash') return 'Collected at the door';
  if (method.provider_name === 'card_tap') return 'Card tap on the night';
  return method.provider_name || '';
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
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

const Field: React.FC<{
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}> = ({ label, required, hint, error, children }) => (
  <div>
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
      {label}
      {required && <span className="ml-0.5" style={{ color: '#e9574f' }}>*</span>}
      {hint && <span className="ml-1.5 font-normal" style={{ color: '#8a9bab' }}>{hint}</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 flex items-center gap-1 text-xs font-medium" style={{ color: '#e9574f' }}>
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

const inputClass = (hasError?: string) =>
  `w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent ${
    hasError ? 'border-[#e9574f] bg-red-50' : 'border-[#dce1df] bg-white hover:border-[#b8c6b0]'
  }`;

const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
    {children}
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  onSubmit, onCancel, campaigns = [], editMode = false, existingEvent = null,
}) => {
  const tz = detectTimezone(); // e.g. "Europe/Dublin"

  const getInitialData = (): CreateEventFormData => {
    if (editMode && existingEvent) {
      return {
        title:               existingEvent.title,
        type:                existingEvent.type || '',
        summary:             existingEvent.summary || '',
        description:         existingEvent.description || '',
        location_type:       existingEvent.location_type || 'in_person',
        location_label:      existingEvent.location_label || '',
        online_url:          existingEvent.online_url || '',
        primary_action_type: 'attend',

        // FIX: the DB stores UTC (e.g. "2025-06-07T18:00:00.000Z").
        // We must convert it back to local time for the datetime-local input,
        // otherwise the form shows 18:00 instead of 19:00.
        // Old (buggy):  existingEvent.start_datetime.slice(0, 16)
        //               — this just strips the Z and treats UTC as local time.
        // New (correct): utcToLocalInput() converts UTC → local "YYYY-MM-DDTHH:MM".
        start_datetime: existingEvent.start_datetime
          ? utcToLocalInput(existingEvent.start_datetime, existingEvent.time_zone || tz)
          : '',

        // event_date should also reflect local date, not UTC date
        // (a 23:30 Dublin event on Jun 7 is Jun 7 UTC+1, not Jun 8 UTC)
        event_date: existingEvent.start_datetime
          ? utcToLocalInput(existingEvent.start_datetime, existingEvent.time_zone || tz).split('T')[0]
          : existingEvent.event_date
            ? existingEvent.event_date.slice(0, 10)
            : '',

        end_datetime:   '',
        time_zone:      existingEvent.time_zone || tz,
        goal_amount:    existingEvent.goal_amount || 0,
        campaign_id:    existingEvent.campaign_id || '',
      };
    }

    return {
      title: '', type: '', summary: '', description: '',
      location_type: 'in_person', location_label: '', online_url: '',
      primary_action_type: 'attend',
      event_date: '', start_datetime: '', end_datetime: '',
      time_zone: tz,
      goal_amount: 0, campaign_id: '',
    };
  };

  const [form, setForm]             = useState<CreateEventFormData>(getInitialData);
  const [errors, setErrors]         = useState<EventValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);
  const [ticketMethodIds, setTicketMethodIds]   = useState<number[]>([]);
  const [onnightMethodIds, setOnnightMethodIds] = useState<number[]>([]);
  const [pmLoading, setPmLoading]               = useState(false);
  const [pmError, setPmError]                   = useState<string | null>(null);
  const { sym } = useCurrency();

  useEffect(() => {
    if (editMode && existingEvent) setForm(getInitialData());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, existingEvent?.id]);

  useEffect(() => {
    if (editMode && existingEvent?.payment_methods_json) {
      const pm = existingEvent.payment_methods_json;
      setTicketMethodIds(pm.ticket_method_ids   || []);
      setOnnightMethodIds(pm.onnight_method_ids || []);
    }
  }, [editMode, existingEvent?.id]);

  useEffect(() => {
    let cancelled = false;
    setPmLoading(true);
    setPmError(null);
    quizPaymentMethodsService.listAvailablePaymentMethods()
      .then(res => {
        if (cancelled) return;
        setAvailablePaymentMethods((res.payment_methods || []).filter((m: PaymentMethod) => m.is_enabled));
      })
      .catch(() => { if (!cancelled) setPmError('Could not load payment methods.'); })
      .finally(() => { if (!cancelled) setPmLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggleTicket  = (id: number) => setTicketMethodIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleOnnight = (id: number) => setOnnightMethodIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const set = (field: keyof CreateEventFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof EventValidationErrors]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'goal_amount') set(name as any, value ? parseFloat(value) : 0);
    else set(name as any, value);
  };

  const validate = (): boolean => {
    const e: EventValidationErrors = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.goal_amount || form.goal_amount <= 0) e.goal_amount = 'Goal amount must be greater than 0';
    if (!form.start_datetime && !form.event_date) {
      e.event_date = 'Date and time is required';
    } else if (!editMode) {
      // form.start_datetime is still local time at this point (before submit converts it),
      // so new Date() correctly parses it as local time for the past-date check
      const d = new Date(form.start_datetime || form.event_date || '');
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (d < today) e.event_date = 'Date cannot be in the past';
    }
    if (form.summary && form.summary.length > 280) e.summary = 'Summary must be 280 characters or less';
    if (form.online_url && !isValidUrl(form.online_url)) e.online_url = 'Please enter a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      // FIX: Convert local datetime → UTC before sending to backend.
      //
      // form.start_datetime is "YYYY-MM-DDTHH:MM" from the datetime-local input.
      // The browser treats this as local time (Dublin = UTC+1 in summer).
      // localInputToUTC() calls new Date(str) — which the browser parses as local —
      // then .toISOString() which gives us the correct UTC string.
      //
      // Example: user picks 19:00 in Dublin
      //   form.start_datetime = "2025-06-07T19:00"
      //   localInputToUTC()   = "2025-06-07T18:00:00.000Z"   ← stored in DB as UTC
      //   On load back:  utcToLocalInput() = "2025-06-07T19:00"  ← shown to user correctly
      //
      // Old (buggy): sent "2025-06-07T19:00" raw → MySQL stored it as 19:00 UTC
      //              → displayed back as 19:00 but launch calc treated it as UTC → off by 1hr
      const utcStartDatetime = form.start_datetime
        ? localInputToUTC(form.start_datetime)
        : '';

      // event_date should be the LOCAL date (not UTC date), because a 23:30 Dublin
      // event on Sat Jun 7 is still Jun 7 in Dublin even though it's Jun 8 UTC.
      const localEventDate = form.start_datetime
        ? form.start_datetime.split('T')[0]   // take date from local string before UTC conversion
        : form.event_date;

      const payload = {
        ...form,
        title:                form.title.trim(),
        summary:              form.summary?.trim() || undefined,
        campaign_id:          form.campaign_id || undefined,
        start_datetime:       utcStartDatetime,     // ← UTC ISO string, correct for DB storage
        event_date:           localEventDate,        // ← local date (YYYY-MM-DD)
        ticket_method_ids:    ticketMethodIds,
        onnight_method_ids:   onnightMethodIds,
        payment_methods_json: { ticket_method_ids: ticketMethodIds, onnight_method_ids: onnightMethodIds },
      } as CreateEventFormData & { ticket_method_ids: number[]; onnight_method_ids: number[]; payment_methods_json: any };

      await onSubmit(payload);
      onCancel();
    } catch (err: any) {
      setErrors({ title: err?.message || 'Something went wrong. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const summaryLen         = form.summary?.length || 0;
  const descLen            = form.description?.length || 0;
  const locationNeedsUrl   = form.location_type === 'online' || form.location_type === 'hybrid';
  const locationNeedsLabel = form.location_type === 'in_person' || form.location_type === 'hybrid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #157f85', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                {editMode ? 'Edit Event' : 'Create Event'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                {editMode ? 'Update the details below' : 'Fill in the details — saved as draft until you publish'}
              </p>
            </div>
          </div>
          <button onClick={onCancel} disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100 disabled:opacity-40"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>

          {/* ── 1. The Basics ── */}
          <Section>
            <SectionHeader icon={<FileText className="h-4 w-4" />} title="The Basics" />
            <div className="space-y-4">
              <Field label="Event Title" required error={errors.title}>
                <input name="title" type="text" value={form.title}
                  onChange={handleChange} placeholder="e.g. Christmas Quiz Night"
                  className={inputClass(errors.title)} disabled={submitting} autoFocus />
              </Field>
              <Field label="Summary" hint="(optional — max 280 chars)" error={errors.summary}>
                <textarea name="summary" value={form.summary || ''} onChange={handleChange}
                  placeholder="A one-liner that tells people what this event is about…"
                  rows={2} maxLength={280} className={inputClass(errors.summary)}
                  disabled={submitting} style={{ resize: 'none' }} />
                <p className="mt-1 text-right text-xs"
                  style={{ color: summaryLen > 260 ? '#e9574f' : '#8a9bab' }}>
                  {summaryLen}/280
                </p>
              </Field>
              <Field label="Description" hint="(optional — max 750 chars)">
                <textarea name="description" value={form.description || ''} onChange={handleChange}
                  placeholder="Tell people what to expect, how to prepare, or anything else they need to know…"
                  rows={3} maxLength={750} className={inputClass()}
                  disabled={submitting} style={{ resize: 'vertical' }} />
                <p className="mt-1 text-right text-xs"
                  style={{ color: descLen > 700 ? '#e9574f' : '#8a9bab' }}>
                  {descLen}/750
                </p>
              </Field>
              {campaigns.length > 0 && (
                <Field label="Campaign" hint="(optional)">
                  <select name="campaign_id" value={form.campaign_id || ''}
                    onChange={handleChange} className={inputClass()} disabled={submitting}>
                    <option value="">No campaign</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </Field>
              )}
            </div>
          </Section>

          {/* ── 2. When ── */}
          <Section>
            <SectionHeader icon={<Clock className="h-4 w-4" />} title="When"
              subtitle="Set the date and time for this event" />
            <div className="space-y-3">
              <Field label="Date & Start Time" required error={errors.event_date}>
                <input
                  name="start_datetime"
                  type="datetime-local"
                  value={form.start_datetime || ''}
                  onChange={e => {
                    // Store the raw local string in form state — we convert to UTC only on submit.
                    // Also keep event_date in sync using the LOCAL date portion (before T).
                    handleChange(e);
                    if (e.target.value) {
                      set('event_date', e.target.value.split('T')[0]);
                    }
                  }}
                  className={inputClass(errors.event_date)}
                  disabled={submitting}
                />
              </Field>
              <p className="text-xs flex items-center gap-1.5" style={{ color: '#8a9bab' }}>
                <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                Timezone auto-detected:
                <span className="font-medium" style={{ color: '#52636f' }}>{form.time_zone || tz}</span>
              </p>
            </div>
          </Section>

          {/* ── 3. Where ── */}
          <Section>
            <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Where"
              subtitle="In-person, online, or both?" />
            <div className="space-y-4">
              <Field label="Format">
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(LOCATION_TYPE_META) as LocationType[]).map(lt => {
                    const meta = LOCATION_TYPE_META[lt];
                    const isActive = form.location_type === lt;
                    const Icon = lt === 'online' ? Globe : lt === 'hybrid' ? Layers : MapPin;
                    return (
                      <button key={lt} type="button"
                        onClick={() => set('location_type', lt)}
                        disabled={submitting}
                        className="flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 text-xs font-semibold transition-all"
                        style={isActive
                          ? { borderColor: '#157f85', background: 'rgba(21,127,133,0.08)', color: '#157f85' }
                          : { borderColor: '#dce1df', background: '#fff', color: '#52636f' }}>
                        <Icon className="h-4 w-4" />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </Field>
              {locationNeedsLabel && (
                <Field label="Venue Name" hint="(optional)">
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input name="location_label" type="text"
                      value={form.location_label || ''} onChange={handleChange}
                      placeholder="e.g. The Grand Hotel, Killarney"
                      className={`${inputClass()} pl-9`} disabled={submitting} />
                  </div>
                </Field>
              )}
              {locationNeedsUrl && (
                <Field label="Online Link" hint="(optional)" error={errors.online_url}>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input name="online_url" type="url"
                      value={form.online_url || ''} onChange={handleChange}
                      placeholder="https://zoom.us/j/..."
                      className={`${inputClass(errors.online_url)} pl-9`} disabled={submitting} />
                  </div>
                </Field>
              )}
            </div>
          </Section>

          {/* ── 4. The Goal ── */}
          <Section>
            <SectionHeader icon={<DollarSign className="h-4 w-4" />} title="The Goal"
              subtitle="How much are you aiming to raise?" />
            <Field label="Fundraising Goal" required error={errors.goal_amount}>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
                <input name="goal_amount" type="number" min="1" step="1"
                  value={form.goal_amount || ''} onChange={handleChange} placeholder="500"
                  className={`${inputClass(errors.goal_amount)} pl-7`} disabled={submitting} />
              </div>
            </Field>
          </Section>

          {/* ── 5. Payment Methods ── */}
          <Section>
            <SectionHeader icon={<CreditCard className="h-4 w-4" />}
              title="Payment Methods"
              subtitle="Choose which methods players can use for tickets and on the night" />

            {pmLoading && (
              <div className="flex items-center gap-2 text-sm py-4" style={{ color: '#8a9bab' }}>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Loading payment methods…
              </div>
            )}
            {pmError && (
              <p className="text-sm flex items-center gap-1.5 py-2" style={{ color: '#e9574f' }}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {pmError}
              </p>
            )}
            {!pmLoading && !pmError && availablePaymentMethods.length === 0 && (
              <div className="rounded-lg border border-dashed px-4 py-5 text-center text-sm"
                style={{ borderColor: '#dce1df', color: '#8a9bab' }}>
                No payment methods set up yet. You can add them from the dashboard.
              </div>
            )}
            {!pmLoading && availablePaymentMethods.length > 0 && (
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#dce1df' }}>
                <div className="grid grid-cols-[1fr_90px_110px] text-xs font-semibold px-4 py-2.5"
                  style={{ background: '#f6f1e8', color: '#52636f', borderBottom: '1px solid #dce1df' }}>
                  <span>Method</span>
                  <span className="text-center">Tickets</span>
                  <span className="text-center">On the Night</span>
                </div>
                {availablePaymentMethods.map((method, i) => {
                  const onnightOnly    = isOnnightOnly(method);
                  const ticketChecked  = ticketMethodIds.includes(method.id);
                  const onnightChecked = onnightMethodIds.includes(method.id);
                  const isLast = i === availablePaymentMethods.length - 1;
                  return (
                    <div key={method.id}
                      className="grid grid-cols-[1fr_90px_110px] items-center px-4 py-3"
                      style={{ borderBottom: isLast ? 'none' : '1px solid #f1f0ee', background: '#ffffff' }}>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#102532' }}>{method.method_label}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#8a9bab' }}>{getMethodSubtitle(method)}</p>
                      </div>
                      <div className="flex justify-center">
                        <button type="button" disabled={onnightOnly || submitting}
                          onClick={() => toggleTicket(method.id)}
                          title={onnightOnly ? 'Cash and card-tap payments can only be collected on the night' : ''}
                          className="flex items-center justify-center transition"
                          style={{ opacity: onnightOnly ? 0.3 : 1, cursor: onnightOnly ? 'not-allowed' : 'pointer' }}>
                          {ticketChecked && !onnightOnly
                            ? <CheckSquare className="h-5 w-5" style={{ color: '#157f85' }} />
                            : <Square className="h-5 w-5" style={{ color: '#b8c6b0' }} />}
                        </button>
                      </div>
                      <div className="flex justify-center">
                        <button type="button" disabled={submitting}
                          onClick={() => toggleOnnight(method.id)}
                          className="flex items-center justify-center transition"
                          style={{ cursor: 'pointer' }}>
                          {onnightChecked
                            ? <CheckSquare className="h-5 w-5" style={{ color: '#157f85' }} />
                            : <Square className="h-5 w-5" style={{ color: '#b8c6b0' }} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
       
          </Section>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          {/* <p className="text-xs" style={{ color: '#8a9bab' }}>Will be saved as draft</p> */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={onCancel} disabled={submitting}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: '#dce1df', color: '#52636f' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: '#157f85' }}>
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  {editMode ? 'Saving…' : 'Creating…'}
                </>
              ) : (
                editMode ? 'Save Changes' : 'Create Event'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CreateEventForm;

