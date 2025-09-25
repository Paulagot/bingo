// src/components/Quiz/joinroom/Web3PaymentStep.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { ChevronLeft, AlertCircle, CheckCircle, Loader, Wallet,  } from 'lucide-react';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

import { useQuizChainIntegration } from '../../../hooks/useQuizChainIntegration';




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

// --- ROUTER: picks the right chain-specific component ---
export const Web3PaymentStep: React.FC<Web3PaymentStepProps> = (props) => {
  const { selectedChain, getChainDisplayName } = useQuizChainIntegration();

  if (selectedChain === 'stellar') {
    return <StellarPaymentStep {...props} />;
  }

  // TODO: add EVM/Solana implementations later
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          🌐
        </div>
        <div>
          <h2 className="text-fg text-xl font-bold sm:text-2xl">Web3 Payment</h2>
          <p className="text-fg/70 text-sm sm:text-base">
            {getChainDisplayName()} payments are not implemented yet.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        Multichain placeholder: this room selected a chain we don’t support yet in the join flow.
      </div>
    </div>
  );
};

// =======================================================
// ===============  STELLAR SUBCOMPONENT  ================
// =======================================================

import { useQuizContract as useStellarQuizContract } from '../../../chains/stellar/useQuizContract';
import { useStellarWalletContext } from '../../../chains/stellar/StellarWalletProvider';

const StellarPaymentStep: React.FC<Web3PaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
  onClose
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();

  const {
    selectedChain,
    isWalletConnected,
    walletReadiness,
    currentWallet,
    getChainDisplayName,
    getFormattedAddress,
    needsWalletConnection,
  } = useQuizChainIntegration();

  // Stellar-only hooks (safe here because this component only renders when selectedChain==='stellar')
  const stellarWallet = useStellarWalletContext();
  const stellarContract = useStellarQuizContract();

  type PaymentStatus = 'idle' | 'connecting' | 'paying' | 'confirming' | 'joining' | 'success';
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Compute totals
  const extrasTotal = selectedExtras.reduce((sum, extraId) => {
    return sum + (roomConfig.fundraisingPrices[extraId] || 0);
  }, 0);
  const totalAmount = roomConfig.entryFee + extrasTotal;

  const isWalletRequired = totalAmount > 0; // in Stellar subcomponent we know chain is stellar
  const canProceed = isWalletRequired ? isWalletConnected : true;

  const handleWalletConnect = async () => {
    try {
      setError('');
      setPaymentStatus('connecting');

      const result = await stellarWallet.connect();
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to connect Stellar wallet');
      }

      setPaymentStatus('idle');
    } catch (err: any) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
      setPaymentStatus('idle');
    }
  };

  const handleWeb3Join = async () => {
    try {
      setError('');

      // Step 1: connect if needed
      if (needsWalletConnection) {
        await handleWalletConnect();
        await new Promise(r => setTimeout(r, 750));
      }

      // Step 2: verify wallet/contract
      if (!stellarWallet?.wallet.isConnected || !stellarWallet.wallet.address || !stellarContract) {
        throw new Error('Stellar wallet not connected or contract not available');
      }

      const walletAddress = stellarContract.walletAddress;
      setPaymentStatus('paying');

      const joinRoomResult = await stellarContract.joinRoom({
        roomId,
        playerAddress: walletAddress!,
        extrasAmount: extrasTotal > 0 ? extrasTotal.toString() : undefined
      });

      if (!joinRoomResult.success) {
        throw new Error(joinRoomResult.error || 'Payment failed');
      }

      setTxHash(joinRoomResult.txHash || '');
      setPaymentStatus('confirming');
      await new Promise(r => setTimeout(r, 2000));

      // Step 3: join via socket
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
          web3Chain: 'stellar',
          extras: selectedExtras,
          extraPayments: Object.fromEntries(
            selectedExtras.map(key => [
              key,
              { method: 'web3', amount: roomConfig.fundraisingPrices[key], txHash: joinRoomResult.txHash }
            ])
          )
        },
        role: 'player'
      });

      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
      setPaymentStatus('success');

      setTimeout(() => {
        navigate(`/quiz/game/${roomId}/${playerId}`);
      }, 1200);
    } catch (err: any) {
      console.error('Web3 join failed:', err);
      setError(err.message || 'Failed to join game');
      setPaymentStatus('idle');
    }
  };

  const getStatusDisplay = () => {
    switch (paymentStatus) {
      case 'connecting':  return { icon: <Loader className="h-5 w-5 animate-spin" />, text: `Connecting ${getChainDisplayName()} wallet...`, color: 'text-blue-600' };
      case 'paying':      return { icon: <Loader className="h-5 w-5 animate-spin" />, text: 'Processing payment...', color: 'text-yellow-600' };
      case 'confirming':  return { icon: <Loader className="h-5 w-5 animate-spin" />, text: 'Confirming transaction...', color: 'text-orange-600' };
      case 'joining':     return { icon: <Loader className="h-5 w-5 animate-spin" />, text: 'Joining game...', color: 'text-green-600' };
      case 'success':     return { icon: <CheckCircle className="h-5 w-5" />, text: 'Success! Redirecting...', color: 'text-green-600' };
      default:            return null;
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
          <p className="text-fg/70 text-sm sm:text-base">Pay with {getChainDisplayName()} to join</p>
        </div>
      </div>

      {/* Summary */}
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

      {/* Wallet Status */}
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 mb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-purple-600" />
            <span className="font-medium text-purple-800">{getChainDisplayName()} Wallet Status</span>
          </div>
          <div className={`flex items-center space-x-2 ${canProceed ? 'text-green-600' : 'text-yellow-600'}`}>
            <div className={`h-2 w-2 rounded-full ${canProceed ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm font-medium">{canProceed ? 'Ready' : 'Connection needed'}</span>
          </div>
        </div>

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
                  <div className="text-sm font-medium text-green-800">{getChainDisplayName()} Wallet Connected</div>
                  <div className="font-mono text-xs text-green-600">{getFormattedAddress()}</div>
                </div>
              </div>
              <div className="text-sm font-medium text-green-600">Ready</div>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {status && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
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
          disabled={paymentStatus !== 'idle' || !canProceed}
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

