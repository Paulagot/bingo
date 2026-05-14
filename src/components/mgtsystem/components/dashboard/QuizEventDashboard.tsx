// src/components/mgtsystem/components/dashboard/QuizEventDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import NotificationsTicker from './NotificationsTicker';
import { eventIntegrationsService } from '../../services/EventIntegrationsService';
import QuizRoomsService, { type RoomStats } from '../../services/quizRoomServices';
import { quizPaymentMethodsService } from '../../services/QuizPaymentMethodsService';
import quizLatePaymentsService from '../../services/QuizLatePaymentsService';
import ManagePaymentMethodsModal from '../../modals/ManagePaymentMethodsModal';
import ScheduleEliminationModal from '../../modals/ScheduleEliminationModal';

import {
  CreditCard, Calendar, Play, PlusCircle, RefreshCw,
  Users, Trophy, CalendarDays, CheckCircle, LayoutGrid, LayoutList,
} from 'lucide-react';

import { quizApi } from '../../../../shared/api';
import { useAuthStore } from '../../../../features/auth';
import { useQuizConfig } from '@/components/Quiz/hooks/useQuizConfig';

import type { Web2RoomListItem as Room, ParsedConfig } from '../../../../shared/api/quiz.api';

import DigitalEventDrawer from '../digitalEvents/DigitalEventDrawer';
import { QuizEventCard } from '../cards/QuizEventCard';

type StatusFilter = 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled' | 'all';
type ViewMode = 'table' | 'cards';

function parseConfigJson(v: any): ParsedConfig {
  if (!v) return {};
  if (typeof v === 'object') return v as ParsedConfig;
  try { return JSON.parse(v); } catch { return {}; }
}

function extractCreditsRemaining(ents: any): number {
  if (!ents) return 0;
  const candidates = [ents.game_credits_remaining, ents.creditsRemaining, ents.quizCreditsRemaining, ents.credits, ents.remainingCredits, ents?.entitlements?.creditsRemaining];
  const first = candidates.find(v => v !== undefined && v !== null);
  const n = typeof first === 'string' ? Number(first) : typeof first === 'number' ? first : 0;
  return Number.isFinite(n) ? n : 0;
}

function extractMaxPlayers(ents: any): number {
  return Number(ents?.max_players_per_game || ents?.maxPlayersPerGame || ents?.maxPlayers || 0);
}

function getFeatureAccess(ents: any) {
  const f = ents?.quiz_features || ents?.quizFeatures || {};
  return { eventLinking: f?.eventLinking === true, quizPayments: f?.quizPayments === true, ticketing: f?.ticketing === true };
}

export default function QuizEventDashboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const clubId          = useAuthStore((s: any) => s.club?.club_id || s.user?.club_id);
  const clubName        = useAuthStore((s: any) => s.user?.club_name || s.user?.clubName || 'Your Club');
  const user            = useAuthStore((s: any) => s.user);
  const confirmedBy     = user?.id || user?.user_id || user?.club_user_id || '';
  const confirmedByName = user?.name || user?.full_name || user?.first_name || 'Admin';

  // ── Drawer ──
  const [drawerOpen,          setDrawerOpen]          = useState(false);
  const [managePaymentsOpen,  setManagePaymentsOpen]  = useState(false);
  const [unlinkLoading,       setUnlinkLoading]       = useState(false);
  const [outstandingCounts,   setOutstandingCounts]   = useState<Record<string, number>>({});
  const [scheduleEliminationOpen, setScheduleEliminationOpen] = useState(false);



  // ── View ──
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => { const m = mq.matches; setIsMobile(m); if (m) setViewMode('cards'); };
    apply(); mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  // ── Entitlements ──
  const [ents,      setEnts]      = useState<any>(null);
  const [entsLoading, setEntsLoading] = useState(true);
  const [entsError,   setEntsError]   = useState<string | null>(null);
  const featureAccess    = useMemo(() => getFeatureAccess(ents), [ents]);
  const creditsRemaining = useMemo(() => extractCreditsRemaining(ents), [ents]);
  const maxPlayersFromPlan = useMemo(() => extractMaxPlayers(ents), [ents]);
  const canLaunchWizard  = !entsLoading && !entsError && creditsRemaining > 0;

  // ── Rooms ──
  const [status,     setStatus]     = useState<StatusFilter>('all');
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError,   setRoomsError]   = useState<string | null>(null);
  const [linkedEvents, setLinkedEvents] = useState<Record<string, { eventId: string; eventTitle: string }>>({});
  const [roomStats,    setRoomStats]    = useState<Record<string, RoomStats>>({});
  const [_statsLoading, setStatsLoading] = useState(false);
  const [paymentMethodMap, setPaymentMethodMap] = useState<Record<string, boolean>>({});

  const [drawerRoomId, setDrawerRoomId] = useState<string | null>(null);
const openDrawer  = (room: Room) => { setDrawerRoomId(room.room_id); setDrawerOpen(true); };
const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setDrawerRoomId(null), 200); };
const drawerRoom  = drawerRoomId ? (rooms.find(r => r.room_id === drawerRoomId) ?? null) : null;

  const sortedRooms = useMemo(() => {
    const p: Record<string,number> = { live:1, open:2, scheduled:3, completed:4, cancelled:5 };
    return [...rooms].sort((a, b) => {
      const diff = (p[a.status]||999) - (p[b.status]||999);
      if (diff !== 0) return diff;
      return (a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0) - (b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0);
    });
  }, [rooms]);

  const dashStats = useMemo(() => ({
    total:     rooms.length,
    upcoming:  rooms.filter(r => r.status === 'scheduled').length,
    completed: rooms.filter(r => r.status === 'completed').length,
  }), [rooms]);

  // ── Loaders ──
  const loadEntitlements = async () => {
    try { setEntsLoading(true); setEntsError(null); setEnts(await quizApi.getEntitlements()); }
    catch (e: any) { setEnts(null); setEntsError(e?.message || 'Failed'); }
    finally { setEntsLoading(false); }
  };

  const loadLinkedEvents = async (roomIds: string[]) => {
    if (!roomIds.length) { setLinkedEvents({}); return; }
    try {
      const res = await eventIntegrationsService.lookupLinks({ integration_type: 'quiz_web2', external_refs: roomIds });
      const map: Record<string, { eventId: string; eventTitle: string }> = {};
      for (const l of res.links || []) { if (l.external_ref && l.event_id && l.event_title) map[l.external_ref] = { eventId: l.event_id, eventTitle: l.event_title }; }
      setLinkedEvents(map);
    } catch { setLinkedEvents({}); }
  };

  const loadRoomStats = async (roomIds: string[]) => {
  if (!roomIds.length) return;
    try { setStatsLoading(true);
      const fresh = await QuizRoomsService.batchGetRoomStats(roomIds);
setRoomStats(prev => ({ ...prev, ...fresh })); }
    catch { setRoomStats({}); } finally { setStatsLoading(false); }
  };

  const loadPaymentMethodFlags = async (roomIds: string[]) => {
    if (!roomIds.length) { setPaymentMethodMap({}); return; }
    try {
      const results = await Promise.all(roomIds.map(id => quizPaymentMethodsService.getQuizPaymentMethods(id).then(res => ({ id, hasLinked: res.linked_method_ids.length > 0 })).catch(() => ({ id, hasLinked: false }))));
      const map: Record<string,boolean> = {}; results.forEach(r => { map[r.id] = r.hasLinked; });
      setPaymentMethodMap(map);
    } catch { /* ignore */ }
  };

  const loadOutstandingCounts = async (completedIds: string[]) => {
    if (!completedIds.length) return;
    try {
      const results = await Promise.all(completedIds.map(id => quizLatePaymentsService.getUnpaidPlayers(id).then(res => ({ id, count: res.players?.length || 0 })).catch(() => ({ id, count: 0 }))));
      const map: Record<string,number> = {}; results.forEach(r => { map[r.id] = r.count; });
      setOutstandingCounts(map);
    } catch { /* ignore */ }
  };

 const loadRooms = async (s: StatusFilter, silent = false) => {
  try {
    if (!silent) { setRoomsLoading(true); setRoomsError(null); }

    const res = await quizApi.getWeb2RoomsList({ status: s as any, time: 'all' });
    setRooms(res.rooms || []);
    const roomIds      = (res.rooms || []).map((r: Room) => r.room_id);
    const completedIds = (res.rooms || [])
      .filter((r: Room) => r.status === 'completed')
      .map((r: Room) => r.room_id);
    await Promise.all([
      loadLinkedEvents(roomIds),
      loadRoomStats(roomIds),
      loadPaymentMethodFlags(roomIds),
      loadOutstandingCounts(completedIds),
    ]);
  } catch (e: any) {
    if (!silent) { setRooms([]); setRoomsError(e?.message || 'Failed to load events'); }
  } finally {
    if (!silent) setRoomsLoading(false);
  }
};

  useEffect(() => { loadEntitlements(); }, []);
 useEffect(() => { loadRooms(status); }, [status]);

  useEffect(() => {
    if (!clubId) return;
    const p = searchParams.get('stripe');
    if (p === 'return' || p === 'refresh') setManagePaymentsOpen(true);
  }, [clubId]);
useEffect(() => {
  if (!rooms.length) return;

  // Fast: refresh stats for live rooms every 30s
  const fastPoll = setInterval(() => {
    const liveIds = rooms
      .filter(r => r.status === 'live')
      .map(r => r.room_id);
    if (liveIds.length) loadRoomStats(liveIds);
  }, 30_000);

  // Slow: silent full refresh every 5 minutes
  const slowPoll = setInterval(() => {
    loadRooms(status, true);
  }, 5 * 60_000);

  return () => {
    clearInterval(fastPoll);
    clearInterval(slowPoll);
  };
}, [rooms, status]);

  // ── Handlers ──
  const goToWizard = () => navigate('/quiz/create-fundraising-quiz?openWizard=1');

  const openRoom = (roomId: string, hostId: string) => {
    ['quiz-setup-v2','quiz-admins','fundraisely-quiz-setup-draft','current-room-id','current-host-id','current-contract-address'].forEach(k => localStorage.removeItem(k));
    useQuizConfig.getState().resetConfig();
    window.open(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hostId)}`, '_blank');
  };

  const confirmUnlink = async () => {
    if (!drawerRoom) return;
    const linked = linkedEvents[drawerRoom.room_id];
    if (!linked) return;
    try {
      setUnlinkLoading(true);
      const intRes = await eventIntegrationsService.list(linked.eventId);
      const integration = intRes.integrations?.find((i: any) => i.external_ref === drawerRoom.room_id);
      if (!integration) throw new Error('Integration not found');
      await eventIntegrationsService.unlink(linked.eventId, integration.id);
      setLinkedEvents(prev => { const u = { ...prev }; delete u[drawerRoom.room_id]; return u; });
    } catch (e: any) { alert(`Failed to unlink: ${e?.message || 'Unknown error'}`); }
    finally { setUnlinkLoading(false); }
  };

  const handlePaymentMethodSuccess = async (roomId: string) => {
    try {
      const res = await quizPaymentMethodsService.getQuizPaymentMethods(roomId);
      setPaymentMethodMap(prev => ({ ...prev, [roomId]: res.linked_method_ids.length > 0 }));
    } catch { /* ignore */ }
  };

  // Derived drawer props
  const drawerConfig      = drawerRoom ? parseConfigJson(drawerRoom.config_json) : null;
  const drawerStats       = drawerRoom ? roomStats[drawerRoom.room_id] : undefined;
  const drawerHasPayments = drawerRoom ? (paymentMethodMap[drawerRoom.room_id] ?? false) : false;
  const drawerOutstanding = drawerRoom ? (outstandingCounts[drawerRoom.room_id] ?? 0) : 0;
  const drawerLinked      = drawerRoom ? linkedEvents[drawerRoom.room_id] : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8"><NotificationsTicker /></div>

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="mt-1 text-sm text-gray-600"><span className="font-semibold text-gray-900">{clubName}</span></p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={() => navigate('/quiz/create-fundraising-quiz')}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition whitespace-nowrap">
              <Play className="h-4 w-4" /> Demo
            </button>
            {featureAccess.quizPayments && (
              <button type="button" onClick={() => setManagePaymentsOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition whitespace-nowrap">
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Payment Methods</span>
                <span className="sm:hidden">Payments</span>
              </button>
            )}
            <button type="button" onClick={goToWizard} disabled={!canLaunchWizard}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap ${canLaunchWizard ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}>
              <PlusCircle className="h-4 w-4" /> Schedule Quiz
            </button>

            {/* <button
  type="button"
  onClick={() => setScheduleEliminationOpen(true)}
  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap bg-red-600 text-white hover:bg-red-700"
>
  <Trophy className="h-4 w-4" /> Schedule Elimination
</button> */}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total',    value: dashStats.total,    Icon: CalendarDays, color: 'indigo' },
            { label: 'Upcoming', value: dashStats.upcoming, Icon: Calendar,     color: 'blue' },
            { label: 'Done',     value: dashStats.completed,Icon: CheckCircle,  color: 'gray' },
            { label: 'Credits',  value: entsLoading ? '…' : entsError ? 'N/A' : creditsRemaining, Icon: Trophy, color: 'green', refresh: loadEntitlements },
            { label: 'Plan Limit', value: entsLoading ? '…' : entsError ? 'N/A' : maxPlayersFromPlan, Icon: Users, color: 'purple' },
          ].map(({ label, value, Icon, color, refresh }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 p-2 rounded-lg bg-${color}-100`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">{label}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg sm:text-xl font-bold text-${color}-600`}>{value}</p>
                    {refresh && <button type="button" onClick={refresh} className="p-1 rounded hover:bg-gray-100" title="Refresh"><RefreshCw className="h-3 w-3 text-gray-500" /></button>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + view toggle */}
        <div className="mb-6 bg-white rounded-xl border border-gray-200 shadow-sm p-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2 flex-wrap flex-1">
              {(['all','scheduled','open','live','completed','cancelled'] as StatusFilter[]).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition capitalize ${status === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            {!isMobile && (
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('table')} title="Table view" className={`p-2 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}><LayoutList className="h-4 w-4" /></button>
                <button onClick={() => setViewMode('cards')} title="Card view"  className={`p-2 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}><LayoutGrid className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </div>

        {/* Rooms */}
        <div className="space-y-4">
          {roomsLoading ? (
            <div className="flex items-center justify-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <span className="ml-3 text-sm text-gray-600">Loading events…</span>
            </div>
          ) : roomsError ? (
            <div className="py-12 text-center bg-white rounded-xl border border-gray-200">
              <p className="text-sm font-semibold text-red-600">Failed to load events</p>
              <p className="mt-1 text-xs text-gray-500">{roomsError}</p>
              <button type="button" onClick={() => loadRooms(status)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            </div>
          ) : sortedRooms.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
              <Calendar className="mx-auto mb-4 h-10 w-10 text-indigo-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{status === 'all' ? 'No quiz events yet' : `No ${status} events`}</h3>
              {(status === 'all' || status === 'scheduled') && canLaunchWizard && (
                <button type="button" onClick={goToWizard} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700">
                  <PlusCircle className="h-5 w-5" /> Create Quiz Event
                </button>
              )}
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <div className="bg-white rounded-t-xl border border-gray-200 border-b-0 min-w-[740px]">
                <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 rounded-t-xl text-xs font-semibold uppercase text-gray-500">
                  <div className="w-24 flex-shrink-0">Status</div>
                  <div className="w-36 flex-shrink-0">Date</div>
                  <div className="w-28 flex-shrink-0">Room ID</div>
                  <div className="w-16 flex-shrink-0">Fee</div>
                  <div className="w-24 flex-shrink-0">Income</div>
                  <div className="w-24 flex-shrink-0 text-center">Tickets Sold</div>
                  <div className="w-20 flex-shrink-0 text-right">Prizes</div>
                  <div className="flex-1 text-right">Actions</div>
                </div>
              </div>
              <div className="bg-white rounded-b-xl border border-gray-200 border-t-0 overflow-hidden min-w-[740px]">
                {sortedRooms.map(room => (
                  <QuizEventCard key={room.room_id} viewMode="table"
                    room={room} stats={roomStats[room.room_id]}
                    hasLinkedPaymentMethods={paymentMethodMap[room.room_id] ?? false}
                    outstandingCount={outstandingCounts[room.room_id] ?? 0}
                    onOpenDrawer={openDrawer} />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedRooms.map(room => (
                <QuizEventCard key={room.room_id} viewMode="cards"
                  room={room} stats={roomStats[room.room_id]}
                  hasLinkedPaymentMethods={paymentMethodMap[room.room_id] ?? false}
                  outstandingCount={outstandingCounts[room.room_id] ?? 0}
                  onOpenDrawer={openDrawer} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabbed drawer */}
      {drawerRoom && (
        <DigitalEventDrawer
          open={drawerOpen}
          room={drawerRoom}
          config={drawerConfig}
          stats={drawerStats}
          hasLinkedPaymentMethods={drawerHasPayments}
          outstandingCount={drawerOutstanding}
          linkedEventTitle={drawerLinked?.eventTitle}
          linkedEventId={drawerLinked?.eventId}
          showEventLinking={featureAccess.eventLinking}
          featureAccess={featureAccess}
          confirmedBy={confirmedBy}
          confirmedByName={confirmedByName}
          unlinkLoading={unlinkLoading}
          onClose={closeDrawer}
         onSaved={async () => { await loadRooms(status, true); }}
onLinked={async () => { await loadRooms(status, true); }}
onRefreshRoom={async () => { await loadRooms(status, true); }}
          confirmUnlink={confirmUnlink}
          onLaunchFromHere={() => openRoom(drawerRoom.room_id, drawerRoom.host_id)}
          onPaymentMethodSuccess={() => handlePaymentMethodSuccess(drawerRoom.room_id)}
        />
      )}

      {/* Club-level payment methods management */}
      {managePaymentsOpen && clubId && (
        <ManagePaymentMethodsModal clubId={clubId} onClose={() => setManagePaymentsOpen(false)} />
      )}

{scheduleEliminationOpen && (
  <ScheduleEliminationModal
    onClose={() => setScheduleEliminationOpen(false)}
    onSaved={async () => {
      setScheduleEliminationOpen(false);
      await loadRooms(status, true);
    }}
  />
)}
    </div>
  );
}

