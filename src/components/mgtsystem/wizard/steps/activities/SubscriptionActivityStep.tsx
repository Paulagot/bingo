// src/components/mgtsystem/wizard/steps/activity/SubscriptionActivityStep.tsx
//
// The BODY of the old ScheduleSubscriptionModal, extracted for:
//   • step 3 of CreateFundraiserWizard (create) — WITH the agreed UX
//     changes: NO title field (the event title flows through), NO
//     starts-date/weeks inputs (those moved to step 2 via the
//     'startPlusWeeks' date mode — this step reads them off draftEvent
//     for display), and the shared locked PaymentMethodSelector notice
//     (subscriptions are Stripe-only, nothing to choose).
//   • ScheduleSubscriptionModal (edit) — pass `editMode` and the
//     challenge-level fields the modal has always edited come back:
//     title, starts date, weeks stepper, and the per-week schedule
//     pickers (create mode never shows pickers — the backend
//     auto-generates the schedule; see scheduleGeneratorService.js).
//
// No API calls, no submit button. Config in via value/onChange.

import { Puzzle, Plus, Minus } from 'lucide-react';
import { Section, SectionHeader, inputClass, ErrorBanner, ACCENTS } from '../../../shared/ui';
import PaymentMethodSelector from '../../../shared/PaymentMethodSelector';
import { currencySymbol } from '../../../shared/CurrencySelect';
import type { ChallengeSponsor, ScheduleEntry } from '../../../../puzzles/services/ChallengeService';
import type { ActivityStepProps } from '../../activityRegistry';

// ── Config shape + lifecycle (imported by the registry & edit modal) ─────────

export interface SubscriptionConfig {
  /** Edit mode only — create mode uses the event title. */
  title:       string;
  description: string;
  /** Edit mode only ("YYYY-MM-DD") — create mode uses draftEvent. */
  startsAt:    string;
  /** Edit mode only — create mode uses draftEvent.weeks. */
  totalWeeks:  number;
  /** Edit mode only — create mode lets the backend generate it. */
  schedule:    ScheduleEntry[];
  isFree:      boolean;
  priceInput:  string;
  sponsors:    ChallengeSponsor[];
}

export const MAX_WEEKS = 52;

export const PUZZLE_TYPES = [
  { value: 'anagram', label: 'Anagram' },
  { value: 'sequenceOrdering', label: 'Sequence Ordering' },
  { value: 'matchPairs', label: 'Match Pairs' },
  { value: 'wordSearch', label: 'Word Search' },
  { value: 'slidingTile', label: 'Sliding Tile' },
  { value: 'sudoku', label: 'Sudoku' },
  { value: 'patternCompletion', label: 'Pattern Completion' },
  { value: 'wordLadder', label: 'Word Ladder' },
  { value: 'cryptogram', label: 'Cryptogram' },
  { value: 'numberPath', label: 'Number Path' },
  { value: 'towersOfHanoi', label: 'Towers of Hanoi' },
  { value: 'nonogram', label: 'Nonogram' },
  { value: 'memoryPairs', label: 'Memory Pairs' },
] as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export function defaultSubscriptionConfig(): SubscriptionConfig {
  return {
    title: '', description: '',
    startsAt: '', totalWeeks: 4,
    schedule: Array.from({ length: 4 }, (_, i) => ({
      week: i + 1, puzzleType: 'anagram', difficulty: 'medium' as const,
    })),
    isFree: false, priceInput: '',
    sponsors: [],
  };
}

// Create-mode rules (title is the EVENT's, validated at step 2).
export function validateSubscriptionConfig(cfg: SubscriptionConfig): Record<string, string> {
  const parsedPrice = parseFloat(cfg.priceInput);
  if (!cfg.isFree && (isNaN(parsedPrice) || parsedPrice <= 0)) {
    return { form: 'Enter a valid weekly price, or mark this challenge as free' };
  }
  return {};
}

const ACCENT = ACCENTS.purple;

const selectCls = () =>
  `w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent border-[#dce1df] bg-white hover:border-[#b8c6b0]`;

interface ExtraProps {
  /** Edit modal passes true: shows title / starts / weeks / schedule pickers. */
  editMode?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubscriptionActivityStep({
  value, onChange, draftEvent, disabled, errors, currency, editMode = false,
}: ActivityStepProps<SubscriptionConfig> & ExtraProps) {
  const sym   = currencySymbol(currency);
  const error = errors.form || null;

  const set = <K extends keyof SubscriptionConfig>(key: K, v: SubscriptionConfig[K]) =>
    onChange({ ...value, [key]: v });

  // Weeks shown in the create-mode info box come from the wizard's step-2
  // fields (via draftEvent); in edit mode from the challenge itself.
  const totalWeeks = editMode ? value.totalWeeks : (draftEvent.weeks ?? 4);

  function handleTotalWeeksChange(n: number) {
    const clamped = Math.max(1, Math.min(MAX_WEEKS, n));
    const next = [...value.schedule];
    while (next.length < clamped) {
      next.push({ week: next.length + 1, puzzleType: 'anagram', difficulty: 'medium' });
    }
    onChange({ ...value, totalWeeks: clamped, schedule: next.slice(0, clamped) });
  }

  function updateWeek(index: number, field: keyof ScheduleEntry, v: string) {
    set('schedule', value.schedule.map((row, i) => (i === index ? { ...row, [field]: v } : row)));
  }

  return (
    <div className="space-y-4">

      {error && <ErrorBanner message={error} />}

      {/* ── 1. Challenge details ── */}
      <Section>
        <SectionHeader icon={<Puzzle className="h-4 w-4" />} title="Challenge details" accent={ACCENT}
          subtitle={editMode ? undefined : `Named after your event — "${draftEvent.title || 'Untitled event'}"`} />
        <div className="space-y-3">

          {editMode && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                Title <span style={{ color: '#e9574f' }}>*</span>
              </label>
              <input type="text" value={value.title} onChange={e => set('title', e.target.value)}
                className={inputClass(false, ACCENT)} disabled={disabled}
                placeholder="e.g. Summer Puzzle Fundraiser" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
              Description <span style={{ color: '#8a9bab' }}>(optional)</span>
            </label>
            <textarea value={value.description} onChange={e => set('description', e.target.value)}
              className={inputClass(false, ACCENT)} disabled={disabled} rows={2}
              placeholder="Shown to supporters when they join" />
          </div>

          {editMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                  Starts
                </label>
                <input type="date" value={value.startsAt} onChange={e => set('startsAt', e.target.value)}
                  className={inputClass(false, ACCENT)} disabled={disabled} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                  Number of weeks
                </label>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={disabled}
                    onClick={() => handleTotalWeeksChange(value.totalWeeks - 1)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition hover:bg-gray-50 disabled:opacity-40"
                    style={{ borderColor: '#dce1df', color: '#52636f' }}>
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <input type="number" min={1} max={MAX_WEEKS} value={value.totalWeeks}
                    onChange={e => handleTotalWeeksChange(parseInt(e.target.value) || 1)}
                    className={`${inputClass(false, ACCENT)} text-center`} disabled={disabled} />
                  <button type="button" disabled={disabled}
                    onClick={() => handleTotalWeeksChange(value.totalWeeks + 1)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition hover:bg-gray-50 disabled:opacity-40"
                    style={{ borderColor: '#dce1df', color: '#52636f' }}>
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs" style={{ color: '#8a9bab' }}>
            New sign-ups stop once every week has started (starts + {totalWeeks} week{totalWeeks !== 1 ? 's' : ''}).
            Anyone already subscribed keeps paying for the full run they joined for, even if that's after this date.
          </p>
        </div>
      </Section>

      {/* ── 2. Pricing ── */}
      <Section>
        <SectionHeader icon={<span className="text-sm">{sym}</span>} title="Pricing" accent={ACCENT} />
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium" style={{ color: '#102532' }}>
            <input type="checkbox" checked={value.isFree}
              onChange={e => set('isFree', e.target.checked)} disabled={disabled} />
            Free challenge — no Stripe payment required
          </label>
          {!value.isFree && (
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                Weekly price ({sym}) <span style={{ color: '#e9574f' }}>*</span>
              </label>
              <input type="number" min="0" step="0.01" placeholder="0.00"
                value={value.priceInput} onChange={e => set('priceInput', e.target.value)}
                className={inputClass(!!error && !value.isFree, ACCENT)} disabled={disabled} />
              <p className="mt-1 text-xs" style={{ color: '#8a9bab' }}>
                Charged weekly via Stripe from each subscriber's own join date.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* ── 3. Sponsors ── */}
      <Section>
        <SectionHeader icon={<span className="text-sm">🤝</span>} title="Sponsors" accent={ACCENT}
          subtitle="Optional — organisations supporting this challenge" />
        <div className="space-y-2">
          {value.sponsors.map((sponsor, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
              <input type="text" value={sponsor.name} disabled={disabled}
                onChange={e => set('sponsors', value.sponsors.map((s, idx) => idx === i ? { ...s, name: e.target.value } : s))}
                placeholder="Sponsor name" className={inputClass(false, ACCENT)} />
              <input type="text" value={sponsor.role ?? ''} disabled={disabled}
                onChange={e => set('sponsors', value.sponsors.map((s, idx) => idx === i ? { ...s, role: e.target.value } : s))}
                placeholder="Role (optional, e.g. Prize sponsor)" className={inputClass(false, ACCENT)} />
              <button type="button" disabled={disabled}
                onClick={() => set('sponsors', value.sponsors.filter((_, idx) => idx !== i))}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition hover:bg-gray-50 disabled:opacity-40"
                style={{ borderColor: '#dce1df', color: '#c8423b' }}>
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" disabled={disabled}
            onClick={() => set('sponsors', [...value.sponsors, { name: '', role: '' }])}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: '#dce1df', color: '#7c3aed' }}>
            <Plus className="h-3.5 w-3.5" />
            Add sponsor
          </button>
        </div>
      </Section>

      {/* ── 4. Week schedule ── */}
      {/* Create mode: no pickers — the backend auto-generates the schedule
          (see scheduleGeneratorService.js). Edit mode: the generated
          schedule is shown and stays tweakable per week while the
          challenge is a draft. */}
      <Section>
        <SectionHeader icon={<span className="text-sm">🧩</span>} title="Weekly puzzles" accent={ACCENT}
          subtitle={editMode
            ? 'What unlocks each week, in order — tweak any week while this is still a draft'
            : 'Picked for you'} />
        {editMode ? (
          <div className="space-y-2">
            {value.schedule.map((row, i) => (
              <div key={row.week} className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg p-2"
                style={{ background: '#fbf8f2', border: '1px solid #f1f0ee' }}>
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold"
                  style={{ background: 'rgba(124,58,237,0.12)', color: '#7c3aed' }}>
                  {row.week}
                </span>
                <select value={row.puzzleType} disabled={disabled}
                  onChange={e => updateWeek(i, 'puzzleType', e.target.value)}
                  className={selectCls()}>
                  {PUZZLE_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
                <select value={row.difficulty} disabled={disabled}
                  onChange={e => updateWeek(i, 'difficulty', e.target.value)}
                  className={selectCls()} style={{ width: 100 }}>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg p-4" style={{ background: '#fbf8f2', border: '1px solid #f1f0ee' }}>
            <p className="text-sm font-medium" style={{ color: '#102532' }}>
              🎲 We'll pick your {totalWeeks} puzzle{totalWeeks !== 1 ? 's' : ''} for you
            </p>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#52636f' }}>
              A different puzzle type every week, starting gentle and getting
              harder towards the finish. You can review and tweak individual
              weeks after creating, while the challenge is still a draft.
            </p>
          </div>
        )}
      </Section>

      {/* ── 5. Payment — Stripe only, nothing to choose ── */}
      {/* The shared locked notice (see PaymentMethodSelector.tsx). Only in
          create mode; the edit modal never showed it. */}
      {!editMode && (
        <PaymentMethodSelector
          mode="locked"
          value={{ ticketMethodIds: [], onnightMethodIds: [] }}
          onChange={() => {}}
          disabled={disabled}
        />
      )}

    </div>
  );
}