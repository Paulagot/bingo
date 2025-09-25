import React, { useEffect, useMemo, useState } from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useRoomIdentity } from '../hooks/useRoomIdentity';

// 🚨 Only the STELLAR child component imports and uses this hook
import { useQuizContract as useStellarQuizContract } from '../../../chains/stellar/useQuizContract';

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
  RefreshCw
} from 'lucide-react';

/**
 * Small helpers
 */
// ---- add this helper just after imports ----
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
          // narrow noisy objects early
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

const getExplorerUrl = (chain: 'stellar' | 'evm' | 'solana' | null | undefined, type: 'contract' | 'tx', id: string): string => {
  switch (chain) {
    case 'stellar':
      return type === 'contract'
        ? `https://stellar.expert/explorer/testnet/contract/${id}`
        : `https://stellar.expert/explorer/testnet/tx/${id}`;
    case 'evm':
      return type === 'contract'
        ? `https://etherscan.io/address/${id}`
        : `https://etherscan.io/tx/${id}`;
    // TODO: add Solana explorer links when you support deposits there
    default:
      return '#';
  }
};

/**
 * ⭐ Parent decides which chain child to render.
 * Each child calls its OWN chain hook unconditionally (no conditional hooks in the same component).
 */
const AssetUploadPanel: React.FC = () => {
  const { config } = useQuizConfig();
  const { selectedChain, activeChain, isWalletConnected, getChainDisplayName, currentWallet } = useQuizChainIntegration();

  // No digital asset prizes? show the empty state here (chain-agnostic)
  const prizes = config?.prizes || [];
  const assetPrizes = useMemo(() => prizes.filter(p => p.tokenAddress), [prizes]);

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
    hasAssets: false
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
    return <EvmAssetUploadPlaceholder chainName={getChainDisplayName('evm')} />;
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
 *
 * This child component calls the Stellar hook unconditionally.
 * That avoids the conditional-hooks crash you saw.
 */
const StellarAssetUploadPanel: React.FC = () => {
  const { config, setFullConfig } = useQuizConfig();
  const { socket, connected } = useQuizSocket();
  const { roomId, hostId } = useRoomIdentity();
  const { isWalletConnected, getChainDisplayName, currentWallet } = useQuizChainIntegration();

  // 🔒 SAFE: called inside Stellar-only child
  const stellarContract = useStellarQuizContract();

  const [copying, setCopying] = useState<string | null>(null);

  const prizes = config?.prizes || [];
  const assetPrizes = useMemo(() => prizes.filter(p => p.tokenAddress), [prizes]);
  const web3ContractAddress = config?.web3ContractAddress || config?.contractAddress;

  const showDebugInfo = process.env.NODE_ENV === 'development';

  // Aggregate counts
  const totalAssets = assetPrizes.length;
  const completedUploads = assetPrizes.filter(p => p.uploadStatus === 'completed').length;
  const failedUploads = assetPrizes.filter(p => p.uploadStatus === 'failed').length;
  const pendingUploads = assetPrizes.filter(p => !p.uploadStatus || p.uploadStatus === 'pending').length;
  const uploading = assetPrizes.filter(p => p.uploadStatus === 'uploading').length;
  const allUploadsComplete = totalAssets > 0 && completedUploads === totalAssets;

  // Contract function readiness
 const hasDepositFn = typeof stellarContract?.depositPrizeAsset === 'function';
const canDeposit = Boolean(isWalletConnected && stellarContract?.isReady && hasDepositFn);


  useEffect(() => {
    // basic log
    // eslint-disable-next-line no-console
    console.log('[Stellar Assets] ready:', {
      isWalletConnected,
      contractReady: stellarContract?.isReady,
      hasDeposit: !!stellarContract?.depositPrizeAsset,
      roomId,
      connectedSocket: connected
    });
  }, [isWalletConnected, stellarContract?.isReady, stellarContract?.depositPrizeAsset, roomId, connected]);

  const updatePrizeStatus = (
    prizeIndex: number,
    status: 'pending' | 'uploading' | 'completed' | 'failed',
    transactionHash?: string
  ) => {
    const updated = [...prizes];
    const assetIndex = prizes.findIndex(p => p === assetPrizes[prizeIndex]);
    if (assetIndex === -1) return;

    updated[assetIndex] = {
      ...updated[assetIndex],
      uploadStatus: status,
      transactionHash: status === 'completed' ? transactionHash : undefined,
      uploadedAt: status === 'completed' ? new Date().toISOString() : undefined
    };

    setFullConfig({
      ...config,
      prizes: updated
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
        prizeIndex: contractPrizeIndex
      });

      if (result?.success) {
        updatePrizeStatus(prizeIndex, 'completed', result.txHash);
        socket.emit('asset_upload_success', {
          roomId,
          prizeIndex: contractPrizeIndex,
          txHash: result.txHash
        });
      } else {
        updatePrizeStatus(prizeIndex, 'failed');
      }
    } catch (e) {
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
    hasDeposit: !!stellarContract?.depositPrizeAsset
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
              <p className="text-purple-600">
                Upload your digital prizes to the {getChainDisplayName('stellar')} smart contract
              </p>
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
          <p className="mt-1 text-sm text-orange-700">
            Stellar contract is not ready. Please ensure wallet is connected.
          </p>
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
            <div key={index} className={`rounded-xl border-2 p-4 transition-all duration-200 ${getStatusColor(prize.uploadStatus)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center space-x-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                      {prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : prize.place === 3 ? '3rd' : `${prize.place}th`} Place
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
                      disabled={!web3ContractAddress || !roomId || !isWalletConnected || !socket || !connected || !stellarContract?.isReady}
                      className="flex items-center space-x-2 rounded-lg bg-red-100 px-3 py-2 text-red-700 transition-colors hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      <span className="text-sm">Retry</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUploadAsset(index)}
                      disabled={!web3ContractAddress || !roomId || !isWalletConnected || !socket || !connected || !stellarContract?.depositPrizeAsset || !stellarContract?.isReady}
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
 *  PLACEHOLDERS (EVM/Solana)
 * =========================
 * These make the parent multichain-safe now, and you can fill in
 * chain-specific deposit logic later without touching the parent.
 */
const EvmAssetUploadPlaceholder: React.FC<{ chainName: string }> = ({ chainName }) => {
  return (
    <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <span className="font-medium text-orange-800">{chainName} Deposit Not Implemented</span>
      </div>
      <p className="mt-1 text-sm text-orange-700">
        The asset deposit flow for {chainName} will be added here. Your room and wallet state are still detected via the
        multichain integration.
      </p>
    </div>
  );
};

const SolanaAssetUploadPlaceholder: React.FC<{ chainName: string }> = ({ chainName }) => {
  return (
    <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center space-x-2">
        <AlertTriangle className="h-5 w-5 text-orange-600" />
        <span className="font-medium text-orange-800">{chainName} Deposit Not Implemented</span>
      </div>
      <p className="mt-1 text-sm text-orange-700">
        The asset deposit flow for {chainName} will be added here. Your room and wallet state are still detected via the
        multichain integration.
      </p>
    </div>
  );
};
