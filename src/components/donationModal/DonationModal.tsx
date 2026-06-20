// src/components/donationModal/DonationModal.tsx
//
// Opens as a real on-page modal (overlay + centered panel) — NOT an
// iframe, NOT donate.js, NOT a separate tab for the picker itself. The
// amount/method picker renders directly inside this component's own
// React tree, on the host page. This is what makes the close-on-success
// problem solvable without any postMessage relay: there is no second
// window/iframe boundary between the picker and the thing that needs to
// close — they're the same component.
//
// Flow:
//   1. Click "Donate now" -> isOpen=true -> fetch config -> picker UI
//      (method choice if >1 method, then amount + donor info) — this
//      part is the SAME logic/JSX shape as DonateEmbedPage.tsx and
//      StandaloneDonatePage.tsx, just rendered inside a modal panel
//      instead of an iframe shell or full page.
//   2. Stripe: MUST leave the tab (Stripe Checkout is a redirect by
//      nature — no way to avoid this with any approach). Opens in a NEW
//      TAB; the modal stays open showing "complete checkout in the new
//      tab, we'll detect it automatically" and starts polling this
//      donation's status.
//   3. Crypto: same new-tab pattern, same polling.
//   4. Polling: GET /api/donations/:clubId/:donationId/status (new,
//      isolated route — see donationStatusRouter.js) every 2.5s while
//      the checkout tab is open. The moment status flips to
//      'confirmed', show "thank you" and auto-close shortly after.
//      'failed'/'expired' show a clear failure state instead of
//      polling forever. This REPLACES the postMessage/relay chain
//      entirely — the modal asks "is this done yet?" directly, with no
//      dependency on a message successfully crossing window/iframe/tab
//      boundaries at all, which is exactly the part that's broken in
//      the existing embed flow.
//
// This component does NOT touch, import, or modify DonateEmbedPage.tsx,
// donate.js, or CryptoDonationCheckoutPage.tsx. It's a new, independent
// implementation of the same look/behavior the supporter already
// expects, with a different (working) mechanism for the one part that's
// currently broken.

import { useEffect, useRef, useState } from 'react';
import { X, Heart, AlertCircle, Loader2, CheckCircle2, CreditCard, Coins } from 'lucide-react';

import DonationModalService from './services/DonationModalService';
import type {
  PublicDonationButtonConfig,
  ResolvedDonationMethod,
  TrackableDonationProvider,
} from '../../shared/types/donationCheckout';

const ISO_TO_SYMBOL: Record<string, string> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
  CAD: 'CA$',
  NGN: '₦',
};

function symbolFor(iso: string): string {
  return ISO_TO_SYMBOL[iso] ?? iso;
}

const FALLBACK_PRIMARY_COLOR = '#157f85';
const FALLBACK_BACKGROUND_COLOR = '#ffffff';
const FALLBACK_TEXT_ON_PRIMARY = '#ffffff';

function hexToRgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!match) return `rgba(21,127,133,${alpha})`;
  const r = parseInt(match[1]!, 16);
  const g = parseInt(match[2]!, 16);
  const b = parseInt(match[3]!, 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const PROVIDER_DISPLAY: Record<TrackableDonationProvider, { label: string; Icon: typeof CreditCard }> = {
  stripe: { label: 'Card / Apple Pay / Google Pay', Icon: CreditCard },
  crypto: { label: 'Crypto (Solana)', Icon: Coins },
  sumup_api: { label: 'Card', Icon: CreditCard },
};

// Polling cadence + a sane ceiling so an abandoned tab doesn't poll
// forever. 2.5s is frequent enough to feel instant to the supporter
// without hammering the endpoint; 10 minutes covers a slow card-entry
// or wallet-approval without leaving a runaway interval if they just
// walk away.
const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'picking_method' }
  | { kind: 'picking_amount' }
  | { kind: 'starting_checkout' }
  | { kind: 'awaiting_confirmation'; provider: 'stripe' | 'sumup_api' | 'crypto' }
  | { kind: 'success' }
  | { kind: 'failed' };

interface DonationModalProps {
  clubId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DonationModal({ clubId, isOpen, onClose }: DonationModalProps) {
  const [config, setConfig] = useState<PublicDonationButtonConfig | null>(null);
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [selectedMethod, setSelectedMethod] = useState<ResolvedDonationMethod | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');

  const pollIntervalRef = useRef<number | null>(null);
  const pollStartedAtRef = useRef<number | null>(null);
  const autoCloseTimeoutRef = useRef<number | null>(null);

  const stopPolling = () => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    pollStartedAtRef.current = null;
  };

  // Reset everything each time the modal is freshly opened, so a
  // previous donation's state never bleeds into the next one.
  useEffect(() => {
    if (!isOpen) {
      stopPolling();
      if (autoCloseTimeoutRef.current !== null) {
        window.clearTimeout(autoCloseTimeoutRef.current);
        autoCloseTimeoutRef.current = null;
      }
      return;
    }

    setConfig(null);
    setView({ kind: 'loading' });
    setSelectedMethod(null);
    setSelectedAmount(null);
    setCustomAmount('');
    setDonorName('');
    setDonorEmail('');

    let cancelled = false;

    DonationModalService.getPublicConfig(clubId)
      .then((res) => {
        if (cancelled) return;
        setConfig(res);

        const onlyMethod = res.methods.length === 1 ? res.methods[0] : undefined;
        if (onlyMethod) {
          setSelectedMethod(onlyMethod);
          setView({ kind: 'picking_amount' });
        } else {
          setView({ kind: 'picking_method' });
        }

        const firstPreset = res.amountConfig.presetAmounts[0];
        if (firstPreset !== undefined) setSelectedAmount(firstPreset);
      })
      .catch((err) => {
        if (cancelled) return;
        setView({
          kind: 'error',
          message: err?.message || 'This donation button is not currently available.',
        });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clubId]);

  // Cleanup on unmount, regardless of isOpen — belt-and-suspenders so a
  // poll interval never outlives the component itself.
  useEffect(() => {
    return () => {
      stopPolling();
      if (autoCloseTimeoutRef.current !== null) {
        window.clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, []);

  const startPolling = (donationId: string) => {
    stopPolling();
    pollStartedAtRef.current = Date.now();

    pollIntervalRef.current = window.setInterval(async () => {
      const startedAt = pollStartedAtRef.current;
      if (startedAt !== null && Date.now() - startedAt > POLL_TIMEOUT_MS) {
        // Gave up — leave the supporter on the "awaiting confirmation"
        // view rather than silently failing; they may still complete
        // payment, the donation just won't auto-close this modal
        // anymore. Nothing about the actual payment is affected.
        stopPolling();
        return;
      }

      try {
        const result = await DonationModalService.getStatus(clubId, donationId);

        if (result.status === 'confirmed') {
          stopPolling();
          setView({ kind: 'success' });
          autoCloseTimeoutRef.current = window.setTimeout(() => {
            onClose();
          }, 2500);
        } else if (result.status === 'failed' || result.status === 'expired') {
          stopPolling();
          setView({ kind: 'failed' });
        }
        // 'pending' -> keep polling, no state change needed.
      } catch {
        // Transient network hiccup — don't fail the whole flow over
        // one missed poll, just try again next tick.
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSelectMethod = (method: ResolvedDonationMethod) => {
    setSelectedMethod(method);
    setView({ kind: 'picking_amount' });
  };

  const handleChangeMethod = () => {
    setView({ kind: 'picking_method' });
  };

  const handleDonate = async () => {
    if (!clubId || !config || !selectedMethod) return;

    const amount = selectedAmount ?? Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setView({ kind: 'starting_checkout' });

    try {
      const result = await DonationModalService.startCheckout(clubId, {
        clubPaymentMethodId: selectedMethod.clubPaymentMethodId,
        amount,
        donorName: donorName.trim() || undefined,
        donorEmail: donorEmail.trim() || undefined,
        // No returnPath override needed here — this modal never relies
        // on Stripe's success_url to do anything (it polls instead), so
        // wherever Stripe redirects back to after payment is irrelevant
        // to closing THIS modal. Left unset deliberately; the backend
        // falls back to its existing default path, unchanged.
      });

      if (result.provider === 'stripe' || result.provider === 'sumup_api') {
        const checkoutWindow = window.open(result.redirectUrl, '_blank');
        if (!checkoutWindow) {
          setView({
            kind: 'error',
            message: 'Your checkout could not open. Please allow pop-ups for this site and try again.',
          });
          return;
        }
        setView({ kind: 'awaiting_confirmation', provider: result.provider });
        startPolling(result.donationId);
        return;
      }

      if (result.provider === 'crypto') {
        const params = new URLSearchParams({
          wallet: result.walletAddress,
          amount: String(amount),
          currency: config.currency,
        });
        const checkoutWindow = window.open(
          `/donate/${clubId}/crypto/${result.donationId}?${params.toString()}`,
          '_blank'
        );
        if (!checkoutWindow) {
          setView({
            kind: 'error',
            message: 'Your checkout could not open. Please allow pop-ups for this site and try again.',
          });
          return;
        }
        setView({ kind: 'awaiting_confirmation', provider: 'crypto' });
        startPolling(result.donationId);
        return;
      }
    } catch (err: any) {
      setView({
        kind: 'error',
        message: err?.message || 'Could not start checkout. Please try again.',
      });
    }
  };

  if (!isOpen) return null;

  const primaryColor = config?.branding.primaryColor ?? FALLBACK_PRIMARY_COLOR;
  const backgroundColor = config?.branding.backgroundColor ?? FALLBACK_BACKGROUND_COLOR;
  const textOnPrimaryColor = config?.branding.textOnPrimaryColor ?? FALLBACK_TEXT_ON_PRIMARY;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        // Click outside the panel closes the modal — but not while a
        // checkout tab might still be open and polling, to avoid the
        // supporter accidentally losing the "we're watching for your
        // payment" state mid-flow.
        if (e.target === e.currentTarget && view.kind !== 'awaiting_confirmation') {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-md rounded-[1.75rem] border p-6 shadow-2xl sm:p-8"
        style={{ background: backgroundColor, borderColor: '#dce1df' }}
      >
        {view.kind !== 'awaiting_confirmation' && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="mb-6 flex items-center gap-2">
          <Heart className="h-5 w-5" style={{ color: primaryColor }} fill={primaryColor} />
          <h2 className="text-lg font-black" style={{ color: '#102532' }}>
            {config?.buttonTitle || 'Make a donation'}
          </h2>
        </div>

        {view.kind === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
            <p className="text-sm" style={{ color: '#52636f' }}>Loading…</p>
          </div>
        )}

        {view.kind === 'error' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-7 w-7" style={{ color: '#b54708' }} />
            <p className="text-sm font-semibold" style={{ color: '#102532' }}>
              This donation button isn't available right now
            </p>
            <p className="text-xs" style={{ color: '#52636f' }}>{view.message}</p>
          </div>
        )}

        {view.kind === 'failed' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertCircle className="h-7 w-7" style={{ color: '#b54708' }} />
            <p className="text-sm font-semibold" style={{ color: '#102532' }}>
              We couldn't confirm this donation
            </p>
            <p className="text-xs" style={{ color: '#52636f' }}>
              No charge was completed, or the attempt expired. You can try again below.
            </p>
            <button
              type="button"
              onClick={() => setView({ kind: 'picking_amount' })}
              className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ background: primaryColor, color: textOnPrimaryColor }}
            >
              Try again
            </button>
          </div>
        )}

        {view.kind === 'awaiting_confirmation' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
            <p className="text-sm font-semibold" style={{ color: '#102532' }}>
              Complete your donation in the new tab
            </p>
            <p className="text-xs" style={{ color: '#52636f' }}>
              This window will update automatically once your payment is confirmed.
              You can close the other tab when you're done.
            </p>
          </div>
        )}

        {view.kind === 'success' && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="h-8 w-8" style={{ color: primaryColor }} />
            <p className="text-sm font-semibold" style={{ color: '#102532' }}>
              Thank you for your donation
            </p>
            <p className="text-xs" style={{ color: '#52636f' }}>
              Your support makes a real difference.
            </p>
          </div>
        )}

        {view.kind === 'picking_method' && config && (
          <div className="space-y-3">
            <p className="text-xs font-semibold" style={{ color: '#52636f' }}>
              Choose how you'd like to donate
            </p>
            <div className="space-y-2">
              {config.methods.map((method) => {
                const display = PROVIDER_DISPLAY[method.providerName] ?? {
                  label: method.providerName,
                  Icon: CreditCard,
                };
                const { label, Icon } = display;
                return (
                  <button
                    key={method.clubPaymentMethodId}
                    type="button"
                    onClick={() => handleSelectMethod(method)}
                    className="flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    style={{ borderColor: '#dce1df', background: backgroundColor }}
                  >
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ background: hexToRgba(primaryColor, 0.12), color: primaryColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#102532' }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {(view.kind === 'picking_amount' || view.kind === 'starting_checkout') &&
          config &&
          selectedMethod && (
            <div className="space-y-4">
              {config.methods.length > 1 && (
                <button
                  type="button"
                  onClick={handleChangeMethod}
                  className="text-xs font-semibold"
                  style={{ color: primaryColor }}
                >
                  ← Change payment method
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {config.amountConfig.presetAmounts.map((amount) => {
                  const active = selectedAmount === amount;
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount('');
                      }}
                      className="rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors"
                      style={
                        active
                          ? { background: primaryColor, borderColor: primaryColor, color: textOnPrimaryColor }
                          : { background: backgroundColor, borderColor: '#dce1df', color: '#102532' }
                      }
                    >
                      {symbolFor(config.currency)}{amount}
                    </button>
                  );
                })}
              </div>

              {config.amountConfig.allowCustomAmount && (
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: '#52636f' }}>
                    Or enter your own amount
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold" style={{ color: '#102532' }}>
                      {symbolFor(config.currency)}
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      inputMode="decimal"
                      value={customAmount}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedAmount(null);
                      }}
                      placeholder="0.00"
                      className="w-full rounded-lg border px-3 py-2 text-sm"
                      style={{ borderColor: selectedAmount === null ? primaryColor : '#dce1df' }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 border-t pt-3" style={{ borderColor: '#dce1df' }}>
                <input
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Your name (optional)"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: '#dce1df' }}
                />
                <input
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: '#dce1df' }}
                />
              </div>

              <button
                type="button"
                onClick={handleDonate}
                disabled={view.kind === 'starting_checkout' || (!selectedAmount && !customAmount)}
                className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
                style={{ background: primaryColor, color: textOnPrimaryColor }}
              >
                {view.kind === 'starting_checkout' ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…
                  </span>
                ) : (
                  config.buttonLabel || 'Donate now'
                )}
              </button>
            </div>
          )}
      </div>
    </div>
  );
}