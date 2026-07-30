// src/components/mgtsystem/wizard/CreateFundraiserWizard.tsx
//
// The single-flow replacement for "Create Event → find card → Add
// Activity → Schedule modal". Three steps:
//
//   1. Type   - pick the activity (registry cards)
//   2. Event  - event details, shaped by the chosen type
//   3. Setup  - the activity's own config (extracted modal body)
//
// KEY BEHAVIOURS
//   • Nothing is saved to the server until the final Create - steps 1–3
//     are pure client state, autosaved to localStorage on every change
//     via useWizardStore. Refresh/crash/connection loss → resume banner.
//   • The final Create runs submitChain (createEvent → createRoom →
//     link) with persisted progress markers, so a mid-chain failure gets
//     a Retry that re-runs only the missing calls. Backend untouched.
//   • Closing mid-way shows a light "progress is saved on this device"
//     confirm with Keep/Discard - never a scary data-loss warning,
//     because there is no data loss.
//   • Legacy path: pass `existingEvent` (from an old activity-less event
//     card's Add Activity menu) and the wizard skips step 2 entirely -
//     the event already exists, so the chain treats its id as phase-1
//     complete and only creates + links the room.
//   • CREDIT CHECK (new): the moment a type is picked in step 0, its
//     entitlements are fetched (useEntitlements - same hook/cache the
//     rest of the app already uses) and checked BEFORE the user is
//     allowed to advance to steps 2–3. This surfaces "no credits" right
//     away instead of after filling in the whole form. The server-side
//     402 in runSubmitChain (via friendlyError) remains as a safety net
//     for the rare case credits changed between step 0 and final submit
//     (e.g. another admin at the same club used the last credit).

import { useEffect, useMemo, useState } from 'react';
import { X, Calendar, ChevronLeft, RotateCcw, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../features/auth';
import { currencySymbol } from '../shared/CurrencySelect';
import { utcToLocalInput } from '../../../utils/dateUtils';
import { ErrorBanner } from '../shared/ui';
import type { Event, EventValidationErrors } from '../types/event';

import { getActivityDef, type ActivityTypeId } from './activityRegistry';
import { useWizardStore, hasResumableDraft, draftLabel, emptyEventFields } from './useWizardStore';
import { runSubmitChain, buildDraftEvent, SubmitChainError, PHASE_LABEL, type SubmitPhase } from './submitChain';
import { useEntitlements, hasCreditsFor, creditStatusLabel } from '../../Quiz/hooks/useEntitlements';
import TypeStep from './steps/TypeStep';
import EventDetailsStep, { validateEventFields } from './steps/EventDetailsStep';

interface Campaign { id: string; name: string; }

interface Props {
  clubId:    string;
  onClose:   () => void;
  /** Fires after the full chain succeeds - caller reloads events. */
  onDone:    (eventId: string, roomId: string) => void;
  campaigns?: Campaign[];
  /** Legacy Add-Activity path: the event already exists. */
  existingEvent?: Event | null;
  /** Pre-select a type (e.g. from the Add Activity dropdown). */
  initialType?: ActivityTypeId;
}

// Activity-service error codes → friendly copy. The per-modal mappings
// that existed in each Schedule modal are folded together here.
function friendlyError(e: unknown): string {
  const code = e instanceof Error ? e.message : String(e);
  if (code === 'entry_fee_required')              return 'Entry fee is required.';
  if (code === 'prize_description_required')      return 'Prize description is required.';
  if (code === 'no_credits')                      return "You've used your available activity credits for this plan. Upgrade to run more.";
  if (code === 'weeks_cap_exceeded')              return 'Your plan has a shorter maximum challenge length. Reduce the number of weeks or upgrade.';
  if (code === 'challenge_created_room_missing')  return 'The challenge was created, but its room failed to set up - it cannot be linked yet. Contact support to retry.';
  if (code.includes('402') || code.includes('no_credits')) return 'You have no credits remaining.';
  if (code.includes('403'))                       return 'Your plan does not allow this configuration.';
  return code || 'Something went wrong. Please try again.';
}

export default function CreateFundraiserWizard({
  clubId, onClose, onDone, campaigns = [], existingEvent = null, initialType,
}: Props) {
  const isInjected = !!existingEvent;

  const {
    step, activityType, eventFields, activityConfigs, progress, injectedEventId,
    begin, setStep, setActivityType, updateEventFields, setActivityConfig,
    setProgress, setInjectedEventId, resetWizard,
  } = useWizardStore();

  const user = useAuthStore((s: any) => s.user);
  const club = useAuthStore((s: any) => s.club);
  const ctx = useMemo(() => ({
    hostId:   user?.id || user?.user_id || user?.club_user_id || '',
    hostName: user?.name || user?.full_name || user?.first_name || '',
    currency: club?.reporting_currency ?? 'EUR',
  }), [user, club]);
  const sym = currencySymbol(ctx.currency);

  // Evaluated BEFORE begin() touches the store - decides the resume banner.
  const [resumePrompt, setResumePrompt] = useState(() => !isInjected && hasResumableDraft(clubId));
  const [resumeLabel]                   = useState(() => draftLabel());
  const [confirmClose, setConfirmClose] = useState(false);

  const [eventErrors, setEventErrors]       = useState<EventValidationErrors>({});
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting]         = useState(false);
  const [phase, setPhase]                   = useState<SubmitPhase | null>(null);
  const [error, setError]                   = useState<string | null>(null);

  // ── Mount: bind to club / seed injected mode ────────────────────────────
  useEffect(() => {
    begin(clubId);
    if (isInjected && existingEvent) {
      // The event already exists: adopt it as the wizard's event, skip
      // step 2, and mark phase 1 as done for the submit chain.
      resetWizard(clubId);
      setInjectedEventId(existingEvent.id);
      updateEventFields({
        title:          existingEvent.title,
        summary:        existingEvent.summary || '',
        description:    existingEvent.description || '',
        campaign_id:    existingEvent.campaign_id || '',
        start_datetime: existingEvent.start_datetime
          ? utcToLocalInput(existingEvent.start_datetime, existingEvent.time_zone || eventFields.time_zone)
          : (existingEvent.event_date ? `${existingEvent.event_date.slice(0, 10)}T19:00` : ''),
        time_zone:      existingEvent.time_zone || eventFields.time_zone,
        location_type:  existingEvent.location_type || 'in_person',
        location_label: existingEvent.location_label || '',
        online_url:     existingEvent.online_url || '',
        goal_amount:    existingEvent.goal_amount || '',
      });
      if (initialType) {
        setActivityType(initialType);
        setStep(2);
      } else {
        setStep(0);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const def       = activityType ? getActivityDef(activityType) : null;
  const config    = def ? (activityConfigs[def.id] ?? def.defaultConfig()) : null;
  const draftEvent = buildDraftEvent(eventFields);

  // ── Credit check for the selected activity ──────────────────────────────
  // Fires as soon as a type is chosen. FREE plans are siloed per activity
  // type (see entitlements.js's credit_key logic) so a club can easily
  // have credits for one type and none for another - this needs to be
  // checked per-type, every time the selection changes, not just once.
  const {
    ents: selectedEnts,
    loading: entsLoading,
  } = useEntitlements((activityType ?? 'quiz') as any);

  const noCredits =
    !isInjected &&
    activityType !== null &&
    !entsLoading &&
    !hasCreditsFor(selectedEnts);

  // ── Navigation ──────────────────────────────────────────────────────────
  const stepsMeta = isInjected
    ? [{ id: 0 as const, label: 'Type' }, { id: 2 as const, label: 'Setup' }]
    : [{ id: 0 as const, label: 'Type' }, { id: 1 as const, label: 'Event' }, { id: 2 as const, label: 'Setup' }];

  const goBack = () => {
    setError(null);
    if (step === 2) setStep(isInjected ? 0 : 1);
    else if (step === 1) setStep(0);
  };

  const goContinue = () => {
    setError(null);
    if (step === 0) {
      if (!def || !def.available) return;
      if (noCredits) return; // blocked - inline banner explains why
      // Seed this type's config the first time it's chosen.
      if (!activityConfigs[def.id]) setActivityConfig(def.id, def.defaultConfig());
      setStep(isInjected ? 2 : 1);
    } else if (step === 1 && def) {
      const errs = validateEventFields(eventFields, def);
      setEventErrors(errs);
      if (Object.keys(errs).length === 0) setStep(2);
    }
  };

  // ── Final submit ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!def || config == null) return;
    setError(null);

    const errs = def.validate(config);
    setActivityErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitting(true);
    try {
      const { eventId, roomId } = await runSubmitChain({
        clubId, def, eventFields, config, ctx,
        progress,
        injectedEventId,
        onProgress: setProgress,   // persisted markers → resumable retries
        onPhase:    setPhase,
      });
      resetWizard(clubId);         // full success - clear the local draft
      onDone(eventId, roomId);
      onClose();
    } catch (e) {
      const p = e instanceof SubmitChainError ? e.phase : null;
      setError(
        p === 'creating_event' ? `Couldn't create the event: ${friendlyError(e)}`
        : p === 'creating_room' ? `Event saved, but the activity couldn't be set up: ${friendlyError(e)}`
        : p === 'linking'       ? `Everything was created but linking failed: ${friendlyError(e)}`
        : friendlyError(e),
      );
    } finally {
      setSubmitting(false);
      setPhase(null);
    }
  };

  // ── Close handling ──────────────────────────────────────────────────────
  const meaningfulDraft = activityType !== null || eventFields.title.trim() !== '';
  const requestClose = () => {
    if (submitting) return;
    if (!isInjected && meaningfulDraft) setConfirmClose(true);
    else onClose();
  };

  const eventDateDisplay = draftEvent.start_datetime
    ? new Date(draftEvent.start_datetime).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : 'No date set';

  const StepBody = def?.Step;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '92vh' }}>

        {/* ── Header + stepper ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #157f85', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                {isInjected ? `Add activity to "${existingEvent!.title}"` : 'Create Fundraiser'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                Progress is autosaved on this device - nothing is saved online until the final step
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {stepsMeta.map((s, i) => {
                const isActive = s.id === step;
                const isDone   = stepsMeta.findIndex(m => m.id === step) > i;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    {i > 0 && <div className="h-px w-4" style={{ background: '#dce1df' }} />}
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
                        style={isActive || isDone
                          ? { background: '#157f85', color: '#ffffff' }
                          : { background: '#f1f0ee', color: '#8a9bab' }}>
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold"
                        style={{ color: isActive ? '#102532' : '#8a9bab' }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={requestClose} disabled={submitting}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100 disabled:opacity-40"
              style={{ color: '#8a9bab' }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Step-3 event context strip (read-only - entered once at step 2) ── */}
        {step === 2 && (
          <div className="px-6 py-2.5 flex-shrink-0"
            style={{ background: 'rgba(21,127,133,0.05)', borderBottom: '1px solid #dce1df' }}>
            <p className="text-xs" style={{ color: '#52636f' }}>
              <span className="font-semibold" style={{ color: '#102532' }}>{draftEvent.title || 'Untitled event'}</span>
              {' '}· {eventDateDisplay} · {draftEvent.time_zone}
              {def?.dateMode === 'startPlusWeeks' ? <> · {eventFields.weeks} week{eventFields.weeks !== 1 ? 's' : ''}</> : null}
              {def?.showLocation && eventFields.location_label ? <> · {eventFields.location_label}</> : null}
            </p>
          </div>
        )}

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>

          {resumePrompt && (
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              style={{ background: 'rgba(21,127,133,0.06)', borderColor: '#b8d8da' }}>
              <p className="text-sm" style={{ color: '#0f5a5e' }}>
                Picking up {resumeLabel} where you left off.
              </p>
              <button type="button"
                onClick={() => { resetWizard(clubId); setResumePrompt(false); }}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                style={{ borderColor: '#b8d8da', color: '#157f85' }}>
                <RotateCcw className="h-3 w-3" /> Start fresh
              </button>
            </div>
          )}

          {error && (
            <ErrorBanner message={error}>
              <button type="button" onClick={handleCreate}
                className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                style={{ borderColor: '#fca5a5', color: '#dc2626' }}>
                Retry - already-completed steps won't run again
              </button>
            </ErrorBanner>
          )}

          {step === 0 && (
            <>
              <TypeStep
                selected={activityType}
                onSelect={t => { setActivityType(t); setResumePrompt(false); }}
                disabled={submitting}
              />

              {activityType && entsLoading && (
                <p className="text-xs" style={{ color: '#8a9bab' }}>
                  Checking your plan credits…
                </p>
              )}

              {activityType && !entsLoading && noCredits && (
                <div className="flex items-start gap-3 rounded-lg border px-4 py-3"
                  style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#dc2626' }}>
                      {creditStatusLabel(selectedEnts, activityType as any)
                        || "You've used your available credits for this activity type."}
                    </p>
                    <p className="mt-1 text-xs" style={{ color: '#991b1b' }}>
                      Upgrade your plan to create another one, or choose a different activity type.
                    </p>
                    <a href="/settings/billing"
                      className="mt-2 inline-block text-xs font-semibold underline"
                      style={{ color: '#dc2626' }}>
                      Go to billing
                    </a>
                  </div>
                </div>
              )}
            </>
          )}

          {step === 1 && def && (
            <EventDetailsStep
              def={def}
              fields={eventFields}
              onChange={patch => { updateEventFields(patch); setResumePrompt(false); }}
              errors={eventErrors}
              campaigns={campaigns}
              disabled={submitting}
              currencySym={sym}
            />
          )}

          {step === 2 && def && StepBody && config != null && (
            <StepBody
              value={config}
              onChange={(next: unknown) => setActivityConfig(def.id, next)}
              draftEvent={draftEvent}
              disabled={submitting}
              errors={activityErrors}
              currency={ctx.currency}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <div>
            {step !== 0 && (
              <button type="button" onClick={goBack} disabled={submitting}
                className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
                style={{ borderColor: '#dce1df', color: '#52636f' }}>
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={requestClose} disabled={submitting}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: '#dce1df', color: '#52636f' }}>
              Cancel
            </button>
            {step !== 2 ? (
              <button type="button" onClick={goContinue}
                disabled={submitting || (step === 0 && (!def || !def.available || entsLoading || noCredits))}
                className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#157f85' }}>
                Continue
              </button>
            ) : (
              <button type="button" onClick={handleCreate} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: def?.accent || '#157f85' }}>
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    {phase ? PHASE_LABEL[phase] : 'Creating…'}
                  </>
                ) : (
                  isInjected ? `Add ${def?.label ?? 'Activity'}` : 'Create Fundraiser'
                )}
              </button>
            )}
          </div>
        </div>

        {/* ── Close confirm - friendly because nothing is lost ── */}
        {confirmClose && (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6"
            style={{ background: 'rgba(16,37,50,0.35)' }}>
            <div className="w-full max-w-sm rounded-xl p-5 shadow-xl" style={{ background: '#ffffff' }}>
              <h3 className="text-sm font-bold" style={{ color: '#102532' }}>Close for now?</h3>
              <p className="mt-1.5 text-xs" style={{ color: '#52636f' }}>
                Your progress is saved on this device - you can pick up exactly where you left off next time.
              </p>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button type="button"
                  onClick={() => { resetWizard(clubId); setConfirmClose(false); onClose(); }}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50"
                  style={{ borderColor: '#dce1df', color: '#e9574f' }}>
                  Discard draft
                </button>
                <button type="button"
                  onClick={() => { setConfirmClose(false); onClose(); }}
                  className="rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ background: '#157f85' }}>
                  Keep & close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}