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
  CheckCircle,
 
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

  // ENHANCED: Calculate overall totals including skipped answers
  const overallStats = allRoundsStats.reduce((total, round) => ({
    hintsUsed: total.hintsUsed + round.hintsUsed,
    freezesUsed: total.freezesUsed + round.freezesUsed,
    pointsRobbed: total.pointsRobbed + round.pointsRobbed,
    pointsRestored: total.pointsRestored + round.pointsRestored,
    totalExtrasUsed: total.totalExtrasUsed + round.totalExtrasUsed,
    // Enhanced question totals with skip support
    questionsAnswered: total.questionsAnswered + (round.questionsAnswered || 0),
    correctAnswers: total.correctAnswers + (round.correctAnswers || 0),
    wrongAnswers: total.wrongAnswers + (round.wrongAnswers || 0),
    noAnswers: total.noAnswers + (round.noAnswers || 0),
    skippedAnswers: total.skippedAnswers + (round.skippedAnswers || 0) // NEW
  }), {
    hintsUsed: 0,
    freezesUsed: 0,
    pointsRobbed: 0,
    pointsRestored: 0,
    totalExtrasUsed: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    noAnswers: 0,
    skippedAnswers: 0
  });

  // ENHANCED: Calculate performance metrics considering skips
  const totalResponses = overallStats.correctAnswers + overallStats.wrongAnswers + overallStats.noAnswers + overallStats.skippedAnswers;
  const actualAttempts = overallStats.correctAnswers + overallStats.wrongAnswers; // Excludes skips and no-answers
  
  const overallCorrectPercentage = totalResponses > 0 
    ? ((overallStats.correctAnswers / totalResponses) * 100).toFixed(1) 
    : '0';
  
  const accuracyRate = actualAttempts > 0 
    ? ((overallStats.correctAnswers / actualAttempts) * 100).toFixed(1) 
    : '0';

  const averageCorrectPerRound = allRoundsStats.length > 0 
    ? (overallStats.correctAnswers / allRoundsStats.length).toFixed(1) 
    : '0';

  // Check if any rounds were speed rounds
  const hasSpeedRounds = allRoundsStats.some(round => round.roundType === 'speed_round');
  const speedRoundCount = allRoundsStats.filter(round => round.roundType === 'speed_round').length;

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
      totalPlayers,
      performanceMetrics: {
        overallCorrectPercentage,
        accuracyRate,
        averageCorrectPerRound,
        hasSpeedRounds,
        speedRoundCount
      }
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
    <div className="bg-muted mb-6 rounded-xl border-2 border-purple-200 p-6 shadow-lg">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-fg text-2xl font-bold">Final Quiz Statistics</h2>
            <p className="text-fg/70">Complete analysis of performance and strategic play</p>
            {hasSpeedRounds && (
              <p className="text-purple-600 text-sm font-medium">
                Includes {speedRoundCount} speed round{speedRoundCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={exportStats}
          className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition hover:bg-purple-700"
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>

      {/* ENHANCED: Overall Question Performance with Skip Support */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 p-6">
        <h3 className="mb-4 flex items-center space-x-2 text-lg font-bold text-green-800">
          <CheckCircle className="h-5 w-5" />
          <span>Overall Question Performance</span>
          {hasSpeedRounds && (
            <span className="text-sm font-normal text-green-600">
              (Accuracy: {accuracyRate}% of attempts)
            </span>
          )}
        </h3>
        
        {/* Dynamic grid based on whether skips exist */}
        <div className={`mb-4 grid gap-4 ${
          overallStats.skippedAnswers > 0 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'
        }`}>
          <div className="bg-muted/70 rounded-lg border border-green-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{overallStats.correctAnswers}</div>
            <div className="text-fg/70 text-xs">Correct Answers</div>
            <div className="text-green-600 text-xs font-medium">{overallCorrectPercentage}%</div>
          </div>
          <div className="bg-muted/70 rounded-lg border border-red-200 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{overallStats.wrongAnswers}</div>
            <div className="text-fg/70 text-xs">Wrong Answers</div>
          </div>
          
          {/* Conditionally show skips or no answers */}
          {overallStats.skippedAnswers > 0 ? (
            <div className="bg-muted/70 rounded-lg border border-amber-200 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{overallStats.skippedAnswers}</div>
              <div className="text-fg/70 text-xs">Skipped</div>
            </div>
          ) : null}
          
          {overallStats.noAnswers > 0 && (
            <div className="bg-muted/70 rounded-lg border border-gray-200 p-3 text-center">
              <div className="text-2xl font-bold text-gray-600">{overallStats.noAnswers}</div>
              <div className="text-fg/70 text-xs">No Answers</div>
            </div>
          )}
          
          <div className="bg-muted/70 rounded-lg border border-blue-200 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalResponses}</div>
            <div className="text-fg/70 text-xs">Total Responses</div>
          </div>
        </div>

        <div className="bg-muted/70 rounded-lg p-3 text-center">
          <div className="text-green-700 font-medium">
            {hasSpeedRounds 
              ? `Quiz Success Rate: ${overallCorrectPercentage}% • Accuracy Rate: ${accuracyRate}%`
              : `Quiz Success Rate: ${overallCorrectPercentage}%`
            }
          </div>
          <div className="text-fg/70 text-sm">
            Average {averageCorrectPerRound} correct answers per round
            {overallStats.skippedAnswers > 0 && (
              <span className="text-amber-600"> • {overallStats.skippedAnswers} questions skipped across all rounds</span>
            )}
          </div>
        </div>
      </div>

      {/* Strategic Summary - Same as before */}
      <div className="mb-6 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 p-6">
        <h3 className="mb-4 flex items-center space-x-2 text-lg font-bold text-purple-800">
          <TrendingUp className="h-5 w-5" />
          <span>Strategic Extras Summary</span>
        </h3>
        
        <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
          <div className="bg-muted/70 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{overallStats.hintsUsed}</div>
            <div className="text-fg/70 text-xs">Total Hints</div>
          </div>
          <div className="bg-muted/70 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{overallStats.freezesUsed}</div>
            <div className="text-fg/70 text-xs">Total Freezes</div>
          </div>
          <div className="bg-muted/70 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{overallStats.pointsRobbed}</div>
            <div className="text-fg/70 text-xs">Points Robbed</div>
          </div>
          <div className="bg-muted/70 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{overallStats.pointsRestored}</div>
            <div className="text-fg/70 text-xs">Points Restored</div>
          </div>
          <div className="bg-muted/70 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{overallStats.totalExtrasUsed}</div>
            <div className="text-fg/70 text-xs">Total Extras</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="bg-muted/70 rounded-lg p-3">
            <div className="font-medium text-purple-700">Quiz Info</div>
            <div className="text-fg/70">
              {allRoundsStats.length} rounds • {totalPlayers} players
              {quizDuration && <div>{quizDuration} minutes duration</div>}
              {hasSpeedRounds && <div>{speedRoundCount} speed rounds</div>}
            </div>
          </div>
          <div className="bg-muted/70 rounded-lg p-3">
            <div className="font-medium text-purple-700">Strategy Rate</div>
            <div className="text-fg/70">
              {totalPlayers > 0 ? (overallStats.totalExtrasUsed / totalPlayers).toFixed(1) : '0'} extras per player
            </div>
          </div>
          <div className="bg-muted/70 rounded-lg p-3">
            <div className="font-medium text-purple-700">Most Active Round</div>
            <div className="text-fg/70">
              Round {allRoundsStats.reduce((max, round) => 
                round.totalExtrasUsed > max.totalExtrasUsed ? round : max
              ).roundNumber}
            </div>
          </div>
        </div>
      </div>

      {/* Player Insights - Same as before */}
      {playerStats.length > 0 && (
        <div className="mb-6 rounded-xl bg-blue-50 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center space-x-2 text-lg font-bold text-blue-800">
              <Users className="h-5 w-5" />
              <span>Player Strategic Insights</span>
            </h3>
            <button
              onClick={() => setShowPlayerBreakdown(!showPlayerBreakdown)}
              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
            >
              {showPlayerBreakdown ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span>Details</span>
            </button>
          </div>

          {/* Top Strategic Players */}
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {playerStats.slice(0, 3).map((player, idx) => (
              <div key={player.name} className="bg-muted/70 rounded-lg border border-blue-200 p-4">
                <div className="mb-2 flex items-center space-x-2">
                  <Award className={`h-5 w-5 ${
                    idx === 0 ? 'text-yellow-600' : 
                    idx === 1 ? 'text-fg/70' : 'text-orange-600'
                  }`} />
                  <span className="font-medium text-blue-800">{player.name}</span>
                </div>
                <div className="mb-1 text-2xl font-bold text-blue-600">{player.totalExtras}</div>
                <div className="text-fg/70 text-xs">
                  {player.hintsUsed}H • {player.freezesUsed}F • {player.robsUsed}R • {player.restoresUsed}Re
                </div>
              </div>
            ))}
          </div>

          {/* Most Targeted Players */}
          {mostTargeted.length > 0 && (
            <div className="bg-muted/70 rounded-lg p-4">
              <div className="mb-2 font-medium text-blue-700">Most Targeted Players</div>
              <div className="flex flex-wrap gap-2">
                {mostTargeted.map(([name, count]) => (
                  <span key={name} className="rounded bg-orange-100 px-2 py-1 text-sm text-orange-800">
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
                <div key={player.name} className="bg-muted/70 flex items-center justify-between rounded-lg p-3">
                  <span className="font-medium">{player.name}</span>
                  <div className="text-fg/70 text-sm">
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

      {/* ENHANCED: Round by Round Breakdown with Skip Support */}
      <div className="rounded-xl bg-gray-50 p-6">
        <h3 className="text-fg mb-4 text-lg font-bold">Round-by-Round Breakdown</h3>
        <div className="space-y-3">
          {allRoundsStats.map(round => (
            <div key={round.roundNumber} className="bg-muted border-border rounded-lg border">
              <button
                onClick={() => toggleRoundExpanded(round.roundNumber)}
                className="flex w-full items-center justify-between p-4 transition hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <span className="font-medium">
                    Round {round.roundNumber}
                    {round.roundType === 'speed_round' && (
                      <span className="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">⚡ Speed</span>
                    )}
                  </span>
                  <div className="text-fg/70 flex items-center space-x-4 text-sm">
                    <span className="text-green-600">✓{round.correctAnswers || 0}</span>
                    <span className="text-red-600">✗{round.wrongAnswers || 0}</span>
                    {(round.skippedAnswers || 0) > 0 && (
                      <span className="text-amber-600">⏭{round.skippedAnswers}</span>
                    )}
                    {(round.noAnswers || 0) > 0 && round.roundType !== 'speed_round' && (
                      <span className="text-gray-600">⏰{round.noAnswers}</span>
                    )}
                    <span>💡{round.hintsUsed}</span>
                    <span>❄️{round.freezesUsed}</span>
                    <span>💰{round.pointsRobbed}</span>
                    <span>🎯{round.pointsRestored}</span>
                  </div>
                </div>
                {expandedRounds.has(round.roundNumber) ? 
                  <ChevronDown className="h-4 w-4" /> : 
                  <ChevronRight className="h-4 w-4" />
                }
              </button>
              
              {expandedRounds.has(round.roundNumber) && (
                <div className="border-border border-t px-4 pb-4">
                  {/* ENHANCED: Question Performance for this round with skip support */}
                  <div className="mb-3 mt-3">
                    <h5 className="text-fg/80 mb-2 text-sm font-medium">Question Performance</h5>
                    <div className={`grid gap-4 ${
                      (round.skippedAnswers || 0) > 0 ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-4'
                    }`}>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{round.correctAnswers || 0}</div>
                        <div className="text-fg/70 text-xs">Correct</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{round.wrongAnswers || 0}</div>
                        <div className="text-fg/70 text-xs">Wrong</div>
                      </div>
                      
                      {/* Show skips only if they exist */}
                      {(round.skippedAnswers || 0) > 0 && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-600">{round.skippedAnswers}</div>
                          <div className="text-fg/70 text-xs">Skipped</div>
                        </div>
                      )}
                      
                      {/* Show no answers only for non-speed rounds or if they exist */}
                      {((round.noAnswers || 0) > 0 && round.roundType !== 'speed_round') && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-600">{round.noAnswers}</div>
                          <div className="text-fg/70 text-xs">No Answer</div>
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{round.questionsAnswered || 0}</div>
                        <div className="text-fg/70 text-xs">Total Responses</div>
                      </div>
                    </div>
                  </div>

                  {/* Strategic Extras - Same as before */}
                  <div className="mb-3">
                    <h5 className="text-fg/80 mb-2 text-sm font-medium">Strategic Extras</h5>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{round.hintsUsed}</div>
                        <div className="text-fg/70 text-xs">Hints Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{round.freezesUsed}</div>
                        <div className="text-fg/70 text-xs">Freezes Used</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{round.pointsRobbed}</div>
                        <div className="text-fg/70 text-xs">Points Robbed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{round.pointsRestored}</div>
                        <div className="text-fg/70 text-xs">Points Restored</div>
                      </div>
                    </div>
                  </div>
                  
                  {Object.keys(round.extrasByPlayer).length > 0 && (
                    <div className="rounded-lg bg-gray-50 p-3">
                      <div className="text-fg/80 mb-2 text-sm font-medium">Player Activity</div>
                      <div className="space-y-1">
                        {Object.entries(round.extrasByPlayer).map(([playerName, extras]) => (
                          <div key={playerName} className="text-fg/70 text-sm">
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