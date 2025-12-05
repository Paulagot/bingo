// src/chains/evm/hooks/useEvmDeploy.ts
import { useCallback } from 'react';
import { writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import { decodeEventLog } from 'viem';
import { percentToBps16 } from '../utils/evmFormatting';
import { getErc20ForCurrency } from '../utils/evmTokens';
import { assertEvmAddress } from '../utils/evmValidation';
import { useEvmShared } from './useEvmShared';
import {
  POOL_FACTORY,
  PoolFactoryABI,
} from '../config/contracts.pool';
import {
  ASSET_FACTORY,
  AssetFactoryABI,
} from '../config/contracts.asset';
import AssetRoomABI from '../../../abis/quiz/BaseQuizAssetRoom.json';

// ✅ Import Prize from your existing quiz types
import type { Prize } from '@/components/Quiz/types/quiz';

const DEBUG_WEB3 = true;

export interface EvmDeployParams {
  roomId: string;
  hostWallet: string;
  currency?: string;
  entryFee?: string | number;
  hostFeePct?: number;
  prizeMode?: 'split' | 'assets';
  prizePoolPct?: number;
  prizeSplits?: { first: number; second?: number; third?: number };
  expectedPrizes?: Prize[]; // ✅ Use your existing Prize type
}

export interface EvmDeployResult {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
}

/**
 * Deploy a Pool Room (prize pool split among winners)
 */
async function deployPoolRoom(
  params: EvmDeployParams,
  helpers: {
    wagmiConfig: any;
    targetKey: string;
    targetId: number;
    explorer: string;
  }
): Promise<EvmDeployResult> {
  const { wagmiConfig, targetKey, targetId, explorer } = helpers;

  const factory = (POOL_FACTORY as any)[targetKey] as string | undefined;
  
  if (!factory || !/^0x[0-9a-fA-F]{40}$/.test(factory)) {
    throw new Error(`Pool factory not configured for network: ${targetKey} (${targetId})`);
  }

  const token = getErc20ForCurrency(params.currency, targetKey as any);
  const host = params.hostWallet;

  assertEvmAddress(host, 'Host wallet');

  const hostPayPct = Number(params.hostFeePct ?? 0);
  const prizePoolPct = Number(params.prizePoolPct ?? 0);

  const hostTotalBps = percentToBps16(hostPayPct + prizePoolPct);
  const hostPayBps = percentToBps16(hostPayPct);

  if (hostTotalBps <= hostPayBps) {
    throw new Error(
      'Your selections leave 0% for prizes. Increase prize pool or decrease host pay.'
    );
  }

  const charityPct = 100 - 20 - (hostPayPct + prizePoolPct);
  if (charityPct < 0) {
    throw new Error(
      'Your selections exceed 100% after platform (20%). Reduce host pay or prize pool.'
    );
  }

  const split1 = percentToBps16(params.prizeSplits?.first ?? 100);
  const split2 = percentToBps16(params.prizeSplits?.second ?? 0);
  const split3 = percentToBps16(params.prizeSplits?.third ?? 0);

  const args = [
    params.roomId,
    token,
    host as `0x${string}`,
    hostTotalBps,
    hostPayBps,
    split1,
    split2,
    split3,
  ] as const;

  if (DEBUG_WEB3) {
    console.log('[EVM][DEPLOY][Pool] Network:', { key: targetKey, id: targetId });
    console.log('[EVM][DEPLOY][Pool] Factory:', factory);
    console.log('[EVM][DEPLOY][Pool] Args:', {
      roomId: params.roomId,
      token,
      host,
      hostTotalBps,
      hostPayBps,
      splits: [split1, split2, split3],
    });
  }

  const hash = await writeContract(wagmiConfig, {
    address: factory as `0x${string}`,
    abi: PoolFactoryABI,
    functionName: 'createPoolRoom',
    args,
    chainId: targetId,
  });

  console.log('[EVM][DEPLOY][Pool] Transaction submitted:', hash);
  console.log('[EVM][DEPLOY][Pool] 🔗 Track at:', `${explorer}/tx/${hash}`);

  const receipt = await waitForTransactionReceipt(wagmiConfig, {
    hash,
    chainId: targetId,
  });

  let roomAddress: string | null = null;
  
  // Try to decode event logs
  try {
    for (const log of receipt.logs || []) {
      try {
        const decoded = decodeEventLog({
          abi: PoolFactoryABI,
          data: log.data,
          topics: log.topics as any,
        });
        if (decoded.eventName === 'RoomCreated') {
          const room = (decoded.args as any)?.room as string | undefined;
          if (room && /^0x[0-9a-fA-F]{40}$/.test(room)) {
            roomAddress = room;
            break;
          }
        }
      } catch {
        // Ignore decode errors
      }
    }
  } catch {
    // Ignore
  }

  if (!roomAddress) {
    roomAddress = (receipt.logs?.[0] as any)?.address ?? null;
  }

  if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
    throw new Error('Deployment succeeded but could not resolve room address from logs.');
  }

  console.log('[EVM][DEPLOY][Pool] ✅ Room created at:', roomAddress);

  return {
    success: true,
    contractAddress: roomAddress,
    txHash: hash as `0x${string}`,
    explorerUrl: `${explorer}/tx/${hash}`,
  };
}

/**
 * Deploy an Asset Room (specific prizes for each place)
 */
async function deployAssetRoom(
  params: EvmDeployParams,
  helpers: {
    wagmiConfig: any;
    targetKey: string;
    targetId: number;
    explorer: string;
  }
): Promise<EvmDeployResult> {
  const { wagmiConfig, targetKey, targetId, explorer } = helpers;

  const factory = (ASSET_FACTORY as any)[targetKey] as string | undefined;
  
  if (!factory || !/^0x[0-9a-fA-F]{40}$/.test(factory)) {
    throw new Error(`Asset factory not configured for network: ${targetKey} (${targetId})`);
  }

  if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
    throw new Error('Asset room requires at least one prize configured.');
  }

  const token = getErc20ForCurrency(params.currency, targetKey as any);
  const host = params.hostWallet;

  assertEvmAddress(host, 'Host wallet');

  const hostPayBps = percentToBps16(params.hostFeePct ?? 0);

  // Convert entry fee to proper decimals
  const entryFeeRaw = Number(params.entryFee ?? 0);
  const tokenDecimals = 6; // USDC default
  const entryFeeWei = BigInt(Math.floor(entryFeeRaw * Math.pow(10, tokenDecimals)));

  if (isNaN(entryFeeRaw) || entryFeeRaw < 0) {
    throw new Error(`Invalid entry fee: ${params.entryFee}`);
  }

  const createArgs = [
    params.roomId,
    token,
    host as `0x${string}`,
    entryFeeWei,
    hostPayBps,
  ] as const;

  if (DEBUG_WEB3) {
    console.log('[EVM][DEPLOY][Asset] Network:', { key: targetKey, id: targetId });
    console.log('[EVM][DEPLOY][Asset] Factory:', factory);
    console.log('[EVM][DEPLOY][Asset] Step 1: Creating room with:', {
      roomId: params.roomId,
      token,
      host,
      entryFee: entryFeeWei.toString(),
      hostPayBps,
    });
  }

  // Step 1: Create the room
  const createHash = await writeContract(wagmiConfig, {
    address: factory as `0x${string}`,
    abi: AssetFactoryABI,
    functionName: 'createAssetRoom',
    args: createArgs,
    chainId: targetId,
  });

  console.log('[EVM][DEPLOY][Asset] Room creation transaction submitted:', createHash);
  console.log('[EVM][DEPLOY][Asset] 🔗 Track at:', `${explorer}/tx/${createHash}`);

  console.log('[EVM][DEPLOY][Asset] ⏳ Waiting for room creation to be confirmed...');

  const createReceipt = await waitForTransactionReceipt(wagmiConfig, {
    hash: createHash,
    chainId: targetId,
    confirmations: 2,
    timeout: 120_000,
    pollingInterval: 1_000,
  });

  console.log('[EVM][DEPLOY][Asset] ✅ Room creation confirmed at block:', createReceipt.blockNumber);

  // Extract room address from logs
  let roomAddress: string | null = null;
  try {
    for (const log of createReceipt.logs || []) {
      try {
        const decoded = decodeEventLog({
          abi: AssetFactoryABI,
          data: log.data,
          topics: log.topics as any,
        });
        if (decoded.eventName === 'RoomCreated') {
          const room = (decoded.args as any)?.room as string | undefined;
          if (room && /^0x[0-9a-fA-F]{40}$/.test(room)) {
            roomAddress = room;
            break;
          }
        }
      } catch {
        // Ignore decode errors
      }
    }
  } catch {
    // Ignore
  }

  if (!roomAddress) {
    roomAddress = (createReceipt.logs?.[0] as any)?.address ?? null;
  }

  if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
    throw new Error('Room creation succeeded but could not resolve room address from logs.');
  }

  console.log('[EVM][DEPLOY][Asset] ✅ Room created at:', roomAddress);

  // Step 2: Wait for block propagation
  console.log('[EVM][DEPLOY][Asset] ⏳ Waiting for block propagation (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Step 3: Configure prizes
  const prizePlaces: number[] = [];
  const prizeTypes: number[] = [];
  const prizeAssets: `0x${string}`[] = [];
  const prizeAmounts: bigint[] = [];
  const prizeTokenIds: bigint[] = [];

  const defaultDecimals = 6;

  for (let i = 0; i < params.expectedPrizes.length; i++) {
    const prize = params.expectedPrizes[i];
    
    if (!prize) {
      console.warn(`[EVM][DEPLOY][Asset] Prize at index ${i} is undefined, skipping`);
      continue;
    }

    const place = prize.place;

    // ✅ Validate tokenAddress exists for EVM
    if (!prize.tokenAddress || !/^0x[0-9a-fA-F]{40}$/.test(prize.tokenAddress)) {
      throw new Error(
        `Prize at place ${place} is missing or has invalid tokenAddress. ` +
        `EVM asset rooms require tokenAddress for all prizes.`
      );
    }

    // ✅ Validate tokenType exists
    if (!prize.tokenType || !['erc20', 'erc721', 'erc1155'].includes(prize.tokenType)) {
      throw new Error(
        `Prize at place ${place} is missing or has invalid tokenType. ` +
        `Must be one of: erc20, erc721, erc1155`
      );
    }

    prizePlaces.push(place);
    prizeAssets.push(prize.tokenAddress as `0x${string}`);

    const tokenType = prize.tokenType;
    const tokenIdStr = String(prize.tokenId ?? '0');

    if (tokenType === 'erc721') {
      prizeTypes.push(1); // ERC-721
      prizeAmounts.push(0n);
      prizeTokenIds.push(BigInt(tokenIdStr));
      
      if (DEBUG_WEB3) {
        console.log(`[EVM][DEPLOY][Asset] Prize ${place}: ERC-721 NFT, tokenId: ${tokenIdStr}`);
      }
    } else if (tokenType === 'erc1155') {
      const amount = parseFloat(String(prize.amount ?? '0'));
      if (amount <= 0) {
        throw new Error(`Prize ${place} (ERC-1155) has invalid amount: ${prize.amount}`);
      }
      prizeTypes.push(2); // ERC-1155
      prizeAmounts.push(BigInt(Math.floor(amount)));
      prizeTokenIds.push(BigInt(tokenIdStr));
      
      if (DEBUG_WEB3) {
        console.log(`[EVM][DEPLOY][Asset] Prize ${place}: ERC-1155, amount: ${amount}, tokenId: ${tokenIdStr}`);
      }
    } else if (tokenType === 'erc20') {
      const amountFloat = parseFloat(String(prize.amount ?? '0'));
      if (amountFloat <= 0) {
        throw new Error(`Prize ${place} (ERC-20) has invalid amount: ${prize.amount}`);
      }
      const amountWei = BigInt(Math.floor(amountFloat * Math.pow(10, defaultDecimals)));
      prizeTypes.push(0); // ERC-20
      prizeAmounts.push(amountWei);
      prizeTokenIds.push(0n);
      
      if (DEBUG_WEB3) {
        console.log(`[EVM][DEPLOY][Asset] Prize ${place}: ERC-20, amount: ${amountFloat} (${amountWei} wei)`);
      }
    }
  }

  if (!prizePlaces.includes(1)) {
    throw new Error('First place prize (place 1) is required for asset rooms.');
  }

  if (DEBUG_WEB3) {
    console.log('[EVM][DEPLOY][Asset] Step 2: Configuring prizes:', {
      roomAddress,
      prizePlaces,
      prizeTypes,
      prizeAssets,
      prizeAmounts: prizeAmounts.map(String),
      prizeTokenIds: prizeTokenIds.map(String),
    });
  }

  try {
    console.log('[EVM][DEPLOY][Asset] 📝 Submitting prize configuration...');

    const configureHash = await writeContract(wagmiConfig, {
      address: roomAddress as `0x${string}`,
      abi: AssetRoomABI,
      functionName: 'configurePrizesBatch',
      args: [prizePlaces, prizeTypes, prizeAssets, prizeAmounts, prizeTokenIds],
      chainId: targetId,
    });

    console.log('[EVM][DEPLOY][Asset] Prize configuration transaction submitted:', configureHash);
    console.log('[EVM][DEPLOY][Asset] 🔗 Track at:', `${explorer}/tx/${configureHash}`);

    console.log('[EVM][DEPLOY][Asset] ⏳ Waiting for prize configuration to be confirmed...');

    await waitForTransactionReceipt(wagmiConfig, {
      hash: configureHash,
      chainId: targetId,
      confirmations: 1,
      timeout: 120_000,
      pollingInterval: 1_000,
    });

    console.log('[EVM][DEPLOY][Asset] ✅ Prizes configured successfully');
  } catch (configError: any) {
    console.error('[EVM][DEPLOY][Asset] ❌ Prize configuration failed:', configError);

    throw new Error(
      `Room was created successfully at ${roomAddress}, but prize configuration failed.\n\n` +
      `Error: ${configError.message}\n\n` +
      `Next steps:\n` +
      `1. Verify the room exists at ${explorer}/address/${roomAddress}\n` +
      `2. Manually call configurePrizesBatch() on the room contract\n` +
      `3. Then call uploadPrize(1) after approving and depositing the prize tokens\n\n` +
      `Room address: ${roomAddress}`
    );
  }

  console.log('[EVM][DEPLOY][Asset] ⚠️ Important: Host must now:');
  console.log('[EVM][DEPLOY][Asset]   1. Approve prize tokens to room contract');
  console.log('[EVM][DEPLOY][Asset]   2. Call uploadPrize(1) for first place prize');
  console.log('[EVM][DEPLOY][Asset]   3. Call uploadPrize(N) for other prizes if configured');

  return {
    success: true,
    contractAddress: roomAddress,
    txHash: createHash as `0x${string}`,
    explorerUrl: `${explorer}/tx/${createHash}`,
  };
}

/**
 * EVM deployment hook
 */
export function useEvmDeploy() {
  const { wagmiConfig, resolveTarget } = useEvmShared();

  const deploy = useCallback(
    async (params: EvmDeployParams): Promise<EvmDeployResult> => {
      const target = await resolveTarget();

      const helpers = {
        wagmiConfig,
        targetKey: target.key,
        targetId: target.id,
        explorer: target.explorer,
      };

      if (params.prizeMode === 'assets') {
        return deployAssetRoom(params, helpers);
      } else {
        return deployPoolRoom(params, helpers);
      }
    },
    [wagmiConfig, resolveTarget]
  );

  return { deploy };
}