import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizConfig } from '../useQuizConfig';
import { usePlayerStore } from '../usePlayerStore';
import { useRoomIdentity } from '../useRoomIdentity';
import { fullQuizReset } from '../utils/fullQuizReset';
import SetupSummaryPanel from './SetupSummaryPanel';
import PlayerListPanel from './PlayerListPanel';
import AdminListPanel from './AdminListPanel';
import PaymentReconciliationPanel from './PaymentReconciliation';

import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { useAdminStore } from '../useAdminStore';

const DEBUG = true;

const HostDashboard: React.FC = () => {
  const { config, resetConfig } = useQuizConfig();
  const { resetPlayers, setFullPlayers } = usePlayerStore();
  const { admins, setFullAdmins } = useAdminStore();

  const navigate = useNavigate();
  const { socket, connected, connectionState } = useQuizSocket();
  const { roomId, hostId } = useRoomIdentity();

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
    // ✅ Don't disconnect immediately - let the server send us the cancellation event
    // ✅ Don't navigate immediately - let the global handler do it
    if (DEBUG) console.log('✅ Cancellation request sent to server');
  } else {
    // ✅ Fallback if no socket/roomId
    navigate('/quiz');
  }
};

  if (DEBUG) {
    console.log('🎨 [HostDashboard] Component rendering');
    console.table({
      roomId,
      hostName: config?.hostName || 'Host',
      hostId: config?.hostId || '—',
      configLoaded: !!config?.roomId,
      socketConnected: connected,
      hasSocket: !!socket,
      adminCount: admins.length,
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white pb-20">
      <div className="container mx-auto max-w-4xl px-4 py-12 space-y-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">🎙️ Host Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {config?.hostName || 'Host'} — manage your quiz event below.
          </p>
          {DEBUG && (
            <div className="mt-2 text-xs text-gray-400">
              Room: {roomId} | Socket: {connected ? '🟢' : '🔴'} | Config: {!!config?.roomId ? '✅' : '⏳'} | Admins: {admins.length}
            </div>
          )}
        </div>

        <SetupSummaryPanel />
        <AdminListPanel />
        <PlayerListPanel />
        <PaymentReconciliationPanel />
       

       {/* Launch Quiz Section */}
<div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border-2 border-green-200">
  <div className="text-center">
    <h2 className="text-2xl font-bold text-green-800 mb-3">🚀 Ready to Start?</h2>
    <p className="text-gray-600 mb-6">
      Launch the quiz to redirect all waiting players to the game and open your host controls.
    </p>
    <button
      onClick={handleLaunchQuiz}
      className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors shadow-lg"
    >
      🚀 Launch Quiz
    </button>
  </div>
</div>

        <div className="text-center pt-8">
          <button
            onClick={handleCancelQuiz}
            className="bg-red-100 text-red-700 px-6 py-2 rounded-xl font-medium hover:bg-red-200 transition"
          >
            ❌ Cancel Quiz
          </button>
        </div>
      </div>
    </div>
  );
};

export default HostDashboard;









