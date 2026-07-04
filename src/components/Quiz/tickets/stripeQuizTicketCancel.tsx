// src/components/Quiz/tickets/stripeQuizTicketCancel.tsx
// (filename typo fixed: was stripeQuizTicketCancl.tsx in the header
// comment of the original file — the actual filename was already
// correct, just the comment inside it wasn't.)
//
// UPDATED: for the embedded new-tab flow, broadcasts a 'cancelled'
// message so the original iframe (sitting in TicketPurchaseFlow's
// 'awaiting-stripe-payment' step) can return to payment-method
// immediately, instead of only finding out after its 5-minute poll
// timeout. See ticketCheckoutChannel.ts for the trust model — a
// 'cancelled' message grants nothing, so it's safe to act on directly
// with no backend verification, unlike a 'confirmed' message.
//
// Also auto-closes itself in the embedded context, same reasoning and
// same safety gate (?embed=1, only ever present when this session was
// created via TicketPurchaseFlow's new-tab strategy) as
// stripeQuizTicketSuccess.tsx.

import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';

import {
  getTicketCheckoutChannelName,
  isBroadcastChannelSupported,
} from './ticketCheckoutChannel';

const AUTO_CLOSE_DELAY_MS = 2000;

export const StripeQuizTicketCancel: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEmbeddedNewTab = searchParams.get('embed') === '1';

  // Unstick the original iframe immediately. Safe to trust directly —
  // this message grants nothing, worst case it's lost and the buyer
  // just waits out the existing poll timeout instead.
  useEffect(() => {
    if (!isEmbeddedNewTab || !ticketId) return;
    if (!isBroadcastChannelSupported()) return;

    const channel = new BroadcastChannel(getTicketCheckoutChannelName(ticketId));
    channel.postMessage({ type: 'cancelled' });
    channel.close();
  }, [isEmbeddedNewTab, ticketId]);

  useEffect(() => {
    if (!isEmbeddedNewTab) return;

    const t = setTimeout(() => {
      try { window.close(); } catch { /* nothing further to do if this fails */ }
    }, AUTO_CLOSE_DELAY_MS);

    return () => clearTimeout(t);
  }, [isEmbeddedNewTab]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment cancelled</h2>
        <p className="text-gray-600 mb-6">
          No worries — your ticket has not been confirmed and you have not been charged.
        </p>

        {isEmbeddedNewTab ? (
          <>
            <p className="text-sm text-gray-500 mb-4">
              This tab will close automatically — you can try again on the page you were on.
            </p>
            <button
              onClick={() => { try { window.close(); } catch {} }}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
            >
              Close this tab
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
};