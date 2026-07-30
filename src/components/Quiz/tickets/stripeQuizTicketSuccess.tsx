// src/components/Quiz/tickets/stripeQuizTicketSuccess.tsx
//
// UPDATED: safe auto-close for the embedded ticket-widget flow, plus a
// fast-path BroadcastChannel nudge - see ticketCheckoutChannel.ts for
// the full trust model (short version: this is a courtesy speed-up,
// NOT a confirmation mechanism; the original iframe's own
// useTicketStatusPoll, polling the backend's ledger, is what actually
// decides the ticket is confirmed, regardless of whether this
// broadcast ever arrives).
//
// window.close() only works on a tab a script itself opened via
// window.open() - browsers refuse it on a normally-navigated tab. That
// SHOULD already make this safe unconditionally, but this deals with
// money and the user's whole browsing session, so we don't rely on
// that alone: the backend explicitly marks the success_url with
// ?embed=1 only when it built this session for the new-tab embed
// context (see checkoutContext in TicketPurchaseFlow's stripe/checkout
// request, threaded through stripeTicketCheckoutService.js). This page
// only attempts to close itself when it sees that explicit flag.

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import {
  getTicketCheckoutChannelName,
  isBroadcastChannelSupported,
} from './ticketCheckoutChannel';

const AUTO_CLOSE_DELAY_MS = 2500; // give the buyer a moment to actually see the confirmation first

export const StripeQuizTicketSuccess: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');

  // Only true when the backend built this checkout session for the
  // embedded new-tab flow. Absent (anything else) on every existing
  // page, so this whole feature is a no-op for them.
  const isEmbeddedNewTab = searchParams.get('embed') === '1';

  useEffect(() => {
    if (!ticketId) return;

    let attempts = 0;
    const maxAttempts = 10; // poll for up to ~20 seconds

    const poll = async () => {
      try {
        const res = await fetch(`/api/quiz/tickets/${ticketId}/status`);
        const data = await res.json();

        if (data.paymentStatus === 'payment_confirmed') {
          setStatus('confirmed');
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          setStatus('timeout');
          return;
        }

        setTimeout(poll, 2000); // try again in 2 seconds
      } catch {
        attempts++;
        if (attempts < maxAttempts) setTimeout(poll, 2000);
        else setStatus('timeout');
      }
    };

    poll();
  }, [ticketId]);

  // Fast-path nudge only - see file header. The original iframe's own
  // polling is what actually confirms the ticket; this just lets it
  // react a little sooner than its next 3-second poll tick, when the
  // browser supports BroadcastChannel.
  useEffect(() => {
    if (!isEmbeddedNewTab || !ticketId) return;
    if (status !== 'confirmed') return;
    if (!isBroadcastChannelSupported()) return;

    const channel = new BroadcastChannel(getTicketCheckoutChannelName(ticketId));
    channel.postMessage({ type: 'confirmed' });
    channel.close();
  }, [isEmbeddedNewTab, ticketId, status]);

  // Auto-close, only for the embedded new-tab flow, only after the
  // buyer has had a moment to see the confirmation message. Safe on
  // both 'confirmed' and 'timeout' - the original iframe tab has its
  // own independent polling running regardless of what this tab does.
  useEffect(() => {
    if (!isEmbeddedNewTab) return;
    if (status !== 'confirmed' && status !== 'timeout') return;

    const t = setTimeout(() => {
      try { window.close(); } catch { /* nothing further to do if this fails */ }
    }, AUTO_CLOSE_DELAY_MS);

    return () => clearTimeout(t);
  }, [isEmbeddedNewTab, status]);

  if (status === 'polling') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Confirming your payment...</h2>
          <p className="text-gray-500 mt-2 text-sm">This usually takes just a second</p>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed!</h2>
          <p className="text-gray-600 mb-6">Your ticket is ready. Check your email for details.</p>

          {isEmbeddedNewTab ? (
            <>
              <p className="text-sm text-gray-500 mb-4">
                This tab will close automatically - you can go back to the page you were on.
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
              onClick={() => navigate(`/tickets/status/${ticketId}`)}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
            >
              View My Ticket
            </button>
          )}
        </div>
      </div>
    );
  }

  // timeout - payment probably went through but webhook was slow
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment received!</h2>
        <p className="text-gray-600 mb-2">Your payment was successful.</p>
        <p className="text-sm text-gray-500 mb-6">
          Your ticket is being confirmed - check your email shortly.
        </p>

        {isEmbeddedNewTab ? (
          <button
            onClick={() => { try { window.close(); } catch {} }}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
          >
            Close this tab
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
          >
            Go Home
          </button>
        )}
      </div>
    </div>
  );
};