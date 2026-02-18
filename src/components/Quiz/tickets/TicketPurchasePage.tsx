// src/components/Quiz/tickets/TicketPurchasePage.refactored.tsx
// FIXED: Capacity check happens BEFORE showing payment instructions (before user pays)

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Loader2, AlertTriangle } from 'lucide-react';

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
  | 'sold-out'
  | 'player-details'
  | 'extras'
  | 'payment-method'
  | 'checking-capacity' // ✅ NEW: Show while checking capacity
  | 'payment-instructions'
  | 'creating-ticket'
  | 'complete';

interface CapacityInfo {
  maxCapacity: number;
  availableForTickets: number;
  totalTickets: number;
  ticketSalesOpen: boolean;
  ticketSalesCloseReason?: string | null;
  message: string;
}

export const TicketPurchasePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<TicketStep>('loading');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [capacity, setCapacity] = useState<CapacityInfo | null>(null);
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
      
      if (data.capacity) {
        setCapacity(data.capacity);
        
        // ✅ Check capacity on initial load
        if (!data.capacity.ticketSalesOpen) {
          console.log('[TicketPurchase] 🚫 Ticket sales closed:', data.capacity.ticketSalesCloseReason);
          setStep('sold-out');
          return;
        }
      }

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

      if (!data.ok) {
        setError(data.error || 'Failed to load payment methods');
        return;
      }
      
      if (!data.paymentMethods?.length) {
        setError('No payment methods available for this quiz. Please contact the host.');
        return;
      }

      setPaymentMethods(data.paymentMethods);
      setStep('payment-method');
    } catch (err) {
      console.error('[TicketPurchase] ❌ Exception caught:', err);
      setError(err instanceof Error ? err.message : 'Failed to load payment methods');
    }
  };

  // ✅ NEW: Check capacity BEFORE showing payment instructions
  const checkCapacityBeforePayment = async (method: ClubPaymentMethod) => {
    try {
      setSelectedMethod(method);
      setStep('checking-capacity');
      setError(null);

      console.log('[TicketPurchase] 🔒 Checking capacity before showing payment instructions...');

      const response = await fetch(`/api/quiz/tickets/room/${roomId}/info`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error('Failed to verify capacity');
      }

      // Update capacity state
      if (data.capacity) {
        setCapacity(data.capacity);

        // ✅ CRITICAL: Block if sales closed
        if (!data.capacity.ticketSalesOpen) {
          setError(data.capacity.ticketSalesCloseReason || 'Ticket sales have closed');
          setStep('sold-out');
          return;
        }

        // ✅ CRITICAL: Block if no tickets available
        if (data.capacity.availableForTickets < 1) {
          setError('SOLD OUT - No tickets remaining');
          setStep('sold-out');
          return;
        }

        console.log('[TicketPurchase] ✅ Capacity check passed:', {
          available: data.capacity.availableForTickets,
          max: data.capacity.maxCapacity,
        });
      }

      // ✅ Only show payment instructions if capacity OK
      setStep('payment-instructions');

    } catch (err) {
      console.error('[TicketPurchase] ❌ Capacity check failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to verify capacity');
      setStep('payment-method');
    }
  };

  const createTicket = async () => {
    try {
      setCreatingTicket(true);
      setError(null);

      if (!selectedMethod?.id) throw new Error('No payment method selected');

      console.log('[TicketPurchase] 🎫 Creating ticket...');

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
      
      if (!response.ok) {
        if (response.status === 409 || data.error === 'capacity_exceeded') {
          throw new Error(data.message || 'SOLD OUT - Room is at maximum capacity');
        }
        throw new Error(data.message || data.error || 'Failed to create ticket');
      }

      setTicket(data.ticket);
      setStep('complete');
    } catch (err) {
      console.error('Failed to create ticket:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create ticket';
      
      if (errorMessage.includes('SOLD OUT') || errorMessage.includes('capacity')) {
        setError(errorMessage);
        setStep('sold-out');
      } else {
        setError(errorMessage);
      }
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

  // ✅ NEW: Checking capacity state
  if (step === 'checking-capacity') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-3" />
          <span className="text-gray-700">Checking availability...</span>
          <p className="text-sm text-gray-500 mt-2">Making sure there are still tickets available</p>
        </div>
      </div>
    );
  }

  // Sold out state
  if (step === 'sold-out') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Tickets Sold Out</h2>
          <div className="mb-4 space-y-2">
            <p className="text-red-600 font-medium">
              {error || capacity?.ticketSalesCloseReason || 'No tickets available'}
            </p>
            {capacity && (
              <div className="bg-gray-50 rounded-lg p-4 text-left">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Room capacity:</span>
                    <span className="font-semibold">{capacity.maxCapacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tickets sold:</span>
                    <span className="font-semibold">{capacity.totalTickets}</span>
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
            This quiz has reached maximum capacity. Please contact the host if you believe this is an error.
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
              onContinue={() => {
                if (availableExtras.length > 0) {
                  setStep('extras');
                } else {
                  loadPaymentMethods();
                }
              }}
              continueLabel={availableExtras.length > 0 ? 'Continue to Extras' : 'Continue to Payment'}
              continueDisabled={!isPlayerDetailsValid}
            />
          }
        >
          {capacity && capacity.availableForTickets > 0 && capacity.availableForTickets <= 5 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900">Limited availability</div>
                  <div className="text-sm text-amber-800">
                    Only <strong>{capacity.availableForTickets}</strong> ticket{capacity.availableForTickets === 1 ? '' : 's'} remaining out of {capacity.maxCapacity} total spots.
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
          {capacity && capacity.availableForTickets > 0 && capacity.availableForTickets <= 5 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-900">
                  <strong>{capacity.availableForTickets}</strong> tickets remaining
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
              // ✅ CRITICAL: Check capacity BEFORE showing payment instructions
              checkCapacityBeforePayment(method);
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
          {/* ✅ Show capacity warning on payment page */}
          {capacity && capacity.availableForTickets > 0 && capacity.availableForTickets <= 3 && (
            <div className="mb-4 rounded-lg border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5" />
                <div>
                  <div className="font-bold text-red-900">⚠️ Almost sold out!</div>
                  <div className="text-sm text-red-800 mt-1">
                    Only <strong>{capacity.availableForTickets}</strong> ticket{capacity.availableForTickets === 1 ? '' : 's'} remaining. 
                    Complete payment quickly to secure your spot.
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
            revolutLink={
              selectedMethod.providerName?.toLowerCase() === 'revolut' &&
              selectedMethod.methodConfig &&
              'link' in selectedMethod.methodConfig
                ? selectedMethod.methodConfig.link
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




