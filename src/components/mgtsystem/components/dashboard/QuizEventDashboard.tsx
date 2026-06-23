// src/components/mgtsystem/components/dashboard/QuizEventDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { eventIntegrationsService } from '../../services/EventIntegrationsService';
import QuizRoomsService, { type RoomStats } from '../../services/quizRoomServices';
import { quizPaymentMethodsService } from '../../services/QuizPaymentMethodsService';
import quizLatePaymentsService from '../../services/QuizLatePaymentsService';
import ManagePaymentMethodsModal from '../../modals/ManagePaymentMethodsModal';
import ScheduleEliminationModal from '../../modals/ScheduleEliminationModal';
import ScheduleQuizModal from '../../modals/ScheduleQuizModal';
import ScheduleTicketedEventModal from '../../modals/ScheduleTicketedEventModal';
import ticketedEventMgmtService from '../../services/TicketedEventMgmtService';
import { DashboardFundraisingSummary } from '../progress/DashboardFundraisingSummary';
import ManageDonationButtonModal from '../../modals/ManageDonationButtonModal'; 
import TotalIncomeReportButton from './TotalIncomeReportButton';

import {
  CreditCard, Calendar, PlusCircle, RefreshCw,
  Trophy, CalendarDays, CheckCircle,
  LayoutGrid, LayoutList, Search, X, Play, Puzzle, Sparkles, Ticket, LogOut, Gift
} from 'lucide-react';

import { quizApi } from '../../../../shared/api';
import { useAuthStore } from '../../../../features/auth';
import { useQuizConfig } from '@/components/Quiz/hooks/useQuizConfig';

import type { Web2RoomListItem as Room } from '../../../../shared/api/quiz.api';

import DigitalEventDrawer from '../digitalEvents/DigitalEventDrawer';
import { FundraiselyEventCard } from '../cards/FundraiselyEventCard';
import { FundraiselyEventRow } from '../cards/FundraiselyEventRow';
import CreateEventForm from '../forms/CreateEventForm';
import eventsService from '../../services/eventsServices';
import type { Event, CreateEventForm as CreateEventFormData, UpdateEventForm } from '../../types/event';
import NotificationsTicker from './NotificationsTicker';

type ViewMode = 'table' | 'cards';
type StatusFilter = 'all' | 'upcoming' | 'live' | 'completed' | 'cancelled';
type GameTypeFilter = 'all' | 'quiz' | 'elimination' | 'ticketed_event';

interface LinkedActivity {
  room_id: string;
  game_type: 'quiz' | 'elimination' | 'ticketed_event';
  status: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';
}

function extractCreditsRemaining(ents: any): number {
  if (!ents) return 0;
  const candidates = [ents.game_credits_remaining, ents.creditsRemaining, ents.credits];
  const first = candidates.find(v => v !== undefined && v !== null);
  const n = typeof first === 'string' ? Number(first) : typeof first === 'number' ? first : 0;
  return Number.isFinite(n) ? n : 0;
}

function getFeatureAccess(ents: any) {
  const f = ents?.quiz_features || ents?.quizFeatures || {};
  return {
    eventLinking:  f?.eventLinking  === true,
    quizPayments:  f?.quizPayments  === true,
    ticketing:     f?.ticketing     === true,
  };
}

function parseConfigJson(v: any) {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
}

export default function QuizEventDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const logout = useAuthStore((s: any) => s.logout);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const clubId          = useAuthStore((s: any) => s.club?.id || s.user?.club_id);
  const clubName        = useAuthStore((s: any) => s.user?.club_name || s.user?.clubName || 'Your Club');
  const user            = useAuthStore((s: any) => s.user);
  const confirmedBy     = user?.id || user?.user_id || user?.club_user_id || '';
  const confirmedByName = user?.name || user?.full_name || user?.first_name || 'Admin';

  const [events, setEvents]                         = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading]           = useState(true);
  const [eventsError, setEventsError]               = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm]         = useState(false);
  const [eventToEdit, setEventToEdit]               = useState<Event | null>(null);
  const [statusFilter, setStatusFilter]             = useState<StatusFilter>('all');
  const [gameTypeFilter, setGameTypeFilter]         = useState<GameTypeFilter>('all');
  const [search, setSearch]                         = useState('');
  const [viewMode, setViewMode]                     = useState<ViewMode>('cards');
  const [isMobile, setIsMobile]                     = useState(false);

  const [activityMap, setActivityMap]               = useState<Record<string, LinkedActivity>>({});
  const [roomRowsMap, setRoomRowsMap]               = useState<Record<string, Room>>({});
  const [roomStatsMap, setRoomStatsMap]             = useState<Record<string, RoomStats>>({});
  const [outstandingMap, setOutstandingMap]         = useState<Record<string, number>>({});
  const [pendingActivityEventId, setPendingActivityEventId] = useState<string | null>(null);

  const [drawerOpen, setDrawerOpen]                 = useState(false);
  const [drawerRoom, setDrawerRoom]                 = useState<Room | null>(null);
  const [unlinkLoading, setUnlinkLoading]           = useState(false);
  const [linkedEventsMap, setLinkedEventsMap]       = useState<Record<string, { eventId: string; eventTitle: string }>>({});
  const [paymentMethodMap, setPaymentMethodMap]     = useState<Record<string, boolean>>({});

  const [managePaymentsOpen, setManagePaymentsOpen]               = useState(false);
   const [manageDonationButtonOpen, setManageDonationButtonOpen]   = useState(false);   
  const [scheduleQuizOpen, setScheduleQuizOpen]                   = useState(false);
  const [scheduleEliminationOpen, setScheduleEliminationOpen]     = useState(false);
  const [scheduleTicketedEventOpen, setScheduleTicketedEventOpen] = useState(false);
 const [isEditingTicketedEvent, setIsEditingTicketedEvent] = useState(false);
const [isEditingQuiz, setIsEditingQuiz] = useState(false);  // ← add this

  const [ents, setEnts]               = useState<any>(null);
  const [entsLoading, setEntsLoading] = useState(true);
  const [entsError, setEntsError]     = useState<string | null>(null);
  const featureAccess    = useMemo(() => getFeatureAccess(ents), [ents]);
  const creditsRemaining = useMemo(() => extractCreditsRemaining(ents), [ents]);

  const [incomeSeries, setIncomeSeries] = useState<{ date: string; total: number }[]>([]);

  // ── Mobile detection ────────────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const apply = () => { const m = mq.matches; setIsMobile(m); if (m) setViewMode('cards'); };
    apply(); mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  // ── Status counts ───────────────────────────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts = { all: events.length, upcoming: 0, live: 0, completed: 0, cancelled: 0 };
    for (const e of events) {
      const roomStatus = activityMap[e.id]?.status;
      if (roomStatus === 'live')                                    counts.live++;
      else if (roomStatus === 'open' || roomStatus === 'scheduled') counts.upcoming++;
      else if (roomStatus === 'completed')                          counts.completed++;
      else if (roomStatus === 'cancelled')                          counts.cancelled++;
      else counts.upcoming++;
    }
    return counts;
  }, [events, activityMap]);

  // ── Filtered events ─────────────────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    let list = [...events];

    if (statusFilter !== 'all') {
      list = list.filter(e => {
        const roomStatus = activityMap[e.id]?.status;
        if (statusFilter === 'live')      return roomStatus === 'live';
        if (statusFilter === 'upcoming')  return !roomStatus || roomStatus === 'scheduled' || roomStatus === 'open';
        if (statusFilter === 'completed') return roomStatus === 'completed';
        if (statusFilter === 'cancelled') return roomStatus === 'cancelled';
        return true;
      });
    }

    if (gameTypeFilter !== 'all') {
      list = list.filter(e => activityMap[e.id]?.game_type === gameTypeFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        e.title?.toLowerCase().includes(q) ||
        e.type?.toLowerCase().includes(q) ||
        e.location_label?.toLowerCase().includes(q)
      );
    }

    const order: Record<string, number> = { live: 0, open: 1, scheduled: 2, completed: 3, cancelled: 4 };
    list.sort((a, b) => {
      const as_ = activityMap[a.id]?.status ?? 'scheduled';
      const bs_ = activityMap[b.id]?.status ?? 'scheduled';
      const ao = order[as_] ?? 2;
      const bo = order[bs_] ?? 2;
      if (ao !== bo) return ao - bo;
      const aDate = new Date(a.start_datetime || a.event_date || 0).getTime();
      const bDate = new Date(b.start_datetime || b.event_date || 0).getTime();
      if (as_ === 'completed') return bDate - aDate;
      return aDate - bDate;
    });

    return list;
  }, [events, statusFilter, gameTypeFilter, search, activityMap]);

  // ── Game type counts ────────────────────────────────────────────────────────
  const gameTypeCounts = useMemo(() => {
    let base = [...events];
    if (statusFilter !== 'all') {
      base = base.filter(e => {
        const roomStatus = activityMap[e.id]?.status;
        if (statusFilter === 'live')      return roomStatus === 'live';
        if (statusFilter === 'upcoming')  return !roomStatus || roomStatus === 'scheduled' || roomStatus === 'open';
        if (statusFilter === 'completed') return roomStatus === 'completed';
        if (statusFilter === 'cancelled') return roomStatus === 'cancelled';
        return true;
      });
    }
    return {
      all:            base.length,
      quiz:           base.filter(e => activityMap[e.id]?.game_type === 'quiz').length,
      elimination:    base.filter(e => activityMap[e.id]?.game_type === 'elimination').length,
      ticketed_event: base.filter(e => activityMap[e.id]?.game_type === 'ticketed_event').length,
    };
  }, [events, statusFilter, activityMap]);

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (gameTypeFilter !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadEntitlements = async () => {
    try {
      setEntsLoading(true); setEntsError(null);
      setEnts(await quizApi.getEntitlements());
    } catch (e: any) {
      setEnts(null); setEntsError(e?.message || 'Failed');
    } finally {
      setEntsLoading(false);
    }
  };

  // ── loadActivities now returns the fresh rowMap so callers can sync
  // drawerRoom without relying on stale closure state. ────────────────────────
  const loadActivities = async (eventList: Event[]): Promise<Record<string, Room>> => {
    try {
      const pairs = await Promise.all(
        eventList.map(async (event) => {
          try {
            const res = await eventsService.getEventIntegrations(event.id);
            const integrations = res?.integrations || [];
            const linked = integrations.find((i: any) =>
              i.integration_type === 'quiz_web2' ||
              i.integration_type === 'elimination' ||
              i.integration_type === 'ticketed_event'
            );
            return [event.id, linked] as const;
          } catch {
            return [event.id, null] as const;
          }
        })
      );

      const newActivityMap: Record<string, LinkedActivity> = {};
      const roomIds: string[] = [];

      for (const [eventId, integration] of pairs) {
        if (!integration?.external_ref) continue;

        const gameType: LinkedActivity['game_type'] =
          integration.integration_type === 'elimination'
            ? 'elimination'
            : integration.integration_type === 'ticketed_event'
              ? 'ticketed_event'
              : 'quiz';

        newActivityMap[eventId] = {
          room_id:   integration.external_ref,
          game_type: gameType,
          status:    integration.status || 'scheduled',
        };
        roomIds.push(integration.external_ref);
      }

      setActivityMap(newActivityMap);

      let freshRowMap: Record<string, Room> = {};

      if (roomIds.length > 0) {
        try {
          const roomsRes = await quizApi.getWeb2RoomsList({ status: 'all' as any, time: 'all' });
          const updatedActivityMap: Record<string, LinkedActivity> = { ...newActivityMap };

          for (const room of roomsRes.rooms || []) {
            if (roomIds.includes(room.room_id)) {
              freshRowMap[room.room_id] = room as unknown as Room;
              const eventId = Object.keys(updatedActivityMap).find(
                eid => updatedActivityMap[eid]!.room_id === room.room_id
              );
              if (eventId && updatedActivityMap[eventId]) {
                updatedActivityMap[eventId] = {
                  ...updatedActivityMap[eventId]!,
                  status: (room.status as LinkedActivity['status']) || 'scheduled',
                };
              }
            }
          }

          setRoomRowsMap(freshRowMap);
          setActivityMap(updatedActivityMap);

          // Outstanding payments — only for completed non-ticketed-event rooms
          const completedIds = Object.values(updatedActivityMap)
            .filter((a): a is LinkedActivity =>
              !!a &&
              a.status === 'completed' &&
              a.game_type !== 'ticketed_event'
            )
            .map(a => a.room_id);

          if (completedIds.length > 0) {
            const outResults = await Promise.all(
              completedIds.map(id =>
                quizLatePaymentsService.getUnpaidPlayers(id)
                  .then(res => ({ id, count: res.players?.length || 0 }))
                  .catch(() => ({ id, count: 0 }))
              )
            );
            const outMap: Record<string, number> = {};
            outResults.forEach(r => { outMap[r.id] = r.count; });
            setOutstandingMap(outMap);
          }

        } catch (e) {
          console.error('Failed to load room rows:', e);
        }

        // Stats and payment methods
        const stats = await QuizRoomsService.batchGetRoomStats(roomIds);
        setRoomStatsMap(stats);

        // Cumulative income time series for the dashboard chart
QuizRoomsService.getRoomIncomeSeries(roomIds)
  .then(series => setIncomeSeries(series))
  .catch(() => {}); // non-blocking — chart falls back gracefully

        const pmResults = await Promise.all(
          roomIds.map(id =>
            quizPaymentMethodsService.getQuizPaymentMethods(id)
              .then(res => ({
                id,
                hasLinked: (res.ticket_method_ids ?? res.linked_method_ids ?? []).length > 0,
              }))
              .catch(() => ({ id, hasLinked: false }))
          )
        );
        const pmMap: Record<string, boolean> = {};
        pmResults.forEach(r => { pmMap[r.id] = r.hasLinked; });
        setPaymentMethodMap(pmMap);

       const [quizLinks, eliminationLinks, ticketedLinks] = await Promise.all([
  eventIntegrationsService.lookupLinks({ integration_type: 'quiz_web2',      external_refs: roomIds }),
  eventIntegrationsService.lookupLinks({ integration_type: 'elimination',     external_refs: roomIds }),
  eventIntegrationsService.lookupLinks({ integration_type: 'ticketed_event',  external_refs: roomIds }),
]);

const leMap: Record<string, { eventId: string; eventTitle: string }> = {};
for (const l of [
  ...(quizLinks.links       || []),
  ...(eliminationLinks.links || []),
  ...(ticketedLinks.links    || []),
]) {
  if (l.external_ref && l.event_id && l.event_title) {
    leMap[l.external_ref] = { eventId: l.event_id, eventTitle: l.event_title };
  }
}
setLinkedEventsMap(leMap);
      }

      return freshRowMap;
    } catch (e) {
      console.error('Failed to load activities:', e);
      return {};
    }
  };

  // ── loadEvents returns the fresh rowMap so onRefreshRoom can sync
  // drawerRoom immediately, without waiting for React to flush state. ──────────
  const loadEvents = async (): Promise<Record<string, Room>> => {
    if (!clubId) return {};
    setEventsLoading(true);
    setEventsError(null);
    try {
      const res = await eventsService.getClubEvents(clubId);
      const loaded = res.events || [];
      setEvents(loaded);
      if (loaded.length > 0) {
        return await loadActivities(loaded);
      }
      return {};
    } catch (e: any) {
      setEventsError(e?.message || 'Failed to load events');
      return {};
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => { loadEntitlements(); }, []);
  useEffect(() => { loadEvents(); }, [clubId]);
  useEffect(() => {
    if (!clubId) return;
    const p = searchParams.get('stripe');
    if (p === 'return' || p === 'refresh') setManagePaymentsOpen(true);
  }, [clubId]);

  // Poll live rooms every 30s
  useEffect(() => {
    const liveIds = Object.values(activityMap)
      .filter(a => a.status === 'live')
      .map(a => a.room_id);
    if (!liveIds.length) return;
    const interval = setInterval(async () => {
      const stats = await QuizRoomsService.batchGetRoomStats(liveIds).catch(() => ({}));
      setRoomStatsMap(prev => ({ ...prev, ...stats }));
    }, 30_000);
    return () => clearInterval(interval);
  }, [activityMap]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const openRoom = (roomId: string, hostId: string) => {
    ['quiz-setup-v2','quiz-admins','fundraisely-quiz-setup-draft','current-room-id','current-host-id','current-contract-address']
      .forEach(k => localStorage.removeItem(k));
    useQuizConfig.getState().resetConfig();
    window.open(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hostId)}`, '_blank');
  };

  const handleOpenDrawer = (event: Event) => {
    const activity = activityMap[event.id];
    if (!activity) return;
    const realRoom = roomRowsMap[activity.room_id];
    const room = realRoom ?? ({
      room_id:      activity.room_id,
      host_id:      '',
      status:       activity.status,
      scheduled_at: event.start_datetime || event.event_date,
      config_json:  null,
      game_type:    activity.game_type,
    } as unknown as Room);
    setDrawerRoom(room);
    setDrawerOpen(true);
  };

  const handleActivitySaved = async (
    roomId?: string,
    gameType: 'quiz' | 'elimination' | 'ticketed_event' = 'quiz'
  ) => {
    if (roomId && pendingActivityEventId) {
      try {
        await eventIntegrationsService.link(pendingActivityEventId, {
          integration_type:
            gameType === 'elimination'
              ? 'elimination'
              : gameType === 'ticketed_event'
                ? 'ticketed_event'
                : 'quiz_web2',
          external_ref: roomId,
        });
      } catch (e) {
        console.error('Failed to auto-link activity to event:', e);
      }

      try {
        const pendingEvent = events.find(e => e.id === pendingActivityEventId);
        const pm = pendingEvent?.payment_methods_json;
        if (pm && (pm.ticket_method_ids?.length || pm.onnight_method_ids?.length)) {
          await quizPaymentMethodsService.updateLinkedPaymentMethods(
            roomId,
            pm.ticket_method_ids  || [],
            pm.onnight_method_ids || [],
          );
        }
      } catch (e) {
        console.error('Failed to apply payment methods to room:', e);
      }
    }
    setPendingActivityEventId(null);
    await loadEvents();
  };

  const handleAddActivity = (event: Event, type: 'quiz' | 'elimination' | 'ticketed_event') => {
    setPendingActivityEventId(event.id);
    if (type === 'quiz')                setScheduleQuizOpen(true);
    else if (type === 'elimination')    setScheduleEliminationOpen(true);
    else if (type === 'ticketed_event') setScheduleTicketedEventOpen(true);
  };

  const handleCreateEvent = async (data: CreateEventFormData | UpdateEventForm) => {
    if (!clubId) throw new Error('No club ID');
    await eventsService.createEvent(clubId, data as CreateEventFormData);
    await loadEvents();
  };

  const handleUpdateEvent = async (data: CreateEventFormData | UpdateEventForm) => {
    if (!eventToEdit) return;
    await eventsService.updateEvent(eventToEdit.id, data as UpdateEventForm);

    const activity = activityMap[eventToEdit.id];
    if (activity?.game_type === 'ticketed_event' && activity.status === 'scheduled') {
      try {
        const updates: any = {};
        if ((data as any).start_datetime) updates.scheduledAt = (data as any).start_datetime;
        if ((data as any).time_zone)      updates.timeZone    = (data as any).time_zone;
        if (Object.keys(updates).length > 0) {
          await ticketedEventMgmtService.updateRoom(activity.room_id, updates);
        }
      } catch (e) {
        console.error('Failed to sync date to ticketed event room:', e);
      }
    }

    setEventToEdit(null);
    await loadEvents();
  };

  const handlePublish   = async (event: Event) => { await eventsService.publishEvent(event.id);   await loadEvents(); };
  const handleUnpublish = async (event: Event) => { await eventsService.unpublishEvent(event.id); await loadEvents(); };

  const confirmUnlink = async () => {
    if (!drawerRoom) return;
    const linked = linkedEventsMap[drawerRoom.room_id];
    if (!linked) return;
    try {
      setUnlinkLoading(true);
      const intRes = await eventIntegrationsService.list(linked.eventId);
      const integration = intRes.integrations?.find((i: any) => i.external_ref === drawerRoom.room_id);
      if (!integration) throw new Error('Integration not found');
      await eventIntegrationsService.unlink(linked.eventId, integration.id);
      setLinkedEventsMap(prev => { const u = { ...prev }; delete u[drawerRoom.room_id]; return u; });
      await loadEvents();
    } catch (e: any) {
      alert(`Failed to unlink: ${e?.message || 'Unknown error'}`);
    } finally {
      setUnlinkLoading(false);
    }
  };

  const handlePaymentMethodSuccess = async (roomId: string) => {
    try {
      const res = await quizPaymentMethodsService.getQuizPaymentMethods(roomId);
      setPaymentMethodMap(prev => ({
        ...prev,
        [roomId]: (res.ticket_method_ids ?? res.linked_method_ids ?? []).length > 0,
      }));
    } catch { /* ignore */ }
  };

  const drawerConfig      = drawerRoom ? parseConfigJson(drawerRoom.config_json) : null;
  const drawerStats       = drawerRoom ? roomStatsMap[drawerRoom.room_id] : undefined;
  const drawerHasPayments = drawerRoom ? (paymentMethodMap[drawerRoom.room_id] ?? false) : false;
  const drawerOutstanding = drawerRoom ? (outstandingMap[drawerRoom.room_id] ?? 0) : 0;
  const drawerLinked      = drawerRoom ? linkedEventsMap[drawerRoom.room_id] : undefined;

  // ── Game type filter buttons config ────────────────────────────────────────
  const gameTypeButtons: {
    key: GameTypeFilter;
    label: string;
    icon: React.ReactNode;
    count: number;
  }[] = [
    { key: 'all',            label: 'All types',   icon: null,                              count: gameTypeCounts.all },
    { key: 'quiz',           label: 'Quiz',        icon: <Play className="h-3 w-3" />,      count: gameTypeCounts.quiz },
    { key: 'elimination',    label: 'Elimination', icon: <Trophy className="h-3 w-3" />,    count: gameTypeCounts.elimination },
    { key: 'ticketed_event', label: 'Ticketed',    icon: <Ticket className="h-3 w-3" />,    count: gameTypeCounts.ticketed_event },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ backgroundColor: '#f6f1e8' }}>
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
              <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition whitespace-nowrap"
              style={{ background: '#ffffff', borderColor: '#f2c5c2', color: '#b42318' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#fff4f3'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>

               {/* ── Notifications ── */}
        <div className="mb-6">
          <NotificationsTicker />
        </div>

        {/* ── Header ── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#102532' }}>Events</h1>
            <p className="mt-1 text-sm font-semibold" style={{ color: '#52636f' }}>{clubName}</p>
          </div>
          
      <div className="flex gap-2 flex-wrap">
            {featureAccess.quizPayments && (
              <button type="button" onClick={() => setManagePaymentsOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap"
                style={{ background: 'rgba(210,181,130,0.2)', color: '#102532' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(210,181,130,0.35)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(210,181,130,0.2)')}>
                <CreditCard className="h-4 w-4" />
                <span className="hidden sm:inline">Payment Methods</span>
                <span className="sm:hidden">Payments</span>
              </button>
            )}
               <TotalIncomeReportButton clubId={clubId} clubName={clubName} />

            {featureAccess.quizPayments && (
              <button type="button" onClick={() => setManageDonationButtonOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition whitespace-nowrap"
                style={{ background: 'rgba(210,181,130,0.2)', color: '#102532' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(210,181,130,0.35)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(210,181,130,0.2)')}>
                <Gift className="h-4 w-4" />
                <span className="hidden sm:inline">Donation Button</span>
                <span className="sm:hidden">Donate</span>
              </button>
            )}

            <button type="button"
              onClick={() => { setEventToEdit(null); setShowCreateForm(true); }}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition"
              style={{ background: '#157f85' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#0e6268')}
              onMouseLeave={e => (e.currentTarget.style.background = '#157f85')}>
              <PlusCircle className="h-4 w-4" /> Create Event
            </button>
          </div>
        </div>

 

        {/* ── Fundraising summary ── */}
{!eventsLoading && events.length > 0 && (
<DashboardFundraisingSummary
  events={events}
  activityMap={activityMap}
  roomStatsMap={roomStatsMap}
  incomeSeries={incomeSeries}
/>
)}

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {[
            { label: 'Total Events', value: events.length,         Icon: CalendarDays, color: 'indigo' },
            { label: 'Upcoming',     value: statusCounts.upcoming, Icon: Calendar,     color: 'blue'   },
            { label: 'Live Now',     value: statusCounts.live,     Icon: CheckCircle,  color: 'green'  },
            {
              label: 'Credits',
              value: entsLoading ? '…' : entsError ? 'N/A' : creditsRemaining,
              Icon: Trophy,
              color: 'amber',
              refresh: loadEntitlements,
            },
          ].map(({ label, value, Icon, color, refresh }) => (
            <div key={label} className="rounded-xl p-3 sm:p-4 shadow-sm"
              style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
              <div className="flex items-center gap-3">
                <div className={`flex-shrink-0 p-2 rounded-lg bg-${color}-100`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-600`} />
                </div>
                <div>
                  <p className="text-xs font-medium" style={{ color: '#52636f' }}>{label}</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-lg sm:text-xl font-bold text-${color}-600`}>{value}</p>
                    {refresh && (
                      <button type="button" onClick={refresh} className="p-1 rounded hover:bg-gray-100">
                        <RefreshCw className="h-3 w-3" style={{ color: '#52636f' }} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="mb-4 overflow-hidden rounded-xl shadow-sm"
          style={{ background: '#ffffff', border: '1px solid #dce1df' }}>

          {/* Status tabs */}
          <div className="flex items-center gap-1 px-2 pt-2 pb-0"
            style={{ borderBottom: '1px solid #f1f0ee' }}>
            {(['all','upcoming','live','completed','cancelled'] as StatusFilter[]).map(s => {
              const count = statusCounts[s as keyof typeof statusCounts] ?? 0;
              const isActive = statusFilter === s;
              const labels: Record<StatusFilter, string> = {
                all: 'All', upcoming: 'Upcoming', live: 'Live',
                completed: 'Completed', cancelled: 'Cancelled',
              };
              return (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors whitespace-nowrap rounded-t-lg ${
                    isActive ? '' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                  style={isActive
                    ? { color: '#157f85', borderBottom: '2px solid #157f85', marginBottom: '-1px' }
                    : {}}>
                  {s === 'live' && statusCounts.live > 0 && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                    </span>
                  )}
                  {labels[s]}
                  {count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      isActive
                        ? 'bg-[rgba(21,127,133,0.12)] text-[#157f85]'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Game type + search row */}
          <div className="flex items-center gap-2 px-3 py-2 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
              {gameTypeButtons.map(({ key, label, icon, count }) => {
                const isActive = gameTypeFilter === key;
                return (
                  <button key={key} onClick={() => setGameTypeFilter(key)}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap"
                    style={isActive
                      ? { background: '#157f85', color: '#fff' }
                      : { background: '#f6f1e8', color: '#52636f' }}>
                    {icon}
                    {label}
                    {count > 0 && (
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                        isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              {[
                { label: 'Puzzle', icon: <Puzzle className="h-3 w-3" /> },
                { label: 'Other',  icon: <Sparkles className="h-3 w-3" /> },
              ].map(({ label, icon }) => (
                <div key={label}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold cursor-not-allowed opacity-50 whitespace-nowrap"
                  style={{ background: '#f1f0ee', color: '#8a9bab' }}
                  title="Coming soon">
                  {icon}{label}
                  <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                    style={{ background: 'rgba(210,181,130,0.2)', color: '#8a6d2f' }}>
                    Soon
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden sm:block h-4 w-px bg-gray-200 flex-shrink-0" />

            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              <input
                type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events…"
                className="w-full rounded-lg border py-1.5 pl-8 pr-7 text-xs text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#157f85] focus:border-transparent transition"
                style={{ borderColor: '#dce1df', background: '#fafafa' }}
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter('all'); setGameTypeFilter('all'); setSearch(''); }}
                className="hidden sm:flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex-shrink-0 transition-colors hover:bg-red-50 text-gray-500 hover:text-red-600"
                style={{ border: '1px solid #dce1df' }}>
                <X className="h-3 w-3" /> Clear
              </button>
            )}

            {!isMobile && (
              <div className="flex gap-1 rounded-lg p-1 flex-shrink-0" style={{ background: '#f1f0ee' }}>
                <button onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  style={viewMode === 'table' ? { color: '#157f85' } : {}}>
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                  style={viewMode === 'cards' ? { color: '#157f85' } : {}}>
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Events list ── */}
        {eventsLoading ? (
          <div className="flex items-center justify-center py-16 rounded-xl"
            style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-t-transparent"
              style={{ borderColor: '#157f85', borderTopColor: 'transparent' }} />
            <span className="ml-3 text-sm" style={{ color: '#52636f' }}>Loading events…</span>
          </div>
        ) : eventsError ? (
          <div className="py-12 text-center rounded-xl"
            style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
            <p className="text-sm font-semibold" style={{ color: '#e9574f' }}>Failed to load events</p>
            <p className="mt-1 text-xs" style={{ color: '#52636f' }}>{eventsError}</p>
            <button onClick={loadEvents}
              className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ background: '#157f85' }}>
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center rounded-xl"
            style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
            <Calendar className="mx-auto mb-4 h-10 w-10" style={{ color: '#b8c6b0' }} />
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#102532' }}>
              {search
                ? `No events matching "${search}"`
                : events.length === 0
                  ? 'No events yet'
                  : `No ${statusFilter} events`}
            </h3>
            <p className="text-sm mb-4" style={{ color: '#52636f' }}>
              {events.length === 0
                ? 'Create your first event, then add an activity to it'
                : 'Try a different filter'}
            </p>
            {events.length === 0 && (
              <button
                onClick={() => { setEventToEdit(null); setShowCreateForm(true); }}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: '#157f85' }}>
                <PlusCircle className="h-4 w-4" /> Create First Event
              </button>
            )}
            {(search || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                className="ml-3 text-sm font-semibold"
                style={{ color: '#157f85' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="overflow-hidden rounded-xl shadow-sm" style={{ border: '1px solid #dce1df' }}>
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_120px] gap-4 px-4 py-3 text-xs font-semibold uppercase"
              style={{ background: '#fbf8f2', color: '#52636f', borderBottom: '1px solid #dce1df' }}>
              <div>Event</div><div>Date</div><div>Activity</div>
              <div>Tickets</div><div>Income</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y" style={{ background: '#ffffff', '--divide-color': '#f1f0ee' } as any}>
              {filteredEvents.map(event => {
                const activity    = activityMap[event.id];
                const stats       = activity ? roomStatsMap[activity.room_id] : undefined;
                const outstanding = activity ? (outstandingMap[activity.room_id] ?? 0) : 0;
                return (
                  <FundraiselyEventRow
                    key={event.id}
                    event={event}
                    linkedActivity={activity}
                    activityStats={stats}
                    outstandingCount={outstanding}
                    onOpenDrawer={() => handleOpenDrawer(event)}
                    onAddActivity={(type) => handleAddActivity(event, type)}
                    onEdit={() => { setEventToEdit(event); setShowCreateForm(true); }}
                    onPublish={() => handlePublish(event)}
                    onUnpublish={() => handleUnpublish(event)}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map(event => {
              const activity    = activityMap[event.id];
              const stats       = activity ? roomStatsMap[activity.room_id] : undefined;
              const outstanding = activity ? (outstandingMap[activity.room_id] ?? 0) : 0;
              return (
                <FundraiselyEventCard
                  key={event.id}
                  event={event}
                  linkedActivity={activity}
                  activityStats={stats}
                  outstandingCount={outstanding}
                  onOpenDrawer={() => handleOpenDrawer(event)}
                  onAddActivity={(type) => handleAddActivity(event, type)}
                  onEdit={() => { setEventToEdit(event); setShowCreateForm(true); }}
                  onPublish={() => handlePublish(event)}
                  onUnpublish={() => handleUnpublish(event)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modals ── */}

      {showCreateForm && (
        <CreateEventForm
          onSubmit={eventToEdit ? handleUpdateEvent : handleCreateEvent}
          onCancel={() => { setShowCreateForm(false); setEventToEdit(null); }}
          editMode={!!eventToEdit}
          existingEvent={eventToEdit}
        />
      )}

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
          linkedEvent={events.find(e => e.id === drawerLinked?.eventId)}
          showEventLinking={featureAccess.eventLinking}
          featureAccess={featureAccess}
          confirmedBy={confirmedBy}
          confirmedByName={confirmedByName}
          unlinkLoading={unlinkLoading}
          onClose={() => { setDrawerOpen(false); setTimeout(() => setDrawerRoom(null), 200); }}
          onSaved={async () => { await loadEvents(); }}
          onLinked={async () => { await loadEvents(); }}
          onRefreshRoom={async () => {
            // loadEvents now returns the fresh rowMap synchronously within the
            // same async chain, so we can update drawerRoom before React flushes
            // the setState calls — avoiding the stale closure problem.
            const freshRowMap = await loadEvents();
            if (drawerRoom) {
              const fresh = freshRowMap[drawerRoom.room_id];
              if (fresh) setDrawerRoom(fresh as unknown as Room);
            }
          }}
          confirmUnlink={confirmUnlink}
          onLaunchFromHere={() => openRoom(drawerRoom.room_id, drawerRoom.host_id)}
          onPaymentMethodSuccess={() => handlePaymentMethodSuccess(drawerRoom.room_id)}
          onEditQuiz={() => {
            const linkedEvent = drawerLinked?.eventId
              ? events.find(e => e.id === drawerLinked.eventId)
              : undefined;
            if (linkedEvent) {
              setPendingActivityEventId(linkedEvent.id);
              setIsEditingQuiz(true);  
              setScheduleQuizOpen(true);
              setDrawerOpen(false);
            }
          }}
          onEditTicketedEvent={() => {
    const linkedEvent = drawerLinked?.eventId
       ? events.find(e => e.id === drawerLinked.eventId)
       : undefined;
     if (linkedEvent) {
       setPendingActivityEventId(linkedEvent.id);
       setIsEditingTicketedEvent(true);
       setScheduleTicketedEventOpen(true);
       setDrawerOpen(false);
     }
   }}
        />
      )}

      {managePaymentsOpen && clubId && (
        <ManagePaymentMethodsModal
          clubId={clubId}
          onClose={() => setManagePaymentsOpen(false)}
        />
      )}

         {manageDonationButtonOpen && clubId && (
        <ManageDonationButtonModal
          clubId={clubId}
          onClose={() => setManageDonationButtonOpen(false)}
          onOpenPaymentMethods={() => {
            setManageDonationButtonOpen(false);
            setManagePaymentsOpen(true);
          }}
        />
      )}

      {scheduleQuizOpen && (() => {
        const pendingEvent = events.find(e => e.id === pendingActivityEventId);
        if (!pendingEvent) return null;
        return (
        <ScheduleQuizModal
  event={pendingEvent}
  existingRoom={isEditingQuiz ? drawerRoom : null}   // ← add this
  onClose={() => {
    setScheduleQuizOpen(false);
    setPendingActivityEventId(null);
    setIsEditingQuiz(false);    // ← add this reset
  }}
  onSaved={async (roomId) => {
    setScheduleQuizOpen(false);
    setIsEditingQuiz(false);    // ← add this reset
    await handleActivitySaved(roomId, 'quiz');
  }}
/>
        );
      })()}

      {scheduleEliminationOpen && (() => {
        const pendingEvent = events.find(e => e.id === pendingActivityEventId);
        if (!pendingEvent) return null;
        return (
          <ScheduleEliminationModal
            event={pendingEvent}
            onClose={() => { setScheduleEliminationOpen(false); setPendingActivityEventId(null); }}
            onSaved={async (roomId) => {
              setScheduleEliminationOpen(false);
              await handleActivitySaved(roomId, 'elimination');
            }}
          />
        );
      })()}

      {scheduleTicketedEventOpen && (() => {
    const pendingEvent = events.find(e => e.id === pendingActivityEventId);
     if (!pendingEvent) return null;
     const roomToEdit = isEditingTicketedEvent ? drawerRoom : null;
     return (
       <ScheduleTicketedEventModal
         event={pendingEvent}
         existingRoom={roomToEdit as any}
         onClose={() => {
           setScheduleTicketedEventOpen(false);
           setPendingActivityEventId(null);
           setIsEditingTicketedEvent(false);
         }}
         onSaved={async (roomId) => {
           setScheduleTicketedEventOpen(false);
           setIsEditingTicketedEvent(false);
           await handleActivitySaved(roomId, 'ticketed_event');
         }}
       />
     );
   })()}
    </div>
  );
}

