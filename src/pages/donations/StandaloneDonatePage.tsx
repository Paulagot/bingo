// src/pages/donations/StandaloneDonatePage.tsx
//
// Rendered at /donate-now/:clubId (and /donate-now/:clubId/success).
// A normal, top-level page — no iframe, no modal, no donate.js, no
// window.open()-based relay. Built per the emergency-handoff doc as a
// scope-cut standalone alternative to the iframe/modal embed flow,
// specifically so it sidesteps the still-open postMessage relay bug in
// DonateEmbedPage.tsx / donate.js / CryptoDonationCheckoutPage.tsx
// without needing to touch or fix any of those three files.
//
// Why this has no modal-close bug to worry about: Stripe redirects in
// the SAME TAB the supporter is already looking at (success_url points
// back at this page's own /success route via the backend's new
// optional `returnPath` param), and there is no second tab, no parent
// window, and no postMessage chain anywhere in this flow. The "thank
// you" state is just this same page rendering a different view.
//
// Club ID resolution: reads VITE_DONATION_CLUB_ID from env first (so a
// different value can be set per environment/deploy — e.g. the test
// club locally, the real pilot club's id on the deploy that goes
// live), falling back to a literal default ONLY so the page never
// hard-crashes with no club configured at all. Update
// VITE_DONATION_CLUB_ID (not this file) when switching from your test
// club to the real pilot club.
//
// Crypto leg: opens the existing CryptoDonationCheckoutPage in a NEW
// TAB via window.open() — this page becomes the real window.opener,
// so that page's existing, unmodified postMessage-to-opener success
// effect (per the handoff doc) reaches a real listener here, the same
// way it already reaches DonateEmbedPage's listener today. No changes
// needed to that file at all. If the message never arrives (tab
// closed early, etc.), the supporter just stays on the
// 'awaiting_crypto' view — nothing auto-closes since this is a real
// page, not a modal.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Heart, AlertCircle, Loader2, CheckCircle2, CreditCard, Coins } from 'lucide-react';

import StandaloneDonationService from './services/StandaloneDonationService';
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

// Test-club default — used only if VITE_DONATION_CLUB_ID isn't set at
// build time. Swap the env var per environment, not this fallback.
const FALLBACK_CLUB_ID = 'e14cce81-e3d0-4668-a199-5cb9e7a4539b';

function resolveClubId(paramClubId: string | undefined): string {
  if (paramClubId) return paramClubId;
  return (
    (import.meta.env.VITE_DONATION_CLUB_ID as string | undefined)?.trim() || FALLBACK_CLUB_ID
  );
}

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

type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'picking_method' }
  | { kind: 'picking_amount' }
  | { kind: 'starting_checkout' }
  | { kind: 'awaiting_crypto' }
  | { kind: 'success' }
  | { kind: 'cancelled' };

export default function StandaloneDonatePage() {
  const params = useParams<{ clubId?: string }>();
  const [searchParams] = useSearchParams();

  const clubId = resolveClubId(params.clubId);

  const [config, setConfig] = useState<PublicDonationButtonConfig | null>(null);
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [selectedMethod, setSelectedMethod] = useState<ResolvedDonationMethod | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');

  // Landing back here after Stripe redirect, or after a same-tab crypto
  // checkout navigation signals success via query param.
  useEffect(() => {
    if (searchParams.get('cancelled') === '1') {
      setView({ kind: 'cancelled' });
      return;
    }
    if (searchParams.get('session_id') || searchParams.get('donation_success') === '1') {
      setView({ kind: 'success' });
      return;
    }
  }, [searchParams]);

  useEffect(() => {
    if (!clubId) return;
    if (
      searchParams.get('session_id') ||
      searchParams.get('cancelled') === '1' ||
      searchParams.get('donation_success') === '1'
    ) {
      return;
    }

    let cancelled = false;

    StandaloneDonationService.getPublicConfig(clubId)
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
  }, [clubId, searchParams]);

  // Listens for the success postMessage that CryptoDonationCheckoutPage
  // sends to window.opener once an on-chain crypto donation confirms
  // (per the handoff doc's description of that page's existing,
  // unmodified success effect). THIS page is genuinely the opener here
  // — the crypto leg above uses a real window.open() — so this listener
  // receives that message exactly the same way DonateEmbedPage's own
  // listener does today, with no changes needed to the child page at
  // all. If the child tab's message never arrives (e.g. pop-up blocked
  // some other way, or the supporter closes the tab without finishing),
  // the supporter simply stays on the 'awaiting_crypto' view — there is
  // no auto-close or timeout here since this is a real page they can
  // read, not a modal that needs to disappear.
  useEffect(() => {
    function handleCryptoSuccessMessage(event: MessageEvent) {
      const data = event.data || {};
      if (data.type !== 'FUNDRAISELY_DONATION_SUCCESS') return;
      setView({ kind: 'success' });
    }
    window.addEventListener('message', handleCryptoSuccessMessage);
    return () => window.removeEventListener('message', handleCryptoSuccessMessage);
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
      const result = await StandaloneDonationService.startCheckout(clubId, {
        clubPaymentMethodId: selectedMethod.clubPaymentMethodId,
        amount,
        donorName: donorName.trim() || undefined,
        donorEmail: donorEmail.trim() || undefined,
        // Tells the backend to point Stripe's success_url/cancel_url at
        // THIS page instead of the old hardcoded /embed/donate/:clubId
        // path. Optional on the backend — see DonationCheckoutService.js
        // patch — so this is purely additive and doesn't touch the
        // existing iframe flow's behavior at all.
        returnPath: `/donate-now/${clubId}`,
      });

      if (result.provider === 'stripe' || result.provider === 'sumup_api') {
        // SAME-TAB redirect — this is the whole point of this page.
        // No window.open, nothing to relay, nothing to close.
        window.location.href = result.redirectUrl;
        return;
      }

      if (result.provider === 'crypto') {
        // Open in a NEW TAB rather than navigating away in this tab.
        // This page has no modal/iframe behind it, so it doesn't
        // strictly need a new tab per the handoff doc — but
        // CryptoDonationCheckoutPage's only DOCUMENTED success
        // mechanism is window.opener.postMessage(...). Its file
        // contents weren't available while building this page, so
        // rather than invent an unverified query-param return path
        // that risks silently stranding the supporter, this opens a
        // new tab and listens for that SAME postMessage this tab
        // becomes the opener of — reusing the one mechanism that page
        // is confirmed to have, with no need for it to know this page
        // exists or change anything about it.
        const params2 = new URLSearchParams({
          wallet: result.walletAddress,
          amount: String(amount),
          currency: config.currency,
        });
        const checkoutWindow = window.open(
          `/donate/${clubId}/crypto/${result.donationId}?${params2.toString()}`,
          '_blank'
        );
        if (!checkoutWindow) {
          setView({
            kind: 'error',
            message: 'Your checkout could not open. Please allow pop-ups for this site and try again.',
          });
          return;
        }
        setView({ kind: 'awaiting_crypto' });
        return;
      }
    } catch (err: any) {
      setView({
        kind: 'error',
        message: err?.message || 'Could not start checkout. Please try again.',
      });
    }
  };

  const primaryColor = config?.branding.primaryColor ?? FALLBACK_PRIMARY_COLOR;
  const backgroundColor = config?.branding.backgroundColor ?? FALLBACK_BACKGROUND_COLOR;
  const textOnPrimaryColor = config?.branding.textOnPrimaryColor ?? FALLBACK_TEXT_ON_PRIMARY;

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ background: '#f8f3ea' }}
    >
      <div
        className="w-full max-w-md rounded-[1.75rem] border p-6 shadow-sm sm:p-8"
        style={{ background: backgroundColor, borderColor: '#dce1df' }}
      >
        <div className="mb-6 flex items-center gap-2">
          <Heart className="h-5 w-5" style={{ color: primaryColor }} fill={primaryColor} />
          <h1 className="text-lg font-black" style={{ color: '#102532' }}>
            {config?.buttonTitle || 'Make a donation'}
          </h1>
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

        {view.kind === 'cancelled' && (
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
              style={{ background: primaryColor, color: textOnPrimaryColor }}
            >
              Try again
            </button>
          </div>
        )}

        {view.kind === 'awaiting_crypto' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: primaryColor }} />
            <p className="text-sm font-semibold" style={{ color: '#102532' }}>
              Complete your donation in the new tab
            </p>
            <p className="text-xs" style={{ color: '#52636f' }}>
              This page will update automatically once your crypto donation is confirmed.
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Redirecting…
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