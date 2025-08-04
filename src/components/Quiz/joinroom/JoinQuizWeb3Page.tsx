//src/components/Quiz/joinroom/JoinQuizWeb3Page.tsx

import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizSocket } from '../sockets/QuizSocketProvider';  // ✅ use new context
import { joinQuizRoom } from '../sockets/joinQuizSocket';

const JoinQuizWeb3Page = () => {
  const { roomId } = useParams();
  const { socket, connected } = useQuizSocket();  // ✅ unpack socket + connection state

  useEffect(() => {
    if (socket && connected && roomId) {
      const player = {
        id: socket.id || 'unknown',  // extra safety if socket.id isn't yet populated
        name: 'Alice',  // TODO: Replace with actual name from user session or wallet
      };

      joinQuizRoom(socket, roomId, player);
    }
  }, [socket, connected, roomId]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold">🔗 Joining Quiz Room</h2>
      <p>Room ID: {roomId}</p>
      <p>Waiting for smart contract payment confirmation (if required)...</p>
    </div>
  );
};

export default JoinQuizWeb3Page;


