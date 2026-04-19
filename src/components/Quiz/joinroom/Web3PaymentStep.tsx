import React, { useState, useEffect } from 'react';
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
import { useChainWallet } from '../../../hooks/useChainWallet';
import { useContractActions } from '../../../hooks/useContractActions';
import { useMiniAppContext } from '../../../context/MiniAppContext';
import type { ChainConfig } from '../../../types/chainConfig';
import web3TransactionService from '../../mgtsystem/services/Web3TransactionService';

// Web3PaymentStep receives the full room data but only needs
// ChainConfig fields for wallet/contract hooks.
// Extra fields (entryFee, currencySymbol etc.) are kept in the local RoomData type.
interface RoomData extends ChainConfig {
  paymentMethod: string;
  entryFee: number;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
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
  roomConfig: RoomData;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
}> = ({ roomId, playerName, roomConfig, selectedExtras, onBack, onClose }) => {
  const navigate = useNavigate();
  const { socket } = useQuizSocket();

  const chainConfig: ChainConfig = {
    web3Chain: roomConfig.web3Chain,
    evmNetwork: roomConfig.evmNetwork,
    solanaCluster: roomConfig.solanaCluster,
    stellarNetwork: roomConfig.stellarNetwork,
  };

  const {
    address: walletAddress,
    isConnected: isWalletConnected,
    isOnCorrectNetwork,
    networkInfo,
    chainFamily,
    connect,
    disconnect,
    switchToCorrectNetwork,
  } = useChainWallet(chainConfig);

  const { joinRoom } = useContractActions(chainConfig);

  const { isMiniApp, walletAddress: miniAppAddress } = useMiniAppContext();

  useEffect(() => {
    if (!isWalletConnected || isMiniApp) return;
    switchToCorrectNetwork();
  }, [isWalletConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const effectiveAddress = isMiniApp ? miniAppAddress : walletAddress;
  const effectivelyConnected = isMiniApp ? !!miniAppAddress : isWalletConnected;

  const extrasTotal = selectedExtras.reduce(
    (sum, key) => sum + (roomConfig.fundraisingPrices[key] || 0),
    0
  );
  const totalAmount = roomConfig.entryFee + extrasTotal;

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  const handleWalletConnect = async () => {
    try {
      setError('');
      setPaymentStatus('connecting');
      const result = await connect();
      if (!result.success) {
        const errorMsg = result.error?.message ?? 'Failed to connect wallet';
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

      if (!isMiniApp) {
        if (!isWalletConnected) {
          await handleWalletConnect();
          return;
        }
        if (!isOnCorrectNetwork) {
          setError(`Please switch to ${networkInfo.expectedNetwork} in your wallet`);
          return;
        }
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
            web3Address: effectiveAddress,
            web3Chain: chainFamily,
            extras: selectedExtras,
            extraPayments: Object.fromEntries(
              selectedExtras.map((key) => [
                key,
                {
                  method: 'web3',
                  amount: roomConfig.fundraisingPrices[key],
                  txHash: 'already-paid',
                },
              ])
            ),
          },
          role: 'player',
        });

        localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
        setPaymentStatus('success');
        setTimeout(() => navigate(`/quiz/game/${roomId}/${playerId}`), 1000);
        return;
      }

      setTxHash(result.txHash || '');
      setPaymentStatus('confirming');

      const TOKEN_DECIMALS: Record<string, number> = {
        USDC: 6,
        USDT: 6,
        SOL: 9,
        BONK: 5,
        PYUSD: 6,
        EURC: 6,
        ETH: 18,
        MATIC: 18,
        BNB: 18,
      };

      const tokenSymbol = (roomConfig.currencySymbol ?? 'UNKNOWN').toUpperCase();
      const decimals = TOKEN_DECIMALS[tokenSymbol] ?? 6;
      const divisor = Math.pow(10, decimals);
      const entryFeeRaw = Math.round(roomConfig.entryFee * divisor);
      const extrasTotalRaw = Math.round(extrasTotal * divisor);

      const resolvedSolanaCluster: 'devnet' | 'mainnet' =
        roomConfig.solanaCluster === 'devnet' ? 'devnet' : 'mainnet';

      web3TransactionService
        .recordJoinPayment({
          game_type: 'quiz',
          room_id: roomId,
          wallet_address: effectiveAddress ?? '',
          chain: roomConfig.web3Chain === 'evm' ? 'evm' : 'solana',
          network:
            roomConfig.web3Chain === 'solana'
              ? resolvedSolanaCluster
              : roomConfig.evmNetwork ?? 'unknown',
          solana_cluster:
            roomConfig.web3Chain === 'solana' ? resolvedSolanaCluster : undefined,
          tx_hash: result.txHash ?? '',
          fee_token: tokenSymbol,
          token_address:
            (roomConfig as any).web3ContractAddress ??
            (roomConfig as any).contractAddress ??
            null,
          amount: entryFeeRaw + extrasTotalRaw,
          entry_fee_amount: entryFeeRaw,
          extras_amount: extrasTotalRaw,
          donation_amount: 0,
          metadata_json: selectedExtras.length > 0 ? { selectedExtras } : null,
        })
        .catch((err) =>
          console.warn('[Web3PaymentStep] Ledger write failed (non-critical):', err?.message)
        );

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
          web3Address: effectiveAddress,
          web3Chain: chainFamily,
          extras: selectedExtras,
          extraPayments: Object.fromEntries(
            selectedExtras.map((key) => [
              key,
              {
                method: 'web3',
                amount: roomConfig.fundraisingPrices[key],
                txHash: result.txHash,
              },
            ])
          ),
        },
        role: 'player',
      });

      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
      setPaymentStatus('success');
      setTimeout(() => navigate(`/quiz/game/${roomId}/${playerId}`), 1000);
    } catch (e: any) {
      console.error('Join failed:', e);

      if (
        e.message?.includes('already been processed') ||
        e.message?.includes('already processed')
      ) {
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
    effectiveAddress && effectiveAddress.length > 10
      ? `${effectiveAddress.slice(0, 6)}...${effectiveAddress.slice(-4)}`
      : effectiveAddress;

  const STATUS_MAP: Record<
    Exclude<PaymentStatus, 'idle'>,
    { icon: React.ReactElement; text: string; color: string }
  > = {
    connecting: {
      icon: <Loader className="h-5 w-5 animate-spin" />,
      text: `Connecting ${networkInfo.expectedNetwork}...`,
      color: 'text-blue-600',
    },
    paying: {
      icon: <Loader className="h-5 w-5 animate-spin" />,
      text: alreadyPaid ? 'Already paid! Reconnecting...' : 'Processing payment...',
      color: alreadyPaid ? 'text-green-600' : 'text-yellow-600',
    },
    confirming: {
      icon: <Loader className="h-5 w-5 animate-spin" />,
      text: 'Confirming...',
      color: 'text-orange-600',
    },
    joining: {
      icon: <Loader className="h-5 w-5 animate-spin" />,
      text: 'Joining...',
      color: 'text-green-600',
    },
    success: {
      icon: <CheckCircle className="h-5 w-5" />,
      text: 'Success! Redirecting...',
      color: 'text-green-600',
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
            <p className="text-fg/70 text-sm">
              Pay with {networkInfo.expectedNetwork} to join
            </p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md border px-3 py-1 text-sm">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-800">
              This quiz uses {networkInfo.expectedNetwork}
            </p>
            {!isMiniApp && (
              <p className="text-xs text-blue-600">
                Make sure you have a {chainFamily?.toUpperCase()} wallet ready
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
        {isMiniApp ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-green-800">Base Wallet Connected</div>
                <div className="text-xs font-mono text-green-600">
                  {effectiveAddress
                    ? `${effectiveAddress.slice(0, 6)}...${effectiveAddress.slice(-4)}`
                    : 'Connecting...'}
                </div>
              </div>
              <span className="text-lg text-green-500">✓</span>
            </div>
          </div>
        ) : !isWalletConnected ? (
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
            {!isOnCorrectNetwork && (
              <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-orange-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800">Wrong Network</p>
                    <p className="mt-1 text-xs text-orange-700">
                      Your wallet is on <strong>{networkInfo.currentNetwork}</strong>, but this quiz
                      requires <strong>{networkInfo.expectedNetwork}</strong>.
                    </p>
                    <button
                      onClick={() => switchToCorrectNetwork()}
                      className="mt-2 rounded-md bg-orange-600 px-3 py-1.5 text-xs text-white hover:bg-orange-700"
                    >
                      Switch Network
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div
              className={`rounded-lg border p-3 ${
                isOnCorrectNetwork
                  ? 'border-green-200 bg-green-50'
                  : 'border-orange-200 bg-orange-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={`text-sm font-medium ${
                      isOnCorrectNetwork ? 'text-green-800' : 'text-orange-800'
                    }`}
                  >
                    {isOnCorrectNetwork
                      ? `${networkInfo.expectedNetwork} Connected`
                      : `${networkInfo.currentNetwork || 'Unknown'} Connected`}
                  </div>
                  <div
                    className={`text-xs font-mono ${
                      isOnCorrectNetwork ? 'text-green-600' : 'text-orange-600'
                    }`}
                  >
                    {formattedAddr}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    setError('');
                    await disconnect();
                  }}
                  className="rounded-md border bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                >
                  <Unplug className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {status && (
        <div className="mb-4 flex items-center space-x-3 rounded-lg border bg-gray-50 p-4">
          <div className={status.color}>{status.icon}</div>
          <span className={`font-medium ${status.color}`}>{status.text}</span>
          {txHash && txHash !== 'already-paid' && (
            <span className="text-xs">{txHash.slice(0, 16)}…</span>
          )}
        </div>
      )}

      <div className="flex justify-end space-x-2 border-t pt-4">
        <button
          onClick={onBack}
          disabled={paymentStatus !== 'idle'}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm disabled:opacity-50"
        >
          <ChevronLeft className="mr-1 inline-block h-4 w-4" />
          Back
        </button>

        {(isMiniApp || effectivelyConnected) && (
          <button
            onClick={handleWeb3Join}
            disabled={paymentStatus !== 'idle' || (!isMiniApp && !isOnCorrectNetwork)}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            Pay {roomConfig.currencySymbol}
            {totalAmount}
          </button>
        )}
      </div>
    </div>
  );
};

export default Web3PaymentStep;