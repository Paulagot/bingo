// src/pages/peer/PeerSupportPage.tsx
//
// Public peer fundraiser support page. Previously this hardcoded
// paymentMethodCategory to 'cash_to_participant' regardless of what the
// club had linked via PeerPaymentsTab, showed no payment method choice,
// no event details, and ended on a single-line "done" screen with no
// order detail or join links.
//
// Flow: packs -> details -> payment -> instructions (manual methods only)
// -> confirm. Stripe skips 'instructions' and redirects to Checkout.
//
// Crypto is intentionally NOT offered here yet — peer has no crypto
// verification path built (campaign's CryptoFixedFeeStep / verification
// service has no peer equivalent). Crypto methods are filtered out of the
// selectable list with a short note, tracked as separate follow-up work.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, CalendarDays, Copy, Check } from 'lucide-react';
import api from '../../services/PeerSupportService';
import type {
  PublicPeerPaymentMethod,
  PeerOrderSummary,
  PeerGeneratedEntry,
} from '../../services/PeerSupportService';
import PeerOrderThankYou from '../../components/peer/PeerOrderThankYou';

type Step = 'packs' | 'details' | 'payment' | 'instructions' | 'confirm';

function fmt(amount: number, currency = 'EUR') {
  const s: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  return `${s[currency] ?? currency}${Number(amount).toFixed(2)}`;
}

function formatEventDate(iso?: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return null;
  }
}

function friendlyOrderError(message: string): string {
  if (message === 'pack_not_available') return "One of the packs in your cart is no longer available (its sales window may have closed). Please go back and check your selection.";
  if (message === 'pack_sold_out') return 'One of the packs in your cart just sold out. Please go back and adjust your selection.';
  return message || 'Something went wrong. Please try again.';
}

function generateReference(): string {
  return `PF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function methodIcon(category: string) {
  if (category === 'stripe') return '💳';
  if (category === 'crypto') return '🔗';
  if (category === 'instant_payment' || category === 'bank_transfer') return '📱';
  return '💰';
}

function isAutoConfirmed(category: string) {
  return category === 'stripe' || category === 'crypto';
}

export default function PeerSupportPage() {
  const { clubSlug = '', fundraiserSlug = '', participantSlug } = useParams();
  const [searchParams] = useSearchParams();

  const [d, setD] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [step, setStep] = useState<Step>('packs');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [methods, setMethods] = useState<PublicPeerPaymentMethod[]>([]);
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PublicPeerPaymentMethod | null>(null);
  const [reference, setReference] = useState('');

  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<PeerOrderSummary | null>(null);
  const [entries, setEntries] = useState<PeerGeneratedEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cancelled = searchParams.get('cancelled') === '1';

  useEffect(() => {
    api.page(clubSlug, fundraiserSlug, participantSlug)
      .then(setD)
      .catch(err => setLoadError(err.message || 'Could not load this fundraiser.'));
  }, [clubSlug, fundraiserSlug, participantSlug]);

  const total = useMemo(
    () => (d ? d.packs.reduce((s: number, p: any) => s + Number(p.price) * Number(cart[p.id] || 0), 0) : 0),
    [d, cart]
  );
  const cartCount = useMemo(() => Object.values(cart).reduce((s, q) => s + q, 0), [cart]);
  const currency = d?.fundraiser?.currency || 'EUR';

  // Load payment methods once the supporter moves past product selection —
  // no point fetching them before we know there's anything to pay for.
  const [methodsError, setMethodsError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 'payment' || methodsLoaded || !d?.fundraiser?.id) return;
    api.paymentMethods(d.fundraiser.id)
      .then(res => {
        setMethods(res.paymentMethods.filter(m => m.methodCategory !== 'crypto'));
        setMethodsLoaded(true);
      })
      .catch(err => {
        // Previously this silently swallowed ANY failure (network error,
        // 404, 500) and just showed the same "hasn't set up online
        // payments" message as a genuinely-empty list — impossible to
        // tell a real bug apart from a fundraiser that legitimately has
        // no methods linked yet.
        setMethodsError(err?.message || 'Could not load payment options.');
        setMethodsLoaded(true);
      });
  }, [step, methodsLoaded, d]);

  if (loadError) {
    return (
      <main className="grid min-h-screen place-items-center bg-orange-50 p-6 text-center">
        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <p className="font-bold text-slate-700">{loadError}</p>
        </div>
      </main>
    );
  }
  if (!d) return <main className="grid min-h-screen place-items-center p-8 font-bold text-slate-500"><Loader2 className="mr-2 inline h-5 w-5 animate-spin" />Loading…</main>;

  const title = d.participant ? `Support ${d.participant.participant_name}` : `Support ${d.club.name}`;

  async function createOrderAndProceed() {
    if (!selectedMethod) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const items = Object.entries(cart).filter(([, q]) => q > 0).map(([packId, quantity]) => ({ packId, quantity }));
      const result = await api.order(d.fundraiser.id, {
        participantId: d.participant?.id || null,
        supporterName: name,
        supporterEmail: email,
        supporterPhone: phone || null,
        paymentMethodCategory: selectedMethod.methodCategory,
        clubPaymentMethodId: selectedMethod.id,
        paymentProvider: selectedMethod.providerName || null,
        items,
      });
      setOrderId(result.orderId);

      if (selectedMethod.methodCategory === 'stripe') {
        const checkout = await api.stripeCheckout(result.orderId);
        const url = checkout.url || checkout.checkoutUrl;
        if (url) { window.location.href = url; return; }
        throw new Error('Could not start card checkout — please try again.');
      }

      // Manual method — show instructions/reference before the supporter
      // confirms they've actually paid.
      setReference(generateReference());
      setStep('instructions');
    } catch (err: any) {
      setFormError(friendlyOrderError(err.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmManualPayment() {
    if (!orderId) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await api.claim(orderId, {
        paymentReference: reference || null,
        clubPaymentMethodId: selectedMethod?.id || null,
      });
      const summary = await api.getOrderSummary(orderId);
      setOrderSummary(summary.order);
      setEntries(summary.entries);
      setStep('confirm');
    } catch (err: any) {
      setFormError(err.message || 'Could not confirm your payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-orange-50 p-4">
      <div className="mx-auto max-w-lg pb-28">
        <header className="rounded-3xl bg-white p-6 text-center shadow-sm">
          {d.club.logo_url && <img src={d.club.logo_url} className="mx-auto h-20 w-20 object-contain" />}
          <p className="mt-3 text-sm font-black uppercase text-orange-600">{d.club.name}</p>
          <h1 className="mt-2 text-3xl font-black">{title}</h1>
          <p className="mt-2 text-slate-500">{d.fundraiser.name}</p>
        </header>

        {cancelled && step === 'packs' && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-100">
            Checkout was cancelled — your card was not charged. Pick a pack below to try again.
          </div>
        )}

        {/* ── Step: pick packs ── */}
        {step === 'packs' && (
          <>
            <section className="mt-5 space-y-3">
              {d.packs.map((p: any) => (
                <article key={p.id} className="rounded-3xl bg-white p-5 shadow-sm">
                  <div className="flex justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-black">{p.name}</h2>
                      <p className="text-sm text-slate-500">{p.description}</p>
                    </div>
                    <b className="shrink-0 text-xl">{fmt(p.price, currency)}</b>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                    {p.items.map((i: any) => {
                      const when = formatEventDate(i.room?.scheduledAt);
                      return (
                        <li key={i.id} className="flex items-center gap-1.5">
                          <span>{i.quantity} × {i.room?.name || i.target_room_id}</span>
                          {when && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400">
                              <CalendarDays className="h-3.5 w-3.5" />{when}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 flex justify-end gap-3">
                    <button onClick={() => setCart(x => ({ ...x, [p.id]: Math.max(0, (x[p.id] || 0) - 1) }))} className="rounded-full border px-3">−</button>
                    <b>{cart[p.id] || 0}</b>
                    <button onClick={() => setCart(x => ({ ...x, [p.id]: (x[p.id] || 0) + 1 }))} className="rounded-full bg-orange-500 px-3 text-white">+</button>
                  </div>
                </article>
              ))}
              {d.packs.length === 0 && (
                <p className="rounded-2xl bg-white p-5 text-center text-sm font-semibold text-slate-500 shadow-sm">
                  No packs are available right now — check back soon.
                </p>
              )}
            </section>
            <button
              disabled={total <= 0}
              onClick={() => setStep('details')}
              className="mt-5 w-full rounded-2xl bg-slate-950 p-4 font-black text-white disabled:opacity-40"
            >
              Continue · {cartCount} item{cartCount === 1 ? '' : 's'} · {fmt(total, currency)}
            </button>
          </>
        )}

        {/* ── Step: supporter details ── */}
        {step === 'details' && (
          <section className="mt-5 rounded-3xl bg-white p-6">
            <h2 className="text-xl font-black">Your details</h2>
            <input className="mt-4 w-full rounded-xl border p-3" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            <input className="mt-3 w-full rounded-xl border p-3" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" inputMode="email" />
            <input className="mt-3 w-full rounded-xl border p-3" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)" />
            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep('packs')} className="rounded-2xl border px-5 py-4 font-black text-slate-700">Back</button>
              <button
                disabled={!name.trim() || !email.trim()}
                onClick={() => setStep('payment')}
                className="flex-1 rounded-2xl bg-orange-500 p-4 font-black text-white disabled:opacity-40"
              >
                Continue · {fmt(total, currency)}
              </button>
            </div>
          </section>
        )}

        {/* ── Step: choose payment method ── */}
        {step === 'payment' && (
          <section className="mt-5 rounded-3xl bg-white p-6">
            <h2 className="text-xl font-black">How would you like to pay?</h2>

            {!methodsLoaded && (
              <div className="mt-6 flex items-center justify-center gap-2 py-6 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Loading payment options…
              </div>
            )}

            {methodsLoaded && methodsError && (
              <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800 ring-1 ring-red-100">
                Couldn't load payment options ({methodsError}). Please try refreshing the page.
              </p>
            )}

            {methodsLoaded && !methodsError && methods.length === 0 && (
              <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-100">
                This fundraiser hasn't set up online payments yet. Please contact the club directly to arrange payment.
              </p>
            )}

            <div className="mt-4 space-y-3">
              {methods.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left ${selectedMethod?.id === m.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}
                >
                  <span className="text-xl">{methodIcon(m.methodCategory)}</span>
                  <div className="min-w-0 flex-1">
                    <b>{m.methodLabel}</b>
                    <p className="text-xs font-bold text-slate-500">
                      {isAutoConfirmed(m.methodCategory) ? 'Instant' : 'Club confirms after you pay'}
                    </p>
                  </div>
                  {selectedMethod?.id === m.id && <Check className="h-5 w-5 text-orange-600" />}
                </button>
              ))}
            </div>

            {formError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setStep('details')} className="rounded-2xl border px-5 py-4 font-black text-slate-700">Back</button>
              <button
                disabled={!selectedMethod || submitting}
                onClick={createOrderAndProceed}
                className="flex-1 rounded-2xl bg-orange-500 p-4 font-black text-white disabled:opacity-40"
              >
                {submitting ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Please wait…</> : `Continue · ${fmt(total, currency)}`}
              </button>
            </div>
          </section>
        )}

        {/* ── Step: instructions (manual methods only — stripe redirects straight to checkout) ── */}
        {step === 'instructions' && selectedMethod && (
          <section className="mt-5 rounded-3xl bg-white p-6">
            <h2 className="text-xl font-black">Complete your payment</h2>
            {selectedMethod.playerInstructions && (
              <p className="mt-3 text-sm font-semibold text-slate-600">{selectedMethod.playerInstructions}</p>
            )}
            <div className="mt-4 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
              <div className="text-xs font-black uppercase tracking-wide text-amber-700">Your payment reference</div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="font-mono text-lg font-black tracking-wider text-slate-950">{reference}</span>
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(reference); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="rounded-xl border px-3 py-2 text-sm font-black"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-2 text-xs font-semibold text-amber-700">Use this reference so the club can match your payment.</p>
            </div>

            {formError && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{formError}</p>}

            <button
              disabled={submitting}
              onClick={confirmManualPayment}
              className="mt-5 w-full rounded-2xl bg-orange-500 p-4 font-black text-white disabled:opacity-40"
            >
              {submitting ? <><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />Please wait…</> : "I've made this payment"}
            </button>
          </section>
        )}

        {/* ── Step: thank you ── */}
        {step === 'confirm' && orderSummary && (
          <div className="mt-5">
            <PeerOrderThankYou
              order={orderSummary}
              entries={entries}
              fundraiserName={d.fundraiser.name}
              orderId={orderId}
            />
          </div>
        )}
      </div>
    </main>
  );
}
