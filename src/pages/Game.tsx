import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BingoCard } from '../components/BingoCard';
import { NumberCaller } from '../components/NumberCaller';
import { GameControls } from '../components/GameControls';
import { PlayerList } from '../components/PlayerList';
import { WinEffects } from '../components/WinEffects';
import { GameAccessAlert } from '../components/GameAccessAlert';
import { useGame } from '../hooks/useGame';
import { useSocket } from '../hooks/useSocket';
import { useGameStore } from '../store/gameStore';

export function Game() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const [showAccessError, setShowAccessError] = useState(false);
  const [accessErrorMessage, setAccessErrorMessage] = useState('');
  const socket = useSocket(roomId);
  const {
    gameState,
    autoPlay,
    handleCellClick,
    toggleAutoPlay,
  } = useGame(socket, roomId);

  const { 
    players, 
    playerName, 
    winnerId,
    gameStarted
  } = useGameStore();

  const currentPlayer = players.find(p => p.name === playerName);
  const isHost = currentPlayer?.isHost || false;
  const winnerName = players.find(p => p.id === winnerId)?.name || '';
  const isSinglePlayer = players.length === 1;

  useEffect(() => {
    if (!playerName) {
      const timer = setTimeout(() => {
        setAccessErrorMessage('Please go to the landing page first to enter your name.');
        setShowAccessError(true);
        navigate('/');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [playerName, navigate]);

  useEffect(() => {
    const handleJoinError = ({ message }: { message: string }) => {
      setAccessErrorMessage(message);
      setShowAccessError(true);
      setTimeout(() => navigate('/'), 3000);
    };

    socket?.on('join_error', handleJoinError);
    return () => {
      socket?.off('join_error', handleJoinError);
    };
  }, [socket, navigate]);

  const handleToggleReady = useCallback(() => {
    socket?.emit('toggle_ready', { roomId });
  }, [socket, roomId]);

  const handleStartGame = useCallback(() => {
    socket?.emit('start_game', { roomId });
  }, [socket, roomId]);

  useEffect(() => {
    if (gameState.hasWon) {
      socket?.emit('player_won', { roomId });
    }
  }, [gameState.hasWon, roomId, socket]);

  if (!playerName) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
      <AnimatePresence>
        {showAccessError && (
          <GameAccessAlert
            message={accessErrorMessage}
            onClose={() => setShowAccessError(false)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {!gameStarted ? (
              <div className="flex items-center justify-center h-32 sm:h-48 bg-white rounded-lg shadow-md">
                <h2 className="text-xl sm:text-2xl text-gray-600 font-medium px-4 text-center">
                  {isSinglePlayer 
                    ? "Ready to play solo! Click 'Start Solo Game' to begin."
                    : "Waiting for players to ready up..."}
                </h2>
              </div>
            ) : (
              <>
                <NumberCaller
                  currentNumber={gameState.currentNumber}
                  calledNumbers={gameState.calledNumbers}
                  autoPlay={autoPlay}
                />

                <AnimatePresence>
                  {winnerId && (
                    <WinEffects
                      isWinner={winnerId === socket?.id}
                      winnerName={winnerName}
                    />
                  )}
                </AnimatePresence>
                
                <BingoCard
                  cells={gameState.card}
                  onCellClick={handleCellClick}
                />

                {isHost && (
                  <GameControls
                    onToggleAutoPlay={toggleAutoPlay}
                    hasWon={!!winnerId}
                    autoPlay={autoPlay}
                  />
                )}
              </>
            )}
          </div>

          <div className="lg:col-span-1">
            <PlayerList
              players={players}
              currentPlayerId={socket?.id}
              onToggleReady={handleToggleReady}
              onStartGame={handleStartGame}
              gameStarted={gameStarted}
            />
          </div>
        </div>
      </div>
    </div>
  );
}