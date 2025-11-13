/**
 * Launch Hook
 *
 * Manages quiz room launch logic including socket listeners and room creation.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import { useQuizConfig } from '@/components/Quiz/hooks/useQuizConfig';
import { useQuizSocket } from '@/components/Quiz/sockets/QuizSocketProvider';
import { generateRoomId, generateHostId } from '@/components/Quiz/utils/idUtils';
import { apiService } from '@/services/apiService';

export interface UseLaunchReturn {
  isLaunching: boolean;
  handleLaunch: () => Promise<void>;
}

export function useLaunch(): UseLaunchReturn {
  const { setupConfig, roomId, hostId, setRoomIds, resetSetupConfig } = useQuizSetupStore();
  const { setFullConfig } = useQuizConfig();
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const [isLaunching, setIsLaunching] = useState(false);

  // Socket listeners
  useEffect(() => {
    if (!connected || !socket) return;

    const handleCreated = ({ roomId }: { roomId: string }) => {
      // try localStorage first; fallback to store hostId if present
      const hId = localStorage.getItem('current-host-id') || hostId || '';

      resetSetupConfig({ keepIds: false });
      navigate(
        hId
          ? `/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hId)}`
          : `/quiz/host-dashboard/${roomId}`
      );
    };

    const handleError = ({ message }: { message: string }) => {
      console.error('[Socket Error]', message);
      setIsLaunching(false);
    };

    socket.on('quiz_room_created', handleCreated);
    socket.on('quiz_error', handleError);

    return () => {
      socket.off('quiz_room_created', handleCreated);
      socket.off('quiz_error', handleError);
    };
  }, [connected, navigate, socket, hostId, resetSetupConfig]);

  const handleLaunch = useCallback(async () => {
    if (isLaunching) return;
    setIsLaunching(true);

    try {
      const newRoomId = roomId || generateRoomId();
      const newHostId = hostId || generateHostId();
      setRoomIds(newRoomId, newHostId);

      const data = await apiService.createRoom({
        config: setupConfig,
        roomId: newRoomId,
        hostId: newHostId,
      });

      localStorage.setItem('current-room-id', data.roomId);
      localStorage.setItem('current-host-id', data.hostId);

      setFullConfig({
        ...setupConfig,
        roomId: data.roomId,
        hostId: data.hostId,
        roomCaps: data.roomCaps,
      });
      resetSetupConfig({ keepIds: false });

      navigate(`/quiz/host-dashboard/${data.roomId}?hostId=${encodeURIComponent(data.hostId)}`);
    } catch (err: any) {
      console.error('[Launch Error]', err);

      if (err.message?.includes('402') || err.message?.includes('no_credits')) {
        alert('You have no credits left. Upgrades coming soon.');
      } else if (err.message?.includes('403') || err.message?.includes('PLAN_NOT_ALLOWED')) {
        alert('Your current plan does not allow this configuration (players/rounds/types).');
      } else if (err.message?.includes('401')) {
        alert('Authentication failed. Please log in again.');
      } else {
        alert('Could not create room. Please review your setup.');
      }

      setIsLaunching(false);
    }
  }, [isLaunching, roomId, hostId, setRoomIds, setupConfig, setFullConfig, resetSetupConfig, navigate]);

  return {
    isLaunching,
    handleLaunch,
  };
}

