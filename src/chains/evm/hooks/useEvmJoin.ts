import { useCallback } from 'react';
import { 
  writeContract, 
  waitForTransactionReceipt, 
  readContract, 
  getConnections 
} from 'wagmi/actions';
import { erc20Abi as ERC20_ABI } from 'viem';
import { decimalToBigint } from '../utils/evmFormatting';
import { useEvmShared } from './useEvmShared';
// REMOVED: import { setDeploymentInProgress } from '../../../hooks/useWalletActions';
// The module-level auto-switch flag is gone — no more cross-hook fighting.
// The local transaction lock (total > 0n guard below) is kept as-is.
import PoolRoomABI from '../../../abis/quiz/BaseQuizPoolRoom2.json';
import AssetRoomABI from '../../../abis/quiz/BaseQuizAssetRoom.json';

const STATE_NAMES: Record<number, string> = {
  0: 'Open',
  1: 'Locked',
  2: 'Settled',
  3: 'Refunding',
};

async function debugRoomState(params: {
  roomAddress: `0x${string}`;
  chainId: number;
  wagmiConfig: any;
  roomABI: any;
}) {
  const { roomAddress, chainId, wagmiConfig, roomABI } = params;

  try {
    const state = await readContract(wagmiConfig, {
      address: roomAddress,
      abi: roomABI,
      functionName: 'state',
      args: [],
      chainId,
    });

    console.log('🔍 [debugRoomState] Room state:', Number(state), STATE_NAMES[Number(state)]);

    return { state };
  } catch (e) {
    console.error('❌ [debugRoomState] Failed to read room state:', e);
    return null;
  }
}

export interface EvmJoinArgs {
  roomId: string;
  roomAddress: string;
  feeAmount?: string | number;
  extrasAmount?: string | number;
}

export interface EvmJoinResult {
  success: boolean;
  txHash?: `0x${string}`;
  error?: string;
}

/**
 * Check if first prize is uploaded (Asset rooms only)
 */
async function assertFirstPrizeUploaded(params: {
  roomAddress: `0x${string}`;
  chainId: number;
  wagmiConfig: any;
}) {
  const { roomAddress, chainId, wagmiConfig } = params;

  console.log('🔍 [assertFirstPrizeUploaded] Checking prize upload for:', roomAddress);

  const [places, _types, _assets, _amounts, _tokenIds, uploaded] =
    (await readContract(wagmiConfig, {
      address: roomAddress,
      abi: AssetRoomABI,
      functionName: 'getAllPrizes',
      args: [],
      chainId,
    })) as [number[], number[], `0x${string}`[], bigint[], bigint[], boolean[]];

  console.log('🔍 [assertFirstPrizeUploaded] places:', places);
  console.log('🔍 [assertFirstPrizeUploaded] uploaded:', uploaded);

  const idx = places.findIndex((p) => Number(p) === 1);
  console.log('🔍 [assertFirstPrizeUploaded] First prize index:', idx);

  if (idx === -1) {
    throw new Error('First prize (place 1) not configured yet. Configure it before opening joins.');
  }

  console.log('🔍 [assertFirstPrizeUploaded] First prize uploaded?:', uploaded[idx]);

  if (!uploaded[idx]) {
    throw new Error('First prize (place 1) is configured but not uploaded. Call uploadPrize(1) first.');
  }

  console.log('✅ [assertFirstPrizeUploaded] First prize IS uploaded, join should work');
}

/**
 * Auto-detect if room is Asset or Pool type by probing for prizeCount.
 */
async function detectRoomType(params: {
  roomAddress: `0x${string}`;
  chainId: number;
  wagmiConfig: any;
}): Promise<{ isAssetRoom: boolean; abi: any }> {
  const { roomAddress, chainId, wagmiConfig } = params;

  try {
    await readContract(wagmiConfig, {
      address: roomAddress,
      abi: AssetRoomABI,
      functionName: 'prizeCount',
      args: [],
      chainId,
    });

    console.log('✅ [detectRoomType] Detected AssetRoom');
    return { isAssetRoom: true, abi: AssetRoomABI };
  } catch {
    console.log('✅ [detectRoomType] Detected PoolRoom');
    return { isAssetRoom: false, abi: PoolRoomABI };
  }
}

/**
 * Get current connected account address from wagmi connections.
 */
function getConnectedAccount(wagmiConfig: any): `0x${string}` | undefined {
  const connections = getConnections(wagmiConfig);
  for (const connection of connections) {
    if (connection.accounts?.[0]) {
      return connection.accounts[0];
    }
  }
  return undefined;
}

export function useEvmJoin() {
  const { wagmiConfig, resolveTarget } = useEvmShared();

  const joinRoom = useCallback(
    async ({ roomAddress, feeAmount, extrasAmount }: EvmJoinArgs): Promise<EvmJoinResult> => {
      try {
        console.log('🔧 [joinRoom] Starting EVM join');
        console.log('🔧 [joinRoom] Input params:', { roomAddress, feeAmount, extrasAmount });

        if (!roomAddress || typeof roomAddress !== 'string') {
          return { success: false, error: 'Missing room contract address' };
        }

        const target = await resolveTarget();
        const chainId = target.id;
        const roomAddr = roomAddress as `0x${string}`;

        console.log('🔧 [joinRoom] Target network:', { key: target.key, id: chainId });

        const { isAssetRoom, abi: RoomABI } = await detectRoomType({
          roomAddress: roomAddr,
          chainId,
          wagmiConfig,
        });

        console.log('🔍 [joinRoom] Checking room state...');
        const roomState = await debugRoomState({
          roomAddress: roomAddr,
          chainId,
          wagmiConfig,
          roomABI: RoomABI,
        });

        if (roomState && Number(roomState.state) !== 0) {
          return {
            success: false,
            error: `Room is not open for joins. Current state: ${STATE_NAMES[Number(roomState.state)] || 'Unknown'}`,
          };
        }

        const tokenAddr = (await readContract(wagmiConfig, {
          address: roomAddr,
          abi: RoomABI,
          functionName: 'TOKEN',
          args: [],
          chainId,
        })) as `0x${string}`;

        console.log('🔧 [joinRoom] Token address:', tokenAddr);

        const decimals = (await readContract(wagmiConfig, {
          address: tokenAddr,
          abi: ERC20_ABI,
          functionName: 'decimals',
          args: [],
          chainId,
        })) as number;

        console.log('🔧 [joinRoom] Token decimals:', decimals);

        const feePaid = decimalToBigint(feeAmount ?? 0, decimals);
        const extrasPaid = decimalToBigint(extrasAmount ?? 0, decimals);
        const total = feePaid + extrasPaid;

        console.log('🔧 [joinRoom] Amounts:', {
          feeAmount,
          extrasAmount,
          decimals,
          feePaid: feePaid.toString(),
          extrasPaid: extrasPaid.toString(),
          total: total.toString(),
        });

        if (isAssetRoom) {
          await assertFirstPrizeUploaded({ roomAddress: roomAddr, chainId, wagmiConfig });
        }

        const acct = getConnectedAccount(wagmiConfig);

        if (acct) {
          try {
            console.log('🔧 [joinRoom] Checking if already joined for:', acct);

            const already = (await readContract(wagmiConfig, {
              address: roomAddr,
              abi: RoomABI,
              functionName: 'joined',
              args: [acct],
              chainId,
            })) as boolean;

            if (already) {
              console.log('✅ [joinRoom] Already joined, skipping transaction');
              return { success: true, txHash: '0x' as `0x${string}` };
            }
          } catch (e) {
            console.warn('⚠️ [joinRoom] Could not check join status:', e);
          }

          if (total > 0n) {
            try {
              const balance = (await readContract(wagmiConfig, {
                address: tokenAddr,
                abi: ERC20_ABI,
                functionName: 'balanceOf',
                args: [acct],
                chainId,
              })) as bigint;

              console.log('🔧 [joinRoom] Token balance:', balance.toString());

              if (balance < total) {
                return {
                  success: false,
                  error: `Insufficient token balance. Need: ${total.toString()}, Have: ${balance.toString()}`,
                };
              }
            } catch (e) {
              console.warn('⚠️ [joinRoom] Could not check balance:', e);
            }
          }
        }

        try {
          if (total > 0n) {
            const approveAcct = getConnectedAccount(wagmiConfig);
            if (!approveAcct) {
              return { success: false, error: 'No wallet connected' };
            }

            try {
              const currentAllowance = (await readContract(wagmiConfig, {
                address: tokenAddr,
                abi: ERC20_ABI,
                functionName: 'allowance',
                args: [approveAcct, roomAddr],
                chainId,
              })) as bigint;

              console.log('🔍 [joinRoom] Current allowance:', currentAllowance.toString());

              if (currentAllowance >= total) {
                console.log('✅ [joinRoom] Sufficient allowance already exists, skipping approval');
              } else {
                const approvalAmount = BigInt(1_000) * BigInt(10 ** decimals);

                console.log('🔑 [joinRoom] Approving amount:', approvalAmount.toString());

                const approveHash = await writeContract(wagmiConfig, {
                  address: tokenAddr,
                  abi: ERC20_ABI,
                  functionName: 'approve',
                  args: [roomAddr, approvalAmount],
                  chainId,
                });

                console.log('🔑 [joinRoom] Approval tx:', approveHash);

                await waitForTransactionReceipt(wagmiConfig, {
                  hash: approveHash,
                  chainId,
                  confirmations: 2,
                });

                console.log('✅ [joinRoom] Approval confirmed');

                let retries = 3;
                let verified = false;

                while (retries > 0 && !verified) {
                  await new Promise((resolve) => setTimeout(resolve, 1500));

                  try {
                    const newAllowance = (await readContract(wagmiConfig, {
                      address: tokenAddr,
                      abi: ERC20_ABI,
                      functionName: 'allowance',
                      args: [approveAcct, roomAddr],
                      chainId,
                    })) as bigint;

                    console.log(`🔍 [joinRoom] Allowance check (attempt ${4 - retries}):`, newAllowance.toString());

                    if (newAllowance >= total) {
                      verified = true;
                      console.log('✅ [joinRoom] Allowance verified');
                    }
                  } catch (e) {
                    console.warn(`⚠️ [joinRoom] Allowance check attempt ${4 - retries} failed:`, e);
                  }

                  retries--;
                }

                if (!verified) {
                  return {
                    success: false,
                    error: 'Token approval confirmed but allowance not readable. Please try joining again in a few seconds.',
                  };
                }
              }
            } catch (e: any) {
              console.error('❌ [joinRoom] Approval error:', e);
              return {
                success: false,
                error: `Failed to approve tokens: ${e?.message || 'Unknown error'}`,
              };
            }
          }

          console.log('🎯 [joinRoom] Joining room:', {
            isAssetRoom,
            args: isAssetRoom
              ? [extrasPaid.toString()]
              : [feePaid.toString(), extrasPaid.toString()],
          });

          const joinHash = await writeContract(wagmiConfig, {
            address: roomAddr,
            abi: RoomABI,
            functionName: 'join',
            args: isAssetRoom ? [extrasPaid] : [feePaid, extrasPaid],
            chainId,
          });

          console.log('🎯 [joinRoom] Join tx:', joinHash);

          await waitForTransactionReceipt(wagmiConfig, {
            hash: joinHash,
            chainId,
          });

          console.log('✅ [joinRoom] Successfully joined room');
          return { success: true, txHash: joinHash as `0x${string}` };

        } finally {
          // Local finally block — no module-level flag to clear
        }

      } catch (e: any) {
        console.error('❌ [joinRoom] Error:', e);

        let msg = e?.message || 'join failed';

        if (/need 1st/i.test(msg)) {
          msg = 'Join blocked: first prize (place #1) must be uploaded before players can join.';
        } else if (/execution reverted/i.test(msg)) {
          msg = `Contract reverted: ${msg.replace('execution reverted: ', '')}`;
        } else if (/user rejected/i.test(msg)) {
          msg = 'Transaction was rejected by user';
        } else if (/insufficient funds/i.test(msg)) {
          msg = 'Insufficient funds for gas or tokens';
        }

        return { success: false, error: msg };
      }
    },
    [wagmiConfig, resolveTarget]
  );

  return { joinRoom };
}