// src/components/quiz/host-controls/prizes/Web3PrizeDistributionRouter.tsx
import * as React from 'react';

// ✅ KEEP the import for the panel component
import { Web3PrizeDistributionPanel } from './Web3PrizeDistributionPanel';

// ✅ USE wallet context instead of useQuizChainIntegration
import { useWallet } from '../../../../context/WalletContext';

// ✅ KEEP these type definitions
type PrizeRouterStatus = 'idle' | 'running' | 'success' | 'failed';

type LeaderboardEntry = { id: string; name: string; score: number };

interface PrizeRouterProps {
  roomId: string;
  leaderboard: LeaderboardEntry[];
  onStatusChange?: (s: PrizeRouterStatus) => void;
}

export const Web3PrizeDistributionRouter: React.FC<PrizeRouterProps> = ({
  roomId,
  leaderboard,
  onStatusChange,
}) => {
  // ✅ Get chain info from wallet context instead of useQuizChainIntegration
  const wallet = useWallet();
  const selectedChain = wallet.chainFamily;
  
  // For display name, create a simple helper function
  const getNetworkDisplayName = () => {
    switch (selectedChain) {
      case 'evm': return 'EVM';
      case 'solana': return 'Solana';
      case 'stellar': return 'Stellar';
      default: return 'Unknown';
    }
  };

  // Always-defined handler to satisfy strict prop type on the panel
  const handleStatusChange = React.useCallback(
    (status: PrizeRouterStatus) => {
      if (onStatusChange) {
        onStatusChange(status);
      }
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

  // Fallback for unsupported chains
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

