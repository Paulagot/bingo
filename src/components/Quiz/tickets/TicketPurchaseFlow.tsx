// src/components/Quiz/tickets/TicketPurchaseFlow.tsx
// UPDATED: game-type aware copy, passes gameType + clubName through to ticket/confirmation
// UPDATED: ticketed_event support — event info panel, hides player name, skips extras
// UPDATED: lazy-load crypto steps so Solflare/wallet adapters don't initialise on page load

import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Loader2, AlertTriangle, HeartHandshake } from 'lucide-react';

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
import { ActionButtons } from '../shared/ActionButtons';

import { TicketConfirmation } from './TicketConfirmation';
import { TicketedEventInfoPanel } from './TicketedEventInfoPanel';

// ✅ Lazy-load crypto steps and Web3Provider so that Solflare's
//    wallet adapter (and its registerWalletStandard listeners) are
//    never imported unless the user actually selects crypto payment.
//    Previously these were eager imports at the top of the file,
//    which caused Solflare to register EventEmitter listeners the
//    moment /tickets/buy/:roomId loaded — regardless of payment method.
const CryptoTicketDonationStep = lazy(() => import('./crypto/CryptoTicketDonationStep'));
const CryptoFixedFeeStep = lazy(() => import('../joinroom/crypto/CryptoFixedFeeStep'));
const Web3Provider = lazy(() =>
  import('../../../components/Web3Provider').then((m) => ({ default: m.Web3Provider }))
);

import type { RoomInfo, Ticket } from './types';
import { getGameTypeMeta } from './gameTypeMeta';

// ─── Crypto loading fallback ──────────────────────────────────────────────────
const CryptoLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
      <span className="text-gray-700">Loading crypto payment...</span>
    </div>
  </div>
);

type TicketStep =
  | 'loading'
  | 'error'
  | 'sold-out'
  | 'player-details'
  | 'extras'
  | 'payment-method'
  | 'donation-amount'
  | 'checking-capacity'
  | 'redirecting-to-stripe'
  | 'payment-instructions'
  | 'creating-ticket'
  | 'crypto-donation'
  | 'crypto-fixed-fee'
  | 'complete';

interface CapacityInfo {
  maxCapacity: number;
  availableForTickets: number;
  totalTickets: number;
  ticketSalesOpen: boolean;
  ticketSalesCloseReason?: string | null;
  message: string;
}

interface TicketPurchaseFlowProps {
  roomId: string;
  mode?: 'page' | 'embedded';
  onCancel?: () => void;
}

const TICKET_ALLOWED_MANUAL_PROVIDERS = new Set([
  'revolut',
  'monzo',
  'bank_transfer',
  'zippypay',
]);

function normalisePaymentValue(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function isTicketAllowedPaymentMethod(
  method: ClubPaymentMethod,
  _isDonationRoom: boolean,
  roomStatus?: string,
): boolean {
  const category = normalisePaymentValue(method.methodCategory);
  const provider = normalisePaymentValue(method.providerName);

  if (method.isEnabled === false) return false;

  if (category === 'stripe' || category === 'card') return true;
  if (category === 'crypto') return true;

  if (category === 'instant_payment') {
    // Cash and card tap are only allowed when the room is open (guest is
    // physically present for pay-at-the-door). Block them for advance sales.
    if (provider === 'cash' || provider === 'card_tap') {
      return roomStatus === 'open';
    }
    return TICKET_ALLOWED_MANUAL_PROVIDERS.has(provider);
  }

  return false;
}

function getNoTicketPaymentMethodsMessage(
  isDonationRoom: boolean,
  eventNoun: string
): string {
  if (isDonationRoom) {
    return `No online donation payment methods are available for this ${eventNoun}. Please contact the host.`;
  }
  return `No online ticket payment methods are available for this ${eventNoun}. Please contact the host.`;
}

export const TicketPurchaseFlow: React.FC<TicketPurchaseFlowProps> = ({
  roomId,
  mode = 'page',
  onCancel,
}) => {
  const navigate = useNavigate();

  const [step, setStep] = useState<TicketStep>('loading');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [capacity, setCapacity] = useState<CapacityInfo | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] =
    useState<ClubPaymentMethod | null>(null);

  const [playerDetails, setPlayerDetails] = useState<PlayerDetailsFormData>({
    purchaserName: '',
    purchaserEmail: '',
    playerName: '',
  });

  const [donationAmount, setDonationAmount] = useState('');

  const { selectedExtras, toggleExtra, calculateExtrasTotal } =
    useExtrasSelection();

  const isDonationRoom = roomInfo?.fundraisingMode === 'donation';

  // ── Ticketed event flag — no game, no player name, no extras ─────────────
  const isTicketedEvent = roomInfo?.gameType === 'ticketed_event';

  // ── Validation — ticketed events don't require a player name ─────────────
  const isPlayerDetailsValid = usePlayerDetailsValidation(
    playerDetails,
    'ticket',
    isTicketedEvent,
  );

  // ── Resolved player name — ticketed events use purchaser name ────────────
  const resolvedPlayerName = isTicketedEvent
    ? (playerDetails.purchaserName?.trim() || '')
    : playerDetails.playerName;

  const isSelectedStripe = selectedMethod?.methodCategory === 'stripe';
  const isSelectedInstant = selectedMethod?.methodCategory === 'instant_payment';

  // ── Game type meta ────────────────────────────────────────────────────────
  const meta = getGameTypeMeta(roomInfo?.gameType);

  const donationValue = useMemo(() => {
    const parsed = Number(String(donationAmount || '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [donationAmount]);

  const isDonationAmountValid =
    !isDonationRoom ||
    (Number.isFinite(donationValue) && donationValue > 0);

  const availableExtras = useMemo(() => {
    // Ticketed events have no game extras
    if (!roomInfo || isDonationRoom || isTicketedEvent) return [];
    return Object.entries(roomInfo.fundraisingOptions || {})
      .filter(([, enabled]) => enabled)
      .map(([extraId]) => extraId);
  }, [roomInfo, isDonationRoom, isTicketedEvent]);

  const includedDonationExtras = useMemo(() => {
    // Ticketed events have no game extras — never show them even in donation mode
    if (!roomInfo || !isDonationRoom || isTicketedEvent) return [];
    return Object.entries(roomInfo.fundraisingOptions || {})
      .filter(([, enabled]) => !!enabled)
      .map(([extraId]) => extraId);
  }, [roomInfo, isDonationRoom, isTicketedEvent]);

  const extrasTotal = useMemo(() => {
    if (!roomInfo || isDonationRoom) return 0;
    return calculateExtrasTotal(roomInfo.fundraisingPrices);
  }, [selectedExtras, roomInfo, calculateExtrasTotal, isDonationRoom]);

  const totalAmount = useMemo(() => {
    if (!roomInfo) return 0;
    return isDonationRoom
      ? donationValue
      : roomInfo.entryFee + extrasTotal;
  }, [roomInfo, extrasTotal, isDonationRoom, donationValue]);

  const selectMethod = (method: ClubPaymentMethod) => {
    setSelectedMethod(method);
    setHasCopiedReference(false);
    setHasOpenedProviderLink(false);
  };

  useEffect(() => {
    loadRoomInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const [paymentReference] = useState(
    () => `QUIZ-${nanoid(6).toUpperCase()}`
  );
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);

  const [hasCopiedReference, setHasCopiedReference] = useState(false);
  const [hasOpenedProviderLink, setHasOpenedProviderLink] = useState(false);

  const loadRoomInfo = async () => {
    try {
      setStep('loading');
      setError(null);

      const response = await fetch(
        `/api/quiz/tickets/room/${roomId}/info`
      );
      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || 'Failed to load room info');

      setRoomInfo(data);

      if (data.capacity) {
        setCapacity(data.capacity);
        if (!data.capacity.ticketSalesOpen) {
          setStep('sold-out');
          return;
        }
      }

      setStep('player-details');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load room information'
      );
      setStep('error');
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setError(null);

      const response = await fetch(
        `/api/quiz-rooms/${roomId}/available-payment-methods?context=tickets`
      );
      const data = await response.json();

      if (!data.ok) {
        setError(data.error || 'Failed to load payment methods');
        return;
      }

      const methods: ClubPaymentMethod[] = Array.isArray(data.paymentMethods)
        ? data.paymentMethods
        : [];

      const ticketSafeMethods = methods.filter((method) =>
        isTicketAllowedPaymentMethod(method, !!isDonationRoom, roomInfo?.status)
      );

      if (!ticketSafeMethods.length) {
        setPaymentMethods([]);
        setSelectedMethod(null);
        setError(
          getNoTicketPaymentMethodsMessage(!!isDonationRoom, meta.eventNoun)
        );
        setStep('payment-method');
        return;
      }

      setPaymentMethods(ticketSafeMethods);

      const first = ticketSafeMethods[0];
      if (ticketSafeMethods.length === 1 && first) {
        await handlePaymentMethodSelected(first, ticketSafeMethods);
        return;
      }

      setStep('payment-method');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load payment methods'
      );
      setStep('payment-method');
    }
  };

  const refreshCapacityOrThrow = async () => {
    const response = await fetch(
      `/api/quiz/tickets/room/${roomId}/info`
    );
    const data = await response.json();

    if (!response.ok) throw new Error('Failed to verify capacity');

    if (data.capacity) {
      setCapacity(data.capacity);

      if (!data.capacity.ticketSalesOpen) {
        const message =
          data.capacity.ticketSalesCloseReason || 'Ticket sales have closed';
        setError(message);
        setStep('sold-out');
        throw new Error(message);
      }

      if (data.capacity.availableForTickets < 1) {
        setError('SOLD OUT - No tickets remaining');
        setStep('sold-out');
        throw new Error('SOLD OUT - No tickets remaining');
      }
    }

    return data;
  };

  const handlePaymentMethodSelected = async (
    method: ClubPaymentMethod,
    _methods?: ClubPaymentMethod[]
  ) => {
    try {
      setError(null);
      selectMethod(method);

      if (method.methodCategory === 'crypto') {
        setStep('checking-capacity');
        await refreshCapacityOrThrow();
        setStep(isDonationRoom ? 'crypto-donation' : 'crypto-fixed-fee');
        return;
      }

      if (isDonationRoom) {
        if (method.methodCategory === 'stripe') {
          setStep('donation-amount');
          return;
        }
        setStep('checking-capacity');
        await refreshCapacityOrThrow();
        setStep('payment-instructions');
        return;
      }

      if (method.methodCategory === 'stripe') {
        await startStripeCheckout(method);
        return;
      }

      await checkCapacityBeforePayment(method);
    } catch (err) {
      if (step !== 'sold-out') {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to select payment method'
        );
        setStep('payment-method');
      }
    }
  };

  const startStripeCheckout = async (method: ClubPaymentMethod) => {
    try {
      if (isDonationRoom && !isDonationAmountValid) {
        setError('Please enter a donation amount greater than 0.');
        setStep('donation-amount');
        return;
      }

      selectMethod(method);
      setStep('checking-capacity');
      setError(null);

      await refreshCapacityOrThrow();

      const response = await fetch('/api/quiz/tickets/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          purchaserName: playerDetails.purchaserName,
          purchaserEmail: playerDetails.purchaserEmail,
          playerName: resolvedPlayerName,
          selectedExtras: isDonationRoom ? [] : selectedExtras,
          donationAmount: isDonationRoom ? donationValue : undefined,
          appOrigin: window.location.origin,
        }),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(
          data.message || data.error || 'Failed to start checkout'
        );

      setStep('redirecting-to-stripe');
      window.location.href = data.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Stripe checkout failed'
      );
      setStep(isDonationRoom ? 'donation-amount' : 'payment-method');
    }
  };

  const checkCapacityBeforePayment = async (method: ClubPaymentMethod) => {
    try {
      selectMethod(method);
      setStep('checking-capacity');
      setError(null);

      await refreshCapacityOrThrow();

      setStep('payment-instructions');
    } catch (err) {
      if (step !== 'sold-out') {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to verify capacity'
        );
        setStep('payment-method');
      }
    }
  };

  const createTicket = async () => {
    try {
      setCreatingTicket(true);
      setError(null);

      if (!selectedMethod?.id)
        throw new Error('No payment method selected');

      if (isDonationRoom && !isDonationAmountValid) {
        throw new Error('Please enter a donation amount greater than 0.');
      }

      const response = await fetch('/api/quiz/tickets/create-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          purchaserName: playerDetails.purchaserName,
          purchaserEmail: playerDetails.purchaserEmail,
          playerName: resolvedPlayerName,
          selectedExtras: isDonationRoom ? [] : selectedExtras,
          donationAmount: isDonationRoom ? donationValue : undefined,
          paymentMethod: 'instant_payment',
          paymentReference,
          clubPaymentMethodId: selectedMethod.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (
          response.status === 409 ||
          data.error === 'capacity_exceeded'
        ) {
          throw new Error(
            data.message || 'SOLD OUT - Room is at maximum capacity'
          );
        }
        throw new Error(
          data.message || data.error || 'Failed to create ticket'
        );
      }

      setTicket({
        ...data.ticket,
        gameType: roomInfo?.gameType ?? 'quiz',
        clubName: roomInfo?.clubName ?? null,
      });
      setStep('complete');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create ticket';
      if (
        errorMessage.includes('SOLD OUT') ||
        errorMessage.includes('capacity')
      ) {
        setError(errorMessage);
        setStep('sold-out');
      } else {
        setError(errorMessage);
      }
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleDonationAmountContinue = async () => {
    if (!selectedMethod) {
      setError('Please choose a payment method first.');
      setStep('payment-method');
      return;
    }

    if (!isDonationAmountValid) {
      setError('Please enter a donation amount greater than 0.');
      return;
    }

    if (selectedMethod.methodCategory === 'stripe') {
      await startStripeCheckout(selectedMethod);
      return;
    }

    await checkCapacityBeforePayment(selectedMethod);
  };

  const paymentMethodBackStep = (): TicketStep => {
    if (!isDonationRoom && availableExtras.length > 0) return 'extras';
    return 'player-details';
  };

  const revolutLink =
    selectedMethod?.providerName?.toLowerCase() === 'revolut' &&
    selectedMethod.methodConfig &&
    'link' in selectedMethod.methodConfig
      ? selectedMethod.methodConfig.link
      : undefined;

  const hasProviderStep =
    selectedMethod?.providerName?.toLowerCase() === 'revolut' ||
    selectedMethod?.providerName?.toLowerCase() === 'bank_transfer';

  // ─── Loading screens ──────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <span className="text-gray-700">Loading event information...</span>
        </div>
      </div>
    );
  }

  if (step === 'checking-capacity') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <span className="text-gray-700">Checking availability...</span>
          <p className="text-sm text-gray-500 mt-2">
            Making sure there are still tickets available
          </p>
        </div>
      </div>
    );
  }

  if (step === 'redirecting-to-stripe') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <span className="text-gray-700">Redirecting to Stripe...</span>
          <p className="text-sm text-gray-500 mt-2">
            You'll be taken to secure checkout.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'sold-out') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tickets Sold Out
          </h2>
          <div className="mb-4 space-y-2">
            <p className="text-red-600 font-medium">
              {error ||
                capacity?.ticketSalesCloseReason ||
                'No tickets available'}
            </p>
            {capacity && (
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      {meta.eventNounCap} capacity:
                    </span>
                    <span className="font-semibold">
                      {capacity.maxCapacity}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tickets sold:</span>
                    <span className="font-semibold">
                      {capacity.totalTickets}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available:</span>
                    <span className="font-semibold text-red-600">
                      {capacity.availableForTickets}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="text-gray-600 mb-6 text-sm">
            This {meta.eventNoun} has reached maximum capacity. Please
            contact the host if you believe this is an error.
          </p>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  if (step === 'creating-ticket') {
    return (
      <StepLayout
        mode={mode}
        icon="⏳"
        title="Creating your ticket"
        subtitle="Just a moment…"
        footer={<div />}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-3" />
          <span className="text-gray-700 text-lg">
            Creating your ticket...
          </span>
        </div>
      </StepLayout>
    );
  }

  // ─── Resolve display name for subtitle copy ───────────────────────────────
  const hostDisplayName =
    roomInfo?.clubName || roomInfo?.hostName || 'the host';

  const eventDisplayName =
    isTicketedEvent && roomInfo?.eventDetails?.title
      ? roomInfo.eventDetails.title
      : `${hostDisplayName}'s ${meta.buyingLabel}`;

  // ─── Main step renders ────────────────────────────────────────────────────

  return (
    <>
      {/* ── Player details ── */}
      {step === 'player-details' && roomInfo && (
        <StepLayout
          mode={mode}
          icon={meta.emoji}
          title={
            isDonationRoom
              ? 'Your details'
              : `${meta.eventNounCap} ticket`
          }
          subtitle={
            isDonationRoom
              ? `Joining ${hostDisplayName}'s donation ${meta.eventNoun}`
              : `Buying a ticket for ${eventDisplayName}`
          }
          wide
          footer={
            <ActionButtons
              onBack={() => {
                if (onCancel) {
                  onCancel();
                  return;
                }
                navigate('/');
              }}
              backLabel="Cancel"
              onContinue={() => {
                if (!isTicketedEvent && !isDonationRoom && availableExtras.length > 0) {
                  setStep('extras');
                  return;
                }
                loadPaymentMethods();
              }}
              continueLabel={
                !isTicketedEvent && !isDonationRoom && availableExtras.length > 0
                  ? 'Continue to Extras'
                  : isDonationRoom
                  ? 'Choose Payment Method'
                  : 'Continue to Payment'
              }
              continueDisabled={!isPlayerDetailsValid}
            />
          }
        >
          {isTicketedEvent && roomInfo.eventDetails && (
            <TicketedEventInfoPanel eventDetails={roomInfo.eventDetails} />
          )}

          {capacity &&
            capacity.availableForTickets > 0 &&
            capacity.availableForTickets <= 5 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-amber-900">
                      Limited availability
                    </div>
                    <div className="text-sm text-amber-800">
                      Only{' '}
                      <strong>{capacity.availableForTickets}</strong> ticket
                      {capacity.availableForTickets === 1 ? '' : 's'}{' '}
                      remaining out of {capacity.maxCapacity} total spots.
                    </div>
                  </div>
                </div>
              </div>
            )}

          <PlayerDetailsForm
            formData={playerDetails}
            onChange={setPlayerDetails}
            mode="ticket"
            totalAmount={totalAmount}
            currencySymbol={roomInfo.currencySymbol}
            extrasTotal={extrasTotal}
            entryFee={roomInfo.entryFee}
            isDonationRoom={isDonationRoom}
            isTicketedEvent={isTicketedEvent}
            wideLayout
          />

          {isDonationRoom && includedDonationExtras.length > 0 && (
            <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <div className="font-medium text-indigo-900 mb-2">
                Included extras
              </div>
              <div className="flex flex-wrap gap-2">
                {includedDonationExtras.map((extraId) => (
                  <span
                    key={extraId}
                    className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-medium text-indigo-800"
                  >
                    {extraId}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-xs text-indigo-800">
                Donation events include these automatically.
              </p>
            </div>
          )}
        </StepLayout>
      )}

      {/* ── Extras (quiz only — elimination and ticketed events have no extras) ── */}
      {step === 'extras' && roomInfo && !isDonationRoom && !isTicketedEvent && (
        <StepLayout
          mode={mode}
          icon="🚀"
          title="Choose extras"
          subtitle="Power-ups to boost your chances"
          footer={
            <ActionButtons
              onBack={() => setStep('player-details')}
              onContinue={loadPaymentMethods}
              continueLabel="Continue to Payment"
            />
          }
        >
          {capacity &&
            capacity.availableForTickets > 0 &&
            capacity.availableForTickets <= 5 && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-900">
                    <strong>{capacity.availableForTickets}</strong> tickets
                    remaining
                  </span>
                </div>
              </div>
            )}
          <ExtrasSelector
            availableExtras={availableExtras}
            selectedExtras={selectedExtras}
            onToggleExtra={toggleExtra}
            fundraisingPrices={roomInfo.fundraisingPrices}
            currencySymbol={roomInfo.currencySymbol}
            totalAmount={totalAmount}
            entryFee={roomInfo.entryFee}
            extrasTotal={extrasTotal}
          />
        </StepLayout>
      )}

      {/* ── Payment method ── */}
      {step === 'payment-method' && (
        <StepLayout
          mode={mode}
          icon="💶"
          title="Choose payment method"
          subtitle={
            isDonationRoom
              ? 'Choose how you would like to donate'
              : 'Pay now to secure your spot'
          }
          footer={
            <ActionButtons
              onBack={() => setStep(paymentMethodBackStep())}
            />
          }
        >
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {isDonationRoom && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Choose your payment method first — you'll enter your donation
              amount on the next screen.
            </div>
          )}
          <PaymentMethodSelector
            paymentMethods={paymentMethods}
            onSelect={handlePaymentMethodSelected}
          />
        </StepLayout>
      )}

      {/* ── Donation amount — Stripe only ── */}
      {step === 'donation-amount' &&
        roomInfo &&
        selectedMethod && (
          <StepLayout
            mode={mode}
            icon="💳"
            title="Choose your donation"
            subtitle={selectedMethod.methodLabel}
            footer={
              <ActionButtons
                onBack={() => setStep('payment-method')}
                onContinue={handleDonationAmountContinue}
                continueLabel={
                  isSelectedStripe
                    ? 'Continue to Stripe'
                    : 'Continue to Payment'
                }
                continueDisabled={!isDonationAmountValid}
              />
            }
          >
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div className="space-y-5">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-start gap-3">
                  <HeartHandshake className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-semibold text-blue-900">
                      Donation-based ticket
                    </div>
                    <div className="text-sm text-blue-800">
                      Enter the amount you would like to donate in{' '}
                      {roomInfo.currencySymbol}.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Donation amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {roomInfo.currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={donationAmount}
                    onChange={(e) => setDonationAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border-2 border-gray-200 py-3 pl-8 pr-4 text-base outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      Total to Pay
                    </div>
                    <div className="text-sm text-gray-600">
                      Donation amount
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {roomInfo.currencySymbol}
                    {donationValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </StepLayout>
        )}

      {/* ── Crypto donation ── */}
      {step === 'crypto-donation' &&
        selectedMethod &&
        roomInfo &&
        roomId && (
          <Suspense fallback={<CryptoLoadingFallback />}>
            <CryptoTicketDonationStep
              roomId={roomId}
              purchaserName={playerDetails.purchaserName || ''}
              purchaserEmail={playerDetails.purchaserEmail || ''}
              playerName={resolvedPlayerName}
              selectedMethod={selectedMethod}
              includedDonationExtras={includedDonationExtras}
              solanaCluster="mainnet"
              onBack={() => setStep('payment-method')}
              onComplete={(createdTicket) => {
                setTicket({
                  ...createdTicket,
                  gameType: roomInfo.gameType ?? 'quiz',
                  clubName: roomInfo.clubName ?? null,
                });
                setStep('complete');
              }}
            />
          </Suspense>
        )}

      {/* ── Crypto fixed fee ── */}
      {step === 'crypto-fixed-fee' &&
        selectedMethod &&
        roomInfo &&
        roomId && (
          <Suspense fallback={<CryptoLoadingFallback />}>
            <Web3Provider force>
              <CryptoFixedFeeStep
                mode="ticket"
                roomId={roomId}
                purchaserName={playerDetails.purchaserName || ''}
                purchaserEmail={playerDetails.purchaserEmail || ''}
                playerName={resolvedPlayerName}
                selectedMethod={selectedMethod}
                totalFiatAmount={totalAmount}
                entryFeeAmount={roomInfo.entryFee}
                extrasAmount={extrasTotal}
                selectedExtras={selectedExtras}
                fiatCurrency={(() => {
                  const map: Record<string, string> = {
                    '€': 'EUR',
                    '£': 'GBP',
                    '$': 'USD',
                    '₦': 'NGN',
                    'CA$': 'CAD',
                  };
                  return map[roomInfo.currencySymbol] || 'EUR';
                })()}
                currencySymbol={roomInfo.currencySymbol}
                solanaCluster="mainnet"
                onBack={() => setStep('payment-method')}
                onSuccess={(result) => {
                  if (result.ticketId && result.joinToken) {
                    setTicket({
                      ticketId: result.ticketId,
                      joinToken: result.joinToken,
                      roomId,
                      purchaserEmail: playerDetails.purchaserEmail || '',
                      purchaserName: playerDetails.purchaserName || '',
                      playerName: resolvedPlayerName,
                      entryFee: roomInfo.entryFee,
                      extrasTotal,
                      totalAmount,
                      currency: roomInfo.currencySymbol,
                      extras: selectedExtras.map((extraId) => ({
                        extraId,
                        price: roomInfo.fundraisingPrices?.[extraId] ?? 0,
                      })),
                      paymentStatus: 'payment_confirmed',
                      redemptionStatus: 'ready',
                      paymentMethod: 'crypto',
                      paymentReference: result.txHash,
                      gameType: roomInfo.gameType ?? 'quiz',
                      clubName: roomInfo.clubName ?? null,
                    });
                    setStep('complete');
                  }
                }}
              />
            </Web3Provider>
          </Suspense>
        )}

      {/* ── Payment instructions — instant payment ── */}
      {step === 'payment-instructions' &&
        selectedMethod &&
        roomInfo && (
          <StepLayout
            mode={mode}
            icon="💳"
            title="Complete your payment"
            subtitle={selectedMethod.methodLabel}
            footer={
              <PaymentInstructionsFooter
                hasEverCopied={hasCopiedReference}
                hasOpenedProviderLink={hasOpenedProviderLink}
                hasProviderStep={hasProviderStep}
                confirming={creatingTicket}
                onConfirmPaid={createTicket}
                onBack={() => setStep('payment-method')}
                isDonationRoom={isDonationRoom}
                isDonationAmountValid={isDonationAmountValid}
              />
            }
          >
            {capacity &&
              capacity.availableForTickets > 0 &&
              capacity.availableForTickets <= 3 && (
                <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                    <div>
                      <div className="font-bold text-red-900">
                        ⚠️ Almost sold out!
                      </div>
                      <div className="text-sm text-red-800 mt-1">
                        Only{' '}
                        <strong>
                          {capacity.availableForTickets}
                        </strong>{' '}
                        ticket
                        {capacity.availableForTickets === 1 ? '' : 's'}{' '}
                        remaining. Complete payment quickly to secure your
                        spot.
                      </div>
                    </div>
                  </div>
                </div>
              )}

            <PaymentInstructionsContent
              method={selectedMethod}
              paymentReference={paymentReference}
              totalAmount={totalAmount}
              currencySymbol={roomInfo.currencySymbol}
              revolutLink={revolutLink}
              error={error}
              hasEverCopied={hasCopiedReference}
              hasOpenedProviderLink={hasOpenedProviderLink}
              onCopied={() => setHasCopiedReference(true)}
              onOpenedLink={() => setHasOpenedProviderLink(true)}
              isDonationRoom={isDonationRoom && isSelectedInstant}
              donationAmountInput={donationAmount}
              onDonationAmountChange={setDonationAmount}
              isDonationAmountValid={isDonationAmountValid}
            />
          </StepLayout>
        )}

      {/* ── Complete ── */}
      {step === 'complete' && ticket && roomInfo && (
        <StepLayout
          mode={mode}
          icon="✅"
          title="Ticket created"
          subtitle={`Your ${meta.ticketNoun} is confirmed`}
          footer={<div />}
        >
          <TicketConfirmation ticket={ticket} roomInfo={roomInfo} />
        </StepLayout>
      )}
    </>
  );
};

export default TicketPurchaseFlow;