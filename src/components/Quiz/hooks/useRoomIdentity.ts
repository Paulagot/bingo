// src/components/Quiz/useRoomIdentity.ts
import { useState, useEffect } from 'react';

export interface RoomIdentity {
  roomId: string | null;
  hostId: string | null;
  // later: adminId, playerId if needed
}

export const useRoomIdentity = (): RoomIdentity => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);

  useEffect(() => {
    const storedRoomId = localStorage.getItem('current-room-id');
    const storedHostId = localStorage.getItem('current-host-id');

    setRoomId(storedRoomId);
    setHostId(storedHostId);
  }, []);

  return { roomId, hostId };
};
