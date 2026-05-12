// src/components/mgtsystem/components/digitalEvents/tabs/OverviewTab.tsx
import type { ReactNode } from 'react';
import {
  Calendar,
  User,
  Layers,
  DollarSign,
  Users,
  Trophy,
  Hash,
  Link2,
  Clock,
  MapPin,
  Wallet,
  BadgeCheck,
  Sparkles,
  Target,
  CheckCircle,
  CircleDollarSign,
} from 'lucide-react';
import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';
import type { RoomStats } from '../../../services/quizRoomServices';

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

function money(currency: string, value: number | string | null | undefined, decimals = 2) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return `${currency}0.00`;
  return `${currency}${n.toFixed(decimals)}`;
}

function titleCase(value: string | null | undefined) {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatPaymentMethod(value: string | null | undefined) {
  const v = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    cash_or_revolut: 'Cash / Revolut',
    instant_payment: 'Instant Payment',
    cash: 'Cash',
    stripe: 'Stripe',
    card: 'Card',
    web3: 'Web3',
    crypto: 'Crypto',
    demo: 'Demo',
  };
  return labels[v] || titleCase(value);
}

function formatStatus(value: string | null | undefined) {
  const v = String(value || '').toLowerCase();
  const labels: Record<string, string> = {
    scheduled: 'Scheduled',
    live: 'Live',
    completed: 'Completed',
    cancelled: 'Cancelled',
    draft: 'Draft',
  };
  return labels[v] || titleCase(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return { date: 'Not scheduled', time: '', compact: 'Not scheduled' };

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return { date: 'Not scheduled', time: '', compact: 'Not scheduled' };

  const date = d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return { date, time, compact: `${date} at ${time}` };
}

function StatCard({ icon, label, value, helper, tone = 'gray' }: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: Tone;
}) {
  const toneMap: Record<Tone, string> = {
    gray: 'border-gray-200 bg-white',
    indigo: 'border-indigo-200 bg-indigo-50',
    green: 'border-green-200 bg-green-50',
    amber: 'border-amber-200 bg-amber-50',
    purple: 'border-purple-200 bg-purple-50',
    blue: 'border-blue-200 bg-blue-50',
    rose: 'border-rose-200 bg-rose-50',
    orange: 'border-orange-200 bg-orange-50',
  };
  const iconMap: Record<Tone, string> = {
    gray: 'text-gray-500',
    indigo: 'text-indigo-600',
    green: 'text-green-600',
    amber: 'text-amber-600',
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    rose: 'text-rose-600',
    orange: 'text-orange-600',
  };
  const labelMap: Record<Tone, string> = {
    gray: 'text-gray-600',
    indigo: 'text-indigo-700',
    green: 'text-green-700',
    amber: 'text-amber-700',
    purple: 'text-purple-700',
    blue: 'text-blue-700',
    rose: 'text-rose-700',
    orange: 'text-orange-700',
  };

  return (
    <div className={cn('rounded-xl border p-4', toneMap[tone])}>
      <div className={cn('mb-2', iconMap[tone])}>{icon}</div>
      <p className={cn('text-xs font-semibold uppercase tracking-wide', labelMap[tone])}>{label}</p>
      <div className="mt-1 text-xl font-black text-gray-950">{value}</div>
      {helper && <p className="mt-1 text-[11px] text-gray-600">{helper}</p>}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <div className="mt-0.5 flex-shrink-0 text-gray-500">{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-950">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-600">{subtitle}</p>}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, children, muted = false }: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
      <div className={cn('mt-0.5 flex-shrink-0', muted ? 'text-gray-300' : 'text-gray-400')}>{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</div>
        <div className={cn('mt-0.5 text-sm font-semibold', muted ? 'text-gray-500' : 'text-gray-900')}>{children}</div>
      </div>
    </div>
  );
}

function Pill({ children, tone = 'gray' }: { children: ReactNode; tone?: Tone }) {
  const map: Record<Tone, string> = {
    gray: 'bg-gray-100 text-gray-700 ring-gray-200',
    indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    green: 'bg-green-50 text-green-700 ring-green-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    purple: 'bg-purple-50 text-purple-700 ring-purple-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    orange: 'bg-orange-50 text-orange-700 ring-orange-200',
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', map[tone])}>
      {children}
    </span>
  );
}

function getStatusTone(status: string | null | undefined): Tone {
  const v = String(status || '').toLowerCase();
  if (v === 'completed') return 'green';
  if (v === 'live') return 'orange';
  if (v === 'scheduled') return 'indigo';
  if (v === 'cancelled') return 'rose';
  return 'gray';
}

export default function OverviewTab({ room, config, stats, linkedEventTitle }: Props) {
  const prizes = Array.isArray(config?.prizes) ? config.prizes : [];
  const rounds = Array.isArray(config?.roundDefinitions) ? config.roundDefinitions : [];
  const currency = String(config?.currencySymbol || config?.currency || '€');
  const entryFee = Number(config?.entryFee ?? 0);
  const maxPlayers = Number(config?.roomCaps?.maxPlayers ?? 0);
  const prizeTotal = prizes.reduce((sum: number, prize: any) => sum + Number(prize?.value || 0), 0);
  const totalQuestions = rounds.reduce((sum: number, round: any) => sum + Number(round?.config?.questionsPerRound || 0), 0);
  const scheduled = formatDateTime(room.scheduled_at || config?.eventDateTime);
  const statusTone = getStatusTone(room.status);
  const isDonation = config?.fundraisingMode === 'donation';

  const statIncome = typeof stats?.totalIncome === 'number' ? money(currency, stats.totalIncome) : '—';

  return (
    <div className="space-y-5 p-5">
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Pill tone={statusTone}>{formatStatus(room.status)}</Pill>
                {isDonation && <Pill tone="green">Donation event</Pill>}
                {linkedEventTitle && <Pill tone="purple">Linked to event</Pill>}
              </div>

              <h2 className="text-lg font-black text-gray-950">
                {config?.selectedTemplate ? titleCase(config.selectedTemplate) : 'Quiz overview'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                A quick snapshot of the event setup, player capacity, pricing, prizes and round structure.
              </p>
            </div>

            <div className="rounded-xl border border-white/80 bg-white/80 px-4 py-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Room ID</p>
              <p className="mt-1 font-mono text-xs font-semibold text-gray-800">{room.room_id}</p>
            </div>
          </div>
        </div>
      </div>

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
          helper={entryFee > 0 ? `${money(currency, entryFee)} entry` : isDonation ? 'Donation based' : 'Free entry'}
          tone="green"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Prizes"
          value={prizeTotal > 0 ? money(currency, prizeTotal, 0) : prizes.length}
          helper={prizes.length ? `${prizes.length} prize${prizes.length === 1 ? '' : 's'} configured` : 'No prizes configured'}
          tone="purple"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Calendar className="h-4 w-4" />}
            title="Event details"
            subtitle="The core setup details people need before the quiz starts."
          />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow icon={<Clock className="h-4 w-4" />} label="Schedule">
              {scheduled.compact}
            </DetailRow>
            <DetailRow icon={<User className="h-4 w-4" />} label="Host">
              {config?.hostName || 'Unknown host'}
            </DetailRow>
            <DetailRow icon={<MapPin className="h-4 w-4" />} label="Time zone">
              {config?.timeZone || 'Europe/Dublin'}
            </DetailRow>
            {linkedEventTitle && (
              <DetailRow icon={<Link2 className="h-4 w-4" />} label="Linked event">
                <span className="text-indigo-700">{linkedEventTitle}</span>
              </DetailRow>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Wallet className="h-4 w-4" />}
            title="Pricing and payments"
            subtitle="Uses the event currency from the room config."
          />
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
            <DetailRow icon={<DollarSign className="h-4 w-4" />} label={isDonation ? 'Donation model' : 'Entry fee'}>
              {isDonation ? 'Donation amount chosen by supporter' : entryFee > 0 ? money(currency, entryFee) : 'Free'}
            </DetailRow>
            {/* <DetailRow icon={<BadgeCheck className="h-4 w-4" />} label="Payment method">
              {formatPaymentMethod(config?.paymentMethod)}
            </DetailRow> */}
            <DetailRow icon={<Users className="h-4 w-4" />} label="Maximum players">
              {maxPlayers > 0 ? maxPlayers : 'No maximum set'}
            </DetailRow>
            <DetailRow icon={<Sparkles className="h-4 w-4" />} label="Currency">
              {config?.currency ? `${config.currency} (${currency})` : currency}
            </DetailRow>
          </div>
        </div>
      </div>

      {prizes.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <SectionHeader
            icon={<Trophy className="h-4 w-4" />}
            title="Prize setup"
            subtitle={`${prizes.length} prize${prizes.length === 1 ? '' : 's'} configured with a declared total of ${money(currency, prizeTotal)}.`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {prizes.map((prize: any, index: number) => (
              <div key={`${prize?.place || index}-${prize?.description || 'prize'}`} className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Pill tone="purple">Place {prize?.place ?? index + 1}</Pill>
                  {Number(prize?.value || 0) > 0 && (
                    <span className="text-sm font-black text-gray-950">{money(currency, prize.value)}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-950">{prize?.description || 'Prize'}</p>
                {prize?.sponsor && <p className="mt-1 text-xs text-gray-600">Sponsored by {prize.sponsor}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <SectionHeader
          icon={<Layers className="h-4 w-4" />}
          title="Round structure"
          subtitle={rounds.length ? `${rounds.length} round${rounds.length === 1 ? '' : 's'} and ${totalQuestions} total question${totalQuestions === 1 ? '' : 's'} configured.` : 'No rounds have been configured yet.'}
        />

        {rounds.length > 0 ? (
          <div className="space-y-2">
            {rounds.map((round: any, index: number) => {
              const qCount = Number(round?.config?.questionsPerRound || 0);
              const timePerQuestion = Number(round?.config?.timePerQuestion || 0);
              const totalTime = Number(round?.config?.totalTimeSeconds || round?.config?.hiddenObject?.timeLimitSeconds || 0);
              const roundNumber = round?.roundNumber ?? index + 1;

              return (
                <div key={`${roundNumber}-${round?.roundType || index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone="indigo">Round {roundNumber}</Pill>
                        <span className="text-sm font-bold text-gray-950">{titleCase(round?.roundType)}</span>
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
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center">
            <Target className="mx-auto h-6 w-6 text-gray-400" />
            <p className="mt-2 text-sm font-semibold text-gray-800">No quiz rounds found</p>
            <p className="mt-1 text-xs text-gray-500">Use the setup tab to add or edit the quiz template.</p>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <SectionHeader
          icon={<CheckCircle className="h-4 w-4" />}
          title="Internal reference"
          subtitle="Useful details for support, reconciliation and troubleshooting."
        />
        <div className="rounded-xl border border-gray-100 bg-gray-50 px-4">
          <DetailRow icon={<Hash className="h-4 w-4" />} label="Room ID">
            <span className="break-all font-mono text-xs text-gray-700">{room.room_id}</span>
          </DetailRow>
          <DetailRow icon={<Sparkles className="h-4 w-4" />} label="Template">
            {config?.selectedTemplate || 'Custom quiz'}
          </DetailRow>
          <DetailRow icon={<Layers className="h-4 w-4" />} label="Prize mode">
            {titleCase(config?.prizeMode)}
          </DetailRow>
        </div>
      </div>
    </div>
  );
}

function TicketIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
      <path d="M13 5v2" />
      <path d="M13 17v2" />
      <path d="M13 11v2" />
    </svg>
  );
}