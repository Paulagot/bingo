import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useQuizConfig } from '../hooks/useQuizConfig';
import { usePlayerStore } from '../hooks/usePlayerStore';
import { useRoomIdentity } from '../hooks/useRoomIdentity';
import { fullQuizReset } from '../utils/fullQuizReset';

import SetupSummaryPanel from './SetupSummaryPanel';
import PlayerListPanel from './PlayerListPanel';
import AdminListPanel from './AdminListPanel';
import PaymentReconciliationPanel from './PaymentReconciliation';
import AssetUploadPanel from './AssetUploadPanel';

import { DynamicChainProvider } from '../../chains/DynamicChainProvider';
import WalletDebugPanel from '../Wizard/WalletDebug';
import useQuizChainIntegration from '../../../hooks/useQuizChainIntegration';

import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useAdminStore } from '../hooks/useAdminStore';

import {
  Users,
  Shield,
  CreditCard,
  Settings,
  Rocket,
  Info,
  Upload,
} from 'lucide-react';

const DEBUG = false;

type TabType = 'overview' | 'assets' | 'launch' | 'players' | 'admins' | 'payments';

// Core dashboard component (without providers)
const HostDashboardCore: React.FC = () => {
  const { config, setFullConfig, currentPhase, completedAt } = useQuizConfig();
  const isWeb3 = config?.paymentMethod === 'web3';
  const { players } = usePlayerStore();
  const { admins } = useAdminStore();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const requestedOnceRef = useRef(false);

  // URL params (e.g., ?tab=payments&lock=postgame)
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const urlTab = (params.get('tab') as TabType | null) || null;
  const lockParam = params.get('lock') === 'postgame';

  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const { roomId, hostId } = useRoomIdentity();

  // Quiz completion logic
  const isQuizComplete = currentPhase === 'complete';
  const postGameLock = lockParam || isQuizComplete;
  const completedTime = completedAt ? new Date(completedAt).toLocaleString() : null;

  // Default/selected tab behavior
  useEffect(() => {
    if (urlTab) {
      setActiveTab(urlTab);
      return;
    }
    if (postGameLock) setActiveTab('payments');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab, postGameLock]);

  // Clear admin state on initial mount
  useEffect(() => {
    if (DEBUG) console.log('🧹 [HostDashboard] Clearing admin state on initial mount');
    useAdminStore.getState().resetAdmins();
  }, []);

  // Request current state/config once when socket connects
  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    if (DEBUG) console.log('✅ [HostDashboard] Socket connected, requesting current state/config');

    if (!requestedOnceRef.current) {
      requestedOnceRef.current = true;
      socket.emit('request_current_state', { roomId });
      socket.emit('request_room_config', { roomId });
    }
  }, [socket, connected, roomId]);

  // Listen for config updates + errors
  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    const handleRoomConfig = (incoming: any) => {
      if (DEBUG) console.log('📋 [HostDashboard] Received room config from socket:', incoming);

      // merge with existing to preserve reconciliation if missing (and late fields)
      const existing = useQuizConfig.getState().config || {};

      const enhancedConfig = {
        ...existing,
        ...incoming,
        roomId,
        hostId:
          incoming?.hostId ||
          new URLSearchParams(window.location.search).get('hostId') ||
          localStorage.getItem('current-host-id') ||
          (existing as any).hostId,
        reconciliation: incoming?.reconciliation ?? (existing as any)?.reconciliation,
      };

      setFullConfig(enhancedConfig);
    };

    const handleSocketError = (error: { message: string }) => {
      console.error('❌ [HostDashboard] Socket error:', error);

      // If room not found, redirect to home
      if (error.message.includes('Room not found') || error.message.includes('not found')) {
        console.warn('🏠 Room not found, redirecting to home');
        navigate('/');
      }
    };

    socket.on('room_config', handleRoomConfig);
    socket.on('quiz_error', handleSocketError);

    return () => {
      socket.off('room_config', handleRoomConfig);
      socket.off('quiz_error', handleSocketError);
    };
  }, [socket, connected, roomId, setFullConfig, navigate]);

  // Fallback: request config if we still don't have it after roomId changes
  useEffect(() => {
    if (!socket || !connected || !roomId) return;
    if (!config?.roomId) {
      if (DEBUG) console.log('🔄 [HostDashboard] Requesting room config for:', roomId);
      socket.emit('get_room_config', { roomId });
    }
  }, [socket, connected, roomId, config?.roomId]);

  // Join room as host (and rejoin on room change)
  useEffect(() => {
    if (!socket || !roomId) return;
    const displayName = useQuizConfig.getState().config?.hostName || 'Host';

    socket.emit('join_quiz_room', {
      roomId,
      user: { id: hostId || 'host', name: displayName },
      role: 'host',
    });
  }, [socket, roomId, hostId]);

  // Quiz cancelled → reset + navigate home
  useEffect(() => {
    if (!socket) return;

    const handleQuizCancelled = () => {
      console.warn('🚫 Quiz was cancelled. Resetting local state.');
      fullQuizReset();
      navigate('/');
    };

    socket.on('quiz_cancelled', handleQuizCancelled);
    return () => {
      socket.off('quiz_cancelled', handleQuizCancelled);
    };
  }, [socket, navigate]);

  const handleLaunchQuiz = () => {
    if (DEBUG) console.log('👤 [HostDashboard] 🚀 Host launching quiz');

    if (socket && roomId) {
      socket.emit('launch_quiz', { roomId });
      navigate(`/quiz/host-controls/${roomId}`);
      if (DEBUG) console.log('✅ Launch quiz request sent and host redirected');
    } else {
      console.error('❌ Cannot launch quiz: missing socket or roomId');
      alert('Unable to launch quiz. Please try refreshing the page.');
    }
  };

  // Entitlements (unchanged)
  const [ents, setEnts] = useState<any>(null);
  useEffect(() => {
    import('../../../services/apiService').then(({ apiService }) => {
      apiService
        .getEntitlements()
        .then(setEnts)
        .catch(() => setEnts(null));
    });
  }, []);

  // Derived UI data
  const assetUploadCheck = useMemo(() => {
    if (!(isWeb3 && config?.prizeMode === 'assets')) return true;
    return config?.prizes?.every((p: any) => !p.tokenAddress || p.uploadStatus === 'completed') !== false;
  }, [isWeb3, config?.prizeMode, config?.prizes]);

  const assetUploadIssues = useMemo(() => {
    if (!(isWeb3 && config?.prizeMode === 'assets')) return [];
    return config?.prizes?.filter((p: any) => p.tokenAddress && p.uploadStatus !== 'completed') || [];
  }, [isWeb3, config?.prizeMode, config?.prizes]);

  const canLaunch = assetUploadCheck && !isQuizComplete;

  // Tabs model
  const allTabs = useMemo(
    () =>
      [
        {
          id: 'overview' as TabType,
          label: 'Overview',
          icon: <Settings className="h-4 w-4" />,
          count: null,
        },
        ...(isWeb3 && config?.prizeMode === 'assets'
          ? [
              {
                id: 'assets' as TabType,
                label: 'Upload Assets',
                icon: <Upload className="h-4 w-4" />,
                count: config?.prizes?.filter((p: any) => p.uploadStatus === 'completed').length || 0,
              },
            ]
          : []),
        ...(!isWeb3
          ? [
              {
                id: 'admins' as TabType,
                label: 'Admins',
                icon: <Shield className="h-4 w-4" />,
                count: admins?.length || 0,
              },
            ]
          : []),
        {
          id: 'players' as TabType,
          label: 'Players',
          icon: <Users className="h-4 w-4" />,
          count: players?.length || 0,
        },
        {
          id: 'payments' as TabType,
          label: 'Payments',
          icon: <CreditCard className="h-4 w-4" />,
          count: null,
        },
        {
          id: 'launch' as TabType,
          label: 'Launch',
          icon: <Rocket className="h-4 w-4" />,
          count: null,
        },
      ] as const,
    [isWeb3, config?.prizeMode, config?.prizes, admins?.length, players?.length]
  );

  const tabs = useMemo(() => {
    return postGameLock ? allTabs.filter((t) => t.id === 'payments') : allTabs;
  }, [postGameLock, allTabs]);

  // Keep activeTab valid if tabs shrink (postgame lock)
  useEffect(() => {
    const allowed = new Set(tabs.map((t) => t.id));
    if (!allowed.has(activeTab)) setActiveTab('payments');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  const LaunchSection = () => {
    return (
      <div className="space-y-6">
        {/* Main Launch Card */}
        <div className="rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-blue-50 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-600">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-green-800">
              {isQuizComplete ? 'Quiz Complete!' : 'Ready to Launch?'}
            </h2>
            <p className="text-fg/70 mx-auto mb-6 max-w-2xl text-lg">
              {isQuizComplete
                ? 'This quiz has already been completed. Thank you for hosting!'
                : "Launch the quiz to redirect all waiting players to the game and open your host controls. Make sure you've reviewed your setup and have players ready to participate."}
            </p>
            <button
              onClick={isQuizComplete ? undefined : handleLaunchQuiz}
              disabled={!canLaunch}
              className={`mx-auto flex transform items-center space-x-3 rounded-xl px-12 py-4 text-xl font-bold shadow-lg transition-all duration-200 ${
                isQuizComplete
                  ? 'cursor-not-allowed bg-gray-400 text-gray-200'
                  : canLaunch
                  ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 hover:shadow-xl'
                  : 'cursor-not-allowed bg-gray-400 text-gray-200'
              }`}
            >
              {isQuizComplete ? (
                <>
                  <span>🎉</span>
                  <div className="text-left">
                    <div>Quiz Complete</div>
                    {completedTime && <div className="text-xs opacity-90">Finished: {completedTime}</div>}
                  </div>
                </>
              ) : (
                <>
                  <Rocket className="h-6 w-6" />
                  <span>Launch Quiz Now</span>
                </>
              )}
            </button>

            {!canLaunch && !isQuizComplete && assetUploadIssues.length > 0 && (
              <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Upload Required: {assetUploadIssues.length} asset
                    {assetUploadIssues.length === 1 ? '' : 's'} must be uploaded before launching
                  </span>
                </div>
              </div>
            )}

            {isQuizComplete && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-2xl">🎉</span>
                  <span className="text-sm font-medium text-green-800">
                    Quiz completed successfully{completedTime && ` on ${completedTime}`}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pre-Launch Checklist */}
        <div className="bg-muted border-border rounded-xl border-2 p-6">
          <h3 className="heading-2">
            <Info className="h-5 w-5 text-blue-600" />
            <span>{isQuizComplete ? 'Quiz Status' : 'Pre-Launch Checklist'}</span>
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm text-green-600">✓</span>
                </div>
                <span className="text-fg/80">Quiz configuration complete</span>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    (players?.length || 0) > 0 ? 'bg-green-100' : 'bg-yellow-100'
                  }`}
                >
                  <span
                    className={`text-sm ${
                      (players?.length || 0) > 0 ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {(players?.length || 0) > 0 ? '✓' : '!'}
                  </span>
                </div>
                <span className="text-fg/80">Players registered ({players?.length || 0})</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm text-green-600">✓</span>
                </div>
                <span className="text-fg/80">Payment method configured</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                  <span className="text-sm text-green-600">{isQuizComplete ? '🎉' : '✓'}</span>
                </div>
                <span className="text-fg/80">{isQuizComplete ? 'Quiz completed' : 'Host controls ready'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    connected ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  <span className={`text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
                    {connected ? '✓' : '✗'}
                  </span>
                </div>
                <span className="text-fg/80">Socket connection active</span>
              </div>
              {isWeb3 && config?.prizeMode === 'assets' && (
                <div className="flex items-center space-x-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      assetUploadCheck ? 'bg-green-100' : 'bg-yellow-100'
                    }`}
                  >
                    <span
                      className={`text-sm ${assetUploadCheck ? 'text-green-600' : 'text-yellow-600'}`}
                    >
                      {assetUploadCheck ? '✓' : '!'}
                    </span>
                  </div>
                  <span className="text-fg/80">
                    Digital assets uploaded{' '}
                    {config?.prizes?.filter((p: any) => p.uploadStatus === 'completed').length || 0}/
                    {config?.prizes?.filter((p: any) => p.tokenAddress).length || 0}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-sm text-blue-600">i</span>
                </div>
                <span className="text-fg/80">Room ID: {roomId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="bg-muted border-border rounded-lg border p-4 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-blue-600" />
            <div className="text-fg text-2xl font-bold">{players?.length || 0}</div>
            <div className="text-fg/70 text-sm">Players Ready</div>
          </div>
          {!isWeb3 && (
            <div className="bg-muted border-border rounded-lg border p-4 text-center">
              <Shield className="mx-auto mb-2 h-8 w-8 text-purple-600" />
              <div className="text-fg text-2xl font-bold">{admins?.length || 0}</div>
              <div className="text-fg/70 text-sm">Admins</div>
            </div>
          )}
          <div className="bg-muted border-border rounded-lg border p-4 text-center">
            {isWeb3 && config?.prizeMode === 'assets' ? (
              <>
                <Upload className="mx-auto mb-2 h-8 w-8 text-purple-600" />
                <div className="text-fg text-2xl font-bold">
                  {config?.prizes?.filter((p: any) => p.uploadStatus === 'completed').length || 0}/
                  {config?.prizes?.filter((p: any) => p.tokenAddress).length || 0}
                </div>
                <div className="text-fg/70 text-sm">Assets Uploaded</div>
              </>
            ) : (
              <>
                <div
                  className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full ${
                    connected ? 'bg-green-100' : 'bg-red-100'
                  }`}
                >
                  <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-600' : 'bg-red-600'}`}></div>
                </div>
                <div className="text-fg text-2xl font-bold">{connected ? 'Online' : 'Offline'}</div>
                <div className="text-fg/70 text-sm">Connection</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (DEBUG) {
    console.log('🎨 [HostDashboard] Component rendering');
    console.table({
      roomId,
      hostName: config?.hostName || 'Host',
      hostId: (config as any)?.hostId || '—',
      configLoaded: !!(config && Object.keys(config).length > 5),
      socketConnected: connected,
      hasSocket: !!socket,
      adminCount: admins?.length || 0,
      playerCount: players?.length || 0,
      prizeMode: config?.prizeMode,
      assetCount: config?.prizes?.filter((p: any) => p.tokenAddress).length || 0,
      uploadsComplete: config?.prizes?.filter((p: any) => p.uploadStatus === 'completed').length || 0,
      currentPhase,
      isQuizComplete,
      completedTime,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-fg mb-2 flex items-center justify-center space-x-3 text-3xl font-bold md:text-4xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-2xl text-white">
              🎙️
            </div>
            <span>Host Dashboard</span>
          </h1>
          <p className="text-fg/70 text-lg">
            Welcome, <strong>{config?.hostName || 'Host'}</strong> — manage your quiz event below
          </p>
          {isQuizComplete && (
            <div className="mt-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
              <span className="text-sm font-medium text-green-800">
                ✅ Quiz completed successfully{completedTime && ` on ${completedTime}`}. Please reconcile payments and generate the archive when ready.
              </span>
            </div>
          )}
          {DEBUG && (
            <div className="mt-2 text-xs text-gray-400">
              Room: {roomId} | Socket: {connected ? '🟢' : '🔴'} | Config: {!!config?.roomId ? '✅' : '⏳'} | Players:{' '}
              {players?.length || 0} | Admins: {admins?.length || 0} | Assets:{' '}
              {config?.prizes?.filter((p: any) => p.uploadStatus === 'completed').length || 0}/
              {config?.prizes?.filter((p: any) => p.tokenAddress).length || 0} | Phase:{' '}
              {currentPhase || 'unknown'} | Complete: {isQuizComplete ? '✅' : '❌'}
            </div>
          )}
        </div>

        {ents && (
          <div className="text-fg/60 mt-1 text-lg text-center">
            Credits remaining: <strong>{ents.game_credits_remaining ?? 0}</strong> · Max players:{' '}
            <strong>{ents.max_players_per_game}</strong>
          </div>
        )}

        <WalletDebugPanel />

        {/* Tab Navigation */}
        <div className="bg-muted border-border mb-6 rounded-xl border shadow-sm">
          <div className="border-border flex flex-wrap border-b">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-2 px-4 py-4 text-sm font-medium transition-colors md:px-6 ${
                  activeTab === tab.id
                    ? 'border-b-2 border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'text-fg/60 hover:text-fg/80 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      activeTab === tab.id ? 'bg-indigo-100 text-indigo-800' : 'text-fg/70 bg-gray-100'
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
            {activeTab === 'launch' && <LaunchSection />}

            {activeTab === 'overview' && <SetupSummaryPanel />}

            {activeTab === 'assets' && (
              <div className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="heading-2">
                    <Upload className="h-5 w-5" />
                    <span>Asset Upload</span>
                  </h3>
                  <span className="text-fg/60 text-sm">
                    {config?.prizes?.filter((p: any) => p.uploadStatus === 'completed').length || 0} of{' '}
                    {config?.prizes?.filter((p: any) => p.tokenAddress).length || 0} assets uploaded
                  </span>
                </div>
                <AssetUploadPanel />
              </div>
            )}

            {activeTab === 'players' && (
              <div className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="heading-2">
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

            {activeTab === 'admins' && !isWeb3 && (
              <div className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="heading-2">
                    <Shield className="h-5 w-5" />
                    <span>Admin Management</span>
                  </h3>
                  <span className="text-fg/60 text-sm">
                    {admins?.length || 0} admin{(admins?.length || 0) === 1 ? '' : 's'} configured
                  </span>
                </div>

                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-start space-x-2">
                    <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                    <div className="text-sm text-blue-800">
                      <p className="mb-1 font-medium">Admin Access</p>
                      <p>
                        Admins can help manage the quiz during gameplay. Admins can add players, accept payments and
                        disqualify players.
                      </p>
                      <p>You can also add a secondary host, this gives them the same rights as the person that set up the quiz.</p>
                    </div>
                  </div>
                </div>

                <AdminListPanel />
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="heading-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Payment Management</span>
                  </h3>
                  <span className="text-fg/60 text-sm">
                    {config?.paymentMethod === 'web3' ? 'Web3 Payments' : 'Manual Collection'}
                  </span>
                </div>
                <PaymentReconciliationPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component with provider logic (multichain-normalized)
const HostDashboard: React.FC = () => {
  const { config } = useQuizConfig();
  const { selectedChain, walletReadiness } = useQuizChainIntegration();

  console.log('=== HOST DASHBOARD CHAIN INTEGRATION ===');
  console.log('Config state:', {
    hasConfig: !!config,
    configKeys: config ? Object.keys(config).length : 0,
    web3Chain: config?.web3Chain,
    isWeb3Room: config?.isWeb3Room,
    paymentMethod: config?.paymentMethod,
  });
  console.log('Chain integration:', {
    selectedChain,
    walletStatus: walletReadiness?.status,
    walletMessage: walletReadiness?.message,
  });

  // If this room isn’t Web3 (or config not ready), don’t mount a chain provider
  if (!config || Object.keys(config).length === 0) {
    console.log('Config not loaded yet, rendering without chain provider');
    return <HostDashboardCore />;
  }
  if (!config.isWeb3Room) {
    console.log('Non-Web3 room, rendering without chain provider');
    return <HostDashboardCore />;
  }

  // Web3 room: only mount provider if chain is resolved
  if (!selectedChain) {
    console.log(
      'Web3 room but no chain resolved yet — rendering without provider (UI still works, debug panel will indicate)'
    );
    return <HostDashboardCore />;
  }

  console.log(`Rendering with ${selectedChain} DynamicChainProvider`);
  return (
    <DynamicChainProvider selectedChain={selectedChain}>
      <HostDashboardCore />
    </DynamicChainProvider>
  );
};

export default HostDashboard;

