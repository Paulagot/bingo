// src/components/quiz/host-controls/prizes/Web3PrizeDistributionRouter.tsx
import * as React from 'react';
import { useQuizChainIntegration } from '../../../../hooks/useQuizChainIntegration';

// chain-specific panels
import { Web3PrizeDistributionPanel } from './Web3PrizeDistributionPanel';

type PrizeRouterStatus = 'idle' | 'running' | 'success' | 'failed';

type LeaderboardEntry = { id: string; name: string; score: number };

interface PrizeRouterProps {
  roomId: string;
  leaderboard: LeaderboardEntry[];
  onStatusChange?: (s: PrizeRouterStatus) => void; // ✅ Added
}

export const Web3PrizeDistributionRouter: React.FC<PrizeRouterProps> = ({ 
  roomId, 
  leaderboard,
  onStatusChange // ✅ Added
}) => {
  const { selectedChain,  getNetworkDisplayName } = useQuizChainIntegration();

  if (selectedChain === 'stellar' || selectedChain === 'evm') {
    return (
      <Web3PrizeDistributionPanel 
        roomId={roomId} 
        leaderboard={leaderboard}
        onStatusChange={onStatusChange} // ✅ Pass through
      />
    );
  }

  // TODO: add Solana later
  return (
    <div className="mt-6 rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6 text-center">
      <div className="mb-2 text-xl font-bold text-yellow-800">
        {getNetworkDisplayName()} prize distribution not implemented yet
      </div>
      <div className="text-yellow-700 text-sm">
        The quiz finished successfully. Payouts for this chain will be added next.
      </div>
    </div>
  );
};
