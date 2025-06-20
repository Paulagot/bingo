// src/components/Quiz/dashboard/AdminJoinPage.tsx

import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { useQuizConfig } from '../useQuizConfig';
import PlayerListPanel from '../dashboard/PlayerListPanel';
import SetupSummaryPanel from '../dashboard/SetupSummaryPanel';

// Make sure this path points at your actual QuizConfig definition:
import type { QuizConfig } from '../../../types/quiz'

interface User {
  id: string;
  name?: string;
}

const AdminJoinPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const adminId = searchParams.get('adminId');
  const navigate = useNavigate();

  const { socket, connected } = useQuizSocket();
  const { config, setFullConfig } = useQuizConfig();

  useEffect(() => {
    // 0) If required URL params are missing, send back to home
    if (!roomId || !adminId) {
      navigate('/');
      return;
    }

    if (socket && connected) {
      // Build the admin user object
      const adminUser: User = {
        id: adminId,
       
      };

      // 1) Attach listeners BEFORE emitting join_quiz_room
      const handleError = ({ message }: { message: string }) => {
        alert('Failed to join as admin: ' + message);
        navigate('/');
      };

      // Now treat payload as the full QuizConfig
      const handleConfig = (payload: QuizConfig) => {
        setFullConfig({
          ...payload,
          roomId: roomId
        });
      };

      // ✅ NEW: Quiz cancellation handler
const handleQuizCancelled = ({ message }: { message: string }) => {
  console.warn('🚫 [AdminJoinPage] Quiz cancelled:', message);
  // ✅ The global handler in QuizSocketProvider will handle cleanup and redirect
};

      socket.on('quiz_error', handleError);
      socket.on('room_config', handleConfig);
      socket.on('quiz_cancelled', handleQuizCancelled);

      // 2) Now emit “join_quiz_room” as admin
      console.log('🎯 [QuizSocket] Emitting "join_quiz_room" as admin');
      socket.emit('join_quiz_room', {
        roomId,
        user: adminUser,
        role: 'admin'
      });

      // 3) Clean up on unmount
     return () => {
  socket.off('quiz_error', handleError);
  socket.off('room_config', handleConfig);
  socket.off('quiz_cancelled', handleQuizCancelled); // ✅ NEW
};
    }
  }, [roomId, adminId, socket, connected, navigate, setFullConfig]);

  // Until config.roomId matches, keep showing “Loading…”
  if (!config || config.roomId !== roomId) {
    return (
      <div className="max-w-4xl mx-auto p-4 text-center text-gray-600">
        <p>Loading quiz information…</p>
      </div>
    );
  }

  // Once we have the config in context, render the Admin dashboard
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">👥 Admin Dashboard</h1>
      <p className="mb-4 text-gray-600">
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





