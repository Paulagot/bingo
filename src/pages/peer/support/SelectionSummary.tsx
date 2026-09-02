// SelectionSummary.tsx
// The running selection: cart lines + total + Continue + a "just donate" entry.
// One component, two placements - the desktop sticky rail and (optionally) the
// mobile surface - so the two never drift. Shows a friendly empty state so the
// donate action is always reachable even with an empty cart.

import { ArrowRight, Heart } from 'lucide-react';
import { asNumber, fmt } from './peerSupporthelpers';

type CartLine = { pack: any; quantity: number };

type Props = {
  cartItems: CartLine[];
  total: number;
  count: number;
  currency: string;
  canTransact: boolean;
  onContinue: () => void;
  onDonate: () => void;
};

export default function SelectionSummary({
  cartItems,
  total,
  count,
  currency,
  canTransact,
  onContinue,
  onDonate,
}: Props) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Your selection</p>

      {count > 0 ? (
        <>
          <div className="mt-3 space-y-2">
            {cartItems.map(item => (
              <div
                key={item.pack.id}
                className="flex justify-between gap-3 text-sm font-bold text-slate-700"
              >
                <span className="min-w-0 truncate">
                  {item.pack.name} ×{item.quantity}
                </span>
                <span className="shrink-0">
                  {fmt(asNumber(item.pack.price) * item.quantity, item.pack.currency ?? currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Total</span>
            <span className="text-2xl font-black tracking-tight text-slate-950">
              {fmt(total, currency)}
            </span>
          </div>
          <button
            type="button"
            onClick={onContinue}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20"
          >
            Continue <ArrowRight className="h-5 w-5" />
          </button>
        </>
      ) : (
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          No packs selected yet - choose one, or make a straight donation.
        </p>
      )}

      <button
        type="button"
        onClick={onDonate}
        disabled={!canTransact}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-black transition ${
          canTransact
            ? 'border-[var(--fr-primary)]/30 text-[var(--fr-primary)] hover:bg-orange-50'
            : 'cursor-not-allowed border-slate-200 text-slate-400'
        }`}
      >
        <Heart className="h-4 w-4" /> Just donate
      </button>
    </div>
  );
}