// src/components/mgtsystem/components/digitalEvents/DigitalEventDrawer.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Eye,
  Settings,
  CreditCard,
  Ticket,
  Play,
  BarChart3,
  Scale,
  Heart,
} from "lucide-react";
import type { Web2RoomListItem as Room } from "../../../../shared/api/quiz.api";
import type { RoomStats } from "../../services/quizRoomServices";
import ReconciliationService from "../../services/QuizReconciliationService";

import OverviewTab from "./tabs/OverviewTab";
import SetupTab from "./tabs/SetupTab";
import PaymentsTab from "./tabs/PaymentsTab";
import TicketsTab from "./tabs/TicketsTab";
import LaunchTab from "./tabs/LaunchTab";
import ReportTab from "./tabs/ReportTab";
import ApprovalTotalsTab from "./tabs/ApprovalTotalsTab";
import ImpactTab from "./tabs/ImpactTab";
import EditQuizWizard from "./EditQuizWizard";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type TabId =
  | "impact"
  | "overview"
  | "setup"
  | "payments"
  | "tickets"
  | "launch"
  | "report"
  | "approval";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
  badge?: number;
}

function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    live: "bg-green-100 text-green-700 border-green-200",
    scheduled: "bg-blue-100 text-blue-700 border-blue-200",
    completed: "bg-gray-100 text-gray-700 border-gray-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    open: "bg-yellow-100 text-yellow-700 border-yellow-200",
  };
  return map[status] ?? map.scheduled;
}

interface Props {
  open: boolean;
  room: Room | null;
  config: any;
  stats?: RoomStats;
  hasLinkedPaymentMethods: boolean;
  outstandingCount?: number;
  linkedEventTitle?: string | null;
  linkedEventId?: string | null;
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
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function DigitalEventDrawer({
  open,
  room,
  config,
  stats,
  hasLinkedPaymentMethods,
  outstandingCount = 0,
  linkedEventTitle,
  linkedEventId,
  showEventLinking,
  featureAccess,
  confirmedBy,
  confirmedByName,
  unlinkLoading,
  onClose,
  onSaved,
  onLinked,
  confirmUnlink,
  onLaunchFromHere,
  onPaymentMethodSuccess,
  onRefreshRoom,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showWizard, setShowWizard] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Audit view — single fetch, shared between ImpactTab + ApprovalTotalsTab ──
  const [auditView, setAuditView] = useState<any>(null);
  const [auditViewLoading, setAuditViewLoading] = useState(false);
  const [auditViewError, setAuditViewError] = useState<string | null>(null);
  const lastFetchedRoomId = useRef<string | null>(null);

  const isCompleted = room?.status === "completed";
  const isCancelled = room?.status === "cancelled";
  const canUseTicketing = featureAccess?.ticketing === true;
  const canUsePayments = featureAccess?.quizPayments === true;

  // ── Fetch audit view (completed rooms only, once per room) ─────────────────
  const fetchAuditView = useCallback(async (roomId: string) => {
    setAuditViewLoading(true);
    setAuditViewError(null);
    try {
      const data = (await ReconciliationService.getAuditView(roomId)) as any;
      if (data.ok) {
        setAuditView(data.view);
        lastFetchedRoomId.current = roomId;
        console.log("[Drawer] auditView loaded:", data.view);
      } else {
        setAuditViewError(data.error || "Failed to load reconciliation data");
      }
    } catch (e: any) {
      setAuditViewError(e?.message || "Network error");
    } finally {
      setAuditViewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !room?.room_id) return;
    if (!isCompleted) {
      setAuditView(null);
      lastFetchedRoomId.current = null;
      return;
    }
    if (lastFetchedRoomId.current !== room.room_id) {
      fetchAuditView(room.room_id);
    }
  }, [open, room?.room_id, isCompleted, fetchAuditView]);

  // ── Reset active tab when room or open changes ─────────────────────────────
  useEffect(() => {
    if (open) {
      setActiveTab(room?.status === "completed" ? "impact" : "overview");
      setShowWizard(false);
    }
  }, [open, room?.room_id]);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showWizard) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, showWizard, onClose]);

  // ── Body scroll lock ───────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // ── Combined refresh ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    if (onRefreshRoom) await onRefreshRoom();
    if (room?.room_id && isCompleted) {
      lastFetchedRoomId.current = null;
      await fetchAuditView(room.room_id);
    }
  }, [onRefreshRoom, room?.room_id, isCompleted, fetchAuditView]);

  if (!open || !room) return null;

  const pendingVerifications = stats?.pendingTicketVerifications ?? 0;

  const scheduledDate = room.scheduled_at
    ? new Date(room.scheduled_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const ticketTabProps = {
    id: "tickets" as TabId,
    label: "Tickets",
    icon: <Ticket className="h-3.5 w-3.5" />,
    disabled: !hasLinkedPaymentMethods || !canUseTicketing,
    disabledReason: !canUseTicketing
      ? "Ticketing not on your plan"
      : "Add a payment method first (Payments tab)",
  };

  // ── Tab definitions — separate completed vs active ─────────────────────────
  const tabs: Tab[] = isCompleted
    ? [
        // Completed room tab order
        {
          id: "impact",
          label: "Impact",
          icon: <Heart className="h-3.5 w-3.5" />,
        },
        {
          id: "report",
          label: "Report",
          icon: <BarChart3 className="h-3.5 w-3.5" />,
        },
        {
          id: "approval",
          label: "Approval Totals",
          icon: <Scale className="h-3.5 w-3.5" />,
        },
        ...(canUsePayments && outstandingCount > 0
          ? [
              {
                id: "payments" as TabId,
                label: "Payments",
                icon: <CreditCard className="h-3.5 w-3.5" />,
                badge: outstandingCount,
              },
            ]
          : []),
        {
          ...ticketTabProps,
          badge: pendingVerifications > 0 ? pendingVerifications : undefined,
        },
        {
          id: "setup" as TabId,
          label: "Setup",
          icon: <Settings className="h-3.5 w-3.5" />,
        },
      ]
    : [
        // Active / scheduled room tab order
        {
          id: "overview" as TabId,
          label: "Overview",
          icon: <Eye className="h-3.5 w-3.5" />,
        },
        {
          id: "setup" as TabId,
          label: "Setup",
          icon: <Settings className="h-3.5 w-3.5" />,
          disabled: isCancelled,
          disabledReason: "Not available for cancelled events",
        },
        ...(canUsePayments
          ? [
              {
                id: "payments" as TabId,
                label: "Payments",
                icon: <CreditCard className="h-3.5 w-3.5" />,
              },
            ]
          : []),
        {
          ...ticketTabProps,
          badge: pendingVerifications > 0 ? pendingVerifications : undefined,
        },
        {
          id: "launch" as TabId,
          label: "Launch",
          icon: <Play className="h-3.5 w-3.5" />,
          disabled: isCancelled,
          disabledReason: "Not available for cancelled events",
        },
      ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Panel */}
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Digital event details"
          className="relative flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-2xl"
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(room.status)}`}
                >
                  {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
                </span>
                {scheduledDate && (
                  <span className="text-sm font-semibold text-gray-900">
                    {scheduledDate}
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-xs text-gray-500">
                {room.room_id.slice(0, 12)}…
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Manual refresh */}
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh data"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex flex-shrink-0 overflow-x-auto border-b border-gray-200 bg-white">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                title={tab.disabled ? tab.disabledReason : undefined}
                className={[
                  "relative flex flex-shrink-0 items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2",
                  tab.id === activeTab
                    ? "border-indigo-600 text-indigo-600"
                    : tab.disabled
                      ? "border-transparent text-gray-300 cursor-not-allowed"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300 cursor-pointer",
                ].join(" ")}
              >
                <span className="flex-shrink-0">{tab.icon}</span>
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] leading-[18px] text-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            {activeTab === "impact" && (
              <ImpactTab
                room={room}
                config={config}
                auditView={auditView}
                auditViewLoading={auditViewLoading}
                auditViewError={auditViewError}
                onRefresh={handleRefresh}
              />
            )}

            {activeTab === "overview" && (
              <OverviewTab
                room={room}
                config={config}
                stats={stats}
                linkedEventTitle={linkedEventTitle}
              />
            )}

            {activeTab === "setup" && (
              <SetupTab
                room={room}
                linkedEventTitle={linkedEventTitle}
                linkedEventId={linkedEventId}
                showEventLinking={showEventLinking}
                onEditQuiz={() => setShowWizard(true)}
                onLinked={onLinked}
                confirmUnlink={confirmUnlink}
                unlinkLoading={unlinkLoading}
              />
            )}

            {activeTab === "payments" && (
              <PaymentsTab
                room={room}
                config={config}
                onPaymentMethodSuccess={onPaymentMethodSuccess}
                confirmedBy={confirmedBy}
                confirmedByName={confirmedByName}
              />
            )}

            {activeTab === "tickets" && (
              <TicketsTab
                room={room}
                hasLinkedPaymentMethods={hasLinkedPaymentMethods}
                canUseTicketing={canUseTicketing}
                confirmedBy={confirmedBy}
                confirmedByName={confirmedByName}
              />
            )}

            {activeTab === "launch" && (
              <LaunchTab room={room} onLaunchFromHere={onLaunchFromHere} />
            )}

            {activeTab === "report" && (
              <ReportTab
                room={room}
                config={config}
                auditView={auditView}
                auditViewLoading={auditViewLoading}
              />
            )}

            {activeTab === "approval" && (
              <ApprovalTotalsTab
                room={room}
                config={config}
                auditView={auditView}
                auditViewLoading={auditViewLoading}
                auditViewError={auditViewError}
                onRefresh={handleRefresh}
              />
            )}
          </div>
        </div>
      </div>

      {/* Full-screen wizard */}
      {showWizard && room && (
        <EditQuizWizard
          roomId={room.room_id}
          onClose={() => setShowWizard(false)}
          onSaved={() => {
            setShowWizard(false);
            onSaved();
          }}
        />
      )}
    </>
  );
}