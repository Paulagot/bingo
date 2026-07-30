// src/components/mgtsystem/wizard/steps/activity/EliminationActivityStep.tsx
//
// The BODY of the old ScheduleEliminationModal, extracted so it can be
// rendered in two places without drifting apart:
//   • step 3 of CreateFundraiserWizard (create - submit handled by
//     submitChain.ts via the registry's createRoom)
//   • ScheduleEliminationModal (edit - the modal is now a thin wrapper
//     that owns the update API call and renders this for the fields)
//
// This component owns NO API calls and NO submit button. It receives its
// config via value/onChange (controlled), field errors from the registry
// validate(), and reads event context from draftEvent.

import { DollarSign, Trophy, Tag } from 'lucide-react';
import { Section, SectionHeader, Field, inputClass, ACCENTS } from '../../../shared/ui';
import PaymentMethodSelector, { type PaymentMethodSelection } from '../../../shared/PaymentMethodSelector';
import { currencySymbol } from '../../../shared/CurrencySelect';
import type { ActivityStepProps } from '../../activityRegistry';// ── Config shape + lifecycle (imported by the registry) ───────────────────────

export interface EliminationConfig {
  entryFee:         string;
  prizeDescription: string;
  prizeValue:       string;
  prizeSponsor:     string;
  paymentMethods:   PaymentMethodSelection;
}

export function defaultEliminationConfig(): EliminationConfig {
  return {
    entryFee: '', prizeDescription: '', prizeValue: '', prizeSponsor: '',
    paymentMethods: { ticketMethodIds: [], onnightMethodIds: [] },
  };
}

// Same rules the old modal's validate() enforced.
export function validateEliminationConfig(cfg: EliminationConfig): Record<string, string> {
  const errs: Record<string, string> = {};
  const fee = Number(cfg.entryFee);
  if (!cfg.entryFee || isNaN(fee) || fee <= 0) errs.entryFee = 'Entry fee must be a positive number';
  if (!cfg.prizeDescription.trim()) errs.prizeDescription = 'Prize description is required';
  if (cfg.prizeValue) {
    const pv = Number(cfg.prizeValue);
    if (isNaN(pv) || pv < 0) errs.prizeValue = 'Prize value must be a positive number';
  }
  return errs;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ACCENT = ACCENTS.red;

export default function EliminationActivityStep({
  value, onChange, disabled, errors, currency,
}: ActivityStepProps<EliminationConfig>) {
  const sym = currencySymbol(currency);
  const set = <K extends keyof EliminationConfig>(key: K, v: EliminationConfig[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4">

      {/* ── Entry Fee ── */}
      <Section>
        <SectionHeader
          icon={<DollarSign className="h-4 w-4" />}
          title="Entry Fee"
          subtitle={`Set the entry fee per player - currency: ${sym} (${currency})`}
          accent={ACCENT}
        />
        <Field label="Amount" required error={errors.entryFee}>
          <div className="relative">
            <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
            <input
              type="number" min="0.01" step="0.01" placeholder="5.00"
              value={value.entryFee} onChange={e => set('entryFee', e.target.value)}
              className={`${inputClass(!!errors.entryFee, ACCENT)} pl-7`}
              disabled={disabled}
            />
          </div>
          <p className="mt-1.5 text-xs" style={{ color: '#8a9bab' }}>
            Currency is set to your club's reporting currency. Change it in club settings.
          </p>
        </Field>
      </Section>

      {/* ── Prize ── */}
      <Section>
        <SectionHeader
          icon={<Trophy className="h-4 w-4" />}
          title="Prize"
          subtitle="The prize for the last player standing"
          accent={ACCENT}
        />
        <div className="space-y-4">
          <Field label="Prize Description" required error={errors.prizeDescription}>
            <input
              type="text" maxLength={500} placeholder="e.g. Weekend away for two"
              value={value.prizeDescription} onChange={e => set('prizeDescription', e.target.value)}
              className={inputClass(!!errors.prizeDescription, ACCENT)}
              disabled={disabled}
            />
          </Field>

          <Field label="Prize Value" hint="(optional)" error={errors.prizeValue}>
            <div className="relative">
              <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
              <input
                type="number" min="0" step="0.01" placeholder="500.00"
                value={value.prizeValue} onChange={e => set('prizeValue', e.target.value)}
                className={`${inputClass(!!errors.prizeValue, ACCENT)} pl-7`}
                disabled={disabled}
              />
            </div>
          </Field>

          <Field label="Sponsor" hint="(optional)">
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 h-4 w-4" style={{ color: '#e9574f' }} />
              <input
                type="text" maxLength={200} placeholder="e.g. Buddies for Paws"
                value={value.prizeSponsor} onChange={e => set('prizeSponsor', e.target.value)}
                className={`${inputClass(false, ACCENT)} pl-9`}
                disabled={disabled}
              />
            </div>
            <p className="mt-1.5 text-xs" style={{ color: '#8a9bab' }}>
              Shown on the end game screen alongside the winner's name.
            </p>
          </Field>
        </div>
      </Section>

      {/* ── Payment Methods ── */}
      {/* Activity-level, written directly onto the room by scheduleRoom /
          updateRoom - never onto the event. See PaymentMethodSelector.tsx. */}
      <PaymentMethodSelector
        mode="split"
        value={value.paymentMethods}
        onChange={pm => set('paymentMethods', pm)}
        disabled={disabled}
      />

    </div>
  );
}