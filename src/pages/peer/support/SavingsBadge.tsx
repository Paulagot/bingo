// SavingsBadge.tsx
// Turns the pack's configuredValue / discountAmount (both in metadata_json) into
// an honest "was €28, now €25 · Save €3" badge. Prefers an explicit
// discountAmount; otherwise derives it from configuredValue − price. Renders
// nothing when there's no real saving to show.

import { asNumber, fmt } from './peerSupporthelpers';

type Money = string | number | null | undefined;

type Props = {
  price: Money;
  configuredValue?: Money;
  discountAmount?: Money;
  currency: string;
  className?: string;
};

export default function SavingsBadge({
  price,
  configuredValue,
  discountAmount,
  currency,
  className = '',
}: Props) {
  const priceN = asNumber(price);
  const valueN = asNumber(configuredValue);
  const explicit = asNumber(discountAmount);
  const saving = explicit > 0 ? explicit : Math.max(0, valueN - priceN);

  if (!(saving > 0)) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[var(--fr-primary)] ring-1 ring-orange-100 ${className}`}
    >
      {valueN > priceN && (
        <span className="font-bold text-slate-400 line-through">{fmt(valueN, currency)}</span>
      )}
      <span>Save {fmt(saving, currency)}</span>
    </span>
  );
}