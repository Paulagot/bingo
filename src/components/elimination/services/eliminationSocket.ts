import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  // ✅ Return existing socket if it exists at all — even if temporarily disconnected.
  // Socket.IO will buffer emits and send them once reconnected.
  // Only create a new socket if we have none at all.
  if (socket) {
    return socket;
  }

  const serverUrl = import.meta.env.PROD
    ? window.location.origin
    : import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

  console.log('🎮 [Elimination] Creating new socket connection to:', serverUrl);

  socket = io(serverUrl, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    autoConnect: true,
  });

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && socket && !socket.connected) {
      console.log('🎮 [Elimination] Page visible again — reconnecting socket');
      socket.connect();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  socket.on('connect', () => {
    console.log('🎮 [Elimination] Socket connected:', socket?.id);
    const roomId   = sessionStorage.getItem('elim_room_id');
    const playerId = sessionStorage.getItem('elim_player_id');
    const hostId   = sessionStorage.getItem('elim_host_id');
    const isHost   = sessionStorage.getItem('elim_is_host') === 'true';

    if (roomId && isHost && hostId) {
      console.log('🎮 [Elimination] Re-announcing host after reconnect');
      socket?.emit('host_join_elimination_room', { roomId, hostId });
    } else if (roomId && playerId) {
      console.log('🎮 [Elimination] Re-announcing player after reconnect');
      socket?.emit('reconnect_elimination_player', { roomId, playerId });
    }
  });

  socket.on('disconnect', (reason) =>
    console.warn('🎮 [Elimination] Socket disconnected:', reason)
  );
  socket.on('connect_error', (err) =>
    console.error('🎮 [Elimination] Socket error:', err.message)
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

/**
 * Emit join room — waits for socket to be connected before emitting.
 * This prevents the race where a payment completes during a brief socket
 * reconnect and the emit gets sent with a corrupted/buffered state.
 */
export const emitJoinRoom = (
  roomId: string,
  name: string,
  playerId?: string,
  txSignature?: string,
  walletAddress?: string,
): void => {
  const s = getSocket();

  const payload = {
    roomId,
    name,
    playerId,
    txSignature,
    isWeb3:        !!txSignature && txSignature !== 'already-joined',
    walletAddress: walletAddress ?? null,
  };

  if (s.connected) {
    s.emit('join_elimination_room', payload);
    return;
  }

  // Socket exists but is mid-reconnect — wait for it rather than buffering
  console.log('🎮 [Elimination] Socket reconnecting — queuing join emit');
  const onConnect = () => {
    clearTimeout(timeout);
    console.log('🎮 [Elimination] Socket reconnected — emitting join now');
    s.emit('join_elimination_room', payload);
  };

  // Safety: if socket never reconnects within 15s, don't silently hang
  const timeout = setTimeout(() => {
    s.off('connect', onConnect);
    console.error('🎮 [Elimination] Socket failed to reconnect for join emit');
    // The component listening for elimination_error will show the user a message
    s.emit('elimination_error', { message: 'Connection lost during join. Please refresh.' });
  }, 15_000);

  s.once('connect', onConnect);
};

// ── Rest of emitters unchanged ────────────────────────────────────────────────

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

export const emitStartPress = (
  roomId: string,
  playerId: string,
  roundId: string,
): void => {
  getSocket().emit('submit_time_estimation_start', { roomId, playerId, roundId });
};