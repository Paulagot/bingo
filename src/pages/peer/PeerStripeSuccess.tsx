// src/pages/peer/PeerStripeSuccess.tsx
//
// Landing page after Stripe Checkout redirect for peer fundraiser orders.
// URL: /fundraise/:clubSlug/:fundraiserSlug/order-success?orderId=xxx&session_id=xxx
//
// peerStripeCheckoutService.js has generated this exact URL since it was
// written - nothing rendered here before. Mirrors CampaignStripeSuccess.tsx:
// poll the public order summary until the webhook confirms, then show the
// same thank-you screen the manual-payment flow uses.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '../../services/PeerSupportService';
import type { PeerOrderSummary, PeerGeneratedEntry } from '../../services/PeerSupportService';
import PeerOrderThankYou from '../../components/peer/PeerOrderThankYou';

export default function PeerStripeSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');
  const [order, setOrder] = useState<PeerOrderSummary | null>(null);
  const [entries, setEntries] = useState<PeerGeneratedEntry[]>([]);

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
          // Previously this stopped polling the instant status flipped to
          // 'confirmed', showing whatever entries happened to be in THIS
          // exact response - even if expansion (which now does more work:
          // row-locking, per-item ticket creation, emails) hadn't actually
          // finished yet. Confirming the order and expanding it into
          // tickets are two separate backend steps, not atomic, so there's
          // a real window where status is already 'confirmed' but entries
          // is still empty. Give it a short grace period to catch up
          // before finalizing, rather than locking in an empty result
          // permanently.
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

  if (status === 'polling') {
    return (
      <main className="grid min-h-screen place-items-center bg-orange-50 p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-orange-500" />
          <h2 className="mt-4 text-xl font-black text-slate-950">Confirming your payment…</h2>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            This usually takes a second - we're checking the order and activating your entries.
          </p>
        </div>
      </main>
    );
  }

  if ((status === 'confirmed' || status === 'timeout') && order) {
    return (
      <main className="min-h-screen bg-orange-50 p-4 py-8">
        <PeerOrderThankYou
          order={order}
          entries={entries}
          orderId={orderId}
          onBack={() => { window.location.href = '/'; }}
        />
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-orange-50 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
        <div className="text-5xl">🎈</div>
        <h2 className="mt-4 text-2xl font-black text-slate-950">Thank you for your support!</h2>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Your payment was received, but the order details are still being activated.
          Check your email shortly for confirmation.
        </p>
        {orderId && <p className="mt-4 text-xs font-bold text-slate-400">Order reference: <code>{orderId}</code></p>}
      </div>
    </main>
  );
}