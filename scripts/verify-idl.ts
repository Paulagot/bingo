/**
 * IDL Verification Script
 *
 * Compares the frontend IDL with the contract IDL and verifies:
 * - Program addresses match
 * - Instruction names and discriminators match
 * - PDA seeds match between frontend and contract
 * - Account structures are compatible
 *
 * Usage:
 *   npx ts-node scripts/verify-idl.ts
 *
 * Options:
 *   --contract-path <path>  Path to contract IDL (default: C:/Users/isich/bingo-solana-contracts/bingo/target/idl/bingo.json)
 *   --frontend-path <path>  Path to frontend IDL (default: src/idl/solana_bingo.json)
 *   --verbose              Show detailed differences
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default paths
const DEFAULT_CONTRACT_IDL = 'C:/Users/isich/bingo-solana-contracts/bingo/target/idl/bingo.json';
const DEFAULT_FRONTEND_IDL = join(__dirname, '../src/idl/solana_bingo.json');

interface IDLDifference {
  type: 'instruction' | 'account' | 'pda' | 'arg' | 'error' | 'metadata';
  path: string;
  frontend: any;
  contract: any;
  message: string;
}

interface VerificationResult {
  success: boolean;
  differences: IDLDifference[];
  pdaSeedsMatch: boolean;
  programIdMatch: boolean;
  instructionCountMatch: boolean;
}

/**
 * Extract PDA seeds from IDL account definitions
 */
function extractPDASeeds(idl: any): Map<string, string[]> {
  const seeds = new Map<string, string[]>();
  
  if (!idl.instructions) return seeds;
  
  for (const instruction of idl.instructions) {
    if (!instruction.accounts) continue;
    
    for (const account of instruction.accounts) {
      if (account.pda?.seeds) {
        const seedValues: string[] = [];
        for (const seed of account.pda.seeds) {
          if (seed.kind === 'const' && seed.value) {
            // Convert byte array to string
            const seedString = Buffer.from(seed.value).toString('utf8');
            seedValues.push(seedString);
          }
        }
        if (seedValues.length > 0) {
          seeds.set(account.name, seedValues);
        }
      }
    }
  }
  
  return seeds;
}

/**
 * Compare two IDL files and report differences
 */
function compareIDL(frontendIdl: any, contractIdl: any): VerificationResult {
  const differences: IDLDifference[] = [];
  
  // Check program address
  const programIdMatch = frontendIdl.address === contractIdl.address;
  if (!programIdMatch) {
    differences.push({
      type: 'metadata',
      path: 'address',
      frontend: frontendIdl.address,
      contract: contractIdl.address,
      message: `Program ID mismatch: frontend has ${frontendIdl.address}, contract has ${contractIdl.address}`,
    });
  }
  
  // Check metadata
  if (frontendIdl.metadata?.name !== contractIdl.metadata?.name) {
    differences.push({
      type: 'metadata',
      path: 'metadata.name',
      frontend: frontendIdl.metadata?.name,
      contract: contractIdl.metadata?.name,
      message: 'Program name mismatch',
    });
  }
  
  // Check instruction count
  const frontendInstructions = frontendIdl.instructions || [];
  const contractInstructions = contractIdl.instructions || [];
  const instructionCountMatch = frontendInstructions.length === contractInstructions.length;
  
  if (!instructionCountMatch) {
    differences.push({
      type: 'instruction',
      path: 'instructions.length',
      frontend: frontendInstructions.length,
      contract: contractInstructions.length,
      message: `Instruction count mismatch: frontend has ${frontendInstructions.length}, contract has ${contractInstructions.length}`,
    });
  }
  
  // Create instruction maps for comparison
  const frontendInstructionMap = new Map(
    frontendInstructions.map((ix: any) => [ix.name, ix])
  );
  const contractInstructionMap = new Map(
    contractInstructions.map((ix: any) => [ix.name, ix])
  );
  
  // Check for missing instructions
  for (const [name, contractIx] of contractInstructionMap) {
    if (!frontendInstructionMap.has(name)) {
      differences.push({
        type: 'instruction',
        path: `instructions.${name}`,
        frontend: null,
        contract: name,
        message: `Missing instruction in frontend: ${name}`,
      });
    }
  }
  
  // Check for extra instructions
  for (const [name, frontendIx] of frontendInstructionMap) {
    if (!contractInstructionMap.has(name)) {
      differences.push({
        type: 'instruction',
        path: `instructions.${name}`,
        frontend: name,
        contract: null,
        message: `Extra instruction in frontend: ${name}`,
      });
    }
  }
  
  // Compare instruction details
  for (const [name, contractIx] of contractInstructionMap) {
    const frontendIx = frontendInstructionMap.get(name);
    if (!frontendIx) continue;
    
    // Check discriminators
    const frontendDisc = JSON.stringify(frontendIx.discriminator);
    const contractDisc = JSON.stringify(contractIx.discriminator);
    if (frontendDisc !== contractDisc) {
      differences.push({
        type: 'instruction',
        path: `instructions.${name}.discriminator`,
        frontend: frontendIx.discriminator,
        contract: contractIx.discriminator,
        message: `Discriminator mismatch for ${name}`,
      });
    }
    
    // Check account count
    const frontendAccounts = frontendIx.accounts || [];
    const contractAccounts = contractIx.accounts || [];
    if (frontendAccounts.length !== contractAccounts.length) {
      differences.push({
        type: 'account',
        path: `instructions.${name}.accounts.length`,
        frontend: frontendAccounts.length,
        contract: contractAccounts.length,
        message: `Account count mismatch for ${name}: frontend has ${frontendAccounts.length}, contract has ${contractAccounts.length}`,
      });
    }
    
    // Check PDA seeds
    for (let i = 0; i < Math.min(frontendAccounts.length, contractAccounts.length); i++) {
      const frontendAcc = frontendAccounts[i];
      const contractAcc = contractAccounts[i];
      
      if (frontendAcc.name !== contractAcc.name) {
        differences.push({
          type: 'account',
          path: `instructions.${name}.accounts[${i}].name`,
          frontend: frontendAcc.name,
          contract: contractAcc.name,
          message: `Account name mismatch at index ${i} in ${name}`,
        });
      }
      
      // Compare PDA seeds
      if (frontendAcc.pda || contractAcc.pda) {
        const frontendSeeds = frontendAcc.pda?.seeds || [];
        const contractSeeds = contractAcc.pda?.seeds || [];
        
        if (JSON.stringify(frontendSeeds) !== JSON.stringify(contractSeeds)) {
          differences.push({
            type: 'pda',
            path: `instructions.${name}.accounts[${i}].pda.seeds`,
            frontend: frontendSeeds,
            contract: contractSeeds,
            message: `PDA seed mismatch for ${frontendAcc.name} in ${name}`,
          });
        }
      }
    }
  }
  
  return {
    success: differences.length === 0,
    differences,
    pdaSeedsMatch: differences.filter(d => d.type === 'pda').length === 0,
    programIdMatch,
    instructionCountMatch,
  };
}

/**
 * Verify PDA seeds match frontend constants
 */
function verifyPDASeeds(contractIdl: any): { match: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  
  // Expected seeds from frontend config
  // Note: Account names in IDL use underscores (global_config), but seeds use hyphens (global-config)
  // Note: player_entry uses seed "player" (not "player-entry") to match Rust contract
  const expectedSeeds: Record<string, string> = {
    'global_config': 'global-config',      // Account name: global_config, seed: global-config
    'token_registry': 'token-registry-v4', // Account name: token_registry, seed: token-registry-v4
    'room': 'room',                         // Account name: room, seed: room
    'room_vault': 'room-vault',            // Account name: room_vault, seed: room-vault
    'player_entry': 'player',              // Account name: player_entry, seed: "player" (not "player-entry")
    'prize_vault': 'prize-vault',          // Account name: prize_vault, seed: prize-vault (may not be in all instructions)
  };
  
  // Extract seeds from IDL
  const idlSeeds = extractPDASeeds(contractIdl);
  
  // Debug: log all found seeds
  if (idlSeeds.size > 0) {
    console.log('   Found PDA seeds in IDL:');
    idlSeeds.forEach((seeds, accountName) => {
      console.log(`     ${accountName}: [${seeds.join(', ')}]`);
    });
    console.log('');
  }
  
  // Check each expected seed
  for (const [accountName, expectedSeed] of Object.entries(expectedSeeds)) {
    const idlSeedArray = idlSeeds.get(accountName);
    if (!idlSeedArray || !idlSeedArray.includes(expectedSeed)) {
      // Note: prize_vault may not appear as PDA in all instructions (it's passed as regular account in add_prize_asset)
      // But it's still a PDA in the contract code, so we only warn if it's found with wrong seed
      if (accountName === 'prize_vault' && !idlSeedArray) {
        // This is OK - prize_vault is a PDA but may not be defined in IDL for all instructions
        continue;
      }
      mismatches.push(
        `${accountName}: expected seed "${expectedSeed}", found ${JSON.stringify(idlSeedArray)}`
      );
    }
  }
  
  return {
    match: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Main verification function
 */
async function verifyIDL(
  contractPath: string = DEFAULT_CONTRACT_IDL,
  frontendPath: string = DEFAULT_FRONTEND_IDL,
  verbose: boolean = false
): Promise<void> {
  console.log('🔍 Verifying IDL compatibility...\n');
  console.log(`Contract IDL: ${contractPath}`);
  console.log(`Frontend IDL: ${frontendPath}\n`);
  
  try {
    // Read IDL files
    const contractIdl = JSON.parse(readFileSync(contractPath, 'utf8'));
    const frontendIdl = JSON.parse(readFileSync(frontendPath, 'utf8'));
    
    // Compare IDLs
    const result = compareIDL(frontendIdl, contractIdl);
    
    // Verify PDA seeds
    const pdaResult = verifyPDASeeds(contractIdl);
    
    // Print results
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Verification Results');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`✅ Program ID Match: ${result.programIdMatch ? 'YES' : 'NO'}`);
    if (result.programIdMatch) {
      console.log(`   Address: ${contractIdl.address}\n`);
    }
    
    console.log(`✅ Instruction Count Match: ${result.instructionCountMatch ? 'YES' : 'NO'}`);
    if (result.instructionCountMatch) {
      console.log(`   Count: ${contractIdl.instructions?.length || 0} instructions\n`);
    }
    
    console.log(`✅ PDA Seeds Match: ${pdaResult.match ? 'YES' : 'NO'}`);
    if (!pdaResult.match) {
      console.log('   Mismatches:');
      pdaResult.mismatches.forEach(m => console.log(`   - ${m}`));
      console.log('');
    }
    
    console.log(`✅ Overall Compatibility: ${result.success && pdaResult.match ? 'YES ✅' : 'NO ❌'}\n`);
    
    if (result.differences.length > 0) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('⚠️  Differences Found');
      console.log('═══════════════════════════════════════════════════════\n');
      
      if (verbose) {
        result.differences.forEach((diff, index) => {
          console.log(`${index + 1}. [${diff.type.toUpperCase()}] ${diff.path}`);
          console.log(`   ${diff.message}`);
          if (diff.frontend !== null && diff.contract !== null) {
            console.log(`   Frontend: ${JSON.stringify(diff.frontend)}`);
            console.log(`   Contract: ${JSON.stringify(diff.contract)}`);
          }
          console.log('');
        });
      } else {
        console.log(`Found ${result.differences.length} difference(s). Use --verbose for details.\n`);
      }
    }
    
    if (!result.success || !pdaResult.match) {
      console.log('💡 Recommendation: Run `npm run sync-idl` to update the frontend IDL.\n');
      process.exit(1);
    } else {
      console.log('✅ All checks passed! IDL is in sync.\n');
    }
  } catch (error: any) {
    console.error('❌ Error verifying IDL:', error.message);
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
let verbose = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--contract-path' && args[i + 1]) {
    contractPath = args[i + 1];
    i++;
  } else if (args[i] === '--frontend-path' && args[i + 1]) {
    frontendPath = args[i + 1];
    i++;
  } else if (args[i] === '--verbose') {
    verbose = true;
  }
}

// Run verification
verifyIDL(contractPath, frontendPath, verbose).catch(console.error);

