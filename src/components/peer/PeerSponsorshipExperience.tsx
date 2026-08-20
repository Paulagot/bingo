// src/components/peer/PeerSponsorshipExperience.tsx
//
// Peer-first sponsorship supporter experience.
// Presentation comes from the peer fundraiser/participant public payload.
// Payment creation remains in the existing sponsored-activity services, so
// sponsorship income continues to create a sponsored_contributions row and
// a payment-ledger row for the linked sponsored_activity room.

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
  ShieldCheck,
  Target,
  UserRound,
  X,
} from 'lucide-react';
import {
  PaymentMethodSelector,
  type ClubPaymentMethod,
} from '../Quiz/shared/PaymentMethodSelector';
import { PaymentInstructions } from '../Quiz/shared/PaymentInstructions';
import {
  publicSponsoredActivityService,
} from '../../services/PublicSponsoredActivityService';
import YouTubeEmbed from '../../pages/peer/support/YouTubeEmbed';
import DemoPaymentNotice from '../demo/DemoPaymentNotice';

const Web3Provider = lazy(() =>
  import('../Web3Provider').then(module => ({
    default: module.Web3Provider,
  })),
);

const SponsoredCryptoPaymentStep = lazy(() =>
  import('../sponsor/SponsoredCryptoPaymentStep'),
);

type SheetStep =
  | 'details'
  | 'payment'
  | 'manual'
  | 'crypto'
  | 'success'
  | 'waiting-stripe';

type Props = {
  data: any;
  clubSlug: string;
  fundraiserSlug: string;
  participantSlug?: string;
};

const SYMBOLS: Record<string, string> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
  CAD: 'CA$',
};

function amountText(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function symbolFor(currency: string) {
  return SYMBOLS[currency] || `${currency} `;
}

function generateReference() {
  return `SPON-${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

export default function PeerSponsorshipExperience({
  data,
}: Props) {
  const fundraiser = data.fundraiser;
  const participant = data.participant;
  const sponsoredRoom = data.sponsoredRoom;
  const roomId = sponsoredRoom?.roomId;

  const participantName =
    participant?.participant_name ||
    participant?.participantName ||
    null;

  const participantMessage =
    participant?.personal_message ||
    participant?.personalMessage ||
    null;

  const profileImage =
    participant?.profile_image_url ||
    participant?.profileImageUrl ||
    null;

  const logoUrl =
    data?.club?.logoUrl ||
    data?.club?.logo_url ||
    data?.club?.brand_logo_url ||
    null;

  const currency =
    sponsoredRoom?.currency ||
    fundraiser?.currency ||
    'EUR';

  const target = readNumber(
    participant?.personal_target,
    participant?.personalTarget,
    fundraiser?.target_amount,
    fundraiser?.targetAmount,
  );

  const raised = readNumber(
    participant?.sponsorship_total,
    participant?.raised_amount,
    participant?.raisedAmount,
    fundraiser?.sponsorship_total,
    fundraiser?.raised_amount,
    fundraiser?.raisedAmount,
  );

  const progress =
    target > 0
      ? Math.min(100, Math.round((raised / target) * 100))
      : 0;

  const displayTitle = participantName
    ? `Support ${participantName}`
    : fundraiser?.name || 'Support this fundraiser';

  const story =
    participantMessage ||
    fundraiser?.description ||
    `Help ${data.club?.name || 'the club'} reach its fundraising target.`;

  const coverImageUrl = fundraiser?.settings?.coverImageUrl || null;
  const causeVideoUrl = fundraiser?.settings?.videoUrl || null;
  const participantVideoUrl =
    participant?.video_url || participant?.videoUrl || null;
  const causeStory = fundraiser?.description || null;

  const overallTarget = readNumber(
    fundraiser?.target_amount,
    fundraiser?.targetAmount,
  );
  const overallRaised = readNumber(
    fundraiser?.sponsorship_total,
    fundraiser?.raised_amount,
    fundraiser?.raisedAmount,
  );
  const overallProgress =
    overallTarget > 0
      ? Math.min(100, Math.round((overallRaised / overallTarget) * 100))
      : 0;

  const [activity, setActivity] = useState<any>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [step, setStep] = useState<SheetStep>('details');
  const [selectedAmount, setSelectedAmount] =
    useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorEmail, setSponsorEmail] = useState('');
  const [selectedMethod, setSelectedMethod] =
    useState<ClubPaymentMethod | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentReference] = useState(generateReference);
  const [contributionId, setContributionId] =
    useState<string | null>(null);
  const [cryptoWallet, setCryptoWallet] =
    useState<string | null>(null);

  const amount = useMemo(() => {
    if (customAmount.trim()) return Number(customAmount);
    return selectedAmount || 0;
  }, [customAmount, selectedAmount]);

  const primary =
    activity?.clubPrimaryColor ||
    data?.club?.brand_primary_color ||
    data?.club?.brandPrimaryColor ||
    '#f97316';

  const background =
    activity?.clubBackgroundColor ||
    data?.club?.brand_background_color ||
    data?.club?.brandBackgroundColor ||
    '#fff7ed';

  const textOnPrimary =
    activity?.clubTextOnPrimaryColor ||
    '#ffffff';
  const lifecycle = data?.lifecycle || {
    state: 'open',
    canTransact: true,
    message: null,
  };

  useEffect(() => {
    if (!roomId) {
      setActivityError(
        'This fundraiser is not linked to a sponsored activity.',
      );
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
      .catch((error: Error) =>
        setActivityError(
          error.message ||
            'The sponsored activity could not be loaded.',
        ),
      )
      .finally(() => setActivityLoading(false));
  }, [roomId]);

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
        const result =
          await publicSponsoredActivityService.getStatus(
            roomId!,
            { sessionId: sessionId || undefined },
          );

        if (stopped) return;

        if (result.status === 'confirmed') {
          setContributionId(result.contributionId);
          setStep('success');

          const clean = new URL(window.location.href);
          clean.searchParams.delete('session_id');
          window.history.replaceState(
            {},
            '',
            `${clean.pathname}${clean.search}`,
          );
          return;
        }

        if (
          ['failed', 'expired', 'cancelled'].includes(
            result.status,
          )
        ) {
          setFormError(
            'The card checkout was not completed. You can try again.',
          );
          setStep('details');
          return;
        }

        if (Date.now() - started < 5 * 60 * 1000) {
          timer = setTimeout(poll, 2500);
        }
      } catch {
        if (!stopped && Date.now() - started < 5 * 60 * 1000) {
          timer = setTimeout(poll, 2500);
        }
      }
    }

    void poll();

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [roomId]);

  function openSheet() {
    setFormError(null);
    setStep('details');
    setSheetOpen(true);
  }

  function validateDetails() {
    setFormError(null);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 10000
    ) {
      setFormError(
        'Choose or enter a valid sponsorship amount.',
      );
      return false;
    }

    if (!sponsorName.trim()) {
      setFormError('Please enter your name.');
      return false;
    }

    if (
      sponsorEmail &&
      !/^\S+@\S+\.\S+$/.test(sponsorEmail.trim())
    ) {
      setFormError('Please enter a valid email address.');
      return false;
    }

    return true;
  }

  function contributionPayload(method: ClubPaymentMethod) {
    return {
      sponsorName: sponsorName.trim(),
      sponsorEmail: sponsorEmail.trim() || undefined,
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
      setFormError(
        'The club has not enabled a payment method for this activity.',
      );
      return;
    }

    const onlyMethod = methods.length === 1
      ? methods[0]
      : undefined;

    if (onlyMethod) {
      void handleMethod(onlyMethod);
      return;
    }

    setStep('payment');
  }

  async function handleMethod(method: ClubPaymentMethod) {
    if (!roomId || !activity || !validateDetails()) return;

    setSelectedMethod(method);
    setFormError(null);

    const category = String(
      method.methodCategory || '',
    ).toLowerCase();

    if (category === 'stripe') {
      setSubmitting(true);
      try {
        const result =
          await publicSponsoredActivityService
            .createStripeCheckout(
              roomId,
              {
                ...contributionPayload(method),
                appOrigin: window.location.origin,
                returnPath: window.location.pathname,
                activityLabel:
                  participantName
                    ? `${participantName} — ${activity.activityLabel}`
                    : activity.activityLabel,
              } as any,
            );

        window.location.href = result.redirectUrl;
      } catch (error) {
        setFormError(
          (error as Error).message ||
            'Could not start card checkout.',
        );
        setStep('payment');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (category === 'crypto') {
      setSubmitting(true);
      try {
        const result =
          await publicSponsoredActivityService
            .createCryptoContribution(
              roomId,
              contributionPayload(method) as any,
            );

        setContributionId(result.contributionId);
        setCryptoWallet(result.walletAddress);
        setStep('crypto');
      } catch (error) {
        setFormError(
          (error as Error).message ||
            'Could not prepare the crypto payment.',
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setStep('manual');
  }

  async function confirmManualPaid() {
    if (!roomId || !selectedMethod) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const result =
        await publicSponsoredActivityService
          .createManualContribution(
            roomId,
            {
              ...contributionPayload(selectedMethod),
              paymentReference,
            } as any,
          );

      setContributionId(result.contributionId);
      setStep('success');
    } catch (error) {
      setFormError(
        (error as Error).message ||
          'Could not record the payment claim.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (activityLoading) {
    return (
      <div
        className="grid min-h-screen place-items-center"
        style={{ background }}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin" />
          <p className="mt-3 text-sm font-bold text-slate-600">
            Loading fundraiser…
          </p>
        </div>
      </div>
    );
  }

  if (activityError || !activity) {
    return (
      <div
        className="grid min-h-screen place-items-center p-6"
        style={{ background }}
      >
        <div className="max-w-md rounded-3xl bg-white p-7 text-center shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h1 className="mt-3 text-2xl font-black text-slate-950">
            Sponsorship page unavailable
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            {activityError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-28"
      style={{
        background,
        '--peer-primary': primary,
      } as React.CSSProperties}
    >
      <header className="border-b border-black/5 bg-white/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {(
            activity.clubLogoUrl ||
            data?.club?.brand_logo_url ||
            data?.club?.logo_url
          ) ? (
            <img
              src={
                activity.clubLogoUrl ||
                data?.club?.brand_logo_url ||
                data?.club?.logo_url
              }
              alt=""
              className="h-12 w-12 rounded-2xl object-contain"
            />
          ) : (
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl"
              style={{
                background: primary,
                color: textOnPrimary,
              }}
            >
              <Heart className="h-6 w-6" />
            </div>
          )}

          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Sponsored fundraiser
            </p>
            <p className="font-black text-slate-950">
              {data.club?.name || activity.clubName}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-5">
        <section className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-black/5">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt=""
              className="h-40 w-full object-cover"
            />
          ) : (
            <div
              className="h-40"
              style={{
                background:
                  `linear-gradient(135deg, ${primary}, ${primary}bb)`,
              }}
            />
          )}

          <div className="-mt-14 px-5 pb-6">
            <div className="flex items-end gap-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={participantName || ''}
                  className="h-28 w-28 rounded-[2rem] border-4 border-white object-cover shadow-lg"
                />
              ) : (logoUrl || activity?.clubLogoUrl) ? (
                <img
                  src={(logoUrl || activity?.clubLogoUrl)!}
                  alt={data?.club?.name || 'Club logo'}
                  className="h-28 w-28 rounded-[2rem] border-4 border-white bg-white object-contain p-2 shadow-lg"
                />
              ) : (
                <div
                  className="grid h-28 w-28 place-items-center rounded-[2rem] border-4 border-white bg-white shadow-lg"
                  style={{ color: primary }}
                >
                  <UserRound className="h-12 w-12" />
                </div>
              )}
            </div>

            <p
              className="mt-5 text-sm font-black uppercase tracking-[0.16em]"
              style={{ color: primary }}
            >
              {activity.activityLabel}
            </p>

            <h1 className="mt-2 text-4xl font-black leading-tight tracking-tight text-slate-950">
              {displayTitle}
            </h1>

            {participantMessage ? (
              <>
                <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
                  {participantMessage}
                </p>
                {participantVideoUrl && (
                  <div className="mt-4">
                    <YouTubeEmbed
                      url={participantVideoUrl}
                      title={`${participantName || 'Participant'} video`}
                    />
                  </div>
                )}
                {(causeStory || causeVideoUrl) && (
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      About this cause
                    </p>
                    {causeStory && (
                      <p className="mt-2 text-base font-semibold leading-7 text-slate-600">
                        {causeStory}
                      </p>
                    )}
                    {causeVideoUrl && (
                      <div className="mt-4">
                        <YouTubeEmbed url={causeVideoUrl} title="Cause video" />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="mt-4 text-base font-semibold leading-7 text-slate-600">
                  {story}
                </p>
                {causeVideoUrl && (
                  <div className="mt-4">
                    <YouTubeEmbed url={causeVideoUrl} title="Cause video" />
                  </div>
                )}
              </>
            )}

            <div className="mt-6 rounded-3xl bg-slate-50 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Raised
                  </p>
                  <p className="text-3xl font-black text-slate-950">
                    {amountText(raised, currency)}
                  </p>
                </div>

                {target > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Target
                    </p>
                    <p className="text-lg font-black text-slate-700">
                      {amountText(target, currency)}
                    </p>
                  </div>
                )}
              </div>

              {target > 0 && (
                <>
                  <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        background: primary,
                      }}
                    />
                  </div>
                  <p className="mt-2 text-right text-xs font-black text-slate-500">
                    {progress}% of target
                  </p>
                </>
              )}

              {participantName && overallTarget > 0 && (
                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                    <span className="min-w-0 flex-1 truncate">
                      Part of {fundraiser?.name || 'this fundraiser'}
                    </span>
                    <span className="shrink-0">
                      {amountText(overallRaised, currency)} of{' '}
                      {amountText(overallTarget, currency)} overall
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-slate-400"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-3xl border border-slate-200 p-4">
              <Target
                className="mt-0.5 h-5 w-5 shrink-0"
                style={{ color: primary }}
              />
              <div>
                <p className="font-black text-slate-950">
                  Your sponsorship supports{' '}
                  {data.club?.name || activity.clubName}
                </p>
       
            <a href="/" className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500 hover:text-[var(--fr-primary)]">
              <ShieldCheck className="h-4 w-4" /> Created by FundRaisely
            </a>
              </div>
            </div>
          </div>
        </section>

        {!lifecycle.canTransact && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-900 ring-1 ring-amber-200">
            {lifecycle.message ||
              'This fundraiser is no longer accepting sponsorships.'}
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-3 shadow-2xl backdrop-blur">
        <div className="mx-auto max-w-lg">
          <button
            type="button"
            onClick={openSheet}
            disabled={!lifecycle.canTransact}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-lg font-black shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              background: primary,
              color: textOnPrimary,
            }}
          >
            <Heart className="h-5 w-5" />
            Sponsor {participantName || 'this fundraiser'}
          </button>
        </div>
      </div>

      {sheetOpen && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => {
            if (!submitting && step !== 'waiting-stripe') {
              setSheetOpen(false);
            }
          }}
        >
          <section
            className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-2xl sm:rounded-[2rem]"
            onClick={event => event.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />

            <div className="mb-5 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Sponsorship
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {participantName
                    ? `Sponsor ${participantName}`
                    : fundraiser.name}
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

            {step === 'details' && (
              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-black text-slate-700">
                    Choose an amount
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {(activity.suggestedAmounts || []).map(
                      (suggested: number) => (
                        <button
                          key={suggested}
                          type="button"
                          onClick={() => {
                            setSelectedAmount(Number(suggested));
                            setCustomAmount('');
                          }}
                          className="rounded-2xl border px-3 py-3 text-base font-black"
                          style={{
                            borderColor:
                              !customAmount &&
                              selectedAmount === Number(suggested)
                                ? primary
                                : '#e2e8f0',
                            color:
                              !customAmount &&
                              selectedAmount === Number(suggested)
                                ? primary
                                : '#0f172a',
                            background:
                              !customAmount &&
                              selectedAmount === Number(suggested)
                                ? `${primary}12`
                                : '#ffffff',
                          }}
                        >
                          {symbolFor(currency)}
                          {Number(suggested)}
                        </button>
                      ),
                    )}
                  </div>

                  {activity.allowOtherAmount !== false && (
                    <div className="mt-3 flex items-center rounded-2xl border border-slate-200 px-4 py-3">
                      <span className="font-black text-slate-500">
                        {symbolFor(currency)}
                      </span>
                      <input
                        value={customAmount}
                        onChange={event =>
                          setCustomAmount(event.target.value)
                        }
                        inputMode="decimal"
                        placeholder="Other amount"
                        className="min-w-0 flex-1 border-0 px-3 text-lg font-black outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    value={sponsorName}
                    onChange={event =>
                      setSponsorName(event.target.value)
                    }
                    placeholder="Your name"
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[var(--peer-primary)]"
                  />

                  <input
                    value={sponsorEmail}
                    onChange={event =>
                      setSponsorEmail(event.target.value)
                    }
                    type="email"
                    placeholder="Email (optional)"
                    className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-[var(--peer-primary)]"
                  />
                </div>

                {formError && (
                  <div className="flex gap-2 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {formError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={continueToPayment}
                  disabled={submitting}
                  className="w-full rounded-2xl px-5 py-4 text-lg font-black disabled:opacity-50"
                  style={{
                    background: primary,
                    color: textOnPrimary,
                  }}
                >
                  Continue with {amountText(amount, currency)}
                </button>
              </div>
            )}

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
      onSelect={method =>
        void handleMethod(method)
      }
      loading={submitting}
    />

    {formError && (
      <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
        {formError}
      </div>
    )}
  </div>
)}

            {step === 'manual' && selectedMethod && (
              <PaymentInstructions
                method={selectedMethod}
                paymentReference={paymentReference}
                totalAmount={amount}
                currencySymbol={symbolFor(currency)}
                onConfirmPaid={() =>
                  void confirmManualPaid()
                }
                onBack={() =>
                  setStep(
                    activity.paymentMethods.length > 1
                      ? 'payment'
                      : 'details',
                  )
                }
                error={formError}
                confirming={submitting}
              />
            )}

            {step === 'crypto' &&
              contributionId &&
              cryptoWallet && (
                <Suspense
                  fallback={
                    <div className="grid place-items-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  }
                >
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

            {step === 'waiting-stripe' && (
              <div className="py-10 text-center">
                <Loader2
                  className="mx-auto h-10 w-10 animate-spin"
                  style={{ color: primary }}
                />
                <h3 className="mt-4 text-xl font-black text-slate-950">
                  Confirming your sponsorship
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Please keep this page open for a moment.
                </p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-8 text-center">
                <CheckCircle2
                  className="mx-auto h-14 w-14 text-green-600"
                />
                <h3 className="mt-4 text-2xl font-black text-slate-950">
                  Thank you for your sponsorship
                </h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Your support has been recorded for{' '}
                  {participantName || fundraiser.name}.
                </p>

                {contributionId && (
                  <p className="mt-4 text-xs font-bold text-slate-400">
                    Contribution reference: {contributionId}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="mt-6 w-full rounded-2xl px-5 py-4 text-base font-black"
                  style={{
                    background: primary,
                    color: textOnPrimary,
                  }}
                >
                  Done
                </button>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
              <ShieldCheck className="h-4 w-4" />
              Secure payments powered by FundRaisely
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
