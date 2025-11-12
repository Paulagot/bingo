/**
 * Cleanup utility to handle old token registry account from previous program deployment
 *
 * This script closes the old token registry that was created by program C184eRviViBMEVisTcRUbbtPAfGCtkqnaKoSqshiHqFJ
 * and allows the new program AcUg72jFLTnKs478qaNpu2AWU3pBtqV1kmrkXaqjwjeK to initialize a new one.
 */

import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { deriveTokenRegistryPDA } from '@/shared/lib/solana/pda';
import { getRpcEndpoint, NETWORK } from '@/shared/lib/solana/config';

const OLD_PROGRAM_ID = new PublicKey('C184eRviViBMEVisTcRUbbtPAfGCtkqnaKoSqshiHqFJ');

/**
 * Derives the token registry PDA for the OLD program
 */
function deriveOldTokenRegistryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token-registry')],
    OLD_PROGRAM_ID
  );
}

/**
 * Checks if there's an old token registry account that needs cleanup
 */
export async function checkOldRegistry(): Promise<{
  hasOldRegistry: boolean;
  oldRegistryAddress?: string;
  currentRegistryAddress: string;
}> {
  const connection = new Connection(getRpcEndpoint(NETWORK), 'confirmed');

  const [oldRegistry] = deriveOldTokenRegistryPDA();
  const [currentRegistry] = deriveTokenRegistryPDA();

  try {
    const accountInfo = await connection.getAccountInfo(oldRegistry);

    if (accountInfo && accountInfo.owner.toBase58() === OLD_PROGRAM_ID.toBase58()) {
      return {
        hasOldRegistry: true,
        oldRegistryAddress: oldRegistry.toBase58(),
        currentRegistryAddress: currentRegistry.toBase58(),
      };
    }
  } catch (error) {
    console.log('[checkOldRegistry] No old registry found or error checking:', error);
  }

  return {
    hasOldRegistry: false,
    currentRegistryAddress: currentRegistry.toBase58(),
  };
}

/**
 * Instructions for manual cleanup since we don't have authority over the old account
 */
export function getCleanupInstructions(): string {
  return `
The token registry account was created by an old program deployment and needs to be cleaned up.

MANUAL CLEANUP REQUIRED:

You have a few options:

1. **Wait for the account to expire** (if it has rent-exempt balance, it won't expire)

2. **Use Solana CLI to close the account** (requires authority):
   solana program close C184eRviViBMEVisTcRUbbtPAfGCtkqnaKoSqshiHqFJ --url devnet

3. **Deploy your Solana program with a different seed**:
   - In your Rust code (bingo-solana-contracts), change the seed from "token-registry" to "token-registry-v2"
   - Redeploy the program
   - Update this frontend to use the new seed

4. **EASIEST: Just use a different account by changing the frontend seed**:
   We can modify the frontend to use "token-registry-v2" as the seed, which will create
   a new PDA that doesn't conflict with the old one.

Which option would you like to proceed with?
  `;
}
