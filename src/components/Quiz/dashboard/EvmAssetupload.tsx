// src/components/Quiz/dashboard/EvmAssetUpload.tsx
import React, { useState, useMemo } from 'react';
import type { Address } from 'viem';

import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useRoomIdentity } from '../hooks/useRoomIdentity';
import { getMetaByKey } from '../../../chains/evm/config/networks';
import { useEvmPrizeUploader } from '../../../chains/evm/useEvmPrizeUploader';

import {
  Upload,
  CheckCircle,
  RefreshCw,
  Trophy,
  AlertTriangle,
} from 'lucide-react';

import type { Prize } from '../types/quiz';
import type { BaseAssetUploadProps } from './AssetUploadTypes';
import {
  calculateUploadStats,
  getAssetPrizes,
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

const EvmAssetUpload: React.FC<BaseAssetUploadProps> = ({ chainName }) => {
  const { config, setFullConfig } = useQuizConfig();
  const { currentWallet, selectedEvmNetwork } = useQuizChainIntegration();
  const { roomId } = useRoomIdentity();
  const { socket, connected } = useQuizSocket();

  const networkMeta = getMetaByKey(selectedEvmNetwork);
  const chainId = networkMeta?.id;
  
  // ✅ FIX: Get explorer URL from blockExplorers (AppKit structure)
  const explorer = networkMeta?.blockExplorers?.default?.url;

  // The deployed AssetRoom contract for this quiz room
  const roomAddress = (
    (config as any)?.roomContractAddress || 
    config?.web3ContractAddress || 
    config?.contractAddress
  ) as Address | undefined;

  const prizes: Prize[] = config?.prizes || [];
  const assetPrizes = useMemo(() => getAssetPrizes(prizes), [prizes]);
  const stats = useMemo(() => calculateUploadStats(prizes), [prizes]);

  // local UI-only inputs for amount/tokenId
  const [localTokenIds, setLocalTokenIds] = useState<Record<number, string>>({});
  const [localAmounts, setLocalAmounts] = useState<Record<number, string>>({});
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // ✅ Debug: Check what we have for uploader initialization
  console.log('[EvmAssetUpload] Uploader init check:', {
    roomAddress,
    walletAddress: currentWallet?.address,
    chainId,
    explorer,
    networkMeta: networkMeta?.name,
    selectedEvmNetwork,
    hasAllRequired: !!(roomAddress && currentWallet?.address && chainId && explorer),
  });

  // Instantiate uploader (or fallback dummy uploader)
  const uploader = roomAddress && currentWallet?.address && chainId && explorer
    ? useEvmPrizeUploader({
        roomAddress,
        sender: currentWallet.address as Address,
        chainId: typeof chainId === 'number' ? chainId : Number(chainId), // ✅ FIX: Ensure number type
      })
    : {
        uploadPrize: async () => ({ success: false as const, error: 'Not initialized' }),
        uploadErc20: async () => ({ success: false as const, error: 'Not initialized' }),
        uploadErc721: async () => ({ success: false as const, error: 'Not initialized' }),
        uploadErc1155: async () => ({ success: false as const, error: 'Not initialized' }),
        readOnchainPrizes: async () => ({ places: [], assets: [], amounts: [], tokenIds: [], uploaded: [] }),
      };

  const { uploadPrize, readOnchainPrizes } = uploader;

  /**
   * Resync config.uploadStatus from contract's getAllPrizes()
   */
  const resyncFromContract = async () => {
    if (!roomAddress || !chainId) return;
    try {
      const onchain = await readOnchainPrizes();

      const updatedPrizes = prizes.map((p) => {
        const idx = onchain.places.indexOf(p.place);
        if (idx === -1) return p;

        return {
          ...p,
          uploadStatus: onchain.uploaded[idx] ? 'completed' : p.uploadStatus,
          uploadedAt: onchain.uploaded[idx] ? (p.uploadedAt || new Date().toISOString()) : p.uploadedAt,
        };
      });

      setFullConfig({ ...config, prizes: updatedPrizes });
    } catch (err) {
      console.error('[EVM][Resync] Failed:', err);
    }
  };

  /**
   * Writes upload-status fields into config
   */
  const updatePrizeStatus = (
    assetIndex: number,
    status: Prize['uploadStatus'],
    transactionHash?: string
  ) => {
    const updated = [...prizes];
    const prize = assetPrizes[assetIndex];
    if (!prize) return;

    const originalIndex = prizes.findIndex((p) => p.place === prize.place);
    if (originalIndex === -1) return;

    // ✅ FIX: Get the existing prize (we know it exists because originalIndex !== -1)
    const existingPrize = updated[originalIndex];
    if (!existingPrize) return; // Extra safety check for TypeScript

    // ✅ FIX: Spread all existing properties to maintain type compatibility
    updated[originalIndex] = {
      ...existingPrize,
      uploadStatus: status,
      transactionHash: status === 'completed' ? transactionHash : existingPrize.transactionHash,
      uploadedAt: status === 'completed' ? new Date().toISOString() : existingPrize.uploadedAt,
    } as Prize;

    setFullConfig({ ...config, prizes: updated });
  };

  /**
   * Unified upload handler (uses uploadPrize from uploader)
   */
  const handleUploadAsset = async (assetIndex: number) => {
    const prize = assetPrizes[assetIndex];
    if (!prize) return;

    setBusyIndex(assetIndex);
    setErrors({});

    try {
      const tokenAddress = prize.tokenAddress as Address | undefined;
      const tokenType = prize.tokenType;

      const tokenIdStr =
        localTokenIds[assetIndex] ??
        (prize.tokenId !== undefined ? String(prize.tokenId) : '');

      const amountStr =
        localAmounts[assetIndex] ??
        prize.amount ??
        prize.value ??
        '';

      updatePrizeStatus(assetIndex, 'uploading');

      const uploadParams: {
        place: number;
        tokenAddress?: Address;
        amountHuman?: number | string;
        tokenId?: bigint;
      } = {
        place: prize.place,
        tokenAddress,
      };

      if (tokenType === 'erc721' || tokenType === 'erc1155') {
        if (tokenIdStr) uploadParams.tokenId = BigInt(tokenIdStr);
      }
      if (tokenType === 'erc20' || tokenType === 'erc1155') {
        if (amountStr) uploadParams.amountHuman = amountStr;
      }

      const result = await uploadPrize(uploadParams);

      if (result.success) {
        updatePrizeStatus(assetIndex, 'completed', result.hash);
        socket?.emit('asset_upload_success', {
          roomId,
          prizeIndex: prize.place - 1,
          txHash: result.hash,
        });
        
        // ✅ FIX: Verify contract state after a delay (don't block UI)
        setTimeout(async () => {
          try {
            console.log('[EvmAssetUpload] Verifying contract state...');
            await resyncFromContract();
          } catch (err) {
            console.error('[EvmAssetUpload] Background resync failed:', err);
          }
        }, 3000);
      } else {
        updatePrizeStatus(assetIndex, 'failed');
        setErrors((m) => ({ ...m, [assetIndex]: result.error || 'Upload failed' }));
      }
    } catch (err: any) {
      updatePrizeStatus(assetIndex, 'failed');
      setErrors((m) => ({ ...m, [assetIndex]: err?.message || 'Error' }));
    } finally {
      setBusyIndex(null);
    }
  };

  const canProceedWithUploads =
    Boolean(roomAddress && currentWallet?.address && chainId && connected);

  const statusIcon = (status?: Prize['uploadStatus']) => {
    if (status === 'completed') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === 'uploading') return <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />;
    if (status === 'failed') return <AlertTriangle className="h-4 w-4 text-red-600" />;
    return <AlertTriangle className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-6">

      <DebugInfoPanel
        data={{
          chain: 'evm',
          network: networkMeta?.name,
          chainId,
          wallet: currentWallet?.address,
          roomAddress,
          roomId,
          socket: connected,
          explorer,
        }}
      />

      <UploadStatusOverview
        chainName={chainName}
        totalAssets={stats.totalAssets}
        completedUploads={stats.completedUploads}
        failedUploads={stats.failedUploads}
        pendingUploads={stats.pendingUploads}
        uploading={stats.uploading}
        allUploadsComplete={stats.allUploadsComplete}
      />

      <ConnectionStatusNotices
        isSocketConnected={connected}
        isWalletConnected={!!currentWallet?.address}
        isContractReady={!!roomAddress}
        chainName={chainName}
      />

      <ContractInfoCard
        chainName={chainName}
        contractAddress={roomAddress}
        roomId={roomId ?? undefined}
        walletAddress={currentWallet?.address || undefined}
        explorerBaseUrl={explorer}
        isWalletConnected={!!currentWallet?.address}
      />

      <div className="rounded-xl border-2 border-orange-200 bg-orange-50 p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <span className="font-medium text-orange-800">EVM Asset Deposit</span>
        </div>
        <p className="mt-1 text-sm text-orange-700">
          ERC-20, ERC-721 and ERC-1155 uploads enabled on {networkMeta?.name}.
        </p>
      </div>

      <div className="rounded-xl border-2 bg-muted p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold">Digital Prize Assets</h3>
          </div>
          <div className="text-sm text-gray-600">
            {stats.completedUploads} / {stats.totalAssets}
          </div>
        </div>

        {assetPrizes.length === 0 && (
          <div className="text-sm text-gray-600">
            No token-based prizes configured.
          </div>
        )}

        <div className="space-y-3">
          {assetPrizes.map((prize, index) => {
            const status = prize.uploadStatus;
            const isNft =
              prize.tokenType === 'erc721' || prize.tokenType === 'erc1155';

            return (
              <div
                key={`${prize.place}-${index}`}
                className={`rounded-lg border-2 p-3 ${getStatusColor(status)}`}
              >
                <div className="flex items-start justify-between gap-3">

                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium">
                        {formatPlaceOrdinal(prize.place)}
                      </span>
                      {statusIcon(status)}
                      <span className="text-xs text-gray-600">
                        {getStatusText(status)}
                      </span>
                    </div>

                    <div className="mb-2 text-sm">{prize.description}</div>

                    <div className="mb-2 text-xs text-gray-600">
                      Token:{' '}
                      <code className="rounded bg-gray-100 px-1 font-mono">
                        {prize.tokenAddress}
                      </code>

                      {isNft ? (
                        <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">
                          {prize.tokenType === 'erc721' ? 'ERC-721' : 'ERC-1155'}
                        </span>
                      ) : (
                        <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">
                          ERC-20
                        </span>
                      )}
                    </div>

                    {/* Inputs */}
                    {isNft ? (
                      <div className="mt-2 grid gap-3 md:grid-cols-2">
                        <div>
                          <label className="text-xs text-gray-600">
                            Token ID *
                          </label>
                          <input
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            placeholder="e.g. 1"
                            defaultValue={prize.tokenId ?? ''}
                            onChange={(e) =>
                              setLocalTokenIds((m) => ({
                                ...m,
                                [index]: e.target.value,
                              }))
                            }
                            disabled={status === 'uploading' || status === 'completed'}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-gray-600">
                            Amount {prize.tokenType === 'erc1155' ? '*' : '(ERC-1155 only)'}
                          </label>
                          <input
                            className="mt-1 w-full rounded border px-2 py-1 text-sm"
                            placeholder={
                              prize.tokenType === 'erc1155'
                                ? 'e.g. 5'
                                : 'leave blank'
                            }
                            defaultValue={prize.amount ?? ''}
                            onChange={(e) =>
                              setLocalAmounts((m) => ({
                                ...m,
                                [index]: e.target.value,
                              }))
                            }
                            disabled={status === 'uploading' || status === 'completed'}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <label className="text-xs text-gray-600">
                          Amount (ERC-20)
                        </label>
                        <input
                          className="mt-1 w-full rounded border px-2 py-1 text-sm"
                          placeholder="100"
                          defaultValue={prize.amount ?? prize.value ?? ''}
                          onChange={(e) =>
                            setLocalAmounts((m) => ({
                              ...m,
                              [index]: e.target.value,
                            }))
                          }
                          disabled={status === 'uploading' || status === 'completed'}
                        />
                      </div>
                    )}

                    {errors[index] && (
                      <div className="mt-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">
                        {errors[index]}
                      </div>
                    )}

                    {prize.transactionHash && explorer && (
                      <div className="mt-2 text-xs">
                        Tx:{' '}
                        <a
                          href={`${explorer}/tx/${prize.transactionHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 underline"
                        >
                          {truncateHash(prize.transactionHash)}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    {status === 'completed' ? (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" /> Uploaded
                      </div>
                    ) : status === 'uploading' ? (
                      <div className="flex items-center gap-1 text-sm text-blue-600">
                        <RefreshCw className="h-4 w-4 animate-spin" /> Uploading…
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUploadAsset(index)}
                        disabled={!canProceedWithUploads || busyIndex !== null}
                        className="flex items-center gap-2 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
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

export default EvmAssetUpload;
