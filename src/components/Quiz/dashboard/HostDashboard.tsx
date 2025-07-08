import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizConfig } from '../useQuizConfig';
import { usePlayerStore } from '../usePlayerStore';
import { useRoomIdentity } from '../useRoomIdentity';
import { fullQuizReset } from '../utils/fullQuizReset';
import SetupSummaryPanel from './SetupSummaryPanel';
import PlayerListPanel from './PlayerListPanel';
import AdminListPanel from './AdminListPanel';
import PaymentReconciliationPanel from './PaymentReconciliation';
import AssetUploadPanel from './AssetUploadPanel';

import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { useAdminStore } from '../useAdminStore';
import { 
  Users, 
  Shield, 
  CreditCard, 
  Settings, 
  Rocket,
  X,
  Info,
  Upload
} from 'lucide-react';

const DEBUG = true;

type TabType = 'overview' | 'assets' | 'launch' | 'players' | 'admins' | 'payments';

const HostDashboard: React.FC = () => {
  const { config } = useQuizConfig();
  const isWeb3 = config?.paymentMethod === 'web3';
  const { players, setFullPlayers } = usePlayerStore();
  const { admins, setFullAdmins } = useAdminStore();
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const { roomId } = useRoomIdentity();

  // Clear admin state on initial mount
  useEffect(() => {
    if (DEBUG) console.log('🧹 [HostDashboard] Clearing admin state on initial mount');
    useAdminStore.getState().resetAdmins();
  }, []);

  // Handle socket events only after connection established
  useEffect(() => {
    if (!socket || !connected || !roomId) return;

    if (DEBUG) console.log('✅ [HostDashboard] Socket connected, setting up event listeners');

    const handleRoomConfig = (payload: any) => {
      if (DEBUG) console.log('🎯 [HostDashboard] Received room_config:', payload);
      useQuizConfig.getState().setFullConfig({ ...payload, roomId });
    };

    const handlePlayerList = ({ players }: { players: any[] }) => {
      setFullPlayers(players);
    };

    const handleAdminList = ({ admins }: { admins: any[] }) => {
      setFullAdmins(admins);
    };

    socket.on('room_config', handleRoomConfig);
    socket.on('player_list_updated', handlePlayerList);
    socket.on('admin_list_updated', handleAdminList);

    // 🔥 Only emit request after handlers attached
    socket.emit('request_current_state', { roomId });

    return () => {
      socket.off('room_config', handleRoomConfig);
      socket.off('player_list_updated', handlePlayerList);
      socket.off('admin_list_updated', handleAdminList);
    };
  }, [socket, connected, roomId, setFullPlayers, setFullAdmins]);

  // Join room as host
  useEffect(() => {
    if (connected && socket && roomId && config?.hostId && config?.hostName) {
      if (DEBUG) console.log('🔌 [HostDashboard] Emitting join_quiz_room as host');
      socket.emit('join_quiz_room', {
        roomId,
        user: { id: config.hostId, name: config.hostName },
        role: 'host',
      });
    }
  }, [connected, socket, roomId, config?.hostId, config?.hostName]);

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

  // Quiz cancelled handler
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

  const handleCancelQuiz = () => {
    if (DEBUG) console.log('👤 [HostDashboard] 🚫 User initiated quiz cancellation');

    if (socket && roomId) {
      socket.emit('delete_quiz_room', { roomId });
      if (DEBUG) console.log('✅ Cancellation request sent to server');
    } else {
      navigate('/quiz');
    }
  };

  const tabs = [
    { 
      id: 'overview' as TabType, 
      label: 'Overview', 
      icon: <Settings className="w-4 h-4" />,
      count: null
    },
    // Add asset upload tab for web3 + assets mode
    ...(isWeb3 && config?.prizeMode === 'assets' ? [{
      id: 'assets' as TabType, 
      label: 'Upload Assets', 
      icon: <Upload className="w-4 h-4" />,
      count: config?.prizes?.filter(p => p.uploadStatus === 'completed').length || 0
    }] : []),
    // Admins only for non-web3 (moved before players)
    ...(!isWeb3 ? [{ 
      id: 'admins' as TabType, 
      label: 'Admins', 
      icon: <Shield className="w-4 h-4" />,
      count: admins?.length || 0
    }] : []),
    { 
      id: 'players' as TabType, 
      label: 'Players', 
      icon: <Users className="w-4 h-4" />,
      count: players?.length || 0
    },
    { 
      id: 'payments' as TabType, 
      label: 'Payments', 
      icon: <CreditCard className="w-4 h-4" />,
      count: null
    },
    { 
      id: 'launch' as TabType, 
      label: 'Launch', 
      icon: <Rocket className="w-4 h-4" />,
      count: null
    }
  ];

  const LaunchSection = () => {
    // Check if launch is allowed
    const canLaunch = isWeb3 && config?.prizeMode === 'assets' 
      ? config?.prizes?.every(p => !p.tokenAddress || p.uploadStatus === 'completed') !== false
      : true;

    const assetUploadIssues = isWeb3 && config?.prizeMode === 'assets' 
      ? config?.prizes?.filter(p => p.tokenAddress && p.uploadStatus !== 'completed') || []
      : [];

    return (
      <div className="space-y-6">
        {/* Main Launch Card */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 p-8 rounded-xl border-2 border-green-200">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-600 rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-green-800 mb-4">Ready to Launch?</h2>
            <p className="text-gray-600 text-lg mb-6 max-w-2xl mx-auto">
              Launch the quiz to redirect all waiting players to the game and open your host controls. 
              Make sure you've reviewed your setup and have players ready to participate.
            </p>
            <button
              onClick={handleLaunchQuiz}
              disabled={!canLaunch}
              className={`px-12 py-4 rounded-xl font-bold text-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center space-x-3 mx-auto ${
                canLaunch 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-400 cursor-not-allowed text-gray-200'
              }`}
            >
              <Rocket className="w-6 h-6" />
              <span>Launch Quiz Now</span>
            </button>

            {!canLaunch && assetUploadIssues.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Upload Required: {assetUploadIssues.length} asset{assetUploadIssues.length === 1 ? '' : 's'} must be uploaded before launching
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pre-Launch Checklist */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <Info className="w-5 h-5 text-blue-600" />
            <span>Pre-Launch Checklist</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-gray-700">Quiz configuration complete</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  (players?.length || 0) > 0 ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  <span className={`text-sm ${
                    (players?.length || 0) > 0 ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {(players?.length || 0) > 0 ? '✓' : '!'}
                  </span>
                </div>
                <span className="text-gray-700">
                  Players registered ({players?.length || 0})
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-gray-700">Payment method configured</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-gray-700">Host controls ready</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-gray-700">Socket connection active</span>
              </div>
              {isWeb3 && config?.prizeMode === 'assets' && (
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    canLaunch ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <span className={`text-sm ${
                      canLaunch ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {canLaunch ? '✓' : '!'}
                    </span>
                  </div>
                  <span className="text-gray-700">
                    Digital assets uploaded ({config?.prizes?.filter(p => p.uploadStatus === 'completed').length || 0}/{config?.prizes?.filter(p => p.tokenAddress).length || 0})
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-sm">i</span>
                </div>
                <span className="text-gray-700">Room ID: {roomId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-blue-600" />
            <div className="text-2xl font-bold text-gray-900">{players?.length || 0}</div>
            <div className="text-sm text-gray-600">Players Ready</div>
          </div>
          {!isWeb3 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-gray-900">{admins?.length || 0}</div>
              <div className="text-sm text-gray-600">Admins</div>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            {isWeb3 && config?.prizeMode === 'assets' ? (
              <>
                <Upload className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold text-gray-900">
                  {config?.prizes?.filter(p => p.uploadStatus === 'completed').length || 0}/{config?.prizes?.filter(p => p.tokenAddress).length || 0}
                </div>
                <div className="text-sm text-gray-600">Assets Uploaded</div>
              </>
            ) : (
              <>
                <div className={`w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center ${
                  connected ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    connected ? 'bg-green-600' : 'bg-red-600'
                  }`}></div>
                </div>
                <div className="text-2xl font-bold text-gray-900">{connected ? 'Online' : 'Offline'}</div>
                <div className="text-sm text-gray-600">Connection</div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CancelSection = () => (
    <div className="text-center">
      <button
        onClick={handleCancelQuiz}
        className="bg-red-100 text-red-700 px-6 py-3 rounded-xl font-medium hover:bg-red-200 transition-all duration-200 flex items-center space-x-2 mx-auto"
      >
        <X className="w-4 h-4" />
        <span>Cancel Quiz</span>
      </button>
    </div>
  );

  if (DEBUG) {
    console.log('🎨 [HostDashboard] Component rendering');
    console.table({
      roomId,
      hostName: config?.hostName || 'Host',
      hostId: config?.hostId || '—',
      configLoaded: !!config?.roomId,
      socketConnected: connected,
      hasSocket: !!socket,
      adminCount: admins?.length || 0,
      playerCount: players?.length || 0,
      prizeMode: config?.prizeMode,
      assetCount: config?.prizes?.filter(p => p.tokenAddress).length || 0,
      uploadsComplete: config?.prizes?.filter(p => p.uploadStatus === 'completed').length || 0,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-2xl">
              🎙️
            </div>
            <span>Host Dashboard</span>
          </h1>
          <p className="text-gray-600 text-lg">
            Welcome, <strong>{config?.hostName || 'Host'}</strong> — manage your quiz event below
          </p>
          {DEBUG && (
            <div className="mt-2 text-xs text-gray-400">
              Room: {roomId} | Socket: {connected ? '🟢' : '🔴'} | Config: {!!config?.roomId ? '✅' : '⏳'} | 
              Players: {players?.length || 0} | Admins: {admins?.length || 0} | 
              Assets: {config?.prizes?.filter(p => p.uploadStatus === 'completed').length || 0}/{config?.prizes?.filter(p => p.tokenAddress).length || 0}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 md:px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'launch' && (
              <div className="space-y-6">
                <LaunchSection />
                <CancelSection />
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <SetupSummaryPanel />
                <CancelSection />
              </div>
            )}

            {activeTab === 'assets' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <Upload className="w-5 h-5" />
                    <span>Asset Upload</span>
                  </h3>
                  <span className="text-sm text-gray-500">
                    {config?.prizes?.filter(p => p.uploadStatus === 'completed').length || 0} of{' '}
                    {config?.prizes?.filter(p => p.tokenAddress).length || 0} assets uploaded
                  </span>
                </div>
                <AssetUploadPanel />
                <CancelSection />
              </div>
            )}

            {activeTab === 'players' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Player Management</span>
                  </h3>
                  <span className="text-sm text-gray-500">
                    {players?.length || 0} player{(players?.length || 0) === 1 ? '' : 's'} registered
                  </span>
                </div>
                <PlayerListPanel />
                <CancelSection />
              </div>
            )}

            {activeTab === 'admins' && !isWeb3 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Admin Management</span>
                  </h3>
                  <span className="text-sm text-gray-500">
                    {admins?.length || 0} admin{(admins?.length || 0) === 1 ? '' : 's'} configured
                  </span>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Admin Access</p>
                      <p>Admins can help manage the quiz during gameplay. They have access to host controls and can assist with technical issues.</p>
                    </div>
                  </div>
                </div>
                
                <AdminListPanel />
                <CancelSection />
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                    <CreditCard className="w-5 h-5" />
                    <span>Payment Management</span>
                  </h3>
                  <span className="text-sm text-gray-500">
                    {config?.paymentMethod === 'web3' ? 'Web3 Payments' : 'Manual Collection'}
                  </span>
                </div>
                <PaymentReconciliationPanel />
                <CancelSection />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;









