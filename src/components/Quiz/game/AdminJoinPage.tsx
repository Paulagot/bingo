// src/components/Quiz/dashboard/AdminJoinPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { usePlayerStore } from '../hooks/usePlayerStore';
import PlayerListPanel from '../dashboard/PlayerListPanel';
import SetupSummaryPanel from '../dashboard/SetupSummaryPanel';
import SharedFinancialTabs from '../dashboard/SharedFinancialTabs';
import { Users, Shield, Info } from 'lucide-react';
import type { QuizConfig } from '../types/quiz';
import { getPrizeWorkflowStatus } from '../payments/prizeWorkflow';

type RoomRole = 'admin' | 'host';

interface User {
  id: string;
  name?: string;
}

const STORAGE_KEYS = {
  ctx: (roomId: string) => `quizCtx:${roomId}`, // { role, memberId }
};

function saveCtx(roomId: string, ctx: { role: RoomRole; memberId: string }) {
  try {
    localStorage.setItem(STORAGE_KEYS.ctx(roomId), JSON.stringify(ctx));
  } catch {}
}

function loadCtx(roomId: string): { role?: RoomRole; memberId?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ctx(roomId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

type TabType = 'overview' | 'players' | 'financial';

const AdminJoinPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Accept role=admin|host (default admin)
  const roleParam = (searchParams.get('role') as RoomRole) || 'admin';

  // Accept any of these IDs from QR link
  const linkMemberId =
    searchParams.get('memberId') ||
    searchParams.get('adminId') ||
    searchParams.get('hostId') ||
    '';

  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const { config, setFullConfig, currentPhase } = useQuizConfig();
  const { players } = usePlayerStore();

  // Check if quiz is complete
  const isQuizComplete = currentPhase === 'complete';

  // Helper to unwrap `{config: ...}` or receive raw `QuizConfig`
  const coerceToConfig = (payload: any): QuizConfig | null => {
    if (!payload) return null;
    return (payload.config ?? payload) as QuizConfig;
  };

  // === BUILD PRIZE LEADERBOARD (same logic as HostDashboard) ===
  const prizeLeaderboard = useMemo(() => {
    const fromRecon = (((config?.reconciliation as any)?.finalLeaderboard) || []) as any[];
    if (fromRecon.length) return fromRecon;

    const fromConfig = ((config as any)?.finalLeaderboard || []) as any[];
    if (fromConfig.length) return fromConfig;

    // Best-effort derive from players in store
    const list = (players || []).map((p: any) => ({
      id: p.id,
      name: p.name || p.id,
      score: typeof p.score === 'number'
        ? p.score
        : (typeof p.totalScore === 'number'
          ? p.totalScore
          : (typeof p.finalScore === 'number' ? p.finalScore : 0)),
    }));

    // Sort if we have numeric scores
    if (list.every(l => typeof l.score === 'number')) {
      list.sort((a, b) => (b.score || 0) - (a.score || 0));
    }
    return list;
  }, [config?.reconciliation?.finalLeaderboard, (config as any)?.finalLeaderboard, players]);

  // === PRIZE WORKFLOW STATUS ===
const { prizeWorkflowComplete } = useMemo(() => {
  return getPrizeWorkflowStatus(config);
}, [config?.prizes, config?.reconciliation?.prizeAwards]);
;

  // 1) On mount / connection, join + request config/state
  useEffect(() => {
    if (!roomId) {
      navigate('/', { replace: true });
      return;
    }

    // Prefer memberId from URL; fall back to persisted context
    const persisted = loadCtx(roomId) || {};
    const memberId = linkMemberId || persisted.memberId;
    const role: RoomRole = (roleParam || (persisted.role as RoomRole)) ?? 'admin';

    if (!memberId) {
      // No identifier at all → bounce to home
      navigate('/', { replace: true });
      return;
    }

    if (socket && connected) {
      const user: User = { id: memberId };

      const handleError = ({ message }: { message: string }) => {
        alert(`Failed to join as ${role}: ${message}`);
        navigate('/', { replace: true });
      };

      const handleConfig = (payload: any) => {
        const cfg = (payload?.config ?? payload) as QuizConfig | undefined;
        if (!cfg) return;

        // If they're joining as HOST and config.hostId is missing, fill it from URL memberId
        const memberIdFromUrl =
          searchParams.get('memberId') ||
          searchParams.get('hostId') ||
          searchParams.get('adminId') || '';

        const patched = role === 'host' && !cfg.hostId
          ? { ...cfg, hostId: memberIdFromUrl }
          : cfg;

        setFullConfig({ ...patched, roomId });

        if (role === 'host') {
          // persist and route with hostId
          if (memberIdFromUrl) localStorage.setItem('current-host-id', memberIdFromUrl);
          navigate(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(memberIdFromUrl)}`, { replace: true });
        }
      };

      const handleRoomState = (state: any) => {
        // Some servers only ever send room_state. If it contains a config, use it.
        const cfg = coerceToConfig(state?.config ? state : state?.room?.config ?? state?.config);
        if (cfg) setFullConfig({ ...cfg, roomId });
      };

      const handleQuizCancelled = ({ message }: { message: string }) => {
        console.warn('🚫 [AdminJoinPage] Quiz cancelled:', message);
      };

      const handleReconnect = () => {
        // On reconnect, make sure we're joined and re-request config/state
        socket.emit('join_quiz_room', { roomId, user, role });
        socket.emit('request_room_config', { roomId });
        socket.emit?.('request_room_state', { roomId });
      };

      // Register listeners BEFORE emitting
      socket.on('quiz_error', handleError);
      socket.on('room_config', handleConfig);
      socket.on('room_state', handleRoomState);
      socket.on('quiz_cancelled', handleQuizCancelled);
      socket.on('connect', handleReconnect);

      // Persist context for refresh
      saveCtx(roomId, { role, memberId });

      // Join and request
      socket.emit('join_quiz_room', { roomId, user, role });
      socket.emit('request_room_config', { roomId });
      socket.emit?.('request_room_state', { roomId });

      return () => {
        socket.off('quiz_error', handleError);
        socket.off('room_config', handleConfig);
        socket.off('room_state', handleRoomState);
        socket.off('quiz_cancelled', handleQuizCancelled);
        socket.off('connect', handleReconnect);
      };
    }
  }, [roomId, linkMemberId, roleParam, socket, connected, navigate, setFullConfig, searchParams]);

  // 2) While waiting for config OR it's the wrong roomId → Loading
  if (!roomId || !config || config.roomId !== roomId) {
    return (
      <div className="text-fg/70 mx-auto max-w-4xl p-4 text-center">
        <p>Loading quiz information…</p>
      </div>
    );
  }

  // 3) If role=host, we'll be redirected in the effect. Show a small fallback.
  const persisted = loadCtx(roomId);
  if (persisted?.role === 'host') {
    return (
      <div className="text-fg/70 mx-auto max-w-4xl p-4 text-center">
        <p>Joining as host… redirecting to Host Dashboard…</p>
      </div>
    );
  }

  // Build tabs based on quiz state
  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Overview',
      icon: <Info className="h-4 w-4" />,
      count: null,
    },
    {
      id: 'players' as TabType,
      label: 'Players',
      icon: <Users className="h-4 w-4" />,
      count: players?.length || 0,
    },
    // Only show financial tab after quiz is complete
    ...(isQuizComplete ? [{
      id: 'financial' as TabType,
      label: 'Prizes & Payments',
      icon: <Shield className="h-4 w-4" />,
      count: null,
    }] : []),
  ];

  // 4) Admin dashboard view
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-fg mb-2 flex items-center justify-center space-x-3 text-3xl font-bold md:text-4xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-2xl text-white">
              🛡️
            </div>
            <span>Admin Dashboard</span>
          </h1>
          <p className="text-fg/70 text-lg">
            You are logged in as an event admin. You can assist with player management and post-game reconciliation.
          </p>
          {isQuizComplete && (
            <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
              <span className="text-sm font-medium text-green-800">
                ✅ Quiz completed - Financial reconciliation available
              </span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-muted border-border mb-6 rounded-xl border shadow-sm">
          <div className="border-border flex flex-wrap border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-4 py-4 text-sm font-medium transition-colors md:px-6 ${
                  activeTab === tab.id
                    ? 'border-b-2 border-purple-600 bg-purple-50 text-purple-600'
                    : 'text-fg/60 hover:text-fg/80 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      activeTab === tab.id ? 'bg-purple-100 text-purple-800' : 'text-fg/70 bg-gray-100'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <SetupSummaryPanel />
              </div>
            )}

            {activeTab === 'players' && (
              <div className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center space-x-2 text-xl font-semibold">
                    <Users className="h-5 w-5" />
                    <span>Player Management</span>
                  </h3>
                  <span className="text-fg/60 text-sm">
                    {players?.length || 0} player{(players?.length || 0) === 1 ? '' : 's'} registered
                  </span>
                </div>
                <PlayerListPanel />
              </div>
            )}

            {activeTab === 'financial' && isQuizComplete && (
              <SharedFinancialTabs
                role="admin"
                prizeLeaderboard={prizeLeaderboard}
                prizeWorkflowComplete={prizeWorkflowComplete}
                config={config}
                availableTabs={['prizes', 'payments']}
                defaultTab="prizes"
              />
            )}
          </div>
        </div>

        {/* Admin Info Panel */}
        {!isQuizComplete && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start space-x-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="mb-1 font-medium">Admin Access Level</p>
                <p>
                  As an admin, you can view quiz configuration and help manage players. The Prizes & Payments tab will become available after the quiz is completed.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminJoinPage;









