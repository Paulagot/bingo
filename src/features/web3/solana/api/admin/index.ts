/**
 * @module features/web3/solana/api/admin
 *
 * Admin operations API module
 *
 * Provides functions for initializing and managing platform configuration,
 * token registry, and emergency controls. Admin-only operations.
 *
 * @example
 * ```typescript
 * import { initializeGlobalConfig, addApprovedToken } from '@/features/web3/solana/api/admin';
 *
 * await initializeGlobalConfig(context, platformWallet, charityWallet);
 * await addApprovedToken(context, tokenMint);
 * ```
 */

export { initializeGlobalConfig } from './initialize-global-config';
export type { InitializeGlobalConfigParams, InitializeGlobalConfigResult } from './initialize-global-config';
export { initializeTokenRegistry } from './initialize-token-registry';
export type { InitializeTokenRegistryResult } from './initialize-token-registry';
export { addApprovedToken } from './add-approved-token';
export type { AddApprovedTokenParams, AddApprovedTokenResult } from './add-approved-token';
export { updateGlobalConfig } from './update-global-config';
export { setEmergencyPause } from './set-emergency-pause';
export type { SetEmergencyPauseResult } from './set-emergency-pause';
export { recoverRoom } from './recover-room';
export type { RecoverRoomParams, RecoverRoomResult } from './recover-room';
export { createTokenMint } from './create-token-mint';
export type { CreateTokenMintParams, CreateTokenMintResult } from './create-token-mint';

