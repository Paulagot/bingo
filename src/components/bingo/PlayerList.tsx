import { Crown, User, CheckCircle2, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Player } from './types/game';

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
  const isSinglePlayer = players.length === 1; // <-- We need this!

  return (
    <div className="bg-muted rounded-2xl p-5 shadow-xl sm:p-6">
      <div className="mb-4 flex items-center justify-between sm:mb-5">
        <h2 className="bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
          Players
        </h2>
        <div className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-1">
          <span className="text-sm font-medium text-indigo-800">
            {readyCount}/{players.length} Ready
          </span>
        </div>
      </div>

      <div className="mb-5 max-h-64 space-y-2 overflow-y-auto pr-1 sm:mb-6">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between rounded-xl p-3 ${
              player.id === currentPlayerId ? 'border border-indigo-100 bg-indigo-50' : 'bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {player.isHost ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100">
                  <Crown className="h-4 w-4 text-yellow-600 sm:h-5 sm:w-5" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                  <User className="text-fg/70 h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              )}
              <span className="text-fg text-sm font-medium sm:text-base">
                {player.name}
                {player.id === currentPlayerId && ' (You)'}
              </span>
            </div>

            {player.isReady ? (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-green-500 sm:h-5 sm:w-5" />
                <span className="text-xs font-medium text-green-600">Ready</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <Circle className="h-4 w-4 text-gray-300 sm:h-5 sm:w-5" />
                <span className="text-xs text-gray-400">Waiting</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {!gameStarted && (
        <div className="space-y-3">
          {/* Players who are NOT host can ready up */}
          {currentPlayer && !currentPlayer.isHost && (
            <button
              type="button"
              onClick={onToggleReady}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium shadow-md transition-all sm:text-base ${
                currentPlayer.isReady
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-gradient-to-r from-green-600 to-teal-600 text-white hover:from-green-700 hover:to-teal-700'
              }`}
            >
              {currentPlayer.isReady ? 'Cancel Ready' : 'Ready Up'}
            </button>
          )}

          {/* Host can start the game if not solo and all ready */}
          {currentPlayer?.isHost && (
            <button
              type="button"
              onClick={onStartGame}
              disabled={isSinglePlayer || !allPlayersReady}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-md
                         transition-all hover:from-indigo-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:text-base"
            >
              Start Game
            </button>
          )}
        </div>
      )}
    </div>
  );
}

