import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

export function useSocket(roomId: string) {
  const {
    setSocket,
    socket,
    playerName,
    updateRoomState,
    setWinnerId,
    setHasWon,
    setCurrentNumber,
    setCalledNumbers,
    setAutoPlay,
  } = useGameStore();

  useEffect(() => {
    if (!playerName) return;

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      newSocket.emit('join_room', { roomId, playerName });
    });

    newSocket.on('room_update', (roomState) => {
      console.log('Room update received:', roomState);
      updateRoomState(roomState);
    });

    newSocket.on('number_called', ({ currentNumber, calledNumbers }) => {
      console.log('Number called:', currentNumber);
      setCurrentNumber(currentNumber);
      setCalledNumbers(calledNumbers);
    });

    newSocket.on('auto_play_update', ({ autoPlay }) => {
      setAutoPlay(autoPlay);
    });

    newSocket.on('game_won', ({ winnerId, playerName }) => {
      console.log(`Game won by ${playerName}`);
      setWinnerId(winnerId);
      setHasWon(true);
    });

    newSocket.on('game_reset', () => {
      console.log('Game reset');
      updateRoomState({
        players: [],
        gameStarted: false,
        currentNumber: null,
        calledNumbers: [],
        autoPlay: false,
        winnerId: null
      });
      setHasWon(false);
    });

    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, [roomId, playerName]);

  return socket;
}