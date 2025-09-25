// src/components/Quiz/host-controls/prizes/stellar/StellarPrizeDistributionPanel.tsx
import * as React from 'react';
import { Loader } from 'lucide-react';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';

import { useStellarWalletContext } from '../../../../../chains/stellar/StellarWalletProvider';
import { useQuizContract as useStellarQuizContract } from '../../../../../chains/stellar/useQuizContract';

type LeaderboardEntry = { id: string; name: string; score: number };

interface Props {
  roomId: string;
  leaderboard: LeaderboardEntry[];
}

type PrizeStatus = 'idle' | 'distributing' | 'success' | 'error';

export const StellarPrizeDistributionPanel: React.FC<Props> = ({ roomId }) => {
  const { socket } = useQuizSocket();

  // Stellar-only hooks
  const stellarWallet = useStellarWalletContext();
  const stellarContract = useStellarQuizContract();

  // Persisted status per room to prevent double distribution and keep UI sticky
  const DIST_KEY = React.useMemo(() => `prizesDistributed:${roomId}`, [roomId]);

  const [state, setState] = React.useState<{ status: PrizeStatus; txHash?: string; error?: string }>({
    status: 'idle',
  });

  // Hydrate from localStorage (if prizes were already distributed for this room)
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(DIST_KEY);
      if (saved) {
        const { txHash } = JSON.parse(saved);
        setState({ status: 'success', txHash });
      }
    } catch {
      // ignore JSON errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DIST_KEY]);

  const handleDistribute = () => {
    if (state.status === 'success') return; // hard guard
    setState({ status: 'distributing' });
    socket?.emit('end_quiz_and_distribute_prizes', { roomId });
  };

  React.useEffect(() => {
    if (!socket) return;

    const handlePrizeDistribution = async (data: {
      roomId: string;
      winners: string[];
      finalLeaderboard: any[];
      web3Chain?: string;
    }) => {
      try {
        if (!stellarContract) throw new Error('Contract not initialized');
        if (!stellarContract.endRoom) throw new Error('endRoom method not available');
        if (!stellarContract.isReady) throw new Error('Wallet not connected');

        const result = await stellarContract.endRoom({
          roomId: data.roomId,
          winners: data.winners,
        });

        if (result.success) {
          socket.emit('prize_distribution_completed', {
            roomId: data.roomId,
            success: true,
            txHash: result.txHash,
          });
          setState({ status: 'success', txHash: result.txHash });
          try {
            localStorage.setItem(DIST_KEY, JSON.stringify({ txHash: result.txHash }));
          } catch {
            // ignore storage write errors
          }
        } else {
          socket.emit('prize_distribution_completed', {
            roomId: data.roomId,
            success: false,
            error: result.error || 'Unknown error occurred',
          });
          setState({ status: 'error', error: result.error || 'Contract call failed' });
        }
      } catch (err: any) {
        socket.emit('prize_distribution_completed', {
          roomId: data.roomId,
          success: false,
          error: err?.message || 'Contract call failed',
        });
        setState({ status: 'error', error: err?.message || 'Contract call failed' });
      }
    };

    const handlePrizeDistributionCompleted = (data: {
      roomId: string;
      success: boolean;
      txHash?: string;
      error?: string;
    }) => {
      if (!data || data.roomId !== roomId) return;
      if (data.success) {
        setState({ status: 'success', txHash: data.txHash });
        try {
          localStorage.setItem(DIST_KEY, JSON.stringify({ txHash: data.txHash }));
        } catch {
          // ignore storage write errors
        }
      } else {
        setState({ status: 'error', error: data.error || 'Distribution failed' });
      }
    };

    socket.on('initiate_prize_distribution', handlePrizeDistribution);
    socket.on('prize_distribution_completed', handlePrizeDistributionCompleted);
    return () => {
      socket.off('initiate_prize_distribution', handlePrizeDistribution);
      socket.off('prize_distribution_completed', handlePrizeDistributionCompleted);
    };
  }, [socket, roomId, stellarContract, DIST_KEY]);

  const walletConnected = stellarWallet.wallet.isConnected;
  const connecting = stellarWallet.wallet.isConnecting;

  return (
    <div className="mt-6">
      {!walletConnected && (
        <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mb-2 text-xl font-bold text-blue-800">Connect Stellar Wallet</div>
          <p className="mb-4 text-blue-600">Connect your wallet to distribute prizes to winners</p>
          <button
            onClick={() => stellarWallet.connect()}
            disabled={connecting}
            className="mx-auto flex items-center space-x-3 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {connecting ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <span>🔗</span>
                <span>Connect Wallet</span>
              </>
            )}
          </button>
        </div>
      )}

      {walletConnected && stellarContract?.isReady && (
        <div className="text-center">
          {state.status === 'idle' && (
            <>
              <button
                onClick={handleDistribute}
                className="mx-auto flex items-center space-x-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                <span>🏆</span>
                <span>Distribute Prizes via Smart Contract</span>
              </button>
              <p className="mt-2 text-sm text-green-600">
                This will automatically send prizes to the top players using the blockchain
              </p>
            </>
          )}

          {state.status === 'distributing' && (
            <div className="mt-4 rounded-xl border-2 border-orange-200 bg-orange-50 p-6">
              <div className="flex items-center justify-center space-x-3 text-orange-700">
                <Loader className="h-6 w-6 animate-spin" />
                <span className="text-lg font-semibold">Distributing Prizes...</span>
              </div>
              <p className="mt-2 text-sm text-orange-600">
                Transaction is being processed on the blockchain. Please wait...
              </p>
            </div>
          )}

          {state.status === 'success' && (
            <div className="mt-4 rounded-xl border-2 border-green-200 bg-green-50 p-6">
              <div className="mb-3 text-center">
                <div className="text-4xl">✅</div>
                <h3 className="text-xl font-bold text-green-800">Prizes Distributed Successfully!</h3>
              </div>
              {state.txHash && (
                <p className="text-center text-sm text-green-600">
                  Transaction Hash: <code className="bg-green-100 px-2 py-1 rounded">{state.txHash}</code>
                </p>
              )}
              <p className="mt-2 text-xs text-green-700">You can’t distribute again for this room.</p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-6">
              <div className="mb-3 text-center">
                <div className="text-4xl">❌</div>
                <h3 className="text-xl font-bold text-red-800">Prize Distribution Failed</h3>
              </div>
              <p className="text-center text-sm text-red-600">Error: {state.error}</p>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setState({ status: 'idle' })}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

