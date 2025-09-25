// src/components/Quiz/QuizCompletionCelebration.tsx
// FIXED: Correct import paths based on your folder structure

import React, { useState, useEffect } from 'react';
import { Share2, Twitter, Linkedin, Instagram, Facebook, Copy } from 'lucide-react';

// FIXED: Import screen components from correct paths
import CelebrationScreen from './completion/CelebrationScreen';
import { LeaderboardScreen } from './completion/LeaderboardScreen';
import { PrizesScreen } from './completion/PrizesScreen';
import { ImpactScreen } from './completion/ImpactScreen';
import EnhancedStatsScreen from './completion/EnhancedStatsScreen';

// Import existing types and hooks
import { 
  QuizConfig, 
  LeaderboardEntry, 
  EnhancedPlayerStats 
} from '../types/quiz';
import { useFundraisingData, useQuizPrizes } from '../hooks/useFundraisingData';

interface QuizCompletionProps {
  leaderboard: LeaderboardEntry[];
  config: QuizConfig | null;
  playerId: string;
  roomId: string;
  enhancedStats?: EnhancedPlayerStats | null;
  isHost?: boolean;
  onShareResults: (platform: string, shareText: string) => void;
  onReturnToHome: () => void;
}

const QuizCompletionCelebration: React.FC<QuizCompletionProps> = ({
  leaderboard,
  config,
  playerId,
 
  enhancedStats,
  isHost = false,
  onShareResults,
  onReturnToHome
}) => {
  const [currentView, setCurrentView] = useState<'celebration' | 'leaderboard' | 'prizes' | 'impact' | 'stats'>('celebration');
  const [showShareMenu, setShowShareMenu] = useState(false);
  
  // Use existing hooks
  const fundraisingData = useFundraisingData(playerId);
  const prizes = useQuizPrizes();
  
  // Calculate derived values
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

  // Social share component (extracted for reuse)
  const SocialShareMenu: React.FC = () => (
    <div className="relative">
      {/* <button
        onClick={() => setShowShareMenu(!showShareMenu)}
        className="flex items-center rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-white shadow-lg transition-all duration-200 hover:bg-green-600 hover:shadow-xl md:px-8"
      >
        <Share2 className="mr-2 h-5 w-5" />
        Share Results
      </button> */}
      
      {/* {showShareMenu && (
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
      )} */}
    </div>
  );

  // Navigation dots component
  const NavigationDots: React.FC = () => (
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

  // Render the appropriate screen based on current view
  const renderCurrentScreen = () => {
    switch (currentView) {
      case 'celebration':
        return (
          <CelebrationScreen
            leaderboard={leaderboard}
            config={config}
            playerId={playerId}
            playerPosition={playerPosition}
            playerScore={playerScore}
            isHost={isHost}
            fundraisingData={fundraisingData}
            currency={currency}
          />
        );
      
      case 'leaderboard':
        return <LeaderboardScreen leaderboard={leaderboard} playerId={playerId} />;
      
      case 'prizes':
        return (
          <PrizesScreen
            config={config}
            playerPosition={playerPosition}
            isHost={isHost}
            prizes={prizes}
            currency={currency}
          />
        );
      
      case 'impact':
        return (
          <ImpactScreen
            config={config}
            fundraisingData={fundraisingData}
            isHost={isHost}
            currency={currency}
          />
        );
      
      case 'stats':
        return (
          <EnhancedStatsScreen
            enhancedStats={enhancedStats ?? null}
            config={config}
            leaderboard={leaderboard}
            playerId={playerId}
            playerPosition={playerPosition}
            playerScore={playerScore}
            onShareResults={onShareResults}
            onReturnToHome={onReturnToHome}
           setCurrentView={(view) => setCurrentView(view as 'celebration' | 'leaderboard' | 'prizes' | 'impact' | 'stats')}
            SocialShareMenu={SocialShareMenu}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      {renderCurrentScreen()}
      <NavigationDots />
    </div>
  );
};

export default QuizCompletionCelebration;