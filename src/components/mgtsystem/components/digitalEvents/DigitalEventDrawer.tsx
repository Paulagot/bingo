// src/components/mgtsystem/components/digitalEvents/DigitalEventDrawer.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  X, Eye, Settings, CreditCard, Ticket,
  Play, BarChart3, Scale, Heart, QrCode, Trophy, ReceiptText, Puzzle, Footprints,
} from "lucide-react";
import type { Web2RoomListItem as Room } from "../../../../shared/api/quiz.api";
import type { RoomStats } from "../../services/quizRoomServices";
import type { Event } from "../../types/event";
import ReconciliationService from "../../services/QuizReconciliationService";
import ticketedEventReconciliationService from "../../services/TicketedEventReconciliationService";
import OverviewTabTicketedEvent from "./tabs/OverviewTabTicketedEvent";

import OverviewTab from "./tabs/OverviewTab";
import SetupTab from "./tabs/SetupTab";
import PaymentsTab from "./tabs/PaymentsTab";
import TicketsTab from "./tabs/TicketsTab";
import LaunchTab from "./tabs/LaunchTab";
import ReportTab from "./tabs/ReportTab";
import ApprovalTotalsTab from "./tabs/ApprovalTotalsTab";
import ImpactTab from "./tabs/ImpactTab";
import TicketedEventReconciliationTab from "./tabs/reconciliation/TicketedEventReconciliationTab";
import TicketsTabTicketedEvent from './tabs/TicketsTabTicketedEvent';

import OverviewTabSubscription from './tabs/OverviewTabSubscription';
import SetupTabSubscription from './tabs/SetupTabSubscription';
import SubscriptionLinkPanel from './tabs/SubscriptionLinkPanel';
import LaunchTabSubscription from './tabs/LaunchTabSubscription';
import ImpactTabSubscription from './tabs/ImpactTabSubscription';
import LeaderboardTabSubscription from './tabs/LeaderboardTabSubscription';
import SubscriptionReconciliationTab from './tabs/reconciliation/SubscriptionReconciliationTab';
import { challengeService, type Challenge, type LeaderboardEntry } from '../../../puzzles/services/ChallengeService';

// ── Puzzle Drop tabs ─────────────────────────────────────────────────────────
import OverviewTabDrop from './tabs/OverviewTabDrop';
import SetupTabDrop from './tabs/SetupTabDrop';
import PurchasesTabDrop from './tabs/PurchasesTabDrop';
import LeaderboardTabDrop from './tabs/LeaderboardTabDrop';
import ImpactTabDrop from './tabs/ImpactTabDrop';
import LaunchTabDrop from './tabs/LaunchTabDrop';
import DropReconciliationTab from './tabs/reconciliation/DropReconciliationTab';
import OverviewTabSponsoredActivity from './tabs/OverviewTabSponsoredActivity';
import SponsoredContributionsTab from './tabs/SponsoredContributionsTab';
import ImpactTabSponsoredActivity from './tabs/ImpactTabSponsoredActivity';
import ManageSponsoredActivityTab from './tabs/ManageSponsoredActivityTab';
import SponsoredActivityReconciliationTab from './tabs/reconciliation/SponsoredActivityReconciliationTab';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type TabId =
  | "impact" | "overview" | "setup" | "payments"
  | "tickets" | "launch" | "report" | "approval"
  | "reconciliation" | "subscriptionLink" | "leaderboard";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  badge?: number;
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    live:      { background: '#dcf5e7', color: '#166534', borderColor: '#bbf0d0' },
    scheduled: { background: 'rgba(21,127,133,0.12)', color: '#157f85', borderColor: 'rgba(21,127,133,0.3)' },
    completed: { background: '#f1f0ee', color: '#52636f', borderColor: '#dce1df' },
    cancelled: { background: 'rgba(233,87,79,0.1)', color: '#c8423b', borderColor: 'rgba(233,87,79,0.3)' },
    open:      { background: 'rgba(210,181,130,0.2)', color: '#8a6d2f', borderColor: 'rgba(210,181,130,0.5)' },
  };
  return map[status] ?? { background: 'rgba(21,127,133,0.12)', color: '#157f85', borderColor: 'rgba(21,127,133,0.3)' };
}

interface Props {
  open: boolean;
  room: Room | null;
  clubId: string;
  config: any;
  stats?: RoomStats;
  hasLinkedPaymentMethods: boolean;
  outstandingCount?: number;
  linkedEventTitle?: string | null;
  linkedEventId?: string | null;
  linkedEvent?: Event;
  showEventLinking?: boolean;
  featureAccess?: {
    eventLinking?: boolean;
    quizPayments?: boolean;
    ticketing?: boolean;
  };
  confirmedBy: string;
  confirmedByName?: string;
  unlinkLoading?: boolean;
  onClose: () => void;
  onSaved: () => void;
  onLinked: () => void;
  confirmUnlink: () => Promise<void>;
  onLaunchFromHere: () => void;
  onPaymentMethodSuccess: () => void;
  onRefreshRoom?: () => Promise<void>;
  /** Opens the unified EditFundraiserModal (event + activity together). */
  onEditFundraiser?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function DigitalEventDrawer({
  open,
  room,
  clubId,
  config,
  stats,
  hasLinkedPaymentMethods,
  outstandingCount = 0,
  linkedEventTitle,
  linkedEvent,
  featureAccess,
  confirmedBy,
  confirmedByName,
  onClose,
  onSaved,
  onLaunchFromHere,
  onPaymentMethodSuccess,
  onRefreshRoom,
  onEditFundraiser,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Audit view ─────────────────────────────────────────────────────────────
  const [auditView, setAuditView]               = useState<any>(null);
  const [auditViewLoading, setAuditViewLoading] = useState(false);
  const [auditViewError, setAuditViewError]     = useState<string | null>(null);
  const lastFetchedRoomId = useRef<string | null>(null);

  const isCompleted     = room?.status === "completed";
  const isCancelled     = room?.status === "cancelled";
  const isTicketedEvent = (room as any)?.game_type === 'ticketed_event';
  const isSubscription  = (room as any)?.game_type === 'puzzle_sub';
  // Drop flag — same pattern as isSubscription/isTicketedEvent above.
  const isDrop          = (room as any)?.game_type === 'puzzle_drop';
  const isSponsored     = (room as any)?.game_type === 'sponsored_activity';
  const canUseTicketing = featureAccess?.ticketing === true;
  const canUsePayments  = featureAccess?.quizPayments === true;

  // ── Subscription challenge data ─────────────────────────────────────────────
  // The drawer only ever has a room (room_id, game_type, status) — the
  // actual challenge (title, schedule, price, player_count) lives in
  // fundraisely_puzzle_challenges and is fetched once here, the same way
  // auditView is fetched once and passed down to Report/Approval tabs.
  const [challenge, setChallenge]               = useState<Challenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [challengeError, setChallengeError]     = useState<string | null>(null);
  const lastFetchedChallengeRoomId = useRef<string | null>(null);

  const [leaderboard, setLeaderboard]               = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  const fetchChallenge = useCallback(async (roomId: string) => {
    setChallengeLoading(true);
    setChallengeError(null);
    try {
      const data = await challengeService.getChallengeByRoomId(roomId);
      setChallenge(data);
      lastFetchedChallengeRoomId.current = roomId;
      if (!data) {
        setChallengeError('No linked challenge found for this room.');
        return;
      }
      setLeaderboardLoading(true);
      try {
        const board = await challengeService.getLeaderboard(data.id);
        setLeaderboard(board);
      } catch {
        setLeaderboard([]); // non-critical — Impact/Leaderboard tabs degrade gracefully
      } finally {
        setLeaderboardLoading(false);
      }
    } catch (e: any) {
      setChallengeError(e?.message || 'Failed to load challenge data');
    } finally {
      setChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !room?.room_id || !isSubscription) return;
    if (lastFetchedChallengeRoomId.current !== room.room_id) {
      fetchChallenge(room.room_id);
    }
  }, [open, room?.room_id, isSubscription, fetchChallenge]);

  const fetchAuditView = useCallback(async (roomId: string, isTicketed: boolean) => {
    setAuditViewLoading(true);
    setAuditViewError(null);
    try {
      const data = (await ReconciliationService.getAuditView(roomId)) as any;
      if (!data.ok) {
        setAuditViewError(data.error || "Failed to load reconciliation data");
        return;
      }

      let view = data.view;

      if (isTicketed) {
        try {
          const state = await ticketedEventReconciliationService.getState(roomId);
          if (state?.reconciliation) {
            view = {
              ...view,
              reconciliation: {
                ...view.reconciliation,
                ...state.reconciliation,
              },
            };
          }
        } catch (e) {
          console.error('[DigitalEventDrawer] ticketed reconciliation overlay failed:', e);
        }
      }

      setAuditView(view);
      lastFetchedRoomId.current = roomId;
    } catch (e: any) {
      setAuditViewError(e?.message || "Network error");
    } finally {
      setAuditViewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !room?.room_id) return;
    // Drop never uses the quiz auditView system — it has its own
    // reconciliation backend/tab entirely — so skip this fetch for Drop,
    // same as the isSubscription skip already does.
    if (!isCompleted || isSubscription || isDrop || isSponsored) {
      setAuditView(null);
      lastFetchedRoomId.current = null;
      return;
    }
    if (lastFetchedRoomId.current !== room.room_id) {
      fetchAuditView(room.room_id, isTicketedEvent);
    }
  }, [open, room?.room_id, room?.status, isCompleted, isSubscription, isDrop, isSponsored, isTicketedEvent, fetchAuditView]);

  // ── Initial tab selection ──────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      if (isSponsored) {
        setActiveTab(room?.status === 'scheduled' ? 'overview' : 'impact');
      } else if (isDrop) {
        // Drop has no completed/live reshuffle — Overview first always.
        // Purchases stays relevant the whole time this is on sale rather
        // than being a "wind-down" tab like Impact is for the others, so
        // there's no equivalent of Subscription's isSubscriptionLive jump.
        setActiveTab('overview');
      } else if (isSubscription) {
        setActiveTab(room?.status !== "scheduled" ? 'impact' : 'overview');
      } else if (room?.status === "completed" && isTicketedEvent) {
        const reconciliationStatus = (room as any).reconciliation_status;
        setActiveTab(reconciliationStatus === 'closed' ? 'impact' : 'reconciliation');
      } else {
        setActiveTab(room?.status === "completed" ? "impact" : "overview");
      }
    }
  }, [open, room?.room_id]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleRefresh = useCallback(async () => {
    if (onRefreshRoom) await onRefreshRoom();
    if (room?.room_id && isCompleted && !isSubscription && !isDrop && !isSponsored) {
      lastFetchedRoomId.current = null;
      await fetchAuditView(room.room_id, isTicketedEvent);
    }
    if (room?.room_id && isSubscription) {
      lastFetchedChallengeRoomId.current = null;
      await fetchChallenge(room.room_id);
    }
    // Drop has no extra fetch here — each Drop tab (Overview, Setup,
    // Purchases, Leaderboard, Impact, Reconciliation, Launch) owns and
    // re-fetches its own data internally when needed.
  }, [onRefreshRoom, room?.room_id, isCompleted, isSubscription, isDrop, isSponsored, fetchAuditView, fetchChallenge, isTicketedEvent]);

  if (!open || !room) return null;

  const pendingVerifications = stats?.pendingTicketVerifications ?? 0;

  const scheduledDate = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString("en-GB", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  // ── Ticket tab props (quiz/elimination/ticketed only) ──────────────────────
  const ticketTabProps = {
    id: "tickets" as TabId,
    label: "Tickets",
    icon: <Ticket className="h-3.5 w-3.5" />,
    disabled: isTicketedEvent
      ? false
      : (!hasLinkedPaymentMethods || !canUseTicketing),
    disabledReason: !canUseTicketing
      ? "Ticketing not on your plan"
      : "Add a payment method first (Payments tab)",
  };

  // ── Launch tab label changes for ticketed events ───────────────────────────
  const launchTab = {
    id: "launch" as TabId,
    label: isTicketedEvent ? "Check-in" : "Launch",
    icon: isTicketedEvent
      ? <QrCode className="h-3.5 w-3.5" />
      : <Play className="h-3.5 w-3.5" />,
    disabled: isCancelled,
    disabledReason: "Not available for cancelled events",
  };

  const reconciliationClosed = (room as any).reconciliation_status === 'closed';

  // ── Tab sets ───────────────────────────────────────────────────────────────
  const overviewTab       = { id: "overview" as TabId, label: "Overview", icon: <Eye className="h-3.5 w-3.5" /> };
  const setupTab          = { id: "setup" as TabId, label: "Setup", icon: <Settings className="h-3.5 w-3.5" /> };
  const subscriptionLinkTab = { id: "subscriptionLink" as TabId, label: "Join Link", icon: <Ticket className="h-3.5 w-3.5" /> };
  const subscriptionLaunchTab = { id: "launch" as TabId, label: "Launch", icon: <Play className="h-3.5 w-3.5" />, disabled: isCancelled, disabledReason: "Not available for cancelled challenges" };
  const leaderboardTab    = { id: "leaderboard" as TabId, label: "Leaderboard", icon: <Trophy className="h-3.5 w-3.5" /> };
  const subReconciliationTab = { id: "reconciliation" as TabId, label: "Reconciliation", icon: <Scale className="h-3.5 w-3.5" /> };
  const subImpactTab      = { id: "impact" as TabId, label: "Impact", icon: <Heart className="h-3.5 w-3.5" /> };

  const isSubscriptionLive = room.status !== "scheduled";

  // ── Drop tabs ────────────────────────────────────────────────────────────
  // Purchases/Leaderboard/Impact/Reconciliation/Launch all reuse existing
  // TabId values ("tickets", "leaderboard", "impact", "reconciliation",
  // "launch") — label/icon swap only, same trick launchTab already does
  // for ticketed events' "Check-in" label — so TabId doesn't need
  // widening, and the content render section below just branches on
  // isDrop first within each existing activeTab === "..." block.
  const dropOverviewTab       = { id: "overview" as TabId, label: "Overview", icon: <Eye className="h-3.5 w-3.5" /> };
  const dropSetupTab          = {
    id: "setup" as TabId,
    label: "Setup",
    icon: <Settings className="h-3.5 w-3.5" />,
    disabled: room.status !== 'scheduled',
    disabledReason: "Only editable before this Drop goes on sale",
  };
  const dropPurchasesTab      = { id: "tickets" as TabId, label: "Purchases", icon: <ReceiptText className="h-3.5 w-3.5" /> };
  const dropLeaderboardTab    = { id: "leaderboard" as TabId, label: "Leaderboard", icon: <Trophy className="h-3.5 w-3.5" /> };
  const dropImpactTab         = { id: "impact" as TabId, label: "Impact", icon: <Heart className="h-3.5 w-3.5" /> };
  const dropReconciliationTab = { id: "reconciliation" as TabId, label: "Reconciliation", icon: <Scale className="h-3.5 w-3.5" /> };
  const dropLaunchTab         = { id: "launch" as TabId, label: "Launch", icon: <Play className="h-3.5 w-3.5" />, disabled: isCancelled, disabledReason: "Not available for cancelled Drops" };

  const sponsoredOverviewTab = { id: 'overview' as TabId, label: 'Overview', icon: <Eye className="h-3.5 w-3.5" /> };
  const sponsoredContributionsTab = { id: 'tickets' as TabId, label: 'Contributions', icon: <ReceiptText className="h-3.5 w-3.5" /> };
  const sponsoredReconciliationTab = { id: 'reconciliation' as TabId, label: 'Reconciliation', icon: <Scale className="h-3.5 w-3.5" /> };
  const sponsoredImpactTab = { id: 'impact' as TabId, label: 'Impact', icon: <Heart className="h-3.5 w-3.5" /> };
  const sponsoredManageTab = { id: 'launch' as TabId, label: 'Manage', icon: <Play className="h-3.5 w-3.5" />, disabled: isCancelled, disabledReason: 'Not available for cancelled activities' };

  const sponsoredIsScheduled = room.status === 'scheduled';

  const tabs: Tab[] = isSponsored
    ? sponsoredIsScheduled
      ? [sponsoredOverviewTab, sponsoredManageTab, sponsoredContributionsTab, sponsoredReconciliationTab, sponsoredImpactTab]
      : [sponsoredImpactTab, sponsoredContributionsTab, sponsoredReconciliationTab, sponsoredManageTab, sponsoredOverviewTab]
    : isDrop
    ? [dropOverviewTab, dropSetupTab, dropPurchasesTab, dropLeaderboardTab, dropImpactTab, dropReconciliationTab, dropLaunchTab]
    : isSubscription
      ? isSubscriptionLive
        ? [subImpactTab, subscriptionLinkTab, leaderboardTab, subReconciliationTab, overviewTab, subscriptionLaunchTab]
        : [overviewTab, setupTab, subscriptionLinkTab, subscriptionLaunchTab, leaderboardTab, subReconciliationTab, subImpactTab]
      : isCompleted
      ? [
          ...(!isTicketedEvent || reconciliationClosed
            ? [
                { id: "impact"   as TabId, label: "Impact",         icon: <Heart className="h-3.5 w-3.5" /> },
                { id: "report"   as TabId, label: "Report",          icon: <BarChart3 className="h-3.5 w-3.5" /> },
                { id: "approval" as TabId, label: "Approval Totals", icon: <Scale className="h-3.5 w-3.5" /> },
              ]
            : []
          ),
          ...(isTicketedEvent
            ? [{ id: "reconciliation" as TabId, label: "Reconciliation", icon: <Scale className="h-3.5 w-3.5" /> }]
            : []
          ),
          ...(canUsePayments && outstandingCount > 0 && !isTicketedEvent
            ? [{ id: "payments" as TabId, label: "Payments", icon: <CreditCard className="h-3.5 w-3.5" />, badge: outstandingCount }]
            : []),
          { ...ticketTabProps, badge: pendingVerifications > 0 ? pendingVerifications : undefined },
          { id: "setup" as TabId, label: "Setup", icon: <Settings className="h-3.5 w-3.5" /> },
        ]
      : [
          { id: "overview" as TabId, label: "Overview", icon: <Eye className="h-3.5 w-3.5" /> },
          { id: "setup" as TabId, label: "Setup", icon: <Settings className="h-3.5 w-3.5" />, disabled: isCancelled, disabledReason: "Not available for cancelled events" },
          ...(canUsePayments || isTicketedEvent
            ? [{ id: "payments" as TabId, label: "Payments", icon: <CreditCard className="h-3.5 w-3.5" /> }]
            : []),
          { ...ticketTabProps, badge: pendingVerifications > 0 ? pendingVerifications : undefined },
          launchTab,
        ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Digital event details"
        className="relative flex h-full w-full flex-col shadow-2xl sm:max-w-2xl"
        style={{ background: '#ffffff', fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[#dce1df] px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                style={statusBadgeStyle(room.status)}>
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </span>
              {isTicketedEvent && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}>
                  Ticketed Event
                </span>
              )}
              {isSubscription && (
                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderColor: 'rgba(124,58,237,0.3)' }}>
                  Puzzle Subscription
                </span>
              )}
              {isSponsored && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(21,127,133,0.1)', color: '#157f85', borderColor: 'rgba(21,127,133,0.3)' }}>
                  <Footprints className="h-3 w-3" />
                  Sponsored Activity
                </span>
              )}
              {isDrop && (
                <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', borderColor: 'rgba(124,58,237,0.3)' }}>
                  <Puzzle className="h-3 w-3" />
                  Puzzle Drop
                </span>
              )}
              {scheduledDate && (
                <span className="text-sm font-semibold text-[#102532]">{scheduledDate}</span>
              )}
            </div>
            <p className="mt-0.5 font-mono text-xs text-[#52636f]">
              {room.room_id.slice(0, 12)}…
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRefresh} title="Refresh data"
              className="rounded-lg p-1.5 text-[#8a9bab] hover:bg-[#f1f0ee] hover:text-[#52636f] transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button type="button" onClick={onClose} aria-label="Close"
              className="rounded-lg p-1.5 text-[#8a9bab] hover:bg-[#f1f0ee] hover:text-[#52636f] transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-shrink-0 overflow-x-auto border-b border-[#dce1df] bg-white">
          {tabs.map(tab => (
            <button key={tab.id} type="button"
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              title={tab.disabled ? tab.disabledReason : undefined}
              className={[
                "relative flex flex-shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
                tab.id === activeTab
                  ? "border-[#157f85] text-[#157f85]"
                  : tab.disabled
                    ? "border-transparent text-[#b8c6b0] cursor-not-allowed"
                    : "border-transparent text-[#52636f] hover:text-[#1e3040] hover:border-[#dce1df] cursor-pointer",
              ].join(" ")}>
              <span className="flex-shrink-0">{tab.icon}</span>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-100 text-red-700 text-[10px] leading-[18px] text-center font-bold">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex flex-1 flex-col overflow-y-auto">

          {activeTab === "impact" && (
            isSponsored
              ? <ImpactTabSponsoredActivity roomId={room.room_id} config={config} />
              : isDrop
              ? <ImpactTabDrop
                  roomId={room.room_id}
                  config={config}
                  dropTitle={config?.dropTitle}
                  status={room.status as any}
                />
              : isSubscription
                ? <ImpactTabSubscription stats={stats} challenge={challenge} challengeLoading={challengeLoading} leaderboard={leaderboard} onRefresh={handleRefresh} />
                : <ImpactTab room={room} config={config} auditView={auditView}
                    auditViewLoading={auditViewLoading} auditViewError={auditViewError}
                    onRefresh={handleRefresh} />
          )}

          {activeTab === "leaderboard" && (
            isDrop
              ? <LeaderboardTabDrop roomId={room.room_id} />
              : <LeaderboardTabSubscription
                  leaderboard={leaderboard}
                  leaderboardLoading={leaderboardLoading}
                  challengeId={challenge?.id}
                />
          )}

          {activeTab === "overview" && (
            isSponsored
              ? <OverviewTabSponsoredActivity room={room} config={config} linkedEventTitle={linkedEventTitle} />
              : isDrop
              ? <OverviewTabDrop
                  roomId={room.room_id}
                  stats={stats}
                  linkedEventTitle={linkedEventTitle}
                />
              : isSubscription
                ? <OverviewTabSubscription room={room} challenge={challenge}
                    challengeLoading={challengeLoading} challengeError={challengeError}
                    linkedEventTitle={linkedEventTitle} />
                : isTicketedEvent
                  ? <OverviewTabTicketedEvent room={room} config={config} stats={stats}
                      linkedEventTitle={linkedEventTitle} />
                  : <OverviewTab room={room} config={config} stats={stats}
                      linkedEventTitle={linkedEventTitle} />
          )}

          {activeTab === "setup" && (
            isDrop
              ? <SetupTabDrop
                  roomId={room.room_id}
                  status={room.status as any}
                  onEditFundraiser={onEditFundraiser ?? (() => {})}
                />
              : isSubscription
                ? <SetupTabSubscription challenge={challenge} challengeLoading={challengeLoading}
                    onEdit={() => onEditFundraiser?.()} />
                : <SetupTab
                    room={room}
                    linkedEvent={linkedEvent}
                    isTicketedEvent={isTicketedEvent}
                    onEditFundraiser={onEditFundraiser ?? (() => {})}
                  />
          )}

          {activeTab === "subscriptionLink" && (
            <SubscriptionLinkPanel challenge={challenge} challengeLoading={challengeLoading} />
          )}

          {activeTab === "payments" && (
            <PaymentsTab room={room} config={config}
              onPaymentMethodSuccess={onPaymentMethodSuccess}
              confirmedBy={confirmedBy} confirmedByName={confirmedByName} />
          )}

          {activeTab === "tickets" && (
            isSponsored
              ? <SponsoredContributionsTab roomId={room.room_id} config={config} roomStatus={room.status} />
              : isDrop
              ? <PurchasesTabDrop
                  roomId={room.room_id}
                  config={config}
                  confirmedBy={confirmedBy}
                  confirmedByName={confirmedByName}
                />
              : isTicketedEvent
                ? <TicketsTabTicketedEvent room={room} clubId={clubId} hasLinkedPaymentMethods={hasLinkedPaymentMethods}
                    canUseTicketing={canUseTicketing}
                    confirmedBy={confirmedBy} confirmedByName={confirmedByName}
                    config={config} />
                : <TicketsTab room={room} clubId={clubId} hasLinkedPaymentMethods={hasLinkedPaymentMethods}
                    canUseTicketing={canUseTicketing}
                    confirmedBy={confirmedBy} confirmedByName={confirmedByName} />
          )}

          {activeTab === "launch" && (
            isSponsored
              ? <ManageSponsoredActivityTab room={room} config={config} endedAt={(room as any).ended_at ?? null} onEditFundraiser={onEditFundraiser ?? (() => {})} onStatusChanged={handleRefresh} />
              : isDrop
              ? <LaunchTabDrop
                  roomId={room.room_id}
                  status={room.status as any}
                  scheduledAt={room.scheduled_at}
                  onStatusChanged={handleRefresh}
                />
              : isSubscription
                ? <LaunchTabSubscription challenge={challenge} challengeLoading={challengeLoading}
                    onStatusChanged={handleRefresh} />
                : <LaunchTab
                    room={room}
                    onLaunchFromHere={onLaunchFromHere}
                    onRoomUpdated={onRefreshRoom}
                  />
          )}

          {activeTab === "report" && (
            <ReportTab room={room} config={config}
              auditView={auditView} auditViewLoading={auditViewLoading} />
          )}

          {activeTab === "approval" && (
            <ApprovalTotalsTab room={room} config={config}
              auditView={auditView} auditViewLoading={auditViewLoading}
              auditViewError={auditViewError} onRefresh={handleRefresh} />
          )}

          {activeTab === "reconciliation" && (
            isSponsored
              ? <SponsoredActivityReconciliationTab roomId={room.room_id} currencySymbol={({ EUR: '€', GBP: '£', USD: '$' } as Record<string,string>)[String(config?.currency || 'EUR').toUpperCase()] ?? '€'} hostName={confirmedByName ?? config?.hostName ?? 'Host'} />
              : isDrop
              ? <DropReconciliationTab
                  roomId={room.room_id}
                  currencySymbol={config?.currencySymbol ?? '€'}
                  hostName={confirmedByName ?? 'Host'}
                />
              : isSubscription
                ? <SubscriptionReconciliationTab
                    roomId={room.room_id}
                    currencySymbol={({ eur: '€', gbp: '£', usd: '$' } as Record<string, string>)[(config?.currency ?? 'eur').toLowerCase()] ?? '€'}
                    hostName={config?.hostName ?? 'Host'}
                  />
                : <TicketedEventReconciliationTab
                    room={room}
                    onRefreshRoom={handleRefresh}
                  />
          )}
        </div>
      </div>
    </div>
  );
}