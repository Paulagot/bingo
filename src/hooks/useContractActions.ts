/**
 * Multi-Chain Contract Actions Hook
 *
 * Provides a unified interface for deploying and managing fundraising rooms across multiple
 * blockchain networks (Solana, EVM chains, Stellar). Handles chain-specific contract deployment,
 * room creation, joining, and prize distribution with consistent API across all supported chains.
 *
 * ## Key Features
 *
 * ### Multi-Chain Support
 * - **Solana**: Anchor program integration with PDA-based rooms
 * - **EVM**: Factory pattern for Base, Polygon, and other EVM chains
 * - **Stellar**: Soros contract integration for Stellar network
 *
 * ### Charity Wallet Handling
 *
 * The charity wallet is determined using the following priority:
 * 1. **Params**: Use charity wallet provided in params.charityAddress (highest priority)
 * 2. **GlobalConfig (Solana)**: If GlobalConfig is initialized, use charity wallet from it
 * 3. **Fallback**: Use platform wallet as fallback (createPoolRoom will initialize GlobalConfig with it)
 *
 * Note: For Solana, the charity wallet used at room creation is a placeholder stored in the room.
 * The actual TGB dynamic charity address is used during prize distribution via the charity_token_account
 * parameter in the end_room instruction. This allows each transaction to use a different TGB address.
 *
 * This ensures that room creation always succeeds, and GlobalConfig is automatically initialized
 * if it doesn't exist. The actual charity routing happens at prize distribution time.
 *
 * ### Room Deployment
 *
 * - **Pool Rooms**: Prize pool from collected entry fees
 * - **Asset Rooms**: Pre-deposited prize assets (NFTs, tokens, etc.)
 * - **Fee Structure**: Platform (20%), Host (0-5%), Prizes (0-35%), Charity (40%+)
 * - **Validation**: Input validation before deployment
 * - **Error Handling**: Chain-specific error formatting
 *
 * ### Prize Distribution
 *
 * - **Multi-Chain**: Supports prize distribution on all chains
 * - **Winner Declaration**: Declare winners before distribution
 * - **Token Account Creation**: Automatic creation of missing token accounts (Solana)
 * - **Transaction Simulation**: Pre-flight simulation to prevent failures
 *
 * ## Usage
 *
 * ```typescript
 * const { deploy, joinRoom, distributePrizes } = useContractActions();
 *
 * // Deploy a room
 * const result = await deploy({
 *   roomId: 'my-room-123',
 *   hostId: 'host-address',
 *   entryFee: '1.0',
 *   hostFeePct: 1,
 *   prizePoolPct: 39,
 *   web3Chain: 'solana',
 *   web3Currency: 'USDC',
 *   charityAddress: 'charity-address',
 * });
 *
 * // Join a room
 * await joinRoom({
 *   roomId: 'my-room-123',
 *   contractAddress: result.contractAddress,
 *   entryFee: '1.0',
 * });
 *
 * // Distribute prizes
 * await distributePrizes({
 *   roomId: 'my-room-123',
 *   contractAddress: result.contractAddress,
 *   winners: ['winner1...', 'winner2...', 'winner3...'],
 * });
 * ```
 *
 * Used by quiz creation wizard and room management components to deploy and manage fundraising
 * rooms across multiple blockchain networks. Integrates with chain-specific hooks and providers
 * to provide a unified interface for Web3 operations.
 */
import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';

// ✅ REMOVED: Don't import Stellar hooks at the top level
// import { useStellarWalletContext } from '../chains/stellar/StellarWalletProvider';
// import { useQuizContract as useStellarQuizContract } from '../chains/stellar/useQuizContract';

import type { SupportedChain } from '../chains/types';
import { keccak256, stringToHex } from 'viem';
import { getAccount } from 'wagmi/actions';

// If you placed tgbNetworks elsewhere, update this import path accordingly.
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
import { useSolanaWalletContext } from '../chains/solana/SolanaWalletProvider';
import { useSolanaContract } from '../chains/solana/useSolanaContract';
import { TOKEN_MINTS, PROGRAM_ID, PDA_SEEDS } from '@/shared/lib/solana/config';
import { BN } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

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
  charityWallet?: string; // ✅ NEW: For Solana, the TGB wallet address to use instead of GlobalConfig
};

type DistributeResult =
  | { success: true; txHash: string; explorerUrl?: string; cleanupTxHash?: string; rentReclaimed?: number; error?: string; charityAmount?: string }
  | { success: false; error: string };

type Options = { chainOverride?: SupportedChain | null };

/* ---------- Helpers ---------- */
function bigintToDecimalString(value: bigint, decimals: number) {
  const s = value.toString().padStart(decimals + 1, '0');
  const i = s.length - decimals;
  const whole = s.slice(0, i);
  const frac = s.slice(i).replace(/0+$/, ''); // trim trailing zeros
  return frac ? `${whole}.${frac}` : whole;
}

async function assertFirstPrizeUploaded(params: {
  roomAddress: `0x${string}`;
  chainId: number;
}) {
  const { roomAddress, chainId } = params;

  const [places, _types, _assets, _amounts, _tokenIds, uploaded] =
    await readContract(wagmiConfig, {
      address: roomAddress,
      abi: AssetRoomABI,
      functionName: 'getAllPrizes',
      chainId,
    }) as [number[], number[], `0x${string}`[], bigint[], bigint[], boolean[]];

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
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // ✅ FIXED: Don't call Stellar hooks here - they throw when provider isn't mounted
  // Instead, we'll dynamically import and use them only in the Stellar branches

  // ✅ Solana: Initialize context when chain is Solana
  let solanaContract: ReturnType<typeof useSolanaContract> | null = null;
  let solanaWallet: ReturnType<typeof useSolanaWalletContext> | null = null;
  try {
    if (effectiveChain === 'solana') {
      solanaContract = useSolanaContract();
      solanaWallet = useSolanaWalletContext();
    }
  } catch {
    solanaContract = null;
    solanaWallet = null;
  }

  const getHostAddress = useCallback(
    (fallback: string) => {
      // For Stellar, the StellarLaunchSection component handles this
      // For EVM, we get it from Wagmi
      // This is just a fallback
      return fallback;
    },
    []
  );

  /** ---------------- Player: joinRoom ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'stellar') {
      // ✅ Return async function that throws error - Stellar must use StellarLaunchSection
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

          // Get correct decimals for the token (SOL = 9, USDC/USDT = 6)
          const curr = (currency ?? 'SOL').toUpperCase();
          const decimals = curr === 'SOL' ? 9 : 6;
          const multiplier = Math.pow(10, decimals);

          const entryFeeLamports = new BN(parseFloat(String(feeAmount ?? '0')) * multiplier);
          const extrasLamports = extrasAmount ? new BN(parseFloat(String(extrasAmount)) * multiplier) : new BN(0);

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
  return async ({ roomId, feeAmount, extrasAmount, roomAddress }: JoinArgs): Promise<JoinResult> => {
    try {
      if (!roomAddress || typeof roomAddress !== 'string') {
        return { success: false, error: 'Missing room contract address' };
      }

      const setup = JSON.parse(localStorage.getItem('setupConfig') || '{}');
      const prizeMode: 'assets' | 'split' | 'pool' | undefined = setup?.prizeMode;

      let runtimeChainId: number | null = null;
      try { runtimeChainId = await getChainId(wagmiConfig); } catch { runtimeChainId = null; }
      const setupKey = (setup?.evmNetwork) as string | undefined;
      const target = resolveEvmTarget({ setupKey, runtimeChainId });
      const chainId = target.id;
      const roomAddr = roomAddress as `0x${string}`;

      // Use your real JSON ABIs here:
      const isAssetRoom = prizeMode === 'assets';
      const RoomABI = isAssetRoom ? AssetRoomABI : PoolRoomABI;

      // Read token + decimals (both ABIs expose TOKEN)
      const tokenAddr = await readContract(wagmiConfig, {
        address: roomAddr,
        abi: RoomABI,
        functionName: 'TOKEN',
        chainId,
      }) as `0x${string}`;

      const decimals = await readContract(wagmiConfig, {
        address: tokenAddr,
        abi: ERC20_ABI,
        functionName: 'decimals',
        chainId,
      }) as number;

      const toUnits = (x: any) => {
        const n = Number(x || 0);
        const mul = 10 ** (decimals || 6);
        return BigInt(Math.round(n * mul));
      };

      const feePaid    = toUnits(feeAmount ?? 0);
      const extrasPaid = toUnits(extrasAmount ?? 0);
      const total      = feePaid + extrasPaid;

      // AssetRoom precondition: prize #1 must be uploaded
      if (isAssetRoom) {
        await assertFirstPrizeUploaded({ roomAddress: roomAddr, chainId });
      }

      // (Optional) prevent double join
      try {
        const acct = getAccount(wagmiConfig)?.address as `0x${string}` | undefined;
        if (acct) {
          const already = await readContract(wagmiConfig, {
            address: roomAddr,
            abi: RoomABI,
            functionName: 'joined',
            args: [acct],
            chainId,
          }) as boolean;
          if (already) {
            return { success: true, txHash: '0x' as `0x${string}` };
          }
        }
      } catch { /* ignore */ }

      // Approve ERC-20 if any amount needs paying
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

      // Call the correct join (same signature in both ABIs)
      const joinHash = await writeContract(wagmiConfig, {
        address: roomAddr,
        abi: RoomABI,
        functionName: 'join', // (feePaid, extrasPaid)
        args: [feePaid, extrasPaid],
        chainId,
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: joinHash, chainId });

      return { success: true, txHash: joinHash as `0x${string}` };
    } catch (e: any) {
      let msg = e?.message || 'join failed';
      if (/need 1st/i.test(msg)) {
        msg = 'Join blocked: first prize (place #1) must be uploaded. Configure and call uploadPrize(1).';
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
      return async ({ roomId, winners, roomAddress, charityWallet }: DistributeArgs): Promise<DistributeResult> => {
        try {
          if (!solanaContract || !solanaContract.isReady) {
            return { success: false, error: 'Solana contract not ready' };
          }
          if (!solanaContract.publicKey) {
            return { success: false, error: 'Wallet not connected' };
          }

          console.log('🎯 [Solana] Starting prize distribution:', { roomId, winners, roomAddress, charityWallet });

          // Extract winner addresses (Solana public keys)
          const winnerAddresses = winners
            .map((w) => w.address)
            .filter((addr): addr is string => !!addr);

          if (winnerAddresses.length === 0) {
            console.error('❌ [Solana] No valid winner addresses found');
            return { success: false, error: 'No valid winner addresses' };
          }

          console.log('🏆 [Solana] Winner addresses:', winnerAddresses);
          if (charityWallet) {
            console.log('💰 [Solana] Using TGB charity wallet:', charityWallet);
          }

          const res = await solanaContract.distributePrizes({
            roomId,
            winners: winnerAddresses,
            roomAddress, // Pass room PDA address from backend
            charityWallet, // ✅ NEW: Pass TGB wallet address (from backend)
          });

          console.log('✅ [Solana] Prize distribution successful:', res.signature);
          
          // Log charity amount from on-chain event (exact amount sent to charity)
          if (res.charityAmount) {
            console.log('💰 [Solana] Charity amount from RoomEnded event:', res.charityAmount.toString());
            console.log('⚠️ [Solana] IMPORTANT: Use this exact charityAmount when reporting to The Giving Block');
          } else {
            console.warn('⚠️ [Solana] Could not parse charityAmount from RoomEnded event. Frontend calculation may differ from on-chain amount.');
          }

          // Check if cleanup (PDA closing) succeeded
          if (res.cleanupError) {
            console.error('⚠️ [Solana] Prize distribution succeeded but PDA cleanup failed:', res.cleanupError);
            // Return success for distribution, but include cleanup error for user awareness
            return {
              success: true,
              txHash: res.signature as `0x${string}`,
              error: `Prizes distributed but PDA cleanup failed: ${res.cleanupError}. Rent can be reclaimed manually.`,
              charityAmount: res.charityAmount?.toString(), // Pass through exact charity amount
            };
          }

          if (res.cleanupSignature) {
            console.log('✅ [Solana] PDA closed and rent reclaimed:', res.cleanupSignature);
          }

          return {
            success: true,
            txHash: res.signature as `0x${string}`,
            cleanupTxHash: res.cleanupSignature as `0x${string}` | undefined,
            rentReclaimed: res.rentReclaimed,
            charityAmount: res.charityAmount?.toString(), // Exact amount sent to charity (from on-chain event)
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
      }: DistributeArgs & { roomAddress?: string }): Promise<DistributeResult> => {
        try {
          console.log('🎯 [EVM] Starting prize distribution:', { winners });

         const runtimeChainId = await getChainId(wagmiConfig);

          if (!runtimeChainId) {
            throw new Error('No active chain detected. Please connect your wallet.');
          }

          console.log('✅ [EVM] Chain ID confirmed:', runtimeChainId);

          const setupKey = (JSON.parse(localStorage.getItem('setupConfig') || '{}')?.evmNetwork) as
            | string
            | undefined;
          const target = resolveEvmTarget({ setupKey, runtimeChainId });

          console.log('🔍 [EVM] Resolved target:', target);

          const roomAddress = (rest as any)?.roomAddress;

          if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
            console.error('❌ [EVM] Invalid room address:', roomAddress);
            return { success: false, error: 'Missing or invalid EVM room contract address' };
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
          // Wait for lock confirmation
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

          // ------------------- TGB deposit address (non-breaking) -------------------
          // We try to fetch a TGB deposit address ONLY if the room setup has a TGB orgId.
          // If not present, we fall back to the old charityWallet path to avoid breaking behavior.
          const setup = JSON.parse(localStorage.getItem('setupConfig') || '{}');
          const tgbOrgId = (setup?.web3CharityOrgId as string | undefined) || (rest as any)?.charityOrgId;

          let recipientAddressForFinalize: `0x${string}` | null = null;

          if (tgbOrgId) {
            try {
              // Currency symbol from setup (or default to USDC)
              const currencySym = (setup?.currencySymbol || setup?.web3Currency || 'USDC').toUpperCase();

              // Derive TGB network label centrally (no hard-coded switches here)
              const tgbNetwork = getTgbNetworkLabel({
                web3Chain: 'evm',
                evmTargetKey: target.key,
                solanaCluster: null,
              });

              // Convert bigint -> decimal string for amount
              const decimals = (await readContract(wagmiConfig, {
                address: token,
                abi: ERC20_ABI,
                functionName: 'decimals',
                chainId: target.id,
              })) as number;

              const charityAmtDecimal = bigintToDecimalString(charityAmt, decimals);

              const mockParam = process.env.NODE_ENV !== 'production' ? '?mock=1' : '';
              const resp = await fetch(`/api/tgb/create-deposit-address${mockParam}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  organizationId: tgbOrgId,
                  currency: currencySym,       // e.g., "USDC"
                  network: tgbNetwork,         // e.g., "base"
                  amount: charityAmtDecimal,   // exact amount (human-readable)
                  metadata: { roomId: _roomId }
                }),
              });

              const dep = await resp.json();
              if (!resp.ok || !dep?.ok || !dep?.depositAddress) {
                console.error('TGB deposit address request failed:', dep);
                throw new Error(dep?.error || 'Could not get The Giving Block deposit address');
              }

              recipientAddressForFinalize = dep.depositAddress as `0x${string}`;
              console.log('✅ [TGB] Using deposit address for finalize:', recipientAddressForFinalize);
            } catch (tgbErr: any) {
              console.warn('⚠️ [TGB] Falling back to configured charity wallet due to error:', tgbErr?.message || tgbErr);
              recipientAddressForFinalize = null; // fallback will be handled below
            }
          }

          // Fallback (legacy path): use the pre-configured charity wallet if TGB path is not available
          if (!recipientAddressForFinalize) {
            const charityWallet = (rest as any)?.charityAddress;
            console.log('🔍 [EVM] Charity info from room config (fallback):', { wallet: charityWallet });

            if (!charityWallet || !/^0x[0-9a-fA-F]{40}$/.test(charityWallet)) {
              console.error('❌ [EVM] Invalid charity wallet:', charityWallet);
              throw new Error('Invalid charity wallet address. Room configuration may be incomplete.');
            }

            recipientAddressForFinalize = charityWallet as `0x${string}`;
          }
          // ------------------- End TGB + fallback -------------------

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

    return async () => ({ success: false, error: 'Prize distribution not implemented for this chain' });
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

  const deployEvm = useCallback(async (p: DeployParams, which: 'pool' | 'asset'): Promise<DeployResult> => {
    let runtimeChainId: number | null = null;
    try {
      runtimeChainId = await getChainId(wagmiConfig);
    } catch {
      runtimeChainId = null;
    }
    const setupKey = (JSON.parse(localStorage.getItem('setupConfig') || '{}')?.evmNetwork) as string | undefined;
    const target = resolveEvmTarget({ setupKey, runtimeChainId });
    const explorer = explorerFor(target.key);

    const isPool = which === 'pool';
    const factory = (isPool ? (POOL_FACTORY as any)[target.key] : (ASSET_FACTORY as any)[target.key]) as
      | string
      | undefined;
    const abi = isPool ? PoolFactoryABI : AssetFactoryABI;

    if (!factory || !/^0x[0-9a-fA-F]{40}$/.test(factory)) {
      throw new Error(`No factory configured for ${target.key} (${target.id}).`);
    }

    if (isPool) {
      // const charity = (p.charityAddress || '').trim();
      // if (!/^0x[0-9a-fA-F]{40}$/.test(charity)) {
      //   throw new Error('Please select a charity (missing wallet address).');
      // }

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
        throw new Error('Your selections leave 0% for prizes. Increase prize pool or decrease host pay.');
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
        throw new Error('Deployment succeeded but could not resolve room address from logs.');
      }

      return {
        success: true,
        contractAddress: roomAddress,
        txHash: hash as `0x${string}`,
        explorerUrl: `${explorer}/tx/${hash}`,
      };
    }

  // ---------------- ASSET room deployment ----------------
if (!isPool) {
  // p = DeployParams with prizeMode === 'assets'
  const token = getErc20ForCurrency(p.currency, target.key);
  const host = p.hostWallet;

  if (!/^0x[0-9a-fA-F]{40}$/.test(host)) {
    throw new Error('Host wallet is not a valid EVM address.');
  }

  const hostPayBps = toBps16(p.hostFeePct ?? 0);

  const args = [
    p.roomId,
    token as `0x${string}`,
    host as `0x${string}`,
    hostPayBps,
  ] as const;

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
    functionName: 'createAssetRoom', // ← from AssetFactory ABI you provided
    args,
    chainId: target.id,
  });

  const receipt = await waitForTransactionReceipt(wagmiConfig, { hash, chainId: target.id });

  // Try to decode RoomCreated event to get the room address
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
        // ignore decode errors on unrelated logs
      }
    }
  } catch {
    // ignore
  }

  if (!roomAddress) {
    // Fallback: some toolchains also put the new room address as the log's "address"
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
}
    throw new Error('Invalid deployment type specified.');
  }, []);

  /**
   * Deploys a fundraising room on the selected blockchain
   *
   * This function handles room deployment across multiple chains (Solana, EVM, Stellar).
   * It automatically selects the appropriate deployment method based on the chain and
   * handles chain-specific configuration and validation.
   *
   * ## Charity Wallet Handling (Solana)
   *
   * For Solana deployments, the charity wallet is determined using the following priority:
   * 1. **GlobalConfig**: If GlobalConfig is initialized, use charity wallet from it
   * 2. **Params**: Use charity wallet provided in params.charityAddress
   * 3. **Error**: If neither is available, throw an error (prevents incorrect default)
   *
   * This ensures that the charity wallet is always valid and matches the platform configuration.
   * The system prioritizes on-chain configuration over parameters to maintain consistency.
   *
   * ## Chain-Specific Behavior
   *
   * - **Solana**: Uses Anchor program with PDA-based rooms, automatic GlobalConfig initialization
   * - **EVM**: Uses factory pattern (PoolFactory or AssetFactory) based on prize mode
   * - **Stellar**: Throws error (must use StellarLaunchSection component)
   *
   * ## Fee Structure
   *
   * - Platform Fee: 20% (fixed)
   * - Host Fee: 0-5% (configurable)
   * - Prize Pool: 0-35% (calculated as 40% - host fee)
   * - Charity: Minimum 40% (calculated remainder)
   *
   * @param params - Deployment parameters
   * @param params.roomId - Unique room identifier
   * @param params.hostId - Host identifier
   * @param params.hostWallet - Host wallet address
   * @param params.currency - Currency for entry fees (USDC, PYUSD, USDT, SOL for Solana)
   * @param params.entryFee - Entry fee amount
   * @param params.hostFeePct - Host fee percentage (0-5%)
   * @param params.prizePoolPct - Prize pool percentage (0-35%, max = 40% - host fee)
   * @param params.prizeMode - Prize mode ('split' for pool, 'assets' for asset-based)
   * @param params.charityAddress - Charity wallet address (used if GlobalConfig not initialized for Solana)
   * @param params.charityName - Charity name (optional)
   * @param params.prizeSplits - Prize distribution percentages (first, second, third)
   * @returns Deployment result with contract address and transaction hash
   * @throws Error if chain not supported, wallet not connected, or deployment fails
   *
   * @example
   * ```typescript
   * const result = await deploy({
   *   roomId: 'my-room-123',
   *   hostId: 'host-address',
   *   hostWallet: 'host-wallet-address',
   *   currency: 'USDC',
   *   entryFee: '1.0',
   *   hostFeePct: 1,
   *   prizePoolPct: 39,
   *   prizeMode: 'split',
   *   charityAddress: 'charity-wallet-address',
   * });
   * console.log('Room deployed:', result.contractAddress);
   * ```
   */
  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      // ✅ For Stellar, throw error - must use StellarLaunchSection
      if (effectiveChain === 'stellar') {
        throw new Error('Stellar deployment must be handled through StellarLaunchSection component');
      }

      // ✅ For EVM, proceed with deployment
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

      // ✅ For Solana, proceed with deployment
      if (effectiveChain === 'solana') {
        if (!solanaContract || !solanaContract.isReady) {
          throw new Error('Solana contract not ready');
        }
        if (!solanaContract.publicKey) {
          throw new Error('Wallet not connected');
        }

        // Map currency to token mint
        const currency = (params.currency ?? 'USDC').toUpperCase();
        const feeTokenMint =
          currency === 'USDC' ? TOKEN_MINTS.USDC :
          currency === 'PYUSD' ? TOKEN_MINTS.PYUSD :
          currency === 'USDT' ? TOKEN_MINTS.USDT :
          TOKEN_MINTS.USDC; // Default to USDC (room fees restricted to USDC/PYUSD)

        // Get correct decimals for the token (SOL = 9, USDC/PYUSD/USDT = 6)
        const decimals = currency === 'SOL' ? 9 : 6;
        const multiplier = Math.pow(10, decimals);

        console.log('[deploy] Solana currency:', currency, 'mint:', feeTokenMint.toBase58(), 'decimals:', decimals);

        const entryFeeLamports = new BN(parseFloat(String(params.entryFee ?? '1.0')) * multiplier);
        
        // Get charity wallet: Try params first, then GlobalConfig, then use platform wallet as fallback
        // Note: createPoolRoom will initialize GlobalConfig if it doesn't exist, so we don't need to
        // throw an error if GlobalConfig is missing - we can use a fallback and let createPoolRoom handle initialization.
        let charityWallet: PublicKey;
        try {
          // Step 1: If charity address is provided in params, use it (highest priority)
          if (params.charityAddress) {
            try {
              charityWallet = new PublicKey(params.charityAddress);
              console.log('[deploy] ✅ Using charity wallet from params:', charityWallet.toBase58());
            } catch (pubkeyError: any) {
              console.error('[deploy] ❌ Invalid charity address in params:', pubkeyError.message);
              throw new Error(`Invalid charity address in params: ${pubkeyError.message}`);
            }
          } else {
            // Step 2: Try to fetch from existing GlobalConfig (if initialized)
            if (solanaContract.program && solanaContract.publicKey) {
              try {
                const [globalConfigPDA] = PublicKey.findProgramAddressSync(
                  [Buffer.from(PDA_SEEDS.GLOBAL_CONFIG)],
                  PROGRAM_ID
                );
                
                // @ts-ignore - Account types available after program deployment
                const globalConfigAccount = await solanaContract.program.account.globalConfig.fetch(globalConfigPDA);
                charityWallet = globalConfigAccount.charityWallet as PublicKey;
                console.log('[deploy] ✅ Using charity wallet from GlobalConfig:', charityWallet.toBase58());
                
                // Warn if charity wallet is the user's wallet (likely wrong, but acceptable for devnet)
                if (charityWallet.equals(solanaContract.publicKey)) {
                  console.warn('[deploy] ⚠️ WARNING: GlobalConfig charity wallet is the user\'s wallet. This is OK for devnet/testing.');
                }
              } catch (fetchError: any) {
                // GlobalConfig doesn't exist or fetch failed - this is OK, createPoolRoom will initialize it
                console.log('[deploy] GlobalConfig not found or not initialized:', fetchError.message);
                console.log('[deploy] ℹ️ Will use platform wallet as fallback - createPoolRoom will initialize GlobalConfig with it');
                
                // Step 3: Use platform wallet as fallback (createPoolRoom will initialize GlobalConfig with this)
                // For devnet, using the user's wallet as charity wallet is acceptable as a placeholder
                // The actual TGB charity address will be used during prize distribution
                charityWallet = solanaContract.publicKey;
                console.log('[deploy] ✅ Using platform wallet as charity wallet fallback (will be used to initialize GlobalConfig):', charityWallet.toBase58());
                console.log('[deploy] ℹ️ Note: This is a placeholder. The actual TGB charity address will be used during prize distribution.');
              }
            } else {
              // Program or publicKey not available - this should not happen, but use publicKey as fallback
              if (!solanaContract.publicKey) {
                throw new Error('Wallet not connected - cannot determine charity wallet');
              }
              charityWallet = solanaContract.publicKey;
              console.log('[deploy] ✅ Using platform wallet as charity wallet (program not ready):', charityWallet.toBase58());
            }
          }
        } catch (error: any) {
          console.error('[deploy] ❌ Failed to get charity wallet:', error);
          // Re-throw the error with more context
          if (error.message.includes('Invalid charity address') || error.message.includes('Wallet not connected')) {
            throw error; // Re-throw validation errors as-is
          }
          throw new Error(
            `Failed to get charity wallet: ${error.message}. ` +
            `This may indicate a network issue or the Solana program is not properly initialized.`
          );
        }
        
        console.log('[deploy] 📋 Final charity wallet for room creation:', charityWallet.toBase58());
        console.log('[deploy] ℹ️ Note: TGB dynamic charity addresses are used during prize distribution, not room creation.');

        if (params.prizeMode === 'assets') {
          // Asset room deployment
          if (!params.expectedPrizes || params.expectedPrizes.length === 0) {
            throw new Error('Asset room requires at least 1 prize');
          }

          const prizes = params.expectedPrizes.slice(0, 3);
          const prize1Mint = new PublicKey(prizes[0].tokenAddress);

          // Convert prize amounts from human-readable to raw token units (assumes 6 decimals for USDC/USDT)
          // TODO: Fetch actual decimals for each prize token mint
          const prizeDecimals = 6; // USDC/USDT standard
          const prizeMultiplier = Math.pow(10, prizeDecimals);

          const prize1Amount = new BN(parseFloat(prizes[0].amount) * prizeMultiplier);
          const prize2Mint = prizes[1] ? new PublicKey(prizes[1].tokenAddress) : undefined;
          const prize2Amount = prizes[1] ? new BN(parseFloat(prizes[1].amount) * prizeMultiplier) : undefined;
          const prize3Mint = prizes[2] ? new PublicKey(prizes[2].tokenAddress) : undefined;
          const prize3Amount = prizes[2] ? new BN(parseFloat(prizes[2].amount) * prizeMultiplier) : undefined;

          const res = await solanaContract.createAssetRoom({
            roomId: params.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: (params.hostFeePct ?? 0) * 100,
            charityMemo: params.charityName?.substring(0, 28) || 'Asset room',
            feeTokenMint,
            prize1Mint,
            prize1Amount,
            prize2Mint,
            prize2Amount,
            prize3Mint,
            prize3Amount,
          });

          return {
            success: true,
            contractAddress: res.room,
            txHash: res.signature,
          };
        } else {
          // Pool room deployment
          const res = await solanaContract.createPoolRoom({
            roomId: params.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: (params.hostFeePct ?? 0) * 100,
            prizePoolBps: (params.prizePoolPct ?? 0) * 100,
            firstPlacePct: params.prizeSplits?.first,
            secondPlacePct: params.prizeSplits?.second,
            thirdPlacePct: params.prizeSplits?.third,
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




