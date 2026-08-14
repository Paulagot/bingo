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
    const maxAttempts = 12; // ~24 seconds
    let confirmedAttempts = 0;
    const maxConfirmedGraceAttempts = 5; // ~10 more seconds once confirmed, waiting for entries

    const poll = async () => {
      if (cancelled) return;
      try {
        const data = await api.getOrderSummary(orderId);
        if (cancelled) return;

        setOrder(data.order);
        setEntries(data.entries || []);

        if (data.order.paymentStatus === 'confirmed') {
          if ((data.entries || []).length > 0 || confirmedAttempts >= maxConfirmedGraceAttempts) {
            setStatus('confirmed');
            return;
          }
          confirmedAttempts += 1;
          window.setTimeout(poll, 2000);
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) { setStatus('timeout'); return; }
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

  return (
    <main className="grid min-h-screen place-items-center p-6" style={{ background: bgColor }}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🎈</div>
        <h2 className="mt-4 text-2xl font-black text-slate-950">Thank you for your support!</h2>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Your payment was received, but the order details are still being activated.
          Check your email shortly for confirmation.
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