import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { nanoid } from 'nanoid';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Heart,
  Loader2,
  Lock,
  MessageCircle,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { PaymentMethodSelector, type ClubPaymentMethod } from '../../components/Quiz/shared/PaymentMethodSelector';
import { PaymentInstructions } from '../../components/Quiz/shared/PaymentInstructions';
import {
  publicSponsoredActivityService,
  type PublicSponsoredActivity,
  type SponsorDetails,
} from '../../services/PublicSponsoredActivityService';

const Web3Provider = lazy(() =>
  import('../../components/Web3Provider').then((m) => ({ default: m.Web3Provider }))
);
const SponsoredCryptoPaymentStep = lazy(() =>
  import('../../components/sponsor/SponsoredCryptoPaymentStep')
);

type Step =
  | 'details'
  | 'payment-method'
  | 'manual-instructions'
  | 'crypto-payment'
  | 'waiting-stripe'
  | 'success';

const SYMBOLS: Record<string, string> = {
  EUR: '€', GBP: '£', USD: '$', CAD: 'CA$', NGN: '₦',
};

function currencySymbol(currency: string) {
  return SYMBOLS[currency.toUpperCase()] ?? `${currency.toUpperCase()} `;
}

function formatDate(value: string | null) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not set';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function countdown(target: string | null) {
  if (!target) return null;
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return 'less than an hour';
}

export default function SponsorPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activity, setActivity] = useState<PublicSponsoredActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('details');
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorEmail, setSponsorEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [message, setMessage] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentReference] = useState(() => `SPON-${nanoid(8).toUpperCase()}`);
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [cryptoWallet, setCryptoWallet] = useState<string | null>(null);

  const amount = useMemo(() => {
    if (customAmount.trim()) return Number(customAmount);
    return selectedAmount ?? 0;
  }, [customAmount, selectedAmount]);

  const symbol = currencySymbol(activity?.currency || 'EUR');
  const primary = activity?.clubPrimaryColor || '#157f85';
  const background = activity?.clubBackgroundColor || '#f6f1e8';
  const textOnPrimary = activity?.clubTextOnPrimaryColor || '#ffffff';

  useEffect(() => {
    if (!roomId) {
      setPageError('This sponsorship link is missing its activity reference.');
      setLoading(false);
      return;
    }

    publicSponsoredActivityService.getActivity(roomId)
      .then(({ activity: loaded }) => {
        setActivity(loaded);
        if (loaded.suggestedAmounts[0]) setSelectedAmount(loaded.suggestedAmounts[0]);
      })
      .catch((error) => setPageError(error?.message || 'This sponsored activity could not be found.'))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!roomId || !sessionId) return;

    setStep('waiting-stripe');
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    async function poll() {
      try {
        const result = await publicSponsoredActivityService.getStatus(roomId!, { sessionId: sessionId! });
        if (cancelled) return;
        if (result.status === 'confirmed') {
          setContributionId(result.contributionId);
          setStep('success');
          const next = new URLSearchParams(searchParams);
          next.delete('session_id');
          setSearchParams(next, { replace: true });
          return;
        }
        if (['failed', 'expired', 'cancelled'].includes(result.status)) {
          setFormError('The card checkout was not completed. You can start again below.');
          setStep('details');
          return;
        }
        if (Date.now() - startedAt < 5 * 60 * 1000) {
          timer = setTimeout(poll, 2500);
        } else {
          setFormError('Confirmation is taking longer than expected. Refresh this page in a moment.');
        }
      } catch {
        if (!cancelled && Date.now() - startedAt < 5 * 60 * 1000) {
          timer = setTimeout(poll, 2500);
        }
      }
    }

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [roomId, searchParams, setSearchParams]);

  function validateDetails() {
    setFormError(null);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      setFormError('Choose or enter a valid sponsorship amount.');
      return false;
    }
    if (!sponsorName.trim()) {
      setFormError('Your name is required.');
      return false;
    }
    if (sponsorEmail && !/^\S+@\S+\.\S+$/.test(sponsorEmail.trim())) {
      setFormError('Enter a valid email address.');
      return false;
    }
    if (!gdprConsent) {
      setFormError('Please agree to the privacy policy to continue.');
      return false;
    }
    return true;
  }

  function contributionPayload(method: ClubPaymentMethod): SponsorDetails {
    return {
      sponsorName: sponsorName.trim(),
      sponsorEmail: sponsorEmail.trim() || undefined,
      displayName: displayName.trim() || undefined,
      isAnonymous,
      message: message.trim() || undefined,
      amount,
      clubPaymentMethodId: method.id,
    };
  }

  function continueToPayment() {
    if (!validateDetails()) return;
    if (!activity?.paymentMethods.length) {
      setFormError('This club has not enabled a payment method for this activity.');
      return;
    }
    if (activity.paymentMethods.length === 1) {
      void handleMethod(activity.paymentMethods[0]);
      return;
    }
    setStep('payment-method');
  }

  async function handleMethod(method: ClubPaymentMethod) {
    if (!roomId || !activity || !validateDetails()) return;
    setSelectedMethod(method);
    setFormError(null);
    const category = String(method.methodCategory || '').toLowerCase();

    if (category === 'stripe') {
      setSubmitting(true);
      try {
        const result = await publicSponsoredActivityService.createStripeCheckout(roomId, {
          ...contributionPayload(method),
          appOrigin: window.location.origin,
          activityLabel: activity.activityLabel,
        });
        window.location.href = result.redirectUrl;
      } catch (error) {
        setFormError((error as Error).message || 'Could not start card checkout.');
        setStep('payment-method');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (category === 'crypto') {
      setSubmitting(true);
      try {
        const result = await publicSponsoredActivityService.createCryptoContribution(
          roomId,
          contributionPayload(method)
        );
        setContributionId(result.contributionId);
        setCryptoWallet(result.walletAddress);
        setStep('crypto-payment');
      } catch (error) {
        setFormError((error as Error).message || 'Could not prepare crypto payment.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setStep('manual-instructions');
  }

  async function confirmManualPaid() {
    if (!roomId || !selectedMethod) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await publicSponsoredActivityService.createManualContribution(roomId, {
        ...contributionPayload(selectedMethod),
        paymentReference,
      });
      setContributionId(result.contributionId);
      setStep('success');
    } catch (error) {
      setFormError((error as Error).message || 'Could not record your payment claim.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f1e8]">
        <Loader2 className="h-10 w-10 animate-spin text-[#157f85]" />
      </div>
    );
  }

  if (pageError || !activity) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f1e8] p-6">
        <div className="max-w-lg rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <h1 className="text-2xl font-bold text-[#071a44]">Sponsorship page unavailable</h1>
          <p className="mt-2 text-gray-600">{pageError || 'This sponsored activity could not be found.'}</p>
        </div>
      </div>
    );
  }

  const opensIn = countdown(activity.opensAt);

  if (activity.status !== 'open' && step !== 'success') {
    const closed = activity.status === 'completed';
    return (
      <div className="min-h-screen px-5 py-10" style={{ background }}>
        <div className="mx-auto max-w-2xl rounded-[36px] border border-black/10 bg-white p-8 text-center shadow-sm">
          {activity.clubLogoUrl && <img src={activity.clubLogoUrl} alt={activity.clubName || 'Club'} className="mx-auto mb-5 h-20 w-20 rounded-2xl object-contain" />}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: `${primary}18`, color: primary }}>
            {closed ? <Lock className="h-7 w-7" /> : <CalendarClock className="h-7 w-7" />}
          </div>
          <h1 className="text-3xl font-bold text-[#071a44]">{activity.activityLabel}</h1>
          <p className="mt-3 text-gray-600">
            {closed
              ? 'Sponsorship for this activity has now closed.'
              : `Sponsorship opens ${opensIn ? `in ${opensIn}` : 'soon'}.`}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {closed ? `Closed ${formatDate(activity.closesAt)}` : `Opens ${formatDate(activity.opensAt)}`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background }}>
      <header className="border-b border-black/10 bg-white/90 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {activity.clubLogoUrl ? (
              <img src={activity.clubLogoUrl} alt="" className="h-12 w-12 rounded-xl object-contain" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: primary, color: textOnPrimary }}>
                <Heart className="h-6 w-6" />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">Support a local fundraiser</p>
              <p className="font-semibold text-[#071a44]">{activity.clubName || 'FundRaisely'}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-green-50 px-3 py-2 text-xs font-semibold text-green-700 sm:flex">
            <ShieldCheck className="h-4 w-4" /> Secure payment
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-7 px-5 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] border border-black/10 bg-white p-7 shadow-sm sm:p-9">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: primary }}>Sponsored activity</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight text-[#071a44] sm:text-5xl">{activity.activityLabel}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
            Sponsor {activity.hostName || 'this fundraiser'} and help {activity.clubName || 'the club'} raise more through participation.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><Clock3 className="h-4 w-4" /> Sponsorship closes</div>
              <p className="mt-1 text-sm text-gray-600">{formatDate(activity.closesAt)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700"><UserRound className="h-4 w-4" /> Organised by</div>
              <p className="mt-1 text-sm text-gray-600">{activity.hostName || activity.clubName || 'FundRaisely host'}</p>
            </div>
          </div>

          <div className="mt-7 rounded-2xl p-5" style={{ background: `${primary}10` }}>
            <div className="flex gap-3">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: primary }} />
              <div>
                <h2 className="font-semibold text-[#071a44]">Add a message of support</h2>
                <p className="mt-1 text-sm text-gray-600">Your message can be shown with your sponsorship unless you choose to remain anonymous.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[36px] border border-black/10 bg-white p-6 shadow-lg sm:p-8">
          {step === 'waiting-stripe' && (
            <div className="py-10 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: primary }} />
              <h2 className="mt-5 text-2xl font-bold text-[#071a44]">Confirming your sponsorship…</h2>
              <p className="mt-2 text-sm text-gray-600">Stripe has returned you to FundRaisely. This page will update when the verified webhook arrives.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-8 text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
              <h2 className="mt-4 text-3xl font-bold text-[#071a44]">Thank you for your support</h2>
              <p className="mt-3 text-gray-600">
                {selectedMethod && String(selectedMethod.methodCategory).toLowerCase() !== 'stripe' && String(selectedMethod.methodCategory).toLowerCase() !== 'crypto'
                  ? 'Your payment has been recorded as awaiting club confirmation.'
                  : 'Your sponsorship has been confirmed.'}
              </p>
              {contributionId && <p className="mt-4 text-xs text-gray-400">Reference: {contributionId}</p>}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#071a44]">Choose your sponsorship</h2>
                <p className="mt-1 text-sm text-gray-600">Every contribution helps.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {activity.suggestedAmounts.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => { setSelectedAmount(preset); setCustomAmount(''); }}
                    className="rounded-2xl border-2 px-4 py-4 text-lg font-bold transition"
                    style={selectedAmount === preset && !customAmount ? { borderColor: primary, background: `${primary}10`, color: primary } : { borderColor: '#e5e7eb', color: '#071a44' }}
                  >
                    {symbol}{preset.toFixed(2)}
                  </button>
                ))}
              </div>

              {activity.allowOtherAmount && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Other amount</label>
                  <div className="flex rounded-xl border border-gray-300 bg-white focus-within:ring-2" style={{ ['--tw-ring-color' as string]: primary }}>
                    <span className="px-4 py-3 font-semibold text-gray-500">{symbol}</span>
                    <input
                      value={customAmount}
                      onChange={(e) => { setCustomAmount(e.target.value); setSelectedAmount(null); }}
                      type="number"
                      min="1"
                      max="10000"
                      step="0.01"
                      className="w-full rounded-r-xl px-2 py-3 outline-none"
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Your name *</label>
                  <input value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Email</label>
                  <input value={sponsorEmail} onChange={(e) => setSponsorEmail(e.target.value)} type="email" className="w-full rounded-xl border border-gray-300 px-4 py-3" />
                </div>
              </div>

              {!isAnonymous && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">Public display name</label>
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Leave blank to use your name" />
                </div>
              )}

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="mt-1" />
                <span><span className="block text-sm font-semibold text-gray-800">Sponsor anonymously</span><span className="text-xs text-gray-500">The club can still see the payment record, but your name will not be displayed publicly.</span></span>
              </label>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Message of support</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={3} className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Good luck!" />
                <p className="mt-1 text-right text-xs text-gray-400">{message.length}/500</p>
              </div>

              <label className="flex items-start gap-3 text-sm text-gray-600">
                <input type="checkbox" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} className="mt-1" />
                <span>I agree that FundRaisely and the club may process these details to record and confirm this sponsorship.</span>
              </label>

              {formError && <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}</div>}

              <button
                type="button"
                onClick={continueToPayment}
                disabled={submitting}
                className="w-full rounded-xl px-5 py-4 text-lg font-bold shadow-sm disabled:opacity-50"
                style={{ background: primary, color: textOnPrimary }}
              >
                Continue with {symbol}{Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}
              </button>
            </div>
          )}

          {step === 'payment-method' && (
            <div className="space-y-5">
              <button type="button" onClick={() => setStep('details')} className="text-sm font-semibold underline" style={{ color: primary }}>← Back to sponsorship details</button>
              <PaymentMethodSelector
                paymentMethods={activity.paymentMethods}
                onSelect={(method) => void handleMethod(method)}
                loading={submitting}
              />
              {formError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
            </div>
          )}

          {step === 'manual-instructions' && selectedMethod && (
            <PaymentInstructions
              method={selectedMethod}
              paymentReference={paymentReference}
              totalAmount={amount}
              currencySymbol={symbol}
              onConfirmPaid={() => void confirmManualPaid()}
              onBack={() => setStep(activity.paymentMethods.length > 1 ? 'payment-method' : 'details')}
              error={formError}
              confirming={submitting}
            />
          )}

          {step === 'crypto-payment' && contributionId && cryptoWallet && (
            <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" style={{ color: primary }} /></div>}>
              <Web3Provider force>
                <SponsoredCryptoPaymentStep
                  roomId={activity.roomId}
                  contributionId={contributionId}
                  recipientWallet={cryptoWallet}
                  fiatAmount={amount}
                  fiatCurrency={activity.currency}
                  onSuccess={() => setStep('success')}
                />
              </Web3Provider>
            </Suspense>
          )}
        </section>
      </main>
    </div>
  );
}
