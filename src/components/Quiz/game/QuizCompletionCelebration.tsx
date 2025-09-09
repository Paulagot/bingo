import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Award, Crown, Share2, Home, Users, Target, 
  Twitter, Linkedin, Instagram, Facebook, Copy, Heart,
  DollarSign, TrendingUp, Zap, Gift, CheckCircle, BarChart3
} from 'lucide-react';

// Enhanced interface for player statistics
interface EnhancedPlayerStats {
  playerId: string;
  playerName: string;
  questionPerformance: {
    totalAnswered: number;
    correctAnswers: number;
    wrongAnswers: number;
    noAnswers: number;
    accuracyRate: number;
    pointsPerQuestion: number;
  };
  roundProgression: {
    scoreByRound: number[];
    bestRoundScore: number;
    worstRoundScore: number;
    totalRounds: number;
    trendDirection: 'improving' | 'consistent' | 'declining';
  };
  strategicPlay: {
    extrasUsed: number;
    extrasTypes: string[];
    penaltiesReceived: number;
    pointsRestored: number;
  };
  finalStats: {
    finalScore: number;
    cumulativeNegativePoints: number;
    pointsRestored: number;
  };
}

// Types based on your existing code
interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  cumulativeNegativePoints?: number;
  pointsRestored?: number;
}

interface Prize {
  place: number;
  description: string;
  sponsor?: string;
  value?: number;
  tokenAddress?: string;
}

interface QuizConfig {
  hostName?: string;
  gameType?: string;
  roundCount?: number;
  prizes?: Prize[];
  prizeMode?: 'split' | 'assets' | 'cash';
  currencySymbol?: string;
  entryFee?: string;
  web3Charity?: string;
  web3PrizeSplit?: {
    charity: number;
    host: number;
    prizes: number;
  };
  sponsors?: Array<{
    name: string;
    logo?: string;
    message?: string;
    website?: string;
  }>;
  completionMessage?: string;
  theme?: string;
}

interface FundraisingData {
  totalRaised: number;
  totalEntry: number;
  totalExtras: number;
  charityAmount: number;
  prizeAmount: number;
  hostAmount: number;
  totalPlayers: number;
  playerContribution: {
    extrasUsed: number;
    extrasSpent: number;
    personalImpact: number;
  };
}

interface QuizCompletionProps {
  leaderboard: LeaderboardEntry[];
  config: QuizConfig | null;
  playerId: string;
  roomId: string;
  enhancedStats?: EnhancedPlayerStats; // NEW: Optional enhanced statistics
  fundraisingData?: FundraisingData;
  isHost?: boolean;
  onShareResults: (platform: string, shareText: string) => void;
  onReturnToHome: () => void;
}

const QuizCompletionCelebration: React.FC<QuizCompletionProps> = ({
  leaderboard,
  config,
  playerId,
  roomId,
  enhancedStats,
  fundraisingData,
  isHost = false,
  onShareResults,
  onReturnToHome
}) => {
  const [currentView, setCurrentView] = useState<'celebration' | 'leaderboard' | 'prizes' | 'impact' | 'stats'>('celebration');
  const [confettiActive, setConfettiActive] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  const playerPosition = leaderboard.findIndex(p => p.id === playerId) + 1;
  const playerScore = leaderboard.find(p => p.id === playerId)?.score || 0;
  const currency = config?.currencySymbol || '€';

  // Auto-progression through celebration phases
  useEffect(() => {
    const timeline = [
      { phase: 'celebration', duration: 4000 },
      { phase: 'leaderboard', duration: 8000 },
      { phase: 'prizes', duration: 6000 },
      { phase: 'impact', duration: 8000 },
      { phase: 'stats', duration: 0 }
    ];

    let timeoutId: NodeJS.Timeout;
    let currentIndex = 0;

    const advance = () => {
      if (currentIndex < timeline.length - 1) {
        currentIndex++;
        setCurrentView(timeline[currentIndex].phase as any);
        if (timeline[currentIndex].duration > 0) {
          timeoutId = setTimeout(advance, timeline[currentIndex].duration);
        }
      }
    };

    timeoutId = setTimeout(advance, timeline[0].duration);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setConfettiActive(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const getOrdinalSuffix = (num: number) => {
    const j = num % 10;
    const k = num % 100;
    if (j == 1 && k != 11) return "st";
    if (j == 2 && k != 12) return "nd";
    if (j == 3 && k != 13) return "rd";
    return "th";
  };

  const generateShareText = (platform: string) => {
    const baseText = `Just completed an amazing quiz and scored ${playerScore} points!`;
    
    if (!fundraisingData) {
      return `${baseText} #QuizNight #Challenge`;
    }

    const impactText = fundraisingData.totalRaised > 0 
      ? `\n\nTogether we raised ${currency}${fundraisingData.totalRaised.toFixed(2)} for charity!`
      : '';
    
    const personalImpact = fundraisingData.playerContribution.personalImpact > 0
      ? `\nMy in-game actions contributed ${currency}${fundraisingData.playerContribution.personalImpact.toFixed(2)} to the cause!`
      : '';

    const hashtags = platform === 'twitter' 
      ? '\n\n#FundraisingQuiz #CharityQuiz #MakingADifference'
      : '\n\nFundraising Quiz | Making a Difference';

    return `${baseText}${impactText}${personalImpact}${hashtags}`;
  };

  // Enhanced Statistics Display
  const renderEnhancedStats = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">📊 Your Performance Analysis</h2>
          <p className="text-lg text-gray-300 md:text-xl">Detailed insights into your quiz journey</p>
        </div>

        {enhancedStats ? (
          <div className="space-y-8">
            {/* Performance Analysis */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
              <h3 className="mb-4 text-2xl font-bold text-white">🎯 Question Performance</h3>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg bg-green-500/20 p-4">
                  <h4 className="text-xl font-bold text-green-300">
                    {enhancedStats.questionPerformance.accuracyRate}% Accuracy
                  </h4>
                  <p className="text-white/80">
                    {enhancedStats.questionPerformance.correctAnswers} correct out of {enhancedStats.questionPerformance.totalAnswered} answered
                  </p>
                  <div className="mt-2 text-sm text-white/60">
                    {enhancedStats.questionPerformance.wrongAnswers} wrong • {enhancedStats.questionPerformance.noAnswers} skipped
                  </div>
                </div>
                
                <div className="rounded-lg bg-blue-500/20 p-4">
                  <h4 className="text-xl font-bold text-blue-300">
                    {enhancedStats.questionPerformance.pointsPerQuestion} pts/question
                  </h4>
                  <p className="text-white/80">Average points per question answered</p>
                </div>
              </div>
            </div>

            {/* Round Progression */}
            {enhancedStats.roundProgression && enhancedStats.roundProgression.totalRounds > 1 && (
              <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
                <h3 className="mb-4 text-2xl font-bold text-white">📈 Round-by-Round Journey</h3>
                
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-yellow-500/20 p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-300">
                      {enhancedStats.roundProgression.bestRoundScore}
                    </div>
                    <div className="text-white/80">Best Round</div>
                  </div>
                  
                  <div className="rounded-lg bg-purple-500/20 p-4 text-center">
                    <div className="text-2xl font-bold text-purple-300">
                      {enhancedStats.roundProgression.trendDirection === 'improving' ? '📈' : 
                       enhancedStats.roundProgression.trendDirection === 'declining' ? '📉' : '📊'}
                    </div>
                    <div className="text-white/80">
                      {enhancedStats.roundProgression.trendDirection === 'improving' ? 'Improving!' : 
                       enhancedStats.roundProgression.trendDirection === 'declining' ? 'Tough Finish' : 'Consistent'}
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-blue-500/20 p-4 text-center">
                    <div className="text-2xl font-bold text-blue-300">
                      {enhancedStats.roundProgression.totalRounds}
                    </div>
                    <div className="text-white/80">Rounds Completed</div>
                  </div>
                </div>

                {/* Round Score Progression Chart */}
                <div className="mt-6">
                  <h4 className="mb-4 font-semibold text-white">Score by Round:</h4>
                  <div className="flex items-end justify-center space-x-2">
                    {enhancedStats.roundProgression.scoreByRound.map((score, index) => {
                      const maxScore = Math.max(...enhancedStats.roundProgression.scoreByRound);
                      const height = Math.max((score / (maxScore || 1)) * 100, 8);
                      
                      return (
                        <div key={index} className="flex flex-col items-center">
                          <div className="mb-1 text-xs text-white/80 font-bold">{score}</div>
                          <div
                            className="bg-gradient-to-t from-blue-500 to-purple-500 rounded-t-sm w-8 transition-all duration-1000"
                            style={{ height: `${height}px` }}
                          />
                          <div className="mt-1 text-xs text-white/60">R{index + 1}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Strategic Gameplay */}
            {enhancedStats.strategicPlay && enhancedStats.strategicPlay.extrasUsed > 0 && (
              <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
                <h3 className="mb-4 text-2xl font-bold text-white">⚡ Strategic Gameplay</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-purple-500/20 p-4">
                    <h4 className="text-xl font-bold text-purple-300">
                      {enhancedStats.strategicPlay.extrasUsed} Extras Used
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {enhancedStats.strategicPlay.extrasTypes.map(extra => (
                        <span key={extra} className="rounded bg-purple-600/50 px-2 py-1 text-xs text-white">
                          {extra.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  {enhancedStats.strategicPlay.pointsRestored > 0 && (
                    <div className="rounded-lg bg-green-500/20 p-4">
                      <h4 className="text-xl font-bold text-green-300">
                        +{enhancedStats.strategicPlay.pointsRestored} Restored
                      </h4>
                      <p className="text-white/80">Points recovered through strategy</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Personal Achievements */}
            <div className="rounded-xl bg-white/10 p-6 backdrop-blur">
              <h3 className="mb-4 text-2xl font-bold text-white">🏆 Personal Achievements</h3>
              <div className="space-y-3">
                {enhancedStats.questionPerformance.accuracyRate >= 80 && (
                  <div className="rounded-lg bg-yellow-500/20 p-3">
                    <span className="text-yellow-300 font-bold">🎯 Sharpshooter:</span>
                    <span className="text-white ml-2">80%+ accuracy rate!</span>
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
                  <div className="rounded-lg bg-gold-500/20 p-3">
                    <span className="text-yellow-200 font-bold">🌟 Perfect Score:</span>
                    <span className="text-white ml-2">100% accuracy - flawless performance!</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Fallback to basic stats
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

  // Social share component
  const SocialShareMenu = () => (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:bg-green-600 hover:shadow-xl md:px-8"
      >
        <Share2 className="mr-2 h-5 w-5" />
        Share Results
      </button>
      
      {showShareMenu && (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-64 rounded-xl border-2 border-gray-300 bg-white p-4 shadow-xl">
          <h4 className="text-gray-800 mb-3 font-bold">Share your results:</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onShareResults('twitter', generateShareText('twitter'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 rounded-lg bg-blue-400 p-3 text-white transition-colors hover:bg-blue-500"
            >
              <Twitter className="h-4 w-4" />
              <span>Twitter</span>
            </button>
            <button
              onClick={() => {
                onShareResults('linkedin', generateShareText('linkedin'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 rounded-lg bg-blue-600 p-3 text-white transition-colors hover:bg-blue-700"
            >
              <Linkedin className="h-4 w-4" />
              <span>LinkedIn</span>
            </button>
            <button
              onClick={() => {
                onShareResults('instagram', generateShareText('instagram'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 rounded-lg bg-pink-500 p-3 text-white transition-colors hover:bg-pink-600"
            >
              <Instagram className="h-4 w-4" />
              <span>Instagram</span>
            </button>
            <button
              onClick={() => {
                onShareResults('facebook', generateShareText('facebook'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 rounded-lg bg-blue-800 p-3 text-white transition-colors hover:bg-blue-900"
            >
              <Facebook className="h-4 w-4" />
              <span>Facebook</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateShareText('copy'));
                setShowShareMenu(false);
              }}
              className="col-span-2 flex items-center justify-center space-x-2 rounded-lg bg-gray-600 p-3 text-white transition-colors hover:bg-gray-700"
            >
              <Copy className="h-4 w-4" />
              <span>Copy to Clipboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Confetti Effect
  const ConfettiEffect = () => (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-pulse"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            fontSize: `${Math.random() * 20 + 10}px`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${Math.random() * 3 + 2}s`
          }}
        >
          {['🎉', '🎊', '🏆', '⭐', '💫', '❤️', '💝'][Math.floor(Math.random() * 7)]}
        </div>
      ))}
    </div>
  );

  const renderCelebrationView = () => (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
      {confettiActive && <ConfettiEffect />}
      
      <div className="z-10 px-4 text-center text-white">
        <div className="mb-6 animate-bounce text-8xl">
          {fundraisingData ? '💝' : '🎉'}
        </div>
        <h1 className="mb-4 bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-4xl font-bold text-transparent md:text-6xl lg:text-8xl">
          {isHost ? 'QUIZ COMPLETE!' : 'AMAZING JOB!'}
        </h1>
        <div className="text-2xl md:text-3xl mb-4">
          {!isHost && playerPosition === 1 && "🏆 CHAMPION! You came 1st!"}
          {!isHost && playerPosition === 2 && "🥈 Amazing! You came 2nd!"}
          {!isHost && playerPosition === 3 && "🥉 Fantastic! You came 3rd!"}
          {!isHost && playerPosition > 3 && `Great job! You finished ${playerPosition}${getOrdinalSuffix(playerPosition)}!`}
          {isHost && "Thank you for hosting this incredible quiz event!"}
        </div>
        {!isHost && (
          <div className="mb-8 text-lg md:text-xl">
            Final Score: <span className="font-bold text-yellow-300">{playerScore} points</span>
          </div>
        )}
        {fundraisingData && fundraisingData.totalRaised > 0 && (
          <div className="mt-6 rounded-xl bg-black/20 p-4 text-base opacity-90 backdrop-blur md:text-lg">
            <Heart className="mx-auto mb-2 h-6 w-6 text-red-300" />
            <div className="text-xl font-bold text-green-300">
              Together we raised {currency}{fundraisingData.totalRaised.toFixed(2)}
            </div>
            <div className="text-sm">for {config?.web3Charity || 'charity'}</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderLeaderboardView = () => (
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

  const renderPrizesView = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-blue-600 p-4 md:p-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-8 text-3xl font-bold text-white md:text-5xl">🎁 Prizes & Distribution</h2>
        
        {config?.prizes && config.prizes.length > 0 && (
          <div className="mb-8 grid gap-6 md:grid-cols-3">
            {config.prizes.slice(0, 3).map((prize, index) => (
              <div key={index} className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
                <div className="mb-4 text-4xl">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </div>
                <h3 className="mb-2 text-xl font-bold">{prize.place}{getOrdinalSuffix(prize.place)} Place</h3>
                <p className="mb-2 text-lg">{prize.description}</p>
                {prize.value && prize.value > 0 && (
                  <p className="font-semibold text-green-300">{currency}{prize.value}</p>
                )}
                {prize.sponsor && (
                  <p className="mt-2 text-sm opacity-80">Sponsored by {prize.sponsor}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {!isHost && playerPosition <= 3 && config?.prizes?.find(p => p.place === playerPosition) && (
          <div className="mb-8 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-black">
            <h3 className="mb-2 text-2xl font-bold">🎉 You Won!</h3>
            <p className="text-lg">{config.prizes.find(p => p.place === playerPosition)?.description}</p>
            {config.prizes.find(p => p.place === playerPosition)?.value && (
              <p className="text-xl font-bold">
                {currency}{config.prizes.find(p => p.place === playerPosition)?.value}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderImpactView = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-emerald-700 to-teal-700 p-4 md:p-8">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-white md:text-5xl">💝 Fundraising Impact</h2>
        <p className="mb-8 text-lg text-green-200 md:text-xl">Together we made a difference!</p>
        
        {fundraisingData ? (
          <div className="space-y-6">
            <div className="rounded-xl bg-white/10 p-8 text-white backdrop-blur">
              <div className="mb-4 text-6xl">❤️</div>
              <h3 className="mb-2 text-4xl font-bold text-green-300">
                {currency}{fundraisingData.totalRaised.toFixed(2)}
              </h3>
              <p className="text-xl">Total Raised for {config?.web3Charity || 'Charity'}</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
                <DollarSign className="mx-auto mb-4 h-8 w-8 text-blue-300" />
                <h4 className="mb-2 text-2xl font-bold">{currency}{fundraisingData.totalEntry.toFixed(2)}</h4>
                <p className="text-sm">Entry Fees ({fundraisingData.totalPlayers} players)</p>
              </div>
              
              <div className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
                <Zap className="mx-auto mb-4 h-8 w-8 text-purple-300" />
                <h4 className="mb-2 text-2xl font-bold">{currency}{fundraisingData.totalExtras.toFixed(2)}</h4>
                <p className="text-sm">In-Game Extras</p>
              </div>
              
              <div className="rounded-xl bg-white/10 p-6 text-white backdrop-blur">
                <TrendingUp className="mx-auto mb-4 h-8 w-8 text-green-300" />
                <h4 className="mb-2 text-2xl font-bold">{currency}{fundraisingData.charityAmount.toFixed(2)}</h4>
                <p className="text-sm">To Charity ({config?.web3PrizeSplit?.charity || 75}%)</p>
              </div>
            </div>

            {!isHost && fundraisingData.playerContribution.personalImpact > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-black">
                <h3 className="mb-4 text-2xl font-bold">🌟 Your Personal Impact</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-xl font-bold">{fundraisingData.playerContribution.extrasUsed}</div>
                    <div className="text-sm">Extras Used</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{currency}{fundraisingData.playerContribution.personalImpact.toFixed(2)}</div>
                    <div className="text-sm">Your Contribution</div>
                  </div>
                </div>
                <p className="mt-4 text-sm opacity-90">
                  Your freeze-outs, point stealing, and extra purchases helped raise funds for charity!
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl bg-white/10 p-8 text-white backdrop-blur">
            <Heart className="mx-auto mb-4 h-16 w-16 text-red-300" />
            <h3 className="mb-4 text-2xl font-bold">Thank you for participating!</h3>
            <p className="text-lg">Every quiz makes a difference in building community and sharing knowledge.</p>
          </div>
        )}
      </div>
    </div>
  );

  // Navigation dots
  const NavigationDots = () => (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex space-x-3 rounded-full bg-black/30 px-4 py-2 backdrop-blur">
        {[
          { view: 'celebration', icon: '🎉' },
          { view: 'leaderboard', icon: '🏆' },
          { view: 'prizes', icon: '🎁' },
          { view: 'impact', icon: '💝' },
          { view: 'stats', icon: '📊' }
        ].map(({ view, icon }) => (
          <button
            key={view}
            onClick={() => setCurrentView(view as any)}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs transition-all duration-200 ${
              currentView === view ? 'bg-white text-black' : 'bg-white/40 hover:bg-white/60 text-white'
            }`}
            title={view.charAt(0).toUpperCase() + view.slice(1)}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {currentView === 'celebration' && renderCelebrationView()}
      {currentView === 'leaderboard' && renderLeaderboardView()}
      {currentView === 'prizes' && renderPrizesView()}
      {currentView === 'impact' && renderImpactView()}
      {currentView === 'stats' && renderEnhancedStats()}
      
      <NavigationDots />
    </div>
  );
};

export default QuizCompletionCelebration;