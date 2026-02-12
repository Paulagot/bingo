// src/components/Quiz/tickets/TicketPurchasePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { Loader2 } from 'lucide-react';

import { PurchaseDetailsStep } from './PurchaseDetailsStep';
import { PurchaseExtrasStep } from './PurchaseExtrasStep';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { PaymentInstructions } from './PaymentInstructions';
import { TicketConfirmation } from './TicketConfirmation';

import { fundraisingExtraDefinitions } from '../constants/quizMetadata';

import type { RoomInfo, ClubPaymentMethod, PurchaseFormData, Ticket } from './types';

type TicketStep =
  | 'loading'
  | 'error'
  | 'details'
  | 'extras'
  | 'payment_method'
  | 'payment_instructions'
  | 'creating_ticket'
  | 'complete';

type ExtraId = keyof typeof fundraisingExtraDefinitions;

// ✅ IMPORTANT: keep these OUTSIDE the page component (prevents remount/focus-loss)
const TicketShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gray-50 py-4 px-4 sm:py-8">
    <div className="mx-auto max-w-4xl">
      <div className="bg-white h-[95vh] sm:h-[90vh] w-full overflow-hidden rounded-xl shadow-xl border border-gray-100">
        {children}
      </div>
    </div>
  </div>
);

const TicketHeader: React.FC<{ icon: string; title: string; subtitle?: string }> = ({
  icon,
  title,
  subtitle,
}) => (
  <div className="border-b border-gray-200 p-4 sm:p-6">
    <div className="flex items-center space-x-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        {subtitle && <p className="text-gray-600 text-sm sm:text-base truncate">{subtitle}</p>}
      </div>
    </div>
  </div>
);

export const TicketPurchasePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<TicketStep>('loading');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<ClubPaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<ClubPaymentMethod | null>(null);

  const [formData, setFormData] = useState<PurchaseFormData>({
    purchaserName: '',
    purchaserEmail: '',
    purchaserPhone: '',
    playerName: '',
    selectedExtras: [],
  });

  const [paymentReference] = useState(() => `QUIZ-${nanoid(6).toUpperCase()}`);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoomInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const availableExtras = useMemo(() => {
    if (!roomInfo) return [];
    return (Object.entries(roomInfo.fundraisingOptions) as Array<[string, boolean]>)
      .filter(([_, enabled]) => enabled)
      .map(([extraId]) => extraId)
      .filter((extraId): extraId is ExtraId => extraId in fundraisingExtraDefinitions);
  }, [roomInfo]);

  const extrasTotal = useMemo(() => {
    if (!roomInfo) return 0;
    return formData.selectedExtras.reduce((sum, extraId) => {
      return sum + (roomInfo.fundraisingPrices[extraId] || 0);
    }, 0);
  }, [formData.selectedExtras, roomInfo]);

  const totalAmount = useMemo(() => {
    if (!roomInfo) return 0;
    return roomInfo.entryFee + extrasTotal;
  }, [roomInfo, extrasTotal]);

  const loadRoomInfo = async () => {
    try {
      setStep('loading');
      setError(null);

      const response = await fetch(`/api/quiz/tickets/room/${roomId}/info`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed to load room info');

      setRoomInfo(data);
      setStep('details');
    } catch (err) {
      console.error('Failed to load room info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load room information');
      setStep('error');
    }
  };

const loadPaymentMethods = async () => {
  try {
    setError(null);
    
    // ✅ Use room-specific endpoint instead of club-wide
    const response = await fetch(`/api/quiz-rooms/${roomId}/available-payment-methods`);
    const data = await response.json();

    if (!data.ok) throw new Error(data.error || 'Failed to load payment methods');
    if (!data.paymentMethods?.length) {
      throw new Error('No payment methods available for this quiz. Please contact the host.');
    }

    setPaymentMethods(data.paymentMethods);
    setStep('payment_method');
  } catch (err) {
    console.error('Failed to load payment methods:', err);
    setError(err instanceof Error ? err.message : 'Failed to load payment methods');
  }
};

  const createTicket = async () => {
    try {
      setStep('creating_ticket');
      setError(null);

      if (!selectedMethod?.id) throw new Error('No payment method selected');

      const response = await fetch('/api/quiz/tickets/create-with-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          ...formData,
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
      setStep('payment_instructions');
    }
  };

  if (step === 'loading') {
    return (
      <TicketShell>
        <div className="h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-700">Loading room information...</span>
        </div>
      </TicketShell>
    );
  }

  if (step === 'error') {
    return (
      <TicketShell>
        <div className="h-full flex items-center justify-center p-8 text-center">
          <div>
            <div className="mb-4 text-5xl">⚠️</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Error</h2>
            <p className="mb-4 text-red-600">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </TicketShell>
    );
  }

  return (
    <TicketShell>
      {step === 'details' && roomInfo && (
        <div className="flex h-full flex-col">
          <TicketHeader icon="🎟️" title="Ticket details" subtitle={`Buying a ticket for ${roomInfo.hostName}'s quiz`} />
          <PurchaseDetailsStep
            roomInfo={roomInfo}
            formData={formData}
            setFormData={setFormData}
            onBack={() => navigate('/')}
            onContinue={() => setStep(availableExtras.length > 0 ? 'extras' : 'payment_method')}
            totalAmount={totalAmount}
            extrasTotal={extrasTotal}
          />
        </div>
      )}

      {step === 'extras' && roomInfo && (
        <div className="flex h-full flex-col">
          <TicketHeader icon="🚀" title="Choose extras" subtitle="Power-ups to boost your chances" />
          <PurchaseExtrasStep
            roomInfo={roomInfo}
            formData={formData}
            setFormData={setFormData}
            onBack={() => setStep('details')}
            onContinue={loadPaymentMethods}
            totalAmount={totalAmount}
            extrasTotal={extrasTotal}
          />
        </div>
      )}

      {step === 'payment_method' && (
        <div className="flex h-full flex-col">
          <TicketHeader icon="💶" title="Choose payment method" subtitle="Pay now via instant payment" />
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <PaymentMethodSelector
              paymentMethods={paymentMethods}
              onSelect={(method) => {
                setSelectedMethod(method);
                setStep('payment_instructions');
              }}
              onBack={() => setStep(availableExtras.length > 0 ? 'extras' : 'details')}
            />
          </div>
        </div>
      )}

      {step === 'payment_instructions' && selectedMethod && roomInfo && (
        <div className="flex h-full flex-col">
          <TicketHeader icon="💳" title="Instant payment" subtitle={selectedMethod.methodLabel} />
          <div className="flex-1 overflow-y-auto">
            <PaymentInstructions
              method={selectedMethod}
              paymentReference={paymentReference}
              totalAmount={totalAmount}
              currencySymbol={roomInfo.currencySymbol}
              onConfirmPaid={createTicket}
              onBack={() => setStep('payment_method')}
              error={error}
            />
          </div>
        </div>
      )}

      {step === 'creating_ticket' && (
        <div className="h-full flex flex-col">
          <TicketHeader icon="⏳" title="Creating your ticket" subtitle="Just a moment…" />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
            <span className="ml-3 text-gray-700 text-lg">Creating your ticket...</span>
          </div>
        </div>
      )}

      {step === 'complete' && ticket && roomInfo && (
        <div className="flex h-full flex-col">
          <TicketHeader icon="✅" title="Ticket created" subtitle="You can now share your join link" />
          <div className="flex-1 overflow-y-auto">
            <TicketConfirmation ticket={ticket} roomInfo={roomInfo} />
          </div>
        </div>
      )}
    </TicketShell>
  );
};




