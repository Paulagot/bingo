// src/sockets/QuizSocketProvider.tsx

// src/sockets/QuizSocketProvider.tsx

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

// 🔧 Import Zustand stores
import { usePlayerStore } from '../components/Quiz/usePlayerStore';
import { useAdminStore } from '../components/Quiz/useAdminStore';
import { useQuizConfig } from '../components/Quiz/useQuizConfig';

// Debug configuration
const DEBUG = true; // Set to false in production

// Debug logger with emojis and styling
const debugLog = {
  info: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔵 [QuizSocket] ${message}`, ...args); },
  success: (message: string, ...args: any[]) => { if (DEBUG) console.log(`✅ [QuizSocket] ${message}`, ...args); },
  warning: (message: string, ...args: any[]) => { if (DEBUG) console.warn(`⚠️ [QuizSocket] ${message}`, ...args); },
  error: (message: string, ...args: any[]) => { if (DEBUG) console.error(`❌ [QuizSocket] ${message}`, ...args); },
  event: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🎯 [QuizSocket] ${message}`, ...args); },
  network: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🌐 [QuizSocket] ${message}`, ...args); },
  reconnect: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔄 [QuizSocket] ${message}`, ...args); },
  disconnect: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔴 [QuizSocket] ${message}`, ...args); },
  connecting: (message: string, ...args: any[]) => { if (DEBUG) console.log(`▶️ [QuizSocket] ${message}`, ...args); },
  data: (message: string, data: any) => { if (DEBUG) { console.group(`📦 [QuizSocket] ${message}`); console.log(data); console.groupEnd(); } },
  config: (message: string, config: any) => { if (DEBUG) { console.group(`⚙️ [QuizSocket] ${message}`); console.table(config); console.groupEnd(); } },
  lifecycle: (message: string, ...args: any[]) => { if (DEBUG) console.log(`🔄 [QuizSocket] ${message}`, ...args); }
};

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

  useEffect(() => {
    debugLog.lifecycle('🚀 QuizSocketProvider mounting');
    
    if (!socketRef.current) {
      const namespaceUrl = `${import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'}/quiz`;
      
      debugLog.connecting('Initializing socket connection');
      debugLog.network('Target namespace URL:', namespaceUrl);
      
      const socketConfig = {
        path: '/socket.io',
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      };

      debugLog.config('Socket configuration:', socketConfig);
      setConnectionState('connecting');

      const socket = io(namespaceUrl, socketConfig);
      socketRef.current = socket;

      // ───────────────────────────────────────────────
      // ✅ GAME LOGIC SOCKET LISTENERS GO HERE
      // ───────────────────────────────────────────────

      // 🎮 ROOM CONFIG HANDLER - FIXED VERSION
      socket.on('room_config', (config) => {
        debugLog.event('🎮 Received room_config event from server');
        debugLog.data('Raw received config data', config);
        
        try {
          if (!config) {
            debugLog.warning('⚠️ Received empty or null config');
            return;
          }

          // Validate that we have the expected config structure
          const hasValidStructure = typeof config === 'object' && config !== null;
          debugLog.info(`📋 Config validation - Valid structure: ${hasValidStructure}`);
          
          if (!hasValidStructure) {
            debugLog.error('❌ Invalid config structure received');
            return;
          }
          
          if (config.prizes) {
            debugLog.info(`🎁 Config contains ${config.prizes.length} prizes`);
          } else {
            debugLog.warning('⚠️ Config has no prizes defined');
          }
          
          if (config.roundDefinitions) {
            debugLog.info(`🎯 Config contains ${config.roundDefinitions.length} round definitions`);
          } else {
            debugLog.warning('⚠️ Config has no round definitions');
          }

          // 🔧 FIXED: Direct store access instead of using getState() in event handler
          // We'll use a timeout to ensure the store is ready
          setTimeout(() => {
            try {
              const setConfig = useQuizConfig.getState().setConfig;
              setConfig(config);
              
              debugLog.success('✅ Config successfully updated in Zustand store');
              debugLog.data('Updated store state', useQuizConfig.getState().config);
            } catch (storeError) {
              debugLog.error('❌ Error updating Zustand store', storeError);
              // Fallback: Try again after a longer delay
              setTimeout(() => {
                try {
                  const setConfig = useQuizConfig.getState().setConfig;
                  setConfig(config);
                  debugLog.success('✅ Config updated in store (retry successful)');
                } catch (retryError) {
                  debugLog.error('❌ Store update failed even on retry', retryError);
                }
              }, 100);
            }
          }, 0);
          
        } catch (error) {
          debugLog.error('❌ Error processing room_config event', error);
        }
      });

      // 🔄 REQUEST FULL STATE HANDLER
      socket.on('request_full_state', (payload) => {
        debugLog.event('🧩 Received request_full_state event from server');
        debugLog.data('request_full_state payload', payload);

        const roomId = payload.roomId;

        // Only send state if we actually have it
        // If stores are empty (after refresh), don't overwrite server state
        const fullPlayers = usePlayerStore.getState().players;
        const fullAdmins = useAdminStore.getState().admins;
        
        // Check if we have valid state to send
        if (fullPlayers.length === 0 && fullAdmins.length === 0) {
          debugLog.warning('📦 Frontend stores are empty, not sending state rebuild');
          // Request the server to send us the current state instead
          socket.emit('request_current_state', { roomId });
          return;
        }

        debugLog.data('📦 Sending rebuild_room_state payload', {
          players: fullPlayers,
          admins: fullAdmins,
        });

        socket.emit('rebuild_room_state', {
          roomId,
          players: fullPlayers,
          admins: fullAdmins,
        });
      });

      // 🎯 QUIZ GAME EVENTS
      socket.on('quiz_started', (data) => {
        debugLog.event('🎯 Quiz started event received');
        debugLog.data('Quiz start data', data);
      });

      socket.on('quiz_error', (data) => {
        debugLog.error('🚨 Quiz error received from server');
        debugLog.data('Error details', data);
      });

      socket.on('user_joined', (data) => {
        debugLog.event('👤 User joined event received');
        debugLog.data('User join data', data);
      });

      // 📝 QUESTION AND ANSWER EVENTS
      socket.on('question', (data) => {
        debugLog.event('❓ New question received');
        debugLog.data('Question data', data);
      });

      socket.on('answer_received', (data) => {
        debugLog.event('✍️ Answer confirmation received');
        debugLog.data('Answer feedback', data);
      });

      // 📋 PLAYER AND ADMIN LIST UPDATES
      socket.on('player_list_updated', (data) => {
        debugLog.event('👥 Player list updated');
        debugLog.data('Updated players', data);
        
        try {
          const setPlayers = usePlayerStore.getState().setPlayers;
          setPlayers(data.players || []);
          debugLog.success('✅ Player store updated');
        } catch (error) {
          debugLog.error('❌ Error updating player store', error);
        }
      });

      socket.on('admin_list_updated', (data) => {
        debugLog.event('👨‍💼 Admin list updated');
        debugLog.data('Updated admins', data);
        
        try {
          const setAdmins = useAdminStore.getState().setAdmins;
          setAdmins(data.admins || []);
          debugLog.success('✅ Admin store updated');
        } catch (error) {
          debugLog.error('❌ Error updating admin store', error);
        }
      });

      // ───────────────────────────────────────────────

      // Connection established
      socket.on('connect', () => {
        debugLog.success('Connection established successfully!');
        debugLog.data('Socket details', {
          id: socket.id,
          connected: socket.connected,
          transport: socket.io.engine?.transport?.name
        });
        
        setConnected(true);
        setConnectionState('connected');
        setLastError(null);
        reconnectAttemptRef.current = 0;
      });

      // Connection lost
      socket.on('disconnect', (reason) => {
        debugLog.disconnect('Connection lost');
        debugLog.warning('Disconnect reason:', reason);
        debugLog.data('Socket state on disconnect', {
          reason,
          socketId: socket.id,
          wasConnected: connected
        });
        
        setConnected(false);
        setConnectionState('disconnected');
      });

      // Connection errors
      socket.on('connect_error', (err) => {
        debugLog.error('Connection error occurred');
        debugLog.data('Error details', {
          message: err.message,
          description: (err as any).description || 'No description available',
          context: (err as any).context || 'No context available',
          type: (err as any).type || err.constructor.name
        });
        
        setLastError(err.message);
        setConnectionState('disconnected');
      });

      // Reconnection attempts
      socket.io.on('reconnect_attempt', (attempt) => {
        reconnectAttemptRef.current = attempt;
        debugLog.reconnect(`Reconnection attempt #${attempt}`);
        setConnectionState('reconnecting');
      });

      socket.io.on('reconnect', (attempt) => {
        debugLog.success(`Reconnected successfully after ${attempt} attempts! 🎉`);
        setConnectionState('connected');
        reconnectAttemptRef.current = 0;
      });

      socket.io.on('reconnect_error', (err) => {
        debugLog.error(`Reconnection attempt #${reconnectAttemptRef.current} failed`);
        debugLog.data('Reconnection error', err);
      });

      socket.io.on('reconnect_failed', () => {
        debugLog.error('All reconnection attempts exhausted! 💔');
        debugLog.warning('Manual intervention may be required');
        setConnectionState('disconnected');
        setLastError('Reconnection failed after maximum attempts');
      });

      // Network status monitoring
      socket.on('ping', () => {
        if (DEBUG) debugLog.network('📡 Ping sent to server');
      });

      socket.on('pong', (latency) => {
        if (DEBUG) debugLog.network(`📡 Pong received - Latency: ${latency}ms`);
      });

      // Generic event listener for debugging
      const originalEmit = socket.emit;
      socket.emit = function(event: string, ...args: any[]) {
        debugLog.event(`Emitting event: "${event}"`);
        if (args.length > 0) {
          debugLog.data(`Event "${event}" payload`, args);
        }
        return originalEmit.apply(this, [event, ...args]);
      };

      const originalOn = socket.on;
      socket.on = function(event: string, listener: (...args: any[]) => void) {
        const wrappedListener = (...args: any[]) => {
          if (!['connect', 'disconnect', 'connect_error', 'ping', 'pong'].includes(event)) {
            debugLog.event(`Received event: "${event}"`);
            if (args.length > 0) {
              debugLog.data(`Event "${event}" data`, args);
            }
          }
          return listener(...args);
        };
        return originalOn.call(this, event, wrappedListener);
      };

      debugLog.success('Socket instance created and event listeners registered');
    }

    return () => {
      debugLog.lifecycle('🧹 QuizSocketProvider unmounting');
      if (socketRef.current) {
        debugLog.info('Cleaning up socket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        debugLog.success('Socket cleanup completed');
      }
    };
  }, []);

  useEffect(() => {
    debugLog.info(`Connection state changed: ${connectionState}`);
    if (connectionState === 'reconnecting') {
      debugLog.reconnect(`Reconnection attempt in progress...`);
    }
  }, [connectionState]);

  useEffect(() => {
    debugLog.info(`Connected state changed: ${connected ? 'ONLINE 🟢' : 'OFFLINE 🔴'}`);
  }, [connected]);

  useEffect(() => {
    if (!DEBUG) return;
    const healthCheck = setInterval(() => {
      if (socketRef.current) {
        debugLog.info('🏥 Health check', {
          connected: socketRef.current.connected,
          id: socketRef.current.id,
          transport: socketRef.current.io.engine?.transport?.name,
          readyState: socketRef.current.io.engine?.readyState
        });
      }
    }, 30000);
    return () => clearInterval(healthCheck);
  }, []);

  const contextValue: QuizSocketContextType = {
    socket: socketRef.current,
    connected,
    connectionState,
    lastError
  };

  debugLog.data('Provider context value', contextValue);

  return (
    <QuizSocketContext.Provider value={contextValue}>
      {children}
    </QuizSocketContext.Provider>
  );
};

export const useQuizSocket = () => {
  const context = useContext(QuizSocketContext);
  if (DEBUG) {
    debugLog.info('🪝 useQuizSocket hook called', {
      connected: context.connected,
      connectionState: context.connectionState,
      hasSocket: !!context.socket,
      socketId: context.socket?.id
    });
  }
  return context;
};

