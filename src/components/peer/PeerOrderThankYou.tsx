// src/components/peer/PeerOrderThankYou.tsx
//
// Shared supporter-facing confirmation panel for peer fundraiser orders.
// Used by PeerSupportPage.tsx (manual/instant/cash claim) and
// PeerStripeSuccess.tsx (after Stripe redirects back and the webhook
// confirms). Mirrors CampaignOrderThankYou.tsx, which peer had no
// equivalent of at all — the old version was a single emoji + one line,
// with no order detail and no join links ever shown to the supporter.

import { ArrowRight, CheckCircle2, Mail, PartyPopper, Sparkles } from 'lucide-react';
import type { PeerGeneratedEntry, PeerOrderSummary } from '../../services/PeerSupportService';

function fmt(amount: number, currency = 'EUR') {
  const symbols: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  return `${symbols[currency] ?? `${currency} `}${Number(amount).toFixed(2)}`;
}

function entryLabel(entryType: string) {
  if (entryType === 'elimination_entry') return 'Join Last Player Standing';
  if (entryType === 'quiz_team_ticket') return 'Join Quiz Night';
  if (entryType === 'quiz_individual_ticket') return 'Join Quiz Night';
  if (entryType === 'puzzle_entry') return 'Open Puzzle Challenge';
  if (entryType === 'event_ticket') return 'View Event Ticket';
  return 'Open';
}

function displayName(name?: string | null) {
  const trimmed = String(name || '').trim();
  return trimmed || 'you';
}

interface Props {
  order: PeerOrderSummary;
  entries?: PeerGeneratedEntry[];
  fundraiserName?: string | null;
  orderId?: string | null;
  onBack?: () => void;
  backLabel?: string;
}

export default function PeerOrderThankYou({
  order,
  entries = [],
  fundraiserName,
  orderId,
  onBack,
  backLabel = 'Close',
}: Props) {
  const confirmedEntries = entries.filter(e => e.status === 'confirmed' && e.join_url);
  const isPending = ['pending', 'claimed'].includes(order.paymentStatus);
  const supporterName = displayName(order.supporterName);
  const fundraiser = fundraiserName || 'this fundraiser';
  const participant = order.participantName;

  return (
    <section className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl ring-1 ring-slate-100 sm:p-8">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 text-white shadow-lg">
        <PartyPopper className="h-8 w-8" />
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 ring-1 ring-green-100">
        <CheckCircle2 className="h-4 w-4" />
        {isPending ? 'Order received' : 'Payment confirmed'}
      </div>

      <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
        Thank you, {supporterName}!
      </h1>

      <p className="mx-auto mt-3 max-w-md text-sm font-semibold text-slate-600">
        Thank you for supporting{participant ? ` ${participant} and` : ''} {fundraiser}.
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm font-semibold text-slate-500">
        {isPending
          ? 'The club will confirm your payment and activate your entries. You\u2019ll get an email as soon as they\u2019re ready.'
          : 'Your entries are confirmed — join links are below.'}
      </p>

      <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-100">
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Your order</p>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
              <span className="min-w-0 break-words">{item.packName} ×{item.quantity}</span>
              <span className="shrink-0 text-slate-950">{fmt(item.lineTotal, order.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-lg font-black text-slate-950">
          <span>Total</span>
          <span>{fmt(order.totalAmount, order.currency)}</span>
        </div>
      </div>

      {order.paymentReference && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-left ring-1 ring-amber-100">
          <div className="text-xs font-black uppercase tracking-wide text-amber-700">Payment reference</div>
          <div className="mt-1 font-mono text-base font-black tracking-wider text-slate-950">
            {order.paymentReference}
          </div>
        </div>
      )}

      {confirmedEntries.length > 0 && (
        <div className="mt-5 space-y-3 text-left">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
            <Sparkles className="h-4 w-4 text-orange-500" /> Your links
          </h2>
          {confirmedEntries.map(entry => (
            <a
              key={entry.id}
              href={entry.join_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between gap-3 rounded-2xl bg-orange-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:brightness-95"
            >
              <span>{entryLabel(entry.entry_type)}</span>
              <ArrowRight className="h-5 w-5" />
            </a>
          ))}
        </div>
      )}

      <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-100">
        <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <p className="text-sm font-semibold text-slate-600">
          We'll email confirmation to <strong className="text-slate-900">{order.supporterEmail}</strong>.
        </p>
      </div>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-5 w-full rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          {backLabel}
        </button>
      )}

      {orderId && (
        <p className="mt-4 text-center text-xs font-bold text-slate-400">
          Order reference: <code>{orderId}</code>
        </p>
      )}
    </section>
  );
}