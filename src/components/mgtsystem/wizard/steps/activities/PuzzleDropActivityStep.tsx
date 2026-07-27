// src/components/mgtsystem/wizard/steps/activities/PuzzleDropActivityStep.tsx
//
// Step 3 of CreateFundraiserWizard for Puzzle Drop. Two repeatable lists:
//   - items:        which puzzles are for sale (type + difficulty each)
//   - pricingTiers:  how they're priced (e.g. "1 for €2", "3 for €5")
//
// Modeled structurally on SubscriptionActivityStep's sponsors array (the
// closest existing repeatable-list pattern using the shared Section/Field
// primitives — see spec §4.1, which names EliminationActivityStep as the
// structural model; Subscription's array-of-rows pattern is the closer
// fit here since Elimination's fields are all singular). No API calls, no
// submit button — config flows in/out via value/onChange like every other
// activity step.
//
// PaymentMethodSelector uses mode="single" (§4.2) — Drop has no advance/
// on-the-night split, just one purchase moment — and its selection is
// still stored under paymentMethods.onnightMethodIds, matching every
// other activity type's PaymentMethodSelection shape exactly (no new
// field introduced downstream).

import { Puzzle, Tag, Plus, Minus } from 'lucide-react';
import { Section, SectionHeader, Field, inputClass, ErrorBanner, ACCENTS } from '../../../shared/ui';
import PaymentMethodSelector, { type PaymentMethodSelection } from '../../../shared/PaymentMethodSelector';
import { currencySymbol } from '../../../shared/CurrencySelect';
import type { ActivityStepProps } from '../../activityRegistry';

// ── Config shape + lifecycle (imported by the registry) ───────────────────────

export interface PuzzleDropItemConfig {
  puzzleType: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PuzzleDropPricingTierConfig {
  quantity: string;   // kept as string in form state, parsed to number at createRoom
  price:    string;
  label:    string;
}

export interface PuzzleDropConfig {
  items:          PuzzleDropItemConfig[];
  pricingTiers:   PuzzleDropPricingTierConfig[];
  paymentMethods: PaymentMethodSelection;
}

// Same puzzle-type/difficulty lists SubscriptionActivityStep uses — kept
// as a local copy here rather than a shared import, since the two steps'
// config shapes are independent and the spec's own §11 file list doesn't
// name a shared constants module for this. If PUZZLE_TYPES/DIFFICULTIES
// ever need to change, both copies need updating together.
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

export function defaultPuzzleDropConfig(): PuzzleDropConfig {
  return {
    items: [{ puzzleType: 'anagram', difficulty: 'medium' }],
    pricingTiers: [{ quantity: '1', price: '', label: '' }],
    paymentMethods: { ticketMethodIds: [], onnightMethodIds: [] },
  };
}

export function validatePuzzleDropConfig(cfg: PuzzleDropConfig): Record<string, string> {
  const errs: Record<string, string> = {};

  if (!cfg.items.length) {
    errs.items = 'Add at least one puzzle item';
  }

  if (!cfg.pricingTiers.length) {
    errs.pricingTiers = 'Add at least one pricing tier';
  } else {
    const quantities = new Set<number>();
    for (const tier of cfg.pricingTiers) {
      const qty = Number(tier.quantity);
      const price = Number(tier.price);
      if (!Number.isInteger(qty) || qty < 1) {
        errs.pricingTiers = 'Every tier needs a whole-number quantity of at least 1';
        break;
      }
      if (qty > cfg.items.length) {
        errs.pricingTiers = `A tier can't ask for more items (${qty}) than you've added (${cfg.items.length})`;
        break;
      }
      if (!tier.price || isNaN(price) || price <= 0) {
        errs.pricingTiers = 'Every tier needs a price greater than 0';
        break;
      }
      if (quantities.has(qty)) {
        errs.pricingTiers = `You already have a tier for ${qty} item${qty !== 1 ? 's' : ''} — combine them or change the quantity`;
        break;
      }
      quantities.add(qty);
    }
  }

  return errs;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ACCENT = ACCENTS.orange;

const selectCls = () =>
  `w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#e08a2c] focus:border-transparent border-[#dce1df] bg-white hover:border-[#b8c6b0]`;

export default function PuzzleDropActivityStep({
  value, onChange, disabled, errors, currency,
}: ActivityStepProps<PuzzleDropConfig>) {
  const sym = currencySymbol(currency);
  const set = <K extends keyof PuzzleDropConfig>(key: K, v: PuzzleDropConfig[K]) =>
    onChange({ ...value, [key]: v });

  function updateItem(index: number, field: keyof PuzzleDropItemConfig, v: string) {
    set('items', value.items.map((row, i) => (i === index ? { ...row, [field]: v } : row)));
  }

  function addItem() {
    set('items', [...value.items, { puzzleType: 'anagram', difficulty: 'medium' }]);
  }

  function removeItem(index: number) {
    set('items', value.items.filter((_, i) => i !== index));
  }

  function updateTier(index: number, field: keyof PuzzleDropPricingTierConfig, v: string) {
    set('pricingTiers', value.pricingTiers.map((row, i) => (i === index ? { ...row, [field]: v } : row)));
  }

  function addTier() {
    set('pricingTiers', [...value.pricingTiers, { quantity: '', price: '', label: '' }]);
  }

  function removeTier(index: number) {
    set('pricingTiers', value.pricingTiers.filter((_, i) => i !== index));
  }

  const itemsError = errors.items || null;
  const tiersError = errors.pricingTiers || null;

  return (
    <div className="space-y-4">

      {/* ── 1. Puzzle items ── */}
      <Section>
        <SectionHeader
          icon={<Puzzle className="h-4 w-4" />}
          title="Puzzle items"
          subtitle="The individual puzzles buyers can unlock"
          accent={ACCENT}
        />
        {itemsError && <ErrorBanner message={itemsError} />}
        <div className="space-y-2 mt-3">
          {value.items.map((item, i) => (
            <div key={i} className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-lg p-2"
              style={{ background: '#fbf8f2', border: '1px solid #f1f0ee' }}>
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold"
                style={{ background: 'rgba(224,138,44,0.12)', color: '#e08a2c' }}>
                {i + 1}
              </span>
              <select value={item.puzzleType} disabled={disabled}
                onChange={e => updateItem(i, 'puzzleType', e.target.value)}
                className={selectCls()}>
                {PUZZLE_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
              <select value={item.difficulty} disabled={disabled}
                onChange={e => updateItem(i, 'difficulty', e.target.value)}
                className={selectCls()} style={{ width: 100 }}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button type="button" disabled={disabled || value.items.length <= 1}
                onClick={() => removeItem(i)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition hover:bg-gray-50 disabled:opacity-40"
                style={{ borderColor: '#dce1df', color: '#c8423b' }}>
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" disabled={disabled}
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: '#dce1df', color: '#e08a2c' }}>
            <Plus className="h-3.5 w-3.5" />
            Add puzzle item
          </button>
        </div>
      </Section>

      {/* ── 2. Pricing tiers ── */}
      <Section>
        <SectionHeader
          icon={<span className="text-sm">{sym}</span>}
          title="Pricing tiers"
          subtitle='e.g. "1 puzzle for €2", "3 for €5"'
          accent={ACCENT}
        />
        {tiersError && <ErrorBanner message={tiersError} />}
        <div className="space-y-2 mt-3">
          {value.pricingTiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_1fr_auto] items-center gap-2 rounded-lg p-2"
              style={{ background: '#fbf8f2', border: '1px solid #f1f0ee' }}>
              <input type="number" min="1" step="1" placeholder="Qty"
                value={tier.quantity} disabled={disabled}
                onChange={e => updateTier(i, 'quantity', e.target.value)}
                className={inputClass(false, ACCENT)} />
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
                <input type="number" min="0" step="0.01" placeholder="0.00"
                  value={tier.price} disabled={disabled}
                  onChange={e => updateTier(i, 'price', e.target.value)}
                  className={`${inputClass(false, ACCENT)} pl-7`} />
              </div>
              <input type="text" placeholder="Label (optional)"
                value={tier.label} disabled={disabled}
                onChange={e => updateTier(i, 'label', e.target.value)}
                className={inputClass(false, ACCENT)} />
              <button type="button" disabled={disabled || value.pricingTiers.length <= 1}
                onClick={() => removeTier(i)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border transition hover:bg-gray-50 disabled:opacity-40"
                style={{ borderColor: '#dce1df', color: '#c8423b' }}>
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button type="button" disabled={disabled}
            onClick={addTier}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: '#dce1df', color: '#e08a2c' }}>
            <Plus className="h-3.5 w-3.5" />
            Add pricing tier
          </button>
        </div>
      </Section>

      {/* ── 3. Payment methods — single mode, no advance/on-the-night split ── */}
      <PaymentMethodSelector
        mode="single"
        value={value.paymentMethods}
        onChange={pm => set('paymentMethods', pm)}
        disabled={disabled}
      />

    </div>
  );
}