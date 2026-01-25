// client/src/components/Quiz/events/QuizEventCard.tsx
import { useMemo, useState } from 'react';
import {
  Play, Lock, ChevronDown, ChevronUp,
  Users, Trophy, DollarSign, Gift, FileText, Zap, Target, Layers, Info, 
  Link2, Unlink, Edit, Trash2, Clock,
} from 'lucide-react';


import type { Web2RoomListItem } from '@/shared/api/quiz.api';
import { formatDateTime, minutesUntil, safeJsonParse } from '../../utils/QuizGameUtils';

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
  onOpenRoom,
  onEdit,
  onCancel,
  onLinkToEvent,
  onUnlinkFromEvent,
  linkedEventTitle,
  linkedEventId,
}: {
  room: Web2RoomListItem;
  onOpenRoom: (roomId: string, hostId: string) => void;
  onEdit?: (room: Web2RoomListItem) => void;
  onCancel?: (room: Web2RoomListItem) => void;
  onLinkToEvent?: (room: Web2RoomListItem) => void;
  onUnlinkFromEvent?: (room: Web2RoomListItem) => void;
  linkedEventTitle?: string | null;
  linkedEventId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);

  const config = useMemo(() => safeJsonParse<ParsedConfig>(room.config_json, {} as ParsedConfig), [room.config_json]);

  const mins = minutesUntil(room.scheduled_at);
  const isLive = room.status === 'live';
  const isScheduled = room.status === 'scheduled';
  const isCompleted = room.status === 'completed';
  const isCancelled = room.status === 'cancelled';
  const isLinked = !!linkedEventId;
  
  const canOpen = 
    !isCompleted && 
    !isCancelled && 
    (isLive || (isScheduled && mins !== null && mins <= 60));
  
  const canEdit = isScheduled && onEdit;
  const canCancel = isScheduled && onCancel;

  const prizeCount = config.prizes?.length || 0;
  const prizeValue = config.prizes?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
  const maxPlayers = config.roomCaps?.maxPlayers || 0;
  const entryFee = config.entryFee || '0';
  const hostName = config.hostName || 'Unknown';
  const currencySymbol = config.currencySymbol || '€';
  const selectedTemplate = config.selectedTemplate || 'Custom';
  const rounds = config.roundDefinitions || [];
  
  // Get enabled extras
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

  return (
    <div className="border border-gray-200 rounded-xl bg-white hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Clock className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <h4 className="text-base font-bold text-gray-900">
                {formatDateTime(room.scheduled_at, room.time_zone)}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full border font-semibold ${getStatusBadgeColor(room.status)}`}>
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </span>

              {mins !== null && isScheduled && mins > 0 && (
                <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-semibold">
                  Starts in {mins} min
                </span>
              )}

              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                <span className="font-mono font-semibold">{room.room_id.slice(0, 8)}...</span>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(room)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                title="Edit quiz"
              >
                <Edit className="h-4 w-4 text-gray-700" />
              </button>
            )}
            
            {canCancel && (
              <button
                type="button"
                onClick={() => onCancel(room)}
                className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                title="Cancel quiz"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            )}

           {!isCancelled && onLinkToEvent && onUnlinkFromEvent && (  
              <button
                type="button"
                onClick={() => isLinked && onUnlinkFromEvent ? onUnlinkFromEvent(room) : onLinkToEvent?.(room)}
                className={`p-2 rounded-lg border transition-colors ${
                  isLinked
                    ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                    : 'border-indigo-200 hover:bg-indigo-50'
                }`}
                title={isLinked ? `Unlink from ${linkedEventTitle}` : 'Link to event'}
              >
                {isLinked ? (
                  <Unlink className="h-4 w-4 text-indigo-700" />
                ) : (
                  <Link2 className="h-4 w-4 text-indigo-700" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onOpenRoom(room.room_id, room.host_id)}
              disabled={!canOpen}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap
                ${canOpen ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
              title={!canOpen ? 'Available 1 hour before start' : 'Open room'}
            >
              {canOpen ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Open
            </button>
          </div>
        </div>

        {/* Linked Event Badge */}
        {isLinked && linkedEventTitle && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
              <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Linked to: <span className="font-semibold">{linkedEventTitle}</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="p-5 border-b border-gray-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Template</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{selectedTemplate}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <DollarSign className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Entry Fee</p>
              <p className="text-sm font-semibold text-green-600">
                {parseFloat(entryFee) > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
              </p>
            </div>
          </div>

          {maxPlayers > 0 && (
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Max Players</p>
                <p className="text-sm font-semibold text-gray-900">{maxPlayers}</p>
              </div>
            </div>
          )}

          {prizeCount > 0 && (
            <div className="flex items-start gap-2">
              <Gift className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Prize Pool</p>
                <p className="text-sm font-semibold text-gray-900">
                  {currencySymbol}{prizeValue} ({prizeCount})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Extras Preview */}
        {enabledExtras.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
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
                  className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200 font-medium"
                >
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

        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-gray-400" />
          <p className="text-xs text-gray-500">
            Host: <span className="font-semibold text-gray-700">{hostName}</span>
          </p>
        </div>
      </div>

      {/* Expandable Details */}
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-b-xl"
        >
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {expanded ? 'Hide' : 'Show'} Details
          </span>
          {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
            {/* Rounds */}
            {rounds.length > 0 ? (
              <div className="pt-4">
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
              <div className="pt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-500">No rounds configured</div>
            )}

            {/* All Extras */}
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

            {/* Prize Breakdown */}
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

      {!canOpen && isScheduled && !expanded && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 p-2 rounded-lg">
            <Lock className="h-3 w-3" />
            This room becomes available <span className="font-semibold">1 hour before</span> the scheduled start.
          </p>
        </div>
      )}
    </div>
  );
}
