/**
 * Orchestrates the full finalize flow:
 * 1. POST /finalize-prepare → get charity wallet from TGB + all account addresses
 * 2. Call finalize_game on-chain (host signs)
 * 3. POST /finalize-confirm → server verifies and marks room settled
 * 4. Call close_room on-chain → reclaim rent to platform (non-critical)
 * 5. POST /finalize-complete → mark full finalize workflow complete on backend
 */
import { useState, useCallback } from 'react';
import { useChainWallet } from '../../../hooks/useChainWallet';
import { toChainConfig } from '../../../types/chainConfig';
import { useSolanaEliminationFinalize } from '../../../chains/solana/hooks/useSolanaEliminationFinalize';
import { useSolanaEliminationCloseRoom } from '../../../chains/solana/hooks/useSolanaEliminationCloseRoom';
import { getTokenByMint } from '../../../chains/solana/config/solanaTokenConfig';

export type FinalizeState =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'confirming'
  | 'closing'
  | 'success'
  | 'error';

export interface UseEliminationFinalizeParams {
  roomId: string;
  hostId: string;
  winnerPlayerId: string;
  onComplete?: () => void;
  roomData: {
    solanaCluster: 'devnet' | 'mainnet';
    feeMint: string;
    entryFee: number;
    onChainRoomId: string;
    roomPda: string;
    charityOrgId: number | null;
    totalPlayers: number;
  };
}

export function useEliminationFinalize(params: UseEliminationFinalizeParams) {
  const { roomId, hostId, winnerPlayerId, roomData, onComplete } = params;

  const [state, setState] = useState<FinalizeState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);

  const chainConfig = toChainConfig({
    web3Chain: 'solana',
    solanaCluster: roomData.solanaCluster,
  });

  const { isConnected, connect } = useChainWallet(chainConfig);
  const { finalizeGame } = useSolanaEliminationFinalize(roomData.solanaCluster);
  const { closeRoom } = useSolanaEliminationCloseRoom(roomData.solanaCluster);

  const canFinalize =
    isConnected &&
    (state === 'idle' || state === 'error');

  const handleFinalize = useCallback(async () => {
    if (!canFinalize) return;
    setError(null);

    try {
      setState('preparing');

      const tokenConfig = getTokenByMint(roomData.feeMint);
      const decimals = tokenConfig?.decimals ?? 6;
      const totalPoolRaw = roomData.totalPlayers * roomData.entryFee;
      const charityRaw = Math.floor(totalPoolRaw * 0.35);
      const charityDisplay = (charityRaw / Math.pow(10, decimals)).toFixed(6);
      const tokenCode = tokenConfig?.code ?? 'USDC';

      const prepareRes = await fetch(`/api/elimination/rooms/${roomId}/finalize-prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId,
          winnerPlayerId,
          tokenCode,
          charityDisplayAmount: charityDisplay,
        }),
      });

      const prepareData = await prepareRes.json();
      if (!prepareData.success) {
        throw new Error(prepareData.error ?? 'Failed to prepare finalize');
      }

      setState('signing');

      const result = await finalizeGame({
        onChainRoomId: roomData.onChainRoomId,
        roomPda: prepareData.roomPda,
        feeMint: prepareData.feeMint,
        winnerWallet: prepareData.winnerWallet,
        charityWallet: prepareData.charityWallet,
      });

      setTxHash(result.txHash);
      setExplorerUrl(result.explorerUrl);

      setState('confirming');

      const confirmRes = await fetch(`/api/elimination/rooms/${roomId}/finalize-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId,
          txSignature: result.txHash,
          tokenCode,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmData.success) {
        throw new Error(confirmData.error ?? 'Failed to confirm finalize');
      }

      setState('closing');

      let closeAttempted = false;
      let closeSucceeded = false;
      let closeTxHash: string | null = null;

      try {
        closeAttempted = true;

        const closeResult = await closeRoom({
          roomPda: roomData.roomPda,
          feeMint: roomData.feeMint,
        });

        closeSucceeded = true;
        closeTxHash = closeResult.txHash;

        console.log('[useEliminationFinalize] ✅ Room closed:', closeTxHash);
      } catch (closeErr: any) {
        console.warn(
          '[useEliminationFinalize] close_room failed (non-critical):',
          closeErr.message
        );
      }

      const finalizeCompleteRes = await fetch(
        `/api/elimination/rooms/${roomId}/finalize-complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hostId,
            closeTxHash,
            closeAttempted,
            closeSucceeded,
          }),
        }
      );

      const finalizeCompleteData = await finalizeCompleteRes.json();
      if (!finalizeCompleteData.success) {
        throw new Error(finalizeCompleteData.error ?? 'Failed to mark finalize workflow complete');
      }

      setState('success');
      console.log('[useEliminationFinalize] ✅ Complete:', result.txHash);
      onComplete?.();
    } catch (err: any) {
      console.error('[useEliminationFinalize]', err);
      setError(err?.message ?? 'Finalize failed');
      setState('error');
    }
  }, [canFinalize, roomId, hostId, winnerPlayerId, roomData, finalizeGame, closeRoom, onComplete]);

  return {
    state,
    error,
    txHash,
    explorerUrl,
    canFinalize,
    isWorking:
      state === 'preparing' ||
      state === 'signing' ||
      state === 'confirming' ||
      state === 'closing',
    isConnected,
    connect,
    handleFinalize,
  };
}