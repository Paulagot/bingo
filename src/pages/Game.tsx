import React, { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ArrowLeft } from 'lucide-react';
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
    callNumber,
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

  const handleReturnToLanding = useCallback(() => {
    if (window.confirm('Are you sure you want to leave the game?')) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (gameState.hasWon) {
      socket?.emit('player_won', { roomId });
    }
  }, [gameState.hasWon, roomId, socket]);

  if (!playerName) {
    return null;
  }

  return (
    <div className="p-8">
      <AnimatePresence>
        {showAccessError && (
          <GameAccessAlert
            message={accessErrorMessage}
            onClose={() => setShowAccessError(false)}
          />
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleReturnToLanding}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
            >
              <ArrowLeft size={20} />
              Return to Landing
            </motion.button>
            <h1 className="text-4xl font-bold text-blue-900">
              Bingo Game
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-blue-100 rounded-lg">
              <span className="text-blue-800 font-medium">Room: {roomId}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
              <Users size={20} className="text-green-600" />
              <span className="text-green-800 font-medium">
                {isSinglePlayer ? 'Solo Mode' : `${players.length} Players`}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {!gameStarted ? (
              <div className="flex items-center justify-center h-48 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl text-gray-600 font-medium">
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
                    onCallNumber={callNumber}
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