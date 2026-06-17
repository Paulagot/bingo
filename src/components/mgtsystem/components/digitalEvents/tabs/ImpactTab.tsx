// src/components/mgtsystem/components/digitalEvents/tabs/ImpactTab.tsx
// UPDATED:
//   - Added isTicketedEvent detection (was falling through to quiz branch)
//   - New "Ticketed Event" pill with its own icon/colour
//   - "Players" relabelled "Attendees" for ticketed events
//   - Volunteers section now reads config.admins (now populated by the
//     check-in dashboard — see CheckinDashboard.PATCH.tsx) for ticketed events,
//     same pattern as quiz/elimination

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Trophy, Users, DollarSign, Heart, Medal, Crown,
  Ticket, ChevronDown, ChevronUp, RefreshCw, AlertCircle, Zap,
  ThumbsUp, Repeat2, MessageSquare, Printer,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import { useCurrency } from '../../../hooks/useCurrency';
import { feedbackService, type FeedbackSummary } from '../../../../feedback/FeedbackService';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface LeaderboardEntry { id: string; name: string; score: number; }

interface EliminationStanding {
  name: string; rank: number; playerId: string;
  roundScores: Record<string, number>;
  cumulativeScore: number; eliminatedInRound: number | null;
}
interface EliminationLeaderboard {
  type: 'elimination';
  winner: { name: string; playerId: string };
  timeline: Array<{
    round: number | null;
    eliminated?: Array<{ name: string; playerId: string }>;
    survived?: Array<{ name: string; playerId: string }>;
  }>;
  totalAdmins: number; totalRounds: number; totalPlayers: number;
  finalStandings: EliminationStanding[];
}

interface PrizeAward {
  prizeAwardId: string; place: number; prizeName: string; prizeType: string;
  declaredValue: number; currency: string; status: string;
  winnerName: string; winnerPlayerId: string;
  sponsor?: { name?: string } | string;
}
interface Admin { id: string; name: string; }
interface AuditTicketRow {
  ticketId: string; playerName: string; purchaserName: string;
  paymentMethod: string; amount: number; redemptionStatus: string;
  confirmedAt: string | null; confirmedByName: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, tone = 'indigo', helper }: {
  icon: ReactNode; label: string; value: string | number;
  tone?: 'indigo' | 'green' | 'purple' | 'amber' | 'blue' | 'rose' | 'teal';
  helper?: string;
}) {
  const tones = {
    indigo: 'border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.08)]',
    green:  'border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)]',
    purple: 'border-[rgba(184,198,176,0.5)] bg-[rgba(184,198,176,0.1)]',
    amber:  'border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)]',
    blue:   'border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)]',
    rose:   'border-rose-200 bg-rose-50',
    teal:   'border-[rgba(21,127,133,0.4)] bg-[rgba(21,127,133,0.1)]',
  };
  const iconTones = {
    indigo: 'text-[#157f85]', green: 'text-[#157f85]', purple: 'text-[#52636f]',
    amber: 'text-[#8a6d2f]',  blue:  'text-[#157f85]',  rose:   'text-rose-600',
    teal:  'text-[#157f85]',
  };
  const labelTones = {
    indigo: 'text-[#157f85]', green: 'text-[#157f85]', purple: 'text-[#52636f]',
    amber: 'text-[#8a6d2f]',  blue:  'text-[#157f85]',  rose:   'text-[#c8423b]',
    teal:  'text-[#157f85]',
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className={`mb-2 ${iconTones[tone]}`}>{icon}</div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${labelTones[tone]}`}>{label}</p>
      <p className="mt-1 text-xl font-black text-[#102532]">{value}</p>
      {helper && <p className="mt-1 text-[11px] text-[#52636f]">{helper}</p>}
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
        <h3 className="text-sm font-bold text-[#102532]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-[#52636f]">{subtitle}</p>}
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
    <div className="rounded-2xl border border-[#dce1df] overflow-hidden">
      <button
        className="impact-collapsible-toggle w-full flex items-center justify-between gap-3 px-4 py-3.5 bg-[#fbf8f2] hover:bg-[#f1f0ee] transition-colors text-left"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <div className="text-[#52636f] flex-shrink-0">{icon}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#102532]">{title}</span>
              {count !== undefined && (
                <span className="inline-flex items-center rounded-full bg-[#dce1df] px-2 py-0.5 text-xs font-medium text-[#52636f]">
                  {count}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-[#52636f] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-[#8a9bab] shrink-0" />
          : <ChevronDown className="h-4 w-4 text-[#8a9bab] shrink-0" />}
      </button>
      <div className={`impact-collapsible-content bg-white ${open ? '' : 'hidden'}`}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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
// FEEDBACK STATS CARD
// ─────────────────────────────────────────────────────────────────────────────

function FeedbackStatCard({
  icon, label, yesCount, totalAnswered, tone = 'teal',
}: {
  icon: ReactNode;
  label: string;
  yesCount: number;
  totalAnswered: number;
  tone?: 'teal' | 'amber';
}) {
  const styles = {
    teal:  { border: 'border-[rgba(21,127,133,0.3)]',  bg: 'bg-[rgba(21,127,133,0.08)]',  icon: 'text-[#157f85]', label: 'text-[#157f85]' },
    amber: { border: 'border-[rgba(210,181,130,0.5)]', bg: 'bg-[rgba(210,181,130,0.1)]', icon: 'text-[#8a6d2f]', label: 'text-[#8a6d2f]' },
  };
  const s = styles[tone];
  const pct = totalAnswered > 0 ? Math.round((yesCount / totalAnswered) * 100) : 0;
  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4`}>
      <div className={`mb-2 ${s.icon}`}>{icon}</div>
      <p className={`text-xs font-semibold uppercase tracking-wide ${s.label}`}>{label}</p>
      <p className="mt-1 text-xl font-black text-[#102532]">{pct}%</p>
      <p className="mt-1 text-[11px] text-[#52636f]">
        {yesCount} of {totalAnswered} who gave feedback said yes
      </p>
    </div>
  );
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

  // ── Feedback summary ───────────────────────────────────────────────────────
  const [feedback, setFeedback]               = useState<FeedbackSummary | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  useEffect(() => {
    if (!room?.room_id) return;
    setFeedbackLoading(true);
    feedbackService
      .getRoomFeedbackSummary(room.room_id)
      .then(data => setFeedback(data.ok ? data : null))
      .catch(() => setFeedback(null))
      .finally(() => setFeedbackLoading(false));
  }, [room?.room_id]);

  const { sym, fmt } = useCurrency(config);
  const hostName = config?.hostName || 'Host';

  // ── Detect game type ───────────────────────────────────────────────────────
  // FIXED: previously only checked for 'elimination' and fell through to
  // 'quiz' for everything else — including ticketed_event rooms, which is
  // why the pill incorrectly said "Quiz". Now explicitly detects all three.
  const auditLeaderboard = auditView?.reconciliation?.finalLeaderboard;
  const roomGameType = (room as any).game_type ?? (room as any).room_type ?? null;

  const isTicketedEvent = roomGameType === 'ticketed_event';
  const isElimination = !isTicketedEvent && (
    auditLeaderboard?.type === 'elimination' || roomGameType === 'elimination'
  );
  const isQuiz = !isTicketedEvent && !isElimination;

  const gameTypeLabel = isTicketedEvent ? 'Ticketed Event' : isElimination ? 'Elimination' : 'Quiz';
  const gameTagline   = isTicketedEvent
    ? 'How this ticketed event brought your community together.'
    : isElimination
      ? 'How this elimination brought your community together.'
      : 'How this quiz brought your community together.';

  // Label for "players" stat — ticketed events have attendees, not players
  const personLabel = isTicketedEvent ? 'Attendees' : 'Players';

  // ── Leaderboard data — not applicable to ticketed events ──────────────────
  const eliminationData: EliminationLeaderboard | null =
    isElimination && auditLeaderboard?.type === 'elimination' ? auditLeaderboard : null;
  const quizLeaderboard: LeaderboardEntry[] =
    isQuiz ? (config?.reconciliation?.finalLeaderboard || []) : [];

  // ── Attendee / player count ─────────────────────────────────────────────────
  // Ticketed events: count confirmed tickets (from auditView), not a leaderboard.
  const ticketRowsForCount: AuditTicketRow[] = auditView?.tickets ?? [];
  const playerCount = isTicketedEvent
    ? ticketRowsForCount.length
    : isElimination
      ? (eliminationData?.totalPlayers ?? 0)
      : quizLeaderboard.length;

  // ── Prize awards ───────────────────────────────────────────────────────────
  const rec         = config?.reconciliation || {};
  const prizeAwards: PrizeAward[] = rec.prizeAwards || [];

  // ── Volunteers ─────────────────────────────────────────────────────────────
  // Ticketed events now persist admins to config.admins via the check-in
  // dashboard (same shape as quiz/elimination: { id, name }), populated when
  // door staff confirm payments or are added via the Staff tab.
  const admins: Admin[] = !isElimination ? (config?.admins || []) : [];
  const eliminationAdminCount = eliminationData?.totalAdmins ?? 0;
  const volunteerCount = isElimination
    ? eliminationAdminCount + 1
    : admins.length + 1;

  // ── Rounds / questions — not applicable to ticketed events ─────────────────
  const roundCount = isTicketedEvent
    ? 0
    : isElimination
      ? (eliminationData?.totalRounds ?? 0)
      : (config?.roundDefinitions || []).length;
  const totalQuestions = isQuiz
    ? (config?.roundDefinitions || []).reduce(
        (sum: number, rd: any) => sum + (rd.config?.questionsPerRound || 0), 0
      )
    : 0;

  // ── Ticket data ─────────────────────────────────────────────────────────────
  const ticketRows: AuditTicketRow[] = auditView?.tickets ?? [];
  const hasTickets                   = auditView?.hasTickets ?? false;
  const totalTickets                 = ticketRows.length;
  const redeemedTickets              = ticketRows.filter(t => t.redemptionStatus === 'redeemed').length;

  const redemptionRate               = totalTickets > 0
    ? `${Math.round((redeemedTickets / totalTickets) * 100)}%`
    : null;

  // ── Financial total ─────────────────────────────────────────────────────────
  const finalTotal: number = auditView?.reconciliation?.finalTotal ?? 0;

  // ── Other derived stats ─────────────────────────────────────────────────────
  const totalPrizeValue = prizeAwards.reduce(
    (sum, a) => sum + Number(a.declaredValue || 0), 0
  );
  const sponsors = [...new Set(
    prizeAwards.map(a => getSponsorName(a.sponsor)).filter(Boolean)
  )];


  const eventDate = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null;

  const approvedAt = auditView?.reconciliation?.approvedAt ?? rec.approvedAt;

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  };

  // ── Print / download ──────────────────────────────────────────────────────
  const handlePrint = () => {
    const el = document.getElementById('impact-tab-print-area');
    if (!el) return;

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(n => n.outerHTML).join('\n');

    const eventLabel = eventDate ?? room.room_id.slice(0, 12);

    const html = `<!doctype html><html><head>
      <meta charset="utf-8"/>
      <title>Community Impact — ${eventLabel}</title>
      ${styles}
      <style>
        body { margin: 0; padding: 0; background: #fff;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #pr  { max-width: 900px; margin: 0 auto; padding: 24px; }
        .impact-collapsible-content { display: block !important; }
        .impact-collapsible-toggle,
        .impact-no-print { display: none !important; }
        .fixed, .absolute, .sticky { position: static !important; }
        .overflow-y-auto, .overflow-auto, .overflow-hidden { overflow: visible !important; }
        @media print { @page { size: A4; margin: 14mm; } }
      </style>
    </head><body><div id="pr">${el.innerHTML}</div></body></html>`;

    const w = window.open('', '_blank', 'width=1100,height=850');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    const run = () => { w.focus(); setTimeout(() => w.print(), 500); };
    w.onload = run;
    setTimeout(() => { if (!w.closed) run(); }, 1000);
  };

  const hasFeedback = !feedbackLoading && feedback && feedback.total > 0;


  return (
    <div className="p-5 space-y-4">

      {/* ── Print button ───────────────────────────────────────────────────── */}
      <div className="flex justify-end impact-no-print">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-[#157f85] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0e6268] transition-colors"
        >
          <Printer className="h-4 w-4" /> Print / Save PDF
        </button>
      </div>

      <div id="impact-tab-print-area" className="space-y-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="pc rounded-2xl border border-[#dce1df] bg-gradient-to-r from-green-50 via-white to-emerald-50 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-black text-[#102532]">Community Impact</h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isTicketedEvent
                  ? 'bg-[rgba(3,105,161,0.1)] text-[#0369a1] border border-[rgba(3,105,161,0.3)]'
                  : isElimination
                    ? 'bg-[rgba(233,87,79,0.1)] text-[#c8423b] border border-[rgba(233,87,79,0.3)]'
                    : 'bg-[rgba(21,127,133,0.12)] text-[#157f85] border border-[rgba(21,127,133,0.3)]'
              }`}>
                {isTicketedEvent ? <Ticket className="h-3 w-3" /> : isElimination ? <Zap className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
                {gameTypeLabel}
              </span>
            </div>
            <p className="text-sm text-[#52636f]">{gameTagline}</p>
            {eventDate && <p className="mt-1 text-xs text-[#8a9bab]">{eventDate}</p>}
          </div>
          <div className="flex items-start gap-2 flex-shrink-0">
            {approvedAt && (
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-[#dce1df]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Approved</p>
                <p className="mt-1 text-xs font-bold text-[#102532]">
                  {new Date(approvedAt).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || auditViewLoading}
              title="Refresh data"
              className="rounded-lg p-2 text-[#8a9bab] hover:bg-white hover:text-[#52636f] transition-colors border border-[#dce1df]"
            >
              <RefreshCw className={`h-4 w-4 ${(refreshing || auditViewLoading) ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {auditViewError && (
        <div className="flex gap-3 rounded-xl border border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] p-3">
          <AlertCircle className="h-4 w-4 text-[#8a6d2f] mt-0.5 shrink-0" />
          <p className="text-xs text-[#8a6d2f]">
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
          helper={isElimination
            ? `${hostName} + ${eliminationAdminCount} admin${eliminationAdminCount !== 1 ? 's' : ''}`
            : `${hostName} + ${admins.length} admin${admins.length !== 1 ? 's' : ''}`
          }
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label={personLabel}
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
            icon={isElimination ? <Zap className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
            label={isElimination ? 'Rounds Played' : 'Rounds'}
            value={roundCount}
            tone="blue"
            helper={isQuiz && totalQuestions > 0 ? `~${totalQuestions} questions` : undefined}
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

        {/* ── Feedback stats — only shown when responses exist ── */}
        {feedbackLoading && (
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#dce1df] bg-[#fbf8f2] p-4 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin text-[#8a9bab]" />
            <span className="text-xs text-[#52636f]">Loading feedback…</span>
          </div>
        )}
        {hasFeedback && (
          <>
            <div className="rounded-xl border border-[rgba(184,198,176,0.5)] bg-[rgba(184,198,176,0.1)] p-4">
              <div className="mb-2 text-[#52636f]"><MessageSquare className="h-5 w-5" /></div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">{personLabel} Feedback</p>
              <p className="mt-1 text-xl font-black text-[#102532]">
                {feedback!.total} <span className="text-sm font-semibold text-[#52636f]">of {playerCount}</span>
              </p>
              <p className="mt-1 text-[11px] text-[#52636f]">{personLabel.toLowerCase()} left feedback</p>
            </div>
            <FeedbackStatCard
              icon={<ThumbsUp className="h-5 w-5" />}
              label="Enjoyed the event"
              yesCount={feedback!.enjoyed_yes}
              totalAnswered={feedback!.total}
            />
            <FeedbackStatCard
              icon={<Repeat2 className="h-5 w-5" />}
              label="Would attend again"
              yesCount={feedback!.play_again_yes}
              totalAnswered={feedback!.total}
              tone="amber"
            />
          </>
        )}
      </div>

      {/* ── Sponsors ────────────────────────────────────────────────────────── */}
      {sponsors.length > 0 && (
        <div className="pc rounded-2xl border border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] p-4">
          <SectionHead
            icon={<Heart className="h-5 w-5 text-[#8a6d2f]" />}
            title="Sponsors"
            subtitle="Organisations that contributed prizes to this event"
          />
          <div className="flex flex-wrap gap-2">
            {sponsors.map(s => (
              <span
                key={s}
                className="inline-flex items-center rounded-full bg-white border border-[rgba(210,181,130,0.5)] px-3 py-1.5 text-sm font-semibold text-amber-900"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Volunteers — collapsible ────────────────────────────────────────── */}
      <CollapsibleSection
        icon={<Heart className="h-5 w-5 text-[#52636f]" />}
        title="Volunteers"
        subtitle="The team who made this event happen"
        count={volunteerCount}
        defaultOpen={false}
      >
        <div className="px-4 py-3 flex items-center gap-3 border-b border-[#f6f1e8]">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-bold text-[#52636f] shrink-0">
            {hostName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#102532]">{hostName}</p>
            <p className="text-xs text-[#52636f] font-medium">Host</p>
          </div>
        </div>
        {isElimination ? (
          eliminationAdminCount > 0 ? (
            <div className="px-4 py-3 flex items-center gap-3 border-b border-[#f6f1e8]">
              <div className="w-8 h-8 rounded-full bg-[rgba(233,87,79,0.08)] flex items-center justify-center shrink-0">
                <Users className="h-4 w-4 text-[#c8423b]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#102532]">
                  {eliminationAdminCount} Admin{eliminationAdminCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-[#52636f]">Volunteer admin{eliminationAdminCount !== 1 ? 's' : ''}</p>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-[#52636f]">No additional admins recorded.</div>
          )
        ) : (
          admins.length > 0
            ? admins.map(admin => (
                <div key={admin.id} className="px-4 py-3 flex items-center gap-3 border-b border-[#f6f1e8] last:border-0 hover:bg-[#fbf8f2]">
                  <div className="w-8 h-8 rounded-full bg-[rgba(184,198,176,0.1)] flex items-center justify-center text-xs font-bold text-[#52636f] shrink-0">
                    {admin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#102532]">{admin.name}</p>
                    <p className="text-xs text-[#52636f]">{isTicketedEvent ? 'Door staff / Volunteer' : 'Admin / Volunteer'}</p>
                  </div>
                </div>
              ))
            : <div className="px-4 py-3 text-xs text-[#52636f]">
                {isTicketedEvent ? 'No door staff registered.' : 'No additional admins registered.'}
              </div>
        )}
        <div className="px-4 py-2.5 bg-[rgba(184,198,176,0.1)] border-t border-[rgba(184,198,176,0.3)] text-xs text-[#52636f] font-medium">
          {volunteerCount} volunteer{volunteerCount !== 1 ? 's' : ''} contributed to this event
        </div>
      </CollapsibleSection>

      {/* ── Final Leaderboard — collapsible (not shown for ticketed events) ── */}
      {isTicketedEvent ? null : isElimination ? (
        eliminationData && eliminationData.finalStandings.length > 0 && (
          <CollapsibleSection
            icon={<Zap className="h-5 w-5 text-[#c8423b]" />}
            title="Final Standings"
            subtitle="Last player standing wins"
            count={eliminationData.finalStandings.length}
            defaultOpen={false}
          >
            {eliminationData.finalStandings.map((entry, idx) => (
              <div key={entry.playerId} className={`flex items-center justify-between gap-4 px-4 py-3 border-b border-[#f6f1e8] last:border-0 ${idx === 0 ? 'bg-gradient-to-r from-yellow-50 to-white' : 'hover:bg-[#fbf8f2]'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                    idx === 1 ? 'bg-[#f1f0ee] text-[#52636f]' :
                    idx === 2 ? 'bg-orange-100 text-[#8a6d2f]' :
                    'bg-[rgba(233,87,79,0.08)] text-[#c8423b]'
                  }`}>
                    {idx === 0 ? <Crown className="h-4 w-4" /> : entry.rank}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#102532]">{entry.name}</span>
                    {entry.eliminatedInRound !== null && (
                      <p className="text-xs text-[#8a9bab]">Eliminated round {entry.eliminatedInRound}</p>
                    )}
                    {entry.eliminatedInRound === null && (
                      <p className="text-xs text-[#157f85] font-semibold">Winner 🏆</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-[#52636f]">{entry.cumulativeScore} pts</span>
              </div>
            ))}
            <div className="px-4 py-2.5 bg-[rgba(233,87,79,0.06)] border-t border-[rgba(233,87,79,0.2)] text-xs text-[#c8423b] font-medium">
              {eliminationData.totalRounds} rounds · {eliminationData.totalPlayers} players
            </div>
          </CollapsibleSection>
        )
      ) : (
        <CollapsibleSection
          icon={<Trophy className="h-5 w-5 text-[#157f85]" />}
          title="Final Leaderboard"
          subtitle="Community members who played"
          count={quizLeaderboard.length}
          defaultOpen={false}
        >
          {quizLeaderboard.length > 0 ? (
            <>
              {quizLeaderboard.map((entry, idx) => (
                <div key={entry.id} className={`flex items-center justify-between gap-4 px-4 py-3 border-b border-[#f6f1e8] last:border-0 ${idx < 3 ? 'bg-gradient-to-r from-[rgba(21,127,133,0.06)] to-white' : 'hover:bg-[#fbf8f2]'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-800' :
                      idx === 1 ? 'bg-[#f1f0ee] text-[#52636f]' :
                      idx === 2 ? 'bg-orange-100 text-[#8a6d2f]' :
                      'bg-[rgba(21,127,133,0.06)] text-[#157f85]'
                    }`}>
                      {idx === 0 ? <Crown className="h-4 w-4" /> : idx + 1}
                    </div>
                    <span className="text-sm font-medium text-[#102532]">{entry.name}</span>
                  </div>
                  <span className="text-sm font-bold text-[#52636f]">{entry.score} pts</span>
                </div>
              ))}
              <div className="px-4 py-2.5 bg-[rgba(21,127,133,0.08)] border-t border-[rgba(21,127,133,0.2)] text-xs text-[#157f85] font-medium">
                {quizLeaderboard.length} player{quizLeaderboard.length !== 1 ? 's' : ''} participated
              </div>
            </>
          ) : (
            <div className="p-4 text-center text-sm text-[#52636f]">No leaderboard data available.</div>
          )}
        </CollapsibleSection>
      )}

      {/* ── Prize Awards — collapsible ──────────────────────────────────────── */}
      {prizeAwards.length > 0 && (
        <CollapsibleSection
          icon={<Medal className="h-5 w-5 text-[#8a6d2f]" />}
          title="Prize Awards"
          subtitle="Prizes declared and distributed during the event"
          count={prizeAwards.length}
          defaultOpen={false}
        >
          {prizeAwards.map((award, idx) => {
            const sponsorName = getSponsorName(award.sponsor);
            return (
              <div key={award.prizeAwardId || idx} className="px-4 py-3 flex items-center justify-between gap-4 border-b border-[#f6f1e8] last:border-0 hover:bg-[#fbf8f2]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[rgba(210,181,130,0.18)] flex items-center justify-center text-xs font-bold text-[#8a6d2f] shrink-0">
                    {award.place || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#102532]">
                        {getPlaceLabel(award.place)} — {award.prizeName}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        award.status === 'collected'
                          ? 'bg-[rgba(21,127,133,0.12)] text-[#157f85] border-[rgba(21,127,133,0.3)]'
                          : award.status === 'delivered'
                            ? 'bg-blue-100 text-[#157f85] border-[rgba(21,127,133,0.3)]'
                            : 'bg-[#f1f0ee] text-[#52636f] border-[#dce1df]'
                      }`}>
                        {award.status || 'declared'}
                      </span>
                    </div>
                    <div className="text-xs text-[#52636f] mt-0.5">
                      Winner: <strong>{award.winnerName || '—'}</strong>
                      {sponsorName && ` · Sponsor: ${sponsorName}`}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-[#8a6d2f]">
                    {award.currency || sym}{Number(award.declaredValue || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-[#8a9bab]">{award.prizeType}</div>
                </div>
              </div>
            );
          })}
        </CollapsibleSection>
      )}

      </div> {/* end impact-tab-print-area */}
    </div>
  );
}