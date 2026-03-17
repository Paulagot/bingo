// src/components/Quiz/ConditionalWeb3Wrapper.tsx

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Web3Provider } from '../Web3Provider';

interface RoomConfig {
  web3Chain?: string;
  evmNetwork?: string;
  solanaCluster?: string;
  stellarNetwork?: string;
}

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

export const ConditionalWeb3Wrapper: React.FC<ConditionalWeb3WrapperProps> = ({ children }) => {
  const location = useLocation();
  const [isWeb3Room, setIsWeb3Room] = useState<boolean | null>(null);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);

  useEffect(() => {
    const roomIdMatch = location.pathname.match(
      /\/quiz\/(join|game|play|admin-join|host-dashboard|host-controls)\/([^\/]+)/
    );
    const roomId = roomIdMatch?.[2];

    if (!roomId) {
      setIsWeb3Room(false);
      return;
    }

    fetch(`/quiz/api/rooms/${roomId}/info`)
      .then(res => res.ok ? res.json() : { isWeb3: false })
      .then(data => {
        setIsWeb3Room(data.isWeb3 || false);
        // ✅ Extract chain config from the room info response
        // so WalletProvider initializes with the correct network immediately
        if (data.isWeb3) {
          setRoomConfig({
            web3Chain: data.web3Chain,
            evmNetwork: data.evmNetwork,
            solanaCluster: data.solanaCluster,
            stellarNetwork: data.stellarNetwork,
          });
        }
      })
      .catch(() => {
        setIsWeb3Room(false);
      });
  }, [location.pathname]);

  if (isWeb3Room === null) {
    return <LoadingFallback />;
  }

  if (!isWeb3Room) {
    return <>{children}</>;
  }

  // ✅ Pass roomConfig so WalletProvider doesn't initialize with undefined network
  return (
    <Web3Provider force roomConfig={roomConfig ?? undefined}>
      {children}
    </Web3Provider>
  );
};