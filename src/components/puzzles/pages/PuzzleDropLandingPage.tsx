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
  type RecoveredEntitlement,
} from '../services/publicPuzzleDropService';
import PuzzlePageShell from '../ui/PuzzlePageShell';
import PuzzlePrimaryButton from '../ui/PuzzlePrimaryButton';
import { resolvePuzzleTheme } from '../ui/puzzleTheme';
import { PaymentMethodSelector, type ClubPaymentMethod } from '../../Quiz/shared/PaymentMethodSelector';
import { PaymentInstructions } from '../../Quiz/shared/PaymentInstructions';
import CryptoFixedFeeStep from '../../Quiz/joinroom/crypto/CryptoFixedFeeStep';

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

type Step = 'select' | 'payment-method' | 'payment-instructions' | 'crypto-payment' | 'success';

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

  // "Already bought this?" recovery — see publicPuzzleDropService.ts's
  // recoverAccess comment for why this is a convenience lookup, not
  // strong auth. Kept separate from the main purchase flow's step state
  // since it's a small collapsible section, not a full-page transition.
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverError, setRecoverError] = useState<string | null>(null);
  const [recoveredEntitlements, setRecoveredEntitlements] = useState<RecoveredEntitlement[] | null>(null);

  async function handleRecover() {
    setRecoverError(null);
    setRecoveredEntitlements(null);

    if (!recoverEmail.trim()) return setRecoverError('Enter the email you used to buy.');
    if (!dropRoomId) return;

    setRecoverLoading(true);
    try {
      const result = await publicPuzzleDropService.recoverAccess(dropRoomId, recoverEmail.trim());
      if (result.entitlements.length === 0) {
        setRecoverError("We couldn't find any purchases for that email on this Drop.");
      } else {
        setRecoveredEntitlements(result.entitlements);
      }
    } catch (err) {
      setRecoverError((err as Error).message || 'Could not look up your purchases. Please try again.');
    } finally {
      setRecoverLoading(false);
    }
  }

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
      // Checkout, crypto goes to CryptoFixedFeeStep — see
      // handleSelectMethod's branches for both.
      setPaymentMethods(
        methods.filter(m => {
          const cat = m.methodCategory?.toLowerCase();
          return cat === 'instant_payment' || cat === 'stripe' || cat === 'crypto';
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

    if (category === 'crypto') {
      // useAppKit()/useDisconnect() inside CryptoFixedFeeStep throw
      // synchronously on mount if createAppKit() hasn't resolved yet
      // (src/web3Init.ts defers this globally for performance — it's
      // only initialized on pages that actually need wallet access,
      // exactly matching this situation). Must AWAIT it, not just call
      // it — it's async (dynamic imports under the hood), so firing it
      // without waiting would let the component mount before AppKit is
      // actually ready.
      setSelectedMethod(method); // set BEFORE the await, so the spinner below can tell this is a crypto wait, not a stale Stripe one
      setConfirming(true);
      setConfirmError(null);
      try {
        const { initAppKit } = await import('../../../web3Init');
        await initAppKit();
        setStep('crypto-payment');
      } catch (err) {
        setConfirmError((err as Error).message || 'Could not initialize wallet support. Please try again.');
      } finally {
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

  if (info.status === 'completed') {
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
            <div className="mt-6 rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-6 text-center">
              <p className="mb-2 text-3xl">🧩</p>
              <p className="text-base font-semibold text-[#071A44]">
                This Drop is no longer selling new puzzles
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#6E6A63]">
                {info.clubName ?? 'The organiser'} has closed this Drop to new purchases.
                Already bought a puzzle? Use the link below to find your access link again.
              </p>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
            {!recoverOpen ? (
              <button
                type="button"
                onClick={() => setRecoverOpen(true)}
                className="text-sm font-semibold text-[#071A44] underline"
              >
                Already bought this? Recover your links →
              </button>
            ) : (
              <div>
                <p className="mb-3 text-sm font-semibold text-[#071A44]">
                  Enter the email you used when you bought:
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={e => setRecoverEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-w-[220px] flex-1 rounded-2xl border border-[#D8D1C4] bg-white px-4 py-2.5 text-sm text-[#071A44] outline-none focus:border-[var(--puzzle-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleRecover}
                    disabled={recoverLoading}
                    className="rounded-2xl bg-[var(--puzzle-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)] shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  >
                    {recoverLoading ? 'Looking…' : 'Find my links'}
                  </button>
                </div>

                {recoverError && (
                  <p className="mt-3 text-sm text-rose-700">{recoverError}</p>
                )}

                {recoveredEntitlements && recoveredEntitlements.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {recoveredEntitlements.map(ent => {
                      const playUrl = `${window.location.origin}/puzzle-drop/play/${ent.entitlementId}?token=${ent.accessToken}`;
                      return (
                        <div key={ent.entitlementId} className="rounded-2xl border border-[#D8D1C4] bg-white p-3">
                          <p className="mb-1 text-xs font-semibold text-[#071A44]">
                            Puzzle {ent.itemNumber ?? ''}
                            {ent.paymentStatus !== 'confirmed' && (
                              <span className="ml-2 rounded-full bg-[#FFF2D9] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A00]">
                                payment pending
                              </span>
                            )}
                          </p>
                          <a href={playUrl} className="break-all text-xs text-[var(--puzzle-primary)] underline">
                            {playUrl}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
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
          <section className="rounded-[28px] border border-[#E8E0D3] bg-[#FBF8F3] p-5">
            {!recoverOpen ? (
              <button
                type="button"
                onClick={() => setRecoverOpen(true)}
                className="text-sm font-semibold text-[#071A44] underline"
              >
                Already bought this? Recover your links →
              </button>
            ) : (
              <div>
                <p className="mb-3 text-sm font-semibold text-[#071A44]">
                  Enter the email you used when you bought:
                </p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={e => setRecoverEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-w-[220px] flex-1 rounded-2xl border border-[#D8D1C4] bg-white px-4 py-2.5 text-sm text-[#071A44] outline-none focus:border-[var(--puzzle-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleRecover}
                    disabled={recoverLoading}
                    className="rounded-2xl bg-[var(--puzzle-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--puzzle-text-on-primary)] shadow-sm transition hover:opacity-95 disabled:opacity-50"
                  >
                    {recoverLoading ? 'Looking…' : 'Find my links'}
                  </button>
                </div>

                {recoverError && (
                  <p className="mt-3 text-sm text-rose-700">{recoverError}</p>
                )}

                {recoveredEntitlements && recoveredEntitlements.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {recoveredEntitlements.map(ent => {
                      const playUrl = `${window.location.origin}/puzzle-drop/play/${ent.entitlementId}?token=${ent.accessToken}`;
                      return (
                        <div key={ent.entitlementId} className="rounded-2xl border border-[#D8D1C4] bg-white p-3">
                          <p className="mb-1 text-xs font-semibold text-[#071A44]">
                            Puzzle {ent.itemNumber ?? ''}
                            {ent.paymentStatus !== 'confirmed' && (
                              <span className="ml-2 rounded-full bg-[#FFF2D9] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A00]">
                                payment pending
                              </span>
                            )}
                          </p>
                          <a href={playUrl} className="break-all text-xs text-[var(--puzzle-primary)] underline">
                            {playUrl}
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

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
                <p className="text-sm text-[#6E6A63]">
                  {selectedMethod?.methodCategory?.toLowerCase() === 'crypto'
                    ? 'Getting your wallet ready…'
                    : 'Redirecting to Stripe…'}
                </p>
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

        {step === 'crypto-payment' && selectedMethod && selectedTier && dropRoomId && (
          <section className="rounded-[36px] border border-[#E8E0D3] bg-white p-6 shadow-sm sm:p-8">
            <button type="button" onClick={() => setStep('payment-method')} className="mb-4 text-sm font-semibold text-[#071A44] underline">
              ← Back
            </button>
            <CryptoFixedFeeStep
              mode="ticket"
              roomId={dropRoomId}
              selectedMethod={selectedMethod}
              totalFiatAmount={Number(selectedTier.price)}
              // Drop has no entry-fee/extras split — the whole tier price
              // is one lump sum, so entryFeeAmount carries all of it and
              // extrasAmount is 0. The component's own internal fraction
              // math (entryFeeAmount / totalFiatAmount) then works out to
              // 1, meaning entryFeeRaw ends up carrying the full raw
              // on-chain amount — see the backend route's comment on why
              // it reads entryFeeRaw, not a generic "rawAmount" field.
              entryFeeAmount={Number(selectedTier.price)}
              extrasAmount={0}
              selectedExtras={[]}
              fiatCurrency={info.currency}
              currencySymbol={info.currencySymbol}
              purchaserName={buyerName.trim()}
              purchaserEmail={buyerEmail.trim()}
              playerName={buyerName.trim()}
              // itemIds has no home in this component's own POST body (it
              // only knows generic quiz fee fields) — threaded through
              // the confirmEndpoint URL's query string instead, which the
              // backend route reads via req.query.itemIds.
              confirmEndpoint={`/api/puzzle-drop/${dropRoomId}/crypto/confirm?itemIds=${encodeURIComponent(JSON.stringify(selectedItemIds))}`}
              onBack={() => setStep('payment-method')}
              onSuccess={async (result) => {
                // The component's own onSuccess only carries its narrow
                // FixedFeeConfirmResult shape (txHash, ledgerAmount,
                // ledgerCurrency, etc.) — no room for Drop's entitlements/
                // access tokens. Re-fetch them the same way the Stripe
                // success page does, reusing that exact route: it's a
                // generic payment_reference lookup under the hood, so
                // passing txHash as the "sessionId" works identically.
                try {
                  const session = await publicPuzzleDropService.getStripeSession(dropRoomId, result.txHash);
                  setPurchaseResult({
                    ok: true,
                    ledgerId: Number(result.web3TransactionId) || 0,
                    totalAmount: result.ledgerAmount,
                    currency: result.ledgerCurrency,
                    entitlements: session.entitlements.map(e => ({
                      entitlementId: e.entitlementId,
                      itemNumber: e.itemNumber ?? 0,
                      accessToken: e.accessToken,
                    })),
                  });
                  setStep('success');
                } catch {
                  setConfirmError('Payment verified, but we could not load your access links. Please use the "Already bought this?" recovery option above with your email.');
                }
              }}
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