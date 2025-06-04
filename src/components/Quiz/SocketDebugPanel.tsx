import React, { useEffect, useState } from 'react';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';

const SocketDebugPanel: React.FC = () => {
  const { socket, connected } = useQuizSocket();
  const [socketId, setSocketId] = useState<string | null>(null);

  useEffect(() => {
    if (socket) {
      setSocketId(socket.id ?? null);  // ✅ safely handle undefined

      const handleReconnect = () => {
        setSocketId(socket.id ?? null);  // ✅ safely handle undefined
      };

      socket.on('connect', handleReconnect);
      return () => {
        socket.off('connect', handleReconnect);
      };
    }
  }, [socket]);

  return (
    <div className="fixed bottom-4 right-4 p-3 bg-black text-white text-xs rounded shadow z-50">
      <div>Socket: {connected ? '🟢 Connected' : '🔴 Disconnected'}</div>
      <div>ID: {socketId || '—'}</div>
    </div>
  );
};

export default SocketDebugPanel;




















