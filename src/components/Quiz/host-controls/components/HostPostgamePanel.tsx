// src/components/Quiz/host-controls/components/HostPostgamePanel.tsx
import React, { useEffect } from 'react';
import { Trophy, Crown, Medal, Award, Heart } from 'lucide-react';
import FinalQuizStats from '../components/FinalQuizStats';
import { Web3PrizeDistributionRouter } from '../prizes/Web3PrizeDistributionRouter';
import { type PrizeDistributionData } from '../prizes/Web3PrizeDistributionPanel';

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
  paymentMethod?: string;
  debug?: boolean;
  onReturnToDashboard?: () => void;
  onPhaseChange?: (p: Phase) => void;
  onEndGame?: () => void;
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
  onEndGame,
  currentRound,
  totalRounds,
}) => {
  // ✅ HOOK #1
  const [prizeDistributionComplete, setPrizeDistributionComplete] = React.useState(false);

  // ✅ HOOK #2 — stores charity/prize info as it arrives
  const [charityData, setCharityData] = React.useState<PrizeDistributionData | null>(null);

  const isComplete = phase === 'complete';
  const isDistributing = phase === 'distributing_prizes';
  const isWeb3Flow = paymentMethod === 'web3';

  const isFinalRound =
    typeof currentRound === 'number' &&
    typeof totalRounds === 'number' &&
    currentRound >= totalRounds;

  // ✅ HOOK #3 — rehydrate charityData from localStorage on mount (survives remounts)
  useEffect(() => {
    if (!roomId) return;
    try {
      const saved = localStorage.getItem(`charityData:${roomId}`);
      if (saved) {
        const parsed = JSON.parse(saved) as PrizeDistributionData;
        setCharityData(parsed);
        // If we have confirmed data, also restore the distribution complete flag
        if (parsed.confirmedCharityAmount != null) {
          setPrizeDistributionComplete(true);
        }
      }
    } catch { /* ignore */ }
  }, [roomId]);

  // ✅ HOOK #4 — persist charityData to localStorage whenever it changes
  useEffect(() => {
    if (!roomId || !charityData) return;
    try {
      localStorage.setItem(`charityData:${roomId}`, JSON.stringify(charityData));
    } catch { /* ignore */ }
  }, [charityData, roomId]);

  // ✅ HOOK #5 — cleanup timer after successful distribution
  useEffect(() => {
    if (!prizeDistributionComplete || !isWeb3Flow) return;
    console.log('🎯 Prizes distributed successfully. Starting cleanup timer...');
    const cleanupTimer = setTimeout(() => {
      console.log('🧹 Triggering end game cleanup...');
      try { localStorage.removeItem(`charityData:${roomId}`); } catch { /* ignore */ }
      onEndGame?.();
    }, 60000);
    return () => clearTimeout(cleanupTimer);
  }, [prizeDistributionComplete, isWeb3Flow, onEndGame, roomId]);

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

  if ((isComplete || isDistributing) && !isFinalRound) {
    console.warn(
      '[HostPostgamePanel] Not on final round — hiding post-game panel.',
      { phase, currentRound, totalRounds, isFinalRound }
    );
    return null;
  }

  if (!(isComplete || isDistributing)) return null;

  // Derived display values
  const charityConfirmed =
    prizeDistributionComplete && charityData?.confirmedCharityAmount != null;
  const displayAmount =
    charityData?.confirmedCharityAmount ?? charityData?.charityAmount ?? null;
  const displayCurrency = charityData?.charityCurrency ?? 'SOL';

  return (
    <div className="space-y-6">
      {/* Quiz Complete Banner */}
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
            <div>Charity Name: {charityData?.charityName ?? '—'}</div>
            <div>
              Display Amount: {displayAmount ?? '—'} {displayCurrency}
            </div>
            <div>Confirmed: {charityConfirmed ? '✅' : '❌'}</div>
          </div>
        </div>
      )}

      {/* Final Stats */}
      {(hasFinalStats || allRoundsStats.length > 0) && (
        <FinalQuizStats
          allRoundsStats={allRoundsStats}
          totalPlayers={totalPlayers || 0}
          isVisible
        />
      )}

      {/* Web3 Prize Distribution */}
      {isWeb3Flow && (
        <div className="mt-8 border-t-4 border-green-300 pt-6">
          <Web3PrizeDistributionRouter
            roomId={roomId}
            leaderboard={leaderboard}
            onStatusChange={(status, data) => {
              console.log('🎯 Prize Router Status:', status, data);
              if (data) {
                setCharityData((prev) => ({ ...prev, ...data }));
              }
              if (status === 'success') {
                setPrizeDistributionComplete(true);
              }
            }}
          />
        </div>
      )}
          {/* Charity Impact Banner — amber preview while distributing, green when confirmed */}
      {isWeb3Flow && charityData?.charityName && (
        <div
          className={`rounded-xl border-2 p-5 ${
            charityConfirmed
              ? 'border-green-300 bg-gradient-to-r from-green-50 to-emerald-50'
              : 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Heart
              className={`h-6 w-6 flex-shrink-0 ${
                charityConfirmed ? 'text-green-600' : 'text-amber-500'
              }`}
            />
            <div className="flex-1">
              <h4
                className={`text-lg font-bold ${
                  charityConfirmed ? 'text-green-800' : 'text-amber-800'
                }`}
              >
                {charityConfirmed
                  ? '✅ Charity Donation Confirmed'
                  : '🔄 Charity Donation Pending...'}
              </h4>
              <p
                className={`mt-0.5 text-sm ${
                  charityConfirmed ? 'text-green-700' : 'text-amber-700'
                }`}
              >
                <span className="font-semibold">{charityData.charityName}</span>
                {displayAmount != null ? (
                  <>
                    {' '}will receive{' '}
                    <span className="font-bold">
                      {displayAmount} {displayCurrency}
                    </span>{' '}
                    from this quiz
                  </>
                ) : (
                  ' — calculating amount...'
                )}
              </p>
            </div>
            {charityConfirmed && <span className="text-3xl">💚</span>}
          </div>

          {/* Confirmed tx hash */}
          {charityConfirmed && charityData.txHash && (
            <div className="mt-3 break-all rounded-lg bg-green-100 px-3 py-2 font-mono text-xs text-green-700">
              Tx: {charityData.txHash}
            </div>
          )}
        </div>
      )}

      {/* Return to Dashboard — non-web3 */}
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

      {/* Auto-cleanup countdown — web3 post-distribution */}
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
            onClick={() => {
              try { localStorage.removeItem(`charityData:${roomId}`); } catch { /* ignore */ }
              onEndGame?.();
            }}
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




