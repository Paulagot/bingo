/**
 * Shared Solana hook for the Elimination program.
 * Mirrors useSolanaShared but loads the Elimination IDL and program ID.
 */
import { useMemo } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { PublicKey, Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import type { Idl } from '@coral-xyz/anchor';

import EliminationIDL from '../elimination_game.json';
import { getSolanaExplorerUrl, getSolanaRpcUrl, type SolanaNetworkKey } from '../config/networks';

export const ELIMINATION_PROGRAM_ID = new PublicKey(
  '27gprMMqQ3SKJ9bRAQFh2kkaP72GJEkVNaNm1HjEgqkM'
);

// PDA seeds — must match the Rust program exactly
export const ELIMINATION_SEEDS = {
  GLOBAL_CONFIG: 'global-config',
  ROOM: 'room',
  PLAYER_ENTRY: 'player-entry',
} as const;

export interface UseSolanaEliminationSharedParams {
  cluster?: SolanaNetworkKey;
}

export function useSolanaEliminationShared(
  params?: UseSolanaEliminationSharedParams
) {
  const cluster: SolanaNetworkKey = params?.cluster ?? 'mainnet';

  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');

  const connection = useMemo(() => {
    const rpcUrl = getSolanaRpcUrl(cluster);
    return new Connection(rpcUrl, 'confirmed');
  }, [cluster]);

  const publicKey = useMemo(() => {
    if (!address) return null;
    try {
      return new PublicKey(address);
    } catch {
      return null;
    }
  }, [address]);

  const walletAdapter = useMemo(() => {
    if (!walletProvider || !publicKey) return null;
    const provider = walletProvider as any;
    return {
      publicKey,
      signTransaction: (tx: any) => provider.signTransaction(tx),
      signAllTransactions: (txs: any[]) => provider.signAllTransactions(txs),
    };
  }, [walletProvider, publicKey]);

  const provider = useMemo(() => {
    if (!walletAdapter || !connection) return null;
    return new AnchorProvider(connection, walletAdapter as any, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
  }, [walletAdapter, connection]);

  const program = useMemo(() => {
    if (!provider) return null;
    try {
      return new Program(EliminationIDL as Idl, provider);
    } catch (err) {
      console.error('[EliminationShared] Failed to create program:', err);
      return null;
    }
  }, [provider]);

  const getTxExplorerUrl = (signature: string): string => {
    const base = getSolanaExplorerUrl(cluster);
    return cluster === 'mainnet'
      ? `${base}/tx/${signature}`
      : `${base}/tx/${signature}?cluster=${cluster}`;
  };

  console.log('[EliminationShared] cluster:', cluster);
console.log('[EliminationShared] rpc endpoint:', connection.rpcEndpoint);
console.log('[EliminationShared] program id:', program?.programId?.toBase58?.());

  return {
    publicKey,
    connection,
    provider,
    program,
    cluster,
    isConnected: isConnected && !!publicKey && !!program,
    getTxExplorerUrl,
  };
}