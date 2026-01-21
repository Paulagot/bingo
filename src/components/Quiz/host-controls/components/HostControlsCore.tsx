import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useEffect } from 'react'; // ✅ Add this
import { useQuizSocket } from '../../sockets/QuizSocketProvider'; // ✅ Add this (adjust path)
import { useHostControlsController } from '../../hooks/useHostControlsController';
import HostControlsView from './HostControlsView';

const HostControlsCore: React.FC = () => {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId!;

  // ✅ Add this diagnostic
  const { socket, connected } = useQuizSocket();
  
  useEffect(() => {
    console.log('[HostControlsCore] Socket from context:', {
      socketId: socket?.id,
      connected,
      actualSocketConnected: socket?.connected,
      roomId
    });
  }, [socket, connected, roomId]);

  const controller = useHostControlsController({ roomId });

  return <HostControlsView roomId={roomId} controller={controller} />;
};

export default HostControlsCore;
