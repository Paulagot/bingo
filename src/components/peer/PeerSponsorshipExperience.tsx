// src/components/peer/PeerSponsorshipExperience.tsx
//
// Peer-first sponsorship supporter experience — redesigned to match the
// PeerSupportPage layout system:
//   1. Sticky teal header  — "Support [Club Name]" + logo
//   2. Club hero           — cover image, or logo on brand colour, or initial
//   3. Participant card    — photo, name, message, video thumbnail → lightbox
//   4. Progress bars       — participant (primary) + overall (secondary)
//   5. Cause section       — description + fundraiser video
//   6. Desktop: two-column layout (info left, sponsorship CTA panel right)
//   7. Sticky bottom bar   — "Sponsor [name]" CTA
//   8. Sponsorship sheet   — slides up on tap (unchanged logic)
//
// All media fields are optional — layout never breaks if any are missing.

import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Heart,
  Loader2,
  Play,
  ShieldCheck,
  Target,
  User,
  X,
} from 'lucide-react';
import {
  PaymentMethodSelector,
  type ClubPaymentMethod,
} from '../Quiz/shared/PaymentMethodSelector';
import { PaymentInstructions } from '../Quiz/shared/PaymentInstructions';
import { publicSponsoredActivityService } from '../../services/PublicSponsoredActivityService';
import DemoPaymentNotice from '../demo/DemoPaymentNotice';

const Web3Provider = lazy(() =>
  import('../Web3Provider').then(m => ({ default: m.Web3Provider })),
);

const SponsoredCryptoPaymentStep = lazy(() =>
  import('../sponsor/SponsoredCryptoPaymentStep'),
);

// ─────────────────────────────────────────────────────────────────────────────

type SheetStep = 'details' | 'payment' | 'manual' | 'crypto' | 'success' | 'waiting-stripe';

type Props = {
  data: any;
  clubSlug: string;
  fundraiserSlug: string;
  participantSlug?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const SYMBOLS: Record<string, string> = { EUR: '€', GBP: '£', USD: '$', CAD: 'CA$' };

function amountText(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency', currency, maximumFractionDigits: 2,
  }).format(amount || 0);
}

function symbolFor(currency: string) {
  return SYMBOLS[currency] || `${currency} `;
}

function generateReference() {
  return `SPON-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

// ── Video helpers ─────────────────────────────────────────────────────────────

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

// ── VideoEmbed — inline iframe for YouTube/Vimeo, link fallback otherwise ────

function VideoEmbed({ url, label }: { url: string; label?: string }) {
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
      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-900" style={{ paddingBottom: '56.25%' }}>
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

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-900"
      aria-label={label || 'Watch video'}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/95 ring-4 ring-white/30 transition group-hover:scale-105">
        <Play className="ml-1 h-6 w-6 fill-current text-slate-800" />
      </div>
    </a>
  );
}

// ── VideoLightbox — full-screen overlay that autoplays ────────────────────────

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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-white">
            <Play className="h-12 w-12 opacity-50" />
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

// ── YouTubeThumbnail — static image for video preview buttons ─────────────────

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

// ── ParticipantCard ───────────────────────────────────────────────────────────

function ParticipantCard({
  name,
  photo,
  message,
  videoUrl,
  primary,
}: {
  name: string;
  photo: string | null;
  message: string | null;
  videoUrl: string | null;
  primary: string;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="flex items-center gap-3 p-4">
          {photo ? (
            <img
              src={photo}
              alt={name}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-slate-200"
            />
          ) : (
            <div
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full"
              style={{ background: `${primary}18` }}
            >
              <User className="h-7 w-7" style={{ color: primary }} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: primary }}>
              Supporting
            </p>
            <p className="text-base font-black leading-tight text-slate-900">{name}</p>
          </div>

          {videoUrl && (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Watch ${name}'s video`}
              className="group relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-900 ring-1 ring-slate-700 transition hover:ring-2"
              style={{ '--tw-ring-color': primary } as React.CSSProperties}
            >
              <YouTubeThumbnail url={videoUrl} />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-white/95">
                  <Play className="ml-0.5 h-3.5 w-3.5 fill-current" style={{ color: primary }} />
                </div>
              </div>
              <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-white/80">
                Watch video
              </span>
            </button>
          )}
        </div>

        {message && (
          <div className="border-t border-slate-100 px-4 py-3">
            <p className="text-sm font-medium italic leading-6 text-slate-600">
              "{message}"
            </p>
          </div>
        )}
      </div>

      {lightboxOpen && videoUrl && (
        <VideoLightbox url={videoUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

// ── Sponsorship CTA panel — shown in right column on desktop ──────────────────

function SponsorshipPanel({
  participantName,
  activity,
  currency,
  primary,
  textOnPrimary,
  canTransact,
  onSponsor,
}: {
  participantName: string | null;
  activity: any;
  currency: string;
  primary: string;
  textOnPrimary: string;
  canTransact: boolean;
  onSponsor: () => void;
}) {
  const suggested: number[] = (activity?.suggestedAmounts || []).map(Number);

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <div className="p-4" style={{ background: `${primary}0e` }}>
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: primary }}>
          {activity?.activityLabel || 'Sponsorship'}
        </p>
        <p className="mt-1 text-lg font-black leading-tight text-slate-900">
          {participantName ? `Sponsor ${participantName}` : 'Make a sponsorship'}
        </p>
        {suggested.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suggested.slice(0, 4).map(amt => (
              <span
                key={amt}
                className="rounded-full border px-3 py-1 text-sm font-black"
                style={{ borderColor: `${primary}40`, color: primary, background: `${primary}10` }}
              >
                {symbolFor(currency)}{amt}
              </span>
            ))}
            <span className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-500">
              Custom
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={onSponsor}
          disabled={!canTransact}
          className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-base font-black shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: primary, color: textOnPrimary }}
        >
          <Heart className="h-5 w-5" />
          {participantName ? `Sponsor ${participantName}` : 'Sponsor this fundraiser'}
        </button>
        {!canTransact && (
          <p className="mt-2 text-center text-xs font-semibold text-slate-400">
            This fundraiser is no longer accepting sponsorships.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function PeerSponsorshipExperience({ data }: Props) {
  const fundraiser = data.fundraiser;
  const participant = data.participant;
  const sponsoredRoom = data.sponsoredRoom;
  const roomId = sponsoredRoom?.roomId;

  // ── Derived display values ─────────────────────────────────────────────────

  const clubName = data?.club?.name || fundraiser?.name || 'this fundraiser';

  const participantName =
    participant?.participant_name || participant?.participantName || null;

  const participantMessage =
    participant?.personal_message || participant?.personalMessage || null;

  const participantPhoto =
    participant?.profile_image_url || participant?.profileImageUrl || null;

  const participantVideoUrl =
    participant?.video_url || participant?.videoUrl || null;

  const logoUrl =
    data?.club?.logoUrl || data?.club?.logo_url || data?.club?.brand_logo_url || null;

  const coverImageUrl = fundraiser?.settings?.coverImageUrl || null;
  const causeVideoUrl = fundraiser?.settings?.videoUrl || null;
  const causeStory = fundraiser?.description || null;

  const currency = sponsoredRoom?.currency || fundraiser?.currency || 'EUR';

  const personalTarget = readNumber(participant?.personal_target, participant?.personalTarget);
  const personalRaised = readNumber(
    participant?.sponsorship_total,
    participant?.raised_amount,
    participant?.raisedAmount,
  );
  const overallTarget = readNumber(fundraiser?.target_amount, fundraiser?.targetAmount);
  const overallRaised = readNumber(
    fundraiser?.sponsorship_total,
    fundraiser?.raised_amount,
    fundraiser?.raisedAmount,
  );

  const lifecycle = data?.lifecycle || { state: 'open', canTransact: true, message: null };

  // ── Theme colours (fall back to teal to match PeerSupportPage) ────────────

  const primary =
    data?.club?.brand_primary_color ||
    data?.club?.brandPrimaryColor ||
    '#0f6e56';

  const textOnPrimary =
    data?.club?.brand_text_on_primary_color ||
    '#ffffff';

  // ── Activity loading ───────────────────────────────────────────────────────

  const [activity, setActivity] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  // ── Sheet state ────────────────────────────────────────────────────────────

  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<SheetStep>('details');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorEmail, setSponsorEmail] = useState('');
  const [message, setMessage] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentReference] = useState(generateReference);
  const [contributionId, setContributionId] = useState<string | null>(null);
  const [cryptoWallet, setCryptoWallet] = useState<string | null>(null);

  const amount = useMemo(() => {
    if (customAmount.trim()) return Number(customAmount);
    return selectedAmount || 0;
  }, [customAmount, selectedAmount]);

  // ── Load activity ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!roomId) {
      setActivityError('This fundraiser is not linked to a sponsored activity.');
      setActivityLoading(false);
      return;
    }
    publicSponsoredActivityService
      .getActivity(roomId)
      .then(({ activity: loaded }: any) => {
        setActivity(loaded);
        const first = loaded?.suggestedAmounts?.[0];
        if (first) setSelectedAmount(Number(first));
      })
      .catch((err: Error) => setActivityError(err.message || 'Could not load the activity.'))
      .finally(() => setActivityLoading(false));
  }, [roomId]);

  // ── Stripe return polling ──────────────────────────────────────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!roomId || !sessionId) return;

    setSheetOpen(true);
    setStep('waiting-stripe');

    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const started = Date.now();

    async function poll() {
      try {
        const result = await publicSponsoredActivityService.getStatus(roomId!, {
          sessionId: sessionId || undefined,
        });
        if (stopped) return;

        if (result.status === 'confirmed') {
          setContributionId(result.contributionId);
          setStep('success');
          const clean = new URL(window.location.href);
          clean.searchParams.delete('session_id');
          window.history.replaceState({}, '', `${clean.pathname}${clean.search}`);
          return;
        }

        if (['failed', 'expired', 'cancelled'].includes(result.status)) {
          setFormError('The card checkout was not completed. You can try again.');
          setStep('details');
          return;
        }

        if (Date.now() - started < 5 * 60 * 1000) timer = setTimeout(poll, 2500);
      } catch {
        if (!stopped && Date.now() - started < 5 * 60 * 1000) timer = setTimeout(poll, 2500);
      }
    }

    void poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [roomId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openSheet() {
    setFormError(null);
    setStep('details');
    setSheetOpen(true);
  }

  function validateDetails() {
    setFormError(null);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000) {
      setFormError('Choose or enter a valid sponsorship amount.');
      return false;
    }
    if (!sponsorName.trim()) { setFormError('Please enter your name.'); return false; }
    if (sponsorEmail && !/^\S+@\S+\.\S+$/.test(sponsorEmail.trim())) {
      setFormError('Please enter a valid email address.');
      return false;
    }
    return true;
  }

  function contributionPayload(method: ClubPaymentMethod) {
    return {
      sponsorName: sponsorName.trim(),
      sponsorEmail: sponsorEmail.trim() || undefined,
      message: message.trim() || undefined,
      amount,
      clubPaymentMethodId: method.id,
      peerFundraiserId: fundraiser.id,
      peerParticipantId: participant?.id || undefined,
    };
  }

  function continueToPayment() {
    if (!validateDetails()) return;
    const methods = activity?.paymentMethods || [];
    if (!methods.length) {
      setFormError('The club has not enabled a payment method for this activity.');
      return;
    }
    if (methods.length === 1) { void handleMethod(methods[0]); return; }
    setStep('payment');
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
          returnPath: window.location.pathname,
          activityLabel: participantName
            ? `${participantName} — ${activity.activityLabel}`
            : activity.activityLabel,
        } as any);
        window.location.href = result.redirectUrl;
      } catch (err) {
        setFormError((err as Error).message || 'Could not start card checkout.');
        setStep('payment');
      } finally { setSubmitting(false); }
      return;
    }

    if (category === 'crypto') {
      setSubmitting(true);
      try {
        const result = await publicSponsoredActivityService.createCryptoContribution(
          roomId,
          contributionPayload(method) as any,
        );
        setContributionId(result.contributionId);
        setCryptoWallet(result.walletAddress);
        setStep('crypto');
      } catch (err) {
        setFormError((err as Error).message || 'Could not prepare the crypto payment.');
      } finally { setSubmitting(false); }
      return;
    }

    setStep('manual');
  }

  async function confirmManualPaid() {
    if (!roomId || !selectedMethod) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await publicSponsoredActivityService.createManualContribution(roomId, {
        ...contributionPayload(selectedMethod),
        paymentReference,
      } as any);
      setContributionId(result.contributionId);
      setStep('success');
    } catch (err) {
      setFormError((err as Error).message || 'Could not record the payment claim.');
    } finally { setSubmitting(false); }
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (activityLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin" style={{ color: primary }} />
          <p className="mt-3 text-sm font-bold text-slate-600">Loading fundraiser…</p>
        </div>
      </div>
    );
  }

  if (activityError || !activity) {
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md rounded-3xl bg-white p-7 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-3 text-2xl font-black text-slate-950">Sponsorship page unavailable</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">{activityError}</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-[9999] min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[#f8fafc] text-slate-950 overscroll-contain"
    >
      {/* ── 1. Sticky header ── */}
      <header
        className="sticky top-0 z-[9998] flex items-center justify-between gap-3 px-4 py-3 shadow-sm"
        style={{ background: primary }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-black tracking-tight text-white">
            Support {clubName}
          </p>
          <p className="text-xs font-semibold text-white/65">
            {participantName ? `Sold by ${participantName} · ` : ''}Official fundraiser
          </p>
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

      {/* ── Two-column layout on large screens ── */}
      <div className="mx-auto w-full max-w-5xl px-4 pb-32 pt-4 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10 lg:pt-8">

        {/* ── LEFT / TOP: Info column ── */}
        <div className="space-y-4 min-w-0">

          {/* ── 2. Club hero (cover image / logo / initial fallback) ── */}
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{ aspectRatio: '16/7', background: primary }}
          >
            {coverImageUrl ? (
              <img
                src={coverImageUrl}
                alt={fundraiser?.name || clubName}
                className="h-full w-full object-cover opacity-90"
              />
            ) : logoUrl ? (
              <div className="flex h-full w-full items-center justify-center">
                <img
                  src={logoUrl}
                  alt={clubName}
                  className="h-3/5 w-auto max-w-[55%] object-contain drop-shadow-sm"
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="select-none text-5xl font-black text-white/30">
                  {clubName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {fundraiser?.name && (
              <div className={`absolute inset-x-0 bottom-0 px-4 pb-3 pt-8 ${coverImageUrl ? 'bg-gradient-to-t from-black/60 to-transparent' : 'bg-gradient-to-t from-black/40 to-transparent'}`}>
                <p className="text-sm font-black text-white drop-shadow">{fundraiser.name}</p>
              </div>
            )}
          </div>

          {/* Club video (optional, when no cover image) */}
          {causeVideoUrl && !coverImageUrl && (
            <VideoEmbed url={causeVideoUrl} label="Watch the fundraiser video" />
          )}

          {/* ── 3. Participant card ── */}
          {participantName && (
            <ParticipantCard
              name={participantName}
              photo={participantPhoto}
              message={participantMessage}
              videoUrl={participantVideoUrl}
              primary={primary}
            />
          )}

          {/* ── 4. Progress bars ── */}
          {(personalRaised > 0 || personalTarget > 0 || overallRaised > 0 || overallTarget > 0) && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              {/* Personal bar */}
              {participantName && (personalTarget > 0 || personalRaised > 0) && (
                <div className="mb-3">
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-black text-slate-900">
                      {amountText(personalRaised, currency)} raised
                    </span>
                    {personalTarget > 0 && (
                      <span className="text-xs font-bold" style={{ color: primary }}>
                        {Math.round((personalRaised / personalTarget) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, personalTarget > 0 ? (personalRaised / personalTarget) * 100 : 0)}%`,
                        background: primary,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    {participantName}'s goal{personalTarget > 0 ? `: ${amountText(personalTarget, currency)}` : ''}
                  </p>
                </div>
              )}

              {/* Overall bar */}
              {(overallTarget > 0 || overallRaised > 0) && (
                <div className={participantName && (personalTarget > 0 || personalRaised > 0) ? 'border-t border-slate-100 pt-3' : ''}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <span className={participantName ? 'text-xs font-bold text-slate-500' : 'text-sm font-black text-slate-900'}>
                      {participantName ? 'Overall: ' : ''}{amountText(overallRaised, currency)} raised
                    </span>
                    {overallTarget > 0 && (
                      <span className="text-xs font-bold text-slate-400">
                        {Math.round((overallRaised / overallTarget) * 100)}%
                      </span>
                    )}
                  </div>
                  <div className={`overflow-hidden rounded-full bg-slate-100 ${participantName ? 'h-1.5' : 'h-2'}`}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, overallTarget > 0 ? (overallRaised / overallTarget) * 100 : 0)}%`,
                        background: participantName ? `${primary}55` : primary,
                      }}
                    />
                  </div>
                  {overallTarget > 0 && (
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Target: {amountText(overallTarget, currency)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lifecycle notice */}
          {!lifecycle.canTransact && (
            <div className="rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-200">
              {lifecycle.message || 'This fundraiser is no longer accepting sponsorships.'}
            </div>
          )}

          {/* ── 5. Cause description + fundraiser video ── */}
          {(causeStory || causeVideoUrl) && (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              {activity?.activityLabel && (
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 shrink-0" style={{ color: primary }} />
                  <p className="text-xs font-black uppercase tracking-widest" style={{ color: primary }}>
                    {activity.activityLabel}
                  </p>
                </div>
              )}
              {causeStory && (
                <p className="text-sm font-medium leading-6 text-slate-600">{causeStory}</p>
              )}
              {causeVideoUrl && (
                <div className={causeStory ? 'mt-4' : ''}>
                  <VideoEmbed url={causeVideoUrl} label="Watch the fundraiser video" />
                </div>
              )}
            </div>
          )}

          {/* Mobile: sponsorship CTA panel appears here in the flow */}
          <div className="lg:hidden">
            <SponsorshipPanel
              participantName={participantName}
              activity={activity}
              currency={currency}
              primary={primary}
              textOnPrimary={textOnPrimary}
              canTransact={lifecycle.canTransact}
              onSponsor={openSheet}
            />
          </div>

          <a
            href="/"
            className="flex items-center justify-center gap-2 pb-4 pt-2 text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
          </a>
        </div>

        {/* ── RIGHT: Sponsorship panel (desktop only, sticky) ── */}
        <div className="hidden lg:block min-w-0">
          <div className="sticky top-[64px] space-y-4">
            <SponsorshipPanel
              participantName={participantName}
              activity={activity}
              currency={currency}
              primary={primary}
              textOnPrimary={textOnPrimary}
              canTransact={lifecycle.canTransact}
              onSponsor={openSheet}
            />
            <a
              href="/"
              className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
            </a>
          </div>
        </div>

      </div>

      {/* ── 7. Sticky bottom bar (mobile only) ── */}
      <div className="fixed inset-x-0 bottom-0 z-[10000] border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-2xl backdrop-blur lg:hidden">
        <div className="mx-auto max-w-md">
          <button
            type="button"
            onClick={openSheet}
            disabled={!lifecycle.canTransact}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-black shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: primary, color: textOnPrimary }}
          >
            <Heart className="h-5 w-5" />
            {participantName ? `Sponsor ${participantName}` : 'Sponsor this fundraiser'}
          </button>
        </div>
      </div>

      {/* ── 8. Sponsorship sheet ── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => { if (!submitting && step !== 'waiting-stripe') setSheetOpen(false); }}
        >
          <section
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem]"
            onClick={e => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="mb-5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">Sponsorship</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {participantName ? `Sponsor ${participantName}` : fundraiser.name}
                </h2>
              </div>
              {step !== 'waiting-stripe' && (
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Details step */}
            {step === 'details' && (
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-black text-slate-700">Choose an amount</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(activity.suggestedAmounts || []).map((suggested: number) => {
                      const active = !customAmount && selectedAmount === Number(suggested);
                      return (
                        <button
                          key={suggested}
                          type="button"
                          onClick={() => { setSelectedAmount(Number(suggested)); setCustomAmount(''); }}
                          className="rounded-2xl border px-3 py-3 text-base font-black transition"
                          style={{
                            borderColor: active ? primary : '#e2e8f0',
                            color: active ? primary : '#0f172a',
                            background: active ? `${primary}12` : '#ffffff',
                          }}
                        >
                          {symbolFor(currency)}{Number(suggested)}
                        </button>
                      );
                    })}
                  </div>
                  {activity.allowOtherAmount !== false && (
                    <div className="mt-3 flex items-center rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-slate-400">
                      <span className="font-black text-slate-500">{symbolFor(currency)}</span>
                      <input
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        inputMode="decimal"
                        placeholder="Other amount"
                        className="min-w-0 flex-1 border-0 bg-transparent px-3 text-lg font-black outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={sponsorName}
                    onChange={e => setSponsorName(e.target.value)}
                    placeholder="Your name"
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-slate-400"
                  />
                  <input
                    value={sponsorEmail}
                    onChange={e => setSponsorEmail(e.target.value)}
                    type="email"
                    placeholder="Email (optional)"
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value.slice(0, 500))}
                    rows={3}
                    placeholder={`Leave a message for ${participantName || 'the fundraiser'} (optional)`}
                    className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-slate-400"
                  />
                  <p className="mt-1 text-right text-xs font-bold text-slate-400">{message.length}/500</p>
                </div>

                {formError && (
                  <div className="flex gap-2 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {formError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={continueToPayment}
                  disabled={submitting}
                  className="w-full rounded-2xl px-5 py-4 text-lg font-black disabled:opacity-50"
                  style={{ background: primary, color: textOnPrimary }}
                >
                  Continue with {amountText(amount, currency)}
                </button>
              </div>
            )}

            {/* Payment method step */}
            {step === 'payment' && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-sm font-black underline"
                  style={{ color: primary }}
                >
                  Back to sponsorship details
                </button>
                <DemoPaymentNotice />
                <PaymentMethodSelector
                  paymentMethods={activity.paymentMethods}
                  onSelect={method => void handleMethod(method)}
                  loading={submitting}
                />
                {formError && (
                  <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                    {formError}
                  </div>
                )}
              </div>
            )}

            {/* Manual payment instructions */}
            {step === 'manual' && selectedMethod && (
              <PaymentInstructions
                method={selectedMethod}
                paymentReference={paymentReference}
                totalAmount={amount}
                currencySymbol={symbolFor(currency)}
                onConfirmPaid={() => void confirmManualPaid()}
                onBack={() => setStep(activity.paymentMethods.length > 1 ? 'payment' : 'details')}
                error={formError}
                confirming={submitting}
              />
            )}

            {/* Crypto step */}
            {step === 'crypto' && contributionId && cryptoWallet && (
              <Suspense fallback={<div className="grid place-items-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                <Web3Provider force>
                  <SponsoredCryptoPaymentStep
                    roomId={roomId}
                    contributionId={contributionId}
                    recipientWallet={cryptoWallet}
                    fiatAmount={amount}
                    fiatCurrency={currency}
                    onSuccess={() => setStep('success')}
                  />
                </Web3Provider>
              </Suspense>
            )}

            {/* Waiting for Stripe */}
            {step === 'waiting-stripe' && (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: primary }} />
                <h3 className="mt-4 text-xl font-black text-slate-950">Confirming your sponsorship</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">Please keep this page open for a moment.</p>
              </div>
            )}

            {/* Success */}
            {step === 'success' && (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
                <h3 className="mt-4 text-2xl font-black text-slate-950">Thank you for your sponsorship</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Your support has been recorded for {participantName || fundraiser.name}.
                </p>
                {contributionId && (
                  <p className="mt-4 text-xs font-bold text-slate-400">Reference: {contributionId}</p>
                )}
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="mt-6 w-full rounded-2xl px-5 py-4 text-base font-black"
                  style={{ background: primary, color: textOnPrimary }}
                >
                  Done
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
              <ShieldCheck className="h-4 w-4" /> Secure payments powered by FundRaisely
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
