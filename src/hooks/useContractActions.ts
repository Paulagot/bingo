/**
 * Multi-Chain Contract Actions Hook
 * Fixed version with no hook violations
 */
import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';
import { useSolanaWalletContext } from '../chains/solana/SolanaWalletProvider';
import { useSolanaContract } from '../chains/solana/useSolanaContract';

import type { SupportedChain } from '../chains/types';
import { keccak256, stringToHex } from 'viem';
import { getAccount } from 'wagmi/actions';

import { getTgbNetworkLabel } from '../chains/tgbNetworks';

/* ------------------------- EVM imports ------------------------- */
import { writeContract, waitForTransactionReceipt, getChainId, readContract } from 'wagmi/actions';
import { config as wagmiConfig } from '../config';
import { resolveEvmTarget, explorerFor } from '../chains/evm/utils/evmSelect';
import {
  POOL_FACTORY,
  PoolFactoryABI,
} from '../chains/evm/config/contracts.pool';
import {
  ASSET_FACTORY,
  AssetFactoryABI,
} from '../chains/evm/config/contracts.asset';

import { decodeEventLog } from 'viem';
import { USDC } from '../chains/evm/config/tokens';

import PoolRoomABI from '../abis/quiz/BaseQuizPoolRoom2.json';
import { erc20Abi as ERC20_ABI } from 'viem';
import AssetRoomABI from '../abis/quiz/BaseQuizAssetRoom.json';

/* ------------------------- Solana imports ------------------------- */
import { TOKEN_MINTS, PROGRAM_ID, PDA_SEEDS } from '@/shared/lib/solana/config';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useSolanaWalletContextSafe } from '../chains/solana/SolanaWalletProvider';

const DEBUG_WEB3 = true;

/** ---------- Types ---------- */
export type DeployParams = {
  roomId: string;
  hostId: string;
  currency?: string;
  entryFee?: string | number;
  hostFeePct?: number;
  prizeMode?: 'split' | 'assets';
  charityName?: string;
  charityAddress?: string;
  prizePoolPct?: number;
  prizeSplits?: { first: number; second?: number; third?: number };
  expectedPrizes?: Array<{ tokenAddress: string; amount: string }>;
  hostWallet: string;
  hostMetadata?: {
    hostName?: string;
    eventDateTime?: string;
    totalRounds?: number;
  };
};

export type DeployResult = {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
};

type JoinArgs = {
  roomId: string;
  extrasAmount?: string;
  feeAmount?: any;
  roomAddress?: any;
  currency?: string;
};

type JoinResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type DistributeArgs = {
  roomId: string;
  roomAddress?: string;
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
    amount?: string;
  }>;
  charityOrgId?: string;
  charityName?: string;
  charityAddress?: string;
  web3Chain?: string;
  evmNetwork?: string;
  charityWallet?: string;
  charityAmountPreview?: string;
  charityCurrency?: string;
};

type DistributeResult =
  | {
      success: true;
      txHash: string;
      explorerUrl?: string | undefined;
      cleanupTxHash?: string | undefined;
      rentReclaimed?: number | undefined;
      error?: string | undefined;
      charityAmount?: string | undefined;
    }
  | { success: false; error: string };

type Options = { chainOverride?: SupportedChain | null };

/* ---------- Helpers ---------- */
function bigintToDecimalString(value: bigint, decimals: number) {
  const s = value.toString().padStart(decimals + 1, '0');
  const i = s.length - decimals;
  const whole = s.slice(0, i);
  const frac = s.slice(i).replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : whole;
}

async function assertFirstPrizeUploaded(params: {
  roomAddress: `0x${string}`;
  chainId: number;
}) {
  const { roomAddress, chainId } = params;

  const [places, _types, _assets, _amounts, _tokenIds, uploaded] =
    (await readContract(wagmiConfig, {
      address: roomAddress,
      abi: AssetRoomABI,
      functionName: 'getAllPrizes',
      chainId,
    })) as [number[], number[], `0x${string}`[], bigint[], bigint[], boolean[]];

  const idx = places.findIndex((p) => Number(p) === 1);
  if (idx === -1) {
    throw new Error('First prize (place 1) not configured yet. Configure it before opening joins.');
  }
  if (!uploaded[idx]) {
    throw new Error('First prize (place 1) is configured but not uploaded. Call uploadPrize(1) first.');
  }
}

/* ---------------- Main hook ---------------- */
export function useContractActions(opts?: Options) {
  const { selectedChain } = useQuizChainIntegration({
    chainOverride: opts?.chainOverride ?? null,
  });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // ✅ FIXED: Always call hooks unconditionally (Rules of Hooks)
  // These hooks are called every render, regardless of chain
  const solanaContractResult = useSolanaContract();
const solanaWalletResult = useSolanaWalletContextSafe();

  // Then use them conditionally based on chain
  const solanaContract = effectiveChain === 'solana' ? solanaContractResult : null;
  const solanaWallet = effectiveChain === 'solana' ? solanaWalletResult : null;

  const getHostAddress = useCallback((fallback: string) => {
    return fallback;
  }, []);

  /** ---------------- Player: joinRoom ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async (_args: JoinArgs): Promise<JoinResult> => {
        return {
          success: false,
          error: 'Stellar join must be handled through StellarLaunchSection component',
        };
      };
    }

    if (effectiveChain === 'solana') {
      return async ({ roomId, feeAmount, extrasAmount, currency }: JoinArgs): Promise<JoinResult> => {
        try {
          if (!solanaContract || !solanaContract.isReady) {
            return { success: false, error: 'Solana contract not ready' };
          }
          if (!solanaContract.publicKey) {
            return { success: false, error: 'Wallet not connected' };
          }

          const curr = (currency ?? 'SOL').toUpperCase();
          const decimals = curr === 'SOL' ? 9 : 6;
          const multiplier = Math.pow(10, decimals);

          const entryFeeLamports = new BN(parseFloat(String(feeAmount ?? '0')) * multiplier);
          const extrasLamports = extrasAmount
            ? new BN(parseFloat(String(extrasAmount)) * multiplier)
            : new BN(0);

          console.log('[useContractActions] Solana joinRoom:', {
            roomId,
            feeAmount,
            currency: curr,
            decimals,
            entryFeeLamports: entryFeeLamports.toString(),
            extrasAmount,
            extrasLamports: extrasLamports.toString(),
          });

          const res = await solanaContract.joinRoom({
            roomId,
            entryFee: entryFeeLamports,
            extrasAmount: extrasLamports,
          });

          return {
            success: true,
            txHash: res.signature as `0x${string}`,
          };
        } catch (e: any) {
          console.error('[Solana joinRoom error]', e);
          return { success: false, error: e?.message || 'Solana join failed' };
        }
      };
    }

    if (effectiveChain === 'evm') {
      return async ({ feeAmount, extrasAmount, roomAddress }: JoinArgs): Promise<JoinResult> => {
        try {
          if (!roomAddress || typeof roomAddress !== 'string') {
            return { success: false, error: 'Missing room contract address' };
          }

          const setup = JSON.parse(localStorage.getItem('setupConfig') || '{}');
          const prizeMode: 'assets' | 'split' | 'pool' | undefined = setup?.prizeMode;

          let runtimeChainId: number | null = null;
          try {
            runtimeChainId = await getChainId(wagmiConfig);
          } catch {
            runtimeChainId = null;
          }

          const setupKey = setup?.evmNetwork as string | undefined;
          const target = resolveEvmTarget({
            setupKey: setupKey ?? null,
            runtimeChainId: runtimeChainId ?? null,
          });
          const chainId = target.id;
          const roomAddr = roomAddress as `0x${string}`;

          const isAssetRoom = prizeMode === 'assets';
          const RoomABI = isAssetRoom ? AssetRoomABI : PoolRoomABI;

          const tokenAddr = (await readContract(wagmiConfig, {
            address: roomAddr,
            abi: RoomABI,
            functionName: 'TOKEN',
            chainId,
          })) as `0x${string}`;

          const decimals = (await readContract(wagmiConfig, {
            address: tokenAddr,
            abi: ERC20_ABI,
            functionName: 'decimals',
            chainId,
          })) as number;

          const toUnits = (x: any) => {
            const n = Number(x || 0);
            const mul = 10 ** (decimals || 6);
            return BigInt(Math.round(n * mul));
          };

          const feePaid = toUnits(feeAmount ?? 0);
          const extrasPaid = toUnits(extrasAmount ?? 0);
          const total = feePaid + extrasPaid;

          if (isAssetRoom) {
            await assertFirstPrizeUploaded({ roomAddress: roomAddr, chainId });
          }

          try {
            const acct = getAccount(wagmiConfig)?.address as `0x${string}` | undefined;
            if (acct) {
              const already = (await readContract(wagmiConfig, {
                address: roomAddr,
                abi: RoomABI,
                functionName: 'joined',
                args: [acct],
                chainId,
              })) as boolean;
              if (already) {
                return { success: true, txHash: '0x' as `0x${string}` };
              }
            }
          } catch {
            /* ignore */
          }

          if (total > 0n) {
            const approveHash = await writeContract(wagmiConfig, {
              address: tokenAddr,
              abi: ERC20_ABI,
              functionName: 'approve',
              args: [roomAddr, total],
              chainId,
            });
            await waitForTransactionReceipt(wagmiConfig, { hash: approveHash, chainId });
          }

          const joinHash = await writeContract(wagmiConfig, {
            address: roomAddr,
            abi: RoomABI,
            functionName: 'join',
            args: [feePaid, extrasPaid],
            chainId,
          });
          await waitForTransactionReceipt(wagmiConfig, { hash: joinHash, chainId });

          return { success: true, txHash: joinHash as `0x${string}` };
        } catch (e: any) {
          let msg = e?.message || 'join failed';
          if (/need 1st/i.test(msg)) {
            msg =
              'Join blocked: first prize (place #1) must be uploaded. Configure and call uploadPrize(1).';
          } else if (/execution reverted/i.test(msg)) {
            msg = `Contract reverted: ${msg.replace('execution reverted: ', '')}`;
          }
          return { success: false, error: msg };
        }
      };
    }

    return async (_args: JoinArgs): Promise<JoinResult> => ({
      success: false,
      error: `joinRoom not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, solanaContract]);

  /** ---------------- Prize Distribution ---------------- */
  const distributePrizes = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async (): Promise<DistributeResult> => {
        return {
          success: false,
          error: 'Stellar prize distribution must be handled through StellarLaunchSection component',
        };
      };
    }

  if (effectiveChain === 'solana') {
  return async ({
    roomId,
    winners,
    roomAddress,
    charityWallet,
    charityOrgId,
    charityAmountPreview,
    charityCurrency,
  }: DistributeArgs): Promise<DistributeResult> => {
    try {
      if (!solanaContract || !solanaContract.isReady) {
        return { success: false, error: 'Solana contract not ready' };
      }
      if (!solanaContract.publicKey) {
        return { success: false, error: 'Wallet not connected' };
      }
      if (!roomAddress) {
        return {
          success: false,
          error: 'Missing Solana room address (PDA) for prize distribution',
        };
      }

      const winnerAddresses = winners
        .map((w) => w.address)
        .filter((addr): addr is string => !!addr);

      if (winnerAddresses.length === 0) {
        return { success: false, error: 'No valid winner addresses' };
      }

      let effectiveCharityWallet = charityWallet;

      // ✅ IMMEDIATE FIX: Use backend-provided charityAmountPreview directly
      // Skip the on-chain previewCharityPayout which is failing due to missing token account
      if (!effectiveCharityWallet && charityOrgId && charityAmountPreview) {
        const currencySym = (charityCurrency || 'USDC').toUpperCase();

        console.log('[Solana][TGB] Using backend charityAmountPreview:', {
          organizationId: charityOrgId,
          currency: currencySym,
          network: 'solana',
          amount: charityAmountPreview,
        });

        const resp = await fetch('/api/tgb/create-deposit-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: charityOrgId,
            currency: currencySym,
            network: 'solana',
            amount: charityAmountPreview,
            metadata: { roomId },
          }),
        });

        const dep = await resp.json();
        if (resp.ok && dep?.ok && dep.depositAddress) {
          effectiveCharityWallet = dep.depositAddress as string;
          console.log('[Solana][TGB] Got deposit address:', effectiveCharityWallet);
        } else {
          console.error('[Solana][TGB] deposit address request failed:', dep);
          return {
            success: false,
            error:
              dep?.error ||
              'Could not get The Giving Block deposit address for Solana charity payout',
          };
        }
      }

      // Fallback: if we still don't have a charity wallet but have charityOrgId (shouldn't happen now)
      if (!effectiveCharityWallet && charityOrgId) {
        console.error('[Solana][TGB] No charityAmountPreview provided from backend');
        return {
          success: false,
          error: 'Missing charity amount preview from backend. Cannot get TGB deposit address.',
        };
      }

      if (!effectiveCharityWallet) {
        return {
          success: false,
          error: 'Missing charity wallet for Solana prize distribution',
        };
      }

      console.log('[Solana] Calling distributePrizes with:', {
        roomId,
        winnersCount: winnerAddresses.length,
        roomAddress,
        charityWallet: effectiveCharityWallet,
      });

      const distributeParams: any = {
        roomId,
        winners: winnerAddresses,
        roomAddress,
        charityWallet: effectiveCharityWallet,
      };

      const res = await (solanaContract as any).distributePrizes(distributeParams);

      return {
        success: true,
        txHash: res.signature as `0x${string}`,
        cleanupTxHash: res.cleanupSignature as `0x${string}` | undefined,
        rentReclaimed: res.rentReclaimed,
        charityAmount: res.charityAmount?.toString(),
      };
    } catch (e: any) {
      console.error('[Solana distributePrizes error]', e);
      return { success: false, error: e?.message || 'Solana prize distribution failed' };
    }
  };
}

    if (effectiveChain === 'evm') {
      return async ({
        roomId: _roomId,
        winners,
        ...rest
      }: DistributeArgs): Promise<DistributeResult> => {
        try {
          console.log('🎯 [EVM] Starting prize distribution:', { winners });

          const runtimeChainId = await getChainId(wagmiConfig);

          if (!runtimeChainId) {
            throw new Error('No active chain detected. Please connect your wallet.');
          }

          console.log('✅ [EVM] Chain ID confirmed:', runtimeChainId);

          const setup = JSON.parse(localStorage.getItem('setupConfig') || '{}');
          const setupKey = setup?.evmNetwork as string | undefined;
          const target = resolveEvmTarget({
            setupKey: setupKey ?? null,
            runtimeChainId,
          });

          console.log('🔍 [EVM] Resolved target:', target);

          const roomAddress = (rest as any)?.roomAddress;

          if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
            console.error('❌ [EVM] Invalid room address:', roomAddress);
            return {
              success: false,
              error: 'Missing or invalid EVM room contract address',
            };
          }

          console.log('📍 [EVM] Room contract:', roomAddress);

          const addrs = winners
            .map((w) => w.address)
            .filter((addr): addr is string => {
              if (!addr) return false;
              if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
                console.warn('⚠️ [EVM] Invalid winner address:', addr);
                return false;
              }
              return true;
            });

          if (addrs.length === 0) {
            console.error('❌ [EVM] No valid winner addresses found');
            return { success: false, error: 'No valid winner addresses' };
          }

          console.log('🏆 [EVM] Winner addresses:', addrs);

          console.log('🔒 [EVM] Locking room for settlement...');

          const accountInfo = getAccount(wagmiConfig);
          console.log('🔍 [EVM] Account info:', accountInfo);

          if (!accountInfo.address) {
            throw new Error('No wallet address found. Please reconnect your wallet.');
          }

          const account = accountInfo.address;
          console.log('🔍 [EVM] Using account for transaction:', account);

          try {
            const contractHost = await readContract(wagmiConfig, {
              address: roomAddress as `0x${string}`,
              abi: PoolRoomABI,
              functionName: 'HOST',
              chainId: target.id,
            });

            console.log('🔍 [EVM] Contract HOST address:', contractHost);
            console.log('🔍 [EVM] Current wallet address:', account);
            console.log(
              '🔍 [EVM] Do they match?',
              String(contractHost).toLowerCase() === String(account).toLowerCase()
            );

            if (String(contractHost).toLowerCase() !== String(account).toLowerCase()) {
              throw new Error(
                `Wrong wallet connected. Need HOST wallet: ${contractHost}, but connected with: ${account}`
              );
            }
          } catch (e) {
            console.error('❌ Failed to verify HOST:', e);
            throw e;
          }

          const lockTxHash = await writeContract(wagmiConfig, {
            address: roomAddress as `0x${string}`,
            abi: PoolRoomABI,
            functionName: 'lockForSettlement',
            args: [],
            chainId: target.id,
            account: account as `0x${string}`,
          });

          await waitForTransactionReceipt(wagmiConfig, {
            hash: lockTxHash,
            chainId: target.id,
            confirmations: 1,
          });
          console.log('✅ [EVM] Room locked successfully:', lockTxHash);

          console.log('🔍 [EVM] Reading charity payout preview from contract...');

          let preview: unknown;
          try {
            preview = await readContract(wagmiConfig, {
              address: roomAddress as `0x${string}`,
              abi: PoolRoomABI,
              functionName: 'previewCharityPayout',
              chainId: target.id,
            });

            console.log('📦 [EVM] Raw preview response:', preview);
          } catch (readError: any) {
            console.error('❌ [EVM] Failed to read previewCharityPayout:', readError);
            throw new Error(`Failed to read charity payout preview: ${readError.message}`);
          }

          if (!preview) {
            throw new Error('previewCharityPayout returned null/undefined');
          }

          let charityAmt: bigint;
          let token: `0x${string}`;

          if (Array.isArray(preview)) {
            token = preview[0] as `0x${string}`;
            charityAmt = preview[2] as bigint;
          } else if (typeof preview === 'object' && preview !== null) {
            const previewObj = preview as any;
            token = previewObj.token || previewObj[0];
            charityAmt = previewObj.charityAmt || previewObj[2];
          } else {
            throw new Error(`Unexpected preview format: ${typeof preview}`);
          }

          if (!token || !charityAmt) {
            console.error('❌ [EVM] Missing required values from preview:', { token, charityAmt });
            throw new Error('previewCharityPayout did not return expected values');
          }

          const tgbOrgId =
            (setup?.web3CharityOrgId as string | undefined) || (rest as any)?.charityOrgId;

          let recipientAddressForFinalize: `0x${string}` | null = null;

          if (tgbOrgId) {
            try {
              const currencySym = (
                setup?.currencySymbol ||
                setup?.web3Currency ||
                'USDC'
              ).toUpperCase();

              const tgbNetwork = getTgbNetworkLabel({
                web3Chain: 'evm',
                evmTargetKey: target.key,
                solanaCluster: null,
              });

              const decimals = (await readContract(wagmiConfig, {
                address: token,
                abi: ERC20_ABI,
                functionName: 'decimals',
                chainId: target.id,
              })) as number;

              const charityAmtDecimal = bigintToDecimalString(charityAmt, decimals);

              const resp = await fetch('/api/tgb/create-deposit-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  organizationId: tgbOrgId,
                  currency: currencySym,
                  network: tgbNetwork,
                  amount: charityAmtDecimal,
                  metadata: { roomId: _roomId },
                }),
              });

              const dep = await resp.json();
              if (!resp.ok || !dep?.ok || !dep?.depositAddress) {
                console.error('TGB deposit address request failed:', dep);
                throw new Error(dep?.error || 'Could not get The Giving Block deposit address');
              }

              recipientAddressForFinalize = dep.depositAddress as `0x${string}`;
              console.log(
                '✅ [TGB] Using deposit address for finalize:',
                recipientAddressForFinalize
              );
            } catch (tgbErr: any) {
              console.warn(
                '⚠️ [TGB] Falling back to configured charity wallet due to error:',
                tgbErr?.message || tgbErr
              );
              recipientAddressForFinalize = null;
            }
          }

          if (!recipientAddressForFinalize) {
            const charityWallet = (rest as any)?.charityAddress;
            console.log('🔍 [EVM] Charity info from room config (fallback):', {
              wallet: charityWallet,
            });

            if (!charityWallet || !/^0x[0-9a-fA-F]{40}$/.test(charityWallet)) {
              console.error('❌ [EVM] Invalid charity wallet:', charityWallet);
              throw new Error(
                'Invalid charity wallet address. Room configuration may be incomplete.'
              );
            }

            recipientAddressForFinalize = charityWallet as `0x${string}`;
          }

          const offchainIntentId = `FR-${_roomId}-${Date.now()}`;
          const intentIdHash = keccak256(stringToHex(offchainIntentId, { size: 32 }));

          console.log('🎁 [EVM] Calling finalize on contract...');

          const hash = await writeContract(wagmiConfig, {
            address: roomAddress as `0x${string}`,
            abi: PoolRoomABI,
            functionName: 'finalize',
            args: [addrs as `0x${string}`[], recipientAddressForFinalize, intentIdHash],
            chainId: target.id,
            account: account as `0x${string}`,
          });

          console.log('📝 [EVM] Finalize transaction submitted:', hash);

          const receipt = await waitForTransactionReceipt(wagmiConfig, {
            hash,
            chainId: target.id,
            confirmations: 1,
          });

          console.log('✅ [EVM] Transaction confirmed:', {
            hash,
            blockNumber: receipt.blockNumber,
            status: receipt.status,
          });

          if (receipt.status !== 'success') {
            throw new Error('Transaction reverted on-chain');
          }

          const explorerUrl = explorerFor(target.key);

          return {
            success: true,
            txHash: hash as `0x${string}`,
            explorerUrl: `${explorerUrl}/tx/${hash}`,
          };
        } catch (e: any) {
          console.error('❌ [EVM] Prize distribution error:', e);

          let errorMessage = e?.message || 'EVM finalize failed';

          if (errorMessage.includes('user rejected')) {
            errorMessage = 'Transaction was rejected by user';
          } else if (errorMessage.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for gas fees';
          } else if (errorMessage.includes('execution reverted')) {
            errorMessage = 'Contract execution reverted. Check if prizes can be distributed.';
          }

          return {
            success: false,
            error: errorMessage,
          };
        }
      };
    }

    return async (): Promise<DistributeResult> => ({
      success: false,
      error: 'Prize distribution not implemented for this chain',
    });
  }, [effectiveChain, solanaContract]);

  /* ------------------------ EVM helpers & deployer ------------------------ */
  const toBps16 = (pct?: number) => {
    const n = Number.isFinite(pct as any) ? Number(pct) : 0;
    const clamped = Math.max(0, Math.min(100, n));
    const bps = Math.round(clamped * 100);
    return Math.min(65535, bps);
  };

  function getErc20ForCurrency(currency: string | undefined, targetKey: string): `0x${string}` {
    const sym = (currency || 'USDC').toUpperCase();

    if (sym === 'USDC') {
      const addr = (USDC as any)[targetKey];
      if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) return addr;
      throw new Error(`USDC address not configured for ${targetKey}`);
    }

    if (sym === 'USDGLO' || sym === 'GLOUSD' || sym === 'GLO') {
      throw new Error('Glo Dollar token address is not configured yet for this network');
    }

    throw new Error(`Unsupported token: ${sym}`);
  }

  const deployEvm = useCallback(
    async (p: DeployParams, which: 'pool' | 'asset'): Promise<DeployResult> => {
      let runtimeChainId: number | null = null;
      try {
        runtimeChainId = await getChainId(wagmiConfig);
      } catch {
        runtimeChainId = null;
      }

      const setup = JSON.parse(localStorage.getItem('setupConfig') || '{}');
      const setupKey = setup?.evmNetwork as string | undefined;
      const target = resolveEvmTarget({
        setupKey: setupKey ?? null,
        runtimeChainId: runtimeChainId ?? null,
      });
      const explorer = explorerFor(target.key);

      const isPool = which === 'pool';
      const factory = (
        isPool ? (POOL_FACTORY as any)[target.key] : (ASSET_FACTORY as any)[target.key]
      ) as string | undefined;
      const abi = isPool ? PoolFactoryABI : AssetFactoryABI;

      if (!factory || !/^0x[0-9a-fA-F]{40}$/.test(factory)) {
        throw new Error(`No factory configured for ${target.key} (${target.id}).`);
      }

      if (isPool) {
        const token = getErc20ForCurrency(p.currency, target.key);
        const host = p.hostWallet;

        if (!/^0x[0-9a-fA-F]{40}$/.test(host)) {
          throw new Error('Host wallet is not a valid EVM address.');
        }

        const hostPayPct = Number(p.hostFeePct ?? 0);
        const prizePoolPct = Number(p.prizePoolPct ?? 0);

        const hostTotalBps = toBps16(hostPayPct + prizePoolPct);
        const hostPayBps = toBps16(hostPayPct);

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

        const split1 = toBps16(p.prizeSplits?.first ?? 100);
        const split2 = toBps16(p.prizeSplits?.second ?? 0);
        const split3 = toBps16(p.prizeSplits?.third ?? 0);

        const args = [
          p.roomId,
          token as `0x${string}`,
          host as `0x${string}`,
          hostTotalBps,
          hostPayBps,
          split1,
          split2,
          split3,
        ] as const;

        if (DEBUG_WEB3) {
          console.log('[EVM][DEPLOY] target', target);
          console.log('[EVM][DEPLOY] prizeMode -> POOL');
          console.log('[EVM][DEPLOY] factory @', factory);
          console.log('[EVM][DEPLOY] writeContract', {
            chainId: target.id,
            factory,
            functionName: 'createPoolRoom',
            argsPreview: args,
          });
        }

        const hash = await writeContract(wagmiConfig, {
          address: factory as `0x${string}`,
          abi,
          functionName: 'createPoolRoom',
          args,
          chainId: target.id,
        });

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId: target.id,
        });

        let roomAddress: string | null = null;
        try {
          for (const log of receipt.logs || []) {
            try {
              const decoded = decodeEventLog({
                abi,
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
              // ignore
            }
          }
        } catch {
          // ignore
        }

        if (!roomAddress) {
          roomAddress = (receipt.logs?.[0] as any)?.address ?? null;
        }

        if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
          throw new Error('Deployment succeeded but could not resolve room address from logs.');
        }

        return {
          success: true,
          contractAddress: roomAddress,
          txHash: hash as `0x${string}`,
          explorerUrl: `${explorer}/tx/${hash}`,
        };
      }

      // Asset room deployment
      const token = getErc20ForCurrency(p.currency, target.key);
      const host = p.hostWallet;

      if (!/^0x[0-9a-fA-F]{40}$/.test(host)) {
        throw new Error('Host wallet is not a valid EVM address.');
      }

      const hostPayBps = toBps16(p.hostFeePct ?? 0);

      const args = [p.roomId, token as `0x${string}`, host as `0x${string}`, hostPayBps] as const;

      if (DEBUG_WEB3) {
        console.log('[EVM][DEPLOY] target', target);
        console.log('[EVM][DEPLOY] prizeMode -> ASSETS');
        console.log('[EVM][DEPLOY] factory @', factory);
        console.log('[EVM][DEPLOY] writeContract', {
          chainId: target.id,
          factory,
          functionName: 'createAssetRoom',
          argsPreview: args,
        });
      }

      const hash = await writeContract(wagmiConfig, {
        address: factory as `0x${string}`,
        abi,
        functionName: 'createAssetRoom',
        args,
        chainId: target.id,
      });

      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: target.id });

      let roomAddress: string | null = null;
      try {
        for (const log of receipt.logs || []) {
          try {
            const decoded = decodeEventLog({
              abi,
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
            // ignore
          }
        }
      } catch {
        // ignore
      }

      if (!roomAddress) {
        roomAddress = (receipt.logs?.[0] as any)?.address ?? null;
      }

      if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
        throw new Error('Deployment succeeded but could not resolve asset room address from logs.');
      }

      return {
        success: true,
        contractAddress: roomAddress,
        txHash: hash as `0x${string}`,
        explorerUrl: `${explorer}/tx/${hash}`,
      };
    },
    []
  );

  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      if (effectiveChain === 'stellar') {
        throw new Error(
          'Stellar deployment must be handled through StellarLaunchSection component'
        );
      }

      if (effectiveChain === 'evm') {
        const hostAddress = getHostAddress(params.hostWallet);
        const currency: string = params.currency ?? 'XLM';
        const entryFee: string | number = params.entryFee ?? '1.0';
        const hostFeePct: number = params.hostFeePct ?? 0;
        const prizePoolPct = params.prizePoolPct ?? 0;
        const prizeSplits = params.prizeSplits ?? { first: 100 };

        return deployEvm(
          {
            ...params,
            currency,
            entryFee,
            hostFeePct,
            prizePoolPct,
            prizeSplits,
            hostWallet: hostAddress,
          },
          params.prizeMode === 'assets' ? 'asset' : 'pool'
        );
      }

      if (effectiveChain === 'solana') {
        if (!solanaContract || !solanaContract.isReady) {
          throw new Error('Solana contract not ready');
        }
        if (!solanaContract.publicKey) {
          throw new Error('Wallet not connected');
        }

        const currency = (params.currency ?? 'USDC').toUpperCase();
        const feeTokenMint =
          currency === 'USDC'
            ? TOKEN_MINTS.USDC
            : currency === 'PYUSD'
            ? TOKEN_MINTS.PYUSD
            : currency === 'USDT'
            ? TOKEN_MINTS.USDT
            : TOKEN_MINTS.USDC;

        const decimals = currency === 'SOL' ? 9 : 6;
        const multiplier = Math.pow(10, decimals);

        console.log(
          '[deploy] Solana currency:',
          currency,
          'mint:',
          feeTokenMint.toBase58(),
          'decimals:',
          decimals
        );

        const entryFeeLamports = new BN(parseFloat(String(params.entryFee ?? '1.0')) * multiplier);

        let charityWallet: PublicKey;
        try {
          if (params.charityAddress) {
            try {
              charityWallet = new PublicKey(params.charityAddress);
              console.log(
                '[deploy] ✅ Using charity wallet from params:',
                charityWallet.toBase58()
              );
            } catch (pubkeyError: any) {
              console.error(
                '[deploy] ❌ Invalid charity address in params:',
                pubkeyError.message
              );
              throw new Error(`Invalid charity address in params: ${pubkeyError.message}`);
            }
          } else {
            const anyContract = solanaContract as any;
            if (anyContract.program && solanaContract.publicKey) {
              try {
                const [globalConfigPDA] = PublicKey.findProgramAddressSync(
                  [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
                  PROGRAM_ID
                );

                const globalConfigAccount =
                  await anyContract.program.account.globalConfig.fetch(globalConfigPDA);
                charityWallet = globalConfigAccount.charityWallet as PublicKey;
                console.log(
                  '[deploy] ✅ Using charity wallet from GlobalConfig:',
                  charityWallet.toBase58()
                );

                if (charityWallet.equals(solanaContract.publicKey)) {
                  console.warn(
                    "[deploy] ⚠️ WARNING: GlobalConfig charity wallet is the user's wallet. This is OK for devnet/testing."
                  );
                }
              } catch (fetchError: any) {
                console.log(
                  '[deploy] GlobalConfig not found or not initialized:',
                  fetchError.message
                );
                console.log(
                  '[deploy] ℹ️ Will use platform wallet as fallback - createPoolRoom will initialize GlobalConfig with it'
                );

                charityWallet = solanaContract.publicKey;
                console.log(
                  '[deploy] ✅ Using platform wallet as charity wallet fallback (will be used to initialize GlobalConfig):',
                  charityWallet.toBase58()
                );
                console.log(
                  '[deploy] ℹ️ Note: This is a placeholder. The actual TGB charity address will be used during prize distribution.'
                );
              }
            } else {
              if (!solanaContract.publicKey) {
                throw new Error('Wallet not connected - cannot determine charity wallet');
              }
              charityWallet = solanaContract.publicKey;
              console.log(
                '[deploy] ✅ Using platform wallet as charity wallet (program not ready):',
                charityWallet.toBase58()
              );
            }
          }
        } catch (error: any) {
          console.error('[deploy] ❌ Failed to get charity wallet:', error);
          if (
            error.message.includes('Invalid charity address') ||
            error.message.includes('Wallet not connected')
          ) {
            throw error;
          }
          throw new Error(
            `Failed to get charity wallet: ${error.message}. ` +
              `This may indicate a network issue or the Solana program is not properly initialized.`
          );
        }

        console.log(
          '[deploy] 📋 Final charity wallet for room creation:',
          charityWallet.toBase58()
        );
        console.log(
          '[deploy] ℹ️ Note: TGB dynamic charity addresses are used during prize distribution, not room creation.'
        );

        if (params.prizeMode === 'assets') {
          if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
            throw new Error('Asset room requires at least 1 prize');
          }

          const prizes = params.expectedPrizes.slice(0, 3);
          const [p1, p2, p3] = prizes;

          if (!p1) {
            throw new Error('Asset room requires at least 1 prize');
          }

          const prizeDecimals = 6;
          const prizeMultiplier = Math.pow(10, prizeDecimals);

          const prize1Mint = new PublicKey(p1.tokenAddress);
          const prize1Amount = new BN(parseFloat(p1.amount) * prizeMultiplier);

          const prize2Mint = p2 ? new PublicKey(p2.tokenAddress) : undefined;
          const prize2Amount = p2 ? new BN(parseFloat(p2.amount) * prizeMultiplier) : undefined;
          const prize3Mint = p3 ? new PublicKey(p3.tokenAddress) : undefined;
          const prize3Amount = p3 ? new BN(parseFloat(p3.amount) * prizeMultiplier) : undefined;

          const assetRoomParams: any = {
            roomId: params.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: (params.hostFeePct ?? 0) * 100,
            charityMemo: params.charityName?.substring(0, 28) || 'Asset room',
            feeTokenMint,
            prize1Mint,
            prize1Amount,
          };

          if (prize2Mint && prize2Amount) {
            assetRoomParams.prize2Mint = prize2Mint;
            assetRoomParams.prize2Amount = prize2Amount;
          }
          if (prize3Mint && prize3Amount) {
            assetRoomParams.prize3Mint = prize3Mint;
            assetRoomParams.prize3Amount = prize3Amount;
          }

          const res = await (solanaContract as any).createAssetRoom(assetRoomParams);

          return {
            success: true,
            contractAddress: res.room,
            txHash: res.signature,
          };
        } else {
          const firstPlacePct = params.prizeSplits?.first ?? 100;
          const secondPlacePct = params.prizeSplits?.second ?? 0;
          const thirdPlacePct = params.prizeSplits?.third ?? 0;

          const res = await solanaContract.createPoolRoom({
            roomId: params.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: (params.hostFeePct ?? 0) * 100,
            prizePoolBps: (params.prizePoolPct ?? 0) * 100,
            firstPlacePct,
            secondPlacePct,
            thirdPlacePct,
            charityMemo: params.charityName?.substring(0, 28) || 'Quiz charity',
            feeTokenMint,
          });

          return {
            success: true,
            contractAddress: res.room,
            txHash: res.signature,
          };
        }
      }

      throw new Error(`Deployment not implemented for ${effectiveChain} chain`);
    },
    [effectiveChain, getHostAddress, deployEvm, solanaContract]
  );

  return { deploy, joinRoom, distributePrizes };
}





