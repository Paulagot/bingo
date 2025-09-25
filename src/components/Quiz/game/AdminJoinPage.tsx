// src/components/Quiz/dashboard/AdminJoinPage.tsx
import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import PlayerListPanel from '../dashboard/PlayerListPanel';
import SetupSummaryPanel from '../dashboard/SetupSummaryPanel';
import type { QuizConfig } from '../types/quiz';

type RoomRole = 'admin' | 'host';

interface User {
  id: string;
  name?: string;
}

const STORAGE_KEYS = {
  ctx: (roomId: string) => `quizCtx:${roomId}`, // { role, memberId }
};

function saveCtx(roomId: string, ctx: { role: RoomRole; memberId: string }) {
  try {
    localStorage.setItem(STORAGE_KEYS.ctx(roomId), JSON.stringify(ctx));
  } catch {}
}

function loadCtx(roomId: string): { role?: RoomRole; memberId?: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ctx(roomId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const AdminJoinPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();

  // Accept role=admin|host (default admin)
  const roleParam = (searchParams.get('role') as RoomRole) || 'admin';

  // Accept any of these IDs from QR link
  const linkMemberId =
    searchParams.get('memberId') ||
    searchParams.get('adminId') ||
    searchParams.get('hostId') ||
    '';

  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const { config, setFullConfig } = useQuizConfig();

  // Helper to unwrap `{config: ...}` or receive raw `QuizConfig`
  const coerceToConfig = (payload: any): QuizConfig | null => {
    if (!payload) return null;
    return (payload.config ?? payload) as QuizConfig;
  };

  // 1) On mount / connection, join + request config/state
  useEffect(() => {
    if (!roomId) {
      navigate('/quiz', { replace: true });
      return;
    }

    // Prefer memberId from URL; fall back to persisted context
    const persisted = loadCtx(roomId) || {};
    const memberId = linkMemberId || persisted.memberId;
    const role: RoomRole = (roleParam || (persisted.role as RoomRole)) ?? 'admin';

    if (!memberId) {
      // No identifier at all → bounce to home
      navigate('/quiz', { replace: true });
      return;
    }

    if (socket && connected) {
      const user: User = { id: memberId };

      const handleError = ({ message }: { message: string }) => {
        alert(`Failed to join as ${role}: ${message}`);
        navigate('/quiz', { replace: true });
      };

   const handleConfig = (payload: any) => {
  const cfg = (payload?.config ?? payload) as QuizConfig | undefined;
  if (!cfg) return;

  // If they’re joining as HOST and config.hostId is missing, fill it from URL memberId
  const memberIdFromUrl =
    searchParams.get('memberId') ||
    searchParams.get('hostId') ||
    searchParams.get('adminId') || '';

  const patched = role === 'host' && !cfg.hostId
    ? { ...cfg, hostId: memberIdFromUrl }
    : cfg;

  setFullConfig({ ...patched, roomId });

  if (role === 'host') {
      // persist and route with hostId
 if (memberIdFromUrl) localStorage.setItem('current-host-id', memberIdFromUrl);
 navigate(`/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(memberIdFromUrl)}`, { replace: true });
  }
};


      const handleRoomState = (state: any) => {
        // Some servers only ever send room_state. If it contains a config, use it.
        const cfg = coerceToConfig(state?.config ? state : state?.room?.config ?? state?.config);
        if (cfg) setFullConfig({ ...cfg, roomId });
      };

      const handleQuizCancelled = ({ message }: { message: string }) => {
        console.warn('🚫 [AdminJoinPage] Quiz cancelled:', message);
      };

      const handleReconnect = () => {
        // On reconnect, make sure we’re joined and re-request config/state
        socket.emit('join_quiz_room', { roomId, user, role });
        socket.emit('request_room_config', { roomId });
        socket.emit?.('request_room_state', { roomId });
      };

      // Register listeners BEFORE emitting
      socket.on('quiz_error', handleError);
      socket.on('room_config', handleConfig);
      socket.on('room_state', handleRoomState);
      socket.on('quiz_cancelled', handleQuizCancelled);
      socket.on('connect', handleReconnect);

      // Persist context for refresh
      saveCtx(roomId, { role, memberId });

      // Join and request
      socket.emit('join_quiz_room', { roomId, user, role });
      socket.emit('request_room_config', { roomId });
      socket.emit?.('request_room_state', { roomId });

      return () => {
        socket.off('quiz_error', handleError);
        socket.off('room_config', handleConfig);
        socket.off('room_state', handleRoomState);
        socket.off('quiz_cancelled', handleQuizCancelled);
        socket.off('connect', handleReconnect);
      };
    }
  }, [roomId, linkMemberId, roleParam, socket, connected, navigate, setFullConfig]);

  // 2) While waiting for config OR it’s the wrong roomId → Loading
  if (!roomId || !config || config.roomId !== roomId) {
    return (
      <div className="text-fg/70 mx-auto max-w-4xl p-4 text-center">
        <p>Loading quiz information…</p>
      </div>
    );
  }

  // 3) If role=host, we’ll be redirected in the effect. Show a small fallback.
  const persisted = loadCtx(roomId);
  if (persisted?.role === 'host') {
    return (
      <div className="text-fg/70 mx-auto max-w-4xl p-4 text-center">
        <p>Joining as host… redirecting to Host Dashboard…</p>
      </div>
    );
  }

  // 4) Admin dashboard view
  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-bold">👥 Admin Dashboard</h1>
      <p className="text-fg/70 mb-4">
        You are logged in as an event admin. You can assist players with setup but not control the quiz.
      </p>
      <SetupSummaryPanel />
      <div className="mt-4">
        <PlayerListPanel />
      </div>
    </div>
  );
};

export default AdminJoinPage;







