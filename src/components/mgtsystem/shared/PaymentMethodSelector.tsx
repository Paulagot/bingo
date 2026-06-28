// src/components/mgtsystem/shared/PaymentMethodSelector.tsx
//
// Shared payment-method picker used by every "Schedule <Activity>" modal
// (Elimination, Quiz, Ticketed Event, and — once built — Puzzle Drop).
//
// This used to live inline in CreateEventForm.tsx and wrote straight onto
// the EVENT. It has been moved here because payment methods are now an
// ACTIVITY-level concern: the event form no longer asks the question at
// all, since at that point in the flow the activity type isn't known yet
// (see CreateEventForm.tsx — the Payment Methods section has been removed).
//
// Each Schedule*Modal now decides, via the `mode` prop, what this component
// should actually show and collect:
//
//   mode="split"    → full picker, two columns (Tickets / On the Night).
//                      Used by Elimination, Quiz, Ticketed Event — anything
//                      with a genuine "buy in advance vs pay at the door"
//                      distinction.
//
//   mode="single"   → same picker, ONE column, no advance/on-the-night
//                      split. Used by Puzzle Drop — there's no "event
//                      night" to be in advance of, just one purchase moment.
//
//   mode="locked"   → no picker at all. Renders a fixed notice instead.
//                      Used by Puzzle Subscription Challenges — recurring
//                      billing only works with Stripe, full stop, so there
//                      is no club choice to make here.
//
// The modal is responsible for sending whatever this component reports
// (via onChange) directly to its own schedule/update service call — e.g.
// eliminationMgmtService.scheduleRoom({ ..., ticketMethodIds, onnightMethodIds }).
// This component does NOT call any API to save anything itself; it only
// fetches the club's available methods and reports selection state up.

import { useEffect, useState } from 'react';
import { CreditCard, AlertCircle, CheckSquare, Square, Lock } from 'lucide-react';
import { quizPaymentMethodsService } from '../services/QuizPaymentMethodsService';
import type { PaymentMethod } from '../services/QuizPaymentMethodsService';

export type PaymentMethodSelectorMode = 'split' | 'single' | 'locked';

export interface PaymentMethodSelection {
  ticketMethodIds: number[];
  onnightMethodIds: number[];
}

interface PaymentMethodSelectorProps {
  mode: PaymentMethodSelectorMode;
  value: PaymentMethodSelection;
  onChange: (next: PaymentMethodSelection) => void;
  disabled?: boolean;
  /** Shown in the "locked" mode notice and as a default subtitle elsewhere. */
  lockedReason?: string;
}

// ── Helpers (moved verbatim from CreateEventForm.tsx) ──────────────────────

function isOnnightOnly(method: PaymentMethod): boolean {
  const provider = String(method.provider_name || '').toLowerCase();
  return provider === 'cash' || provider === 'card_tap';
}

function getMethodSubtitle(method: PaymentMethod): string {
  const cat = method.method_category;
  if (cat === 'stripe') return 'Online card payment via Stripe';
  if (cat === 'crypto') return 'Crypto / Web3 payment';
  if (cat === 'instant_payment') return method.player_instructions || 'Instant transfer (Revolut, bank, etc.)';
  if (method.provider_name === 'cash') return 'Collected at the door';
  if (method.provider_name === 'card_tap') return 'Card tap on the night';
  return method.provider_name || '';
}

// ── Section wrapper — matches the existing modal/form Section style ───────

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
      style={{ background: 'rgba(21,127,133,0.12)', color: '#157f85' }}>
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-bold" style={{ color: '#102532' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>{subtitle}</p>}
    </div>
  </div>
);

// ── Main component ──────────────────────────────────────────────────────────

export default function PaymentMethodSelector({
  mode,
  value,
  onChange,
  disabled = false,
  lockedReason = 'Subscriptions require a saved card for recurring billing, so payment is always handled via Stripe. There is no method to choose here.',
}: PaymentMethodSelectorProps) {
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "locked" mode never needs the club's methods at all — skip the fetch.
  useEffect(() => {
    if (mode === 'locked') return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    quizPaymentMethodsService.listAvailablePaymentMethods()
      .then(res => {
        if (cancelled) return;
        setAvailableMethods((res.payment_methods || []).filter((m: PaymentMethod) => m.is_enabled));
      })
      .catch(() => { if (!cancelled) setError('Could not load payment methods.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode]);

  const toggleTicket = (id: number) => {
    const next = value.ticketMethodIds.includes(id)
      ? value.ticketMethodIds.filter(x => x !== id)
      : [...value.ticketMethodIds, id];
    onChange({ ...value, ticketMethodIds: next });
  };

  const toggleOnnight = (id: number) => {
    const next = value.onnightMethodIds.includes(id)
      ? value.onnightMethodIds.filter(x => x !== id)
      : [...value.onnightMethodIds, id];
    onChange({ ...value, onnightMethodIds: next });
  };

  // In "single" mode we still store selections in onnightMethodIds — it's
  // the one list that already means "available at the point of payment"
  // for every existing activity type. Keeping the same field avoids a third
  // shape downstream; the modal just never sends ticketMethodIds for a
  // single-mode activity. Functionally identical to toggleOnnight, kept as
  // a separate name purely so call sites read clearly in single mode.
  const toggleSingle = toggleOnnight;

  // ── Locked mode — no picker, just a fixed notice ──────────────────────────
  if (mode === 'locked') {
    return (
      <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
        <SectionHeader
          icon={<Lock className="h-4 w-4" />}
          title="Payment Method"
          subtitle="Stripe is required for this activity type"
        />
        <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
          style={{ background: '#f6f1e8', borderColor: '#dce1df' }}>
          <CreditCard className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#157f85' }} />
          <p className="text-sm" style={{ color: '#52636f' }}>{lockedReason}</p>
        </div>
      </div>
    );
  }

  const isSplit = mode === 'split';

  return (
    <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
      <SectionHeader
        icon={<CreditCard className="h-4 w-4" />}
        title="Payment Methods"
        subtitle={isSplit
          ? 'Choose which methods players can use for tickets and on the night'
          : 'Choose which methods supporters can use to pay'}
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm py-4" style={{ color: '#8a9bab' }}>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading payment methods…
        </div>
      )}

      {error && (
        <p className="text-sm flex items-center gap-1.5 py-2" style={{ color: '#e9574f' }}>
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </p>
      )}

      {!loading && !error && availableMethods.length === 0 && (
        <div className="rounded-lg border border-dashed px-4 py-5 text-center text-sm"
          style={{ borderColor: '#dce1df', color: '#8a9bab' }}>
          No payment methods set up yet. You can add them from the dashboard.
        </div>
      )}

      {!loading && availableMethods.length > 0 && isSplit && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#dce1df' }}>
          <div className="grid grid-cols-[1fr_90px_110px] text-xs font-semibold px-4 py-2.5"
            style={{ background: '#f6f1e8', color: '#52636f', borderBottom: '1px solid #dce1df' }}>
            <span>Method</span>
            <span className="text-center">Tickets</span>
            <span className="text-center">On the Night</span>
          </div>
          {availableMethods.map((method, i) => {
            const onnightOnly    = isOnnightOnly(method);
            const ticketChecked  = value.ticketMethodIds.includes(method.id);
            const onnightChecked = value.onnightMethodIds.includes(method.id);
            const isLast = i === availableMethods.length - 1;
            return (
              <div key={method.id}
                className="grid grid-cols-[1fr_90px_110px] items-center px-4 py-3"
                style={{ borderBottom: isLast ? 'none' : '1px solid #f1f0ee', background: '#ffffff' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#102532' }}>{method.method_label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8a9bab' }}>{getMethodSubtitle(method)}</p>
                </div>
                <div className="flex justify-center">
                  <button type="button" disabled={onnightOnly || disabled}
                    onClick={() => toggleTicket(method.id)}
                    title={onnightOnly ? 'Cash and card-tap payments can only be collected on the night' : ''}
                    className="flex items-center justify-center transition"
                    style={{ opacity: onnightOnly ? 0.3 : 1, cursor: onnightOnly ? 'not-allowed' : 'pointer' }}>
                    {ticketChecked && !onnightOnly
                      ? <CheckSquare className="h-5 w-5" style={{ color: '#157f85' }} />
                      : <Square className="h-5 w-5" style={{ color: '#b8c6b0' }} />}
                  </button>
                </div>
                <div className="flex justify-center">
                  <button type="button" disabled={disabled}
                    onClick={() => toggleOnnight(method.id)}
                    className="flex items-center justify-center transition"
                    style={{ cursor: 'pointer' }}>
                    {onnightChecked
                      ? <CheckSquare className="h-5 w-5" style={{ color: '#157f85' }} />
                      : <Square className="h-5 w-5" style={{ color: '#b8c6b0' }} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && availableMethods.length > 0 && !isSplit && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#dce1df' }}>
          <div className="grid grid-cols-[1fr_110px] text-xs font-semibold px-4 py-2.5"
            style={{ background: '#f6f1e8', color: '#52636f', borderBottom: '1px solid #dce1df' }}>
            <span>Method</span>
            <span className="text-center">Available</span>
          </div>
          {availableMethods.map((method, i) => {
            const checked = value.onnightMethodIds.includes(method.id);
            const isLast = i === availableMethods.length - 1;
            return (
              <div key={method.id}
                className="grid grid-cols-[1fr_110px] items-center px-4 py-3"
                style={{ borderBottom: isLast ? 'none' : '1px solid #f1f0ee', background: '#ffffff' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#102532' }}>{method.method_label}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#8a9bab' }}>{getMethodSubtitle(method)}</p>
                </div>
                <div className="flex justify-center">
                  <button type="button" disabled={disabled}
                    onClick={() => toggleSingle(method.id)}
                    className="flex items-center justify-center transition"
                    style={{ cursor: 'pointer' }}>
                    {checked
                      ? <CheckSquare className="h-5 w-5" style={{ color: '#157f85' }} />
                      : <Square className="h-5 w-5" style={{ color: '#b8c6b0' }} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}