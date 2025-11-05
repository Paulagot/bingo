// src/components/Quiz/host-controls/RoundStatsDisplay.tsx
import React from 'react';
import { TrendingUp, Target, Shield, Coins, CheckCircle, XCircle, Clock, SkipForward } from 'lucide-react';

export interface RoundStats {
  roundNumber: number;
  roundType?: string; // NEW: Track round type to handle different display logic
  hintsUsed: number;
  freezesUsed: number;
  pointsRobbed: number;
  pointsRestored: number;
  extrasByPlayer: Record<string, { extraId: string; target?: string; timestamp: number }[]>;
  questionsWithExtras: number;
  totalExtrasUsed: number;
  // Question breakdown fields
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  noAnswers: number;
  skippedAnswers?: number; // NEW: Optional field for speed rounds
  totalQuestions?: number;
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
    roundType,
    hintsUsed, 
    freezesUsed, 
    pointsRobbed, 
    pointsRestored, 
    extrasByPlayer,
    totalExtrasUsed,
    questionsAnswered,
    correctAnswers,
    wrongAnswers,
    noAnswers,
    skippedAnswers = 0, // Default to 0 for non-speed rounds
    
  } = roundStats;

  // Determine if this is a speed round
  const isSpeedRound = roundType === 'speed_round';



  // Calculate most targeted player (who was frozen/robbed the most)
  const targetCounts: Record<string, number> = {};
  Object.values(extrasByPlayer).flat().forEach(extra => {
    if (extra.target) {
      targetCounts[extra.target] = (targetCounts[extra.target] || 0) + 1;
    }
  });


  // ENHANCED: Calculate percentages based on round type
  const totalResponses = isSpeedRound 
    ? correctAnswers + wrongAnswers + skippedAnswers 
    : questionsAnswered + noAnswers;
  
  const correctPercentage = totalResponses > 0 ? ((correctAnswers / totalResponses) * 100).toFixed(1) : '0';
  const wrongPercentage = totalResponses > 0 ? ((wrongAnswers / totalResponses) * 100).toFixed(1) : '0';
  const noAnswerPercentage = totalResponses > 0 ? ((noAnswers / totalResponses) * 100).toFixed(1) : '0';
  const skippedPercentage = totalResponses > 0 ? ((skippedAnswers / totalResponses) * 100).toFixed(1) : '0';

  // Calculate accuracy rate (correct answers out of actual attempts, excluding skips and no-answers)
  const actualAttempts = correctAnswers + wrongAnswers;
  const accuracyRate = actualAttempts > 0 ? ((correctAnswers / actualAttempts) * 100).toFixed(1) : '0';

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="flex items-center space-x-2 text-xl font-bold text-indigo-800">
          <TrendingUp className="h-6 w-6" />
          <span>Round {roundNumber} Complete Analysis</span>
          {isSpeedRound && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
              ⚡ Speed Round
            </span>
          )}
        </h4>
        <div className="bg-muted/70 rounded-full px-3 py-1 text-sm text-indigo-600">
          {totalExtrasUsed} extras • {totalResponses} total responses
        </div>
      </div>

      {/* Enhanced Question Performance Section */}
      <div className="mb-6 rounded-lg bg-white/60 p-4">
        <h5 className="mb-3 flex items-center space-x-2 text-lg font-semibold text-indigo-700">
          <CheckCircle className="h-5 w-5" />
          <span>Question Performance</span>
          {isSpeedRound && (
            <span className="text-sm font-normal text-indigo-600">
              (Accuracy: {accuracyRate}% of attempts)
            </span>
          )}
        </h5>
        
        {/* ENHANCED: Dynamic grid based on round type */}
        <div className={`grid gap-4 ${
          isSpeedRound ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-4'
        }`}>
          
          {/* Correct Answers */}
          <div className="bg-muted/70 rounded-lg border border-green-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600">{correctAnswers}</div>
            <div className="text-fg/70 text-sm font-medium">Correct ({correctPercentage}%)</div>
          </div>

          {/* Wrong Answers */}
          <div className="bg-muted/70 rounded-lg border border-red-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600">{wrongAnswers}</div>
            <div className="text-fg/70 text-sm font-medium">Wrong ({wrongPercentage}%)</div>
          </div>

          {/* NEW: Conditional display based on round type */}
          {isSpeedRound && skippedAnswers > 0 ? (
            /* Speed Round: Show Skips */
            <div className="bg-muted/70 rounded-lg border border-amber-200 p-4 text-center">
              <div className="mb-2 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <SkipForward className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-amber-600">{skippedAnswers}</div>
              <div className="text-fg/70 text-sm font-medium">Skipped ({skippedPercentage}%)</div>
            </div>
          ) : (
            /* Other Rounds: Show No Answers (timeouts) */
            <div className="bg-muted/70 rounded-lg border border-gray-200 p-4 text-center">
              <div className="mb-2 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                  <Clock className="h-6 w-6 text-gray-600" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-600">{noAnswers}</div>
              <div className="text-fg/70 text-sm font-medium">No Answer ({noAnswerPercentage}%)</div>
            </div>
          )}

          {/* Total Responses */}
          <div className="bg-muted/70 rounded-lg border border-blue-200 p-4 text-center">
            <div className="mb-2 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{totalResponses}</div>
            <div className="text-fg/70 text-sm font-medium">
              {isSpeedRound ? 'Total Responses' : 'Total Responses'}
            </div>
          </div>
        </div>

        {/* ENHANCED: Round-specific insights */}
        {isSpeedRound && (
          <div className="mt-4 rounded-lg bg-blue-50 p-3">
            <div className="text-sm text-blue-800">
              <span className="font-medium">Speed Round Insights:</span>
              {skippedAnswers > 0 && (
                <span className="ml-2">
                  Players skipped {skippedAnswers} questions to focus on ones they knew.
                </span>
              )}
              {actualAttempts > 0 && (
                <span className="ml-2">
                  When players attempted answers, they were {accuracyRate}% accurate.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Strategic Extras Section - Same as before but with conditional display */}
      {totalExtrasUsed > 0 && (
        <div className="mb-6 rounded-lg bg-white/60 p-4">
          <h5 className="mb-3 flex items-center space-x-2 text-lg font-semibold text-indigo-700">
            <Target className="h-5 w-5" />
            <span>Strategic Extras</span>
          </h5>
          
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="bg-muted/70 rounded-lg border border-blue-200 p-4 text-center">
              <div className="mb-2 flex items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                  <span className="text-2xl">💡</span>
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
      )}

      {/* Enhanced Summary Message */}
      <div className="text-center">
        <div className="bg-muted/70 inline-block rounded-full px-4 py-2 text-sm text-indigo-600">
          {totalResponses === 0 
            ? 'No responses recorded this round'
            : isSpeedRound
              ? `${correctAnswers} correct, ${wrongAnswers} wrong, ${skippedAnswers} skipped out of ${totalResponses} total responses`
              : `${correctAnswers} correct out of ${questionsAnswered} responses (${correctPercentage}% success rate)`
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