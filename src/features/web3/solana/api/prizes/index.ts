/**
 * @module features/web3/solana/api/prizes
 *
 * Prize operations API module
 *
 * Provides functions for distributing prizes, depositing prize assets, and declaring winners.
 * All functions use Phase 1 utilities for token account management and transaction building.
 *
 * @example
 * ```typescript
 * import { distributePrizes, depositPrizeAsset } from '@/features/web3/solana/api/prizes';
 *
 * const result = await distributePrizes(context, params);
 * ```
 */

export { declareWinners } from './declare-winners';
export type { DeclareWinnersParams, DeclareWinnersResult } from './declare-winners';
export { endRoom } from './end-room';
export type { EndRoomParams, EndRoomResult } from './end-room';
export { distributePrizes } from './distribute-prizes';
export type { DistributePrizesParams, DistributePrizesResult } from './distribute-prizes';
export { depositPrizeAsset } from './deposit-prize-asset';

