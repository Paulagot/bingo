// HostControlsPage.tsx
import * as React from 'react';
import { lazy, Suspense, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import HostControlsCore from '../host-controls/components/HostControlsCore';

const Web3Provider = lazy(() =>
  import('../../../components/Web3Provider').then((m) => ({ default: m.Web3Provider }))
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

  // ✅ Debug logging (optional)
  useEffect(() => {
    console.log('[HostControlsPage] Status:', {
      roomId,
      hasConfig: !!config,
      configRoomId: config?.roomId,
      hydrated,
      socketConnected: connected,
      socketId: socket?.id,
      web3Chain: config?.web3Chain,
    });
  }, [roomId, config?.roomId, config?.web3Chain, hydrated, connected, socket?.id]); // ✅ avoid depending on whole config object

  if (!roomId) return <LoadingSpinner />;

  // ✅ ALWAYS wrap. Web3Provider must be a NO-OP when web3Chain is not set.
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Web3Provider>
        <HostControlsCore />
      </Web3Provider>
    </Suspense>
  );
};

export default HostControlsPage;



