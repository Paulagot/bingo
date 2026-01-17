// src/components/Quiz/joinroom/Web3PaymentStep.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import {
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  Loader,
  PlugZap,
  Unplug,
  X,
} from 'lucide-react';

import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { useWalletActions } from '../../../hooks/useWalletActions';
import { useContractActions } from '../../../hooks/useContractActions';
import type { SupportedChain } from '../../../chains/types';

import { getMetaByKey } from '../../../chains/evm/config/networks';

// 🔥 Wagmi - only useChainId, no deprecated useAccount
import { useChainId } from 'wagmi';

// 🔥 Reown AppKit
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

interface RoomConfig {
  paymentMethod: string;
  entryFee: number;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  web3Chain?: string;
  evmNetwork?: string;
  solanaCluster?: string;
  roomContractAddress?: string;
  roomId: string;
}

type PaymentStatus =
  | 'idle'
  | 'connecting'
  | 'paying'
  | 'confirming'
  | 'joining'
  | 'success';


// Helper utils
function getChainLabel(roomConfig: RoomConfig, fallback: string) {
  if (roomConfig.web3Chain === 'evm') {
    const meta = getMetaByKey(roomConfig.evmNetwork);
    return meta?.name || 'EVM';
  }
  if (roomConfig.web3Chain === 'stellar') return 'Stellar';
  if (roomConfig.web3Chain === 'solana') {
    return roomConfig.solanaCluster === 'devnet' ? 'Solana Devnet' : 'Solana Mainnet';
  }
  return fallback;
}

function getTargetChainId(roomConfig: RoomConfig): number | undefined {
  if (roomConfig.web3Chain !== 'evm') return undefined;
  const meta = getMetaByKey(roomConfig.evmNetwork);
  // Ensure we return a number or undefined
  return typeof meta?.id === 'number' ? meta.id : undefined;
}

export const Web3PaymentStep: React.FC<{
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
  chainOverride?: SupportedChain;
}> = ({ roomId, playerName, roomConfig, selectedExtras, onBack, onClose, chainOverride }) => {
  const navigate = useNavigate();
  const { socket } = useQuizSocket();

  const { selectedChain } = useQuizChainIntegration({
    chainOverride: chainOverride ?? null,
  });

  const wallet = useWalletActions();
  const { joinRoom } = useContractActions({ chainOverride: chainOverride ?? null });

  // AppKit + wagmi state
  const appkit = useAppKit();
  const appkitAcc = useAppKitAccount();
  const chainId = useChainId();

  const evmAddress = appkitAcc.address ?? null;
  const isEvm = roomConfig.web3Chain === 'evm';

  const targetChainId = getTargetChainId(roomConfig);
  const networkOk = isEvm
    ? Boolean(evmAddress && chainId === targetChainId)
    : Boolean(evmAddress);

  const extrasTotal = selectedExtras.reduce(
    (sum, key) => sum + (roomConfig.fundraisingPrices[key] || 0),
    0
  );
  const totalAmount = roomConfig.entryFee + extrasTotal;

  const chainLabel = getChainLabel(roomConfig, selectedChain ?? 'Web3');

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  const handleWalletConnect = async () => {
    try {
      setError('');
      setPaymentStatus('connecting');

      await appkit.open({ view: 'Connect' });
      await wallet.connect();

      setPaymentStatus('idle');
    } catch (e: any) {
      setError(e.message || 'Failed to connect wallet');
      setPaymentStatus('idle');
    }
  };

  const handleSwitchChain = async () => {
    if (!targetChainId) return;
    try {
      await appkit.open({ view: 'Networks' });
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleWeb3Join = async () => {
    try {
      setError('');

      // Connect if needed
      if (!evmAddress) {
        await handleWalletConnect();
        return;
      }

      // Ensure on correct chain
      if (isEvm && targetChainId && chainId !== targetChainId) {
        await handleSwitchChain();
        return;
      }

      // ✅ Validate roomContractAddress exists
      if (!roomConfig.roomContractAddress) {
        throw new Error('Room contract address is required');
      }

      // Now invoke contract join
      setPaymentStatus('paying');
      const result = await joinRoom({
        roomId,
        feeAmount: roomConfig.entryFee,
        extrasAmount: extrasTotal.toString(),
        roomAddress: roomConfig.roomContractAddress, // Now guaranteed to be string
        currency: roomConfig.currencySymbol,
      });

      if (!result.success) throw new Error(result.error);

      // ✅ Check if player already paid
      if ((result as any).alreadyPaid) {
        console.log('[Web3Payment] ✅ Player already paid, skipping to join');
        setAlreadyPaid(true);
        setTxHash('already-paid');
        setPaymentStatus('joining');
        
        const playerId = nanoid();

        socket?.emit('join_quiz_room', {
          roomId,
          user: {
            id: playerId,
            name: playerName,
            paid: true,
            paymentMethod: 'web3',
            web3TxHash: 'already-paid',
            web3Address: evmAddress,
            web3Chain: selectedChain,
            extras: selectedExtras,
            extraPayments: Object.fromEntries(
              selectedExtras.map((key) => [
                key,
                { method: 'web3', amount: roomConfig.fundraisingPrices[key], txHash: 'already-paid' },
              ])
            ),
          },
          role: 'player',
        });

        localStorage.setItem(`quizPlayerId:${roomId}`, playerId);

        setPaymentStatus('success');
        setTimeout(() => {
          navigate(`/quiz/game/${roomId}/${playerId}`);
        }, 1000);
        
        return;
      }

      setTxHash(result.txHash || '');
      setPaymentStatus('confirming');

      await new Promise((r) => setTimeout(r, 800));

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
          web3TxHash: result.txHash,
          web3Address: evmAddress,
          web3Chain: selectedChain,
          extras: selectedExtras,
          extraPayments: Object.fromEntries(
            selectedExtras.map((key) => [
              key,
              { method: 'web3', amount: roomConfig.fundraisingPrices[key], txHash: result.txHash },
            ])
          ),
        },
        role: 'player',
      });

      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);

      setPaymentStatus('success');
      setTimeout(() => {
        navigate(`/quiz/game/${roomId}/${playerId}`);
      }, 1000);
    } catch (e: any) {
      console.error('Join failed:', e);
      
      // ✅ Handle "already processed" error
      if (e.message?.includes('already been processed') || 
          e.message?.includes('already processed')) {
        console.warn('[Web3Payment] ⚠️ Transaction already processed, retrying...');
        setError('Transaction already processed. Checking entry status...');
        
        setTimeout(() => {
          setError('');
          handleWeb3Join();
        }, 2000);
      } else {
        setError(e.message || 'Failed to join game');
        setPaymentStatus('idle');
      }
    }
  };

  /* ---------- UI ---------- */

  const formattedAddr =
    evmAddress && evmAddress.length > 10
      ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
      : evmAddress;

  const showWrongNet =
    isEvm && targetChainId !== undefined && evmAddress && chainId !== targetChainId;

 const STATUS_MAP: Record<Exclude<PaymentStatus, 'idle'>, { icon: JSX.Element; text: string; color: string }> = {
  connecting: {
    icon: <Loader className="h-5 w-5 animate-spin" />,
    text: `Connecting ${chainLabel}...`,
    color: 'text-blue-600'
  },
  paying: {
    icon: <Loader className="h-5 w-5 animate-spin" />,
    text: alreadyPaid ? 'Already paid! Reconnecting...' : 'Processing payment...',
    color: alreadyPaid ? 'text-green-600' : 'text-yellow-600'
  },
  confirming: {
    icon: <Loader className="h-5 w-5 animate-spin" />,
    text: 'Confirming...',
    color: 'text-orange-600'
  },
  joining: {
    icon: <Loader className="h-5 w-5 animate-spin" />,
    text: 'Joining...',
    color: 'text-green-600'
  },
  success: {
    icon: <CheckCircle className="h-5 w-5" />,
    text: 'Success! Redirecting...',
    color: 'text-green-600'
  },
};

  const status = paymentStatus === 'idle' ? null : STATUS_MAP[paymentStatus];

  return (
    <div className="p-4 sm:p-6">
      {/* header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-lg text-white">
            🌐
          </div>
          <div>
            <h2 className="text-fg text-xl font-bold">Web3 Payment</h2>
            <p className="text-fg/70 text-sm">Pay with {chainLabel} to join</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border px-3 py-1 text-sm"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* wallet block */}
      <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
        {!evmAddress ? (
          <button
            onClick={handleWalletConnect}
            disabled={paymentStatus === 'connecting'}
            className="flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {paymentStatus === 'connecting' ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span className="ml-2">Connecting…</span>
              </>
            ) : (
              <>
                <PlugZap className="h-4 w-4" />
                <span className="ml-2">Connect {chainLabel} Wallet</span>
              </>
            )}
          </button>
        ) : (
          <>
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-green-800">
                    {networkOk ? 'Connected' : 'Connected (Wrong Network)'}
                  </div>
                  <div className="text-xs text-green-600 font-mono">
                    {formattedAddr}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setError('');
                    await wallet.disconnect();
                  }}
                  className="rounded-md border bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                >
                  <Unplug className="h-3 w-3" />
                </button>
              </div>
            </div>

            {showWrongNet && (
              <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                Wrong network. Please switch to{' '}
                {getMetaByKey(roomConfig.evmNetwork)?.name}.
                <button
                  onClick={handleSwitchChain}
                  className="ml-3 rounded-md border bg-yellow-100 px-2 py-1 text-xs hover:bg-yellow-200"
                >
                  Switch
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {status && (
        <div className="mb-4 rounded-lg border bg-gray-50 p-4 flex items-center space-x-3">
          <div className={status.color}>{status.icon}</div>
          <span className={`font-medium ${status.color}`}>{status.text}</span>
          {txHash && txHash !== 'already-paid' && <span className="text-xs">{txHash.slice(0, 16)}…</span>}
        </div>
      )}

      {/* footer */}
      <div className="flex justify-end space-x-2 border-t pt-4">
        <button
          onClick={onBack}
          disabled={paymentStatus !== 'idle'}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 inline-block mr-1" />
          Back
        </button>

        {networkOk && (
          <button
            onClick={handleWeb3Join}
            disabled={paymentStatus !== 'idle'}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Pay {roomConfig.currencySymbol}
            {totalAmount.toFixed(2)}
          </button>
        )}
      </div>
    </div>
  );
};













