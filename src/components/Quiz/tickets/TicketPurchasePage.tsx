// src/components/Quiz/tickets/TicketPurchasePage.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import TicketPurchaseFlow from './TicketPurchaseFlow';

export const TicketPurchasePage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  if (!roomId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-xl">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />

          <h1 className="mb-2 text-xl font-bold text-gray-950">
            Missing room ID
          </h1>

          <p className="mb-5 text-sm text-gray-600">
            This ticket link is missing the quiz room reference.
          </p>

          <button
            onClick={() => navigate('/')}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return <TicketPurchaseFlow roomId={roomId} mode="page" />;
};

export default TicketPurchasePage;




