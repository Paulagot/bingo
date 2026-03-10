// src/components/Quiz/tickets/stripeQuizTicketCancl.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export const StripeQuizTicketCancel: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment cancelled</h2>
        <p className="text-gray-600 mb-6">
          No worries — your ticket has not been confirmed and you have not been charged.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};