// src/components/mgtsystem/modals/EditEventModal.tsx
//
// The EDIT-EVENT modal — replaces CreateEventForm's editMode (the create
// half of CreateEventForm was already retired by CreateFundraiserWizard,
// so once the dashboard swaps to this, CreateEventForm.tsx can be
// DELETED).
//
// Renders the same EventDetailsStep the wizard's step 2 uses, shaped by
// the event's activity type via getActivityDefByEventType (so a puzzle
// subscription event still shows no location section, etc.), with two
// deliberate edit-mode differences:
//
//   • dateMode is forced to 'datetime' even for subscription events —
//     the weeks stepper is a CREATE-time input; the challenge's actual
//     weeks/schedule are locked to Stripe billing and edited (draft-only)
//     via the drawer's Setup tab, so showing an editable weeks control
//     here would imply changes it cannot make.
//   • past dates are allowed (same as CreateEventForm's editMode was).
//
// CONTRACT: identical to CreateEventForm's — onSubmit(data) receives the
// payload with start_datetime already converted to UTC; the caller
// (QuizEventDashboard.handleUpdateEvent) performs the update and its
// ticketed-room date sync, unchanged. Two field-preservation fixes over
// the old form: primary_action_type is kept from the event instead of
// being reset to 'attend', and location fields are simply not sent for
// activity types that hide the location section (rather than being
// overwritten).

import { useState } from 'react';
import { Calendar, X, Save } from 'lucide-react';
import { currencySymbol } from '../shared/CurrencySelect';
import { useAuthStore } from '../../../features/auth';
import { utcToLocalInput, detectTimezone } from '../../../utils/dateUtils';
import { ErrorBanner } from '../shared/ui';
import type { Event, UpdateEventForm, EventValidationErrors } from '../types/event';
import { getActivityDefByEventType, type ActivityTypeDef } from '../wizard/activityRegistry';
import { emptyEventFields, type WizardEventFields } from '../wizard/useWizardStore';
import EventDetailsStep, { validateEventFields } from '../wizard/steps/EventDetailsStep';

interface Campaign { id: string; name: string; }

interface Props {
  event:      Event;
  onSubmit:   (data: UpdateEventForm) => Promise<any>;
  onCancel:   () => void;
  campaigns?: Campaign[];
}

// Generic shape for legacy events whose free-form type doesn't match a
// registry entry: show everything, single date/time. Only the fields
// EventDetailsStep and validateEventFields actually read are meaningful.
const GENERIC_SHAPE = {
  label:        'Event',
  showLocation: true,
  dateMode:     'datetime',
} as unknown as ActivityTypeDef<unknown>;

function localInputToUTC(localDateTimeStr: string): string {
  return new Date(localDateTimeStr).toISOString();
}

export default function EditEventModal({ event, onSubmit, onCancel, campaigns = [] }: Props) {
  const club = useAuthStore((s: any) => s.club);
  const sym  = currencySymbol(club?.reporting_currency ?? 'EUR');

  // Shape the form by the event's activity type; force single date/time
  // in edit mode (see header).
  const matched = getActivityDefByEventType(event.type);
  const def: ActivityTypeDef<unknown> = matched
    ? { ...matched, dateMode: 'datetime' }
    : GENERIC_SHAPE;

  const tz = event.time_zone || detectTimezone();

  const [fields, setFields] = useState<WizardEventFields>(() => ({
    ...emptyEventFields(tz),
    title:          event.title,
    summary:        event.summary || '',
    description:    event.description || '',
    campaign_id:    event.campaign_id || '',
    // DB stores UTC; the datetime-local input needs local time back.
    start_datetime: event.start_datetime
      ? utcToLocalInput(event.start_datetime, tz)
      : event.event_date
      ? `${event.event_date.slice(0, 10)}T19:00`
      : '',
    time_zone:      tz,
    location_type:  event.location_type || 'in_person',
    location_label: event.location_label || '',
    online_url:     event.online_url || '',
    goal_amount:    event.goal_amount || '',
  }));

  const [errors, setErrors]         = useState<EventValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    const errs = validateEventFields(fields, def, { allowPastDate: true });
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const data: UpdateEventForm = {
        title:               fields.title.trim(),
        type:                event.type,                         // unchanged — set by the wizard at creation
        primary_action_type: event.primary_action_type,          // preserved (old form reset this to 'attend')
        summary:             fields.summary.trim() || undefined,
        description:         fields.description.trim() || undefined,
        campaign_id:         fields.campaign_id || undefined,
        goal_amount:         Number(fields.goal_amount) || 0,
        start_datetime:      fields.start_datetime ? localInputToUTC(fields.start_datetime) : undefined,
        event_date:          fields.start_datetime ? fields.start_datetime.slice(0, 10) : undefined,
        time_zone:           fields.time_zone,
      };

      if (def.showLocation) {
        data.location_type  = fields.location_type;
        data.location_label = fields.location_label.trim() || undefined;
        data.online_url     = fields.online_url.trim() || undefined;
      }
      // else: platform-hosted online type — location untouched on the row.

      await onSubmit(data);
      onCancel(); // close, matching CreateEventForm's post-save behaviour
    } catch (e: any) {
      setError(e?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #157f85', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>Edit Event</h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                {matched ? matched.label : event.type || 'Event'} · activity settings are edited from the event's dashboard
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100 disabled:opacity-40"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body — the shared step ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>
          {error && <ErrorBanner message={error} />}
          <EventDetailsStep
            def={def}
            fields={fields}
            onChange={patch => setFields(prev => ({ ...prev, ...patch }))}
            errors={errors}
            campaigns={campaigns}
            disabled={submitting}
            currencySym={sym}
          />
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <button type="button" onClick={onCancel} disabled={submitting}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: '#dce1df', color: '#52636f' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#157f85' }}>
            {submitting
              ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Saving…</>
              : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
          </button>
        </div>

      </div>
    </div>
  );
}