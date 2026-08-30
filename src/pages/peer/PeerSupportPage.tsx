// src/pages/peer/PeerSupportPage.tsx
//
// Redesigned peer fundraiser support page.
//
// Layout (packs step):
//   1. Sticky teal header  - "Support [Club Name]", club logo, always visible
//   2. Club hero           - cover image (optional) with video play button (optional)
//   3. Participant strip   - photo, name, personal message, video thumb (all optional)
//                            Only rendered when participantSlug is present / data has participant
//   4. Progress bars       - participant bar (primary) + overall (secondary), or just overall
//   5. Cause section       - fundraiser description + fundraiser-level video (both optional)
//   6. Pack cards          - featured hero card + compact list for the rest
//   7. Sticky bottom bar   - total / donate CTA (unchanged)
//
// All media fields are optional - the layout never breaks if any or all are missing.
// Supported flow: packs -> details -> payment -> payment-instructions -> confirm
//                                             -> crypto-fixed-fee      -> confirm

import {
  type CSSProperties,
  type ReactNode,
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Facebook,
  Gift,
  Heart,
  Linkedin,
  Loader2,
  Mail,
  Minus,
  Play,
  Plus,
  Puzzle,
  Share2,
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
  getPackFeatured,
  getPackSoldOut,
  getPackBadge,
  getTheme,
} from './support/peerSupporthelpers';

import SavingsBadge from './support/SavingsBadge';
import DemoPaymentNotice from '../../components/demo/DemoPaymentNotice';
import ActivityDetailSheet from './support/ActivityDetailSheet';

// ── Lazy crypto imports ────────────────────────────────────────────────────────

const CryptoFixedFeeStep = lazy(() =>
  import('../../components/Quiz/joinroom/crypto/CryptoFixedFeeStep').then(m => ({
    default: m.CryptoFixedFeeStep,
  })),
);

const Web3Provider = lazy(() =>
  import('../../components/Web3Provider').then(m => ({ default: m.Web3Provider })),
);

// ─────────────────────────────────────────────────────────────────────────────

type Step =
  | 'packs'
  | 'details'
  | 'payment'
  | 'payment-instructions'
  | 'crypto-fixed-fee'
  | 'crypto-donation'
  | 'confirm'
  | 'donation-confirm';

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
  const [cryptoDonationId, setCryptoDonationId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);

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
          `/peer-support/donations/status?sessionId=${encodeURIComponent(donationSessionId)}`,
        );

        if (cancelledEffect) return;

        if (result.status === 'confirmed') {
          setDonationResult(result);
          setStep('donation-confirm');
          setDonationReturnLoading(false);
          return;
        }

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
        const available = (result.paymentMethods ?? []) as PublicPeerPaymentMethod[];
        setMethods(available);
        setSelectedMethod(current =>
          available.find((m: PublicPeerPaymentMethod) => m.id === current?.id) ??
          available[0] ??
          null,
        );
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
    [cartItems],
  );
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );
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

  // ── Derived display values ─────────────────────────────────────────────────

  const participantName = firstDefined(
    data?.participant?.participantName,
    data?.participant?.participant_name,
    data?.participant?.name,
  );

  // Header always shows club name
  const clubName = data?.club?.name || 'this fundraiser';
  const headerTitle = `Support ${clubName}`;
  const headerSubtitle = participantName
    ? `Sold by ${participantName} · Official fundraiser`
    : 'Official peer fundraiser';

  const logoUrl = firstDefined(
    data?.club?.logoUrl,
    data?.club?.logo_url,
    data?.club?.brand_logo_url,
    data?.fundraiser?.logoUrl,
    data?.fundraiser?.logo_url,
  );

  // Club-level media (optional)
  const coverImageUrl = firstDefined(
    data?.fundraiser?.settings?.coverImageUrl,
    data?.fundraiser?.coverImageUrl,
  );
  const causeVideoUrl = firstDefined(
    data?.fundraiser?.settings?.videoUrl,
    data?.fundraiser?.videoUrl,
  );

  // Participant-level media (optional)
  const participantPhoto = firstDefined(
    data?.participant?.profileImageUrl,
    data?.participant?.profile_image_url,
  );
  const participantMessage = firstDefined(
    data?.participant?.personalMessage,
    data?.participant?.personal_message,
  );
  const participantVideoUrl = firstDefined(
    data?.participant?.videoUrl,
    data?.participant?.video_url,
  );

  const lifecycle = data?.lifecycle || { state: 'open', canTransact: true, message: null };

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';

  const shareTitle = participantName
    ? `Support ${participantName} - ${data?.fundraiser?.name || clubName}`
    : `Support ${data?.fundraiser?.name || clubName}`;

  const shareText = participantName
    ? `Help support ${participantName} in ${data?.fundraiser?.name || clubName}. Every purchase or donation makes a difference.`
    : `Help support ${data?.fundraiser?.name || clubName}. Every purchase or donation makes a difference.`;

  const personalTarget = asNumber(data?.participant?.personal_target);
  const personalRaised = asNumber(
    firstDefined(data?.participant?.raisedAmount, data?.participant?.raised_amount),
  );
  const overallTarget = asNumber(
    firstDefined(data?.fundraiser?.target_amount, data?.fundraiser?.targetAmount),
  );
  const overallRaised = asNumber(
    firstDefined(data?.fundraiser?.raisedAmount, data?.fundraiser?.raised_amount),
  );

  async function shareFundraiser() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  }

  const setPackQuantity = (pack: any, quantity: number) => {
    if (!lifecycle.canTransact || getPackSoldOut(pack) || pack?.availability?.available === false)
      return;
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
      setFormError(lifecycle.message || 'This fundraiser is no longer accepting payments.');
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
    if (checkoutMode === 'order') {
      if (!name.trim()) { setFormError('Please enter your name.'); return; }
      if (!email.trim()) { setFormError('Please enter your email address.'); return; }
      if (!isValidEmail(email)) { setFormError('Please enter a valid email address.'); return; }
    } else {
      if (donationValue < 0.5 || (email.trim() && !isValidEmail(email))) {
        setFormError(donationValue < 0.5 ? 'Minimum donation is €0.50.' : 'Please enter a valid email address.');
        return;
      }
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

  async function publicPeerRequest(path: string, options: RequestInit = {}) {
    const configuredBase = String(
      import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '',
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
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error || 'request_failed');
    }
    return payload;
  }

  async function createDonationAndProceed() {
    if (!selectedMethod) { setFormError('Please select a payment method.'); return; }

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
          `/peer-support/${encodeURIComponent(data.fundraiser.id)}/donations/stripe-checkout`,
          {
            method: 'POST',
            body: JSON.stringify({
              ...body,
              appOrigin: window.location.origin,
              returnPath: window.location.pathname,
            }),
          },
        );
        if (!result.redirectUrl) throw new Error('Could not start card checkout.');
        window.location.href = result.redirectUrl;
        return;
      }

      if (isCashMethod(selectedMethod)) {
        const result = await publicPeerRequest(
          `/peer-support/${encodeURIComponent(data.fundraiser.id)}/donations/manual`,
          { method: 'POST', body: JSON.stringify({ ...body, paymentReference: null }) },
        );
        setDonationResult(result);
        setStep('donation-confirm');
        return;
      }

      if (isCryptoMethod(selectedMethod)) {
        const result = await publicPeerRequest(
          `/peer-support/${encodeURIComponent(data.fundraiser.id)}/donations/crypto-checkout`,
          {
            method: 'POST',
            body: JSON.stringify({
              participantId:       data.participant?.id || null,
              clubPaymentMethodId: selectedMethod.id,
              donorName:           name.trim() || null,
              donorEmail:          email.trim() || null,
              amount:              donationValue,
            }),
          },
        );
        setCryptoDonationId(result.donationId);
        setStep('crypto-donation');
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
    if (!selectedMethod) { setFormError('Please select a payment method.'); return; }

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

      if (isCryptoMethod(selectedMethod)) {
        setHasCopiedReference(false);
        setHasOpenedProviderLink(false);
        setStep('crypto-fixed-fee');
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
      if (!selectedMethod) { setFormError('Please choose a payment method.'); return; }

      setSubmitting(true);
      setFormError(null);
      try {
        const result = await publicPeerRequest(
          `/peer-support/${encodeURIComponent(data.fundraiser.id)}/donations/manual`,
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

  const firstCartRoomId = useMemo(() => {
    const firstItem = cartItems[0];
    if (!firstItem) return '';
    const rooms = getPackRooms(firstItem.pack);
    return rooms[0]?.roomId ?? '';
  }, [cartItems]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (donationReturnLoading) {
    return (
      <AppShell style={appStyle}>
        <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-5 text-center">
          <div>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-[var(--fr-primary)]" />
            <h1 className="mt-5 text-2xl font-black text-slate-950">Confirming your donation</h1>
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
    return (
      <AppShell style={appStyle}>
        <EmptyState title="Fundraiser not found" message="This peer fundraiser could not be loaded." />
      </AppShell>
    );
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AppShell style={appStyle}>

      {/* ── PACKS STEP ──────────────────────────────────────────────────────── */}
      {step === 'packs' && (
        <>
          {/* ── 1. Sticky header ── */}
          <header className="sticky top-0 z-[9998] flex items-center justify-between gap-3 bg-[var(--fr-primary)] px-4 py-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black tracking-tight text-white">
                {headerTitle}
              </p>
              <p className="text-xs font-semibold text-white/65">{headerSubtitle}</p>
            </div>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={clubName}
                className="h-9 w-9 shrink-0 rounded-full bg-white object-contain ring-2 ring-white/30"
              />
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-black text-white ring-2 ring-white/30">
                {clubName.charAt(0).toUpperCase()}
              </div>
            )}
          </header>

          {/* ── Two-column layout on large screens ─────────────────────────────
               Mobile:  single column, top-to-bottom
               Desktop: centred max-w-5xl, left col = info, right col = packs (sticky)
          ── */}
          <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:pt-8">

            {/* ── LEFT / TOP: Info column ── */}
            <div className="space-y-4 min-w-0">

              {/* Club hero - cover image if set, otherwise a branded fallback.
                  Same aspect ratio in all cases so the layout never shifts. */}
              <div
                className="relative overflow-hidden rounded-2xl bg-[var(--fr-primary)]"
                style={{ aspectRatio: '16/7' }}
              >
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt={data.fundraiser.name || clubName}
                    className="h-full w-full object-cover opacity-90"
                  />
                ) : logoUrl ? (
                  /* No cover image but we have a logo - centre it on the brand colour */
                  <div className="flex h-full w-full items-center justify-center">
                    <img
                      src={logoUrl}
                      alt={clubName}
                      className="h-3/5 w-auto max-w-[55%] object-contain drop-shadow-sm"
                    />
                  </div>
                ) : (
                  /* No image at all - initials on brand colour */
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-5xl font-black text-white/30 select-none">
                      {clubName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                {/* Fundraiser name overlay - always shown at bottom */}
                {data.fundraiser.name && (
                  <div className={`absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 ${coverImageUrl ? 'bg-gradient-to-t from-black/60 to-transparent' : 'bg-gradient-to-t from-black/40 to-transparent'}`}>
                    <p className="text-sm font-black text-white drop-shadow">
                      {data.fundraiser.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Club-level video (optional, shown when no cover image) */}
              {causeVideoUrl && !coverImageUrl && (
                <VideoEmbed url={causeVideoUrl} label="Watch the fundraiser video" />
              )}

              {/* Participant card - photo, name, message, video thumbnail */}
              {participantName && (
                <ParticipantCard
                  name={participantName}
                  photo={participantPhoto ?? null}
                  message={participantMessage ?? null}
                  videoUrl={participantVideoUrl ?? null}
                  primaryColor="var(--fr-primary)"
                />
              )}

              {/* Progress bars */}
              <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                {participantName && (personalTarget > 0 || personalRaised > 0) && (
                  <div className="mb-3">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-black text-slate-900">
                        {fmt(personalRaised, currency)} raised
                      </span>
                      {personalTarget > 0 && (
                        <span className="text-xs font-bold text-[var(--fr-primary)]">
                          {Math.round((personalRaised / personalTarget) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[var(--fr-primary)] transition-all"
                        style={{ width: `${Math.min(100, personalTarget > 0 ? (personalRaised / personalTarget) * 100 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {participantName}'s goal{personalTarget > 0 ? `: ${fmt(personalTarget, currency)}` : ''}
                    </p>
                  </div>
                )}
                {(overallTarget > 0 || overallRaised > 0) && (
                  <div className={participantName && (personalTarget > 0 || personalRaised > 0) ? 'border-t border-slate-100 pt-3' : ''}>
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className={participantName ? 'text-xs font-bold text-slate-500' : 'text-sm font-black text-slate-900'}>
                        {participantName ? 'Overall: ' : ''}{fmt(overallRaised, currency)} raised
                      </span>
                      {overallTarget > 0 && (
                        <span className={`text-xs font-bold ${participantName ? 'text-slate-400' : 'text-[var(--fr-primary)]'}`}>
                          {Math.round((overallRaised / overallTarget) * 100)}%
                        </span>
                      )}
                    </div>
                    <div className={`overflow-hidden rounded-full bg-slate-100 ${participantName ? 'h-1.5' : 'h-2'}`}>
                      <div
                        className={`h-full rounded-full transition-all ${participantName ? 'bg-[var(--fr-primary)]/40' : 'bg-[var(--fr-primary)]'}`}
                        style={{ width: `${Math.min(100, overallTarget > 0 ? (overallRaised / overallTarget) * 100 : 0)}%` }}
                      />
                    </div>
                    {overallTarget > 0 && (
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        Target: {fmt(overallTarget, currency)}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Lifecycle / cancelled notices */}
              {!lifecycle.canTransact && (
                <div className="rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-200">
                  {lifecycle.message || 'This fundraiser is no longer accepting payments.'}
                </div>
              )}
              {cancelled && (
                <div className="rounded-2xl bg-amber-50 p-3 text-center text-sm font-bold text-amber-800 ring-1 ring-amber-100">
                  Checkout was cancelled. Your card was not charged. Choose a pack below to try again.
                </div>
              )}

              {/* Cause description + fundraiser video */}
              {(data.fundraiser.description || causeVideoUrl) && (
                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  {data.fundraiser.description && (
                    <>
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[var(--fr-primary)]">
                        About this cause
                      </p>
                      <p className="text-sm font-medium leading-6 text-slate-600">
                        {data.fundraiser.description}
                      </p>
                    </>
                  )}
                  {causeVideoUrl && (
                    <div className={data.fundraiser.description ? 'mt-4' : ''}>
                      <VideoEmbed url={causeVideoUrl} label="Watch the fundraiser video" />
                    </div>
                  )}
                </div>
              )}

              {/* Share fundraiser */}
              <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--fr-primary)]/10 text-[var(--fr-primary)]">
                    <Share2 className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--fr-primary)]">
                      Help spread the word
                    </p>
                    <h2 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                      Share this fundraiser
                    </h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                      {participantName
                        ? `Help ${participantName} reach more supporters by sharing their fundraising page.`
                        : 'Help this fundraiser reach more supporters by sharing the page.'}
                    </p>
                  </div>
                </div>

                {/* Mobile / native share */}
                <button
                  type="button"
                  onClick={() => void shareFundraiser()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-3.5 text-sm font-black text-white lg:hidden"
                >
                  <Share2 className="h-4 w-4" />
                  {shareCopied ? 'Link copied' : 'Share fundraiser'}
                </button>

                {/* Desktop social share */}
                <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <span className="text-base font-black">𝕏</span>
                    X / Twitter
                  </a>

                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <Linkedin className="h-4 w-4" />
                    LinkedIn
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <Facebook className="h-4 w-4" />
                    Facebook
                  </a>

                  <button
                    type="button"
                    onClick={() => void copyShareLink()}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    <Copy className="h-4 w-4" />
                    {shareCopied ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              </section>

              {/* On mobile, packs render here (inside left col) */}
              <div className="lg:hidden">
                {!data.packs?.length ? (
                  <EmptyCard title="No packs available yet" message="The organiser has not added any peer fundraising packs yet." />
                ) : (
                  <PackGrid
                    packs={data.packs}
                    currency={currency}
                    cart={cart}
                    lifecycle={lifecycle}
                    onOpen={setActivePack}
                    onAdd={(pack) => setPackQuantity(pack, asNumber(cart[pack.id]) + 1)}
                    onRemove={(pack) => setPackQuantity(pack, asNumber(cart[pack.id]) - 1)}
                  />
                )}
              </div>

              <a
                href="/"
                className="flex items-center justify-center gap-2 pt-2 pb-4 text-xs font-bold text-slate-400 hover:text-[var(--fr-primary)]"
              >
                <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
              </a>
            </div>

            {/* ── RIGHT: Packs column (desktop only, sticky) ── */}
            <div className="hidden lg:block min-w-0">
              <div className="sticky top-[64px] space-y-4 overflow-y-auto max-h-[calc(100dvh-80px)] pb-4 pr-1">
                {!data.packs?.length ? (
                  <EmptyCard title="No packs available yet" message="The organiser has not added any peer fundraising packs yet." />
                ) : (
                  <PackGrid
                    packs={data.packs}
                    currency={currency}
                    cart={cart}
                    lifecycle={lifecycle}
                    onOpen={setActivePack}
                    onAdd={(pack) => setPackQuantity(pack, asNumber(cart[pack.id]) + 1)}
                    onRemove={(pack) => setPackQuantity(pack, asNumber(cart[pack.id]) - 1)}
                  />
                )}
                <a
                  href="/"
                  className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-[var(--fr-primary)]"
                >
                  <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
                </a>
              </div>
            </div>

          </div>

          {/* ── Form error ── */}
          {formError && (
            <div className="fixed inset-x-4 bottom-28 z-[10001] mx-auto max-w-md rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
              {formError}
            </div>
          )}

          {/* ── Sticky bottom bar ── */}
          <SelectionBar
            total={total}
            count={cartCount}
            currency={currency}
            onContinue={goToDetails}
            onDonate={startDonation}
            canTransact={lifecycle.canTransact}
          />

          {/* ── Pack detail sheet ── */}
          {activePack && (
            <ActivityDetailSheet
              pack={activePack}
              currency={currency}
              onClose={() => setActivePack(null)}
            />
          )}
        </>
      )}

      {/* ── DETAILS STEP ──────────────────────────────────────────────────── */}
      {step === 'details' && (
        <StepPanel
          title={checkoutMode === 'donation' ? 'Make a donation' : 'Your details'}
          subtitle={
            checkoutMode === 'donation'
              ? `Choose the amount you would like to donate to ${clubName}.`
              : "We'll use this to send your confirmation and entry links."
          }
          onBack={() => setStep('packs')}
        >
          {checkoutMode === 'order' && (
            <div className="space-y-3">
              <InputShell icon={<User className="h-5 w-5" />}>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400"
                />
              </InputShell>
              <InputShell icon={<Mail className="h-5 w-5" />}>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email for confirmation and links"
                  className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400"
                />
              </InputShell>
            </div>
          )}

          {checkoutMode === 'order' ? (
            <OrderMiniSummary cartItems={cartItems} currency={currency} />
          ) : (
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-orange-200 bg-white p-4">
                <label className="text-sm font-black text-slate-700">Donation amount</label>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[5, 10, 20, 50].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDonationAmount(String(preset))}
                      className={`rounded-2xl border py-3 text-sm font-black transition ${
                        donationAmount === String(preset)
                          ? 'border-[var(--fr-primary)] bg-[var(--fr-primary)] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-[var(--fr-primary)] hover:text-[var(--fr-primary)]'
                      }`}
                    >
                      {currencySymbol(currency)}{preset}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-[var(--fr-primary)]">
                  <span className="font-black text-slate-500">{currencySymbol(currency)}</span>
                  <input
                    value={donationAmount}
                    onChange={e => setDonationAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="Or enter your own amount"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-xl font-black outline-none"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="mb-3 text-sm font-black text-slate-700">
                  Your details <span className="font-semibold text-slate-400">(optional)</span>
                </p>
                <div className="space-y-3">
                  <InputShell icon={<User className="h-5 w-5" />}>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Screen name or leave blank to donate anonymously"
                      className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400"
                    />
                  </InputShell>
                  <InputShell icon={<Mail className="h-5 w-5" />}>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email for confirmation (optional)"
                      className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400"
                    />
                  </InputShell>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">
                  You can donate anonymously - no name or email required.
                </p>
              </div>
            </div>
          )}

          {formError && <FormError>{formError}</FormError>}

          <button
            onClick={goToPayment}
            disabled={
              checkoutMode === 'order'
                ? (!name.trim() || !isValidEmail(email))
                : (donationValue <= 0 || (!!email.trim() && !isValidEmail(email)))
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue <ArrowRight className="h-5 w-5" />
          </button>
        </StepPanel>
      )}

      {/* ── PAYMENT STEP ──────────────────────────────────────────────────── */}
      {step === 'payment' && (
        <StepPanel
          title="How would you like to pay?"
          subtitle={`${checkoutMode === 'donation' ? 'Donation' : 'Total to pay'}: ${fmt(payableTotal, currency)}`}
          onBack={() => setStep('details')}
        >
          <DemoPaymentNotice />
          {methodsLoading && <LoadingState message="Loading payment options…" compact />}

          {!methodsLoading && methodsError && (
            <FormError>
              Could not load payment options ({methodsError}). Please refresh and try again.
            </FormError>
          )}

          {!methodsLoading && !methodsError && methods.length === 0 && (
            <FormError>
              No payment methods are configured for this fundraiser yet. Please contact the organiser.
            </FormError>
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
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      selected
                        ? 'border-[var(--fr-primary)] bg-orange-50 ring-2 ring-orange-100'
                        : 'border-slate-200 bg-white hover:border-orange-200'
                    }`}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-50 text-2xl">
                      {display.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-black text-slate-950">{display.label}</span>
                      <span className="mt-0.5 block text-sm font-medium text-slate-500">{display.hint}</span>
                    </span>
                    {selected ? (
                      <Check className="h-5 w-5 text-[var(--fr-primary)]" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-300" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedMethod && isInstantMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-blue-50 p-4 text-sm font-semibold text-blue-900 ring-1 ring-blue-100">
              You'll get a unique payment reference and the organiser's instructions on the next screen.
            </div>
          )}

          {selectedMethod && isCashMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-orange-50 p-4 text-sm font-semibold text-slate-700 ring-1 ring-orange-100">
              Give the cash directly to the participant. The club will confirm it before any entry links are activated.
            </div>
          )}

          {selectedMethod && isCryptoMethod(selectedMethod) && (
            <div className="mt-4 rounded-2xl bg-purple-50 p-4 text-sm font-semibold text-purple-900 ring-1 ring-purple-100">
              You'll pay with a Solana wallet. Your entries are activated immediately after the transaction is verified on-chain.
            </div>
          )}

          {formError && !methodsError && <FormError>{formError}</FormError>}

          <button
            onClick={checkoutMode === 'donation' ? createDonationAndProceed : createOrderAndProceed}
            disabled={!selectedMethod || submitting || methodsLoading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-5 py-4 text-lg font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</>
            ) : selectedMethod && isCashMethod(selectedMethod) ? (
              <><Check className="h-5 w-5" /> I've given the cash</>
            ) : selectedMethod && isStripeMethod(selectedMethod) ? (
              <><CreditCard className="h-5 w-5" /> Continue</>
            ) : selectedMethod && isCryptoMethod(selectedMethod) ? (
              <><span>🪙</span> Continue to crypto payment</>
            ) : (
              <><WalletCards className="h-5 w-5" /> Continue</>
            )}
          </button>
        </StepPanel>
      )}

      {/* ── PAYMENT INSTRUCTIONS STEP ─────────────────────────────────────── */}
      {step === 'payment-instructions' && selectedMethod && (checkoutMode === 'donation' || orderId) && (
        <StepPanel
          title="Complete your payment"
          subtitle={methodDisplay(selectedMethod).label}
          onBack={() => setStep('payment')}
          wide
        >
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

      {/* ── CRYPTO PAYMENT STEP ───────────────────────────────────────────── */}
      {step === 'crypto-fixed-fee' && selectedMethod && orderId && data?.fundraiser && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--fr-primary)]" />
                <p className="mt-3 text-sm font-bold text-slate-600">Loading crypto payment…</p>
              </div>
            </div>
          }
        >
          <Web3Provider force>
            <CryptoFixedFeeStep
              mode="ticket"
              roomId={firstCartRoomId || data.fundraiser.id}
              quoteEndpoint={`/api/peer-support/fundraiser/${data.fundraiser.id}/crypto-quote`}
              purchaserName={name}
              purchaserEmail={email}
              playerName={name}
              selectedMethod={selectedMethod}
              totalFiatAmount={total}
              entryFeeAmount={total}
              extrasAmount={0}
              selectedExtras={[]}
              fiatCurrency={currency}
              currencySymbol={currencySymbol(currency)}
              solanaCluster="mainnet"
              skipInternalJoin
              skipInternalNavigate
              confirmEndpoint={`/api/peer-support/orders/${orderId}/confirm-crypto`}
              onBack={() => setStep('payment')}
              onSuccess={async () => {
                try {
                  await loadOrderSummary(orderId);
                } catch (err: any) {
                  setFormError(
                    err?.message ??
                      'Payment confirmed but could not load your entries. Please check your email.',
                  );
                  setStep('packs');
                }
              }}
            />
          </Web3Provider>
        </Suspense>
      )}

      {/* ── CRYPTO DONATION STEP ──────────────────────────────────────────── */}
      {step === 'crypto-donation' && selectedMethod && cryptoDonationId && data?.fundraiser && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--fr-primary)]" />
                <p className="mt-3 text-sm font-bold text-slate-600">Loading crypto payment…</p>
              </div>
            </div>
          }
        >
          <Web3Provider force>
            <CryptoFixedFeeStep
              mode="ticket"
              roomId={data.fundraiser.id}
              quoteEndpoint={`/api/peer-support/fundraiser/${data.fundraiser.id}/crypto-quote`}
              purchaserName={name}
              purchaserEmail={email}
              playerName={name}
              selectedMethod={selectedMethod}
              totalFiatAmount={donationValue}
              entryFeeAmount={donationValue}
              extrasAmount={0}
              selectedExtras={[]}
              fiatCurrency={currency}
              currencySymbol={currencySymbol(currency)}
              solanaCluster="mainnet"
              skipInternalJoin
              skipInternalNavigate
              confirmEndpoint={`/api/peer-support/donations/${cryptoDonationId}/crypto-confirm`}
              onBack={() => {
                setCryptoDonationId(null);
                setStep('payment');
              }}
              onSuccess={() => {
                setDonationResult({ status: 'confirmed', amount: donationValue, currency });
                setStep('donation-confirm');
              }}
            />
          </Web3Provider>
        </Suspense>
      )}

      {/* ── DONATION CONFIRM STEP ─────────────────────────────────────────── */}
      {step === 'donation-confirm' && donationResult && (
        <StepPanel title="Thank you" subtitle="Your donation has been recorded.">
          <div className="rounded-3xl bg-green-50 p-6 text-center ring-1 ring-green-100">
            <Check className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-4 text-2xl font-black text-slate-950">
              {donationResult.status === 'confirmed' ? 'Thank you for your donation' : 'Donation submitted'}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {donationResult.status === 'claimed'
                ? 'The club will confirm the manual payment before it is included in the amount raised.'
                : donationResult.status === 'confirmed'
                  ? 'Your payment has been confirmed and your donation is now included in the amount raised.'
                  : 'Your payment was received and is still being confirmed. You do not need to pay again.'}
            </p>
            <p className="mt-4 text-xl font-black text-slate-950">
              {fmt(Number(donationResult.amount || donationValue), donationResult.currency || currency)}
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

      {/* ── ORDER CONFIRM STEP ────────────────────────────────────────────── */}
      {step === 'confirm' && orderSummary && (
        <StepPanel title="" wide>
          {['failed', 'attention_required'].includes(
            String((orderSummary as any).fulfilmentStatus || ''),
          ) ? (
            <div className="mx-auto max-w-2xl rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-amber-200">
              <div className="text-4xl">⚠️</div>
              <h2 className="mt-3 text-2xl font-black text-slate-950">
                Payment confirmed - access is still being prepared
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                Your payment was successful, but one or more activity links could not be created
                automatically. The organiser can retry fulfilment from the Orders tab. You do not
                need to pay again.
              </p>
              {(orderSummary as any).fulfilmentError && (
                <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900">
                  Reference: {(orderSummary as any).fulfilmentError}
                </p>
              )}
              <p className="mt-4 text-xs text-slate-500">Order ID: {orderId}</p>
            </div>
          ) : (
            <PeerOrderThankYou
              order={orderSummary}
              entries={entries}
              fundraiserName={data.fundraiser.name}
              clubName={clubName}
              logoUrl={logoUrl}
              primaryColor={theme.primary}
              textOnPrimaryColor={data?.club?.brand_text_on_primary_color || '#ffffff'}
              orderId={orderId}
            />
          )}
        </StepPanel>
      )}

    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pack grid - featured hero card + compact list for the rest
// ─────────────────────────────────────────────────────────────────────────────

function PackGrid({
  packs,
  currency,
  cart,
  lifecycle,
  onOpen,
  onAdd,
  onRemove,
}: {
  packs: any[];
  currency: string;
  cart: Record<string, number>;
  lifecycle: { canTransact: boolean; message: string | null };
  onOpen: (pack: any) => void;
  onAdd: (pack: any) => void;
  onRemove: (pack: any) => void;
}) {
  const featured = packs.find(p => getPackFeatured(p)) ?? null;
  const rest = packs.filter(p => p !== featured);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Choose a pack
      </p>

      {/* Featured hero card */}
      {featured && (
        <FeaturedPackCard
          pack={featured}
          currency={currency}
          quantity={asNumber(cart[featured.id])}
          soldOut={getPackSoldOut(featured) || featured?.availability?.available === false}
          canTransact={lifecycle.canTransact}
          onOpen={() => onOpen(featured)}
          onAdd={() => onAdd(featured)}
          onRemove={() => onRemove(featured)}
        />
      )}

      {/* Individual cards for remaining packs */}
      {rest.length > 0 && (
        <div className="space-y-3">
          {rest.map((pack) => (
            <CompactPackRow
              key={pack.id}
              pack={pack}
              currency={currency}
              quantity={asNumber(cart[pack.id])}
              soldOut={getPackSoldOut(pack) || pack?.availability?.available === false}
              canTransact={lifecycle.canTransact}
              onOpen={() => onOpen(pack)}
              onAdd={() => onAdd(pack)}
              onRemove={() => onRemove(pack)}
            />
          ))}
        </div>
      )}

      {/* If no featured pack, all packs as individual cards */}
      {!featured && packs.length > 0 && (
        <div className="space-y-3">
          {packs.map((pack) => (
            <CompactPackRow
              key={pack.id}
              pack={pack}
              currency={currency}
              quantity={asNumber(cart[pack.id])}
              soldOut={getPackSoldOut(pack) || pack?.availability?.available === false}
              canTransact={lifecycle.canTransact}
              onOpen={() => onOpen(pack)}
              onAdd={() => onAdd(pack)}
              onRemove={() => onRemove(pack)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Featured hero card ────────────────────────────────────────────────────────

function FeaturedPackCard({
  pack, currency, quantity, soldOut, canTransact, onOpen, onAdd, onRemove,
}: {
  pack: any; currency: string; quantity: number; soldOut: boolean;
  canTransact: boolean; onOpen: () => void; onAdd: () => void; onRemove: () => void;
}) {
  const badge = getPackBadge(pack) || 'Most popular';
  const rooms = getPackRooms(pack);
  const meta = parseJsonMaybe<any>(pack?.metadata_json) ?? {};

  return (
    <article
      className={`overflow-hidden rounded-2xl ring-2 ${
        quantity > 0 ? 'ring-[var(--fr-primary)]' : 'ring-[var(--fr-primary)]/60'
      }`}
    >
      {/* Badge strip */}
      <div className="flex items-center gap-1.5 bg-[var(--fr-primary)] px-4 py-1.5">
        <Trophy className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
        <span className="text-xs font-black uppercase tracking-wide text-white">{badge}</span>
      </div>

      {/* Body */}
      <div className="bg-[var(--fr-primary)]/5 p-4">
        <button type="button" onClick={onOpen} className="flex w-full items-start gap-4 text-left">
          {/* Icon */}
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-50">
            <Trophy className="h-9 w-9 fill-amber-400 text-amber-400" />
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black leading-tight text-slate-900">{pack.name}</p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-lg font-black text-[var(--fr-primary)]">
                {fmt(pack.price, pack.currency ?? currency)}
              </span>
              <SavingsBadge
                price={pack.price}
                configuredValue={meta.configuredValue}
                discountAmount={meta.discountAmount}
                currency={pack.currency ?? currency}
              />
            </div>

            {/* What's included - compact, no duplicate ticks */}
            {rooms.length > 0 && (
              <ul className="mt-2 space-y-1">
                {rooms.slice(0, 3).map((room, idx) => (
                  <li key={`${room.roomId ?? idx}`} className="flex items-start gap-2 text-sm font-semibold text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-[var(--fr-primary)] p-0.5 text-white" />
                    <span>{includedLine(room)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </button>

        {/* Footer: details link + CTA */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--fr-primary)]/15 pt-3">
          <button
            type="button"
            onClick={onOpen}
            className="text-sm font-black text-[var(--fr-primary)]"
          >
            Details & prizes
          </button>

          {soldOut ? (
            <span className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-black text-slate-500">
              Sold out
            </span>
          ) : quantity > 0 ? (
            <div className="flex items-center gap-2 rounded-full bg-white p-1 ring-1 ring-[var(--fr-primary)]/20">
              <button
                type="button"
                onClick={onRemove}
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-900"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-base font-black text-slate-950">{quantity}</span>
              <button
                type="button"
                onClick={onAdd}
                className="grid h-9 w-9 place-items-center rounded-full bg-[var(--fr-primary)] text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={canTransact ? onAdd : undefined}
              disabled={!canTransact}
              className="rounded-full bg-[var(--fr-primary)] px-6 py-2.5 text-sm font-black text-white disabled:opacity-50"
            >
              Add to cart
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Compact pack row ──────────────────────────────────────────────────────────
// Each pack is its own card so it's obviously tappable and distinct.
// Chevron on the right of the info section signals "tap for details".
// The Add / qty control sits below, spanning the full card width.

function CompactPackRow({
  pack, currency, quantity, soldOut, canTransact, onOpen, onAdd, onRemove,
}: {
  pack: any; currency: string; quantity: number; soldOut: boolean;
  canTransact: boolean; onOpen: () => void; onAdd: () => void; onRemove: () => void;
}) {
  const rooms = getPackRooms(pack);
  const meta = parseJsonMaybe<any>(pack?.metadata_json) ?? {};

  const summaryParts: string[] = [];
  if (rooms.length > 0) rooms.slice(0, 2).forEach(r => summaryParts.push(includedLine(r)));
  const summary = summaryParts.join(' · ') || pack.description || '';

  return (
    <article
      className={`rounded-2xl bg-white ring-1 transition-shadow ${
        quantity > 0 ? 'ring-2 ring-[var(--fr-primary)]' : 'ring-slate-200 hover:ring-slate-300'
      }`}
    >
      {/* Main info area - full width tap target for details */}
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 px-4 pt-4 pb-3 text-left"
      >
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${quantity > 0 ? 'bg-[var(--fr-primary)]/10' : 'bg-slate-50'}`}>
          <PackIcon pack={pack} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-tight text-slate-900">{pack.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-black text-[var(--fr-primary)]">
              {fmt(pack.price, pack.currency ?? currency)}
            </span>
            {meta.discountAmount > 0 && (
              <SavingsBadge
                price={pack.price}
                configuredValue={meta.configuredValue}
                discountAmount={meta.discountAmount}
                currency={pack.currency ?? currency}
              />
            )}
          </div>
          {summary && (
            <p className="mt-1 text-xs font-medium leading-5 text-slate-400">
              {summary}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </button>

      {/* Footer row - tapping "Tap for details" opens sheet, Add/qty controls are independent */}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-semibold text-slate-400"
        >
          {soldOut ? 'Sold out' : 'Tap for details'}
        </button>

        {soldOut ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
            Sold out
          </span>
        ) : quantity > 0 ? (
          <div className="flex items-center gap-1.5 rounded-full bg-orange-50 p-1 ring-1 ring-orange-100">
            <button
              type="button"
              onClick={onRemove}
              className="grid h-7 w-7 place-items-center rounded-full bg-white text-slate-900"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-black text-slate-950">{quantity}</span>
            <button
              type="button"
              onClick={onAdd}
              className="grid h-7 w-7 place-items-center rounded-full bg-[var(--fr-primary)] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={canTransact ? onAdd : undefined}
            disabled={!canTransact}
            className="rounded-full bg-[var(--fr-secondary)] px-5 py-2 text-sm font-black text-white disabled:opacity-50"
          >
            Add
          </button>
        )}
      </div>
    </article>
  );
}

// ── Pack icon (reused from original, simplified) ──────────────────────────────

function PackIcon({ pack }: { pack: any }) {
  const rooms = getPackRooms(pack);
  const room = rooms[0];
  const className = 'h-5 w-5';
  const type = String(room?.itemType || '').toLowerCase();
  const game = String(room?.gameType || '').toLowerCase();
  if (type === 'puzzle_entry' || game.includes('puzzle'))
    return <Puzzle className={`${className} text-[var(--fr-primary)]`} />;
  if (type.includes('quiz') || game === 'quiz')
    return <Users className={`${className} text-slate-600`} />;
  if (type === 'elimination_entry' || game === 'elimination')
    return <Trophy className={`${className} text-slate-600`} />;
  if (String(pack?.packType || pack?.pack_type || '').toLowerCase() === 'donation')
    return <Heart className={`${className} fill-[var(--fr-primary)] text-[var(--fr-primary)]`} />;
  return <Gift className={`${className} text-[var(--fr-primary)]`} />;
}

// ── Participant card ──────────────────────────────────────────────────────────
// Shows the participant's photo, name, personal message, and an optional video
// thumbnail. Clicking the thumbnail opens the video in a full-screen overlay
// that dismisses on click outside or the X button. All fields are optional.

function ParticipantCard({
  name,
  photo,
  message,
  videoUrl,
  primaryColor,
}: {
  name: string;
  photo: string | null;
  message: string | null;
  videoUrl: string | null;
  primaryColor: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {/* Header row: photo + name + video thumb */}
        <div className="flex items-center gap-3 p-4">
          {/* Photo */}
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-[var(--fr-primary)]/25"
            />
          ) : (
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
              style={{ background: `color-mix(in srgb, ${primaryColor} 12%, transparent)` }}
            >
              <User className="h-7 w-7 text-[var(--fr-primary)]" />
            </div>
          )}

          {/* Name + label */}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--fr-primary)]">
              Supporting
            </p>
            <p className="text-base font-black leading-tight text-slate-900">{name}</p>
          </div>

          {/* Video thumbnail (optional) */}
          {videoUrl && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Watch ${name}'s video`}
              className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-700 transition hover:ring-[var(--fr-primary)]"
            >
              {/* YouTube thumbnail if we can extract an ID */}
              <YouTubeThumbnail url={videoUrl} />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/95">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-[var(--fr-primary)] text-[var(--fr-primary)]" />
                </div>
              </div>
              <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-white/80">
                Watch video
              </span>
            </button>
          )}
        </div>

        {/* Message (optional) - full width below the header */}
        {message && (
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-sm font-medium italic leading-6 text-slate-600">
              "{message}"
            </p>
          </div>
        )}
      </div>

      {/* Lightbox overlay */}
      {lightboxOpen && videoUrl && (
        <VideoLightbox url={videoUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ── YouTube thumbnail helper ──────────────────────────────────────────────────

function YouTubeThumbnail({ url }: { url: string }) {
  const ytId = getYouTubeId(url);
  if (!ytId) return null;
  return (
    <img
      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover opacity-80"
    />
  );
}

// ── Video lightbox overlay ────────────────────────────────────────────────────
// Renders as a fixed full-screen backdrop with the video centred inside.
// Uses a portal-like pattern: the div is inside AppShell (fixed positioned),
// which works fine since AppShell itself is fixed inset-0 with overflow-y-auto.

function VideoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const ytId = getYouTubeId(url);
  const vimeoId = !ytId ? getVimeoId(url) : null;

  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`
      : null;

  return (
    <div
      className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        aria-label="Close video"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </button>

      {/* Video container - stop click propagation so clicking video doesn't close */}
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-black"
        style={{ paddingBottom: '56.25%' }}
        onClick={e => e.stopPropagation()}
      >
        {embedSrc ? (
          <iframe
            src={embedSrc}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          // Fallback: can't embed, open in new tab
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-white">
            <Play className="h-12 w-12 opacity-50" />
            <p className="text-sm font-semibold opacity-70">Can't embed this video.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-black text-slate-900"
            >
              Open video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}


// Plays inline for YouTube and Vimeo URLs. Falls back to a clickable thumbnail
// that opens the URL in a new tab for any other host. Safe: returns null if url
// is falsy so callers don't need to guard.

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0] || null;
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') ?? u.pathname.split('/').pop() ?? null;
    }
  } catch {}
  return null;
}

function getVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('vimeo.com')) {
      const parts = u.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1] ?? null;
    }
  } catch {}
  return null;
}

function VideoEmbed({
  url,
  label,
  className: extraClass = '',
}: {
  url: string;
  label?: string;
  className?: string;
}) {
  if (!url) return null;

  const ytId = getYouTubeId(url);
  const vimeoId = !ytId ? getVimeoId(url) : null;

  const embedSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`
      : null;

  if (embedSrc) {
    return (
      <div className={`relative w-full overflow-hidden rounded-2xl bg-slate-900 ${extraClass}`} style={{ paddingBottom: '56.25%' }}>
        <iframe
          src={embedSrc}
          title={label || 'Video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  // Fallback for non-YouTube/Vimeo: open in new tab
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-900 ${extraClass}`}
      aria-label={label || 'Watch video'}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/95 ring-4 ring-white/30 transition group-hover:scale-105">
        <Play className="ml-1 h-6 w-6 fill-[var(--fr-primary)] text-[var(--fr-primary)]" />
      </div>
      {label && (
        <span className="absolute bottom-3 left-0 right-0 text-center text-xs font-bold text-white/80">
          {label}
        </span>
      )}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared shell components (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

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

function SelectionBar({
  total, count, currency, onContinue, onDonate, canTransact,
}: {
  total: number; count: number; currency: string;
  onContinue: () => void; onDonate: () => void; canTransact: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[10000] border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-2xl backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-3 lg:max-w-2xl">
        {count > 0 ? (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">Total to pay</p>
              <p className="text-2xl font-black tracking-tight text-slate-950">{fmt(total, currency)}</p>
              <p className="text-xs font-bold text-slate-500">
                {count} pack{count === 1 ? '' : 's'} selected
              </p>
            </div>
            <button
              type="button"
              onClick={onContinue}
              className="flex shrink-0 items-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20"
            >
              Continue <ArrowRight className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-slate-950">Support this fundraiser</p>
              <p className="text-xs font-bold text-slate-500">Add a pack above, or donate directly.</p>
            </div>
            <button
              type="button"
              onClick={onDonate}
              disabled={!canTransact}
              className="flex shrink-0 items-center gap-2 rounded-2xl bg-[var(--fr-primary)] px-6 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Heart className="h-5 w-5" /> Donate
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function StepPanel({
  title, subtitle, children, onBack, wide = false,
}: {
  title: string; subtitle?: string; children: ReactNode; onBack?: () => void; wide?: boolean;
}) {
  return (
    <main className="flex min-h-[100dvh] items-end justify-center px-0 pt-8 sm:items-center sm:px-4 sm:py-10">
      <section
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} rounded-t-[2rem] bg-white p-5 shadow-2xl ring-1 ring-black/5 sm:rounded-[2rem] sm:p-6`}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="mb-5 flex items-start gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-950">{title}</h1>
            {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {children}
        <a
          href="/"
          className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-[var(--fr-primary)]"
        >
          <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
        </a>
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
  const total = cartItems.reduce(
    (sum, item) => sum + asNumber(item.pack.price) * item.quantity, 0,
  );
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
  return (
    <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
      {children}
    </div>
  );
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