//src/components/Quiz/game/EnhancedPlayerLeaderboard.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Trophy, Crown, Medal, Award, Star, Sparkles, Target
} from 'lucide-react';
import { LeaderboardEntry } from '../types/quiz';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import { useGlobalExtras } from '../hooks/useGlobalExtras';
import UseExtraModal from './UseExtraModal';

interface EnhancedPlayerLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void;
  currentPlayerId: string;
  cumulativeNegativePoints: number;
  pointsRestored: number;
  isRoundResults?: boolean;
  currentRound?: number;
}

// ✅ UPDATED: Floating Actions Bar Component with consistent filtering
const FloatingExtrasBar: React.FC<{
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void;
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
  cumulativeNegativePoints: number;
  pointsRestored: number;
}> = ({ availableExtras, usedExtras, onUseExtra, leaderboard, currentPlayerId, cumulativeNegativePoints, pointsRestored }) => {
  const [robPointsModalOpen, setRobPointsModalOpen] = useState(false);

  // ✅ UPDATED: Pass usedExtras to the hook for consistent filtering
  const { globalExtras, restorablePoints, robPointsTargets } = useGlobalExtras({
    allPlayerExtras: availableExtras,
    currentPlayerId,
    leaderboard,
    cumulativeNegativePoints,
    pointsRestored,
    usedExtras, // ✅ NEW: Pass usedExtras for filtering
    debug: false
  });

  // ✅ Get actual extra definitions (now pre-filtered by the hook)
  const globalExtraDefinitions = globalExtras.map(extraId => 
    fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions]
  ).filter(Boolean);

  // Helper function to get display info for each extra
  const getExtraDisplayInfo = (extraId: string) => {
    const definition = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
    if (!definition) return null;

    const colorMap: Record<string, string> = {
      'buyHint': 'from-yellow-500 to-orange-500',
      'restorePoints': 'from-green-500 to-emerald-500', 
      'robPoints': 'from-red-500 to-pink-500',
      'freezeOutTeam': 'from-blue-500 to-cyan-500'
    };

    const needsTarget = extraId === 'robPoints' || extraId === 'freezeOutTeam';

    return {
      id: extraId,
      name: definition.label,
      icon: definition.icon,
      description: definition.description,
      needsTarget,
      color: colorMap[extraId] || 'from-purple-500 to-pink-500'
    };
  };

  const handleExtraClick = (extraId: string) => {
    // ✅ SIMPLIFIED: Since used extras are filtered out at hook level,
    // we only need special validation for edge cases
    if (extraId === 'robPoints') {
      if (robPointsTargets.length === 0) {
        alert('No players have enough points to rob from (need 2+ points)');
        return;
      }
      setRobPointsModalOpen(true);
    } else if (extraId === 'freezeOutTeam') {
      if (leaderboard.filter(p => p.id !== currentPlayerId).length === 0) {
        alert('No other players to target');
        return;
      }
      onUseExtra(extraId);
    } else {
      // ✅ Handle other global extras directly (including restorePoints)
      onUseExtra(extraId);
    }
  };

  const handleRobPointsConfirm = (targetPlayerId: string) => {
    onUseExtra('robPoints', targetPlayerId);
    setRobPointsModalOpen(false);
  };

  // ✅ Don't show if no extras available (now filtered at hook level)
  if (globalExtraDefinitions.length === 0) return null;

  return (
    <>
      <UseExtraModal
        visible={robPointsModalOpen}
        players={robPointsTargets}
        onCancel={() => setRobPointsModalOpen(false)}
        onConfirm={handleRobPointsConfirm}
        extraType="robPoints"
      />

      {/* Floating Actions Bar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
        <div className="bg-white/95 backdrop-blur-sm border-2 border-purple-300 rounded-full shadow-xl px-6 py-4">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium text-purple-700 whitespace-nowrap">
              Take Action:
            </span>
            
            {globalExtraDefinitions.map((extra) => {
              const displayInfo = getExtraDisplayInfo(extra.id);
              if (!displayInfo) return null;
              
              // ✅ SIMPLIFIED: Since used extras are filtered out, we only need to check
              // for edge cases like no eligible targets
              const isRobPoints = extra.id === 'robPoints';
              const noEligibleTargets = isRobPoints && robPointsTargets.length === 0;
              const shouldDisable = noEligibleTargets;
              
              return (
                <button
                  key={extra.id}
                  onClick={() => handleExtraClick(extra.id)}
                  disabled={shouldDisable}
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-200 transform hover:scale-110 active:scale-95
                    relative group text-lg
                    ${shouldDisable 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : `bg-gradient-to-r ${displayInfo.color} text-white hover:shadow-lg`
                    }
                  `}
                  title={displayInfo.name}
                >
                  {extra.icon}
                  
                  {/* Targeting indicator */}
                  {displayInfo.needsTarget && !shouldDisable && (
                    <Target className="absolute -top-1 -right-1 w-4 h-4 bg-white text-purple-500 rounded-full p-0.5" />
                  )}
                  
                  {/* Status indicator for edge cases */}
                  {shouldDisable && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                      ✓
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap max-w-48 text-center">
                    <div className="font-medium">{displayInfo.name}</div>
                    {extra.id === 'restorePoints' && (
                      <div className="text-xs text-gray-300">{restorablePoints} available</div>
                    )}
                    {displayInfo.needsTarget && !shouldDisable && (
                      <div className="text-xs text-gray-300">Click to target</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

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
  // ✅ EXISTING: Celebration state
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinnerBadge, setShowWinnerBadge] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState(0);

  // ✅ EXISTING: Check if current player won this round
  const currentPlayerPosition = leaderboard.findIndex(p => p.id === currentPlayerId);
  const isRoundWinner = isRoundResults && currentPlayerPosition === 0;
  const isTopThree = currentPlayerPosition >= 0 && currentPlayerPosition <= 2;

  // ✅ NEW: Leaderboard display logic - Top 10 + Current Player
  const displayedLeaderboard = useMemo(() => {
    const top10 = leaderboard.slice(0, 10);
    
    // If current player is not in top 10, add them at the end
    if (currentPlayerPosition >= 10) {
      const currentPlayer = leaderboard[currentPlayerPosition];
      return [...top10, currentPlayer];
    }
    
    return top10;
  }, [leaderboard, currentPlayerPosition]);

  // ✅ EXISTING: Celebration effects for round results
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

  // ✅ EXISTING: Confetti animation component
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

  // ✅ EXISTING: Winner badge animation
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
      {/* ✅ EXISTING: Celebration effects */}
      {showConfetti && <ConfettiOverlay />}
      {showWinnerBadge && isRoundWinner && <WinnerBadge />}

      {/* ✅ NEW: Floating Extras Bar (only show during round results) */}
      {isRoundResults && (
        <FloatingExtrasBar
          availableExtras={availableExtras}
          usedExtras={usedExtras}
          onUseExtra={onUseExtra}
          leaderboard={leaderboard}
          currentPlayerId={currentPlayerId}
          cumulativeNegativePoints={cumulativeNegativePoints}
          pointsRestored={pointsRestored}
        />
      )}

      <div className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-500 ${
        isRoundResults 
          ? 'border-purple-300 shadow-purple-200' 
          : 'border-green-200'
      }`}>
        
        {/* ✅ EXISTING: Header with round context */}
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
            
            {/* ✅ EXISTING: Round winner announcement */}
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

        {/* ✅ EXISTING: Leaderboard */}
        <div className="p-6">
          <div className="space-y-3">
            {displayedLeaderboard.map((entry: LeaderboardEntry, displayIdx: number) => {
              const isCurrentPlayer = entry.id === currentPlayerId;
              const actualPosition = leaderboard.findIndex(p => p.id === entry.id);
              const isWinner = actualPosition === 0;
              const isCurrentPlayerOutsideTop10 = currentPlayerPosition >= 10 && isCurrentPlayer;
              
              return (
                <div key={entry.id}>
                  {/* ✅ NEW: Separator for current player if outside top 10 */}
                  {isCurrentPlayerOutsideTop10 && displayIdx === displayedLeaderboard.length - 1 && (
                    <div className="flex items-center my-4">
                      <div className="flex-1 border-t border-gray-300"></div>
                      <span className="px-3 text-sm text-gray-500 bg-white">Your Position</span>
                      <div className="flex-1 border-t border-gray-300"></div>
                    </div>
                  )}
                  
                  <div
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
                      isCurrentPlayer 
                        ? isRoundResults && isWinner
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300 shadow-lg ring-2 ring-yellow-200' 
                          : 'bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-200'
                        : isRoundResults && isWinner
                          ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200 shadow-md'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    } ${
                      isRoundResults && actualPosition <= 2 ? 'transform hover:scale-102' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* ✅ UPDATED: Position Badge using actual position */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold relative ${
                        actualPosition === 0 ? 'bg-yellow-100 text-yellow-800 shadow-md' :
                        actualPosition === 1 ? 'bg-gray-100 text-gray-800 shadow-md' :
                        actualPosition === 2 ? 'bg-orange-100 text-orange-800 shadow-md' :
                        'bg-blue-100 text-blue-800'
                      } ${
                        isRoundResults && actualPosition <= 2 ? 'ring-2 ring-offset-1 ' + 
                          (actualPosition === 0 ? 'ring-yellow-300' : actualPosition === 1 ? 'ring-gray-300' : 'ring-orange-300') 
                          : ''
                      }`}>
                        {actualPosition + 1}
                        {/* ✅ EXISTING: Sparkle effect for round winners */}
                        {isRoundResults && actualPosition === 0 && (
                          <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 animate-pulse" />
                        )}
                      </div>

                      {/* ✅ EXISTING: Player Name */}
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
                        
                        {/* ✅ EXISTING: Position Icons with round context */}
                        {actualPosition === 0 && (
                          <div className="flex items-center space-x-1">
                            <Crown className={`w-5 h-5 ${
                              isRoundResults ? 'text-yellow-500 animate-pulse' : 'text-yellow-600'
                            }`} />
                            {isRoundResults && (
                              <Star className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        )}
                        {actualPosition === 1 && <Medal className="w-5 h-5 text-gray-600" />}
                        {actualPosition === 2 && <Award className="w-5 h-5 text-orange-600" />}
                        
                        {/* ✅ EXISTING: Current Player Indicator */}
                        {isCurrentPlayer && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isRoundResults && isWinner
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            You
                          </span>
                        )}

                        {/* ✅ EXISTING: Round winner badge */}
                        {isRoundResults && actualPosition === 0 && (
                          <span className="px-2 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 rounded-full text-xs font-bold border border-yellow-300">
                            Round Winner! 🎉
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ✅ EXISTING: Score */}
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
                </div>
              );
            })}
          </div>

          {/* ✅ ENHANCED: Position Summary with better messaging for top 10 display */}
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
                
                {/* ✅ NEW: Show if displaying limited view */}
                {leaderboard.length > 10 && (
                  <div className={`text-xs mt-1 ${
                    isRoundResults ? 'text-purple-600' : 'text-blue-600'
                  }`}>
                    {currentPlayerPosition >= 10 
                      ? 'Showing top 10 + your position'
                      : 'Showing top 10 players'
                    }
                  </div>
                )}
                
                {/* ✅ EXISTING: Different messages for round vs overall */}
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
      </div>
    </div>
  );
};

export default EnhancedPlayerLeaderboard;