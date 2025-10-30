// src/hooks/useContractActions.ts
import { useCallback, useMemo } from 'react';
import { useQuizChainIntegration } from './useQuizChainIntegration';

import { useStellarWalletContext } from '../chains/stellar/StellarWalletProvider';
import { useQuizContract as useStellarQuizContract } from '../chains/stellar/useQuizContract';
import { useSolanaWalletContext } from '../chains/solana/SolanaWalletProvider';
import { useSolanaContract } from '../chains/solana/useSolanaContract';
import { BN } from '@coral-xyz/anchor';
import { type PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

import type { SupportedChain } from '../chains/types';

/** ---------- Types ---------- */
export type DeployParams = {
  roomId: string;
  hostId: string;
  currency?: string;
  entryFee?: string | number;
  hostFeePct?: number;

  prizeMode?: 'split' | 'assets';
  charityName?: string;

  // split / pool mode
  prizePoolPct?: number;
  prizeSplits?: { first: number; second?: number; third?: number };

  // asset mode
  expectedPrizes?: Array<{ tokenAddress: string; amount: string }>;

  // meta
  hostWallet: string;
  hostMetadata?: {
    hostName?: string;
    eventDateTime?: string;
    totalRounds?: number;
  };
};

export type DeployResult = {
  success: true;
  contractAddress: string;
  txHash: string;
  explorerUrl?: string;
};

type JoinArgs = {
  /** Room being joined */
  roomId: string;
  /** Optional extras total (display units / string) */
  extrasAmount?: string;
};

type JoinResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type DistributeArgs = {
  roomId: string;
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
    amount?: string;
  }>;
};

type DistributeResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type DeclareWinnersArgs = {
  roomId: string;
  winners: Array<{
    playerId: string;
    address?: string | null;
    rank?: number;
  }>;
};

type DeclareWinnersResult =
  | { success: true; txHash: string }
  | { success: false; error: string };

type Options = { chainOverride?: SupportedChain | null };

/** ---------- Safe stubs when provider isn’t mounted ---------- */
const STELLAR_WALLET_STUB = {
  isConnected: false,
  isConnecting: false,
  isDisconnecting: false,
  address: null as string | null,
  networkPassphrase: undefined as string | undefined,
};

const STELLAR_CTX_STUB = {
  wallet: STELLAR_WALLET_STUB,
  currentNetwork: 'public' as 'public' | 'testnet',
  connect: async () => ({
    success: false as const,
    address: null,
    error: {
      code: 'NO_PROVIDER' as any,
      message: 'Stellar wallet provider not mounted',
      timestamp: new Date(),
    },
  }),
  disconnect: async () => {},
  formatAddress: (addr?: string | null) =>
    !addr ? '' : addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr,
};

/** ---------- Hook ---------- */
export function useContractActions(opts?: Options) {
  // Room-driven override takes priority over store
  const { selectedChain } = useQuizChainIntegration({ chainOverride: opts?.chainOverride });
  const effectiveChain = (opts?.chainOverride ?? selectedChain) as SupportedChain | null;

  // Try to read Stellar contexts; fall back to stubs if not mounted
  let stellarCtx = STELLAR_CTX_STUB;
  try {
    stellarCtx = useStellarWalletContext() as typeof STELLAR_CTX_STUB;
  } catch {
    // keep stub
  }

  let stellarContract: ReturnType<typeof useStellarQuizContract> | null = null;
  try {
    stellarContract = useStellarQuizContract() as any;
  } catch {
    stellarContract = null;
  }

  // Try to read Solana contexts
  let solanaCtx: ReturnType<typeof useSolanaWalletContext> | null = null;
  try {
    solanaCtx = useSolanaWalletContext();
  } catch {
    // Solana provider not mounted
  }

  let solanaContract: ReturnType<typeof useSolanaContract> | null = null;
  try {
    solanaContract = useSolanaContract();
  } catch {
    // Solana contract not available
  }

  /** Resolve host/player address for current chain */
  const getHostAddress = useCallback(
    (fallback: string) => {
      switch (effectiveChain) {
        case 'stellar':
          return stellarCtx.wallet.address ?? '';
        case 'solana':
          return solanaCtx?.wallet.address ?? '';
        // case 'evm': return evmCtx.address ?? '';
        default:
          return fallback;
      }
    },
    [effectiveChain, stellarCtx.wallet.address, solanaCtx?.wallet.address]
  );

  /** ---------------- Player: joinRoom ---------------- */
  const joinRoom = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async ({ roomId, extrasAmount }: JoinArgs): Promise<JoinResult> => {
        if (!stellarContract?.joinRoom) {
          return { success: false, error: 'Stellar contract not ready' };
        }
        // Wallet/contract guards (narrow to string)
        const playerAddressMaybe =
          (stellarContract as any).walletAddress as string | undefined;
        if (!playerAddressMaybe || playerAddressMaybe.length === 0) {
          return { success: false, error: 'Stellar wallet not connected' };
        }
        const playerAddress: string = playerAddressMaybe;

        const res = await stellarContract.joinRoom({
          roomId,
          playerAddress,
          extrasAmount, // optional
        });

        if (!res?.success) {
          return { success: false, error: res?.error || 'Payment failed' };
        }

        // Normalize transaction hash
        const txHashRaw =
          (res as any).txHash ??
          (res as any).transactionHash ??
          (res as any).hash;

        if (typeof txHashRaw !== 'string' || txHashRaw.length === 0) {
          return { success: false, error: 'Payment succeeded but no transaction hash was returned' };
        }

        const txHash: string = txHashRaw;
        return { success: true, txHash };
      };
    }

    if (effectiveChain === 'solana') {
      return async ({ roomId }: JoinArgs): Promise<JoinResult> => {
        console.log('🔵 [Solana Join] START - roomId:', roomId, 'length:', roomId.length);

        if (!solanaContract || !solanaContract.isReady) {
          return { success: false, error: 'Solana contract not ready' };
        }
        if (!solanaCtx?.wallet.address) {
          return { success: false, error: 'Solana wallet not connected' };
        }

        try {
          const { PublicKey } = await import('@solana/web3.js');
          const NATIVE_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

          // Query all rooms on-chain to find the one with matching roomId
          // The host pubkey is stored in the room account
          console.log('[Solana Join] Fetching room account for roomId:', roomId);

          if (!solanaContract.program) {
            return { success: false, error: 'Solana program not available' };
          }

          // Fetch all room accounts and find the one with matching roomId
          const rooms = await solanaContract.program.account.room.all();
          console.log(`[Solana Join] Found ${rooms.length} total rooms on-chain`);

          const matchingRoom = rooms.find((r: any) => r.account.roomId === roomId);

          if (!matchingRoom) {
            console.error('[Solana Join] Room not found. Available rooms:');
            rooms.forEach((r: any) => {
              console.error(`  - Room ID: "${r.account.roomId}" (length: ${r.account.roomId.length})`);
            });
            return { success: false, error: `Room "${roomId}" not found on-chain` };
          }

          const hostPubkey = matchingRoom.account.host;
          const actualRoomPDA = matchingRoom.publicKey;

          console.log('[Solana Join] Found room host:', hostPubkey.toBase58());
          console.log('[Solana Join] Actual room PDA from chain:', actualRoomPDA.toBase58());
          console.log('[Solana Join] Room ID:', roomId, 'Length:', roomId.length);
          console.log('[Solana Join] Room ID bytes:', Buffer.from(roomId).toString('hex'));
          console.log('[Solana Join] Stored room ID bytes:', Buffer.from(matchingRoom.account.roomId).toString('hex'));

          // Verify PDA derivation matches
          const { PublicKey: PK } = await import('@solana/web3.js');
          const [derivedRoomPDA] = PK.findProgramAddressSync(
            [
              Buffer.from('room'),
              hostPubkey.toBuffer(),
              Buffer.from(roomId)
            ],
            solanaContract.program.programId
          );

          console.log('[Solana Join] Derived room PDA:', derivedRoomPDA.toBase58());
          const pdaMatch = derivedRoomPDA.equals(actualRoomPDA);
          console.log('[Solana Join] PDA Match:', pdaMatch);

          if (!pdaMatch) {
            console.error('[Solana Join] PDA MISMATCH! This will cause error 3012');
            console.error('[Solana Join] Using actualRoomPDA from chain instead of derived PDA');
          }

          // CRITICAL: Solana program requires roomId ≤ 32 chars
          if (roomId.length > 32) {
            return {
              success: false,
              error: `Room ID too long (${roomId.length} chars, max 32). Room ID: "${roomId}"`
            };
          }

          // Use the ACTUAL room PDA from the chain query, not the derived one
          // This ensures we're passing the correct PDA that matches what's on-chain
          const res = await solanaContract.joinRoom({
            roomId,
            hostPubkey,
            feeTokenMint: NATIVE_SOL_MINT,
            extrasAmount: new BN(0), // TODO: Calculate extras if needed
            roomPDA: actualRoomPDA, // Pass the actual PDA
          });

          return { success: true, txHash: res.signature };
        } catch (error: any) {
  console.error('[Solana Join] Error:', error);
  return { success: false, error: error.message || 'Join room failed' };
}
} catch (_error) { /* ignore */ }
      };
    }

    // TODO: implement EVM join
    return async (_args: JoinArgs): Promise<JoinResult> => ({
      success: false,
      error: `joinRoom not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, stellarContract, solanaContract, solanaCtx]);

  /** ---------------- Host: declare winners (NEW) ---------------- */
  const declareWinners = useMemo(() => {
    if (effectiveChain === 'stellar') {
      // Stellar doesn't have a separate declare step
      return async (_: DeclareWinnersArgs): Promise<DeclareWinnersResult> => ({
        success: true,
        txHash: 'stellar-no-separate-declare',
      });
    }

    if (effectiveChain === 'solana') {
      return async ({ roomId, winners }: DeclareWinnersArgs): Promise<DeclareWinnersResult> => {
        if (!solanaContract || !solanaContract.isReady) {
          return { success: false, error: 'Solana contract not ready' };
        }

        try {
          // Fetch all rooms to find the matching one (same pattern as joinRoom)
          if (!solanaContract.program) {
            return { success: false, error: 'Solana program not available' };
          }

          const rooms = await solanaContract.program.account.room.all();
          const matchingRoom = rooms.find((r: any) => r.account.roomId === roomId);

          if (!matchingRoom) {
            return { success: false, error: `Room "${roomId}" not found on-chain` };
          }

          const hostPubkey = matchingRoom.account.host;

          // Convert winner addresses to PublicKeys
          const { PublicKey } = await import('@solana/web3.js');
          const winnerPublicKeys = winners.map((w) => {
            if (!w.address) {
              throw new Error(`Missing address for winner ${w.playerId}`);
            }
            return new PublicKey(w.address);
          });

          const res = await solanaContract.declareWinners({
            roomId,
            hostPubkey,
            winners: winnerPublicKeys,
          });

          return { success: true, txHash: res.signature };
        } catch (error: any) {
          console.error('[declareWinners] Error:', error);
          return { success: false, error: error.message || 'Declare winners failed' };
        }
      };
    }

    // Default stub
    return async (_: DeclareWinnersArgs): Promise<DeclareWinnersResult> => ({
      success: false,
      error: `declareWinners not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, solanaContract]);

  /** ---------------- Host: prize distribution (NEW) ---------------- */
  const distributePrizes = useMemo(() => {
    if (effectiveChain === 'stellar') {
      return async ({ roomId, winners }: DistributeArgs): Promise<DistributeResult> => {
        if (!stellarContract) return { success: false, error: 'Stellar contract not ready' };

      
             // Soroban contract expects a simple array of addresses (string[])
      // Convert our generic winners payload -> string[]
       const addrList = winners.map(w => {
         if (!w.address || typeof w.address !== 'string' || w.address.length === 0) {
           throw new Error(`Missing or invalid address for winner ${w.playerId ?? '(unknown)'}`);
         }
         return w.address;
       });

       // Call the concrete method with the addresses array
       // (Your previous working flow called endRoom({ roomId, winners: string[] }))
       const res =
         await (stellarContract as any).endRoom?.({ roomId, winners: addrList }) ??
         await (stellarContract as any).distributePrizes?.({ roomId, winners: addrList })

        if (!res?.success) return { success: false, error: res?.error || 'Distribution failed' };

        const txHashRaw =
          (res as any).txHash ??
          (res as any).transactionHash ??
          (res as any).hash;

        if (typeof txHashRaw !== 'string' || txHashRaw.length === 0) {
          return { success: false, error: 'No transaction hash returned' };
        }

        return { success: true, txHash: txHashRaw };
      };
    }

    if (effectiveChain === 'solana') {
      return async ({ roomId, winners }: DistributeArgs): Promise<DistributeResult> => {
        if (!solanaContract || !solanaContract.isReady) {
          return { success: false, error: 'Solana contract not ready' };
        }

        try {
          // Convert winner addresses to PublicKeys
          const winnerPublicKeys = winners.map((w) => {
            if (!w.address) {
              throw new Error(`Missing address for winner ${w.playerId}`);
            }
            return new (require('@solana/web3.js').PublicKey)(w.address);
          });

          // TODO: Get host pubkey and fee token mint from room metadata
          const hostPubkey = solanaContract.publicKey!; // Placeholder
          const feeTokenMint = solanaContract.publicKey!; // Placeholder

          const res = await solanaContract.endRoom({
            roomId,
            hostPubkey,
            winners: winnerPublicKeys,
            feeTokenMint,
          });

          return { success: true, txHash: res.signature };
        } catch (error: any) {
          return { success: false, error: error.message || 'Distribution failed' };
        }
      };
    }

    // TODO: implement EVM
    return async (_: DistributeArgs): Promise<DistributeResult> => ({
      success: false,
      error: `Prize distribution not implemented for ${effectiveChain || 'unknown'} chain`,
    });
  }, [effectiveChain, stellarContract, solanaContract]);

  /** ---------------- Host: deploy (existing) ---------------- */
  const createPoolRoom = useCallback(
    async (p: {
      roomId: string;
      currency: string;
      entryFee: string | number;
      hostFeePct: number;
      prizePoolPct: number;
      charityName?: string;
      prizeSplits: { first: number; second?: number; third?: number };
      hostAddress: string;
    }): Promise<DeployResult> => {
      switch (effectiveChain) {
        case 'stellar': {
          if (!stellarContract) throw new Error('Stellar contract not ready');
          const res = await stellarContract.createPoolRoom({
            roomId: p.roomId,
            hostAddress: p.hostAddress,
            currency: p.currency || 'XLM',
            entryFee: String(p.entryFee ?? '1.0'),
            hostFeePct: p.hostFeePct ?? 0,
            prizePoolPct: p.prizePoolPct ?? 0,
            charityName: p.charityName,
            prizeSplits: p.prizeSplits ?? { first: 100 },
          });
          if (!res?.success) throw new Error('Stellar createPoolRoom failed');
          return {
            success: true,
            contractAddress: res.contractAddress,
            txHash: res.txHash,
            explorerUrl: (res as any).explorerUrl,
          };
        }
        case 'evm': {
          // TODO: replace with real EVM client
          return {
            success: true,
            contractAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
            txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
          };
        }
        case 'solana': {
          if (!solanaContract || !solanaContract.isReady) {
            throw new Error('Solana contract not ready');
          }

          if (!solanaContract.publicKey) {
            throw new Error('Wallet not connected');
          }

          // Native SOL mint address (wrapped SOL SPL token)
          const { PublicKey } = await import('@solana/web3.js');
          const NATIVE_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

          // Convert entry fee to lamports
          const entryFeeLamports = new BN(parseFloat(String(p.entryFee)) * LAMPORTS_PER_SOL);

          // TODO: Get actual charity wallet from TGB API or charity selection
          // For now, using host wallet as charity for testing
          const charityWallet = solanaContract.publicKey;

          console.log('[Solana Deploy] Room params:', {
            roomId: p.roomId,
            entryFee: p.entryFee,
            entryFeeLamports: entryFeeLamports.toString(),
            hostFeePct: p.hostFeePct,
            prizePoolPct: p.prizePoolPct,
          });

          const res = await solanaContract.createPoolRoom({
            roomId: p.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: p.hostFeePct * 100,
            prizePoolBps: p.prizePoolPct * 100,
            firstPlacePct: p.prizeSplits.first,
            secondPlacePct: p.prizeSplits.second,
            thirdPlacePct: p.prizeSplits.third,
            charityMemo: p.charityName?.substring(0, 28) || 'Quiz charity',
            feeTokenMint: NATIVE_SOL_MINT,
          });

          // res.room is already a base58 string from useSolanaContract
          return {
            success: true,
            contractAddress: res.room,
            txHash: res.signature,
          };
        }
        default:
          throw new Error('No chain selected');
      }
    },
    [effectiveChain, stellarContract, solanaContract]
  );

  const createAssetRoom = useCallback(
    async (p: {
      roomId: string;
      currency: string;
      entryFee: string | number;
      hostFeePct: number;
      charityName?: string;
      expectedPrizes: Array<{ tokenAddress: string; amount: string }>;
      hostAddress: string;
    }): Promise<DeployResult> => {
      switch (effectiveChain) {
        case 'stellar': {
          if (!stellarContract) throw new Error('Stellar contract not ready');
          const res = await stellarContract.createAssetRoom({
            roomId: p.roomId,
            hostAddress: p.hostAddress,
            currency: p.currency || 'XLM',
            entryFee: String(p.entryFee ?? '1.0'),
            hostFeePct: p.hostFeePct ?? 0,
            charityName: p.charityName,
            expectedPrizes: p.expectedPrizes ?? [],
          });
          if (!res?.success) throw new Error('Stellar createAssetRoom failed');
          return {
            success: true,
            contractAddress: res.contractAddress,
            txHash: res.txHash,
            explorerUrl: (res as any).explorerUrl,
          };
        }
        case 'evm': {
          // TODO: replace with real EVM client
          return {
            success: true,
            contractAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
            txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
          };
        }
        case 'solana': {
          if (!solanaContract || !solanaContract.isReady) {
            throw new Error('Solana contract not ready');
          }

          if (!solanaContract.publicKey) {
            throw new Error('Wallet not connected');
          }

          const { PublicKey } = await import('@solana/web3.js');
          const NATIVE_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

          // Convert entry fee to lamports
          const entryFeeLamports = new BN(parseFloat(String(p.entryFee)) * LAMPORTS_PER_SOL);

          // Validate we have at least 1 prize
          if (!p.expectedPrizes || p.expectedPrizes.length === 0) {
            throw new Error('Asset room requires at least 1 prize');
          }

          // Parse prize data (max 3 prizes supported)
          const prizes = p.expectedPrizes.slice(0, 3);
          const prize1 = prizes[0];
          const prize2 = prizes.length > 1 ? prizes[1] : undefined;
          const prize3 = prizes.length > 2 ? prizes[2] : undefined;

          // Convert prize addresses to PublicKeys and amounts to BN
          const prize1Mint = new PublicKey(prize1.tokenAddress);
          const prize1Amount = new BN(prize1.amount);
          const prize2Mint = prize2 ? new PublicKey(prize2.tokenAddress) : undefined;
          const prize2Amount = prize2 ? new BN(prize2.amount) : undefined;
          const prize3Mint = prize3 ? new PublicKey(prize3.tokenAddress) : undefined;
          const prize3Amount = prize3 ? new BN(prize3.amount) : undefined;

          // Get charity wallet (use host for now, should come from TGB API)
          const charityWallet = solanaContract.publicKey;

          console.log('[Solana Asset Room] Creating with prizes:', {
            prize1: { mint: prize1Mint.toBase58(), amount: prize1Amount.toString() },
            prize2: prize2Mint ? { mint: prize2Mint.toBase58(), amount: prize2Amount?.toString() } : null,
            prize3: prize3Mint ? { mint: prize3Mint.toBase58(), amount: prize3Amount?.toString() } : null,
          });

          // Call the createAssetRoom function from useSolanaContract
          const res = await solanaContract.createAssetRoom({
            roomId: p.roomId,
            charityWallet,
            entryFee: entryFeeLamports,
            maxPlayers: 100,
            hostFeeBps: p.hostFeePct * 100,
            charityMemo: p.charityName?.substring(0, 28) || 'Asset room',
            feeTokenMint: NATIVE_SOL_MINT,
            prize1Mint,
            prize1Amount,
            prize2Mint,
            prize2Amount,
            prize3Mint,
            prize3Amount,
          });

          return {
            success: true,
            contractAddress: res.room,
            txHash: res.signature,
          };
        }
        default:
          throw new Error('No chain selected');
      }
    },
    [effectiveChain, stellarContract, solanaContract]
  );

  const deploy = useCallback(
    async (params: DeployParams): Promise<DeployResult> => {
      const hostAddress = getHostAddress(params.hostWallet);

      // Normalize required fields so types are exact (no undefined)
      const currency: string = params.currency ?? 'XLM';
      const entryFee: string | number = params.entryFee ?? '1.0';
      const hostFeePct: number = params.hostFeePct ?? 0;
      const charityName: string | undefined = params.charityName;

      if (params.prizeMode === 'assets') {
        if (!params.expectedPrizes?.length) {
          throw new Error('expectedPrizes required for asset-based room');
        }
        return createAssetRoom({
          roomId: params.roomId,
          currency,
          entryFee,
          hostFeePct,
          charityName,
          expectedPrizes: params.expectedPrizes,
          hostAddress,
        });
      }

      // default → split/pool mode
      const prizeSplits = params.prizeSplits ?? { first: 100 };
      const prizePoolPct = params.prizePoolPct ?? 0;

      return createPoolRoom({
        roomId: params.roomId,
        currency,
        entryFee,
        hostFeePct,
        prizePoolPct,
        charityName,
        prizeSplits,
        hostAddress,
      });
    },
    [getHostAddress, createAssetRoom, createPoolRoom, solanaContract]
  );

  // 👇 IMPORTANT: include distributePrizes and declareWinners in the returned object
  return { deploy, joinRoom, declareWinners, distributePrizes };
}

// Optional: export a typed alias if you want to reuse the shape elsewhere
export type ContractActions = ReturnType<typeof useContractActions>;







