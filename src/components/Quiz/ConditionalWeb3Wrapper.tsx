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

export const ConditionalWeb3Wrapper: React.FC<ConditionalWeb3WrapperProps> = ({ children }) => {
  const location = useLocation();
  const [roomType, setRoomType] = useState<'web2' | 'web3' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extract roomId from pathname using regex
    const roomIdMatch = location.pathname.match(/\/quiz\/(join|game|play|admin-join|host-dashboard|host-controls)\/([^\/]+)/);
    const roomId = roomIdMatch?.[2];

    if (!roomId) {
      console.log('[ConditionalWeb3Wrapper] No roomId found, defaulting to Web2');
      setLoading(false);
      setRoomType('web2');
      return;
    }



const checkRoomType = async () => {
  try {
    console.log('[ConditionalWeb3Wrapper] Checking room type for:', roomId);
    
    console.log('[ConditionalWeb3Wrapper] 🔍 Fetching room info from API...');
    
    const response = await fetch(`/quiz/api/rooms/${roomId}/info`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('[ConditionalWeb3Wrapper] ✅ Room info fetched:', data);
      setRoomType(data.isWeb3 ? 'web3' : 'web2');
      setLoading(false);
      return;
    }
    
    // ✅ Handle errors differently
    if (response.status === 404) {
      console.error('[ConditionalWeb3Wrapper] ❌ Room not found (404)');
      setRoomType('web2'); // Safe default
      setLoading(false);
      return;
    }
    
    // For other errors (like 401), log but default to web2
    console.warn(`[ConditionalWeb3Wrapper] ⚠️ API returned ${response.status}, defaulting to Web2`);
    setRoomType('web2');
    
  } catch (err: any) {
    console.error('[ConditionalWeb3Wrapper] ❌ Error:', err.message);
    setRoomType('web2'); // Safe default
  } finally {
    setLoading(false);
  }
};

    checkRoomType();
  }, [location.pathname]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (roomType === 'web3') {
    console.log('[ConditionalWeb3Wrapper] 🌐 Initializing Web3Provider for Web3 room');
    return <Web3Provider>{children}</Web3Provider>;
  }

  console.log('[ConditionalWeb3Wrapper] ⚡ Skipping Web3Provider for Web2 room');
  return <>{children}</>;
};