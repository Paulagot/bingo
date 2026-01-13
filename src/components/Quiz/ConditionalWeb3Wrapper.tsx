// src/components/ConditionalWeb3Wrapper.tsx

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Web3Provider } from '../Web3Provider';
import {  quizApi } from '@shared/api';


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
  const { roomId } = useParams<{ roomId: string }>();
  const [roomType, setRoomType] = useState<'web2' | 'web3' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      setRoomType('web2'); // Default to web2 if no roomId
      return;
    }

    const checkRoomType = async () => {
      try {
        console.log('[ConditionalWeb3Wrapper] Checking room type for:', roomId);
        
        // ✅ Use the correct API method
        const roomData = await quizApi.getWeb2Room(roomId);
        
        // Parse config if it's a string
        let config = roomData.config;
        if (typeof config === 'string') {
          config = JSON.parse(config);
        }
        
        const paymentMethod = config?.paymentMethod;
        const isWeb3 = paymentMethod === 'web3';
        
        console.log('[ConditionalWeb3Wrapper] Payment method:', paymentMethod);
        console.log('[ConditionalWeb3Wrapper] Is Web3:', isWeb3);
        
        setRoomType(isWeb3 ? 'web3' : 'web2');
      } catch (err: any) {
        console.error('[ConditionalWeb3Wrapper] Error checking room type:', err);
        // Default to web2 on error to avoid blocking access
        setRoomType('web2');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkRoomType();
  }, [roomId]);

  if (loading) {
    return <LoadingFallback />;
  }

  if (error) {
    console.warn('[ConditionalWeb3Wrapper] Error detected, defaulting to Web2 mode:', error);
  }

  // ✅ Only wrap in Web3Provider if it's a Web3 room
  if (roomType === 'web3') {
    console.log('[ConditionalWeb3Wrapper] Initializing Web3Provider for Web3 room');
    return <Web3Provider>{children}</Web3Provider>;
  }

  // ✅ For Web2 rooms, render children directly without Web3
  console.log('[ConditionalWeb3Wrapper] Skipping Web3Provider for Web2 room');
  return <>{children}</>;
};