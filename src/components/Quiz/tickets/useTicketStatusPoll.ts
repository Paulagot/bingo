// src/components/Quiz/tickets/useTicketStatusPoll.ts
//
// Polls GET /api/quiz/tickets/:ticketId/status until the backend's own
// ledger — written only by a verified Stripe webhook — reports the
// payment as confirmed.
//
// This is the PRIMARY confirmation path, not a fallback. Nothing in
// TicketPurchaseFlow ever marks a ticket "complete" based on the new
// payment tab closing, a postMessage arriving, or any client-asserted
// signal — only based on this poll reaching paymentStatus ===
// 'payment_confirmed'. That status is only ever set server-side by the
// Stripe webhook handler, same as the existing (already proven)
// donation flow's useDonationStatusPoll.
//
// Uses the real TicketStatus type from ./types (the shape GET
// /:ticketId/status actually returns) rather than a hand-rolled
// duplicate — an earlier version of this file defined its own type
// with 'failed' | 'expired' as possible paymentStatus values, which
// don't exist in TicketStatus's actual union
// ('payment_claimed' | 'payment_confirmed' | 'refunded'). A ticket
// that hasn't been paid for yet just stays at 'payment_claimed' —
// there's no separate "failed" state to detect; only 'refunded' is a
// genuine terminal non-success outcome.

import { useEffect } from 'react';
import type { TicketStatus } from './types';

const POLL_INTERVAL_MS = 3000;
const TIMEOUT_MS = 5 * 60 * 1000; // stop after 5 minutes — webhooks can occasionally lag

interface UseTicketStatusPollArgs {
  /** The ticketId returned by POST /api/quiz/tickets/stripe/checkout. Poll doesn't start until this is set. */
  ticketId: string | null;
  /** Gate the poll — only run while the component is actually in the awaiting-payment step. */
  enabled: boolean;
  /** Called exactly once, the moment paymentStatus flips to 'payment_confirmed'. Polling stops after this fires. */
  onConfirmed: (ticket: TicketStatus) => void;
}

export function useTicketStatusPoll({
  ticketId,
  enabled,
  onConfirmed,
}: UseTicketStatusPollArgs): void {
  useEffect(() => {
    if (!enabled || !ticketId) return;

    let cancelled = false;
    const startedAt = Date.now();
    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (cancelled) return;

      if (Date.now() - startedAt > TIMEOUT_MS) {
        console.warn('[useTicketStatusPoll] timed out after 5 minutes without confirmation. ticketId=', ticketId);
        return; // stop polling — the UI's own copy tells the buyer the tab may still be open
      }

      try {
        const res = await fetch(`/api/quiz/tickets/${ticketId}/status`);
        const data: TicketStatus = await res.json();

        if (cancelled) return;

        if (res.ok && data.paymentStatus === 'payment_confirmed') {
          onConfirmed(data);
          return; // stop polling — confirmed, no more requests needed
        }

        if (data.paymentStatus === 'refunded') {
          console.warn('[useTicketStatusPoll] ticket was refunded before payment completed. ticketId=', ticketId);
          return; // stop polling — terminal, retrying won't help
        }

        // 'payment_claimed' (still waiting) just keeps polling.
      } catch (err) {
        // Network hiccup — don't stop polling for one failed request,
        // the next interval will retry naturally.
        console.warn('[useTicketStatusPoll] poll request failed, will retry:', err);
      }

      timeoutId = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll(); // fire immediately, don't wait a full interval for the first check

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [ticketId, enabled, onConfirmed]);
}