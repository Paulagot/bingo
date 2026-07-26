// src/components/mgtsystem/wizard/activityRegistry.tsx
//
// THE single source of truth for activity types in the create flow.
//
// Adding a new activity (e.g. Puzzle Drop) means adding ONE entry here
// plus its Step component - no wizard surgery, no new if/else chains in
// QuizEventDashboard. Each entry declares:
//
//   • how the type appears on the step-1 card (label / description / icon)
//   • what it stamps onto the EVENT automatically (eventType,
//     primaryActionType) so the user never types those
//   • how step 2 (event details) is shaped for it: showLocation and
//     dateMode ('datetime' = single date & time; 'startPlusWeeks' =
//     start date + duration, used by subscription-style activities)
//   • which PaymentMethodSelector mode its step-3 uses ('split' /
//     'single' / 'locked' - see PaymentMethodSelector.tsx)
//   • integrationType - the exact string eventIntegrationsService.link()
//     expects. These MUST stay in sync with the backend
//     EventIntegrationsService (quiz_web2 / elimination / ticketed_event /
//     puzzle_sub / puzzle_drop).
//   • defaultConfig / validate / createRoom / Step - the activity's own
//     config lifecycle. createRoom performs ONLY the room-creation call
//     the old Schedule modal made; event creation and linking are the
//     submit chain's job (see submitChain.ts) so the backend sequence
//     stays exactly: createEvent → create room → link.
//
// Rollout note: all five types are now live (`available: true`).

import type React from 'react';
import { Sparkles, Trophy, Ticket, Puzzle, Footprints, type LucideIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

import eliminationMgmtService from '../services/EliminationMgmtService';
import ticketedEventMgmtService from '../services/TicketedEventMgmtService';
import puzzleDropMgmtService from '../../mgtsystem/services/PuzzleDropMgmtService';
import sponsoredActivityMgmtService from '../services/SponsoredActivityMgmtService';
import type { PrimaryActionType } from '../types/event';
import type { PaymentMethodSelectorMode } from '../shared/PaymentMethodSelector';
import { ACCENTS } from '../shared/ui';
import { localToUtc } from './tz';
import { currencySymbol } from '../shared/CurrencySelect';

import EliminationActivityStep, {
  type EliminationConfig,
  defaultEliminationConfig,
  validateEliminationConfig,
} from './steps/activities/EliminationActivityStep';
import TicketedEventActivityStep, {
  type TicketedEventConfig,
  defaultTicketedEventConfig,
  validateTicketedEventConfig,
  slugify,
} from './steps/activities/TicketedEventActivityStep';
import SubscriptionActivityStep, {
  type SubscriptionConfig,
  defaultSubscriptionConfig,
  validateSubscriptionConfig,
} from './steps/activities/SubscriptionActivityStep';
import PuzzleDropActivityStep, {
  type PuzzleDropConfig,
  defaultPuzzleDropConfig,
  validatePuzzleDropConfig,
} from './steps/activities/PuzzleDropActivityStep';
import SponsoredActivityStep, {
  type SponsoredActivityConfig,
  defaultSponsoredActivityConfig,
  validateSponsoredActivityConfig,
} from './steps/activities/SponsoredActivityStep';
import { challengeService, type Currency } from '../../puzzles/services/ChallengeService';
import QuizActivityStep, {
  type QuizWizardConfig,
  defaultQuizConfig,
  validateQuizConfig,
} from './steps/activities/QuizActivityStep';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import { roomApi } from '@/shared/api';

// ── Shared shapes ─────────────────────────────────────────────────────────────

export type ActivityTypeId = 'quiz' | 'elimination' | 'ticketed_event' | 'puzzle_sub' | 'puzzle_drop' | 'sponsored_activity';

export type IntegrationType = 'quiz_web2' | 'elimination' | 'ticketed_event' | 'puzzle_sub' | 'puzzle_drop' | 'sponsored_activity';

/**
 * The event as the wizard knows it BEFORE it exists on the server.
 * Step-3 components and createRoom read from this instead of a real
 * Event row - it carries exactly the fields the old Schedule modals
 * read off their `event` prop.
 */
export interface DraftEvent {
  title:          string;
  summary:        string | null;
  /** UTC ISO string (already converted from the local datetime input). */
  start_datetime: string | null;
  /** Local date "YYYY-MM-DD". */
  event_date:     string;
  time_zone:      string;
  /** Venue name where relevant (ticketed rooms store it as eventLocation). */
  location_label: string | null;
  /** Duration for 'startPlusWeeks' activities (subscription challenges). */
  weeks?:         number;
  goal_amount:    number;
}

/** Auth/club context createRoom implementations need. */
export interface ActivityCreateContext {
  hostId:   string;
  hostName: string;
  /** Club reporting currency ISO, e.g. "EUR". */
  currency: string;
}

export interface ActivityStepProps<C> {
  value:      C;
  onChange:   (next: C) => void;
  draftEvent: DraftEvent;
  disabled:   boolean;
  /** Field-level errors from the registry validate(), keyed per field. */
  errors:     Record<string, string>;
  currency:   string;
}

export interface ActivityTypeDef<C = unknown> {
  id:                ActivityTypeId;
  integrationType:   IntegrationType;

  // Step-1 card
  label:             string;
  description:       string;
  icon:              LucideIcon;
  accent:            string;
  available:         boolean;

  // Auto-stamped event fields - the user never enters these
  eventType:         string;             // → event.type
  primaryActionType: PrimaryActionType;  // → event.primary_action_type

  // Step-2 shaping
  showLocation:      boolean;
  dateMode:          'datetime' | 'startPlusWeeks';

  // Step-3
  paymentMode:       PaymentMethodSelectorMode;
  defaultConfig:     () => C;
  /** Returns field errors; empty object = valid. */
  validate:          (cfg: C) => Record<string, string>;
  /** Creates the room ONLY. Returns the roomId for link(). */
  createRoom:        (cfg: C, draftEvent: DraftEvent, ctx: ActivityCreateContext) => Promise<string>;
  Step:              React.ComponentType<ActivityStepProps<C>>;
}

// ── Elimination (fully wired - proves the pattern) ────────────────────────────

const elimination: ActivityTypeDef<EliminationConfig> = {
  id:              'elimination',
  integrationType: 'elimination',

  label:       'Last One Standing',
  description: 'Elimination game - one entry fee, one big prize',
  icon:        Trophy,
  accent:      ACCENTS.red,
  available:   true,

  eventType:         'Elimination Game',
  primaryActionType: 'attend',

  showLocation: true,
  dateMode:     'datetime',

  paymentMode:   'split',
  defaultConfig: defaultEliminationConfig,
  validate:      validateEliminationConfig,

  async createRoom(cfg, draftEvent, ctx) {
    // Same payload the old ScheduleEliminationModal built, with
    // scheduledAt/timeZone now coming from the wizard's draft event
    // (single source - entered once at step 2, never re-typed).
    const prizes = [{
      place:       1,
      value:       cfg.prizeValue ? Number(cfg.prizeValue) : null,
      description: cfg.prizeDescription.trim(),
      sponsor:     cfg.prizeSponsor.trim() || null,
    }];

    const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();

    // Built as a separate const and SPREAD into the call - exactly like
    // the old modal - because ScheduleEliminationPayload doesn't declare
    // the flat prizeDescription/prizeValue fields, but the backend still
    // reads them during the config_json migration. Spreading sidesteps
    // TS's excess-property check on object literals without a cast.
    // Delete the two flat fields (and this comment) once the backend
    // migration completes.
    const payload = {
      scheduledAt: draftEvent.start_datetime
        || (draftEvent.event_date ? `${draftEvent.event_date}T19:00:00` : null),
      timeZone:  draftEvent.time_zone,
      entryFee:  Number(cfg.entryFee),
      currency:  ctx.currency,
      prizes,
      // Flat fields kept for backend compatibility during migration
      prizeDescription: cfg.prizeDescription.trim(),
      prizeValue:       cfg.prizeValue ? Number(cfg.prizeValue) : undefined,
      // Payment methods are activity-level, written directly onto the
      // room - see PaymentMethodSelector.tsx / eliminationMgmtService.js.
      ticketMethodIds:  cfg.paymentMethods.ticketMethodIds,
      onnightMethodIds: cfg.paymentMethods.onnightMethodIds,
    };

    await eliminationMgmtService.scheduleRoom({
      roomId,
      hostId:   ctx.hostId,
      hostName: ctx.hostName,
      ...payload,
    });

    return roomId;
  },

  Step: EliminationActivityStep,
};

// ── All five activity types are live in the wizard ────────────────────────────

const quiz: ActivityTypeDef<QuizWizardConfig> = {
  id:              'quiz',
  integrationType: 'quiz_web2',

  label:       'Quiz Night',
  description: 'Live quiz with rounds, templates, prizes and fundraising extras',
  icon:        Sparkles,
  accent:      ACCENTS.teal,
  available:   true,

  eventType:         'Quiz Night',
  primaryActionType: 'attend',

  showLocation: true,
  dateMode:     'datetime',

  paymentMode:   'split',
  defaultConfig: defaultQuizConfig,
  validate:      validateQuizConfig,

  async createRoom(cfg, _draftEvent, _ctx) {
    // Quiz config lives in useQuizSetupStore (see QuizActivityStep header)
    // - by the time we get here the step has already synced the event's
    // date/timezone/currency into it. This is the old modal's create path
    // verbatim: reuse store ids if present (safe retry - a re-run after a
    // network failure reuses the SAME roomId instead of minting another).
    const state = useQuizSetupStore.getState();
    const { generateRoomId, generateHostId } = await import('@/components/Quiz/utils/idUtils');
    const roomId = state.roomId || generateRoomId();
    const hostId = state.hostId || generateHostId();
    useQuizSetupStore.getState().setRoomIds(roomId, hostId);

    // Payment methods passed alongside config/roomId/hostId - POST
    // /create-room reads these as top-level body fields, NOT as part
    // of config, and writes them to linked_payment_methods_json
    // directly (same pattern as scheduleEliminationRoom).
    const data = await roomApi.createRoom({
      config: state.setupConfig,
      roomId,
      hostId,
      ticketMethodIds:  cfg.paymentMethods.ticketMethodIds,
      onnightMethodIds: cfg.paymentMethods.onnightMethodIds,
    } as any);

    const finalRoomId = useQuizSetupStore.getState().roomId || data?.roomId || roomId;

    // Clear the quiz store now the room exists. The old modal got this
    // for free from its hardReset-on-mount; the wizard step deliberately
    // does NOT reset on mount (that would wipe resumable drafts), so
    // without this the retained roomId would be reused by the NEXT quiz.
    useQuizSetupStore.getState().hardReset({ flow: 'web2' });

    return finalRoomId;
  },

  Step: QuizActivityStep,
};

const ticketedEvent: ActivityTypeDef<TicketedEventConfig> = {
  id:              'ticketed_event',
  integrationType: 'ticketed_event',

  label:       'Ticketed Event',
  description: 'Sell tickets for a night, gala or show - capacity, prizes, sponsors',
  icon:        Ticket,
  accent:      ACCENTS.teal,
  available:   true,

  eventType:         'Ticketed Event',
  primaryActionType: 'buy',

  showLocation: true,
  dateMode:     'datetime',

  paymentMode:   'split',
  defaultConfig: defaultTicketedEventConfig,
  validate:      validateTicketedEventConfig,

  async createRoom(cfg, draftEvent, ctx) {
    const { currencySymbol } = await import('../shared/CurrencySelect');
    const sym = currencySymbol(ctx.currency);

    // Same shaping the old modal's handleSubmit did before calling
    // scheduleEvent - filter unnamed/unpriced types, slugify ids, convert
    // per-type sale deadlines from the EVENT's timezone to UTC.
    const validTicketTypes = cfg.ticketTypes
      .filter(t => t.name.trim() && t.price)
      .map(t => ({
        id:         t.id || slugify(t.name),
        name:       t.name.trim(),
        price:      t.price,
        isEnabled:  t.isEnabled,
        quantity:   t.quantity ? parseInt(t.quantity) : null,
        saleEndsAt: t.saleEndsAt ? localToUtc(t.saleEndsAt, draftEvent.time_zone) : null,
      }));

    const entryFee = validTicketTypes[0]?.price ?? null;
    const roomId   = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();

    const payload = {
      roomId,
      hostId:   ctx.hostId,
      hostName: ctx.hostName,
      scheduledAt: draftEvent.start_datetime
        || (draftEvent.event_date ? `${draftEvent.event_date}T19:00:00` : null),
      timeZone:       draftEvent.time_zone,
      entryFee,
      fundraisingMode: 'fixed_fee' as const,
      currency:       ctx.currency,
      currencySymbol: sym,
      ticketTypes:    validTicketTypes,
      prizes:         cfg.prizes.filter(p => p.description.trim()),
      eventSponsors:  cfg.eventSponsors.filter(s => s.name.trim()),
      venueCapacity:  cfg.venueCapacity ? parseInt(cfg.venueCapacity) : undefined,
      eventTitle:     draftEvent.title          || null,
      eventLocation:  draftEvent.location_label || null,
      ticketMethodIds:  cfg.paymentMethods.ticketMethodIds,
      onnightMethodIds: cfg.paymentMethods.onnightMethodIds,
    };

    const data = await ticketedEventMgmtService.scheduleEvent(payload);
    return data.roomId ?? roomId;
  },

  Step: TicketedEventActivityStep,
};

const puzzleSub: ActivityTypeDef<SubscriptionConfig> = {
  id:              'puzzle_sub',
  integrationType: 'puzzle_sub',

  label:       'Puzzle Subscription',
  description: 'Weekly online puzzles with recurring billing via Stripe',
  icon:        Puzzle,
  accent:      ACCENTS.purple,
  available:   true,

  eventType:         'Puzzle Subscription',
  primaryActionType: 'register',

  // Always online & platform-hosted: no location section at all, and the
  // event is saved with location_type 'online' and no URL (agreed -
  // events can be created without location details). Start date + weeks
  // are entered ONCE at step 2 ('startPlusWeeks' mode) and consumed here
  // via draftEvent.
  showLocation: false,
  dateMode:     'startPlusWeeks',

  paymentMode:   'locked',
  defaultConfig: defaultSubscriptionConfig,
  validate:      validateSubscriptionConfig,

  async createRoom(cfg, draftEvent, ctx) {
    const parsedPrice   = parseFloat(cfg.priceInput);
    const weeklyPrice   = cfg.isFree ? undefined : Math.round(parsedPrice * 100); // cents/pence
    const currencyValue = cfg.isFree ? undefined : (ctx.currency.toLowerCase() as Currency);

    const challenge = await challengeService.createChallenge({
      // The event title IS the challenge title - entered once at step 2,
      // never re-typed (the old modal's duplicate title field is gone).
      title:       draftEvent.title,
      description: cfg.description.trim() || undefined,
      totalWeeks:  draftEvent.weeks ?? 4,
      startsAt:    draftEvent.start_datetime
        ? new Date(draftEvent.start_datetime).toISOString()
        : new Date(draftEvent.event_date).toISOString(),
      // Create mode: omit the schedule - the backend auto-generates one
      // (shuffled type rotation, difficulty ramp) from the live engine
      // list. Tweakable per week afterwards while the challenge is draft.
      puzzleSchedule: undefined,
      isFree:      cfg.isFree,
      weeklyPrice,
      currency:    currencyValue,
      sponsors:    cfg.sponsors
        .filter(s => s.name.trim())
        .map(s => ({ name: s.name.trim(), role: s.role?.trim() || undefined })),
    });

    // room_id is created server-side alongside the challenge (non-fatal -
    // see challengeService.createChallenge). Without it there is nothing
    // to link, so surface a distinct error the wizard can explain.
    if (!challenge.room_id) {
      throw new Error('challenge_created_room_missing');
    }
    return challenge.room_id;
  },

  Step: SubscriptionActivityStep,
};

// ── Puzzle Drop (new) ──────────────────────────────────────────────────────────

const puzzleDrop: ActivityTypeDef<PuzzleDropConfig> = {
  id:              'puzzle_drop',
  integrationType: 'puzzle_drop',

  label:       'Puzzle Drop',
  description: 'One-off puzzles for sale - perfect for in-person selling',
  icon:        Puzzle,
  accent:      ACCENTS.orange,
  available:   true,

  eventType:         'Puzzle Drop',
  primaryActionType: 'buy',

  // Platform-hosted online, same as puzzleSub - but a single go-on-sale
  // date/time, not a start+duration ('datetime', not 'startPlusWeeks'):
  // Drop has no "how many weeks does this run" concept (§3.1 - status
  // just flips scheduled→open once scheduled_at passes, no end date).
  showLocation: false,
  dateMode:     'datetime',

  // No advance/on-the-night split - just one purchase moment (§4.2).
  paymentMode:   'single',
  defaultConfig: defaultPuzzleDropConfig,
  validate:      validatePuzzleDropConfig,

  async createRoom(cfg, draftEvent, ctx) {
    const sym = currencySymbol(ctx.currency);
    const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();

    const result = await puzzleDropMgmtService.createDrop({
      roomId,
      hostId:   ctx.hostId,
      hostName: ctx.hostName,
      scheduledAt: draftEvent.start_datetime
        || (draftEvent.event_date ? `${draftEvent.event_date}T19:00:00` : null),
      timeZone: draftEvent.time_zone,
      currency: ctx.currency,
      currencySymbol: sym,
      dropTitle: draftEvent.title || null,
      items: cfg.items.map(i => ({
        puzzleType: i.puzzleType,
        difficulty: i.difficulty,
      })),
      pricingTiers: cfg.pricingTiers.map(t => ({
        quantity: parseInt(t.quantity, 10),
        price: parseFloat(t.price),
        label: t.label.trim() || undefined,
      })),
      onnightMethodIds: cfg.paymentMethods.onnightMethodIds,
    });

    return result.roomId ?? roomId;
  },

  Step: PuzzleDropActivityStep,
};



// ── Sponsored Activity ───────────────────────────────────────────────────────
const sponsoredActivity: ActivityTypeDef<SponsoredActivityConfig> = {
  id: 'sponsored_activity',
  integrationType: 'sponsored_activity',
  label: 'Sponsored Activity',
  description: 'Sponsored walk, readathon, run or other club challenge',
  icon: Footprints,
  accent: ACCENTS.teal,
  available: true,
  eventType: 'Sponsored Activity',
  primaryActionType: 'donate',
  showLocation: true,
  dateMode: 'datetime',
  paymentMode: 'single',
  defaultConfig: defaultSponsoredActivityConfig,
  validate: validateSponsoredActivityConfig,
  async createRoom(cfg, _draftEvent, ctx) {
    const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
    const result = await sponsoredActivityMgmtService.create({
      roomId,
      hostId: ctx.hostId,
      hostName: ctx.hostName,
      sponsorshipOpensAt: localToUtc(cfg.sponsorshipOpensAt, _draftEvent.time_zone),
      sponsorshipClosesAt: localToUtc(cfg.sponsorshipClosesAt, _draftEvent.time_zone),
      timeZone: _draftEvent.time_zone,
      activityKind: cfg.activityKind,
      customActivityLabel: cfg.customActivityLabel.trim() || undefined,
      suggestedAmounts: cfg.suggestedAmounts.map(Number).filter(n => Number.isFinite(n) && n > 0),
      currency: ctx.currency,
      onnightMethodIds: cfg.paymentMethods.onnightMethodIds,
    });
    return result.roomId ?? roomId;
  },
  Step: SponsoredActivityStep,
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const ACTIVITY_TYPES: ActivityTypeDef<any>[] = [
  quiz,
  elimination,
  ticketedEvent,
  puzzleSub,
  puzzleDrop,
  sponsoredActivity,
];

export function getActivityDef(id: ActivityTypeId): ActivityTypeDef<any> {
  const def = ACTIVITY_TYPES.find(t => t.id === id);
  if (!def) throw new Error(`Unknown activity type: ${id}`);
  return def;
}

/**
 * Reverse lookup for EDITING an existing event: matches the event.type
 * string the wizard stamped at creation (e.g. "Quiz Night"). Returns
 * null for legacy/free-form types - callers fall back to a generic
 * shape (location shown, single date/time).
 */
export function getActivityDefByEventType(eventType: string | null | undefined): ActivityTypeDef<any> | null {
  if (!eventType) return null;
  const needle = eventType.trim().toLowerCase();
  return ACTIVITY_TYPES.find(t => t.eventType.toLowerCase() === needle) ?? null;
}