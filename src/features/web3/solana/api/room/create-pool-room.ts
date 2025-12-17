/**
 * @module features/web3/solana/api/room/create-pool-room
 *
 * ## Purpose
 * Creates a new pool-based fundraising room on Solana where winners receive prizes
 * from a pool of collected entry fees. This is the primary room creation operation
 * for the Bingo platform.
 *
 * ## Architecture
 * This module extracts the room creation logic from the monolithic hook into a
 * focused, testable API module. It uses Phase 1 utilities for all common operations:
 * - PDA derivation via `@/shared/lib/solana/pda`
 * - Token account management via `@/shared/lib/solana/token-accounts`
 * - Transaction building via `@/shared/lib/solana/transactions`
 * - Validation via `@/shared/lib/solana/validation`
 *
 * ## Fee Structure
 * The contract enforces a trustless economic model:
 * - Platform Fee: 20% (fixed by GlobalConfig)
 * - Host Fee: 0-5% (configurable via hostFeeBps)
 * - Prize Pool: 0-35% (configurable via prizePoolBps, max = 40% - host fee)
 * - Charity: Minimum 40% (calculated remainder)
 *
 * ## Automatic Initialization
 * This function automatically initializes:
 * - GlobalConfig: If not already initialized
 * - TokenRegistry: If not already initialized
 * - Token Approval: If the fee token is not already approved
 *
 * ## Token Restrictions
 * Room fees are restricted to USDC and PYUSD only. Prize tokens have no restrictions.
 *
 * @see {@link useSolanaContract} - React hook that uses this module
 * @see {@link createAssetRoom} - Alternative room creation for asset-based rooms
 * @see programs/bingo/src/instructions/init_pool_room.rs - Contract implementation
 */

import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

// Phase 1 utilities
import {
  deriveGlobalConfigPDA,
  deriveRoomPDA,
  deriveRoomVaultPDA,
  deriveTokenRegistryPDA,
} from '@/shared/lib/solana/pda';
import { buildTransaction } from '@/shared/lib/solana/transactions';
import { validateRoomParams } from '@/shared/lib/solana/validation';

// Phase 2 types
import type {
  CreatePoolRoomParams,
  RoomCreationResult,
  SolanaContractContext,
} from '@/features/web3/solana/model/types';

// Import extracted admin modules for auto-initialization
import { initializeGlobalConfig } from '@/features/web3/solana/api/admin/initialize-global-config';
import { initializeTokenRegistry } from '@/features/web3/solana/api/admin/initialize-token-registry';
import { addApprovedToken } from '@/features/web3/solana/api/admin/add-approved-token';
import { updateGlobalConfig } from '@/features/web3/solana/api/admin/update-global-config';

// Config
import { PROGRAM_ID, getTokenMints } from '@/shared/lib/solana/config';
import { simulateTransaction, formatTransactionError } from '@/shared/lib/solana/transaction-helpers';

/**
 * Creates a new pool-based fundraising room on Solana
 */
export async function createPoolRoom(
  context: SolanaContractContext,
  params: CreatePoolRoomParams
): Promise<RoomCreationResult> {
  if (!context.publicKey || !context.provider) {
    throw new Error('Wallet not connected');
  }

  if (!context.program) {
    throw new Error('Program not deployed yet. Run: cd solana-program/bingo && anchor deploy');
  }

  if (!context.connection) {
    throw new Error('Connection not available. Please ensure wallet is connected.');
  }

  const { program, provider, publicKey, connection } = context;

  // ✅ Step 1: Check if GlobalConfig exists, initialize if needed
  const [globalConfigPDA] = deriveGlobalConfigPDA();

  try {
    // @ts-expect-error - Account types available after program deployment
    await program.account.globalConfig.fetch(globalConfigPDA);
    console.log('[createPoolRoom] ✅ GlobalConfig already exists, skipping initialization');
  } catch (fetchError: any) {
    console.log('[createPoolRoom] GlobalConfig not found, initializing...');
    
    try {
      await initializeGlobalConfig(context, {
        platformWallet: publicKey,
        charityWallet: params.charityWallet,
      });
      console.log('[createPoolRoom] ✅ GlobalConfig initialized successfully');
    } catch (error: any) {
      console.error('[createPoolRoom] ❌ Failed to initialize GlobalConfig:', error.message);
    }
  }


  try {
    // @ts-expect-error - Account types available after program deployment
    const configAccount = await program.account.globalConfig.fetch(globalConfigPDA);
    if (configAccount.maxPrizePoolBps === 3500) {
      try {
        if (configAccount.admin.equals(publicKey)) {
          await updateGlobalConfig(context, { maxPrizePoolBps: 4000 });
        }
      } catch (updateError: any) {
        // If update fails (e.g., not admin), continue silently
      }
    }
  } catch (configError: any) {
    // If we can't fetch config, continue silently
  }

  
  
  // ✅ Step 2: Check if TokenRegistry exists, initialize if needed
  const [tokenRegistryPDA] = deriveTokenRegistryPDA();
  let tokenRegistryExists = false;

  try {
    // @ts-expect-error - Account types available after program deployment
    await program.account.tokenRegistry.fetch(tokenRegistryPDA);
    tokenRegistryExists = true;
    console.log('[createPoolRoom] ✅ TokenRegistry already exists, skipping initialization');
  } catch (fetchError: any) {
    console.log('[createPoolRoom] TokenRegistry not found, will try to initialize...');
    
    // Check with getAccountInfo to see if account exists but is corrupted
    const accountInfo = await connection.getAccountInfo(tokenRegistryPDA);
    
    if (!accountInfo) {
      // Account doesn't exist - try to initialize
      console.log('[createPoolRoom] TokenRegistry account does not exist, initializing...');
      try {
        await initializeTokenRegistry(context);
        
        // Verify it was created
        // @ts-expect-error - Account types available after program deployment
        await program.account.tokenRegistry.fetch(tokenRegistryPDA);
        tokenRegistryExists = true;
        console.log('[createPoolRoom] ✅ TokenRegistry initialized successfully');
      } catch (initError: any) {
        console.error('[createPoolRoom] ❌ Token registry initialization failed:', initError.message);
        throw new Error(`Token registry initialization failed: ${initError.message}`);
      }
    } else if (accountInfo.owner.toBase58() !== program.programId.toBase58()) {
      // Account exists but owned by wrong program
      throw new Error(
        `Token registry exists but owned by wrong program.\n` +
        `Owner: ${accountInfo.owner.toBase58()}\n` +
        `Expected: ${program.programId.toBase58()}`
      );
    } else {
      // Account exists and owned by correct program
      console.log('[createPoolRoom] ⚠️ TokenRegistry exists but Anchor cannot fetch it');
      tokenRegistryExists = true;
    }
  }

  console.log('[createPoolRoom] 🔍 DEBUG: Starting TokenRegistry check...');
console.log('[createPoolRoom] 🔍 TokenRegistry PDA:', tokenRegistryPDA.toBase58());
  
  if (!tokenRegistryExists) {
    throw new Error('Token registry verification failed - account does not exist');
  }

  // ✅ Step 3: Validate fee token and auto-approve if needed
  const TOKEN_MINTS = getTokenMints();
  const isUSDC = params.feeTokenMint.equals(TOKEN_MINTS.USDC);
  const isPYUSD = params.feeTokenMint.equals(TOKEN_MINTS.PYUSD);
  
  if (!isUSDC && !isPYUSD) {
    throw new Error(
      `Room fees are restricted to USDC and PYUSD only. ` +
      `Received: ${params.feeTokenMint.toBase58()}.`
    );
  }

  // Auto-approve the fee token if needed
  try {
    await addApprovedToken(context, { tokenMint: params.feeTokenMint });
  } catch (error: any) {
    const isAlreadyApproved = error.message?.includes('already-approved') ||
                             error.message?.includes('already been processed');
    if (!isAlreadyApproved) {
      console.error('[createPoolRoom] Failed to approve token:', error);
      throw error;
    }
  }

  // ✅ Step 4: Validate inputs
  const validation = validateRoomParams({
    roomId: params.roomId,
    charityWallet: params.charityWallet,
    entryFee: params.entryFee.toNumber(),
    maxPlayers: params.maxPlayers,
    hostFeeBps: params.hostFeeBps,
    prizePoolBps: params.prizePoolBps,
    charityMemo: params.charityMemo,
    feeTokenMint: params.feeTokenMint,
  });

  if (!validation.success) {
    console.error('[createPoolRoom] Validation failed:', validation.error.issues);
    throw new Error(validation.error.issues.map(i => i.message).join('. '));
  }

  // ✅ Step 5: Check wallet has enough SOL for rent
  const hostBalance = await connection.getBalance(publicKey);
  const ROOM_ACCOUNT_SIZE = 8 + 32 + 32 + 32 + 32 + 8 + 2 + 2 + 2 + 1 + 128 + 4 + 8 + 8 + 8 + 1 + 128 + 8 + 8 + 1;
  const roomRent = await connection.getMinimumBalanceForRentExemption(ROOM_ACCOUNT_SIZE);
  const TOKEN_ACCOUNT_SIZE = 165;
  const vaultRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);
  const totalRentRequired = roomRent + vaultRent;
  const TRANSACTION_FEE_BUFFER = 0.001 * 1e9;

  if (hostBalance < totalRentRequired + TRANSACTION_FEE_BUFFER) {
    const requiredSOL = (totalRentRequired + TRANSACTION_FEE_BUFFER) / 1e9;
    const currentSOL = hostBalance / 1e9;
    throw new Error(
      `Insufficient SOL for room creation. ` +
      `Required: ${requiredSOL.toFixed(4)} SOL. ` +
      `Current balance: ${currentSOL.toFixed(4)} SOL.`
    );
  }

  // ✅ Step 6: Derive all required PDAs
  const [room] = deriveRoomPDA(publicKey, params.roomId);
  const [roomVault] = deriveRoomVaultPDA(room);

  // ✅ Step 7: Build instruction
  const ix = await program.methods
    .initPoolRoom(
      params.roomId,
      params.charityWallet,
      params.entryFee,
      params.maxPlayers,
      params.hostFeeBps,
      params.prizePoolBps,
      params.firstPlacePct,
      params.secondPlacePct ?? null,
      params.thirdPlacePct ?? null,
      params.charityMemo,
      params.expirationSlots ?? null
    )
    .accounts({
      room,
      roomVault,
      feeTokenMint: params.feeTokenMint,
      tokenRegistry: tokenRegistryPDA,
      globalConfig: globalConfigPDA,
      host: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();

  // ✅ Step 8: Build transaction
  const transaction = await buildTransaction({
    connection,
    instructions: [ix],
    feePayer: publicKey,
    commitment: 'finalized',
  });

  // ✅ Step 9: Simulate transaction
  const simResult = await simulateTransaction(connection, transaction);
  
  if (!simResult.success) {
    console.error('[createPoolRoom] Simulation failed:', simResult.error);
    throw new Error(formatTransactionError(simResult.error) || 'Transaction simulation failed');
  }

  // ✅ Step 10: Send and confirm transaction
  let signature: string;
  try {
    signature = await provider.sendAndConfirm(transaction, [], {
      skipPreflight: false,
      commitment: 'confirmed',
    });
  } catch (error: any) {
    console.error('[createPoolRoom] Transaction error:', error);

    // Check if transaction actually succeeded despite error
    if (error.message?.includes('already been processed')) {
      try {
        // @ts-expect-error - Account types available after program deployment
        await program.account.room.fetch(room);
        const signatures = await connection.getSignaturesForAddress(room, { limit: 1 });
        if (signatures.length > 0) {
          return { signature: signatures[0].signature, room: room.toBase58() };
        }
        const sig = error.signature || error.transactionSignature || 'transaction-completed';
        return { signature: sig, room: room.toBase58() };
      } catch (fetchError) {
        throw new Error('Transaction failed and room was not created');
      }
    }

    throw error;
  }

  console.log('[createPoolRoom] ✅ Room created successfully:', room.toBase58());
  return { signature, room: room.toBase58() };
}
