// src/pages/peer/PeerStripeSuccess.tsx
//
// Landing page after Stripe Checkout redirect for peer fundraiser orders.
// URL: /fundraise/:clubSlug/:fundraiserSlug/order-success?orderId=xxx&session_id=xxx
//
// Fetches club branding via api.page() alongside the order summary so
// PeerOrderThankYou renders in the club's colours rather than the default
// orange. Both slugs are available from the route params.

import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../services/PeerSupportService';
import type { PeerOrderSummary, PeerGeneratedEntry } from '../../services/PeerSupportService';
import PeerOrderThankYou from '../../components/peer/PeerOrderThankYou';
import { getTheme, firstDefined } from './support/peerSupporthelpers';

export default function PeerStripeSuccess() {
  const { clubSlug = '', fundraiserSlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');
  const [order, setOrder] = useState<PeerOrderSummary | null>(null);
  const [entries, setEntries] = useState<PeerGeneratedEntry[]>([]);
  const [pageData, setPageData] = useState<any>(null);

  // Fetch club/fundraiser branding in parallel with order polling.
  // Non-fatal if it fails — falls back to default colours.
  useEffect(() => {
    if (!clubSlug || !fundraiserSlug) return;
    api.page(clubSlug, fundraiserSlug)
      .then(data => setPageData(data))
      .catch(() => {/* non-fatal — branding just falls back to default */});
  }, [clubSlug, fundraiserSlug]);

  useEffect(() => {
    if (!orderId) { setStatus('timeout'); return; }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15; // ~30 seconds — extra buffer for slow webhooks
    let confirmedAttempts = 0;
    const maxConfirmedGraceAttempts = 8; // ~16 more seconds once confirmed, waiting for ready entries

    // Entries exist in the DB as 'pending_payment' during reservation, before
    // expandPeerOrder runs and sets them to 'confirmed' with a join_url.
    // Checking entries.length alone stops polling too early and renders
    // PeerOrderThankYou with no join links. Only stop once we have at least
    // one entry that is confirmed with a join URL.
    const hasReadyEntries = (data: any) =>
      (data.entries || []).some((e: any) => e.status === 'confirmed' && e.join_url);

    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await api.getOrderSummary(orderId);
        if (cancelled) return;

        setOrder(data.order);
        setEntries(data.entries || []);

        if (data.order.paymentStatus === 'confirmed') {
          if (hasReadyEntries(data) || confirmedAttempts >= maxConfirmedGraceAttempts) {
            setStatus('confirmed');
            return;
          }
          confirmedAttempts += 1;
          window.setTimeout(poll, 2000);
          return;
        }

        // Still pending — keep polling up to maxAttempts.
        attempts += 1;
        if (attempts >= maxAttempts) {
          if (data.order.paymentStatus === 'confirmed' && hasReadyEntries(data)) {
            setStatus('confirmed');
          } else {
            // Show timeout but keep order/entries in state so the fallback
            // screen can upgrade to confirmed if a background poll succeeds.
            setStatus('timeout');
          }
          return;
        }

        window.setTimeout(poll, 2000);
      } catch {
        attempts += 1;
        if (attempts < maxAttempts) window.setTimeout(poll, 2000);
        else if (!cancelled) setStatus('timeout');
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [orderId]);

  // Once we've hit timeout, keep polling slowly in the background.
  // If the webhook arrives late (e.g. Railway slowdown) the screen
  // upgrades to the proper confirmed view without needing a page refresh.
  useEffect(() => {
    if (status !== 'timeout' || !orderId) return;

    let cancelled = false;
    let backgroundAttempts = 0;
    const maxBackgroundAttempts = 15; // another ~60 seconds at 4s intervals

    const backgroundPoll = async () => {
      if (cancelled) return;
      try {
        const data = await api.getOrderSummary(orderId);
        if (cancelled) return;

        const readyEntries = (data.entries || []).filter(
          (e: any) => e.status === 'confirmed' && e.join_url,
        );
        if (data.order.paymentStatus === 'confirmed' && readyEntries.length > 0) {
          setOrder(data.order);
          setEntries(data.entries || []);
          setStatus('confirmed');
          return;
        }
      } catch {
        // non-fatal — just keep trying
      }

      backgroundAttempts += 1;
      if (backgroundAttempts < maxBackgroundAttempts) {
        window.setTimeout(backgroundPoll, 4000);
      }
    };

    const timer = window.setTimeout(backgroundPoll, 4000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [status, orderId]);

  // Derive branding from club data — same logic as PeerSupportPage
  const theme = useMemo(() => getTheme(pageData), [pageData]);
  const logoUrl = firstDefined(
    pageData?.club?.logoUrl,
    pageData?.club?.logo_url,
    pageData?.club?.brand_logo_url,
  );

  const bgColor = pageData?.club?.brand_background_color || '#fff7ed';

  if (status === 'polling') {
    return (
      <main className="grid min-h-screen place-items-center p-6" style={{ background: bgColor }}>
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <Loader2
            className="mx-auto h-10 w-10 animate-spin"
            style={{ color: theme.primary }}
          />
          <h2 className="mt-4 text-xl font-black text-slate-950">Confirming your payment…</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            This usually takes a second — we're checking the order and activating your entries.
          </p>
        </div>
      </main>
    );
  }

  // Show the proper thank-you screen as soon as we have order data —
  // PeerOrderThankYou handles the case where entries aren't ready yet
  // (shows the email message instead of join links).
  if ((status === 'confirmed' || status === 'timeout') && order) {
    return (
      <main className="min-h-screen p-4 py-8" style={{ background: bgColor }}>
        <PeerOrderThankYou
          order={order}
          entries={entries}
          orderId={orderId}
          fundraiserName={pageData?.fundraiser?.name}
          clubName={pageData?.club?.name}
          logoUrl={logoUrl}
          primaryColor={theme.primary}
          textOnPrimaryColor={
            pageData?.club?.brand_text_on_primary_color || '#ffffff'
          }
          onBack={() => { window.location.href = '/'; }}
          backLabel="Back to home"
        />
      </main>
    );
  }

  // Pure fallback — no order data at all, or orderId missing.
  // Background polling will upgrade this to the thank-you screen
  // if the webhook arrives while the supporter is still on the page.
  return (
    <main className="grid min-h-screen place-items-center p-6" style={{ background: bgColor }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <Loader2
          className="mx-auto h-10 w-10 animate-spin"
          style={{ color: theme.primary }}
        />
        <div className="text-5xl mt-2">🎈</div>
        <h2 className="mt-4 text-2xl font-black text-slate-950">Thank you for your support!</h2>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Your payment was received — we're just finishing setting up your entries.
          This page will update automatically, or check your email shortly.
        </p>
        {orderId && (
          <p className="mt-4 text-xs font-bold text-slate-400">
            Order reference: <code>{orderId}</code>
          </p>
        )}
      </div>
    </main>
  );
}