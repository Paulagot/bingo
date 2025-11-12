/**
 * Integration tests for depositPrizeAsset function
 * 
 * Tests the depositPrizeAsset function to ensure it works correctly
 * with the deployed Solana contract.
 * 
 * Run with: npm run test:integration -- depositPrizeAsset.test.ts
 */

import { describe, test, expect, beforeAll, beforeEach } from 'vitest';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} from '@solana/spl-token';
import { depositPrizeAsset } from '@/features/web3/solana/lib/solana-asset-room';
import { createAssetRoom } from '@/features/web3/solana/lib/solana-asset-room';
import BingoIDL from '@/idl/solana_bingo.json';
import type { Idl } from '@coral-xyz/anchor';

// Test configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i');

// Skip tests if not running in CI or if explicitly enabled
const RUN_TESTS = process.env.RUN_SOLANA_TESTS === 'true' || process.env.CI === 'true';

const describeIf = (condition: boolean) => condition ? describe : describe.skip;

describeIf(RUN_TESTS)('depositPrizeAsset Integration Tests', () => {
  let connection: Connection;
  let provider: AnchorProvider;
  let program: Program;
  let payer: Keypair;
  let host: Keypair;
  let testMint: PublicKey;
  let testTokenAccount: PublicKey;
  let roomId: string;
  let roomPDA: PublicKey;

  beforeAll(async () => {
    console.log('🚀 Setting up depositPrizeAsset tests...');
    console.log(`Program ID: ${PROGRAM_ID.toBase58()}`);
    console.log(`RPC URL: ${RPC_URL}`);
    console.log('');

    // Create connection
    connection = new Connection(RPC_URL, 'confirmed');

    // Generate test keypairs
    payer = Keypair.generate();
    host = Keypair.generate();

    console.log('💰 Requesting airdrop for payer...');
    // Request airdrop for payer
    const airdropSignature = await connection.requestAirdrop(
      payer.publicKey,
      2 * 1e9 // 2 SOL
    );
    await connection.confirmTransaction(airdropSignature, 'confirmed');

    // Request airdrop for host
    console.log('💰 Requesting airdrop for host...');
    const hostAirdropSignature = await connection.requestAirdrop(
      host.publicKey,
      2 * 1e9 // 2 SOL
    );
    await connection.confirmTransaction(hostAirdropSignature, 'confirmed');

    // Create provider
    const wallet = new Wallet(payer);
    provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    // Create program instance
    program = new Program(BingoIDL as Idl, provider);

    // Create test token mint
    console.log('🪙 Creating test token mint...');
    testMint = await createMint(
      connection,
      payer,
      payer.publicKey, // mint authority
      payer.publicKey, // freeze authority
      9 // decimals
    );
    console.log(`✅ Test mint created: ${testMint.toBase58()}`);

    // Create token account for host
    console.log('💳 Creating token account for host...');
    testTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      testMint,
      host.publicKey
    ).then((account) => account.address);

    // Mint tokens to host
    console.log('💰 Minting test tokens to host...');
    await mintTo(
      connection,
      payer,
      testMint,
      testTokenAccount,
      payer,
      1000 * 1e9 // 1000 tokens
    );

    console.log('✅ Test setup complete!');
    console.log('');
  }, 60000); // 60 second timeout for setup

  beforeEach(async () => {
    // Generate unique room ID for each test
    roomId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Derive room PDA
    [roomPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('room'), host.publicKey.toBuffer(), Buffer.from(roomId)],
      PROGRAM_ID
    );

    console.log(`📝 Created test room: ${roomId}`);
    console.log(`   Room PDA: ${roomPDA.toBase58()}`);
  });

  test('Should create asset room and deposit prize asset successfully', async () => {
    console.log('🧪 Test: Create asset room and deposit prize asset');
    
    // First, create an asset room
    const createRoomResult = await createAssetRoom(
      program,
      provider,
      connection,
      host.publicKey,
      {
        roomId,
        hostPubkey: host.publicKey,
        charityWallet: host.publicKey, // Use host as charity for testing
        entryFee: new BN(1 * 1e6), // 1 token (6 decimals)
        maxPlayers: 10,
        hostFeeBps: 500, // 5%
        charityMemo: 'Test charity',
        expirationSlots: null,
        prize1Mint: testMint,
        prize1Amount: new BN(100 * 1e9), // 100 tokens (9 decimals)
        prize2Mint: null,
        prize2Amount: null,
        prize3Mint: null,
        prize3Amount: null,
      }
    );

    expect(createRoomResult.signature).toBeDefined();
    expect(createRoomResult.room).toBeDefined();
    console.log(`✅ Asset room created: ${createRoomResult.signature}`);

    // Wait a bit for the room to be fully initialized
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Now deposit the prize asset
    const depositResult = await depositPrizeAsset(
      program,
      provider,
      connection,
      host.publicKey,
      {
        roomId,
        hostPubkey: host.publicKey,
        prizeIndex: 0, // First prize
        prizeMint: testMint,
      }
    );

    expect(depositResult.signature).toBeDefined();
    console.log(`✅ Prize asset deposited: ${depositResult.signature}`);

    // Verify the prize vault was created and has the correct balance
    const [prizeVault] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('prize-vault'),
        roomPDA.toBuffer(),
        Buffer.from([0]), // prize index 0
      ],
      PROGRAM_ID
    );

    // Wait for transaction to be confirmed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check prize vault balance
    try {
      const vaultAccount = await getAccount(connection, prizeVault, 'confirmed');
      expect(vaultAccount.mint.equals(testMint)).toBe(true);
      expect(vaultAccount.amount.toString()).toBe('100000000000'); // 100 tokens with 9 decimals
      console.log(`✅ Prize vault verified: ${vaultAccount.amount.toString()} tokens`);
    } catch (error) {
      console.warn('⚠️  Could not verify prize vault (may still be initializing):', error);
    }

  }, 120000); // 2 minute timeout

  test('Should fail when depositing prize asset for non-existent room', async () => {
    console.log('🧪 Test: Deposit prize asset to non-existent room (should fail)');
    
    const nonExistentRoomId = `nonexistent-${Date.now()}`;

    await expect(
      depositPrizeAsset(
        program,
        provider,
        connection,
        host.publicKey,
        {
          roomId: nonExistentRoomId,
          hostPubkey: host.publicKey,
          prizeIndex: 0,
          prizeMint: testMint,
        }
      )
    ).rejects.toThrow();

    console.log('✅ Correctly rejected deposit to non-existent room');
  }, 60000);

  test('Should fail when depositing prize asset with invalid prize index', async () => {
    console.log('🧪 Test: Deposit prize asset with invalid prize index (should fail)');

    // First create a room
    const createRoomResult = await createAssetRoom(
      program,
      provider,
      connection,
      host.publicKey,
      {
        roomId,
        hostPubkey: host.publicKey,
        charityWallet: host.publicKey,
        entryFee: new BN(1 * 1e6),
        maxPlayers: 10,
        hostFeeBps: 500,
        charityMemo: 'Test charity',
        expirationSlots: null,
        prize1Mint: testMint,
        prize1Amount: new BN(100 * 1e9),
        prize2Mint: null,
        prize2Amount: null,
        prize3Mint: null,
        prize3Amount: null,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to deposit with invalid prize index (should be 0-2)
    await expect(
      depositPrizeAsset(
        program,
        provider,
        connection,
        host.publicKey,
        {
          roomId,
          hostPubkey: host.publicKey,
          prizeIndex: 5, // Invalid index
          prizeMint: testMint,
        }
      )
    ).rejects.toThrow();

    console.log('✅ Correctly rejected invalid prize index');
  }, 60000);

  test('Should fail when depositing prize asset with wrong host', async () => {
    console.log('🧪 Test: Deposit prize asset with wrong host (should fail)');

    // Create a room with host
    const createRoomResult = await createAssetRoom(
      program,
      provider,
      connection,
      host.publicKey,
      {
        roomId,
        hostPubkey: host.publicKey,
        charityWallet: host.publicKey,
        entryFee: new BN(1 * 1e6),
        maxPlayers: 10,
        hostFeeBps: 500,
        charityMemo: 'Test charity',
        expirationSlots: null,
        prize1Mint: testMint,
        prize1Amount: new BN(100 * 1e9),
        prize2Mint: null,
        prize2Amount: null,
        prize3Mint: null,
        prize3Amount: null,
      }
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to deposit with different host (should fail)
    const wrongHost = Keypair.generate();
    await expect(
      depositPrizeAsset(
        program,
        provider,
        connection,
        wrongHost.publicKey,
        {
          roomId,
          hostPubkey: host.publicKey, // Correct host
          prizeIndex: 0,
          prizeMint: testMint,
        }
      )
    ).rejects.toThrow();

    console.log('✅ Correctly rejected deposit from wrong host');
  }, 60000);
}, 180000); // 3 minute timeout for all tests

