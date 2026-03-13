// src/components/Quiz/host-controls/prizes/Web3PrizeDistributionPanel.tsx
import * as React from 'react';
import { Loader } from 'lucide-react';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';
import { useContractActions } from '../../../../hooks/useContractActions';

import { useChainWallet } from '../../../../hooks/useChainWallet';
import { useQuizConfig } from '../../hooks/useQuizConfig';
import { toChainConfig } from '../../../../types/chainConfig';

type LeaderboardEntry = { id: string; name: string; score: number };
type PrizeRouterStatus = 'idle' | 'running' | 'success' | 'failed';

export type PrizeDistributionData = {
  charityName?: string | null;
  charityAmount?: string | null;
  confirmedCharityAmount?: string | null;
  charityCurrency?: string | null;
  charityWallet?: string | null;
  txHash?: string | null;
  network?: string | null;
  web3Chain?: string | null;
};

interface Props {
  roomId: string;
  leaderboard: LeaderboardEntry[];
  onStatusChange?: (s: PrizeRouterStatus, data?: PrizeDistributionData) => void;
}

type PrizeStatus = 'idle' | 'distributing' | 'success' | 'error' | 'connecting';

type InitiatePrizeDistributionPayload = {
  roomId: string;
  winners: string[];
  finalLeaderboard: any[];
  prizeMode?: string;
  web3Chain?: string;
  evmNetwork?: string;
  solanaNetwork?: string;
  roomAddress?: string;
  charityOrgId?: string;
  charityName?: string;
  charityAddress?: string;
  charityAmountPreview?: string;
  charityCurrency?: string;
};

export const Web3PrizeDistributionPanel: React.FC<Props> = ({
  roomId,
  onStatusChange,
}) => {
  const { socket } = useQuizSocket();
  const { config } = useQuizConfig();
const chainConfig = toChainConfig(config);
const wallet = useChainWallet(chainConfig);
const { distributePrizes } = useContractActions(chainConfig);

  const getChainDisplayName = () => {
    switch (wallet.chainFamily) {
      case 'evm': return 'EVM';
      case 'solana': return 'Solana';
      case 'stellar': return 'Stellar';
      default: return 'Wallet';
    }
  };

  const DIST_KEY = React.useMemo(() => `prizesDistributed:${roomId}`, [roomId]);

  const [state, setState] = React.useState<{
    status: PrizeStatus;
    txHash?: string;
    error?: string;
  }>({ status: 'idle' });

  // Stores latest charity data so error/retry paths can still reference it
  const charityPreviewRef = React.useRef<PrizeDistributionData | null>(null);

  const sentCompletionRef = React.useRef(false);
  React.useEffect(() => {
    sentCompletionRef.current = false;
  }, [roomId]);

  // ✅ Writes charityData to localStorage synchronously so it survives
  // React remounts before state/effects have a chance to flush
  const persistCharityData = React.useCallback(
    (data: PrizeDistributionData) => {
      if (!roomId) return;
      try {
        const key = `charityData:${roomId}`;
        const existing = localStorage.getItem(key);
        const prev = existing ? JSON.parse(existing) : {};
        localStorage.setItem(key, JSON.stringify({ ...prev, ...data }));
        console.log('💾 [Panel] Wrote charityData to localStorage:', key, data);
      } catch (e) {
        console.warn('⚠️ [Panel] Failed to write charityData to localStorage:', e);
      }
    },
    [roomId]
  );

  // ✅ Calls onStatusChange directly and synchronously — also persists to
  // localStorage immediately so data survives remounts
  const notifyParent = React.useCallback(
    (status: PrizeRouterStatus, data?: PrizeDistributionData) => {
      console.log('📣 [Panel] notifyParent:', status, data);

      if (data) {
        persistCharityData(data);
      }

      onStatusChange?.(status, data);
    },
    [onStatusChange, persistCharityData]
  );

  const emitCompletionOnce = React.useCallback(
    (payload: {
      roomId: string;
      success: boolean;
      txHash?: string;
      error?: string;
      charityAmount?: string | null;
      charityWallet?: string | null;
      charityName?: string | null;
      network?: string;
      web3Chain?: string;
    }) => {
      if (!socket) return;
      if (sentCompletionRef.current) {
        console.warn('⚠️ [Frontend] prize_distribution_completed already sent. Skipping.');
        return;
      }
      sentCompletionRef.current = true;
      console.log('📤 [Frontend] Emitting prize_distribution_completed ONCE:', payload);
      socket.emit('prize_distribution_completed', payload);
    },
    [socket]
  );

  // Restore UI state after refresh
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(DIST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { txHash?: string };
        if (parsed?.txHash) {
          setState({ status: 'success', txHash: parsed.txHash });
        }
      }
    } catch { /* ignore */ }
  }, [DIST_KEY]);

  const handleDistributeClick = async () => {
    if (state.status === 'success') return;

    if (!wallet.isConnected) {
      setState({ status: 'connecting' });
      notifyParent('running');
const res = await wallet.connect();
      if (!res.success) {
        const errorMsg = 'error' in res && res.error ? (typeof res.error === 'object' && 'message' in res.error ? (res.error as any).message : String(res.error)) : 'Failed to connect wallet';
        setState({ status: 'error', error: errorMsg });
        notifyParent('failed');
        return;
      }
    }

    setState({ status: 'distributing' });
    notifyParent('running');
    socket?.emit('end_quiz_and_distribute_prizes', { roomId });
  };

  React.useEffect(() => {
    if (!socket) return;

    const handlePrizeDistribution = async (data: InitiatePrizeDistributionPayload) => {
      if (!data || data.roomId !== roomId) return;

      console.log('🎯 [Frontend] Received initiate_prize_distribution:', data);

      // ✅ Build preview immediately and notify + persist synchronously
      const preview: PrizeDistributionData = {
        charityName: data.charityName || data.charityOrgId || null,
        charityAmount: data.charityAmountPreview || null,
        charityCurrency: data.charityCurrency || 'USDC',
        charityWallet: data.charityAddress || null,
      };
      charityPreviewRef.current = preview;
      notifyParent('running', preview);

      try {
        const winnersPayload = (data.winners || []).map((addr, idx) => ({
          playerId: addr,
          address: addr,
          rank: idx + 1,
        }));

        console.log('🏆 [Frontend] Calling distributePrizes with:', {
          roomId: data.roomId,
          winnersCount: winnersPayload.length,
          roomAddress: data.roomAddress,
          charityInfo: {
            orgId: data.charityOrgId,
            name: data.charityName,
            address: data.charityAddress,
            amountPreview: data.charityAmountPreview,
            currency: data.charityCurrency,
          },
          web3Chain: data.web3Chain,
          prizeMode: data.prizeMode,
        });

        const distributeParams: any = {
          roomId: data.roomId,
          winners: winnersPayload,
          roomAddress: data.roomAddress,
          prizeMode: data.prizeMode,
          charityOrgId: data.charityOrgId,
          charityName: data.charityName,
          charityAddress: data.charityAddress,
          web3Chain: data.web3Chain,
          evmNetwork: data.evmNetwork,
          charityAmountPreview: data.charityAmountPreview,
          charityCurrency: data.charityCurrency,
        };

        if (data.web3Chain === 'solana' && data.charityAddress) {
          distributeParams.charityWallet = data.charityAddress;
          console.log('🎯 [Frontend] Using provided charity wallet for Solana:', data.charityAddress);
        }

        const result = await distributePrizes(distributeParams);

        console.log('📊 [Frontend] distributePrizes result:', result);

        if (result && result.success) {
          const txHash = 'txHash' in result ? (result as any).txHash : undefined;
          if (!txHash) throw new Error('Success returned but no transaction hash provided');

          const charityAmount = 'charityAmount' in result ? (result as any).charityAmount : undefined;

          if (charityAmount) {
            console.log('💰 [Frontend] Charity amount from on-chain event:', charityAmount);
          } else {
            console.warn('⚠️ [Frontend] No charityAmount returned from chain parsing (will still proceed).');
          }

          const cleanupTxHash = 'cleanupTxHash' in result ? (result as any).cleanupTxHash : undefined;
          const rentReclaimed = 'rentReclaimed' in result ? (result as any).rentReclaimed : undefined;
          const cleanupError = 'error' in result && typeof (result as any).error === 'string'
            ? (result as any).error as string
            : undefined;

          if (cleanupTxHash) {
            console.log('✅ [Frontend] PDA closed and rent reclaimed:', cleanupTxHash);
            console.log(`💰 [Frontend] Rent reclaimed: ${rentReclaimed ? (rentReclaimed / 1e9).toFixed(4) : 'N/A'} SOL`);
          } else if (cleanupError?.includes('PDA cleanup failed')) {
            console.warn('⚠️ [Frontend] PDA cleanup failed:', cleanupError);
          }

          const tgbCharityWallet =
            ('tgbDepositAddress' in result ? (result as any).tgbDepositAddress : null) ||
            ('charityWallet' in result ? (result as any).charityWallet : null) ||
            null;

          if (tgbCharityWallet) {
            console.log('💰 [Frontend] TGB charity wallet from result:', tgbCharityWallet);
          } else {
            console.warn('⚠️ [Frontend] No TGB charity wallet returned by hook result (will fallback).');
          }

          const finalCharityWallet =
            tgbCharityWallet || data.charityAddress || distributeParams.charityWallet || null;

          const setupConfig = JSON.parse(localStorage.getItem('setupConfig') || '{}');
          let networkForBackend: string;
          let web3ChainForBackend: string;

          if (data.web3Chain === 'solana') {
            const cluster = data.solanaNetwork || setupConfig.solanaCluster || 'devnet';
            networkForBackend = cluster === 'testnet' ? 'devnet' : cluster;
            web3ChainForBackend = 'solana';
            console.log('🔍 [Solana Network Debug]:', {
              backendSolanaNetwork: data.solanaNetwork,
              localStorageCluster: setupConfig.solanaCluster,
              finalNetwork: networkForBackend,
            });
          } else if (data.web3Chain === 'evm') {
            networkForBackend = data.evmNetwork || setupConfig.evmNetwork || 'base-sepolia';
            web3ChainForBackend = 'evm';
          } else {
            networkForBackend = data.evmNetwork || setupConfig.evmNetwork || 'unknown';
            web3ChainForBackend = data.web3Chain || 'unknown';
          }

          // ✅ Build confirmed data and notify + persist synchronously before setState
          const confirmedData: PrizeDistributionData = {
            ...preview,
            confirmedCharityAmount: charityAmount ?? preview.charityAmount ?? null,
            charityWallet: finalCharityWallet,
            txHash,
            network: networkForBackend,
            web3Chain: web3ChainForBackend,
          };
          charityPreviewRef.current = confirmedData;
          notifyParent('success', confirmedData);

          console.log('📤 [Frontend] Sending prize_distribution_completed with:', {
            roomId: data.roomId,
            txHash,
            charityWallet: finalCharityWallet,
            charityName: data.charityName || null,
            charityAmount: charityAmount ?? null,
            network: networkForBackend,
            web3Chain: web3ChainForBackend,
          });

          emitCompletionOnce({
            roomId: data.roomId,
            success: true,
            txHash,
            charityAmount: charityAmount ?? null,
            charityWallet: finalCharityWallet,
            charityName: data.charityName || data.charityOrgId || null,
            network: networkForBackend,
            web3Chain: web3ChainForBackend,
          });

          const newState: { status: PrizeStatus; txHash?: string; error?: string } = {
            status: 'success',
            txHash,
          };
          if (cleanupError?.includes('PDA cleanup failed')) {
            newState.error = cleanupError;
          }
          setState(newState);

          try {
            localStorage.setItem(DIST_KEY, JSON.stringify({ txHash, cleanupTxHash, rentReclaimed }));
          } catch (err) {
            console.warn('Failed to save to localStorage:', err);
          }
        } else {
          const errorMsg =
            (result && 'error' in result ? (result as any).error : null) || 'Unknown error occurred';

          console.error('❌ [Frontend] Prize distribution failed:', errorMsg);

          emitCompletionOnce({
            roomId: data.roomId,
            success: false,
            error: errorMsg,
            charityWallet: data.charityAddress || null,
            charityName: data.charityName || data.charityOrgId || null,
          });

          notifyParent('failed', charityPreviewRef.current ?? undefined);
          setState({ status: 'error', error: errorMsg });
        }
      } catch (err: any) {
        console.error('❌ [Frontend] Exception during prize distribution:', err);

        const errorMessage = err?.message || 'Contract call failed';

        emitCompletionOnce({
          roomId: data.roomId,
          success: false,
          error: errorMessage,
          charityWallet: data.charityAddress || null,
          charityName: data.charityName || data.charityOrgId || null,
        });

        notifyParent('failed', charityPreviewRef.current ?? undefined);
        setState({ status: 'error', error: errorMessage });
      }
    };

    socket.on('initiate_prize_distribution', handlePrizeDistribution);
    return () => { socket.off('initiate_prize_distribution', handlePrizeDistribution); };
  }, [socket, roomId, distributePrizes, DIST_KEY, emitCompletionOnce, notifyParent]);

  const connected = wallet.isConnected;

  return (
    <div className="mt-6">
      {!connected && state.status !== 'connecting' && (
        <div className="mb-6 rounded-xl border-2 border-blue-200 bg-blue-50 p-6 text-center">
          <div className="mb-2 text-xl font-bold text-blue-800">
            Connect {getChainDisplayName()} Wallet
          </div>
          <p className="mb-4 text-blue-600">
            Connect your wallet to distribute prizes to winners
          </p>
          <button
            onClick={handleDistributeClick}
            className="mx-auto flex items-center space-x-3 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            <span>🔗</span>
            <span>Connect &amp; Start Distribution</span>
          </button>
        </div>
      )}

      {state.status === 'connecting' && (
        <div className="mt-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center justify-center space-x-3 text-blue-700">
            <Loader className="h-6 w-6 animate-spin" />
            <span className="text-lg font-semibold">
              Connecting {getChainDisplayName()} wallet…
            </span>
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
                  Prizes Distributed Successfully!
                </h3>
              </div>
              {state.txHash && (
                <div className="space-y-2 text-center">
                  <p className="text-sm text-green-600">
                    <strong>Distribution:</strong>{' '}
                    <code className="rounded bg-green-100 px-2 py-1">{state.txHash}</code>
                  </p>
                  {state.error?.includes('PDA cleanup failed') && (
                    <div className="mt-3 rounded-lg border-2 border-orange-200 bg-orange-50 p-3">
                      <p className="mb-1 text-sm font-semibold text-orange-800">
                        ⚠️ PDA Cleanup Failed
                      </p>
                      <p className="text-xs text-orange-700">{state.error}</p>
                      <p className="mt-2 text-xs italic text-orange-600">
                        The PDA was not closed automatically. You can manually close it to reclaim rent later.
                      </p>
                    </div>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-green-700">
                You can't distribute again for this room.
              </p>
            </div>
          )}

          {state.status === 'error' && (
            <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-6">
              <div className="mb-3 text-center">
                <div className="text-4xl">❌</div>
                <h3 className="text-xl font-bold text-red-800">
                  Prize Distribution Failed
                </h3>
              </div>
              <p className="text-center text-sm text-red-600">
                Error: {state.error ?? 'Unknown error'}
              </p>
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    sentCompletionRef.current = false;
                    setState({ status: 'idle' });
                  }}
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