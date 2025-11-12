/**
 * @module shared/lib/solana/debug-idl
 *
 * ## Purpose
 * Debug utilities for IDL and PDA compatibility issues.
 * Helps developers quickly identify mismatches between frontend and contract.
 *
 * @example
 * ```typescript
 * import { debugIDLCompatibility, checkPDADerivation } from '@/shared/lib/solana/debug-idl';
 * import BingoIDL from '@/idl/solana_bingo.json';
 *
 * // Check overall compatibility
 * const report = debugIDLCompatibility(BingoIDL);
 * console.log('Compatibility:', report);
 *
 * // Check specific PDA derivation
 * const [pda] = checkPDADerivation('room', ['room', hostPubkey, roomId]);
 * ```
 */

import type { Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PDA_SEEDS } from './config';
import { extractPDASeeds, verifyPDASeeds, verifyProgramID, validateIDL } from './idl-utils';

/**
 * Comprehensive IDL compatibility debug report
 *
 * Checks all aspects of IDL compatibility and returns a detailed report.
 *
 * @param idl - Anchor IDL object
 * @returns Detailed compatibility report
 */
export function debugIDLCompatibility(idl: Idl): {
  valid: boolean;
  programIdMatch: boolean;
  pdaSeedsMatch: boolean;
  pdaMismatches: string[];
  instructionCount: number;
  accountCount: number;
  validationErrors: string[];
  extractedSeeds: Map<string, string[]>;
} {
  const validation = validateIDL(idl);
  const pdaVerification = verifyPDASeeds(idl);
  const programIdMatch = verifyProgramID(idl);
  const extractedSeeds = extractPDASeeds(idl);
  
  return {
    valid: validation.valid,
    programIdMatch,
    pdaSeedsMatch: pdaVerification.match,
    pdaMismatches: pdaVerification.mismatches,
    instructionCount: idl.instructions?.length || 0,
    accountCount: idl.accounts?.length || 0,
    validationErrors: validation.errors,
    extractedSeeds,
  };
}

/**
 * Check PDA derivation matches expected seeds
 *
 * Verifies that a PDA derivation produces the expected address using
 * the specified seeds. Useful for debugging PDA mismatches.
 *
 * @param accountName - Name of the account (for error messages)
 * @param seeds - Array of seed values (strings, PublicKeys, or numbers)
 * @param expectedAddress - Optional expected PDA address to verify
 * @returns Tuple of [PDA address, bump seed]
 *
 * @example
 * ```typescript
 * const [roomPda] = checkPDADerivation('room', ['room', hostPubkey, roomId]);
 * console.log('Room PDA:', roomPda.toBase58());
 * ```
 */
export function checkPDADerivation(
  accountName: string,
  seeds: (string | PublicKey | number | Buffer)[],
  expectedAddress?: PublicKey
): [PublicKey, number] {
  const seedBuffers = seeds.map(seed => {
    if (typeof seed === 'string') {
      return Buffer.from(seed);
    } else if (seed instanceof PublicKey) {
      return seed.toBuffer();
    } else if (typeof seed === 'number') {
      return Buffer.from([seed]);
    } else if (Buffer.isBuffer(seed)) {
      return seed;
    } else {
      throw new Error(`Invalid seed type for ${accountName}: ${typeof seed}`);
    }
  });
  
  const [pda, bump] = PublicKey.findProgramAddressSync(seedBuffers, PROGRAM_ID);
  
  if (expectedAddress && !pda.equals(expectedAddress)) {
    throw new Error(
      `PDA mismatch for ${accountName}: expected ${expectedAddress.toBase58()}, got ${pda.toBase58()}`
    );
  }
  
  return [pda, bump];
}

/**
 * Compare two IDL files and generate a diff report
 *
 * Useful for comparing frontend IDL with contract IDL to find differences.
 *
 * @param idl1 - First IDL (e.g., frontend)
 * @param idl2 - Second IDL (e.g., contract)
 * @param idl1Name - Name for first IDL (default: 'IDL 1')
 * @param idl2Name - Name for second IDL (default: 'IDL 2')
 * @returns Diff report with differences
 */
export function compareIDLFiles(
  idl1: Idl,
  idl2: Idl,
  idl1Name: string = 'IDL 1',
  idl2Name: string = 'IDL 2'
): {
  programIdMatch: boolean;
  instructionCountMatch: boolean;
  missingInstructions: string[];
  extraInstructions: string[];
  instructionDifferences: Array<{
    name: string;
    discriminatorMatch: boolean;
    accountCountMatch: boolean;
    pdaSeedsMatch: boolean;
  }>;
} {
  const programIdMatch = idl1.address === idl2.address;
  const instructionCountMatch = (idl1.instructions?.length || 0) === (idl2.instructions?.length || 0);
  
  const idl1Instructions = new Map(
    (idl1.instructions || []).map(ix => [ix.name, ix])
  );
  const idl2Instructions = new Map(
    (idl2.instructions || []).map(ix => [ix.name, ix])
  );
  
  const missingInstructions: string[] = [];
  const extraInstructions: string[] = [];
  const instructionDifferences: Array<{
    name: string;
    discriminatorMatch: boolean;
    accountCountMatch: boolean;
    pdaSeedsMatch: boolean;
  }> = [];
  
  // Find missing and extra instructions
  for (const [name] of idl2Instructions) {
    if (!idl1Instructions.has(name)) {
      missingInstructions.push(name);
    }
  }
  
  for (const [name] of idl1Instructions) {
    if (!idl2Instructions.has(name)) {
      extraInstructions.push(name);
    }
  }
  
  // Compare common instructions
  for (const [name, ix1] of idl1Instructions) {
    const ix2 = idl2Instructions.get(name);
    if (!ix2) continue;
    
    const discriminatorMatch = JSON.stringify(ix1.discriminator) === JSON.stringify(ix2.discriminator);
    const accountCountMatch = (ix1.accounts?.length || 0) === (ix2.accounts?.length || 0);
    
    // Compare PDA seeds
    const seeds1 = extractPDASeeds({ instructions: [ix1] } as Idl);
    const seeds2 = extractPDASeeds({ instructions: [ix2] } as Idl);
    const pdaSeedsMatch = JSON.stringify(Array.from(seeds1.entries())) === JSON.stringify(Array.from(seeds2.entries()));
    
    instructionDifferences.push({
      name,
      discriminatorMatch,
      accountCountMatch,
      pdaSeedsMatch,
    });
  }
  
  return {
    programIdMatch,
    instructionCountMatch,
    missingInstructions,
    extraInstructions,
    instructionDifferences,
  };
}

/**
 * Print a formatted compatibility report
 *
 * Useful for console debugging and CI/CD checks.
 *
 * @param idl - Anchor IDL object
 */
export function printCompatibilityReport(idl: Idl): void {
  const report = debugIDLCompatibility(idl);
  
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 IDL Compatibility Report');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`✅ IDL Valid: ${report.valid ? 'YES' : 'NO'}`);
  if (!report.valid) {
    console.log('   Errors:');
    report.validationErrors.forEach(err => console.log(`     - ${err}`));
    console.log('');
  }
  
  console.log(`✅ Program ID Match: ${report.programIdMatch ? 'YES' : 'NO'}`);
  console.log(`✅ PDA Seeds Match: ${report.pdaSeedsMatch ? 'YES' : 'NO'}`);
  if (!report.pdaSeedsMatch) {
    console.log('   Mismatches:');
    report.pdaMismatches.forEach(m => console.log(`     - ${m}`));
    console.log('');
  }
  
  console.log(`📊 Statistics:`);
  console.log(`   Instructions: ${report.instructionCount}`);
  console.log(`   Accounts: ${report.accountCount}`);
  console.log(`   PDA Accounts: ${report.extractedSeeds.size}`);
  console.log('');
  
  if (report.extractedSeeds.size > 0) {
    console.log('📋 PDA Seeds Found:');
    report.extractedSeeds.forEach((seeds, accountName) => {
      console.log(`   ${accountName}: [${seeds.join(', ')}]`);
    });
    console.log('');
  }
  
  const allPassed = report.valid && report.programIdMatch && report.pdaSeedsMatch;
  console.log(`✅ Overall: ${allPassed ? 'COMPATIBLE ✅' : 'INCOMPATIBLE ❌'}\n`);
}

