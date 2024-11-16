import React from 'react';
import { Crown, User, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Player } from '../types/game';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  onToggleReady?: () => void;
  onStartGame?: () => void;
  gameStarted: boolean;
}

export function PlayerList({ 
  players, 
  currentPlayerId, 
  onToggleReady,
  onStartGame,
  gameStarted 
}: PlayerListProps) {
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const allPlayersReady = players.every(p => p.isReady);
  const readyCount = players.filter(p => p.isReady).length;
  const isSinglePlayer = players.length === 1;

  return (
    <div className="bg-white rounded-lg shadow-xl p-3 sm:p-4">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Players</h2>
        <span className="text-sm text-gray-600">
          {readyCount}/{players.length} Ready
        </span>
      </div>

      <div className="space-y-2 mb-3 sm:mb-4">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-2 sm:p-3 rounded-lg ${
              player.id === currentPlayerId ? 'bg-blue-50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {player.isHost ? (
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              ) : (
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              )}
              <span className="text-sm sm:text-base font-medium text-gray-700">
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </span>
            </div>
            {player.isReady ? (
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            ) : (
              <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
            )}
          </motion.div>
        ))}
      </div>

      {!gameStarted && (
        <div className="space-y-2">
          {currentPlayer && !currentPlayer.isHost && !isSinglePlayer && (
            <button
              onClick={onToggleReady}
              className={`w-full py-2 px-3 sm:px-4 rounded-lg text-sm sm:text-base font-medium transition ${
                currentPlayer.isReady
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {currentPlayer.isReady ? 'Cancel Ready' : 'Ready Up'}
            </button>
          )}

          {currentPlayer?.isHost && (
            <button
              onClick={onStartGame}
              disabled={!isSinglePlayer && !allPlayersReady}
              className="w-full py-2 px-3 sm:px-4 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSinglePlayer ? 'Start Solo Game' : 'Start Game'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}