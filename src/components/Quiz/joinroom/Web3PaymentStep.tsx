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
  AlertTriangle,
} from 'lucide-react';

import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useWallet } from '../../../context/WalletContext';
import { useContractActions } from '../../../hooks/useContractActions';
import type { SupportedChain } from '../../../chains/types';

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

  // ✅ Use WalletContext instead of calling hooks directly
  const wallet = useWallet();
  const { 
    address: walletAddress, 
    isConnected: isWalletConnected,
    chainFamily,
    networkInfo,
    actions: walletActions 
  } = wallet;

  const { joinRoom } = useContractActions({ chainOverride: chainOverride ?? null });

  const extrasTotal = selectedExtras.reduce(
    (sum, key) => sum + (roomConfig.fundraisingPrices[key] || 0),
    0
  );
  const totalAmount = roomConfig.entryFee + extrasTotal;

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  // Check if connected to wrong chain family
  const actualChainFamily = walletActions.getActualChainFamily();
  const expectedChainFamily = walletActions.getExpectedChainFamily();
  const wrongChainFamily = actualChainFamily !== expectedChainFamily 
    && actualChainFamily !== null 
    && expectedChainFamily !== null;

  const isOnCorrectNetwork = walletActions.isOnCorrectNetwork();

  const handleWalletConnect = async () => {
    try {
      setError('');
      setPaymentStatus('connecting');

      const result = await walletActions.connect();
      
      if (!result.success) {
        const errorMsg = 'error' in result && result.error?.message 
          ? result.error.message 
          : 'Failed to connect wallet';
        throw new Error(errorMsg);
      }

      setPaymentStatus('idle');
    } catch (e: any) {
      setError(e.message || 'Failed to connect wallet');
      setPaymentStatus('idle');
    }
  };

  const handleWeb3Join = async () => {
    try {
      setError('');

      if (!isWalletConnected) {
        await handleWalletConnect();
        return;
      }

      if (wrongChainFamily) {
        setError(`Please disconnect and connect with a ${expectedChainFamily?.toUpperCase()} wallet`);
        return;
      }

      if (!isOnCorrectNetwork) {
        setError(`Please switch to ${networkInfo.expectedNetwork} in your wallet`);
        return;
      }

      if (!roomConfig.roomContractAddress) {
        throw new Error('Room contract address is required');
      }

      setPaymentStatus('paying');
      const result = await joinRoom({
        roomId,
        feeAmount: roomConfig.entryFee,
        extrasAmount: extrasTotal.toString(),
        roomAddress: roomConfig.roomContractAddress,
        currency: roomConfig.currencySymbol,
      });

      if (!result.success) throw new Error(result.error);

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
            web3Address: walletAddress,
            web3Chain: chainFamily,
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
          web3Address: walletAddress,
          web3Chain: chainFamily,
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

  const formattedAddr =
    walletAddress && walletAddress.length > 10
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : walletAddress;

  const STATUS_MAP: Record<Exclude<PaymentStatus, 'idle'>, { icon: JSX.Element; text: string; color: string }> = {
    connecting: {
      icon: <Loader className="h-5 w-5 animate-spin" />,
      text: `Connecting ${networkInfo.expectedNetwork}...`,
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
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-lg text-white">
            🌐
          </div>
          <div>
            <h2 className="text-fg text-xl font-bold">Web3 Payment</h2>
            <p className="text-fg/70 text-sm">Pay with {networkInfo.expectedNetwork} to join</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md border px-3 py-1 text-sm"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Quiz Requirements Info */}
      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              This quiz uses {networkInfo.expectedNetwork}
            </p>
            <p className="text-xs text-blue-600">
              Make sure you have a {expectedChainFamily?.toUpperCase()} wallet ready
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
        {!isWalletConnected ? (
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
                <span className="ml-2">Connect {networkInfo.expectedNetwork} Wallet</span>
              </>
            )}
          </button>
        ) : (
          <>
            {/* Wrong Chain Family Warning */}
            {wrongChainFamily && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">
                      Wrong Blockchain
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      You're connected to <strong>{actualChainFamily?.toUpperCase()}</strong>, 
                      but this quiz requires <strong>{expectedChainFamily?.toUpperCase()}</strong>.
                      Please disconnect and reconnect with the correct wallet.
                    </p>
                    <button
                      onClick={async () => {
                        setError('');
                        await walletActions.disconnect();
                      }}
                      className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-700"
                    >
                      Disconnect & Switch
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Wallet Display */}
            <div className={`rounded-lg border p-3 ${
              wrongChainFamily 
                ? 'border-red-200 bg-red-50' 
                : isOnCorrectNetwork 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-orange-200 bg-orange-50'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm font-medium ${
                    wrongChainFamily
                      ? 'text-red-800'
                      : isOnCorrectNetwork 
                        ? 'text-green-800' 
                        : 'text-orange-800'
                  }`}>
                    {wrongChainFamily
                      ? `Wrong Blockchain (${actualChainFamily?.toUpperCase()})`
                      : isOnCorrectNetwork 
                        ? `${networkInfo.expectedNetwork} Connected` 
                        : `${networkInfo.currentNetwork} Connected`
                    }
                  </div>
                  <div className={`text-xs font-mono ${
                    wrongChainFamily
                      ? 'text-red-600'
                      : isOnCorrectNetwork 
                        ? 'text-green-600' 
                        : 'text-orange-600'
                  }`}>
                    {formattedAddr}
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setError('');
                    await walletActions.disconnect();
                  }}
                  className="rounded-md border bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                >
                  <Unplug className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Wrong Network Warning (only if correct chain family but wrong network) */}
            {!wrongChainFamily && !isOnCorrectNetwork && (
              <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">
                      Wrong Network
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Your wallet is on <strong>{networkInfo.currentNetwork}</strong>, but this quiz requires <strong>{networkInfo.expectedNetwork}</strong>.
                      Please switch networks in your wallet.
                    </p>
                  </div>
                </div>
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

      <div className="flex justify-end space-x-2 border-t pt-4">
        <button
          onClick={onBack}
          disabled={paymentStatus !== 'idle'}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4 inline-block mr-1" />
          Back
        </button>

        {isWalletConnected && !wrongChainFamily && (
          <button
            onClick={handleWeb3Join}
            disabled={paymentStatus !== 'idle' || !isOnCorrectNetwork}
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