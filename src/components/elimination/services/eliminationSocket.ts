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

 const serverUrl = import.meta.env.PROD
  ? window.location.origin
  : import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  console.log('🎮 [Elimination] Creating new socket connection to:', serverUrl);

  socket = io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'], // polling fallback for flaky mobile
    reconnectionAttempts: 20,             // more attempts for mobile interruptions
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  // When phone comes back from background (Snapchat, WhatsApp, phone call),
  // the page becomes visible again — force socket reconnect if disconnected
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && socket && !socket.connected) {
      console.log('🎮 [Elimination] Page visible again — reconnecting socket');
      socket.connect();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  socket.on('connect', () => {
    console.log('🎮 [Elimination] Socket connected:', socket?.id);
    // On reconnect, re-announce ourselves to the server so it updates our socket.id
    // This covers: Snapchat/WhatsApp interruptions, phone calls, tab switches
    const roomId = sessionStorage.getItem('elim_room_id');
    const playerId = sessionStorage.getItem('elim_player_id');
    const hostId = sessionStorage.getItem('elim_host_id');
    const isHost = sessionStorage.getItem('elim_is_host') === 'true';

    if (roomId && isHost && hostId) {
      console.log('🎮 [Elimination] Re-announcing host after reconnect');
      socket?.emit('host_join_elimination_room', { roomId, hostId });
    } else if (roomId && playerId) {
      console.log('🎮 [Elimination] Re-announcing player after reconnect');
      socket?.emit('reconnect_elimination_player', { roomId, playerId });
    }
  });
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

export const emitJoinRoom = (
  roomId: string,
  name: string,
  playerId?: string,
  txSignature?: string,   // ← add this
): void => {
  getSocket().emit('join_elimination_room', { roomId, name, playerId, txSignature });
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