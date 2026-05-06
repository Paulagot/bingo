// src/components/Quiz/game/OperatorPage.tsx
//
// The unauthenticated game-control page for the person with the mic.
// Accessed via /quiz/operate/:roomId?token=xyz
// No login required — the token is validated server-side on socket join.

import * as React from 'react';
import { lazy, Suspense } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useWakeLock } from '../hooks/useWakeLock';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import HostControlsCore from '../host-controls/components/HostControlsCore';

const Web3Provider = lazy(() =>
  import('../../../components/Web3Provider').then((m) => ({ default: m.Web3Provider }))
);

const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-300 border-t-purple-600" />
      <p className="text-purple-700 text-sm font-medium">Loading game controls...</p>
    </div>
  </div>
);

const InvalidToken = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="text-center max-w-md p-8">
      <div className="text-4xl mb-4">🔒</div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid operator link</h1>
      <p className="text-gray-500 text-sm">
        This link is missing a token. Ask the organiser to share the correct link from their dashboard.
      </p>
    </div>
  </div>
);

const OperatorPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { hydrated } = useQuizConfig();
  const { connected } = useQuizSocket();

  useWakeLock(!!roomId && !!token && hydrated && connected);

  if (!roomId || !token) return <InvalidToken />;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Web3Provider>
        {/* operatorToken is passed down so useHostRecovery includes it in join_and_recover */}
        <HostControlsCore operatorToken={token} />
      </Web3Provider>
    </Suspense>
  );
};

export default OperatorPage;