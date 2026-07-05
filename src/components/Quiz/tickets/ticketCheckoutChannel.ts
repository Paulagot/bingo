// src/components/Quiz/tickets/ticketCheckoutChannel.ts
//
// A same-origin BroadcastChannel used ONLY to speed up / unstick the
// embedded new-tab checkout flow. Both the original iframe
// (TicketPurchaseFlow, while in the 'awaiting-stripe-payment' step)
// and the success/cancel tabs Stripe redirects to are on the same
// origin (your app's domain) even when the iframe is embedded on a
// third-party club site — so BroadcastChannel works here even though
// window.opener does not (we deliberately null it after opening the
// tab, for security — see TicketPurchaseFlow.tsx's startStripeCheckout).
//
// TRUST MODEL — read this before adding new message types:
//   - 'confirmed' GRANTS something (a ticket). Never act on it alone —
//     it exists purely as a fast-path nudge; useTicketStatusPoll
//     polling the backend's own ledger remains the actual source of
//     truth regardless of whether this message ever arrives.
//   - 'cancelled' GRANTS nothing — worst case if it's lost, spoofed,
//     or never arrives, the buyer just has to click "try again."
//     Safe to act on directly with no backend check.
//
// Also degrades safely: BroadcastChannel is unsupported in very old
// browsers. Every caller below checks for its existence first: when
// absent, cancellation simply falls back to the existing 5-minute
// poll timeout instead of erroring.

export function getTicketCheckoutChannelName(ticketId: string): string {
  return `fundraisely-ticket-checkout:${ticketId}`;
}

export type TicketCheckoutChannelMessage =
  | { type: 'confirmed' }
  | { type: 'cancelled' };

export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined';
}