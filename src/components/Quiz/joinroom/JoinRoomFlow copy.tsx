// src/components/Quiz/joinroom/JoinRoomFlow.tsx
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { RoomVerificationStep } from './RoomVerificationStep';
import { ExtrasSelectionStep } from './ExtrasSelectionStep';
import { DemoPaymentStep } from './DemoPaymentStep';
import { Web2PaymentStep } from './Web2PaymentStep';
import type { SupportedChain } from '../../../chains/types';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { WalletProvider } from '../../../context/WalletContext';
import { normalizePaymentMethod } from '../../../shared/utils/paymentMethods';

// ✅ Lazy load Web3Provider AND Web3PaymentStep together
const Web3Provider = lazy(() => 
  import('../../Web3Provider').then(m => ({ default: m.Web3Provider }))
);

const Web3PaymentStep = lazy(() => 
  import('./Web3PaymentStep').then(m => ({ default: m.Web3PaymentStep }))
);

// 🔍 central debug toggle + helper
const DEBUG = true;
const joinDebug = (...args: any[]) => {
  if (DEBUG) console.log('[JoinRoomFlow]', ...args);
};

// Loading spinner for Web3 components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 text-sm font-medium">Loading...</p>
    </div>
  </div>
);

// ✅ Add full-screen loading component
const FullScreenLoader = ({ message = 'Loading room...' }: { message?: string }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-2 sm:p-4">
    <div className="bg-white max-w-md w-full rounded-xl shadow-xl p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
        <p className="text-indigo-700 text-lg font-medium">{message}</p>
        <p className="text-gray-500 text-sm mt-2">This should only take a moment...</p>
      </div>
    </div>
  </div>
);

// Use consistent RoomConfig interface matching what verification returns
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

// ✅ NEW: Ticket data interface
interface TicketData {
  ticketId: string;
  roomId: string;
  playerName: string;
  entryFee: number;
  extras: string[];
  totalAmount: number;
  currency: string;
}

type JoinStep = 'verification' | 'name-entry' | 'extras' | 'payment';
type PaymentFlow = 'demo' | 'web3' | 'web2';

// Normalize backend strings to our SupportedChain union
const normalizeChain = (value?: string | null): SupportedChain | null => {
  if (!value) return null;
  const v = value.toLowerCase();
  if (['stellar', 'xlm'].includes(v)) return 'stellar';
  if (
    ['evm', 'ethereum', 'eth', 'polygon', 'matic', 'arbitrum', 'optimism', 'base'].includes(
      v
    )
  )
    return 'evm';
  if (['solana', 'sol'].includes(v)) return 'solana';
  return null;
};

interface JoinRoomFlowProps {
  onClose: () => void;
  onChainDetected?: (chain: SupportedChain) => void;
  prefilledRoomId?: string;
}

export const JoinRoomFlow: React.FC<JoinRoomFlowProps> = ({
  onClose,
  prefilledRoomId,
}) => {
  const { socket } = useQuizSocket();
  const { setFullConfig } = useQuizConfig();
  
  const [step, setStep] = useState<JoinStep>(
    prefilledRoomId ? 'name-entry' : 'verification'
  );
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow | null>(null);
  const [roomId, setRoomId] = useState(prefilledRoomId || '');
  const [playerName, setPlayerName] = useState('');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null);
  
  // ✅ Add loading state for auto-verification
  const [isAutoVerifying, setIsAutoVerifying] = useState(!!prefilledRoomId);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // ✅ NEW: Ticket redemption state
  const [ticketToken, setTicketToken] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [validatingTicket, setValidatingTicket] = useState(false);

  // 🔄 top-level render log
  joinDebug('render', {
    step,
    paymentFlow,
    hasRoomConfig: !!roomConfig,
    roomId,
    playerName,
    detectedChain,
    prefilledRoomId,
    isAutoVerifying,
    socketConnected: socket?.connected,
    hasTicket: !!ticketData,
  });

  // ✅ NEW: Check for ticket token in URL on mount
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search);

  // ✅ support new param + old param (backwards compatible)
  const token = urlParams.get('joinToken') || urlParams.get('ticket');

  if (token) {
    joinDebug('🎟️ Ticket token found in URL:', token);
    setTicketToken(token);
  } else {
    joinDebug('🎟️ No ticket token found in URL', {
      search: window.location.search,
    });
  }
}, []);


  // ✅ NEW: Validate ticket token when socket connects
  useEffect(() => {
    if (ticketToken && socket?.connected && !ticketData && !validatingTicket) {
      joinDebug('🎟️ Validating ticket token', { ticketToken });
      setValidatingTicket(true);
      
      socket.emit('validate_ticket_token', { joinToken: ticketToken }, (response: any) => {
        joinDebug('🎟️ Ticket validation response:', response);
        setValidatingTicket(false);
        
        if (response.ok) {
          joinDebug('✅ Ticket validated:', response.ticket);
          setTicketData(response.ticket);
          setPlayerName(response.ticket.playerName);
          setRoomId(response.ticket.roomId);
          setSelectedExtras(response.ticket.extras);
          
          // Auto-verify room
          if (prefilledRoomId === response.ticket.roomId) {
            joinDebug('🎟️ Room already being verified');
            // Room verification already in progress
          } else {
            joinDebug('🎟️ Starting room verification for ticket');
            setIsAutoVerifying(true);
            socket.emit('verify_quiz_room', { roomId: response.ticket.roomId });
          }
        } else {
          joinDebug('❌ Ticket validation failed:', response.error);
          alert(`Invalid ticket: ${response.error}`);
          setTicketToken(null);
        }
      });
    }
    // ✅ No cleanup needed for this effect
  }, [ticketToken, socket?.connected, ticketData, validatingTicket, prefilledRoomId]);

  // Auto-verify room if roomId is prefilled
  useEffect(() => {
    if (prefilledRoomId && socket?.connected && !roomConfig) {
      joinDebug('🚀 Auto-verifying room from URL', { 
        prefilledRoomId,
        socketConnected: socket.connected,
        socketId: socket.id 
      });
      
      setIsAutoVerifying(true);
      setVerificationError(null);

      // ✅ Add timeout in case socket never responds
      const timeout = setTimeout(() => {
        joinDebug('❌ Socket verification timeout after 10s');
        setVerificationError('Room verification timed out. Please try again.');
        setIsAutoVerifying(false);
        setStep('verification');
      }, 10000);

      joinDebug('📤 Emitting verify_quiz_room event', { roomId: prefilledRoomId });
      socket.emit('verify_quiz_room', { roomId: prefilledRoomId });

      const handleVerification = (data: any) => {
        clearTimeout(timeout);
        joinDebug('✅ Room verification response received', data);

        setIsAutoVerifying(false);

        if (!data.exists) {
          joinDebug('❌ Room does NOT exist');
          setVerificationError(`Room ${prefilledRoomId} not found`);
          setStep('verification');
          return;
        }

        // ✅ SET SESSION STORAGE IMMEDIATELY BEFORE setting roomConfig
        if (data.web3Chain === 'evm' && data.evmNetwork) {
          joinDebug('Pre-setting EVM network in sessionStorage', {
            evmNetwork: data.evmNetwork,
            roomContractAddress: data.roomContractAddress,
          });
          sessionStorage.setItem('active-evm-network', data.evmNetwork);
          if (data.roomContractAddress) {
            sessionStorage.setItem('active-room-contract', data.roomContractAddress);
          }
        }

        const normalizedConfig: RoomConfig = {
          ...data,
          currencySymbol: data.currencySymbol || '€',
          roomId: prefilledRoomId,
          clubId: data.clubId || data.club_id,
        };

        joinDebug('✅ Setting roomConfig from socket verify', normalizedConfig);
        setRoomConfig(normalizedConfig);
        
        setFullConfig({
          ...normalizedConfig,
          entryFee: String(normalizedConfig.entryFee),
          paymentMethod: normalizedConfig.paymentMethod === 'web3' ? 'web3' : 'cash_or_revolut',
        } as any);

        const normalized = normalizeChain(data.web3Chain);
        joinDebug('🔗 Normalized chain:', {
          raw: data.web3Chain,
          normalized,
        });
        if (normalized) setDetectedChain(normalized);

        let flow: PaymentFlow;
        if (data.demoMode) {
          flow = 'demo';
        } else if (data.paymentMethod === 'web3') {
          flow = 'web3';
        } else {
          flow = 'web2';
        }
        joinDebug('💳 Auto-selected paymentFlow', {
          paymentMethod: data.paymentMethod,
          demoMode: data.demoMode,
          paymentFlow: flow,
        });

        setPaymentFlow(flow);
        
        // ✅ If ticket token exists, skip to payment (redemption)
        // Use ticketToken instead of ticketData because ticketData might still be loading
        if (ticketToken) {
          joinDebug('🎟️ Ticket detected, skipping to payment step');
          setStep('payment');
        } else {
          setStep('name-entry');
        }
      };

      const handleError = (error: any) => {
        clearTimeout(timeout);
        joinDebug('❌ Socket error during verification:', error);
        setVerificationError(error.message || 'Failed to verify room');
        setIsAutoVerifying(false);
        setStep('verification');
      };

      socket.once('quiz_room_verification_result', handleVerification);
      socket.once('error', handleError);

      return () => {
        clearTimeout(timeout);
        socket.off('quiz_room_verification_result', handleVerification);
        socket.off('error', handleError);
      };
    }
  }, [prefilledRoomId, socket?.connected, roomConfig, socket, setFullConfig, ticketData]);

  const handleRoomVerified = (config: any, roomId: string, playerName: string) => {
    joinDebug('handleRoomVerified called', { config, roomId, playerName });

    // ✅ SET SESSION STORAGE FIRST
    if (config.web3Chain === 'evm' && config.evmNetwork) {
      joinDebug('Pre-setting EVM network in sessionStorage', {
        evmNetwork: config.evmNetwork,
        roomContractAddress: config.roomContractAddress,
      });
      sessionStorage.setItem('active-evm-network', config.evmNetwork);
      if (config.roomContractAddress) {
        sessionStorage.setItem('active-room-contract', config.roomContractAddress);
      }
    }

    const normalizedConfig: RoomConfig = {
      ...config,
      currencySymbol: config.currencySymbol || '€',
      roomId: roomId,
      clubId: config.clubId || config.club_id, 
    };

    joinDebug('Setting roomConfig from manual verify', normalizedConfig);
    setRoomConfig(normalizedConfig);
    setRoomId(roomId);
    setPlayerName(playerName);

    setFullConfig({
      ...normalizedConfig,
      entryFee: String(normalizedConfig.entryFee),
      paymentMethod: normalizePaymentMethod(normalizedConfig.paymentMethod),
    } as any);

    const normalized = normalizeChain(config.web3Chain);
    joinDebug('Setting detected chain', {
      raw: config.web3Chain,
      normalized,
    });
    setDetectedChain(normalized);

    let flow: PaymentFlow;
    if (config.demoMode) {
      flow = 'demo';
    } else if (config.paymentMethod === 'web3') {
      flow = 'web3';
    } else {
      flow = 'web2';
    }
    joinDebug('Selected paymentFlow from config', {
      paymentMethod: config.paymentMethod,
      demoMode: config.demoMode,
      paymentFlow: flow,
    });

    setPaymentFlow(flow);
    setStep('extras');
  };

  const handleExtrasSelected = (extras: string[]) => {
    joinDebug('Extras selected, moving to payment step', {
      extras,
      roomId,
      playerName,
      paymentFlow,
      hasTicket: !!ticketData,
    });
    setSelectedExtras(extras);
    setStep('payment');
  };

  const handleBackToVerification = () => {
    joinDebug('Back to verification pressed. Resetting flow.', {
      currentStep: step,
      roomId,
    });
    setStep('verification');
    setPaymentFlow(null);
    setRoomConfig(null);
    setSelectedExtras([]);
    setVerificationError(null);
    setTicketData(null);
    setTicketToken(null);
    sessionStorage.removeItem('active-evm-network');
    sessionStorage.removeItem('active-room-contract');
    setFullConfig({});
  };

  const handleBackToExtras = () => {
    joinDebug('Back to extras pressed', {
      currentStep: step,
      roomId,
      selectedExtras,
    });
    setStep('extras');
  };

  // ✅ Show loading screen while auto-verifying
  if (isAutoVerifying || validatingTicket) {
    const message = validatingTicket 
      ? 'Validating your ticket...' 
      : `Verifying room ${prefilledRoomId}...`;
    return <FullScreenLoader message={message} />;
  }

  // ✅ Show error if verification failed
  if (verificationError && !socket?.connected) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-2 sm:p-4">
        <div className="bg-white max-w-md w-full rounded-xl shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-red-700 font-bold text-xl mb-2">Connection Error</h2>
            <p className="text-red-600 mb-4">{verificationError}</p>
            <button 
              onClick={handleBackToVerification}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-2 sm:p-4">
      <div className="bg-muted max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-xl shadow-xl sm:max-h-[90vh]">
        {step === 'verification' && (
          <RoomVerificationStep onVerified={handleRoomVerified} onClose={onClose} />
        )}

        {step === 'name-entry' && roomConfig && !ticketData && (
          <NameEntryStep
            roomId={roomId}
            roomConfig={roomConfig}
            onBack={handleBackToVerification}
            onContinue={(name) => {
              joinDebug('Name entry continue', { name, roomId });
              setPlayerName(name);
              setStep('extras');
            }}
          />
        )}

        {step === 'extras' && roomConfig && (
          <ExtrasSelectionStep
            roomId={roomId}
            playerName={playerName}
            roomConfig={roomConfig}
            onBack={handleBackToVerification}
            onContinue={handleExtrasSelected}
            preSelectedExtras={ticketData?.extras} // ✅ Pre-select ticket extras
          />
        )}

        {step === 'payment' && roomConfig && (
          <>
            {/* ✅ Show loading while validating ticket */}
            {ticketToken && validatingTicket ? (
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-gray-700">Validating ticket...</span>
                </div>
              </div>
            ) : ticketToken && ticketData ? (
              /* ✅ Ticket redemption flow */
              <TicketRedemptionStep
                ticketData={ticketData}
                ticketToken={ticketToken}
                roomConfig={roomConfig}
                onBack={handleBackToExtras}
              />
            ) : (
              <>
                {paymentFlow === 'demo' && (
                  <DemoPaymentStep
                    roomId={roomId}
                    playerName={playerName}
                    roomConfig={roomConfig}
                    selectedExtras={selectedExtras}
                    onBack={handleBackToExtras}
                    onClose={onClose}
                  />
                )}

                {paymentFlow === 'web3' &&
                  (detectedChain ? (
                    <Suspense fallback={<LoadingSpinner />}>
                      <Web3Provider key="web3-payment-provider">
                        <WalletProvider 
                          roomConfig={{
                            web3Chain: roomConfig.web3Chain,
                            evmNetwork: roomConfig.evmNetwork,
                            solanaCluster: roomConfig.solanaCluster,
                            stellarNetwork: roomConfig.stellarNetwork,
                          }}
                        >
                          <Web3PaymentStep
                            chainOverride={detectedChain}
                            roomId={roomId}
                            playerName={playerName}
                            roomConfig={roomConfig}
                            selectedExtras={selectedExtras}
                            onBack={handleBackToExtras}
                            onClose={onClose}
                          />
                        </WalletProvider>
                      </Web3Provider>
                    </Suspense>
                  ) : (
                    <div className="p-6">
                      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                        Detecting blockchain network… Please wait.
                      </div>
                    </div>
                  ))}

                {paymentFlow === 'web2' && (
                  <Web2PaymentStep
                    roomId={roomId}
                    playerName={playerName}
                    roomConfig={roomConfig}
                    selectedExtras={selectedExtras}
                    onBack={handleBackToExtras}
                    onClose={onClose}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ✅ NEW: Ticket Redemption Component
interface TicketRedemptionStepProps {
  ticketData: TicketData;
  ticketToken: string;
  roomConfig: RoomConfig;
  onBack: () => void;
}

const TicketRedemptionStep: React.FC<TicketRedemptionStepProps> = ({
  ticketData,
  ticketToken,
  roomConfig,
  onBack,
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRedeem = () => {
    if (!socket) {
      setError('Not connected to server');
      return;
    }

    setRedeeming(true);
    setError(null);

    const playerId = nanoid();

    joinDebug('🎟️ Redeeming ticket:', { ticketToken, playerId });

    socket.emit('redeem_ticket_and_join', {
      joinToken: ticketToken,
      playerId,
    }, (response: any) => {
      setRedeeming(false);

      if (response.ok) {
        joinDebug('✅ Ticket redeemed, joining room');
        
        // Join room with player data from ticket
        socket.emit('join_quiz_room', {
          roomId: response.roomId,
          user: {
            ...response.playerData,
            id: playerId, // Use the playerId we generated
          },
          role: 'player' as const,
          ticketId: ticketData.ticketId, // ✅ Pass ticket ID
        });

        localStorage.setItem(`quizPlayerId:${response.roomId}`, playerId);
        navigate(`/quiz/game/${response.roomId}/${playerId}`);
      } else {
        joinDebug('❌ Ticket redemption failed:', response.error);
        setError(response.error || 'Failed to redeem ticket');
      }
    });
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          🎟️
        </div>
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Redeem Your Ticket</h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Ready to join {roomConfig.hostName}'s quiz!
          </p>
        </div>
      </div>

      {/* Ticket Summary */}
      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
        <h3 className="font-semibold text-green-900 mb-3">Ticket Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-green-700">Player Name:</span>
            <span className="font-medium text-green-900">{ticketData.playerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-green-700">Entry Fee:</span>
            <span className="font-medium text-green-900">
              {ticketData.currency}{ticketData.entryFee.toFixed(2)}
            </span>
          </div>
          {ticketData.extras.length > 0 && (
            <div>
              <span className="text-green-700">Extras:</span>
              <div className="mt-1 space-y-1">
                {ticketData.extras.map((extraId) => (
                  <div key={extraId} className="text-green-800 text-xs">
                    • {extraId}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between border-t border-green-200 pt-2">
            <span className="text-green-900 font-semibold">Total:</span>
            <span className="font-bold text-green-900">
              {ticketData.currency}{ticketData.totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Status */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">✅</div>
          <div>
            <div className="font-semibold text-blue-900">Payment Confirmed</div>
            <div className="text-sm text-blue-700">Your ticket is ready to use</div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button
          onClick={onBack}
          className="flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
          disabled={redeeming}
        >
          <span>Back</span>
        </button>

        <button
          onClick={handleRedeem}
          disabled={redeeming}
          className="flex items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed sm:px-6 sm:py-3 sm:text-base"
        >
          {redeeming ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Joining...</span>
            </>
          ) : (
            <>
              <span>Join Quiz Now</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Existing NameEntryStep component
interface NameEntryStepProps {
  roomId: string;
  roomConfig: RoomConfig;
  onBack: () => void;
  onContinue: (name: string) => void;
}

const NameEntryStep: React.FC<NameEntryStepProps> = ({
  roomId,
  roomConfig,
  onBack,
  onContinue,
}) => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    if (!playerName.trim()) {
      setError('Please enter your name.');
      return;
    }
    onContinue(playerName.trim());
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
          🎯
        </div>
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">
            Joining {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} Game
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Room {roomId} • Just enter your name to continue!
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Your Name
          </label>
          <input
            value={playerName}
            onChange={(e) => {
              setPlayerName(e.target.value);
              setError('');
            }}
            placeholder="Enter your display name"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:px-4 sm:py-3 sm:text-base"
            autoFocus
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
          <span className="h-5 w-5 flex-shrink-0 text-red-500">⚠️</span>
          <p className="text-sm text-red-700 sm:text-base">{error}</p>
        </div>
      )}

      <div className="mt-6 flex flex-col justify-end space-y-3 border-t border-gray-200 pt-6 sm:flex-row sm:space-x-3 sm:space-y-0">
        <button
          onClick={onBack}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="flex items-center justify-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base"
        >
          <span>Continue to Extras</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
};
