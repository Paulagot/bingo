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
  maxRestorePoints?: number; // NEW: Accept config as prop
}

// UPDATED: Floating Actions Bar Component with config support
const FloatingExtrasBar: React.FC<{
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void;
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
  cumulativeNegativePoints: number;
  pointsRestored: number;
  maxRestorePoints?: number; // NEW: Accept config
}> = ({ 
  availableExtras, 
  usedExtras, 
  onUseExtra, 
  leaderboard, 
  currentPlayerId, 
  cumulativeNegativePoints, 
  pointsRestored,
  maxRestorePoints // NEW: Pass through to hook
}) => {
  const [robPointsModalOpen, setRobPointsModalOpen] = useState(false);

  // UPDATED: Pass maxRestorePoints to the hook
  const { globalExtras, restorablePoints, robPointsTargets } = useGlobalExtras({
    allPlayerExtras: availableExtras,
    currentPlayerId,
    leaderboard,
    cumulativeNegativePoints,
    pointsRestored,
    usedExtras,
    maxRestorePoints, // FIXED: Pass config instead of accessing room
    debug: false
  });

  // Get actual extra definitions (now pre-filtered by the hook)
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
    // SIMPLIFIED: Since used extras are filtered out at hook level,
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
      // Handle other global extras directly (including restorePoints)
      onUseExtra(extraId);
    }
  };

  const handleRobPointsConfirm = (targetPlayerId: string) => {
    onUseExtra('robPoints', targetPlayerId);
    setRobPointsModalOpen(false);
  };

  // Don't show if no extras available (now filtered at hook level)
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
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transform">
        <div className="bg-muted/95 rounded-full border-2 border-purple-300 px-6 py-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center space-x-3">
            <span className="whitespace-nowrap text-sm font-medium text-purple-700">
              Take Action:
            </span>
            
            {globalExtraDefinitions.map((extra) => {
              const displayInfo = getExtraDisplayInfo(extra.id);
              if (!displayInfo) return null;
              
              // SIMPLIFIED: Since used extras are filtered out, we only need to check
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
                    group relative flex h-12 w-12 transform
                    items-center justify-center rounded-full text-lg transition-all
                    duration-200 hover:scale-110 active:scale-95
                    ${shouldDisable 
                      ? 'cursor-not-allowed bg-gray-200 text-gray-400' 
                      : `bg-gradient-to-r ${displayInfo.color} text-white hover:shadow-lg`
                    }
                  `}
                  title={displayInfo.name}
                >
                  {extra.icon}
                  
                  {/* Targeting indicator */}
                  {displayInfo.needsTarget && !shouldDisable && (
                    <Target className="bg-muted absolute -right-1 -top-1 h-4 w-4 rounded-full p-0.5 text-purple-500" />
                  )}
                  
                  {/* Status indicator for edge cases */}
                  {shouldDisable && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      ✓
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 mb-2 max-w-48 -translate-x-1/2 transform whitespace-nowrap rounded bg-black px-2 py-1 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
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
  currentRound,
  maxRestorePoints // NEW: Accept as prop
}) => {
  // Celebration state
  const [showConfetti, setShowConfetti] = useState(false);
  const [showWinnerBadge, setShowWinnerBadge] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState(0);

  // Check if current player won this round
  const currentPlayerPosition = leaderboard.findIndex(p => p.id === currentPlayerId);
  const isRoundWinner = isRoundResults && currentPlayerPosition === 0;
  const isTopThree = currentPlayerPosition >= 0 && currentPlayerPosition <= 2;

  // Leaderboard display logic - Top 10 + Current Player
  const displayedLeaderboard = useMemo(() => {
    const top10 = leaderboard.slice(0, 10);
    
    // If current player is not in top 10, add them at the end
    if (currentPlayerPosition >= 10) {
      const currentPlayer = leaderboard[currentPlayerPosition];
      return [...top10, currentPlayer];
    }
    
    return top10;
  }, [leaderboard, currentPlayerPosition]);

  // Celebration effects for round results
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

  // Confetti animation component
  const ConfettiOverlay = () => (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className={`absolute h-2 w-2 animate-bounce ${
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

  // Winner badge animation
  const WinnerBadge = () => (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
      <div className={`transform transition-all duration-1000 ${
        celebrationPhase === 1 ? 'scale-150 opacity-100' :
        celebrationPhase === 2 ? 'scale-100 opacity-100' :
        celebrationPhase === 3 ? 'scale-75 opacity-50' :
        'scale-0 opacity-0'
      }`}>
        <div className="flex items-center space-x-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 px-8 py-4 text-white shadow-2xl">
          <Crown className="h-8 w-8" />
          <span className="text-2xl font-bold">Round Winner!</span>
          <Crown className="h-8 w-8" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Celebration effects */}
      {showConfetti && <ConfettiOverlay />}
      {showWinnerBadge && isRoundWinner && <WinnerBadge />}

      {/* NEW: Floating Extras Bar (only show during round results) */}
      {isRoundResults && (
        <FloatingExtrasBar
          availableExtras={availableExtras}
          usedExtras={usedExtras}
          onUseExtra={onUseExtra}
          leaderboard={leaderboard}
          currentPlayerId={currentPlayerId}
          cumulativeNegativePoints={cumulativeNegativePoints}
          pointsRestored={pointsRestored}
          maxRestorePoints={maxRestorePoints} // FIXED: Pass through config
        />
      )}

      <div className={`bg-muted overflow-hidden rounded-xl border-2 shadow-lg transition-all duration-500 ${
        isRoundResults 
          ? 'border-purple-300 shadow-purple-200' 
          : 'border-green-200'
      }`}>
        
        {/* Header with round context */}
        <div className={`border-b p-6 ${
          isRoundResults 
            ? 'border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50' 
            : 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
        }`}>
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center space-x-3">
              {isRoundResults ? (
                <>
                  <Medal className="h-8 w-8 text-purple-600" />
                  <h2 className="text-2xl font-bold text-purple-900">
                    Round {currentRound} Results
                  </h2>
                  <Medal className="h-8 w-8 text-purple-600" />
                </>
              ) : (
                <>
                  <Trophy className="h-8 w-8 text-yellow-600" />
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
            
            {/* Round winner announcement */}
            {isRoundResults && leaderboard.length > 0 && (
              <div className="bg-muted/70 mt-3 rounded-lg p-3">
                <div className="flex items-center justify-center space-x-2">
                  <Crown className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-purple-800">
                    {leaderboard[0].name} won Round {currentRound}!
                  </span>
                  <Sparkles className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="p-6">
          <div className="space-y-3">
            {displayedLeaderboard.map((entry: LeaderboardEntry, displayIdx: number) => {
              const isCurrentPlayer = entry.id === currentPlayerId;
              const actualPosition = leaderboard.findIndex(p => p.id === entry.id);
              const isWinner = actualPosition === 0;
              const isCurrentPlayerOutsideTop10 = currentPlayerPosition >= 10 && isCurrentPlayer;

              // Which debt number to show in this row:
              // - In round results, prefer carryDebt (from the round settlement)
              // - Otherwise, show overall penaltyDebt (carried across rounds)
              const debtToShow =
                (isRoundResults ? (entry.carryDebt ?? entry.penaltyDebt) : (entry.penaltyDebt ?? entry.carryDebt)) ?? 0;
              
              return (
                <div key={entry.id}>
                  {/* Separator for current player if outside top 10 */}
                  {isCurrentPlayerOutsideTop10 && displayIdx === displayedLeaderboard.length - 1 && (
                    <div className="my-4 flex items-center">
                      <div className="flex-1 border-t border-gray-300"></div>
                      <span className="text-fg/60 bg-muted px-3 text-sm">Your Position</span>
                      <div className="flex-1 border-t border-gray-300"></div>
                    </div>
                  )}
                  
                  <div
                    className={`flex items-center justify-between rounded-lg border-2 p-4 transition-all duration-200 ${
                      isCurrentPlayer 
                        ? isRoundResults && isWinner
                          ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-lg ring-2 ring-yellow-200' 
                          : 'border-blue-300 bg-blue-50 shadow-md ring-2 ring-blue-200'
                        : isRoundResults && isWinner
                          ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50 shadow-md'
                          : 'border-border bg-gray-50 hover:bg-gray-100'
                    } ${
                      isRoundResults && actualPosition <= 2 ? 'hover:scale-102 transform' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      {/* Position Badge using actual position */}
                      <div className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        actualPosition === 0 ? 'bg-yellow-100 text-yellow-800 shadow-md' :
                        actualPosition === 1 ? 'text-fg bg-gray-100 shadow-md' :
                        actualPosition === 2 ? 'bg-orange-100 text-orange-800 shadow-md' :
                        'bg-blue-100 text-blue-800'
                      } ${
                        isRoundResults && actualPosition <= 2 ? 'ring-2 ring-offset-1 ' + 
                          (actualPosition === 0 ? 'ring-yellow-300' : actualPosition === 1 ? 'ring-gray-300' : 'ring-orange-300') 
                          : ''
                      }`}>
                        {actualPosition + 1}
                        {/* Sparkle effect for round winners */}
                        {isRoundResults && actualPosition === 0 && (
                          <Sparkles className="absolute -right-1 -top-1 h-4 w-4 animate-pulse text-yellow-500" />
                        )}
                      </div>

                      {/* Player Name */}
                      <div className="flex items-center space-x-2">
                        <span className={`font-semibold ${
                          isCurrentPlayer 
                            ? isRoundResults && isWinner 
                              ? 'text-yellow-900' 
                              : 'text-blue-900'
                            : 'text-fg'
                        }`}>
                          {entry.name}
                        </span>

                        {/* Debt pill */}
                        {debtToShow > 0 && (
                          <span
                             className="ml-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] leading-4 text-gray-700"
                              title={isRoundResults ? 'Unpaid round debt' : 'Unpaid penalty debt'}
                            >
                              Debt {debtToShow}
                            </span>
                          )}
                        
                        {/* Position Icons with round context */}
                        {actualPosition === 0 && (
                          <div className="flex items-center space-x-1">
                            <Crown className={`h-5 w-5 ${
                              isRoundResults ? 'animate-pulse text-yellow-500' : 'text-yellow-600'
                            }`} />
                            {isRoundResults && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                        )}
                        {actualPosition === 1 && <Medal className="text-fg/70 h-5 w-5" />}
                        {actualPosition === 2 && <Award className="h-5 w-5 text-orange-600" />}
                        
                        {/* Current Player Indicator */}
                        {isCurrentPlayer && (
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                            isRoundResults && isWinner
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            You
                          </span>
                        )}

                        {/* Round winner badge */}
                        {isRoundResults && actualPosition === 0 && (
                          <span className="rounded-full border border-yellow-300 bg-gradient-to-r from-yellow-100 to-orange-100 px-2 py-1 text-xs font-bold text-yellow-800">
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
                          : 'text-fg'
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

          {/* Position Summary with better messaging for top 10 display */}
          {leaderboard.length > 0 && (
            <div className={`mt-6 rounded-lg border p-4 ${
              isRoundResults 
                ? currentPlayerPosition === 0
                  ? 'border-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50'
                  : currentPlayerPosition <= 2
                    ? 'border-purple-200 bg-purple-50'
                    : 'border-purple-200 bg-purple-50'
                : 'border-blue-200 bg-blue-50'
            }`}>
              <div className="text-center">
                <div className={`mb-1 text-sm ${
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
                
                {/* Show if displaying limited view */}
                {leaderboard.length > 10 && (
                  <div className={`mt-1 text-xs ${
                    isRoundResults ? 'text-purple-600' : 'text-blue-600'
                  }`}>
                    {currentPlayerPosition >= 10 
                      ? 'Showing top 10 + your position'
                      : 'Showing top 10 players'
                    }
                  </div>
                )}
                
                {/* Different messages for round vs overall */}
                {isRoundResults ? (
                  currentPlayerPosition === 0 ? (
                    <div className="mt-1 flex items-center justify-center space-x-1 text-sm text-yellow-700">
                      <Crown className="h-4 w-4" />
                      <span>You won this round! 🎉</span>
                      <Sparkles className="h-4 w-4" />
                    </div>
                  ) : currentPlayerPosition <= 2 ? (
                    <div className="mt-1 flex items-center justify-center space-x-1 text-sm text-purple-600">
                      <Star className="h-4 w-4" />
                      <span>Great job this round!</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-purple-600">
                      Keep it up for the next round!
                    </div>
                  )
                ) : (
                  currentPlayerPosition === 0 && (
                    <div className="mt-1 flex items-center justify-center space-x-1 text-sm text-blue-600">
                      <Crown className="h-4 w-4" />
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