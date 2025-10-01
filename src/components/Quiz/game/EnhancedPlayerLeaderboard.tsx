//src/components/Quiz/game/EnhancedPlayerLeaderboard.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { 
  Trophy, Crown, Medal, Award, Star, Sparkles, 
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
  maxRestorePoints?: number;
}

// UPDATED: Enhanced FloatingExtrasBar Component with animated power-ups
const FloatingExtrasBar: React.FC<{
  availableExtras: string[];
  usedExtras: Record<string, boolean>;
  onUseExtra: (extraId: string, targetPlayerId?: string) => void;
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
  cumulativeNegativePoints: number;
  pointsRestored: number;
  maxRestorePoints?: number;
}> = ({ 
  availableExtras, 
  usedExtras, 
  onUseExtra, 
  leaderboard, 
  currentPlayerId, 
  cumulativeNegativePoints, 
  pointsRestored,
  maxRestorePoints
}) => {
  const [robPointsModalOpen, setRobPointsModalOpen] = useState(false);

  const { globalExtras, restorablePoints, robPointsTargets } = useGlobalExtras({
    allPlayerExtras: availableExtras,
    currentPlayerId,
    leaderboard,
    cumulativeNegativePoints,
    pointsRestored,
    usedExtras,
    maxRestorePoints,
    debug: false
  });

  // Get actual extra definitions (now pre-filtered by the hook)
  const globalExtraDefinitions = globalExtras.map(extraId => 
    fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions]
  ).filter(Boolean);

  // Helper function to get power-up styling and icon
  const getPowerUpInfo = (extraId: string) => {
    const definition = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
    if (!definition) return null;

    // Map to power-up classes and icons
    const powerUpMap: Record<string, { class: string; icon: string; tooltip: string }> = {
      'buyHint': { 
        class: 'power-up hint', 
        icon: '💡',
        tooltip: 'Buy Hint - Reveal clues'
      },
      'restorePoints': { 
        class: 'power-up restore', 
        icon: '🎯',
        tooltip: `Restore Points - ${restorablePoints} available`
      },
      'robPoints': { 
        class: 'power-up rob', 
        icon: '💰',
        tooltip: 'Rob Points - Steal from others'
      },
      'freezeOutTeam': { 
        class: 'power-up freeze', 
        icon: '❄️',
        tooltip: 'Freeze Opponent - Block their actions'
      }
    };

    return powerUpMap[extraId] || { 
      class: 'power-up', 
      icon: '✨',
      tooltip: definition.label
    };
  };

  const handleExtraClick = (extraId: string) => {
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
      onUseExtra(extraId);
    }
  };

  const handleRobPointsConfirm = (targetPlayerId: string) => {
    onUseExtra('robPoints', targetPlayerId);
    setRobPointsModalOpen(false);
  };

  // Don't show if no extras available
  if (globalExtraDefinitions.length === 0) return null;

  return (
    <>
      {/* Add the power-up styles */}
      <style>{`
        /* Power-up animations - Eye-catching and engaging */
        .floating-power-up {
          width: 60px;
          height: 60px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          border: 2px solid transparent;
          font-size: 24px;
          position: relative;
          /* Attention-grabbing pulse animation */
          animation: powerUpPulse 2s infinite;
        }

        @media (max-width: 640px) {
          .floating-power-up {
            width: 50px;
            height: 50px;
            font-size: 20px;
          }
        }

        /* Multi-layer animations */
        @keyframes powerUpPulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7);
          }
          50% { 
            transform: scale(1.05); 
            box-shadow: 0 0 20px 10px rgba(139, 92, 246, 0);
          }
        }

        @keyframes powerUpBounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-8px); }
          60% { transform: translateY(-4px); }
        }

        @keyframes powerUpGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.5); }
          50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.8), 0 0 30px rgba(139, 92, 246, 0.6); }
        }

        /* Combine pulse and bounce for maximum attention */
        .floating-power-up:not(:disabled) {
          animation: powerUpPulse 2s infinite, powerUpBounce 3s infinite 0.5s;
        }

        /* Power-up specific styles */
        .floating-power-up.hint {
          background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
          color: white;
        }

        .floating-power-up.freeze {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
        }

        .floating-power-up.restore {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }

        .floating-power-up.rob {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
        }

        /* Enhanced hover effects */
        .floating-power-up:hover:not(:disabled) {
          transform: scale(1.2);
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
          animation: powerUpGlow 1s infinite;
        }

        .floating-power-up:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none !important;
          animation: none !important;
          filter: grayscale(50%);
        }

        /* Enhanced tooltip */
        .floating-power-up-tooltip {
          position: absolute;
          bottom: 120%;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          font-weight: 500;
          max-width: 200px;
          text-align: center;
        }

        /* Tooltip arrow */
        .floating-power-up-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #1e293b;
        }

        .floating-power-up:hover .floating-power-up-tooltip {
          opacity: 1;
        }

        /* Floating bar enhancements */
        .enhanced-floating-bar {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          border: 2px solid rgba(139, 92, 246, 0.3);
          border-radius: 25px;
          padding: 16px 24px;
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(255, 255, 255, 0.2);
          animation: floatingBarEntrance 0.5s ease-out;
        }

        @keyframes floatingBarEntrance {
          0% {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        .floating-bar-label {
          color: #7c3aed;
          font-weight: 600;
          font-size: 14px;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        /* Target indicator enhancement */
        .target-indicator {
          position: absolute;
          top: -4px;
          right: -4px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          border: 2px solid white;
          animation: targetPulse 1.5s infinite;
        }

        @keyframes targetPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        /* Disabled state indicator */
        .disabled-indicator {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #64748b;
          color: white;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          border: 2px solid white;
        }
      `}</style>

      <UseExtraModal
        visible={robPointsModalOpen}
        players={robPointsTargets}
        onCancel={() => setRobPointsModalOpen(false)}
        onConfirm={handleRobPointsConfirm}
        extraType="robPoints"
      />

      {/* Enhanced Floating Actions Bar */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transform">
        <div className="enhanced-floating-bar">
          <div className="flex items-center space-x-4">
            <span className="floating-bar-label">
              Take Action:
            </span>
            
            {globalExtraDefinitions.map((extra) => {
              const powerUpInfo = getPowerUpInfo(extra.id);
              if (!powerUpInfo) return null;
              
              const isRobPoints = extra.id === 'robPoints';
              const isFreezeOut = extra.id === 'freezeOutTeam';
              const noEligibleTargets = isRobPoints && robPointsTargets.length === 0;
              const shouldDisable = noEligibleTargets;
              
              return (
                <button
                  key={extra.id}
                  onClick={() => handleExtraClick(extra.id)}
                  disabled={shouldDisable}
                  className={`
                    ${powerUpInfo.class.replace('power-up', 'floating-power-up')}
                    ${shouldDisable ? 'disabled' : ''}
                  `}
                  title={powerUpInfo.tooltip}
                >
                  {powerUpInfo.icon}
                  
                  {/* Enhanced targeting indicator */}
                  {(isRobPoints || isFreezeOut) && !shouldDisable && (
                    <div className="target-indicator">🎯</div>
                  )}
                  
                  {/* Enhanced disabled indicator */}
                  {shouldDisable && (
                    <div className="disabled-indicator">✗</div>
                  )}

                  {/* Enhanced tooltip */}
                  <div className="floating-power-up-tooltip">
                    <div className="font-medium">{powerUpInfo.tooltip}</div>
                    {extra.id === 'restorePoints' && (
                      <div className="text-xs text-gray-300 mt-1">
                        {restorablePoints} points available
                      </div>
                    )}
                    {(isRobPoints || isFreezeOut) && !shouldDisable && (
                      <div className="text-xs text-gray-300 mt-1">
                        Click to target player
                      </div>
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
  maxRestorePoints
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

      {/* Enhanced Floating Extras Bar (only show during round results) */}
      {isRoundResults && (
        <FloatingExtrasBar
          availableExtras={availableExtras}
          usedExtras={usedExtras}
          onUseExtra={onUseExtra}
          leaderboard={leaderboard}
          currentPlayerId={currentPlayerId}
          cumulativeNegativePoints={cumulativeNegativePoints}
          pointsRestored={pointsRestored}
          maxRestorePoints={maxRestorePoints}
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
              // const debtToShow =
              //   (isRoundResults ? (entry.carryDebt ?? entry.penaltyDebt) : (entry.penaltyDebt ?? entry.carryDebt)) ?? 0;
              
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

                        {/* Debt pill
                        {debtToShow > 0 && (
                          <span
                             className="ml-1 rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-[11px] leading-4 text-gray-700"
                              title={isRoundResults ? 'Unpaid round debt' : 'Unpaid penalty debt'}
                            >
                              Debt {debtToShow}
                            </span>
                          )} */}
                        
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
                      <span>You won this round!</span>
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