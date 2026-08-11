// src/pages/peer/PeerSupportPage.tsx
//
// Public peer fundraiser support page using the same mobile-first visual
// language and support flow as CampaignSupportPage.
//
// Supported flow:
// packs -> details -> payment -> payment-instructions -> confirm
// Stripe redirects to Checkout. Cash can be claimed immediately. Revolut,
// bank transfer and other manual methods use the shared payment instructions.
//
// Crypto remains hidden until peer orders have their own verified on-chain
// confirmation endpoint. Do not expose crypto here by treating it as a manual
// payment: that would create unverified paid orders.

import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CreditCard,
  Gift,
  Heart,
  Loader2,
  Mail,
  Minus,
  Plus,
  Puzzle,
  ShieldCheck,
  Target,
  Trophy,
  User,
  Users,
  WalletCards,
} from 'lucide-react';
import api from '../../services/PeerSupportService';
import type {
  PublicPeerPaymentMethod,
  PeerOrderSummary,
  PeerGeneratedEntry,
} from '../../services/PeerSupportService';
import PeerOrderThankYou from '../../components/peer/PeerOrderThankYou';
import PeerSponsorshipExperience from '../../components/peer/PeerSponsorshipExperience';
import {
  PaymentInstructionsContent,
  PaymentInstructionsFooter,
} from '../../components/Quiz/shared/PaymentInstructions';
import {
  asNumber,
  parseJsonMaybe,
  isValidEmail,
  firstDefined,
  fmt,
  currencySymbol,
  friendlyOrderError,
  generateReference,
  isStripeMethod,
  isCryptoMethod,
  isInstantMethod,
  isCashMethod,
  hasProviderInstructionStep,
  methodDisplay,
  getPackRooms,
  includedLine,
  getPlaceLabel,
  getPackFeatured,
  getPackSoldOut,
  getPackBadge,
  getTheme,
} from './support/peerSupporthelpers';
import type { PackRoomDetails } from './support/peerSupporthelpers';
import SupporterHero from './support/SupporterHero';
import ProgressBars from './support/ProgressBars';
import SupportLayout from './support/SupportLayout';
import ActivityDetailSheet from './support/ActivityDetailSheet';
import SavingsBadge from './support/SavingsBadge';

type Step = 'packs' | 'details' | 'payment' | 'payment-instructions' | 'confirm' | 'donation-confirm';
type CheckoutMode = 'order' | 'donation';

type CartItem = {
  pack: any;
  quantity: number;
};

export default function PeerSupportPage() {
  const { clubSlug = '', fundraiserSlug = '', participantSlug } = useParams();
  const [searchParams] = useSearchParams();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activePack, setActivePack] = useState<any | null>(null);
  const [step, setStep] = useState<Step>('packs');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('order');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationResult, setDonationResult] = useState<any>(null);
  const [donationReturnLoading, setDonationReturnLoading] = useState(false);

  const [methods, setMethods] = useState<PublicPeerPaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const [methodsError, setMethodsError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PublicPeerPaymentMethod | null>(null);
  const [reference] = useState(generateReference);
  const [hasCopiedReference, setHasCopiedReference] = useState(false);
  const [hasOpenedProviderLink, setHasOpenedProviderLink] = useState(false);

  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderSummary, setOrderSummary] = useState<PeerOrderSummary | null>(null);
  const [entries, setEntries] = useState<PeerGeneratedEntry[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cancelled = searchParams.get('cancelled') === '1';
  const donationReturn = searchParams.get('donation');
  const donationSessionId = searchParams.get('session_id');

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    api.page(clubSlug, fundraiserSlug, participantSlug)
      .then(result => {
        setData(result);
        setCart({});
        setActivePack(null);
      })
      .catch(err => setLoadError(err?.message || 'Could not load this fundraiser.'))
      .finally(() => setLoading(false));
  }, [clubSlug, fundraiserSlug, participantSlug]);

  useEffect(() => {
    if (donationReturn !== 'thanks' || !donationSessionId) return;

    let cancelledEffect = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    setCheckoutMode('donation');
    setDonationReturnLoading(true);
    setFormError(null);

    const checkDonation = async () => {
      try {
        const result = await publicPeerRequest(
          `/peer-support/donations/status?sessionId=${encodeURIComponent(
            donationSessionId,
          )}`,
        );

        if (cancelledEffect) return;

        if (result.status === 'confirmed') {
          setDonationResult(result);
          setStep('donation-confirm');
          setDonationReturnLoading(false);
          return;
        }

        // Stripe can redirect slightly before the webhook finishes.
        if (result.status === 'pending' && attempts < 10) {
          attempts += 1;
          timer = setTimeout(checkDonation, 1000);
          return;
        }

        setDonationResult(result);
        setStep('donation-confirm');
        setDonationReturnLoading(false);
      } catch (err: any) {
        if (cancelledEffect) return;

        // Give the webhook/database insert a short grace period.
        if (attempts < 5) {
          attempts += 1;
          timer = setTimeout(checkDonation, 1000);
          return;
        }

        setDonationReturnLoading(false);
        setFormError(
          err?.message ||
            'Your payment returned successfully, but we could not verify the donation yet.',
        );
      }
    };

    checkDonation();

    return () => {
      cancelledEffect = true;
      if (timer) clearTimeout(timer);
    };
  }, [donationReturn, donationSessionId]);

  useEffect(() => {
    if (step !== 'payment' || !data?.fundraiser?.id) return;

    setMethodsLoading(true);
    setMethodsError(null);
    api.paymentMethods(data.fundraiser.id)
      .then(result => {
        const available = (result.paymentMethods ?? []).filter((method: PublicPeerPaymentMethod) => !isCryptoMethod(method));
        setMethods(available);
        setSelectedMethod(current => available.find((method: PublicPeerPaymentMethod) => method.id === current?.id) ?? available[0] ?? null);
      })
      .catch(err => setMethodsError(err?.message || 'Could not load payment options.'))
      .finally(() => setMethodsLoading(false));
  }, [step, data?.fundraiser?.id]);

  const cartItems = useMemo<CartItem[]>(() => {
    if (!data?.packs) return [];
    return data.packs
      .filter((pack: any) => asNumber(cart[pack.id]) > 0)
      .map((pack: any) => ({ pack, quantity: asNumber(cart[pack.id]) }));
  }, [data, cart]);

  const total = useMemo(
    () => cartItems.reduce((sum, item) => sum + asNumber(item.pack.price) * item.quantity, 0),
    [cartItems]
  );
  const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.quantity, 0), [cartItems]);
  const donationValue = Math.max(0, asNumber(donationAmount));
  const payableTotal = checkoutMode === 'donation' ? donationValue : total;
  const currency = data?.fundraiser?.currency || data?.packs?.[0]?.currency || 'EUR';

  const theme = useMemo(() => getTheme(data), [data]);
  const appStyle = {
    '--fr-primary': theme.primary,
    '--fr-secondary': theme.secondary,
    '--fr-accent': theme.accent,
    '--fr-bg': theme.background,
  } as CSSProperties;

  const participantName = firstDefined(
    data?.participant?.participantName,
    data?.participant?.participant_name,
    data?.participant?.name
  );
  const title = participantName
    ? `Support ${participantName}`
    : `Support ${data?.club?.name || 'this fundraiser'}`;
  const logoUrl = firstDefined(
    data?.club?.logoUrl,
    data?.club?.logo_url,
    data?.club?.brand_logo_url,
    data?.fundraiser?.logoUrl,
    data?.fundraiser?.logo_url,
  );
  const participantPhoto = firstDefined(
    data?.participant?.profileImageUrl,
    data?.participant?.profile_image_url,
  );
  const participantMessage = firstDefined(
    data?.participant?.personalMessage,
    data?.participant?.personal_message,
  );
  const lifecycle = data?.lifecycle || {
    state: 'open',
    canTransact: true,
    message: null,
  };

  // Dual totals: participant.* is the personal-scoped total; fundraiser.* is the
  // fundraiser-wide total (both now returned distinctly by the backend).
  const personalTarget = asNumber(data?.participant?.personal_target);
  const personalRaised = asNumber(
    firstDefined(data?.participant?.raisedAmount, data?.participant?.raised_amount)
  );
  const overallTarget = asNumber(
    firstDefined(data?.fundraiser?.target_amount, data?.fundraiser?.targetAmount)
  );
  const overallRaised = asNumber(
    firstDefined(data?.fundraiser?.raisedAmount, data?.fundraiser?.raised_amount)
  );

  const setPackQuantity = (pack: any, quantity: number) => {
    if (
      !lifecycle.canTransact ||
      getPackSoldOut(pack) ||
      pack?.availability?.available === false
    ) return;
    setCart(current => {
      const next = { ...current };
      if (quantity <= 0) delete next[pack.id];
      else next[pack.id] = quantity;
      return next;
    });
  };

  const goToDetails = () => {
    if (!cartCount) {
      setFormError('Please choose at least one pack first.');
      return;
    }
    setCheckoutMode('order');
    setDonationAmount('');
    setFormError(null);
    setStep('details');
  };

  const startDonation = () => {
    if (!lifecycle.canTransact) {
      setFormError(
        lifecycle.message ||
          'This fundraiser is no longer accepting payments.',
      );
      return;
    }
    setCheckoutMode('donation');
    setDonationAmount('');
    setDonationResult(null);
    setSelectedMethod(null);
    setFormError(null);
    setStep('details');
  };

  const goToPayment = () => {
    if (!name.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (checkoutMode === 'donation' && donationValue <= 0) {
      setFormError('Please enter a donation amount greater than zero.');
      return;
    }
    setFormError(null);
    setStep('payment');
  };

  async function loadOrderSummary(id: string) {
    const summary = await api.getOrderSummary(id);
    setOrderSummary(summary.order);
    setEntries(summary.entries ?? []);
    setStep('confirm');
  }

  async function publicPeerRequest(
    path: string,
    options: RequestInit = {},
  ) {
    const configuredBase = String(
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      '',
    ).replace(/\/$/, '');

    const apiBase = configuredBase
      ? configuredBase.endsWith('/api')
        ? configuredBase
        : `${configuredBase}/api`
      : window.location.hostname === 'localhost'
        ? 'http://localhost:3001/api'
        : '/api';

    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || 'request_failed');
    }
    return payload;
  }

  async function createDonationAndProceed() {
    if (!selectedMethod) {
      setFormError('Please select a payment method.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const body = {
        participantId: data.participant?.id || null,
        clubPaymentMethodId: selectedMethod.id,
        donorName: name.trim(),
        donorEmail: email.trim(),
        amount: donationValue,
        paymentReference: reference,
      };

      if (isStripeMethod(selectedMethod)) {
        const result = await publicPeerRequest(
          `/peer-support/${encodeURIComponent(
            data.fundraiser.id,
          )}/donations/stripe-checkout`,
          {
            method: 'POST',
            body: JSON.stringify({
              ...body,
              appOrigin: window.location.origin,
              returnPath: window.location.pathname,
            }),
          },
        );

        if (!result.redirectUrl) {
          throw new Error('Could not start card checkout.');
        }
        window.location.href = result.redirectUrl;
        return;
      }

      if (isCashMethod(selectedMethod)) {
        const result = await publicPeerRequest(
          `/peer-support/${encodeURIComponent(
            data.fundraiser.id,
          )}/donations/manual`,
          {
            method: 'POST',
            body: JSON.stringify({
              ...body,
              paymentReference: null,
            }),
          },
        );
        setDonationResult(result);
        setStep('donation-confirm');
        return;
      }

      setHasCopiedReference(false);
      setHasOpenedProviderLink(false);
      setStep('payment-instructions');
    } catch (err: any) {
      setFormError(err?.message || 'Could not create the donation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function createOrderAndProceed() {
    if (!selectedMethod) {
      setFormError('Please select a payment method.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await api.order(data.fundraiser.id, {
        participantId: data.participant?.id || null,
        supporterName: name.trim(),
        supporterEmail: email.trim(),
        paymentMethodCategory: selectedMethod.methodCategory,
        clubPaymentMethodId: selectedMethod.id,
        paymentProvider: selectedMethod.providerName || null,
        paymentReference: reference,
        donationAmount: 0,
        items: cartItems.map(item => ({ packId: item.pack.id, quantity: item.quantity })),
      } as any);

      setOrderId(result.orderId);

      if (isStripeMethod(selectedMethod)) {
        const checkout = await api.stripeCheckout(result.orderId);
        const url = checkout.url || checkout.checkoutUrl;
        if (!url) throw new Error('Could not start card checkout. Please try again.');
        window.location.href = url;
        return;
      }

      if (isCashMethod(selectedMethod)) {
        await api.claim(result.orderId, {
          paymentReference: null,
          clubPaymentMethodId: selectedMethod.id,
        });
        await loadOrderSummary(result.orderId);
        return;
      }

      setHasCopiedReference(false);
      setHasOpenedProviderLink(false);
      setStep('payment-instructions');
    } catch (err: any) {
      setFormError(friendlyOrderError(err?.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmManualPayment() {
    if (checkoutMode === 'donation') {
      if (!selectedMethod) {
        setFormError('Please choose a payment method.');
        return;
      }

      setSubmitting(true);
      setFormError(null);
      try {
        const result = await publicPeerRequest(
          `/peer-support/${encodeURIComponent(
            data.fundraiser.id,
          )}/donations/manual`,
          {
            method: 'POST',
            body: JSON.stringify({
              participantId: data.participant?.id || null,
              clubPaymentMethodId: selectedMethod.id,
              donorName: name.trim(),
              donorEmail: email.trim(),
              amount: donationValue,
              paymentReference: reference,
            }),
          },
        );
        setDonationResult(result);
        setStep('donation-confirm');
      } catch (err: any) {
        setFormError(err?.message || 'Could not record your donation.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!orderId || !selectedMethod) {
      setFormError('Could not find the order to confirm. Please go back and try again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.claim(orderId, {
        paymentReference: reference,
        clubPaymentMethodId: selectedMethod.id,
      });
      await loadOrderSummary(orderId);
    } catch (err: any) {
      setFormError(err?.message || 'Could not confirm your payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }


  if (donationReturnLoading) {
    return (
      <AppShell style={appStyle}>
        <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 text-center">
          <div>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-[var(--fr-primary)]" />
            <h1 className="mt-5 text-2xl font-black text-slate-950">
              Confirming your donation
            </h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Your payment was successful. We are waiting for Stripe to confirm it.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loading) {
    return <AppShell style={appStyle}><LoadingState message="Loading support page…" /></AppShell>;
  }

  if (loadError) {
    return <AppShell style={appStyle}><EmptyState title="Something went wrong" message={loadError} /></AppShell>;
  }

  if (!data?.fundraiser) {
    return <AppShell style={appStyle}><EmptyState title="Fundraiser not found" message="This peer fundraiser could not be loaded." /></AppShell>;
  }

  if (data.supporterExperience === 'sponsorship') {
    return (
      <PeerSponsorshipExperience
        data={data}
        clubSlug={clubSlug}
        fundraiserSlug={fundraiserSlug}
        participantSlug={participantSlug}
      />
    );
  }

  return (
    <AppShell style={appStyle}>
      {step === 'packs' && (
        <>
          <SupportLayout>
            <header className="mb-3 flex items-center justify-between gap-3 rounded-b-[1.75rem] bg-white/95 px-4 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur">
              <div className="min-w-0">
                <p className="truncate text-lg font-black tracking-tight text-slate-950">{title}</p>
                <p className="text-xs font-bold text-slate-400">Official Peer fundraiser</p>
              </div>
             
            </header>

            <SupporterHero
              clubName={data.club?.name}
              fundraiserName={data.fundraiser?.name}
              causeStory={data.fundraiser?.description}
              coverImageUrl={data.fundraiser?.settings?.coverImageUrl}
              causeVideoUrl={data.fundraiser?.settings?.videoUrl}
              logoUrl={logoUrl}
              participant={
                participantName
                  ? {
                      name: participantName,
                      message: participantMessage ?? null,
                      photoUrl: participantPhoto ?? null,
                      videoUrl: data.participant?.video_url ?? null,
                    }
                  : null
              }
              progress={
                <ProgressBars
                  currency={currency}
                  personal={
                    participantName
                      ? { name: participantName, raised: personalRaised, target: personalTarget }
                      : null
                  }
                  overall={{
                    label: `Part of ${data.fundraiser?.name || 'this campaign'}`,
                    raised: overallRaised,
                    target: overallTarget,
                  }}
                />
              }
            />



            {!lifecycle.canTransact && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                {lifecycle.message ||
                  'This fundraiser is no longer accepting payments.'}
              </div>
            )}

            {cancelled && (
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-100">
                Checkout was cancelled. Your card was not charged. Choose a pack below to try again.
              </div>
            )}

            {!data.packs?.length ? (
              <EmptyCard title="No packs available yet" message="The organiser has not added any peer fundraising packs yet." />
            ) : (
              <section className="mt-5 grid gap-3 lg:grid-cols-2">
                {data.packs.map((pack: any) => (
                  <PackChoiceCard
                    key={pack.id}
                    pack={pack}
                    currency={currency}
                    quantity={asNumber(cart[pack.id])}
                    onOpen={() => setActivePack(pack)}
                    onAdd={() => setPackQuantity(pack, asNumber(cart[pack.id]) + 1)}
                    onRemove={() => setPackQuantity(pack, asNumber(cart[pack.id]) - 1)}
                  />
                ))}
              </section>
            )}

            <a href="/" className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-[var(--fr-primary)]">
              <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
            </a>
          </SupportLayout>

          {formError && (
            <div className="fixed inset-x-4 bottom-28 z-[10001] mx-auto max-w-md rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {formError}
            </div>
          )}

          <SelectionBar total={total} count={cartCount} currency={currency} onContinue={goToDetails} onDonate={startDonation} canTransact={lifecycle.canTransact} />

          {activePack && (
            <ActivityDetailSheet pack={activePack} currency={currency} onClose={() => setActivePack(null)} />
          )}
        </>
      )}

      {step === 'details' && (
        <StepPanel
          title={checkoutMode === 'donation' ? 'Make a donation' : 'Your details'}
          subtitle={checkoutMode === 'donation'
            ? `Choose the amount you would like to donate to ${data.club?.name || 'the club'}.`
            : 'We’ll use this to send your confirmation and entry links.'}
          onBack={() => setStep('packs')}
        >
          <div className="space-y-3">
            <InputShell icon={<User className="h-5 w-5" />}>
              <input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
            <InputShell icon={<Mail className="h-5 w-5" />}>
              <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="Email for confirmation and links" className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400" />
            </InputShell>
          </div>

          {checkoutMode === 'order' ? (
            <OrderMiniSummary cartItems={cartItems} currency={currency} />
          ) : (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-white p-4">
              <label className="text-sm font-black text-slate-700">
                Donation amount
              </label>
              <div className="mt-3 flex items-center rounded-2xl border border-slate-200 px-4 py-3">
                <span className="font-black text-slate-500">
                  {currencySymbol(currency)}
                </span>
                <input
                  value={donationAmount}
                  onChange={event => setDonationAmount(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  autoFocus
                  className="min-w-0 flex-1 border-0 bg-transparent px-3 text-xl font-black outline-none"
                />
              </div>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                This is recorded as a direct donation, separate from activity sales.
              </p>
            </div>
          )}

          {formError && <FormError>{formError}</FormError>}

          <button onClick={goToPayment} disabled={!name.trim() || !isValidEmail(email) || (checkoutMode === 'donation' && donationValue <= 0)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            Continue <ArrowRight className="h-5 w-5" />
          </button>
        </StepPanel>
      )}

      {step === 'payment' && (
        <StepPanel title="How would you like to pay?" subtitle={`${checkoutMode === 'donation' ? 'Donation' : 'Total to pay'}: ${fmt(payableTotal, currency)}`} onBack={() => setStep('details')}>
          {methodsLoading && <LoadingState message="Loading payment options…" compact />}

          {!methodsLoading && methodsError && (
            <FormError>Could not load payment options ({methodsError}). Please refresh and try again.</FormError>
          )}

          {!methodsLoading && !methodsError && methods.length === 0 && (
            <FormError>No payment methods are configured for this fundraiser yet. Please contact the organiser.</FormError>
          )}

          {!methodsLoading && !methodsError && methods.length > 0 && (
            <div className="space-y-3">
              {methods.map(method => {
                const display = methodDisplay(method);
                const selected = selectedMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(method);
                      setFormError(null);
                      setHasCopiedReference(false);
                      setHasOpenedProviderLink(false);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${selected ? 'border-[var(--fr-primary)] bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-white hover:border-orange-200'}`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-2xl">{display.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-slate-950">{display.label}</span>
                      <span className="mt-0.5 block text-sm font-medium text-slate-500">{display.hint}</span>
                    </span>
                    {selected ? <Check className="h-5 w-5 text-[var(--fr-primary)]" /> : <ChevronRight className="h-5 w-5 text-slate-300" />}
                  </button>
                );
              })}
            </div>
          )}

          {selectedMethod && isInstantMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900 ring-1 ring-blue-100">
              You’ll get a unique payment reference and the organiser’s instructions on the next screen.
            </div>
          )}

          {selectedMethod && isCashMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-slate-700 ring-1 ring-orange-100">
              Give the cash directly to the participant. The club will confirm it before any entry links are activated.
            </div>
          )}

          {formError && !methodsError && <FormError>{formError}</FormError>}

          <button onClick={checkoutMode === 'donation' ? createDonationAndProceed : createOrderAndProceed} disabled={!selectedMethod || submitting || methodsLoading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
            ) : selectedMethod && isCashMethod(selectedMethod) ? (
              <><Check className="h-5 w-5" /> I&apos;ve given the cash</>
            ) : selectedMethod && isStripeMethod(selectedMethod) ? (
              <><CreditCard className="h-5 w-5" /> Continue</>
            ) : (
              <><WalletCards className="h-5 w-5" /> Continue</>
            )}
          </button>

          <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
            Crypto is not shown on peer fundraiser pages yet because peer orders still need a verified on-chain confirmation endpoint.
          </div>
        </StepPanel>
      )}

      {step === 'payment-instructions' && selectedMethod && (checkoutMode === 'donation' || orderId) && (
        <StepPanel title="Complete your payment" subtitle={methodDisplay(selectedMethod).label} onBack={() => setStep('payment')} wide>
          <PaymentInstructionsContent
            method={{
              id: selectedMethod.id,
              methodLabel: selectedMethod.methodLabel,
              methodCategory: selectedMethod.methodCategory,
              providerName: selectedMethod.providerName ?? null,
              playerInstructions: (selectedMethod as any).playerInstructions ?? null,
              methodConfig: ((selectedMethod as any).methodConfig ?? {}) as any,
            }}
            paymentReference={reference}
            totalAmount={payableTotal}
            currencySymbol={currencySymbol(currency)}
            revolutLink={
              String(selectedMethod.providerName || '').toLowerCase() === 'revolut' &&
              (selectedMethod as any).methodConfig &&
              'link' in ((selectedMethod as any).methodConfig as any)
                ? ((selectedMethod as any).methodConfig as any).link
                : undefined
            }
            error={formError}
            hasEverCopied={hasCopiedReference}
            hasOpenedProviderLink={hasOpenedProviderLink}
            onCopied={() => setHasCopiedReference(true)}
            onOpenedLink={() => setHasOpenedProviderLink(true)}
          />

          <div className="mt-5">
            <PaymentInstructionsFooter
              hasEverCopied={hasCopiedReference}
              hasOpenedProviderLink={hasOpenedProviderLink}
              hasProviderStep={hasProviderInstructionStep(selectedMethod)}
              confirming={submitting}
              onConfirmPaid={confirmManualPayment}
              onBack={() => setStep('payment')}
            />
          </div>
        </StepPanel>
      )}

      {step === 'donation-confirm' && donationResult && (
        <StepPanel title="Thank you" subtitle="Your donation has been recorded.">
          <div className="rounded-3xl bg-green-50 p-6 text-center ring-1 ring-green-100">
            <Check className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              {donationResult.status === 'confirmed'
                ? 'Thank you for your donation'
                : 'Donation submitted'}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {donationResult.status === 'claimed'
                ? 'The club will confirm the manual payment before it is included in the amount raised.'
                : donationResult.status === 'confirmed'
                  ? 'Your payment has been confirmed and your donation is now included in the amount raised.'
                  : 'Your payment was received and is still being confirmed. You do not need to pay again.'}
            </p>
            <p className="mt-4 text-xl font-black text-slate-950">
              {fmt(
                Number(donationResult.amount || donationValue),
                donationResult.currency || currency,
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep('packs')}
            className="mt-5 w-full rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white"
          >
            Back to fundraiser
          </button>
        </StepPanel>
      )}

      {step === 'confirm' && orderSummary && (
        <StepPanel title="" wide>
          {['failed', 'attention_required'].includes(
            String((orderSummary as any).fulfilmentStatus || ''),
          ) ? (
            <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-amber-200">
              <div className="text-4xl">⚠️</div>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                Payment confirmed — access is still being prepared
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                Your payment was successful, but one or more activity links
                could not be created automatically. The organiser can retry
                fulfilment from the Orders tab. You do not need to pay again.
              </p>
              {(orderSummary as any).fulfilmentError && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                  Reference: {(orderSummary as any).fulfilmentError}
                </p>
              )}
              <p className="mt-4 text-xs text-slate-500">
                Order ID: {orderId}
              </p>
            </div>
          ) : (
            <PeerOrderThankYou
              order={orderSummary}
              entries={entries}
              fundraiserName={data.fundraiser.name}
              clubName={data.club?.name}
              logoUrl={logoUrl}
              primaryColor={theme.primary}
              textOnPrimaryColor={
                data?.club?.brand_text_on_primary_color || '#ffffff'
              }
              orderId={orderId}
            />
          )}
        </StepPanel>
      )}
    </AppShell>
  );
}

function AppShell({ children, style }: { children: ReactNode; style: CSSProperties }) {
  return (
    <div
      style={style}
      className="fixed inset-0 z-[9999] min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_right,var(--fr-bg),white_42%,#f8fafc_100%)] text-slate-950 overscroll-contain"
    >
      {children}
    </div>
  );
}

function PackChoiceCard({ pack, currency, quantity, onOpen, onAdd, onRemove }: {
  pack: any;
  currency: string;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const featured = getPackFeatured(pack);
  const badge = getPackBadge(pack) || (featured ? 'Most popular' : null);
  const availability = pack?.availability || null;
  const soldOut =
    getPackSoldOut(pack) ||
    availability?.available === false;
  const availabilityMessage =
    availability?.message || (soldOut ? 'Sold out' : null);
  const rooms = getPackRooms(pack);
  const meta = parseJsonMaybe<any>(pack?.metadata_json) ?? {};
  const prizeRoom = rooms.find(room => room.prizes.length > 0);
  const topPrize = prizeRoom?.prizes[0];

  return (
    <article className={`relative overflow-visible rounded-3xl bg-white p-3 shadow-sm ring-1 transition ${featured ? 'ring-[var(--fr-primary)]' : 'ring-slate-200'} ${quantity > 0 ? 'shadow-orange-100 ring-2 ring-[var(--fr-primary)]' : ''}`}>
      {badge && (
        <div className="absolute -top-3 left-5 z-10 flex items-center gap-1.5 rounded-full bg-[var(--fr-primary)] px-5 py-2 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-orange-500/20">
          <Trophy className="h-4 w-4 fill-white text-white" /> {badge}
        </div>
      )}

      <button type="button" onClick={onOpen} className="flex w-full items-center gap-4 pt-2 text-left">
        <div className={`grid h-20 w-20 shrink-0 place-items-center rounded-3xl ${featured ? 'bg-gradient-to-br from-yellow-100 via-amber-100 to-orange-50' : 'bg-slate-50'}`}>
          <PackArtwork pack={pack} featured={featured} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="max-w-full break-words text-[clamp(1.05rem,4.8vw,1.25rem)] font-black leading-tight tracking-tight text-slate-950">{pack.name} — {fmt(pack.price, pack.currency ?? currency)}</h2>
            <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300" />
          </div>
          <div className="mt-2 empty:hidden">
            <SavingsBadge
              price={pack.price}
              configuredValue={meta.configuredValue}
              discountAmount={meta.discountAmount}
              currency={pack.currency ?? currency}
            />
          </div>
          <div className="mt-2 space-y-1">
            {(rooms.length ? rooms : [{ quantity: 1, prizes: [] } as PackRoomDetails]).slice(0, 2).map((room, index) => (
              <div key={`${room.roomId ?? index}`} className="flex min-w-0 items-start gap-2 text-sm font-semibold text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[var(--fr-primary)] p-0.5 text-white" />
                <span className="min-w-0 flex-1 break-words">{includedLine(room)}</span>
              </div>
            ))}
          </div>
          {topPrize && (
            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-xs font-black text-[var(--fr-primary)]">
              <Trophy className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {getPlaceLabel(topPrize.place)} prize:{' '}
                {topPrize.value ? fmt(topPrize.value, pack.currency ?? currency) : topPrize.description}
              </span>
            </div>
          )}
        </div>
      </button>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div>
          <button
            type="button"
            onClick={onOpen}
            className="text-sm font-black text-[var(--fr-primary)]"
          >
            Details & prizes
          </button>
          {!soldOut && availability?.message && (
            <p className="mt-1 text-xs font-black text-amber-700">
              {availability.message}
            </p>
          )}
        </div>
        {soldOut ? (
          <span className="max-w-[55%] rounded-full bg-slate-100 px-3 py-1 text-right text-xs font-black text-slate-600">
            {availabilityMessage}
          </span>
        ) : quantity > 0 ? (
          <div className="flex items-center gap-2 rounded-full bg-orange-50 p-1 ring-1 ring-orange-100">
            <button type="button" onClick={onRemove} className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-900 shadow-sm"><Minus className="h-4 w-4" /></button>
            <span className="w-6 text-center text-base font-black text-slate-950">{quantity}</span>
            <button type="button" onClick={onAdd} className="grid h-9 w-9 place-items-center rounded-full bg-[var(--fr-primary)] text-white shadow-sm"><Plus className="h-4 w-4" /></button>
          </div>
        ) : (
          <button type="button" onClick={onAdd} className="rounded-full bg-[var(--fr-secondary)] px-4 py-2 text-sm font-black text-white">Add</button>
        )}
      </div>
    </article>
  );
}

function PackArtwork({ pack, featured }: { pack: any; featured: boolean }) {
  const room = getPackRooms(pack)[0];
  if (featured) {
    return (
      <div className="relative grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-inner">
        <Trophy className="h-12 w-12 fill-black/90 text-black" />
      </div>
    );
  }

  const className = 'h-9 w-9';
  const type = String(room?.itemType || '').toLowerCase();
  const game = String(room?.gameType || '').toLowerCase();
  if (type === 'puzzle_entry' || game.includes('puzzle')) return <Puzzle className={`${className} text-[var(--fr-primary)]`} />;
  if (type.includes('quiz') || game === 'quiz') return <Users className={`${className} text-slate-950`} />;
  if (type === 'elimination_entry' || game === 'elimination') return <Trophy className={`${className} text-slate-950`} />;
  if (String(pack?.packType || pack?.pack_type || '').toLowerCase() === 'donation') return <Heart className={`${className} fill-[var(--fr-primary)] text-[var(--fr-primary)]`} />;
  return <Gift className={`${className} text-[var(--fr-primary)]`} />;
}

function SelectionBar({ total, count, currency, onContinue, onDonate, canTransact }: { total: number; count: number; currency: string; onContinue: () => void; onDonate: () => void; canTransact: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[10000] border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-2xl backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-2xl">
        {count > 0 ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Total to pay</p>
              <p className="text-2xl font-black tracking-tight text-slate-950">{fmt(total, currency)}</p>
              <p className="text-xs font-bold text-slate-500">{count} pack{count === 1 ? '' : 's'} selected</p>
            </div>
            <button type="button" onClick={onContinue} className="flex shrink-0 items-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20">
              Continue <ArrowRight className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-950">Support this fundraiser</p>
              <p className="text-xs font-bold text-slate-500">Add a pack above, or donate directly.</p>
            </div>
            <button type="button" onClick={onDonate} disabled={!canTransact} className="flex shrink-0 items-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50">
              <Heart className="h-5 w-5" /> Donate
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StepPanel({ title, subtitle, children, onBack, wide = false }: { title: string; subtitle?: string; children: ReactNode; onBack?: () => void; wide?: boolean }) {
  return (
    <main className="flex min-h-[100dvh] items-end justify-center px-0 pt-8 sm:items-center sm:px-4 sm:py-10">
      <section className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-t-[2rem] bg-white p-5 shadow-2xl ring-1 ring-black/5 sm:rounded-[2rem] sm:p-6`}>
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-5 flex items-start gap-3">
          {onBack && <button type="button" onClick={onBack} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"><ArrowLeft className="h-5 w-5" /></button>}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {children}
        <a href="/" className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-[var(--fr-primary)]"><ShieldCheck className="h-4 w-4" /> Created by FundRaisely</a>
      </section>
    </main>
  );
}

function InputShell({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 ring-1 ring-transparent focus-within:border-[var(--fr-primary)] focus-within:ring-orange-100">
      <span className="text-slate-500">{icon}</span>
      {children}
    </div>
  );
}

function OrderMiniSummary({ cartItems, currency }: { cartItems: CartItem[]; currency: string }) {
  const total = cartItems.reduce((sum, item) => sum + asNumber(item.pack.price) * item.quantity, 0);
  return (
    <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Your selection</p>
      <div className="space-y-2">
        {cartItems.map(item => (
          <div key={item.pack.id} className="flex justify-between gap-4 text-sm font-bold text-slate-700">
            <span>{item.pack.name} ×{item.quantity}</span>
            <span>{fmt(asNumber(item.pack.price) * item.quantity, item.pack.currency ?? currency)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-950">
        <span>Total</span>
        <span>{fmt(total, currency)}</span>
      </div>
    </div>
  );
}

function FormError({ children }: { children: ReactNode }) {
  return <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">{children}</div>;
}

function LoadingState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={`grid place-items-center ${compact ? 'py-8' : 'min-h-screen'} text-slate-600`}>
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--fr-primary)]" />
        <p className="mt-3 text-sm font-bold">{message}</p>
      </div>
    </div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <Target className="mx-auto h-10 w-10 text-[var(--fr-primary)]" />
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <div className="mt-5 rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100">
      <Gift className="mx-auto h-9 w-9 text-[var(--fr-primary)]" />
      <h2 className="mt-3 text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
    </div>
  );
}
