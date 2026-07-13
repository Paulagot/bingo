// src/components/mgtsystem/components/digitalEvents/tabs/OverviewTabSubscription.tsx
//
// Rebuilt to match OverviewTab / OverviewTabTicketedEvent's actual shared
// visual language (Pill, StatCard, SectionHeader, DetailRow, the Tone
// system, hero banner, two-column details, Internal reference footer) —
// the previous version used ad-hoc inline styles instead of this toolkit,
// which is why it read thinner/less consistent than the other activity
// types. Data comes from `challenge` (fetched via getChallengeByRoomId),
// not `config` — subscriptions don't store their real state in the
// room's config_json the way quiz/elimination/ticketed events do.

import { useEffect, useState, type ReactNode } from 'react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import { challengeService, type Challenge } from '../../../../puzzles/services/ChallengeService';
import {
  Puzzle, Calendar, Users, Repeat, UserPlus, Hash, Link2,
  Clock, Wallet, Sparkles, CheckCircle, CircleDollarSign, Heart, Tag,
} from 'lucide-react';

interface Props {
  room: Room;
  challenge: Challenge | null;
  challengeLoading: boolean;
  challengeError: string | null;
  linkedEventTitle?: string | null;
}

type Tone = 'gray' | 'indigo' | 'green' | 'amber' | 'purple' | 'blue' | 'rose' | 'orange';

const CURRENCY_SYMBOLS: Record<string, string> = { eur: '€', gbp: '£', usd: '$' };

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function money(sym: string, value: number | string | null | undefined, decimals = 2) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return `${sym}0.00`;
  return `${sym}${n.toFixed(decimals)}`;
}

function titleCase(value: string | null | undefined) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatStatus(value: string | null | undefined) {
  const v = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    draft: 'Draft', active: 'Active', completed: 'Completed', cancelled: 'Cancelled',
  };
  return labels[v] || titleCase(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not set';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function getStatusTone(status: string | null | undefined): Tone {
  const v = String(status || '').toLowerCase();
  if (v === 'completed') return 'indigo';
  if (v === 'active')    return 'green';
  if (v === 'draft')     return 'gray';
  if (v === 'cancelled') return 'rose';
  return 'gray';
}

function StatCard({ icon, label, value, helper, tone = 'gray' }: {
  icon: ReactNode; label: string; value: ReactNode; helper?: string; tone?: Tone;
}) {
  const toneMap: Record<Tone, string> = {
    gray:   'border-gray-200 bg-white',
    indigo: 'border-indigo-200 bg-indigo-50',
    green:  'border-green-200 bg-green-50',
    amber:  'border-amber-200 bg-amber-50',
    purple: 'border-purple-200 bg-purple-50',
    blue:   'border-blue-200 bg-blue-50',
    rose:   'border-rose-200 bg-rose-50',
    orange: 'border-orange-200 bg-orange-50',
  };
  const iconMap: Record<Tone, string> = {
    gray: 'text-gray-500', indigo: 'text-[#157f85]', green: 'text-green-600',
    amber: 'text-amber-600', purple: 'text-purple-600', blue: 'text-[#157f85]',
    rose: 'text-rose-600', orange: 'text-orange-600',
  };
  const labelMap: Record<Tone, string> = {
    gray: 'text-gray-600', indigo: 'text-[#157f85]', green: 'text-green-700',
    amber: 'text-amber-700', purple: 'text-purple-700', blue: 'text-[#157f85]',
    rose: 'text-rose-700', orange: 'text-orange-700',
  };
  return (
    <div className={cn('rounded-xl border p-4', toneMap[tone])}>
      <div className={cn('mb-2', iconMap[tone])}>{icon}</div>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', labelMap[tone])}>{label}</p>
      <div className="mt-1 text-xl font-black text-gray-900">{value}</div>
      {helper && <p className="mt-1 text-[11px] text-gray-600">{helper}</p>}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0 text-gray-600">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children, muted = false }: {
  icon: ReactNode; label: string; children: ReactNode; muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <div className={cn('mt-0.5 flex-shrink-0', muted ? 'text-[#b8c6b0]' : 'text-gray-400')}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className={cn('mt-0.5 text-sm font-semibold', muted ? 'text-gray-600' : 'text-gray-900')}>{children}</div>
      </div>
    </div>
  );
}

function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    gray:   'bg-gray-100 text-gray-600 ring-[#dce1df]',
    indigo: 'bg-[rgba(21,127,133,0.08)] text-[#157f85] ring-indigo-200',
    green:  'bg-green-50 text-[#157f85] ring-green-200',
    amber:  'bg-amber-50 text-amber-700 ring-amber-200',
    purple: 'bg-purple-50 text-gray-600 ring-purple-200',
    blue:   'bg-blue-50 text-[#157f85] ring-blue-200',
    rose:   'bg-rose-50 text-red-600 ring-rose-200',
    orange: 'bg-orange-50 text-amber-700 ring-orange-200',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', map[tone])}>
      {children}
    </span>
  );
}

export default function OverviewTabSubscription({ challenge, challengeLoading, challengeError, linkedEventTitle }: Props) {
  const [lastSubscribedAt, setLastSubscribedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!challenge?.id) return;
    let cancelled = false;
    challengeService.getPlayers(challenge.id)
      .then(players => {
        if (cancelled || !players?.length) return;
        const sorted = [...players].sort(
          (a, b) => new Date(a.enrolled_at).getTime() - new Date(b.enrolled_at).getTime()
        );
        const latest = sorted[sorted.length - 1];
        if (latest) setLastSubscribedAt(latest.enrolled_at);
      })
      .catch(() => { /* non-critical — leave as '—' */ });
    return () => { cancelled = true; };
  }, [challenge?.id]);

  if (challengeLoading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
      </div>
    );
  }

  if (challengeError || !challenge) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {challengeError || 'No linked challenge found for this room. It may have failed to link — see ScheduleSubscriptionModal.'}
        </div>
      </div>
    );
  }

  const sym          = CURRENCY_SYMBOLS[challenge.currency] ?? '€';
  const isFree        = Number(challenge.is_free) === 1;
  const statusTone    = getStatusTone(challenge.status);
  const sponsors      = Array.isArray(challenge.sponsors) ? challenge.sponsors : [];

  const startDate = new Date(challenge.starts_at);
  // Last week's unlock date — starts_at + (total_weeks - 1) weeks, matching
  // exactly how each week's own unlocksAt is computed in challengeService.js
  // (unlocksAt = startsAtMs + (entry.week - 1) * weekMs). Using total_weeks
  // instead of total_weeks - 1 here would land one week past the actual
  // last puzzle — the moment a non-existent "week total_weeks + 1" would
  // have unlocked.
  const endDate = new Date(startDate.getTime() + (challenge.total_weeks - 1) * 7 * 24 * 60 * 60 * 1000);
  const now       = Date.now();
  const elapsedWeeks = Math.max(0, Math.min(
    challenge.total_weeks,
    Math.floor((now - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1
  ));

  return (
    <div className="space-y-5 p-5">

      {/* ── Hero banner ── */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.04)]">
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone={statusTone}>{formatStatus(challenge.status)}</Pill>
                <Pill tone="purple">
                  <Puzzle className="mr-1 h-3 w-3" />
                  Puzzle Subscription
                </Pill>
                {linkedEventTitle && <Pill tone="blue">Linked to event</Pill>}
              </div>
              <h2 className="text-lg font-black text-gray-900">{challenge.title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {challenge.description || 'A quick snapshot of the subscription setup, sign-up window, pricing and sponsors.'}
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Room ID</p>
              <p className="mt-1 font-mono text-xs font-semibold text-[#1e3040]">{challenge.room_id ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<Calendar className="h-5 w-5" />}
          label="Week"
          value={challenge.status === 'draft' ? 'Not started' : `${elapsedWeeks} / ${challenge.total_weeks}`}
          helper={`${challenge.total_weeks} week run`}
          tone="indigo"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Subscribers"
          value={challenge.player_count ?? 0}
          helper="Confirmed sign-ups"
          tone="blue"
        />
        <StatCard
          icon={<Repeat className="h-5 w-5" />}
          label="Price"
          value={isFree ? 'Free' : challenge.weekly_price ? money(sym, challenge.weekly_price / 100) : '—'}
          helper={isFree ? 'No payment required' : 'Billed weekly via Stripe'}
          tone="green"
        />
        <StatCard
          icon={<UserPlus className="h-5 w-5" />}
          label="Last subscription"
          value={lastSubscribedAt
            ? new Date(lastSubscribedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            : '—'}
          helper="Most recent sign-up"
          tone="purple"
        />
      </div>

      {/* ── Sign-up details + pricing ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Calendar className="h-4 w-4" />}
            title="Sign-up window"
            subtitle="The core dates supporters need before joining."
          />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Starts">
              {formatDate(challenge.starts_at)}
            </DetailRow>
            <DetailRow icon={<Clock className="h-4 w-4" />} label="New sign-ups close">
              {formatDate(endDate.toISOString())}
            </DetailRow>
            {linkedEventTitle && (
              <DetailRow icon={<Link2 className="h-4 w-4" />} label="Linked event">
                <span className="text-[#157f85]">{linkedEventTitle}</span>
              </DetailRow>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Anyone already subscribed keeps paying for their full {challenge.total_weeks}-week run,
            even past the sign-up close date above.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Wallet className="h-4 w-4" />}
            title="Pricing and payments"
          />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow icon={<CircleDollarSign className="h-4 w-4" />} label={isFree ? 'Access' : 'Weekly price'}>
              {isFree ? 'Free — no payment required' : challenge.weekly_price ? `${money(sym, challenge.weekly_price / 100)} / week` : '—'}
            </DetailRow>
            <DetailRow icon={<Sparkles className="h-4 w-4" />} label="Currency">
              {sym} ({challenge.currency?.toUpperCase() ?? 'club currency'})
            </DetailRow>
            {!isFree && (
              <DetailRow icon={<Wallet className="h-4 w-4" />} label="Payment method" muted>
                Stripe only — no cash / on-the-night option
              </DetailRow>
            )}
          </div>
        </div>
      </div>

      {/* ── Sponsors ── */}
      {sponsors.length > 0 && (
        <div className="rounded-2xl border border-[rgba(210,181,130,0.4)] bg-[rgba(210,181,130,0.06)] p-4">
          <SectionHeader
            icon={<Heart className="h-4 w-4" />}
            title="Sponsors"
            subtitle={`${sponsors.length} organisation${sponsors.length === 1 ? '' : 's'} supporting this challenge.`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {sponsors.map((sponsor, index) => (
              <div key={index} className="rounded-xl border p-3"
                style={{ borderColor: 'rgba(210,181,130,0.5)', background: '#fff' }}>
                <div className="flex items-start gap-2">
                  <Heart className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{sponsor.name}</p>
                    {sponsor.role && <p className="mt-0.5 text-xs text-gray-500">{sponsor.role}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Internal reference ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <SectionHeader
          icon={<CheckCircle className="h-4 w-4" />}
          title="Internal reference"
          subtitle="Useful details for support, reconciliation and troubleshooting."
        />
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
          <DetailRow icon={<Hash className="h-4 w-4" />} label="Room ID">
            <span className="break-all font-mono text-xs text-gray-600">{challenge.room_id ?? '—'}</span>
          </DetailRow>
          <DetailRow icon={<Hash className="h-4 w-4" />} label="Challenge ID">
            <span className="break-all font-mono text-xs text-gray-600">{challenge.id}</span>
          </DetailRow>
          <DetailRow icon={<Tag className="h-4 w-4" />} label="Game type">
            Puzzle Subscription
          </DetailRow>
        </div>
      </div>

    </div>
  );
}