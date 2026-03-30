/**
 * Orchestrates the host cancel flow:
 * 1. Sign host_cancel_room + host_refund_batch on-chain
 * 2. POST /api/elimination/rooms/:roomId/cancel-confirm to clean up server
 */
import { useState, useCallback } from 'react';
import { useChainWallet } from '../../../hooks/useChainWallet';
import { toChainConfig } from '../../../types/chainConfig';
import { useSolanaEliminationHostCancel } from '../../../chains/solana/hooks/useSolanaEliminationHostCancel';
import { getSocket } from '../services/eliminationSocket'  // adjust path

export type CancelState =
  | 'idle'
  | 'signing_cancel'
  | 'signing_refund'
  | 'confirming'
  | 'success'
  | 'error';

export interface UseEliminationHostCancelParams {
  roomId: string;
  hostId: string;
  roomData: {
    solanaCluster: 'devnet' | 'mainnet';
    feeMint: string;
    roomPda: string;
  };
  players: Array<{ walletAddress?: string | null }>;
  onCancelled?: () => void;
}

export function useEliminationHostCancel(params: UseEliminationHostCancelParams) {
  const { roomId, hostId, roomData, players, onCancelled } = params;

  const [cancelState, setCancelState] = useState<CancelState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [cancelTxHash, setCancelTxHash] = useState<string | null>(null);
  const [refundTxHash, setRefundTxHash] = useState<string | null>(null);

  const chainConfig = toChainConfig({
    web3Chain: 'solana',
    solanaCluster: roomData.solanaCluster,
  });

  const { isConnected, connect } = useChainWallet(chainConfig);
  const { cancelAndRefund } = useSolanaEliminationHostCancel(roomData.solanaCluster);

  const isWorking =
    cancelState === 'signing_cancel' ||
    cancelState === 'signing_refund' ||
    cancelState === 'confirming';

  const handleCancel = useCallback(async () => {
    if (isWorking || cancelState === 'success') return;
    setError(null);

    try {
      // Collect player wallet addresses — skip any without wallets
      const playerWallets = players
        .map(p => p.walletAddress)
        .filter((w): w is string => !!w);

      console.log('[useEliminationHostCancel] Players with wallets:', playerWallets.length, '/', players.length);

      if (playerWallets.length < players.length) {
        console.warn(
          '[useEliminationHostCancel]',
          players.length - playerWallets.length,
          'players have no wallet address — they may not be refundable on-chain'
        );
      }

      // ── Step 1: sign on-chain ─────────────────────────────────────────────
      setCancelState('signing_cancel');

      const result = await cancelAndRefund({
        roomPda: roomData.roomPda,
        feeMint: roomData.feeMint,
        playerWallets,
      });

      setCancelTxHash(result.cancelTxHash);
      setRefundTxHash(result.refundTxHash);

      // ── Step 2: notify server ─────────────────────────────────────────────
      setCancelState('confirming');

      const confirmRes = await fetch(
        `/api/elimination/rooms/${roomId}/cancel-confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostId,
            cancelTxHash: result.cancelTxHash,
            refundTxHash: result.refundTxHash,
          }),
        }
      );

      const confirmData = await confirmRes.json();
      if (!confirmData.success) {
        // On-chain already succeeded so don't throw — just log
        console.warn('[useEliminationHostCancel] Server confirm failed:', confirmData.error);
      }
      getSocket().emit('host_cancel_elimination_room', { roomId, hostId });

      setCancelState('success');
      console.log('[useEliminationHostCancel] ✅ Cancel complete');

      // Navigate after short delay so host sees success state
      setTimeout(() => {
        onCancelled?.();
      }, 2000);

    } catch (err: any) {
      console.error('[useEliminationHostCancel]', err);
      setError(err?.message ?? 'Cancel failed');
      setCancelState('error');
    }
  }, [isWorking, cancelState, players, roomId, hostId, roomData, cancelAndRefund, onCancelled]);

  return {
    cancelState,
    error,
    cancelTxHash,
    refundTxHash,
    isWorking,
    isConnected,
    connect,
    handleCancel,
  };
}