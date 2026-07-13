// src/components/mgtsystem/modals/ScheduleQuizModal.tsx
//
// Now a THIN WRAPPER around QuizActivityStep (the extracted body shared
// with CreateFundraiserWizard's step 3). Same Props contract as before;
// supports BOTH modes during the wizard rollout:
//
//   • edit mode  (existingRoom set)  — pre-fills the quiz store from the
//     room's config_json, submit PATCHes via quizApi.updateWeb2Room.
//   • create mode (no existingRoom) — legacy path kept working; submit
//     POSTs via roomApi.createRoom + onSaved(roomId) so
//     handleActivitySaved can link, identical to previous behaviour.
//
// The modal keeps the old hardReset-on-mount (right for a modal — every
// open is a fresh session), then seeds the quiz store itself and renders
// the step with editMode so the step's own seeding/date-sync (which is
// wizard-specific) stays out of the way.
//
// Payment methods are set here too — kept as a SEPARATE top-level
// concern from config_json. Unlike entry fee / prizes / extras (which
// all live inside config_json), payment methods are their own flat room
// column (linked_payment_methods_json), validated and written via
// QuizPaymentMethodsService — folding them into config_json would bypass
// that validation and the room→event sync that depends on reading that
// column directly.

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import { roomApi, quizApi } from '@/shared/api';
import { useAuthStore } from '../../../features/auth';
import { currencySymbol } from '../shared/CurrencySelect';
import type { Event } from '../types/event';
import type { Web2RoomListItem as Room } from '../../../shared/api/quiz.api';
import { utcToLocalInput, detectTimezone } from '../../../utils/dateUtils';
import { ErrorBanner } from '../shared/ui';
import type { DraftEvent } from '../wizard/activityRegistry';
import QuizActivityStep, {
  type QuizWizardConfig,
  validateQuizConfig,
} from '../wizard/steps/activities/QuizActivityStep';

interface Props {
  onClose: () => void;
  onSaved: (roomId?: string) => void;
  event: Event;
  existingRoom?: Room | null; // if present = edit mode
}

export default function ScheduleQuizModal({ onClose, onSaved, event, existingRoom }: Props) {
  const isEditMode = !!existingRoom;

  const { hardReset, updateSetupConfig } = useQuizSetupStore();

  const club            = useAuthStore((s: any) => s.club);
  const clubCurrencyISO = club?.reporting_currency ?? 'EUR';
  const clubCurrencySym = currencySymbol(clubCurrencyISO);

  // ── Payment methods ────────────────────────────────────────────────────────
  // Hydrated from the room's own linked_payment_methods_json on edit — NOT
  // from the event. Held in the step's config (seeded: true tells the step
  // the wrapper owns store seeding).
  const [config, setConfig] = useState<QuizWizardConfig>(() => {
    const rawLinked = existingRoom?.linked_payment_methods_json;
    const parsed = typeof rawLinked === 'string'
      ? (() => { try { return JSON.parse(rawLinked); } catch { return null; } })()
      : (rawLinked ?? null);
    return {
      seeded: true,
      paymentMethods: {
        ticketMethodIds:  parsed?.ticket_method_ids  ?? [],
        onnightMethodIds: parsed?.onnight_method_ids ?? [],
      },
    };
  });

  // ── Seed store on mount (verbatim from the old modal) ─────────────────────
  useEffect(() => {
    if (isEditMode && existingRoom) {
      const cfg: any =
        typeof existingRoom.config_json === 'string'
          ? JSON.parse(existingRoom.config_json)
          : (existingRoom.config_json ?? {});

      hardReset({ flow: 'web2' });

      updateSetupConfig({
        fundraisingMode:    cfg.fundraisingMode    ?? 'fixed_fee',
        entryFee:           cfg.entryFee           ?? '',
        fundraisingOptions: cfg.fundraisingOptions ?? {},
        fundraisingPrices:  cfg.fundraisingPrices  ?? {},
        selectedTemplate:   cfg.selectedTemplate   ?? '',
        roundDefinitions:   cfg.roundDefinitions   ?? [],
        skipRoundConfiguration: true,
        prizes:             cfg.prizes             ?? [],
        currencySymbol:     clubCurrencySym,
        eventDateTime:      cfg.eventDateTime      ?? null,
        timeZone:           cfg.timeZone           ?? detectTimezone(),
      } as any);

    } else {
      hardReset({ flow: 'web2' });

      const tz = event.time_zone || detectTimezone();
      const dt = event.start_datetime
        ? utcToLocalInput(event.start_datetime, tz)
        : event.event_date
        ? `${event.event_date}T19:00`
        : null;

      updateSetupConfig({ currencySymbol: clubCurrencySym } as any);

      if (dt) {
        updateSetupConfig({ timeZone: tz } as any);
        useQuizSetupStore.setState(s => ({
          setupConfig: { ...s.setupConfig, timeZone: tz, eventDateTime: dt } as any,
        }));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [entitlements, setEntitlements] = useState<any>(null);

  useEffect(() => {
    quizApi.getEntitlements().then(setEntitlements).catch(() => setEntitlements(null));
  }, []);

  // ── Submit (verbatim from the old modal) ───────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    const errs = validateQuizConfig(config);
    setFieldErrors(errs);
    if (errs.form) return;
    setSubmitting(true);

    try {
      const setupConfig = useQuizSetupStore.getState().setupConfig;

      if (isEditMode && existingRoom) {
        const existingCfg: any =
          typeof existingRoom.config_json === 'string'
            ? JSON.parse(existingRoom.config_json)
            : (existingRoom.config_json ?? {});

        const updatedConfig = {
          ...existingCfg,
          fundraisingMode:    setupConfig.fundraisingMode,
          entryFee:           setupConfig.entryFee,
          fundraisingOptions: setupConfig.fundraisingOptions,
          fundraisingPrices:  setupConfig.fundraisingPrices,
          selectedTemplate:   setupConfig.selectedTemplate,
          roundDefinitions:   setupConfig.roundDefinitions,
          prizes:             setupConfig.prizes,
          currencySymbol:     clubCurrencySym,
        };

        // Payment methods sent as their OWN top-level fields, separate from
        // config_json. The backend PATCH /web2/rooms/:roomId route handles
        // these as a distinct write path (QuizPaymentMethodsService), not
        // a config_json merge.
        await quizApi.updateWeb2Room(existingRoom.room_id, {
          config_json:      updatedConfig,
          ticketMethodIds:  config.paymentMethods.ticketMethodIds,
          onnightMethodIds: config.paymentMethods.onnightMethodIds,
        } as any);

        onSaved(existingRoom.room_id);
        onClose();

      } else {
        const state = useQuizSetupStore.getState();
        const { generateRoomId, generateHostId } = await import('@/components/Quiz/utils/idUtils');
        const roomId = state.roomId || generateRoomId();
        const hostId = state.hostId || generateHostId();
        useQuizSetupStore.getState().setRoomIds(roomId, hostId);
        const data = await roomApi.createRoom({
          config: state.setupConfig,
          roomId,
          hostId,
          ticketMethodIds:  config.paymentMethods.ticketMethodIds,
          onnightMethodIds: config.paymentMethods.onnightMethodIds,
        } as any);
        const finalRoomId = useQuizSetupStore.getState().roomId || data?.roomId;
        onSaved(finalRoomId ?? undefined);
        onClose();
      }
    } catch (e: any) {
      if (e?.message?.includes('402') || e?.message?.includes('no_credits')) setError('You have no credits remaining.');
      else if (e?.message?.includes('403')) setError('Your plan does not allow this configuration.');
      else if (e?.message?.includes('409')) setError('This room can no longer be edited (it may have started).');
      else setError(e?.message || `Failed to ${isEditMode ? 'update' : 'schedule'} quiz. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const draftEvent: DraftEvent = {
    title:          event.title,
    summary:        event.summary ?? null,
    start_datetime: event.start_datetime ?? null,
    event_date:     event.event_date ?? '',
    time_zone:      event.time_zone || detectTimezone(),
    location_label: event.location_label ?? null,
    goal_amount:    event.goal_amount ?? 0,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '92vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #157f85', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                {isEditMode ? 'Edit Quiz Night' : 'Schedule Quiz Night'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>{event.title}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100 disabled:opacity-40"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — the shared step */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>
          {error && <ErrorBanner message={error} />}
          <QuizActivityStep
            editMode
            value={config}
            onChange={setConfig}
            draftEvent={draftEvent}
            disabled={submitting}
            errors={fieldErrors}
            currency={clubCurrencyISO}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <p className="text-xs" style={{ color: '#8a9bab' }}>
            {!isEditMode && entitlements
              ? `${entitlements.game_credits_remaining ?? 0} credits remaining`
              : isEditMode
              ? 'Editing will not use a credit'
              : ''}
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
                : <><Sparkles className="h-3.5 w-3.5" />{isEditMode ? 'Save Changes' : 'Schedule Quiz'}</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}