// src/components/Quiz/pages/QuizEventDashboard.tsx
// ✅ TABLE VIEW IS NOW DEFAULT
// ✅ Uses improved QuizEventCard for both views

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationsTicker from './NotificationsTicker';
import EditWeb2QuizWizardModal from '../../../Quiz/Wizard/EditWeb2QuizWizardModal';
import { eventIntegrationsService } from '../../services/EventIntegrationsService';
import LinkQuizToEventModal from '../../modals/LinkQuizToEventModal';
import UnlinkConfirmModal from '../../modals/Unlinkconfirmmodal';
import { QuizEventCard } from '../cards/QuizEventCard';
import ManagePaymentMethodsModal from '../../modals/ManagePaymentMethodsModal';
import QuizRoomsService, { type RoomStats } from '../../services/quizRoomServices';

import { 
  CreditCard,
  Calendar, 
  Play, 
  PlusCircle,
  RefreshCw,
  Users,
  Trophy,
  CalendarDays,
  CheckCircle,
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

const debug = false;

function parseConfigJson(configStr: string | ParsedConfig | null | undefined, roomId?: string): ParsedConfig {
  const logPrefix = `[parseConfigJson${roomId ? ` ${roomId.slice(0, 8)}` : ''}]`;
  
  if (configStr === undefined || !configStr) {
    if (debug) console.warn(`${logPrefix} ⚠️ No config_json provided`);
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
  if (debug) console.log('🔍 [canUseEventLinking] Checking:', {
    ents,
    hasQuizFeatures: !!ents?.quiz_features,
    eventLinking: ents?.quiz_features?.eventLinking,
    plan_id: ents?.plan_id,
    plan_code: ents?.plan_code,
  });
  
  if (!ents) return false;
  
  if (ents?.quiz_features?.eventLinking === true) return true;
  if (ents?.quizFeatures?.eventLinking === true) return true;
  
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

export default function QuizEventDashboard() {
  const navigate = useNavigate();

  const clubName = useAuthStore(
    (s: any) => s.user?.club_name || s.user?.clubName || s.user?.club?.name || 'Your Club'
  );
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const clubId = useAuthStore((s: any) => s.club?.club_id || s.user?.club_id);

  // ✅ TABLE VIEW IS NOW DEFAULT
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  const [editOpen, setEditOpen] = useState(false);
  const [editRoomId, setEditRoomId] = useState<string | null>(null);
  const [roomStats, setRoomStats] = useState<Record<string, RoomStats>>({});
const [_statsLoading, setStatsLoading] = useState(false);
  
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

  const [_ticketStats, setTicketStats] = useState<{ totalTickets: number; totalIncome: number } | null>(null);
  const [_ticketStatsLoading, setTicketStatsLoading] = useState(true);

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
      
      if (debug) console.log('🔍 [Entitlements Debug]', {
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
      if (debug) console.log('[QuizEventDashboard] 🔗 Loading linked events for', roomIds.length, 'rooms');
      
      const response = await eventIntegrationsService.lookupLinks({
        integration_type: 'quiz_web2',
        external_refs: roomIds,
      });
      
      if (debug) console.log('[QuizEventDashboard] 🔗 Found', response.links?.length || 0, 'linked events');

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

 // Add function to load stats (around line 250)
const loadRoomStats = async (roomIds: string[]) => {
  if (roomIds.length === 0) {
    setRoomStats({});
    return;
  }

  try {
    setStatsLoading(true);
    
    if (debug) console.log('[QuizEventDashboard] 📊 Loading stats for', roomIds.length, 'rooms');
    
    const stats = await QuizRoomsService.batchGetRoomStats(roomIds);
    
    if (debug) console.log('[QuizEventDashboard] ✅ Loaded stats:', stats);
    
    setRoomStats(stats);
    
  } catch (error) {
    console.error('[QuizEventDashboard] ❌ Failed to load room stats:', error);
    setRoomStats({});
  } finally {
    setStatsLoading(false);
  }
};

// Update loadRooms function (around line 270)
const loadRooms = async (s: StatusFilter) => {
  try {
    setRoomsLoading(true);
    setRoomsError(null);
    
    if (debug) console.log('[QuizEventDashboard] 📡 Fetching rooms with status:', s);
    const res = await quizApi.getWeb2RoomsList({ status: s, time: 'all' });
    
    if (debug) console.log('[QuizEventDashboard] 📥 Received rooms:', res.rooms?.length || 0);
    
    setRooms(res.rooms || []);
    
    const roomIds = (res.rooms || []).map(r => r.room_id);
    
    // ✅ Load both linked events AND stats in parallel
    await Promise.all([
      loadLinkedEvents(roomIds),
      loadRoomStats(roomIds)  // ✅ ADD THIS LINE
    ]);
    
  } catch (e: any) {
    console.error('[QuizEventDashboard] ❌ Failed:', e);
    setRooms([]);
    setRoomsError(e?.message || 'Failed to load events');
  } finally {
    setRoomsLoading(false);
  }
};

  const loadTicketStats = async () => {
    if (!clubId) {
      setTicketStatsLoading(false);
      return;
    }

    try {
      setTicketStatsLoading(true);
      
      if (debug) console.log('[QuizEventDashboard] 📊 Loading ticket stats for club:', clubId);
      
      // Get all completed and live rooms to calculate stats
      const res = await quizApi.getWeb2RoomsList({ status: 'all', time: 'all' });
      
      let totalTickets = 0;
      let totalIncome = 0;
      
      // Calculate from all rooms
      for (const room of res.rooms || []) {
        // Parse config to get ticket sales info if available
        const config = parseConfigJson(room.config_json, room.room_id);
        
        // You might have ticket sales data in the room object or need a separate API call
        // For now, we'll calculate based on entry fee and participants
        // Adjust this based on your actual data structure
        
        if (room.status === 'completed' || room.status === 'live') {
          const entryFee = parseFloat(config.entryFee || '0');
          // If you have actual ticket sales count, use that
          // const ticketsSold = room.tickets_sold || 0;
          // For now, assuming max_players as a placeholder
          // You should replace this with actual tickets sold data
          const participants = room.participants_count || 0;
          
          totalTickets += participants;
          totalIncome += entryFee * participants;
        }
      }
      
      setTicketStats({ totalTickets, totalIncome });
      
      if (debug) console.log('[QuizEventDashboard] 📊 Stats:', { totalTickets, totalIncome });
      
    } catch (e: any) {
      console.error('[QuizEventDashboard] ❌ Failed to load ticket stats:', e);
      setTicketStats(null);
    } finally {
      setTicketStatsLoading(false);
    }
  };

  useEffect(() => {
    loadEntitlements();
    loadTicketStats();
  }, []);

  useEffect(() => {
    loadRooms(status);
  }, [status]);

  const goToWizard = () => {
    navigate('/quiz/create-fundraising-quiz?openWizard=1');
  };

  const openRoom = (roomId: string, hostId: string) => {
    if (debug) console.log('[QuizEventDashboard] 🧹 Clearing all Web3 state before opening Web2 room:', roomId);
    
    localStorage.removeItem('quiz-setup-v2');
    localStorage.removeItem('quiz-admins');
    localStorage.removeItem('fundraisely-quiz-setup-draft');
    localStorage.removeItem('current-room-id');
    localStorage.removeItem('current-host-id');
    localStorage.removeItem('current-contract-address');
    
    useQuizConfig.getState().resetConfig();
    
    if (debug) console.log('[QuizEventDashboard] ✅ Cleared, navigating to Web2 room');
    
    navigate(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hostId)}`);
  };

  const handleEdit = (room: Room) => {
    if (room.status !== 'scheduled') return;
    if (debug) console.log('[QuizEventDashboard] ✏️ Edit room:', room.room_id);
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
      
      if (debug) console.log('[QuizEventDashboard] 🔓 Unlinking room', unlinkRoom.room_id, 'from event', linked.eventId);
      
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

      if (debug) console.log('[QuizEventDashboard] ✅ Unlinked successfully');
      
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
              onClick={() => setPaymentMethodsOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition whitespace-nowrap
                        bg-green-100 text-green-700 hover:bg-green-200"
              title="Manage payment methods"
            >
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Methods</span>
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

          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
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

          {/* <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-orange-100">
                <Ticket className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Tickets Sold</p>
                <p className="text-lg sm:text-xl font-bold text-orange-600">
                  {ticketStatsLoading ? '...' : ticketStats?.totalTickets || 0}
                </p>
              </div>
            </div>
          </div> */}

          {/* <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-emerald-100">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600">Total Income</p>
                <p className="text-lg sm:text-xl font-bold text-emerald-600">
                  {ticketStatsLoading ? '...' : `€${ticketStats?.totalIncome.toFixed(2) || '0.00'}`}
                </p>
              </div>
            </div>
          </div> */}
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
            <>
              {/* Table Header (only for table view) */}
          {viewMode === 'table' && (
  <div className="bg-white rounded-t-xl border border-gray-200 border-b-0">
    <div className="flex items-center gap-3 p-3 bg-gray-50">
      <div className="w-24 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase">Status</div>
      <div className="w-32 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase">Date</div>
      <div className="w-20 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase">Fee</div>
      <div className="w-16 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase text-center">Tickets</div>
      <div className="w-16 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase text-center">Players</div>
      <div className="w-16 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase text-center">Max</div>
      <div className="w-24 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase text-right">Income</div>
      <div className="flex-1 min-w-0 text-xs font-semibold text-gray-700 uppercase">Extras</div>
      {/* Reduced prizes width from w-20 to w-16 to give more room to actions */}
      <div className="w-16 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase text-right">Prizes</div>
      {/* Increased actions width from w-64 to w-80 for more icons */}
      <div className="w-80 flex-shrink-0 text-xs font-semibold text-gray-700 uppercase text-right">Actions</div>
    </div>
  </div>
)}
              
              {/* Cards/Rows */}
              <div className={viewMode === 'cards' ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3' : 'bg-white rounded-b-xl border border-gray-200 overflow-hidden'}>
                {sortedRooms.map((room) => (
                  <QuizEventCard
                    key={room.room_id}
                    room={room}
                     stats={roomStats[room.room_id]}
                    viewMode={viewMode}
                    onOpenRoom={openRoom}
                    onEdit={handleEdit}
                    onCancel={handleCancel}
                    onLinkToEvent={showEventLinking ? openLinkModal : undefined}
                    onUnlinkFromEvent={showEventLinking ? handleUnlinkRequest : undefined}
                    linkedEventTitle={linkedEvents[room.room_id]?.eventTitle}
                    linkedEventId={linkedEvents[room.room_id]?.eventId}
                  />
                ))}
              </div>
            </>
          )}
        </div>
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

      {paymentMethodsOpen && clubId && (
        <ManagePaymentMethodsModal
          clubId={clubId}
          onClose={() => setPaymentMethodsOpen(false)}
        />
      )}
    </div>
  );
}

