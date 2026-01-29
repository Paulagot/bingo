// src/components/Quiz/joinroom/Web2PaymentStep.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, CreditCard, Shield, Zap } from 'lucide-react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import { InstantPaymentStep } from './InstantPaymentStep';
import type { ClubPaymentMethod } from '../../../shared/types/payment';

const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) console.log('[Web2PaymentStep]', ...args);
};

interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  clubId?: string; // ✅ ADD THIS

  // Web3 fields
  web3Chain?: string;
  evmNetwork?: string;
  solanaCluster?: string;
  stellarNetwork?: string;
  roomContractAddress?: string;
  deploymentTxHash?: string;
  web3Currency?: string;

  // Room info
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
  roomId: string;
}

interface Web2PaymentStepProps {
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
}

type PaymentChoice = 'pay_admin' | 'instant_payment' | null;

export const Web2PaymentStep: React.FC<Web2PaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
  onClose,
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();
  
  // ✅ NEW: Payment choice state
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>(null);
  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  log('render', {
    roomId,
    playerName,
    paymentMethod: roomConfig.paymentMethod,
    entryFee: roomConfig.entryFee,
    currencySymbol: roomConfig.currencySymbol,
    selectedExtras,
    paymentChoice,
    clubId: roomConfig.clubId,
  });

  // Compute totals
  const { extrasTotal, totalAmount } = useMemo(() => {
    const extrasTotalInner = selectedExtras.reduce((sum, extraId) => {
      const price = roomConfig.fundraisingPrices[extraId] || 0;
      return sum + price;
    }, 0);

    return {
      extrasTotal: extrasTotalInner,
      totalAmount: roomConfig.entryFee + extrasTotalInner,
    };
  }, [selectedExtras, roomConfig.entryFee, roomConfig.fundraisingPrices]);

  // ✅ NEW: Fetch payment methods when instant_payment is selected
  useEffect(() => {
    if (paymentChoice === 'instant_payment' && roomConfig.clubId) {
      fetchPaymentMethods();
    }
  }, [paymentChoice, roomConfig.clubId]);

  const fetchPaymentMethods = async () => {
    if (!roomConfig.clubId) {
      setError('Club ID not available');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      log('Fetching payment methods for club:', roomConfig.clubId);
      
      const response = await fetch(`/api/payment-methods/${roomConfig.clubId}`);
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }
      
      log('Payment methods fetched:', data.paymentMethods);
      setPaymentMethods(data.paymentMethods);
      
      if (data.paymentMethods.length === 0) {
        setError('No instant payment methods configured. Please choose "Pay Host Directly".');
        setPaymentChoice(null);
      }
      
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
      setPaymentChoice(null);
    } finally {
      setLoading(false);
    }
  };

  // ✅ EXISTING: Join Room as UNPAID (Pay Admin flow)
  const handleJoinAsUnpaid = () => {
    log('handleJoinAsUnpaid clicked');

    if (!socket) {
      console.error('[Web2PaymentStep] Socket not available, cannot join room.');
      return;
    }

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      log('aborting join: empty trimmed name');
      return;
    }

    const playerId = nanoid();
    log('generated playerId', playerId);

    const extraPayments = Object.fromEntries(
      selectedExtras.map((extraId) => [
        extraId,
        {
          method: 'pay_admin',
          amount: roomConfig.fundraisingPrices[extraId] || 0,
        },
      ])
    );

    const payload = {
      roomId,
      user: {
        id: playerId,
        name: trimmedName,
        paid: false,
        paymentMethod: 'pay_admin',
        credits: 0,
        extras: selectedExtras,
        extraPayments,
      },
      role: 'player' as const,
    };

    log('emitting join_quiz_room with payload', payload);
    socket.emit('join_quiz_room', payload);

    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
    navigate(`/quiz/game/${roomId}/${playerId}`);
  };

  // ✅ NEW: If instant payment is chosen and methods loaded, show InstantPaymentStep
  if (paymentChoice === 'instant_payment' && !loading && paymentMethods.length > 0) {
    return (
      <InstantPaymentStep
        roomId={roomId}
        playerName={playerName}
        roomConfig={roomConfig}
        selectedExtras={selectedExtras}
        paymentMethods={paymentMethods}
        onBack={() => setPaymentChoice(null)} // Back to choice screen
        onClose={onClose}
      />
    );
  }

  // ✅ MAIN RENDER: Payment choice screen
  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36">
        
        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
            💶
          </div>
          <div>
            <h2 className="text-fg text-xl font-bold sm:text-2xl">Choose Payment Method</h2>
            <p className="text-fg/70 text-sm sm:text-base">
              Join {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} quiz
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-fg font-medium">Total to Pay</div>
              <div className="text-fg/70 text-sm">
                Entry: {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)}
                {extrasTotal > 0 && ` + Extras: ${roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {roomConfig.currencySymbol}{totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Selected Extras (if any) */}
        {selectedExtras.length > 0 && (
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="mb-3 flex items-center space-x-2 text-green-800 font-medium">
              <Shield className="h-4 w-4" />
              <span>Your Extras</span>
            </h3>
            <div className="space-y-2">
              {selectedExtras.map((extraId) => {
                const definition =
                  fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
                const price = roomConfig.fundraisingPrices[extraId] || 0;
                return (
                  <div
                    key={extraId}
                    className="flex items-center justify-between rounded border border-green-200 bg-white p-2"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{definition?.icon}</span>
                      <span className="text-sm font-medium text-green-700">
                        {definition?.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-700">
                      {roomConfig.currencySymbol}{price.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="mb-4 rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
              <span className="text-blue-800">Loading payment methods...</span>
            </div>
          </div>
        )}

        {/* ✅ NEW: Payment Choice Cards */}
        {!paymentChoice && !loading && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-3">How would you like to pay?</h3>
            
            {/* Option 1: Pay Host Directly */}
            <button
              onClick={() => setPaymentChoice('pay_admin')}
              className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-indigo-500 hover:bg-indigo-50 transition group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 group-hover:bg-indigo-200">
                  <CreditCard className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Pay Host Directly</div>
                  <div className="text-sm text-gray-600">
                    Join now, pay later in person (cash, card, Revolut)
                  </div>
                </div>
                <div className="text-indigo-600">→</div>
              </div>
            </button>

            {/* Option 2: Instant Payment */}
            <button
              onClick={() => setPaymentChoice('instant_payment')}
              className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50 transition group"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Pay Now (Instant Payment)</div>
                  <div className="text-sm text-gray-600">
                    Pay via Revolut, bank transfer, or QR code
                  </div>
                </div>
                <div className="text-blue-600">→</div>
              </div>
            </button>
          </div>
        )}

        {/* ✅ Show "Pay Admin" flow if selected */}
        {paymentChoice === 'pay_admin' && (
          <div className="space-y-4">
            <button
              onClick={() => setPaymentChoice(null)}
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Change payment method
            </button>
            
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center space-x-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="text-blue-800 font-semibold">Pay the Host Directly</h3>
                  <p className="text-sm text-blue-700">
                    You'll join as "unpaid". Pay the host in person, and they'll mark you as paid.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 text-fg font-medium">How this works:</h3>
              <ul className="space-y-1 text-sm text-fg/70">
                <li>• You join with your chosen name and extras</li>
                <li>• Host sees you as <strong>Unpaid</strong></li>
                <li>• Pay the host directly (cash, card, Revolut)</li>
                <li>• Host confirms your payment</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          {/* Only show Join button if "Pay Admin" is selected */}
          {paymentChoice === 'pay_admin' && (
            <button
              onClick={handleJoinAsUnpaid}
              className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base"
            >
              <span>Join &amp; Pay Host</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};



