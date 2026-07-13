// src/components/mgtsystem/wizard/steps/activity/QuizActivityStep.tsx
//
// The BODY of the old ScheduleQuizModal, extracted for:
//   • step 3 of CreateFundraiserWizard (create)
//   • ScheduleQuizModal (edit — thin wrapper, passes editMode)
//
// UNLIKE the other activity steps, quiz config does NOT live in the
// wizard store: it lives in useQuizSetupStore (persisted separately
// under 'quiz-setup-v2'), exactly as the old modal worked, because the
// full Quiz Wizard elsewhere in the app shares the same store. The
// wizard's own config for this type is tiny:
//
//   { seeded: boolean, paymentMethods }
//
//   • seeded — create mode only. First arrival at this step hardResets
//     the quiz store (same as the old modal's mount effect) and stamps
//     currency; on wizard RESUME seeded is already true, so the quiz
//     store's own localStorage draft rehydrates untouched instead of
//     being wiped. (Known trade-off: if the standalone Quiz Wizard was
//     used in between, its edits show here — drafts are best-effort.)
//   • paymentMethods — kept in the wizard config, NOT in the quiz
//     store's setupConfig, because payment methods are a flat room
//     column (linked_payment_methods_json) written via
//     QuizPaymentMethodsService, deliberately separate from config_json.
//
// The event's date/timezone are synced INTO the quiz store whenever the
// draft event changes (create mode) — in the wizard the user can go back
// to step 2 and move the date, and the quiz config must follow. Edit
// mode never does this; the wrapper seeds from the room's config_json.

import { useEffect, useState } from 'react';
import {
  Sparkles, DollarSign, Trophy, Gift,
  Plus, Trash2, ChevronDown, ChevronUp,
  CheckCircle, Clock, Users, Tag,
} from 'lucide-react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import { fundraisingExtraDefinitions } from '@/components/Quiz/constants/quizMetadata';
import quizTemplates from '@/components/Quiz/constants/templates';
import { quizApi } from '@/shared/api';
import type { Prize, Web2FundraisingMode } from '@/components/Quiz/types/quiz';
import { utcToLocalInput, detectTimezone } from '../../../../../utils/dateUtils';
import { Section, SectionHeader, inputClass, ErrorBanner } from '../../../shared/ui';
import PaymentMethodSelector, { type PaymentMethodSelection } from '../../../shared/PaymentMethodSelector';
import { currencySymbol } from '../../../shared/CurrencySelect';
import type { ActivityStepProps } from '../../activityRegistry';

// ── Config shape + lifecycle (imported by the registry & edit modal) ─────────

export interface QuizWizardConfig {
  seeded:         boolean;
  paymentMethods: PaymentMethodSelection;
}

export const MAX_PRIZES = 10;

export function defaultQuizConfig(): QuizWizardConfig {
  return {
    seeded: false,
    paymentMethods: { ticketMethodIds: [], onnightMethodIds: [] },
  };
}

// Same rules as the old modal's validate() — reads the quiz store, since
// that's where the config actually lives.
export function validateQuizConfig(_cfg: QuizWizardConfig): Record<string, string> {
  const setupConfig = useQuizSetupStore.getState().setupConfig;
  const fundraisingMode = (setupConfig.fundraisingMode as Web2FundraisingMode) ?? 'fixed_fee';
  const isDonation = fundraisingMode === 'donation';
  const entryFee   = setupConfig.entryFee ?? '';
  const prizes: Prize[] = setupConfig.prizes ?? [];
  const opts   = setupConfig.fundraisingOptions ?? {};
  const prices = setupConfig.fundraisingPrices  ?? {};

  if (!setupConfig.selectedTemplate) return { form: 'Please select a quiz template' };
  if (!isDonation) {
    const fee = parseFloat(entryFee);
    if (!entryFee || isNaN(fee) || fee <= 0) return { form: 'Entry fee must be greater than 0' };
  }
  if (!isDonation) {
    const allExtras = Object.entries(fundraisingExtraDefinitions);
    const selectedExtras = allExtras.filter(([k]) => !!opts[k as keyof typeof opts]);
    const allPriced = selectedExtras.every(([k]) => {
      const p = prices[k as keyof typeof prices];
      return typeof p === 'number' && (p as number) > 0;
    });
    if (selectedExtras.length > 0 && !allPriced) return { form: 'Please set prices for all selected extras' };
  }
  if (prizes.length === 0 || !prizes[0]?.description?.trim()) {
    return { form: 'Please add at least a 1st place prize' };
  }
  return {};
}

// ── Helpers (verbatim from the old modal) ─────────────────────────────────────

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

function getTagValue(tags: string[], prefix: string): string | null {
  const tag = tags.find(t => t.startsWith(prefix));
  return tag ? tag.slice(prefix.length).trim() : null;
}

function difficultyColour(d: string) {
  if (d === 'Easy')   return { bg: '#dcfce7', text: '#166534' };
  if (d === 'Medium') return { bg: '#fef9c3', text: '#854d0e' };
  if (d === 'Hard')   return { bg: '#fee2e2', text: '#991b1b' };
  return { bg: '#f1f0ee', text: '#52636f' };
}

interface ExtraProps {
  /** Edit modal passes true: seeding is the wrapper's job, no entitlements line. */
  editMode?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function QuizActivityStep({
  value, onChange, draftEvent, disabled, errors, currency, editMode = false,
}: ActivityStepProps<QuizWizardConfig> & ExtraProps) {
  const { hardReset, setupConfig, updateSetupConfig, toggleExtra, setExtraPrice } = useQuizSetupStore();

  const sym   = currencySymbol(currency);
  const error = errors.form || null;

  const submitting = disabled;

  // ── Seed the quiz store on FIRST arrival (create mode only) ──────────────
  useEffect(() => {
    if (editMode || value.seeded) return;
    hardReset({ flow: 'web2' });
    updateSetupConfig({ currencySymbol: sym } as any);
    onChange({ ...value, seeded: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Keep the store's date/timezone aligned with the draft event ──────────
  // Runs on mount AND whenever the user changes the date back at step 2.
  useEffect(() => {
    if (editMode) return;
    const tz = draftEvent.time_zone || detectTimezone();
    const dt = draftEvent.start_datetime
      ? utcToLocalInput(draftEvent.start_datetime, tz)
      : draftEvent.event_date
      ? `${draftEvent.event_date}T19:00`
      : null;
    if (dt) {
      useQuizSetupStore.setState(s => ({
        setupConfig: { ...s.setupConfig, timeZone: tz, eventDateTime: dt } as any,
      }));
    }
  }, [draftEvent.start_datetime, draftEvent.event_date, draftEvent.time_zone, editMode]);

  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen]         = useState(() =>
    !useQuizSetupStore.getState().setupConfig.selectedTemplate);
  const [priceInputs, setPriceInputs]           = useState<Record<string, string>>({});
  const [entitlements, setEntitlements]         = useState<any>(null);

  useEffect(() => {
    if (editMode) return;
    quizApi.getEntitlements().then(setEntitlements).catch(() => setEntitlements(null));
  }, [editMode]);

  // Seed price inputs from persisted prices (edit mode and wizard resume).
  useEffect(() => {
    if (setupConfig.fundraisingPrices) {
      const initial: Record<string, string> = {};
      for (const [key, val] of Object.entries(setupConfig.fundraisingPrices)) {
        if (typeof val === 'number' && val > 0) initial[key] = String(val);
      }
      if (Object.keys(initial).length) setPriceInputs(initial);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fundraisingMode: Web2FundraisingMode = (setupConfig.fundraisingMode as Web2FundraisingMode) ?? 'fixed_fee';
  const isDonation       = fundraisingMode === 'donation';
  const entryFee         = setupConfig.entryFee ?? '';
  const selectedTemplate = setupConfig.selectedTemplate ?? '';
  const prizes: Prize[]  = setupConfig.prizes ?? [];
  const opts             = setupConfig.fundraisingOptions ?? {};
  const prices           = setupConfig.fundraisingPrices  ?? {};

  const allExtras = Object.entries(fundraisingExtraDefinitions);

  // If the template was cleared (e.g. by the seeding hardReset), make sure
  // the picker is open rather than showing an empty selected-card slot.
  useEffect(() => {
    if (!selectedTemplate && !templateOpen) setTemplateOpen(true);
  }, [selectedTemplate, templateOpen]);

  const handleModeChange = (mode: Web2FundraisingMode) => {
    updateSetupConfig({ fundraisingMode: mode, entryFee: mode === 'donation' ? '' : entryFee });
  };

  const handleSelectTemplate = (id: string) => {
    const t = quizTemplates.find(q => q.id === id);
    if (!t) return;
    const rounds = t.rounds.map((r, i) => ({
      roundNumber: i + 1, roundType: r.type, category: r.category,
      difficulty: r.difficulty, config: r.customConfig ?? {}, enabledExtras: {},
    }));
    updateSetupConfig({ selectedTemplate: id, roundDefinitions: rounds as any, skipRoundConfiguration: true });
    setTemplateOpen(false);
  };

  const handleChangeTemplate = () => {
    updateSetupConfig({ selectedTemplate: undefined, roundDefinitions: [] });
    setTemplateOpen(true);
  };

  const handleToggleExtra = (key: string) => {
    toggleExtra(key);
    if (opts[key as keyof typeof opts]) setPriceInputs(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handlePriceChange = (key: string, val: string) => {
    setPriceInputs(prev => ({ ...prev, [key]: val }));
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) setExtraPrice(key, num);
  };

  const handleAddPrize = () => {
    if (prizes.length >= MAX_PRIZES) return;
    updateSetupConfig({ prizes: [...prizes, { place: prizes.length + 1, description: '', sponsor: '', value: 0 }] });
  };

  const handlePrizeChange = <K extends keyof Prize>(i: number, field: K, val: Prize[K]) => {
    updateSetupConfig({ prizes: prizes.map((p, idx) => idx === i ? { ...p, [field]: val } : p) });
  };

  const handleRemovePrize = (i: number) => {
    updateSetupConfig({ prizes: prizes.filter((_, idx) => idx !== i).map((p, idx) => ({ ...p, place: idx + 1 })) });
  };

  const selectedTemplateMeta = quizTemplates.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-4">

      {error && <ErrorBanner message={error} />}

      {/* ── 1. Fundraising Mode ── */}
      <Section>
        <SectionHeader icon={<DollarSign className="h-4 w-4" />} title="Fundraising Model"
          subtitle="How will players contribute?" />
        <div className="grid grid-cols-2 gap-3">
          {([
            { mode: 'fixed_fee' as const, icon: <DollarSign className="h-4 w-4" />, label: 'Fixed Entry Fee', desc: 'Every player pays the same entry fee' },
            { mode: 'donation'  as const, icon: <Gift className="h-4 w-4" />,       label: 'Donation Based',  desc: 'Players donate any amount — or play free' },
          ]).map(({ mode, icon, label, desc }) => {
            const active = fundraisingMode === mode;
            return (
              <button key={mode} type="button" onClick={() => handleModeChange(mode)}
                className="rounded-xl border-2 p-4 text-left transition-all"
                style={active
                  ? { borderColor: '#157f85', background: 'rgba(21,127,133,0.08)' }
                  : { borderColor: '#dce1df', background: '#fff' }}>
                <div className="flex items-center gap-2 mb-1" style={{ color: active ? '#157f85' : '#8a9bab' }}>
                  {icon}
                  <p className="text-sm font-bold" style={{ color: active ? '#157f85' : '#102532' }}>{label}</p>
                </div>
                <p className="text-xs" style={{ color: '#52636f' }}>{desc}</p>
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── 2. Entry Fee ── */}
      <Section>
        <SectionHeader
          icon={<DollarSign className="h-4 w-4" />}
          title={isDonation ? 'Currency' : 'Entry Fee'}
          subtitle={
            isDonation
              ? `Currency: ${sym} (${currency}) — set by your club`
              : `Set the entry fee per player — currency: ${sym} (${currency})`
          }
        />
        {!isDonation && (
          <div className="max-w-[200px]">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
              Entry Fee <span style={{ color: '#e9574f' }}>*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
              <input
                type="number" min="0.01" step="0.01" placeholder="5.00"
                value={entryFee} onChange={e => updateSetupConfig({ entryFee: e.target.value })}
                className={`${inputClass()} pl-7`} disabled={submitting}
              />
            </div>
          </div>
        )}
        <p className="mt-2 text-xs" style={{ color: '#8a9bab' }}>
          Currency is set to your club's reporting currency. Change it in club settings.
        </p>
        {isDonation && (
          <p className="mt-2 text-xs rounded-lg px-3 py-2"
            style={{ background: 'rgba(21,127,133,0.08)', color: '#157f85' }}>
            All fundraising extras are automatically included for donation-based quizzes.
          </p>
        )}
      </Section>

      {/* ── 3. Fundraising Extras ── */}
      <Section>
        <SectionHeader icon={<Gift className="h-4 w-4" />} title="Fundraising Extras"
          subtitle={isDonation ? 'All extras included automatically' : 'Optional add-ons players can purchase'} />
        {isDonation ? (
          <div className="grid grid-cols-2 gap-2">
            {allExtras.map(([key, details]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                style={{ borderColor: 'rgba(21,127,133,0.3)', background: 'rgba(21,127,133,0.06)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{details.icon}</span>
                  <span className="text-xs font-medium" style={{ color: '#102532' }}>{details.label}</span>
                </div>
                <span className="text-xs font-semibold rounded-full px-2 py-0.5"
                  style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>Included</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {allExtras.map(([key, details]) => {
              const isSelected = !!opts[key as keyof typeof opts];
              const price = priceInputs[key] ??
                (typeof prices[key as keyof typeof prices] === 'number' ? String(prices[key as keyof typeof prices]) : '');
              const priceSet = typeof prices[key as keyof typeof prices] === 'number'
                && (prices[key as keyof typeof prices] as number) > 0;
              return (
                <div key={key} className="rounded-xl border-2 p-3 transition-all"
                  style={isSelected
                    ? { borderColor: priceSet ? '#86efac' : '#157f85', background: priceSet ? '#f0fdf4' : 'rgba(21,127,133,0.06)' }
                    : { borderColor: '#dce1df', background: '#fff' }}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg flex-shrink-0">{details.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#102532' }}>{details.label}</p>
                        <p className="text-xs" style={{ color: '#52636f' }}>{details.suggestedPrice}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="flex-shrink-0 text-xs font-bold rounded-full px-2 py-0.5"
                        style={{ background: priceSet ? '#bbf7d0' : 'rgba(21,127,133,0.12)', color: priceSet ? '#166534' : '#157f85' }}>
                        {priceSet ? '✓' : 'Selected'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mb-3" style={{ color: '#52636f' }}>{details.description}</p>
                  {isSelected ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium flex-shrink-0" style={{ color: '#52636f' }}>Price ({sym})</label>
                        <input type="number" min="0.01" step="0.01" placeholder="0.00"
                          value={price} onChange={e => handlePriceChange(key, e.target.value)}
                          className="flex-1 rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#157f85]"
                          style={{ borderColor: priceSet ? '#86efac' : '#dce1df' }}
                          disabled={submitting} />
                      </div>
                      <button type="button" onClick={() => handleToggleExtra(key)}
                        className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: '#8a9bab' }} disabled={submitting}>
                        <Trash2 className="h-3 w-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => handleToggleExtra(key)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition w-full justify-center"
                      style={{ background: 'rgba(21,127,133,0.10)', color: '#157f85' }}
                      disabled={submitting}>
                      <Plus className="h-3 w-3" /> Add Extra
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 4. Template ── */}
      <Section>
        <SectionHeader icon={<Sparkles className="h-4 w-4" />} title="Quiz Template"
          subtitle="Select a template to set your rounds" />
        {selectedTemplateMeta && !templateOpen && (
          <div className="rounded-xl border-2 p-4"
            style={{ borderColor: '#157f85', background: 'rgba(21,127,133,0.06)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#157f85' }} />
                  <p className="text-sm font-bold" style={{ color: '#157f85' }}>{selectedTemplateMeta.name}</p>
                </div>
                <p className="text-xs mb-2" style={{ color: '#52636f' }}>{selectedTemplateMeta.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ background: difficultyColour(selectedTemplateMeta.difficulty).bg, color: difficultyColour(selectedTemplateMeta.difficulty).text }}>
                    {selectedTemplateMeta.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                    style={{ background: '#f6f1e8', color: '#52636f' }}>
                    <Tag className="h-3 w-3" />{selectedTemplateMeta.rounds.length} rounds
                  </span>
                  {getTagValue(selectedTemplateMeta.tags, 'Duration:') && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                      style={{ background: '#f6f1e8', color: '#52636f' }}>
                      <Clock className="h-3 w-3" />{getTagValue(selectedTemplateMeta.tags, 'Duration:')}
                    </span>
                  )}
                </div>
              </div>
              <button type="button" onClick={handleChangeTemplate}
                className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:bg-gray-100"
                style={{ background: '#f6f1e8', color: '#52636f' }}
                disabled={submitting}>
                Change
              </button>
            </div>
          </div>
        )}
        {templateOpen && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {quizTemplates.map(t => {
              const isSelected = selectedTemplate === t.id;
              const isExpanded = expandedTemplate === t.id;
              const diff       = difficultyColour(t.difficulty);
              const duration   = getTagValue(t.tags, 'Duration:');
              const audience   = getTagValue(t.tags, 'Audience:');
              const topic      = getTagValue(t.tags, 'Topic:');
              return (
                <div key={t.id}
                  className="rounded-xl border-2 overflow-hidden cursor-pointer transition-all"
                  style={isSelected
                    ? { borderColor: '#157f85', background: 'rgba(21,127,133,0.06)' }
                    : { borderColor: '#dce1df', background: '#fff' }}
                  onClick={() => handleSelectTemplate(t.id)}>
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {isSelected && <CheckCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#157f85' }} />}
                        <p className="text-sm font-bold truncate"
                          style={{ color: isSelected ? '#157f85' : '#102532' }}>{t.name}</p>
                      </div>
                      <button type="button"
                        onClick={e => { e.stopPropagation(); setExpandedTemplate(isExpanded ? null : t.id); }}
                        className="flex-shrink-0 rounded p-1 hover:bg-gray-100" disabled={submitting}>
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" style={{ color: '#8a9bab' }} />
                          : <ChevronDown className="h-3.5 w-3.5" style={{ color: '#8a9bab' }} />}
                      </button>
                    </div>
                    <p className="text-xs mb-2" style={{ color: '#52636f' }}>{t.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ background: diff.bg, color: diff.text }}>{t.difficulty}</span>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                        style={{ background: '#f6f1e8', color: '#52636f' }}>
                        <Tag className="h-3 w-3" />{t.rounds.length} rounds
                      </span>
                      {duration && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                          style={{ background: '#f6f1e8', color: '#52636f' }}>
                          <Clock className="h-3 w-3" />{duration}
                        </span>
                      )}
                      {audience && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                          style={{ background: '#f6f1e8', color: '#52636f' }}>
                          <Users className="h-3 w-3" />{audience}
                        </span>
                      )}
                      {topic && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs"
                          style={{ background: '#f6f1e8', color: '#52636f' }}>{topic}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t" style={{ borderColor: '#f1f0ee', background: '#fbf8f2' }}>
                      <p className="text-xs font-semibold mt-2 mb-1.5" style={{ color: '#52636f' }}>Rounds:</p>
                      <div className="space-y-1">
                        {t.rounds.map((r, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                            <span className="flex h-4 w-4 items-center justify-center rounded text-xs font-bold flex-shrink-0"
                              style={{ background: '#dce1df', color: '#52636f' }}>{i + 1}</span>
                            <span className="font-medium" style={{ color: '#102532' }}>{r.category}</span>
                            <span style={{ color: '#8a9bab' }}>• {r.difficulty} • {r.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── 5. Prizes ── */}
      <Section>
        <SectionHeader icon={<Trophy className="h-4 w-4" />} title="Prizes"
          subtitle={`At least a 1st place prize is required — up to ${MAX_PRIZES} total`} />
        <div className="space-y-3">
          {prizes.map((prize, i) => (
            <div key={i} className="rounded-xl border p-3 space-y-2"
              style={{ borderColor: prize.description?.trim() ? '#86efac' : '#dce1df', background: prize.description?.trim() ? '#f0fdf4' : '#fff' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: '#157f85' }}>
                  {prize.place}{ordinal(prize.place)} Place
                </span>
                <button type="button" onClick={() => handleRemovePrize(i)}
                  className="rounded p-1 hover:bg-red-50" disabled={submitting}>
                  <Trash2 className="h-3.5 w-3.5 text-red-500" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                    Description <span style={{ color: '#e9574f' }}>*</span>
                  </label>
                  <input type="text" placeholder="e.g. Weekend away for two"
                    value={prize.description}
                    onChange={e => handlePrizeChange(i, 'description', e.target.value)}
                    className={inputClass()} disabled={submitting} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                    Value ({sym}) <span style={{ color: '#8a9bab' }}>(optional)</span>
                  </label>
                  <input type="number" min="0" step="0.01" placeholder="0.00"
                    value={prize.value ?? ''}
                    onChange={e => handlePrizeChange(i, 'value', parseFloat(e.target.value) || 0)}
                    className={inputClass()} disabled={submitting} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#52636f' }}>
                  Sponsor <span style={{ color: '#8a9bab' }}>(optional)</span>
                </label>
                <input type="text" placeholder="e.g. Local Business Name"
                  value={prize.sponsor ?? ''}
                  onChange={e => handlePrizeChange(i, 'sponsor', e.target.value)}
                  className={inputClass()} disabled={submitting} />
              </div>
            </div>
          ))}
          {prizes.length < MAX_PRIZES && (
            <button type="button" onClick={handleAddPrize}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition"
              style={{ background: '#f6f1e8', color: '#52636f' }}
              disabled={submitting}>
              <Plus className="h-3.5 w-3.5" />
              {prizes.length === 0 ? 'Add 1st Place Prize' : 'Add Another Prize'}
            </button>
          )}
        </div>
      </Section>

      {/* ── 6. Payment Methods ── */}
      {/* Kept in the WIZARD config, not the quiz store — see header. */}
      <PaymentMethodSelector
        mode="split"
        value={value.paymentMethods}
        onChange={pm => onChange({ ...value, paymentMethods: pm })}
        disabled={submitting}
      />

      {!editMode && entitlements && (
        <p className="text-xs px-1" style={{ color: '#8a9bab' }}>
          {entitlements.game_credits_remaining ?? 0} credits remaining — creating this quiz uses one credit.
        </p>
      )}

    </div>
  );
}