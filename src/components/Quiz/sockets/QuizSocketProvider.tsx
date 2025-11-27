// src/sockets/QuizSocketProvider.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

import { usePlayerStore } from '../hooks/usePlayerStore';
import { useAdminStore } from '../hooks/useAdminStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useRoomState } from '../hooks/useRoomState';
import { useRoomIdentity } from '../hooks/useRoomIdentity';

const DEBUG = false;
const log = (...a: any[]) => DEBUG && console.log('[QuizSocket]', ...a);

type ConnState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface QuizSocketContextType {
  socket: Socket | null;
  connected: boolean;
  connectionState: ConnState;
  lastError: string | null;
}

const QuizSocketContext = createContext<QuizSocketContextType>({
  socket: null,
  connected: false,
  connectionState: 'disconnected',
  lastError: null,
});

// Small helper so we can reuse this pattern elsewhere too
function resolveSocketNamespace(): string {
  // In prod: same-origin + namespace only → '/quiz'
  // In dev: explicit origin from VITE_SOCKET_URL + namespace
  if (import.meta.env.PROD) return '/quiz';

  const base = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  // ensure exactly one slash between base and /quiz
  return `${base.replace(/\/+$/, '')}/quiz`;
}

export const QuizSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnState>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef<number>(0);

  // ✅ Read identity values
  const { roomId, hostId } = useRoomIdentity();
  
  // ✅ Store current values in ref so we can access them in callbacks
  const identityRef = useRef({ roomId, hostId });
  
  // ✅ Keep ref in sync with latest values
  useEffect(() => {
    identityRef.current = { roomId, hostId };
  }, [roomId, hostId]);

  // ✅ Socket creation effect - runs ONCE on mount only
  useEffect(() => {
    log('mount');
    if (socketRef.current) return;

    const target = resolveSocketNamespace();
    log('connecting to:', target);

    const socket = io(target, {
      path: '/socket.io',            // must match server (you're using default)
      transports: ['websocket', 'polling'], // prefer WS first
      withCredentials: false,        // same-origin in prod; no cookies needed in dev
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
      // Avoid forceNew in prod to keep a single shared manager
      ...(import.meta.env.PROD ? {} : { forceNew: true }),
    });

    socketRef.current = socket;
    setConnectionState('connecting');

    // ---- server → client handlers ----
    socket.on('room_config', (config: any) => {
      log('room_config', config);
      useQuizConfig.getState().setFullConfig(config);
    });

    socket.on('player_list_updated', ({ players }: { players: any }) => {
      log('player_list_updated', players);
      usePlayerStore.getState().setFullPlayers(players || []);
    });

    socket.on('admin_list_updated', ({ admins }: { admins: any }) => {
      log('admin_list_updated', admins);
      useAdminStore.getState().setFullAdmins(admins || []);
    });

    socket.on('room_state', (state: any) => {
      log('room_state', state);
      useRoomState.getState().setRoomState(state);
      if (state?.phase) {
        useQuizConfig.getState().setQuizPhase(state.phase, state.completedAt);
      }
    });

    socket.on('quiz_error', (data: any) => {
      log('quiz_error', data);
    });

    socket.on('quiz_cancelled', ({ message, roomId: cancelledRoomId }: { message: string; roomId: string }) => {
      log('quiz_cancelled', message, cancelledRoomId);
      useQuizConfig.getState().resetConfig();
      usePlayerStore.getState().resetPlayers();
      useAdminStore.getState().resetAdmins();
      if (cancelledRoomId) {
        localStorage.removeItem(`quiz_config_${cancelledRoomId}`);
      }
      localStorage.removeItem('current-room-id');
      localStorage.removeItem('current-host-id');
      setTimeout(() => { window.location.href = '/'; }, 100);
    });

    // ✅ UNIFIED quiz_cleanup_complete handler - handles BOTH Web3 and Web2
    socket.on('quiz_cleanup_complete', ({ 
      message, 
      roomId: cleanupRoomId,
      isWeb3Room 
    }: { 
      message: string; 
      roomId: string;
      isWeb3Room?: boolean;
    }) => {
      log('quiz_cleanup_complete', message, cleanupRoomId, 'isWeb3Room:', isWeb3Room);
      
      // Same cleanup for everyone
      useQuizConfig.getState().resetConfig();
      usePlayerStore.getState().resetPlayers();
      useAdminStore.getState().resetAdmins();
      
      if (cleanupRoomId) {
        localStorage.removeItem(`quiz_config_${cleanupRoomId}`);
        localStorage.removeItem(`prizesDistributed:${cleanupRoomId}`);
        localStorage.removeItem(`quiz_rejoin_${cleanupRoomId}`);
      }
      
      localStorage.removeItem('current-room-id');
      localStorage.removeItem('current-host-id');
      
      // 🎯 DIFFERENT REDIRECT FOR WEB3 vs WEB2
      setTimeout(() => {
        if (isWeb3Room) {
          // Web3 flow: Everyone goes to impact campaign
          window.location.href = '/web3/impact-campaign/';
        } else {
          // Web2 flow: Everyone goes to quiz home
          window.location.href = '/';
        }
      }, 100);
    });

    // ---- lifecycle ----
    socket.on('connect', () => {
      log('connected');
      setConnected(true);
      setConnectionState('connected');
      setLastError(null);
      reconnectAttemptRef.current = 0;
      (window as any).quizSocket = socket;

      // ✅ Read current identity values from ref (not from hook state)
      const { roomId: currentRoomId, hostId: currentHostId } = identityRef.current;

      if (currentRoomId && currentHostId) {
        log('auto rejoin after connect', { roomId: currentRoomId, hostId: currentHostId });
        socket.emit('join_quiz_room', { 
          roomId: currentRoomId, 
          user: { id: currentHostId }, 
          role: 'host' 
        });
      }
    });

    socket.on('disconnect', (reason: string) => {
      log('disconnected', reason);
      setConnected(false);
      setConnectionState('disconnected');
    });

    socket.on('connect_error', (err: Error) => {
      log('connect_error', err);
      setLastError(err.message);
      setConnectionState('disconnected');
    });

    socket.io.on('reconnect_attempt', (attempt: number) => {
      reconnectAttemptRef.current = attempt;
      setConnectionState('reconnecting');
      log('reconnect_attempt', attempt);
    });

    socket.io.on('reconnect', () => {
      setConnectionState('connected');
      log('reconnected');
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState('disconnected');
      log('reconnect_failed');
    });

    return () => {
      log('cleanup/disconnect');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []); // ✅ Empty array - socket created ONCE on mount, never recreated

  // ✅ SEPARATE effect to handle room/host identity changes
  // This only emits events, doesn't recreate the socket
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !roomId || !hostId) return;

    log('Room identity ready, rejoining', { roomId, hostId });
    socket.emit('join_quiz_room', { 
      roomId, 
      user: { id: hostId }, 
      role: 'host' 
    });
  }, [roomId, hostId, connected]); // ✅ Only re-join if identity or connection changes

  const contextValue: QuizSocketContextType = {
    socket: socketRef.current,
    connected,
    connectionState,
    lastError,
  };

  return <QuizSocketContext.Provider value={contextValue}>{children}</QuizSocketContext.Provider>;
};

export const useQuizSocket = () => useContext(QuizSocketContext);






