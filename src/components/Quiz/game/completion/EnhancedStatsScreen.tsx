// src/components/Quiz/completion/EnhancedStatsScreen.tsx
import React from 'react';
import { Target, Trophy, Home } from 'lucide-react';
import { EnhancedPlayerStats, QuizConfig, LeaderboardEntry } from '../../types/quiz';

interface EnhancedStatsScreenProps {
  enhancedStats: EnhancedPlayerStats | null | undefined;
  config: QuizConfig | null;
  leaderboard: LeaderboardEntry[];
  playerId: string;
  playerPosition: number;
  playerScore: number;
  onShareResults: (platform: string, shareText: string) => void;
  onReturnToHome: () => void;
  setCurrentView: (view: string) => void;
  SocialShareMenu: React.ComponentType;
}

const EnhancedStatsScreen: React.FC<EnhancedStatsScreenProps> = ({
  enhancedStats,
  config,
  leaderboard,
  
  playerPosition,
  playerScore,

  onReturnToHome,
  setCurrentView,
  SocialShareMenu
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">📊 Your Performance Analysis</h2>
          <p className="text-lg text-gray-300 md:text-xl">Detailed insights into your quiz journey</p>
        </div>

        {enhancedStats ? (
          <div className="space-y-8">
            {/* Round Performance Chart */}
            {enhancedStats.roundProgression.scoreByRound.length > 0 && (
              <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
                <h3 className="mb-4 text-2xl font-bold text-white">📈 Round by Round Performance</h3>
                
                <div className="mb-4 grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-green-500/20 p-3 text-center">
                    <div className="text-lg font-bold text-green-300">
                      {enhancedStats.roundProgression.bestRoundScore}
                    </div>
                    <div className="text-sm text-white/80">Best Round</div>
                  </div>
                  <div className="rounded-lg bg-red-500/20 p-3 text-center">
                    <div className="text-lg font-bold text-red-300">
                      {enhancedStats.roundProgression.worstRoundScore}
                    </div>
                    <div className="text-sm text-white/80">Worst Round</div>
                  </div>
                  <div className="rounded-lg bg-blue-500/20 p-3 text-center">
                    <div className="text-lg font-bold text-blue-300">
                      {enhancedStats.roundProgression.trendDirection === 'improving' ? '📈' : 
                       enhancedStats.roundProgression.trendDirection === 'declining' ? '📉' : '➡️'}
                    </div>
                    <div className="text-sm text-white/80 capitalize">{enhancedStats.roundProgression.trendDirection}</div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="relative">
                  <div className="flex items-end justify-between space-x-2 h-32">
                    {enhancedStats.roundProgression.scoreByRound.map((score, index) => {
                      const maxScore = Math.max(...enhancedStats.roundProgression.scoreByRound, 1);
                      const height = Math.max((Math.abs(score) / maxScore) * 100, 5);
                      const isNegative = score < 0;
                      
                      return (
                        <div key={index} className="flex flex-col items-center flex-1 max-w-16">
                          <div className="text-xs text-white/80 mb-1 font-semibold">
                            {score > 0 ? '+' : ''}{score}
                          </div>
                          <div
                            className={`w-full rounded-t transition-all duration-500 ${
                              isNegative 
                                ? 'bg-gradient-to-t from-red-500 to-red-400' 
                                : score >= enhancedStats.roundProgression.bestRoundScore
                                ? 'bg-gradient-to-t from-green-500 to-green-400'
                                : 'bg-gradient-to-t from-blue-500 to-blue-400'
                            }`}
                            style={{ 
                              height: `${height}%`,
                              minHeight: '8px'
                            }}
                          />
                          <div className="text-xs text-white/60 mt-1">
                            R{index + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Strategic Play Breakdown */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
              <h3 className="mb-4 text-2xl font-bold text-white">🧠 Strategic Play Analysis</h3>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-purple-500/20 p-4 text-center">
                  <div className="text-2xl font-bold text-purple-300">{enhancedStats.strategicPlay.extrasUsed}</div>
                  <div className="text-sm text-white/80">Extras Used</div>
                </div>
                
                <div className="rounded-lg bg-orange-500/20 p-4 text-center">
                  <div className="text-2xl font-bold text-orange-300">{enhancedStats.strategicPlay.penaltiesReceived}</div>
                  <div className="text-sm text-white/80">Penalties Received</div>
                </div>
                
                <div className="rounded-lg bg-green-500/20 p-4 text-center">
                  <div className="text-2xl font-bold text-green-300">+{enhancedStats.strategicPlay.pointsRestored}</div>
                  <div className="text-sm text-white/80">Points Restored</div>
                </div>
                
                <div className="rounded-lg bg-blue-500/20 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-300">{enhancedStats.strategicPlay.extrasTypes.length}</div>
                  <div className="text-sm text-white/80">Extra Types</div>
                </div>
              </div>

              {enhancedStats.strategicPlay.extrasTypes.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-2 text-lg font-semibold text-white">Extras Used:</h4>
                  <div className="flex flex-wrap gap-2">
                    {enhancedStats.strategicPlay.extrasTypes.map((extraType, index) => (
                      <span
                        key={index}
                        className="rounded-full bg-purple-500/30 px-3 py-1 text-sm text-purple-200"
                      >
                        {extraType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ENHANCED: Question Performance with Speed Round Support */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
              <h3 className="mb-4 text-2xl font-bold text-white">🎯 Question Performance</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg bg-green-500/20 p-4">
                  <h4 className="text-xl font-bold text-green-300">
                    {enhancedStats.questionPerformance.accuracyRate}% Accuracy
                  </h4>
                  <p className="text-white/80">
                    {enhancedStats.questionPerformance.correctAnswers} correct out of {
                      enhancedStats.questionPerformance.correctAnswers + enhancedStats.questionPerformance.wrongAnswers
                    } attempted
                  </p>
                  <div className="mt-2 text-sm text-white/60">
                    {enhancedStats.questionPerformance.wrongAnswers} wrong
                    {(enhancedStats.questionPerformance.skippedAnswers || 0) > 0 && (
                      <span> • {enhancedStats.questionPerformance.skippedAnswers} skipped</span>
                    )}
                    {enhancedStats.questionPerformance.noAnswers > 0 && (
                      <span> • {enhancedStats.questionPerformance.noAnswers} no answer</span>
                    )}
                  </div>
                </div>
                
                <div className="rounded-lg bg-blue-500/20 p-4">
                  <h4 className="text-xl font-bold text-blue-300">
                    {enhancedStats.questionPerformance.pointsPerQuestion} pts/question
                  </h4>
                  <p className="text-white/80">Average points per question answered</p>
                  <div className="mt-2 text-sm text-white/60">
                    {enhancedStats.questionPerformance.totalAnswered} total responses
                  </div>
                </div>
              </div>

              {/* NEW: Enhanced breakdown for speed rounds */}
              {(enhancedStats.questionPerformance.skippedAnswers || 0) > 0 && (
                <div className="mt-4 rounded-lg bg-amber-500/20 p-4">
                  <h4 className="text-lg font-bold text-amber-300">⚡ Speed Round Strategy</h4>
                  <p className="text-white/80 mb-2">
                    You strategically skipped {enhancedStats.questionPerformance.skippedAnswers} questions 
                    to focus on ones you knew confidently.
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-300">
                        {enhancedStats.questionPerformance.correctAnswers}
                      </div>
                      <div className="text-white/60">Attempted & Correct</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-red-300">
                        {enhancedStats.questionPerformance.wrongAnswers}
                      </div>
                      <div className="text-white/60">Attempted & Wrong</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-300">
                        {enhancedStats.questionPerformance.skippedAnswers}
                      </div>
                      <div className="text-white/60">Strategically Skipped</div>
                    </div>
                  </div>
                  
                  {/* Strategy insights */}
                  <div className="mt-3 text-xs text-white/70">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {enhancedStats.questionPerformance.accuracyRate >= 80 && (
                        <div className="bg-green-500/20 rounded px-2 py-1">
                          ✓ High accuracy on attempted questions
                        </div>
                      )}
                      {(enhancedStats.questionPerformance.skippedAnswers || 0) >= 3 && (
                        <div className="bg-amber-500/20 rounded px-2 py-1">
                          ⚡ Smart skip strategy employed
                        </div>
                      )}
                      {enhancedStats.questionPerformance.correctAnswers > enhancedStats.questionPerformance.wrongAnswers && (
                        <div className="bg-blue-500/20 rounded px-2 py-1">
                          🎯 More correct than incorrect attempts
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Final Stats Summary */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
              <h3 className="mb-4 text-2xl font-bold text-white">📊 Final Statistics</h3>
              
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 p-4">
                  <h4 className="text-lg font-bold text-blue-300">Final Score</h4>
                  <div className="text-3xl font-bold text-white">{enhancedStats.finalStats.finalScore}</div>
                  <div className="text-sm text-white/60">Total points earned</div>
                </div>
                
                <div className="rounded-lg bg-gradient-to-br from-red-500/20 to-pink-500/20 p-4">
                  <h4 className="text-lg font-bold text-red-300">Negative Points</h4>
                  <div className="text-3xl font-bold text-white">{enhancedStats.finalStats.cumulativeNegativePoints}</div>
                  <div className="text-sm text-white/60">Points lost during quiz</div>
                </div>
                
                <div className="rounded-lg bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-4">
                  <h4 className="text-lg font-bold text-green-300">Points Restored</h4>
                  <div className="text-3xl font-bold text-white">+{enhancedStats.finalStats.pointsRestored}</div>
                  <div className="text-sm text-white/60">Via strategic extras</div>
                </div>
              </div>

              {/* Net Impact Calculation */}
              {(enhancedStats.finalStats.cumulativeNegativePoints > 0 || enhancedStats.finalStats.pointsRestored > 0) && (
                <div className="mt-6 rounded-lg bg-gradient-to-r from-gray-500/20 to-slate-500/20 p-4">
                  <h4 className="mb-2 text-lg font-bold text-gray-300">Score Journey</h4>
                  <div className="text-sm text-white/80">
                    Base Score: <span className="font-semibold">{enhancedStats.finalStats.finalScore + enhancedStats.finalStats.cumulativeNegativePoints - enhancedStats.finalStats.pointsRestored}</span>
                    {enhancedStats.finalStats.cumulativeNegativePoints > 0 && (
                      <span className="text-red-300"> - {enhancedStats.finalStats.cumulativeNegativePoints} (penalties)</span>
                    )}
                    {enhancedStats.finalStats.pointsRestored > 0 && (
                      <span className="text-green-300"> + {enhancedStats.finalStats.pointsRestored} (restored)</span>
                    )}
                    <span className="text-white"> = {enhancedStats.finalStats.finalScore} final</span>
                  </div>
                </div>
              )}
            </div>

            {/* ENHANCED: Personal Achievements with Speed Round Recognition */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
              <h3 className="mb-4 text-2xl font-bold text-white">🏆 Personal Achievements</h3>
              <div className="space-y-3">
                {enhancedStats.questionPerformance.accuracyRate >= 80 && (
                  <div className="rounded-lg bg-yellow-500/20 p-3">
                    <span className="text-yellow-300 font-bold">🎯 Sharpshooter:</span>
                    <span className="text-white ml-2">80%+ accuracy rate on attempted questions!</span>
                  </div>
                )}
                
                {/* NEW: Speed round specific achievements */}
                {(enhancedStats.questionPerformance.skippedAnswers || 0) >= 5 && (
                  <div className="rounded-lg bg-amber-500/20 p-3">
                    <span className="text-amber-300 font-bold">⚡ Speed Strategist:</span>
                    <span className="text-white ml-2">Master of strategic skipping in speed rounds</span>
                  </div>
                )}
                
                {(enhancedStats.questionPerformance.skippedAnswers || 0) > 0 && 
                 enhancedStats.questionPerformance.accuracyRate >= 90 && (
                  <div className="rounded-lg bg-cyan-500/20 p-3">
                    <span className="text-cyan-300 font-bold">🧠 Selective Genius:</span>
                    <span className="text-white ml-2">90%+ accuracy while using skip strategy</span>
                  </div>
                )}
                
                {enhancedStats.strategicPlay.extrasUsed >= 3 && (
                  <div className="rounded-lg bg-purple-500/20 p-3">
                    <span className="text-purple-300 font-bold">🧠 Strategist:</span>
                    <span className="text-white ml-2">Master of tactical gameplay</span>
                  </div>
                )}
                
                {enhancedStats.roundProgression.trendDirection === 'improving' && (
                  <div className="rounded-lg bg-blue-500/20 p-3">
                    <span className="text-blue-300 font-bold">📈 Comeback Kid:</span>
                    <span className="text-white ml-2">Stronger with every round</span>
                  </div>
                )}

                {enhancedStats.questionPerformance.accuracyRate === 100 && (
                  <div className="rounded-lg bg-yellow-500/20 p-3">
                    <span className="text-yellow-200 font-bold">🌟 Perfect Score:</span>
                    <span className="text-white ml-2">100% accuracy - flawless performance!</span>
                  </div>
                )}

                {enhancedStats.strategicPlay.pointsRestored > 0 && (
                  <div className="rounded-lg bg-green-500/20 p-3">
                    <span className="text-green-300 font-bold">🔄 Resilient:</span>
                    <span className="text-white ml-2">Successfully recovered from setbacks</span>
                  </div>
                )}

                {enhancedStats.roundProgression.bestRoundScore >= 10 && (
                  <div className="rounded-lg bg-orange-500/20 p-3">
                    <span className="text-orange-300 font-bold">🔥 High Scorer:</span>
                    <span className="text-white ml-2">Achieved {enhancedStats.roundProgression.bestRoundScore}+ points in a single round</span>
                  </div>
                )}

                {/* Existing extra-based achievements */}
                {enhancedStats.strategicPlay.extrasTypes.includes('robPoints') && (
                  <div className="rounded-lg bg-red-500/20 p-3">
                    <span className="text-red-300 font-bold">🏴‍☠️ Point Pirate:</span>
                    <span className="text-white ml-2">Used strategic point theft</span>
                  </div>
                )}

                {enhancedStats.strategicPlay.extrasTypes.includes('freezeOutTeam') && (
                  <div className="rounded-lg bg-cyan-500/20 p-3">
                    <span className="text-cyan-300 font-bold">❄️ Ice Master:</span>
                    <span className="text-white ml-2">Froze out competitors strategically</span>
                  </div>
                )}

                {enhancedStats.strategicPlay.extrasTypes.includes('buyHint') && (
                  <div className="rounded-lg bg-violet-500/20 p-3">
                    <span className="text-violet-300 font-bold">💡 Wise Investor:</span>
                    <span className="text-white ml-2">Purchased strategic hints</span>
                  </div>
                )}
                
                {/* NEW: Combined achievement for speed + strategy */}
                {(enhancedStats.questionPerformance.skippedAnswers || 0) > 0 && 
                 enhancedStats.strategicPlay.extrasUsed > 0 && (
                  <div className="rounded-lg bg-gradient-to-r from-purple-500/20 to-amber-500/20 p-3">
                    <span className="text-white font-bold">🌟 Ultimate Tactician:</span>
                    <span className="text-white ml-2">Combined speed round strategy with strategic extras</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // ENHANCED: Fallback to basic stats with achievements
          <div className="rounded-xl bg-white/10 p-6 backdrop-blur text-white">
            <h3 className="mb-4 flex items-center text-2xl font-bold">
              <Target className="mr-2 h-6 w-6" />
              Your Journey
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Final Position:</span>
                <span className="font-bold">{playerPosition}/{leaderboard.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Score:</span>
                <span className="font-bold">{playerScore} points</span>
              </div>
              <div className="flex justify-between">
                <span>Rounds Completed:</span>
                <span className="font-bold">{config?.roundCount || 0}</span>
              </div>
              
              {/* NEW: Basic achievement recognition */}
              {playerPosition === 1 && (
                <div className="mt-3 rounded-lg bg-yellow-500/20 p-2 text-center">
                  <span className="text-yellow-300 font-bold">🏆 CHAMPION!</span>
                </div>
              )}
              {playerPosition <= 3 && playerPosition > 1 && (
                <div className="mt-3 rounded-lg bg-blue-500/20 p-2 text-center">
                  <span className="text-blue-300 font-bold">🎖️ PODIUM FINISH!</span>
                </div>
              )}
              {playerScore >= 50 && (
                <div className="mt-3 rounded-lg bg-green-500/20 p-2 text-center">
                  <span className="text-green-300 font-bold">📈 HIGH ACHIEVER!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-8 space-y-4 text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <SocialShareMenu />
            <button
              onClick={() => setCurrentView('leaderboard')}
              className="flex items-center rounded-xl bg-purple-500 px-6 py-3 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:bg-purple-600 hover:shadow-xl md:px-8"
            >
              <Trophy className="mr-2 h-5 w-5" />
              View Leaderboard
            </button>
          </div>
          
          <button
            onClick={onReturnToHome}
            className="mx-auto flex items-center rounded-xl bg-gray-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-gray-700 md:px-8"
          >
            <Home className="mr-2 h-5 w-5" />
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedStatsScreen;