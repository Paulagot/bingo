// src/components/Quiz/host-controls/FinalQuizStats.tsx
import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Award, 
  ChevronDown, 
  ChevronRight,
  Download,

} from 'lucide-react';
import { RoundStats } from './RoundStatsDisplay';

interface FinalQuizStatsProps {
  allRoundsStats: RoundStats[];
  totalPlayers: number;
  quizDuration?: number; // in minutes
  isVisible?: boolean;
}

const FinalQuizStats: React.FC<FinalQuizStatsProps> = ({ 
  allRoundsStats, 
  totalPlayers, 
  quizDuration,
  isVisible = true 
}) => {
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [showPlayerBreakdown, setShowPlayerBreakdown] = useState(false);

  if (!isVisible || !allRoundsStats || allRoundsStats.length === 0) {
    return null;
  }

  // Calculate overall totals
  const overallStats = allRoundsStats.reduce((total, round) => ({
    hintsUsed: total.hintsUsed + round.hintsUsed,
    freezesUsed: total.freezesUsed + round.freezesUsed,
    pointsRobbed: total.pointsRobbed + round.pointsRobbed,
    pointsRestored: total.pointsRestored + round.pointsRestored,
    totalExtrasUsed: total.totalExtrasUsed + round.totalExtrasUsed
  }), {
    hintsUsed: 0,
    freezesUsed: 0,
    pointsRobbed: 0,
    pointsRestored: 0,
    totalExtrasUsed: 0
  });

  // Calculate player insights across all rounds
  const allPlayerExtras: Record<string, { extraId: string; target?: string; round: number }[]> = {};
  
  allRoundsStats.forEach(round => {
    Object.entries(round.extrasByPlayer).forEach(([playerName, extras]) => {
      if (!allPlayerExtras[playerName]) {
        allPlayerExtras[playerName] = [];
      }
      allPlayerExtras[playerName].push(
        ...extras.map(extra => ({ ...extra, round: round.roundNumber }))
      );
    });
  });

  // Find most strategic players
  const playerStats = Object.entries(allPlayerExtras)
    .map(([name, extras]) => ({
      name,
      totalExtras: extras.length,
      hintsUsed: extras.filter(e => e.extraId === 'buyHint').length,
      freezesUsed: extras.filter(e => e.extraId === 'freezeOutTeam').length,
      robsUsed: extras.filter(e => e.extraId === 'robPoints').length,
      restoresUsed: extras.filter(e => e.extraId === 'restorePoints').length
    }))
    .sort((a, b) => b.totalExtras - a.totalExtras);

  // Find most targeted players
  const targetCounts: Record<string, number> = {};
  Object.values(allPlayerExtras).flat().forEach(extra => {
    if (extra.target) {
      targetCounts[extra.target] = (targetCounts[extra.target] || 0) + 1;
    }
  });
  
  const mostTargeted = Object.entries(targetCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const toggleRoundExpanded = (roundNumber: number) => {
    const newExpanded = new Set(expandedRounds);
    if (newExpanded.has(roundNumber)) {
      newExpanded.delete(roundNumber);
    } else {
      newExpanded.add(roundNumber);
    }
    setExpandedRounds(newExpanded);
  };

  const exportStats = () => {
    const statsData = {
      overallStats,
      playerStats,
      roundBreakdown: allRoundsStats,
      mostTargeted,
      quizDuration,
      totalPlayers
    };
    
    const dataStr = JSON.stringify(statsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz-stats-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BarChart3 className="w-8 h-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">📈 Final Quiz Statistics</h2>
            <p className="text-gray-600">Complete breakdown of strategic play across all rounds</p>
          </div>
        </div>
        <button
          onClick={exportStats}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-bold text-purple-800 mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>Overall Quiz Summary</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-600">{overallStats.hintsUsed}</div>
            <div className="text-xs text-gray-600">Total Hints</div>
          </div>
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="text-2xl font-bold text-red-600">{overallStats.freezesUsed}</div>
            <div className="text-xs text-gray-600">Total Freezes</div>
          </div>
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="text-2xl font-bold text-purple-600">{overallStats.pointsRobbed}</div>
            <div className="text-xs text-gray-600">Points Robbed</div>
          </div>
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="text-2xl font-bold text-green-600">{overallStats.pointsRestored}</div>
            <div className="text-xs text-gray-600">Points Restored</div>
          </div>
          <div className="text-center bg-white/70 rounded-lg p-3">
            <div className="text-2xl font-bold text-orange-600">{overallStats.totalExtrasUsed}</div>
            <div className="text-xs text-gray-600">Total Extras</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/70 rounded-lg p-3">
            <div className="font-medium text-purple-700">Quiz Info</div>
            <div className="text-gray-600">
              {allRoundsStats.length} rounds • {totalPlayers} players
              {quizDuration && <div>{quizDuration} minutes duration</div>}
            </div>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <div className="font-medium text-purple-700">Strategy Rate</div>
            <div className="text-gray-600">
              {totalPlayers > 0 ? (overallStats.totalExtrasUsed / totalPlayers).toFixed(1) : '0'} extras per player
            </div>
          </div>
          <div className="bg-white/70 rounded-lg p-3">
            <div className="font-medium text-purple-700">Most Active Round</div>
            <div className="text-gray-600">
              Round {allRoundsStats.reduce((max, round) => 
                round.totalExtrasUsed > max.totalExtrasUsed ? round : max
              ).roundNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Player Insights */}
      {playerStats.length > 0 && (
        <div className="bg-blue-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-blue-800 flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>Player Strategic Insights</span>
            </h3>
            <button
              onClick={() => setShowPlayerBreakdown(!showPlayerBreakdown)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
            >
              {showPlayerBreakdown ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>Details</span>
            </button>
          </div>

          {/* Top Strategic Players */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {playerStats.slice(0, 3).map((player, idx) => (
              <div key={player.name} className="bg-white/70 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center space-x-2 mb-2">
                  <Award className={`w-5 h-5 ${
                    idx === 0 ? 'text-yellow-600' : 
                    idx === 1 ? 'text-gray-600' : 'text-orange-600'
                  }`} />
                  <span className="font-medium text-blue-800">{player.name}</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{player.totalExtras}</div>
                <div className="text-xs text-gray-600">
                  {player.hintsUsed}H • {player.freezesUsed}F • {player.robsUsed}R • {player.restoresUsed}Re
                </div>
              </div>
            ))}
          </div>

          {/* Most Targeted Players */}
          {mostTargeted.length > 0 && (
            <div className="bg-white/70 rounded-lg p-4">
              <div className="font-medium text-blue-700 mb-2">Most Targeted Players</div>
              <div className="flex flex-wrap gap-2">
                {mostTargeted.map(([name, count]) => (
                  <span key={name} className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                    {name} ({count}x)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Player Breakdown */}
          {showPlayerBreakdown && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-blue-800">Complete Player Breakdown</h4>
              {playerStats.map(player => (
                <div key={player.name} className="bg-white/70 rounded-lg p-3 flex justify-between items-center">
                  <span className="font-medium">{player.name}</span>
                  <div className="text-sm text-gray-600">
                    Total: {player.totalExtras} | 
                    Hints: {player.hintsUsed} | 
                    Freezes: {player.freezesUsed} | 
                    Robs: {player.robsUsed} | 
                    Restores: {player.restoresUsed}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Round by Round Breakdown */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Round-by-Round Breakdown</h3>
        <div className="space-y-3">
          {allRoundsStats.map(round => (
            <div key={round.roundNumber} className="bg-white rounded-lg border border-gray-200">
              <button
                onClick={() => toggleRoundExpanded(round.roundNumber)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-medium">Round {round.roundNumber}</span>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>🧪{round.hintsUsed}</span>
                    <span>❄️{round.freezesUsed}</span>
                    <span>💰{round.pointsRobbed}</span>
                    <span>🎯{round.pointsRestored}</span>
                  </div>
                </div>
                {expandedRounds.has(round.roundNumber) ? 
                  <ChevronDown className="w-4 h-4" /> : 
                  <ChevronRight className="w-4 h-4" />
                }
              </button>
              
              {expandedRounds.has(round.roundNumber) && (
                <div className="px-4 pb-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 mb-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">{round.hintsUsed}</div>
                      <div className="text-xs text-gray-600">Hints Used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-600">{round.freezesUsed}</div>
                      <div className="text-xs text-gray-600">Freezes Used</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">{round.pointsRobbed}</div>
                      <div className="text-xs text-gray-600">Points Robbed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">{round.pointsRestored}</div>
                      <div className="text-xs text-gray-600">Points Restored</div>
                    </div>
                  </div>
                  
                  {Object.keys(round.extrasByPlayer).length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Player Activity</div>
                      <div className="space-y-1">
                        {Object.entries(round.extrasByPlayer).map(([playerName, extras]) => (
                          <div key={playerName} className="text-sm text-gray-600">
                            <span className="font-medium">{playerName}:</span> {extras.length} extra{extras.length !== 1 ? 's' : ''}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinalQuizStats;