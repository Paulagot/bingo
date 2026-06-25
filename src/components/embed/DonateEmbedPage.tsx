// src/components/embed/DonateEmbedPage.tsx
//
// Rendered at /embed/donate/:clubId. Success is detected via
// ?session_id=... query param on this SAME route (Stripe's
// success_url points back here, NOT at a separate /success path —
// see DonationCheckoutService.js's _startStripeCheckout fix).
//
// This is the page that goes INSIDE the <iframe> a club pastes on their
// own site — no app header/nav, no auth, nothing that assumes a logged-in
// user. Mount this as its own lazy-loaded route in your router so it
// doesn't pull in dashboard code just to show a donate button.
//
// PHASE 3b — MULTI-METHOD:
// Flow is now: fetch config -> IF more than one method, show a
// provider-choice step -> amount picker -> POST checkout -> dispatch on
// provider. If config.methods.length === 1, the provider-choice step is
// skipped entirely and behavior is identical to the old single-method
// flow (selectedMethod is just set immediately to that one entry).
//
// 'stripe'/'sumup_api' open a new tab via window.open() to the
// provider's hosted checkout; 'crypto' opens a new tab to
// CryptoDonationCheckoutPage (this app's own page) rather than
// connecting a wallet inline inside this iframe — see that page's
// header comment for why. Once a method is chosen, the amount picker
// shows a "change payment method" link that returns to the choice
// step — see the 'picking_amount' render branch below.
//
// CONFIRMATION ARCHITECTURE (revised):
// The PRIMARY confirmation mechanism is polling — see
// useDonationStatusPoll below. While in 'checkout_opened', this page
// polls GET /api/donations/:clubId/:donationId/status, which only ever
// reflects what a verified Stripe webhook or verified on-chain confirm
// wrote to the ledger. That's a deliberate choice: this is real
// donation money for real charities, and "did the payment actually go
// through" should never depend on a client-asserted postMessage making
// it across a 3-hop relay (popup tab -> this iframe -> club's page ->
// donate.js) through an arbitrary third-party site we don't control.
//
// The postMessage relay (the handleChildMessage listener below, and
// donate.js's listener on the club's page) still exists, but its job
// changed: it's now a UI-courtesy fast-path that can close the modal
// overlay a little sooner when it happens to work, NOT the source of
// truth for whether the donation succeeded. Polling reaches 'success'
// independently regardless of whether any postMessage ever arrives.

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Heart, AlertCircle, Loader2, CheckCircle2, CreditCard, Coins, ChevronLeft } from 'lucide-react';

import DonationCheckoutService from './services/DonationCheckoutService';
import type {
  PublicDonationButtonConfig,
  ResolvedDonationMethod,
  TrackableDonationProvider,
} from '../../shared/types/donationCheckout';

// Matches the symbol map in useCurrency.ts — duplicated here (rather than
// importing the hook) because useCurrency reads from useAuthStore, which
// assumes a logged-in club admin session. This page has no such session;
// the currency comes from the public config response instead.
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

// Used before config has loaded (loading/error states) or as a safe
// fallback if a malformed branding value somehow arrives — matches the
// migration's column defaults exactly, so the unbranded look is
// unchanged from before this feature existed.
const FALLBACK_PRIMARY_COLOR = '#157f85';
const FALLBACK_BACKGROUND_COLOR = '#ffffff';

/**
 * Converts a #rrggbb hex color to an rgba() string at the given alpha,
 * for the translucent icon-background wash behind the provider-choice
 * icons. Falls back to the fixed teal's own translucent value if given
 * anything malformed, rather than producing an invalid CSS value.
 */
function hexToRgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!match) return `rgba(21,127,133,${alpha})`;
  const r = parseInt(match[1]!, 16);
  const g = parseInt(match[2]!, 16);
  const b = parseInt(match[3]!, 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Display metadata for the provider-choice cards.
const PROVIDER_DISPLAY: Record<TrackableDonationProvider, { label: string; Icon: typeof CreditCard }> = {
  stripe: { label: 'Card', Icon: CreditCard },
  crypto: { label: 'Crypto', Icon: Coins },
  sumup_api: { label: 'Card', Icon: CreditCard },
};

type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'picking_method' }
  | { kind: 'picking_amount' }
  | { kind: 'starting_checkout' }
  | { kind: 'checkout_opened'; provider: 'stripe' | 'sumup_api' | 'crypto'; donationId: string }
  | { kind: 'success' }
  | { kind: 'cancelled' };

/**
 * Polls GET /api/donations/:clubId/:donationId/status while a checkout
 * tab is open. This is the PRIMARY confirmation mechanism — not the
 * postMessage relay. Polling only ever believes what the backend's
 * donations table says, which is itself only ever written by a
 * verified Stripe webhook or a verified on-chain confirm. There is no
 * client-asserted "trust me, it succeeded" step anywhere in this path.
 *
 * Stops polling on: success, unmount, a terminal failed/expired status,
 * or a 5-minute timeout (webhooks can occasionally lag — after 5
 * minutes we stop hammering the endpoint; the checkout_opened view's
 * own "Start again" affordance still lets the supporter retry or check
 * their email).
 */
function useDonationStatusPoll({
  clubId,
  donationId,
  enabled,
  onConfirmed,
}: {
  clubId: string | undefined;
  donationId: string | null;
  enabled: boolean;
  onConfirmed: () => void;
}) {
  useEffect(() => {
    if (!enabled || !clubId || !donationId) return;

    let cancelled = false;
    const POLL_INTERVAL_MS = 3000;
    const TIMEOUT_MS = 5 * 60 * 1000;
    const startedAt = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;

      if (Date.now() - startedAt > TIMEOUT_MS) {
        console.warn(
          '[DonationStatusPoll] timed out after 5 minutes without confirmation. donationId=',
          donationId
        );
        return;
      }

      try {
        const res = await fetch(`/api/donations/${clubId}/${donationId}/status`);
        const data = await res.json();

        if (cancelled) return;

        if (res.ok && data?.ok && data.status === 'confirmed') {
          onConfirmed();
          return;
        }

        if (data?.status === 'failed' || data?.status === 'expired') {
          console.warn(
            '[DonationStatusPoll] terminal non-confirmed status:', data.status, 'donationId=', donationId
          );
          return;
        }
      } catch (err) {
        // Network hiccup — don't stop polling for a single failed
        // request, the next interval retries naturally.
        console.warn('[DonationStatusPoll] poll request failed, will retry:', err);
      }

      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [clubId, donationId, enabled, onConfirmed]);
}

export default function DonateEmbedPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [searchParams] = useSearchParams();

  const [config, setConfig] = useState<PublicDonationButtonConfig | null>(null);
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [selectedMethod, setSelectedMethod] = useState<ResolvedDonationMethod | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');

  // Handle landing back here after Stripe redirect (success_url/cancel_url
  // from DonationCheckoutService.js point at this same route).
  useEffect(() => {
    if (searchParams.get('cancelled') === '1') {
      setView({ kind: 'cancelled' });
      return;
    }
    if (searchParams.get('session_id')) {
      // Stripe's webhook is the actual source of truth for confirmation —
      // this page doesn't need to verify anything itself, it just shows a
      // thank-you state. The donation row may briefly still read 'pending'
      // here if the webhook hasn't landed yet; that's fine, since nothing
      // on this page depends on knowing the confirmed status, and the
      // club's admin "donations received" list is the real reconciliation
      // view, not this page.
      setView({ kind: 'success' });
      return;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!clubId) return;
    if (searchParams.get('session_id') || searchParams.get('cancelled') === '1') return;

    let cancelled = false;

    DonationCheckoutService.getPublicConfig(clubId)
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
  }, [clubId, searchParams]);

  // PRIMARY confirmation path. Polls the backend's own ledger — which is
  // only ever written by a verified webhook/on-chain confirm — regardless
  // of whether the popup tab's postMessage relay makes it back. This is
  // what actually decides "the donation succeeded."
  const checkoutDonationId = view.kind === 'checkout_opened' ? view.donationId : null;
  const handleConfirmed = useCallback(() => {
    setView({ kind: 'success' });
  }, []);
  useDonationStatusPoll({
    clubId,
    donationId: checkoutDonationId,
    enabled: view.kind === 'checkout_opened',
    onConfirmed: handleConfirmed,
  });

  // Post-success side effects: close the modal overlay (if running
  // inside the donate.js iframe) or close the standalone tab (if Stripe
  // redirected here directly in its own tab). This is now a UI-courtesy
  // notification, not a confirmation signal — polling above already
  // independently decided 'success'. This MUST sit here, above every
  // early `return` below (loading/error/cancelled), and run on every
  // single render regardless of view.kind — React requires the same
  // hooks in the same order on every render.
  useEffect(() => {
    if (view.kind !== 'success') return;

    const hasOpener = !!window.opener;
    const isInIframe = window !== window.parent;

    if (hasOpener) {
      try {
        window.opener.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId }, '*');
      } catch (e) {
        console.error('[DonateEmbedPage] postMessage to window.opener threw:', e);
      }
      const t = setTimeout(() => {
        try { window.close(); } catch (e) { /* nothing further to do if this fails */ }
      }, 2000);
      return () => clearTimeout(t);
    }

    if (isInIframe) {
      try {
        window.parent.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId }, '*');
      } catch (e) {
        console.error('[DonateEmbedPage] postMessage to window.parent threw:', e);
      }
      return;
    }

    // Standalone tab, no opener relationship — just close after a pause.
    const t = setTimeout(() => { try { window.close(); } catch (e) { /* ignore */ } }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind]);

  // Relay listener: UI-courtesy fast-path only. If a child tab we
  // spawned (via window.open) posts a success message to us, forward it
  // up to OUR parent (the club's top-level page) so donate.js's listener
  // there can close the modal a little sooner. NOTE: this is NOT the
  // confirmation source of truth — useDonationStatusPoll above
  // independently reaches 'success' by polling the backend ledger
  // regardless of whether this message ever arrives. This listener just
  // lets the UI update sooner when the relay happens to work.
  useEffect(() => {
    function handleChildMessage(event: MessageEvent) {
      const data = event.data || {};
      if (data.type !== 'FUNDRAISELY_DONATION_SUCCESS') return;

      setView({ kind: 'success' });

      const isInIframe = window !== window.parent;
      if (isInIframe) {
        try {
          window.parent.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId: data.clubId }, '*');
        } catch (e) {
          console.error('[DonateEmbedPage] relay to window.parent threw:', e);
        }
      }
    }
    window.addEventListener('message', handleChildMessage);
    return () => window.removeEventListener('message', handleChildMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const result = await DonationCheckoutService.startCheckout(clubId, {
        clubPaymentMethodId: selectedMethod.clubPaymentMethodId,
        amount,
        donorName: donorName.trim() || undefined,
        donorEmail: donorEmail.trim() || undefined,
      });

      if (result.provider === 'stripe' || result.provider === 'sumup_api') {
        // Open Stripe/SumUp in a new tab rather than navigating the
        // iframe. Deliberately NOT passing 'noopener' — the success page
        // (landed on after Stripe redirects) keeps window.opener pointing
        // back to THIS iframe so the UI-courtesy postMessage notify can
        // still fire, even though confirmation itself now comes from
        // polling, not from this relationship surviving.
        const checkoutWindow = window.open(result.redirectUrl, '_blank');
        if (!checkoutWindow) {
          setView({
            kind: 'error',
            message: 'Your checkout could not open. Please allow pop-ups for this site and try again.',
          });
          return;
        }
        setView({ kind: 'checkout_opened', provider: result.provider, donationId: result.donationId });
        return;
      }

      if (result.provider === 'crypto') {
        const params = new URLSearchParams({
          wallet: result.walletAddress,
          amount: String(amount),
          currency: config.currency,
        });
        const checkoutUrl = `/donate/${clubId}/crypto/${result.donationId}?${params.toString()}`;

        const checkoutWindow = window.open(checkoutUrl, '_blank');
        if (!checkoutWindow) {
          setView({
            kind: 'error',
            message: 'Your checkout could not open. Please allow pop-ups for this site and try again.',
          });
          return;
        }
        setView({ kind: 'checkout_opened', provider: 'crypto', donationId: result.donationId });
        return;
      }
    } catch (err: any) {
      setView({
        kind: 'error',
        message: err?.message || 'Could not start checkout. Please try again.',
      });
    }
  };

  if (view.kind === 'loading') {
    return (
      <EmbedShell>
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: FALLBACK_PRIMARY_COLOR }} />
          <p className="text-sm" style={{ color: '#52636f' }}>Loading…</p>
        </div>
      </EmbedShell>
    );
  }

  if (view.kind === 'error') {
    return (
      <EmbedShell>
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertCircle className="h-7 w-7" style={{ color: '#b54708' }} />
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>
            This donation button isn't available right now
          </p>
          <p className="text-xs" style={{ color: '#52636f' }}>{view.message}</p>
        </div>
      </EmbedShell>
    );
  }

  if (view.kind === 'cancelled') {
    return (
      <EmbedShell
        title={config?.buttonTitle ?? undefined}
        primaryColor={config?.branding.primaryColor}
        backgroundColor={config?.branding.backgroundColor}
      >
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>
            Payment cancelled
          </p>
          <p className="text-xs" style={{ color: '#52636f' }}>
            No charge was made. You can try again below.
          </p>
          <button
            type="button"
            onClick={() => setView({ kind: 'picking_amount' })}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              background: config?.branding.primaryColor ?? FALLBACK_PRIMARY_COLOR,
              color: config?.branding.textOnPrimaryColor ?? '#ffffff',
            }}
          >
            Try again
          </button>
        </div>
      </EmbedShell>
    );
  }

  if (view.kind === 'success') {
    return (
      <EmbedShell
        title={config?.buttonTitle ?? undefined}
        primaryColor={config?.branding.primaryColor}
        backgroundColor={config?.branding.backgroundColor}
      >
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-8 w-8" style={{ color: config?.branding.primaryColor ?? FALLBACK_PRIMARY_COLOR }} />
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>
            Thank you for your donation
          </p>
          <p className="text-xs" style={{ color: '#52636f' }}>
            Your support makes a real difference.
          </p>
        </div>
      </EmbedShell>
    );
  }

  if (view.kind === 'checkout_opened') {
    return (
      <EmbedShell
        title={config?.buttonTitle ?? undefined}
        primaryColor={config?.branding.primaryColor}
        backgroundColor={config?.branding.backgroundColor}
      >
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-8 w-8" style={{ color: config?.branding.primaryColor ?? FALLBACK_PRIMARY_COLOR }} />
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>
            Checkout opened
          </p>
          <p className="text-xs" style={{ color: '#52636f' }}>
            Complete your donation in the new tab. This page will update
            automatically once your payment is confirmed.
          </p>
          <button
            type="button"
            onClick={() => setView({ kind: 'picking_amount' })}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold"
            style={{
              background: config?.branding.primaryColor ?? FALLBACK_PRIMARY_COLOR,
              color: config?.branding.textOnPrimaryColor ?? '#ffffff',
            }}
          >
            Start again
          </button>
        </div>
      </EmbedShell>
    );
  }

  if (!config) return null; // unreachable once past 'loading', narrows type below

  if (view.kind === 'picking_method') {
    return (
      <EmbedShell
        title={config.buttonTitle ?? undefined}
        primaryColor={config.branding.primaryColor}
        backgroundColor={config.branding.backgroundColor}
      >
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
                  style={{ borderColor: '#dce1df', background: config.branding.backgroundColor }}
                >
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: hexToRgba(config.branding.primaryColor, 0.12), color: config.branding.primaryColor }}
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
      </EmbedShell>
    );
  }

  // view.kind === 'picking_amount' | 'starting_checkout', selectedMethod is set
  if (!selectedMethod) return null; // unreachable in practice

  const sym = symbolFor(config.currency);
  const presets = config.amountConfig.presetAmounts;
  const allowCustom = config.amountConfig.allowCustomAmount;
  const isCustomSelected = selectedAmount === null;
  const hasMultipleMethods = config.methods.length > 1;

  return (
    <EmbedShell
      title={config.buttonTitle ?? undefined}
      primaryColor={config.branding.primaryColor}
      backgroundColor={config.branding.backgroundColor}
    >
      <div className="space-y-4">
        {hasMultipleMethods && (
          <button
            type="button"
            onClick={handleChangeMethod}
            className="flex items-center gap-1 text-xs font-semibold"
            style={{ color: config.branding.primaryColor }}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Change payment method
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {presets.map((amount) => {
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
                    ? {
                        background: config.branding.primaryColor,
                        borderColor: config.branding.primaryColor,
                        color: config.branding.textOnPrimaryColor,
                      }
                    : { background: config.branding.backgroundColor, borderColor: '#dce1df', color: '#102532' }
                }
              >
                {sym}{amount}
              </button>
            );
          })}
        </div>

        {allowCustom && (
          <div>
            <label className="mb-1 block text-xs font-semibold" style={{ color: '#52636f' }}>
              Or enter your own amount
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{ color: '#102532' }}>{sym}</span>
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
                style={{ borderColor: isCustomSelected ? config.branding.primaryColor : '#dce1df' }}
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
          style={{ background: config.branding.primaryColor, color: config.branding.textOnPrimaryColor }}
        >
          {view.kind === 'starting_checkout' ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
            </span>
          ) : (
            config.buttonLabel || 'Donate now'
          )}
        </button>
      </div>
    </EmbedShell>
  );
}

/**
 * Minimal shell — intentionally plain. This renders inside an arbitrary
 * club's own page design, so it should look like a self-contained widget,
 * not bring its own competing branding/header.
 */
function EmbedShell({
  title,
  primaryColor = FALLBACK_PRIMARY_COLOR,
  backgroundColor = FALLBACK_BACKGROUND_COLOR,
  children,
}: {
  title?: string;
  primaryColor?: string;
  backgroundColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mx-auto w-full max-w-sm rounded-xl p-5"
      style={{ background: backgroundColor, border: '1px solid #dce1df', fontFamily: 'Arial, sans-serif' }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Heart className="h-4 w-4" style={{ color: primaryColor }} fill={primaryColor} />
        <h1 className="text-sm font-bold" style={{ color: '#102532' }}>
          {title || 'Make a donation'}
        </h1>
      </div>
      {children}
    </div>
  );
}