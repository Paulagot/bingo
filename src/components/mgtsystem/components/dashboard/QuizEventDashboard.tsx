// src/components/Quiz/pages/QuizEventDashboard.tsx
// ✅ FEATURES: Card/Table toggle, mobile-responsive, icon buttons, custom modals

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationsTicker from './NotificationsTicker';
import EditWeb2QuizWizardModal from '../../../Quiz/Wizard/EditWeb2QuizWizardModal';
import { eventIntegrationsService } from '../../services/EventIntegrationsService';
import LinkQuizToEventModal from '../../modals/LinkQuizToEventModal';
import UnlinkConfirmModal from '../../modals/Unlinkconfirmmodal';
import { QuizEventCard } from '../cards/QuizEventCard';

import { 
  Calendar, 
  Play, 
  PlusCircle, 
  Lock,
  RefreshCw,
  Users,
  Trophy,
  DollarSign,
  CalendarDays,
  Edit,
  CheckCircle,
  Clock,
  Zap,
  Link2,
  Unlink,
  Trash2,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';

import { quizApi } from '../../../../shared/api';
import { useAuthStore } from '../../../../features/auth';

import CancelQuizModal from '../../modals/CancelQuizModal';

import type { 
  Web2RoomListItem as Room,
  ParsedConfig,
} from '../../../../shared/api/quiz.api';
import { useQuizConfig } from '@/components/Quiz/hooks/useQuizConfig';

type StatusFilter = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'all';
type ViewMode = 'table' | 'cards';

function minutesUntil(dt: string | null): number | null {
  if (!dt) return null;
  const t = new Date(dt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 60000);
}

function parseConfigJson(configStr: string | ParsedConfig | null | undefined, roomId?: string): ParsedConfig {
  const logPrefix = `[parseConfigJson${roomId ? ` ${roomId.slice(0, 8)}` : ''}]`;
  
  if (configStr === undefined || !configStr) {
    console.warn(`${logPrefix} ⚠️ No config_json provided`);
    return {};
  }

  if (typeof configStr === 'object' && configStr !== null) {
    return configStr as ParsedConfig;
  }

  if (typeof configStr === 'string') {
    try {
      return JSON.parse(configStr) as ParsedConfig;
    } catch (error) {
      console.error(`${logPrefix} ❌ Failed to parse JSON:`, error);
      return {};
    }
  }

  return {};
}

function canUseEventLinking(ents: any): boolean {
  console.log('🔍 [canUseEventLinking] Checking:', {
    ents,
    hasQuizFeatures: !!ents?.quiz_features,
    eventLinking: ents?.quiz_features?.eventLinking,
    plan_id: ents?.plan_id,
    plan_code: ents?.plan_code,
  });
  
  if (!ents) return false;
  
  // v2 approach: check quiz_features.eventLinking
  if (ents?.quiz_features?.eventLinking === true) return true;
  if (ents?.quizFeatures?.eventLinking === true) return true;
  
  // Fallback: DEV plan only
  if (ents?.plan_code === 'DEV' || ents?.plan_id === 2) return true;
  
  return false;
}


function extractCreditsRemaining(ents: any): number {
  if (!ents) return 0;

  const candidates = [
    ents.game_credits_remaining,
    ents.creditsRemaining,
    ents.quizCreditsRemaining,
    ents.credits,
    ents.remainingCredits,
    ents.remaining_credits,
    ents.quiz_credits_remaining,
    ents.web2_quiz_credits_remaining,
    ents.web2CreditsRemaining,
    ents.web2_credits_remaining,
    ents?.entitlements?.creditsRemaining,
    ents?.entitlements?.quizCreditsRemaining,
    ents?.entitlements?.credits,
  ];

  const first = candidates.find((v) => v !== undefined && v !== null);
  const n = typeof first === 'string' ? Number(first) : typeof first === 'number' ? first : 0;
  return Number.isFinite(n) ? n : 0;
}

function extractMaxPlayers(ents: any): number {
  if (!ents) return 0;
  
  const maxPlayers = ents.max_players_per_game || ents.maxPlayersPerGame || ents.maxPlayers || 0;
  return Number(maxPlayers);
}

const EXTRA_LABELS: Record<string, string> = {
  buyHint: 'Hint',
  restorePoints: 'Restore',
  freezeOutTeam: 'Freeze',
  robPoints: 'Rob',
  skipQuestion: 'Skip',
  doublePoints: '2x Points',
};

interface QuizEventRowProps {
  room: Room;
  onOpenRoom: (roomId: string, hostId: string) => void;
  onEdit: (room: Room) => void;
  onCancel: (room: Room) => void;
  onLinkToEvent: (room: Room) => void;
  onUnlinkFromEvent: (room: Room) => void;
  linkedEventTitle?: string;
  linkedEventId?: string;
  showEventLinking: boolean;
}

function QuizEventRow({ 
  room, 
  onOpenRoom, 
  onEdit, 
  onCancel, 
  onLinkToEvent, 
  onUnlinkFromEvent,
  linkedEventTitle,
  linkedEventId,
  showEventLinking,
}: QuizEventRowProps) {
  const config = parseConfigJson(room.config_json, room.room_id);
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
  
  const canEdit = isScheduled;
  const canCancel = isScheduled;

  const prizeValue = config.prizes?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
  const maxPlayers = config.roomCaps?.maxPlayers || 0;
  const entryFee = config.entryFee || '0';
  const currencySymbol = config.currencySymbol || '€';
  
  const enabledExtrasWithPrices = Object.entries(config.fundraisingOptions || {})
    .filter(([_, enabled]) => enabled === true)
    .map(([key]) => ({
      key,
      label: EXTRA_LABELS[key] || key,
      price: config.fundraisingPrices?.[key] || 0
    }));

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <>
      {/* 📱 MOBILE CARD VIEW */}
      <div className="lg:hidden border-b border-gray-100 p-4 hover:bg-gray-50 transition-colors">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <div className="text-sm">
                {room.scheduled_at ? (
                  <>
                    <p className="font-semibold text-gray-900">
                      {new Date(room.scheduled_at).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(room.scheduled_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">Not scheduled</p>
                )}
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold ${getStatusBadgeColor(room.status)}`}>
              {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-gray-900">
                {parseFloat(entryFee) > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
              </span>
            </div>
            {maxPlayers > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-gray-900">{maxPlayers}</span>
              </div>
            )}
            {prizeValue > 0 && (
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-600" />
                <span className="font-semibold text-gray-900">{currencySymbol}{prizeValue}</span>
              </div>
            )}
            {enabledExtrasWithPrices.length > 0 && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <span className="text-xs font-semibold text-gray-700">
                  {enabledExtrasWithPrices.length} extras
                </span>
              </div>
            )}
          </div>

          {enabledExtrasWithPrices.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {enabledExtrasWithPrices.map((extra) => (
                <span
                  key={extra.key}
                  className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200 font-medium"
                >
                  {extra.label} {currencySymbol}{extra.price}
                </span>
              ))}
            </div>
          )}

          {isLinked && linkedEventTitle && (
            <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200">
              <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="font-semibold">{linkedEventTitle}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(room)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                title="Edit"
              >
                <Edit className="h-4 w-4 text-gray-700" />
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => onCancel(room)}
                className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                title="Cancel"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            )}
            {showEventLinking && !isCancelled && (
              <button
                type="button"
                onClick={() => isLinked ? onUnlinkFromEvent(room) : onLinkToEvent(room)}
                className={`p-2 rounded-lg border transition-colors ${
                  isLinked
                    ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                    : 'border-indigo-200 hover:bg-indigo-50'
                }`}
                title={isLinked ? 'Unlink' : 'Link'}
              >
                {isLinked ? (
                  <Unlink className="h-4 w-4 text-indigo-700" />
                ) : (
                  <Link2 className="h-4 w-4 text-indigo-700" />
                )}
              </button>
            )}
            <div className="flex-1" />
            {!isCompleted && !isCancelled && (
              <button
                type="button"
                onClick={() => onOpenRoom(room.room_id, room.host_id)}
                disabled={!canOpen}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap
                  ${
                    canOpen
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {canOpen ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Open
              </button>
            )}
            {isCompleted && (
              <span className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">
                <CheckCircle className="h-4 w-4" />
                Done
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 🖥️ DESKTOP TABLE ROW */}
      <div className="hidden lg:block border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <div className="flex items-center p-3">
          {/* Status - 100px */}
          <div className="w-[100px] flex-shrink-0">
            <span className={`px-2.5 py-1 rounded-full border text-xs font-semibold inline-block text-center w-full ${getStatusBadgeColor(room.status)}`}>
              {room.status === 'scheduled' ? 'Scheduled' : 
               room.status === 'live' ? 'Live' : 
               room.status === 'completed' ? 'Done' : 'Cancelled'}
            </span>
          </div>

          {/* Date & Time - 140px */}
          <div className="w-[140px] flex-shrink-0 px-2">
            <div className="flex items-start gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs min-w-0">
                {room.scheduled_at ? (
                  <>
                    <p className="font-semibold text-gray-900 whitespace-nowrap truncate">
                      {new Date(room.scheduled_at).toLocaleDateString('en-GB', { 
                        day: 'numeric', 
                        month: 'short'
                      })}
                    </p>
                    <p className="text-gray-500 whitespace-nowrap">
                      {new Date(room.scheduled_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-gray-400">—</p>
                )}
              </div>
            </div>
          </div>

          {/* Entry Fee - 90px */}
          <div className="w-[90px] flex-shrink-0 px-2">
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900 truncate">
                {parseFloat(entryFee) > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
              </span>
            </div>
          </div>

          {/* Extras - flex */}
          <div className="flex-1 min-w-0 px-2">
            {enabledExtrasWithPrices.length > 0 ? (
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                <div className="flex flex-wrap gap-1 min-w-0">
                  {enabledExtrasWithPrices.slice(0, 3).map((extra) => (
                    <span
                      key={extra.key}
                      className="text-xs px-1.5 py-0.5 bg-yellow-50 text-yellow-700 rounded border border-yellow-200 font-medium whitespace-nowrap"
                    >
                      {extra.label} {currencySymbol}{extra.price}
                    </span>
                  ))}
                  {enabledExtrasWithPrices.length > 3 && (
                    <span className="text-xs text-gray-500 font-medium">
                      +{enabledExtrasWithPrices.length - 3}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs text-gray-400">None</span>
            )}
          </div>

          {/* Players - 80px */}
          <div className="w-[80px] flex-shrink-0 px-2">
            {maxPlayers > 0 ? (
              <div className="flex items-center gap-1.5 justify-end">
                <Users className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-900">{maxPlayers}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 text-right block">—</span>
            )}
          </div>

          {/* Prizes - 90px */}
          <div className="w-[90px] flex-shrink-0 px-2">
            {prizeValue > 0 ? (
              <div className="flex items-center gap-1.5 justify-end">
                <Trophy className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-900">
                  {currencySymbol}{prizeValue}
                </span>
              </div>
            ) : (
              <span className="text-xs text-gray-400 text-right block">—</span>
            )}
          </div>

          {/* Actions - fixed width */}
          <div className="w-[240px] flex items-center justify-end gap-1.5 flex-shrink-0 pl-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(room)}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                title="Edit quiz"
              >
                <Edit className="h-3.5 w-3.5 text-gray-700" />
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                onClick={() => onCancel(room)}
                className="p-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                title="Cancel quiz"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </button>
            )}
           {showEventLinking && !isCancelled && (
              <button
                type="button"
                onClick={() => isLinked ? onUnlinkFromEvent(room) : onLinkToEvent(room)}
                className={`p-2 rounded-lg border transition-colors ${
                  isLinked
                    ? 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100'
                    : 'border-indigo-200 hover:bg-indigo-50'
                }`}
                title={isLinked ? `Unlink from ${linkedEventTitle}` : 'Link to event'}
              >
                {isLinked ? (
                  <Unlink className="h-3.5 w-3.5 text-indigo-700" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 text-indigo-700" />
                )}
              </button>
            )}
            {!isCompleted && !isCancelled && (
              <button
                type="button"
                onClick={() => onOpenRoom(room.room_id, room.host_id)}
                disabled={!canOpen}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap
                  ${
                    canOpen
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {canOpen ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Open
              </button>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-semibold">
                <CheckCircle className="h-4 w-4" />
                Done
              </span>
            )}
          </div>
        </div>
        
        {isLinked && linkedEventTitle && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 inline-flex">
              <Link2 className="h-3 w-3 flex-shrink-0" />
              <span>Linked: <span className="font-semibold">{linkedEventTitle}</span></span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function QuizEventDashboard() {
  const navigate = useNavigate();

  const clubName = useAuthStore(
    (s: any) => s.user?.club_name || s.user?.clubName || s.user?.club?.name || 'Your Club'
  );

  


  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [editOpen, setEditOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  
  const openEditModal = (room: Room) => {
    setEditRoomId(room.room_id);
    setEditOpen(true);
  };

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkRoom, setLinkRoom] = useState<Room | null>(null);

  const openLinkModal = (room: Room) => {
    setLinkRoom(room);
    setLinkOpen(true);
  };

  const closeLinkModal = () => {
    setLinkOpen(false);
    setLinkRoom(null);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditRoomId(null);
  };

  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [unlinkRoom, setUnlinkRoom] = useState<Room | null>(null);
  const [unlinkLoading, setUnlinkLoading] = useState(false);

  const [ents, setEnts] = useState<any>(null);
  const [entsLoading, setEntsLoading] = useState(true);
  const [entsError, setEntsError] = useState<string | null>(null);
  const showEventLinking = useMemo(() => canUseEventLinking(ents), [ents]);

  const [status, setStatus] = useState<StatusFilter>('all');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [linkedEvents, setLinkedEvents] = useState<Record<string, { eventId: string; eventTitle: string }>>({});

  const creditsRemaining = useMemo(() => extractCreditsRemaining(ents), [ents]);
  const maxPlayersFromPlan = useMemo(() => extractMaxPlayers(ents), [ents]);
  const canLaunchWizard = !entsLoading && !entsError && creditsRemaining > 0;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelRoom, setCancelRoom] = useState<Room | null>(null);
  const [cancelConfig, setCancelConfig] = useState<ParsedConfig | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const sortedRooms = useMemo(() => {
    const statusPriority: Record<string, number> = {
      live: 1,
      scheduled: 2,
      completed: 3,
      cancelled: 4,
    };

    return [...rooms].sort((a, b) => {
      const aPriority = statusPriority[a.status] || 999;
      const bPriority = statusPriority[b.status] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      const aTime = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
      const bTime = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
      
      return aTime - bTime;
    });
  }, [rooms]);

  const stats = useMemo(() => {
    const total = rooms.length;
    const upcoming = rooms.filter(r => r.status === 'scheduled').length;
    const live = rooms.filter(r => r.status === 'live').length;
    const completed = rooms.filter(r => r.status === 'completed').length;

    return { total, upcoming, live, completed };
  }, [rooms]);

 const loadEntitlements = async () => {
  try {
    setEntsLoading(true);
    setEntsError(null);
    const data = await quizApi.getEntitlements();
    
    // ✅ ADD THIS DEBUG LOG
    console.log('🔍 [Entitlements Debug]', {
      raw: data,
      plan_id: data?.plan_id,
      plan_code: data?.plan_code,
      quiz_features: data?.quiz_features,
      quizFeatures: data?.quizFeatures,
    });
    
    setEnts(data);
  } catch (e: any) {
    console.error('[QuizEventDashboard] Entitlements load failed:', e);
    setEnts(null);
    setEntsError(e?.message || 'Failed to load entitlements');
  } finally {
    setEntsLoading(false);
  }
};

  const loadLinkedEvents = async (roomIds: string[]) => {
    if (roomIds.length === 0) {
      setLinkedEvents({});
      return;
    }

    try {
      console.log('[QuizEventDashboard] 🔗 Loading linked events for', roomIds.length, 'rooms');
      
      const response = await eventIntegrationsService.lookupLinks({
        integration_type: 'quiz_web2',
        external_refs: roomIds,
      });
      
      console.log('[QuizEventDashboard] 🔗 Found', response.links?.length || 0, 'linked events');

      const linkMap: Record<string, { eventId: string; eventTitle: string }> = {};
      
      for (const link of response.links || []) {
        if (link.external_ref && link.event_id && link.event_title) {
          linkMap[link.external_ref] = {
            eventId: link.event_id,
            eventTitle: link.event_title,
          };
        }
      }

      setLinkedEvents(linkMap);
    } catch (e: any) {
      console.error('[QuizEventDashboard] ❌ Failed to load linked events:', e);
      setLinkedEvents({});
    }
  };

  const loadRooms = async (s: StatusFilter) => {
    try {
      setRoomsLoading(true);
      setRoomsError(null);
      
      console.log('[QuizEventDashboard] 📡 Fetching rooms with status:', s);
      const res = await quizApi.getWeb2RoomsList({ status: s, time: 'all' });
      
      console.log('[QuizEventDashboard] 📥 Received rooms:', res.rooms?.length || 0);
      
      setRooms(res.rooms || []);
      
      const roomIds = (res.rooms || []).map(r => r.room_id);
      await loadLinkedEvents(roomIds);
      
    } catch (e: any) {
      console.error('[QuizEventDashboard] ❌ Failed:', e);
      setRooms([]);
      setRoomsError(e?.message || 'Failed to load events');
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    loadEntitlements();
  }, []);

  useEffect(() => {
    loadRooms(status);
  }, [status]);

  const goToWizard = () => {
    navigate('/quiz/create-fundraising-quiz?openWizard=1');
  };

  const openRoom = (roomId: string, hostId: string) => {
    console.log('[QuizEventDashboard] 🧹 Clearing all Web3 state before opening Web2 room:', roomId);
    
    localStorage.removeItem('quiz-setup-v2');
    localStorage.removeItem('quiz-admins');
    localStorage.removeItem('fundraisely-quiz-setup-draft');
    localStorage.removeItem('current-room-id');
    localStorage.removeItem('current-host-id');
    localStorage.removeItem('current-contract-address');
    
    useQuizConfig.getState().resetConfig();
    
    console.log('[QuizEventDashboard] ✅ Cleared, navigating to Web2 room');
    
    navigate(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hostId)}`);
  };

  const handleEdit = (room: Room) => {
    if (room.status !== 'scheduled') return;
    console.log('[QuizEventDashboard] ✏️ Edit room:', room.room_id);
    openEditModal(room);
  };

  const handleEditSaved = async () => {
    await loadRooms(status);
  };

  const handleCancel = (room: Room) => {
    setCancelError(null);
    setCancelRoom(room);
    setCancelConfig(parseConfigJson(room.config_json));
    setCancelOpen(true);
  };

  const confirmCancel = async () => {
    if (!cancelRoom) return;

    try {
      setCancelLoading(true);
      setCancelError(null);

      await quizApi.cancelWeb2Room(cancelRoom.room_id);

      setRooms((prev) =>
        prev.map((r) =>
          r.room_id === cancelRoom.room_id
            ? { ...r, status: 'cancelled', updated_at: new Date().toISOString() }
            : r
        )
      );

      setCancelOpen(false);
      setCancelRoom(null);
      setCancelConfig(null);
    } catch (e: any) {
      console.error('[QuizEventDashboard] ❌ Cancel failed:', e);
      setCancelError(e?.message || 'Failed to cancel quiz');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUnlinkRequest = (room: Room) => {
    setUnlinkRoom(room);
    setUnlinkModalOpen(true);
  };

  const confirmUnlink = async () => {
    if (!unlinkRoom) return;

    const linked = linkedEvents[unlinkRoom.room_id];
    if (!linked) return;

    try {
      setUnlinkLoading(true);
      
      console.log('[QuizEventDashboard] 🔓 Unlinking room', unlinkRoom.room_id, 'from event', linked.eventId);
      
      const integrationsResponse = await eventIntegrationsService.list(linked.eventId);
      const integration = integrationsResponse.integrations?.find(
        (int) => int.external_ref === unlinkRoom.room_id
      );
      
      if (!integration) {
        throw new Error('Integration not found');
      }
      
      await eventIntegrationsService.unlink(linked.eventId, integration.id);
      
      setLinkedEvents(prev => {
        const updated = { ...prev };
        delete updated[unlinkRoom.room_id];
        return updated;
      });

      console.log('[QuizEventDashboard] ✅ Unlinked successfully');
      
      setUnlinkModalOpen(false);
      setUnlinkRoom(null);
    } catch (e: any) {
      console.error('[QuizEventDashboard] ❌ Unlink failed:', e);
      alert(`Failed to unlink: ${e?.message || 'Unknown error'}`);
    } finally {
      setUnlinkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <NotificationsTicker />
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quiz Events</h1>
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{clubName}</span>
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/quiz/create-fundraising-quiz')}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition whitespace-nowrap
                        bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              title="View demo"
            >
              <Play className="h-4 w-4" />
              <span className="hidden sm:inline">Demo</span>
            </button>

            <button
              type="button"
              onClick={goToWizard}
              disabled={!canLaunchWizard}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition whitespace-nowrap
                ${
                  canLaunchWizard
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
              <PlusCircle className="h-4 w-4" />
              Create Quiz
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-indigo-100">
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Total</p>
                <p className="text-lg sm:text-xl font-bold text-indigo-600">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Upcoming</p>
                <p className="text-lg sm:text-xl font-bold text-blue-600">{stats.upcoming}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Done</p>
                <p className="text-lg sm:text-xl font-bold text-gray-600">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-green-100">
                <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Credits</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg sm:text-xl font-bold text-green-600">
                    {entsLoading ? '...' : entsError ? 'N/A' : creditsRemaining}
                  </p>
                  <button
                    type="button"
                    onClick={loadEntitlements}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Refresh"
                  >
                    <RefreshCw className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-purple-100">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Plan Limit</p>
                <p className="text-lg sm:text-xl font-bold text-purple-600">
                  {entsLoading ? '...' : entsError ? 'N/A' : `${maxPlayersFromPlan}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs + View Toggle */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap flex-1">
              {(['all', 'scheduled', 'live', 'completed', 'cancelled'] as StatusFilter[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                    status === s
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Table view"
              >
                <LayoutList className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'cards'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Card view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Events Content */}
        {viewMode === 'cards' ? (
          // CARD VIEW
          <div className="space-y-4">
            {roomsLoading ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading events…</p>
              </div>
            ) : roomsError ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="text-sm font-semibold text-red-600">Failed to load events</div>
                <div className="mt-2 text-xs text-gray-600">Error: {roomsError}</div>
                <button
                  type="button"
                  onClick={() => loadRooms(status)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            ) : sortedRooms.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
                  <Calendar className="h-8 w-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {status === 'all' ? 'No quiz events yet' : `No ${status} events`}
                </h3>
                {(status === 'all' || status === 'scheduled') && (
                  <>
                    <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto px-4">
                      Create your first fundraising quiz event in minutes!
                    </p>
                    <button
                      type="button"
                      onClick={goToWizard}
                      disabled={!canLaunchWizard}
                      className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold shadow-sm transition
                        ${
                          canLaunchWizard
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        }`}
                    >
                      <PlusCircle className="h-5 w-5" />
                      Create Quiz Event
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {sortedRooms.map((room) => (
                  <QuizEventCard
                    key={room.room_id}
                    room={room}
                    onOpenRoom={openRoom}
                    onEdit={handleEdit}
                    onCancel={handleCancel}
                    onLinkToEvent={openLinkModal}
                    onUnlinkFromEvent={handleUnlinkRequest}
                    linkedEventTitle={linkedEvents[room.room_id]?.eventTitle}
                    linkedEventId={linkedEvents[room.room_id]?.eventId}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // TABLE VIEW
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Quiz Events</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {sortedRooms.length} event{sortedRooms.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Desktop Table Header */}
            <div className="hidden lg:block border-b border-gray-200 bg-gray-50">
              <div className="flex items-center p-3">
                <div className="w-[100px] flex-shrink-0">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Status</span>
                </div>
                <div className="w-[140px] flex-shrink-0 px-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Date</span>
                </div>
                <div className="w-[90px] flex-shrink-0 px-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Fee</span>
                </div>
                <div className="flex-1 px-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Extras</span>
                </div>
                <div className="w-[80px] flex-shrink-0 px-2 text-right">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Players</span>
                </div>
                <div className="w-[90px] flex-shrink-0 px-2 text-right">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Prizes</span>
                </div>
                <div className="w-[240px] flex-shrink-0 pl-2 text-right">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Actions</span>
                </div>
              </div>
            </div>

            {/* Table Body */}
            <div>
              {roomsLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading events…</p>
                </div>
              ) : roomsError ? (
                <div className="text-center py-12">
                  <div className="text-sm font-semibold text-red-600">Failed to load events</div>
                  <div className="mt-2 text-xs text-gray-600">Error: {roomsError}</div>
                  <button
                    type="button"
                    onClick={() => loadRooms(status)}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              ) : sortedRooms.length === 0 ? (
                <div className="text-center py-12 sm:py-16">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
                    <Calendar className="h-8 w-8 text-indigo-400" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {status === 'all' ? 'No quiz events yet' : `No ${status} events`}
                  </h3>
                  
                  {(status === 'all' || status === 'scheduled') && (
                    <>
                      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto px-4">
                        Create your first fundraising quiz event in minutes!
                      </p>
                      <button
                        type="button"
                        onClick={goToWizard}
                        disabled={!canLaunchWizard}
                        className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold shadow-sm transition
                          ${
                            canLaunchWizard
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                      >
                        <PlusCircle className="h-5 w-5" />
                        Create Quiz Event
                      </button>
                    </>
                  )}
                </div>
              ) : (
                sortedRooms.map((room) => (
                  <QuizEventRow
                    key={room.room_id}
                    room={room}
                    onOpenRoom={openRoom}
                    onEdit={handleEdit}
                    onCancel={handleCancel}
                    onLinkToEvent={openLinkModal}
                    onUnlinkFromEvent={handleUnlinkRequest}
                    linkedEventTitle={linkedEvents[room.room_id]?.eventTitle}
                    linkedEventId={linkedEvents[room.room_id]?.eventId}
                     showEventLinking={showEventLinking}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editOpen && editRoomId && (
        <EditWeb2QuizWizardModal
          roomId={editRoomId}
          onClose={closeEditModal}
          onSaved={handleEditSaved}
        />
      )}

      <LinkQuizToEventModal
        open={linkOpen}
        room={linkRoom}
        onClose={closeLinkModal}
        onLinked={async () => {
          await loadRooms(status);
        }}
      />

      <UnlinkConfirmModal
        open={unlinkModalOpen}
        eventTitle={unlinkRoom ? linkedEvents[unlinkRoom.room_id]?.eventTitle || 'Unknown Event' : ''}
        onConfirm={confirmUnlink}
        onCancel={() => {
          if (!unlinkLoading) {
            setUnlinkModalOpen(false);
            setUnlinkRoom(null);
          }
        }}
        loading={unlinkLoading}
      />

      <CancelQuizModal
        open={cancelOpen}
        room={cancelRoom}
        config={cancelConfig}
        loading={cancelLoading}
        error={cancelError}
        onClose={() => {
          if (cancelLoading) return;
          setCancelOpen(false);
          setCancelRoom(null);
          setCancelConfig(null);
          setCancelError(null);
        }}
        onConfirm={confirmCancel}
      />
    </div>
  );
}

