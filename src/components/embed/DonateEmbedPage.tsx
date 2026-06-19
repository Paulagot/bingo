// src/components/embed/DonateEmbedPage.tsx
//
// Rendered at /embed/donate/:clubId (and /embed/donate/:clubId/success).
// This is the page that goes INSIDE the <iframe> a club pastes on their
// own site — no app header/nav, no auth, nothing that assumes a logged-in
// user. Mount this as its own lazy-loaded route in your router so it
// doesn't pull in dashboard code just to show a donate button.
//
// Flow: fetch config -> show amount picker -> POST checkout -> dispatch
// on provider ('stripe' redirects away via window.location, 'crypto'
// renders the in-page wallet-connect step). There is no provider-choice
// step for the supporter — see ResolvedDonationMethod in
// donationCheckout.ts for why a button has exactly one configured
// provider, decided by the admin ahead of time.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Heart, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

import DonationCheckoutService from './services/DonationCheckoutService';
import type { PublicDonationButtonConfig } from '../../shared/types/donationCheckout';

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

type ViewState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'picking_amount' }
  | { kind: 'starting_checkout' }
  | { kind: 'crypto_pending'; walletAddress: string; amount: number }
  | { kind: 'checkout_opened'; provider: 'stripe' | 'sumup_api' }
  | { kind: 'success' }
  | { kind: 'cancelled' };

export default function DonateEmbedPage() {
  const { clubId } = useParams<{ clubId: string }>();
  const [searchParams] = useSearchParams();

  const [config, setConfig] = useState<PublicDonationButtonConfig | null>(null);
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
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
        setView({ kind: 'picking_amount' });
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
    //      for Stripe, but kept as a fallback.)
    //   2. In a new tab opened via window.open from inside the iframe —
    //      window.opener is the IFRAME, not the club's top-level page.
    //      The iframe (still open, still showing picking_amount) needs
    //      to relay this onward to ITS OWN parent — see the message
    //      listener below.
    //   3. Standalone, no opener and no parent — nothing to notify,
    //      just close the tab.
    const hasOpener = !!window.opener;
    const isInIframe = window !== window.parent;

    if (hasOpener) {
      try {
        window.opener.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId }, '*');
      } catch (e) {}
      const t = setTimeout(() => { try { window.close(); } catch (e) {} }, 2000);
      return () => clearTimeout(t);
    }

    if (isInIframe) {
      try {
        window.parent.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId }, '*');
      } catch (e) {}
      return;
    }

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
      if (data.type !== 'FUNDRAISELY_DONATION_SUCCESS') return;

      // Update this iframe's own UI too, in case there's any visible
      // delay before donate.js's listener closes the modal overlay —
      // better to show "thank you" than stale picking_amount/checkout_opened.
      setView({ kind: 'success' });

      const isInIframe = window !== window.parent;
      if (isInIframe) {
        try {
          window.parent.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId: data.clubId }, '*');
        } catch (e) {}
      }
    }
    window.addEventListener('message', handleChildMessage);
    return () => window.removeEventListener('message', handleChildMessage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDonate = async () => {
    if (!clubId || !config) return;

    const amount = selectedAmount ?? Number(customAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setView({ kind: 'starting_checkout' });

    try {
      const result = await DonationCheckoutService.startCheckout(clubId, {
        clubPaymentMethodId: config.method.clubPaymentMethodId,
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
        setView({ kind: 'crypto_pending', walletAddress: result.walletAddress, amount });
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
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#157f85' }} />
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
      <EmbedShell title={config?.buttonTitle ?? undefined}>
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
            className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#157f85' }}
          >
            Try again
          </button>
        </div>
      </EmbedShell>
    );
  }

  if (view.kind === 'success') {
    return (
      <EmbedShell title={config?.buttonTitle ?? undefined}>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-8 w-8" style={{ color: '#157f85' }} />
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
      <EmbedShell title={config?.buttonTitle ?? undefined}>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <CheckCircle2 className="h-8 w-8" style={{ color: '#157f85' }} />
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>
            Checkout opened
          </p>
          <p className="text-xs" style={{ color: '#52636f' }}>
            Complete your donation in the new tab. You can close this window when done.
          </p>
          <button
            type="button"
            onClick={() => setView({ kind: 'picking_amount' })}
            className="mt-3 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: '#157f85' }}
          >
            Start again
          </button>
        </div>
      </EmbedShell>
    );
  }

  if (!config) return null; // unreachable once past 'loading', narrows type below

  const sym = symbolFor(config.currency);
  const presets = config.amountConfig.presetAmounts;
  const allowCustom = config.amountConfig.allowCustomAmount;

  if (view.kind === 'crypto_pending') {
    return (
      <EmbedShell title={config.buttonTitle ?? undefined}>
        <div className="space-y-3 py-2 text-center">
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>
            Send {sym}{view.amount.toFixed(2)} worth of crypto to:
          </p>
          <code
            className="block break-all rounded-lg p-3 text-xs"
            style={{ background: '#f6f1e8', color: '#102532' }}
          >
            {view.walletAddress}
          </code>
          <p className="text-xs" style={{ color: '#52636f' }}>
            Connect your wallet and complete the transfer. This page will need a wallet
            connector and on-chain confirmation step — not yet wired up here; this is the
            handoff point matching the existing quiz crypto donation flow.
          </p>
        </div>
      </EmbedShell>
    );
  }

  // view.kind === 'picking_amount' | 'starting_checkout'
  const isCustomSelected = selectedAmount === null;

  return (
    <EmbedShell title={config.buttonTitle ?? undefined}>
      <div className="space-y-4">
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
                    ? { background: '#157f85', borderColor: '#157f85', color: '#ffffff' }
                    : { background: '#ffffff', borderColor: '#dce1df', color: '#102532' }
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
                style={{ borderColor: isCustomSelected ? '#157f85' : '#dce1df' }}
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
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ background: '#157f85' }}
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
 * so a club admin previewing this from the dashboard sees visual
 * continuity, without trying to look like a full marketing page.
 */
function EmbedShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      className="mx-auto w-full max-w-sm rounded-xl p-5"
      style={{ background: '#ffffff', border: '1px solid #dce1df', fontFamily: 'Arial, sans-serif' }}
    >
      <div className="mb-4 flex items-center gap-2">
        <Heart className="h-4 w-4" style={{ color: '#157f85' }} fill="#157f85" />
        <h1 className="text-sm font-bold" style={{ color: '#102532' }}>
          {title || 'Make a donation'}
        </h1>
      </div>
      {children}
    </div>
  );
}