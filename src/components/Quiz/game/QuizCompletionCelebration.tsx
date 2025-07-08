import React, { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Award, Crown, Share2, Home, Users, Target, 
  Twitter, Linkedin, Instagram, Facebook, Copy, Heart,
  DollarSign, TrendingUp, Zap, Gift, CheckCircle
} from 'lucide-react';

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
  // Fundraising data
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

// Enhanced interface for fundraising data
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
  fundraisingData?: FundraisingData; // New prop for financial impact
  isHost?: boolean; // New prop to show host view
  onShareResults: (platform: string, shareText: string) => void;
  onReturnToHome: () => void;
}

const QuizCompletionCelebration: React.FC<QuizCompletionProps> = ({
  leaderboard,
  config,
  playerId,
  roomId,
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

  // Stop confetti after 3 seconds
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

  // Generate share text with fundraising impact
  const generateShareText = (platform: string) => {
    const baseText = `🎯 Just completed an amazing quiz and scored ${playerScore} points!`;
    
    if (!fundraisingData) {
      return `${baseText} #QuizNight #Challenge`;
    }

    const impactText = fundraisingData.totalRaised > 0 
      ? `\n\n💝 Together we raised ${currency}${fundraisingData.totalRaised.toFixed(2)} for charity!`
      : '';
    
    const personalImpact = fundraisingData.playerContribution.personalImpact > 0
      ? `\nMy in-game actions contributed ${currency}${fundraisingData.playerContribution.personalImpact.toFixed(2)} to the cause!`
      : '';

    const hashtags = platform === 'twitter' 
      ? '\n\n#FundraisingQuiz #CharityQuiz #MakingADifference'
      : '\n\nFundraising Quiz | Making a Difference';

    return `${baseText}${impactText}${personalImpact}${hashtags}`;
  };

  // Social share component
  const SocialShareMenu = () => (
    <div className="relative">
      <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="bg-green-500 hover:bg-green-600 text-white px-6 md:px-8 py-3 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
      >
        <Share2 className="w-5 h-5 mr-2" />
        Share Impact
      </button>
      
      {showShareMenu && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-xl border-2 border-gray-200 p-4 z-50 min-w-64">
          <h4 className="font-bold text-gray-800 mb-3">Share your impact:</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                onShareResults('twitter', generateShareText('twitter'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 p-3 bg-blue-400 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              <Twitter className="w-4 h-4" />
              <span>Twitter</span>
            </button>
            <button
              onClick={() => {
                onShareResults('linkedin', generateShareText('linkedin'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Linkedin className="w-4 h-4" />
              <span>LinkedIn</span>
            </button>
            <button
              onClick={() => {
                onShareResults('instagram', generateShareText('instagram'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 p-3 bg-pink-500 hover:bg-pink-600 text-white rounded-lg transition-colors"
            >
              <Instagram className="w-4 h-4" />
              <span>Instagram</span>
            </button>
            <button
              onClick={() => {
                onShareResults('facebook', generateShareText('facebook'));
                setShowShareMenu(false);
              }}
              className="flex items-center space-x-2 p-3 bg-blue-800 hover:bg-blue-900 text-white rounded-lg transition-colors"
            >
              <Facebook className="w-4 h-4" />
              <span>Facebook</span>
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateShareText('copy'));
                setShowShareMenu(false);
              }}
              className="col-span-2 flex items-center justify-center space-x-2 p-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>Copy to Clipboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Confetti Effect
  const ConfettiEffect = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 flex items-center justify-center relative overflow-hidden">
      {confettiActive && <ConfettiEffect />}
      
      <div className="text-center text-white z-10 px-4">
        <div className="text-8xl mb-6 animate-bounce">
          {fundraisingData ? '💝' : '🎉'}
        </div>
        <h1 className="text-4xl md:text-6xl lg:text-8xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-300 to-pink-300">
          {isHost ? 'QUIZ COMPLETE!' : 'AMAZING JOB!'}
        </h1>
        <div className="text-xl md:text-2xl lg:text-3xl font-semibold mb-6">
          {!isHost && playerPosition === 1 && "🏆 CHAMPION! You came 1st!"}
          {!isHost && playerPosition === 2 && "🥈 Amazing! You came 2nd!"}
          {!isHost && playerPosition === 3 && "🥉 Fantastic! You came 3rd!"}
          {!isHost && playerPosition > 3 && `Great job! You finished ${playerPosition}${getOrdinalSuffix(playerPosition)}!`}
          {isHost && "Thank you for hosting this incredible fundraising event!"}
        </div>
        {!isHost && (
          <div className="text-lg md:text-xl mb-8">
            Final Score: <span className="font-bold text-yellow-300">{playerScore} points</span>
          </div>
        )}
        {fundraisingData && fundraisingData.totalRaised > 0 && (
          <div className="text-base md:text-lg opacity-90 bg-white/20 backdrop-blur rounded-xl p-4 mt-6">
            <Heart className="w-6 h-6 mx-auto mb-2 text-red-300" />
            <div className="font-bold text-green-300 text-xl">
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
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">🏆 Final Leaderboard</h2>
          <p className="text-lg md:text-xl text-gray-300">How everyone performed</p>
        </div>
        
        <div className="space-y-4">
          {leaderboard.map((player, index) => (
            <div
              key={player.id}
              className={`p-4 md:p-6 rounded-xl transition-all duration-500 ${
                player.id === playerId 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-xl ring-4 ring-yellow-300' 
                  : 'bg-white/10 backdrop-blur text-white'
              } ${index < 3 ? 'shadow-2xl' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold">{player.name}</h3>
                    {player.id === playerId && <span className="text-sm opacity-80">(You)</span>}
                    {isHost && <span className="text-sm opacity-80">(Host View)</span>}
                  </div>
                  {index === 0 && <Crown className="w-6 h-6 md:w-8 md:h-8 text-yellow-400" />}
                  {index === 1 && <Medal className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />}
                  {index === 2 && <Award className="w-6 h-6 md:w-8 md:h-8 text-orange-400" />}
                </div>
                <div className="text-right">
                  <div className="text-xl md:text-2xl font-bold">{player.score}</div>
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
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">🎁 Prizes & Distribution</h2>
        
        {/* Host Prize Distribution Panel */}
        {isHost && config?.prizes && config.prizes.length > 0 && (
          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8 text-white">
            <h3 className="text-2xl font-bold mb-4">📋 Prize Distribution (Host Panel)</h3>
            <div className="grid gap-4">
              {config.prizes.map((prize, index) => {
                const winner = leaderboard.find(p => 
                  leaderboard.indexOf(p) === prize.place - 1
                );
                return (
                  <div key={index} className="bg-white/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div className="font-bold">
                          {prize.place === 1 ? '🥇' : prize.place === 2 ? '🥈' : '🥉'} 
                          {prize.place}{getOrdinalSuffix(prize.place)} Place: {prize.description}
                        </div>
                        {prize.value && <div className="text-green-300">{currency}{prize.value}</div>}
                        {prize.sponsor && <div className="text-sm opacity-80">Sponsored by {prize.sponsor}</div>}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-yellow-300">
                          {winner ? winner.name : 'No winner'}
                        </div>
                        {winner && (
                          <div className="text-sm opacity-80">
                            Player ID: {winner.id}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Prize distribution method info */}
            <div className="mt-6 p-4 bg-blue-600/30 rounded-lg">
              <h4 className="font-bold mb-2">Distribution Method:</h4>
              <p className="text-sm">
                {config.prizeMode === 'split' && "Automatic via smart contract"}
                {config.prizeMode === 'assets' && "Manual transfer of digital assets"}
                {config.prizeMode === 'cash' && "Manual distribution by host"}
              </p>
            </div>
          </div>
        )}

        {/* Player view of prizes */}
        {!isHost && config?.prizes && config.prizes.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {config.prizes.slice(0, 3).map((prize, index) => (
              <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                <div className="text-4xl mb-4">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                </div>
                <h3 className="text-xl font-bold mb-2">{prize.place}{getOrdinalSuffix(prize.place)} Place</h3>
                <p className="text-lg mb-2">{prize.description}</p>
                {prize.value && prize.value > 0 && (
                  <p className="text-green-300 font-semibold">{currency}{prize.value}</p>
                )}
                {prize.sponsor && (
                  <p className="text-sm opacity-80 mt-2">Sponsored by {prize.sponsor}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Show user's prize if they won */}
        {!isHost && playerPosition <= 3 && config?.prizes?.find(p => p.place === playerPosition) && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-black mb-8">
            <h3 className="text-2xl font-bold mb-2">🎉 You Won!</h3>
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
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">💝 Fundraising Impact</h2>
        <p className="text-lg md:text-xl text-green-200 mb-8">Together we made a difference!</p>
        
        {fundraisingData ? (
          <div className="space-y-6">
            {/* Total Impact */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-8 text-white">
              <div className="text-6xl mb-4">❤️</div>
              <h3 className="text-4xl font-bold mb-2 text-green-300">
                {currency}{fundraisingData.totalRaised.toFixed(2)}
              </h3>
              <p className="text-xl">Total Raised for {config?.web3Charity || 'Charity'}</p>
            </div>

            {/* Breakdown */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                <DollarSign className="w-8 h-8 mx-auto mb-4 text-blue-300" />
                <h4 className="text-2xl font-bold mb-2">{currency}{fundraisingData.totalEntry.toFixed(2)}</h4>
                <p className="text-sm">Entry Fees ({fundraisingData.totalPlayers} players)</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                <Zap className="w-8 h-8 mx-auto mb-4 text-purple-300" />
                <h4 className="text-2xl font-bold mb-2">{currency}{fundraisingData.totalExtras.toFixed(2)}</h4>
                <p className="text-sm">In-Game Extras</p>
              </div>
              
              <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
                <TrendingUp className="w-8 h-8 mx-auto mb-4 text-green-300" />
                <h4 className="text-2xl font-bold mb-2">{currency}{fundraisingData.charityAmount.toFixed(2)}</h4>
                <p className="text-sm">To Charity ({config?.web3PrizeSplit?.charity || 75}%)</p>
              </div>
            </div>

            {/* Personal Impact */}
            {!isHost && fundraisingData.playerContribution.personalImpact > 0 && (
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-black">
                <h3 className="text-2xl font-bold mb-4">🌟 Your Personal Impact</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-xl font-bold">{fundraisingData.playerContribution.extrasUsed}</div>
                    <div className="text-sm">Extras Used</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{currency}{fundraisingData.playerContribution.personalImpact.toFixed(2)}</div>
                    <div className="text-sm">Your Contribution</div>
                  </div>
                </div>
                <p className="text-sm mt-4 opacity-90">
                  Your freeze-outs, point stealing, and extra purchases helped raise funds for charity!
                </p>
              </div>
            )}

            {/* Call to Action */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
              <h4 className="text-xl font-bold mb-4">📢 Share Your Impact</h4>
              <p className="text-sm mb-4">
                Help us spread awareness about this fundraising initiative!
              </p>
              <div className="flex justify-center">
                <SocialShareMenu />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur rounded-xl p-8 text-white">
            <Heart className="w-16 h-16 mx-auto mb-4 text-red-300" />
            <h3 className="text-2xl font-bold mb-4">Thank you for participating!</h3>
            <p className="text-lg">Every quiz makes a difference in building community and sharing knowledge.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderStatsView = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">📊 Final Statistics</h2>
          <p className="text-lg md:text-xl text-gray-300">
            {isHost ? 'Event Overview' : 'Your Performance Summary'}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {!isHost && (
            <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
              <h3 className="text-2xl font-bold mb-4 flex items-center">
                <Target className="w-6 h-6 mr-2" />
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
                {fundraisingData?.playerContribution && (
                  <>
                    <div className="flex justify-between">
                      <span>Extras Used:</span>
                      <span className="font-bold text-purple-300">
                        {fundraisingData.playerContribution.extrasUsed}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Charity Contribution:</span>
                      <span className="font-bold text-green-300">
                        {currency}{fundraisingData.playerContribution.personalImpact.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2" />
              {isHost ? 'Event Statistics' : 'Event Overview'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Total Players:</span>
                <span className="font-bold">{leaderboard.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Host:</span>
                <span className="font-bold">{config?.hostName || 'Quiz Master'}</span>
              </div>
              <div className="flex justify-between">
                <span>Game Type:</span>
                <span className="font-bold">{config?.gameType || 'Quiz'}</span>
              </div>
              {fundraisingData && (
                <div className="flex justify-between">
                  <span>Total Raised:</span>
                  <span className="font-bold text-green-300">
                    {currency}{fundraisingData.totalRaised.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <div className="flex flex-wrap justify-center gap-4">
            <SocialShareMenu />
            <button
              onClick={() => setCurrentView('leaderboard')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 md:px-8 py-3 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
            >
              <Trophy className="w-5 h-5 mr-2" />
              View Leaderboard
            </button>
          </div>
          
          <button
            onClick={onReturnToHome}
            className="bg-gray-600 hover:bg-gray-700 text-white px-6 md:px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center mx-auto"
          >
            <Home className="w-5 h-5 mr-2" />
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );

  // Navigation dots
  const NavigationDots = () => (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="flex space-x-3 bg-black/30 backdrop-blur rounded-full px-4 py-2">
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
            className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center text-xs ${
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
      {currentView === 'stats' && renderStatsView()}
      
      <NavigationDots />
    </div>
  );
};

export default QuizCompletionCelebration;