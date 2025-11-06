// src/components/Quiz/Wizard/AssetUploadPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useRoomIdentity } from '../hooks/useRoomIdentity';

import { getMetaByKey } from '../../../chains/evm/config/networks';
import { useEvmPrizeUploader } from '../../../chains/evm/useEvmPrizeUploader';
import type { Address } from 'viem';

// 🚨 Only the STELLAR child component imports and uses this hook
import { useQuizContract as useStellarQuizContract } from '../../../chains/stellar/useQuizContract';
import { useSolanaContract } from '../../../chains/solana/useSolanaContract';
import { PublicKey } from '@solana/web3.js';

import {
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Copy,
  Info,
  Wallet,
  Trophy,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

/**
 * Small helpers
 */
const safeStringify = (value: any) => {
  try {
    const seen = new Set<any>();
    return JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'function') return '[Function]';
        if (typeof val === 'symbol') return String(val);
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          if (val instanceof Map) return { __type: 'Map', size: val.size };
          if (val instanceof Set) return { __type: 'Set', size: val.size };
          seen.add(val);
        }
        return val;
      },
      2
    );
  } catch {
    return '"<unserializable>"';
  }
};

const getStatusIcon = (status?: 'pending' | 'uploading' | 'completed' | 'failed') => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'failed':
      return <XCircle className="h-5 w-5 text-red-600" />;
    case 'uploading':
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />;
    default:
      return <Clock className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusColor = (status?: 'pending' | 'uploading' | 'completed' | 'failed') => {
  switch (status) {
    case 'completed':
      return 'bg-green-50 border-green-200';
    case 'failed':
      return 'bg-red-50 border-red-200';
    case 'uploading':
      return 'bg-blue-50 border-blue-200';
    default:
      return 'bg-gray-50 border-border';
  }
};

const getStatusText = (status?: 'pending' | 'uploading' | 'completed' | 'failed') => {
  switch (status) {
    case 'completed':
      return 'Uploaded';
    case 'failed':
      return 'Failed';
    case 'uploading':
      return 'Uploading...';
    default:
      return 'Pending';
  }
};

const getExplorerUrl = (
  chain: 'stellar' | 'evm' | 'solana' | null | undefined,
  type: 'contract' | 'tx',
  id: string
): string => {
  switch (chain) {
    case 'stellar':
      return type === 'contract'
        ? `https://stellar.expert/explorer/testnet/contract/${id}`
        : `https://stellar.expert/explorer/testnet/tx/${id}`;
    case 'evm':
      return type === 'contract'
        ? `https://etherscan.io/address/${id}`
        : `https://etherscan.io/tx/${id}`;
    default:
      return '#';
  }
};

/**
 * ⭐ Parent decides which chain child to render.
 * Each child calls its OWN chain hook unconditionally (no conditional hooks in one component).
 */
const AssetUploadPanel: React.FC = () => {
  const { config } = useQuizConfig();
  const { selectedChain, activeChain, isWalletConnected, getChainDisplayName, currentWallet } =
    useQuizChainIntegration();

  // No digital asset prizes? show the empty state here (chain-agnostic)
  const prizes = config?.prizes || [];
  const assetPrizes = useMemo(() => prizes.filter((p) => p.tokenAddress), [prizes]);

  const showDebugInfo = process.env.NODE_ENV === 'development';

  if (assetPrizes.length === 0) {
    return (
      <div className="space-y-6">
        {showDebugInfo && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h4 className="font-mono text-sm font-bold mb-2">Debug Info:</h4>
            <pre className="text-xs overflow-auto max-h-40">
              {safeStringify({
                selectedChain,
                activeChain,
                isWalletConnected,
                currentWallet: currentWallet?.address,
                hasAssets: false,
              })}
            </pre>
          </div>
        )}

        <div className="py-12 text-center">
          <Trophy className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <h3 className="text-fg/70 mb-2 text-lg font-semibold">No Digital Assets to Upload</h3>
          <p className="text-fg/60 mx-auto max-w-md">
            No prizes with token addresses were configured. Digital assets will appear here when prizes include token
            contract addresses.
          </p>
        </div>
      </div>
    );
  }

  // Route by chain
  if (activeChain === 'stellar') {
    return <StellarAssetUploadPanel />;
  }

  if (activeChain === 'evm') {
    return <EvmAssetUploadPanel chainName={getChainDisplayName('evm')} />;
  }

  if (activeChain === 'solana') {
    return <SolanaAssetUploadPlaceholder chainName={getChainDisplayName('solana')} />;
  }

  // Unknown/no chain (shouldn’t happen if dashboard wrapped correctly)
  return (
    <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-yellow-600" />
        <span className="font-medium text-yellow-800">No blockchain selected</span>
      </div>
      <p className="mt-1 text-sm text-yellow-700">This room is not configured with a blockchain.</p>
    </div>
  );
};

export default AssetUploadPanel;

/**
 * =========================
 *  STELLAR IMPLEMENTATION
 * =========================
 */
const StellarAssetUploadPanel: React.FC = () => {
  const { config, setFullConfig } = useQuizConfig();
  const { socket, connected } = useQuizSocket();
  const { roomId } = useRoomIdentity();
  const { isWalletConnected, getChainDisplayName, currentWallet } = useQuizChainIntegration();

  // 🔒 SAFE: called inside Stellar-only child
  const stellarContract = useStellarQuizContract();

  const [_copying, setCopying] = useState<string | null>(null);

  const prizes = config?.prizes || [];
  const assetPrizes = useMemo(() => prizes.filter((p) => p.tokenAddress), [prizes]);
  const web3ContractAddress = config?.web3ContractAddress || config?.contractAddress;

  const showDebugInfo = process.env.NODE_ENV === 'development';

  // Aggregate counts
  const totalAssets = assetPrizes.length;
  const completedUploads = assetPrizes.filter((p) => p.uploadStatus === 'completed').length;
  const failedUploads = assetPrizes.filter((p) => p.uploadStatus === 'failed').length;
  const pendingUploads = assetPrizes.filter((p) => !p.uploadStatus || p.uploadStatus === 'pending').length;
  const uploading = assetPrizes.filter((p) => p.uploadStatus === 'uploading').length;
  const allUploadsComplete = totalAssets > 0 && completedUploads === totalAssets;

  // Contract function readiness
  const hasDepositFn = typeof stellarContract?.depositPrizeAsset === 'function';
  const canDeposit = Boolean(isWalletConnected && stellarContract?.isReady && hasDepositFn);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[Stellar Assets] ready:', {
      isWalletConnected,
      contractReady: stellarContract?.isReady,
      hasDeposit: !!stellarContract?.depositPrizeAsset,
      roomId,
      connectedSocket: connected,
    });
  }, [isWalletConnected, stellarContract?.isReady, stellarContract?.depositPrizeAsset, roomId, connected]);

  const updatePrizeStatus = (
    prizeIndex: number,
    status: 'pending' | 'uploading' | 'completed' | 'failed',
    transactionHash?: string
  ) => {
    const updated = [...prizes];
    const assetIndex = prizes.findIndex((p) => p === assetPrizes[prizeIndex]);
    if (assetIndex === -1) return;

    updated[assetIndex] = {
      ...updated[assetIndex],
      uploadStatus: status,
      transactionHash: status === 'completed' ? transactionHash : undefined,
      uploadedAt: status === 'completed' ? new Date().toISOString() : undefined,
    };

    setFullConfig({
      ...config,
      prizes: updated,
    });
  };

  const handleUploadAsset = async (prizeIndex: number) => {
    if (!roomId || !socket || !connected || !canDeposit) {
      updatePrizeStatus(prizeIndex, 'failed');
      return;
    }

    try {
      updatePrizeStatus(prizeIndex, 'uploading');

      const prize = assetPrizes[prizeIndex];
      const contractPrizeIndex = prize.place - 1; // 0-based

      const result = await stellarContract!.depositPrizeAsset!({
        roomId,
        prizeIndex: contractPrizeIndex,
      });

      if (result?.success) {
        updatePrizeStatus(prizeIndex, 'completed', result.txHash);
        socket.emit('asset_upload_success', {
          roomId,
          prizeIndex: contractPrizeIndex,
          txHash: result.txHash,
        });
      } else {
        updatePrizeStatus(prizeIndex, 'failed');
      }
    } catch (_e) {
      updatePrizeStatus(prizeIndex, 'failed');
    }
  };

  const handleRetryUpload = (prizeIndex: number) => updatePrizeStatus(prizeIndex, 'pending');

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug Info in Development */}
      {showDebugInfo && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h4 className="font-mono text-sm font-bold mb-2">Debug Info:</h4>
          <pre className="text-xs overflow-auto max-h-40">
            {safeStringify({
              chain: 'stellar',
              isWalletConnected,
              currentWallet: currentWallet?.address,
              web3ContractAddress,
              roomId,
              socketConnected: connected,
              contractReady: !!stellarContract?.isReady,
              hasDeposit: !!stellarContract?.depositPrizeAsset,
            })}
          </pre>
        </div>
      )}

      {/* Upload Status Overview */}
      <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-purple-800">Asset Upload Status</h2>
              <p className="text-purple-600">Upload your digital prizes to the {getChainDisplayName('stellar')} smart contract</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-muted rounded-lg border border-purple-200 p-3 text-center">
            <div className="text-fg text-2xl font-bold">{totalAssets}</div>
            <div className="text-fg/70 text-sm">Total Assets</div>
          </div>
          <div className="bg-muted rounded-lg border border-green-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{completedUploads}</div>
            <div className="text-fg/70 text-sm">Completed</div>
          </div>
          <div className="bg-muted rounded-lg border border-yellow-200 p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingUploads + uploading}</div>
            <div className="text-fg/70 text-sm">Pending</div>
          </div>
          <div className="bg-muted rounded-lg border border-red-200 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{failedUploads}</div>
            <div className="text-fg/70 text-sm">Failed</div>
          </div>
        </div>

        {allUploadsComplete && (
          <div className="mt-4 rounded-lg border border-green-300 bg-green-100 p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">All assets uploaded successfully!</span>
            </div>
            <p className="mt-1 text-sm text-green-700">Your quiz is ready to launch.</p>
          </div>
        )}
      </div>

      {/* Connection Status Notices */}
      {(!socket || !connected) && (
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Socket Disconnected</span>
          </div>
          <p className="mt-1 text-sm text-yellow-700">Cannot upload assets while disconnected.</p>
        </div>
      )}

      {!isWalletConnected && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">{getChainDisplayName('stellar')} Wallet Not Connected</span>
          </div>
          <p className="mt-1 text-sm text-red-700">
            Please connect your {getChainDisplayName('stellar')} wallet to upload assets.
          </p>
        </div>
      )}

      {!stellarContract?.isReady && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-800">Contract Not Ready</span>
          </div>
          <p className="mt-1 text-sm text-orange-700">Stellar contract is not ready. Please ensure wallet is connected.</p>
        </div>
      )}

      {/* Contract Information */}
      <div className="bg-muted border-border rounded-xl border-2 p-6">
        <div className="mb-4 flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-indigo-600" />
          <h3 className="text-fg text-lg font-semibold">{getChainDisplayName('stellar')} Smart Contract</h3>
        </div>

        {web3ContractAddress && roomId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <div>
                <div className="text-sm font-medium text-indigo-800">Contract Address</div>
                <div className="font-mono text-sm text-indigo-700">{web3ContractAddress}</div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(web3ContractAddress!, 'contract')}
                  className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.open(getExplorerUrl('stellar', 'contract', web3ContractAddress!), '_blank')}
                  className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start space-x-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-800">
                  <p className="mb-1 font-medium">Chain: {getChainDisplayName('stellar')}</p>
                  <p>Wallet: {currentWallet?.address || 'Not connected'}</p>
                  <p>Status: {isWalletConnected ? 'Ready' : 'Not connected'}</p>
                  <p className="mt-1 text-xs">
                    Upload functions: {typeof stellarContract?.depositPrizeAsset === 'function' ? 'Available' : 'Not loaded'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Contract not available</span>
            </div>
            <p className="mt-1 text-sm text-yellow-700">
              Contract address: {web3ContractAddress || 'Not found'}
              <br />
              Room ID: {roomId || 'Not found'}
              <br />
              Wallet ready: {isWalletConnected ? 'Yes' : 'No'}
            </p>
          </div>
        )}
      </div>

      {/* Asset List */}
      <div className="bg-muted border-border rounded-xl border-2 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <h3 className="text-fg text-lg font-semibold">Digital Prize Assets</h3>
          </div>
          <div className="text-fg/60 text-sm">
            {completedUploads} of {totalAssets} uploaded
          </div>
        </div>

        <div className="space-y-4">
          {assetPrizes.map((prize, index) => (
            <div
              key={index}
              className={`rounded-xl border-2 p-4 transition-all duration-200 ${getStatusColor(prize.uploadStatus)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center space-x-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                      {prize.place === 1
                        ? '1st'
                        : prize.place === 2
                        ? '2nd'
                        : prize.place === 3
                        ? '3rd'
                        : `${prize.place}th`}{' '}
                      Place
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
                        <div className="text-fg/80 text-sm font-medium">Token Address</div>
                        <div className="flex items-center space-x-2">
                          <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">{prize.tokenAddress}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(prize.tokenAddress!)}
                            className="text-fg/60 hover:text-fg/80 p-1 transition-colors"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}

                    {prize.value && (
                      <div>
                        <div className="text-fg/80 text-sm font-medium">Amount/Quantity</div>
                        <div className="text-fg/70">{prize.value}</div>
                      </div>
                    )}

                    {prize.transactionHash && (
                      <div>
                        <div className="text-fg/80 text-sm font-medium">Transaction Hash</div>
                        <div className="flex items-center space-x-2">
                          <code className="rounded bg-green-100 px-2 py-1 font-mono text-xs text-green-800">
                            {prize.transactionHash.substring(0, 10)}...
                            {prize.transactionHash.substring(prize.transactionHash.length - 8)}
                          </code>
                          <button
                            onClick={() => window.open(getExplorerUrl('stellar', 'tx', prize.transactionHash!), '_blank')}
                            className="p-1 text-green-600 transition-colors hover:text-green-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  {prize.uploadStatus === 'completed' ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Uploaded</span>
                    </div>
                  ) : prize.uploadStatus === 'uploading' ? (
                    <div className="flex items-center space-x-2 text-blue-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  ) : prize.uploadStatus === 'failed' ? (
                    <button
                      onClick={() => handleRetryUpload(index)}
                      disabled={
                        !web3ContractAddress ||
                        !roomId ||
                        !isWalletConnected ||
                        !socket ||
                        !connected ||
                        !stellarContract?.isReady
                      }
                      className="flex items-center space-x-2 rounded-lg bg-red-100 px-3 py-2 text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="text-sm">Retry</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUploadAsset(index)}
                      disabled={
                        !web3ContractAddress ||
                        !roomId ||
                        !isWalletConnected ||
                        !socket ||
                        !connected ||
                        !stellarContract?.depositPrizeAsset ||
                        !stellarContract?.isReady
                      }
                      className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      <span className="text-sm">Upload</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk Upload */}
        {web3ContractAddress &&
          roomId &&
          isWalletConnected &&
          socket &&
          connected &&
          pendingUploads > 0 &&
          stellarContract?.depositPrizeAsset &&
          stellarContract?.isReady && (
            <div className="border-border mt-6 border-t pt-4">
              <button
                onClick={() => {
                  assetPrizes.forEach((prize, index) => {
                    if (!prize.uploadStatus || prize.uploadStatus === 'pending' || prize.uploadStatus === 'failed') {
                      handleUploadAsset(index);
                    }
                  });
                }}
                disabled={uploading > 0}
                className="flex items-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                <span>Upload All Remaining Assets</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
      </div>
    </div>
  );
};

/**
 * =========================
 *  EVM IMPLEMENTATION
 * =========================
 */
const EvmAssetUploadPanel: React.FC<{ chainName: string }> = ({ chainName }) => {
  const { config, setFullConfig } = useQuizConfig();
  const { currentWallet, selectedEvmNetwork } = useQuizChainIntegration();
  const { roomId } = useRoomIdentity();
  const { socket, connected } = useQuizSocket();

  const networkMeta = getMetaByKey(selectedEvmNetwork);
  const chainId = networkMeta?.id;
  const explorer = networkMeta?.explorer;

  const roomAddress = (config?.web3ContractAddress || config?.contractAddress) as Address | undefined;

  const prizes = config?.prizes || [];
  const assetPrizes = prizes.filter((p) => p.tokenAddress);

  // NFT local inputs (for tokenId/amount if not present in config)
  const [localTokenIds, setLocalTokenIds] = useState<Record<number, string>>({});
  const [localAmounts, setLocalAmounts] = useState<Record<number, string>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [err, setErr] = useState<Record<number, string>>({});

  const { uploadErc20, uploadErc721, uploadErc1155, readOnchainPrizes, mergeOnchainUploadFlags } =
    useEvmPrizeUploader({
      roomAddress,
      sender: currentWallet?.address as Address | undefined,
      chainId,
      explorerBase: explorer,
    });

  // ---- unified resync ----
  const resyncFromContract = async () => {
    if (!roomAddress || !chainId) return;
    console.log('[EVM][Resync] reading getAllPrizes', { roomAddress, chainId, explorer });
    const on = await readOnchainPrizes();
    console.log('[EVM][Resync] onchain raw:', on);
    const next = mergeOnchainUploadFlags(prizes, on);
    console.log('[EVM][Resync] merged prize flags from chain:', on);
    setFullConfig({ ...config, prizes: next });
  };

  // ---- status updater (place-based mapping) ----
  const updatePrizeStatus = (
    assetIndex: number,
    status: 'pending' | 'uploading' | 'completed' | 'failed',
    transactionHash?: string
  ) => {
    const updated = [...prizes];
    const targetPlace = assetPrizes[assetIndex]?.place;
    const originalIndex = prizes.findIndex((p) => p.place === targetPlace);
    if (originalIndex === -1) return;

    updated[originalIndex] = {
      ...updated[originalIndex],
      uploadStatus: status,
      transactionHash: status === 'completed' ? transactionHash : undefined,
      uploadedAt: status === 'completed' ? new Date().toISOString() : undefined,
    };
    setFullConfig({ ...config, prizes: updated });
  };

  const guard = (assetIndex: number) => {
    const prize = assetPrizes[assetIndex];
    if (!roomId) throw new Error('Missing roomId');
    if (!connected || !socket) throw new Error('Socket disconnected');
    if (!roomAddress || !currentWallet?.address || !chainId) {
      throw new Error('Missing roomAddress/wallet/chainId');
    }
    if (!prize.tokenAddress) throw new Error('Missing prize.tokenAddress');
    return prize;
  };

  // ---- ERC-20
  const handleUploadErc20 = async (assetIndex: number) => {
    try {
      const prize = guard(assetIndex);
      if (prize.isNFT) throw new Error('Prize is NFT; use NFT upload');
      if (prize.value == null || Number(prize.value) <= 0) throw new Error('ERC-20 amount required');

      if (!connected || !socket) throw new Error('Socket disconnected');
      const s = socket;
      if (!s) throw new Error('Socket missing');

      setErr({});
      setBusyIndex(assetIndex);
      updatePrizeStatus(assetIndex, 'uploading');

      const res = await uploadErc20({
        token: prize.tokenAddress as Address,
        amountHuman: Number(prize.value),
        place: prize.place,
      });

      if (res.success) {
        updatePrizeStatus(assetIndex, 'completed', res.hash);
        s.emit('asset_upload_success', { roomId, prizeIndex: prize.place - 1, txHash: res.hash });
      } else {
        updatePrizeStatus(assetIndex, 'failed');
        setErr((m) => ({ ...m, [assetIndex]: res.error }));
      }
    } catch (e: any) {
      updatePrizeStatus(assetIndex, 'failed');
      setErr((m) => ({ ...m, [assetIndex]: e?.message || 'Upload error' }));
    } finally {
      setBusyIndex(null);
      await resyncFromContract();
    }
  };

  // ---- ERC-721 / 1155
  const handleUploadNft = async (assetIndex: number) => {
    try {
      const prize = guard(assetIndex);
      if (!prize.isNFT) throw new Error('Prize is not NFT');

      const tokenIdStr = String(prize.tokenId ?? localTokenIds[assetIndex] ?? '').trim();
      const amountStr = String(prize.value ?? localAmounts[assetIndex] ?? '').trim();
      if (!tokenIdStr) throw new Error('Token ID required for NFT');

      if (!connected || !socket) throw new Error('Socket disconnected');
      const s = socket;
      if (!s) throw new Error('Socket missing');

      setErr({});
      setBusyIndex(assetIndex);
      updatePrizeStatus(assetIndex, 'uploading');

      let res;
      if (amountStr) {
        // ERC-1155
        res = await uploadErc1155({
          token: prize.tokenAddress as Address,
          tokenId: BigInt(tokenIdStr),
          amount: BigInt(amountStr),
          place: prize.place,
        });
      } else {
        // ERC-721
        res = await uploadErc721({
          token: prize.tokenAddress as Address,
          tokenId: BigInt(tokenIdStr),
          place: prize.place,
        });
      }

      if (res.success) {
        updatePrizeStatus(assetIndex, 'completed', res.hash);
        s.emit('asset_upload_success', { roomId, prizeIndex: prize.place - 1, txHash: res.hash });
      } else {
        updatePrizeStatus(assetIndex, 'failed');
        setErr((m) => ({ ...m, [assetIndex]: res.error }));
      }
    } catch (e: any) {
      updatePrizeStatus(assetIndex, 'failed');
      setErr((m) => ({ ...m, [assetIndex]: e?.message || 'Upload error' }));
    } finally {
      setBusyIndex(null);
      await resyncFromContract();
    }
  };

  const iconFor = (status?: 'pending' | 'uploading' | 'completed' | 'failed') =>
    status === 'completed' ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : status === 'uploading' ? (
      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
    ) : status === 'failed' ? (
      <XCircle className="h-4 w-4 text-red-600" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-gray-500" />
    );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span className="font-medium text-orange-800">EVM Asset Deposit</span>
        </div>
        <p className="mt-1 text-sm text-orange-700">
          ERC-20, ERC-721, and ERC-1155 uploads are enabled here for {networkMeta?.name ?? chainName}.
        </p>
      </div>

      {/* Env summary */}
      <div className="rounded-xl border p-4 bg-white text-sm">
        <div className="font-semibold">Network</div>
        <div>
          {networkMeta?.name ?? chainName} <span className="text-xs text-gray-500">Chain ID: {chainId ?? '—'}</span>
        </div>
        {explorer && <div className="text-xs text-gray-600">Explorer: {explorer}</div>}

        <div className="mt-2 font-semibold">Wallet</div>
        <div className="font-mono">{currentWallet?.address ?? 'Not connected'}</div>

        <div className="mt-2 font-semibold">Room Contract</div>
        <div className="font-mono">{roomAddress ?? 'N/A'}</div>
        {explorer && roomAddress && (
          <a className="mt-1 inline-block text-blue-600 underline" href={`${explorer}/address/${roomAddress}`} target="_blank" rel="noreferrer">
            Open in Explorer
          </a>
        )}

        <div className="mt-3">
          <button onClick={resyncFromContract} className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50">
            Resync from contract
          </button>
        </div>
      </div>

      {/* Prize list */}
      <div className="rounded-xl border p-4 bg-white">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">Digital Prize Assets (EVM)</div>
          <div className="text-xs text-gray-500">
            Tip: If uploads look “stuck”, click <button onClick={resyncFromContract} className="underline">Resync</button> to pull on-chain state.
          </div>
        </div>

        {assetPrizes.length === 0 && <div className="text-sm text-gray-600">No prizes with token addresses configured.</div>}

        {/* If the room hasn’t been configured yet, show a clear hint */}
        {assetPrizes.length > 0 && (
          <div className="mb-3 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-800">
            If “Resync” shows empty on-chain prizes, make sure your AssetRoom has prize slots configured (place, asset,
            amount/tokenId) on this network and address.
          </div>
        )}

        <div className="space-y-3">
          {assetPrizes.map((p, i) => {
            const status = p.uploadStatus ?? 'pending';
            const isNft = !!p.isNFT;
            return (
              <div key={`${p.place}-${p.tokenAddress}-${i}`} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">Place: {p.place}</span>
                      {iconFor(status)}
                      <span className="text-xs text-gray-600">{status}</span>
                    </div>
                    <div className="mt-1 text-sm">{p.description}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      Token: <code className="font-mono">{p.tokenAddress}</code>
                      {isNft ? (
                        <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">NFT</span>
                      ) : (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">ERC-20</span>
                      )}
                    </div>

                    {isNft ? (
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Token ID</label>
                          <input
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            placeholder="e.g. 123"
                            defaultValue={p.tokenId ?? ''}
                            onChange={(e) => setLocalTokenIds((m) => ({ ...m, [i]: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Amount (ERC-1155 only)</label>
                          <input
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            placeholder="leave blank for ERC-721"
                            defaultValue={p.value ?? ''}
                            onChange={(e) => setLocalAmounts((m) => ({ ...m, [i]: e.target.value }))}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <label className="text-xs text-gray-600">Amount (ERC-20, display units)</label>
                        <input
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          placeholder="e.g. 1.5"
                          defaultValue={p.value ?? ''}
                          onChange={(e) => setLocalAmounts((m) => ({ ...m, [i]: e.target.value }))}
                        />
                      </div>
                    )}

                    {err[i] && (
                      <div className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">{err[i]}</div>
                    )}

                    {p.transactionHash && explorer && (
                      <div className="mt-2 text-xs">
                        Tx:{' '}
                        <a href={`${explorer}/tx/${p.transactionHash}`} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                          {p.transactionHash.slice(0, 10)}…{p.transactionHash.slice(-8)}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {status === 'completed' ? (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="h-4 w-4" /> Uploaded
                      </div>
                    ) : status === 'uploading' ? (
                      <div className="flex items-center gap-1 text-blue-600 text-sm">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Uploading…
                      </div>
                    ) : isNft ? (
                      <button
                        onClick={async () => {
                          console.log('[UI] Upload NFT click', { index: i, place: p.place, token: p.tokenAddress });
                          try {
                            await handleUploadNft(i);
                          } catch (e) {
                            console.error('[UI] handleUploadNft threw:', e);
                          }
                        }}
                        disabled={!roomAddress || !currentWallet?.address || !chainId || !connected || busyIndex !== null}
                        className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        Upload NFT
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          console.log('[UI] Upload ERC-20 click', {
                            index: i,
                            place: p.place,
                            token: p.tokenAddress,
                            amountHuman: p.value,
                          });
                          try {
                            await handleUploadErc20(i);
                          } catch (e) {
                            console.error('[UI] handleUploadErc20 threw:', e);
                          }
                        }}
                        disabled={!roomAddress || !currentWallet?.address || !chainId || !connected || busyIndex !== null}
                        className="flex items-center gap-2 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        Upload ERC-20
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/**
 * =========================
 *  SOLANA IMPLEMENTATION
 * =========================
 */
const SolanaAssetUploadPlaceholder: React.FC<{ chainName: string }> = ({ chainName }) => {
  const { config, setFullConfig } = useQuizConfig();
  const { socket, connected } = useQuizSocket();
  const { roomId } = useRoomIdentity();
  const { isWalletConnected, currentWallet } = useQuizChainIntegration();

  // Use Solana contract hook
  const solanaContract = useSolanaContract();

  const [_copying, setCopying] = useState<string | null>(null);

  const prizes = config?.prizes || [];
  const assetPrizes = useMemo(() => prizes.filter((p) => p.tokenAddress), [prizes]);
  const web3ContractAddress = config?.web3ContractAddress || config?.contractAddress;

  const showDebugInfo = process.env.NODE_ENV === 'development';

  // Aggregate counts
  const totalAssets = assetPrizes.length;
  const completedUploads = assetPrizes.filter((p) => p.uploadStatus === 'completed').length;
  const failedUploads = assetPrizes.filter((p) => p.uploadStatus === 'failed').length;
  const pendingUploads = assetPrizes.filter((p) => !p.uploadStatus || p.uploadStatus === 'pending').length;
  const uploading = assetPrizes.filter((p) => p.uploadStatus === 'uploading').length;
  const allUploadsComplete = totalAssets > 0 && completedUploads === totalAssets;

  // Contract function readiness
  const hasDepositFn = typeof solanaContract?.depositPrizeAsset === 'function';
  const canDeposit = Boolean(isWalletConnected && solanaContract?.isReady && hasDepositFn);

  useEffect(() => {
    console.log('[Solana Assets] ready:', {
      isWalletConnected,
      contractReady: solanaContract?.isReady,
      hasDeposit: !!solanaContract?.depositPrizeAsset,
      roomId,
      connectedSocket: connected,
    });
  }, [isWalletConnected, solanaContract?.isReady, solanaContract?.depositPrizeAsset, roomId, connected]);

  const updatePrizeStatus = (
    prizeIndex: number,
    status: 'pending' | 'uploading' | 'completed' | 'failed',
    transactionHash?: string
  ) => {
    const updated = [...prizes];
    const assetIndex = prizes.findIndex((p) => p === assetPrizes[prizeIndex]);
    if (assetIndex === -1) return;

    updated[assetIndex] = {
      ...updated[assetIndex],
      uploadStatus: status,
      transactionHash: status === 'completed' ? transactionHash : undefined,
      uploadedAt: status === 'completed' ? new Date().toISOString() : undefined,
    };

    setFullConfig({
      ...config,
      prizes: updated,
    });
  };

  const handleUploadAsset = async (prizeIndex: number) => {
    if (!roomId || !socket || !connected || !canDeposit) {
      updatePrizeStatus(prizeIndex, 'failed');
      return;
    }

    try {
      updatePrizeStatus(prizeIndex, 'uploading');

      const prize = assetPrizes[prizeIndex];
      const contractPrizeIndex = prize.place - 1; // 0-based

      // Get host pubkey from config or current wallet
      const hostPubkey = new PublicKey(config?.hostWalletConfirmed || currentWallet?.address);
      const prizeMint = new PublicKey(prize.tokenAddress!);

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
          const anchorErrorMatch = logString.match(/AnchorError caused by account: (\w+)\. Error Code: (\w+)\. Error Number: (\d+)\. Error Message: ([^.]+)/);
          
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

  const handleRetryUpload = (prizeIndex: number) => updatePrizeStatus(prizeIndex, 'pending');

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopying(type);
      setTimeout(() => setCopying(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug Info in Development */}
      {showDebugInfo && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h4 className="font-mono text-sm font-bold mb-2">Debug Info:</h4>
          <pre className="text-xs overflow-auto max-h-40">
            {safeStringify({
              chain: 'solana',
              isWalletConnected,
              currentWallet: currentWallet?.address,
              web3ContractAddress,
              roomId,
              socketConnected: connected,
              contractReady: !!solanaContract?.isReady,
              hasDeposit: !!solanaContract?.depositPrizeAsset,
            })}
          </pre>
        </div>
      )}

      {/* Upload Status Overview */}
      <div className="rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-purple-800">Asset Upload Status</h2>
              <p className="text-purple-600">Deposit your digital prizes to the {chainName} smart contract</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="bg-muted rounded-lg border border-purple-200 p-3 text-center">
            <div className="text-fg text-2xl font-bold">{totalAssets}</div>
            <div className="text-fg/70 text-sm">Total Assets</div>
          </div>
          <div className="bg-muted rounded-lg border border-green-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{completedUploads}</div>
            <div className="text-fg/70 text-sm">Completed</div>
          </div>
          <div className="bg-muted rounded-lg border border-yellow-200 p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">{pendingUploads + uploading}</div>
            <div className="text-fg/70 text-sm">Pending</div>
          </div>
          <div className="bg-muted rounded-lg border border-red-200 p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{failedUploads}</div>
            <div className="text-fg/70 text-sm">Failed</div>
          </div>
        </div>

        {allUploadsComplete && (
          <div className="mt-4 rounded-lg border border-green-300 bg-green-100 p-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">All assets deposited successfully!</span>
            </div>
            <p className="mt-1 text-sm text-green-700">Your room is ready for players to join.</p>
          </div>
        )}
      </div>

      {/* Connection Status Notices */}
      {(!socket || !connected) && (
        <div className="rounded-xl border-2 border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <span className="font-medium text-yellow-800">Socket Disconnected</span>
          </div>
          <p className="mt-1 text-sm text-yellow-700">Cannot upload assets while disconnected.</p>
        </div>
      )}

      {!isWalletConnected && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800">{chainName} Wallet Not Connected</span>
          </div>
          <p className="mt-1 text-sm text-red-700">
            Please connect your {chainName} wallet to deposit assets.
          </p>
        </div>
      )}

      {!solanaContract?.isReady && (
        <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <span className="font-medium text-orange-800">Contract Not Ready</span>
          </div>
          <p className="mt-1 text-sm text-orange-700">{chainName} contract is not ready. Please ensure wallet is connected.</p>
        </div>
      )}

      {/* Contract Information */}
      <div className="bg-muted border-border rounded-xl border-2 p-6">
        <div className="mb-4 flex items-center space-x-3">
          <Wallet className="h-6 w-6 text-indigo-600" />
          <h3 className="text-fg text-lg font-semibold">{chainName} Smart Contract</h3>
        </div>

        {web3ContractAddress && roomId ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 p-3">
              <div>
                <div className="text-sm font-medium text-indigo-800">Room PDA Address</div>
                <div className="font-mono text-sm text-indigo-700">{web3ContractAddress}</div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => copyToClipboard(web3ContractAddress!, 'contract')}
                  className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => window.open(`https://explorer.solana.com/address/${web3ContractAddress}?cluster=devnet`, '_blank')}
                  className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-start space-x-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-800">
                  <p className="mb-1 font-medium">Chain: {chainName}</p>
                  <p>Wallet: {currentWallet?.address || 'Not connected'}</p>
                  <p>Status: {isWalletConnected ? 'Ready' : 'Not connected'}</p>
                  <p className="mt-1 text-xs">
                    Deposit functions: {typeof solanaContract?.depositPrizeAsset === 'function' ? 'Available' : 'Not loaded'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="font-medium text-yellow-800">Contract not available</span>
            </div>
            <p className="mt-1 text-sm text-yellow-700">
              Room PDA: {web3ContractAddress || 'Not found'}
              <br />
              Room ID: {roomId || 'Not found'}
              <br />
              Wallet ready: {isWalletConnected ? 'Yes' : 'No'}
            </p>
          </div>
        )}
      </div>

      {/* Asset List */}
      <div className="bg-muted border-border rounded-xl border-2 p-6">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <h3 className="text-fg text-lg font-semibold">Digital Prize Assets</h3>
          </div>
          <div className="text-fg/60 text-sm">
            {completedUploads} of {totalAssets} deposited
          </div>
        </div>

        <div className="space-y-4">
          {assetPrizes.map((prize, index) => (
            <div
              key={index}
              className={`rounded-xl border-2 p-4 transition-all duration-200 ${getStatusColor(prize.uploadStatus)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center space-x-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                      {prize.place === 1
                        ? '1st'
                        : prize.place === 2
                        ? '2nd'
                        : prize.place === 3
                        ? '3rd'
                        : `${prize.place}th`}{' '}
                      Place
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
                          <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs">{prize.tokenAddress}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(prize.tokenAddress!)}
                            className="text-fg/60 hover:text-fg/80 p-1 transition-colors"
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
                            {prize.transactionHash.substring(0, 10)}...
                            {prize.transactionHash.substring(prize.transactionHash.length - 8)}
                          </code>
                          <button
                            onClick={() => window.open(`https://explorer.solana.com/tx/${prize.transactionHash}?cluster=devnet`, '_blank')}
                            className="p-1 text-green-600 transition-colors hover:text-green-800"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
                      disabled={
                        !web3ContractAddress ||
                        !roomId ||
                        !isWalletConnected ||
                        !socket ||
                        !connected ||
                        !solanaContract?.isReady
                      }
                      className="flex items-center space-x-2 rounded-lg bg-red-100 px-3 py-2 text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="text-sm">Retry</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUploadAsset(index)}
                      disabled={
                        !web3ContractAddress ||
                        !roomId ||
                        !isWalletConnected ||
                        !socket ||
                        !connected ||
                        !solanaContract?.depositPrizeAsset ||
                        !solanaContract?.isReady
                      }
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

        {/* Bulk Upload */}
        {web3ContractAddress &&
          roomId &&
          isWalletConnected &&
          socket &&
          connected &&
          pendingUploads > 0 &&
          solanaContract?.depositPrizeAsset &&
          solanaContract?.isReady && (
            <div className="border-border mt-6 border-t pt-4">
              <button
                onClick={() => {
                  assetPrizes.forEach((prize, index) => {
                    if (!prize.uploadStatus || prize.uploadStatus === 'pending' || prize.uploadStatus === 'failed') {
                      handleUploadAsset(index);
                    }
                  });
                }}
                disabled={uploading > 0}
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

