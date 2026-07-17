// src/components/mgtsystem/wizard/useWizardStore.ts
//
// Wizard state + persistence. Everything the user types lives here and is
// autosaved to localStorage on every change (zustand persist middleware),
// so a refresh, crash, or connection blip never loses their work. Nothing
// touches the server until the final submit — see submitChain.ts.
//
// PERSISTENCE CONTRACT
//   • Single versioned key. Bump STORE_VERSION on any breaking shape
//     change — the persist `version`/`migrate` pair below simply discards
//     incompatible drafts rather than trying to migrate them (a lost
//     draft is annoying; a corrupt one is worse).
//   • The draft records which club it belongs to. If a different club is
//     active, the draft is ignored (hasResumableDraft returns false) —
//     we never leak one club's half-typed event into another's wizard.
//   • Drafts expire after DRAFT_TTL_MS (7 days). Stale drafts are treated
//     as absent.
//   • progress.eventId / progress.roomId are the submit-chain markers:
//     they record which server calls have ALREADY succeeded so a retry
//     after a mid-chain failure re-runs only the missing steps and can
//     never create a duplicate event or room. Cleared with the rest of
//     the draft on full success.
//   • The QUIZ step's own config is NOT duplicated here — it lives in
//     useQuizSetupStore, which has its own persistence. This store only
//     records that quiz was the chosen type; phase 2 rehydrates the quiz
//     store alongside (see INTEGRATION.md).

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LocationType } from '../types/event';
import type { ActivityTypeId } from './activityRegistry';

const STORE_VERSION = 1;
const STORAGE_KEY   = 'fundraisely:event-wizard:v1';
const DRAFT_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface WizardEventFields {
  title:          string;
  summary:        string;
  description:    string;
  campaign_id:    string;
  /** Local "YYYY-MM-DDTHH:MM" from <input type="datetime-local">. */
  start_datetime: string;
  /** Duration for dateMode 'startPlusWeeks' activities. */
  weeks:          number;
  time_zone:      string;
  location_type:  LocationType;
  location_label: string;
  online_url:     string;
  goal_amount:    number | '';
}

export interface SubmitProgress {
  /** Set once createEvent succeeds — retries skip event creation. */
  eventId?: string;
  /** Set once the activity room is created — retries skip room creation. */
  roomId?:  string;
  /**
   * True once a createEvent request has been FIRED. If this is set but
   * eventId is not, the response may have been lost mid-flight — the
   * submit chain will look for a matching just-created draft to adopt
   * before ever re-creating (see submitChain.adoptRecentDraft).
   */
  eventCreateAttempted?: boolean;
}

interface WizardState {
  clubId:          string | null;
  step:            0 | 1 | 2;
  activityType:    ActivityTypeId | null;
  eventFields:     WizardEventFields;
  /** Per-type step-3 config, keyed by activity id. */
  activityConfigs: Partial<Record<ActivityTypeId, unknown>>;
  progress:        SubmitProgress;
  /**
   * Set when the wizard was opened from a legacy event card's
   * "Add Activity" (event already exists) — step 2 is skipped and the
   * submit chain treats this as progress.eventId.
   */
  injectedEventId: string | null;
  updatedAt:       number;

  // ── Actions ────────────────────────────────────────────────────────────
  begin:              (clubId: string) => void;
  setStep:            (step: 0 | 1 | 2) => void;
  setActivityType:    (type: ActivityTypeId) => void;
  updateEventFields:  (patch: Partial<WizardEventFields>) => void;
  setActivityConfig:  (type: ActivityTypeId, config: unknown) => void;
  setProgress:        (patch: Partial<SubmitProgress>) => void;
  setInjectedEventId: (eventId: string | null) => void;
  resetWizard:        (clubId?: string) => void;
}

export function emptyEventFields(timeZone: string): WizardEventFields {
  return {
    title: '', summary: '', description: '', campaign_id: '',
    start_datetime: '', weeks: 4,
    time_zone: timeZone,
    location_type: 'in_person', location_label: '', online_url: '',
    goal_amount: '',
  };
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set) => ({
      clubId:          null,
      step:            0,
      activityType:    null,
      eventFields:     emptyEventFields(Intl.DateTimeFormat().resolvedOptions().timeZone),
      activityConfigs: {},
      progress:        {},
      injectedEventId: null,
      updatedAt:       0,

      begin: (clubId) => set(s => ({
        // Opening for a DIFFERENT club discards the old club's draft.
        ...(s.clubId && s.clubId !== clubId
          ? freshState(clubId)
          : { clubId }),
        updatedAt: Date.now(),
      })),

      setStep:         (step)  => set({ step, updatedAt: Date.now() }),
      setActivityType: (type)  => set({ activityType: type, updatedAt: Date.now() }),

      updateEventFields: (patch) => set(s => ({
        eventFields: { ...s.eventFields, ...patch },
        updatedAt:   Date.now(),
      })),

      setActivityConfig: (type, config) => set(s => ({
        activityConfigs: { ...s.activityConfigs, [type]: config },
        updatedAt:       Date.now(),
      })),

      setProgress: (patch) => set(s => ({
        progress:  { ...s.progress, ...patch },
        updatedAt: Date.now(),
      })),

      setInjectedEventId: (eventId) => set({ injectedEventId: eventId, updatedAt: Date.now() }),

      resetWizard: (clubId) => set(freshState(clubId ?? null)),
    }),
    {
      name:    STORAGE_KEY,
      version: STORE_VERSION,
      migrate: (persisted, version) =>
        version === STORE_VERSION ? (persisted as WizardState) : undefined,
    },
  ),
);

function freshState(clubId: string | null) {
  return {
    clubId,
    step:            0 as const,
    activityType:    null,
    eventFields:     emptyEventFields(Intl.DateTimeFormat().resolvedOptions().timeZone),
    activityConfigs: {},
    progress:        {},
    injectedEventId: null,
    updatedAt:       Date.now(),
  };
}

// ── Draft inspection helpers ──────────────────────────────────────────────────

/**
 * True when a meaningful, fresh draft for THIS club exists — used by the
 * wizard shell to show the "Resume / Start fresh" banner. "Meaningful"
 * means the user got past a blank slate: chose a type or typed a title.
 */
export function hasResumableDraft(clubId: string): boolean {
  const s = useWizardStore.getState();
  if (s.clubId !== clubId) return false;
  if (!s.updatedAt || Date.now() - s.updatedAt > DRAFT_TTL_MS) return false;
  if (s.injectedEventId) return false; // legacy add-activity sessions don't resume
  return s.activityType !== null || s.eventFields.title.trim() !== '';
}

/** Short human label for the resume banner, e.g. `"Christmas Quiz" setup`. */
export function draftLabel(): string {
  const s = useWizardStore.getState();
  return s.eventFields.title.trim()
    ? `"${s.eventFields.title.trim()}"`
    : 'your unfinished fundraiser';
}