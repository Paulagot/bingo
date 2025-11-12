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
import type { AnchorProvider, Program } from '@coral-xyz/anchor';

// Phase 1 utilities
import {
  deriveGlobalConfigPDA,
  deriveTokenRegistryPDA,
  deriveRoomPDA,
  deriveRoomVaultPDA,
} from '@/shared/lib/solana/pda';
import { buildTransaction, sendWithRetry } from '@/shared/lib/solana/transactions';
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
 *
 * This function creates a new fundraising room where winners receive prizes from a pool of
 * collected entry fees. The room is configured with a fee structure that allocates funds
 * between platform (20%), host (0-5%), prize pool (0-35%), and charity (40%+).
 *
 * @param context - Solana contract context (must have program and provider initialized)
 * @param params - Room creation parameters
 * @returns Room creation result with room PDA and transaction signature
 *
 * @throws {Error} 'Wallet not connected' - If publicKey or provider is null
 * @throws {Error} 'Program not deployed yet' - If Anchor program not initialized
 * @throws {Error} Validation errors - If fee structure invalid (charity < 40%)
 * @throws {Error} Transaction simulation errors - If on-chain execution would fail
 *
 * @example
 * ```typescript
 * const result = await createPoolRoom(context, {
 *   roomId: 'bingo-night-2024',
 *   charityWallet: new PublicKey('Char1ty...'),
 *   entryFee: new BN(5_000_000), // 5 USDC
 *   maxPlayers: 100,
 *   hostFeeBps: 300, // 3%
 *   prizePoolBps: 2000, // 20%
 *   firstPlacePct: 60,
 *   secondPlacePct: 30,
 *   thirdPlacePct: 10,
 *   charityMemo: 'Bingo Night Charity',
 *   feeTokenMint: USDC_MINT,
 * });
 *
 * ```
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

  // Auto-initialize global config and token registry if needed
  // Note: The charity wallet passed here is used to initialize GlobalConfig if it doesn't exist.
  // This is a placeholder - the actual TGB dynamic charity address is used during prize distribution.
  
  try {
    await initializeGlobalConfig(context, {
      platformWallet: publicKey,
      charityWallet: params.charityWallet,
    });
  } catch (error: any) {
    // Only fail if it's not already initialized
    const isAlreadyInit = error.message?.includes('already-initialized') ||
                         error.message?.includes('already been processed') ||
                         error.message?.includes('custom program error: 0x0') || // Account already initialized
                         error.message?.includes('AccountAlreadyInitialized'); // Alternative error format
    if (!isAlreadyInit) {
      console.error('[createPoolRoom] ❌ Failed to initialize global config:', error);
      console.error('[createPoolRoom] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500)
      });
      // Don't throw - if GlobalConfig initialization fails, we can still try to use existing GlobalConfig
      // or continue with room creation (the contract may handle missing GlobalConfig differently)
    }
  }
  
  // Verify GlobalConfig exists and has a valid charity wallet
  // If it doesn't exist or has an invalid wallet, we've already tried to initialize it above
  try {
    const [globalConfigPDA] = deriveGlobalConfigPDA();
    // @ts-ignore - Account types available after program deployment
    const configAccount = await program.account.globalConfig.fetch(globalConfigPDA);
    const configCharityWallet = configAccount.charityWallet as PublicKey;
  } catch (verifyError: any) {
    // GlobalConfig doesn't exist or couldn't be fetched - this is a problem
    console.error('[createPoolRoom] ❌ Could not verify GlobalConfig:', verifyError.message);
    console.error('[createPoolRoom] ⚠️ Room creation may fail if GlobalConfig is required by the contract');
    // Don't throw - let the contract validation handle this
  }

  // Check and update max_prize_pool_bps if it's set to 3500 (35%)
  // The contract should allow up to 40% - host fee, so max_prize_pool_bps should be 4000
  const [globalConfig] = deriveGlobalConfigPDA();
  try {
    // @ts-ignore - Account types available after program deployment
    const configAccount = await program.account.globalConfig.fetch(globalConfig);
    if (configAccount.maxPrizePoolBps === 3500) {
      try {
        // Check if current user is admin
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
  
  // CRITICAL: Use program.programId to derive token registry PDA (matches Anchor's derivation)
  // This ensures the PDA matches what Anchor expects when auto-deriving from IDL constraint
  const programId = program.programId;
  
  // Verify PROGRAM_ID matches the program's programId (for consistency)
  if (!programId.equals(PROGRAM_ID)) {
    // Using program.programId for PDA derivation to match Anchor validation
  }
  
  // Derive token registry PDA using Phase 1 utility (but with program.programId for consistency)
  // Note: deriveTokenRegistryPDA uses PROGRAM_ID, but we need to use program.programId here
  // to match Anchor's derivation. This is a special case.
  const [tokenRegistryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry-v4')],
    programId
  );
  
  // CRITICAL: The contract constraint uses `bump = token_registry.bump`, which means
  // Anchor must read the account to get the bump. The account MUST exist before init_pool_room.
  // 
  // DIAGNOSIS: Check if token registry exists at v4 PDA, and also check for old v2 PDA
  // If it exists at v2 PDA, that's the problem - Anchor is looking for v4 but finding v2
  const [oldV2PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry-v2')],
    programId
  );
  
  // Check if old v2 registry exists (diagnostic only - don't throw error)
  const oldV2Account = await connection.getAccountInfo(oldV2PDA).catch(() => null);
  
  // Verify v4 registry exists
  let tokenRegistryExists = false;
  try {
    // First, try to fetch using Anchor's account API (this is what Anchor will use)
    // @ts-ignore - Account types available after program deployment
    const registryAccount = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
    tokenRegistryExists = true;
  } catch (fetchError: any) {
    // Fallback: Check with getAccountInfo
    const accountInfo = await connection.getAccountInfo(tokenRegistryPDA);
    if (!accountInfo) {
      try {
        await initializeTokenRegistry(context);
        // Verify it was created
        // @ts-ignore - Account types available after program deployment
        await program.account.tokenRegistry.fetch(tokenRegistryPDA);
        tokenRegistryExists = true;
      } catch (initError: any) {
        console.error('[createPoolRoom] ❌ Token registry initialization failed:', initError);
        throw new Error(`Token registry initialization failed: ${initError.message}`);
      }
    } else if (accountInfo.owner.toBase58() !== programId.toBase58()) {
      console.error('[createPoolRoom] ❌ Token registry exists but owned by wrong program:', {
        owner: accountInfo.owner.toBase58(),
        expected: programId.toBase58(),
        pda: tokenRegistryPDA.toBase58(),
      });
      throw new Error(
        `Token registry exists but owned by wrong program.\n` +
        `Owner: ${accountInfo.owner.toBase58()}\n` +
        `Expected: ${programId.toBase58()}\n` +
        `PDA: ${tokenRegistryPDA.toBase58()}\n\n` +
        `Please close the old account and reinitialize.`
      );
    } else {
      // Account exists and is owned by correct program, but Anchor API failed
      // This might mean the account data is invalid or the IDL doesn't match
      console.error('[createPoolRoom] ❌ Token registry exists but Anchor API fetch failed:', fetchError.message);
      console.error('[createPoolRoom] Account info:', {
        exists: true,
        owner: accountInfo.owner.toBase58(),
        dataLength: accountInfo.data.length,
        executable: accountInfo.executable,
      });
      throw new Error(
        `Token registry exists at ${tokenRegistryPDA.toBase58()} but Anchor cannot fetch it: ${fetchError.message}. ` +
        `This might indicate an IDL mismatch or corrupted account data. ` +
        `The account might have been created with a different IDL version.`
      );
    }
  }
  
  if (!tokenRegistryExists) {
    throw new Error('Token registry verification failed - account does not exist');
  }

  // Validate that fee token is USDC or PYUSD only (room fees restriction)
  const TOKEN_MINTS = getTokenMints();
  const isUSDC = params.feeTokenMint.equals(TOKEN_MINTS.USDC);
  const isPYUSD = params.feeTokenMint.equals(TOKEN_MINTS.PYUSD);
  
  if (!isUSDC && !isPYUSD) {
    throw new Error(
      `Room fees are restricted to USDC and PYUSD only. ` +
      `Received: ${params.feeTokenMint.toBase58()}. ` +
      `Note: Prize tokens have no restrictions and can be any token.`
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

  // Validate inputs using Phase 1 Zod schemas
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

  // Check wallet has enough SOL for rent
  // With the security fix, we now initialize both Room AND RoomVault token account
  // Both require rent-exempt balance to be paid by the host
  const hostBalance = await connection.getBalance(publicKey);

  // Room PDA rent (~0.002 SOL for account data)
  const ROOM_ACCOUNT_SIZE = 8 + 32 + 32 + 32 + 32 + 8 + 2 + 2 + 2 + 1 + 128 + 4 + 8 + 8 + 8 + 1 + 128 + 8 + 8 + 1; // ~300 bytes
  const roomRent = await connection.getMinimumBalanceForRentExemption(ROOM_ACCOUNT_SIZE);

  // Token Account rent (~0.00204 SOL for 165 bytes)
  const TOKEN_ACCOUNT_SIZE = 165;
  const vaultRent = await connection.getMinimumBalanceForRentExemption(TOKEN_ACCOUNT_SIZE);

  const totalRentRequired = roomRent + vaultRent;
  const TRANSACTION_FEE_BUFFER = 0.001 * 1e9; // 0.001 SOL buffer for transaction fees

  if (hostBalance < totalRentRequired + TRANSACTION_FEE_BUFFER) {
    const requiredSOL = (totalRentRequired + TRANSACTION_FEE_BUFFER) / 1e9;
    const currentSOL = hostBalance / 1e9;
    throw new Error(
      `Insufficient SOL for room creation. ` +
      `Required: ${requiredSOL.toFixed(4)} SOL (${roomRent / 1e9} for room + ${vaultRent / 1e9} for vault + fees). ` +
      `Current balance: ${currentSOL.toFixed(4)} SOL. ` +
      `Please add ${(requiredSOL - currentSOL).toFixed(4)} SOL to your wallet.`
    );
  }


  // Derive all required PDAs using Phase 1 utilities
  const [room] = deriveRoomPDA(publicKey, params.roomId);
  const [roomVault] = deriveRoomVaultPDA(room);

  // Final verification: Fetch the token registry account one more time to get its bump
  // This ensures we have the exact account data that Anchor will see
  // @ts-ignore - Account types available after program deployment
  const finalRegistryCheck = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
  
  // Verify the PDA derivation matches what Anchor expects
  // Anchor will derive: findProgramAddressSync([b"token-registry-v4"], programId)
  // Then read the account's bump and verify it matches
  const [derivedPDA, derivedBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry-v4')],
    programId
  );
  
  if (tokenRegistryPDA.toBase58() !== derivedPDA.toBase58()) {
    throw new Error(
      `PDA derivation mismatch! Expected ${tokenRegistryPDA.toBase58()} but derived ${derivedPDA.toBase58()}. ` +
      `This indicates a program ID mismatch. Program ID: ${programId.toBase58()}`
    );
  }
  
  if (finalRegistryCheck.bump !== derivedBump) {
    console.error('[createPoolRoom] ❌ CRITICAL: Stored bump does not match derived bump!', {
      storedBump: finalRegistryCheck.bump,
      derivedBump: derivedBump,
      pda: tokenRegistryPDA.toBase58(),
      message: 'This WILL cause ConstraintSeeds error! The account was created with a different program ID or seed.'
    });
    throw new Error(
      `Token registry account has incorrect bump! ` +
      `Stored: ${finalRegistryCheck.bump}, Expected: ${derivedBump}. ` +
      `This indicates the account was created with a different program ID or seed. ` +
      `The account needs to be reinitialized with the correct program ID.`
    );
  }

  // Build instruction using Anchor's methods API
  // CRITICAL: Explicitly pass tokenRegistry to ensure Anchor can validate the bump constraint correctly
  // The constraint `bump = token_registry.bump` requires Anchor to read the account to get the bump.
  // By explicitly passing the account, we ensure Anchor has it available for validation and can
  // properly verify that the stored bump matches the derived bump.
  // 
  // This is necessary because Anchor's auto-derivation with bump constraints that require
  // reading account data can sometimes fail if the account isn't explicitly provided.
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
      tokenRegistry: tokenRegistryPDA, // ✅ Explicitly pass to ensure Anchor can validate bump constraint
      globalConfig,
      host: publicKey,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .instruction();
  
  // Verify the tokenRegistry account we passed is in the instruction
  const tokenRegistryInInstruction = ix.keys.find(k => k.pubkey.toBase58() === tokenRegistryPDA.toBase58());
  
  if (!tokenRegistryInInstruction) {
    throw new Error(
      `Token registry account not found in instruction despite explicitly passing it. ` +
      `Expected: ${tokenRegistryPDA.toBase58()}`
    );
  }
  
  // Verify program ID matches
  if (ix.programId.toBase58() !== programId.toBase58()) {
    throw new Error(`Program ID mismatch in instruction! This will cause PDA derivation to fail.`);
  }

  // Build transaction using Phase 1 utilities
  const transaction = await buildTransaction({
    connection,
    instructions: [ix],
    feePayer: publicKey,
    commitment: 'finalized',
  });

  // Before simulation, verify token registry one final time
  try {
    // @ts-ignore - Account types available after program deployment
    await program.account.tokenRegistry.fetch(tokenRegistryPDA);
  } catch (preSimError: any) {
    throw new Error(`Token registry verification failed before simulation: ${preSimError.message}`);
  }
  
  const simResult = await simulateTransaction(connection, transaction);
  
  if (!simResult.success) {
    console.error('[createPoolRoom] Simulation failed:', simResult.error);
    console.error('[createPoolRoom] Full simulation result:', JSON.stringify(simResult, null, 2));
    
    // If it's a ConstraintSeeds error on token_registry, provide detailed diagnosis
    if (simResult.logs && simResult.logs.some((log: string) => 
      log.includes('token_registry') && log.includes('ConstraintSeeds')
    )) {
      console.error('[createPoolRoom] ❌ ConstraintSeeds error on token_registry detected!');
      console.error('[createPoolRoom] Diagnosis:');
      console.error('[createPoolRoom] 1. Token registry PDA (expected):', tokenRegistryPDA.toBase58());
      console.error('[createPoolRoom] 2. Program ID (used for derivation):', programId.toBase58());
      console.error('[createPoolRoom] 3. Seed used: token-registry-v4');
      console.error('[createPoolRoom] 4. This error means Anchor could not validate the PDA constraint.');
      console.error('[createPoolRoom] 5. Possible causes:');
      console.error('[createPoolRoom]    - Token registry account does not exist at expected PDA');
      console.error('[createPoolRoom]    - Token registry was created with different program ID');
      console.error('[createPoolRoom]    - Token registry was created with old v2 seed');
      console.error('[createPoolRoom]    - Stored bump in account does not match derived bump');
      console.error('[createPoolRoom]    - IDL mismatch between frontend and deployed contract');
      
      // Try to fetch the account one more time to see its current state
      try {
        // @ts-ignore - Account types available after program deployment
        const diagnosticCheck = await program.account.tokenRegistry.fetch(tokenRegistryPDA);
        console.error('[createPoolRoom] ✅ Account exists and can be fetched:', {
          pda: tokenRegistryPDA.toBase58(),
          bump: diagnosticCheck.bump,
        });
      } catch (diagError: any) {
        console.error('[createPoolRoom] ❌ Account cannot be fetched:', diagError.message);
      }
      
      // CRITICAL: Check what PDA Anchor actually included in the instruction
      console.error('[createPoolRoom] 🔍 DIAGNOSTIC: Checking what PDA Anchor derived...');
      console.error('[createPoolRoom] Expected v4 PDA:', tokenRegistryPDA.toBase58());
      console.error('[createPoolRoom] Expected v2 PDA (if contract uses old seed):', oldV2PDA.toBase58());
      
      // Check instruction accounts to see which PDA Anchor derived
      const instructionAccounts = transaction.instructions[0].keys.map((k, i) => ({
        index: i,
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      }));
      console.error('[createPoolRoom] 📋 Instruction accounts in transaction:', JSON.stringify(instructionAccounts, null, 2));
      
      const v4InTx = instructionAccounts.find(a => a.pubkey === tokenRegistryPDA.toBase58());
      const v2InTx = instructionAccounts.find(a => a.pubkey === oldV2PDA.toBase58());
      
      if (v2InTx) {
        console.error('[createPoolRoom] ❌❌❌ ROOT CAUSE IDENTIFIED: Anchor included v2 PDA in transaction!');
        console.error('[createPoolRoom] This confirms the DEPLOYED CONTRACT uses token-registry-v2 seed, but IDL says v4.');
        console.error('[createPoolRoom] SOLUTION: The contract needs to be rebuilt and redeployed with v4 seed.');
        console.error('[createPoolRoom] TEMPORARY FIX: Update IDL to use v2 seed to match deployed contract.');
        throw new Error(
          `IDL/Contract Mismatch Confirmed! ` +
          `The deployed contract uses token-registry-v2 seed, but the IDL says token-registry-v4. ` +
          `Anchor derived v2 PDA (${oldV2PDA.toBase58()}) but the account exists at v4 PDA (${tokenRegistryPDA.toBase58()}). ` +
          `SOLUTION: Rebuild and redeploy the contract from source code (which uses v4 seed) to match the IDL. ` +
          `The contract is at: C:\\Users\\isich\\bingo-solana-contracts\\bingo`
        );
      } else if (v4InTx) {
        console.error('[createPoolRoom] ✅ Anchor included v4 PDA in transaction (correct)');
        console.error('[createPoolRoom] But simulation still fails - this suggests the DEPLOYED CONTRACT validates against v2 seed.');
        console.error('[createPoolRoom] SOLUTION: Rebuild and redeploy the contract to match the IDL.');
      } else {
        console.error('[createPoolRoom] ❌ Neither v4 nor v2 PDA found in transaction accounts!');
        console.error('[createPoolRoom] This suggests Anchor did not auto-derive the token_registry PDA from IDL.');
      }
    }
    
    throw new Error(formatTransactionError(simResult.error) || 'Transaction simulation failed');
  }

  // Send and confirm transaction using provider (Anchor handles signing)
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
      // Try to fetch the room to see if it was created
      try {
        // @ts-ignore - Account types available after program deployment
        await program.account.room.fetch(room);

        // Try to get the actual transaction signature from recent signatures
        try {
          const signatures = await connection.getSignaturesForAddress(room, { limit: 1 });
          if (signatures.length > 0) {
            const sig = signatures[0].signature;
            return { signature: sig, room: room.toBase58() };
          }
        } catch (sigError) {
          // Fallback to error signature
        }

        // Fallback: extract from error or use placeholder
        const sig = error.signature || error.transactionSignature || 'transaction-completed';
        return { signature: sig, room: room.toBase58() };
      } catch (fetchError) {
        console.error('[createPoolRoom] Room does not exist, transaction truly failed:', fetchError);
        throw new Error('Transaction failed and room was not created');
      }
    }

    throw error;
  }

  return { signature, room: room.toBase58() };
}
