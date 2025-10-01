import React from 'react';
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
  /** e.g. 'web3' | 'cash_or_revolut' | ... */
  paymentMethod?: string;
  /** enable debug block */
  debug?: boolean;
  onReturnToDashboard?: () => void;
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
}) => {
  const isComplete = phase === 'complete';
  const isDistributing = phase === 'distributing_prizes';
  const showPrizeRouter = isComplete && paymentMethod === 'web3';

  if (!(isComplete || isDistributing)) return null;

  return (
    <div className="space-y-6">
      {/* Distributing state */}
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
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <>
          <div className="mb-6 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-8 text-center">
            <div className="mb-4 text-6xl">🎉</div>
            <h2 className="mb-2 text-3xl font-bold text-purple-800">Quiz Complete!</h2>
            <p className="text-lg text-purple-600">
              Thank you for hosting this amazing quiz experience!
            </p>

            {/* Web3 Prize Distribution */}
            {showPrizeRouter && (
              <div className="mt-6">
                <Web3PrizeDistributionRouter roomId={roomId} leaderboard={leaderboard} />
              </div>
            )}
          </div>

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

          {/* Debug block (optional) */}
          {debug && (
            <div className="mb-4 rounded-lg bg-yellow-100 p-4">
              <h4 className="font-semibold text-yellow-800">🐛 Final Stats Debug</h4>
              <div className="text-sm text-yellow-700">
                <div>Phase: {phase}</div>
                <div>hasFinalStats: {hasFinalStats ? '✅' : '❌'}</div>
                <div>allRoundsStats length: {allRoundsStats.length}</div>
                <div>allRoundsStats: {JSON.stringify(allRoundsStats, null, 2)}</div>
              </div>
            </div>
          )}

          {/* Final Stats */}
          {(hasFinalStats || allRoundsStats.length > 0) && (
            <FinalQuizStats
              allRoundsStats={allRoundsStats}
              totalPlayers={totalPlayers || 0}
              isVisible={true}
            />
          )}

          {/* Fallback if no stats */}
          {!hasFinalStats && allRoundsStats.length === 0 && (
            <div className="mb-6 rounded-xl bg-blue-50 p-6 text-center">
              <div className="mb-2 text-blue-600">📊</div>
              <h3 className="mb-2 text-lg font-bold text-blue-800">No Statistics Available</h3>
              <p className="text-blue-600">
                Final quiz statistics are not yet available. They may still be loading.
              </p>
            </div>
          )}

          {/* Return CTA */}
          <div className="text-center">
            <button
              onClick={onReturnToDashboard}
              className="mx-auto flex items-center space-x-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-700"
            >
              <span>🏠</span>
              <span>Return to Dashboard</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HostPostgamePanel;
