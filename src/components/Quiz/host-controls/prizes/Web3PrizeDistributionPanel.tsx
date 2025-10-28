// src/components/quiz/host-controls/prizes/Web3PrizeDistributionPanel.tsx
import * as React from 'react';
import { Loader } from 'lucide-react';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';

import { useQuizChainIntegration } from '../../../../hooks/useQuizChainIntegration';
import { useWalletActions } from '../../../../hooks/useWalletActions';
import { useContractActions } from '../../../../hooks/useContractActions';
import { getTgbNetworkLabel } from '../../../../chains/tgbNetworks';
import type { TgbNetwork } from '../../../../chains/tgbNetworks';

type LeaderboardEntry = { id: string; name: string; score: number };

interface Props {
  roomId: string;
  leaderboard: LeaderboardEntry[];
  // If you want, add: chainOverride?: SupportedChain;
}

type PrizeStatus = 'idle' | 'declaring' | 'winners_declared' | 'distributing' | 'success' | 'error' | 'connecting';

/**
 * Helper: Call TGB API to get charity deposit address
 * Returns: { ok: true, depositAddress: '0x...' } or { ok: false, error: '...' }
 */
async function getCharityDepositAddress(params: {
  organizationId: string;
  currency: string;
  network: TgbNetwork;
  amount?: string;
}): Promise<{ ok: boolean; depositAddress?: string; error?: string }> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch('/api/tgb/create-deposit-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json();

      if (!res.ok) {
        console.warn(`[TGB] Attempt ${attempt}/${MAX_RETRIES} failed:`, data.error);
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        return { ok: false, error: data.error || 'TGB API request failed' };
      }

      if (data.ok && data.depositAddress) {
        console.log('[TGB] Successfully generated deposit address:', data.depositAddress);
        return { ok: true, depositAddress: data.depositAddress };
      }

      return { ok: false, error: 'Invalid response from TGB API' };
    } catch (err: any) {
      console.error(`[TGB] Attempt ${attempt}/${MAX_RETRIES} error:`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      return { ok: false, error: err?.message || 'Network error' };
    }
  }

  return { ok: false, error: 'Max retries exceeded' };
}

export const Web3PrizeDistributionPanel: React.FC<Props> = ({ roomId }) => {
  const { socket } = useQuizSocket();

  // Chain label only (keep component agnostic)
  const { getChainDisplayName } = useQuizChainIntegration(/* { chainOverride } */);

  // Generic hooks (route by chain internally)
  const wallet = useWalletActions(/* { chainOverride } */);
  const { declareWinners, distributePrizes } = useContractActions(/* { chainOverride } */);

  // Room config for TGB integration
  const [roomConfig, setRoomConfig] = React.useState<{
    web3Chain?: string;
    web3Currency?: string;
    web3CharityOrgId?: string;
    web3CharityName?: string;
    web3PrizeSplit?: { charity: number; host: number; prizes: number };
    entryFee?: string;
  } | null>(null);

  // Persisted status per room to prevent double distribution and keep UI sticky
  const DIST_KEY = React.useMemo(() => `prizesDistributed:${roomId}`, [roomId]);

  const [state, setState] = React.useState<{ status: PrizeStatus; txHash?: string; error?: string; declareWinnersTxHash?: string }>({
    status: 'idle',
  });

  // Winner input management
  const [winnerInputs, setWinnerInputs] = React.useState<Array<{ address: string; playerId: string }>>([
    { address: '', playerId: 'winner1' },
  ]);

  const addWinnerInput = () => {
    if (winnerInputs.length < 10) {
      setWinnerInputs([...winnerInputs, { address: '', playerId: `winner${winnerInputs.length + 1}` }]);
    }
  };

  const removeWinnerInput = (index: number) => {
    if (winnerInputs.length > 1) {
      setWinnerInputs(winnerInputs.filter((_, i) => i !== index));
    }
  };

  const updateWinnerAddress = (index: number, address: string) => {
    const updated = [...winnerInputs];
    updated[index].address = address;
    setWinnerInputs(updated);
  };

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

  // Fetch room config for TGB integration
  React.useEffect(() => {
    if (!socket) return;

    const handleRoomConfig = (data: any) => {
      if (data.roomId === roomId) {
        setRoomConfig({
          web3Chain: data.web3Chain,
          web3Currency: data.web3Currency,
          web3CharityOrgId: data.web3CharityOrgId,
          web3CharityName: data.web3CharityName,
          web3PrizeSplit: data.web3PrizeSplit,
          entryFee: data.entryFee,
        });
      }
    };

    socket.emit('get_room_config', { roomId });
    socket.on('room_config', handleRoomConfig);

    return () => {
      socket.off('room_config', handleRoomConfig);
    };
  }, [socket, roomId]);

  // Step 1: Declare winners on-chain
  const handleDeclareWinners = async () => {
    if (state.status === 'success' || state.status === 'winners_declared') return;

    // Validate winner inputs
    const validWinners = winnerInputs.filter(w => w.address.trim().length > 0);
    if (validWinners.length === 0) {
      setState({ status: 'error', error: 'Please enter at least one winner address' });
      return;
    }

    // Connect wallet first
    if (!wallet.isConnected()) {
      setState({ status: 'connecting' });
      const res = await wallet.connect();
      if (!res.success) {
        setState({ status: 'error', error: res.error?.message || 'Failed to connect wallet' });
        return;
      }
    }

    setState({ status: 'declaring' });

    try {
      const result = await declareWinners({
        roomId,
        winners: validWinners.map((w, idx) => ({
          playerId: w.playerId,
          address: w.address.trim(),
          rank: idx + 1,
        })),
      });

      if (result.success) {
        setState({
          status: 'winners_declared',
          declareWinnersTxHash: result.txHash
        });
      } else {
        setState({ status: 'error', error: result.error || 'Failed to declare winners' });
      }
    } catch (error: any) {
      setState({ status: 'error', error: error.message || 'Failed to declare winners' });
    }
  };

  // Step 2: Distribute prizes (after winners declared)
  const handleDistributeClick = async () => {
    if (state.status === 'success') return; // hard guard

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
        // 🆕 TGB Integration: Generate charity deposit address if charity is configured
        let charityAddress: string | undefined;
        if (roomConfig?.web3CharityOrgId && roomConfig?.web3Chain && roomConfig?.web3Currency) {
          console.log('[TGB] Charity configured, generating deposit address...');

          // Calculate charity amount
          const entryFee = parseFloat(roomConfig.entryFee || '0');
          const charityPercent = roomConfig.web3PrizeSplit?.charity || 50;
          const charityAmount = (entryFee * data.winners.length * charityPercent / 100).toFixed(2);

          // Get TGB network label
          const tgbNetwork = getTgbNetworkLabel({
            web3Chain: roomConfig.web3Chain as 'evm' | 'stellar' | 'solana',
            evmTargetKey: roomConfig.web3Chain === 'evm' ? 'base' : undefined, // TODO: get from config
            solanaCluster: roomConfig.web3Chain === 'solana' ? 'devnet' : undefined,
          });

          const tgbResult = await getCharityDepositAddress({
            organizationId: roomConfig.web3CharityOrgId,
            currency: roomConfig.web3Currency,
            network: tgbNetwork,
            amount: charityAmount,
          });

          if (!tgbResult.ok) {
            // FAIL ENTIRE DISTRIBUTION if TGB fails (safer for charity payments)
            socket.emit('prize_distribution_completed', {
              roomId: data.roomId,
              success: false,
              error: `TGB API failed: ${tgbResult.error}. Cannot proceed without charity address.`,
            });
            setState({
              status: 'error',
              error: `Failed to generate charity address: ${tgbResult.error}`
            });
            return;
          }

          charityAddress = tgbResult.depositAddress;
          console.log('[TGB] Using charity address:', charityAddress);
        }

        // Build a generic winners payload for the hook (address per winner)
        // The hook will map this to the exact Soroban shape (string[] / struct) as needed.
        const winnersPayload = data.winners.map((addr, idx) => ({
          playerId: addr,     // we don't have playerId here; reuse addr (contract cares about address)
          address: addr,
          rank: idx + 1,
        }));

        const result = await distributePrizes({
          roomId: data.roomId,
          winners: winnersPayload,
          charityAddress, // 🆕 Pass TGB charity address to contract
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
  }, [socket, roomId, distributePrizes, DIST_KEY, roomConfig]);

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
              <div className="mb-6 rounded-xl border-2 border-purple-200 bg-purple-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-purple-900">Step 1: Declare Winners</h3>
                <p className="mb-4 text-sm text-purple-700">
                  Enter the wallet addresses of winners (1-10 winners). First address = 1st place.
                </p>

                <div className="space-y-3">
                  {winnerInputs.map((winner, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <span className="w-8 text-purple-700 font-semibold">#{index + 1}</span>
                      <input
                        type="text"
                        value={winner.address}
                        onChange={(e) => updateWinnerAddress(index, e.target.value)}
                        placeholder="Enter winner's wallet address"
                        className="flex-1 rounded-lg border-2 border-purple-300 px-4 py-2 focus:border-purple-500 focus:outline-none"
                      />
                      {winnerInputs.length > 1 && (
                        <button
                          onClick={() => removeWinnerInput(index)}
                          className="rounded-lg bg-red-500 px-3 py-2 text-white hover:bg-red-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-center space-x-3">
                  {winnerInputs.length < 10 && (
                    <button
                      onClick={addWinnerInput}
                      className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                    >
                      + Add Winner
                    </button>
                  )}
                  <button
                    onClick={handleDeclareWinners}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-8 py-3 text-lg font-bold text-white shadow-lg hover:scale-105"
                  >
                    🏆 Declare Winners On-Chain
                  </button>
                </div>
              </div>
            </>
          )}

          {state.status === 'declaring' && (
            <div className="mt-4 rounded-xl border-2 border-purple-200 bg-purple-50 p-6">
              <div className="flex items-center justify-center space-x-3 text-purple-700">
                <Loader className="h-6 w-6 animate-spin" />
                <span className="text-lg font-semibold">Declaring Winners On-Chain...</span>
              </div>
              <p className="mt-2 text-sm text-purple-600">
                Transaction is being processed. Please wait...
              </p>
            </div>
          )}

          {state.status === 'winners_declared' && (
            <>
              <div className="mb-6 rounded-xl border-2 border-green-200 bg-green-50 p-6">
                <div className="mb-3 text-center">
                  <div className="text-3xl">✅</div>
                  <h3 className="text-lg font-bold text-green-800">Winners Declared On-Chain!</h3>
                </div>
                {state.declareWinnersTxHash && (
                  <p className="text-center text-xs text-green-600">
                    Tx: <code className="bg-green-100 px-2 py-1 rounded">{state.declareWinnersTxHash.slice(0, 16)}...</code>
                  </p>
                )}
              </div>

              <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
                <h3 className="mb-4 text-xl font-bold text-blue-900">Step 2: Distribute Prizes</h3>
                <p className="mb-4 text-sm text-blue-700">
                  Now that winners are declared, distribute the prizes from the contract.
                </p>
                <button
                  onClick={handleDistributeClick}
                  className="mx-auto flex items-center space-x-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                >
                  <span>💰</span>
                  <span>Distribute Prizes via Smart Contract</span>
                </button>
              </div>
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
                <h3 className="text-xl font-bold text-red-800">
                  {state.declareWinnersTxHash ? 'Prize Distribution Failed' : 'Winner Declaration Failed'}
                </h3>
              </div>
              <p className="text-center text-sm text-red-600">Error: {state.error}</p>
              <div className="mt-4 text-center">
                <button
                  onClick={() => setState(state.declareWinnersTxHash
                    ? { status: 'winners_declared', declareWinnersTxHash: state.declareWinnersTxHash }
                    : { status: 'idle' }
                  )}
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


