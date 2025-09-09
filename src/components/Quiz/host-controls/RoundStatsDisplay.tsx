// src/components/Quiz/host-controls/RoundStatsDisplay.tsx
import React from 'react';
import { TrendingUp, Target, Shield, Coins, CheckCircle, XCircle, Clock } from 'lucide-react';

export interface RoundStats {
  roundNumber: number;
  hintsUsed: number;
  freezesUsed: number;
  pointsRobbed: number;
  pointsRestored: number;
  extrasByPlayer: Record<string, { extraId: string; target?: string; timestamp: number }[]>;
  questionsWithExtras: number; // How many questions had extras used
  totalExtrasUsed: number;
  // 🆕 NEW: Question breakdown fields
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  noAnswers: number;
  totalQuestions?: number; // Optional, for calculating completion rate
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
    totalExtrasUsed,
    // 🆕 NEW: Destructure question stats
    questionsAnswered,
    correctAnswers,
    wrongAnswers,
    noAnswers,
    totalQuestions
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

  // 🆕 NEW: Calculate question stats
  const correctPercentage = questionsAnswered > 0 ? ((correctAnswers / questionsAnswered) * 100).toFixed(1) : '0';
  const wrongPercentage = questionsAnswered > 0 ? ((wrongAnswers / questionsAnswered) * 100).toFixed(1) : '0';
  const noAnswerPercentage = questionsAnswered > 0 ? ((noAnswers / questionsAnswered) * 100).toFixed(1) : '0';

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="flex items-center space-x-2 text-xl font-bold text-indigo-800">
          <TrendingUp className="h-6 w-6" />
          <span>Round {roundNumber} Complete Analysis</span>
        </h4>
        <div className="bg-muted/70 rounded-full px-3 py-1 text-sm text-indigo-600">
          {totalExtrasUsed} extras • {questionsAnswered} responses
        </div>
      </div>

      {/* 🆕 NEW: Question Performance Section */}
      <div className="mb-6 rounded-lg bg-white/60 p-4">
        <h5 className="mb-3 flex items-center space-x-2 text-lg font-semibold text-indigo-700">
          <CheckCircle className="h-5 w-5" />
          <span>Question Performance</span>
        </h5>
        
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-muted/70 rounded-lg border border-green-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">{correctAnswers}</div>
            <div className="text-fg/70 text-sm font-medium">Correct ({correctPercentage}%)</div>
          </div>

          <div className="bg-muted/70 rounded-lg border border-red-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600">{wrongAnswers}</div>
            <div className="text-fg/70 text-sm font-medium">Wrong ({wrongPercentage}%)</div>
          </div>

          <div className="bg-muted/70 rounded-lg border border-gray-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Clock className="h-6 w-6 text-gray-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-600">{noAnswers}</div>
            <div className="text-fg/70 text-sm font-medium">No Answer ({noAnswerPercentage}%)</div>
          </div>

          <div className="bg-muted/70 rounded-lg border border-blue-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{questionsAnswered}</div>
            <div className="text-fg/70 text-sm font-medium">Total Responses</div>
          </div>
        </div>
      </div>

      {/* Strategic Extras Section */}
      <div className="mb-6 rounded-lg bg-white/60 p-4">
        <h5 className="mb-3 flex items-center space-x-2 text-lg font-semibold text-indigo-700">
          <Target className="h-5 w-5" />
          <span>Strategic Extras</span>
        </h5>
        
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="bg-muted/70 rounded-lg border border-blue-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <span className="text-2xl">🧪</span>
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{hintsUsed}</div>
            <div className="text-fg/70 text-sm font-medium">Hints Used</div>
          </div>

          <div className="bg-muted/70 rounded-lg border border-red-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Shield className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600">{freezesUsed}</div>
            <div className="text-fg/70 text-sm font-medium">Freezes Used</div>
          </div>

          <div className="bg-muted/70 rounded-lg border border-purple-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                <Coins className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-purple-600">{pointsRobbed}</div>
            <div className="text-fg/70 text-sm font-medium">Points Robbed</div>
          </div>

          <div className="bg-muted/70 rounded-lg border border-green-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <Target className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">{pointsRestored}</div>
            <div className="text-fg/70 text-sm font-medium">Points Restored</div>
          </div>
        </div>
      </div>

      {/* Summary Message */}
      <div className="text-center">
        <div className="bg-muted/70 inline-block rounded-full px-4 py-2 text-sm text-indigo-600">
          {questionsAnswered === 0 
            ? 'No responses recorded this round'
            : `${correctAnswers} correct out of ${questionsAnswered} total responses (${correctPercentage}% success rate)`
          }
          {totalExtrasUsed > 0 && (
            <span> • {totalExtrasUsed} strategic extra{totalExtrasUsed !== 1 ? 's' : ''} used</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundStatsDisplay;