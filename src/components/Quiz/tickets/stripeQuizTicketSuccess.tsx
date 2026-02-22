// src/components/Quiz/tickets/stripeQuizTicketSuccess.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export const StripeQuizTicketSuccess: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'timeout'>('polling');

  useEffect(() => {
    if (!ticketId) return;

    let attempts = 0;
    const maxAttempts = 10; // poll for up to ~20 seconds

    const poll = async () => {
      try {
        const res = await fetch(`/api/quiz/tickets/${ticketId}/status`);
        const data = await res.json();

        if (data.paymentStatus === 'payment_confirmed') {
          setStatus('confirmed');
          return;
        }

        attempts++;
        if (attempts >= maxAttempts) {
          setStatus('timeout');
          return;
        }

        setTimeout(poll, 2000); // try again in 2 seconds
      } catch {
        attempts++;
        if (attempts < maxAttempts) setTimeout(poll, 2000);
        else setStatus('timeout');
      }
    };

    poll();
  }, [ticketId]);

  if (status === 'polling') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Confirming your payment...</h2>
          <p className="text-gray-500 mt-2 text-sm">This usually takes just a second</p>
        </div>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed!</h2>
          <p className="text-gray-600 mb-6">Your ticket is ready. Check your email for details.</p>
          <button
           onClick={() => navigate(`/tickets/status/${ticketId}`)}
            className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
          >
            View My Ticket
          </button>
        </div>
      </div>
    );
  }

  // timeout — payment probably went through but webhook was slow
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment received!</h2>
        <p className="text-gray-600 mb-2">Your payment was successful.</p>
        <p className="text-sm text-gray-500 mb-6">
          Your ticket is being confirmed — check your email shortly.
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
};