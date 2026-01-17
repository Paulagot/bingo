import { lazy, Suspense } from 'react';
import * as React from 'react';
import { useQuizConfig } from '../hooks/useQuizConfig';
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
  const { config } = useQuizConfig();

  // ✅ REMOVED the early return - let HostControlsCore handle its own loading state
  
  const selectedChain = (() => {
    const c = config?.web3Chain;
    if (c === 'stellar' || c === 'evm' || c === 'solana') return c;
    return null;
  })();

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


