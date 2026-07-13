// src/components/mgtsystem/wizard/steps/EventDetailsStep.tsx
//
// Step 2: the event's what/when/where/goal — the sections that used to
// live in CreateEventForm, now shaped by the chosen activity type:
//
//   def.showLocation === false → no "Where" section at all; the event is
//     saved as location_type 'online' with no label/URL (puzzle types are
//     platform-hosted — agreed decision).
//   def.dateMode === 'startPlusWeeks' → the "When" section asks for a
//     start date/time PLUS a duration in weeks (subscription-style
//     activities), instead of a single event date/time. The weeks value
//     is consumed by both the event's end_datetime (submitChain) and the
//     activity's own schedule payload (phase-2 puzzle_sub step).
//
// State is fully controlled by the wizard store (fields/onChange), so
// every keystroke is autosaved — this component holds no state of its own
// beyond what it renders.
//
// UTC handling matches CreateEventForm exactly: the datetime-local value
// stays LOCAL in state; conversion to UTC happens once, at submit, in
// submitChain.buildDraftEvent(). See CreateEventForm.tsx for the full
// timezone rationale.

import { FileText, Clock, MapPin, Globe, Layers, DollarSign, Minus, Plus } from 'lucide-react';
import { Section, SectionHeader, Field, inputClass } from '../../shared/ui';
import { LOCATION_TYPE_META } from '../../types/event';
import type { LocationType, EventValidationErrors } from '../../types/event';
import type { ActivityTypeDef } from '../activityRegistry';
import type { WizardEventFields } from '../useWizardStore';

interface Campaign { id: string; name: string; }

interface Props {
  def:       ActivityTypeDef<any>;
  fields:    WizardEventFields;
  onChange:  (patch: Partial<WizardEventFields>) => void;
  errors:    EventValidationErrors;
  campaigns: Campaign[];
  disabled:  boolean;
  currencySym: string;
}

// Same client-side rules CreateEventForm.validate() enforced, minus the
// fields the registry now stamps automatically (type, primary_action).
export function validateEventFields(
  fields: WizardEventFields,
  def: ActivityTypeDef<any>,
  opts: { allowPastDate?: boolean } = {},
): EventValidationErrors {
  const e: EventValidationErrors = {};
  if (!fields.title.trim()) e.title = 'Title is required';
  if (!fields.goal_amount || Number(fields.goal_amount) <= 0) e.goal_amount = 'Goal amount must be greater than 0';

  if (!fields.start_datetime) {
    e.event_date = def.dateMode === 'startPlusWeeks'
      ? 'Start date and time is required'
      : 'Date and time is required';
  } else if (!opts.allowPastDate) {
    // start_datetime is still local at this point, so new Date() parses
    // it as local time for the past-date check. Editing an existing
    // event allows past dates (same as CreateEventForm's editMode did).
    const d = new Date(fields.start_datetime);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (d < today) e.event_date = 'Date cannot be in the past';
  }

  if (fields.summary && fields.summary.length > 280) e.summary = 'Summary must be 280 characters or less';
  if (def.showLocation && fields.online_url) {
    try { new URL(fields.online_url); } catch { e.online_url = 'Please enter a valid URL'; }
  }
  return e;
}

export default function EventDetailsStep({
  def, fields, onChange, errors, campaigns, disabled, currencySym,
}: Props) {
  const locationNeedsUrl   = fields.location_type === 'online' || fields.location_type === 'hybrid';
  const locationNeedsLabel = fields.location_type === 'in_person' || fields.location_type === 'hybrid';
  const summaryLen = fields.summary.length;
  const descLen    = fields.description.length;
  const isWeeks    = def.dateMode === 'startPlusWeeks';

  return (
    <div className="space-y-4">

      {/* ── 1. The Basics ── */}
      <Section>
        <SectionHeader icon={<FileText className="h-4 w-4" />} title="The Basics" />
        <div className="space-y-4">
          <Field label="Event Title" required error={errors.title}>
            <input type="text" value={fields.title}
              onChange={e => onChange({ title: e.target.value })}
              placeholder={`e.g. Christmas ${def.label}`}
              className={inputClass(!!errors.title)} disabled={disabled} autoFocus />
          </Field>
          <Field label="Summary" hint="(optional — max 280 chars)" error={errors.summary}>
            <textarea value={fields.summary}
              onChange={e => onChange({ summary: e.target.value })}
              placeholder="A one-liner that tells people what this event is about…"
              rows={2} maxLength={280} className={inputClass(!!errors.summary)}
              disabled={disabled} style={{ resize: 'none' }} />
            <p className="mt-1 text-right text-xs"
              style={{ color: summaryLen > 260 ? '#e9574f' : '#8a9bab' }}>
              {summaryLen}/280
            </p>
          </Field>
          <Field label="Description" hint="(optional — max 750 chars)">
            <textarea value={fields.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder="Tell people what to expect, how to prepare, or anything else they need to know…"
              rows={3} maxLength={750} className={inputClass()}
              disabled={disabled} style={{ resize: 'vertical' }} />
            <p className="mt-1 text-right text-xs"
              style={{ color: descLen > 700 ? '#e9574f' : '#8a9bab' }}>
              {descLen}/750
            </p>
          </Field>
          {campaigns.length > 0 && (
            <Field label="Campaign" hint="(optional)">
              <select value={fields.campaign_id}
                onChange={e => onChange({ campaign_id: e.target.value })}
                className={inputClass()} disabled={disabled}>
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
          subtitle={isWeeks
            ? 'When does it start, and how many weeks does it run?'
            : 'Set the date and time for this event'} />
        <div className="space-y-3">
          <Field label={isWeeks ? 'Start Date & Time' : 'Date & Start Time'} required error={errors.event_date}>
            <input
              type="datetime-local"
              value={fields.start_datetime}
              onChange={e => onChange({ start_datetime: e.target.value })}
              className={inputClass(!!errors.event_date)}
              disabled={disabled}
            />
          </Field>

          {isWeeks && (
            <Field label="Duration" hint="(weeks)">
              <div className="inline-flex items-center gap-2">
                <button type="button" disabled={disabled || fields.weeks <= 1}
                  onClick={() => onChange({ weeks: Math.max(1, fields.weeks - 1) })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:bg-gray-50 disabled:opacity-40"
                  style={{ borderColor: '#dce1df', color: '#52636f' }}>
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-16 text-center text-sm font-bold" style={{ color: '#102532' }}>
                  {fields.weeks} {fields.weeks === 1 ? 'week' : 'weeks'}
                </span>
                <button type="button" disabled={disabled || fields.weeks >= 52}
                  onClick={() => onChange({ weeks: Math.min(52, fields.weeks + 1) })}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border transition hover:bg-gray-50 disabled:opacity-40"
                  style={{ borderColor: '#dce1df', color: '#52636f' }}>
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </Field>
          )}

          <p className="text-xs flex items-center gap-1.5" style={{ color: '#8a9bab' }}>
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            Timezone auto-detected:
            <span className="font-medium" style={{ color: '#52636f' }}>{fields.time_zone}</span>
          </p>
        </div>
      </Section>

      {/* ── 3. Where (hidden entirely for platform-hosted online types) ── */}
      {def.showLocation && (
        <Section>
          <SectionHeader icon={<MapPin className="h-4 w-4" />} title="Where"
            subtitle="In-person, online, or both?" />
          <div className="space-y-4">
            <Field label="Format">
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LOCATION_TYPE_META) as LocationType[]).map(lt => {
                  const meta = LOCATION_TYPE_META[lt];
                  const isActive = fields.location_type === lt;
                  const Icon = lt === 'online' ? Globe : lt === 'hybrid' ? Layers : MapPin;
                  return (
                    <button key={lt} type="button"
                      onClick={() => onChange({ location_type: lt })}
                      disabled={disabled}
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
                  <input type="text"
                    value={fields.location_label}
                    onChange={e => onChange({ location_label: e.target.value })}
                    placeholder="e.g. The Grand Hotel, Killarney"
                    className={`${inputClass()} pl-9`} disabled={disabled} />
                </div>
              </Field>
            )}
            {locationNeedsUrl && (
              <Field label="Online Link" hint="(optional)" error={errors.online_url}>
                <div className="relative">
                  <Globe className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input type="url"
                    value={fields.online_url}
                    onChange={e => onChange({ online_url: e.target.value })}
                    placeholder="https://zoom.us/j/..."
                    className={`${inputClass(!!errors.online_url)} pl-9`} disabled={disabled} />
                </div>
              </Field>
            )}
          </div>
        </Section>
      )}

      {/* ── 4. The Goal ── */}
      <Section>
        <SectionHeader icon={<DollarSign className="h-4 w-4" />} title="The Goal"
          subtitle="How much are you aiming to raise?" />
        <Field label="Fundraising Goal" required error={errors.goal_amount}>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{currencySym}</span>
            <input type="number" min="1" step="1"
              value={fields.goal_amount || ''}
              onChange={e => onChange({ goal_amount: e.target.value ? parseFloat(e.target.value) : '' })}
              placeholder="500"
              className={`${inputClass(!!errors.goal_amount)} pl-7`} disabled={disabled} />
          </div>
        </Field>
      </Section>

    </div>
  );
}