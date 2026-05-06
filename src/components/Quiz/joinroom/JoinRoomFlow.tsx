// src/components/Quiz/joinroom/JoinRoomFlow.tsx

import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { AlertTriangle, HeartHandshake } from 'lucide-react';

import { RoomVerificationStep } from './RoomVerificationStep';
import { DemoPaymentStep } from './DemoPaymentStep';

import type { SupportedChain } from '../../../chains/types';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';

import { Web3Provider } from '../../../components/Web3Provider';
import { normalizePaymentMethod } from '../../../shared/utils/paymentMethods';
import CryptoDonationStep from './crypto/CryptoDonationStep';

import { StepLayout } from '../shared/StepWrapper';
import {
  PlayerDetailsForm,
  PlayerDetailsFormData,
  usePlayerDetailsValidation,
} from '../shared/PlayerDetailsForm';
import { ExtrasSelector, useExtrasSelection } from '../shared/ExtrasSelector';
import {
  PaymentMethodSelector,
  type ClubPaymentMethod,
} from '../shared/PaymentMethodSelector';
import {
  PaymentInstructionsContent,
  PaymentInstructionsFooter,
} from '../shared/PaymentInstructions';
import { ActionButtons, PayAdminButton } from '../shared/ActionButtons';

const Web3PaymentStep = lazy(() =>
  import('./Web3PaymentStep').then((m) => ({ default: m.Web3PaymentStep }))
);

const DEBUG = false;
const joinDebug = (...args: any[]) => { if (DEBUG) console.log('[JoinRoomFlow]', ...args); };

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
  fundraisingMode?: 'fixed_fee' | 'donation';
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
  paymentStatus?: string;
  redemptionStatus?: string;
}

type JoinStep =
  | 'verification'
  | 'player-details'
  | 'extras'
  | 'payment-method'        // ← single unified payment screen (replaces payment-choice + payment-method)
  | 'donation-amount'       // only kept for non-web2 donation flows
  | 'payment-instructions'
  | 'pay-admin-confirm'
  | 'crypto-donation'
  | 'ticket-redeem';

type PaymentFlow = 'demo' | 'web3' | 'web2' | null;
type DonationPaymentChoice = 'club_method' | 'pay_admin' | null;

const normalizeChain = (value?: string | null): SupportedChain | null => {
  if (!value) return null;
  const v = value.toLowerCase();
  if (['stellar', 'xlm'].includes(v)) return 'stellar';
  if (['evm', 'ethereum', 'eth', 'polygon', 'matic', 'arbitrum', 'optimism', 'base'].includes(v)) return 'evm';
  if (['solana', 'sol'].includes(v)) return 'solana';
  return null;
};

const isStripeMethod = (method: ClubPaymentMethod | null | undefined) => {
  if (!method) return false;
  return method.methodCategory === 'stripe' || String(method.providerName || '').toLowerCase() === 'stripe';
};

const isCryptoMethod = (method: ClubPaymentMethod | null | undefined) => {
  if (!method) return false;
  return method.methodCategory === 'crypto';
};

const isInstantMethod = (method: ClubPaymentMethod | null | undefined) => {
  if (!method) return false;
  return method.methodCategory === 'instant_payment';
};

const isCashMethod = (method: ClubPaymentMethod | null | undefined) => {
  if (!method) return false;

  return (
    method.methodCategory === 'instant_payment' &&
    String(method.providerName || '').toLowerCase() === 'cash'
  );
};

const getMethodRank = (method: ClubPaymentMethod) => {
  if (isStripeMethod(method)) return 0;
  if (isInstantMethod(method)) return 1;
  if (isCryptoMethod(method)) return 2;
  return 3;
};

interface JoinRoomFlowProps {
  onClose: () => void;
  onChainDetected?: (chain: SupportedChain) => void;
  prefilledRoomId?: string;
}

export const JoinRoomFlow: React.FC<JoinRoomFlowProps> = ({ onClose, prefilledRoomId }) => {
  const { socket } = useQuizSocket();
  const { setFullConfig } = useQuizConfig();
  const navigate = useNavigate();

  const [step, setStep] = useState<JoinStep>(
    prefilledRoomId ? 'player-details' : 'verification'
  );

  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow>(null);
  const [roomId, setRoomId] = useState(prefilledRoomId || '');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null);

  const [isAutoVerifying, setIsAutoVerifying] = useState(!!prefilledRoomId);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [ticketToken, setTicketToken] = useState<string | null>(null);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [validatingTicket, setValidatingTicket] = useState(false);

  const [capacity, setCapacity] = useState<{
    maxCapacity: number;
    availableForWalkIns: number;
    reservedByTickets: number;
    currentPlayers: number;
  } | null>(null);
  const [checkingCapacity, setCheckingCapacity] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);
  const [donationPaymentChoice, setDonationPaymentChoice] = useState<DonationPaymentChoice>(null);

  const [loadingMethods, setLoadingMethods] = useState(false);
  const [paymentReference] = useState(() => `QUIZ-${nanoid(6).toUpperCase()}`);
  const [joiningRoom, setJoiningRoom] = useState(false);

  // Payment instructions state — always reset on method change via selectMethod()
  const [hasCopiedReference, setHasCopiedReference] = useState(false);
  const [hasOpenedProviderLink, setHasOpenedProviderLink] = useState(false);

  const [_error, setError] = useState<string | null>(null);
  const [donationAmountInput, setDonationAmountInput] = useState('');
  const [showZeroDonationConfirm, setShowZeroDonationConfirm] = useState(false);

  const [playerDetails, setPlayerDetails] = useState<PlayerDetailsFormData>({ playerName: '' });

  const { selectedExtras, toggleExtra, calculateExtrasTotal, setSelectedExtras } = useExtrasSelection();
  const isPlayerDetailsValid = usePlayerDetailsValidation(playerDetails, 'join');

  const isDonationMode = useMemo(() => roomConfig?.fundraisingMode === 'donation', [roomConfig]);

  const availableExtras = useMemo(() => {
    if (!roomConfig) return [];
    return Object.entries(roomConfig.fundraisingOptions || {})
      .filter(([, enabled]) => enabled)
      .map(([extraId]) => extraId);
  }, [roomConfig]);

  const includedDonationExtras = useMemo(() => {
    if (!roomConfig || !isDonationMode) return [];
    return Object.entries(roomConfig.fundraisingOptions || {})
      .filter(([, enabled]) => !!enabled)
      .map(([extraId]) => extraId);
  }, [roomConfig, isDonationMode]);

  useEffect(() => {
    if (isDonationMode) setSelectedExtras(includedDonationExtras);
  }, [isDonationMode, includedDonationExtras, setSelectedExtras]);

  const extrasTotal = useMemo(() => {
    if (!roomConfig || isDonationMode) return 0;
    return calculateExtrasTotal(roomConfig.fundraisingPrices || {});
  }, [selectedExtras, roomConfig, calculateExtrasTotal, isDonationMode]);

  const donationAmount = useMemo(() => {
    const parsed = parseFloat((donationAmountInput || '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }, [donationAmountInput]);

  const isDonationAmountValid = useMemo(() => {
    if (!isDonationMode) return true;
    return Number.isFinite(donationAmount) && donationAmount > 0;
  }, [isDonationMode, donationAmount]);

  const totalAmount = useMemo(() => {
    if (!roomConfig) return 0;
    if (isDonationMode) return donationAmount;
    return Number(roomConfig.entryFee || 0) + extrasTotal;
  }, [roomConfig, isDonationMode, donationAmount, extrasTotal]);

  const cashPaymentMethod = useMemo(() => {
  return paymentMethods.find((method) => isCashMethod(method)) || null;
}, [paymentMethods]);

const hasCashAtDoorMethod = !!cashPaymentMethod;

const selectablePaymentMethods = useMemo(() => {
  const filtered = paymentMethods.filter((method) => {
    // Cash is not shown as a normal payment method.
    // It only enables the “Pay Host at the Door” option.
    if (isCashMethod(method)) return false;

    // Crypto walk-in payments are currently donation-only.
    if (!isDonationMode && isCryptoMethod(method)) return false;

    return true;
  });

  return [...filtered].sort((a, b) => {
    const rankDiff = getMethodRank(a) - getMethodRank(b);
    if (rankDiff !== 0) return rankDiff;

    return String(a.methodLabel || '').localeCompare(
      String(b.methodLabel || '')
    );
  });
}, [paymentMethods, isDonationMode]);

  // ─── Helper: select a method and reset payment instructions state ────────────
  const selectMethod = (method: ClubPaymentMethod | null) => {
    setSelectedMethod(method);
    setHasCopiedReference(false);
    setHasOpenedProviderLink(false);
  };

  // ─── Capacity check ──────────────────────────────────────────────────────────
  const checkWalkInCapacity = async (currentRoomId: string): Promise<boolean> => {
    try {
      setCheckingCapacity(true);
      const response = await fetch(`/api/quiz/tickets/room/${currentRoomId}/info`);
      const data = await response.json();
      const cap = data.capacity;

      if (response.ok && cap) {
        const availableSpots = cap.maxCapacity - (cap.totalTickets ?? 0);
        setCapacity({
          maxCapacity: cap.maxCapacity,
          availableForWalkIns: availableSpots,
          reservedByTickets: cap.totalTickets ?? 0,
          currentPlayers: 0,
        });
        if (availableSpots <= 0) {
          alert(`Sorry, this quiz is full. All ${cap.maxCapacity} spots are taken.`);
          return false;
        }
        return true;
      }

      return true;
    } catch (err) {
      console.error('[JoinFlow] Capacity check failed:', err);
      return true;
    } finally {
      setCheckingCapacity(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('joinToken') || urlParams.get('ticket');
    if (token) {
      setTicketToken(token);
    }
  }, []);

  useEffect(() => {
    if (ticketToken && socket?.connected && !ticketData && !validatingTicket) {
      setValidatingTicket(true);
      socket.emit('validate_ticket_token', { joinToken: ticketToken }, (response: any) => {
        setValidatingTicket(false);
        if (response.ok) {
          setTicketData(response.ticket);
          setPlayerDetails({ playerName: response.ticket.playerName });
          setRoomId(response.ticket.roomId);
          setSelectedExtras(response.ticket.extras);
          setStep('ticket-redeem');
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
  }, [ticketToken, socket?.connected, ticketData, validatingTicket, prefilledRoomId, setSelectedExtras, socket]);

  useEffect(() => {
    if (!(prefilledRoomId && socket?.connected && !roomConfig)) return undefined;

    setIsAutoVerifying(true);
    setVerificationError(null);

    const timeout = setTimeout(() => {
      setVerificationError('Room verification timed out. Please try again.');
      setIsAutoVerifying(false);
      setStep('verification');
    }, 10000);

    socket.emit('verify_quiz_room', { roomId: prefilledRoomId });

    const handleVerification = async (data: any) => {
      clearTimeout(timeout);
      setIsAutoVerifying(false);

      if (!data.exists) {
        setVerificationError(`Room ${prefilledRoomId} not found`);
        setStep('verification');
        return;
      }

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

      if (ticketToken) {
        setStep('ticket-redeem');
      } else {
        const capacityOk = await checkWalkInCapacity(prefilledRoomId);
        if (capacityOk) setStep('player-details');
        else setStep('verification');
      }
    };

    socket.once('quiz_room_verification_result', handleVerification);
    return () => {
      clearTimeout(timeout);
      socket.off('quiz_room_verification_result', handleVerification);
    };
  }, [prefilledRoomId, socket?.connected, roomConfig, socket, setFullConfig, ticketToken]);

  useEffect(() => {
    if (roomConfig && paymentFlow === 'web2') {
      checkAvailablePaymentMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomConfig, paymentFlow]);

  const checkAvailablePaymentMethods = async () => {
    if (!roomId) return;
    try {
      const response = await fetch(`/api/quiz-rooms/${roomId}/available-payment-methods`);
      const data = await response.json();
      if (data.ok) {
        const methods = Array.isArray(data.paymentMethods) ? data.paymentMethods : [];
       const usable = methods.filter((m: ClubPaymentMethod) => {
  // Keep cash in state so it can enable “Pay Host at the Door”.
  // Do not remove it here.
  if (!isDonationMode && isCryptoMethod(m)) return false;
  return true;
});

setPaymentMethods(usable);
      }
    } catch {
      // silent — methods will load on demand
    }
  };

  const fetchPaymentMethods = async (): Promise<ClubPaymentMethod[]> => {
    if (!roomId) return [];
    setLoadingMethods(true);
    try {
      const response = await fetch(`/api/quiz-rooms/${roomId}/available-payment-methods`);
      const data = await response.json();

      if (!data.ok) throw new Error(data.error || 'Failed to fetch payment methods');

      const methods = Array.isArray(data.paymentMethods) ? data.paymentMethods : [];
  const usable = methods.filter((m: ClubPaymentMethod) => {
  // Keep cash in state so it can enable “Pay Host at the Door”.
  // Do not show it as a normal payment method later.
  if (!isDonationMode && isCryptoMethod(m)) return false;
  return true;
});

setPaymentMethods(usable);
return usable;
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setPaymentMethods([]);
      return [];
    } finally {
      setLoadingMethods(false);
    }
  };

  const handleRoomVerified = async (config: any, verifiedRoomId: string, playerName: string) => {
    if (config.web3Chain === 'evm' && config.evmNetwork) {
      sessionStorage.setItem('active-evm-network', config.evmNetwork);
      if (config.roomContractAddress) {
        sessionStorage.setItem('active-room-contract', config.roomContractAddress);
      }
    }

    const normalizedConfig: RoomConfig = {
      ...config,
      currencySymbol: config.currencySymbol || '€',
      roomId: verifiedRoomId,
      clubId: config.clubId || config.club_id,
    };

    setRoomConfig(normalizedConfig);
    setRoomId(verifiedRoomId);
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

    if (ticketToken) {
      setStep('ticket-redeem');
    } else {
      const capacityOk = await checkWalkInCapacity(verifiedRoomId);
      if (capacityOk) setStep('player-details');
    }
  };

  const handleContinueFromPlayerDetails = async () => {
    if (isDonationMode) {
      selectMethod(null);
      setDonationPaymentChoice(null);

      if (paymentFlow === 'web2') {
        const methods = await fetchPaymentMethods();

        // Auto-skip if exactly one method (and no pay-admin for donation)
      const visibleMethods = methods.filter((method) => !isCashMethod(method));
const hasCashMethod = methods.some((method) => isCashMethod(method));
const totalVisibleOptions = visibleMethods.length + (hasCashMethod ? 1 : 0);

const first = visibleMethods[0];

if (totalVisibleOptions === 1 && !isDonationMode && first) {
  await handleMethodSelected(first);
  return;
}

        setStep('payment-method');
        return;
      }

      // non-web2 donation
      setStep('donation-amount');
      return;
    }

    // Fixed-fee: go to extras
    setStep('extras');
  };

  const handleContinueFromExtras = async () => {
    if (paymentFlow === 'demo' || paymentFlow === 'web3') {
      // These go to payment-method which renders the demo/web3 component
      setStep('payment-method');
      return;
    }

    const methods = await fetchPaymentMethods();

    // Auto-skip payment-method screen if exactly one method available (no pay-admin for fixed-fee yet)
 const visibleMethods = methods.filter((method) => !isCashMethod(method));
const hasCashMethod = methods.some((method) => isCashMethod(method));
const totalVisibleOptions = visibleMethods.length + (hasCashMethod ? 1 : 0);

const first = visibleMethods[0];

if (totalVisibleOptions === 1 && !isDonationMode && first) {
  await handleMethodSelected(first);
  return;
}

    setStep('payment-method');
  };

  // ─── Core method selection handler ──────────────────────────────────────────
  const handleMethodSelected = async (method: ClubPaymentMethod) => {
    joinDebug('Method selected:', method.methodCategory, method.providerName);

    if (isCashMethod(method)) {
  selectMethod(null);

  if (isDonationMode) {
    setDonationPaymentChoice('pay_admin');
    setStep('donation-amount');
    return;
  }

  setStep('pay-admin-confirm');
  return;
}

    selectMethod(method);

    if (isDonationMode) {
      setDonationPaymentChoice('club_method');

      if (isCryptoMethod(method)) {
        setStep('crypto-donation');
        return;
      }

      if (isStripeMethod(method)) {
        // Stripe needs amount upfront — keep donation-amount step
        setStep('donation-amount');
        return;
      }

      // Instant payment donation — inline amount on payment-instructions
      const capacityOk = await checkWalkInCapacity(roomId);
      if (!capacityOk) return;
      setStep('payment-instructions');
      return;
    }

    // Fixed-fee
    if (isCryptoMethod(method)) {
      alert('Crypto payments are currently only available for donation rooms.');
      return;
    }

    if (isStripeMethod(method)) {
      startStripeCheckout(method);
      return;
    }

    // Instant payment — check capacity then show instructions
    const capacityOk = await checkWalkInCapacity(roomId);
    if (!capacityOk) return;
    setStep('payment-instructions');
  };

  const handleContinueFromDonation = () => {
    const raw = (donationAmountInput || '').replace(',', '.').trim();

    if (raw === '') {
      alert('Please enter a donation amount. You can enter 0 if you do not wish to donate.');
      return;
    }

    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      alert('Please enter a valid donation amount.');
      return;
    }

    if (parsed === 0) {
      setShowZeroDonationConfirm(true);
      return;
    }

    if (isDonationMode && paymentFlow === 'web2') {
      if (donationPaymentChoice === 'pay_admin') {
        setStep('pay-admin-confirm');
        return;
      }

      if (!selectedMethod) {
        alert('Please choose a payment method first.');
        setStep('payment-method');
        return;
      }

      if (isStripeMethod(selectedMethod)) {
        startStripeCheckout(selectedMethod);
        return;
      }

      setStep('payment-instructions');
      return;
    }

    // non-web2 donation
    setStep('payment-method');
  };

  const handleJoinDonationZero = async () => {
    setShowZeroDonationConfirm(false);
    await handleJoinAsUnpaid();
  };

  const handleJoinAsUnpaid = async () => {
    if (!socket || !roomConfig) return;

    const capacityOk = await checkWalkInCapacity(roomId);
    if (!capacityOk) return;

    setJoiningRoom(true);
    const playerId = nanoid();

    const extrasForJoin = isDonationMode ? includedDonationExtras : selectedExtras;
    const extraPayments = isDonationMode
      ? {}
      : Object.fromEntries(
          selectedExtras.map((extraId) => [
            extraId,
            { method: 'pay_admin', amount: roomConfig.fundraisingPrices[extraId] || 0 },
          ])
        );

    socket.emit('join_quiz_room', {
      roomId,
 user: {
  id: playerId,
  name: playerDetails.playerName.trim(),
  paid: false,

  // Legacy broad method for existing UI/report compatibility.
  paymentMethod: 'pay_admin',

  // Newer context so we know this came from the configured cash method.
  payAtDoor: true,
  intendedPaymentMethod: 'cash',
  clubPaymentMethodId: cashPaymentMethod?.id ?? null,
  paymentMethodLabel: cashPaymentMethod?.methodLabel || 'Pay Host at the Door',
  paymentProvider: cashPaymentMethod?.providerName || 'cash',
  paymentMethodCategory: cashPaymentMethod?.methodCategory || 'instant_payment',

  credits: 0,
  extras: extrasForJoin,
  extraPayments,
  donationAmount: isDonationMode ? donationAmount : undefined,
},
      role: 'player' as const,
    });

    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
    navigate(`/quiz/game/${roomId}/${playerId}`);
  };

  const startStripeCheckout = async (_method: ClubPaymentMethod) => {
    try {
      if (isDonationMode && donationAmount <= 0) {
        alert('A Stripe payment is only needed if the donation amount is greater than 0.');
        return;
      }

      setJoiningRoom(true);

      sessionStorage.setItem(`stripe-walkin-name:${roomId}`, playerDetails.playerName);
      sessionStorage.setItem(
        `stripe-walkin-extras:${roomId}`,
        JSON.stringify(isDonationMode ? includedDonationExtras : selectedExtras)
      );
      if (isDonationMode) {
        sessionStorage.setItem(`stripe-walkin-donation:${roomId}`, String(donationAmount));
      }

      const response = await fetch('/api/stripe/walkin-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName: playerDetails.playerName,
          selectedExtras: isDonationMode ? includedDonationExtras : selectedExtras,
          donationAmount: isDonationMode ? donationAmount : undefined,
          appOrigin: window.location.origin,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to start checkout');

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stripe checkout failed');
      setJoiningRoom(false);
    }
  };

  const handleManualClubPayment = async () => {
    if (!socket || !roomConfig || !selectedMethod) return;

    const capacityOk = await checkWalkInCapacity(roomId);
    if (!capacityOk) return;

    setJoiningRoom(true);
    const playerId = nanoid();

    const extrasForJoin = isDonationMode ? includedDonationExtras : selectedExtras;
    const paymentMethodForPlayer = isCryptoMethod(selectedMethod) ? 'crypto' : 'instant_payment';
    const extraPayments = isDonationMode
      ? {}
      : Object.fromEntries(
          selectedExtras.map((extraId) => [
            extraId,
            { method: paymentMethodForPlayer, amount: roomConfig.fundraisingPrices[extraId] || 0 },
          ])
        );

    socket.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerDetails.playerName.trim(),
        paid: false,
        paymentClaimed: true,
        paymentMethod: paymentMethodForPlayer,
        paymentReference,
        clubPaymentMethodId: selectedMethod.id,
        credits: 0,
        extras: extrasForJoin,
        extraPayments,
        donationAmount: isDonationMode ? donationAmount : undefined,
      },
      role: 'player' as const,
    });

    socket.emit('claim_payment', {
      roomId,
      playerId,
      paymentMethod: paymentMethodForPlayer,
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

    socket.emit('redeem_ticket_and_join', { joinToken: ticketToken, playerId }, (response: any) => {
      if (response.ok) {
        if (ticketData?.ticketId) {
          localStorage.setItem(
            `quizTicketId:${response.roomId}:${playerId}`,
            ticketData.ticketId
          );
        }

        socket.emit('join_quiz_room', {
          roomId: response.roomId,
          user: { ...response.playerData, id: playerId },
          role: 'player' as const,
          ticketId: ticketData?.ticketId,
        });

        localStorage.setItem(`quizPlayerId:${response.roomId}`, playerId);

        navigate(`/quiz/game/${response.roomId}/${playerId}`, {
          state: {
            playerName: response.playerData?.name || ticketData?.playerName,
            paid: response.playerData?.paid ?? true,
            paymentMethod: response.playerData?.paymentMethod || 'instant_payment',
          },
        });
      } else {
        alert(response.error || 'Failed to redeem ticket');
        setJoiningRoom(false);
      }
    });
  };

  // ─── Computed for payment instructions ──────────────────────────────────────
  const revolutLink =
    selectedMethod?.providerName?.toLowerCase() === 'revolut' &&
    selectedMethod.methodConfig &&
    'link' in selectedMethod.methodConfig
      ? selectedMethod.methodConfig.link
      : undefined;

  const hasProviderStep =
    selectedMethod?.providerName?.toLowerCase() === 'revolut' ||
    selectedMethod?.providerName?.toLowerCase() === 'bank_transfer';

  // ─── Full-screen loaders ─────────────────────────────────────────────────────

  if (isAutoVerifying || validatingTicket || checkingCapacity) {
    let message = 'Loading...';
    if (validatingTicket) message = 'Validating your ticket...';
    else if (checkingCapacity) message = 'Checking room availability...';
    else if (isAutoVerifying) message = `Verifying room ${prefilledRoomId}...`;
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

  // ─── Step renders ────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Verification ── */}
      {step === 'verification' && (
        <RoomVerificationStep onVerified={handleRoomVerified} onClose={onClose} />
      )}

      {/* ── Ticket redeem ── */}
      {step === 'ticket-redeem' && roomConfig && ticketData && ticketToken && (
        <StepLayout
          mode="modal"
          icon="🎟️"
          title="Ticket verified"
          subtitle={`Room ${ticketData.roomId}`}
          footer={
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
              <button
                onClick={onClose}
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
                  <div className="font-semibold text-blue-900">You're all set</div>
                  <div className="text-sm text-blue-800">
                    Ticket holder: <span className="font-medium">{ticketData.playerName}</span>
                  </div>
                  <div className="text-sm text-blue-800">
                    Total paid: <span className="font-medium">{roomConfig.currencySymbol}{ticketData.totalAmount.toFixed(8)}</span>
                  </div>
                </div>
              </div>
            </div>
            {ticketData.extras?.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="font-semibold text-gray-900 mb-2">Included extras</div>
                <div className="flex flex-wrap gap-2">
                  {ticketData.extras.map((e) => (
                    <span key={e} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800">
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

      {/* ── Player details ── */}
      {step === 'player-details' && roomConfig && !ticketData && (
        <>
          {capacity && capacity.availableForWalkIns <= 0 ? (
            <StepLayout
              mode="modal"
              icon="🚫"
              title="Room Full"
              subtitle={`Room ${roomId}`}
              footer={
                <button onClick={onClose} className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base">
                  Close
                </button>
              }
            >
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
                <p className="font-semibold text-red-900">This quiz is full</p>
                <p className="text-sm text-red-700 mt-1">All {capacity.maxCapacity} spots are taken.</p>
              </div>
            </StepLayout>
          ) : (
            <StepLayout
              mode="modal"
              icon="🎯"
              title={`Joining ${roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} Game`}
              subtitle={`Room ${roomId}`}
              footer={
                <ActionButtons
                  onBack={() => {
                    if (prefilledRoomId) {
                      // Came via URL — no verification step to go back to
                      onClose();
                    } else {
                      setStep('verification');
                    }
                  }}
                  backLabel={prefilledRoomId ? 'Cancel' : 'Back'}
                  onContinue={handleContinueFromPlayerDetails}
                  continueLabel={
                    isDonationMode
                      ? 'Choose Payment Method'
                      : availableExtras.length > 0
                      ? 'Continue to Extras'
                      : 'Continue to Payment'
                  }
                  continueDisabled={!isPlayerDetailsValid}
                />
              }
            >
              {capacity && capacity.availableForWalkIns > 0 && capacity.availableForWalkIns <= 5 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-amber-900">Limited availability</div>
                      <div className="text-sm text-amber-800">
                        Only <strong>{capacity.availableForWalkIns}</strong> walk-in spot
                        {capacity.availableForWalkIns === 1 ? '' : 's'} remaining.
                        {capacity.reservedByTickets > 0 && ` (${capacity.reservedByTickets} reserved by ticket holders)`}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <PlayerDetailsForm
                formData={playerDetails}
                onChange={setPlayerDetails}
                mode="join"
                totalAmount={totalAmount}
                currencySymbol={roomConfig.currencySymbol}
                extrasTotal={extrasTotal}
                entryFee={roomConfig.entryFee}
                isDonationRoom={isDonationMode}
              />
            </StepLayout>
          )}
        </>
      )}

      {/* ── Extras ── */}
      {step === 'extras' && roomConfig && (
        <StepLayout
          mode="modal"
          icon="🚀"
          title="Choose Extras"
          subtitle="Power-ups to boost your chances"
          footer={
            <ActionButtons
              onBack={() => setStep('player-details')}
              onContinue={handleContinueFromExtras}
              continueLabel="Continue to Payment"
            />
          }
        >
          {capacity && capacity.availableForWalkIns > 0 && capacity.availableForWalkIns <= 5 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-900">
                  Only <strong>{capacity.availableForWalkIns}</strong> walk-in spot
                  {capacity.availableForWalkIns === 1 ? '' : 's'} remaining
                </span>
              </div>
            </div>
          )}
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

      {/* ── Demo payment ── */}
      {step === 'payment-method' && roomConfig && paymentFlow === 'demo' && (
        <DemoPaymentStep
          roomId={roomId}
          playerName={playerDetails.playerName}
          roomConfig={roomConfig}
          selectedExtras={selectedExtras}
          onBack={() => setStep(isDonationMode ? 'player-details' : 'extras')}
          onClose={onClose}
        />
      )}

      {/* ── Web3 payment ── */}
      {step === 'payment-method' && roomConfig && paymentFlow === 'web3' && (
        detectedChain ? (
          <Web3Provider force>
            <Suspense fallback={<LoadingSpinner />}>
              <Web3PaymentStep
                roomId={roomId}
                playerName={playerDetails.playerName}
                roomConfig={roomConfig}
                selectedExtras={selectedExtras}
                onBack={() => setStep(isDonationMode ? 'player-details' : 'extras')}
                onClose={onClose}
              />
            </Suspense>
          </Web3Provider>
        ) : (
          <div className="p-6">
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              Detecting blockchain network… Please wait.
            </div>
          </div>
        )
      )}

      {/* ── Web2 payment method selector (unified — replaces old payment-choice + payment-method) ── */}
      {step === 'payment-method' && roomConfig && paymentFlow === 'web2' && (
        <StepLayout
          mode="modal"
          icon="💶"
          title={isDonationMode ? 'How would you like to donate?' : 'Choose how to pay'}
          subtitle={`${roomConfig.currencySymbol}${totalAmount > 0 ? totalAmount.toFixed(2) : '—'} · ${
            roomConfig.hostName ? `${roomConfig.hostName}'s quiz` : `Room ${roomId}`
          }`}
          footer={
            <ActionButtons
              onBack={() => setStep(isDonationMode ? 'player-details' : 'extras')}
            />
          }
        >
          <div className="space-y-4">
            {isDonationMode && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                <div className="flex items-start gap-2">
                  <HeartHandshake className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
                  <span>Choose your payment method — you'll set your donation amount on the next screen.</span>
                </div>
              </div>
            )}

            {loadingMethods ? (
              <LoadingSpinner />
            ) : (
         <PaymentMethodSelector
  paymentMethods={selectablePaymentMethods}
  onSelect={handleMethodSelected}
  onSelectPayAdmin={() => {
    if (isDonationMode) {
      selectMethod(null);
      setDonationPaymentChoice('pay_admin');
      setStep('donation-amount');
      return;
    }

    setStep('pay-admin-confirm');
  }}
  showPayAdminOption={hasCashAtDoorMethod}
  loading={loadingMethods}
/>
            )}
          </div>
        </StepLayout>
      )}

      {/* ── Donation amount — Stripe or non-web2 flows only ── */}
      {step === 'donation-amount' && roomConfig && isDonationMode && (
        <StepLayout
          mode="modal"
          icon="💖"
          title="Choose Your Donation"
          subtitle={
            selectedMethod
              ? `Paying with ${selectedMethod.methodLabel}`
              : donationPaymentChoice === 'pay_admin'
              ? 'Paying the host directly'
              : `Join ${roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} quiz`
          }
          footer={
            <ActionButtons
              onBack={() => {
                if (isDonationMode && paymentFlow === 'web2') {
                  setStep('payment-method');
                  return;
                }
                setStep('player-details');
              }}
              onContinue={handleContinueFromDonation}
              continueLabel={donationAmount > 0 ? 'Continue to Payment' : 'Continue'}
            />
          }
        >
          <div className="space-y-5">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <HeartHandshake className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900">Donation-based quiz</div>
                  <div className="text-sm text-blue-800">
                    Enter any amount you'd like to donate. You can enter 0 if you do not wish to donate.
                  </div>
                </div>
              </div>
            </div>

            {selectedMethod && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-600">Selected payment method</div>
                <div className="font-semibold text-gray-900">{selectedMethod.methodLabel}</div>
              </div>
            )}

            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <label className="mb-2 block text-sm font-medium text-gray-900">Donation Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {roomConfig.currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={donationAmountInput}
                  onChange={(e) => setDonationAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border-2 border-gray-200 py-3 pl-8 pr-4 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">All extras are included automatically for this quiz.</p>
            </div>

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Total to Pay</div>
                  <div className="text-sm text-gray-600">Donation amount</div>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {roomConfig.currencySymbol}{donationAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {includedDonationExtras.length > 0 && (
              <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                <div className="font-medium text-indigo-900 mb-2">Included Extras</div>
                <div className="flex flex-wrap gap-2">
                  {includedDonationExtras.map((extraId) => (
                    <span key={extraId} className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-800">
                      {extraId}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </StepLayout>
      )}

      {/* ── Crypto donation ── */}
      {step === 'crypto-donation' && selectedMethod && roomConfig && (
        <Web3Provider force>
          <CryptoDonationStep
            roomId={roomId}
            playerName={playerDetails.playerName}
            selectedMethod={selectedMethod}
            includedDonationExtras={includedDonationExtras}
            solanaCluster={roomConfig.solanaCluster === 'devnet' ? 'devnet' : 'mainnet'}
            onBack={() => setStep('payment-method')}
          />
        </Web3Provider>
      )}

      {/* ── Payment instructions — instant payment ── */}
      {step === 'payment-instructions' && selectedMethod && roomConfig && (
        <StepLayout
          mode="modal"
          icon={isCryptoMethod(selectedMethod) ? '🪙' : '💳'}
          title="Complete your payment"
          subtitle={selectedMethod.methodLabel}
          footer={
            <PaymentInstructionsFooter
              hasEverCopied={isCryptoMethod(selectedMethod) ? true : hasCopiedReference}
              hasOpenedProviderLink={hasOpenedProviderLink}
              hasProviderStep={hasProviderStep}
              confirming={joiningRoom}
              onConfirmPaid={handleManualClubPayment}
              onBack={() =>
                setStep(
                  isDonationMode && paymentFlow === 'web2'
                    ? 'payment-method'
                    : 'payment-method'
                )
              }
              isDonationRoom={isDonationMode && isInstantMethod(selectedMethod)}
              isDonationAmountValid={
                isDonationMode && isInstantMethod(selectedMethod)
                  ? isDonationAmountValid
                  : true
              }
            />
          }
        >
          {isCryptoMethod(selectedMethod) ? (
            // Crypto manual flow (legacy)
            <div className="space-y-4">
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                <div className="font-semibold text-purple-950">Send your crypto donation</div>
                <p className="mt-1 text-sm text-purple-900">
                  The host will verify the payment manually.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-sm text-gray-600">Donation amount</div>
                <div className="text-2xl font-bold text-gray-900">
                  {roomConfig.currencySymbol}{totalAmount.toFixed(2)}
                </div>
              </div>
              {(selectedMethod.methodConfig as any)?.walletAddress && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="mb-2 text-sm font-semibold text-gray-900">Solana wallet address</div>
                  <div className="break-all rounded-lg bg-white p-3 font-mono text-xs text-gray-800 border border-gray-200">
                    {(selectedMethod.methodConfig as any).walletAddress}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(String((selectedMethod.methodConfig as any).walletAddress));
                      setHasCopiedReference(true);
                    }}
                    className="mt-3 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                  >
                    Copy Wallet Address
                  </button>
                </div>
              )}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                After sending the donation, tap confirm. You will join as payment claimed, and the host can verify it.
              </div>
            </div>
          ) : (
            <PaymentInstructionsContent
              method={selectedMethod}
              paymentReference={paymentReference}
              totalAmount={totalAmount}
              currencySymbol={roomConfig.currencySymbol}
              revolutLink={revolutLink}
              error={null}
              hasEverCopied={hasCopiedReference}
              hasOpenedProviderLink={hasOpenedProviderLink}
              onCopied={() => setHasCopiedReference(true)}
              onOpenedLink={() => setHasOpenedProviderLink(true)}
              // Inline donation input for instant payment donation
              isDonationRoom={isDonationMode && isInstantMethod(selectedMethod)}
              donationAmountInput={donationAmountInput}
              onDonationAmountChange={setDonationAmountInput}
              isDonationAmountValid={
                isDonationMode && isInstantMethod(selectedMethod)
                  ? isDonationAmountValid
                  : true
              }
            />
          )}
        </StepLayout>
      )}

      {/* ── Pay admin confirm ── */}
      {step === 'pay-admin-confirm' && roomConfig && (
        <StepLayout
          mode="modal"
          icon="💶"
          title="Pay Host Directly"
          subtitle="Join now, pay later"
          footer={
            <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
              <button
                onClick={() => setStep('payment-method')}
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
                <li>• You join with your chosen name {isDonationMode ? 'and included extras' : 'and extras'}</li>
                <li>• Host sees you as <strong>Unpaid</strong></li>
                <li>• Pay the host directly</li>
                <li>• Host confirms your payment</li>
              </ul>
            </div>
          </div>
        </StepLayout>
      )}

      {/* ── Zero donation confirm modal ── */}
      {showZeroDonationConfirm && roomConfig && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <AlertTriangle className="h-5 w-5 text-yellow-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Donation Amount</h3>
                <p className="text-sm text-gray-600">Please confirm before joining</p>
              </div>
            </div>
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900">
              You entered <strong>{roomConfig.currencySymbol}0.00</strong> as your donation. Are you sure?
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowZeroDonationConfirm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                No, go back
              </button>
              <button
                type="button"
                onClick={handleJoinDonationZero}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Yes, join with 0 donation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};