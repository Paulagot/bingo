// src/components/Quiz/tickets/TicketPurchasePage.refactored.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Loader2 } from 'lucide-react';

// Shared components
import { StepLayout } from '../shared/StepWrapper';
import { PlayerDetailsForm, PlayerDetailsFormData, usePlayerDetailsValidation } from '../shared/PlayerDetailsForm';
import { ExtrasSelector, useExtrasSelection } from '../shared/ExtrasSelector';
import { PaymentMethodSelector, type ClubPaymentMethod } from '../shared/PaymentMethodSelector';
import { PaymentInstructionsContent, PaymentInstructionsFooter } from '../shared/PaymentInstructions';
import { ActionButtons } from '../shared/ActionButtons';

// Local component
import { TicketConfirmation } from './TicketConfirmation';

import type { RoomInfo, Ticket } from './types';

type TicketStep =
  | 'loading'
  | 'error'
  | 'player-details'
  | 'extras'
  | 'payment-method'
  | 'payment-instructions'
  | 'creating-ticket'
  | 'complete';

export const TicketPurchasePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<TicketStep>('loading');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);

  const [playerDetails, setPlayerDetails] = useState<PlayerDetailsFormData>({
    purchaserName: '',
    purchaserEmail: '',
    purchaserPhone: '',
    playerName: '',
  });

  const { selectedExtras, toggleExtra, calculateExtrasTotal } = useExtrasSelection();
  const isPlayerDetailsValid = usePlayerDetailsValidation(playerDetails, 'ticket');

  const [paymentReference] = useState(() => `QUIZ-${nanoid(6).toUpperCase()}`);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [hasCopiedReference, setHasCopiedReference] = useState(false);

  // Computed values
  const availableExtras = useMemo(() => {
    if (!roomInfo) return [];
    return Object.entries(roomInfo.fundraisingOptions)
      .filter(([_, enabled]) => enabled)
      .map(([extraId]) => extraId);
  }, [roomInfo]);

  const extrasTotal = useMemo(() => {
    if (!roomInfo) return 0;
    return calculateExtrasTotal(roomInfo.fundraisingPrices);
  }, [selectedExtras, roomInfo, calculateExtrasTotal]);

  const totalAmount = useMemo(() => {
    if (!roomInfo) return 0;
    return roomInfo.entryFee + extrasTotal;
  }, [roomInfo, extrasTotal]);

  useEffect(() => {
    loadRoomInfo();
  }, [roomId]);

  const loadRoomInfo = async () => {
    try {
      setStep('loading');
      setError(null);

      const response = await fetch(`/api/quiz/tickets/room/${roomId}/info`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to load room info');

      setRoomInfo(data);
      setStep('player-details');
    } catch (err) {
      console.error('Failed to load room info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load room information');
      setStep('error');
    }
  };

  const loadPaymentMethods = async () => {
    try {
      setError(null);
      
      const response = await fetch(`/api/quiz-rooms/${roomId}/available-payment-methods`);
      const data = await response.json();

      if (!data.ok) throw new Error(data.error || 'Failed to load payment methods');
      if (!data.paymentMethods?.length) {
        throw new Error('No payment methods available for this quiz. Please contact the host.');
      }

      setPaymentMethods(data.paymentMethods);
      setStep('payment-method');
    } catch (err) {
      console.error('Failed to load payment methods:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    }
  };

  const createTicket = async () => {
    try {
      setCreatingTicket(true);
      setError(null);

      if (!selectedMethod?.id) throw new Error('No payment method selected');

      const response = await fetch('/api/quiz/tickets/create-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          purchaserName: playerDetails.purchaserName,
          purchaserEmail: playerDetails.purchaserEmail,
          purchaserPhone: playerDetails.purchaserPhone,
          playerName: playerDetails.playerName,
          selectedExtras,
          paymentMethod: 'instant_payment',
          paymentReference,
          clubPaymentMethodId: selectedMethod.id,
        }),
      });

      const data = await response.json();
      if (!data.ok) throw new Error(data.error || 'Failed to create ticket');

      setTicket(data.ticket);
      setStep('complete');
    } catch (err) {
      console.error('Failed to create ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <span className="text-gray-700">Loading room information...</span>
        </div>
      </div>
    );
  }

  // Error state
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

  // Creating ticket state
  if (step === 'creating-ticket') {
    return (
      <StepLayout
        mode="page"
        icon="⏳"
        title="Creating your ticket"
        subtitle="Just a moment…"
        footer={<div />}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-3" />
          <span className="text-gray-700 text-lg">Creating your ticket...</span>
        </div>
      </StepLayout>
    );
  }

  // Main flow
  return (
    <>
      {step === 'player-details' && roomInfo && (
        <StepLayout
          mode="page"
          icon="🎟️"
          title="Ticket details"
          subtitle={`Buying a ticket for ${roomInfo.hostName}'s quiz`}
          footer={
            <ActionButtons
              onBack={() => navigate('/')}
              backLabel="Cancel"
              onContinue={() => setStep(availableExtras.length > 0 ? 'extras' : 'payment-method')}
              continueLabel={availableExtras.length > 0 ? 'Continue to Extras' : 'Continue to Payment'}
              continueDisabled={!isPlayerDetailsValid}
            />
          }
        >
          <PlayerDetailsForm
            formData={playerDetails}
            onChange={setPlayerDetails}
            mode="ticket"
            totalAmount={totalAmount}
            currencySymbol={roomInfo.currencySymbol}
            extrasTotal={extrasTotal}
            entryFee={roomInfo.entryFee}
          />
        </StepLayout>
      )}

      {step === 'extras' && roomInfo && (
        <StepLayout
          mode="page"
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

      {step === 'payment-method' && (
        <StepLayout
          mode="page"
          icon="💶"
          title="Choose payment method"
          subtitle="Pay now via instant payment"
          footer={
            <ActionButtons
              onBack={() => setStep(availableExtras.length > 0 ? 'extras' : 'player-details')}
            />
          }
        >
          <PaymentMethodSelector
            paymentMethods={paymentMethods}
            onSelect={(method) => {
              setSelectedMethod(method);
              setStep('payment-instructions');
            }}
          />
        </StepLayout>
      )}

      {step === 'payment-instructions' && selectedMethod && roomInfo && (
        <StepLayout
          mode="page"
          icon="💳"
          title="Instant payment"
          subtitle={selectedMethod.methodLabel}
          footer={
            <PaymentInstructionsFooter
              hasEverCopied={hasCopiedReference}
              confirming={creatingTicket}
              onConfirmPaid={createTicket}
              onBack={() => setStep('payment-method')}
            />
          }
        >
          <PaymentInstructionsContent
            method={selectedMethod}
            paymentReference={paymentReference}
            totalAmount={totalAmount}
            currencySymbol={roomInfo.currencySymbol}
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
            error={error}
            hasEverCopied={hasCopiedReference}
            onCopied={() => setHasCopiedReference(true)}
          />
        </StepLayout>
      )}

      {step === 'complete' && ticket && roomInfo && (
        <StepLayout
          mode="page"
          icon="✅"
          title="Ticket created"
          subtitle="You can now share your join link"
          footer={<div />}
        >
          <TicketConfirmation ticket={ticket} roomInfo={roomInfo} />
        </StepLayout>
      )}
    </>
  );
};




