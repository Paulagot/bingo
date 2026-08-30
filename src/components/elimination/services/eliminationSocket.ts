import { io, Socket } from 'socket.io-client';
 
let socket: Socket | null = null;
let lastHostJoinKey: string | null = null;

const announceHostOnce = (
  s: Socket,
  roomId: string,
  hostId: string,
): void => {
  // Only ever announce over a real connected socket.
  if (!s.connected || !s.id) {
    return;
  }

  const key = `${s.id}:${roomId}:${hostId}`;

  if (lastHostJoinKey === key) {
    // console.log('🎮 [Elimination] Skipping duplicate host join', {
    //   roomId,
    //   hostId,
    //   socketId: s.id,
    // });
    return;
  }

  lastHostJoinKey = key;

  // console.log('🎮 [Elimination] Announcing host', {
  //   roomId,
  //   hostId,
  //   socketId: s.id,
  // });

  s.emit('host_join_elimination_room', { roomId, hostId });
};

let lastPlayerReconnectKey: string | null = null;

const announcePlayerReconnectOnce = (
  s: Socket,
  roomId: string,
  playerId: string,
): void => {
  if (!s.connected || !s.id) return;

  const key = `${s.id}:${roomId}:${playerId}`;

  if (lastPlayerReconnectKey === key) {
    // console.log('🎮 [Elimination] Skipping duplicate player reconnect', {
    //   roomId,
    //   playerId,
    //   socketId: s.id,
    // });
    return;
  }

  lastPlayerReconnectKey = key;

  // console.log('🎮 [Elimination] Reconnecting player', {
  //   roomId,
  //   playerId,
  //   socketId: s.id,
  // });

  s.emit('reconnect_elimination_player', {
    roomId,
    playerId,
  });
};
 
export const getSocket = (): Socket => {
  // Return existing socket if it exists at all - even if temporarily disconnected.
  // Socket.IO will buffer emits and send them once reconnected.
  if (socket) {
    return socket;
  }
 
  const serverUrl = import.meta.env.PROD
    ? window.location.origin
    : import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
 
  // console.log('🎮 [Elimination] Creating new socket connection to:', serverUrl);
 
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
      // console.log('🎮 [Elimination] Page visible again - reconnecting socket');
      socket.connect();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
 
socket.on('connect', () => {
  // console.log('🎮 [Elimination] Socket connected:', socket?.id);

  const roomId   = sessionStorage.getItem('elim_room_id');
  const playerId = sessionStorage.getItem('elim_player_id');
  const hostId   = sessionStorage.getItem('elim_host_id');
  const isHost   = sessionStorage.getItem('elim_is_host') === 'true';

  if (roomId && isHost && hostId && socket) {
    // console.log('🎮 [Elimination] Re-announcing host after reconnect');
    announceHostOnce(socket, roomId, hostId);
} else if (roomId && playerId && socket) {
  // console.log('🎮 [Elimination] Re-announcing player after reconnect');

  announcePlayerReconnectOnce(
    socket,
    roomId,
    playerId,
  );
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
lastPlayerReconnectKey = null;
  lastHostJoinKey = null;
};
 
// ─── Emitters ─────────────────────────────────────────────────────────────────
 
/**
 * Web2 payment fields - all optional, only sent for rooms with an entry fee.
 */
export interface Web2PaymentFields {
  /** True only after Stripe webhook confirmation (join-success page). */
  paid?: boolean;
  /** True when player self-reports payment (Revolut, bank transfer, etc.). */
  paymentClaimed?: boolean;
  /** True for cash / card-tap / pay-host-directly flows. */
  payAtDoor?: boolean;
  /** 'instant_payment' | 'stripe' | 'crypto' | 'pay_admin' */
  paymentMethod?: string;
  /** e.g. 'ELIM-ABC123' - generated client-side for manual payment flows. */
  paymentReference?: string;
  /** FK to fundraisely_club_payment_methods.id */
  clubPaymentMethodId?: string | number | null;
  joinToken?: string | null; 
}
 
/**
 * Emit join room - waits for socket to be connected before emitting.
 * This prevents the race where a payment completes during a brief socket
 * reconnect and the emit gets sent with a corrupted/buffered state.
 *
 * @param roomId          - the room to join
 * @param name            - player display name
 * @param playerId        - only set for reconnect flows
 * @param txSignature     - web3 only: Solana tx signature
 * @param walletAddress   - web3 only: player's wallet public key
 * @param web2Payment     - web2 only: payment status fields
 */
export const emitJoinRoom = (
  roomId: string,
  name: string,
  playerId?: string,
  txSignature?: string,
  walletAddress?: string,
  web2Payment?: Web2PaymentFields,
): void => {
  const s = getSocket();
 
  const payload = {
    roomId,
    name,
    playerId,
    // ── web3 ──
    txSignature,
    isWeb3:       !!txSignature && txSignature !== 'already-joined',
    walletAddress: walletAddress ?? null,
    // ── web2 payment ──
    paid:                web2Payment?.paid              ?? false,
    paymentClaimed:      web2Payment?.paymentClaimed    ?? false,
    payAtDoor:           web2Payment?.payAtDoor         ?? false,
    paymentMethod:       web2Payment?.paymentMethod     ?? null,
    paymentReference:    web2Payment?.paymentReference  ?? null,
    clubPaymentMethodId: web2Payment?.clubPaymentMethodId ?? null,
     joinToken:           web2Payment?.joinToken         ?? null, 
  };
 
  if (s.connected) {
    s.emit('join_elimination_room', payload);
    return;
  }
 
  // Socket exists but is mid-reconnect - wait for it rather than buffering
  // console.log('🎮 [Elimination] Socket reconnecting - queuing join emit');
  const onConnect = () => {
    clearTimeout(timeout);
    // console.log('🎮 [Elimination] Socket reconnected - emitting join now');
    s.emit('join_elimination_room', payload);
  };
 
  const timeout = setTimeout(() => {
    s.off('connect', onConnect);
    console.error('🎮 [Elimination] Socket failed to reconnect for join emit');
    s.emit('elimination_error', { message: 'Connection lost during join. Please refresh.' });
  }, 15_000);
 
  s.once('connect', onConnect);
};
 
// ── Rest of emitters ──────────────────────────────────────────────────────────
 
export const emitStartGame = (roomId: string, hostId: string): void => {
  const s = getSocket();

  // console.log('🔥 START GAME EMIT', {
  //   roomId,
  //   hostId,
  //   socketId: s.id,
  //   connected: s.connected,
  // });

  s.emit('start_elimination_game', { roomId, hostId });
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
 
export const emitReconnect = (
  roomId: string,
  playerId: string,
): void => {
  const s = getSocket();

  if (s.connected) {
    announcePlayerReconnectOnce(s, roomId, playerId);
    return;
  }

  // Don't buffer it. The socket connect handler will restore
  // the player once the connection exists.
  // console.log('🎮 [Elimination] Player reconnect waiting for socket', {
  //   roomId,
  //   playerId,
  // });
};
 
export const emitHostJoin = (roomId: string, hostId: string): void => {
  const s = getSocket();

  // If already connected, announce now.
  if (s.connected) {
    announceHostOnce(s, roomId, hostId);
    return;
  }

  // Do NOT emit while disconnected.
  // Socket.IO would buffer it, and the main `connect` handler below
  // will already announce the host once the connection succeeds.
  // console.log(
  //   '🎮 [Elimination] Host join waiting for socket connection',
  //   {
  //     roomId,
  //     hostId,
  //   }
  // );
};
 
export const emitStartPress = (
  roomId: string,
  playerId: string,
  roundId: string,
): void => {
  getSocket().emit('submit_time_estimation_start', { roomId, playerId, roundId });
};