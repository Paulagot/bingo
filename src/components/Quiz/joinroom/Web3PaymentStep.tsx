// src/components/Quiz/joinroom/Web3PaymentStep.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { ChevronLeft, AlertCircle, CheckCircle, Loader, Wallet, PlugZap, Unplug, X } from 'lucide-react';

import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useWalletActions } from '../../../hooks/useWalletActions';
import { useContractActions } from '../../../hooks/useContractActions';
import type { SupportedChain } from '../../../chains/types';

// Use your real AssetRoom ABI JSON
import AssetRoomABI from '../../../abis/quiz/BaseQuizAssetRoom.json';

import { getMetaByKey } from '../../../chains/evm/config/networks';

// ✅ viem/wagmi reads for the debug helper
import { readContract, getChainId } from 'wagmi/actions';
import { config as wagmiConfig } from '../../../config';

/* ---------- Optional: wagmi chainId hook ---------- */
let useWagmiChainId: (() => number) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const wagmi = require('wagmi');
  useWagmiChainId = wagmi.useChainId as () => number;
} catch {
  useWagmiChainId = null;
}

/* ---------- Optional: AppKit (guarded) ---------- */
let useAppKit: any = null;
let useAppKitAccount: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@reown/appkit/react');
  useAppKit = mod.useAppKit;
  useAppKitAccount = mod.useAppKitAccount;
} catch {
  /* AppKit not installed – safe to ignore */
}

/* -------------------- RoomConfig + helpers -------------------- */
function getChainLabel(roomConfig: RoomConfig, fallback: string) {
  if (roomConfig?.web3Chain === 'evm') {
    const key = (roomConfig as any)?.evmNetwork as string | undefined;
    const meta = getMetaByKey(key);
    return meta?.name || 'EVM';
  }
  if (roomConfig?.web3Chain === 'stellar') return 'Stellar';
  if (roomConfig?.web3Chain === 'solana') {
    const cluster = (roomConfig as any)?.solanaCluster;
    return cluster === 'devnet' ? 'Solana Devnet' : 'Solana Mainnet';
  }
  return fallback;
}

function getTargetChainId(roomConfig: RoomConfig): number | undefined {
  if (roomConfig?.web3Chain !== 'evm') return undefined;
  const key = (roomConfig as any)?.evmNetwork as string | undefined;
  const meta = getMetaByKey(key);
  return meta?.id;
}

// In JoinRoomFlow.tsx AND Web3PaymentStep.tsx
interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;

  // Web3 fields
  web3Chain?: string;
  evmNetwork?: string;           // ✅ used for target chain metadata
  solanaCluster?: string;        // ✅ for completeness
  stellarNetwork?: string;       // ✅ for completeness
  roomContractAddress?: string;
  deploymentTxHash?: string;
  web3Currency?: string;         // ✅ currency symbol (e.g., USDC)

  // Room info
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
  roomId: string;
}

interface Web3PaymentStepProps {
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
  chainOverride?: SupportedChain;
}

type PaymentStatus = 'idle' | 'connecting' | 'paying' | 'confirming' | 'joining' | 'success';

/* -------------------- SAFE DEBUG HELPER -------------------- */
async function safeDebugAssetRoom(roomAddress?: string) {
  try {
    if (!roomAddress || !/^0x[0-9a-fA-F]{40}$/.test(roomAddress)) {
      console.warn('[AssetRoom][debug] No valid room address to debug:', roomAddress);
      return;
    }
    const chainId = await getChainId(wagmiConfig);

    const [prizeCount, allPrizesUploaded, state] = await Promise.all([
      readContract(wagmiConfig, { address: roomAddress as `0x${string}`, abi: AssetRoomABI as any, functionName: 'prizeCount', args: [], chainId }),
      readContract(wagmiConfig, { address: roomAddress as `0x${string}`, abi: AssetRoomABI as any, functionName: 'allPrizesUploaded', args: [], chainId }),
      readContract(wagmiConfig, { address: roomAddress as `0x${string}`, abi: AssetRoomABI as any, functionName: 'state', args: [], chainId }),
    ]);

    const [places, types_, assets, amounts, tokenIds, uploaded] =
      await readContract(wagmiConfig, {
        address: roomAddress as `0x${string}`,
        abi: AssetRoomABI as any,
        functionName: 'getAllPrizes',
        args: [],
        chainId,
      }) as [number[], number[], `0x${string}`[], bigint[], bigint[], boolean[]];

    const prizeRows = (places || []).map((p, i) => ({
      place: Number(p),
      type: Number(types_[i]),
      asset: assets[i],
      amount: amounts[i]?.toString(),
      tokenId: tokenIds[i]?.toString(),
      uploaded: Boolean(uploaded[i]),
    }));

    console.log('🧪 AssetRoom debug', {
      chainId,
      roomAddress,
      prizeCount,
      allPrizesUploaded,
      state,
      prizes: prizeRows,
    });

    const i1 = (places || []).findIndex((p) => Number(p) === 1);
    if (i1 === -1) {
      console.warn('❌ [AssetRoom] No entry with place=1 in getAllPrizes(). Did you configure prize #1?');
    } else if (!uploaded[i1]) {
      console.warn('❌ [AssetRoom] prize #1 exists but uploaded=false. Did you call uploadPrize(1) on THIS room/chain?');
    } else {
      console.log('✅ [AssetRoom] prize #1 is uploaded=true. Join should not be blocked by "need 1st".');
    }
  } catch (e) {
    // swallow to avoid red UI; log for inspection
    console.warn('[AssetRoom][debug] failed:', e);
  }
}

/* -------------------- Component -------------------- */
export const Web3PaymentStep: React.FC<Web3PaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
  onClose,
  chainOverride,
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();

  const { selectedChain } = useQuizChainIntegration({ chainOverride });

  const wallet = useWalletActions({ chainOverride });
  const { joinRoom } = useContractActions({ chainOverride });

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  /* ---------- AppKit (if present) ---------- */
  const appkit = useAppKit ? useAppKit() : null;
  const appkitAcc = useAppKitAccount ? useAppKitAccount({ namespace: 'eip155' }) : { address: undefined as string | undefined };

  // Costs
  const extrasTotal = selectedExtras.reduce(
    (sum, id) => sum + (roomConfig.fundraisingPrices[id] || 0),
    0
  );
  const totalAmount = roomConfig.entryFee + extrasTotal;

  // Chain label and target chain id for EVM rooms
  const chainLabel = useMemo(
    () => getChainLabel(roomConfig, selectedChain || 'Web3'),
    [roomConfig, selectedChain]
  );
  const targetChainId = useMemo(() => getTargetChainId(roomConfig), [roomConfig]);

  // Address + connected (treat AppKit OR wagmi as connected like in setup step)
  const evmAddr = wallet.getAddress();
  const appkitAddr = appkitAcc?.address as string | undefined;
  const addr = (evmAddr ?? appkitAddr) || null;

  // If EVM: consider connected when either source has an address
  const isEvm = roomConfig?.web3Chain === 'evm';
  const baseConnected = isEvm ? Boolean(evmAddr || appkitAddr) : wallet.isConnected();

  // Track current chain id (event-driven)
  const [currentChainId, setCurrentChainId] = useState<number | undefined>(undefined);
  const [evmTick, setEvmTick] = useState(0);

  useEffect(() => {
    const readChainId = async () => {
      let cid: number | undefined = undefined;

      if (typeof useWagmiChainId === 'function') {
        try {
          const hookCid = useWagmiChainId();
          if (typeof hookCid === 'number') cid = hookCid;
        } catch { /* noop */ }
      }

      if (!cid && (window as any)?.ethereum?.request) {
        try {
          const hex = await (window as any).ethereum.request({ method: 'eth_chainId' });
          if (typeof hex === 'string') {
            const p = parseInt(hex, 16);
            if (!Number.isNaN(p)) cid = p;
          }
        } catch { /* noop */ }
      }

      setCurrentChainId(cid);
    };

    // initial
    readChainId();

    // subscribe to wallet events
    const eth = (window as any)?.ethereum;
    const onChainChanged = (hex: string) => {
      const parsed = parseInt(hex, 16);
      setCurrentChainId(Number.isNaN(parsed) ? undefined : parsed);
    };
    const onAccountsChanged = () => setEvmTick((t) => t + 1);

    if (eth?.on) {
      eth.on('chainChanged', onChainChanged);
      eth.on('accountsChanged', onAccountsChanged);
    }

    return () => {
      if (eth?.removeListener) {
        eth.removeListener('chainChanged', onChainChanged);
        eth.removeListener('accountsChanged', onAccountsChanged);
      }
    };
  }, []);

  // Must be connected; for EVM also must be on the target network
  const networkOk =
    isEvm
      ? baseConnected && (!targetChainId || currentChainId === targetChainId)
      : baseConnected;

  const canProceed = totalAmount > 0 ? networkOk : true;

  // Debug logs
  useEffect(() => {
    console.log('[JOIN][UI] chain:', selectedChain, 'addr(evm/appkit):', { evmAddr, appkitAddr, shown: addr });
    console.log('[JOIN][UI] amounts:', {
      entryFee: roomConfig.entryFee,
      extrasTotal,
      totalAmount,
      currency: roomConfig.currencySymbol,
    });
    console.log('[JOIN][UI] targetChainId:', targetChainId, 'currentChainId:', currentChainId, 'networkOk:', networkOk);
    console.log('[JOIN][UI][evm]', {
      baseConnected,
      targetChainId,
      currentChainId,
      switchAvail: typeof (wallet as any)?.switchChain === 'function',
      getChainIdAvail: typeof wallet.getChainId === 'function',
      evmTick,
      appkitStatus: appkit ? 'present' : 'absent',
    });
  }, [
    selectedChain,
    evmAddr,
    appkitAddr,
    addr,
    roomConfig.entryFee,
    extrasTotal,
    totalAmount,
    roomConfig.currencySymbol,
    targetChainId,
    currentChainId,
    networkOk,
    baseConnected,
    wallet,
    evmTick,
    appkit,
  ]);

  // Auto-clear stale errors when state becomes healthy
  useEffect(() => {
    if (isEvm) {
      if (baseConnected && targetChainId && currentChainId === targetChainId && error) {
        setError('');
      }
    } else if (baseConnected && error) {
      setError('');
    }
  }, [baseConnected, currentChainId, targetChainId, isEvm, error]);

  // ✅ NEW: Store room's network config for EvmWalletProvider to read
  useEffect(() => {
    if (roomConfig?.web3Chain === 'evm' && roomConfig.evmNetwork) {
      console.log('[Web3PaymentStep] Setting active EVM network for provider:', roomConfig.evmNetwork);
      sessionStorage.setItem('active-evm-network', roomConfig.evmNetwork);

      if (roomConfig.roomContractAddress) {
        sessionStorage.setItem('active-room-contract', roomConfig.roomContractAddress);
      }
    }

    // Cleanup when component unmounts or room changes
    return () => {
      sessionStorage.removeItem('active-evm-network');
      sessionStorage.removeItem('active-room-contract');
    };
  }, [roomConfig?.web3Chain, roomConfig?.evmNetwork, roomConfig?.roomContractAddress]);

  const formatAddr = (a: string | null, short = true) => {
    if (!a) return null;
    return short && a.length > 10 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
  };

  /* ---------- Connect: AppKit modal first (if present), then wagmi connect, then switch ---------- */
  const handleWalletConnect = async () => {
    try {
      setError('');
      setPaymentStatus('connecting');

      if (isEvm && appkit?.open) {
        // mirror setup step: use AppKit for the connection UX
        await appkit.open({ view: 'Connect', namespace: 'eip155' });
      }

      // ensure our provider side (wagmi) syncs
      const res = await wallet.connect();
      if (!res.success && !appkitAddr) throw new Error(res.error?.message || 'Failed to connect wallet');

      // best-effort switch to room's target chain
      if (isEvm && targetChainId && typeof (wallet as any)?.switchChain === 'function') {
        try {
          await (wallet as any).switchChain(targetChainId);
        } catch {
          // show wrong-network banner if still wrong
        }
      }

      setPaymentStatus('idle');
    } catch (e: any) {
      setPaymentStatus('idle');
      setError(e.message || 'Failed to connect wallet');
    }
  };

  const [switchTried, setSwitchTried] = useState(false);
  useEffect(() => {
    (async () => {
      if (switchTried) return;
      if (!isEvm) return;
      if (!baseConnected) return;
      if (!targetChainId || !currentChainId) return;
      if (currentChainId === targetChainId) return;
      if (typeof (wallet as any)?.switchChain !== 'function') return;

      try {
        setSwitchTried(true);
        await (wallet as any).switchChain(targetChainId);
      } catch {
        // banner will instruct user
      }
    })();
  }, [isEvm, baseConnected, targetChainId, currentChainId, wallet, switchTried]);

  const handleDisconnect = async () => {
    try {
      setError('');
      await wallet.disconnect?.();
    } catch (e: any) {
      setError(e.message || 'Failed to disconnect wallet');
    }
  };

  const handleWeb3Join = async () => {
    try {
      setError('');

      // Connect if needed
      if (!baseConnected) {
        await handleWalletConnect();
        if (!((wallet.isConnected() && wallet.getAddress()) || appkitAcc?.address)) {
          throw new Error('Failed to connect wallet');
        }
      }

      // Enforce correct network for EVM
      if (isEvm && targetChainId && currentChainId !== targetChainId) {
        if (typeof (wallet as any)?.switchChain === 'function') {
          try {
            await (wallet as any).switchChain(targetChainId);
          } catch {
            /* fallthrough */
          }
        }
        if (currentChainId !== targetChainId) {
          const key = (roomConfig as any)?.evmNetwork || '';
          const meta = getMetaByKey(key);
          throw new Error(`Wrong network. Please switch to ${meta?.name || 'the correct network'}.`);
        }
      }

      const address = addr;
      if (!address) throw new Error('Wallet not connected');

      // Pay / join on-chain
      setPaymentStatus('paying');
      const roomAddrFromConfig = (roomConfig as any).roomContractAddress || undefined;

      console.log('[JOIN][UI] Using room address from config:', roomAddrFromConfig ?? '(none)');

      // 🔍 Run safe on-chain debug just before calling join
      await safeDebugAssetRoom(roomAddrFromConfig);

      const r = await joinRoom({
        roomId,
        feeAmount: roomConfig.entryFee,
        extrasAmount: extrasTotal > 0 ? extrasTotal.toString() : undefined,
        roomAddress: roomAddrFromConfig, // undefined triggers fallback in joinRoom
      });
      if (!r.success) throw new Error(r.error || 'Payment failed');

      setTxHash(r.txHash);
      setPaymentStatus('confirming');
      await new Promise((r2) => setTimeout(r2, 1000));

      // Join via socket
      setPaymentStatus('joining');
      const playerId = nanoid();

      socket?.emit('join_quiz_room', {
        roomId,
        user: {
          id: playerId,
          name: playerName,
          paid: true,
          paymentMethod: 'web3',
          web3TxHash: r.txHash,
          web3Address: address,
          web3Chain: selectedChain, // 'stellar' | 'evm' | 'solana'
          extras: selectedExtras,
          extraPayments: Object.fromEntries(
            selectedExtras.map((key) => [
              key,
              { method: 'web3', amount: roomConfig.fundraisingPrices[key], txHash: r.txHash },
            ])
          ),
        },
        role: 'player',
      });

      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
      setPaymentStatus('success');

      setTimeout(() => {
        navigate(`/quiz/game/${roomId}/${playerId}`);
      }, 1200);
    } catch (e: any) {
      console.error('Web3 join failed:', e);
      setError(e.message || 'Failed to join game');
      setPaymentStatus('idle');
    }
  };

  const status = (() => {
    switch (paymentStatus) {
      case 'connecting':
        return { icon: <Loader className="h-5 w-5 animate-spin" />, text: `Connecting ${chainLabel} wallet...`, color: 'text-blue-600' };
      case 'paying':
        return { icon: <Loader className="h-5 w-5 animate-spin" />, text: 'Processing payment...', color: 'text-yellow-600' };
      case 'confirming':
        return { icon: <Loader className="h-5 w-5 animate-spin" />, text: 'Confirming transaction...', color: 'text-orange-600' };
      case 'joining':
        return { icon: <Loader className="h-5 w-5 animate-spin" />, text: 'Joining game...', color: 'text-green-600' };
      case 'success':
        return { icon: <CheckCircle className="h-5 w-5" />, text: 'Success! Redirecting...', color: 'text-green-600' };
      default:
        return null;
    }
  })();

  const showWrongNet =
    isEvm &&
    targetChainId !== undefined &&
    baseConnected &&
    currentChainId !== undefined &&
    currentChainId !== targetChainId;

  useEffect(() => {
    const eth = (window as any)?.ethereum;
    const list = eth?.providers || [eth].filter(Boolean);
    (async () => {
      const reports = await Promise.all(
        (list || []).map(async (p: any, i: number) => {
          let id: number | undefined;
          try {
            const hex = await p.request({ method: 'eth_chainId' });
            id = parseInt(hex, 16);
          } catch {}
          return {
            i,
            flags: {
              isMetaMask: !!p.isMetaMask,
              isCoinbaseWallet: !!p.isCoinbaseWallet,
              isBrave: !!p.isBraveWallet,
              isRabby: !!p.isRabby,
            },
            chainId: id,
          };
        })
      );
      console.log('[EVM][providers]', reports);
    })();
  }, []);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
            🌐
          </div>
          <div>
            <h2 className="text-fg text-xl font-bold sm:text-2xl">Web3 Payment</h2>
            <p className="text-fg/70 text-sm sm:text-base">Pay with {chainLabel} to join</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center space-x-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
          title="Close"
        >
          <X className="h-4 w-4" />
          <span>Close</span>
        </button>
      </div>

      {/* Summary */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-fg font-medium">Total Cost</div>
            <div className="text-fg/70 text-sm">
              Entry: {roomConfig.currencySymbol}
              {roomConfig.entryFee.toFixed(2)}
              {extrasTotal > 0 && ` + Extras: ${roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
            </div>
          </div>
          <div className="text-xl font-bold text-blue-900">
            {roomConfig.currencySymbol}
            {totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Wallet Status */}
      <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-800">{chainLabel} Wallet Status</span>
          </div>
          <div className={`flex items-center space-x-2 ${canProceed ? 'text-green-600' : 'text-yellow-600'}`}>
            <div className={`h-2 w-2 rounded-full ${canProceed ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm font-medium">{canProceed ? 'Ready' : 'Connection needed'}</span>
          </div>
        </div>

        {!baseConnected ? (
          <button
            onClick={handleWalletConnect}
            disabled={paymentStatus === 'connecting'}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {paymentStatus === 'connecting' ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Connecting {chainLabel} Wallet...</span>
              </>
            ) : (
              <>
                <PlugZap className="h-4 w-4" />
                <span>Connect {chainLabel} Wallet</span>
              </>
            )}
          </button>
        ) : (
          <>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${networkOk ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <div>
                    <div className="text-sm font-medium text-green-800">
                      {chainLabel} Wallet {networkOk ? 'Connected' : 'Connected (Wrong Network)'}
                    </div>
                    <div className="font-mono text-xs text-green-600">{formatAddr(addr)}</div>
                  </div>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center space-x-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  <Unplug className="h-3 w-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>

            {showWrongNet && (
              <div className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                <div className="flex items-center justify-between">
                  <div>
                    Wrong network detected. Please switch to{' '}
                    <strong>
                      {getMetaByKey((roomConfig as any)?.evmNetwork)?.name || 'the correct network'}
                    </strong>.
                  </div>
                  {typeof (wallet as any)?.switchChain === 'function' && (
                    <button
                      onClick={async () => {
                        setError('');
                        try {
                          await (wallet as any).switchChain(targetChainId!);
                        } catch (e: any) {
                          setError(e?.message || 'Failed to switch network');
                        }
                      }}
                      className="ml-3 rounded-md border border-yellow-300 bg-yellow-100 px-2 py-1 text-xs font-medium hover:bg-yellow-200"
                    >
                      Switch network
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status */}
      {status && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center space-x-3">
            <div className={status.color}>{status.icon}</div>
            <span className={`font-medium ${status.color}`}>{status.text}</span>
          </div>
          {txHash && <div className="mt-2 text-xs text-gray-600">Transaction: {txHash.slice(0, 16)}...</div>}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700 sm:text-base">{error}</p>
        </div>
      )}

      {/* Footer CTAs */}
      <div className="border-border mt-6 flex flex-col justify-end space-y-3 border-t pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button
          onClick={onBack}
          disabled={paymentStatus !== 'idle'}
          className="text-fg/80 flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

        {baseConnected && networkOk && (
          <button
            onClick={handleWeb3Join}
            disabled={paymentStatus !== 'idle' || !canProceed}
            className="flex items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
          >
            <span>Pay {roomConfig.currencySymbol}{totalAmount.toFixed(2)}</span>
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};










