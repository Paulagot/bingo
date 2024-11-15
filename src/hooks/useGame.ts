import { useState, useCallback, useEffect } from 'react';
import { generateBingoCard, checkWin } from '../utils/gameLogic';
import type { GameState } from '../types/game';
import { useGameStore } from '../store/gameStore';

export function useGame(socket: any, roomId: string) {
  const [gameState, setGameState] = useState<GameState>(() => {
    const numbers = generateBingoCard();
    return {
      card: numbers.map((number) => ({ number, marked: false })),
      calledNumbers: [],
      currentNumber: null,
      hasWon: false,
    };
  });

  const { 
    autoPlay, 
    setAutoPlay,
    calledNumbers: storeCalledNumbers,
    currentNumber: storeCurrentNumber,
  } = useGameStore();

  // Sync game state with store
  useEffect(() => {
    setGameState(prev => ({
      ...prev,
      calledNumbers: storeCalledNumbers,
      currentNumber: storeCurrentNumber,
    }));
  }, [storeCalledNumbers, storeCurrentNumber]);

  useEffect(() => {
    if (socket && gameState.card) {
      socket.emit('update_card', { roomId, card: gameState.card });
    }
  }, [socket, gameState.card, roomId]);

  const handleCellClick = useCallback((index: number) => {
    if (gameState.hasWon) return;

    setGameState((prev) => {
      if (!prev.calledNumbers.includes(prev.card[index].number)) return prev;

      const newCard = [...prev.card];
      newCard[index] = { ...newCard[index], marked: !newCard[index].marked };
      const hasWon = checkWin(newCard);

      return {
        ...prev,
        card: newCard,
        hasWon,
      };
    });
  }, [gameState.hasWon]);

  const callNumber = useCallback(() => {
    if (socket) {
      socket.emit('call_number', { roomId });
    }
  }, [socket, roomId]);

  const startNewGame = useCallback(() => {
    if (socket) {
      socket.emit('new_game', { roomId });
      const numbers = generateBingoCard();
      setGameState({
        card: numbers.map((number) => ({ number, marked: false })),
        calledNumbers: [],
        currentNumber: null,
        hasWon: false,
      });
    }
  }, [socket, roomId]);

  const toggleAutoPlay = useCallback(() => {
    if (socket) {
      socket.emit('toggle_auto_play', { roomId });
    }
  }, [socket, roomId]);

  return {
    gameState,
    autoPlay,
    handleCellClick,
    callNumber,
    startNewGame,
    toggleAutoPlay,
  };
}