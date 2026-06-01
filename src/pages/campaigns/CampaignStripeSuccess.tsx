// src/pages/campaigns/CampaignStripeSuccess.tsx
//
// Landing page after Stripe Checkout redirect for campaign product orders.
// URL: /campaigns/:campaignId/order-success?orderId=xxx&session_id=xxx
//
// Uses the same shared campaign thank-you component as CampaignSupportPage.
// Stripe remains on a separate route because the order must be confirmed from
// Stripe webhook/order summary polling, not merely from the user landing here.
//
// CHANGES:
//   - onBackToCampaign navigates to / (Close) instead of back to the campaign
//     support page, consistent with CampaignSupportPage behaviour.
//   - backLabel="Close" passed to CampaignOrderThankYou.

import { useEffect, useState } from 'react';
import { useParams, useSearchParams} from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import {
  campaignSupportService,
  GeneratedEntry,
  OrderSummary,
} from '../../components/campaignSupport/services/CampaignSupportService';
import CampaignOrderThankYou from '../../components/campaignSupport/services/CampaignOrderThankYou';

export default function CampaignStripeSuccess() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams] = useSearchParams();
 
  const orderId = searchParams.get('orderId');

  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [entries, setEntries] = useState<GeneratedEntry[]>([]);
  const [campaignName, setCampaignName] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    campaignSupportService
      .getCampaignPage(campaignId)
      .then(data => setCampaignName(data.campaign?.name ?? null))
      .catch(() => {
        // Non-fatal. The thank-you component falls back to "this campaign".
      });
  }, [campaignId]);

  useEffect(() => {
    if (!orderId) {
      setStatus('timeout');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12; // ~24 seconds

    const poll = async () => {
      if (cancelled) return;

      try {
        const data = await campaignSupportService.getOrderSummary(orderId);

        if (cancelled) return;

        // Keep the latest order in state even if the webhook is still catching up.
        // That lets the timeout state render the exact same thank-you design instead
        // of falling back to a different-looking generic page.
        setOrder(data.order);
        setEntries(data.entries ?? []);

        if (data.order.paymentStatus === 'confirmed') {
          setStatus('confirmed');
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          setStatus('timeout');
          return;
        }

        window.setTimeout(poll, 2000);
      } catch {
        attempts += 1;
        if (attempts < maxAttempts) {
          window.setTimeout(poll, 2000);
        } else if (!cancelled) {
          setStatus('timeout');
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (status === 'polling') {
    return (
      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,#fff7ed,white_42%,#f8fafc_100%)] p-4 py-8 sm:p-8">
        <div className="mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-lg items-center justify-center">
          <div className="w-full rounded-[2rem] bg-white p-8 text-center shadow-2xl shadow-orange-100 ring-1 ring-orange-100">
            <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 text-white shadow-xl shadow-orange-200">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-slate-950">Confirming your payment…</h2>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              This usually takes just a second. We're checking the order and activating your game links.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if ((status === 'confirmed' || status === 'timeout') && order) {
    return (
      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,#fff7ed,white_42%,#f8fafc_100%)] p-4 py-8 sm:p-8">
        <CampaignOrderThankYou
          order={order}
          entries={entries}
          campaignName={campaignName}
          sellerName={(order as any).sellerName ?? (order as any).seller_name ?? null}
          orderId={orderId}
          onBackToCampaign={() => { window.location.href = '/'; }}
          backLabel="Close"
        />
      </div>
    );
  }

  // No order summary could be loaded at all.
  return (
    <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top_right,#fff7ed,white_42%,#f8fafc_100%)] p-4 py-8 sm:p-8">
      <div className="mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl shadow-orange-100 ring-1 ring-orange-100 sm:p-8">
        <div className="text-6xl mb-4">🎈</div>
        <h2 className="text-3xl font-black tracking-tight text-slate-950">Thank you for your support!</h2>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Your payment was received, but the order details are still being activated. Please check your email shortly for confirmation and game links.
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = '/'; }}
          className="mt-6 w-full rounded-2xl bg-orange-500 px-6 py-3 font-black text-white transition hover:bg-orange-600"
        >
          Close
        </button>
        {orderId && <p className="mt-4 text-xs font-bold text-slate-400">Order reference: <code>{orderId}</code></p>}
      </div>
    </div>
  );
}