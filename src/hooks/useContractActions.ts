/**
 * Multi-Chain Contract Actions Hook
 * Updated version with consistent TGB flow for both EVM and Solana
 */

//src/hooks/useContractActions.ts
import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';

import { useSolanaContractContext } from '../chains/solana/useSolanaContractContext';

import type { SupportedChain } from '../chains/types';
import { keccak256, stringToHex } from 'viem';
import { getAccount } from 'wagmi/actions';

import { getTgbNetworkLabel } from '../chains/tgbNetworks';


/* ------------------------- EVM imports ------------------------- */
import { writeContract, waitForTransactionReceipt, getChainId, readContract } from 'wagmi/actions';
import { config as wagmiConfig } from '../config';
import { resolveEvmTarget, explorerFor } from '../chains/evm/utils/evmSelect';

import { USDC } from '../chains/evm/config/tokens';

import PoolRoomABI from '../abis/quiz/BaseQuizPoolRoom2.json';
import { erc20Abi as ERC20_ABI } from 'viem';
import AssetRoomABI from '../abis/quiz/BaseQuizAssetRoom.json';
import type { Prize } from '../components/Quiz/types/quiz';
/* ------------------------- updated evm imports ------------------------- */
import { useEvmJoin } from '../chains/evm/hooks/useEvmJoin';
import { useEvmDeploy } from '../chains/evm/hooks/useEvmDeploy';
import { useEvmDistributePrizes } from '../chains/evm/hooks/useEvmDistributePrizes';


/* ------------------------- Solana imports ------------------------- */
import { TOKEN_MINTS, PROGRAM_ID, PDA_SEEDS } from '@/shared/lib/solana/config';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

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
 expectedPrizes?: Prize[];
  hostWallet: string;
  hostMetadata?: {
    hostName?: string;
    eventDateTime?: string ;
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
  prizeMode?: 'assets' | 'split' | 'pool';
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

  console.log('🔍 [assertFirstPrizeUploaded] Checking prize upload for:', roomAddress);

  const [places, _types, _assets, _amounts, _tokenIds, uploaded] =
    (await readContract(wagmiConfig, {
      address: roomAddress,
      abi: AssetRoomABI,
      functionName: 'getAllPrizes',
      chainId,
    })) as [number[], number[], `0x${string}`[], bigint[], bigint[], boolean[]];


  console.log('🔍 [assertFirstPrizeUploaded] places:', places);
  console.log('🔍 [assertFirstPrizeUploaded] uploaded:', uploaded);

  const idx = places.findIndex((p) => Number(p) === 1);
  console.log('🔍 [assertFirstPrizeUploaded] First prize index:', idx)
  if (idx === -1) {
    throw new Error('First prize (place 1) not configured yet. Configure it before opening joins.');
  }
   console.log('🔍 [assertFirstPrizeUploaded] First prize uploaded?:', uploaded[idx]);
  if (!uploaded[idx]) {
    throw new Error('First prize (place 1) is configured but not uploaded. Call uploadPrize(1) first.');
  }
   console.log('✅ [assertFirstPrizeUploaded] First prize IS uploaded, join should work');
}

/* ---------------- Main hook ---------------- */
/* ---------------- Main hook ---------------- */
export function useContractActions(opts?: Options) {
  const { selectedChain } = useQuizChainIntegration({
    chainOverride: opts?.chainOverride ?? null,
  });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  const solanaContractResult = useSolanaContractContext();
  const { joinRoom: evmJoinRoom } = useEvmJoin();
 const { deploy: evmDeploy } = useEvmDeploy();
 const { distributePrizes: evmDistributePrizes } = useEvmDistributePrizes();

  const solanaContract = effectiveChain === 'solana' ? solanaContractResult : null;
  

  const getHostAddress = useCallback((fallback: string) => {
    return fallback;
  }, []);

  // ✅ 1. ADD HELPER FUNCTION HERE - OUTSIDE of distributePrizes useMemo
// ✅ UPDATED HELPER FUNCTION - Add isAssetRoom parameter

const prepareWinnersArray = useCallback(async (params: {
  winners: Array<{ playerId: string; address?: string | null; rank?: number }>;
  roomAddress: string;
  chainId: number;
  roomABI: any;
  fallbackAddress: string;
  isAssetRoom: boolean;
}): Promise<{ addresses: `0x${string}`[]; warnings: string[] }> => {
  const { winners, roomAddress, chainId, roomABI, fallbackAddress, isAssetRoom } = params;
  const warnings: string[] = [];

  // Step 1: Get expected number of winners from contract
  let expectedPlaces = 0;
  
  if (isAssetRoom) {
    // ✅ ASSET ROOM: Use prizeCount()
    try {
      expectedPlaces = (await readContract(wagmiConfig, {
        address: roomAddress as `0x${string}`,
        abi: roomABI,
        functionName: 'prizeCount',
        args: [], // ✅ ADD EMPTY ARGS
        chainId,
      })) as number;
      
      console.log('📊 [EVM][Asset] Contract expects', expectedPlaces, 'winners (from prizeCount)');
      
      // Fallback: count from getAllPrizes if prizeCount returns 0
      if (expectedPlaces === 0) {
        console.warn('⚠️ [EVM][Asset] prizeCount returned 0, trying getAllPrizes...');
        const [places] = (await readContract(wagmiConfig, {
          address: roomAddress as `0x${string}`,
          abi: roomABI,
          functionName: 'getAllPrizes',
          args: [], // ✅ ADD EMPTY ARGS
          chainId,
        })) as [number[], any, any, any, any, any];
        
        expectedPlaces = places.length;
        console.log('📊 [EVM][Asset] Got', expectedPlaces, 'prizes from getAllPrizes');
      }
    } catch (e: any) {
      console.error('❌ [EVM][Asset] Failed to get prize count:', e);
      
      // Final fallback: try getAllPrizes
      try {
        const [places] = (await readContract(wagmiConfig, {
          address: roomAddress as `0x${string}`,
          abi: roomABI,
          functionName: 'getAllPrizes',
          args: [], // ✅ ADD EMPTY ARGS
          chainId,
        })) as [number[], any, any, any, any, any];
        
        expectedPlaces = places.length;
        console.log('📊 [EVM][Asset] Fallback: got', expectedPlaces, 'prizes from getAllPrizes');
      } catch (e2: any) {
        console.error('❌ [EVM][Asset] Failed to get prizes from getAllPrizes:', e2);
        throw new Error('Cannot determine expected number of prizes from asset room contract');
      }
    }
  } else {
    // ✅ POOL ROOM: Use existing logic (prizeSplitsBps)
    try {
      const prizeSplits = (await readContract(wagmiConfig, {
        address: roomAddress as `0x${string}`,
        abi: roomABI,
        functionName: 'prizeSplitsBps',
        args: [], // ✅ ADD EMPTY ARGS
        chainId,
      })) as [number, number, number];

      expectedPlaces = prizeSplits.filter(split => split > 0).length;
      console.log('📊 [EVM][Pool] Contract expects', expectedPlaces, 'winners. Prize splits:', prizeSplits);
    } catch (e: any) {
      console.error('❌ [EVM][Pool] Failed to read prize splits from contract:', e);
      try {
        expectedPlaces = (await readContract(wagmiConfig, {
          address: roomAddress as `0x${string}`,
          abi: roomABI,
          functionName: 'definedPrizePlaces',
          args: [], // ✅ ADD EMPTY ARGS
          chainId,
        })) as number;
        console.log('✅ [EVM][Pool] Got expected places from definedPrizePlaces():', expectedPlaces);
      } catch (e2: any) {
        console.error('❌ [EVM][Pool] Failed to get definedPrizePlaces:', e2);
        throw new Error('Cannot determine expected number of winners from pool room contract');
      }
    }
  }

  if (expectedPlaces === 0 || expectedPlaces > 3) {
    throw new Error(`Invalid prize configuration: ${expectedPlaces} places`);
  }

  // Step 2: Extract valid addresses from winners
  const validAddresses: `0x${string}`[] = [];
  
  const sortedWinners = [...winners].sort((a, b) => {
    const rankA = a.rank ?? Infinity;
    const rankB = b.rank ?? Infinity;
    return rankA - rankB;
  });

  for (let i = 0; i < sortedWinners.length; i++) {
    const winner = sortedWinners[i];
    
    if (!winner) {
      console.warn(`⚠️ [EVM] Winner ${i + 1} is undefined, skipping`);
      continue;
    }
    
    const addr = winner.address;
    
    if (addr && /^0x[0-9a-fA-F]{40}$/.test(addr)) {
      validAddresses.push(addr as `0x${string}`);
      console.log(`✅ [EVM] Winner ${i + 1} (rank ${winner.rank}):`, addr);
    } else {
      warnings.push(`Winner at rank ${winner.rank || i + 1} has invalid/missing address`);
      console.warn(`⚠️ [EVM] Winner ${i + 1} has invalid address:`, addr);
    }
  }

  // Step 3: Handle mismatches
  if (validAddresses.length > expectedPlaces) {
    warnings.push(
      `More winners (${validAddresses.length}) than prize places (${expectedPlaces}). ` +
      `Only top ${expectedPlaces} will receive prizes.`
    );
    console.warn('⚠️ [EVM] Too many winners, truncating to', expectedPlaces);
    return {
      addresses: validAddresses.slice(0, expectedPlaces),
      warnings,
    };
  }

  if (validAddresses.length < expectedPlaces) {
    const shortage = expectedPlaces - validAddresses.length;
    warnings.push(
      `Only ${validAddresses.length} valid winner(s) found, but ${expectedPlaces} prize places configured. ` +
      `Using HOST address for unfilled place(s). Unclaimed prizes will go to HOST.`
    );
    console.warn(
      `⚠️ [EVM] Not enough winners (${validAddresses.length}/${expectedPlaces}). ` +
      `Padding with HOST address for ${shortage} place(s).`
    );

    while (validAddresses.length < expectedPlaces) {
      validAddresses.push(fallbackAddress as `0x${string}`);
    }
  }

  console.log('✅ [EVM] Final winners array:', validAddresses);
  return { addresses: validAddresses, warnings };
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

  // ✅ NEW: Use the extracted EVM join hook
  if (effectiveChain === 'evm') {
    return evmJoinRoom;
  }

  return async (_args: JoinArgs): Promise<JoinResult> => ({
    success: false,
    error: `joinRoom not implemented for ${effectiveChain || 'unknown'} chain`,
  });
}, [effectiveChain, solanaContract, evmJoinRoom]); // ✅ Add evmJoinRoom to dependencies

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

          let effectiveCharityWallet: string | null = null;

          // ✅ NEW: Mirror EVM flow - call previewCharityPayout from contract
     if (charityOrgId) {
  try {
    console.log('====================================================');
    console.log('[Solana][TGB] Step 1: Calling previewCharityPayout...');
    console.log('[Solana][TGB] Parameters:', {
      roomId,
      roomAddress,
      charityOrgId,
      charityAmountPreview, // Backend estimate
    });

              // Call the Solana contract to get the REAL on-chain charity amount
              const preview = await solanaContract.previewCharityPayout({
                roomId,
                roomAddress: new PublicKey(roomAddress),
              });

             

           console.log('[Solana][TGB] Step 2: previewCharityPayout returned:', preview);
    console.log('[Solana][TGB] Charity amount from contract:', preview.amountDecimal);
    console.log('[Solana][TGB] Backend estimated:', charityAmountPreview);
    console.log('====================================================');

    let charityAmountDecimal = preview.amountDecimal;

      // ✅ Fallback if contract returns zero
    if (parseFloat(charityAmountDecimal) === 0) {
      console.warn('⚠️  [Solana][TGB] Contract returned 0!');
      
      if (charityAmountPreview && parseFloat(charityAmountPreview) > 0) {
        console.warn('⚠️  [Solana][TGB] Using backend estimate instead:', charityAmountPreview);
        charityAmountDecimal = charityAmountPreview;
      } else {
        console.error('❌ [Solana][TGB] Both contract and backend returned 0 - cannot proceed');
        throw new Error('Charity amount is zero from both contract and backend');
      }
    }

              // Now call TGB API with the REAL on-chain amount (same as EVM)
              const currencySym = (charityCurrency || 'USDC').toUpperCase();

              console.log('[Solana][TGB] Step 3: Requesting TGB deposit address:', {
                organizationId: charityOrgId,
                currency: currencySym,
                network: 'solana',
                amount: charityAmountDecimal,
              });

              const resp = await fetch('/api/tgb/create-deposit-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  organizationId: charityOrgId,
                  currency: currencySym,
                  network: 'solana',
                  amount: charityAmountDecimal,
                  metadata: { roomId },
                }),
              });

              const dep = await resp.json();
              if (resp.ok && dep?.ok && dep.depositAddress) {
                effectiveCharityWallet = dep.depositAddress as string;
                console.log('[Solana][TGB] Step 4: Got TGB deposit address:', effectiveCharityWallet);
              } else {
                console.error('[Solana][TGB] Deposit address request failed:', dep);
                return {
                  success: false,
                  error:
                    dep?.error ||
                    'Could not get The Giving Block deposit address for Solana charity payout',
                };
              }
            } catch (previewError: any) {
              console.error('[Solana][TGB] Error in charity preview/TGB flow:', previewError);
              return {
                success: false,
                error: `Failed to get charity amount or TGB address: ${previewError.message}`,
              };
            }
          }

          // Fallback if no TGB integration
          if (!effectiveCharityWallet) {
            return {
              success: false,
              error: 'Missing charity wallet for Solana prize distribution',
            };
          }

          console.log('[Solana] Step 5: Calling distributePrizes with:', {
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

          console.log('[Solana] Step 6: Prize distribution complete:', {
            signature: res.signature,
            charityAmount: res.charityAmount,
          });

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
    return evmDistributePrizes;
  }

  return async (): Promise<DistributeResult> => ({
    success: false,
    error: 'Prize distribution not implemented for this chain',
  });
}, [effectiveChain, solanaContract, evmDistributePrizes]);

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


  // ✅ Your deploy callback becomes much simpler:
  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      if (effectiveChain === 'stellar') {
        throw new Error(
          'Stellar deployment must be handled through StellarLaunchSection component'
        );
      }

      // ✅ NEW: Simple EVM deployment using the hook
      if (effectiveChain === 'evm') {
        const hostAddress = getHostAddress(params.hostWallet);
        return evmDeploy({
          ...params,
          hostWallet: hostAddress,
        });
      }

      // ✅ KEEP: All your Solana code stays exactly the same
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

          // Safe unwraps for prize 1
          if (!p1?.tokenAddress || p1.amount == null) {
            throw new Error('Prize 1 is missing required tokenAddress or amount');
          }
          const prize1Mint = new PublicKey(p1.tokenAddress);
          const prize1Amount = new BN(Math.floor(Number(p1.amount) * prizeMultiplier));

          // Prize 2
          let prize2Mint: PublicKey | undefined = undefined;
          let prize2Amount: BN | undefined = undefined;
          if (p2?.tokenAddress && p2.amount != null) {
            prize2Mint = new PublicKey(p2.tokenAddress);
            prize2Amount = new BN(Math.floor(Number(p2.amount) * prizeMultiplier));
          }

          // Prize 3
          let prize3Mint: PublicKey | undefined = undefined;
          let prize3Amount: BN | undefined = undefined;
          if (p3?.tokenAddress && p3.amount != null) {
            prize3Mint = new PublicKey(p3.tokenAddress);
            prize3Amount = new BN(Math.floor(Number(p3.amount) * prizeMultiplier));
          }

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
    [effectiveChain, getHostAddress, evmDeploy, solanaContract] // ✅ Added evmDeploy to deps
  );

  return { deploy, joinRoom, distributePrizes };
}