import { CalendarRange, Footprints, HandCoins, Plus, Trash2 } from 'lucide-react';
import PaymentMethodSelector, { type PaymentMethodSelection } from '../../../shared/PaymentMethodSelector';
import { Field, Section, SectionHeader, inputClass, ACCENTS } from '../../../shared/ui';
import type { ActivityStepProps } from '../../activityRegistry';

export type SponsoredActivityKind = 'walk' | 'run' | 'cycle' | 'swim' | 'readathon' | 'silence' | 'other';

export interface SponsoredActivityConfig {
  activityKind: SponsoredActivityKind;
  customActivityLabel: string;
  sponsorshipOpensAt: string;
  sponsorshipClosesAt: string;
  suggestedAmounts: string[];
  paymentMethods: PaymentMethodSelection;
}

export const defaultSponsoredActivityConfig = (): SponsoredActivityConfig => ({
  activityKind: 'walk',
  customActivityLabel: '',
  sponsorshipOpensAt: '',
  sponsorshipClosesAt: '',
  suggestedAmounts: ['10', '20', '50'],
  paymentMethods: { ticketMethodIds: [], onnightMethodIds: [] },
});

export function validateSponsoredActivityConfig(cfg: SponsoredActivityConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (cfg.activityKind === 'other' && !cfg.customActivityLabel.trim()) errors.customActivityLabel = 'Enter the activity name';
  if (!cfg.sponsorshipOpensAt) errors.sponsorshipOpensAt = 'Select when sponsorship opens';
  if (!cfg.sponsorshipClosesAt) errors.sponsorshipClosesAt = 'Select when sponsorship closes';
  if (cfg.sponsorshipOpensAt && cfg.sponsorshipClosesAt && new Date(cfg.sponsorshipClosesAt) <= new Date(cfg.sponsorshipOpensAt)) {
    errors.sponsorshipClosesAt = 'Sponsorship must close after it opens';
  }
  const amounts = cfg.suggestedAmounts.map(Number).filter(n => Number.isFinite(n) && n > 0);
  if (!amounts.length) errors.suggestedAmounts = 'Add at least one valid suggested amount';
  return errors;
}

const KINDS: Array<{ value: SponsoredActivityKind; label: string }> = [
  { value: 'walk', label: 'Sponsored Walk' }, { value: 'run', label: 'Sponsored Run' },
  { value: 'readathon', label: 'Readathon' }, { value: 'cycle', label: 'Sponsored Cycle' },
  { value: 'swim', label: 'Sponsored Swim' }, { value: 'silence', label: 'Sponsored Silence' },
  { value: 'other', label: 'Other' },
];

export default function SponsoredActivityStep({ value, onChange, disabled, errors, currency }: ActivityStepProps<SponsoredActivityConfig>) {
  const set = <K extends keyof SponsoredActivityConfig>(key: K, next: SponsoredActivityConfig[K]) => onChange({ ...value, [key]: next });
  const updateAmount = (index: number, amount: string) => set('suggestedAmounts', value.suggestedAmounts.map((v, i) => i === index ? amount : v));
  return <div className="space-y-4">
    <Section>
      <SectionHeader icon={<Footprints className="h-4 w-4" />} title="Sponsored activity" subtitle="Choose the activity the club is running" accent={ACCENTS.teal} />
      <div className="grid gap-3 sm:grid-cols-2">
        {KINDS.map(k => <button type="button" key={k.value} disabled={disabled} onClick={() => set('activityKind', k.value)}
          className="rounded-lg border px-3 py-3 text-left text-sm font-semibold"
          style={{ borderColor: value.activityKind === k.value ? ACCENTS.teal : '#dce1df', background: value.activityKind === k.value ? 'rgba(21,127,133,.08)' : '#fff', color: '#102532' }}>{k.label}</button>)}
      </div>
      {value.activityKind === 'other' && <div className="mt-4"><Field label="Activity name" required error={errors.customActivityLabel}>
        <input disabled={disabled} className={inputClass(errors.customActivityLabel)} value={value.customActivityLabel} onChange={e => set('customActivityLabel', e.target.value)} placeholder="e.g. Sponsored Dance Challenge" />
      </Field></div>}
    </Section>

    <Section>
      <SectionHeader icon={<CalendarRange className="h-4 w-4" />} title="Sponsorship window" subtitle="Sponsorship can open before the activity and stay open afterwards" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sponsorship opens" required error={errors.sponsorshipOpensAt}><input type="datetime-local" disabled={disabled} className={inputClass(errors.sponsorshipOpensAt)} value={value.sponsorshipOpensAt} onChange={e => set('sponsorshipOpensAt', e.target.value)} /></Field>
        <Field label="Sponsorship closes" required error={errors.sponsorshipClosesAt}><input type="datetime-local" disabled={disabled} className={inputClass(errors.sponsorshipClosesAt)} value={value.sponsorshipClosesAt} onChange={e => set('sponsorshipClosesAt', e.target.value)} /></Field>
      </div>
    </Section>

    <Section>
      <SectionHeader icon={<HandCoins className="h-4 w-4" />} title="Suggested sponsorship amounts" subtitle={`Supporters can always choose Other amount (${currency})`} />
      <div className="space-y-2">
        {value.suggestedAmounts.map((amount, i) => <div key={i} className="flex gap-2"><input type="number" min="1" step="1" disabled={disabled} className={inputClass(errors.suggestedAmounts)} value={amount} onChange={e => updateAmount(i, e.target.value)} /><button type="button" disabled={disabled || value.suggestedAmounts.length === 1} onClick={() => set('suggestedAmounts', value.suggestedAmounts.filter((_, x) => x !== i))} className="rounded-lg border px-3" style={{ borderColor: '#dce1df' }}><Trash2 className="h-4 w-4" /></button></div>)}
        {value.suggestedAmounts.length < 5 && <button type="button" disabled={disabled} onClick={() => set('suggestedAmounts', [...value.suggestedAmounts, ''])} className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: ACCENTS.teal }}><Plus className="h-4 w-4" />Add amount</button>}
        {errors.suggestedAmounts && <p className="text-xs text-red-600">{errors.suggestedAmounts}</p>}
      </div>
    </Section>

    <PaymentMethodSelector mode="single" value={value.paymentMethods} onChange={paymentMethods => set('paymentMethods', paymentMethods)} disabled={disabled} />
  </div>;
}