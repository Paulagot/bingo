// src/components/mgtsystem/wizard/submitChain.ts
//
// The final-submit orchestrator. Runs the EXACT backend sequence the old
// two-step flow ran - nothing about the API surface changes:
//
//   1. eventsService.createEvent(...)                (was CreateEventForm)
//   2. def.createRoom(...)                           (was Schedule*Modal)
//   3. eventIntegrationsService.link(eventId, {...}) (was handleActivitySaved)
//
// What's new is RESUMABILITY. Each phase writes a progress marker into
// the wizard store the moment it succeeds (persisted to localStorage by
// the store), so if the connection drops mid-chain the user sees an
// error with Retry, and the retry re-runs ONLY the missing phases:
//   • eventId present  → phase 1 skipped, never a duplicate event
//   • roomId present   → phase 2 skipped, never a duplicate room
//   • link 409 "already linked" → treated as success (matches the
//     alreadyLinked guard that existed in handleActivitySaved)
//
// THE ONE UNAVOIDABLE EDGE: createEvent succeeds on the server but the
// response never reaches the browser. We then have eventCreateAttempted
// set with no eventId. Before re-creating, adoptRecentDraft() scans the
// club's events for a draft with the same title + event_date created in
// the last few minutes and adopts its id instead. No backend change, no
// idempotency key needed, closes the gap almost entirely.

import eventsService from '../services/eventsServices';
import { eventIntegrationsService } from '../services/EventIntegrationsService';
import type { CreateEventForm } from '../types/event';
import type { ActivityTypeDef, ActivityCreateContext, DraftEvent } from './activityRegistry';
import type { WizardEventFields, SubmitProgress } from './useWizardStore';

export type SubmitPhase = 'creating_event' | 'creating_room' | 'linking';

export const PHASE_LABEL: Record<SubmitPhase, string> = {
  creating_event: 'Creating event…',
  creating_room:  'Setting up activity…',
  linking:        'Linking…',
};

export class SubmitChainError extends Error {
  phase: SubmitPhase;
  constructor(phase: SubmitPhase, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.phase = phase;
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
// Same UTC handling as CreateEventForm: the datetime-local input gives a
// local "YYYY-MM-DDTHH:MM" string; the browser parses it as local time,
// so toISOString() yields the correct UTC instant for storage. See the
// long comment block in CreateEventForm.tsx for the full reasoning.

function localInputToUTC(localDateTimeStr: string): string {
  if (!localDateTimeStr) return '';
  return new Date(localDateTimeStr).toISOString();
}

function addWeeks(localDateTimeStr: string, weeks: number): string {
  const d = new Date(localDateTimeStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString();
}

// ── Draft event assembly ──────────────────────────────────────────────────────

export function buildDraftEvent(fields: WizardEventFields): DraftEvent {
  return {
    title:          fields.title.trim(),
    summary:        fields.summary?.trim() || null,
    start_datetime: fields.start_datetime ? localInputToUTC(fields.start_datetime) : null,
    // Local date, not UTC date - a 23:30 Dublin event on Jun 7 is still
    // Jun 7 in Dublin even though it's Jun 8 UTC. slice(0, 10) rather
    // than split('T')[0] so the type is `string` (not `string |
    // undefined`) under noUncheckedIndexedAccess.
    event_date:     fields.start_datetime ? fields.start_datetime.slice(0, 10) : '',
    time_zone:      fields.time_zone,
    location_label: fields.location_label?.trim() || null,
    weeks:          fields.weeks,
    goal_amount:    Number(fields.goal_amount) || 0,
  };
}

function buildCreateEventPayload(
  fields: WizardEventFields,
  def: ActivityTypeDef<any>,
): CreateEventForm {
  const draft = buildDraftEvent(fields);

  const base: CreateEventForm = {
    title:               draft.title,
    type:                def.eventType,           // auto - user never enters this
    primary_action_type: def.primaryActionType,   // auto - derived from activity
    summary:             draft.summary || undefined,
    description:         fields.description?.trim() || undefined,
    campaign_id:         fields.campaign_id || undefined,
    goal_amount:         draft.goal_amount,
    start_datetime:      draft.start_datetime || undefined,
    event_date:          draft.event_date || undefined,
    time_zone:           draft.time_zone,
    location_type:       'online',
    // NOTE: payment method fields are deliberately NEVER sent - they are
    // an activity-level concern now (room → event flow). See
    // PaymentMethodSelector.tsx.
  };

  if (def.showLocation) {
    base.location_type  = fields.location_type;
    base.location_label = fields.location_label?.trim() || undefined;
    base.online_url     = fields.online_url?.trim() || undefined;
  }
  // else: platform-hosted online activity (puzzle_sub / puzzle_drop) -
  // location_type 'online' with no label/url, per agreed design.

  if (def.dateMode === 'startPlusWeeks' && fields.start_datetime) {
    // The subscription's real "when" is start + duration; stamp
    // end_datetime so the event row reflects the full run.
    base.end_datetime = addWeeks(fields.start_datetime, fields.weeks);
  }

  return base;
}

// ── Lost-response recovery ────────────────────────────────────────────────────

/**
 * Look for a draft event this chain probably created but whose response
 * we never received. Match: same trimmed title, same event_date, status
 * draft, created within the last 15 minutes.
 */
async function adoptRecentDraft(
  clubId: string,
  fields: WizardEventFields,
): Promise<string | null> {
  try {
    const { events } = await eventsService.getClubEvents(clubId);
    const title     = fields.title.trim().toLowerCase();
    const eventDate = fields.start_datetime ? fields.start_datetime.slice(0, 10) : '';
    const cutoff    = Date.now() - 15 * 60 * 1000;

    const match = events.find(e =>
      e.status === 'draft' &&
      e.title.trim().toLowerCase() === title &&
      (e.event_date || '').slice(0, 10) === eventDate &&
      new Date(e.created_at).getTime() >= cutoff,
    );
    return match?.id ?? null;
  } catch {
    // Adoption is best-effort - if the lookup itself fails we fall back
    // to normal creation and accept the (rare, deletable) duplicate draft.
    return null;
  }
}

// ── The chain ─────────────────────────────────────────────────────────────────

export interface SubmitChainArgs {
  clubId:      string;
  def:         ActivityTypeDef<any>;
  eventFields: WizardEventFields;
  config:      unknown;
  ctx:         ActivityCreateContext;
  progress:    SubmitProgress;
  /** Injected when the wizard was opened on an existing event. */
  injectedEventId: string | null;
  /** Persist markers as each phase succeeds. */
  onProgress:  (patch: Partial<SubmitProgress>) => void;
  onPhase?:    (phase: SubmitPhase) => void;
}

export async function runSubmitChain(args: SubmitChainArgs): Promise<{ eventId: string; roomId: string }> {
  const { clubId, def, eventFields, config, ctx, progress, injectedEventId, onProgress, onPhase } = args;

  // ── Phase 1: event ─────────────────────────────────────────────────────
  let eventId = injectedEventId || progress.eventId || '';

  if (!eventId) {
    onPhase?.('creating_event');
    try {
      // If a previous attempt fired but we never saw the response, check
      // whether the event actually exists before creating another one.
      if (progress.eventCreateAttempted) {
        const adopted = await adoptRecentDraft(clubId, eventFields);
        if (adopted) {
          eventId = adopted;
          onProgress({ eventId });
        }
      }

      if (!eventId) {
        onProgress({ eventCreateAttempted: true });
        const res = await eventsService.createEvent(clubId, buildCreateEventPayload(eventFields, def));
        eventId = res.event.id;
        onProgress({ eventId });
      }
    } catch (e) {
      throw new SubmitChainError('creating_event', e);
    }
  }

  // ── Phase 2: room ──────────────────────────────────────────────────────
  let roomId = progress.roomId || '';

  if (!roomId) {
    onPhase?.('creating_room');
    try {
      roomId = await def.createRoom(config, buildDraftEvent(eventFields), ctx);
      onProgress({ roomId });
    } catch (e) {
      throw new SubmitChainError('creating_room', e);
    }
  }

  // ── Phase 3: link ──────────────────────────────────────────────────────
  onPhase?.('linking');
  try {
    await eventIntegrationsService.link(eventId, {
      integration_type: def.integrationType,
      external_ref:     roomId,
    });
  } catch (e: any) {
    // "Already linked" means a previous attempt's link actually landed -
    // that is success, not failure (same semantics as the old
    // alreadyLinked guard in handleActivitySaved).
    const msg = String(e?.message || '');
    if (!msg.includes('409') && !msg.toLowerCase().includes('already linked')) {
      throw new SubmitChainError('linking', e);
    }
  }

  return { eventId, roomId };
}