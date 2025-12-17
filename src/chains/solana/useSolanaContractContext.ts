// src/chains/solana/useSolanaContractContext.ts
import { useAppKitAccount, useAppKitProvider, useAppKitNetwork } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react'; // ✅ Solana-specific hook
import { useMemo, useCallback } from 'react';
import { PublicKey, Connection } from '@solana/web3.js';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { getAccount, getMint } from '@solana/spl-token';
import BingoIDL from '@/idl/solana_bingo.json';
import type { Idl } from '@coral-xyz/anchor';

// Import config
import { PROGRAM_ID } from '@/shared/lib/solana/config';

// Import PDA utilities
import { deriveRoomVaultPDA, deriveGlobalConfigPDA } from '@/shared/lib/solana/pda';

// Import your existing API modules
import {
  createPoolRoom as createPoolRoomAPI,
  createAssetRoom as createAssetRoomAPI,
} from '@/features/web3/solana/api/room';

import {
  joinRoom as joinRoomAPI,
} from '@/features/web3/solana/api/player';

import {
  distributePrizes as distributePrizesAPI,
} from '@/features/web3/solana/api/prizes';

// Import types
import type { SolanaContractContext } from '@/features/web3/solana/model/types';

/**
 * Helper to convert bigint to decimal string
 */
function bigIntToDecimalString(amount: bigint, decimals: number): string {
  const negative = amount < 0n;
  const value = negative ? -amount : amount;

  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;

  const wholeStr = whole.toString();
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');

  const result = fractionStr.length > 0 ? `${wholeStr}.${fractionStr}` : wholeStr;
  return negative ? `-${result}` : result;
}

/**
 * Context-aware hook for Solana contract operations using AppKit.
 * Creates an Anchor-compatible provider from AppKit primitives.
 * 
 * This hook bridges AppKit's Solana adapter with Anchor Program operations,
 * enabling seamless integration with existing Solana contract code.
 */
export function useSolanaContractContext() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('solana');
  const { caipNetwork } = useAppKitNetwork();
  // ✅ Solana-specific useAppKitConnection - no parameters needed
  const { connection } = useAppKitConnection();
  
  // 🔍 DEBUG: Log connection details
  console.log('🔍 [useSolanaContractContext] Connection endpoint:', (connection as any)?.rpcEndpoint);
  console.log('🔍 [useSolanaContractContext] Wallet address:', address);
  console.log('🔍 [useSolanaContractContext] Network from AppKit:', caipNetwork);
  console.log('🔍 [useSolanaContractContext] Program ID from config:', PROGRAM_ID.toBase58());
  
  // Check if we're on Solana network
  const isSolanaNetwork = caipNetwork?.caipNetworkId?.startsWith('solana:');
  const isSolanaReady = isConnected && !!walletProvider && !!address && isSolanaNetwork && !!connection;
  
  // Convert address string to PublicKey
  const publicKey = useMemo(() => {
    if (!isSolanaReady || !address) return null;
    try {
      return new PublicKey(address);
    } catch (err) {
      console.error('[useSolanaContractContext] Invalid address:', err);
      return null;
    }
  }, [isSolanaReady, address]);

  // Create Anchor-compatible wallet adapter
  const walletAdapter = useMemo(() => {
    if (!walletProvider || !publicKey) return null;
    
    // ✅ Type assertion: AppKit's walletProvider should have these methods
    const provider = walletProvider as any;
    
    return {
      publicKey,
      signTransaction: async (tx: any) => {
        if (!provider.signTransaction) {
          throw new Error('Wallet does not support signTransaction');
        }
        return await provider.signTransaction(tx);
      },
      signAllTransactions: async (txs: any[]) => {
        if (!provider.signAllTransactions) {
          throw new Error('Wallet does not support signAllTransactions');
        }
        return await provider.signAllTransactions(txs);
      },
    };
  }, [walletProvider, publicKey]);

  // Create Anchor Provider
  const provider = useMemo(() => {
    if (!walletAdapter || !connection) return null;
    
    // ✅ Create a proper Solana Connection from AppKit's connection
    // AppKit returns a connection-like object, we need to ensure it's compatible
    const solanaConnection = connection as unknown as Connection;
    
    return new AnchorProvider(
      solanaConnection,
      walletAdapter as any,
      {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
        skipPreflight: false,
      }
    );
  }, [walletAdapter, connection]);

  // Create Anchor Program
  const program = useMemo(() => {
    if (!provider) return null;
    
    try {
      return new Program(BingoIDL as Idl, provider);
    } catch (err) {
      console.error('[useSolanaContractContext] Failed to create program:', err);
      return null;
    }
  }, [provider]);

  // Create the context object that your existing APIs expect
  const context = useMemo((): SolanaContractContext => ({
    program,
    provider,
    publicKey,
    connected: !!publicKey,
    isReady: !!publicKey && !!program,
    connection: connection as unknown as Connection,
  }), [program, provider, publicKey, connection]);

  // ============================================================================
  // Contract Method Implementations
  // ============================================================================

  /**
   * Creates a new pool-based fundraising room
   */
  const createPoolRoom = useCallback(async (params: any) => {
    if (!context.isReady) {
      throw new Error('Solana wallet not connected');
    }
    return await createPoolRoomAPI(context, params);
  }, [context]);

  /**
   * Creates an asset-based room with pre-deposited prizes
   */
  const createAssetRoom = useCallback(async (params: any) => {
    if (!context.isReady) {
      throw new Error('Solana wallet not connected');
    }
    return await createAssetRoomAPI(context, params);
  }, [context]);

  /**
   * Joins an existing room by paying entry fee
   */
  const joinRoom = useCallback(async (params: any) => {
    if (!context.isReady) {
      throw new Error('Solana wallet not connected');
    }
    return await joinRoomAPI(context, params);
  }, [context]);

  /**
   * Distributes prizes to winners after game ends
   */
  const distributePrizes = useCallback(async (params: any) => {
    if (!context.isReady) {
      throw new Error('Solana wallet not connected');
    }
    return await distributePrizesAPI(context, params);
  }, [context]);

  /**
   * Preview charity payout for a room by reading on-chain vault balance
   * and applying fee BPS (similar to EVM previewCharityPayout).
   *
   * This is used to:
   * - Show host a preview of how much goes to charity
   * - Build a TGB request amount for /api/tgb/create-deposit-address
   * 
   * @param params.roomId - Room identifier string
   * @param params.roomAddress - Optional room PDA (will search if not provided)
   * @returns Object with charity amount in raw lamports and decimal format
   */
  const previewCharityPayout = useCallback(
    async (params: { roomId: string; roomAddress?: PublicKey }) => {
      const { program, connection } = context;

      if (!program || !connection) {
        throw new Error('[useSolanaContractContext:previewCharityPayout] Program or connection not available');
      }

      const { roomId, roomAddress } = params;

      console.log('🔍 [previewCharityPayout] DEBUG START ===========================');
      console.log('🔍 [previewCharityPayout] Input:', { roomId, roomAddress: roomAddress?.toBase58() });

      // 1) Find room PDA
      let roomPDA: PublicKey;
      if (roomAddress) {
        roomPDA = roomAddress;
        console.log('🔍 [previewCharityPayout] Using provided roomAddress:', roomPDA.toBase58());
      } else {
        console.log('🔍 [previewCharityPayout] Searching for room by roomId...');
        const rooms = await (program.account as any).room.all();
        console.log('🔍 [previewCharityPayout] Found', rooms.length, 'rooms total');
        
        const matchingRoom = rooms.find((r: any) => {
          const roomData = r.account;
          const roomIdStr = Buffer.from(roomData.roomId)
            .toString('utf8')
            .replace(/\0/g, '');
          console.log('🔍 [previewCharityPayout] Checking room:', roomIdStr, '===', roomId, '?', roomIdStr === roomId);
          return roomIdStr === roomId;
        });

        if (!matchingRoom) {
          throw new Error(
            `[useSolanaContractContext:previewCharityPayout] Room "${roomId}" not found`
          );
        }

        roomPDA = matchingRoom.publicKey;
        console.log('🔍 [previewCharityPayout] Found room PDA:', roomPDA.toBase58());
      }

      // 2) Fetch room + global config
      console.log('🔍 [previewCharityPayout] Fetching room account...');
      const roomAccount = await (program.account as any).room.fetch(roomPDA);
      console.log('🔍 [previewCharityPayout] Room account:', {
        host: roomAccount.host?.toBase58(),
        feeTokenMint: roomAccount.feeTokenMint?.toBase58(),
        entryFee: roomAccount.entryFee?.toString(),
        hostFeeBps: roomAccount.hostFeeBps?.toString(),
        prizePoolBps: roomAccount.prizePoolBps?.toString(),
        playerCount: roomAccount.playerCount?.toString(),
      });

      const [roomVault] = deriveRoomVaultPDA(roomPDA);
      console.log('🔍 [previewCharityPayout] Room vault PDA:', roomVault.toBase58());

      const [globalConfigPDA] = deriveGlobalConfigPDA();
      console.log('🔍 [previewCharityPayout] Global config PDA:', globalConfigPDA.toBase58());

      const globalConfigAccount = await (program.account as any).globalConfig.fetch(globalConfigPDA);
      console.log('🔍 [previewCharityPayout] Global config:', {
        platformWallet: globalConfigAccount.platformWallet?.toBase58(),
        charityWallet: globalConfigAccount.charityWallet?.toBase58(),
        platformFeeBps: globalConfigAccount.platformFeeBps?.toString(),
      });

      // 3) Get vault token account + mint info
      const feeTokenMint = roomAccount.feeTokenMint as PublicKey;
      console.log('🔍 [previewCharityPayout] Fee token mint:', feeTokenMint.toBase58());

      const roomVaultTokenAccount = roomVault;
      console.log('🔍 [previewCharityPayout] Vault token account address:', roomVaultTokenAccount.toBase58());

      // ✅ TRY to get account, handle errors gracefully
      let vaultAccount;
      let vaultBalance = 0n;
      
      try {
        console.log('🔍 [previewCharityPayout] Attempting to fetch vault token account...');
        vaultAccount = await getAccount(connection, roomVaultTokenAccount);
        vaultBalance = vaultAccount.amount;
        console.log('✅ [previewCharityPayout] Vault account found! Balance:', vaultBalance.toString());
      } catch (error: any) {
        console.error('❌ [previewCharityPayout] Vault token account error:', error.name, error.message);
        
        // Check if it's specifically account not found
        if (error.name === 'TokenAccountNotFoundError' || 
            error.message?.includes('could not find account')) {
          console.warn('⚠️  [previewCharityPayout] Vault token account does not exist yet (no fees collected?)');
          vaultBalance = 0n;
        } else {
          // Some other error - re-throw
          console.error('❌ [previewCharityPayout] Unexpected error fetching vault:', error);
          throw error;
        }
      }

      console.log('🔍 [previewCharityPayout] Total in vault (raw):', vaultBalance.toString());

      const mintInfo = await getMint(connection, feeTokenMint);
      const decimals = mintInfo.decimals;
      console.log('🔍 [previewCharityPayout] Token decimals:', decimals);

      // 4) Compute BPS and charity amount
      const platformFeeBps = Number(globalConfigAccount.platformFeeBps ?? 2000);
      const hostFeeBps = Number(roomAccount.hostFeeBps ?? 0);
      const prizePoolBps = Number(roomAccount.prizePoolBps ?? 0);

      console.log('🔍 [previewCharityPayout] Fee structure (BPS):', {
        platform: platformFeeBps,
        host: hostFeeBps,
        prizePool: prizePoolBps,
        total: platformFeeBps + hostFeeBps + prizePoolBps,
      });

      const charityBps = 10_000 - platformFeeBps - hostFeeBps - prizePoolBps;
      console.log('🔍 [previewCharityPayout] Charity BPS:', charityBps);

      if (charityBps <= 0) {
        throw new Error(
          `[useSolanaContractContext:previewCharityPayout] Invalid fee configuration, charityBps=${charityBps}`
        );
      }

      const charityAmountRaw = (vaultBalance * BigInt(charityBps)) / 10_000n;
      console.log('🔍 [previewCharityPayout] Charity amount (raw):', charityAmountRaw.toString());

      const amountDecimal = bigIntToDecimalString(charityAmountRaw, decimals);
      console.log('🔍 [previewCharityPayout] Charity amount (decimal):', amountDecimal);

      const result = {
        roomPDA,
        amountRaw: charityAmountRaw,
        amountDecimal,
        decimals,
        charityBps,
      };

      console.log('✅ [previewCharityPayout] DEBUG END =============================');
      console.log('✅ [previewCharityPayout] Returning:', result);

      return result;
    },
    [context]
  );

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // Connection state
    isReady: context.isReady,
    publicKey,
    walletProvider: walletProvider || null,
    connection: connection as unknown as Connection || null,
    program,
    provider,

    // Contract operations
    createPoolRoom,
    createAssetRoom,
    joinRoom,
    distributePrizes,
    previewCharityPayout,
  };
}