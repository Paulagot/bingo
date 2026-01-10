// src/components/Quiz/pages/QuizEventDashboard.tsx

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Play, 
  PlusCircle, 
  Lock, 
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  Trophy,
  DollarSign,
  CalendarDays,
  Clock,
  Gift,
  FileText,
  Zap,
  Target,
  Layers,
  Info
} from 'lucide-react';

import { quizApi } from '../../../../shared/api';
import { useAuthStore } from '../../../../features/auth';

type StatusFilter = 'scheduled' | 'live' | 'completed' | 'cancelled' | 'all';
type TimeFilter = 'upcoming' | 'past' | 'all';

interface Prize {
  place: number;
  value: number;
  description?: string;
}

interface RoomCaps {
  maxRounds: number;
  maxPlayers: number;
  extrasAllowed: string[];
  roundTypesAllowed?: string[];
}

interface RoundDefinition {
  config: {
    timePerQuestion: number;
    questionsPerRound: number;
    pointsPerDifficulty?: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  category: string;
  roundType: string;
  difficulty: string;
  roundNumber: number;
  enabledExtras?: Record<string, unknown>;
}

interface ParsedConfig {
  prizes?: Prize[];
  entryFee?: string;
  hostName?: string;
  roomCaps?: RoomCaps;
  timeZone?: string;
  prizeMode?: string;
  isCustomQuiz?: boolean;
  eventDateTime?: string;
  paymentMethod?: string;
  currencySymbol?: string;
  roundDefinitions?: RoundDefinition[];
  selectedTemplate?: string;
  skipRoundConfiguration?: boolean;
}

interface Room {
  room_id: string;
  host_id: string;
  status: string;
  scheduled_at: string | null;
  time_zone: string | null;
  config_json: string | ParsedConfig | null;
  room_caps_json?: string | RoomCaps | null;
  created_at: string;
  updated_at: string;
}

function formatDateTime(dt: string | null, timeZone?: string | null): string {
  if (!dt) return 'No scheduled time';
  try {
    const d = new Date(dt);
    return `${d.toLocaleDateString('en-GB', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    })} at ${d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    })}${timeZone ? ` (${timeZone})` : ''}`;
  } catch {
    return dt;
  }
}

function minutesUntil(dt: string | null): number | null {
  if (!dt) return null;
  const t = new Date(dt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 60000);
}

function parseConfigJson(configStr: string | ParsedConfig | null, roomId?: string): ParsedConfig {
  const logPrefix = `[parseConfigJson${roomId ? ` ${roomId.slice(0, 8)}` : ''}]`;
  
  console.log(`${logPrefix} 🔍 Parsing config_json...`);
  console.log(`${logPrefix} Input type:`, typeof configStr);
  
  if (!configStr) {
    console.log(`${logPrefix} ⚠️ No config string provided`);
    return {};
  }

  // If it's already an object, return it
  if (typeof configStr === 'object' && configStr !== null) {
    console.log(`${logPrefix} ✅ Already parsed as object:`, configStr);
    return configStr as ParsedConfig;
  }

  // Try to parse JSON string
  if (typeof configStr === 'string') {
    try {
      console.log(`${logPrefix} 📝 Raw string (first 200 chars):`, configStr.substring(0, 200));
      const parsed = JSON.parse(configStr) as ParsedConfig;
      console.log(`${logPrefix} ✅ Successfully parsed config:`, {
        selectedTemplate: parsed.selectedTemplate,
        hostName: parsed.hostName,
        entryFee: parsed.entryFee,
        currencySymbol: parsed.currencySymbol,
        prizeCount: parsed.prizes?.length || 0,
        maxPlayers: parsed.roomCaps?.maxPlayers,
        roundsCount: parsed.roundDefinitions?.length || 0,
        extrasCount: parsed.roomCaps?.extrasAllowed?.length || 0
      });
      return parsed;
    } catch (error) {
      console.error(`${logPrefix} ❌ Failed to parse JSON:`, error);
      console.error(`${logPrefix} Raw config:`, configStr);
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

// Extra costs mapping
const EXTRA_COSTS: Record<string, number> = {
  buyHint: 10,
  restorePoints: 15,
  freezeOutTeam: 20,
  robPoints: 25,
  skipQuestion: 10,
  doublePoints: 30,
};

const EXTRA_LABELS: Record<string, string> = {
  buyHint: 'Buy Hint',
  restorePoints: 'Restore Points',
  freezeOutTeam: 'Freeze Team',
  robPoints: 'Rob Points',
  skipQuestion: 'Skip Question',
  doublePoints: 'Double Points',
};

interface QuizEventCardProps {
  room: Room;
  onOpenRoom: (roomId: string, hostId: string) => void;
}

function QuizEventCard({ room, onOpenRoom }: QuizEventCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  console.log(`[QuizEventCard ${room.room_id?.slice(0, 8)}] 🎴 Rendering card`);

  const config = parseConfigJson(room.config_json, room.room_id);
  
  console.log(`[QuizEventCard ${room.room_id?.slice(0, 8)}] 🔍 RAW config values:`, {
    'config.selectedTemplate': config.selectedTemplate,
    'typeof config.selectedTemplate': typeof config.selectedTemplate,
    'config.hostName': config.hostName,
    'config.entryFee': config.entryFee,
    'config.roomCaps?.maxPlayers': config.roomCaps?.maxPlayers,
    'config.prizes?.length': config.prizes?.length
  });

  const mins = minutesUntil(room.scheduled_at);
  const isLive = room.status === 'live';
  const canOpen = isLive || (mins !== null && mins <= 60);

  const prizeCount = config.prizes?.length || 0;
  const prizeValue = config.prizes?.reduce((sum, p) => sum + (p.value || 0), 0) || 0;
  const maxPlayers = config.roomCaps?.maxPlayers || 0;
  const entryFee = config.entryFee || '0';
  const hostName = config.hostName || 'Unknown';
  const currencySymbol = config.currencySymbol || '€';
  const selectedTemplate = config.selectedTemplate || 'Custom';
  const rounds = config.roundDefinitions || [];
  const extrasAllowed = config.roomCaps?.extrasAllowed || [];

  console.log(`[QuizEventCard ${room.room_id?.slice(0, 8)}] 🎯 EXTRACTED values:`, {
    selectedTemplate,
    'is Custom?': selectedTemplate === 'Custom',
    hostName,
    'is Unknown?': hostName === 'Unknown',
    entryFee,
    maxPlayers,
    prizeCount,
    prizeValue
  });

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white hover:shadow-md transition-shadow duration-200">
      {/* Header Section */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Calendar className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <h4 className="text-base font-bold text-gray-900">
                {formatDateTime(room.scheduled_at, room.time_zone)}
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full border font-medium ${getStatusBadgeColor(room.status)}`}>
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </span>

              {mins !== null && room.status === 'scheduled' && (
                <span className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 font-medium">
                  Starts in {mins} min
                </span>
              )}

              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                <span className="font-mono font-semibold">{room.room_id.slice(0, 8)}...</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenRoom(room.room_id, room.host_id)}
            disabled={!canOpen}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap
              ${
                canOpen
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            title={!canOpen ? 'Available 1 hour before start' : 'Open room'}
          >
            {canOpen ? <Play className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            Open Room
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
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
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {expanded ? 'Hide' : 'Show'} Details
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4">
            {/* Debug Info */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-xs">
              <strong>🔍 Debug Info:</strong>
              <pre className="mt-2 overflow-auto text-xs">{JSON.stringify({
                selectedTemplate,
                hostName,
                entryFee,
                maxPlayers,
                prizeCount,
                roundsCount: rounds.length,
                extrasCount: extrasAllowed.length
              }, null, 2)}</pre>
            </div>

            {/* Rounds Section */}
            {rounds.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="h-4 w-4 text-indigo-600" />
                  <h5 className="text-sm font-semibold text-gray-900">
                    Rounds ({rounds.length})
                  </h5>
                </div>
                
                <div className="space-y-2">
                  {rounds.map((round, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-indigo-600">
                            Round {round.roundNumber}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                            {round.roundType.replace(/_/g, ' ')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getDifficultyColor(round.difficulty)}`}>
                            {round.difficulty}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Category:</span>
                          <span className="ml-1 font-medium text-gray-900">{round.category}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Questions:</span>
                          <span className="ml-1 font-medium text-gray-900">
                            {round.config.questionsPerRound}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Time/Q:</span>
                          <span className="ml-1 font-medium text-gray-900">
                            {round.config.timePerQuestion}s
                          </span>
                        </div>
                      </div>

                      {round.config.pointsPerDifficulty && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="text-xs text-gray-500">Points: </span>
                          <span className="text-xs">
                            Easy: {round.config.pointsPerDifficulty.easy}, 
                            Medium: {round.config.pointsPerDifficulty.medium}, 
                            Hard: {round.config.pointsPerDifficulty.hard}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-500">
                No rounds configured
              </div>
            )}

            {/* Extras Section */}
            {extrasAllowed.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-yellow-600" />
                  <h5 className="text-sm font-semibold text-gray-900">
                    Available Extras ({extrasAllowed.length})
                  </h5>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extrasAllowed.map((extra, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <span className="text-xs font-medium text-gray-900">
                        {EXTRA_LABELS[extra] || extra}
                      </span>
                      {EXTRA_COSTS[extra] && (
                        <span className="text-xs font-bold text-yellow-700">
                          {currencySymbol}{EXTRA_COSTS[extra]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 rounded text-sm text-gray-500">
                No extras available
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
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg border border-yellow-200"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-yellow-700">
                          {prize.place === 1 ? '🥇' : prize.place === 2 ? '🥈' : prize.place === 3 ? '🥉' : `#${prize.place}`}
                        </span>
                        <span className="text-xs text-gray-700">
                          {prize.description || `${prize.place}${prize.place === 1 ? 'st' : prize.place === 2 ? 'nd' : prize.place === 3 ? 'rd' : 'th'} Place`}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-yellow-700">
                        {currencySymbol}{prize.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment & Settings */}
            {(config.paymentMethod || config.prizeMode) && (
              <div className="pt-3 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {config.paymentMethod && (
                    <div>
                      <span className="text-gray-500">Payment:</span>
                      <span className="ml-1 font-medium text-gray-900 capitalize">
                        {config.paymentMethod.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {config.prizeMode && (
                    <div>
                      <span className="text-gray-500">Prize Mode:</span>
                      <span className="ml-1 font-medium text-gray-900 capitalize">
                        {config.prizeMode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Availability Notice */}
      {!canOpen && room.status === 'scheduled' && !expanded && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-500 flex items-center gap-1 bg-gray-50 p-2 rounded">
            <Lock className="h-3 w-3" />
            This room becomes available <span className="font-semibold">1 hour before</span> the scheduled start.
          </p>
        </div>
      )}
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
  const [time, setTime] = useState<TimeFilter>('upcoming');
  const [showFilters, setShowFilters] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const creditsRemaining = useMemo(() => extractCreditsRemaining(ents), [ents]);
  const canLaunchWizard = !entsLoading && !entsError && creditsRemaining > 0;

  const stats = useMemo(() => {
    const total = rooms.length;
    const upcoming = rooms.filter(r => {
      const mins = minutesUntil(r.scheduled_at);
      return r.status === 'scheduled' && mins !== null && mins > 0;
    }).length;
    
    const live = rooms.filter(r => r.status === 'live').length;
    
    const totalPrizeValue = rooms.reduce((sum, r) => {
      const config = parseConfigJson(r.config_json);
      if (config.prizes) {
        return sum + config.prizes.reduce((s, p) => s + (p.value || 0), 0);
      }
      return sum;
    }, 0);

    const maxPlayersValues = rooms
      .map(r => {
        const config = parseConfigJson(r.config_json);
        return config.roomCaps?.maxPlayers || 0;
      })
      .filter(v => v > 0);
    
    const avgMaxPlayers = maxPlayersValues.length > 0 
      ? Math.round(maxPlayersValues.reduce((a, b) => a + b, 0) / maxPlayersValues.length)
      : 0;

    return { total, upcoming, live, totalPrizeValue, avgMaxPlayers };
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

  const loadRooms = async (s: StatusFilter, t: TimeFilter) => {
    try {
      console.log('[QuizEventDashboard] 🔄 Loading rooms');
      setRoomsLoading(true);
      setRoomsError(null);
      
      const res = await quizApi.getWeb2RoomsList({ status: s, time: t });
      
      console.log('[QuizEventDashboard] ✅ Received rooms:', res.rooms?.length || 0);
      
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
    let cancelled = false;
    (async () => {
      await loadRooms(status, time);
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [status, time]);

  const goToWizard = () => {
    navigate('/quiz/create-fundraising-quiz?openWizard=1');
  };

  const openRoom = (roomId: string, hostId: string) => {
    navigate(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hostId)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quiz Events Dashboard</h1>
            <p className="mt-1 text-sm text-gray-600">
              Club: <span className="font-semibold text-gray-900">{clubName}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={goToWizard}
            disabled={!canLaunchWizard}
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition whitespace-nowrap
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
            <PlusCircle className="h-5 w-5" />
            Launch Quiz Wizard
          </button>
        </div>

        {/* Filters Section */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-600" />
              <span className="font-semibold text-gray-900">Filters</span>
              <span className="text-sm text-gray-500">
                ({status !== 'all' || time !== 'upcoming' ? 'Active' : 'Default'})
              </span>
            </div>
            {showFilters ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>

          {showFilters && (
            <div className="px-6 pb-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StatusFilter)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Period
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={time}
                    onChange={(e) => setTime(e.target.value as TimeFilter)}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="past">Past</option>
                    <option value="all">All Time</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setStatus('all');
                    setTime('upcoming');
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-indigo-100">
                <CalendarDays className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-lg font-bold text-indigo-600">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-green-100">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Credits</p>
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
                    <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-lg font-bold text-blue-600">{stats.upcoming}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 p-2 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Max Players</p>
                <p className="text-lg font-bold text-purple-600">
                  {stats.avgMaxPlayers || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Events Cards/List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quiz Events</h3>
            <p className="text-sm text-gray-600 mt-1">
              Showing {rooms.length} event{rooms.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="p-6">
            {roomsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading events…</p>
              </div>
            ) : roomsError ? (
              <div className="text-center py-8">
                <div className="text-sm font-semibold text-red-600">Failed to load events</div>
                <div className="mt-2 text-xs text-gray-600">Error: {roomsError}</div>
                <button
                  type="button"
                  onClick={() => loadRooms(status, time)}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </button>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-700">No events found for these filters.</p>
                <p className="text-xs text-gray-500 mt-1">
                  Try adjusting your filters or create a new quiz event.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {rooms.map((room) => (
                  <QuizEventCard
                    key={room.room_id}
                    room={room}
                    onOpenRoom={openRoom}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

