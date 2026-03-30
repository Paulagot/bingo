/**
 * Contract actions for the Elimination game.
 * Mirrors useContractActions but uses Elimination-specific hooks.
 */
import { useCallback } from 'react';
import { useChainWallet } from './useChainWallet';
import type { ChainConfig } from '../types/chainConfig';
import { useSolanaEliminationCreateRoom } from '../chains/solana/hooks/useSolanaEliminationCreateRoom';
import type { SolanaTokenCode } from '../chains/solana/config/solanaTokenConfig';
import type { SolanaNetworkKey } from '../chains/solana/config/networks';

export type EliminationDeployParams = {
  roomId: string;
  currency: string;
  entryFee: string | number;
  cluster?: SolanaNetworkKey;
};

export type EliminationDeployResult = {
  success: true;
  contractAddress: string;   // room PDA
  txHash: string;
  explorerUrl?: string;
};

export function useEliminationContractActions(chainConfig: ChainConfig) {
  const { chainFamily } = useChainWallet(chainConfig);

  const cluster = (chainConfig as any).solanaCluster as SolanaNetworkKey ?? 'devnet';
  const { createRoom: solanaCreateRoom } = useSolanaEliminationCreateRoom(cluster);

  const deploy = useCallback(
    async (params: EliminationDeployParams): Promise<EliminationDeployResult> => {
      console.log('[useEliminationContractActions][deploy] chain:', chainFamily, params);

      if (chainFamily === 'solana') {
        const result = await solanaCreateRoom({
          roomId: params.roomId,
          currency: (params.currency ?? 'USDC').toUpperCase() as SolanaTokenCode,
          entryFee: parseFloat(String(params.entryFee ?? '1.0')),
          cluster,
        });

        return {
          success: true,
          contractAddress: result.contractAddress,
          txHash: result.txHash,
          explorerUrl: result.explorerUrl,
        };
      }

      // EVM — placeholder for when you add EVM elimination
      throw new Error(`Elimination deploy not yet implemented for ${chainFamily}`);
    },
    [chainFamily, solanaCreateRoom, cluster]
  );

  return { deploy };
}