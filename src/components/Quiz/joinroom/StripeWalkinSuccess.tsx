import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { Loader2 } from 'lucide-react';

export const StripeWalkinSuccess: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useQuizSocket();

  const playerId = searchParams.get('playerId');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerName = sessionStorage.getItem(`stripe-walkin-name:${roomId}`) || 'Player';
  const selectedExtras = JSON.parse(
    sessionStorage.getItem(`stripe-walkin-extras:${roomId}`) || '[]'
  );
  const donationAmount = Number(
    sessionStorage.getItem(`stripe-walkin-donation:${roomId}`) || '0'
  );

  const joinGame = () => {
    if (!socket || !roomId || !playerId) {
      setError('Missing room or player information.');
      return;
    }

    setJoining(true);

    socket.emit('join_quiz_room', {
      roomId,
      user: {
        id: playerId,
        name: playerName,
        paid: true,
        paymentMethod: 'stripe',
        paymentClaimed: true,
        paymentConfirmedBy: 'stripe_webhook',
        paymentConfirmedByName: 'Stripe',
        paymentConfirmedRole: 'admin',
        extras: selectedExtras,
        extraPayments: {},
        donationAmount,
      },
      role: 'player',
      paymentAlreadyRecorded: true, // ✅ NEW
    });

    localStorage.setItem(`quizPlayerId:${roomId}`, playerId);

    sessionStorage.removeItem(`stripe-walkin-name:${roomId}`);
    sessionStorage.removeItem(`stripe-walkin-extras:${roomId}`);
    sessionStorage.removeItem(`stripe-walkin-donation:${roomId}`);

    navigate(`/quiz/game/${roomId}/${playerId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-md text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment confirmed!</h2>
        <p className="text-gray-600 mb-2">
          Hi <strong>{playerName}</strong>, you're all paid up.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Click below to join the quiz now.
        </p>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          onClick={joinGame}
          disabled={joining}
          className="rounded-lg bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700 w-full font-semibold disabled:opacity-50"
        >
          {joining ? (
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          ) : (
            'Join the Quiz Now 🎯'
          )}
        </button>
      </div>
    </div>
  );
};