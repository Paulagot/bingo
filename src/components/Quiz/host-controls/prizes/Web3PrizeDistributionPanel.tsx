// src/components/quiz/host-controls/prizes/Web3PrizeDistributionPanel.tsx
import * as React from 'react';
import { Loader } from 'lucide-react';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';

import { useQuizChainIntegration } from '../../../../hooks/useQuizChainIntegration';
import { useWalletActions } from '../../../../hooks/useWalletActions';
import { useContractActions } from '../../../../hooks/useContractActions';

type LeaderboardEntry = { id: string; name: string; score: number };

interface Props {
  roomId: string;
  leaderboard: LeaderboardEntry[];
  // If you want, add: chainOverride?: SupportedChain;
}

type PrizeStatus = 'idle' | 'distributing' | 'success' | 'error' | 'connecting';

export const Web3PrizeDistributionPanel: React.FC<Props> = ({ roomId }) => {
  const { socket } = useQuizSocket();

  // Chain label only (keep component agnostic)
  const { getChainDisplayName } = useQuizChainIntegration(/* { chainOverride } */);

  // Generic hooks (route by chain internally)
  const wallet = useWalletActions(/* { chainOverride } */);
  const { distributePrizes } = useContractActions(/* { chainOverride } */);

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
  }, [DIST_KEY]);

  // Host clicks the button → ask server to finalize winners and send us addresses
  const handleDistributeClick = async () => {
    if (state.status === 'success') return; // hard guard

    // connect wallet first (generic)
    if (!wallet.isConnected()) {
      setState({ status: 'connecting' });
      const res = await wallet.connect();
      if (!res.success) {
        setState({ status: 'error', error: res.error?.message || 'Failed to connect wallet' });
        return;
      }
    }

    setState({ status: 'distributing' });
    socket?.emit('end_quiz_and_distribute_prizes', { roomId });
  };

  React.useEffect(() => {
    if (!socket) return;

    // Server tells us to perform on-chain payout and provides winners (addresses)
    const handlePrizeDistribution = async (data: {
      roomId: string;
      winners: string[];            // ⬅️ addresses array from backend
      finalLeaderboard: any[];
      web3Chain?: string;
    }) => {
      try {
        // Build a generic winners payload for the hook (address per winner)
        // The hook will map this to the exact Soroban shape (string[] / struct) as needed.
        const winnersPayload = data.winners.map((addr, idx) => ({
          playerId: addr,     // we don’t have playerId here; reuse addr (contract cares about address)
          address: addr,
          rank: idx + 1,
        }));

        const result = await distributePrizes({
          roomId: data.roomId,
          winners: winnersPayload,
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

    // Server confirms completion (useful if multiple hosts are watching)
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
  }, [socket, roomId, distributePrizes, DIST_KEY]);

  const connected = wallet.isConnected();

  return (
    <div className="mt-6">
      {!connected && state.status !== 'connecting' && (
        <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mb-2 text-xl font-bold text-blue-800">Connect {getChainDisplayName()} Wallet</div>
          <p className="mb-4 text-blue-600">Connect your wallet to distribute prizes to winners</p>
          <button
            onClick={handleDistributeClick}
            className="mx-auto flex items-center space-x-3 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            <span>🔗</span>
            <span>Connect & Start Distribution</span>
          </button>
        </div>
      )}

      {state.status === 'connecting' && (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center justify-center space-x-3 text-blue-700">
            <Loader className="h-6 w-6 animate-spin" />
            <span className="text-lg font-semibold">Connecting {getChainDisplayName()} wallet…</span>
          </div>
        </div>
      )}

      {connected && (
        <div className="text-center">
          {state.status === 'idle' && (
            <>
              <button
                onClick={handleDistributeClick}
                className="mx-auto flex items-center space-x-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
              >
                <span>🏆</span>
                <span>Distribute Prizes via Smart Contract</span>
              </button>
              <p className="mt-2 text-sm text-green-600">
                This will ask the server for the final winners and then execute an on-chain payout.
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


