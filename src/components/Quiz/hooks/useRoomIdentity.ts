// src/components/Quiz/useRoomIdentity.ts
import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

export interface RoomIdentity {
  roomId: string | null;
  hostId: string | null;
  // later: adminId, playerId if needed
}

export const useRoomIdentity = (): RoomIdentity => {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const location = useLocation();
const params = useParams<{ roomId: string }>();

  useEffect(() => {
   // 1) roomId from route if available; else from localStorage
   const routeRoomId = params.roomId || null;
   const storedRoomId = localStorage.getItem('current-room-id');
   const resolvedRoomId = routeRoomId || storedRoomId || null;

   // 2) hostId from URL ?hostId=... if present; else from localStorage
   const qs = new URLSearchParams(location.search);
   const hostIdFromUrl = qs.get('hostId');
   const storedHostId = localStorage.getItem('current-host-id');
   const resolvedHostId = hostIdFromUrl || storedHostId || null;

   if (resolvedRoomId) localStorage.setItem('current-room-id', resolvedRoomId);
   if (resolvedHostId) localStorage.setItem('current-host-id', resolvedHostId);

  setRoomId(resolvedRoomId);
  setHostId(resolvedHostId);

 }, [location.search, params.roomId]);

  return { roomId, hostId };
;
};
