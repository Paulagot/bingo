import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  // If socket exists and is connected or connecting, reuse it
  if (socket && (socket.connected || socket.active)) {
    return socket;
  }

  // Disconnect stale socket if it exists
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  console.log('🎮 [Elimination] Creating new socket connection to:', serverUrl);

  socket = io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket'],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    // Don't auto-connect — we control when events are emitted
    autoConnect: true,
  });

  socket.on('connect', () =>
    console.log('🎮 [Elimination] Socket connected:', socket?.id),
  );
  socket.on('disconnect', (reason) =>
    console.warn('🎮 [Elimination] Socket disconnected:', reason),
  );
  socket.on('connect_error', (err) =>
    console.error('🎮 [Elimination] Socket error:', err.message),
  );

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

// ─── Emitters ─────────────────────────────────────────────────────────────────

export const emitJoinRoom = (roomId: string, name: string, playerId?: string): void => {
  getSocket().emit('join_elimination_room', { roomId, name, playerId });
};

export const emitStartGame = (roomId: string, hostId: string): void => {
  getSocket().emit('start_elimination_game', { roomId, hostId });
};

export const emitSubmitAnswer = (
  roomId: string,
  playerId: string,
  submission: object,
): void => {
  getSocket().emit('submit_round_answer', { roomId, playerId, submission });
};

export const emitLeaveRoom = (roomId: string, playerId: string): void => {
  getSocket().emit('leave_elimination_room', { roomId, playerId });
};

export const emitReconnect = (roomId: string, playerId: string): void => {
  getSocket().emit('reconnect_elimination_player', { roomId, playerId });
};

export const emitHostJoin = (roomId: string, hostId: string): void => {
  getSocket().emit('host_join_elimination_room', { roomId, hostId });
};