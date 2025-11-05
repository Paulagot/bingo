// src/components/quiz/host-controls/prizes/Web3PrizeDistributionPanel.tsx
import * as React from 'react';
import { Loader } from 'lucide-react';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';

import { useQuizChainIntegration } from '../../../../hooks/useQuizChainIntegration';
import { useWalletActions } from '../../../../hooks/useWalletActions';
import { useContractActions } from '../../../../hooks/useContractActions';

type LeaderboardEntry = { id: string; name: string; score: number };

type PrizeRouterStatus = 'idle' | 'running' | 'success' | 'failed';

interface Props {
  roomId: string;
  leaderboard: LeaderboardEntry[];
  onStatusChange?: (s: PrizeRouterStatus) => void;
}

type PrizeStatus = 'idle' | 'distributing' | 'success' | 'error' | 'connecting';

export const Web3PrizeDistributionPanel: React.FC<Props> = ({ 
  roomId,
  onStatusChange 
}) => {
  const { socket } = useQuizSocket();

  // Chain label only (keep component agnostic)
  const { getChainDisplayName } = useQuizChainIntegration();

  // Generic hooks (route by chain internally)
  const wallet = useWalletActions();
  const { distributePrizes } = useContractActions();

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

  // Call onStatusChange whenever status changes
  React.useEffect(() => {
    if (!onStatusChange) return;
    
    // Map internal status to router status
    const routerStatus: PrizeRouterStatus = 
      state.status === 'distributing' || state.status === 'connecting' ? 'running' :
      state.status === 'success' ? 'success' :
      state.status === 'error' ? 'failed' :
      'idle';
    
    onStatusChange(routerStatus);
  }, [state.status, onStatusChange]);

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

  // Socket listeners for prize distribution
  React.useEffect(() => {
    if (!socket) return;

    // Server tells us to perform on-chain payout and provides winners (addresses)
  const handlePrizeDistribution = async (data: {
  roomId: string;
  winners: string[];
  finalLeaderboard: any[];
  web3Chain?: string;
  evmNetwork?: string;
  roomAddress?: string;
  charityOrgId?: string;        // ✅ ADD
  charityName?: string;          // ✅ ADD
  charityAddress?: string;       // ✅ ADD
}) => {
  console.log('🎯 [Frontend] Received initiate_prize_distribution:', data);
  
  try {
    // Map winners to the format expected by distributePrizes
    const winnersPayload = data.winners.map((addr, idx) => ({
      playerId: addr, // Using address as playerId for now
      address: addr,
      rank: idx + 1,
    }));

    console.log('🏆 [Frontend] Calling distributePrizes with:', {
      roomId: data.roomId,
      winnersCount: winnersPayload.length,
      roomAddress: data.roomAddress,
      charityInfo: {                          // ✅ ADD
        orgId: data.charityOrgId,             // ✅ ADD
        name: data.charityName,               // ✅ ADD
        address: data.charityAddress,         // ✅ ADD
      },
    });

    // Call the contract action
    const result = await distributePrizes({
      roomId: data.roomId,
      winners: winnersPayload,
      roomAddress: data.roomAddress,
      charityOrgId: data.charityOrgId,       // ✅ ADD
      charityName: data.charityName,         // ✅ ADD
      charityAddress: data.charityAddress,
       web3Chain: data.web3Chain,     // 👈 add
  evmNetwork: data.evmNetwork,   // ✅ ADD
    });

        console.log('📊 [Frontend] distributePrizes result:', result);

        // Type-safe success check
        if (result.success) {
          // TypeScript now knows result has txHash
          const txHash = 'txHash' in result ? result.txHash : undefined;
          
          if (!txHash) {
            throw new Error('Success returned but no transaction hash provided');
          }

          console.log('✅ [Frontend] Prize distribution successful:', txHash);

          // Check if PDA cleanup (rent reclamation) succeeded
          const cleanupTxHash = 'cleanupTxHash' in result ? result.cleanupTxHash : undefined;
          const rentReclaimed = 'rentReclaimed' in result ? result.rentReclaimed : undefined;
          const cleanupError = 'error' in result && result.error?.includes('PDA cleanup failed') ? result.error : undefined;

          if (cleanupTxHash) {
            console.log('✅ [Frontend] PDA closed and rent reclaimed:', cleanupTxHash);
            console.log(`💰 [Frontend] Rent reclaimed: ${rentReclaimed ? (rentReclaimed / 1e9).toFixed(4) : 'N/A'} SOL`);
          } else if (cleanupError) {
            console.warn('⚠️ [Frontend] Prize distribution succeeded but PDA cleanup failed:', cleanupError);
          }

          // Notify backend of success
          socket.emit('prize_distribution_completed', {
            roomId: data.roomId,
            success: true,
            txHash: txHash,
          });

          // Update UI state - include cleanup info if available
          setState({ 
            status: 'success', 
            txHash: txHash,
            error: cleanupError, // Show cleanup warning if present
          });

          // Persist to localStorage
          try {
            localStorage.setItem(DIST_KEY, JSON.stringify({ 
              txHash: txHash,
              cleanupTxHash: cleanupTxHash,
              rentReclaimed: rentReclaimed,
            }));
          } catch (err) {
            console.warn('Failed to save to localStorage:', err);
          }
        } else {
          // Handle failure case
          const errorMsg = 'error' in result ? result.error : 'Unknown error occurred';

          // Check if this is a Solana pool room (not supported for on-chain distribution)
          if (errorMsg.includes('only available for Asset Rooms')) {
            console.log('ℹ️ [Frontend] Solana pool room - manual distribution required');

            // For Solana pool rooms, just mark as success and show info message
            socket.emit('prize_distribution_completed', {
              roomId: data.roomId,
              success: true,
              txHash: 'manual-distribution-required',
            });

            setState({
              status: 'success',
              txHash: 'manual-distribution-required',
              error: 'Pool room: Winners displayed above. Host should distribute prizes manually.'
            });
          } else {
            console.error('❌ [Frontend] Prize distribution failed:', errorMsg);

            socket.emit('prize_distribution_completed', {
              roomId: data.roomId,
              success: false,
              error: errorMsg,
            });

            setState({ status: 'error', error: errorMsg });
          }
        }
      } catch (err: any) {
        console.error('❌ [Frontend] Exception during prize distribution:', err);
        
        const errorMessage = err?.message || 'Contract call failed';
        
        socket.emit('prize_distribution_completed', {
          roomId: data.roomId,
          success: false,
          error: errorMessage,
        });

        setState({ status: 'error', error: errorMessage });
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
      
      console.log('📢 [Frontend] Received prize_distribution_completed:', data);
      
      if (data.success && data.txHash) {
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
                <h3 className="text-xl font-bold text-green-800">
                  {state.txHash === 'manual-distribution-required'
                    ? 'Quiz Complete - Manual Distribution Required'
                    : 'Prizes Distributed Successfully!'}
                </h3>
              </div>
              {state.txHash === 'manual-distribution-required' ? (
                <div className="text-center">
                  <p className="text-sm text-green-700 mb-2">
                    This is a <strong>Pool Room</strong> (entry fee based).
                  </p>
                  <p className="text-sm text-green-600">
                    Winners are displayed above. As the host, please distribute prizes manually to the winners.
                  </p>
                  <p className="mt-2 text-xs text-green-600 italic">
                    Note: Asset rooms support automatic on-chain distribution.
                  </p>
                </div>
              ) : state.txHash ? (
                <div className="text-center space-y-2">
                  <p className="text-sm text-green-600">
                    <strong>Distribution:</strong> <code className="bg-green-100 px-2 py-1 rounded">{state.txHash}</code>
                  </p>
                  {state.error && state.error.includes('PDA cleanup failed') && (
                    <div className="mt-3 rounded-lg border-2 border-orange-200 bg-orange-50 p-3">
                      <p className="text-sm text-orange-800 font-semibold mb-1">⚠️ PDA Cleanup Failed</p>
                      <p className="text-xs text-orange-700">{state.error}</p>
                      <p className="text-xs text-orange-600 mt-2 italic">
                        The PDA was not closed automatically. You can manually close it to reclaim rent later.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-green-700">You can't distribute again for this room.</p>
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
