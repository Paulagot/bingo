// src/components/Quiz/joinroom/Web3PaymentStep.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { ChevronLeft, AlertCircle, CheckCircle, Loader, Wallet, Shield } from 'lucide-react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

// Import chain-specific hooks ALWAYS - not conditionally
import { useQuizContract as useStellarQuizContract } from '../../../chains/stellar/useQuizContract';
import { useStellarWalletContext } from '../../../chains/stellar/StellarWalletProvider';

interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  web3Chain?: string;
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
}

type PaymentStatus = 'idle' | 'connecting' | 'paying' | 'confirming' | 'joining' | 'success';

export const Web3PaymentStep: React.FC<Web3PaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
  onClose
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();
  
  // ALWAYS call hooks - never conditionally
  const stellarWallet = useStellarWalletContext();
  const stellarContract = useStellarQuizContract();
  
  // Use the established multi-chain integration hook
  const {
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet,
    getChainDisplayName,
    getFormattedAddress,
    needsWalletConnection,
  } = useQuizChainIntegration();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Calculate total payment amount
  const extrasTotal = selectedExtras.reduce((sum, extraId) => {
    return sum + (roomConfig.fundraisingPrices[extraId] || 0);
  }, 0);
  
  const totalAmount = roomConfig.entryFee + extrasTotal;

  // Override wallet requirement check for join room flow
  const isWalletRequired = selectedChain && totalAmount > 0;
  const canProceed = isWalletRequired ? isWalletConnected : true;

  // Multi-chain wallet connection handlers
  const handleWalletConnect = async () => {
    try {
      setError('');
      setPaymentStatus('connecting');
      
      switch (selectedChain) {
        case 'stellar':
          if (stellarWallet) {
            const result = await stellarWallet.connect();
            if (!result.success) {
              throw new Error(result.error?.message || 'Failed to connect Stellar wallet');
            }
          }
          break;
        case 'evm':
          throw new Error('EVM wallet connection not implemented yet');
        case 'solana':
          throw new Error('Solana wallet connection not implemented yet');
        default:
          throw new Error(`Unsupported chain: ${selectedChain}`);
      }
      
      setPaymentStatus('idle');
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
      setPaymentStatus('idle');
    }
  };

  // Multi-chain join room function
  const handleWeb3Join = async () => {
    try {
      setError('');
      
      if (!selectedChain) {
        throw new Error('No blockchain selected');
      }

      // Step 1: Connect wallet if needed
      if (needsWalletConnection) {
        await handleWalletConnect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 2: Verify wallet connection and get contract
      let joinRoomResult;
      let walletAddress;
      
      switch (selectedChain) {
        case 'stellar':
          if (!stellarWallet?.wallet.isConnected || !stellarWallet.wallet.address || !stellarContract) {
            throw new Error('Stellar wallet not connected or contract not available');
          }
          
          walletAddress = stellarContract.walletAddress;
          
          setPaymentStatus('paying');
          joinRoomResult = await stellarContract.joinRoom({
            roomId,
            playerAddress: walletAddress!,
            extrasAmount: extrasTotal > 0 ? extrasTotal.toString() : undefined
          });
          break;
          
        case 'evm':
          throw new Error('EVM contract integration not implemented yet');
          
        case 'solana':
          throw new Error('Solana contract integration not implemented yet');
          
        default:
          throw new Error(`Unsupported chain: ${selectedChain}`);
      }

      if (!joinRoomResult.success) {
        throw new Error(joinRoomResult.error || 'Payment failed');
      }

      setTxHash(joinRoomResult.txHash || '');
      setPaymentStatus('confirming');

      // Step 3: Wait for blockchain confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: Join via socket with proof of payment
      setPaymentStatus('joining');
      const playerId = nanoid();
      
      socket?.emit('join_quiz_room', {
        roomId,
        user: {
          id: playerId,
          name: playerName,
          paid: true,
          paymentMethod: 'web3',
          web3TxHash: joinRoomResult.txHash,
          web3Address: walletAddress,
          web3Chain: selectedChain,
          extras: selectedExtras,
          extraPayments: Object.fromEntries(
            selectedExtras.map(key => [key, { 
              method: 'web3', 
              amount: roomConfig.fundraisingPrices[key],
              txHash: joinRoomResult.txHash
            }])
          )
        },
        role: 'player'
      });

      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
      setPaymentStatus('success');
      
      // Navigate to game
      setTimeout(() => {
        navigate(`/quiz/game/${roomId}/${playerId}`);
        
      }, 1500);

    } catch (err: any) {
      console.error('Web3 join failed:', err);
      setError(err.message || 'Failed to join game');
      setPaymentStatus('idle');
    }
  };

  const getStatusDisplay = () => {
    switch (paymentStatus) {
      case 'connecting':
        return { icon: <Loader className="h-5 w-5 animate-spin" />, text: `Connecting ${getChainDisplayName()} wallet...`, color: 'text-blue-600' };
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
  };

  const status = getStatusDisplay();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          🌐
        </div>
        <div>
          <h2 className="text-fg text-xl font-bold sm:text-2xl">Web3 Payment</h2>
          <p className="text-fg/70 text-sm sm:text-base">
            Pay with {getChainDisplayName()} to join
          </p>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-fg font-medium">Total Cost</div>
            <div className="text-fg/70 text-sm">
              Entry: {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)}
              {extrasTotal > 0 && ` + Extras: ${roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
            </div>
          </div>
          <div className="text-xl font-bold text-blue-900">
            {roomConfig.currencySymbol}{totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Selected Extras Display */}
      {selectedExtras.length > 0 && (
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 mb-4">
          <h3 className="text-purple-800 font-medium mb-3 flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Selected Arsnal</span>
          </h3>
          <div className="space-y-2">
            {selectedExtras.map(extraId => {
              const definition = fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
              const price = roomConfig.fundraisingPrices[extraId] || 0;
              return (
                <div key={extraId} className="flex items-center justify-between rounded border border-purple-200 bg-white p-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{definition?.icon}</span>
                    <span className="text-purple-700 font-medium text-sm">{definition?.label}</span>
                  </div>
                  <span className="text-purple-700 font-bold text-sm">
                    {roomConfig.currencySymbol}{price.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wallet Status */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-800">
              {getChainDisplayName()} Wallet Status
            </span>
          </div>
          <div
            className={`flex items-center space-x-2 ${
              canProceed
                ? 'text-green-600'
                : 'text-yellow-600'
            }`}
          >
            <div
              className={`h-2 w-2 rounded-full ${
                canProceed
                  ? 'bg-green-500'
                  : 'bg-yellow-500'
              }`}
            />
            <span className="text-sm font-medium">
              {canProceed ? 'Ready' : 'Connection needed'}
            </span>
          </div>
        </div>

        {/* Inline wallet connection UI */}
        {selectedChain && (
          <div className="mb-3">
            {!isWalletConnected ? (
              <button
                onClick={handleWalletConnect}
                disabled={paymentStatus === 'connecting'}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paymentStatus === 'connecting' ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Connecting {getChainDisplayName()} Wallet...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    <span>Connect {getChainDisplayName()} Wallet</span>
                  </>
                )}
              </button>
            ) : (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <div>
                      <div className="text-sm font-medium text-green-800">
                        {getChainDisplayName()} Wallet Connected
                      </div>
                      <div className="font-mono text-xs text-green-600">
                        {getFormattedAddress()}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-medium text-green-600">Ready</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {status && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className={status.color}>{status.icon}</div>
            <span className={`font-medium ${status.color}`}>{status.text}</span>
          </div>
          {txHash && (
            <div className="mt-2 text-xs text-gray-600">
              Transaction: {txHash.slice(0, 16)}...
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm text-red-700 sm:text-base">{error}</p>
        </div>
      )}

      <div className="border-border mt-6 flex flex-col justify-end space-y-3 border-t pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button 
          onClick={onBack} 
          disabled={paymentStatus !== 'idle'}
          className="text-fg/80 flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium transition-colors hover:bg-gray-200 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <button 
          onClick={handleWeb3Join}
          disabled={paymentStatus !== 'idle' || !selectedChain || !canProceed}
          className="flex items-center justify-center space-x-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50 sm:px-6 sm:py-3 sm:text-base"
        >
          <span>
            {!isWalletConnected 
              ? 'Connect & Pay' 
              : `Pay ${roomConfig.currencySymbol}${totalAmount.toFixed(2)}`
            }
          </span>
          <CheckCircle className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
