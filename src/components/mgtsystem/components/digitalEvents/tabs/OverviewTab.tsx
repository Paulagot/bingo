// src/components/mgtsystem/components/digitalEvents/tabs/OverviewTab.tsx
import type { ReactNode } from 'react';
import {
  Calendar,
  Layers,
  DollarSign,
  Users,
  Trophy,
  Hash,
  Link2,
  Clock,
  MapPin,
  Wallet,
  Sparkles,
  Target,
  CheckCircle,
  CircleDollarSign,
  Tag,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import type { RoomStats } from '../../../services/quizRoomServices';
import { useCurrency } from '../../../hooks/useCurrency';

interface Props {
  room: Room;
  config: any;
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
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatStatus(value: string | null | undefined) {
  const v = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    scheduled: 'Scheduled', live: 'Live', completed: 'Completed',
    cancelled: 'Cancelled', draft: 'Draft',
  };
  return labels[v] || titleCase(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return { date: 'Not scheduled', time: '', compact: 'Not scheduled' };
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: 'Not scheduled', time: '', compact: 'Not scheduled' };
  const date = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { date, time, compact: `${date} at ${time}` };
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

function getStatusTone(status: string | null | undefined): Tone {
  const v = String(status || '').toLowerCase();
  if (v === 'completed') return 'indigo';
  if (v === 'live') return 'green';
  if (v === 'scheduled') return 'indigo';
  if (v === 'cancelled') return 'rose';
  return 'gray';
}

export default function OverviewTab({ room, config, stats, linkedEventTitle }: Props) {

  // Currency from club's reporting_currency (falls back to config for legacy rooms)
  const { sym } = useCurrency(config);

  // ── Game type ──────────────────────────────────────────────────────────────
  const isElimination =
    (room as any).game_type === 'elimination' ||
    config?.gameType === 'elimination';

  // ── Shared derived values ──────────────────────────────────────────────────
  const entryFee   = Number(config?.entryFee ?? 0);
  const scheduled  = formatDateTime(room.scheduled_at || config?.eventDateTime);
  const statusTone = getStatusTone(room.status);
  const statIncome = typeof stats?.totalIncome === 'number' ? money(sym, stats.totalIncome) : '—';
  const isDonation = config?.fundraisingMode === 'donation';

  // ── Quiz-specific ──────────────────────────────────────────────────────────
  const prizes         = Array.isArray(config?.prizes) ? config.prizes : [];
  const rounds         = Array.isArray(config?.roundDefinitions) ? config.roundDefinitions : [];
  const maxPlayers     = Number(config?.roomCaps?.maxPlayers ?? config?.maxPlayers ?? 0);
  const prizeTotal     = prizes.reduce((sum: number, p: any) => sum + Number(p?.value || 0), 0);
  const totalQuestions = rounds.reduce((sum: number, r: any) => sum + Number(r?.config?.questionsPerRound || 0), 0);

  // ── Elimination-specific ───────────────────────────────────────────────────
  // Read from prizes[0] first (new shape), fall back to legacy flat fields for
  // old rooms that were saved before the prizes array was introduced.
  const elimPrize            = config?.prizes?.[0] ?? null;
  const elimPrizeDescription = elimPrize?.description ?? config?.prizeDescription ?? null;
  const elimPrizeValue       = Number(elimPrize?.value ?? config?.prizeValue ?? 0);
  const elimPrizeSponsor     = elimPrize?.sponsor ?? null;

  return (
    <div className="space-y-5 p-5">

      {/* ── Hero banner ── */}
      <div className={`overflow-hidden rounded-2xl border ${
        isElimination
          ? 'border-[rgba(233,87,79,0.2)] bg-gradient-to-br from-red-50 via-white to-orange-50'
          : 'border-[rgba(21,127,133,0.25)] bg-[rgba(21,127,133,0.04)]'
      }`}>
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone={statusTone}>{formatStatus(room.status)}</Pill>
                {isElimination && (
                  <Pill tone="rose">
                    <Trophy className="mr-1 h-3 w-3" />
                    Elimination
                  </Pill>
                )}
                {!isElimination && isDonation && <Pill tone="green">Donation event</Pill>}
                {linkedEventTitle && <Pill tone="purple">Linked to event</Pill>}
              </div>
              <h2 className="text-lg font-black text-gray-900">
                {isElimination
                  ? 'Elimination game overview'
                  : config?.selectedTemplate ? titleCase(config.selectedTemplate) : 'Quiz overview'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {isElimination
                  ? 'A quick snapshot of the elimination game setup, entry fee and prize.'
                  : 'A quick snapshot of the event setup, player capacity, pricing, prizes and round structure.'}
              </p>
            </div>
            <div className="rounded-xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">Room ID</p>
              <p className="mt-1 font-mono text-xs font-semibold text-[#1e3040]">{room.room_id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      {isElimination ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            label="Prize"
            value={elimPrizeValue > 0 ? money(sym, elimPrizeValue, 0) : '—'}
            helper={elimPrizeDescription || 'No prize description'}
            tone="amber"
          />
          <StatCard
            icon={<CircleDollarSign className="h-5 w-5" />}
            label="Income"
            value={statIncome}
            helper={entryFee > 0 ? `${money(sym, entryFee)} entry` : 'Free entry'}
            tone="green"
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Entry fee"
            value={entryFee > 0 ? money(sym, entryFee) : 'Free'}
            helper={`${sym} (${config?.currency ?? 'club currency'})`}
            tone="purple"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Players"
            value={stats?.uniquePlayers ?? 0}
            helper={maxPlayers > 0 ? `Capacity ${maxPlayers}` : 'No cap set'}
            tone="indigo"
          />
          <StatCard
            icon={<TicketIcon />}
            label="Tickets"
            value={stats?.ticketsSold ?? 0}
            helper="Tickets sold"
            tone="orange"
          />
          <StatCard
            icon={<CircleDollarSign className="h-5 w-5" />}
            label={isDonation ? 'Raised' : 'Income'}
            value={statIncome}
            helper={entryFee > 0
              ? `${money(sym, entryFee)} entry`
              : isDonation ? 'Donation based' : 'Free entry'}
            tone="green"
          />
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            label="Prizes"
            value={prizeTotal > 0 ? money(sym, prizeTotal, 0) : prizes.length}
            helper={prizes.length
              ? `${prizes.length} prize${prizes.length === 1 ? '' : 's'} configured`
              : 'No prizes configured'}
            tone="purple"
          />
        </div>
      )}

      {/* ── Event details + pricing ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Calendar className="h-4 w-4" />}
            title="Event details"
            subtitle={isElimination
              ? 'Core setup details for the elimination game.'
              : 'The core setup details people need before the quiz starts.'}
          />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Schedule">
              {scheduled.compact}
            </DetailRow>
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Time zone">
              {config?.timeZone || room.time_zone || 'Europe/Dublin'}
            </DetailRow>
            {linkedEventTitle && (
              <DetailRow icon={<Link2 className="h-4 w-4" />} label="Linked event">
                <span className="text-[#157f85]">{linkedEventTitle}</span>
              </DetailRow>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Wallet className="h-4 w-4" />}
            title="Pricing and payments"
          />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow
              icon={<DollarSign className="h-4 w-4" />}
              label={isDonation ? 'Donation model' : 'Entry fee'}
            >
              {isDonation
                ? 'Donation amount chosen by supporter'
                : entryFee > 0 ? money(sym, entryFee) : 'Free'}
            </DetailRow>
            <DetailRow icon={<Users className="h-4 w-4" />} label="Maximum players">
              {maxPlayers > 0 ? maxPlayers : 'No maximum set'}
            </DetailRow>
          </div>
        </div>
      </div>

      {/* ── Prize section ── */}
      {isElimination ? (
        elimPrizeDescription && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <SectionHeader
              icon={<Trophy className="h-4 w-4" />}
              title="Prize"
              subtitle="The prize for the last player standing."
            />
            <div className="rounded-xl border border-amber-100 bg-white px-4">
              <DetailRow icon={<Trophy className="h-4 w-4" />} label="Prize description">
                {elimPrizeDescription}
              </DetailRow>
              {elimPrizeValue > 0 && (
                <DetailRow icon={<DollarSign className="h-4 w-4" />} label="Estimated value">
                  {money(sym, elimPrizeValue)}
                </DetailRow>
              )}
              {elimPrizeSponsor && (
                <DetailRow icon={<Tag className="h-4 w-4" />} label="Sponsor">
                  {elimPrizeSponsor}
                </DetailRow>
              )}
            </div>
          </div>
        )
      ) : (
        prizes.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <SectionHeader
              icon={<Trophy className="h-4 w-4" />}
              title="Prize setup"
              subtitle={`${prizes.length} prize${prizes.length === 1 ? '' : 's'} configured with a declared total of ${money(sym, prizeTotal)}.`}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {prizes.map((prize: any, index: number) => (
                <div key={`${prize?.place || index}-${prize?.description || 'prize'}`}
                  className="rounded-xl border border-purple-200 bg-[rgba(184,198,176,0.08)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Pill tone="purple">Place {prize?.place ?? index + 1}</Pill>
                    {Number(prize?.value || 0) > 0 && (
                      <span className="text-sm font-black text-gray-900">{money(sym, prize.value)}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{prize?.description || 'Prize'}</p>
                  {prize?.sponsor && <p className="mt-1 text-xs text-gray-600">Sponsored by {prize.sponsor}</p>}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* ── Round structure — quiz only ── */}
      {!isElimination && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Layers className="h-4 w-4" />}
            title="Round structure"
            subtitle={rounds.length
              ? `${rounds.length} round${rounds.length === 1 ? '' : 's'} and ${totalQuestions} total question${totalQuestions === 1 ? '' : 's'} configured.`
              : 'No rounds have been configured yet.'}
          />
          {rounds.length > 0 ? (
            <div className="space-y-2">
              {rounds.map((round: any, index: number) => {
                const qCount          = Number(round?.config?.questionsPerRound || 0);
                const timePerQuestion = Number(round?.config?.timePerQuestion || 0);
                const totalTime       = Number(round?.config?.totalTimeSeconds || round?.config?.hiddenObject?.timeLimitSeconds || 0);
                const roundNumber     = round?.roundNumber ?? index + 1;
                return (
                  <div key={`${roundNumber}-${round?.roundType || index}`}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone="indigo">Round {roundNumber}</Pill>
                          <span className="text-sm font-bold text-gray-900">{titleCase(round?.roundType)}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          {round?.category && <span>{round.category}</span>}
                          {round?.difficulty && <span>• {titleCase(round.difficulty)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {qCount > 0 && <Pill>{qCount}Q</Pill>}
                        {timePerQuestion > 0 && <Pill>{timePerQuestion}s each</Pill>}
                        {totalTime > 0 && <Pill>{totalTime}s total</Pill>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-center">
              <Target className="mx-auto h-6 w-6 text-gray-400" />
              <p className="mt-2 text-sm font-semibold text-[#1e3040]">No quiz rounds found</p>
              <p className="mt-1 text-xs text-gray-600">Use the setup tab to add or edit the quiz template.</p>
            </div>
          )}
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
            <span className="break-all font-mono text-xs text-gray-600">{room.room_id}</span>
          </DetailRow>
          <DetailRow icon={<Sparkles className="h-4 w-4" />} label={isElimination ? 'Game type' : 'Template'}>
            {isElimination ? 'Elimination' : (config?.selectedTemplate || 'Custom quiz')}
          </DetailRow>
        </div>
      </div>

    </div>
  );
}

function TicketIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  );
}