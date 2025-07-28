//src/components/Quiz/game/EnhancedPlayerLeaderboard.tsx
import React, { useEffect, useState } from 'react';
import { Trophy, Crown, Medal, Award, Star, Sparkles } from 'lucide-react';
import { LeaderboardEntry } from '../types/quiz';
import GlobalExtrasDuringLeaderboard from './GlobalExtrasDuringLeaderboard';

interface EnhancedPlayerLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void;
  currentPlayerId: string;
  cumulativeNegativePoints: number;
  pointsRestored: number;
  // ✅ NEW: Round context props
  isRoundResults?: boolean;
  currentRound?: number;
}

const EnhancedPlayerLeaderboard: React.FC<EnhancedPlayerLeaderboardProps> = ({
  leaderboard,
  availableExtras,
  usedExtras,
  onUseExtra,
  currentPlayerId,
  cumulativeNegativePoints,
  pointsRestored,
  isRoundResults = false,
  currentRound
}) => {
  // ✅ NEW: Celebration state
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinnerBadge, setShowWinnerBadge] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState(0);

  // ✅ NEW: Check if current player won this round
  const currentPlayerPosition = leaderboard.findIndex(p => p.id === currentPlayerId);
  const isRoundWinner = isRoundResults && currentPlayerPosition === 0;
  const isTopThree = currentPlayerPosition >= 0 && currentPlayerPosition <= 2;

  // ✅ NEW: Celebration effects for round results
  useEffect(() => {
    if (!isRoundResults) return;
    
    // Start celebration sequence for round winners
    if (isRoundWinner) {
      setShowConfetti(true);
      setShowWinnerBadge(true);
      setCelebrationPhase(1);

      // Celebration sequence
      const timer1 = setTimeout(() => setCelebrationPhase(2), 1000);
      const timer2 = setTimeout(() => setCelebrationPhase(3), 2000);
      const timer3 = setTimeout(() => {
        setShowConfetti(false);
        setCelebrationPhase(0);
      }, 4000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    } else if (isTopThree) {
      // Smaller celebration for top 3
      setShowWinnerBadge(true);
      const timer = setTimeout(() => setShowWinnerBadge(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isRoundResults, isRoundWinner, isTopThree]);

  // ✅ NEW: Confetti animation component
  const ConfettiOverlay = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className={`absolute w-2 h-2 animate-bounce ${
            ['bg-yellow-400', 'bg-blue-400', 'bg-green-400', 'bg-red-400', 'bg-purple-400'][i % 5]
          }`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            animationDuration: `${2 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );

  // ✅ NEW: Winner badge animation
  const WinnerBadge = () => (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-40">
      <div className={`transform transition-all duration-1000 ${
        celebrationPhase === 1 ? 'scale-150 opacity-100' :
        celebrationPhase === 2 ? 'scale-100 opacity-100' :
        celebrationPhase === 3 ? 'scale-75 opacity-50' :
        'scale-0 opacity-0'
      }`}>
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-8 py-4 rounded-full shadow-2xl flex items-center space-x-3">
          <Crown className="w-8 h-8" />
          <span className="text-2xl font-bold">Round Winner!</span>
          <Crown className="w-8 h-8" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* ✅ NEW: Celebration effects */}
      {showConfetti && <ConfettiOverlay />}
      {showWinnerBadge && isRoundWinner && <WinnerBadge />}

      <div className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-500 ${
        isRoundResults 
          ? 'border-purple-300 shadow-purple-200' 
          : 'border-green-200'
      }`}>
        
        {/* ✅ ENHANCED: Header with round context */}
        <div className={`p-6 border-b ${
          isRoundResults 
            ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200' 
            : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
        }`}>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-2">
              {isRoundResults ? (
                <>
                  <Medal className="w-8 h-8 text-purple-600" />
                  <h2 className="text-2xl font-bold text-purple-900">
                    Round {currentRound} Results
                  </h2>
                  <Medal className="w-8 h-8 text-purple-600" />
                </>
              ) : (
                <>
                  <Trophy className="w-8 h-8 text-yellow-600" />
                  <h2 className="text-2xl font-bold text-green-900">Current Leaderboard</h2>
                </>
              )}
            </div>
            <p className={`${
              isRoundResults ? 'text-purple-700' : 'text-green-700'
            }`}>
              {isRoundResults 
                ? `See how you performed this round!` 
                : 'See how you stack up against other players!'
              }
            </p>
            
            {/* ✅ NEW: Round winner announcement */}
            {isRoundResults && leaderboard.length > 0 && (
              <div className="mt-3 p-3 bg-white/70 rounded-lg">
                <div className="flex items-center justify-center space-x-2">
                  <Crown className="w-5 h-5 text-yellow-600" />
                  <span className="font-semibold text-purple-800">
                    {leaderboard[0].name} won Round {currentRound}!
                  </span>
                  <Sparkles className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="p-6">
          <div className="space-y-3">
            {leaderboard.map((entry, idx) => {
              const isCurrentPlayer = entry.id === currentPlayerId;
              const isWinner = idx === 0;
              
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                    isCurrentPlayer 
                      ? isRoundResults && isWinner
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-lg ring-2 ring-yellow-200' 
                        : 'bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-200'
                      : isRoundResults && isWinner
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-md'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  } ${
                    isRoundResults && idx <= 2 ? 'transform hover:scale-102' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {/* ✅ ENHANCED: Position Badge with better styling for round results */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold relative ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-800 shadow-md' :
                      idx === 1 ? 'bg-gray-100 text-gray-800 shadow-md' :
                      idx === 2 ? 'bg-orange-100 text-orange-800 shadow-md' :
                      'bg-blue-100 text-blue-800'
                    } ${
                      isRoundResults && idx <= 2 ? 'ring-2 ring-offset-1 ' + 
                        (idx === 0 ? 'ring-yellow-300' : idx === 1 ? 'ring-gray-300' : 'ring-orange-300') 
                        : ''
                    }`}>
                      {idx + 1}
                      {/* ✅ NEW: Sparkle effect for round winners */}
                      {isRoundResults && idx === 0 && (
                        <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 animate-pulse" />
                      )}
                    </div>

                    {/* Player Name */}
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${
                        isCurrentPlayer 
                          ? isRoundResults && isWinner 
                            ? 'text-yellow-900' 
                            : 'text-blue-900'
                          : 'text-gray-800'
                      }`}>
                        {entry.name}
                      </span>
                      
                      {/* ✅ ENHANCED: Position Icons with round context */}
                      {idx === 0 && (
                        <div className="flex items-center space-x-1">
                          <Crown className={`w-5 h-5 ${
                            isRoundResults ? 'text-yellow-500 animate-pulse' : 'text-yellow-600'
                          }`} />
                          {isRoundResults && (
                            <Star className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                      )}
                      {idx === 1 && <Medal className="w-5 h-5 text-gray-600" />}
                      {idx === 2 && <Award className="w-5 h-5 text-orange-600" />}
                      
                      {/* Current Player Indicator */}
                      {isCurrentPlayer && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          isRoundResults && isWinner
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          You
                        </span>
                      )}

                      {/* ✅ NEW: Round winner badge */}
                      {isRoundResults && idx === 0 && (
                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 rounded-full text-xs font-bold border border-yellow-300">
                          Round Winner! 🎉
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      isCurrentPlayer 
                        ? isRoundResults && isWinner 
                          ? 'text-yellow-900' 
                          : 'text-blue-900'
                        : 'text-gray-800'
                    }`}>
                      {entry.score} pts
                    </div>
                    {isCurrentPlayer && (cumulativeNegativePoints > 0 || pointsRestored > 0) && (
                      <div className={`text-xs ${
                        isRoundResults ? 'text-purple-600' : 'text-blue-600'
                      }`}>
                        {cumulativeNegativePoints > 0 && <div>Lost: -{cumulativeNegativePoints}</div>}
                        {pointsRestored > 0 && <div>Restored: +{pointsRestored}</div>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ✅ ENHANCED: Position Summary with round context */}
          {leaderboard.length > 0 && (
            <div className={`mt-6 p-4 rounded-lg border ${
              isRoundResults 
                ? currentPlayerPosition === 0
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                  : currentPlayerPosition <= 2
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-purple-50 border-purple-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="text-center">
                <div className={`text-sm mb-1 ${
                  isRoundResults ? 'text-purple-700' : 'text-blue-700'
                }`}>
                  {isRoundResults 
                    ? `Your Round ${currentRound} Position` 
                    : 'Your Current Position'
                  }
                </div>
                <div className={`text-2xl font-bold ${
                  isRoundResults 
                    ? currentPlayerPosition === 0 
                      ? 'text-yellow-900' 
                      : 'text-purple-900'
                    : 'text-blue-900'
                }`}>
                  {currentPlayerPosition + 1 || '?'}
                  <span className={`text-lg ${
                    isRoundResults ? 'text-purple-700' : 'text-blue-700'
                  }`}> out of {leaderboard.length}</span>
                </div>
                
                {/* ✅ NEW: Different messages for round vs overall */}
                {isRoundResults ? (
                  currentPlayerPosition === 0 ? (
                    <div className="text-sm text-yellow-700 mt-1 flex items-center justify-center space-x-1">
                      <Crown className="w-4 h-4" />
                      <span>You won this round! 🎉</span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  ) : currentPlayerPosition <= 2 ? (
                    <div className="text-sm text-purple-600 mt-1 flex items-center justify-center space-x-1">
                      <Star className="w-4 h-4" />
                      <span>Great job this round!</span>
                    </div>
                  ) : (
                    <div className="text-sm text-purple-600 mt-1">
                      Keep it up for the next round!
                    </div>
                  )
                ) : (
                  currentPlayerPosition === 0 && (
                    <div className="text-sm text-blue-600 mt-1 flex items-center justify-center space-x-1">
                      <Crown className="w-4 h-4" />
                      <span>You're in the lead!</span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>

        {/* ✅ CONDITIONAL: Only show Global Extras for overall leaderboard */}
        {!isRoundResults && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <GlobalExtrasDuringLeaderboard
              availableExtras={availableExtras}
              usedExtras={usedExtras}
              onUseExtra={onUseExtra}
              leaderboard={leaderboard}
              currentPlayerId={currentPlayerId}
              cumulativeNegativePoints={cumulativeNegativePoints}
              pointsRestored={pointsRestored}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedPlayerLeaderboard;