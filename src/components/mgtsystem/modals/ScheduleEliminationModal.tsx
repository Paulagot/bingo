// src/components/mgtsystem/modals/ScheduleEliminationModal.tsx
//
// Now a THIN WRAPPER around EliminationActivityStep (the extracted body
// shared with CreateFundraiserWizard's step 3). This modal keeps exactly
// the same Props contract as before, and still supports BOTH modes during
// the wizard rollout:
//
//   • edit mode  (existingRoom set)  — its long-term job: pre-fills from
//     the room's config, submit calls updateRoom. Opened from the drawer.
//   • create mode (no existingRoom) — legacy path kept working until the
//     dashboard's Add Activity is rewired to the wizard; submit calls
//     scheduleRoom + onSaved(roomId) so handleActivitySaved can link,
//     identical to the previous behaviour.
//
// All field UI, validation rules, and the config shape live in
// EliminationActivityStep — change them there and both create and edit
// stay in lockstep.

import { useMemo, useState } from 'react';
import { X, Trophy, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../../../features/auth';
import eliminationMgmtService, { type EliminationRoomListItem } from '../services/EliminationMgmtService';
import { ErrorBanner } from '../shared/ui';
import type { Event } from '../types/event';
import type { DraftEvent } from '../wizard/activityRegistry';
import EliminationActivityStep, {
  type EliminationConfig,
  defaultEliminationConfig,
  validateEliminationConfig,
} from '../wizard/steps/activities/EliminationActivityStep';

interface Props {
  onClose:       () => void;
  onSaved:       (roomId?: string) => void;
  event?:        Event;
  existingRoom?: EliminationRoomListItem;
}

export default function ScheduleEliminationModal({ onClose, onSaved, event, existingRoom }: Props) {
  const isEditMode = !!existingRoom;

  // Use the service's normalised parseConfig so old flat-field rooms load correctly
  const existingConfig = useMemo(
    () => (existingRoom ? eliminationMgmtService.parseConfig(existingRoom) : null),
    [existingRoom],
  );
  const existingPrize = existingConfig?.prizes?.find(p => p.place === 1) ?? null;

  const user     = useAuthStore((s: any) => s.user);
  const club     = useAuthStore((s: any) => s.club);
  const hostId   = user?.id || user?.user_id || user?.club_user_id || '';
  const hostName = user?.name || user?.full_name || user?.first_name || '';
  const currency = club?.reporting_currency ?? 'EUR';

  const scheduledAt = existingRoom?.scheduled_at
    || event?.start_datetime
    || (event?.event_date ? `${event.event_date}T19:00:00` : null);
  const timeZone = existingRoom?.time_zone
    || event?.time_zone
    || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Payment methods hydrated from the room's own column on edit — NOT
  // from the event. See PaymentMethodSelector.tsx for the reasoning.
  const rawLinked = existingRoom?.linked_payment_methods_json;
  const parsedLinked =
    typeof rawLinked === 'string'
      ? (() => { try { return JSON.parse(rawLinked); } catch { return null; } })()
      : (rawLinked ?? null);

  const [config, setConfig] = useState<EliminationConfig>(() => ({
    ...defaultEliminationConfig(),
    entryFee:         existingConfig?.entryFee != null ? String(existingConfig.entryFee) : '',
    prizeDescription: existingPrize?.description ?? '',
    prizeValue:       existingPrize?.value != null ? String(existingPrize.value) : '',
    prizeSponsor:     existingPrize?.sponsor ?? '',
    paymentMethods: {
      ticketMethodIds:  parsedLinked?.ticket_method_ids  ?? [],
      onnightMethodIds: parsedLinked?.onnight_method_ids ?? [],
    },
  }));

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // The step reads event context off a DraftEvent — synthesise one from
  // the real event / room, same fields the old modal read directly.
  const draftEvent: DraftEvent = {
    title:          event?.title ?? '',
    summary:        event?.summary ?? null,
    start_datetime: scheduledAt,
    event_date:     event?.event_date ?? '',
    time_zone:      timeZone,
    location_label: event?.location_label ?? null,
    goal_amount:    event?.goal_amount ?? 0,
  };

  const handleSubmit = async () => {
    setError(null);
    const errs = validateEliminationConfig(config);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const prizes = [{
        place:       1,
        value:       config.prizeValue ? Number(config.prizeValue) : null,
        description: config.prizeDescription.trim(),
        sponsor:     config.prizeSponsor.trim() || null,
      }];

      const payload = {
        scheduledAt,
        timeZone,
        entryFee: Number(config.entryFee),
        currency,
        prizes,
        // Flat fields kept for backend compatibility during migration
        prizeDescription: config.prizeDescription.trim(),
        prizeValue:       config.prizeValue ? Number(config.prizeValue) : undefined,
        ticketMethodIds:  config.paymentMethods.ticketMethodIds,
        onnightMethodIds: config.paymentMethods.onnightMethodIds,
      };

      if (isEditMode && existingRoom) {
        await eliminationMgmtService.updateRoom(existingRoom.room_id, payload);
        onSaved(existingRoom.room_id);
      } else {
        const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
        await eliminationMgmtService.scheduleRoom({ roomId, hostId, hostName, ...payload });
        onSaved(roomId);
      }
      onClose();
    } catch (e: any) {
      const code = e?.message || '';
      if (code === 'entry_fee_required')              setError('Entry fee is required.');
      else if (code === 'prize_description_required') setError('Prize description is required.');
      else if (code === 'room_not_editable')          setError('This room can only be edited while scheduled.');
      else setError(e?.message || `Failed to ${isEditMode ? 'update' : 'schedule'} elimination. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #e9574f', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(233,87,79,0.10)', color: '#e9574f' }}>
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                {isEditMode ? 'Edit Elimination' : 'Schedule Elimination'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                {event?.title || (isEditMode ? 'Edit game details' : 'New elimination game')}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Event date info bar */}
        <div className="px-6 py-2.5 flex-shrink-0"
          style={{ background: 'rgba(233,87,79,0.04)', borderBottom: '1px solid #dce1df' }}>
          <p className="text-xs" style={{ color: '#52636f' }}>
            <span className="font-semibold" style={{ color: '#102532' }}>Event date: </span>
            {scheduledAt
              ? new Date(scheduledAt).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })
              : 'No date set on event'}
            {' '}· {timeZone}
          </p>
        </div>

        {/* Body — the shared step */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>
          {error && <ErrorBanner message={error} />}
          <EliminationActivityStep
            value={config}
            onChange={setConfig}
            draftEvent={draftEvent}
            disabled={loading}
            errors={fieldErrors}
            currency={currency}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <button type="button" onClick={onClose} disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: '#dce1df', color: '#52636f' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#e9574f' }}>
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {isEditMode ? 'Saving…' : 'Scheduling…'}
              </>
            ) : isEditMode ? (
              <><Save className="h-3.5 w-3.5" /> Save changes</>
            ) : (
              <><Trophy className="h-3.5 w-3.5" /> Schedule Elimination</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}