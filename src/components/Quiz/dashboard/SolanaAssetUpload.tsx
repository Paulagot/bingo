// src/components/Quiz/dashboard/SolanaAssetUpload.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useRoomIdentity } from '../hooks/useRoomIdentity';
import { useSolanaContractContext } from '../../../chains/solana/useSolanaContractContext';
import { PublicKey } from '@solana/web3.js';

import {
  Upload,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Trophy,
  ArrowRight,
} from 'lucide-react';

import type { Prize } from '../types/quiz';
import type { BaseAssetUploadProps } from './AssetUploadTypes';
import {
  calculateUploadStats,
  getAssetPrizes,
  getStatusIcon,
  getStatusColor,
  getStatusText,
  formatPlaceOrdinal,
  truncateHash,
} from './AssetUploadUtils';
import {
  UploadStatusOverview,
  ConnectionStatusNotices,
  ContractInfoCard,
  DebugInfoPanel,
} from './AssetUploadShared';

/**
 * Solana Asset Upload Component
 * Handles uploading SPL tokens to Solana smart contracts (programs)
 */
const SolanaAssetUpload: React.FC<BaseAssetUploadProps> = ({ chainName }) => {
  const { config, setFullConfig } = useQuizConfig();
  const { socket, connected } = useQuizSocket();
  const { roomId } = useRoomIdentity();
  const { isWalletConnected, currentWallet } = useQuizChainIntegration();

  // Solana-specific contract hook
  const solanaContract = useSolanaContractContext();

  const [copying, setCopying] = useState<string | null>(null);

  const prizes = config?.prizes || [];
  const assetPrizes = useMemo(() => getAssetPrizes(prizes), [prizes]);
  const web3ContractAddress = config?.web3ContractAddress || config?.contractAddress;

  const stats = useMemo(() => calculateUploadStats(prizes), [prizes]);

  // Contract function readiness
  const hasDepositFn = solanaContract?.depositPrizeAsset !== undefined;
  const canDeposit = Boolean(isWalletConnected && solanaContract?.isReady && hasDepositFn);

  useEffect(() => {
    console.log('[Solana Assets] ready:', {
      isWalletConnected,
      contractReady: solanaContract?.isReady,
      hasDeposit: hasDepositFn,
      roomId,
      connectedSocket: connected,
    });
  }, [isWalletConnected, solanaContract?.isReady, hasDepositFn, roomId, connected]);

  /**
   * Update prize upload status in config
   */
  const updatePrizeStatus = (
    prizeIndex: number,
    status: Prize['uploadStatus'],
    transactionHash?: string
  ) => {
    const updated = [...prizes];
    const assetIndex = prizes.findIndex((p) => p === assetPrizes[prizeIndex]);
    if (assetIndex === -1) return;

    const currentPrize = updated[assetIndex];
    updated[assetIndex] = {
      ...currentPrize,
      uploadStatus: status,
      transactionHash: status === 'completed' ? transactionHash : undefined,
      uploadedAt: status === 'completed' ? new Date().toISOString() : undefined,
    } as Prize;

    setFullConfig({
      ...config,
      prizes: updated,
    });
  };

  /**
   * Handle uploading a single asset to Solana contract
   */
  const handleUploadAsset = async (prizeIndex: number) => {
    if (!roomId || !socket || !connected || !canDeposit) {
      updatePrizeStatus(prizeIndex, 'failed');
      return;
    }

    const prize = assetPrizes[prizeIndex];
    if (!prize) {
      console.error('[Solana] Prize not found at index:', prizeIndex);
      return;
    }

    if (!prize.tokenAddress) {
      console.error('[Solana] Missing token address for prize:', prize);
      updatePrizeStatus(prizeIndex, 'failed');
      return;
    }

    try {
      updatePrizeStatus(prizeIndex, 'uploading');

      const contractPrizeIndex = prize.place - 1; // 0-based

      // Get host pubkey from config or current wallet
      const hostPubkey = new PublicKey(config?.hostWalletConfirmed || currentWallet?.address || '');
      const prizeMint = new PublicKey(prize.tokenAddress);

      const result = await solanaContract!.depositPrizeAsset!({
        roomId,
        hostPubkey,
        prizeIndex: contractPrizeIndex,
        prizeMint,
      });

      if (result?.signature) {
        updatePrizeStatus(prizeIndex, 'completed', result.signature);
        socket.emit('asset_upload_success', {
          roomId,
          prizeIndex: contractPrizeIndex,
          txHash: result.signature,
        });
      } else {
        updatePrizeStatus(prizeIndex, 'failed');
      }
    } catch (e: any) {
      console.error('[Solana] Prize deposit failed:', e);

      // Get full logs if SendTransactionError
      if (e && typeof e.getLogs === 'function') {
        try {
          const logs = await e.getLogs();
          console.error('[Solana] Full transaction logs:', logs);

          // Parse Anchor error from logs for better diagnostics
          const logString = logs.join('\n');
          const anchorErrorMatch = logString.match(
            /AnchorError caused by account: (\w+)\. Error Code: (\w+)\. Error Number: (\d+)\. Error Message: ([^.]+)/
          );

          if (anchorErrorMatch) {
            const [, account, errorCode, errorNumber, errorMessage] = anchorErrorMatch;
            console.error('[Solana] Anchor Error:', {
              account,
              errorCode,
              errorNumber,
              errorMessage,
              fullLogs: logs,
            });

            // Provide user-friendly error message for common errors
            if (errorCode === 'AccountNotInitialized' && account === 'prize_vault') {
              console.error('[Solana] Issue: Prize vault PDA token account not initialized. The contract should create it automatically.');
            }
          }

          console.error('[Solana] Error details:', {
            message: e.message,
            name: e.name,
            logs: logs,
          });
        } catch (logError) {
          console.error('[Solana] Failed to get logs:', logError);
        }
      }

      updatePrizeStatus(prizeIndex, 'failed');
    }
  };

  /**
   * Retry a failed upload
   */
  const handleRetryUpload = (prizeIndex: number) => {
    updatePrizeStatus(prizeIndex, 'pending');
  };

  /**
   * Upload all remaining pending/failed assets
   */
  const handleUploadAllRemaining = () => {
    assetPrizes.forEach((prize, index) => {
      if (!prize.uploadStatus || prize.uploadStatus === 'pending' || prize.uploadStatus === 'failed') {
        handleUploadAsset(index);
      }
    });
  };

  /**
   * Copy text to clipboard
   */
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Check if uploads can proceed
  const canProceedWithUploads = Boolean(
    web3ContractAddress &&
    roomId &&
    isWalletConnected &&
    socket &&
    connected &&
    solanaContract?.depositPrizeAsset !== undefined &&
    solanaContract?.isReady
  );

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <DebugInfoPanel
        data={{
          chain: 'solana',
          isWalletConnected,
          currentWallet: currentWallet?.address,
          web3ContractAddress,
          roomId,
          socketConnected: connected,
          contractReady: !!solanaContract?.isReady,
          hasDeposit: hasDepositFn,
        }}
      />

      {/* Upload Status Overview */}
      <UploadStatusOverview
        chainName={chainName}
        totalAssets={stats.totalAssets}
        completedUploads={stats.completedUploads}
        failedUploads={stats.failedUploads}
        pendingUploads={stats.pendingUploads}
        uploading={stats.uploading}
        allUploadsComplete={stats.allUploadsComplete}
      />

      {/* Connection Status Notices */}
      <ConnectionStatusNotices
        isSocketConnected={connected}
        isWalletConnected={isWalletConnected}
        isContractReady={!!solanaContract?.isReady}
        chainName={chainName}
      />

      {/* Contract Information */}
      <ContractInfoCard
        chainName={chainName}
        contractAddress={web3ContractAddress}
        roomId={roomId || undefined}
        walletAddress={currentWallet?.address || undefined}
        explorerBaseUrl="https://explorer.solana.com"
        isWalletConnected={isWalletConnected}
        onCopyAddress={async (addr: string) => copyToClipboard(addr, 'contract')}
        additionalInfo={
          <p className="mt-1 text-xs">
            Deposit functions: {hasDepositFn ? 'Available' : 'Not loaded'}
          </p>
        }
      />

      {/* Asset List */}
      <div className="bg-muted border-border rounded-xl border-2 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <h3 className="text-fg text-lg font-semibold">Digital Prize Assets</h3>
          </div>
          <div className="text-fg/60 text-sm">
            {stats.completedUploads} of {stats.totalAssets} deposited
          </div>
        </div>

        <div className="space-y-4">
          {assetPrizes.map((prize, index) => (
            <div
              key={`${prize.place}-${index}`}
              className={`rounded-xl border-2 p-4 transition-all duration-200 ${getStatusColor(prize.uploadStatus)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center space-x-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                      {formatPlaceOrdinal(prize.place)} Place
                    </span>
                    {getStatusIcon(prize.uploadStatus)}
                    <span className="text-fg/80 text-sm font-medium">{getStatusText(prize.uploadStatus)}</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="text-fg/80 text-sm font-medium">Description</div>
                      <div className="text-fg/70">{prize.description}</div>
                    </div>

                    {prize.tokenAddress && (
                      <div>
                        <div className="text-fg/80 text-sm font-medium">Token Mint Address</div>
                        <div className="flex items-center space-x-2">
                          <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">
                            {prize.tokenAddress}
                          </code>
                          <button
                            onClick={() => copyToClipboard(prize.tokenAddress!, 'token')}
                            className="text-fg/60 hover:text-fg/80 p-1 transition-colors"
                            title={copying === 'token' ? 'Copied!' : 'Copy address'}
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {prize.value && (
                      <div>
                        <div className="text-fg/80 text-sm font-medium">Amount</div>
                        <div className="text-fg/70">{prize.value} tokens</div>
                      </div>
                    )}

                    {prize.transactionHash && (
                      <div>
                        <div className="text-fg/80 text-sm font-medium">Transaction Signature</div>
                        <div className="flex items-center space-x-2">
                          <code className="rounded bg-green-100 px-2 py-1 font-mono text-xs text-green-800">
                            {truncateHash(prize.transactionHash)}
                          </code>
                          <button
                            onClick={() =>
                              window.open(
                                `https://explorer.solana.com/tx/${prize.transactionHash}?cluster=devnet`,
                                '_blank'
                              )
                            }
                            className="p-1 text-green-600 transition-colors hover:text-green-800"
                            title="View transaction"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <div className="ml-4">
                  {prize.uploadStatus === 'completed' ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Deposited</span>
                    </div>
                  ) : prize.uploadStatus === 'uploading' ? (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Depositing...</span>
                    </div>
                  ) : prize.uploadStatus === 'failed' ? (
                    <button
                      onClick={() => handleRetryUpload(index)}
                      disabled={!canProceedWithUploads}
                      className="flex items-center space-x-2 rounded-lg bg-red-100 px-3 py-2 text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="text-sm">Retry</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUploadAsset(index)}
                      disabled={!canProceedWithUploads}
                      className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Deposit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Upload Button */}
        {canProceedWithUploads && stats.pendingUploads > 0 && (
          <div className="border-border mt-6 border-t pt-4">
            <button
              onClick={handleUploadAllRemaining}
              disabled={stats.uploading > 0}
              className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              <span>Deposit All Remaining Assets</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolanaAssetUpload;