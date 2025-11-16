// HostPostgamePanel.tsx
import React, { useEffect } from 'react';
import { Trophy, Crown, Medal, Award } from 'lucide-react';
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
  onPhaseChange?: (p: Phase) => void; // kept for compatibility, but not used now

  // callback to trigger cleanup/end game
  onEndGame?: () => void;

  // current/total rounds to prevent showing post-game during intermediate rounds
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
  // onPhaseChange, // intentionally not used to avoid phase-driven auto behaviour
  onEndGame,
  currentRound,
  totalRounds,
}) => {
  const isComplete = phase === 'complete';
  const isDistributing = phase === 'distributing_prizes';
  const isWeb3Flow = paymentMethod === 'web3';

  // Only show post-game panel if we're on the final round
  const isFinalRound =
    typeof currentRound === 'number' &&
    typeof totalRounds === 'number' &&
    currentRound >= totalRounds;

  if (debug && (isComplete || isDistributing)) {
    console.log('[HostPostgamePanel] Phase check:', {
      phase,
      currentRound,
      totalRounds,
      isFinalRound,
      isComplete,
      isDistributing,
      willHide: !(isComplete || isDistributing) || !isFinalRound,
    });
  }

  // If phase says "complete" or "distributing_prizes" but we're not on final round, don't show this panel
  if ((isComplete || isDistributing) && !isFinalRound) {
    console.warn(
      '[HostPostgamePanel] Phase is complete/distributing but not on final round. Hiding post-game panel.',
      { phase, currentRound, totalRounds, isFinalRound }
    );
    return null;
  }

  // Only render for post-game phases
  if (!(isComplete || isDistributing)) return null;

  // Track when prizes are successfully distributed (Web3 only)
  const [prizeDistributionComplete, setPrizeDistributionComplete] = React.useState(false);

  // Auto-cleanup after successful prize distribution (Web3 only)
  useEffect(() => {
    if (!prizeDistributionComplete || !isWeb3Flow) return;

    console.log('🎯 Prizes distributed successfully. Starting cleanup timer...');

    const cleanupTimer = setTimeout(() => {
      console.log('🧹 Triggering end game cleanup...');
      onEndGame?.();
    }, 60000); // 60 seconds

    return () => clearTimeout(cleanupTimer);
  }, [prizeDistributionComplete, isWeb3Flow, onEndGame]);

  return (
    <div className="space-y-6">
      {/* Complete state banner (only when phase === complete) */}
      {isComplete && (
        <div className="mb-6 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-8 text-center">
          <div className="mb-4 text-6xl">🎉</div>
          <h2 className="mb-2 text-3xl font-bold text-purple-800">Quiz Complete!</h2>
          <p className="text-lg text-purple-600">
            {isWeb3Flow
              ? 'Review the final results and then distribute prizes via smart contract below.'
              : 'Thank you for hosting this amazing quiz experience!'}
          </p>
        </div>
      )}

      {/* Final Leaderboard */}
      {leaderboard.length > 0 && (
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

      {/* Final Stats – always shown when postgame is visible, if we have them */}
      {(hasFinalStats || allRoundsStats.length > 0) && (
        <FinalQuizStats
          allRoundsStats={allRoundsStats}
          totalPlayers={totalPlayers || 0}
          isVisible
        />
      )}

      {/* Web3 Prize Distribution (EVM + Solana, always on-chain, button-driven) */}
      {isWeb3Flow && (
        <div className="mt-8 border-t-4 border-green-300 pt-6">
          <Web3PrizeDistributionRouter
            roomId={roomId}
            leaderboard={leaderboard}
            onStatusChange={(status) => {
              console.log('🎯 Prize Router Status:', status);

              // IMPORTANT: Do NOT drive distribution from phase.
              // The underlying Web3PrizeDistributionPanel only starts
              // distribution when the host clicks the button.

              // We only care about success here, to start cleanup.
              if (status === 'success') {
                setPrizeDistributionComplete(true);
              }
            }}
          />
        </div>
      )}

      {/* Return to Dashboard button for non-web3 flows */}
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

      {/* Auto-cleanup countdown for web3 flows (after successful on-chain distribution) */}
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




