// src/components/quiz/host-controls/prizes/Web3PrizeDistributionRouter.tsx
import * as React from 'react';
import { Web3PrizeDistributionPanel, type PrizeDistributionData } from './Web3PrizeDistributionPanel';
import { useQuizConfig } from '../../../Quiz/hooks/useQuizConfig';
import { toChainConfig } from '../../../../types/chainConfig';
import { useChainWallet } from '../../../../hooks/useChainWallet';

type PrizeRouterStatus = 'idle' | 'running' | 'success' | 'failed';
type LeaderboardEntry = { id: string; name: string; score: number };

interface PrizeRouterProps {
  roomId: string;
  leaderboard: LeaderboardEntry[];
  // ✅ UPDATED: matches the new panel signature
  onStatusChange?: (s: PrizeRouterStatus, data?: PrizeDistributionData) => void;
}

export const Web3PrizeDistributionRouter: React.FC<PrizeRouterProps> = ({
  roomId,
  leaderboard,
  onStatusChange,
}) => {
const { config } = useQuizConfig();
const chainConfig = toChainConfig(config);
const { chainFamily: selectedChain, networkInfo } = useChainWallet(chainConfig);
 
const networkName = networkInfo.expectedNetwork || chainConfig.web3Chain || 'wallet';

  // ✅ UPDATED: passes data through to parent
  const handleStatusChange = React.useCallback(
    (status: PrizeRouterStatus, data?: PrizeDistributionData) => {
      onStatusChange?.(status, data);
    },
    [onStatusChange]
  );

  if (selectedChain === 'stellar' || selectedChain === 'evm' || selectedChain === 'solana') {
    return (
      <Web3PrizeDistributionPanel
        roomId={roomId}
        leaderboard={leaderboard}
        onStatusChange={handleStatusChange}
      />
    );
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6 text-center">
      <div className="mb-2 text-xl font-bold text-yellow-800">
        {networkName } prize distribution failed to initialize
      </div>
      <div className="text-yellow-700 text-sm">
        The quiz finished successfully. Contact Fundraisely support to manually distribute prizes.
      </div>
    </div>
  );
};

