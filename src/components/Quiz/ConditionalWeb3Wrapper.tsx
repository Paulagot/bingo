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

  // src/components/Quiz/ConditionalWeb3Wrapper.tsx

const checkRoomType = async () => {
  try {
    console.log('[ConditionalWeb3Wrapper] Checking room type for:', roomId);
    
    // ✅ PRIORITY 1: Check localStorage for Web3 indicators
    try {
      const contractAddr = localStorage.getItem('current-contract-address');
      const storedRoomId = localStorage.getItem('current-room-id');
      
      console.log('[ConditionalWeb3Wrapper] 🔍 Checking localStorage', { 
        contractAddr: !!contractAddr, 
        storedRoomId, 
        currentRoomId: roomId,
        match: storedRoomId === roomId 
      });
      
      if (contractAddr && storedRoomId === roomId) {
        console.log('[ConditionalWeb3Wrapper] ✅ Web3 room detected (from localStorage)');
        setRoomType('web3');
        setLoading(false);
        return;
      }
    } catch (storageErr) {
      console.warn('[ConditionalWeb3Wrapper] localStorage check failed:', storageErr);
    }
    
    // ✅ PRIORITY 2: Use PUBLIC endpoint that doesn't require auth
    console.log('[ConditionalWeb3Wrapper] 🔍 Fetching room info from API...');
    
    const response = await fetch(`/quiz/api/rooms/${roomId}/info`); // ✅ New public endpoint
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('[ConditionalWeb3Wrapper] ✅ Room info fetched:', data);
    
    setRoomType(data.isWeb3 ? 'web3' : 'web2');
    
  } catch (err: any) {
    console.warn('[ConditionalWeb3Wrapper] ⚠️ API fetch failed:', err.message);
    
    // ✅ Fallback: Check localStorage again
    try {
      const contractAddr = localStorage.getItem('current-contract-address');
      const storedRoomId = localStorage.getItem('current-room-id');
      
      if (contractAddr && storedRoomId === roomId) {
        console.log('[ConditionalWeb3Wrapper] ✅ Web3 room detected (fallback check)');
        setRoomType('web3');
      } else {
        console.log('[ConditionalWeb3Wrapper] ❌ Defaulting to Web2');
        setRoomType('web2');
      }
    } catch {
      console.error('[ConditionalWeb3Wrapper] ❌ All checks failed, defaulting to Web2');
      setRoomType('web2');
    }
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