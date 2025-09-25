import * as React from 'react';
import { useQuizChainIntegration } from '../../../../hooks/useQuizChainIntegration';

// chain-specific panels
import { StellarPrizeDistributionPanel } from './stellar/StellarPrizeDistributionPanel';

type LeaderboardEntry = { id: string; name: string; score: number };

interface PrizeRouterProps {
  roomId: string;
  leaderboard: LeaderboardEntry[];
}

export const Web3PrizeDistributionRouter: React.FC<PrizeRouterProps> = ({ roomId, leaderboard }) => {
  const { selectedChain, getChainDisplayName } = useQuizChainIntegration();

  if (selectedChain === 'stellar') {
    return <StellarPrizeDistributionPanel roomId={roomId} leaderboard={leaderboard} />;
  }

  // TODO: add EVM & Solana later
  return (
    <div className="mt-6 rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6 text-center">
      <div className="mb-2 text-xl font-bold text-yellow-800">
        {getChainDisplayName()} prize distribution not implemented yet
      </div>
      <div className="text-yellow-700 text-sm">
        The quiz finished successfully. Payouts for this chain will be added next.
      </div>
    </div>
  );
};
