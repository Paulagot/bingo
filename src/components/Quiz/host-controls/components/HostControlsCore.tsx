import * as React from 'react';
import { useParams } from 'react-router-dom';
// ✅ Add this (adjust path)
import { useHostControlsController } from '../../hooks/useHostControlsController';
import HostControlsView from './HostControlsView';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';

   interface HostControlsCoreProps {
   operatorToken?: string;   // present when accessed via /operate/:roomId
   }

const HostControlsCore: React.FC<HostControlsCoreProps> = ({ operatorToken }) => {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId!;
  const { socket, connected } = useQuizSocket();

  // ADD THIS temporarily
  React.useEffect(() => {
    console.log('[OperatorDebug]', { 
      socketId: socket?.id, 
      connected, 
      roomId, 
      hasToken: !!operatorToken 
    });
  }, [socket, connected, roomId, operatorToken]);

  const controller = useHostControlsController({ roomId, operatorToken });
  return <HostControlsView roomId={roomId} controller={controller} />;
};

export default HostControlsCore;
