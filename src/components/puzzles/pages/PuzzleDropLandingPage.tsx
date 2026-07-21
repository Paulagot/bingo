// src/components/puzzles/pages/PuzzleDropLandingPage.tsx
//
// Buyer-facing landing page for a Puzzle Drop. Modeled on PuzzleJoinPage.tsx
// for the shell/theme/branding pattern, but the purchase flow itself reuses
// components built for the Quiz ticket flow — PaymentMethodSelector and
// PaymentInstructions (src/components/Quiz/shared/*) — since Drop's manual
// (instant/cash) payment flow is functionally identical to a ticket
// purchase: pick a method, get a reference + instructions, confirm paid.
//
// CURRENT SCOPE: instant-payment (cash/Revolut/bank) and Stripe. Crypto
// isn't wired yet — if a club's linked payment methods include it, this
// page filters it out of the selector rather than offering a button that
// would fail. Selecting a Stripe method redirects the browser straight to
// Stripe Checkout (handleSelectMethod); everything else goes through the
// PaymentInstructions flow below.
//
// NO EMAIL SENDING EXISTS YET (flagged repeatedly in the backend work) —
// so the success screen shows each purchased item's access link directly,
// rather than claiming one was emailed. This applies to the instant-
// payment success screen on THIS page; the Stripe path redirects to a
// separate success page (PuzzleDropStripeSuccessPage.tsx) instead, since
// Stripe's own success_url takes the browser away and back.
//
// Route: expected to be registered as something like
// /puzzle-drop/:dropRoomId — this file assumes that param name.

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import {
  publicPuzzleDropService,
  type PublicDropInfo,
  type PurchaseDropResult,
} from '../services/publicPuzzleDropService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';
import { PaymentMethodSelector, type ClubPaymentMethod } from '../../Quiz/shared/PaymentMethodSelector';
import { PaymentInstructions } from '../../Quiz/shared/PaymentInstructions';

const PUZZLE_TYPE_LABELS: Record<string, string> = {
  anagram: 'Anagram',
  sequenceOrdering: 'Sequence Ordering',
  matchPairs: 'Matching Pairs',
  wordSearch: 'Word Search',
  slidingTile: 'Sliding Tiles',
  sudoku: 'Sudoku',
  patternCompletion: 'Pattern Completion',
  wordLadder: 'Word Ladder',
  cryptogram: 'Cryptogram',
  numberPath: 'Number Path',
  towersOfHanoi: 'Towers of Hanoi',
  nonogram: 'Nonogram',
  memoryPairs: 'Memory Pairs',
};

type Step = 'select' | 'payment-method' | 'payment-instructions' | 'success';

function currencyFmt(amount: number, symbol: string) {
  return `${symbol}${amount.toFixed(2)}`;
}

export default function PuzzleDropLandingPage() {
  const { dropRoomId } = useParams<{ dropRoomId: string }>();

  const [info, setInfo] = useState<PublicDropInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const theme = useMemo(() => resolvePuzzleTheme(info), [info]);

  const [step, setStep] = useState<Step>('select');

  // Selection state
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  // Payment state
  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);
  const [paymentReference] = useState(() => `DROP-${nanoid(8).toUpperCase()}`);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [purchaseResult, setPurchaseResult] = useState<PurchaseDropResult | null>(null);

  useEffect(() => {
    if (!dropRoomId) {
      setPageError('This Drop link is missing or invalid.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setPageError(null);

    publicPuzzleDropService.getInfo(dropRoomId)
      .then(setInfo)
      .catch(() => setPageError('This Drop is not available right now.'))
      .finally(() => setLoading(false));
  }, [dropRoomId]);

  const selectedTier = info?.pricingTiers.find(t => t.id === selectedTierId) ?? null;

  function handleSelectTier(tierId: string) {
    setSelectedTierId(tierId);
    const tier = info?.pricingTiers.find(t => t.id === tierId);
    // If the tier covers every item in the Drop, auto-select all of
    // them — nothing left for the buyer to choose. Otherwise clear the
    // selection so they pick exactly `quantity` items themselves.
    if (tier && info && tier.quantity >= info.items.length) {
      setSelectedItemIds(info.items.map(i => i.id));
    } else {
      setSelectedItemIds([]);
    }
    setSelectError(null);
  }

  function toggleItem(itemId: string) {
    if (!selectedTier) return;
    setSelectedItemIds(prev => {
      if (prev.includes(itemId)) return prev.filter(id => id !== itemId);
      if (prev.length >= selectedTier.quantity) return prev; // already at the tier's limit
      return [...prev, itemId];
    });
  }

  async function handleContinueToPayment() {
    setSelectError(null);

    if (!selectedTier) return setSelectError('Choose a pricing option first.');
    if (selectedItemIds.length !== selectedTier.quantity) {
      return setSelectError(`Choose exactly ${selectedTier.quantity} puzzle${selectedTier.quantity !== 1 ? 's' : ''}.`);
    }
    if (!buyerName.trim()) return setSelectError('Your name is required.');
    if (!buyerEmail.trim()) return setSelectError('Your email is required.');
    if (!gdprConsent) return setSelectError('Please agree to the privacy policy to continue.');
    if (!dropRoomId) return;

    setMethodsLoading(true);
    setStep('payment-method');
    try {
      const methods = await publicPuzzleDropService.getPaymentMethods(dropRoomId);
      // instant_payment (cash/Revolut/bank etc.) goes through
      // PaymentInstructions below. stripe goes straight to Stripe
      // Checkout via handleSelectMethod's branch — see that function.
      // Crypto isn't wired yet, so it's still filtered out here.
      setPaymentMethods(
        methods.filter(m => {
          const cat = m.methodCategory?.toLowerCase();
          return cat === 'instant_payment' || cat === 'stripe';
        })
      );
    } catch {
      setSelectError('Could not load payment methods. Please try again.');
      setStep('select');
    } finally {
      setMethodsLoading(false);
    }
  }

  async function handleSelectMethod(method: ClubPaymentMethod) {
    const category = method.methodCategory?.toLowerCase();

    if (category === 'stripe') {
      if (!dropRoomId) return;
      setConfirming(true);
      setConfirmError(null);
      try {
        const result = await publicPuzzleDropService.createStripeCheckout(dropRoomId, {
          itemIds: selectedItemIds,
          buyerName: buyerName.trim(),
          buyerEmail: buyerEmail.trim(),
          appOrigin: window.location.origin,
        });
        window.location.href = result.url;
      } catch (err) {
        setConfirmError((err as Error).message || 'Could not start checkout. Please try again.');
        setConfirming(false);
      }
      return;
    }

    setSelectedMethod(method);
    setStep('payment-instructions');
  }

  async function handleConfirmPaid() {
    if (!dropRoomId || !selectedMethod) return;
    setConfirming(true);
    setConfirmError(null);

    try {
      const result = await publicPuzzleDropService.purchase(dropRoomId, {
        itemIds: selectedItemIds,
        buyerName: buyerName.trim(),
        buyerEmail: buyerEmail.trim(),
        paymentReference,
        clubPaymentMethodId: selectedMethod.id,
      });
      setPurchaseResult(result);
      setStep('success');
    } catch (err) {
      setConfirmError((err as Error).message || 'Could not record your purchase. Please try again.');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
        </div>
      </PuzzlePageShell>
    );
  }

  if (pageError || !info) {
    return (
      <PuzzlePageShell theme={theme}>
        <div className="mx-auto max-w-xl rounded-[28px] border border-[#E7C4C4] bg-white p-8 text-center shadow-sm">
          <p className="mb-2 text-3xl">😕</p>
          <h1 className="mb-2 text-xl font-bold text-[#071A44]">Drop unavailable</h1>
          <p className="text-sm text-[#6E6A63]">{pageError ?? 'This Drop could not be found.'}</p>
        </div>
      </PuzzlePageShell>
    );
  }

  return (
    <PuzzlePageShell theme={theme} clubName={info.clubName ?? undefined}>
      <div className="mx-auto max-w-3xl space-y-6">

        <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#E36B2C]">
            Puzzle Drop
          </p>
          <h1 className="font-serif text-4xl leading-tight text-[#071A44] sm:text-5xl">
            {info.title}
          </h1>
          <p className="mt-4 text-base text-[#5F5A54]">
            {info.clubName ?? 'This club'} is selling one-off puzzles — pick your puzzles, choose how
            you'd like to pay, and start playing right away.
          </p>
        </section>

        {step === 'select' && (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="mb-4 font-serif text-2xl text-[#071A44]">Choose a pricing option</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {info.pricingTiers.map(tier => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => handleSelectTier(tier.id)}
                  className={`rounded-2xl border-2 p-4 text-left transition ${
                    selectedTierId === tier.id
                      ? 'border-[var(--puzzle-primary)] bg-[#FBF8F3]'
                      : 'border-[#E8E0D3] bg-white hover:border-[#D8D1C4]'
                  }`}
                >
                  <p className="text-lg font-bold text-[#071A44]">
                    {currencyFmt(Number(tier.price), info.currencySymbol)}
                  </p>
                  <p className="text-sm text-[#6E6A63]">
                    {tier.label || `${tier.quantity} puzzle${tier.quantity !== 1 ? 's' : ''}`}
                  </p>
                </button>
              ))}
            </div>

            {selectedTier && (
              <div className="mt-6">
                <h3 className="mb-3 text-sm font-semibold text-[#071A44]">
                  Pick {selectedTier.quantity} puzzle{selectedTier.quantity !== 1 ? 's' : ''}
                  {selectedItemIds.length < info.items.length && info.items.length > selectedTier.quantity
                    ? ` (${selectedItemIds.length}/${selectedTier.quantity} selected)`
                    : ''}
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {info.items.map(item => {
                    const checked = selectedItemIds.includes(item.id);
                    const disabled = !checked && selectedItemIds.length >= selectedTier.quantity;
                    return (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-sm transition ${
                          checked ? 'border-[var(--puzzle-primary)] bg-[#FBF8F3]' : 'border-[#E8E0D3]'
                        } ${disabled ? 'opacity-40' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 rounded border-[#D8D1C4] text-[var(--puzzle-primary)]"
                        />
                        <span>
                          <span className="block font-semibold text-[#071A44]">
                            Puzzle {item.itemNumber} — {PUZZLE_TYPE_LABELS[item.puzzleType] ?? item.puzzleType}
                          </span>
                          <span className="block text-xs capitalize text-[#8A847B]">{item.difficulty} difficulty</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 space-y-4 border-t border-[#E8E0D3] pt-6">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#071A44]">Your name *</label>
                <input
                  type="text" value={buyerName} onChange={e => setBuyerName(e.target.value)}
                  className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none focus:border-[var(--puzzle-primary)] focus:bg-white"
                  placeholder="First and last name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#071A44]">Email address *</label>
                <input
                  type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
                  className="w-full rounded-2xl border border-[#D8D1C4] bg-[#FBF8F3] px-4 py-3 text-sm text-[#071A44] outline-none focus:border-[var(--puzzle-primary)] focus:bg-white"
                  placeholder="you@example.com"
                />
                <p className="mt-2 text-xs text-[#8A847B]">
                  Your access links are shown on the next screen once payment is recorded.
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#E8E0D3] bg-[#FBF8F3] p-4">
                <input
                  type="checkbox" checked={gdprConsent}
                  onChange={e => setGdprConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#D8D1C4] text-[var(--puzzle-primary)]"
                />
                <span className="text-xs leading-relaxed text-[#6E6A63]">
                  I agree to the{' '}
                  <a href="/legal/privacy" target="_blank" rel="noreferrer" className="font-semibold text-[#071A44] underline">
                    Privacy Policy
                  </a>{' '}
                  and consent to receiving purchase-related emails from <strong>{info.clubName ?? 'the organiser'}</strong>.
                </span>
              </label>

              {selectError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-sm font-medium text-rose-700">{selectError}</p>
                </div>
              )}

              <PuzzlePrimaryButton type="button" fullWidth onClick={handleContinueToPayment}>
                Continue to payment →
              </PuzzlePrimaryButton>
            </div>
          </section>
        )}

        {step === 'payment-method' && (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
            <button type="button" onClick={() => setStep('select')} disabled={confirming}
              className="mb-4 text-sm font-semibold text-[#071A44] underline disabled:opacity-40">
              ← Back
            </button>
            {confirming ? (
              <div className="flex items-center gap-3 py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#D8D1C4] border-t-[var(--puzzle-primary)]" />
                <p className="text-sm text-[#6E6A63]">Redirecting to Stripe…</p>
              </div>
            ) : (
              <>
                <PaymentMethodSelector
                  paymentMethods={paymentMethods}
                  loading={methodsLoading}
                  onSelect={handleSelectMethod}
                  hideNoMethodsMessage={methodsLoading}
                />
                {!methodsLoading && paymentMethods.length === 0 && (
                  <p className="mt-4 text-sm text-[#6E6A63]">
                    No payment methods are available for this Drop yet. Please contact the organiser.
                  </p>
                )}
                {confirmError && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-sm font-medium text-rose-700">{confirmError}</p>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {step === 'payment-instructions' && selectedMethod && selectedTier && (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
            <PaymentInstructions
              method={selectedMethod}
              paymentReference={paymentReference}
              totalAmount={Number(selectedTier.price)}
              currencySymbol={info.currencySymbol}
              onConfirmPaid={handleConfirmPaid}
              onBack={() => setStep('payment-method')}
              error={confirmError}
              confirming={confirming}
            />
          </section>
        )}

        {step === 'success' && purchaseResult && (
          <section className="rounded-[36px] border border-[#D8E8D8] bg-[#F3FAF4] p-6 shadow-sm sm:p-8">
            <h2 className="mb-2 font-serif text-3xl text-[#071A44]">Purchase recorded 🎉</h2>
            <p className="mb-6 text-sm text-[#5F7D6A]">
              {info.clubName ?? 'The organiser'} will confirm your payment shortly. Save these links now —
              each one unlocks a puzzle once payment is confirmed:
            </p>
            <div className="space-y-3">
              {purchaseResult.entitlements.map(ent => {
                const playUrl = `${window.location.origin}/puzzle-drop/play/${ent.entitlementId}?token=${ent.accessToken}`;
                return (
                  <div key={ent.entitlementId} className="rounded-2xl border border-[#D8D1C4] bg-white p-4">
                    <p className="mb-1 text-sm font-semibold text-[#071A44]">Puzzle {ent.itemNumber}</p>
                    <a href={playUrl} className="break-all text-xs text-[var(--puzzle-primary)] underline">
                      {playUrl}
                    </a>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </PuzzlePageShell>
  );
}