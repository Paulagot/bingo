// HostControlsPage.tsx
import { lazy, Suspense, useEffect } from 'react';
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
      <p className="text-gray-500 text-xs mt-2">
        If this persists, please return to the dashboard and try again.
      </p>
    </div>
  </div>
);

const HostControlsPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { config, hydrated } = useQuizConfig();
  const { socket, connected } = useQuizSocket();

  // ✅ Debug logging (optional - remove in production)
  useEffect(() => {
    console.log('[HostControlsPage] Status:', {
      roomId,
      hasConfig: !!config,
      configRoomId: config?.roomId,
      hydrated,
      socketConnected: connected,
      socketId: socket?.id,
    });
  }, [roomId, config, hydrated, connected, socket?.id]);

  // ✅ ONLY check for roomId from URL
  if (!roomId) {
    return <LoadingSpinner />;
  }

  // ✅ REMOVE the hydrated check
  // ✅ REMOVE the config.roomId check
  // Let HostControlsCore and useHostRecovery handle loading the config!

  // ✅ Determine if Web3 room (for provider wrapping)
  const selectedChain = (() => {
    const c = config?.web3Chain;
    if (c === 'stellar' || c === 'evm' || c === 'solana') return c;
    return null;
  })();

  console.log('[HostControlsPage] Rendering controls for room:', roomId, 'chain:', selectedChain || 'web2');

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

  // ✅ For Web2 rooms, render without provider
  return <HostControlsCore />;
};

export default HostControlsPage;


