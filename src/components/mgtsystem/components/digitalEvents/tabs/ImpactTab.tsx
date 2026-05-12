// src/components/mgtsystem/components/digitalEvents/tabs/ImpactTab.tsx
//
// Impact summary for a completed quiz room.
// Receives auditView from DigitalEventDrawer (no internal fetch).
//
// Data sources:
//   config prop (config_json): admins, hostName, roundDefinitions,
//                              prizeAwards, finalLeaderboard, currencySymbol
//   auditView prop:            finalTotal (quiz_reconciliation table),
//                              tickets[] (individual rows from quiz_tickets)
//                              totals.tickets (sum of ticket amounts)

import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  Trophy, Users, DollarSign, Heart, Medal, Crown,
  Ticket, ChevronDown, ChevronUp, RefreshCw, AlertCircle,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry { id: string; name: string; score: number; }

interface PrizeAward {
  prizeAwardId: string;
  place: number;
  prizeName: string;
  prizeType: string;
  declaredValue: number;
  currency: string;
  status: string;
  winnerName: string;
  winnerPlayerId: string;
  sponsor?: { name?: string } | string;
}

interface Admin { id: string; name: string; }

// Individual ticket row from auditView.tickets (ticketDetailRows shape)
interface AuditTicketRow {
  ticketId: string;
  playerName: string;
  purchaserName: string;
  paymentMethod: string;
  amount: number;
  redemptionStatus: string;
  confirmedAt: string | null;
  confirmedByName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, tone = 'indigo', helper }: {
  icon: ReactNode; label: string; value: string | number;
  tone?: 'indigo' | 'green' | 'purple' | 'amber' | 'blue' | 'rose';
  helper?: string;
}) {
  const tones = {
    indigo: 'border-indigo-200 bg-indigo-50',
    green:  'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    amber:  'border-amber-200 bg-amber-50',
    blue:   'border-blue-200 bg-blue-50',
    rose:   'border-rose-200 bg-rose-50',
  };
  const iconTones = {
    indigo: 'text-indigo-600', green: 'text-green-600', purple: 'text-purple-600',
    amber: 'text-amber-600',   blue:  'text-blue-600',  rose:   'text-rose-600',
  };
  const labelTones = {
    indigo: 'text-indigo-700', green: 'text-green-700', purple: 'text-purple-700',
    amber: 'text-amber-700',   blue:  'text-blue-700',  rose:   'text-rose-700',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className={`mb-2 ${iconTones[tone]}`}>{icon}</div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${labelTones[tone]}`}>{label}</p>
      <p className="mt-1 text-xl font-black text-gray-950">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-gray-500">{helper}</p>}
    </div>
  );
}

function SectionHead({ icon, title, subtitle }: {
  icon: ReactNode; title: string; subtitle?: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
}

function CollapsibleSection({ icon, title, subtitle, count, children, defaultOpen = false }: {
  icon: ReactNode; title: string; subtitle?: string;
  count?: number; children: ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className="text-gray-500 flex-shrink-0">{icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{title}</span>
              {count !== undefined && (
                <span className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">
                  {count}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />}
      </button>
      {open && <div className="bg-white">{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getMethodLabel(raw: string | null | undefined): string {
  const v = (raw || '').trim().toLowerCase();
  if (v === 'cash') return 'Cash';
  if (v === 'instant_payment') return 'Instant Payment';
  if (v === 'card' || v === 'card_tap') return 'Card';
  if (v === 'web3') return 'Web3';
  if (v === 'crypto') return 'Crypto';
  if (v === 'pay_admin' || v === 'pay_host') return 'Pay Host';
  if (v === 'stripe') return 'Stripe';
  if (!raw) return 'Unknown';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function getSponsorName(sponsor: PrizeAward['sponsor']): string {
  if (!sponsor) return '';
  if (typeof sponsor === 'string') return sponsor;
  return sponsor.name || '';
}

function getPlaceLabel(place: number) {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  room: Room;
  config: any;
  auditView: any;
  auditViewLoading: boolean;
  auditViewError: string | null;
  onRefresh: () => Promise<void>;
}

export default function ImpactTab({
  room, config, auditView, auditViewLoading, auditViewError, onRefresh,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const currency = config?.currencySymbol || '€';
  const hostName = config?.hostName || 'Host';
  const admins: Admin[]             = config?.admins || [];
  const rec                         = config?.reconciliation || {};
  const leaderboard: LeaderboardEntry[] = rec.finalLeaderboard || [];
  const prizeAwards: PrizeAward[]       = rec.prizeAwards || [];

  // ── Ticket data from auditView ─────────────────────────────────────────────
  // auditView.tickets is the flat array of individual ticket rows (AuditTicketRow[])
  // auditView.hasTickets is the boolean flag
  // auditView.totals.tickets is the sum of all ticket amounts
  const ticketRows: AuditTicketRow[] = auditView?.tickets ?? [];
  const hasTickets                   = auditView?.hasTickets ?? false;
  const totalTickets                 = ticketRows.length;
  const redeemedTickets              = ticketRows.filter(t => t.redemptionStatus === 'redeemed').length;
  const ticketTotalValue: number     = auditView?.totals?.tickets ?? 0;
  const redemptionRate               = totalTickets > 0
    ? `${Math.round((redeemedTickets / totalTickets) * 100)}%`
    : null;

  // ── Financial total from auditView (quiz_reconciliation table) ─────────────
  const finalTotal: number = auditView?.reconciliation?.finalTotal ?? 0;

  // ── Config-derived stats ───────────────────────────────────────────────────
  // Host is already in the admins list from config_json, so no +1 needed
  const volunteerCount  = admins.length + 1; // admins + host (host not in admins array)
  const playerCount     = leaderboard.length;
  const roundDefs       = config?.roundDefinitions || [];
  const roundCount      = roundDefs.length;
  const totalQuestions  = roundDefs.reduce(
    (sum: number, rd: any) => sum + (rd.config?.questionsPerRound || 0), 0
  );
  const totalPrizeValue = prizeAwards.reduce(
    (sum, a) => sum + Number(a.declaredValue || 0), 0
  );
  const sponsors = [...new Set(
    prizeAwards
      .map(a => getSponsorName(a.sponsor))
      .filter(Boolean)
  )];

  // On-the-night vs pre-sold split
  const onNightCount = Math.max(0, playerCount - redeemedTickets);

  const fmt = (n: number) => `${currency}${Number(n || 0).toFixed(2)}`;

  const eventDate = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  return (
    <div className="p-5 space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="pc rounded-2xl border border-gray-200 bg-gradient-to-r from-green-50 via-white to-emerald-50 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-gray-950">Community Impact</h2>
            <p className="mt-1 text-sm text-gray-600">
              How this quiz brought your community together.
            </p>
            {eventDate && <p className="mt-1 text-xs text-gray-400">{eventDate}</p>}
          </div>
          <div className="flex items-start gap-2 flex-shrink-0">
            {rec.approvedAt && (
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-gray-200">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Approved
                </p>
                <p className="mt-1 text-xs font-bold text-gray-900">
                  {new Date(rec.approvedAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || auditViewLoading}
              title="Refresh data"
              className="rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600 transition-colors border border-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${(refreshing || auditViewLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state for audit view */}
      {auditViewError && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            Some financial data unavailable: {auditViewError}
          </p>
        </div>
      )}

      {/* ── Key stats grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Heart className="h-5 w-5" />}
          label="Volunteers"
          value={volunteerCount}
          tone="purple"
          helper={`${hostName} + ${admins.length} admin${admins.length !== 1 ? 's' : ''}`}
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Players"
          value={playerCount}
          tone="indigo"
          helper="Community members activated"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Income"
          value={auditViewLoading ? '…' : fmt(finalTotal)}
          tone="green"
          helper="Approved reconciliation total"
        />
        {totalPrizeValue > 0 && (
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            label="Prizes Distributed"
            value={fmt(totalPrizeValue)}
            tone="amber"
            helper={`${prizeAwards.length} prize${prizeAwards.length !== 1 ? 's' : ''} awarded`}
          />
        )}
        {roundCount > 0 && (
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            label="Rounds Played"
            value={roundCount}
            tone="blue"
            helper={totalQuestions > 0 ? `~${totalQuestions} questions` : undefined}
          />
        )}
        {hasTickets && redemptionRate && (
          <StatCard
            icon={<Ticket className="h-5 w-5" />}
            label="Ticket Redemption"
            value={redemptionRate}
            tone="rose"
            helper={`${redeemedTickets} of ${totalTickets} tickets used`}
          />
        )}
      </div>

      {/* Ticket vs on-night split */}
      {hasTickets && totalTickets > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Ticket className="h-5 w-5" />}
            label="Pre-sold Tickets"
            value={totalTickets}
            tone="purple"
            helper={fmt(ticketTotalValue)}
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Paid on the Night"
            value={onNightCount}
            tone="indigo"
            helper="Walk-in players"
          />
        </div>
      )}

      {/* ── Sponsors ────────────────────────────────────────────────────────── */}
      {sponsors.length > 0 && (
        <div className="pc rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <SectionHead
            icon={<Heart className="h-5 w-5 text-amber-600" />}
            title="Sponsors"
            subtitle="Organisations that contributed prizes to this event"
          />
          <div className="flex flex-wrap gap-2">
            {sponsors.map(s => (
              <span
                key={s}
                className="inline-flex items-center rounded-full bg-white border border-amber-200 px-3 py-1.5 text-sm font-semibold text-amber-900"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Final Leaderboard — collapsible ────────────────────────────────── */}
      <CollapsibleSection
        icon={<Trophy className="h-5 w-5 text-indigo-600" />}
        title="Final Leaderboard"
        subtitle="Community members who played"
        count={leaderboard.length}
        defaultOpen={false}
      >
        {leaderboard.length > 0 ? (
          <>
            {leaderboard.map((entry, idx) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-50 last:border-0 ${
                  idx < 3 ? 'bg-gradient-to-r from-indigo-50 to-white' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                    idx === 1 ? 'bg-gray-100 text-gray-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    {idx === 0 ? <Crown className="h-4 w-4" /> : idx + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {entry.name}
                  </span>
                </div>
                <span className="text-sm font-bold text-gray-700">
                  {entry.score} pts
                </span>
              </div>
            ))}
            <div className="px-4 py-2.5 bg-indigo-50 border-t border-indigo-100 text-xs text-indigo-700 font-medium">
              {playerCount} player{playerCount !== 1 ? 's' : ''} participated
            </div>
          </>
        ) : (
          <div className="p-4 text-center text-sm text-gray-500">
            No leaderboard data available.
          </div>
        )}
      </CollapsibleSection>

      {/* ── Prize Awards — collapsible ──────────────────────────────────────── */}
      {prizeAwards.length > 0 && (
        <CollapsibleSection
          icon={<Medal className="h-5 w-5 text-amber-600" />}
          title="Prize Awards"
          subtitle="Prizes declared and distributed during the event"
          count={prizeAwards.length}
          defaultOpen={false}
        >
          {prizeAwards.map((award, idx) => {
            const sponsorName = getSponsorName(award.sponsor);
            return (
              <div
                key={award.prizeAwardId || idx}
                className="px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-800 shrink-0">
                    {award.place || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {getPlaceLabel(award.place)} — {award.prizeName}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        award.status === 'collected'
                          ? 'bg-green-100 text-green-700 border-green-200'
                          : award.status === 'delivered'
                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>
                        {award.status || 'declared'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Winner: <strong>{award.winnerName || '—'}</strong>
                      {sponsorName && ` · Sponsor: ${sponsorName}`}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-amber-700">
                    {award.currency || currency}
                    {Number(award.declaredValue || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">{award.prizeType}</div>
                </div>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      {/* ── Pre-sold Tickets — collapsible ─────────────────────────────────── */}
      {hasTickets && ticketRows.length > 0 && (
        <CollapsibleSection
          icon={<Ticket className="h-5 w-5 text-purple-600" />}
          title="Pre-sold Tickets"
          subtitle="Confirmed before the quiz — redeemed means the player turned up"
          count={totalTickets}
          defaultOpen={false}
        >
          {/* Summary bar */}
          <div className="grid grid-cols-3 border-b border-gray-100 bg-gray-50 px-4 py-3 text-center">
            <div>
              <p className="text-lg font-black text-gray-900">{totalTickets}</p>
              <p className="text-xs text-gray-500">Total sold</p>
            </div>
            <div>
              <p className="text-lg font-black text-green-700">{redeemedTickets}</p>
              <p className="text-xs text-gray-500">Redeemed · {fmt(ticketTotalValue)}</p>
            </div>
            <div>
              <p className="text-lg font-black text-amber-600">
                {totalTickets - redeemedTickets}
              </p>
              <p className="text-xs text-gray-500">No-show</p>
            </div>
          </div>

          {/* Individual rows */}
          {ticketRows.map(t => (
            <div
              key={t.ticketId}
              className="px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-900">
                    {t.playerName}
                  </span>
                  {t.playerName !== t.purchaserName && (
                    <span className="text-xs text-gray-400">
                      bought by {t.purchaserName}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {getMethodLabel(t.paymentMethod)}
                  {t.confirmedByName && ` · confirmed by ${t.confirmedByName}`}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  t.redemptionStatus === 'redeemed'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {t.redemptionStatus === 'redeemed' ? '✓ Redeemed' : '✗ No-show'}
                </span>
                <span className="text-sm font-semibold text-gray-900">
                  {fmt(t.amount)}
                </span>
              </div>
            </div>
          ))}

          <div className="px-4 py-3 flex justify-between bg-purple-50 border-t border-purple-100">
            <span className="text-sm font-semibold text-purple-800">
              Total ticket revenue
            </span>
            <span className="text-sm font-bold text-purple-900">
              {fmt(ticketTotalValue)}
            </span>
          </div>
        </CollapsibleSection>
      )}

      {/* ── Volunteers — collapsible ────────────────────────────────────────── */}
      <CollapsibleSection
        icon={<Heart className="h-5 w-5 text-purple-600" />}
        title="Volunteers"
        subtitle="The team who made this event happen"
        count={volunteerCount}
        defaultOpen={false}
      >
        {/* Host always first */}
        <div className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700 shrink-0">
            {hostName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{hostName}</p>
            <p className="text-xs text-purple-600 font-medium">Host</p>
          </div>
        </div>

        {admins.length > 0
          ? admins.map(admin => (
              <div
                key={admin.id}
                className="px-4 py-3 flex items-center gap-3 border-b border-gray-50 last:border-0 hover:bg-gray-50"
              >
                <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-xs font-bold text-purple-600 shrink-0">
                  {admin.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{admin.name}</p>
                  <p className="text-xs text-gray-500">Admin / Volunteer</p>
                </div>
              </div>
            ))
          : (
              <div className="px-4 py-3 text-xs text-gray-500">
                No additional admins registered.
              </div>
            )}

        <div className="px-4 py-2.5 bg-purple-50 border-t border-purple-100 text-xs text-purple-700 font-medium">
          {volunteerCount} volunteer{volunteerCount !== 1 ? 's' : ''} contributed to this event
        </div>
      </CollapsibleSection>

    </div>
  );
}