// src/components/Quiz/hooks/useRouteChangeNotifier.ts
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Socket } from 'socket.io-client';

interface RouteChangeOptions {
  socket: Socket | null;
  roomId: string | null;
  playerId: string | null;
  routeName: string;
  debounceMs?: number;
}

export const useRouteChangeNotifier = ({
  socket,
  roomId,
  playerId,
  routeName,
  debounceMs = 1000 // 1 second debounce
}: RouteChangeOptions) => {
  const location = useLocation();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStateRef = useRef<{ isOn: boolean; emitted: boolean }>({ isOn: false, emitted: false });
  const initialMountRef = useRef(true);

  useEffect(() => {
    // Skip the very first mount
    if (initialMountRef.current) {
      initialMountRef.current = false;
      const isOnRoute = location.pathname.includes(`/${routeName}`);
      lastStateRef.current = { isOn: isOnRoute, emitted: false };
      return;
    }

    if (!socket || !roomId || !playerId) return;

    const isOnRoute = location.pathname.includes(`/${routeName}`);
    
    // If state hasn't changed, do nothing
    if (lastStateRef.current.isOn === isOnRoute && lastStateRef.current.emitted) {
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the emission
    timeoutRef.current = setTimeout(() => {
      console.log(`[RouteChange] ${isOnRoute ? '✅' : '⬅️'} Player ${playerId} ${isOnRoute ? 'entered' : 'left'} ${routeName}`);
      
      socket.emit('player_route_change', {
        roomId,
        playerId,
        route: routeName,
        entering: isOnRoute
      });

      lastStateRef.current = { isOn: isOnRoute, emitted: true };
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [location.pathname, socket, roomId, playerId, routeName, debounceMs]);
};