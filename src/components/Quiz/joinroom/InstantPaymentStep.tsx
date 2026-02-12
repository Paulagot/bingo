// src/components/Quiz/joinroom/InstantPaymentStep.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Copy, ExternalLink, Loader } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import type { ClubPaymentMethod } from '../../../shared/types/payment';

const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) console.log('[InstantPaymentStep]', ...args);
};

interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  clubId?: string;

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

interface InstantPaymentStepProps {
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  selectedExtras: string[];
  paymentMethods: ClubPaymentMethod[];
  onBack: () => void;
  onClose: () => void;
}

export const InstantPaymentStep: React.FC<InstantPaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  paymentMethods,
  onBack,
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();
  
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);
  const [paymentReference] = useState(() => `QUIZ-${nanoid(6).toUpperCase()}`);
  const [hasPaid, setHasPaid] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  // ✅ Debug log on mount and when paymentMethods change
  useEffect(() => {
    log('Component mounted/updated', {
      paymentMethodsCount: paymentMethods.length,
      paymentMethods,
      selectedMethod,
      hasPaid,
    });
  }, [paymentMethods, selectedMethod, hasPaid]);
  
  const { extrasTotal, totalAmount } = useMemo(() => {
    const extrasTotal = selectedExtras.reduce((sum, extraId) => {
      const price = roomConfig.fundraisingPrices[extraId] || 0;
      return sum + price;
    }, 0);
    
    return {
      extrasTotal,
      totalAmount: roomConfig.entryFee + extrasTotal,
    };
  }, [selectedExtras, roomConfig.entryFee, roomConfig.fundraisingPrices]);
  
  const currency = roomConfig.currencySymbol || '€';
  
  const handleCopyReference = () => {
    navigator.clipboard.writeText(paymentReference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleClaimPayment = () => {
    if (!socket || !selectedMethod) return;
    
    setClaiming(true);
    
    const playerId = nanoid();
    const extraPayments = Object.fromEntries(
      selectedExtras.map((extraId) => [
        extraId,
        {
          method: 'instant_payment',
          amount: roomConfig.fundraisingPrices[extraId] || 0,
        },
      ])
    );
    
    // Join room with payment claimed flag
    socket.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerName.trim(),
        paid: false,
        paymentClaimed: true,
        paymentMethod: 'instant_payment',
        paymentReference,
        clubPaymentMethodId: selectedMethod.id,
        credits: 0,
        extras: selectedExtras,
        extraPayments,
      },
      role: 'player' as const,
    });
    
    // Claim payment in ledger
    socket.emit('claim_payment', {
      roomId,
      playerId,
      paymentMethod: 'instant_payment',
      paymentReference,
      clubPaymentMethodId: selectedMethod.id,
    });
    
    // Store for reconnect
    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
    
    // Navigate to game
    navigate(`/quiz/game/${roomId}/${playerId}`);
  };
  
  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36">
        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
            💳
          </div>
          <div>
            <h2 className="text-fg text-xl font-bold sm:text-2xl">Instant Payment</h2>
            <p className="text-fg/70 text-sm sm:text-base">
              Pay now and join {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} quiz
            </p>
          </div>
        </div>

   
        
        {/* Amount Summary */}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-fg font-medium">Total to Pay</div>
              <div className="text-fg/70 text-sm">
                Entry: {currency}{roomConfig.entryFee.toFixed(2)}
                {extrasTotal > 0 && ` + Extras: ${currency}${extrasTotal.toFixed(2)}`}
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {currency}{totalAmount.toFixed(2)}
            </div>
          </div>
        </div>
        
        {/* Step 1: Select Payment Method */}
        {!selectedMethod && paymentMethods.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Choose Payment Method</h3>
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => {
                  log('Payment method selected:', method);
                  setSelectedMethod(method);
                }}
                className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{method.methodLabel}</div>
                    <div className="text-sm text-gray-600 capitalize">
                      {method.providerName || method.methodCategory}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No payment methods available */}
        {!selectedMethod && paymentMethods.length === 0 && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">
              No payment methods available. Please go back and choose "Pay Host Directly".
            </p>
          </div>
        )}
        
        {/* Step 2: Payment Instructions */}
        {selectedMethod && !hasPaid && (
          <div className="space-y-4">
            <button
              onClick={() => {
                log('Clearing selected method');
                setSelectedMethod(null);
              }}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Change method
            </button>
            
            <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Payment Instructions</h3>
              
              {/* Revolut */}
              {selectedMethod.providerName === 'revolut' && (
                <div className="space-y-3">
                  {selectedMethod.methodConfig &&
                    'link' in selectedMethod.methodConfig &&
                    selectedMethod.methodConfig.link && (
                      <a>
                        href={selectedMethod.methodConfig.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-lg bg-white p-3 border border-blue-200 hover:bg-blue-100"
                      
                        <span className="font-medium">Open Revolut Payment</span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}

                  {selectedMethod.methodConfig && 
                    'qrCodeUrl' in selectedMethod.methodConfig && 
                    selectedMethod.methodConfig.qrCodeUrl && (
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <p className="text-sm text-gray-600 mb-2">Or scan QR code:</p>
                        <img
                          src={selectedMethod.methodConfig.qrCodeUrl}
                          alt="Revolut QR Code"
                          className="w-48 h-48 mx-auto"
                        />
                      </div>
                    )}
                </div>
              )}
              
              {/* Bank Transfer */}
              {selectedMethod.providerName === 'bank_transfer' && 
                selectedMethod.methodConfig && 
                'iban' in selectedMethod.methodConfig && (
                  <div className="bg-white rounded-lg p-3 border border-blue-200 space-y-2 text-sm">
                    {selectedMethod.methodConfig.accountName && (
                      <div>
                        <span className="font-medium">Account Name: </span>
                        {selectedMethod.methodConfig.accountName}
                      </div>
                    )}
                    {selectedMethod.methodConfig.iban && (
                      <div>
                        <span className="font-medium">IBAN: </span>
                        {selectedMethod.methodConfig.iban}
                      </div>
                    )}
                    {selectedMethod.methodConfig.bic && (
                      <div>
                        <span className="font-medium">BIC: </span>
                        {selectedMethod.methodConfig.bic}
                      </div>
                    )}
                  </div>
                )}
              
              {/* Player Instructions (if provided) */}
              {selectedMethod.playerInstructions && (
                <div className="bg-white rounded-lg p-3 border border-blue-200 text-sm">
                  <div dangerouslySetInnerHTML={{ __html: selectedMethod.playerInstructions }} />
                </div>
              )}
              
              {/* Payment Reference (CRITICAL) */}
              <div className="mt-3 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                <p className="text-sm font-semibold text-yellow-900 mb-2">
                  ⚠️ IMPORTANT: Include this reference in your payment
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-yellow-300 font-mono text-lg">
                    {paymentReference}
                  </code>
                  <button
                    onClick={handleCopyReference}
                    className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            {/* Confirm Payment Button */}
            <button
              onClick={() => {
                log('User confirmed payment');
                setHasPaid(true);
              }}
              className="w-full rounded-lg bg-green-600 px-4 py-3 text-white font-semibold hover:bg-green-700"
            >
              I've Completed the Payment
            </button>
          </div>
        )}
        
        {/* Step 3: Claim Payment */}
        {hasPaid && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                <Check className="h-6 w-6 text-green-600" />
                <h3 className="font-semibold text-green-900">Payment Submitted</h3>
              </div>
              <p className="text-sm text-green-800">
                You'll join the quiz with a "pending" badge. The host will confirm your payment shortly.
              </p>
            </div>
            
            <button
              onClick={handleClaimPayment}
              disabled={claiming}
              className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Quiz Now'
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <button
          onClick={onBack}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
};