// HostPostgamePanel.tsx
import React, { useEffect } from 'react';
import { Loader, Trophy, Crown, Medal, Award } from 'lucide-react';
import FinalQuizStats from '../components/FinalQuizStats';
import { Web3PrizeDistributionRouter } from '../prizes/Web3PrizeDistributionRouter';

type Phase =
  | 'waiting'
  | 'launched'
  | 'asking'
  | 'reviewing'
  | 'leaderboard'
  | 'complete'
  | 'distributing_prizes'
  | 'tiebreaker';

type LeaderboardEntry = {
  id: string;
  name: string;
  score: number;
  cumulativeNegativePoints?: number;
  pointsRestored?: number;
};

interface HostPostgamePanelProps {
  phase: Phase;
  leaderboard: LeaderboardEntry[];
  totalPlayers: number;
  hasFinalStats: boolean;
  allRoundsStats: any[];
  roomId: string;
  paymentMethod?: string; // 'web3' | 'cash_or_revolut' | ...
  debug?: boolean;
  onReturnToDashboard?: () => void;
  onPhaseChange?: (p: Phase) => void;

  // 🆕 NEW: callback to trigger cleanup/end game
  onEndGame?: () => void;

  // 🆕 NEW: current/total rounds to prevent showing post-game during intermediate rounds
  currentRound?: number;
  totalRounds?: number;
}

const HostPostgamePanel: React.FC<HostPostgamePanelProps> = ({
  phase,
  leaderboard,
  totalPlayers,
  hasFinalStats,
  allRoundsStats,
  roomId,
  paymentMethod,
  debug = false,
  onReturnToDashboard,
  onPhaseChange,
  onEndGame, // 🆕 NEW
  currentRound,
  totalRounds,
}) => {
  const isComplete = phase === 'complete';
  const isDistributing = phase === 'distributing_prizes';
  const isWeb3Flow = paymentMethod === 'web3';

  // 🆕 SAFEGUARD: Only show post-game panel if we're on the final round
  const isFinalRound = currentRound && totalRounds && currentRound >= totalRounds;

  // Debug logging to understand why safeguard might not be working
  if (debug && (isComplete || isDistributing)) {
    console.log('[HostPostgamePanel] Phase check:', {
      phase,
      currentRound,
      totalRounds,
      isFinalRound,
      isComplete,
      isDistributing,
      willHide: !isFinalRound,
    });
  }

  // If phase says "complete" but we're not on final round, don't show this panel
  // This prevents stale phase state from showing post-game UI during intermediate rounds
  if ((isComplete || isDistributing) && !isFinalRound) {
    console.warn('[HostPostgamePanel] Phase is complete/distributing but not on final round. Hiding post-game panel.', {
      phase,
      currentRound,
      totalRounds,
      isFinalRound,
    });
    return null;
  }

  // 🆕 NEW: Track when prizes are successfully distributed
  const [prizeDistributionComplete, setPrizeDistributionComplete] = React.useState(false);

  // 🆕 NEW: Auto-cleanup after successful prize distribution
  useEffect(() => {
    if (!prizeDistributionComplete || !isWeb3Flow) return;
    
    console.log('🎯 Prizes distributed successfully. Starting cleanup timer...');
    
    // Wait 60 seconds (1 minute) before triggering cleanup
    const cleanupTimer = setTimeout(() => {
      console.log('🧹 Triggering end game cleanup...');
      onEndGame?.();
    }, 60000); // 60,000ms = 1 minute
    
    // Cleanup timer if component unmounts
    return () => clearTimeout(cleanupTimer);
  }, [prizeDistributionComplete, isWeb3Flow, onEndGame]);

  if (!(isComplete || isDistributing)) return null;

  return (
    <div className="space-y-6">
      {/* 
        🔴 REMOVED: Prize distribution from top 
        (it was here before, around line 77-89)
      */}

      {/* Distributing state banner */}
      {isDistributing && (
        <div className="mb-6 rounded-xl border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-8 text-center">
          <div className="mb-4 text-6xl">💰</div>
          <h2 className="mb-2 text-3xl font-bold text-orange-800">Distributing Prizes...</h2>
          <p className="text-lg text-orange-600">
            Please wait while prizes are sent to winners via smart contract
          </p>
          <div className="mt-4">
            <Loader className="mx-auto h-8 w-8 animate-spin text-orange-600" />
          </div>

          {/* Escape hatch */}
          <button
            className="mt-6 rounded-lg border border-orange-300 bg-white/70 px-4 py-2 text-orange-700 hover:bg-white"
            onClick={() => onPhaseChange?.('complete')}
          >
            Cancel & Return to Results
          </button>
        </div>
      )}

      {/* Complete state banner */}
      {isComplete && (
        <div className="mb-6 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-8 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h2 className="mb-2 text-3xl font-bold text-purple-800">Quiz Complete!</h2>
          <p className="text-lg text-purple-600">
            {isWeb3Flow 
              ? 'Complete the prize distribution below!' 
              : 'Thank you for hosting this amazing quiz experience!'}
          </p>
        </div>
      )}

      {/* Final Leaderboard */}
      {isComplete && leaderboard.length > 0 && (
        <div className="bg-muted mb-6 rounded-xl border-2 border-green-200 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-center">
            <h3 className="text-fg flex items-center space-x-2 text-2xl font-bold">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <span>Final Quiz Results</span>
            </h3>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-green-50 to-blue-50 p-6">
            <div className="mb-4 text-center">
              <h4 className="mb-2 text-xl font-bold text-green-800">🏆 Final Rankings</h4>
              <p className="text-green-600">Congratulations to all participants!</p>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.id}
                  className="bg-muted flex items-center justify-between rounded-lg border-2 p-4 shadow-sm"
                >
                  <div className="flex items-center space-x-4">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${
                        idx === 0
                          ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-400'
                          : idx === 1
                          ? 'text-fg bg-gray-100 ring-2 ring-gray-400'
                          : idx === 2
                          ? 'bg-orange-100 text-orange-800 ring-2 ring-orange-400'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-lg font-semibold">{entry.name}</span>
                    {idx === 0 && <Crown className="h-6 w-6 text-yellow-600" />}
                    {idx === 1 && <Medal className="text-fg/70 h-6 w-6" />}
                    {idx === 2 && <Award className="h-6 w-6 text-orange-600" />}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-700">{entry.score} pts</div>
                    {(entry.cumulativeNegativePoints || 0) > 0 && (
                      <div className="text-sm text-gray-600">
                        -{entry.cumulativeNegativePoints || 0} penalties
                      </div>
                    )}
                    {(entry.pointsRestored || 0) > 0 && (
                      <div className="text-sm text-purple-600">
                        +{entry.pointsRestored || 0} restored
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Debug */}
      {debug && (
        <div className="mb-4 rounded-lg bg-yellow-100 p-4">
          <h4 className="font-semibold text-yellow-800">🐛 Final Stats Debug</h4>
          <div className="text-sm text-yellow-700">
            <div>Phase: {phase}</div>
            <div>hasFinalStats: {hasFinalStats ? '✅' : '❌'}</div>
            <div>allRoundsStats length: {allRoundsStats.length}</div>
            <div>Web3 Flow: {isWeb3Flow ? '✅' : '❌'}</div>
            <div>Prize Distribution Complete: {prizeDistributionComplete ? '✅' : '❌'}</div>
          </div>
        </div>
      )}

      {/* Final Stats */}
      {(isComplete && (hasFinalStats || allRoundsStats.length > 0)) && (
        <FinalQuizStats allRoundsStats={allRoundsStats} totalPlayers={totalPlayers || 0} isVisible />
      )}

      {/* Fallback if no stats */}
      {isComplete && !hasFinalStats && allRoundsStats.length === 0 && (
        <div className="mb-6 rounded-xl bg-blue-50 p-6 text-center">
          <div className="mb-2 text-blue-600">📊</div>
          <h3 className="mb-2 text-lg font-bold text-blue-800">No Statistics Available</h3>
          <p className="text-blue-600">
            Final quiz statistics are not yet available. They may still be loading.
          </p>
        </div>
      )}

      {/* 
        🟢 MOVED: Web3 Prize Distribution - NOW AT THE BOTTOM 
        Only shows for web3 payment method
      */}
      {isWeb3Flow && (isComplete || isDistributing) && (
        <div className="mt-8 border-t-4 border-green-300 pt-6">
          <Web3PrizeDistributionRouter
            roomId={roomId}
            leaderboard={leaderboard}
            onStatusChange={(status) => {
              console.log('🎯 Prize Router Status:', status);
              
              // Move phase based on router status
              if (status === 'running') {
                onPhaseChange?.('distributing_prizes');
              }
              
              if (status === 'success') {
                onPhaseChange?.('complete');
                // 🆕 Mark distribution as complete to trigger cleanup timer
                setPrizeDistributionComplete(true);
              }
              
              if (status === 'idle' || status === 'failed') {
                onPhaseChange?.('complete');
              }
            }}
          />
        </div>
      )}

      {/* 
        🔴 CONDITIONAL: Return to Dashboard button
        Only shows for NON-web3 flows
      */}
      {!isWeb3Flow && isComplete && (
        <div className="mt-8 text-center">
          <button
            onClick={onReturnToDashboard}
            className="mx-auto flex items-center space-x-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
          >
            <span>🏠</span>
            <span>Return to Dashboard</span>
          </button>
        </div>
      )}

      {/* 
        🆕 NEW: Auto-cleanup countdown for web3 flows 
        Shows after successful prize distribution
      */}
      {isWeb3Flow && prizeDistributionComplete && (
        <div className="mt-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mb-2 text-4xl">⏳</div>
          <h3 className="mb-2 text-lg font-bold text-blue-800">
            Prizes Distributed Successfully!
          </h3>
          <p className="text-sm text-blue-600">
            This quiz will automatically clean up in 60 seconds...
          </p>
          <button
            onClick={onEndGame}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            End Game Now
          </button>
        </div>
      )}
    </div>
  );
};

export default HostPostgamePanel;

