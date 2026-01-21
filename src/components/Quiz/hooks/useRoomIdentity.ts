// src/components/Quiz/hooks/useRoomIdentity.ts
import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';

export interface RoomIdentity {
  roomId: string | null;
  hostId: string | null;
}

/**
 * Extracts roomId and hostId from URL params.
 * Only persists to localStorage for Web3 rooms (when contract address exists).
 */
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

    // ✅ FIXED: Only persist to localStorage for Web3 rooms
    // Web3 rooms have a contract address in localStorage
    const contractAddr = localStorage.getItem('current-contract-address');
    const isWeb3Room = !!contractAddr;

    if (isWeb3Room) {
      // Web3 room: persist to localStorage
      if (resolvedRoomId) localStorage.setItem('current-room-id', resolvedRoomId);
      if (resolvedHostId) localStorage.setItem('current-host-id', resolvedHostId);
    } else {
      // Web2 room: don't pollute localStorage
      // Just use the values from URL without persisting
      console.log('[useRoomIdentity] 📋 Web2 room - not persisting to localStorage');
    }

    setRoomId(resolvedRoomId);
    setHostId(resolvedHostId);

  }, [location.search, params.roomId]);

  return { roomId, hostId };
};
