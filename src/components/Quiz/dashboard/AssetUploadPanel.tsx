// src/components/Quiz/dashboard/AssetUploadPanel.tsx
import React, { useMemo } from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import {  AlertTriangle } from 'lucide-react';

import { calculateUploadStats, getAssetPrizes } from './AssetUploadUtils';
import { EmptyState, DebugInfoPanel } from './AssetUploadShared';

// Chain-specific implementations
import StellarAssetUpload from './StellarAssetUpload';
import EvmAssetUpload from './EvmAssetupload';
import SolanaAssetUpload from './SolanaAssetUpload';

/**
 * Asset Upload Panel - Parent Router Component
 * Routes to the appropriate chain-specific asset upload implementation
 * 
 * This component determines which blockchain is active and renders the
 * corresponding child component (Stellar, EVM, or Solana).
 */
const AssetUploadPanel: React.FC = () => {
  const { config } = useQuizConfig();
  const { selectedChain, activeChain, isWalletConnected, getChainDisplayName, currentWallet } =
    useQuizChainIntegration();

  const prizes = config?.prizes || [];
  const assetPrizes = useMemo(() => getAssetPrizes(prizes), [prizes]);
  const stats = useMemo(() => calculateUploadStats(prizes), [prizes]);

  const showDebugInfo = process.env.NODE_ENV === 'development';

  // If no digital asset prizes configured, show empty state
  if (assetPrizes.length === 0) {
    return (
      <div className="space-y-6">
        {showDebugInfo && (
          <DebugInfoPanel
            data={{
              selectedChain,
              activeChain,
              isWalletConnected,
              currentWallet: currentWallet?.address,
              hasAssets: false,
              totalPrizes: prizes.length,
              assetPrizes: assetPrizes.length,
            }}
          />
        )}

        <EmptyState {...(activeChain && { chainName: getChainDisplayName(activeChain) })} />
      </div>
    );
  }

  // Route to chain-specific implementation
  if (activeChain === 'stellar') {
    return <StellarAssetUpload chainName={getChainDisplayName('stellar')} />;
  }

  if (activeChain === 'evm') {
    return <EvmAssetUpload chainName={getChainDisplayName('evm')} />;
  }

  if (activeChain === 'solana') {
    return <SolanaAssetUpload chainName={getChainDisplayName('solana')} />;
  }

  // No active chain or unknown chain
  return (
    <div className="space-y-6">
      {showDebugInfo && (
        <DebugInfoPanel
          data={{
            selectedChain,
            activeChain,
            isWalletConnected,
            currentWallet: currentWallet?.address,
            hasAssets: true,
            totalPrizes: prizes.length,
            assetPrizes: assetPrizes.length,
            stats,
          }}
        />
      )}

      <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-yellow-600" />
          <h3 className="text-lg font-semibold text-yellow-800">No Blockchain Selected</h3>
        </div>
        <p className="text-yellow-700 mb-4">
          This room is not configured with a blockchain, or the blockchain type is not recognized.
        </p>
        <div className="bg-yellow-100 rounded-lg p-4 text-sm text-yellow-800">
          <p className="font-medium mb-2">Current Configuration:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Selected Chain: {selectedChain || 'None'}</li>
            <li>Active Chain: {activeChain || 'None'}</li>
            <li>Total Prizes: {prizes.length}</li>
            <li>Asset Prizes: {assetPrizes.length}</li>
            <li>Wallet Connected: {isWalletConnected ? 'Yes' : 'No'}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AssetUploadPanel;

