import React from 'react';
import {
  Trophy,
  Crosshair,
  Calendar,
  Clock,
  Coins,
  HeartHandshake,
  User,
  ExternalLink,
  Globe,
  MessageCircle,
  Radio,
} from 'lucide-react';
import type { PublicEvent } from '../../services/web3PublicEventsService';

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatEventTime(timeStr: string, tz: string): string {
  const t = timeStr.slice(0, 5);
  const tzShort = tz.includes('/') ? tz.split('/').pop()!.replace(/_/g, ' ') : tz;
  return `${t} ${tzShort}`;
}

function formatEntryFee(value: string | number | null | undefined, token?: string | null): string {
  const n = typeof value === 'number' ? value : Number(value ?? 0);
  if (!Number.isFinite(n)) return token ?? 'TBC';

  const clean =
    n % 1 === 0
      ? n.toLocaleString('en-IE', { maximumFractionDigits: 0 })
      : n.toLocaleString('en-IE', { maximumFractionDigits: 4 });

  return `${clean} ${token ?? ''}`.trim();
}

function platformLabel(platform: string | null): string {
  const map: Record<string, string> = {
    discord: 'Discord',
    zoom: 'Zoom',
    x: 'X Space',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    luma: 'Luma',
    eventbrite: 'Eventbrite',
    meet: 'Google Meet',
  };
  return map[platform ?? ''] ?? 'Join event';
}

function contactLabel(type: string | null): string {
  const map: Record<string, string> = {
    telegram: 'Telegram',
    x: 'X',
    discord: 'Discord',
    whatsapp: 'WhatsApp',
    email: 'Email',
    other: 'Contact',
  };
  return map[type ?? ''] ?? 'Contact';
}

function buildContactHref(type: string | null, handle: string | null): string | null {
  if (!handle) return null;

  switch (type) {
    case 'telegram':
      return handle.startsWith('http')
        ? handle
        : `https://t.me/${handle.replace(/^@/, '')}`;
    case 'x':
      return handle.startsWith('http')
        ? handle
        : `https://x.com/${handle.replace(/^@/, '')}`;
    case 'discord':
      return handle.startsWith('http') ? handle : null;
    case 'whatsapp':
      return handle.startsWith('http')
        ? handle
        : `https://wa.me/${handle.replace(/[^\d]/g, '')}`;
    case 'email':
      return handle.startsWith('mailto:') ? handle : `mailto:${handle}`;
    default:
      return handle.startsWith('http') ? handle : null;
  }
}

type StatusTone = {
  text: string;
  className: string;
  pulse?: boolean;
};

function getStatusTone(event: PublicEvent): StatusTone | null {
  if (event.status === 'live') {
    return {
      text: 'Live now',
      className: 'border-red-400/30 bg-red-400/10 text-red-300',
      pulse: true,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(event.event_date);
  eventDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return {
      text: 'Today',
      className: 'border-[#a3f542]/30 bg-[#a3f542]/10 text-[#a3f542]',
    };
  }
  if (diffDays === 1) {
    return {
      text: 'Tomorrow',
      className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    };
  }
  if (diffDays > 1 && diffDays <= 7) {
    return {
      text: `${diffDays} days`,
      className: 'border-white/10 bg-white/5 text-white/60',
    };
  }

  return null;
}

export type PublicEventCardProps = {
  event: PublicEvent;
};

export const PublicEventCard: React.FC<PublicEventCardProps> = ({ event }) => {
  const isQuiz = event.event_type === 'quiz';
  const accentBorder = isQuiz ? 'border-[#a3f542]/20' : 'border-orange-400/20';
  const accentBg = isQuiz ? 'bg-[#a3f542]/7' : 'bg-orange-400/7';
  const accentText = isQuiz ? 'text-[#a3f542]' : 'text-orange-400';
  const accentMuted = isQuiz ? 'text-[#a3f542]/70' : 'text-orange-400/70';
  const statusTone = getStatusTone(event);

  const contactHref = buildContactHref(event.contact_type ?? null, event.contact_handle ?? null);
  const trimmedDesc = (event.description ?? '').trim();

  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-[#0f1520] shadow-[0_0_0_1px_rgba(255,255,255,0.01)] transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${accentBorder}`}
    >
      <div className={`border-b px-5 py-4 ${accentBorder} ${accentBg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest ${isQuiz ? 'border-[#a3f542]/20 bg-[#a3f542]/10 text-[#a3f542]' : 'border-orange-400/20 bg-orange-400/10 text-orange-400'}`}
            >
              {isQuiz ? <Trophy className="h-3.5 w-3.5" /> : <Crosshair className="h-3.5 w-3.5" />}
              {isQuiz ? 'Quiz' : 'Elimination'}
            </span>

            {event.chain ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-white/50">
                <Globe className="h-3.5 w-3.5" />
                {event.chain}
              </span>
            ) : null}
          </div>

          {statusTone ? (
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-widest ${statusTone.className}`}>
              {statusTone.pulse ? <Radio className="h-3.5 w-3.5 animate-pulse" /> : null}
              {statusTone.text}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-4">
          <h3 className="line-clamp-2 font-mono text-xl font-bold leading-tight text-white">
            {event.title}
          </h3>

          {trimmedDesc ? (
            <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/60">
              {trimmedDesc}
            </p>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-white/35">
              No description provided yet.
            </p>
          )}
        </div>

        <div className="grid gap-3 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
          <div className="flex items-start gap-3">
            <Calendar className={`mt-0.5 h-4 w-4 shrink-0 ${accentText}`} />
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/35">Date</p>
              <p className="text-sm font-medium text-white/75">{formatEventDate(event.event_date)}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className={`mt-0.5 h-4 w-4 shrink-0 ${accentText}`} />
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/35">Starts</p>
              <p className="text-sm font-medium text-white/75">
                {formatEventTime(event.start_time, event.time_zone)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Coins className={`mt-0.5 h-4 w-4 shrink-0 ${accentText}`} />
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-white/35">Entry fee</p>
              <p className="text-sm font-medium text-white/75">
                {formatEntryFee(event.entry_fee, event.fee_token)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
            <div className="flex items-start gap-3">
              <User className={`mt-0.5 h-4 w-4 shrink-0 ${accentText}`} />
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-white/35">Host</p>
                <p className="line-clamp-1 text-sm font-medium text-white/75">
                  {event.host_name || 'Host'}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
            <div className="flex items-start gap-3">
              <HeartHandshake className="mt-0.5 h-4 w-4 shrink-0 text-[#6ef0d4]" />
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-white/35">Cause</p>
                <p className="line-clamp-1 text-sm font-medium text-white/75">
                  {event.charity_name || 'Verified cause'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {(event.platform || event.contact_handle) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {event.platform ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/55">
                <Globe className="h-3.5 w-3.5" />
                {platformLabel(event.platform)}
              </span>
            ) : null}

            {event.contact_handle ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-white/55">
                <MessageCircle className="h-3.5 w-3.5" />
                {contactLabel(event.contact_type ?? null)}: {event.contact_handle}
              </span>
            ) : null}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={event.join_url}
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-sm font-semibold transition ${isQuiz ? 'border-[#a3f542]/40 bg-[#a3f542]/10 text-[#a3f542] hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20' : 'border-orange-400/40 bg-orange-400/10 text-orange-400 hover:border-orange-400/80 hover:bg-orange-400/20'}`}
          >
            Join event <ExternalLink className="h-4 w-4" />
          </a>

          {contactHref ? (
            <a
              href={contactHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-4 py-2.5 font-mono text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
            >
              Contact host <MessageCircle className="h-4 w-4" />
            </a>
          ) : null}
        </div>

        <div className="mt-5 border-t border-[#1e2d42] pt-4">
          <p className={`font-mono text-[11px] uppercase tracking-widest ${accentMuted}`}>
            Fundraising event marketplace
          </p>
        </div>
      </div>
    </article>
  );
};

export default PublicEventCard;