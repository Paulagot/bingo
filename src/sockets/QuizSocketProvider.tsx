import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { usePlayerStore } from '../components/Quiz/usePlayerStore';
import { useAdminStore } from '../components/Quiz/useAdminStore';
import { useQuizConfig } from '../components/Quiz/useQuizConfig';
import { useRoomState } from '../components/Quiz/useRoomState';
import { useRoomIdentity } from '../components/Quiz/useRoomIdentity';

// Debug config
const DEBUG = true;

const debugLog = {
  info: (msg: string, ...args: any[]) => { if (DEBUG) console.log(`🔵 [QuizSocket] ${msg}`, ...args); },
  success: (msg: string, ...args: any[]) => { if (DEBUG) console.log(`✅ [QuizSocket] ${msg}`, ...args); },
  warning: (msg: string, ...args: any[]) => { if (DEBUG) console.warn(`⚠️ [QuizSocket] ${msg}`, ...args); },
  error: (msg: string, ...args: any[]) => { if (DEBUG) console.error(`❌ [QuizSocket] ${msg}`, ...args); },
  event: (msg: string, ...args: any[]) => { if (DEBUG) console.log(`🎯 [QuizSocket] ${msg}`, ...args); },
  data: (msg: string, data: any) => { if (DEBUG) { console.group(`📦 [QuizSocket] ${msg}`); console.log(data); console.groupEnd(); } },
};

// Socket context type
interface QuizSocketContextType {
  socket: Socket | null;
  connected: boolean;
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  lastError: string | null;
}

const QuizSocketContext = createContext<QuizSocketContextType>({
  socket: null,
  connected: false,
  connectionState: 'disconnected',
  lastError: null,
});

export const QuizSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef<number>(0);

  const { roomId, hostId } = useRoomIdentity();

  useEffect(() => {
    debugLog.info('🚀 QuizSocketProvider mounting');

    if (!socketRef.current) {
      const namespaceUrl = `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'}/quiz`;
      debugLog.info('Connecting to Socket.IO namespace:', namespaceUrl);

      const socket = io(namespaceUrl, {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      socketRef.current = socket;
      setConnectionState('connecting');

      // Hydrate quiz state from server
      socket.on('room_config', (config) => {
        debugLog.event('🎮 room_config');
        debugLog.data('config', config);
        useQuizConfig.getState().setFullConfig(config);
      });

      socket.on('player_list_updated', ({ players }) => {
        debugLog.event('👥 player_list_updated');
        debugLog.data('players', players);
        usePlayerStore.getState().setFullPlayers(players || []);
      });

      socket.on('admin_list_updated', ({ admins }) => {
        debugLog.event('👨‍💼 admin_list_updated');
        debugLog.data('admins', admins);
        useAdminStore.getState().setFullAdmins(admins || []);
      });

      socket.on('room_state', (state) => {
        debugLog.event('🧩 room_state');
        debugLog.data('state', state);
        useRoomState.getState().setRoomState(state);
      });

      socket.on('quiz_error', (data) => {
        debugLog.error('quiz_error:', data);
      });

      // Connection lifecycle
      socket.on('connect', () => {
        debugLog.success('🟢 Connected');
        setConnected(true);
        setConnectionState('connected');
        setLastError(null);
        reconnectAttemptRef.current = 0;

        if (roomId && hostId) {
          debugLog.info('Auto rejoining quiz room after reconnect:', roomId);
          socket.emit('join_quiz_room', { roomId, user: { id: hostId }, role: 'host' });
        }
      });

      socket.on('disconnect', (reason) => {
        debugLog.warning('🔴 Disconnected:', reason);
        setConnected(false);
        setConnectionState('disconnected');
      });

      socket.on('connect_error', (err) => {
        debugLog.error('connect_error:', err);
        setLastError(err.message);
        setConnectionState('disconnected');
      });

      // Engine-level reconnect events
      socket.io.on('reconnect_attempt', (attempt) => {
        reconnectAttemptRef.current = attempt;
        debugLog.warning(`Reconnecting attempt ${attempt}`);
        setConnectionState('reconnecting');
      });

      socket.io.on('reconnect', () => {
        debugLog.success('✅ Reconnected successfully');
        setConnectionState('connected');
      });

      socket.io.on('reconnect_failed', () => {
        debugLog.error('❌ Reconnect failed');
        setConnectionState('disconnected');
      });
    }

    return () => {
      debugLog.info('🧹 Cleaning up QuizSocketProvider');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [roomId, hostId]);

  const contextValue: QuizSocketContextType = {
    socket: socketRef.current,
    connected,
    connectionState,
    lastError,
  };

  return (
    <QuizSocketContext.Provider value={contextValue}>
      {children}
    </QuizSocketContext.Provider>
  );
};

export const useQuizSocket = () => {
  return useContext(QuizSocketContext);
};





