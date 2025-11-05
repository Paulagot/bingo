// src/components/Quiz/completion/LeaderboardScreen.tsx
import React from 'react';
import { Crown, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '../../types/quiz';

interface LeaderboardScreenProps {
  leaderboard: LeaderboardEntry[];
  playerId: string;
}

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ leaderboard, playerId }) => (
  <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4 md:p-8">
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">🏆 Final Leaderboard</h2>
        <p className="text-lg text-gray-300 md:text-xl">How everyone performed</p>
      </div>
      
      <div className="space-y-4">
        {leaderboard.map((player, index) => (
          <div
            key={player.id}
            className={`rounded-xl p-4 transition-all duration-500 md:p-6 ${
              player.id === playerId 
                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-xl ring-4 ring-yellow-300' 
                : 'bg-white/10 text-white backdrop-blur'
            } ${index < 3 ? 'shadow-2xl' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold md:h-12 md:w-12 ${
                  index === 0 ? 'bg-yellow-500 text-black' :
                  index === 1 ? 'bg-gray-400 text-black' :
                  index === 2 ? 'bg-orange-600 text-white' :
                  'bg-gray-600 text-white'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{player.name}</h3>
                  {player.id === playerId && <span className="text-sm opacity-80">(You)</span>}
                </div>
                {index === 0 && <Crown className="h-6 w-6 text-yellow-400 md:h-8 md:w-8" />}
                {index === 1 && <Medal className="h-6 w-6 text-gray-400 md:h-8 md:w-8" />}
                {index === 2 && <Award className="h-6 w-6 text-orange-400 md:h-8 md:w-8" />}
              </div>
              <div className="text-right">
                <div className="text-xl font-bold md:text-2xl">{player.score}</div>
                <div className="text-sm opacity-80">points</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);