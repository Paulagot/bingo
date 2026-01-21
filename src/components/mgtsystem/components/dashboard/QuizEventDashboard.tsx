// src/components/Quiz/pages/QuizEventDashboard.tsx
// ✅ FIXED VERSION: Proper alignment, Edit/Cancel buttons visible, extras data displayed, all TS errors resolved

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NotificationsTicker from './NotificationsTicker';
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
  XCircle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';

import { quizApi } from '../../../../shared/api';
import { useAuthStore } from '../../../../features/auth';

import CancelQuizModal from '../../modals/CancelQuizModal';

// ✅ Import types from API file
import type { 
  Web2RoomListItem as Room,
  ParsedConfig,
} from '../../../../shared/api/quiz.api';
import { useQuizConfig } from '@/components/Quiz/hooks/useQuizConfig';

type StatusFilter = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'all';

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

// Extra labels mapping
const EXTRA_LABELS: Record<string, string> = {
  buyHint: 'Buy Hint',
  restorePoints: 'Restore Points',
  freezeOutTeam: 'Freeze Team',
  robPoints: 'Rob Points',
  skipQuestion: 'Skip Question',
  doublePoints: 'Double Points',
};

interface QuizEventRowProps {
  room: Room;
  onOpenRoom: (roomId: string, hostId: string) => void;
  onEdit: (room: Room) => void;
  onCancel: (room: Room) => void;
}

function QuizEventRow({ room, onOpenRoom, onEdit, onCancel }: QuizEventRowProps) {
  const config = parseConfigJson(room.config_json, room.room_id);
  const mins = minutesUntil(room.scheduled_at);
  
  const isLive = room.status === 'live';
  const isScheduled = room.status === 'scheduled';
  const isCompleted = room.status === 'completed';
  const isCancelled = room.status === 'cancelled';
  
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
  
  // Get enabled extras with their prices
  const enabledExtrasWithPrices = Object.entries(config.fundraisingOptions || {})
    .filter(([_, enabled]) => enabled === true)
    .map(([key]) => ({
      key,
      label: EXTRA_LABELS[key] || key,
      price: config.fundraisingPrices?.[key] || 0
    }));

  const totalExtrasValue = enabledExtrasWithPrices.reduce((sum, extra) => sum + extra.price, 0);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* ✅ FIXED: Using CSS Grid for perfect alignment */}
      <div className="grid grid-cols-[100px_140px_100px_minmax(200px,1fr)_80px_100px_280px] gap-3 items-center p-3">
        
        {/* STATUS - 100px */}
        <div>
          <span className={`px-2 py-1 rounded-full border text-xs font-medium inline-block text-center w-full ${getStatusBadgeColor(room.status)}`}>
            {room.status === 'scheduled' ? 'Scheduled' : 
             room.status === 'live' ? 'Live' : 
             room.status === 'completed' ? 'Completed' : 'Cancelled'}
          </span>
        </div>

        {/* DATE & TIME - 140px */}
        <div>
          <div className="flex items-start gap-2">
            <Clock className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              {room.scheduled_at ? (
                <>
                  <p className="font-medium text-gray-900 whitespace-nowrap">
                    {new Date(room.scheduled_at).toLocaleDateString('en-GB', { 
                      day: 'numeric', 
                      month: 'short',
                      year: '2-digit'
                    })}
                  </p>
                  <p className="text-gray-500">
                    {new Date(room.scheduled_at).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                  {mins !== null && isScheduled && mins > 0 && (
                    <p className="text-orange-600 font-medium">in {mins}m</p>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Not scheduled</p>
              )}
            </div>
          </div>
        </div>

        {/* ENTRY FEE - 100px */}
        <div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              {parseFloat(entryFee) > 0 ? `${currencySymbol}${entryFee}` : 'Free'}
            </span>
          </div>
        </div>

        {/* EXTRAS - flexible, min 200px */}
        <div className="min-w-0">
          {enabledExtrasWithPrices.length > 0 ? (
            <div className="flex items-start gap-2">
              <Zap className="h-3.5 w-3.5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1 min-w-0">
                {enabledExtrasWithPrices.map((extra) => (
                  <span
                    key={extra.key}
                    className="text-xs px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded border border-yellow-200 font-medium whitespace-nowrap"
                  >
                    {extra.label}: {currencySymbol}{extra.price}
                  </span>
                ))}
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                  (Total: {currencySymbol}{totalExtrasValue})
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400">No extras</span>
          )}
        </div>

        {/* PLAYERS - 80px */}
        <div>
          {maxPlayers > 0 ? (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">{maxPlayers}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>

        {/* PRIZES - 100px */}
        <div>
          {prizeValue > 0 ? (
            <div className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-900">
                {currencySymbol}{prizeValue}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </div>

        {/* ACTIONS - 280px */}
        <div className="flex items-center gap-2 justify-end">
          {/* ✅ FIXED: Edit button now visible when conditions are met */}
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(room);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
              title="Edit quiz setup"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit
            </button>
          )}

          {/* ✅ FIXED: Cancel button now visible when conditions are met */}
          {canCancel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(room);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition-colors text-sm font-medium text-red-600"
              title="Cancel quiz"
            >
              <XCircle className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}

          {/* Open/Status buttons */}
          {!isCompleted && !isCancelled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenRoom(room.room_id, room.host_id);
              }}
              disabled={!canOpen}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition whitespace-nowrap
                ${
                  canOpen
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              title={
                isCompleted ? 'Quiz has ended' :
                isCancelled ? 'Quiz was cancelled' :
                !canOpen ? 'Available 1 hour before start' : 
                'Open room'
              }
            >
              {canOpen ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              Open
            </button>
          )}

          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              Ended
            </span>
          )}

          {isCancelled && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-sm font-medium">
              <XCircle className="h-4 w-4" />
              Cancelled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function QuizEventDashboard() {
  const navigate = useNavigate();

  const clubName = useAuthStore(
    (s: any) => s.user?.club_name || s.user?.clubName || s.user?.club?.name || 'Your Club'
  );

  const [ents, setEnts] = useState<any>(null);
  const [entsLoading, setEntsLoading] = useState(true);
  const [entsError, setEntsError] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusFilter>('all');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const creditsRemaining = useMemo(() => extractCreditsRemaining(ents), [ents]);
  const maxPlayersFromPlan = useMemo(() => extractMaxPlayers(ents), [ents]);
  const canLaunchWizard = !entsLoading && !entsError && creditsRemaining > 0;

  const [cancelOpen, setCancelOpen] = useState(false);
const [cancelRoom, setCancelRoom] = useState<Room | null>(null);
const [cancelConfig, setCancelConfig] = useState<ParsedConfig | null>(null);
const [cancelLoading, setCancelLoading] = useState(false);
const [cancelError, setCancelError] = useState<string | null>(null);


  // Sort rooms by status priority
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
      setEnts(data);
    } catch (e: any) {
      console.error('[QuizEventDashboard] Entitlements load failed:', e);
      setEnts(null);
      setEntsError(e?.message || 'Failed to load entitlements');
    } finally {
      setEntsLoading(false);
    }
  };

  const loadRooms = async (s: StatusFilter) => {
    try {
      setRoomsLoading(true);
      setRoomsError(null);
      
      console.log('[QuizEventDashboard] 📡 Fetching rooms with status:', s);
      const res = await quizApi.getWeb2RoomsList({ status: s, time: 'all' });
      
      console.log('[QuizEventDashboard] 📥 Received rooms:', res.rooms?.length || 0);
      
      // ✅ FIXED: Proper null check before accessing firstRoom
      if (res.rooms && res.rooms.length > 0) {
        const firstRoom = res.rooms[0];
        if (firstRoom) {
          console.log('[QuizEventDashboard] 📦 First room sample:', {
            room_id: firstRoom.room_id,
            has_config_json: !!firstRoom.config_json,
            config_json_type: typeof firstRoom.config_json,
            config_json_length: firstRoom.config_json ? String(firstRoom.config_json).length : 0
          });
        }
      }
      
      setRooms(res.rooms || []);
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

// In QuizEventDashboard.tsx - openRoom function

const openRoom = (roomId: string, hostId: string) => {
  console.log('[QuizEventDashboard] 🧹 Clearing all Web3 state before opening Web2 room:', roomId);
  
  // Clear wizard setup
  localStorage.removeItem('quiz-setup-v2');
  localStorage.removeItem('quiz-admins');
  localStorage.removeItem('fundraisely-quiz-setup-draft');
  
  // Clear any previous room data (especially Web3)
  localStorage.removeItem('current-room-id');
  localStorage.removeItem('current-host-id');
  localStorage.removeItem('current-contract-address');
  
  // Clear config store (removes any Web3 config)
  useQuizConfig.getState().resetConfig();
  
  console.log('[QuizEventDashboard] ✅ Cleared, navigating to Web2 room');
  
  navigate(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hostId)}`);
};

  const handleEdit = (room: Room) => {
    console.log('Edit room:', room.room_id);
    alert(`Edit functionality coming soon for room: ${room.room_id.slice(0, 8)}`);
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

    // ✅ Option 1: Optimistic update (instant UI)
    setRooms((prev) =>
      prev.map((r) =>
        r.room_id === cancelRoom.room_id
          ? { ...r, status: 'cancelled', updated_at: new Date().toISOString() }
          : r
      )
    );

    // ✅ Option 2 (optional): re-fetch to be 100% consistent
    // await loadRooms(status);

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



  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto max-w-[1600px] px-4 py-8">
        <div className="mb-8">
          <NotificationsTicker />
        </div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quiz Events Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Club: <span className="font-semibold text-gray-900">{clubName}</span>
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate('/quiz/create-fundraising-quiz')}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition whitespace-nowrap
                        bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
              title="View the quiz wizard demo"
            >
              <Play className="h-4 w-4" />
              Wizard Demo
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
              title={
                entsLoading
                  ? 'Loading credits…'
                  : entsError
                  ? 'Credits unavailable'
                  : creditsRemaining <= 0
                  ? 'No credits remaining'
                  : 'Launch the quiz wizard'
              }
            >
              <PlusCircle className="h-4 w-4" />
              Launch Quiz Wizard
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-indigo-100">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Total</p>
                <p className="text-lg font-bold text-indigo-600">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Upcoming</p>
                <p className="text-lg font-bold text-blue-600">{stats.upcoming}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-gray-100">
                <CheckCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Completed</p>
                <p className="text-lg font-bold text-gray-600">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-green-100">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Credits</p>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-green-600">
                    {entsLoading ? '...' : entsError ? 'N/A' : creditsRemaining}
                  </p>
                  <button
                    type="button"
                    onClick={loadEntitlements}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Refresh credits"
                  >
                    <RefreshCw className="h-3 w-3 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-xs font-medium text-gray-600">Plan Limit</p>
                <p className="text-lg font-bold text-purple-600">
                  {entsLoading ? '...' : entsError ? 'N/A' : `${maxPlayersFromPlan}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm p-2">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'scheduled', 'live', 'completed', 'cancelled'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Events Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quiz Events</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {sortedRooms.length} event{sortedRooms.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* ✅ FIXED: Table Header with matching grid */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-[100px_140px_100px_minmax(200px,1fr)_80px_100px_280px] gap-3 items-center p-3">
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Status</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Date & Time</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Entry Fee</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Extras</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Players</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-gray-700 uppercase">Prizes</span>
              </div>
              <div className="text-right">
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
  <div className="text-center py-16">
    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 mb-4">
      <Calendar className="h-8 w-8 text-indigo-400" />
    </div>
    
    {status === 'all' ? (
      <>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No quiz events yet
        </h3>
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          Get started by creating your first fundraising quiz event. It only takes a few minutes!
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
          title={
            entsLoading
              ? 'Loading credits…'
              : entsError
              ? 'Credits unavailable'
              : creditsRemaining <= 0
              ? 'No credits remaining'
              : 'Create your first quiz event'
          }
        >
          <PlusCircle className="h-5 w-5" />
          Create Your First Quiz
        </button>
        {!canLaunchWizard && creditsRemaining <= 0 && (
          <p className="mt-3 text-xs text-red-600">
            You need credits to create quiz events. Please contact support to add credits to your account.
          </p>
        )}
      </>
    ) : status === 'scheduled' ? (
      <>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No scheduled events
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          You don't have any upcoming quiz events scheduled.
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
          Schedule a Quiz
        </button>
      </>
    ) : status === 'live' ? (
      <>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No live events
        </h3>
        <p className="text-sm text-gray-600">
          You don't have any quiz events currently running.
        </p>
      </>
    ) : status === 'completed' ? (
      <>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No completed events
        </h3>
        <p className="text-sm text-gray-600">
          You haven't completed any quiz events yet.
        </p>
      </>
    ) : status === 'cancelled' ? (
      <>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No cancelled events
        </h3>
        <p className="text-sm text-gray-600">
          You don't have any cancelled quiz events.
        </p>
      </>
    ) : null}
  </div>
) : (
              sortedRooms.map((room) => (
                <QuizEventRow
                  key={room.room_id}
                  room={room}
                  onOpenRoom={openRoom}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                />
              ))
            )}
          </div>
        </div>
      </div>

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

