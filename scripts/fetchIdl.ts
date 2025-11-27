/**
 * Fetch the IDL from a deployed Solana program and update src/idl/solana_bingo.json
 * 
 * Usage:
 *   npx ts-node scripts/fetchIdl.ts
 * 
 * Or with explicit program ID:
 *   npx ts-node scripts/fetchIdl.ts --program-id <PROGRAM_ID>
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default program ID (from config)
const DEFAULT_PROGRAM_ID = '7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn';
const IDL_FILE_PATH = join(__dirname, '../src/idl/solana_bingo.json');
const RPC_URL = 'https://api.devnet.solana.com';

async function fetchIdl(programId: string) {
  console.log('🔍 Fetching IDL from deployed program...');
  console.log(`Program ID: ${programId}`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log('');

  try {
    // Create connection
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Create a dummy wallet (we don't need to sign, just fetch)
    const wallet = new Wallet(Keypair.generate());
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    const programPublicKey = new PublicKey(programId);
    
    // Fetch the IDL from the deployed program
    console.log('📥 Fetching IDL from on-chain account...');
    const idl = await Program.fetchIdl(programPublicKey, provider);
    
    if (!idl) {
      throw new Error(`IDL not found for program ${programId}. Make sure the program is deployed and has an IDL account.`);
    }

    // Convert IDL to JSON format
    const idlJson = JSON.stringify(idl, null, 2);
    
    // Read existing IDL to preserve address if needed
    let existingIdl: any = null;
    try {
      const existingContent = readFileSync(IDL_FILE_PATH, 'utf-8');
      existingIdl = JSON.parse(existingContent);
    } catch (error) {
      console.log('⚠️  No existing IDL file found, creating new one');
    }

    // Ensure address matches
    const idlWithAddress = {
      ...idl,
      address: programId,
    };

    // Write updated IDL
    const finalIdl = JSON.stringify(idlWithAddress, null, 2);
    writeFileSync(IDL_FILE_PATH, finalIdl, 'utf-8');
    
    console.log('✅ IDL successfully fetched and updated!');
    console.log(`📄 Saved to: ${IDL_FILE_PATH}`);
    console.log('');
    console.log('📊 IDL Summary:');
    console.log(`   Address: ${programId}`);
    console.log(`   Name: ${idl.metadata?.name || 'N/A'}`);
    console.log(`   Version: ${idl.metadata?.version || 'N/A'}`);
    console.log(`   Instructions: ${idl.instructions?.length || 0}`);
    console.log(`   Accounts: ${idl.accounts?.length || 0}`);
    console.log(`   Events: ${idl.events?.length || 0}`);
    console.log(`   Errors: ${idl.errors?.length || 0}`);
    
    // Check if add_prize_asset instruction exists
    const addPrizeAssetInstruction = idl.instructions?.find(
      (ix: any) => ix.name === 'add_prize_asset'
    );
    
    if (addPrizeAssetInstruction) {
      console.log('');
      console.log('✅ add_prize_asset instruction found!');
      console.log(`   Accounts: ${addPrizeAssetInstruction.accounts?.length || 0}`);
      console.log(`   Args: ${addPrizeAssetInstruction.args?.length || 0}`);
    } else {
      console.log('');
      console.log('⚠️  add_prize_asset instruction not found in IDL');
    }

  } catch (error: any) {
    console.error('❌ Failed to fetch IDL:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('1. Make sure the program is deployed to devnet');
    console.error('2. Verify the program ID is correct');
    console.error('3. Check that the program has an IDL account');
    console.error('4. Ensure you have network access to the RPC endpoint');
    console.error('');
    process.exit(1);
  }
}

// Parse command line arguments
const programId = process.argv.find(arg => arg.startsWith('--program-id='))?.split('=')[1] || DEFAULT_PROGRAM_ID;

fetchIdl(programId).catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

