/**
 * Solana Contract Configuration
 * src/chains/solana/config/contracts.ts
 *
 * Quiz program — single program for all room types.
 *
 * ## What changed (new contract)
 *
 * - New Program ID
 * - No GlobalConfig or TokenRegistry PDAs — removed entirely
 * - No quiz_admin program — removed entirely
 * - init_pool_room now takes only 2 args: roomId + entryFee
 * - Fee splits are now FIXED on-chain (not configurable by host at creation time)
 * - refund_room is a new instruction
 * - end_room now takes winners as a method arg
 */

import { PublicKey } from '@solana/web3.js';

export const SOLANA_CONTRACT = {
  /**
   * Quiz Program ID (devnet)
   */
  PROGRAM_ID: new PublicKey('99uc6q3wfb59tLeMjUNzgiNexCNcKaAvG5yE4n5VRxkH'),

  /**
   * Platform wallet address string — your deployer wallet (`solana address` output).
   * Kept as a string so module load never throws on an unconfigured value.
   * Use getPlatformWallet() wherever a PublicKey is needed.
   */
  PLATFORM_WALLET_ADDRESS: '2Ptb5n55a68EDJjSePZh85AVqdgeGuC6YuvwgsGWqjrY',

  /**
   * Fixed fee splits (for display in the UI — not configurable by host).
   *
   * Platform   15%
   * Host       25%
   * Charity    30%
   * 1st place  18%
   * 2nd place  12%
   */
  FEE_SPLITS: {
    platform:  15,
    host:      25,
    charity:   30,
    firstPlace:  18,
    secondPlace: 12,
  },

  /**
   * Room configuration limits
   */
  MAX_PLAYERS:         1000,
  MAX_ROOM_ID_LENGTH:  32,
  MAX_CHARITY_MEMO:    28,

  /**
   * PDA seeds — must match the Rust program exactly.
   *
   * GlobalConfig and TokenRegistry seeds are GONE.
   * Only room-level PDAs remain.
   */
  SEEDS: {
    ROOM:       'room',
    ROOM_VAULT: 'room-vault',
    PLAYER:     'player',
  },
} as const;

// ---------------------------------------------------------------------------
// Platform wallet helper
// ---------------------------------------------------------------------------

/**
 * Returns the platform wallet as a PublicKey.
 * Throws a clear error if the placeholder hasn't been replaced yet,
 * rather than crashing at module load time.
 */
export function getPlatformWallet(): PublicKey {
  const addr: string = SOLANA_CONTRACT.PLATFORM_WALLET_ADDRESS;
  return new PublicKey(addr);
}

// ---------------------------------------------------------------------------
// Explorer helpers
// ---------------------------------------------------------------------------

export function getProgramExplorerUrl(
  cluster: 'mainnet' | 'devnet' | 'testnet' = 'devnet'
): string {
  const id = SOLANA_CONTRACT.PROGRAM_ID.toBase58();
  return cluster === 'mainnet'
    ? `https://explorer.solana.com/address/${id}`
    : `https://explorer.solana.com/address/${id}?cluster=${cluster}`;
}

// ---------------------------------------------------------------------------
// calculateFeeBps — kept for any UI that still wants basis-point values,
// but now derived from the FIXED splits above (not host-configurable).
// ---------------------------------------------------------------------------

export function calculateFeeBps(): {
  platform: number;
  host:      number;
  charity:   number;
  firstPlace:  number;
  secondPlace: number;
  total:     number;
} {
  const s = SOLANA_CONTRACT.FEE_SPLITS;
  return {
    platform:    s.platform    * 100,
    host:        s.host        * 100,
    charity:     s.charity     * 100,
    firstPlace:  s.firstPlace  * 100,
    secondPlace: s.secondPlace * 100,
    total:       10_000,
  };
}