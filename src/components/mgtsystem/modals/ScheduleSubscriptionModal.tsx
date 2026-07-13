// src/components/mgtsystem/modals/ScheduleSubscriptionModal.tsx
//
// Now a THIN WRAPPER around SubscriptionActivityStep (the extracted body
// shared with CreateFundraiserWizard's step 3, rendered here with
// editMode so the challenge-level fields — title, starts, weeks, and the
// per-week schedule pickers — come back). Same Props contract as before;
// supports BOTH modes during the wizard rollout:
//
//   • edit mode  (existingRoomId set) — its long-term job: fetches the
//     challenge linked to that room, edits in place via updateChallenge.
//     Only works while the challenge is a draft — once Stripe's
//     Product/Price exist and subscribers are billing against this
//     schedule, changing weeks/price/schedule would shift what
//     already-paying subscribers agreed to. The backend enforces this
//     (updateChallenge throws 'challenge_not_editable'); this modal also
//     locks its own fields defensively.
//   • create mode (no existingRoomId) — legacy path kept working until
//     the dashboard's Add Activity is fully rewired to the wizard;
//     createChallenge + onSaved(room_id) so handleActivitySaved can
//     link, identical to the previous behaviour.
//
// The create call goes to the puzzles module's own challengeService
// (POST /api/puzzle-challenges) — event-agnostic; it creates the
// challenge row AND its linked room, and we hand room_id to onSaved().

import { useEffect, useState } from 'react';
import { X, Puzzle, Save, Lock } from 'lucide-react';
import { useAuthStore } from '../../../features/auth';
import { challengeService, type Challenge, type Currency } from '../../puzzles/services/ChallengeService';
import type { Event } from '../types/event';
import { ErrorBanner } from '../shared/ui';
import type { DraftEvent } from '../wizard/activityRegistry';
import SubscriptionActivityStep, {
  type SubscriptionConfig,
  defaultSubscriptionConfig,
} from '../wizard/steps/activities/SubscriptionActivityStep';

interface Props {
  onClose: () => void;
  onSaved: (roomId?: string) => void;
  event: Event;
  // If provided, the modal loads the challenge already linked to this
  // room and edits it in place instead of creating a new one.
  existingRoomId?: string;
}

export default function ScheduleSubscriptionModal({ onClose, onSaved, event, existingRoomId }: Props) {
  const club            = useAuthStore((s: any) => s.club);
  const clubCurrencyISO: string = club?.reporting_currency ?? 'EUR';

  const isEditMode = !!existingRoomId;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [existingChallenge, setExistingChallenge] = useState<Challenge | null>(null);
  const [loadingExisting, setLoadingExisting]     = useState(isEditMode);
  const [loadError, setLoadError]                 = useState<string | null>(null);

  // Prefill title/start date from the event — dates belong to the event,
  // not re-entered here. (In create mode the wizard is the primary path;
  // this keeps the legacy path behaving as before.)
  const [config, setConfig] = useState<SubscriptionConfig>(() => ({
    ...defaultSubscriptionConfig(),
    title:    event.title || '',
    startsAt: (event.start_datetime || event.event_date || new Date().toISOString()).slice(0, 10),
  }));

  // ── Load + seed from the existing challenge in edit mode ───────────────────
  useEffect(() => {
    if (!isEditMode || !existingRoomId) return;

    let cancelled = false;
    setLoadingExisting(true);
    setLoadError(null);

    challengeService.getChallengeByRoomId(existingRoomId)
      .then(challenge => {
        if (cancelled) return;
        if (!challenge) {
          setLoadError('Could not find the challenge linked to this room.');
          return;
        }
        setExistingChallenge(challenge);
        setConfig(prev => ({
          ...prev,
          title:       challenge.title,
          description: challenge.description ?? '',
          totalWeeks:  challenge.total_weeks,
          startsAt:    challenge.starts_at.slice(0, 10),
          isFree:      Number(challenge.is_free) === 1,
          priceInput:  challenge.weekly_price ? (challenge.weekly_price / 100).toFixed(2) : '',
          sponsors:    challenge.sponsors ?? [],
          schedule:    challenge.schedule?.length
            ? challenge.schedule.map(row => ({
                week:       row.week_number,
                puzzleType: row.puzzle_type,
                difficulty: row.difficulty,
              }))
            : prev.schedule,
        }));
      })
      .catch(e => { if (!cancelled) setLoadError(e?.message || 'Failed to load challenge'); })
      .finally(() => { if (!cancelled) setLoadingExisting(false); });

    return () => { cancelled = true; };
  }, [isEditMode, existingRoomId]);

  // Once a challenge has left draft, editing is blocked — Stripe's
  // Product/Price and subscribers' own billing already depend on this
  // schedule not shifting. Backend enforces this too; defensive UI lock.
  const isLocked = isEditMode && !!existingChallenge && existingChallenge.status !== 'draft';

  // Edit-mode validation includes the title (the wizard validates the
  // event title at step 2 instead; the shared validate covers pricing).
  const validate = (): string | null => {
    if (!config.title.trim()) return 'Title is required';
    const parsedPrice = parseFloat(config.priceInput);
    if (!config.isFree && (isNaN(parsedPrice) || parsedPrice <= 0)) {
      return 'Enter a valid weekly price, or mark this challenge as free';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (isLocked) return;
    setError(null);
    const err = validate();
    if (err) { setFieldErrors({ form: err }); return; }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const parsedPrice   = parseFloat(config.priceInput);
      const weeklyPrice   = config.isFree ? undefined : Math.round(parsedPrice * 100); // cents/pence
      const currencyValue = config.isFree ? undefined : (clubCurrencyISO.toLowerCase() as Currency);

      const payload = {
        title: config.title.trim(),
        description: config.description.trim() || undefined,
        totalWeeks: config.totalWeeks,
        startsAt: new Date(config.startsAt).toISOString(),
        // Create mode: omit the schedule — the backend auto-generates one.
        // Edit mode: send the schedule as shown, since the club may have
        // tweaked individual weeks while the challenge is a draft.
        puzzleSchedule: isEditMode ? config.schedule : undefined,
        isFree: config.isFree,
        weeklyPrice,
        currency: currencyValue,
        sponsors: config.sponsors
          .filter(s => s.name.trim())
          .map(s => ({ name: s.name.trim(), role: s.role?.trim() || undefined })),
      };

      if (isEditMode && existingChallenge) {
        await challengeService.updateChallenge(existingChallenge.id, payload);
        onSaved(existingChallenge.room_id ?? undefined);
        onClose();
        return;
      }

      const challenge = await challengeService.createChallenge(payload);

      // room_id is created server-side alongside the challenge (non-fatal —
      // see challengeService.createChallenge). If it's missing, the room
      // failed to create; the challenge still exists but won't link to
      // this event or show on the dashboard until retried.
      if (!challenge.room_id) {
        setError(
          'Challenge created, but the linked room failed to set up — it will not appear on the dashboard yet. Contact support to retry linking.'
        );
        setSubmitting(false);
        return;
      }

      onSaved(challenge.room_id);
      onClose();
    } catch (e: any) {
      if (e?.message === 'no_credits') {
        setError("You've used your available Puzzle Challenge credits for this plan. Upgrade to run more.");
      } else if (e?.message === 'weeks_cap_exceeded') {
        setError('Your plan has a shorter maximum challenge length. Reduce the number of weeks or upgrade.');
      } else if (e?.message === 'challenge_not_editable') {
        setError('This challenge has already been activated and can no longer be edited.');
      } else {
        setError(e?.message || `Failed to ${isEditMode ? 'update' : 'create'} challenge. Please try again.`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const draftEvent: DraftEvent = {
    title:          event.title,
    summary:        event.summary ?? null,
    start_datetime: event.start_datetime ?? null,
    event_date:     event.event_date ?? '',
    time_zone:      event.time_zone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    location_label: event.location_label ?? null,
    weeks:          config.totalWeeks,
    goal_amount:    event.goal_amount ?? 0,
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #7c3aed', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
              <Puzzle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                {isEditMode ? 'Edit Puzzle Subscription' : 'Add Puzzle Subscription'}
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

        {loadingExisting ? (
          <div className="flex items-center justify-center p-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
          </div>
        ) : loadError ? (
          <div className="p-6">
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{loadError}</div>
          </div>
        ) : (
        <>

        {/* ── Scrollable content — the shared step ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4"
          style={{ background: '#fbf8f2' }}>

          {isLocked && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
              <p className="text-xs text-amber-900">
                This challenge is {existingChallenge?.status} and can no longer be edited — Stripe billing and the
                weekly schedule are already locked in for subscribers.
              </p>
            </div>
          )}

          {error && <ErrorBanner message={error} />}

          <fieldset disabled={isLocked || submitting} className="space-y-4 border-0 p-0 m-0">
            <SubscriptionActivityStep
              editMode
              value={config}
              onChange={setConfig}
              draftEvent={draftEvent}
              disabled={isLocked || submitting}
              errors={fieldErrors}
              currency={clubCurrencyISO}
            />
          </fieldset>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <p className="text-xs" style={{ color: '#8a9bab' }}>
            {isLocked ? '' : isEditMode ? '' : 'Uses one activity credit'}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: '#dce1df', color: '#52636f' }}>
              {isLocked ? 'Close' : 'Cancel'}
            </button>
            {!isLocked && (
              <button type="button" onClick={handleSubmit} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#7c3aed' }}>
                {submitting
                  ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />{isEditMode ? 'Saving…' : 'Creating…'}</>
                  : <><Save className="h-3.5 w-3.5" />{isEditMode ? 'Save Changes' : 'Create Challenge'}</>}
              </button>
            )}
          </div>
        </div>
        </>
        )}

      </div>
    </div>
  );
}