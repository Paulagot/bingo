/**
 * @module shared/lib/solana/idl-utils
 *
 * ## Purpose
 * Utilities for working with Solana IDL files, including validation,
 * PDA seed extraction, and debugging tools.
 *
 * These utilities help ensure the frontend IDL matches the deployed contract
 * and can help debug issues when they don't match.
 *
 * @example
 * ```typescript
 * import { extractPDASeeds, validateIDL } from '@/shared/lib/solana/idl-utils';
 * import BingoIDL from '@/idl/solana_bingo.json';
 *
 * // Extract PDA seeds from IDL
 * const seeds = extractPDASeeds(BingoIDL);
 * console.log('Token registry seed:', seeds.get('token_registry'));
 *
 * // Validate IDL structure
 * const validation = validateIDL(BingoIDL);
 * if (!validation.valid) {
 *   console.error('IDL validation errors:', validation.errors);
 * }
 * ```
 */

import type { Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, PDA_SEEDS } from './config';

/**
 * Extract PDA seeds from an IDL
 *
 * Returns a map of account names to their PDA seed arrays.
 * Only includes accounts with PDA definitions.
 *
 * @param idl - Anchor IDL object
 * @returns Map of account names to seed arrays
 */
export function extractPDASeeds(idl: Idl): Map<string, string[]> {
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
 * Validate IDL structure
 *
 * Checks that the IDL has required fields and valid structure.
 *
 * @param idl - Anchor IDL object
 * @returns Validation result with errors array
 */
export function validateIDL(idl: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!idl.address) {
    errors.push('Missing address field');
  } else if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(idl.address)) {
    errors.push(`Invalid program address format: ${idl.address}`);
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
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Verify PDA seeds match frontend constants
 *
 * Compares PDA seeds extracted from IDL with the frontend PDA_SEEDS constants.
 * This helps catch mismatches between the contract and frontend.
 *
 * @param idl - Anchor IDL object
 * @returns Verification result with mismatches array
 */
export function verifyPDASeeds(idl: Idl): { match: boolean; mismatches: string[] } {
  const mismatches: string[] = [];
  
  // Expected seeds from frontend config
  // Note: player_entry uses seed "player" (not "player-entry") to match Rust contract
  const expectedSeeds: Record<string, string> = {
    'token_registry': PDA_SEEDS.TOKEN_REGISTRY,
    'global_config': PDA_SEEDS.GLOBAL_CONFIG,
    'room': PDA_SEEDS.ROOM,
    'room_vault': PDA_SEEDS.ROOM_VAULT,
    'player_entry': PDA_SEEDS.PLAYER_ENTRY, // Uses "player" seed
    'prize_vault': PDA_SEEDS.PRIZE_VAULT,
  };
  
  // Extract seeds from IDL
  const idlSeeds = extractPDASeeds(idl);
  
  // Check each expected seed
  for (const [accountName, expectedSeed] of Object.entries(expectedSeeds)) {
    const idlSeedArray = idlSeeds.get(accountName);
    if (!idlSeedArray || !idlSeedArray.includes(expectedSeed)) {
      mismatches.push(
        `${accountName}: expected "${expectedSeed}", found ${JSON.stringify(idlSeedArray)}`
      );
    }
  }
  
  return {
    match: mismatches.length === 0,
    mismatches,
  };
}

/**
 * Verify program ID matches
 *
 * Checks that the IDL address matches the frontend PROGRAM_ID constant.
 *
 * @param idl - Anchor IDL object
 * @returns True if program IDs match
 */
export function verifyProgramID(idl: Idl): boolean {
  if (!idl.address) return false;
  
  try {
    const idlProgramId = new PublicKey(idl.address);
    return idlProgramId.equals(PROGRAM_ID);
  } catch {
    return false;
  }
}

/**
 * Get instruction by name
 *
 * Helper to find an instruction in the IDL by name.
 *
 * @param idl - Anchor IDL object
 * @param name - Instruction name
 * @returns Instruction object or null if not found
 */
export function getInstruction(idl: Idl, name: string): any | null {
  if (!idl.instructions) return null;
  
  return idl.instructions.find(ix => ix.name === name) || null;
}

/**
 * Get account by name from an instruction
 *
 * Helper to find an account in an instruction by name.
 *
 * @param instruction - Instruction object
 * @param accountName - Account name
 * @returns Account object or null if not found
 */
export function getAccount(instruction: any, accountName: string): any | null {
  if (!instruction.accounts) return null;
  
  return instruction.accounts.find((acc: any) => acc.name === accountName) || null;
}

/**
 * Debug IDL compatibility
 *
 * Comprehensive check of IDL compatibility with frontend configuration.
 * Returns a detailed report of any issues found.
 *
 * @param idl - Anchor IDL object
 * @returns Debug report with all findings
 */
export function debugIDL(idl: Idl): {
  programIdMatch: boolean;
  pdaSeedsMatch: boolean;
  pdaMismatches: string[];
  instructionCount: number;
  accountCount: number;
  errors: string[];
} {
  const validation = validateIDL(idl);
  const pdaVerification = verifyPDASeeds(idl);
  const programIdMatch = verifyProgramID(idl);
  
  return {
    programIdMatch,
    pdaSeedsMatch: pdaVerification.match,
    pdaMismatches: pdaVerification.mismatches,
    instructionCount: idl.instructions?.length || 0,
    accountCount: idl.accounts?.length || 0,
    errors: validation.errors,
  };
}

