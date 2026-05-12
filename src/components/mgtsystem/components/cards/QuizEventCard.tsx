// src/components/mgtsystem/components/cards/QuizEventCard.tsx
import { useMemo } from 'react';
import {
  Calendar,
  Eye,
  FileText,
  Layers,
  Settings,
  Ticket,
  Users,
} from 'lucide-react';
import type { Web2RoomListItem } from '@/shared/api/quiz.api';
import type { RoomStats } from '../../services/quizRoomServices';
import { safeJsonParse } from '../../utils/QuizGameUtils';

type ParsedConfig = {
  prizes?: { place: number; value: number; description?: string }[];
  entryFee?: string;
  hostName?: string;
  roomCaps?: { maxPlayers: number };
  paymentMethod?: string;
  currencySymbol?: string;
  roundDefinitions?: any[];
  selectedTemplate?: string;
};

interface QuizEventCardProps {
  room: Web2RoomListItem;
  stats?: RoomStats;
  hasLinkedPaymentMethods?: boolean;
  outstandingCount?: number;
  viewMode?: 'table' | 'cards';
  onOpenDrawer: (room: Web2RoomListItem) => void;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    live: 'bg-green-100 text-green-700 border-green-200',
    scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-gray-100 text-gray-700 border-gray-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    open: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };
  return map[status] ?? map.scheduled;
}

function formatStatus(status: string) {
  if (!status) return 'Scheduled';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function shortRoomId(roomId?: string | null) {
  if (!roomId) return '—';
  if (roomId.length <= 12) return roomId;
  return `${roomId.slice(0, 6)}…${roomId.slice(-4)}`;
}

function getTicketsSold(stats?: RoomStats): number {
  const s = stats as any;

  const candidates = [
    s?.ticketsSold,
    s?.totalTicketsSold,
    s?.tickets_sold,
    s?.ticketCount,
    s?.tickets,
    s?.totalTickets,
    s?.uniquePlayers,
  ];

  const first = candidates.find((value) => value !== undefined && value !== null);
  const n = typeof first === 'string' ? Number(first) : typeof first === 'number' ? first : 0;

  return Number.isFinite(n) ? n : 0;
}

function getActionMeta(status: string) {
  switch (status) {
    case 'scheduled':
    case 'open':
      return {
        label: 'Settings',
        title: 'Open quiz settings',
        Icon: Settings,
        className: 'bg-blue-600 text-white hover:bg-blue-700',
        softClassName: 'text-blue-500 hover:bg-blue-50 hover:text-blue-700',
      };
    case 'completed':
      return {
        label: 'Report',
        title: 'Open quiz report',
        Icon: FileText,
        className: 'bg-gray-900 text-white hover:bg-gray-800',
        softClassName: 'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
      };
    default:
      return {
        label: 'View',
        title: 'View quiz details',
        Icon: Eye,
        className: 'bg-indigo-600 text-white hover:bg-indigo-700',
        softClassName: 'text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600',
      };
  }
}

export function QuizEventCard({
  room,
  stats,
  outstandingCount = 0,
  viewMode = 'table',
  onOpenDrawer,
}: QuizEventCardProps) {
  const config = useMemo(
    () => safeJsonParse<ParsedConfig>(room.config_json, {} as ParsedConfig),
    [room.config_json]
  );

  const currencySymbol = config.currencySymbol || '€';
  const entryFee = parseFloat(config.entryFee || '0');
  const prizeValue = config.prizes?.reduce((s, p) => s + (p.value || 0), 0) || 0;
  const rounds = config.roundDefinitions?.length || 0;
  const hostName = config.hostName || '—';

  const totalIncome = stats?.totalIncome ?? 0;
  const pendingVerifs = stats?.pendingTicketVerifications ?? 0;
  const ticketsSold = getTicketsSold(stats);

  const status = room.status || 'scheduled';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';
  const isLive = status === 'live';
  const isScheduled = status === 'scheduled';
  const action = getActionMeta(status);
  const ActionIcon = action.Icon;

  const scheduledDate = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const scheduledTime = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // ── TABLE ROW ──────────────────────────────────────────────────────────────
  if (viewMode === 'table') {
    return (
      <div className="flex items-center gap-4 border-b border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors">
        {/* Status */}
        <div className="w-24 flex-shrink-0">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(status)}`}>
            {formatStatus(status)}
          </span>
        </div>

        {/* Date */}
        <div className="w-36 flex-shrink-0">
          <div className="text-sm font-semibold text-gray-900">{scheduledDate}</div>
          {scheduledTime && <div className="text-xs text-gray-500">{scheduledTime}</div>}
        </div>

        {/* Room ID */}
        <div className="w-28 flex-shrink-0">
          <div className="rounded-md bg-gray-50 px-2 py-1 font-mono text-xs font-semibold text-gray-600" title={room.room_id}>
            {shortRoomId(room.room_id)}
          </div>
        </div>

        {/* Fee */}
        <div className="w-16 flex-shrink-0 text-sm font-medium text-gray-700">
          {entryFee > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
        </div>

        {/* Income */}
        <div className="w-24 flex-shrink-0 text-sm font-semibold">
          {totalIncome > 0 ? (
            <span className="text-green-700">
              {currencySymbol}{totalIncome.toFixed(2)}
            </span>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </div>

        {/* Tickets Sold */}
        <div className="w-24 flex-shrink-0 text-center text-sm font-semibold">
          {ticketsSold > 0 ? <span className="text-indigo-700">{ticketsSold}</span> : <span className="text-gray-300">—</span>}
        </div>

        {/* Prizes */}
        <div className="w-20 flex-shrink-0 text-right text-sm font-medium text-gray-700">
          {prizeValue > 0 ? `${currencySymbol}${prizeValue}` : '—'}
        </div>

        {/* Actions — pushed to end */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {isCompleted && outstandingCount > 0 && (
            <span className="mr-1 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
              {outstandingCount} unpaid
            </span>
          )}

          {pendingVerifs > 0 && (
            <span className="mr-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
              {pendingVerifs} pending
            </span>
          )}

          {isLive && (
            <span className="mr-1 flex items-center gap-1 text-xs font-semibold text-green-600">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              Live
            </span>
          )}

          <button
            type="button"
            onClick={() => onOpenDrawer(room)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
            title={action.title}
          >
            <ActionIcon className="h-3.5 w-3.5" />
            {action.label}
          </button>
        </div>
      </div>
    );
  }

  // ── CARD ───────────────────────────────────────────────────────────────────
  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden">
      {/* Status stripe at top */}
      <div
        className={`h-1 w-full ${
          isLive ? 'bg-green-400'
            : isScheduled ? 'bg-blue-400'
            : isCompleted ? 'bg-gray-300'
            : isCancelled ? 'bg-red-300'
            : 'bg-yellow-400'
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(status)}`}>
              {isLive ? (
                <span className="flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  Live
                </span>
              ) : (
                formatStatus(status)
              )}
            </span>

            {pendingVerifs > 0 && (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                {pendingVerifs} pending
              </span>
            )}

            {isCompleted && outstandingCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
                {outstandingCount} unpaid
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <Calendar className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
            {scheduledDate}
            {scheduledTime && <span className="text-gray-400 font-normal">at {scheduledTime}</span>}
          </div>

          <div className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-gray-50 px-2 py-1 text-xs text-gray-500">
            <span className="font-medium">Room ID</span>
            <span className="truncate font-mono font-semibold text-gray-700" title={room.room_id}>
              {shortRoomId(room.room_id)}
            </span>
          </div>
        </div>

        {/* Quick action */}
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenDrawer(room)}
            className={`rounded-lg p-1.5 transition-colors ${action.softClassName}`}
            title={action.title}
          >
            <ActionIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
        {/* Fee */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-xs text-gray-400 font-medium mb-0.5">Fee</p>
          <p className="text-sm font-bold text-gray-900">
            {entryFee > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
          </p>
        </div>

        {/* Tickets Sold */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-xs text-gray-400 font-medium mb-0.5">Tickets sold</p>
          <p className={`text-sm font-bold ${ticketsSold > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
            {ticketsSold > 0 ? ticketsSold : '—'}
          </p>
        </div>

        {/* Income */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-xs text-gray-400 font-medium mb-0.5">Income</p>
          <p className={`text-sm font-bold ${totalIncome > 0 ? 'text-green-600' : 'text-gray-300'}`}>
            {totalIncome > 0 ? `${currencySymbol}${totalIncome.toFixed(2)}` : '—'}
          </p>
        </div>
      </div>

      {/* Income + Prizes row */}
      <div className="grid grid-cols-2 gap-px bg-gray-100">
        {/* Prizes */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-xs text-gray-400 font-medium mb-0.5">Prizes</p>
          <p className="text-sm font-bold text-amber-600">
            {prizeValue > 0 ? `${currencySymbol}${prizeValue}` : '—'}
          </p>
        </div>

        {/* Rounds */}
        <div className="bg-white px-3 py-2.5">
          <p className="text-xs text-gray-400 font-medium mb-0.5">Rounds</p>
          <p className={`text-sm font-bold ${rounds > 0 ? 'text-gray-800' : 'text-gray-300'}`}>
            {rounds > 0 ? rounds : '—'}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2.5 bg-gray-50">
        <div className="flex min-w-0 items-center gap-3 text-xs text-gray-400">
          {rounds > 0 && (
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {rounds}r
            </span>
          )}
          <span className="flex min-w-0 items-center gap-1">
            <Users className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{hostName}</span>
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <Ticket className="h-3 w-3" />
            {ticketsSold || 0} sold
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenDrawer(room)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${action.className}`}
          title={action.title}
        >
          <ActionIcon className="h-3 w-3" />
          {action.label}
        </button>
      </div>
    </div>
  );
}