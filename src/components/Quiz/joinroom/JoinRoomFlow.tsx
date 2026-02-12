// src/components/Quiz/joinroom/JoinRoomFlow.refactored.tsx
import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { RoomVerificationStep } from './RoomVerificationStep';
import { DemoPaymentStep } from './DemoPaymentStep';
import type { SupportedChain } from '../../../chains/types';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { WalletProvider } from '../../../context/WalletContext';
import { normalizePaymentMethod } from '../../../shared/utils/paymentMethods';

// Shared components
import { StepLayout } from '../shared/StepWrapper';
import { PlayerDetailsForm, PlayerDetailsFormData, usePlayerDetailsValidation } from '../shared/PlayerDetailsForm';
import { ExtrasSelector, useExtrasSelection } from '../shared/ExtrasSelector';
import { PaymentMethodSelector, type ClubPaymentMethod } from '../shared/PaymentMethodSelector';
import { PaymentInstructionsContent, PaymentInstructionsFooter } from '../shared/PaymentInstructions';
import { ActionButtons, PayAdminButton } from '../shared/ActionButtons';

// Lazy load Web3 components
const Web3Provider = lazy(() =>
  import('../../../components/Web3Provider').then(m => ({ default: m.Web3Provider }))
);

const Web3PaymentStep = lazy(() =>
  import('./Web3PaymentStep').then(m => ({ default: m.Web3PaymentStep }))
);

const DEBUG = true;
const joinDebug = (...args: any[]) => {
  if (DEBUG) console.log('[JoinRoomFlow]', ...args);
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 text-sm font-medium">Loading...</p>
    </div>
  </div>
);

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

interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  clubId?: string;
  web3Chain?: string;
  evmNetwork?: string;
  solanaCluster?: string;
  stellarNetwork?: string;
  roomContractAddress?: string;
  deploymentTxHash?: string;
  web3Currency?: string;
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
  roomId: string;
}

interface TicketData {
  ticketId: string;
  roomId: string;
  playerName: string;
  entryFee: number;
  extras: string[];
  totalAmount: number;
  currency: string;

  // Optional fields if your server includes them (safe to ignore if not present)
  paymentStatus?: 'payment_claimed' | 'payment_confirmed' | 'refunded' | string;
  redemptionStatus?: 'unredeemed' | 'blocked' | 'ready' | 'redeemed' | 'expired' | string;
}

type JoinStep =
  | 'verification'
  | 'player-details'
  | 'extras'
  | 'payment-choice'
  | 'payment-method'
  | 'payment-instructions'
  | 'pay-admin-confirm'
  | 'ticket-redeem';

type PaymentFlow = 'demo' | 'web3' | 'web2' | null;

const normalizeChain = (value?: string | null): SupportedChain | null => {
  if (!value) return null;
  const v = value.toLowerCase();
  if (['stellar', 'xlm'].includes(v)) return 'stellar';
  if (['evm', 'ethereum', 'eth', 'polygon', 'matic', 'arbitrum', 'optimism', 'base'].includes(v)) return 'evm';
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
  const navigate = useNavigate();

  const [step, setStep] = useState<JoinStep>(prefilledRoomId ? 'player-details' : 'verification');
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow>(null);
  const [roomId, setRoomId] = useState(prefilledRoomId || '');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null);

  const [isAutoVerifying, setIsAutoVerifying] = useState(!!prefilledRoomId);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [ticketToken, setTicketToken] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [validatingTicket, setValidatingTicket] = useState(false);

  // Payment state
  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);
  const [hasAvailableMethods, setHasAvailableMethods] = useState<boolean | null>(null);
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [paymentReference] = useState(() => `QUIZ-${nanoid(6).toUpperCase()}`);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [hasCopiedReference, setHasCopiedReference] = useState(false);

  // Form state
  const [playerDetails, setPlayerDetails] = useState<PlayerDetailsFormData>({
    playerName: '',
  });

  const { selectedExtras, toggleExtra, calculateExtrasTotal, setSelectedExtras } = useExtrasSelection();
  const isPlayerDetailsValid = usePlayerDetailsValidation(playerDetails, 'join');

  // Computed values
  const availableExtras = useMemo(() => {
    if (!roomConfig) return [];
    return Object.entries(roomConfig.fundraisingOptions)
      .filter(([_, enabled]) => enabled)
      .map(([extraId]) => extraId);
  }, [roomConfig]);

  const extrasTotal = useMemo(() => {
    if (!roomConfig) return 0;
    return calculateExtrasTotal(roomConfig.fundraisingPrices);
  }, [selectedExtras, roomConfig, calculateExtrasTotal]);

  const totalAmount = useMemo(() => {
    if (!roomConfig) return 0;
    return roomConfig.entryFee + extrasTotal;
  }, [roomConfig, extrasTotal]);

  joinDebug('render', {
    step,
    paymentFlow,
    hasRoomConfig: !!roomConfig,
    roomId,
    playerName: playerDetails.playerName,
    detectedChain,
    hasTicket: !!ticketData,
    ticketToken: !!ticketToken,
    selectedMethod: !!selectedMethod,
  });

  // Check for ticket token in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('joinToken') || urlParams.get('ticket');
    if (token) {
      joinDebug('🎟️ Ticket token found in URL:', token);
      setTicketToken(token);
    }
  }, []);

  // Validate ticket token
  useEffect(() => {
    if (ticketToken && socket?.connected && !ticketData && !validatingTicket) {
      joinDebug('🎟️ Validating ticket token', { ticketToken });
      setValidatingTicket(true);

      socket.emit('validate_ticket_token', { joinToken: ticketToken }, (response: any) => {
        joinDebug('🎟️ Ticket validation response:', response);
        setValidatingTicket(false);

        if (response.ok) {
          setTicketData(response.ticket);
          setPlayerDetails({ playerName: response.ticket.playerName });
          setRoomId(response.ticket.roomId);
          setSelectedExtras(response.ticket.extras);

          // ✅ IMPORTANT: ticket users should go to ticket step (not payment-instructions)
          setStep('ticket-redeem');

          // Ensure we verify the correct room if URL prefilled differs
          if (prefilledRoomId !== response.ticket.roomId) {
            setIsAutoVerifying(true);
            socket.emit('verify_quiz_room', { roomId: response.ticket.roomId });
          }
        } else {
          alert(`Invalid ticket: ${response.error}`);
          setTicketToken(null);
        }
      });
    }
  }, [ticketToken, socket?.connected, ticketData, validatingTicket, prefilledRoomId, setSelectedExtras]);

  // Auto-verify room if roomId is prefilled
  useEffect(() => {
    if (prefilledRoomId && socket?.connected && !roomConfig) {
      joinDebug('🚀 Auto-verifying room from URL', { prefilledRoomId });

      setIsAutoVerifying(true);
      setVerificationError(null);

      const timeout = setTimeout(() => {
        setVerificationError('Room verification timed out. Please try again.');
        setIsAutoVerifying(false);
        setStep('verification');
      }, 10000);

      socket.emit('verify_quiz_room', { roomId: prefilledRoomId });

      const handleVerification = (data: any) => {
        clearTimeout(timeout);
        setIsAutoVerifying(false);

        if (!data.exists) {
          setVerificationError(`Room ${prefilledRoomId} not found`);
          setStep('verification');
          return;
        }

        // Set session storage for EVM networks
        if (data.web3Chain === 'evm' && data.evmNetwork) {
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

        setRoomConfig(normalizedConfig);
        setFullConfig({
          ...normalizedConfig,
          entryFee: String(normalizedConfig.entryFee),
          paymentMethod: normalizedConfig.paymentMethod === 'web3' ? 'web3' : 'cash_or_revolut',
        } as any);

        const normalized = normalizeChain(data.web3Chain);
        if (normalized) setDetectedChain(normalized);

        let flow: PaymentFlow;
        if (data.demoMode) flow = 'demo';
        else if (data.paymentMethod === 'web3') flow = 'web3';
        else flow = 'web2';

        setPaymentFlow(flow);

        // ✅ IMPORTANT: If this is a ticket join, DO NOT send them to payment-instructions
        if (ticketToken) {
          setStep('ticket-redeem');
        } else {
          setStep('player-details');
        }
      };

      socket.once('quiz_room_verification_result', handleVerification);
      return () => {
        clearTimeout(timeout);
        socket.off('quiz_room_verification_result', handleVerification);
      };
    }
  }, [prefilledRoomId, socket?.connected, roomConfig, socket, setFullConfig, ticketToken]);

  // Check available payment methods when room config loads
  useEffect(() => {
    if (roomConfig && paymentFlow === 'web2') {
      checkAvailablePaymentMethods();
    }
  }, [roomConfig, paymentFlow]);

  const checkAvailablePaymentMethods = async () => {
    if (!roomId) return;

    try {
      const response = await fetch(`/api/quiz-rooms/${roomId}/available-payment-methods`);
      const data = await response.json();

      if (data.ok) {
        setHasAvailableMethods(data.paymentMethods.length > 0);
      } else {
        setHasAvailableMethods(false);
      }
    } catch (err) {
      console.error('Error checking payment methods:', err);
      setHasAvailableMethods(false);
    }
  };

  const fetchPaymentMethods = async () => {
    if (!roomId) return;

    setLoadingMethods(true);
    try {
      const response = await fetch(`/api/quiz-rooms/${roomId}/available-payment-methods`);
      const data = await response.json();

      if (!data.ok) throw new Error(data.error || 'Failed to fetch payment methods');

      setPaymentMethods(data.paymentMethods);

      if (data.paymentMethods.length === 0) {
        alert('No payment methods available. Please choose "Pay Host Directly".');
        setStep('payment-choice');
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      alert(err instanceof Error ? err.message : 'Failed to load payment methods');
      setStep('payment-choice');
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleRoomVerified = (config: any, roomId: string, playerName: string) => {
    if (config.web3Chain === 'evm' && config.evmNetwork) {
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

    setRoomConfig(normalizedConfig);
    setRoomId(roomId);
    setPlayerDetails({ playerName });

    setFullConfig({
      ...normalizedConfig,
      entryFee: String(normalizedConfig.entryFee),
      paymentMethod: normalizePaymentMethod(normalizedConfig.paymentMethod),
    } as any);

    const normalized = normalizeChain(config.web3Chain);
    setDetectedChain(normalized);

    let flow: PaymentFlow;
    if (config.demoMode) flow = 'demo';
    else if (config.paymentMethod === 'web3') flow = 'web3';
    else flow = 'web2';

    setPaymentFlow(flow);

    // ✅ if they're coming via ticket, keep them on ticket redeem
    if (ticketToken) setStep('ticket-redeem');
    else setStep('extras');
  };

  const handleJoinAsUnpaid = () => {
    if (!socket || !roomConfig) return;

    setJoiningRoom(true);
    const playerId = nanoid();
    const extraPayments = Object.fromEntries(
      selectedExtras.map((extraId) => [
        extraId,
        {
          method: 'pay_admin',
          amount: roomConfig.fundraisingPrices[extraId] || 0,
        },
      ])
    );

    socket.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerDetails.playerName.trim(),
        paid: false,
        paymentMethod: 'pay_admin',
        credits: 0,
        extras: selectedExtras,
        extraPayments,
      },
      role: 'player' as const,
    });

    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
    navigate(`/quiz/game/${roomId}/${playerId}`);
  };

  const handleInstantPayment = () => {
    if (!socket || !roomConfig || !selectedMethod) return;

    setJoiningRoom(true);
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

    socket.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerDetails.playerName.trim(),
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

    socket.emit('claim_payment', {
      roomId,
      playerId,
      paymentMethod: 'instant_payment',
      paymentReference,
      clubPaymentMethodId: selectedMethod.id,
    });

    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
    navigate(`/quiz/game/${roomId}/${playerId}`);
  };

  const handleTicketRedeem = () => {
    if (!socket || !ticketToken) return;

    setJoiningRoom(true);
    const playerId = nanoid();

    socket.emit(
      'redeem_ticket_and_join',
      {
        joinToken: ticketToken,
        playerId,
      },
      (response: any) => {
        if (response.ok) {
          socket.emit('join_quiz_room', {
            roomId: response.roomId,
            user: {
              ...response.playerData,
              id: playerId,
            },
            role: 'player' as const,
            ticketId: ticketData?.ticketId,
          });

          localStorage.setItem(`quizPlayerId:${response.roomId}`, playerId);
          navigate(`/quiz/game/${response.roomId}/${playerId}`);
        } else {
          alert(response.error || 'Failed to redeem ticket');
          setJoiningRoom(false);
        }
      }
    );
  };

  // Loading states
  if (isAutoVerifying || validatingTicket) {
    const message = validatingTicket ? 'Validating your ticket...' : `Verifying room ${prefilledRoomId}...`;
    return <FullScreenLoader message={message} />;
  }

  if (verificationError && !socket?.connected) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-2 sm:p-4">
        <div className="bg-white max-w-md w-full rounded-xl shadow-xl p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-red-700 font-bold text-xl mb-2">Connection Error</h2>
            <p className="text-red-600 mb-4">{verificationError}</p>
            <button
              onClick={() => setStep('verification')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <>
      {step === 'verification' && (
        <RoomVerificationStep onVerified={handleRoomVerified} onClose={onClose} />
      )}

      {/* ✅ Ticket Redemption Step */}
      {step === 'ticket-redeem' && roomConfig && ticketData && ticketToken && (
        <StepLayout
          mode="modal"
          icon="🎟️"
          title="Ticket verified"
          subtitle={`Room ${ticketData.roomId}`}
          footer={
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
              <button
                onClick={() => {
                  // safest back for ticket users
                  onClose();
                }}
                className="flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
              >
                Close
              </button>

              <button
                onClick={handleTicketRedeem}
                disabled={joiningRoom}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base disabled:opacity-50"
              >
                {joiningRoom ? 'Joining…' : 'Redeem Ticket & Join Quiz'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">✅</div>
                <div>
                  <div className="font-semibold text-blue-900">You’re all set</div>
                  <div className="text-sm text-blue-800">
                    Ticket holder: <span className="font-medium">{ticketData.playerName}</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    Total paid: <span className="font-medium">{roomConfig.currencySymbol}{ticketData.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {ticketData.extras?.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="font-semibold text-gray-900 mb-2">Included extras</div>
                <div className="flex flex-wrap gap-2">
                  {ticketData.extras.map((e) => (
                    <span
                      key={e}
                      className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              Tap <strong>Redeem Ticket & Join Quiz</strong> to enter the room now.
            </div>
          </div>
        </StepLayout>
      )}

      {step === 'player-details' && roomConfig && !ticketData && (
        <StepLayout
          mode="modal"
          icon="🎯"
          title={`Joining ${roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} Game`}
          subtitle={`Room ${roomId}`}
          footer={
            <ActionButtons
              onBack={() => setStep('verification')}
              onContinue={() => setStep('extras')}
              continueLabel="Continue to Extras"
              continueDisabled={!isPlayerDetailsValid}
            />
          }
        >
          <PlayerDetailsForm
            formData={playerDetails}
            onChange={setPlayerDetails}
            mode="join"
            totalAmount={totalAmount}
            currencySymbol={roomConfig.currencySymbol}
            extrasTotal={extrasTotal}
            entryFee={roomConfig.entryFee}
          />
        </StepLayout>
      )}

      {step === 'extras' && roomConfig && (
        <StepLayout
          mode="modal"
          icon="🚀"
          title="Choose Extras"
          subtitle="Power-ups to boost your chances"
          footer={
            <ActionButtons
              onBack={() => setStep('player-details')}
              onContinue={() => setStep('payment-choice')}
              continueLabel="Continue to Payment"
            />
          }
        >
          <ExtrasSelector
            availableExtras={availableExtras}
            selectedExtras={selectedExtras}
            onToggleExtra={toggleExtra}
            fundraisingPrices={roomConfig.fundraisingPrices}
            currencySymbol={roomConfig.currencySymbol}
            totalAmount={totalAmount}
            entryFee={roomConfig.entryFee}
            extrasTotal={extrasTotal}
          />
        </StepLayout>
      )}

      {step === 'payment-choice' && roomConfig && paymentFlow === 'demo' && (
        <DemoPaymentStep
          roomId={roomId}
          playerName={playerDetails.playerName}
          roomConfig={roomConfig}
          selectedExtras={selectedExtras}
          onBack={() => setStep('extras')}
          onClose={onClose}
        />
      )}

      {step === 'payment-choice' && roomConfig && paymentFlow === 'web3' && (
        detectedChain ? (
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
                  playerName={playerDetails.playerName}
                  roomConfig={roomConfig}
                  selectedExtras={selectedExtras}
                  onBack={() => setStep('extras')}
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
        )
      )}

      {step === 'payment-choice' && roomConfig && paymentFlow === 'web2' && (
        <StepLayout
          mode="modal"
          icon="💶"
          title="Choose Payment Method"
          subtitle={`Join ${roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} quiz`}
          footer={<ActionButtons onBack={() => setStep('extras')} />}
        >
          <div className="space-y-5">
            {/* Amount Summary */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Total to Pay</div>
                  <div className="text-sm text-gray-600">
                    Entry: {roomConfig.currencySymbol}{roomConfig.entryFee.toFixed(2)}
                    {extrasTotal > 0 && ` + Extras: ${roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {roomConfig.currencySymbol}{totalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            <PaymentMethodSelector
              paymentMethods={[]}
              onSelect={() => {}}
              onSelectPayAdmin={() => setStep('pay-admin-confirm')}
              showPayAdminOption={true}
              loading={hasAvailableMethods === null}
              hideNoMethodsMessage={true}
            />

            {hasAvailableMethods && (
              <button
                onClick={() => {
                  fetchPaymentMethods();
                  setStep('payment-method');
                }}
                className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-2xl">⚡</span>
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
            )}
          </div>
        </StepLayout>
      )}

      {step === 'pay-admin-confirm' && roomConfig && (
        <StepLayout
          mode="modal"
          icon="💶"
          title="Pay Host Directly"
          subtitle="Join now, pay later"
          footer={
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
              <button
                onClick={() => setStep('payment-choice')}
                className="flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
              >
                <span>Back</span>
              </button>
              <PayAdminButton onClick={handleJoinAsUnpaid} loading={joiningRoom} />
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">💳</span>
                <div>
                  <h3 className="text-blue-800 font-semibold">Pay the Host Directly</h3>
                  <p className="text-sm text-blue-700">
                    You'll join as "unpaid". Pay the host in person, and they'll mark you as paid.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 font-medium">How this works:</h3>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>• You join with your chosen name and extras</li>
                <li>• Host sees you as <strong>Unpaid</strong></li>
                <li>• Pay the host directly (cash, card, Revolut)</li>
                <li>• Host confirms your payment</li>
              </ul>
            </div>
          </div>
        </StepLayout>
      )}

      {step === 'payment-method' && (
        <StepLayout
          mode="modal"
          icon="💳"
          title="Select Payment Method"
          subtitle="Choose how you'd like to pay"
          footer={<ActionButtons onBack={() => setStep('payment-choice')} />}
        >
          <PaymentMethodSelector
            paymentMethods={paymentMethods}
            onSelect={(method) => {
              setSelectedMethod(method);
              setStep('payment-instructions');
            }}
            loading={loadingMethods}
          />
        </StepLayout>
      )}

      {step === 'payment-instructions' && selectedMethod && roomConfig && (
        <StepLayout
          mode="modal"
          icon="💳"
          title="Instant Payment"
          subtitle={selectedMethod.methodLabel}
          footer={
            <PaymentInstructionsFooter
              hasEverCopied={hasCopiedReference}
              confirming={joiningRoom}
              onConfirmPaid={handleInstantPayment}
              onBack={() => setStep('payment-method')}
            />
          }
        >
          <PaymentInstructionsContent
            method={selectedMethod}
            paymentReference={paymentReference}
            totalAmount={totalAmount}
            currencySymbol={roomConfig.currencySymbol}
            revolutLink={
              selectedMethod.providerName?.toLowerCase() === 'revolut' &&
              selectedMethod.methodConfig &&
              'link' in selectedMethod.methodConfig
                ? selectedMethod.methodConfig.link
                : undefined
            }
            revolutQR={
              selectedMethod.providerName?.toLowerCase() === 'revolut' &&
              selectedMethod.methodConfig &&
              'qrCodeUrl' in selectedMethod.methodConfig
                ? selectedMethod.methodConfig.qrCodeUrl
                : undefined
            }
            error={null}
            hasEverCopied={hasCopiedReference}
            onCopied={() => setHasCopiedReference(true)}
          />
        </StepLayout>
      )}
    </>
  );
};
