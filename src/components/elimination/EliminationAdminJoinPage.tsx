// src/components/elimination/EliminationAdminJoinPage.tsx
//
// Admin lands here after scanning the QR code from the host dashboard.
// No login required — they join via socket as role 'admin'.
// They see the same EliminationHostDashboard panel as the host,
// but can only confirm payments (no start game, no room controls).

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { getSocket } from './services/eliminationSocket';
import { EliminationHostDashboard } from './host/EliminationHostDashboard';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

const SESSION_ROOM_ID   = 'elim_room_id';
const SESSION_IS_HOST   = 'elim_is_host';
const SESSION_ADMIN_ID  = 'elim_admin_id';
const SESSION_ADMIN_NAME = 'elim_admin_name';

export const EliminationAdminJoinPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const adminId   = searchParams.get('adminId');
  const adminName = searchParams.get('name') ?? 'Admin';

  const [status, setStatus]         = useState<'joining' | 'joined' | 'error'>('joining');
  const [error, setError]           = useState<string | null>(null);
  const [waitingPlayers, setWaitingPlayers] = useState<any[]>([]);
  const [roomConfig, setRoomConfig] = useState<any>(null);

  useEffect(() => {
    if (!roomId || !adminId) {
      navigate('/elimination');
      return;
    }

    const socket = getSocket();

    const handleRoomState = (data: any) => {
      const room = data.roomSnapshot ?? data;
      setRoomConfig(room);
      setWaitingPlayers(room.players ?? []);
      setStatus('joined');

      // Persist so page survives a refresh
      sessionStorage.setItem(SESSION_ROOM_ID,    roomId);
      sessionStorage.setItem(SESSION_IS_HOST,    'false');
      sessionStorage.setItem(SESSION_ADMIN_ID,   adminId);
      sessionStorage.setItem(SESSION_ADMIN_NAME, adminName);
    };

    const handleWaitingRoomUpdate = ({ players }: { players: any[] }) => {
      setWaitingPlayers(players);
    };

    const handleError = ({ message }: { message: string }) => {
      setError(message);
      setStatus('error');
    };

    socket.on('elimination_room_state', handleRoomState);
    socket.on('elimination_waiting_room_update',    handleWaitingRoomUpdate);
    socket.on('elimination_error',      handleError);

    socket.emit('admin_join_elimination_room', {
      roomId,
      adminId,
      name: adminName,
    });

    return () => {
      socket.off('elimination_room_state', handleRoomState);
      socket.off('elimination_waiting_room_update',    handleWaitingRoomUpdate);
      socket.off('elimination_error',      handleError);
    };
  }, [roomId, adminId, adminName, navigate]);

  // ── Joining spinner ────────────────────────────────────────────────────────
  if (status === 'joining') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mx-auto" />
          <p className="text-white/60 font-medium">Joining as admin…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
        <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-8 text-center max-w-sm">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="font-bold text-white mb-1">Could not join</p>
          <p className="text-sm text-white/50">{error ?? 'Room not found or link has expired.'}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  // ── Joined — show admin view ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header bar */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="rounded-full bg-indigo-900/60 border border-indigo-500/40 p-2">
          <Shield className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <p className="font-bold text-white">Admin View</p>
          <p className="text-xs text-white/40">{adminName} · {roomId}</p>
        </div>
      </div>

      <div className="p-4 text-center text-white/30 text-sm">
        Use the Host button in the bottom-right to manage players and confirm payments.
      </div>

      {/* The same dashboard the host uses — floats over the page */}
      <EliminationHostDashboard
        roomId={roomId!}
        hostId={adminId!}
        socket={getSocket()}
        initialPlayers={waitingPlayers}
        entryFee={Number(roomConfig?.entryFee ?? 0)}
        currency={roomConfig?.currency ?? '€'}
      />
    </div>
  );
};

export default EliminationAdminJoinPage;