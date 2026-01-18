import { lazy, Suspense, useEffect, useState } from 'react';
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import HostControlsCore from '../host-controls/components/HostControlsCore';

const Web3Provider = lazy(() =>
  import('../../../components/Web3Provider').then(m => ({ default: m.Web3Provider }))
);

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
      <p className="text-indigo-700 text-sm font-medium">Loading host controls...</p>
    </div>
  </div>
);

const HostControlsPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { config, hydrated, setFullConfig } = useQuizConfig();
  const { socket, connected } = useQuizSocket();
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // ✅ Load config from socket if not already hydrated
  useEffect(() => {
    if (!roomId || !socket || !connected) return;

    // If already hydrated, we're done
    if (hydrated) {
      setIsLoadingConfig(false);
      return;
    }

    console.log('[HostControlsPage] Loading config for room:', roomId);

    // Request config from socket
    const handleRoomState = (state: any) => {
      if (state?.config) {
        console.log('[HostControlsPage] Received config:', state.config);
        setFullConfig(state.config);
        setIsLoadingConfig(false);
      }
    };

    socket.on('room_state', handleRoomState);

    // Request the room state
    socket.emit('join_room_as_host', { roomId });

    return () => {
      socket.off('room_state', handleRoomState);
    };
  }, [roomId, socket, connected, hydrated, setFullConfig]);

  // ✅ Show loading while fetching config
  if (isLoadingConfig || !hydrated) {
    return <LoadingSpinner />;
  }

  const selectedChain = (() => {
    const c = config?.web3Chain;
    if (c === 'stellar' || c === 'evm' || c === 'solana') return c;
    return null;
  })();

  console.log('[HostControlsPage] Selected chain:', selectedChain);

  // ✅ For Solana/EVM/Stellar rooms, wrap with Web3Provider
  if (selectedChain === 'solana' || selectedChain === 'evm' || selectedChain === 'stellar') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <Web3Provider>
          <HostControlsCore />
        </Web3Provider>
      </Suspense>
    );
  }

  // ✅ For non-Web3 rooms, render without any provider
  return <HostControlsCore />;
};

export default HostControlsPage;


