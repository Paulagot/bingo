// src/components/Quiz/dashboard/HostDashboard.tsx

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizConfig } from '../useQuizConfig';
import { usePlayerStore } from '../usePlayerStore';
import { useRoomIdentity } from '../useRoomIdentity';
import { fullQuizReset } from '../fullQuizReset';

import SetupSummaryPanel from './SetupSummaryPanel';
import PlayerListPanel from './PlayerListPanel';
import AdminListPanel from './AdminListPanel';
import PaymentReconciliationPanel from './PaymentReconciliation';

import HostGameControls from '../game/GameControls';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { useAdminStore } from '../useAdminStore';

// Debug configuration
const DEBUG = true;

const HostDashboard: React.FC = () => {
 const { config, resetConfig } = useQuizConfig();
const { resetPlayers, setFullPlayers } = usePlayerStore();
const { admins, setFullAdmins } = useAdminStore();


  const navigate = useNavigate();
  const { socket, connected, connectionState } = useQuizSocket();
  const { roomId, hostId } = useRoomIdentity();

  // Refs for tracking component state
  const mountTimeRef = useRef<number>(Date.now());
 

  const handlePlayerList = ({ players }: { players: any[] }) => {
    setFullPlayers(players);
  };

  const handleAdminList = ({ admins }: { admins: any[] }) => {
    setFullAdmins(admins);
  };

   // ───────────────────────────────────
  // 0) clear admin state on initial mount

  useEffect(() => {
  if (DEBUG) console.log('🧹 [HostDashboard] Clearing admin state on initial mount');
  useAdminStore.getState().resetAdmins();
}, []);


  // ───────────────────────────────────
  // 1) On mount, debug info
  useEffect(() => {
    if (DEBUG) {
      console.log('🔵 [HostDashboard] 🚀 HostDashboard component mounted');
      console.log('🔵 [HostDashboard] Initial mount state:', {
        roomId,
        configRoomId: config?.roomId,
        hostName: config?.hostName,
        hostId: config?.hostId,
        socketConnected: connected,
        connectionState,
        mountTime: new Date(mountTimeRef.current).toISOString(),
      });
    }
    
    return () => {
      const elapsed = Math.round((Date.now() - mountTimeRef.current) / 1000);
      if (DEBUG) console.log(`🔵 [HostDashboard] 🏁 HostDashboard component unmounted after ${elapsed}s`);
    };
  }, []);

  // ───────────────────────────────────


  // ───────────────────────────────────
  // 3) Debug socket status
  useEffect(() => {
    if (DEBUG) {
      console.log('🔌 [HostDashboard] Socket state changed');
      console.log('📦 [HostDashboard] Socket status:', {
        connected,
        connectionState,
        socketId: socket?.id,
        hasSocket: !!socket,
        roomId
      });
    }

    if (connected && socket && roomId) {
      if (DEBUG) console.log(`🔌 [HostDashboard] Socket connected for room: ${roomId}`);
    } else if (!connected && roomId) {
      if (DEBUG) console.warn(`⚠️ [HostDashboard] Socket disconnected for room: ${roomId}`);
    }
  }, [connected, connectionState, socket, roomId]);

  // ───────────────────────────────────
  // 4) Listen for "player_list_updated" and "admin_list_updated"
  useEffect(() => {
    if (!socket) return;
    
    socket.on('player_list_updated', handlePlayerList);
    socket.on('admin_list_updated', handleAdminList);
    
    return () => {
      socket.off('player_list_updated', handlePlayerList);
      socket.off('admin_list_updated', handleAdminList);
    };
  }, [socket, roomId, setFullPlayers, setFullAdmins]);

  // 4.5) Listen for room_config to fully rehydrate config after reconnect or refresh
useEffect(() => {
  if (!socket || !roomId) return;

  const handleRoomConfig = (payload: any) => {
    if (DEBUG) {
      console.log('🎯 [HostDashboard] Received room_config:', payload);
    }
    useQuizConfig.getState().setFullConfig({ ...payload, roomId });
  };

  socket.on('room_config', handleRoomConfig);

  return () => {
    socket.off('room_config', handleRoomConfig);
  };
}, [socket, roomId]);




  // ───────────────────────────────────
  // 5) Join room as host when connected
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

  useEffect(() => {
  if (socket && connected && roomId) {
    console.log('📡 [HostDashboard] Requesting full room state');
    socket.emit('request_current_state', { roomId });
  }
}, [socket, connected, roomId]);


  // ───────────────────────────────────
  // 6) Sync persisted admin data after config loads
  useEffect(() => {
    if (!!config?.roomId && roomId && connected && socket) {
      // Check if we have persisted admin data for this room
      const persistedAdmins = useAdminStore.getState().admins;
      
      if (DEBUG) {
        console.log('🔄 [HostDashboard] Checking persisted admins after config load');
        console.log('📦 [HostDashboard] Persisted admins:', persistedAdmins);
      }
      
      // If we have persisted admins, we'll let the server decide
      // whether to use them or send us the current state
      if (persistedAdmins.length > 0) {
        if (DEBUG) console.log('🔵 [HostDashboard] Found persisted admins, waiting for server sync');
      }
    }
  }, [!!config?.roomId, roomId, connected, socket]);

  // ───────────────────────────────────
  // 7) Debug config whenever it changes
  useEffect(() => {
    if (!!config?.roomId && DEBUG) {
      console.log('⚙️ [HostDashboard] Quiz config updated');
      console.table({
        roomId: config?.roomId,
        hostName: config?.hostName,
        hostId: config?.hostId,
        entryFee: config?.entryFee,
        paymentMethod: config?.paymentMethod,
        currencySymbol: config?.currencySymbol,
      });
    }
  }, [config]);

  // ───────────────────────────────────
  useEffect(() => {
  if (!socket) return;

const handleQuizCancelled = ({ roomId }: { roomId: string }) => {
  console.warn('🚫 Quiz was cancelled by host. Resetting local state.');
  fullQuizReset();
  navigate('/');
};

  socket.on('quiz_cancelled', handleQuizCancelled);
  return () => {
    socket.off('quiz_cancelled', handleQuizCancelled);
  };
}, [socket, navigate]);

  // ───────────────────────────────────
 const handleCancelQuiz = () => {
  if (DEBUG) console.log('👤 [HostDashboard] 🚫 User initiated quiz cancellation');
  if (DEBUG) console.log('🧹 [HostDashboard] Starting cleanup process');

  // First, tell the server to delete the room
  if (socket && roomId) {
    if (DEBUG) console.log('🔌 [HostDashboard] Telling server to delete room');
    socket.emit('delete_quiz_room', { roomId });
  }

  if (DEBUG) console.log('🧹 [HostDashboard] Resetting config state');
  resetConfig();

  if (DEBUG) console.log('🧹 [HostDashboard] Resetting players state');
  resetPlayers();

  if (DEBUG) console.log('🧹 [HostDashboard] Resetting admins state');
  useAdminStore.getState().resetAdmins();

  // Clear the localStorage items for this room
  if (roomId) {
    const storageKey = `quiz_config_${roomId}`;
    localStorage.removeItem(storageKey);
    if (DEBUG) console.log(`💾 [HostDashboard] Removed localStorage key: ${storageKey}`);
  }

  if (socket) {
    if (DEBUG) {
      console.log('🔌 [HostDashboard] Initiating socket disconnect');
      console.log('📦 [HostDashboard] Socket state before disconnect:', {
        connected: socket.connected,
        id: socket.id,
      });
    }
    try {
      socket.disconnect();
      if (DEBUG) console.log('✅ [HostDashboard] Socket disconnected successfully');
    } catch (error) {
      if (DEBUG) {
        console.error('❌ [HostDashboard] Error during socket disconnect');
        console.log('📦 [HostDashboard] Disconnect error:', error);
      }
    }
  } else {
    if (DEBUG) console.log('🔵 [HostDashboard] No socket to disconnect');
  }

  if (DEBUG) console.log('🧭 [HostDashboard] Navigating to home page');
  navigate('/');
  
  if (DEBUG) console.log('✅ [HostDashboard] Quiz cancellation completed');
};



  // ───────────────────────────────────
  // Debug render state
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
        <HostGameControls />

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







