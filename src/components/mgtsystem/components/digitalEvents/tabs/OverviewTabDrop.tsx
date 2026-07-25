// src/components/mgtsystem/components/digitalEvents/tabs/OverviewTabDrop.tsx
//
// Overview tab for Puzzle Drop. Fetches its own detail via
// puzzleDropMgmtService.getDrop (room + items + pricingTiers combined) —
// Drop's real setup data lives across those three pieces, not in
// config_json the way quiz/elimination/ticketed events store theirs, so
// unlike those OverviewTab variants this one can't just read `config`
// off the room prop. Same visual toolkit (Pill, StatCard, SectionHeader,
// DetailRow) as OverviewTabSubscription for consistency.

import { useEffect, useState, type ReactNode } from 'react';
import {
  Puzzle, Calendar, Users, Link2, Hash, Clock, MapPin, Wallet,
  Sparkles, CheckCircle, CircleDollarSign, Tag, Layers,
} from 'lucide-react';
import puzzleDropMgmtService, { type DropDetail } from '../../../services/PuzzleDropMgmtService';
import type { RoomStats } from '../../../services/quizRoomServices';

interface Props {
  roomId: string;
  stats?: RoomStats;
  linkedEventTitle?: string | null;
}

type Tone = 'gray' | 'indigo' | 'green' | 'amber' | 'purple' | 'blue' | 'rose' | 'orange';

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
    scheduled: 'Scheduled', open: 'On sale', completed: 'Completed', cancelled: 'Cancelled',
  };
  return labels[v] || titleCase(value);
}

function getStatusTone(status: string | null | undefined): Tone {
  const v = String(status || '').toLowerCase();
  if (v === 'completed') return 'indigo';
  if (v === 'open')      return 'green';
  if (v === 'scheduled') return 'amber';
  if (v === 'cancelled') return 'rose';
  return 'gray';
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not scheduled';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Not scheduled';
  const date = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return `${date} at ${time}`;
}

function StatCard({ icon, label, value, helper, tone = 'gray' }: {
  icon: ReactNode; label: string; value: ReactNode; helper?: string; tone?: Tone;
}) {
  const toneMap: Record<Tone, string> = {
    gray: 'border-gray-200 bg-white', indigo: 'border-indigo-200 bg-indigo-50',
    green: 'border-green-200 bg-green-50', amber: 'border-amber-200 bg-amber-50',
    purple: 'border-purple-200 bg-purple-50', blue: 'border-blue-200 bg-blue-50',
    rose: 'border-rose-200 bg-rose-50', orange: 'border-orange-200 bg-orange-50',
  };
  const iconMap: Record<Tone, string> = {
    gray: 'text-gray-500', indigo: 'text-[#7c3aed]', green: 'text-green-600',
    amber: 'text-amber-600', purple: 'text-purple-600', blue: 'text-blue-600',
    rose: 'text-rose-600', orange: 'text-orange-600',
  };
  const labelMap: Record<Tone, string> = {
    gray: 'text-gray-600', indigo: 'text-[#7c3aed]', green: 'text-green-700',
    amber: 'text-amber-700', purple: 'text-purple-700', blue: 'text-blue-700',
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

function DetailRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <div className="mt-0.5 flex-shrink-0 text-gray-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-gray-900">{children}</div>
      </div>
    </div>
  );
}

function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    gray: 'bg-gray-100 text-gray-600 ring-[#dce1df]', indigo: 'bg-[rgba(124,58,237,0.08)] text-[#7c3aed] ring-indigo-200',
    green: 'bg-green-50 text-green-700 ring-green-200', amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    purple: 'bg-purple-50 text-gray-600 ring-purple-200', blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    rose: 'bg-rose-50 text-red-600 ring-rose-200', orange: 'bg-orange-50 text-amber-700 ring-orange-200',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', map[tone])}>
      {children}
    </span>
  );
}

export default function OverviewTabDrop({ roomId, stats, linkedEventTitle }: Props) {
  const [detail, setDetail] = useState<DropDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    puzzleDropMgmtService.getDrop(roomId)
      .then(data => { if (!cancelled) setDetail(data); })
      .catch(e => { if (!cancelled) setError(e?.message || 'Failed to load Drop details'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#e8ddfb] border-t-[#7c3aed]" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error || 'Could not load this Drop.'}
        </div>
      </div>
    );
  }

  const sym = detail.config?.currencySymbol || '€';
  const title = detail.config?.dropTitle || 'Puzzle Drop';
  const statusTone = getStatusTone(detail.status);
  const itemCount = detail.items?.length ?? 0;
  const tierCount = detail.pricingTiers?.length ?? 0;
  const priceRange = (() => {
    const prices = (detail.pricingTiers || []).map(t => Number(t.price)).filter(n => Number.isFinite(n));
    if (prices.length === 0) return null;
    const min = Math.min(...prices), max = Math.max(...prices);
    return min === max ? money(sym, min) : `${money(sym, min)} – ${money(sym, max)}`;
  })();
  const statIncome = typeof stats?.totalIncome === 'number' ? money(sym, stats.totalIncome) : '—';

  return (
    <div className="space-y-5 p-5">

      {/* ── Hero banner ── */}
      <div className="overflow-hidden rounded-2xl border border-[rgba(124,58,237,0.25)] bg-[rgba(124,58,237,0.04)]">
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone={statusTone}>{formatStatus(detail.status)}</Pill>
                <Pill tone="indigo"><Puzzle className="mr-1 h-3 w-3" />Puzzle Drop</Pill>
                {linkedEventTitle && <Pill tone="blue">Linked to event</Pill>}
              </div>
              <h2 className="text-lg font-black text-gray-900">{title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                A quick snapshot of the puzzles on offer, pricing tiers and schedule.
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Room ID</p>
              <p className="mt-1 font-mono text-xs font-semibold text-[#1e3040]">{detail.roomId}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<Puzzle className="h-5 w-5" />} label="Puzzles" value={itemCount}
          helper={itemCount === 1 ? '1 puzzle in this Drop' : `${itemCount} puzzles in this Drop`} tone="indigo" />
        <StatCard icon={<Layers className="h-5 w-5" />} label="Pricing tiers" value={tierCount}
          helper={priceRange || 'No tiers configured'} tone="purple" />
        <StatCard icon={<CircleDollarSign className="h-5 w-5" />} label="Income" value={statIncome}
          helper="Confirmed purchases" tone="green" />
        <StatCard icon={<Users className="h-5 w-5" />} label="Buyers" value={stats?.uniquePlayers ?? '—'}
          helper="Unique confirmed buyers" tone="blue" />
      </div>

      {/* ── Schedule + pricing ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader icon={<Calendar className="h-4 w-4" />} title="Schedule"
            subtitle="When this Drop goes on sale." />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Goes on sale">
              {formatDateTime(detail.scheduledAt)}
            </DetailRow>
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Time zone">
              {detail.timeZone || 'Europe/Dublin'}
            </DetailRow>
            {linkedEventTitle && (
              <DetailRow icon={<Link2 className="h-4 w-4" />} label="Linked event">
                <span className="text-[#7c3aed]">{linkedEventTitle}</span>
              </DetailRow>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader icon={<Wallet className="h-4 w-4" />} title="Pricing tiers" />
          {tierCount === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
              No pricing tiers configured
            </div>
          ) : (
            <div className="space-y-2">
              {detail.pricingTiers.map(tier => (
                <div key={tier.id} className="flex items-center justify-between rounded-xl border border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.04)] p-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{tier.label || `${tier.quantity} puzzle${tier.quantity !== 1 ? 's' : ''}`}</p>
                    <p className="text-xs text-gray-500">{tier.quantity} puzzle{tier.quantity !== 1 ? 's' : ''}</p>
                  </div>
                  <span className="text-base font-black text-[#7c3aed]">{money(sym, tier.price)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Puzzle items ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <SectionHeader icon={<Puzzle className="h-4 w-4" />} title="Puzzles in this Drop"
          subtitle={itemCount ? `${itemCount} puzzle${itemCount !== 1 ? 's' : ''} configured.` : 'No puzzles configured yet.'} />
        {itemCount === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
            No puzzles added yet — use the Setup tab to add some.
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {detail.items
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(124,58,237,0.1)] text-xs font-bold text-[#7c3aed]">
                      {item.item_number}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{titleCase(item.puzzle_type)}</span>
                  </div>
                  <Pill tone="gray">{titleCase(item.difficulty)}</Pill>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* ── Internal reference ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <SectionHeader icon={<CheckCircle className="h-4 w-4" />} title="Internal reference" />
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
          <DetailRow icon={<Hash className="h-4 w-4" />} label="Room ID">
            <span className="break-all font-mono text-xs text-gray-600">{detail.roomId}</span>
          </DetailRow>
          <DetailRow icon={<Sparkles className="h-4 w-4" />} label="Currency">
            {sym} ({detail.config?.currency?.toUpperCase() ?? 'club currency'})
          </DetailRow>
          <DetailRow icon={<Tag className="h-4 w-4" />} label="Game type">
            Puzzle Drop
          </DetailRow>
        </div>
      </div>

    </div>
  );
}