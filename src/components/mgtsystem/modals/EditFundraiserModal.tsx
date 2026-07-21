// src/components/mgtsystem/modals/EditFundraiserModal.tsx
//
// THE single edit surface — mirrors CreateFundraiserWizard on the way
// out: one modal that edits BOTH the event details (title/date/venue/
// goal) AND the linked activity's settings, saved together with one
// button. Opened from the drawer's Setup tab AND the event card's Edit —
// same surface, two doors.
//
// This SUPERSEDES: EditEventModal (event-only edit) and every edit-mode
// use of the four Schedule modals. Once the dashboard + SetupTab route
// here, all five of those files have no callers and can be deleted.
//
// SAVE SEMANTICS (same resumable pattern as the wizard's submit chain):
//   1. eventsService.updateEvent(...)        — skipped on retry if done
//   2. per-type activity update              — quizApi.updateWeb2Room /
//      eliminationMgmtService.updateRoom / ticketedEventMgmtService
//      .updateRoom / challengeService.updateChallenge
// A mid-save failure shows an error with Retry that re-runs only the
// step that failed. Date changes propagate INTO the activity in the
// same save: the ticketed room's scheduledAt/timeZone (this absorbs the
// date-sync that used to live in the dashboard's handleUpdateEvent),
// the elimination room's scheduledAt, and the quiz config's
// eventDateTime — closing the old gap where editing an event's date
// left the quiz config stale.
//
// PER-TYPE NOTES
//   quiz        — config lives in useQuizSetupStore; seeded here from
//                 the room's config_json (hardReset first, like the old
//                 modal). Payment methods stay outside config_json.
//   elimination — flat prizeDescription/prizeValue still sent via the
//                 spread-payload trick (backend migration compat).
//   ticketed    — sale deadlines converted with the EDITED timezone.
//   puzzle_sub  — challenge fetched by room_id; its section is editable
//                 only while status === 'draft' (Stripe billing locks
//                 it after activation); the EVENT stays editable either
//                 way. The challenge keeps its own title/starts/weeks.
//   puzzle_drop — items/pricing tiers/go-on-sale date/payment methods,
//                 editable ONLY while the Drop's room status is still
//                 'scheduled' (not yet on sale) — see updateDrop's
//                 backend comment for why wholesale item replacement is
//                 only safe before purchases can exist. Fetched via
//                 puzzleDropMgmtService.getDrop(room_id), same on-demand
//                 fetch pattern puzzle_sub's challenge uses.
//   no activity — legacy events: event section only.

import { useEffect, useState } from 'react';
import { Calendar, X, Save, Lock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../features/auth';
import { currencySymbol } from '../shared/CurrencySelect';
import { utcToLocalInput, detectTimezone } from '../../../utils/dateUtils';
import { ErrorBanner, SectionHeader } from '../shared/ui';
import eventsService from '../services/eventsServices';
import eliminationMgmtService from '../services/EliminationMgmtService';
import ticketedEventMgmtService from '../services/TicketedEventMgmtService';
import { quizApi } from '@/shared/api';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import { challengeService, type Challenge, type Currency } from '../../puzzles/services/ChallengeService';
import type { Event, UpdateEventForm, EventValidationErrors } from '../types/event';
import type { Web2RoomListItem as Room } from '../../../shared/api/quiz.api';

import { getActivityDefByEventType, type ActivityTypeDef, type DraftEvent } from '../wizard/activityRegistry';
import { emptyEventFields, type WizardEventFields } from '../wizard/useWizardStore';
import { localToUtc, utcToLocalInputTz } from '../wizard/tz';
import EventDetailsStep, { validateEventFields } from '../wizard/steps/EventDetailsStep';
import EliminationActivityStep, {
  type EliminationConfig, defaultEliminationConfig, validateEliminationConfig,
} from '../wizard/steps/activities/EliminationActivityStep';
import TicketedEventActivityStep, {
  type TicketedEventConfig, defaultTicketedEventConfig, validateTicketedEventConfig, slugify,
} from '../wizard/steps/activities/TicketedEventActivityStep';
import SubscriptionActivityStep, {
  type SubscriptionConfig, defaultSubscriptionConfig,
} from '../wizard/steps/activities/SubscriptionActivityStep';
import QuizActivityStep, {
  type QuizWizardConfig, validateQuizConfig,
} from '../wizard/steps/activities/QuizActivityStep';
import PuzzleDropActivityStep, {
  type PuzzleDropConfig, defaultPuzzleDropConfig, validatePuzzleDropConfig,
} from '../wizard/steps/activities/PuzzleDropActivityStep';
import puzzleDropMgmtService, { type DropDetail } from '../services/PuzzleDropMgmtService';

// ADDED 'puzzle_drop'. Note this is a LOCAL type alias, duplicated
// (under a different name, 'GameType' vs 'LinkedActivity') across at
// least three files now (QuizEventDashboard.tsx, FundraiselyEventCard.tsx,
// DashboardFundraisingSummary.tsx). Worth considering a single shared
// export — e.g. from activityRegistry.tsx, which already has
// ActivityTypeId as the canonical list — so adding a 6th activity type
// later doesn't require hunting down every duplicate union again.
type GameType = 'quiz' | 'elimination' | 'ticketed_event' | 'puzzle_sub' | 'puzzle_drop';

interface Campaign { id: string; name: string; }

interface Props {
  event:      Event;
  /** The linked activity, if any (from the dashboard's activityMap). */
  activity?:  { room_id: string; game_type: GameType } | null;
  /** The activity's room row (config_json etc.) — not needed for puzzle_sub. */
  room?:      Room | null;
  campaigns?: Campaign[];
  onClose:    () => void;
  /** Fires after everything saved — caller reloads events. */
  onSaved:    () => void | Promise<void>;
}

const GENERIC_SHAPE = {
  label: 'Event', showLocation: true, dateMode: 'datetime',
} as unknown as ActivityTypeDef<unknown>;

function localInputToUTC(local: string): string {
  return new Date(local).toISOString();
}

function parseLinkedPaymentMethods(raw: unknown) {
  const parsed = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw); } catch { return null; } })()
    : (raw ?? null);
  return {
    ticketMethodIds:  (parsed as any)?.ticket_method_ids  ?? [],
    onnightMethodIds: (parsed as any)?.onnight_method_ids ?? [],
  };
}

export default function EditFundraiserModal({
  event, activity = null, room = null, campaigns = [], onClose, onSaved,
}: Props) {
  const club     = useAuthStore((s: any) => s.club);
  const currency = club?.reporting_currency ?? 'EUR';
  const sym      = currencySymbol(currency);

  const gameType = activity?.game_type ?? null;
  const matched  = getActivityDefByEventType(event.type);
  const def: ActivityTypeDef<unknown> = matched
    ? { ...matched, dateMode: 'datetime' } // weeks/schedule are the challenge's own fields below
    : GENERIC_SHAPE;

  const tz = event.time_zone || detectTimezone();

  // ── Event fields (same seeding as the wizard's edit path) ────────────────
  const [fields, setFields] = useState<WizardEventFields>(() => ({
    ...emptyEventFields(tz),
    title:          event.title,
    summary:        event.summary || '',
    description:    event.description || '',
    campaign_id:    event.campaign_id || '',
    start_datetime: event.start_datetime
      ? utcToLocalInput(event.start_datetime, tz)
      : event.event_date ? `${event.event_date.slice(0, 10)}T19:00` : '',
    time_zone:      tz,
    location_type:  event.location_type || 'in_person',
    location_label: event.location_label || '',
    online_url:     event.online_url || '',
    goal_amount:    event.goal_amount || '',
  }));

  // Whether the activity's config is actually loadable/editable from what
  // we were handed. Quiz needs config_json for the merge-save; elim/
  // ticketed can parse defaults but saving defaults over a real config is
  // worse than saying so. puzzle_sub and puzzle_drop both fetch their own
  // detail on demand (room_id / challenge id is all that's needed up
  // front), so both are unconditionally true here — the fetch's own
  // loading/failure states are handled separately (subLoading/dropLoading
  // below), same pattern for both.
  const activityAvailable =
    !activity ? false
    : activity.game_type === 'puzzle_sub' ? true
    : activity.game_type === 'puzzle_drop' ? true
    : !!room?.config_json;

  // ── Per-type activity config ──────────────────────────────────────────────
  const [elimConfig, setElimConfig] = useState<EliminationConfig>(() => {
    if (gameType !== 'elimination' || !activityAvailable) return defaultEliminationConfig();
    const cfg   = eliminationMgmtService.parseConfig(room as any);
    const prize = cfg?.prizes?.find(p => p.place === 1) ?? null;
    return {
      ...defaultEliminationConfig(),
      entryFee:         cfg?.entryFee != null ? String(cfg.entryFee) : '',
      prizeDescription: prize?.description ?? '',
      prizeValue:       prize?.value != null ? String(prize.value) : '',
      prizeSponsor:     prize?.sponsor ?? '',
      paymentMethods:   parseLinkedPaymentMethods(room?.linked_payment_methods_json),
    };
  });

  const [ticketedConfig, setTicketedConfig] = useState<TicketedEventConfig>(() => {
    const base = defaultTicketedEventConfig();
    if (gameType !== 'ticketed_event' || !activityAvailable) return base;
    base.paymentMethods = parseLinkedPaymentMethods(room?.linked_payment_methods_json);
    const cfg = ticketedEventMgmtService.parseConfig(room as any);
    if (!cfg) return base;
    if (Array.isArray(cfg.ticketTypes) && cfg.ticketTypes.length > 0) {
      base.ticketTypes = cfg.ticketTypes.map(t => ({
        id:         t.id   || '',
        name:       t.name || '',
        price:      t.price != null ? String(t.price) : '',
        isEnabled:  t.isEnabled !== false,
        quantity:   (t.quantity != null && Number(t.quantity) > 0) ? String(t.quantity) : '',
        saleEndsAt: t.saleEndsAt ? utcToLocalInputTz(String(t.saleEndsAt), tz) : '',
      }));
    } else if (cfg.entryFee) {
      base.ticketTypes = [{
        id: 'general', name: 'General Admission', price: String(cfg.entryFee),
        isEnabled: true, quantity: '', saleEndsAt: '',
      }];
    }
    if (Array.isArray(cfg.prizes) && cfg.prizes.length > 0) base.prizes = cfg.prizes;
    if (Array.isArray(cfg.eventSponsors) && cfg.eventSponsors.length > 0) base.eventSponsors = cfg.eventSponsors;
    const cap = cfg.roomCaps?.venueCapacity ?? cfg.roomCaps?.maxPlayers ?? null;
    if (cap != null && Number(cap) > 0 && Number(cap) < 999999) base.venueCapacity = String(cap);
    return base;
  });

  const [quizConfig, setQuizConfig] = useState<QuizWizardConfig>(() => ({
    seeded: true, // this modal owns store seeding, like the old quiz modal
    paymentMethods: gameType === 'quiz'
      ? parseLinkedPaymentMethods(room?.linked_payment_methods_json)
      : { ticketMethodIds: [], onnightMethodIds: [] },
  }));

  // Quiz store seeding (verbatim from the old ScheduleQuizModal edit path)
  useEffect(() => {
    if (gameType !== 'quiz' || !activityAvailable || !room) return;
    const cfg: any =
      typeof room.config_json === 'string' ? JSON.parse(room.config_json) : (room.config_json ?? {});
    useQuizSetupStore.getState().hardReset({ flow: 'web2' });
    useQuizSetupStore.getState().updateSetupConfig({
      fundraisingMode:    cfg.fundraisingMode    ?? 'fixed_fee',
      entryFee:           cfg.entryFee           ?? '',
      fundraisingOptions: cfg.fundraisingOptions ?? {},
      fundraisingPrices:  cfg.fundraisingPrices  ?? {},
      selectedTemplate:   cfg.selectedTemplate   ?? '',
      roundDefinitions:   cfg.roundDefinitions   ?? [],
      skipRoundConfiguration: true,
      prizes:             cfg.prizes             ?? [],
      currencySymbol:     sym,
      eventDateTime:      cfg.eventDateTime      ?? null,
      timeZone:           cfg.timeZone           ?? detectTimezone(),
    } as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscription: fetch the challenge (it holds the editable config)
  const [subConfig, setSubConfig]   = useState<SubscriptionConfig>(defaultSubscriptionConfig);
  const [challenge, setChallenge]   = useState<Challenge | null>(null);
  const [subLoading, setSubLoading] = useState(gameType === 'puzzle_sub');
  useEffect(() => {
    if (gameType !== 'puzzle_sub' || !activity) return;
    let cancelled = false;
    challengeService.getChallengeByRoomId(activity.room_id)
      .then(ch => {
        if (cancelled || !ch) return;
        setChallenge(ch);
        setSubConfig(prev => ({
          ...prev,
          title:       ch.title,
          description: ch.description ?? '',
          totalWeeks:  ch.total_weeks,
          startsAt:    ch.starts_at.slice(0, 10),
          isFree:      Number(ch.is_free) === 1,
          priceInput:  ch.weekly_price ? (ch.weekly_price / 100).toFixed(2) : '',
          sponsors:    ch.sponsors ?? [],
          schedule:    ch.schedule?.length
            ? ch.schedule.map(r => ({ week: r.week_number, puzzleType: r.puzzle_type, difficulty: r.difficulty }))
            : prev.schedule,
        }));
      })
      .catch(() => { /* section shows unavailable notice */ })
      .finally(() => { if (!cancelled) setSubLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subLocked = gameType === 'puzzle_sub' && !!challenge && challenge.status !== 'draft';

  // Puzzle Drop: fetch the room+items+tiers detail (it holds the editable
  // config) — same on-demand fetch pattern as the subscription's
  // challenge above.
  const [dropConfig, setDropConfig] = useState<PuzzleDropConfig>(defaultPuzzleDropConfig);
  const [dropDetail, setDropDetail] = useState<DropDetail | null>(null);
  const [dropLoading, setDropLoading] = useState(gameType === 'puzzle_drop');
  useEffect(() => {
    if (gameType !== 'puzzle_drop' || !activity) return;
    let cancelled = false;
    puzzleDropMgmtService.getDrop(activity.room_id)
      .then(detail => {
        if (cancelled) return;
        setDropDetail(detail);
        setDropConfig({
          items: detail.items.length
            ? detail.items
                .slice()
                .sort((a, b) => a.display_order - b.display_order)
                .map(i => ({ puzzleType: i.puzzle_type, difficulty: i.difficulty as 'easy' | 'medium' | 'hard' }))
            : defaultPuzzleDropConfig().items,
          pricingTiers: detail.pricingTiers.length
            ? detail.pricingTiers
                .slice()
                .sort((a, b) => a.display_order - b.display_order)
                .map(t => ({ quantity: String(t.quantity), price: String(t.price), label: t.label ?? '' }))
            : defaultPuzzleDropConfig().pricingTiers,
          paymentMethods: parseLinkedPaymentMethods(detail.linkedPaymentMethods),
        });
      })
      .catch(() => { /* section shows unavailable notice, same as puzzle_sub's catch */ })
      .finally(() => { if (!cancelled) setDropLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Locked once the Drop has gone on sale — matches the backend's own
  // updateDrop guard (status must still be 'scheduled'). Same shape as
  // subLocked above; kept separate rather than merged since the two
  // activity types lock for different reasons (Stripe billing vs.
  // wholesale item replacement safety) and read from different state.
  const dropLocked = gameType === 'puzzle_drop' && !!dropDetail && dropDetail.status !== 'scheduled';

  // ── Save (resumable: event first, then activity) ──────────────────────────
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [eventErrors, setEventErrors]       = useState<EventValidationErrors>({});
  const [activityErrors, setActivityErrors] = useState<Record<string, string>>({});
  const [eventSaved, setEventSaved]         = useState(false);

  const draftEvent: DraftEvent = {
    title:          fields.title,
    summary:        fields.summary || null,
    start_datetime: fields.start_datetime ? localInputToUTC(fields.start_datetime) : null,
    event_date:     fields.start_datetime ? fields.start_datetime.slice(0, 10) : (event.event_date ?? ''),
    time_zone:      fields.time_zone,
    location_label: fields.location_label || null,
    weeks:          subConfig.totalWeeks,
    goal_amount:    Number(fields.goal_amount) || 0,
  };

  const handleSave = async () => {
    setError(null);

    // Validate both halves up front
    const eErrs = validateEventFields(fields, def, { allowPastDate: true });
    setEventErrors(eErrs);
    let aErrs: Record<string, string> = {};
    if (activityAvailable && !subLocked && !dropLocked) {
      if (gameType === 'elimination')     aErrs = validateEliminationConfig(elimConfig);
      if (gameType === 'ticketed_event')  aErrs = validateTicketedEventConfig(ticketedConfig);
      if (gameType === 'quiz')            aErrs = validateQuizConfig(quizConfig);
      if (gameType === 'puzzle_drop')     aErrs = validatePuzzleDropConfig(dropConfig);
      if (gameType === 'puzzle_sub' && challenge) {
        if (!subConfig.title.trim()) aErrs = { form: 'Challenge title is required' };
        else if (!subConfig.isFree) {
          const p = parseFloat(subConfig.priceInput);
          if (isNaN(p) || p <= 0) aErrs = { form: 'Enter a valid weekly price, or mark this challenge as free' };
        }
      }
    }
    setActivityErrors(aErrs);
    if (Object.keys(eErrs).length > 0 || Object.keys(aErrs).length > 0) return;

    setSubmitting(true);
    try {
      // ── 1. Event ──
      if (!eventSaved) {
        const data: UpdateEventForm = {
          title:               fields.title.trim(),
          type:                event.type,
          primary_action_type: event.primary_action_type,
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
        await eventsService.updateEvent(event.id, data);
        setEventSaved(true);
      }

      // ── 2. Activity ──
      if (activity && activityAvailable && !subLocked && !dropLocked) {
        const scheduledAtUTC = fields.start_datetime ? localInputToUTC(fields.start_datetime) : null;

        if (gameType === 'elimination') {
          const prizes = [{
            place: 1,
            value:       elimConfig.prizeValue ? Number(elimConfig.prizeValue) : null,
            description: elimConfig.prizeDescription.trim(),
            sponsor:     elimConfig.prizeSponsor.trim() || null,
          }];
          // Spread-payload: flat fields kept for backend migration compat
          const payload = {
            scheduledAt: scheduledAtUTC,
            timeZone:    fields.time_zone,
            entryFee:    Number(elimConfig.entryFee),
            currency,
            prizes,
            prizeDescription: elimConfig.prizeDescription.trim(),
            prizeValue:       elimConfig.prizeValue ? Number(elimConfig.prizeValue) : undefined,
            ticketMethodIds:  elimConfig.paymentMethods.ticketMethodIds,
            onnightMethodIds: elimConfig.paymentMethods.onnightMethodIds,
          };
          await eliminationMgmtService.updateRoom(activity.room_id, { ...payload });

        } else if (gameType === 'ticketed_event') {
          const validTicketTypes = ticketedConfig.ticketTypes
            .filter(t => t.name.trim() && t.price)
            .map(t => ({
              id:         t.id || slugify(t.name),
              name:       t.name.trim(),
              price:      t.price,
              isEnabled:  t.isEnabled,
              quantity:   t.quantity ? parseInt(t.quantity) : null,
              saleEndsAt: t.saleEndsAt ? localToUtc(t.saleEndsAt, fields.time_zone) : null,
            }));
          await ticketedEventMgmtService.updateRoom(activity.room_id, {
            entryFee:        validTicketTypes[0]?.price ?? null,
            fundraisingMode: 'fixed_fee',
            currency,
            currencySymbol:  sym,
            ticketTypes:     validTicketTypes,
            prizes:          ticketedConfig.prizes.filter(p => p.description.trim()),
            eventSponsors:   ticketedConfig.eventSponsors.filter(s => s.name.trim()),
            ticketMethodIds:  ticketedConfig.paymentMethods.ticketMethodIds,
            onnightMethodIds: ticketedConfig.paymentMethods.onnightMethodIds,
            // Absorbs the date-sync that used to live in the dashboard's
            // handleUpdateEvent — one save, everything consistent.
            scheduledAt: scheduledAtUTC,
            timeZone:    fields.time_zone,
          } as any);

        } else if (gameType === 'quiz' && room) {
          const existingCfg: any =
            typeof room.config_json === 'string' ? JSON.parse(room.config_json) : (room.config_json ?? {});
          const setupConfig = useQuizSetupStore.getState().setupConfig;
          const updatedConfig = {
            ...existingCfg,
            fundraisingMode:    setupConfig.fundraisingMode,
            entryFee:           setupConfig.entryFee,
            fundraisingOptions: setupConfig.fundraisingOptions,
            fundraisingPrices:  setupConfig.fundraisingPrices,
            selectedTemplate:   setupConfig.selectedTemplate,
            roundDefinitions:   setupConfig.roundDefinitions,
            prizes:             setupConfig.prizes,
            currencySymbol:     sym,
            // Keep the quiz's own clock in step with the edited event date
            // (previously editing the event left this stale).
            eventDateTime:      fields.start_datetime || existingCfg.eventDateTime,
            timeZone:           fields.time_zone,
          };
          await quizApi.updateWeb2Room(activity.room_id, {
            config_json:      updatedConfig,
            ticketMethodIds:  quizConfig.paymentMethods.ticketMethodIds,
            onnightMethodIds: quizConfig.paymentMethods.onnightMethodIds,
          } as any);

        } else if (gameType === 'puzzle_sub' && challenge) {
          const parsedPrice = parseFloat(subConfig.priceInput);
          await challengeService.updateChallenge(challenge.id, {
            title:          subConfig.title.trim(),
            description:    subConfig.description.trim() || undefined,
            totalWeeks:     subConfig.totalWeeks,
            startsAt:       new Date(subConfig.startsAt).toISOString(),
            puzzleSchedule: subConfig.schedule,
            isFree:         subConfig.isFree,
            weeklyPrice:    subConfig.isFree ? undefined : Math.round(parsedPrice * 100),
            currency:       subConfig.isFree ? undefined : (currency.toLowerCase() as Currency),
            sponsors:       subConfig.sponsors
              .filter(s => s.name.trim())
              .map(s => ({ name: s.name.trim(), role: s.role?.trim() || undefined })),
          });

        } else if (gameType === 'puzzle_drop' && dropDetail) {
          await puzzleDropMgmtService.updateDrop(activity.room_id, {
            scheduledAt: scheduledAtUTC,
            timeZone:    fields.time_zone,
            dropTitle:   fields.title.trim(),
            items: dropConfig.items.map(i => ({
              puzzleType: i.puzzleType,
              difficulty: i.difficulty,
            })),
            pricingTiers: dropConfig.pricingTiers.map(t => ({
              quantity: parseInt(t.quantity, 10),
              price:    parseFloat(t.price),
              label:    t.label.trim() || undefined,
            })),
            onnightMethodIds: dropConfig.paymentMethods.onnightMethodIds,
          });
        }
      }

      await onSaved();
      onClose();
    } catch (e: any) {
      const code = String(e?.message || '');
      const activityPhase = eventSaved;
      if (code === 'challenge_not_editable') setError('This challenge has already been activated and can no longer be edited.');
      else if (code === 'room_not_editable' || code.includes('409')) setError('The activity can no longer be edited — it may have already started. Your event details were saved.');
      else if (code === 'entry_fee_required') setError('Entry fee is required.');
      else if (code === 'prize_description_required') setError('Prize description is required.');
      else setError(
        activityPhase
          ? `Event details saved, but the activity update failed: ${code || 'unknown error'}. Retry will only re-run the activity save.`
          : code || 'Failed to save. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const label = matched?.label ?? (event.type || 'Activity');

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '92vh' }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `3px solid ${matched?.accent ?? '#157f85'}`, background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>Edit Fundraiser</h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                {event.title}{activity ? ` · ${label}` : ''} — event and activity settings, saved together
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={submitting}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100 disabled:opacity-40"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>

          {error && (
            <ErrorBanner message={error}>
              <button type="button" onClick={handleSave}
                className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                style={{ borderColor: '#fca5a5', color: '#dc2626' }}>
                Retry
              </button>
            </ErrorBanner>
          )}

          {/* ── Event details ── */}
          <p className="text-xs font-bold uppercase tracking-wide px-1" style={{ color: '#52636f' }}>
            Event details
          </p>
          <EventDetailsStep
            def={def}
            fields={fields}
            onChange={patch => setFields(prev => ({ ...prev, ...patch }))}
            errors={eventErrors}
            campaigns={campaigns}
            disabled={submitting}
            currencySym={sym}
          />

          {/* ── Activity setup ── */}
          {activity && (
            <>
              <p className="text-xs font-bold uppercase tracking-wide px-1 pt-2" style={{ color: '#52636f' }}>
                {label} setup
              </p>

              {!activityAvailable ? (
                <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
                  style={{ background: '#fffbeb', borderColor: '#fcd34d' }}>
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#92400e' }} />
                  <p className="text-sm" style={{ color: '#92400e' }}>
                    Couldn't load this activity's settings here — open the event's dashboard and edit from its Setup tab.
                    Event details above can still be saved.
                  </p>
                </div>
              ) : subLoading || dropLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
                </div>
              ) : subLocked ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
                  <p className="text-xs text-amber-900">
                    This challenge is {challenge?.status} — the schedule and price are locked in for subscribers
                    (Stripe billing depends on them). Event details above can still be edited.
                  </p>
                </div>
              ) : dropLocked ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-700" />
                  <p className="text-xs text-amber-900">
                    This Drop is already {dropDetail?.status} — it's gone on sale, so its items and pricing are
                    locked in for buyers who've already purchased. Event details above can still be edited.
                  </p>
                </div>
              ) : gameType === 'elimination' ? (
                <EliminationActivityStep
                  value={elimConfig} onChange={setElimConfig}
                  draftEvent={draftEvent} disabled={submitting}
                  errors={activityErrors} currency={currency}
                />
              ) : gameType === 'ticketed_event' ? (
                <TicketedEventActivityStep
                  value={ticketedConfig} onChange={setTicketedConfig}
                  draftEvent={draftEvent} disabled={submitting}
                  errors={activityErrors} currency={currency}
                />
              ) : gameType === 'quiz' ? (
                <QuizActivityStep
                  editMode
                  value={quizConfig} onChange={setQuizConfig}
                  draftEvent={draftEvent} disabled={submitting}
                  errors={activityErrors} currency={currency}
                />
              ) : gameType === 'puzzle_sub' && challenge ? (
                <SubscriptionActivityStep
                  editMode
                  value={subConfig} onChange={setSubConfig}
                  draftEvent={draftEvent} disabled={submitting}
                  errors={activityErrors} currency={currency}
                />
              ) : gameType === 'puzzle_drop' && dropDetail ? (
                <PuzzleDropActivityStep
                  value={dropConfig} onChange={setDropConfig}
                  draftEvent={draftEvent} disabled={submitting}
                  errors={activityErrors} currency={currency}
                />
              ) : (
                <div className="rounded-lg border px-3 py-2.5" style={{ borderColor: '#dce1df', background: '#fff' }}>
                  <p className="text-sm" style={{ color: '#8a9bab' }}>No linked challenge found for this room.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <p className="text-xs" style={{ color: '#8a9bab' }}>
            {activity && activityAvailable && !subLocked && !dropLocked ? 'Saves the event and its activity together' : ''}
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} disabled={submitting}
              className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
              style={{ borderColor: '#dce1df', color: '#52636f' }}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ background: matched?.accent ?? '#157f85' }}>
              {submitting
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />Saving…</>
                : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}