// src/components/Quiz/host-controls/RoundStatsDisplay.tsx
import React from 'react';
import { TrendingUp, Target, Shield, Coins } from 'lucide-react';

export interface RoundStats {
  roundNumber: number;
  hintsUsed: number;
  freezesUsed: number;
  pointsRobbed: number;
  pointsRestored: number;
  extrasByPlayer: Record<string, { extraId: string; target?: string; timestamp: number }[]>;
  questionsWithExtras: number; // How many questions had extras used
  totalExtrasUsed: number;
}

interface RoundStatsDisplayProps {
  roundStats: RoundStats;
  isVisible?: boolean;
}

const RoundStatsDisplay: React.FC<RoundStatsDisplayProps> = ({ 
  roundStats, 
  isVisible = true 
}) => {
  if (!isVisible || !roundStats) {
    return null;
  }

  const { 
    roundNumber, 
    hintsUsed, 
    freezesUsed, 
    pointsRobbed, 
    pointsRestored, 
    extrasByPlayer,
    totalExtrasUsed 
  } = roundStats;

  // Calculate insights
  const playerCount = Object.keys(extrasByPlayer).length;
  const mostActivePlayer = Object.entries(extrasByPlayer)
    .sort(([,a], [,b]) => b.length - a.length)[0];
  
  const mostActivePlayerName = mostActivePlayer?.[0] || 'None';
  const mostActivePlayerCount = mostActivePlayer?.[1]?.length || 0;

  // Calculate most targeted player (who was frozen/robbed the most)
  const targetCounts: Record<string, number> = {};
  Object.values(extrasByPlayer).flat().forEach(extra => {
    if (extra.target) {
      targetCounts[extra.target] = (targetCounts[extra.target] || 0) + 1;
    }
  });
  
  const mostTargeted = Object.entries(targetCounts)
    .sort(([,a], [,b]) => b - a)[0];
  const mostTargetedName = mostTargeted?.[0] || 'None';
  const mostTargetedCount = mostTargeted?.[1] || 0;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl shadow-lg border border-indigo-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xl font-bold text-indigo-800 flex items-center space-x-2">
          <TrendingUp className="w-6 h-6" />
          <span>Round {roundNumber} Strategy Summary</span>
        </h4>
        <div className="text-sm text-indigo-600 bg-white/70 px-3 py-1 rounded-full">
          {totalExtrasUsed} total extras used
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="text-center bg-white/70 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🧪</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">{hintsUsed}</div>
          <div className="text-sm text-gray-600 font-medium">Hints Used</div>
        </div>

        <div className="text-center bg-white/70 rounded-lg p-4 border border-red-200">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-red-600">{freezesUsed}</div>
          <div className="text-sm text-gray-600 font-medium">Freezes Used</div>
        </div>

        <div className="text-center bg-white/70 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Coins className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-600">{pointsRobbed}</div>
          <div className="text-sm text-gray-600 font-medium">Points Robbed</div>
        </div>

        <div className="text-center bg-white/70 rounded-lg p-4 border border-green-200">
          <div className="flex items-center justify-center mb-2">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600">{pointsRestored}</div>
          <div className="text-sm text-gray-600 font-medium">Points Restored</div>
        </div>
      </div>

      {/* Insights Row */}
      {(playerCount > 0 || mostTargetedCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mostActivePlayerCount > 0 && (
            <div className="bg-white/70 rounded-lg p-4 border border-indigo-200">
              <div className="text-sm text-indigo-700 font-medium mb-1">Most Strategic Player</div>
              <div className="text-lg font-bold text-indigo-800">
                {mostActivePlayerName}
              </div>
              <div className="text-sm text-gray-600">
                {mostActivePlayerCount} extra{mostActivePlayerCount !== 1 ? 's' : ''} used
              </div>
            </div>
          )}

          {mostTargetedCount > 0 && (
            <div className="bg-white/70 rounded-lg p-4 border border-orange-200">
              <div className="text-sm text-orange-700 font-medium mb-1">Most Targeted Player</div>
              <div className="text-lg font-bold text-orange-800">
                {mostTargetedName}
              </div>
              <div className="text-sm text-gray-600">
                Targeted {mostTargetedCount} time{mostTargetedCount !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Message */}
      <div className="mt-4 text-center">
        <div className="text-sm text-indigo-600 bg-white/70 rounded-full px-4 py-2 inline-block">
          {totalExtrasUsed === 0 
            ? 'No strategic extras were used this round'
            : `Players used ${totalExtrasUsed} strategic extra${totalExtrasUsed !== 1 ? 's' : ''} this round`
          }
        </div>
      </div>
    </div>
  );
};

export default RoundStatsDisplay;