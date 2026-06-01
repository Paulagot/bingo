// src/components/campaignSupport/CampaignOrderThankYou.tsx
//
// Shared supporter thank-you / confirmation panel for campaign product orders.
// Used by both:
// - CampaignSupportPage.tsx for manual/instant/cash/crypto confirmation
// - CampaignStripeSuccess.tsx after Stripe redirects back and the webhook confirms

import { ArrowRight, CheckCircle2, Heart, Mail, PartyPopper, Sparkles, Trophy } from 'lucide-react';
import type {
  GeneratedEntry,
  OrderSummary,
} from '../services/CampaignSupportService';

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function fmt(price: number | string, currency = 'EUR') {
  const symbols: Record<string, string> = { EUR: '€', GBP: '£', USD: '$' };
  const code = currency || 'EUR';
  return `${symbols[code] ?? `${code} `}${asNumber(price).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function entryLabel(entryType: string) {
  if (entryType === 'elimination_entry') return 'Join Last Player Standing';
  if (entryType === 'quiz_team_ticket') return 'Join Quiz Night';
  if (entryType === 'quiz_individual_ticket') return 'Join Quiz Night';
  if (entryType === 'puzzle_entry') return 'Open Puzzle Challenge';
  return 'Open';
}

function getOrderField<T = unknown>(order: OrderSummary, camel: string, snake?: string): T | undefined {
  const o = order as any;
  return o?.[camel] ?? (snake ? o?.[snake] : undefined);
}

function displayName(name?: string | null) {
  const trimmed = String(name || '').trim();
  return trimmed || 'you';
}

interface CampaignOrderThankYouProps {
  order: OrderSummary;
  entries?: GeneratedEntry[];
  campaignName?: string | null;
  sellerName?: string | null;
  orderId?: string | null;
  onBackToCampaign?: () => void;
  backLabel?: string;
}

export default function CampaignOrderThankYou({
  order,
  entries = [],
  campaignName,
  sellerName,
  orderId,
  onBackToCampaign,
  backLabel = 'Back to campaign',
}: CampaignOrderThankYouProps) {
  const confirmedEntries = entries.filter(e => e.status === 'confirmed' && e.joinUrl);
  const isClaimed = order.paymentStatus === 'claimed';
  const supporterName = displayName(order.supporterName);
  const campaign = campaignName || getOrderField<string>(order, 'campaignName', 'campaign_name') || 'this campaign';
  const seller = sellerName || getOrderField<string>(order, 'sellerName', 'seller_name') || null;
  const reference = getOrderField<string>(order, 'paymentReference', 'payment_reference');

  return (
    <section className="relative mx-auto w-full max-w-lg overflow-hidden rounded-[2rem] bg-white p-5 text-center shadow-2xl shadow-orange-100 ring-1 ring-orange-100 sm:p-7">
      {/* celebratory background */}
      <div className="pointer-events-none absolute -left-10 top-8 h-28 w-28 rounded-full bg-orange-100 blur-2xl" />
      <div className="pointer-events-none absolute -right-12 top-28 h-32 w-32 rounded-full bg-yellow-100 blur-2xl" />
      <div className="pointer-events-none absolute bottom-20 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-pink-100 blur-2xl" />

      <div className="pointer-events-none absolute left-5 top-5 text-3xl animate-bounce">🎈</div>
      <div className="pointer-events-none absolute right-7 top-8 text-2xl animate-pulse">✨</div>
      <div className="pointer-events-none absolute bottom-6 left-7 text-2xl animate-pulse">🎊</div>

      <div className="relative">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 text-white shadow-xl shadow-orange-200">
          <PartyPopper className="h-10 w-10" />
        </div>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700 ring-1 ring-green-100">
          <CheckCircle2 className="h-4 w-4" />
          {isClaimed ? 'Order received' : 'Payment confirmed'}
        </div>

        <h1 className="mt-5 text-balance text-[clamp(1.8rem,8vw,2.8rem)] font-black leading-[0.95] tracking-tight text-slate-950">
          Thank you, {supporterName}!
        </h1>

        <p className="mx-auto mt-4 max-w-md text-pretty text-base font-bold leading-relaxed text-slate-700 sm:text-lg">
          Thank you for supporting{seller ? ` ${seller}` : ''} and our campaign <span className="text-[var(--fr-primary,#f97316)]">{campaign}</span>.
        </p>

        <p className="mx-auto mt-3 max-w-md text-sm font-semibold text-slate-500">
          {isClaimed
            ? 'The club will verify the payment and activate your game links. You’ll receive an email as soon as they’re ready.'
            : 'You’ve helped the team move closer to their goal. Your confirmation and game links are below.'}
        </p>

        <div className="mt-6 rounded-3xl bg-slate-50 p-4 text-left ring-1 ring-slate-100">
          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
            <Trophy className="h-4 w-4 text-[var(--fr-primary,#f97316)]" />
            Your support
          </div>

          <div className="space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-100">
                <span className="min-w-0 break-words">{item.productName} ×{item.quantity}</span>
                <span className="shrink-0 text-slate-950">{fmt(item.lineTotal, order.currency)}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-between border-t border-slate-200 pt-4 text-lg font-black text-slate-950">
            <span>Total</span>
            <span>{fmt(order.totalAmount, order.currency)}</span>
          </div>
        </div>

        {reference && (
          <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-left ring-1 ring-amber-100">
            <div className="text-xs font-black uppercase tracking-wide text-amber-700">Payment reference</div>
            <div className="mt-1 font-mono text-base font-black tracking-wider text-slate-950">{reference}</div>
          </div>
        )}

        <div className="mt-5 rounded-3xl bg-orange-50 p-4 text-left ring-1 ring-orange-100">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[var(--fr-primary,#f97316)] shadow-sm">
              <Heart className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="font-black text-slate-950">You made a real difference today.</div>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Every purchase helps the organisers track support, confirm payments and send the right game links without spreadsheet chaos.
              </p>
            </div>
          </div>
        </div>

        {confirmedEntries.length > 0 && (
          <div className="mt-5 space-y-3 text-left">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-500">
              <Sparkles className="h-4 w-4 text-[var(--fr-primary,#f97316)]" />
              Your game links
            </h2>
            {confirmedEntries.map(entry => (
              <a
                key={entry.id}
                href={entry.joinUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-[var(--fr-primary,#f97316)] px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:brightness-95"
              >
                <span>{entryLabel(entry.entryType)}</span>
                <ArrowRight className="h-5 w-5" />
              </a>
            ))}
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-slate-100">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
          <p className="text-sm font-semibold text-slate-600">
            We’ll email confirmation to <strong className="text-slate-900">{order.supporterEmail}</strong>.
          </p>
        </div>

        {onBackToCampaign && (
          <button
            type="button"
            onClick={onBackToCampaign}
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
      </div>
    </section>
  );
}