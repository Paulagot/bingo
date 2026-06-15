// src/components/Elimination/join/EliminationJoinFlow.tsx
//
// Multi-step join flow for web2 elimination rooms that have an entry fee.
// Steps: name-entry → payment-method → payment-instructions | pay-at-door-confirm | crypto-fixed-fee
// Stripe redirects out to Stripe Checkout; return is handled by EliminationJoinSuccessPage.
//
// Web3 rooms and free rooms bypass this component entirely — see EliminationJoinPage.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';

import { getSocket, emitJoinRoom } from '../services/eliminationSocket';
import type { EliminationRoom } from '../types/elimination';

import { Web3Provider } from '../../../components/Web3Provider';
import CryptoFixedFeeStep, { type FixedFeeConfirmResult } from '../../Quiz/joinroom/crypto/CryptoFixedFeeStep';

import { StepLayout } from '../../Quiz/shared/StepWrapper';
import { PaymentMethodSelector, type ClubPaymentMethod } from '../../Quiz/shared/PaymentMethodSelector';
import { PaymentInstructionsContent, PaymentInstructionsFooter } from '../../Quiz/shared/PaymentInstructions';
import { ActionButtons } from '../../Quiz/shared/ActionButtons';

// ─── Types ────────────────────────────────────────────────────────────────────

type JoinStep =
  | 'name-entry'
  | 'payment-method'
  | 'payment-instructions'
  | 'pay-at-door-confirm'
  | 'crypto-fixed-fee';

interface EliminationJoinFlowProps {
  roomId: string;
  roomData: EliminationRoom & {
    entryFee: number;
    currency: string;
    clubId?: string;
    solanaCluster?: 'mainnet' | 'devnet';
  };
  /** Called when the player navigates away (back button on first step) */
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_ROOM_ID     = 'elim_room_id';
const SESSION_PLAYER_ID   = 'elim_player_id';
const SESSION_PLAYER_NAME = 'elim_player_name';
const SESSION_IS_HOST     = 'elim_is_host';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€', GBP: '£', USD: '$', CAD: 'CA$', NGN: '₦',
};

// Map currency symbol back to ISO code for CryptoFixedFeeStep
const SYMBOL_TO_CURRENCY: Record<string, string> = {
  '€': 'EUR', '£': 'GBP', '$': 'USD', 'CA$': 'CAD', '₦': 'NGN',
};

const getCurrencySymbol = (currency: string) =>
  CURRENCY_SYMBOLS[currency?.toUpperCase()] ?? currency ?? '€';

const isPayAtDoorMethod = (m: ClubPaymentMethod) => {
  const provider = String(m.providerName ?? '').toLowerCase();
  return (
    m.methodCategory === 'instant_payment' &&
    (provider === 'cash' || provider === 'card_tap')
  );
};

const isStripeMethod = (m: ClubPaymentMethod) =>
  m.methodCategory === 'stripe' ||
  String(m.providerName ?? '').toLowerCase() === 'stripe';

const isCryptoMethod = (m: ClubPaymentMethod) =>
  m.methodCategory === 'crypto';

// ─── Component ────────────────────────────────────────────────────────────────

export const EliminationJoinFlow: React.FC<EliminationJoinFlowProps> = ({
  roomId,
  roomData,
  onClose,
}) => {
  const navigate = useNavigate();
  const nameRef  = useRef('');

  const [step, setStep]       = useState<JoinStep>('name-entry');
  const [name, setName]       = useState('');
  const [error, setError]     = useState('');
  const [joining, setJoining] = useState(false);

  // Payment methods
  const [paymentMethods, setPaymentMethods]   = useState<ClubPaymentMethod[]>([]);
  const [loadingMethods, setLoadingMethods]   = useState(false);
  const [selectedMethod, setSelectedMethod]   = useState<ClubPaymentMethod | null>(null);

  // Payment instructions state
  const [paymentReference]                                  = useState(() => `ELIM-${nanoid(6).toUpperCase()}`);
  const [hasCopiedReference, setHasCopiedReference]         = useState(false);
  const [hasOpenedProviderLink, setHasOpenedProviderLink]   = useState(false);
  const [stripeLoading, setStripeLoading]                   = useState(false);

  const currencySymbol = getCurrencySymbol(roomData.currency);
  const entryFee       = Number(roomData.entryFee ?? 0);

  // Derive ISO currency code for CryptoFixedFeeStep
  const fiatCurrency = SYMBOL_TO_CURRENCY[currencySymbol] ?? roomData.currency ?? 'EUR';

  // Keep nameRef in sync for use in socket callbacks
  useEffect(() => { nameRef.current = name; }, [name]);

  // ── Payment methods fetch ──────────────────────────────────────────────────
  const fetchPaymentMethods = async (): Promise<ClubPaymentMethod[]> => {
    setLoadingMethods(true);
    try {
      const res  = await fetch(`/api/elimination/rooms/${roomId}/available-payment-methods?context=onnight`);
      const data = await res.json();
      const methods: ClubPaymentMethod[] = Array.isArray(data.paymentMethods)
        ? data.paymentMethods
        : [];
      setPaymentMethods(methods);
      return methods;
    } catch (err) {
      console.error('[EliminationJoinFlow] Failed to fetch payment methods:', err);
      setPaymentMethods([]);
      return [];
    } finally {
      setLoadingMethods(false);
    }
  };

  // ── Socket: listen for room_state after join ───────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleRoomState = (data: any) => {
      const room: EliminationRoom = data.roomSnapshot ?? data;
      const assignedPlayerId: string | undefined = data.yourPlayerId;
      const assignedName: string | undefined     = data.yourName;

      const resolvedPlayerId = assignedPlayerId ?? (() => {
        const me = room.players?.find(
          p => p.name.toLowerCase() === nameRef.current.toLowerCase().trim()
        );
        return me?.playerId;
      })();

      if (!resolvedPlayerId) {
        setError('Could not join room. Please try again.');
        setJoining(false);
        return;
      }

      sessionStorage.setItem(SESSION_ROOM_ID,     room.roomId);
      sessionStorage.setItem(SESSION_PLAYER_ID,   resolvedPlayerId);
      sessionStorage.setItem(SESSION_PLAYER_NAME, assignedName ?? nameRef.current);
      sessionStorage.setItem(SESSION_IS_HOST,     'false');
      navigate('/elimination', { replace: true });
    };

    const handleError = (data: { message: string }) => {
      setError(data.message);
      setJoining(false);
      setStripeLoading(false);
    };

    socket.on('elimination_room_state', handleRoomState);
    socket.on('elimination_error', handleError);
    return () => {
      socket.off('elimination_room_state', handleRoomState);
      socket.off('elimination_error', handleError);
    };
  }, [navigate]);

  // ── Step: name-entry ───────────────────────────────────────────────────────
  const handleNameContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter your name');
    setError('');

      // Check capacity before showing payment methods
  try {
    const inMemoryCount = ((roomData as any).players ?? []).length;
    const maxPlayers = (roomData as any).maxPlayers ?? 999;

    if (inMemoryCount >= maxPlayers) {
      setError('Sorry, this game is full — no spots remaining.');
      return;
    }

    const res = await fetch(`/api/quiz/tickets/room/${roomId}/info`);
    if (res.ok) {
      const data = await res.json();
      const cap = data.capacity;
      if (cap && cap.totalTickets + inMemoryCount >= cap.maxCapacity) {
        setError('Sorry, this game is full — no spots remaining.');
        return;
      }
    }
  } catch {
    // Non-fatal — socket will enforce
  }

    const methods = await fetchPaymentMethods();

    // Only selectable methods (not cash/card_tap)
    const selectable   = methods.filter(m => !isPayAtDoorMethod(m));
    const hasPayAtDoor = methods.some(m => isPayAtDoorMethod(m));
    const totalOptions = selectable.length + (hasPayAtDoor ? 1 : 0);

    // If there's exactly one option and it's not pay-at-door, go straight to it
    if (totalOptions === 1 && selectable.length === 1 && selectable[0]) {
      handleMethodSelected(selectable[0]);
      return;
    }

    setStep('payment-method');
  };

  // ── Step: payment-method ──────────────────────────────────────────────────
  const handleMethodSelected = async (method: ClubPaymentMethod) => {
    // Cash / card-tap → pay at door confirm
    if (isPayAtDoorMethod(method)) {
      setSelectedMethod(null);
      setStep('pay-at-door-confirm');
      return;
    }

    setSelectedMethod(method);
    setHasCopiedReference(false);
    setHasOpenedProviderLink(false);

    // Crypto → wallet-connected payment flow (no host verification needed)
    if (isCryptoMethod(method)) {
      setStep('crypto-fixed-fee');
      return;
    }

    if (isStripeMethod(method)) {
      await startStripeCheckout();
      return;
    }

    // Instant payment (Revolut, bank transfer, etc.)
    setStep('payment-instructions');
  };

  const handlePayAdminSelected = () => {
    setSelectedMethod(null);
    setStep('pay-at-door-confirm');
  };

  // ── Stripe redirect ────────────────────────────────────────────────────────
  const startStripeCheckout = async () => {
    try {
      setStripeLoading(true);
      setError('');

      sessionStorage.setItem(`elim-stripe-name:${roomId}`, name.trim());

      const res = await fetch('/api/stripe/elimination-walkin-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          playerName: name.trim(),
          appOrigin: window.location.origin,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'stripe_checkout_failed');
      }

      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message === 'stripe_not_ready_or_disabled'
        ? 'Card payments are not available for this event. Please choose another method.'
        : 'Could not start card payment. Please try again.'
      );
      setStripeLoading(false);
      setStep('payment-method');
    }
  };

  // ── Step: payment-instructions (instant / manual) ─────────────────────────
  const handleConfirmManualPayment = () => {
    if (!selectedMethod) return;
    setJoining(true);

    emitJoinRoom(
      roomId,
      name.trim(),
      undefined,
      undefined,
      undefined,
      {
        paid:                false,
        paymentClaimed:      true,
        payAtDoor:           false,
        paymentMethod:       'instant_payment',
        paymentReference,
        clubPaymentMethodId: selectedMethod.id,
      }
    );
  };

  // ── Step: crypto-fixed-fee success ────────────────────────────────────────
  // By the time onSuccess fires, the backend has already verified the on-chain
  // transaction and written the ledger row. We join as paid: true.
  // skipInternalJoin — prevents CryptoFixedFeeStep emitting join_quiz_room
  // skipInternalNavigate — prevents it navigating to /quiz/game/...
  // Navigation here is handled by the elimination_room_state socket handler.
  const handleCryptoSuccess = (result: FixedFeeConfirmResult) => {
    if (!selectedMethod) return;

    setJoining(true);

    emitJoinRoom(
      roomId,
      name.trim(),
      undefined,        // no playerId — let the server assign one via addPlayer
      undefined,
      undefined,
      {
        paid:                  true,
        paymentClaimed:        true,
        payAtDoor:             false,
        paymentMethod:         'crypto',
        paymentReference:      result.txHash,
        clubPaymentMethodId:   selectedMethod.id,
      }
    );

    // Navigation is handled by the elimination_room_state socket handler above.
  };

  // ── Step: pay-at-door-confirm ──────────────────────────────────────────────
  const handleJoinAsUnpaid = () => {
    setJoining(true);
    const payAtDoorMethod = paymentMethods.find(m => isPayAtDoorMethod(m)) ?? null;

    emitJoinRoom(
      roomId,
      name.trim(),
      undefined,
      undefined,
      undefined,
      {
        paid:                false,
        paymentClaimed:      false,
        payAtDoor:           true,
        paymentMethod:       'pay_admin',
        paymentReference:    undefined,
        clubPaymentMethodId: payAtDoorMethod?.id ?? null,
      }
    );
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectablePaymentMethods = useMemo(
    () => paymentMethods.filter(m => !isPayAtDoorMethod(m)),
    [paymentMethods]
  );

  const hasPayAtDoorMethod = useMemo(
    () => paymentMethods.some(m => isPayAtDoorMethod(m)),
    [paymentMethods]
  );

  const revolutLink = useMemo(() => {
    if (!selectedMethod) return undefined;
    const provider = String(selectedMethod.providerName ?? '').toLowerCase();
    if (provider === 'revolut' && selectedMethod.methodConfig?.link) {
      return selectedMethod.methodConfig.link as string;
    }
    return undefined;
  }, [selectedMethod]);

  const hasProviderStep = useMemo(() => {
    if (!selectedMethod) return false;
    const provider = String(selectedMethod.providerName ?? '').toLowerCase();
    return provider === 'revolut' || provider === 'bank_transfer';
  }, [selectedMethod]);

  // ─── Render ───────────────────────────────────────────────────────────────

  // ── name-entry ─────────────────────────────────────────────────────────────
  if (step === 'name-entry') {
    return (
      <StepLayout
        mode="modal"
        icon="🎮"
        title="Join Game"
        subtitle={`Entry fee: ${currencySymbol}${entryFee.toFixed(2)}`}
        onClose={onClose}
        footer={
          <ActionButtons
            onBack={onClose}
            backLabel="Cancel"
            onContinue={handleNameContinue}
            continueLabel={loadingMethods ? 'Loading...' : 'Continue'}
            continueDisabled={!name.trim() || loadingMethods}
            continueLoading={loadingMethods}
          />
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium text-gray-900">Entry Fee</div>
              <div className="text-2xl font-bold text-blue-900">
                {currencySymbol}{entryFee.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Your name <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleNameContinue()}
              placeholder="e.g. Sarah"
              maxLength={20}
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </StepLayout>
    );
  }

  // ── payment-method ─────────────────────────────────────────────────────────
  if (step === 'payment-method') {
    return (
      <StepLayout
        mode="modal"
        icon="💳"
        title="How would you like to pay?"
        subtitle={`${name} · ${currencySymbol}${entryFee.toFixed(2)}`}
        onClose={onClose}
        footer={
          <ActionButtons
            onBack={() => setStep('name-entry')}
          />
        }
      >
        {stripeLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
            <p className="text-sm text-gray-600">Redirecting to card payment...</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <PaymentMethodSelector
              paymentMethods={selectablePaymentMethods}
              onSelect={handleMethodSelected}
              onSelectPayAdmin={hasPayAtDoorMethod ? handlePayAdminSelected : undefined}
              showPayAdminOption={true}
              loading={loadingMethods}
            />
          </>
        )}
      </StepLayout>
    );
  }

  // ── crypto-fixed-fee ───────────────────────────────────────────────────────
  if (step === 'crypto-fixed-fee' && selectedMethod) {
    return (
      <Web3Provider force>
        <CryptoFixedFeeStep
          mode="walkin"
          roomId={roomId}
          playerName={name.trim()}
          selectedMethod={selectedMethod}
          totalFiatAmount={entryFee}
          entryFeeAmount={entryFee}
          extrasAmount={0}
          selectedExtras={[]}
          fiatCurrency={fiatCurrency}
          currencySymbol={currencySymbol}
          solanaCluster={roomData.solanaCluster ?? 'mainnet'}
          onBack={() => setStep('payment-method')}
          onSuccess={handleCryptoSuccess}
          skipInternalJoin
          skipInternalNavigate
        />
      </Web3Provider>
    );
  }

  // ── payment-instructions ───────────────────────────────────────────────────
  if (step === 'payment-instructions' && selectedMethod) {
    return (
      <StepLayout
        mode="modal"
        icon="💳"
        title="Complete your payment"
        subtitle={selectedMethod.methodLabel}
        onClose={onClose}
        footer={
          <PaymentInstructionsFooter
            hasEverCopied={hasCopiedReference}
            hasOpenedProviderLink={hasOpenedProviderLink}
            hasProviderStep={hasProviderStep}
            confirming={joining}
            onConfirmPaid={handleConfirmManualPayment}
            onBack={() => {
              setSelectedMethod(null);
              setStep('payment-method');
            }}
            isDonationRoom={false}
            isDonationAmountValid={true}
          />
        }
      >
        <PaymentInstructionsContent
          method={selectedMethod}
          paymentReference={paymentReference}
          totalAmount={entryFee}
          currencySymbol={currencySymbol}
          revolutLink={revolutLink}
          error={error || null}
          hasEverCopied={hasCopiedReference}
          hasOpenedProviderLink={hasOpenedProviderLink}
          onCopied={() => setHasCopiedReference(true)}
          onOpenedLink={() => setHasOpenedProviderLink(true)}
          isDonationRoom={false}
        />
      </StepLayout>
    );
  }

  // ── pay-at-door-confirm ────────────────────────────────────────────────────
  if (step === 'pay-at-door-confirm') {
    return (
      <StepLayout
        mode="modal"
        icon="💶"
        title="Pay at the Door"
        subtitle="Join now, pay on the night"
        onClose={onClose}
        footer={
          <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
            <button
              onClick={() => setStep('payment-method')}
              className="flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-6 sm:py-3"
            >
              Back
            </button>
            <button
              onClick={handleJoinAsUnpaid}
              disabled={joining}
              className="flex flex-1 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:px-6 sm:py-3"
            >
              {joining ? 'Joining...' : 'Join & Pay Host'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💳</span>
              <div>
                <h3 className="font-semibold text-blue-800">Pay at the Door</h3>
                <p className="mt-1 text-sm text-blue-700">
                  You'll join as unpaid. Pay by cash or card tap on the night
                  and the host will mark you as paid.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="mb-2 font-medium text-gray-900">How this works</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• You join with your name</li>
              <li>• Host sees you as <strong>Unpaid</strong></li>
              <li>• Pay {currencySymbol}{entryFee.toFixed(2)} by cash or card tap on the night</li>
              <li>• Host confirms your payment</li>
            </ul>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 text-center text-sm text-gray-600">
            Amount due: <span className="font-bold text-gray-900">{currencySymbol}{entryFee.toFixed(2)}</span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </StepLayout>
    );
  }

  return null;
};

export default EliminationJoinFlow;