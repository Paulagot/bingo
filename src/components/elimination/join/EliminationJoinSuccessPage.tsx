// src/components/Elimination/join/EliminationJoinSuccessPage.tsx
//
// Stripe redirects here after a successful card payment:
//   /elimination/join-success/:roomId?playerId=...&session_id=...
//
// The playerId was generated server-side when the Stripe session was created,
// and is embedded in the success_url. The webhook already wrote the confirmed
// ledger entry. This page just does the socket join with paid: true.

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { emitJoinRoom, getSocket } from '../services/eliminationSocket';
import type { EliminationRoom } from '../types/elimination';

const SESSION_ROOM_ID     = 'elim_room_id';
const SESSION_PLAYER_ID   = 'elim_player_id';
const SESSION_PLAYER_NAME = 'elim_player_name';
const SESSION_IS_HOST     = 'elim_is_host';

export const EliminationJoinSuccessPage: React.FC = () => {
  const { roomId }          = useParams<{ roomId: string }>();
  const [searchParams]      = useSearchParams();
  const navigate            = useNavigate();

  const playerId  = searchParams.get('playerId') ?? '';
  const sessionId = searchParams.get('session_id') ?? '';

  const [status, setStatus] = useState<'joining' | 'error'>('joining');
  const [error, setError]   = useState('');
  const hasEmitted          = useRef(false);

  // Read player name from sessionStorage (stored before redirect)
  const playerName = roomId
    ? sessionStorage.getItem(`elim-stripe-name:${roomId}`) ?? ''
    : '';

  useEffect(() => {
    if (!roomId || !playerId || hasEmitted.current) return;

    if (!playerName) {
      setError('Could not recover your name. Please try joining again.');
      setStatus('error');
      return;
    }

    hasEmitted.current = true;

    const socket = getSocket();

    const handleRoomState = (data: any) => {
      const room: EliminationRoom = data.roomSnapshot ?? data;
      const assignedPlayerId: string = data.yourPlayerId ?? playerId;
      const assignedName: string     = data.yourName     ?? playerName;

      // Clean up the temporary stripe name key
      if (roomId) sessionStorage.removeItem(`elim-stripe-name:${roomId}`);

      sessionStorage.setItem(SESSION_ROOM_ID,     room.roomId);
      sessionStorage.setItem(SESSION_PLAYER_ID,   assignedPlayerId);
      sessionStorage.setItem(SESSION_PLAYER_NAME, assignedName);
      sessionStorage.setItem(SESSION_IS_HOST,     'false');

      navigate('/elimination', { replace: true });
    };

    const handleError = (data: { message: string }) => {
      setError(data.message || 'Failed to join room after payment.');
      setStatus('error');
    };

    socket.on('elimination_room_state', handleRoomState);
    socket.on('elimination_error', handleError);

    // Emit join with paid: true — Stripe webhook has already written the ledger
    emitJoinRoom(
      roomId,
      playerName,
      playerId,   // pass as playerId so server treats this as a reconnect/known player
      undefined,
      undefined,
      {
        paid:            true,
        paymentClaimed:  false,
        payAtDoor:       false,
        paymentMethod:   'stripe',
        paymentReference: sessionId,
      }
    );

    return () => {
      socket.off('elimination_room_state', handleRoomState);
      socket.off('elimination_error', handleError);
    };
  }, [roomId, playerId, playerName, sessionId, navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full rounded-xl bg-white shadow-xl p-8 text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6 text-sm">{error}</p>
          <p className="text-xs text-gray-400 mb-6">
            Your payment was received. Please contact the host with your name
            and they can add you manually.
          </p>
          <button
            onClick={() => navigate(`/elimination/join/${roomId}`)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-white font-medium hover:bg-indigo-700"
          >
            Try Joining Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full rounded-xl bg-white shadow-xl p-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Payment confirmed!</h2>
        <p className="text-gray-600 text-sm">Joining your game...</p>
      </div>
    </div>
  );
};

export default EliminationJoinSuccessPage;