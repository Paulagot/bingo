/**
 * IDL Sync Script
 *
 * Syncs the IDL from the contracts directory to the frontend.
 * Validates the IDL and ensures it's compatible with the frontend.
 *
 * Usage:
 *   npx ts-node scripts/sync-idl.ts
 *
 * Options:
 *   --contract-path <path>  Path to contract IDL (default: C:/Users/isich/bingo-solana-contracts/bingo/target/idl/bingo.json)
 *   --frontend-path <path>  Path to frontend IDL (default: src/idl/solana_bingo.json)
 *   --force                 Overwrite even if validation fails
 *   --verify                Run verification after sync
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const DEFAULT_CONTRACT_IDL = 'C:/Users/isich/bingo-solana-contracts/bingo/target/idl/bingo.json';
const DEFAULT_FRONTEND_IDL = join(__dirname, '../src/idl/solana_bingo.json');

/**
 * Validate IDL structure
 */
function validateIDL(idl: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!idl.address) {
    errors.push('Missing address field');
  }
  
  if (!idl.metadata) {
    errors.push('Missing metadata field');
  }
  
  if (!idl.instructions || !Array.isArray(idl.instructions)) {
    errors.push('Missing or invalid instructions array');
  }
  
  if (!idl.accounts || !Array.isArray(idl.accounts)) {
    errors.push('Missing or invalid accounts array');
  }
  
  // Validate program ID format
  if (idl.address && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(idl.address)) {
    errors.push(`Invalid program address format: ${idl.address}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sync IDL from contracts to frontend
 */
async function syncIDL(
  contractPath: string = DEFAULT_CONTRACT_IDL,
  frontendPath: string = DEFAULT_FRONTEND_IDL,
  force: boolean = false,
  verify: boolean = true
): Promise<void> {
  console.log('🔄 Syncing IDL from contracts to frontend...\n');
  console.log(`Contract IDL: ${contractPath}`);
  console.log(`Frontend IDL: ${frontendPath}\n`);
  
  try {
    // Check if contract IDL exists
    if (!existsSync(contractPath)) {
      throw new Error(`Contract IDL not found: ${contractPath}\n\nPlease build the contracts first:\n  cd C:/Users/isich/bingo-solana-contracts/bingo\n  anchor build`);
    }
    
    // Read contract IDL
    console.log('📥 Reading contract IDL...');
    const contractIdlContent = readFileSync(contractPath, 'utf8');
    const contractIdl = JSON.parse(contractIdlContent);
    
    // Validate contract IDL
    console.log('✅ Validating contract IDL...');
    const validation = validateIDL(contractIdl);
    if (!validation.valid) {
      console.error('❌ Contract IDL validation failed:');
      validation.errors.forEach(err => console.error(`   - ${err}`));
      if (!force) {
        throw new Error('IDL validation failed. Use --force to overwrite anyway.');
      }
      console.warn('⚠️  Continuing with --force flag...\n');
    }
    
    // Read existing frontend IDL if it exists
    let existingIdl: any = null;
    if (existsSync(frontendPath)) {
      console.log('📄 Reading existing frontend IDL...');
      try {
        const existingContent = readFileSync(frontendPath, 'utf8');
        existingIdl = JSON.parse(existingContent);
        console.log(`   Current address: ${existingIdl.address}`);
        console.log(`   Current instructions: ${existingIdl.instructions?.length || 0}`);
      } catch (error: any) {
        console.warn(`   ⚠️  Could not read existing IDL: ${error.message}`);
      }
    }
    
    // Ensure address matches (use contract address)
    const syncedIdl = {
      ...contractIdl,
      address: contractIdl.address, // Ensure address is set
    };
    
    // Format JSON with proper indentation
    const formattedIdl = JSON.stringify(syncedIdl, null, 2);
    
    // Write to frontend
    console.log('💾 Writing to frontend IDL...');
    writeFileSync(frontendPath, formattedIdl, 'utf8');
    
    console.log('✅ IDL synced successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Sync Summary');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`Program ID: ${syncedIdl.address}`);
    console.log(`Program Name: ${syncedIdl.metadata?.name || 'N/A'}`);
    console.log(`Version: ${syncedIdl.metadata?.version || 'N/A'}`);
    console.log(`Instructions: ${syncedIdl.instructions?.length || 0}`);
    console.log(`Accounts: ${syncedIdl.accounts?.length || 0}`);
    console.log(`Errors: ${syncedIdl.errors?.length || 0}\n`);
    
    if (existingIdl) {
      const instructionDiff = (syncedIdl.instructions?.length || 0) - (existingIdl.instructions?.length || 0);
      if (instructionDiff !== 0) {
        console.log(`📈 Instruction count changed: ${instructionDiff > 0 ? '+' : ''}${instructionDiff}\n`);
      }
      
      if (existingIdl.address !== syncedIdl.address) {
        console.log(`⚠️  Program ID changed: ${existingIdl.address} → ${syncedIdl.address}\n`);
      }
    }
    
    // Run verification if requested
    if (verify) {
      console.log('🔍 Running verification...\n');
      try {
        // Import and run verification
        const { execSync } = await import('child_process');
        execSync(`npx ts-node scripts/verify-idl.ts --contract-path "${contractPath}" --frontend-path "${frontendPath}"`, {
          stdio: 'inherit',
          cwd: join(__dirname, '..'),
        });
      } catch (error) {
        console.warn('⚠️  Verification failed, but IDL was synced. Please review manually.\n');
      }
    }
    
    console.log('✅ Sync complete!\n');
  } catch (error: any) {
    console.error('❌ Error syncing IDL:', error.message);
    if (error.code === 'ENOENT') {
      console.error(`   File not found. Check the path: ${error.path}`);
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let contractPath = DEFAULT_CONTRACT_IDL;
let frontendPath = DEFAULT_FRONTEND_IDL;
let force = false;
let verify = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--contract-path' && args[i + 1]) {
    contractPath = args[i + 1];
    i++;
  } else if (args[i] === '--frontend-path' && args[i + 1]) {
    frontendPath = args[i + 1];
    i++;
  } else if (args[i] === '--force') {
    force = true;
  } else if (args[i] === '--no-verify') {
    verify = false;
  }
}

// Run sync
syncIDL(contractPath, frontendPath, force, verify).catch(console.error);

