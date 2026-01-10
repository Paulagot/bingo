import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  PlusCircle,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  Trophy,
  CalendarDays,
  Clock,
} from 'lucide-react';

import { useAuthStore } from '../../../../features/auth';

// ✅ service using your BaseService pattern
import quizRoomsService, {
  type StatusFilter,
  type TimeFilter,
  type Web2RoomRow,
} from '../../services/quizRoomServices';

// ✅ extracted UI + helpers
import { QuizEventCard } from '../cards/QuizEventCard';
import { extractCreditsRemaining, minutesUntil, safeJsonParse } from '../../utils/QuizGameUtils';

type Prize = { place: number; value: number; description?: string };
type ParsedConfig = {
  prizes?: Prize[];
  roomCaps?: { maxPlayers?: number };
};

export default function QuizEventDashboardv2() {
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

  const [rooms, setRooms] = useState<Web2RoomRow[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const creditsRemaining = useMemo(() => extractCreditsRemaining(ents), [ents]);
  const canLaunchWizard = !entsLoading && !entsError && creditsRemaining > 0;

  const loadEntitlements = useCallback(async () => {
    try {
      setEntsLoading(true);
      setEntsError(null);

      const data = await quizRoomsService.getEntitlements();
      setEnts(data);
    } catch (e: any) {
      console.error('[QuizEventDashboard] Entitlements load failed:', e);
      setEnts(null);
      setEntsError(e?.message || 'Failed to load entitlements');
    } finally {
      setEntsLoading(false);
    }
  }, []);

  const loadRooms = useCallback(async (s: StatusFilter, t: TimeFilter) => {
    try {
      setRoomsLoading(true);
      setRoomsError(null);

      const res = await quizRoomsService.listWeb2Rooms({ status: s, time: t });
      setRooms(res?.rooms || []);
    } catch (e: any) {
      console.error('[QuizEventDashboard] Rooms load failed:', e);
      setRooms([]);
      setRoomsError(e?.message || 'Failed to load events');
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements]);

  useEffect(() => {
    void loadRooms(status, time);
  }, [status, time, loadRooms]);

  const stats = useMemo(() => {
    const total = rooms.length;

    const upcoming = rooms.filter((r) => {
      const mins = minutesUntil(r.scheduled_at);
      return r.status === 'scheduled' && mins !== null && mins > 0;
    }).length;

    const live = rooms.filter((r) => r.status === 'live').length;

    const totalPrizeValue = rooms.reduce((sum, r) => {
      const cfg = safeJsonParse<ParsedConfig>(r.config_json, {} as ParsedConfig);
      const prizes = cfg.prizes || [];
      return sum + prizes.reduce((s, p) => s + (p.value || 0), 0);
    }, 0);

    const maxPlayersValues = rooms
      .map((r) => {
        const cfg = safeJsonParse<ParsedConfig>(r.config_json, {} as ParsedConfig);
        return Number(cfg.roomCaps?.maxPlayers || 0);
      })
      .filter((v) => Number.isFinite(v) && v > 0);

    const avgMaxPlayers =
      maxPlayersValues.length > 0
        ? Math.round(maxPlayersValues.reduce((a, b) => a + b, 0) / maxPlayersValues.length)
        : 0;

    return { total, upcoming, live, totalPrizeValue, avgMaxPlayers };
  }, [rooms]);

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

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={() => setShowFilters((v) => !v)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
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
                  type="button"
                  onClick={() => {
                    setStatus('all');
                    setTime('upcoming');
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset Filters
                </button>

                <button
                  type="button"
                  onClick={() => loadRooms(status, time)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
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
                <p className="text-lg font-bold text-purple-600">{stats.avgMaxPlayers || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rooms list */}
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
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
                  <QuizEventCard key={room.room_id} room={room} onOpenRoom={openRoom} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

