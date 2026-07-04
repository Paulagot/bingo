// src/components/embed/TicketEmbedPage.tsx
//
// The page a club's embedded ticket <iframe> actually loads. Lives at
// /embed/tickets/:roomId. Mirrors DonateEmbedPage.tsx's role, but is
// much thinner: TicketPurchaseFlow already owns the entire state
// machine (loading, payment methods, Stripe polling, crypto's
// synchronous confirm, instant-payment's manual confirm) — this page's
// only job is to render it with the right embed-specific props and
// relay a UI-courtesy "done" notice to the parent frame.
//
// Security note (same principle as donate.js / DonateEmbedPage.tsx):
// the postMessage below is a courtesy notification only, so the
// club's page can close its modal a little sooner. It is NOT how
// payment success is determined — that already happened inside
// TicketPurchaseFlow, via useTicketStatusPoll polling the backend's
// own ledger (Stripe), or the on-chain-verified confirmOnBackend call
// (crypto), or the manual admin-reconciled instant_payment path. This
// page has no independent opinion about whether payment succeeded —
// it only reacts to onComplete firing.

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import TicketPurchaseFlow from '../Quiz/tickets/TicketPurchaseFlow';
import type { Ticket } from '../Quiz/tickets/types';

export default function TicketEmbedPage() {
  const { roomId } = useParams<{ roomId: string }>();

  // Let the club's page (or a modal we're inside) know this iframe
  // wants to close/resize on load, same pattern as DonateEmbedPage.
  useEffect(() => {
    document.body.style.background = 'transparent';
  }, []);

  const notifyParent = (type: string, detail: Record<string, unknown> = {}) => {
    const isInIframe = window !== window.parent;
    if (!isInIframe) return;

    try {
      window.parent.postMessage({ type, ...detail }, '*');
    } catch (e) {
      console.error('[TicketEmbedPage] postMessage to window.parent threw:', e);
    }
  };

  const handleComplete = (ticket: Ticket) => {
    // Courtesy notice only — see file header. tickets.js's listener
    // downgrades this the same way donate.js's does: it may close the
    // modal sooner, but is never the thing that decided payment
    // succeeded.
    notifyParent('FUNDRAISELY_TICKET_SUCCESS', {
      roomId,
      ticketId: ticket.ticketId,
    });
  };

  const handleCancel = () => {
    notifyParent('FUNDRAISELY_TICKET_CLOSE', { roomId });
  };

  if (!roomId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center bg-white p-6">
        <div className="max-w-sm text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-500" />
          <h1 className="mb-1 text-lg font-bold text-gray-900">
            Missing room ID
          </h1>
          <p className="text-sm text-gray-600">
            This ticket embed is missing its room reference.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TicketPurchaseFlow
      roomId={roomId}
      mode="embedded"
      paymentRedirectStrategy="new-tab"
      onCancel={handleCancel}
      onComplete={handleComplete}
    />
  );
}