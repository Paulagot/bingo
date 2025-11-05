// src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

// Resolve base URL: same-origin in prod, env in dev
function resolveSocketBase(): string | undefined {
  if (import.meta.env.PROD) return undefined; // same-origin (works for .ie and .co.uk)
  const base = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
  return base.replace(/\/+$/, ''); // trim trailing slash
}

// Singleton socket
let _socketInstance: Socket | null = null;
function getSocket(): Socket {
  if (_socketInstance) return _socketInstance;

  const base = resolveSocketBase();
  // NOTE: no namespace here — this hook uses the default namespace
  _socketInstance = io(base, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: false, // same-origin in prod; not needed
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: false,     // you connect() explicitly in the effect
    timeout: 20000,
    ...(import.meta.env.PROD ? {} : { forceNew: true }), // dev: avoid sharing managers across tests
  });

  return _socketInstance;
}

export function useSocket(roomId: string) {
  const {
    setSocket,
    playerName,
    setPlayers,
    setGameStarted,
    setCurrentNumber,
    setCalledNumbers,
    setAutoPlay,
    setJoinError,
    setLineWinners,
    setFullHouseWinners,
    setIsPaused,
    setLineWinClaimed,
    setPaymentsFinalized,
  } = useGameStore();

  const socketRef = useRef<Socket | null>(getSocket());
  const roomCreatedRef = useRef(false);
  const hasRejoinedRef = useRef(false);

  useEffect(() => {
    console.log('[useSocket] 🚀 useEffect', { roomId, playerName });

    if (!playerName) {
      console.warn('[useSocket] 🚫 No player name set, skipping socket connection');
      return;
    }

    const roomCreationString = localStorage.getItem('roomCreation');
    const roomJoiningString = localStorage.getItem('roomJoining');

    let roomCreationData: any = null;
    let roomJoiningData: any = null;

    try {
      if (roomCreationString) roomCreationData = JSON.parse(roomCreationString);
      if (roomJoiningString) roomJoiningData = JSON.parse(roomJoiningString);
    } catch (e) {
      console.error('[useSocket] ❌ Error parsing localStorage data', e);
      localStorage.removeItem('roomCreation');
      localStorage.removeItem('roomJoining');
      return;
    }

    const sock = socketRef.current!;
    if (!sock.connected) {
      console.log('[useSocket] 📡 Connecting socket');
      sock.connect();
    }
    setSocket(sock);

    // ---- connection lifecycle ----
    const onConnect = () => {
      console.log('[Socket] ✅ Connected', { socketId: sock.id });

      const storedRoomId = localStorage.getItem('roomId');
      const storedPlayerName = localStorage.getItem('playerName');
      const storedWalletAddress =
        localStorage.getItem('walletAddress') ||
        roomCreationData?.walletAddress ||
        roomJoiningData?.walletAddress ||
        null;

      // Create Room
      if (roomCreationData && roomCreationData.roomId === roomId && !roomCreatedRef.current) {
        if (roomCreationData.contractAddress && roomCreationData.walletAddress && roomCreationData.chain) {
          const createRoomData = {
            roomId,
            playerName,
            contractAddress: roomCreationData.contractAddress,
            walletAddress: roomCreationData.walletAddress,
            chainId: roomCreationData.chain,
            namespace: roomCreationData.namespace || 'eip155',
            entryFee: roomCreationData.entryFee || '0',
          };
          console.log('[Socket] 🧩 create_room', createRoomData);
          sock.emit('create_room', createRoomData);
          localStorage.setItem('roomId', roomId);
          localStorage.setItem('playerName', playerName);
          localStorage.setItem('contractAddress', roomCreationData.contractAddress);
          localStorage.setItem('walletAddress', roomCreationData.walletAddress);
          roomCreatedRef.current = true;
        } else {
          console.error('[Socket] ❌ Invalid roomCreationData fields', roomCreationData);
        }
      }
      // Join Room
      else if (roomJoiningData && roomJoiningData.roomId === roomId && !hasRejoinedRef.current) {
        console.log('[Socket] 🙋 join_room', { roomId, playerName, walletAddress: roomJoiningData.walletAddress });
        sock.emit('join_room', { roomId, playerName, walletAddress: roomJoiningData.walletAddress });
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('playerName', playerName);
        localStorage.setItem('walletAddress', roomJoiningData.walletAddress);
        localStorage.removeItem('roomJoining');
        hasRejoinedRef.current = true;
      }
      // Rejoin Room
      else if (!roomCreationData && !roomJoiningData && storedRoomId && storedPlayerName && !hasRejoinedRef.current) {
        console.log('[Socket] 🔁 rejoin_room', {
          roomId: storedRoomId,
          playerName: storedPlayerName,
          walletAddress: storedWalletAddress,
        });
        sock.emit('rejoin_room', {
          roomId: storedRoomId,
          playerName: storedPlayerName,
          walletAddress: storedWalletAddress,
        });
        hasRejoinedRef.current = true;
      } else {
        console.warn('[Socket] 🚫 No valid create/join/rejoin data', { roomId });
      }
    };

    const onDisconnect = (reason: string) => {
      console.error('[Socket] 🚫 Disconnected', { reason, roomId, playerName, socketId: sock.id });
    };

    const onConnectError = (error: any) => {
      console.error('[Socket] ❌ connect_error', error);
      setJoinError('Failed to connect to the server. Please try again later.');
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('connect_error', onConnectError);

    // ---- game events ----
    const onRoomUpdate = (roomState: any) => {
      console.log('[Socket] 📦 room_update', roomState);

      if (Array.isArray(roomState.players)) {
        setPlayers(roomState.players);
      } else if (roomState.players && typeof roomState.players === 'object') {
        try {
          const arr =
            typeof roomState.players.values === 'function'
              ? Array.from(roomState.players.values())
              : Object.values(roomState.players);
          setPlayers(arr);
        } catch (e) {
          console.error('[Socket] ❌ players convert error', e);
          setPlayers([]);
        }
      } else {
        setPlayers([]);
      }

      setGameStarted(!!roomState.gameStarted);
      setCurrentNumber(roomState.currentNumber ?? null);
      setCalledNumbers(roomState.calledNumbers ?? []);
      setAutoPlay(!!roomState.autoPlay);
      setLineWinners(roomState.lineWinners ?? []);
      setFullHouseWinners(roomState.fullHouseWinners ?? []);
      setIsPaused(!!roomState.isPaused);
      setLineWinClaimed(!!roomState.lineWinClaimed);

      if (roomState.paymentsFinalized) {
        setPaymentsFinalized(true);
        const rid = localStorage.getItem('roomId');
        if (rid) localStorage.setItem(`payment_finalized_${rid}`, 'true');
      }
    };

    const onResync = (resyncData: any) => {
      console.log('[Socket] 🔄 resync_state', resyncData);
      if (Array.isArray(resyncData.players)) setPlayers(resyncData.players);
      setGameStarted(!!resyncData.gameStarted);
      setCurrentNumber(resyncData.currentNumber ?? null);
      setCalledNumbers(resyncData.calledNumbers ?? []);
      setAutoPlay(!!resyncData.autoPlay);
      setLineWinners(resyncData.lineWinners ?? []);
      setFullHouseWinners(resyncData.fullHouseWinners ?? []);
      setIsPaused(!!resyncData.isPaused);
      setLineWinClaimed(!!resyncData.lineWinClaimed);
      if (resyncData.paymentsFinalized) {
        setPaymentsFinalized(true);
        localStorage.setItem(`payment_finalized_${roomId}`, 'true');
      }
    };

    const onPaymentsFinalized = (data: any) => {
      console.log('[Socket] 💰 payments_finalized', data);
      setPaymentsFinalized(true);
      const rid = localStorage.getItem('roomId');
      if (rid) localStorage.setItem(`payment_finalized_${rid}`, 'true');
    };

    const onJoinError = ({ message }: { message: string }) => {
      console.error('[Socket] ❌ join_error', { message });
      setJoinError(message);
      if (message.includes('Room not found')) {
        localStorage.removeItem('roomId');
        localStorage.removeItem('roomCreation');
        localStorage.removeItem('roomJoining');
      }
    };

    const onCreateError = ({ message }: { message: string }) => {
      console.error('[Socket] ❌ create_error', { message });
      setJoinError(message);
      if (message.includes('already exists')) {
        localStorage.removeItem('roomCreation');
      }
    };

    sock.on('room_update', onRoomUpdate);
    sock.on('resync_state', onResync);
    sock.on('payments_finalized', onPaymentsFinalized);
    sock.on('join_error', onJoinError);
    sock.on('create_error', onCreateError);

    return () => {
      console.log('[useSocket] 💨 cleanup (keeping socket alive for auto-reconnect)', { socketId: sock.id });
      // do NOT disconnect; you want auto-reconnect
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('connect_error', onConnectError);
      sock.off('room_update', onRoomUpdate);
      sock.off('resync_state', onResync);
      sock.off('payments_finalized', onPaymentsFinalized);
      sock.off('join_error', onJoinError);
      sock.off('create_error', onCreateError);
      hasRejoinedRef.current = false;
    };
  }, [roomId, playerName]);

  return socketRef.current!;
}
