// src/components/Quiz/ConditionalWeb3Wrapper.tsx

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Web3Provider } from '../Web3Provider';


interface ConditionalWeb3WrapperProps {
  children: React.ReactNode;
}

const LoadingFallback: React.FC = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 font-semibold">Loading room...</p>
    </div>
  </div>
);

// Simplified version
export const ConditionalWeb3Wrapper: React.FC<ConditionalWeb3WrapperProps> = ({ children }) => {
  const location = useLocation();
  const [isWeb3Room, setIsWeb3Room] = useState<boolean | null>(null);

  useEffect(() => {
    const roomIdMatch = location.pathname.match(/\/quiz\/(join|game|play|admin-join|host-dashboard|host-controls)\/([^\/]+)/);
    const roomId = roomIdMatch?.[2];

    if (!roomId) {
      setIsWeb3Room(false);
      return;
    }

    fetch(`/quiz/api/rooms/${roomId}/info`)
      .then(res => res.ok ? res.json() : { isWeb3: false })
      .then(data => setIsWeb3Room(data.isWeb3 || false))
      .catch(() => setIsWeb3Room(false));
  }, [location.pathname]);

  if (isWeb3Room === null) {
    return <LoadingFallback />;
  }

  // ✅ Force Web3Provider if it's a Web3 room
  return isWeb3Room ? (
    <Web3Provider force>{children}</Web3Provider>
  ) : (
    <>{children}</>
  );
};