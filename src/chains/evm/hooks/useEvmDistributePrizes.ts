import { useCallback } from 'react';
import { readContract, writeContract, waitForTransactionReceipt, getAccount, getChainId } from 'wagmi/actions';
import { keccak256, stringToHex, erc20Abi as ERC20_ABI } from 'viem';

import { useEvmShared } from './useEvmShared';
import { explorerFor } from '../utils/evmSelect';
import { bigintToDecimalString } from '../utils/evmFormatting';

import PoolRoomABI from '../../../abis/quiz/BaseQuizPoolRoom2.json';
import AssetRoomABI from '../../../abis/quiz/BaseQuizAssetRoom.json';

import { getTgbNetworkLabel } from '../../tgbNetworks';

/* ---------- Types ---------- */
export type EvmDistributeArgs = {
  roomId: string;
  roomAddress: string;
  prizeMode?: 'assets' | 'split' | 'pool';
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
  }>;
  charityOrgId?: string;
  charityAddress?: string;
};

export type EvmDistributeResult =
  | {
      success: true;
      txHash: `0x${string}`;
      explorerUrl?: string;
        tgbDepositAddress?: string;  // ✅ NEW: TGB charity wallet address
      charityAmount?: string; 
      error?: string; // warnings
    }
  | { success: false; error: string };

/* ---------- Helper: Prepare Winners Array ---------- */
async function prepareWinnersArray(params: {
  winners: Array<{ playerId: string; address?: string | null; rank?: number }>;
  roomAddress: string;
  chainId: number;
  roomABI: any;
  fallbackAddress: string;
  isAssetRoom: boolean;
  wagmiConfig: any;
}): Promise<{ addresses: `0x${string}`[]; warnings: string[] }> {
  const { winners, roomAddress, chainId, roomABI, fallbackAddress, isAssetRoom, wagmiConfig } = params;
  const warnings: string[] = [];

  // Step 1: Get expected number of winners from contract
  let expectedPlaces = 0;

  if (isAssetRoom) {
    try {
      expectedPlaces = (await readContract(wagmiConfig, {
        address: roomAddress as `0x${string}`,
        abi: roomABI,
        functionName: 'prizeCount',
        args: [],
        chainId,
      })) as number;

      console.log('📊 [EVM][Asset] Contract expects', expectedPlaces, 'winners (from prizeCount)');

      if (expectedPlaces === 0) {
        console.warn('⚠️ [EVM][Asset] prizeCount returned 0, trying getAllPrizes...');
        const [places] = (await readContract(wagmiConfig, {
          address: roomAddress as `0x${string}`,
          abi: roomABI,
          functionName: 'getAllPrizes',
          args: [],
          chainId,
        })) as [number[], any, any, any, any, any];

        expectedPlaces = places.length;
        console.log('📊 [EVM][Asset] Got', expectedPlaces, 'prizes from getAllPrizes');
      }
    } catch (e: any) {
      console.error('❌ [EVM][Asset] Failed to get prize count:', e);

      try {
        const [places] = (await readContract(wagmiConfig, {
          address: roomAddress as `0x${string}`,
          abi: roomABI,
          functionName: 'getAllPrizes',
          args: [],
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
    // Pool room
    try {
      const prizeSplits = (await readContract(wagmiConfig, {
        address: roomAddress as `0x${string}`,
        abi: roomABI,
        functionName: 'prizeSplitsBps',
        args: [],
        chainId,
      })) as [number, number, number];

      expectedPlaces = prizeSplits.filter((split) => split > 0).length;
      console.log('📊 [EVM][Pool] Contract expects', expectedPlaces, 'winners. Prize splits:', prizeSplits);
    } catch (e: any) {
      console.error('❌ [EVM][Pool] Failed to read prize splits from contract:', e);
      try {
        expectedPlaces = (await readContract(wagmiConfig, {
          address: roomAddress as `0x${string}`,
          abi: roomABI,
          functionName: 'definedPrizePlaces',
          args: [],
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
}

/* ---------- Main Hook ---------- */
export function useEvmDistributePrizes() {
  const { wagmiConfig, resolveTarget } = useEvmShared();

  const distributePrizes = useCallback(
    async (args: EvmDistributeArgs): Promise<EvmDistributeResult> => {
      try {
        console.log('🎯 [EVM] Starting prize distribution:', { winners: args.winners });

        const target = await resolveTarget();
        const roomAddress = args.roomAddress;

        if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
          return {
            success: false,
            error: 'Missing or invalid EVM room contract address',
          };
        }

        // Detect room type
        const prizeMode = args.prizeMode;
        let isAssetRoom = prizeMode === 'assets';

        if (!prizeMode) {
          try {
            await readContract(wagmiConfig, {
              address: roomAddress as `0x${string}`,
              abi: AssetRoomABI,
              functionName: 'allPrizesUploaded',
              chainId: target.id,
            });
            isAssetRoom = true;
          } catch {
            isAssetRoom = false;
          }
        }

        const RoomABI = isAssetRoom ? AssetRoomABI : PoolRoomABI;

        // Get connected account
        const accountInfo = getAccount(wagmiConfig);
        if (!accountInfo.address) {
          throw new Error('No wallet address found. Please reconnect your wallet.');
        }
        const account = accountInfo.address;

        // Verify HOST
        try {
          const contractHost = await readContract(wagmiConfig, {
            address: roomAddress as `0x${string}`,
            abi: RoomABI,
            functionName: 'HOST',
            chainId: target.id,
          });

          if (String(contractHost).toLowerCase() !== String(account).toLowerCase()) {
            throw new Error(
              `Wrong wallet connected. Need HOST wallet: ${contractHost}, but connected with: ${account}`
            );
          }
        } catch (e) {
          console.error('❌ Failed to verify HOST:', e);
          throw e;
        }

        // Prepare winners array
        const { addresses: addrs, warnings } = await prepareWinnersArray({
          winners: args.winners,
          roomAddress,
          chainId: target.id,
          roomABI: RoomABI,
          fallbackAddress: account,
          isAssetRoom,
          wagmiConfig,
        });

        if (warnings.length > 0) {
          console.warn('⚠️ [EVM] Winner preparation warnings:');
          warnings.forEach((w) => console.warn('  -', w));
        }

        // State validation & locking
        try {
          const currentState = await readContract(wagmiConfig, {
            address: roomAddress as `0x${string}`,
            abi: RoomABI,
            functionName: 'state',
            chainId: target.id,
          });

          console.log('🔍 [EVM] Current room state:', currentState);

          // 0 = Open, 1 = Locked, 2 = Settled, 3 = Refunding
          if (currentState === 2) {
            return {
              success: false,
              error: 'Room already settled. Prizes have been distributed.',
            };
          } else if (currentState === 3) {
            return {
              success: false,
              error: 'Room is in refunding state. Cannot distribute prizes.',
            };
          } else if (currentState === 1) {
            console.warn('⚠️ [EVM] Room already locked, skipping lock step');
          } else if (currentState === 0) {
            console.log('🔒 [EVM] Locking room for settlement...');
            const lockTxHash = await writeContract(wagmiConfig, {
              address: roomAddress as `0x${string}`,
              abi: RoomABI,
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
          }
        } catch (stateError) {
          console.warn('⚠️ [EVM] Could not check room state:', stateError);
          try {
            console.log('🔒 [EVM] Attempting to lock room...');
            const lockTxHash = await writeContract(wagmiConfig, {
              address: roomAddress as `0x${string}`,
              abi: RoomABI,
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
          } catch (lockError: any) {
            if (lockError.message.includes('bad state')) {
              console.warn('⚠️ [EVM] Room already in correct state, continuing...');
            } else {
              throw lockError;
            }
          }
        }

        // Get charity amount and token
        let charityAmt: bigint;
        let token: `0x${string}`;
        let recipientAddressForFinalize: `0x${string}` | null = null;

        if (isAssetRoom) {
          console.log('🎨 [EVM] Asset room - reading charity payout from contract...');

          token = (await readContract(wagmiConfig, {
            address: roomAddress as `0x${string}`,
            abi: AssetRoomABI,
            functionName: 'TOKEN',
            args: [],
            chainId: target.id,
          })) as `0x${string}`;

          try {
            const preview = await readContract(wagmiConfig, {
              address: roomAddress as `0x${string}`,
              abi: AssetRoomABI,
              functionName: 'previewCharityPayout',
              args: [],
              chainId: target.id,
            });

            if (Array.isArray(preview)) {
              charityAmt = preview[2] as bigint;
            } else if (typeof preview === 'object' && preview !== null) {
              const previewObj = preview as any;
              charityAmt = previewObj.charityAmt || previewObj[2] || 0n;
            } else {
              charityAmt = 0n;
            }

            console.log('✅ [EVM][Asset] Got charity amount from contract:', charityAmt.toString());
          } catch (previewError: any) {
            console.error('❌ [EVM][Asset] Failed to read previewCharityPayout:', previewError);
            charityAmt = 0n;
          }
        } else {
          console.log('🏊 [EVM] Pool room - reading charity payout preview from contract...');

          let preview: unknown;
          try {
            preview = await readContract(wagmiConfig, {
              address: roomAddress as `0x${string}`,
              abi: PoolRoomABI,
              functionName: 'previewCharityPayout',
              chainId: target.id,
            });
          } catch (readError: any) {
            console.error('❌ [EVM] Failed to read previewCharityPayout:', readError);
            throw new Error(`Failed to read charity payout preview: ${readError.message}`);
          }

          if (!preview) {
            throw new Error('previewCharityPayout returned null/undefined');
          }

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

          if (!token || charityAmt === undefined) {
            throw new Error('previewCharityPayout did not return expected values');
          }
        }

        // TGB charity logic
        const setup = JSON.parse(localStorage.getItem('setupConfig') || '{}');
        const tgbOrgId = (setup?.web3CharityOrgId as string | undefined) || args.charityOrgId;

        if (tgbOrgId && charityAmt > 0n) {
          try {
            const currencySym = (setup?.currencySymbol || setup?.web3Currency || 'USDC').toUpperCase();
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
                metadata: { roomId: args.roomId },
              }),
            });

            const dep = await resp.json();
            if (!resp.ok || !dep?.ok || !dep?.depositAddress) {
              throw new Error(dep?.error || 'Could not get The Giving Block deposit address');
            }

            recipientAddressForFinalize = dep.depositAddress as `0x${string}`;
          } catch (tgbErr: any) {
            console.warn('⚠️ [TGB] Falling back to configured charity wallet:', tgbErr?.message);
            recipientAddressForFinalize = null;
          }
        }

        if (!recipientAddressForFinalize) {
          const charityWallet = args.charityAddress;
          if (!charityWallet || !/^0x[0-9a-fA-F]{40}$/.test(charityWallet)) {
            throw new Error('Invalid charity wallet address. Room configuration may be incomplete.');
          }
          recipientAddressForFinalize = charityWallet as `0x${string}`;
        }

        // Finalize
        const offchainIntentId = `FR-${args.roomId}-${Date.now()}`;
        const intentIdHash = keccak256(stringToHex(offchainIntentId, { size: 32 }));

        console.log('🎁 [EVM] Calling finalize on contract...');
        console.log('🎁 [EVM] Winners array:', addrs);
        console.log('🎁 [EVM] Charity recipient:', recipientAddressForFinalize);

        const hash = await writeContract(wagmiConfig, {
          address: roomAddress as `0x${string}`,
          abi: RoomABI,
          functionName: 'finalize',
          args: [addrs, recipientAddressForFinalize, intentIdHash],
          chainId: target.id,
          account: account as `0x${string}`,
        });

        const receipt = await waitForTransactionReceipt(wagmiConfig, {
          hash,
          chainId: target.id,
          confirmations: 1,
        });

        if (receipt.status !== 'success') {
          throw new Error('Transaction reverted on-chain');
        }

        let charityAmountFromEvent: string | undefined;

try {
  // Find RoomEnded event in logs
  const roomEndedLog = receipt.logs.find((log: any) => {
    try {
      const parsed = RoomABI.find((item: any) => 
        item.type === 'event' && item.name === 'RoomEnded'
      );
      if (!parsed) return false;
      
      // Check if this log matches RoomEnded event signature
      const eventSignature = `RoomEnded(uint256,address[],uint256)`;
      const eventTopic = keccak256(stringToHex(eventSignature));
      return log.topics[0] === eventTopic;
    } catch {
      return false;
    }
  });

  if (roomEndedLog) {
    // Parse the event
    const iface = new (await import('ethers')).Interface(RoomABI);
    const decoded = iface.parseLog({
      topics: roomEndedLog.topics,
      data: roomEndedLog.data,
    });
    
    if (decoded && decoded.args && decoded.args.charityAmount) {
      // Convert bigint to decimal string (assuming 6 decimals for USDC)
      charityAmountFromEvent = bigintToDecimalString(
        decoded.args.charityAmount,
        6 // decimals
      );
      
      console.log('[EVM] 💰 Charity amount from RoomEnded event:', charityAmountFromEvent);
    }
  } else {
    console.warn('[EVM] ⚠️ Could not find RoomEnded event in transaction logs');
  }
} catch (parseError: any) {
  console.error('[EVM] ❌ Failed to parse RoomEnded event:', parseError);
}

        const explorerUrl = explorerFor(target.key);

        return {
          success: true,
          txHash: hash as `0x${string}`,
          explorerUrl: `${explorerUrl}/tx/${hash}`,
           tgbDepositAddress: recipientAddressForFinalize, // ✅ NEW: Return TGB wallet
  charityAmount: charityAmountFromEvent,  
          error: warnings.length > 0 ? warnings.join('\n') : undefined,
        };
      } catch (e: any) {
        console.error('❌ [EVM] Prize distribution error:', e);

        let errorMessage = e?.message || 'EVM finalize failed';

        if (errorMessage.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (errorMessage.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees';
        } else if (errorMessage.includes('bad state')) {
          errorMessage = 'Room is not in correct state. May already be settled or not locked yet.';
        } else if (errorMessage.includes('bad winners len')) {
          errorMessage =
            'Winner count mismatch. This should have been handled automatically - please report this bug.';
        } else if (errorMessage.includes('execution reverted')) {
          errorMessage = 'Contract execution reverted. Check if prizes can be distributed.';
        }

        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [wagmiConfig, resolveTarget]
  );

  return { distributePrizes };
}