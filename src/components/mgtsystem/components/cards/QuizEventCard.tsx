// client/src/components/Quiz/events/QuizEventCard.tsx
import { useMemo, useState, useEffect } from 'react';
import {
  Play, Lock, ChevronDown, ChevronUp,
  Trophy, Zap, Target, Layers, Info,
  Link2, Unlink, Edit, Trash2, Clock, Ticket, CheckCircle, Copy, BarChart3,
  Calendar, AlertCircle, Tag, CreditCard, DollarSign, Plus,
} from 'lucide-react';

import { TicketManagerModal } from '../../modals/QuizTicketmanagermodal';
import { QuizFinancialReportModal } from '../../modals/QuizFinancialReportModal';
import type { Web2RoomListItem } from '@/shared/api/quiz.api';
import type { RoomStats } from '../../services/quizRoomServices';
import { formatDateTime, minutesUntil, safeJsonParse } from '../../utils/QuizGameUtils';
import { QuizPaymentMethodsModal } from '../../modals/QuizPaymentMethodsModal';
import { quizPaymentMethodsService } from '../../services/QuizPaymentMethodsService';
import MarkLatePaymentModal from '../../modals/QuizMarkLatePaymentModal';
import { useAuthStore } from '../../../../features/auth';
import quizLatePaymentsService from '../../services/QuizLatePaymentsService';

// ✅ NEW: personalised round modal
import { PersonalisedRoundModal } from '../../modals/QuizPersonalisedRoundModal';

type Prize = { place: number; value: number; description?: string };
type RoomCaps = { maxRounds: number; maxPlayers: number; extrasAllowed: string[]; roundTypesAllowed?: string[] };
type RoundDefinition = {
  config: { timePerQuestion: number; questionsPerRound: number; pointsPerDifficulty?: { easy: number; medium: number; hard: number } };
  category: string;
  roundType: string;
  difficulty: string;
  roundNumber: number;
};

export type ParsedConfig = {
  prizes?: Prize[];
  entryFee?: string;
  hostName?: string;
  roomCaps?: RoomCaps;
  prizeMode?: string;
  eventDateTime?: string;
  paymentMethod?: string;
  currencySymbol?: string;
  roundDefinitions?: RoundDefinition[];
  selectedTemplate?: string;
  fundraisingOptions?: Record<string, boolean>;
  fundraisingPrices?: Record<string, number>;
};

const EXTRA_LABELS: Record<string, string> = {
  buyHint: 'Hint',
  restorePoints: 'Restore',
  freezeOutTeam: 'Freeze',
  robPoints: 'Rob',
  skipQuestion: 'Skip',
  doublePoints: '2x Points'
};

export function QuizEventCard({
  room,
  stats,
  onOpenRoom,
  onEdit,
  onCancel,
  onLinkToEvent,
  onUnlinkFromEvent,
  linkedEventTitle,
  linkedEventId,
  viewMode = 'table',
}: {
  room: Web2RoomListItem;
  stats?: RoomStats;
  onOpenRoom: (roomId: string, hostId: string) => void;
  onEdit?: (room: Web2RoomListItem) => void;
  onCancel?: (room: Web2RoomListItem) => void;
  onLinkToEvent?: (room: Web2RoomListItem) => void;
  onUnlinkFromEvent?: (room: Web2RoomListItem) => void;
  linkedEventTitle?: string | null;
  linkedEventId?: string | null;
  viewMode?: 'cards' | 'table';
}) {
  const [expanded, setExpanded] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [latePaymentsOpen, setLatePaymentsOpen] = useState(false);

  // ✅ NEW: personalised round modal state
  const [personalisedOpen, setPersonalisedOpen] = useState(false);

  const user = useAuthStore((s: any) => s.user);
  const confirmedBy = user?.id || user?.user_id || user?.club_user_id;
  const confirmedByName = user?.name || user?.full_name || user?.first_name || 'Admin';
  const confirmedByRole: 'host' | 'admin' = 'admin';
  const [outstandingCount, setOutstandingCount] = useState<number>(0);

  const config = useMemo(() => safeJsonParse<ParsedConfig>(room.config_json, {} as ParsedConfig), [room.config_json]);

  const ticketsSold = stats?.ticketsSold ?? 0;
  const uniquePlayers = stats?.uniquePlayers ?? 0;
  const totalIncome = stats?.totalIncome ?? 0;

  const copyTicketLink = async () => {
    const ticketUrl = `${window.location.origin}/tickets/buy/${room.room_id}`;
    try {
      await navigator.clipboard.writeText(ticketUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      const textArea = document.createElement('textarea');
      textArea.value = ticketUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ✅ UPDATED: open the modal instead of alert()
  const handlePersonalise = () => {
    setPersonalisedOpen(true);
  };

  const handleLinkPaymentMethod = () => {
    setPaymentModalOpen(true);
  };

  const handleManageOutstandingPayments = () => {
    setLatePaymentsOpen(true);
  };

  const mins = minutesUntil(room.scheduled_at);
  const isLive = room.status === 'live';
  const isScheduled = room.status === 'scheduled';
  const isCompleted = room.status === 'completed';
  const isCancelled = room.status === 'cancelled';
  const isLinked = !!linkedEventId;

  const showReportButton = isCompleted;

  const canOpen =
    !isCompleted &&
    !isCancelled &&
    (isLive || (isScheduled && mins !== null && mins <= 60));

  const canEdit = isScheduled && onEdit;
  const canCancel = isScheduled && onCancel;
  const isWeb2Room = config.paymentMethod !== 'web3';
  const showTicketActions = isWeb2Room && !isCompleted && !isCancelled;
  const [hasLinkedPaymentMethods, setHasLinkedPaymentMethods] = useState(false);

  const prizeCount = config.prizes?.length || 0;
  const prizeValue = config.prizes?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
  const maxPlayers = config.roomCaps?.maxPlayers || 0;
  const entryFee = config.entryFee || '0';
  const hostName = config.hostName || 'Unknown';
  const currencySymbol = config.currencySymbol || '€';
  const selectedTemplate = config.selectedTemplate || 'Custom';
  const rounds = config.roundDefinitions || [];

  const enabledExtras = Object.entries(config.fundraisingOptions || {})
    .filter(([_, enabled]) => enabled === true)
    .map(([key]) => ({
      key,
      label: EXTRA_LABELS[key] || key,
      price: config.fundraisingPrices?.[key] || 0
    }));

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-100 text-green-700 border-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch ((difficulty || '').toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  console.log('[OpenGate]', {
    scheduled_at: room.scheduled_at,
    time_zone: room.time_zone,
    now: new Date().toISOString(),
    mins,
    status: room.status,
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    const checkPaymentMethods = async () => {
      if (!room.room_id || !isWeb2Room) {
        setHasLinkedPaymentMethods(false);
        return;
      }

      try {
        const response = await quizPaymentMethodsService.getQuizPaymentMethods(room.room_id);
        setHasLinkedPaymentMethods(response.linked_method_ids.length > 0);
      } catch (err) {
        console.error('Failed to check payment methods:', err);
        setHasLinkedPaymentMethods(false);
      }
    };

    checkPaymentMethods();
  }, [room.room_id, isWeb2Room]);

  const showTicketActionsWithPayment = showTicketActions && hasLinkedPaymentMethods;

  useEffect(() => {
    const run = async () => {
      if (!isCompleted) {
        setOutstandingCount(0);
        return;
      }
      try {
        const res = await quizLatePaymentsService.getUnpaidPlayers(room.room_id);
        setOutstandingCount(res.players?.length || 0);
      } catch (e) {
        setOutstandingCount(0);
      }
    };
    run();
  }, [room.room_id, isCompleted]);

  // ============================================================================
  // TABLE VIEW
  // ============================================================================
  const tableView = (
    <div className="border-b border-gray-100 bg-white hover:bg-gray-50 transition-colors">
      <div className="min-w-[1050px] flex items-center gap-3 p-3">
        <div className="w-24 flex-shrink-0">
          <span className={`px-2 py-1 rounded-full border text-xs font-semibold inline-block text-center w-full ${getStatusBadgeColor(room.status)}`}>
            {room.status === 'scheduled' ? 'Scheduled' :
              room.status === 'live' ? 'Live' :
                room.status === 'completed' ? 'Done' : 'Cancelled'}
          </span>
        </div>

        <div className="w-32 flex-shrink-0 text-xs">
          {room.scheduled_at ? (
            <>
              <div className="font-semibold text-gray-900">
                {new Date(room.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div className="text-gray-500">
                {new Date(room.scheduled_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>

        <div className="w-20 flex-shrink-0 text-xs font-semibold text-gray-900">
          {parseFloat(entryFee) > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
        </div>

        <div className="w-16 flex-shrink-0 text-xs font-semibold text-center">
          {stats ? (
            <span className="text-orange-700">{ticketsSold}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>

        <div className="w-16 flex-shrink-0 text-xs font-semibold text-center">
          {stats ? (
            <span className="text-indigo-700">{uniquePlayers}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>

        <div className="w-16 flex-shrink-0 text-xs font-semibold text-center text-gray-700">
          {maxPlayers > 0 ? maxPlayers : '—'}
        </div>

        <div className="w-24 flex-shrink-0 text-xs font-semibold text-right">
          {stats && totalIncome > 0 ? (
            <span className="text-green-700">{currencySymbol}{totalIncome.toFixed(2)}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>

        <div className="flex-1 min-w-0 text-xs">
          {enabledExtras.length > 0 ? (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-yellow-600 flex-shrink-0" />
              <span className="text-gray-700 truncate">
                {enabledExtras.slice(0, 2).map(e => e.label).join(', ')}
                {enabledExtras.length > 2 && ` +${enabledExtras.length - 2}`}
              </span>
            </div>
          ) : (
            <span className="text-gray-400">None</span>
          )}
        </div>

        <div className="w-16 flex-shrink-0 text-xs font-semibold text-gray-900 text-right">
          {prizeValue > 0 ? `${currencySymbol}${prizeValue}` : '—'}
        </div>

        <div className="w-72 lg:w-80 flex items-center justify-end gap-1 flex-shrink-0">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(room)}
              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <Edit className="h-3.5 w-3.5 text-gray-700" />
            </button>
          )}

          {isScheduled && (
            <button
              type="button"
              onClick={handlePersonalise}
              className="p-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              title="Personalise questions"
            >
              <Plus className="h-3.5 w-3.5 text-indigo-700" />
            </button>
          )}

          {isScheduled && (
            <button
              type="button"
              onClick={handleLinkPaymentMethod}
              className="p-1.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              title="Link payment method"
            >
              <CreditCard className="h-3.5 w-3.5 text-emerald-700" />
            </button>
          )}

          {showTicketActionsWithPayment && (
            <button
              type="button"
              onClick={copyTicketLink}
              className="p-1.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
              title={copied ? 'Copied!' : 'Copy ticket purchase link'}
            >
              {copied ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-blue-700" />
              )}
            </button>
          )}

          {showTicketActionsWithPayment && (
            <button
              type="button"
              onClick={() => setTicketModalOpen(true)}
              className="p-1.5 rounded border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
              title="Manage tickets"
            >
              <Ticket className="h-3.5 w-3.5 text-purple-700" />
            </button>
          )}

          {!isCancelled && onLinkToEvent && onUnlinkFromEvent && (
            <button
              type="button"
              onClick={() => isLinked && onUnlinkFromEvent ? onUnlinkFromEvent(room) : onLinkToEvent?.(room)}
              className={`p-1.5 rounded border transition-colors ${isLinked ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100' : 'border-indigo-200 hover:bg-indigo-50'
                }`}
              title={isLinked ? 'Unlink from event' : 'Link to event'}
            >
              {isLinked ? <Unlink className="h-3.5 w-3.5 text-indigo-700" /> : <Link2 className="h-3.5 w-3.5 text-indigo-700" />}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(room)}
              className="p-1.5 rounded border border-red-200 hover:bg-red-50 transition-colors"
              title="Cancel"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-600" />
            </button>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={handleManageOutstandingPayments}
              className="relative p-1.5 rounded border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors"
              title="Manage outstanding payments"
            >
              <DollarSign className="h-3.5 w-3.5 text-orange-700" />
              {outstandingCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-bold">
                  {outstandingCount}
                </span>
              )}
            </button>
          )}

          {showReportButton && (
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="p-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors"
              title="View financial report"
            >
              <BarChart3 className="h-3.5 w-3.5 text-indigo-700" />
            </button>
          )}

          {!isCompleted && !isCancelled && (
            <button
              type="button"
              onClick={() => onOpenRoom(room.room_id, room.host_id)}
              disabled={!canOpen}
              className={`inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${canOpen ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
              {canOpen ? <Play className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              Open
            </button>
          )}

          {isCompleted && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-gray-100 text-gray-600 text-xs font-semibold">
              <CheckCircle className="h-3.5 w-3.5" />
              Done
            </span>
          )}
        </div>
      </div>

      {isLinked && linkedEventTitle && (
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded border border-indigo-200 inline-flex">
            <Link2 className="h-3 w-3 flex-shrink-0" />
            <span>Linked: <span className="font-semibold">{linkedEventTitle}</span></span>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // CARD VIEW
  // ============================================================================
  const cardView = (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <h3 className="text-base font-semibold text-gray-900">
                {formatDate(room.scheduled_at)}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border ${getStatusBadgeColor(room.status)}`}>
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </span>

              {mins !== null && isScheduled && mins > 0 && (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
                  <Clock className="h-3 w-3 mr-1" />
                  {mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`}
                </span>
              )}

              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                {selectedTemplate}
              </span>

              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-mono text-gray-600">
                {room.room_id.slice(0, 8)}...
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(room)}
                className="rounded p-1.5 text-gray-600 hover:bg-gray-100 transition-colors"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}

            {canCancel && (
              <button
                type="button"
                onClick={() => onCancel(room)}
                className="rounded p-1.5 text-red-600 hover:bg-red-50 transition-colors"
                title="Cancel"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {isLinked && linkedEventTitle && (
          <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
            <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Linked to: <span className="font-semibold">{linkedEventTitle}</span></span>
          </div>
        )}
      </div>

      {/* Key Details */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">
            {formatDate(room.scheduled_at)} at {formatTime(room.scheduled_at)}
          </span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Target className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="truncate">Host: <span className="font-semibold">{hostName}</span></span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Layers className="h-4 w-4 text-gray-400 shrink-0" />
          <span>{rounds.length} round{rounds.length !== 1 ? 's' : ''}</span>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500">Tickets</div>
              <div className="text-sm font-bold text-orange-700">{ticketsSold}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Players</div>
              <div className="text-sm font-bold text-indigo-700">{uniquePlayers}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">Max</div>
              <div className="text-sm font-bold text-gray-700">{maxPlayers || '—'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Financials */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600">Entry Fee:</span>
          <span className={`font-semibold ${parseFloat(entryFee) > 0 ? 'text-green-600' : 'text-gray-900'}`}>
            {parseFloat(entryFee) > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
          </span>
        </div>

        {stats && totalIncome > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Total Income:</span>
            <span className="font-semibold text-green-600">
              {currencySymbol}{totalIncome.toFixed(2)}
            </span>
          </div>
        )}

        {prizeCount > 0 && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Prize Pool:</span>
            <span className="font-semibold text-gray-900">
              {currencySymbol}{prizeValue} ({prizeCount} {prizeCount === 1 ? 'prize' : 'prizes'})
            </span>
          </div>
        )}
      </div>

      {/* Extras Preview */}
      {enabledExtras.length > 0 && (
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-3.5 w-3.5 text-yellow-600" />
            <span className="text-xs font-semibold text-gray-700">
              {enabledExtras.length} Extra{enabledExtras.length !== 1 ? 's' : ''} Available
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {enabledExtras.slice(0, 4).map((extra) => (
              <span
                key={extra.key}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200 font-medium"
              >
                <Tag className="h-3 w-3" />
                {extra.label} {currencySymbol}{extra.price}
              </span>
            ))}
            {enabledExtras.length > 4 && (
              <span className="text-xs text-gray-500 font-medium self-center">
                +{enabledExtras.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-100 space-y-2">
        {!isCompleted && !isCancelled && (
          <button
            type="button"
            onClick={() => onOpenRoom(room.room_id, room.host_id)}
            disabled={!canOpen}
            className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition
              ${canOpen ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
          >
            {canOpen ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {canOpen ? 'Open Quiz Room' : 'Opens 1 hour before'}
          </button>
        )}

        {isCompleted && (
          <div className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold">
            <CheckCircle className="h-4 w-4" />
            Quiz Completed
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit(room)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}

          {isScheduled && (
            <button
              type="button"
              onClick={handlePersonalise}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Round
            </button>
          )}

          {isScheduled && (
            <button
              type="button"
              onClick={handleLinkPaymentMethod}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Payment
            </button>
          )}

          {showTicketActionsWithPayment && (
            <button
              type="button"
              onClick={copyTicketLink}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Link
                </>
              )}
            </button>
          )}

          {showTicketActionsWithPayment && (
            <button
              type="button"
              onClick={() => setTicketModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
            >
              <Ticket className="h-4 w-4" />
              Tickets
            </button>
          )}

          {!isCancelled && onLinkToEvent && onUnlinkFromEvent && (
            <button
              type="button"
              onClick={() => isLinked && onUnlinkFromEvent ? onUnlinkFromEvent(room) : onLinkToEvent?.(room)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${isLinked
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                : 'border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                }`}
            >
              {isLinked ? (
                <>
                  <Unlink className="h-4 w-4" />
                  Unlink
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Link Event
                </>
              )}
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel(room)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Cancel
            </button>
          )}

          {isCompleted && (
            <button
              type="button"
              onClick={handleManageOutstandingPayments}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              <DollarSign className="h-4 w-4" />
              Payments
            </button>
          )}

          {showReportButton && (
            <button
              type="button"
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <BarChart3 className="h-4 w-4" />
              Report
            </button>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {expanded ? 'Hide' : 'Show'} Round Details
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {rounds.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <h5 className="text-sm font-semibold text-gray-900">Rounds ({rounds.length})</h5>
                </div>

                <div className="space-y-2">
                  {rounds.map((round, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-bold text-indigo-600">Round {round.roundNumber}</span>
                        <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                          {round.roundType.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyColor(round.difficulty)}`}>
                          {round.difficulty}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div><span className="text-gray-500">Category:</span><span className="ml-1 font-medium text-gray-900">{round.category}</span></div>
                        <div><span className="text-gray-500">Questions:</span><span className="ml-1 font-medium text-gray-900">{round.config.questionsPerRound}</span></div>
                        <div><span className="text-gray-500">Time/Q:</span><span className="ml-1 font-medium text-gray-900">{round.config.timePerQuestion}s</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">No rounds configured</div>
            )}

            {enabledExtras.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <h5 className="text-sm font-semibold text-gray-900">All Extras ({enabledExtras.length})</h5>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {enabledExtras.map((extra) => (
                    <div key={extra.key} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-xs font-medium text-gray-900">{extra.label}</span>
                      <span className="text-xs font-bold text-yellow-700">{currencySymbol}{extra.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {config.prizes && config.prizes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-4 w-4 text-yellow-600" />
                  <h5 className="text-sm font-semibold text-gray-900">Prize Breakdown</h5>
                </div>

                <div className="space-y-2">
                  {config.prizes.map((prize, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <span className="text-xs text-gray-700">{prize.description || `Place #${prize.place}`}</span>
                      <span className="text-xs font-bold text-yellow-700">{currencySymbol}{prize.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!canOpen && isScheduled && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>This quiz room becomes available 1 hour before the scheduled start time</span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {viewMode === 'table' ? tableView : cardView}

      {ticketModalOpen && (
        <TicketManagerModal
          roomId={room.room_id}
          roomName={`${formatDateTime(room.scheduled_at, room.time_zone)} - ${hostName}'s Quiz`}
          onClose={() => setTicketModalOpen(false)}
          confirmer={{
            id: confirmedBy,
            name: confirmedByName,
            role: confirmedByRole,
          }}
        />
      )}

      {reportModalOpen && (
        <QuizFinancialReportModal
          roomId={room.room_id}
          roomName={`${formatDateTime(room.scheduled_at, room.time_zone)} - ${hostName}'s Quiz`}
          currency={currencySymbol}
          onClose={() => setReportModalOpen(false)}
        />
      )}

      <QuizPaymentMethodsModal
        isOpen={paymentModalOpen}
        roomId={room.room_id}
        roomTitle={`${formatDateTime(room.scheduled_at, room.time_zone)} - ${hostName}'s Quiz`}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {
          console.log('Payment methods updated successfully');
        }}
      />

      {latePaymentsOpen && (
        <MarkLatePaymentModal
          isOpen={latePaymentsOpen}
          roomId={room.room_id}
          confirmedBy={confirmedBy}
          confirmedByName={confirmedByName}
          confirmedByRole={confirmedByRole}
          onClose={() => setLatePaymentsOpen(false)}
        />
      )}

      {/* ✅ NEW: Personalised Round Modal */}
      <PersonalisedRoundModal
        isOpen={personalisedOpen}
        onClose={() => setPersonalisedOpen(false)}
        roomId={room.room_id}
        roomTitle={`${formatDateTime(room.scheduled_at, room.time_zone)} - ${hostName}'s Quiz`}
        onSuccess={() => {
          // Optional: you can show a toast or refresh a badge if you add one later.
          console.log('Personalised round saved');
        }}
      />
    </>
  );
}