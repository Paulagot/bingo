// src/components/embed/DonateEmbedPage.tsx
//
// Rendered at /embed/donate/:clubId (and /embed/donate/:clubId/success).
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
// header comment for why (AppKit's connect modal was confirmed working
// in-iframe for injected wallets, but WalletConnect's mobile deep-link
// return inside this iframe nesting was deliberately left untested;
// opening a full tab sidesteps that open question, same structural
// reason Stripe already uses a new tab). Once a method is chosen, the
// amount picker shows a "change payment method" link that returns to
// the choice step — see the 'picking_amount' render branch below.

import { useEffect, useState } from 'react';
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
 * icons (previously a hardcoded rgba(21,127,133,0.12) tied to the old
 * fixed teal). Falls back to the fixed teal's own translucent value if
 * given anything malformed, rather than producing an invalid CSS value.
 */
function hexToRgba(hex: string, alpha: number): string {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!match) return `rgba(21,127,133,${alpha})`;
  // Non-null assertions are safe here: none of this regex's three
  // groups are optional, and `!match` above already guarantees the
  // whole pattern matched — TypeScript just can't infer that capture
  // groups on a successful match are non-undefined on its own.
  const r = parseInt(match[1]!, 16);
  const g = parseInt(match[2]!, 16);
  const b = parseInt(match[3]!, 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Display metadata for the provider-choice cards. Icon + label per the
// design decision — Stripe gets a card icon, crypto gets a coin icon.
// sumup_api isn't built yet (DonationCheckoutService.js's dispatcher has
// no case for it) but is included here defensively so the picker
// doesn't render a blank/unlabeled card if it ever shows up in
// `methods` ahead of the backend actually supporting it.
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
  | { kind: 'checkout_opened'; provider: 'stripe' | 'sumup_api' | 'crypto' }
  | { kind: 'success' }
  | { kind: 'cancelled' };

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
    // Check searchParams directly here — NOT view.kind — because view
    // is a stale closure value at the moment this effect fires (React
    // hasn't flushed the setView({ kind: 'success' }) call from the
    // other effect yet). searchParams is stable and synchronous, so
    // this correctly skips the config fetch on the success/cancel
    // redirect-back paths without depending on effect ordering.
    if (searchParams.get('session_id') || searchParams.get('cancelled') === '1') return;

    let cancelled = false;

    DonationCheckoutService.getPublicConfig(clubId)
      .then((res) => {
        if (cancelled) return;
        setConfig(res);

        // PHASE 3b: if there's exactly one method, skip the
        // provider-choice step entirely — select it immediately and go
        // straight to the amount picker, identical to the old
        // single-method flow. If there's more than one, show the
        // choice step first per the chosen flow (method before amount).
        //
        // res.methods[0] is checked explicitly here (not just inferred
        // from the .length === 1 check) because TypeScript can't narrow
        // an array-index access to non-undefined purely from a separate
        // .length comparison — under strict/noUncheckedIndexedAccess
        // settings, res.methods[0] is still typed as
        // ResolvedDonationMethod | undefined until checked directly.
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

  // Post-success side effects: close the modal overlay (if running
  // inside the donate.js iframe) or close the standalone tab (if Stripe
  // redirected here directly in its own tab). This MUST sit here, above
  // every early `return` below (loading/error/cancelled), and run on
  // every single render regardless of view.kind — React requires the
  // same hooks in the same order on every render. The effect's own body
  // checks view.kind and no-ops if it isn't 'success'; that conditional
  // logic belongs inside the effect, never around the useEffect() call
  // itself.
  useEffect(() => {
    if (view.kind !== 'success') return;

    // Three possible contexts this success page can be running in:
    //   1. Inside the donate.js iframe directly — window.parent is the
    //      club's top-level page. (Not the path we actually use anymore
    //      for Stripe/crypto, but kept as a fallback.)
    //   2. In a new tab opened via window.open from inside the iframe —
    //      window.opener is the IFRAME, not the club's top-level page.
    //      The iframe (still open, still showing picking_amount) needs
    //      to relay this onward to ITS OWN parent — see the message
    //      listener below.
    //   3. Standalone, no opener and no parent — nothing to notify,
    //      just close the tab.
    //
    // TEMPORARY DIAGNOSTIC LOGGING — added to find why this works on
    // localhost but the modal does not close on staging. Remove once
    // root cause is confirmed. Every branch and every catch logs, since
    // the original catch (e) {} blocks would otherwise hide a thrown
    // error completely with zero visible symptom.
    const hasOpener = !!window.opener;
    const isInIframe = window !== window.parent;
    console.log('[FR-DEBUG success-effect] view=success. hasOpener=', hasOpener, 'isInIframe=', isInIframe, 'location=', window.location.href);

    if (hasOpener) {
      try {
        window.opener.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId }, '*');
        console.log('[FR-DEBUG success-effect] postMessage to window.opener SUCCEEDED (no throw). clubId=', clubId);
      } catch (e) {
        console.error('[FR-DEBUG success-effect] postMessage to window.opener THREW:', e);
      }
      const t = setTimeout(() => {
        console.log('[FR-DEBUG success-effect] closing this tab now (hasOpener branch)');
        try { window.close(); } catch (e) { console.error('[FR-DEBUG success-effect] window.close() threw:', e); }
      }, 2000);
      return () => clearTimeout(t);
    }

    if (isInIframe) {
      try {
        window.parent.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId }, '*');
        console.log('[FR-DEBUG success-effect] postMessage to window.parent SUCCEEDED (no throw). clubId=', clubId);
      } catch (e) {
        console.error('[FR-DEBUG success-effect] postMessage to window.parent THREW:', e);
      }
      return;
    }

    console.log('[FR-DEBUG success-effect] neither hasOpener nor isInIframe — standalone tab, just closing.');
    // Standalone tab, no opener relationship (e.g. opened directly by
    // the user, or opener was severed) — just close after the pause.
    const t = setTimeout(() => { try { window.close(); } catch (e) {} }, 2000);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.kind]);

  // Relay listener: if THIS page is itself the iframe sitting inside
  // donate.js's modal, and a child tab we spawned (via window.open)
  // posts a success message to us, forward it up to OUR parent (the
  // club's top-level page) so donate.js's listener there can close the
  // modal. Without this relay, the success message only reaches the
  // iframe and stops there — the iframe has no way to close itself
  // from the OUTSIDE (the overlay lives on the club's page, not inside
  // this iframe's own DOM).
  useEffect(() => {
    function handleChildMessage(event: MessageEvent) {
      const data = event.data || {};
      // TEMPORARY DIAGNOSTIC LOGGING — logs EVERY message this window
      // receives, not just ones matching our type, so we can see if
      // staging's message even arrives here at all versus being
      // filtered out by something upstream (e.g. never reaching this
      // listener because the child tab's postMessage call threw before
      // it ever got sent).
      console.log('[FR-DEBUG relay-listener] message event received. origin=', event.origin, 'data=', data);

      if (data.type !== 'FUNDRAISELY_DONATION_SUCCESS') {
        console.log('[FR-DEBUG relay-listener] ignoring — type does not match FUNDRAISELY_DONATION_SUCCESS');
        return;
      }

      console.log('[FR-DEBUG relay-listener] MATCHED success message. clubId=', data.clubId, '. Setting local view to success and checking isInIframe...');

      // Update this iframe's own UI too, in case there's any visible
      // delay before donate.js's listener closes the modal overlay —
      // better to show "thank you" than stale picking_amount/checkout_opened.
      setView({ kind: 'success' });

      const isInIframe = window !== window.parent;
      console.log('[FR-DEBUG relay-listener] isInIframe=', isInIframe, 'location=', window.location.href);

      if (isInIframe) {
        try {
          window.parent.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId: data.clubId }, '*');
          console.log('[FR-DEBUG relay-listener] relayed to window.parent SUCCEEDED (no throw)');
        } catch (e) {
          console.error('[FR-DEBUG relay-listener] relay to window.parent THREW:', e);
        }
      } else {
        console.log('[FR-DEBUG relay-listener] not in an iframe, nothing to relay upward');
      }
    }
    window.addEventListener('message', handleChildMessage);
    console.log('[FR-DEBUG relay-listener] listener attached. window.location=', window.location.href);
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
        // Open Stripe/SumUp in a new tab rather than navigating the iframe.
        // When the iframe tries to do window.location.href on a cross-origin
        // parent page, browsers block it or open a new tab anyway — so we
        // do it explicitly. The donation form (this iframe) stays visible,
        // showing a "checkout opened" state so the supporter knows what
        // happened. The webhook records confirmation server-side regardless
        // of what the iframe shows afterward.
        //
        // Deliberately NOT passing 'noopener' here — the success page
        // (landed on after Stripe redirects) needs window.opener to point
        // back to THIS iframe so it can postMessage the success event
        // back, which is how the modal gets closed automatically. Using
        // noopener severs that relationship entirely, which is what was
        // causing the close-the-modal flow to silently fail. Both ends of
        // this relationship are FundRaisely's own pages (this iframe and
        // the success page), so there's no security reason to isolate
        // them from each other the way you would for an arbitrary
        // third-party link.
        const checkoutWindow = window.open(result.redirectUrl, '_blank');
        console.log('[FR-DEBUG handleDonate stripe] window.open returned:', !!checkoutWindow, 'redirectUrl=', result.redirectUrl, 'this window.location=', window.location.href);
        if (!checkoutWindow) {
          setView({
            kind: 'error',
            message: 'Your checkout could not open. Please allow pop-ups for this site and try again.',
          });
          return;
        }
        setView({ kind: 'checkout_opened', provider: result.provider });
        return;
      }

      if (result.provider === 'crypto') {
        // Same window.open() pattern as the stripe/sumup_api branch
        // above, for the same structural reason — see this file's top
        // comment and CryptoDonationCheckoutPage.tsx's header comment.
        //
        // config.currency comes from PublicDonationButtonConfig (already
        // loaded into `config` state above) — the club's reporting
        // currency, same value used for the amount picker's symbol.
        const params = new URLSearchParams({
          wallet: result.walletAddress,
          amount: String(amount),
          currency: config.currency,
        });
        const checkoutUrl = `/donate/${clubId}/crypto/${result.donationId}?${params.toString()}`;

        // Deliberately NOT passing 'noopener' — same reasoning as the
        // stripe/sumup_api branch above: CryptoDonationCheckoutPage's
        // success state needs window.opener to point back to THIS
        // iframe so it can postMessage the success event back, which is
        // how the modal gets closed automatically. Both ends of this
        // relationship are FundRaisely's own pages.
        const checkoutWindow = window.open(checkoutUrl, '_blank');
        console.log('[FR-DEBUG handleDonate crypto] window.open returned:', !!checkoutWindow, 'checkoutUrl=', checkoutUrl, 'this window.location=', window.location.href);
        if (!checkoutWindow) {
          setView({
            kind: 'error',
            message: 'Your checkout could not open. Please allow pop-ups for this site and try again.',
          });
          return;
        }
        setView({ kind: 'checkout_opened', provider: 'crypto' });
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
            Complete your donation in the new tab. You can close this window when done.
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
  if (!selectedMethod) return null; // unreachable in practice — picking_amount is never entered without a selected method

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
 * not bring its own competing branding/header. Matches the existing
 * dashboard's color tokens (#157f85 teal, #f6f1e8 cream, #dce1df borders)
 * as a DEFAULT, but primaryColor/backgroundColor are now driven by the
 * button's saved branding once config has loaded — see PublicDonationButtonConfig.branding.
 * Both props are optional (defaulting to the original fixed colors) since
 * the loading/error views render this shell before config exists.
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