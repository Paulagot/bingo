import { Buffer } from "buffer";
import { Address } from '@stellar/stellar-sdk';
import {
  AssembledTransaction,
  Client as ContractClient,
  ClientOptions as ContractClientOptions,
  MethodOptions,
  Result,
  Spec as ContractSpec,
} from '@stellar/stellar-sdk/contract';
import type {
  u32,
  i32,
  u64,
  i64,
  u128,
  i128,
  u256,
  i256,
  Option,
  Typepoint,
  Duration,
} from '@stellar/stellar-sdk/contract';
export * from '@stellar/stellar-sdk'
export * as contract from '@stellar/stellar-sdk/contract'
export * as rpc from '@stellar/stellar-sdk/rpc'

if (typeof window !== 'undefined') {
  //@ts-ignore Buffer exists
  window.Buffer = window.Buffer || Buffer;
}


export const networks = {
  testnet: {
    networkPassphrase: "Test SDF Network ; September 2015",
    contractId: "CCFMYUDWDIJUMXCNLX7HBHUH6Z5KKMGLRB2VKJ5FVB6YX22AGLKQTQ3C",
  }
} as const

export type PrizeMode = {tag: "PrizePoolSplit", values: void} | {tag: "AssetBased", values: void};

export type RoomStatus = {tag: "AwaitingFunding", values: void} | {tag: "PartiallyFunded", values: void} | {tag: "Ready", values: void} | {tag: "Active", values: void} | {tag: "Ended", values: void};

export type Role = {tag: "Admin", values: void} | {tag: "Host", values: void} | {tag: "Player", values: void} | {tag: "Emergency", values: void};


export interface PrizeAsset {
  amount: i128;
  funded: boolean;
  token_address: string;
}


export interface ExpectedPrize {
  amount: i128;
  token_address: string;
}


export interface PlayerEntry {
  entry_paid: i128;
  extras_paid: i128;
  join_ledger: u32;
  player: string;
  total_paid: i128;
}


export interface AdminConfig {
  admin: string;
  charity_wallet: string;
  pending_admin: Option<string>;
  platform_wallet: string;
}


export interface EconomicConfig {
  max_combined_pct: u32;
  max_host_fee_pct: u32;
  platform_fee_pct: u32;
}


export interface TokenInfo {
  contract_id: string;
  decimals: u32;
  enabled: boolean;
  name: string;
  symbol: string;
}


export interface ApprovedTokens {
  token_count: u32;
  tokens: Map<string, TokenInfo>;
}


export interface AccessControl {
  emergency_pause: boolean;
  roles: Map<string, Role>;
}


export interface RoomConfig {
  charity_memo: string;
  charity_pct: u32;
  creation_ledger: u32;
  ended: boolean;
  entry_fee: i128;
  fee_token: string;
  host: string;
  host_fee_pct: u32;
  host_wallet: string;
  player_count: u32;
  player_map: Map<string, PlayerEntry>;
  prize_assets: Array<Option<PrizeAsset>>;
  prize_distribution: Array<u32>;
  prize_mode: PrizeMode;
  prize_pool_pct: u32;
  room_id: string;
  room_status: RoomStatus;
  total_entry_fees: i128;
  total_extras_fees: i128;
  total_paid_out: i128;
  total_pool: i128;
  winners: Array<string>;
}


export interface StateSnapshot {
  config: RoomConfig;
  ledger: u32;
  timestamp: u64;
}

export const QuizError = {
  1: {message:"InvalidHostFee"},
  2: {message:"MissingHostWallet"},
  3: {message:"InvalidPrizeSplit"},
  4: {message:"CharityBelowMinimum"},
  5: {message:"InvalidPrizePoolPct"},
  6: {message:"MissingPrizePoolConfig"},
  7: {message:"MissingPrizeAssets"},
  8: {message:"InvalidPrizeAssets"},
  9: {message:"InvalidTotalAllocation"},
  10: {message:"InvalidFeeToken"},
  11: {message:"RoomAlreadyExists"},
  12: {message:"RoomNotFound"},
  15: {message:"RoomAlreadyEnded"},
  16: {message:"PlayerAlreadyJoined"},
  17: {message:"InsufficientPayment"},
  18: {message:"Unauthorized"},
  19: {message:"InvalidWinners"},
  20: {message:"AssetTransferFailed"},
  21: {message:"InsufficientPlayers"},
  22: {message:"InsufficientAssets"},
  23: {message:"DepositFailed"},
  26: {message:"ArithmeticOverflow"},
  27: {message:"ArithmeticUnderflow"},
  28: {message:"DivisionByZero"},
  29: {message:"InsufficientBalance"},
  30: {message:"TransferVerificationFailed"},
  31: {message:"ReentrancyDetected"},
  32: {message:"InvalidAddress"},
  33: {message:"InvalidToken"},
  34: {message:"AmountTooLarge"},
  35: {message:"PercentageTooHigh"},
  36: {message:"StateInconsistency"},
  37: {message:"NotInitialized"},
  38: {message:"AlreadyInitialized"},
  39: {message:"NoPendingAdmin"},
  40: {message:"EmergencyPause"},
  41: {message:"InvalidEntryFee"},
  42: {message:"InsufficientAmount"},
  43: {message:"TokenNotApproved"},
  44: {message:"TokenAlreadyExists"},
  45: {message:"TokenNotFound"},
  46: {message:"MaxTokensReached"},
  47: {message:"InvalidRoomId"},
  48: {message:"HostCannotBeWinner"},
  49: {message:"InvalidMemo"},
  50: {message:"RoomNotReady"},
  51: {message:"PrizeAlreadyFunded"},
  52: {message:"InvalidPrizeIndex"},
  53: {message:"PrizeNotMatching"}
}

export interface Client {
  /**
   * Construct and simulate a initialize transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initialize the contract with admin and wallet addresses
   */
  initialize: ({admin, platform_wallet, charity_wallet}: {admin: string, platform_wallet: string, charity_wallet: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a add_approved_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Add a token to the approved tokens list
   */
  add_approved_token: ({token_address, symbol, name}: {token_address: string, symbol: string, name: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a remove_approved_token transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Remove a token from the approved tokens list
   */
  remove_approved_token: ({token_address}: {token_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a is_token_approved transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if a token is approved for use in the contract
   */
  is_token_approved: ({token_address}: {token_address: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

  /**
   * Construct and simulate a transfer_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Initiate admin transfer to a new address
   */
  transfer_admin: ({new_admin}: {new_admin: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a accept_admin transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Accept admin transfer (must be called by the pending admin)
   */
  accept_admin: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a update_wallets transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Update platform and/or charity wallet addresses
   */
  update_wallets: ({platform_wallet, charity_wallet}: {platform_wallet: Option<string>, charity_wallet: Option<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a emergency_pause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Pause all contract operations (emergency function)
   */
  emergency_pause: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a emergency_unpause transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Resume contract operations after pause
   */
  emergency_unpause: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a init_pool_room transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create a prize pool room where winners share the collected fees
   */
  init_pool_room: ({room_id, host, fee_token, entry_fee, host_fee_pct, prize_pool_pct, first_place_pct, second_place_pct, third_place_pct, charity_memo}: {room_id: string, host: string, fee_token: string, entry_fee: i128, host_fee_pct: Option<u32>, prize_pool_pct: u32, first_place_pct: u32, second_place_pct: Option<u32>, third_place_pct: Option<u32>, charity_memo: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a init_asset_room transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Create an asset-based room where specific tokens are prizes
   */
  init_asset_room: ({room_id, host, fee_token, entry_fee, host_fee_pct, expected_prizes, charity_memo}: {room_id: string, host: string, fee_token: string, entry_fee: i128, host_fee_pct: Option<u32>, expected_prizes: Array<ExpectedPrize>, charity_memo: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a deposit_prize_asset transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Deposit a specific prize asset for an asset-based room
   */
  deposit_prize_asset: ({room_id, prize_index}: {room_id: string, prize_index: u32}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_room_funding_status transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get funding status for an asset-based room
   */
  get_room_funding_status: ({room_id}: {room_id: string}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Option<readonly [RoomStatus, Array<boolean>]>>>

  /**
   * Construct and simulate a join_room transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Player joins a room by paying entry fee and optional extras
   */
  join_room: ({room_id, player, extras_amount}: {room_id: string, player: string, extras_amount: i128}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a end_room transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Host ends the room and declares winners
   */
  end_room: ({room_id, winners}: {room_id: string, winners: Array<string>}, options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<void>>>

  /**
   * Construct and simulate a get_platform_wallet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get platform wallet address
   */
  get_platform_wallet: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_charity_wallet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get charity wallet address
   */
  get_charity_wallet: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<string>>>

  /**
   * Construct and simulate a get_economic_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Get economic configuration parameters
   */
  get_economic_config: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<Result<EconomicConfig>>>

  /**
   * Construct and simulate a is_emergency_paused transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   * Check if contract is in emergency pause state
   */
  is_emergency_paused: (options?: {
    /**
     * The fee to pay for the transaction. Default: BASE_FEE
     */
    fee?: number;

    /**
     * The maximum amount of time to wait for the transaction to complete. Default: DEFAULT_TIMEOUT
     */
    timeoutInSeconds?: number;

    /**
     * Whether to automatically simulate the transaction when constructing the AssembledTransaction. Default: true
     */
    simulate?: boolean;
  }) => Promise<AssembledTransaction<boolean>>

}
export class Client extends ContractClient {
  static async deploy<T = Client>(
    /** Options for initializing a Client as well as for calling a method, with extras specific to deploying. */
    options: MethodOptions &
      Omit<ContractClientOptions, "contractId"> & {
        /** The hash of the Wasm blob, which must already be installed on-chain. */
        wasmHash: Buffer | string;
        /** Salt used to generate the contract's ID. Passed through to {@link Operation.createCustomContract}. Default: random. */
        salt?: Buffer | Uint8Array;
        /** The format used to decode `wasmHash`, if it's provided as a string. */
        format?: "hex" | "base64";
      }
  ): Promise<AssembledTransaction<T>> {
    return ContractClient.deploy(null, options)
  }
  constructor(public readonly options: ContractClientOptions) {
    super(
      new ContractSpec([ "AAAAAgAAAAAAAAAAAAAACVByaXplTW9kZQAAAAAAAAIAAAAAAAAAAAAAAA5Qcml6ZVBvb2xTcGxpdAAAAAAAAAAAAAAAAAAKQXNzZXRCYXNlZAAA",
        "AAAAAgAAAAAAAAAAAAAAClJvb21TdGF0dXMAAAAAAAUAAAAAAAAAAAAAAA9Bd2FpdGluZ0Z1bmRpbmcAAAAAAAAAAAAAAAAPUGFydGlhbGx5RnVuZGVkAAAAAAAAAAAAAAAABVJlYWR5AAAAAAAAAAAAAAAAAAAGQWN0aXZlAAAAAAAAAAAAAAAAAAVFbmRlZAAAAA==",
        "AAAAAgAAAAAAAAAAAAAABFJvbGUAAAAEAAAAAAAAAAAAAAAFQWRtaW4AAAAAAAAAAAAAAAAAAARIb3N0AAAAAAAAAAAAAAAGUGxheWVyAAAAAAAAAAAAAAAAAAlFbWVyZ2VuY3kAAAA=",
        "AAAAAQAAAAAAAAAAAAAAClByaXplQXNzZXQAAAAAAAMAAAAAAAAABmFtb3VudAAAAAAACwAAAAAAAAAGZnVuZGVkAAAAAAABAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEw==",
        "AAAAAQAAAAAAAAAAAAAADUV4cGVjdGVkUHJpemUAAAAAAAACAAAAAAAAAAZhbW91bnQAAAAAAAsAAAAAAAAADXRva2VuX2FkZHJlc3MAAAAAAAAT",
        "AAAAAQAAAAAAAAAAAAAAC1BsYXllckVudHJ5AAAAAAUAAAAAAAAACmVudHJ5X3BhaWQAAAAAAAsAAAAAAAAAC2V4dHJhc19wYWlkAAAAAAsAAAAAAAAAC2pvaW5fbGVkZ2VyAAAAAAQAAAAAAAAABnBsYXllcgAAAAAAEwAAAAAAAAAKdG90YWxfcGFpZAAAAAAACw==",
        "AAAAAQAAAAAAAAAAAAAAC0FkbWluQ29uZmlnAAAAAAQAAAAAAAAABWFkbWluAAAAAAAAEwAAAAAAAAAOY2hhcml0eV93YWxsZXQAAAAAABMAAAAAAAAADXBlbmRpbmdfYWRtaW4AAAAAAAPoAAAAEwAAAAAAAAAPcGxhdGZvcm1fd2FsbGV0AAAAABM=",
        "AAAAAQAAAAAAAAAAAAAADkVjb25vbWljQ29uZmlnAAAAAAADAAAAAAAAABBtYXhfY29tYmluZWRfcGN0AAAABAAAAAAAAAAQbWF4X2hvc3RfZmVlX3BjdAAAAAQAAAAAAAAAEHBsYXRmb3JtX2ZlZV9wY3QAAAAE",
        "AAAAAQAAAAAAAAAAAAAACVRva2VuSW5mbwAAAAAAAAUAAAAAAAAAC2NvbnRyYWN0X2lkAAAAABMAAAAAAAAACGRlY2ltYWxzAAAABAAAAAAAAAAHZW5hYmxlZAAAAAABAAAAAAAAAARuYW1lAAAAEAAAAAAAAAAGc3ltYm9sAAAAAAAQ",
        "AAAAAQAAAAAAAAAAAAAADkFwcHJvdmVkVG9rZW5zAAAAAAACAAAAAAAAAAt0b2tlbl9jb3VudAAAAAAEAAAAAAAAAAZ0b2tlbnMAAAAAA+wAAAATAAAH0AAAAAlUb2tlbkluZm8AAAA=",
        "AAAAAQAAAAAAAAAAAAAADUFjY2Vzc0NvbnRyb2wAAAAAAAACAAAAAAAAAA9lbWVyZ2VuY3lfcGF1c2UAAAAAAQAAAAAAAAAFcm9sZXMAAAAAAAPsAAAAEwAAB9AAAAAEUm9sZQ==",
        "AAAAAQAAAAAAAAAAAAAAClJvb21Db25maWcAAAAAABYAAAAAAAAADGNoYXJpdHlfbWVtbwAAABAAAAAAAAAAC2NoYXJpdHlfcGN0AAAAAAQAAAAAAAAAD2NyZWF0aW9uX2xlZGdlcgAAAAAEAAAAAAAAAAVlbmRlZAAAAAAAAAEAAAAAAAAACWVudHJ5X2ZlZQAAAAAAAAsAAAAAAAAACWZlZV90b2tlbgAAAAAAABMAAAAAAAAABGhvc3QAAAATAAAAAAAAAAxob3N0X2ZlZV9wY3QAAAAEAAAAAAAAAAtob3N0X3dhbGxldAAAAAATAAAAAAAAAAxwbGF5ZXJfY291bnQAAAAEAAAAAAAAAApwbGF5ZXJfbWFwAAAAAAPsAAAAEwAAB9AAAAALUGxheWVyRW50cnkAAAAAAAAAAAxwcml6ZV9hc3NldHMAAAPqAAAD6AAAB9AAAAAKUHJpemVBc3NldAAAAAAAAAAAABJwcml6ZV9kaXN0cmlidXRpb24AAAAAA+oAAAAEAAAAAAAAAApwcml6ZV9tb2RlAAAAAAfQAAAACVByaXplTW9kZQAAAAAAAAAAAAAOcHJpemVfcG9vbF9wY3QAAAAAAAQAAAAAAAAAB3Jvb21faWQAAAAAEAAAAAAAAAALcm9vbV9zdGF0dXMAAAAH0AAAAApSb29tU3RhdHVzAAAAAAAAAAAAEHRvdGFsX2VudHJ5X2ZlZXMAAAALAAAAAAAAABF0b3RhbF9leHRyYXNfZmVlcwAAAAAAAAsAAAAAAAAADnRvdGFsX3BhaWRfb3V0AAAAAAALAAAAAAAAAAp0b3RhbF9wb29sAAAAAAALAAAAAAAAAAd3aW5uZXJzAAAAA+oAAAAT",
        "AAAAAQAAAAAAAAAAAAAADVN0YXRlU25hcHNob3QAAAAAAAADAAAAAAAAAAZjb25maWcAAAAAB9AAAAAKUm9vbUNvbmZpZwAAAAAAAAAAAAZsZWRnZXIAAAAAAAQAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAABAAAAAAAAAAAAAAACVF1aXpFcnJvcgAAAAAAADEAAAAAAAAADkludmFsaWRIb3N0RmVlAAAAAAABAAAAAAAAABFNaXNzaW5nSG9zdFdhbGxldAAAAAAAAAIAAAAAAAAAEUludmFsaWRQcml6ZVNwbGl0AAAAAAAAAwAAAAAAAAATQ2hhcml0eUJlbG93TWluaW11bQAAAAAEAAAAAAAAABNJbnZhbGlkUHJpemVQb29sUGN0AAAAAAUAAAAAAAAAFk1pc3NpbmdQcml6ZVBvb2xDb25maWcAAAAAAAYAAAAAAAAAEk1pc3NpbmdQcml6ZUFzc2V0cwAAAAAABwAAAAAAAAASSW52YWxpZFByaXplQXNzZXRzAAAAAAAIAAAAAAAAABZJbnZhbGlkVG90YWxBbGxvY2F0aW9uAAAAAAAJAAAAAAAAAA9JbnZhbGlkRmVlVG9rZW4AAAAACgAAAAAAAAARUm9vbUFscmVhZHlFeGlzdHMAAAAAAAALAAAAAAAAAAxSb29tTm90Rm91bmQAAAAMAAAAAAAAABBSb29tQWxyZWFkeUVuZGVkAAAADwAAAAAAAAATUGxheWVyQWxyZWFkeUpvaW5lZAAAAAAQAAAAAAAAABNJbnN1ZmZpY2llbnRQYXltZW50AAAAABEAAAAAAAAADFVuYXV0aG9yaXplZAAAABIAAAAAAAAADkludmFsaWRXaW5uZXJzAAAAAAATAAAAAAAAABNBc3NldFRyYW5zZmVyRmFpbGVkAAAAABQAAAAAAAAAE0luc3VmZmljaWVudFBsYXllcnMAAAAAFQAAAAAAAAASSW5zdWZmaWNpZW50QXNzZXRzAAAAAAAWAAAAAAAAAA1EZXBvc2l0RmFpbGVkAAAAAAAAFwAAAAAAAAASQXJpdGhtZXRpY092ZXJmbG93AAAAAAAaAAAAAAAAABNBcml0aG1ldGljVW5kZXJmbG93AAAAABsAAAAAAAAADkRpdmlzaW9uQnlaZXJvAAAAAAAcAAAAAAAAABNJbnN1ZmZpY2llbnRCYWxhbmNlAAAAAB0AAAAAAAAAGlRyYW5zZmVyVmVyaWZpY2F0aW9uRmFpbGVkAAAAAAAeAAAAAAAAABJSZWVudHJhbmN5RGV0ZWN0ZWQAAAAAAB8AAAAAAAAADkludmFsaWRBZGRyZXNzAAAAAAAgAAAAAAAAAAxJbnZhbGlkVG9rZW4AAAAhAAAAAAAAAA5BbW91bnRUb29MYXJnZQAAAAAAIgAAAAAAAAARUGVyY2VudGFnZVRvb0hpZ2gAAAAAAAAjAAAAAAAAABJTdGF0ZUluY29uc2lzdGVuY3kAAAAAACQAAAAAAAAADk5vdEluaXRpYWxpemVkAAAAAAAlAAAAAAAAABJBbHJlYWR5SW5pdGlhbGl6ZWQAAAAAACYAAAAAAAAADk5vUGVuZGluZ0FkbWluAAAAAAAnAAAAAAAAAA5FbWVyZ2VuY3lQYXVzZQAAAAAAKAAAAAAAAAAPSW52YWxpZEVudHJ5RmVlAAAAACkAAAAAAAAAEkluc3VmZmljaWVudEFtb3VudAAAAAAAKgAAAAAAAAAQVG9rZW5Ob3RBcHByb3ZlZAAAACsAAAAAAAAAElRva2VuQWxyZWFkeUV4aXN0cwAAAAAALAAAAAAAAAANVG9rZW5Ob3RGb3VuZAAAAAAAAC0AAAAAAAAAEE1heFRva2Vuc1JlYWNoZWQAAAAuAAAAAAAAAA1JbnZhbGlkUm9vbUlkAAAAAAAALwAAAAAAAAASSG9zdENhbm5vdEJlV2lubmVyAAAAAAAwAAAAAAAAAAtJbnZhbGlkTWVtbwAAAAAxAAAAAAAAAAxSb29tTm90UmVhZHkAAAAyAAAAAAAAABJQcml6ZUFscmVhZHlGdW5kZWQAAAAAADMAAAAAAAAAEUludmFsaWRQcml6ZUluZGV4AAAAAAAANAAAAAAAAAAQUHJpemVOb3RNYXRjaGluZwAAADU=",
        "AAAAAAAAADdJbml0aWFsaXplIHRoZSBjb250cmFjdCB3aXRoIGFkbWluIGFuZCB3YWxsZXQgYWRkcmVzc2VzAAAAAAppbml0aWFsaXplAAAAAAADAAAAAAAAAAVhZG1pbgAAAAAAABMAAAAAAAAAD3BsYXRmb3JtX3dhbGxldAAAAAATAAAAAAAAAA5jaGFyaXR5X3dhbGxldAAAAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAACdBZGQgYSB0b2tlbiB0byB0aGUgYXBwcm92ZWQgdG9rZW5zIGxpc3QAAAAAEmFkZF9hcHByb3ZlZF90b2tlbgAAAAAAAwAAAAAAAAANdG9rZW5fYWRkcmVzcwAAAAAAABMAAAAAAAAABnN5bWJvbAAAAAAAEAAAAAAAAAAEbmFtZQAAABAAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAACxSZW1vdmUgYSB0b2tlbiBmcm9tIHRoZSBhcHByb3ZlZCB0b2tlbnMgbGlzdAAAABVyZW1vdmVfYXBwcm92ZWRfdG9rZW4AAAAAAAABAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEwAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAADRDaGVjayBpZiBhIHRva2VuIGlzIGFwcHJvdmVkIGZvciB1c2UgaW4gdGhlIGNvbnRyYWN0AAAAEWlzX3Rva2VuX2FwcHJvdmVkAAAAAAAAAQAAAAAAAAANdG9rZW5fYWRkcmVzcwAAAAAAABMAAAABAAAAAQ==",
        "AAAAAAAAAChJbml0aWF0ZSBhZG1pbiB0cmFuc2ZlciB0byBhIG5ldyBhZGRyZXNzAAAADnRyYW5zZmVyX2FkbWluAAAAAAABAAAAAAAAAAluZXdfYWRtaW4AAAAAAAATAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAADtBY2NlcHQgYWRtaW4gdHJhbnNmZXIgKG11c3QgYmUgY2FsbGVkIGJ5IHRoZSBwZW5kaW5nIGFkbWluKQAAAAAMYWNjZXB0X2FkbWluAAAAAAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAAC9VcGRhdGUgcGxhdGZvcm0gYW5kL29yIGNoYXJpdHkgd2FsbGV0IGFkZHJlc3NlcwAAAAAOdXBkYXRlX3dhbGxldHMAAAAAAAIAAAAAAAAAD3BsYXRmb3JtX3dhbGxldAAAAAPoAAAAEwAAAAAAAAAOY2hhcml0eV93YWxsZXQAAAAAA+gAAAATAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAADJQYXVzZSBhbGwgY29udHJhY3Qgb3BlcmF0aW9ucyAoZW1lcmdlbmN5IGZ1bmN0aW9uKQAAAAAAD2VtZXJnZW5jeV9wYXVzZQAAAAAAAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAACZSZXN1bWUgY29udHJhY3Qgb3BlcmF0aW9ucyBhZnRlciBwYXVzZQAAAAAAEWVtZXJnZW5jeV91bnBhdXNlAAAAAAAAAAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAAD9DcmVhdGUgYSBwcml6ZSBwb29sIHJvb20gd2hlcmUgd2lubmVycyBzaGFyZSB0aGUgY29sbGVjdGVkIGZlZXMAAAAADmluaXRfcG9vbF9yb29tAAAAAAAKAAAAAAAAAAdyb29tX2lkAAAAABAAAAAAAAAABGhvc3QAAAATAAAAAAAAAAlmZWVfdG9rZW4AAAAAAAATAAAAAAAAAAllbnRyeV9mZWUAAAAAAAALAAAAAAAAAAxob3N0X2ZlZV9wY3QAAAPoAAAABAAAAAAAAAAOcHJpemVfcG9vbF9wY3QAAAAAAAQAAAAAAAAAD2ZpcnN0X3BsYWNlX3BjdAAAAAAEAAAAAAAAABBzZWNvbmRfcGxhY2VfcGN0AAAD6AAAAAQAAAAAAAAAD3RoaXJkX3BsYWNlX3BjdAAAAAPoAAAABAAAAAAAAAAMY2hhcml0eV9tZW1vAAAAEAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAADtDcmVhdGUgYW4gYXNzZXQtYmFzZWQgcm9vbSB3aGVyZSBzcGVjaWZpYyB0b2tlbnMgYXJlIHByaXplcwAAAAAPaW5pdF9hc3NldF9yb29tAAAAAAcAAAAAAAAAB3Jvb21faWQAAAAAEAAAAAAAAAAEaG9zdAAAABMAAAAAAAAACWZlZV90b2tlbgAAAAAAABMAAAAAAAAACWVudHJ5X2ZlZQAAAAAAAAsAAAAAAAAADGhvc3RfZmVlX3BjdAAAA+gAAAAEAAAAAAAAAA9leHBlY3RlZF9wcml6ZXMAAAAD6gAAB9AAAAANRXhwZWN0ZWRQcml6ZQAAAAAAAAAAAAAMY2hhcml0eV9tZW1vAAAAEAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAADZEZXBvc2l0IGEgc3BlY2lmaWMgcHJpemUgYXNzZXQgZm9yIGFuIGFzc2V0LWJhc2VkIHJvb20AAAAAABNkZXBvc2l0X3ByaXplX2Fzc2V0AAAAAAIAAAAAAAAAB3Jvb21faWQAAAAAEAAAAAAAAAALcHJpemVfaW5kZXgAAAAABAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAACpHZXQgZnVuZGluZyBzdGF0dXMgZm9yIGFuIGFzc2V0LWJhc2VkIHJvb20AAAAAABdnZXRfcm9vbV9mdW5kaW5nX3N0YXR1cwAAAAABAAAAAAAAAAdyb29tX2lkAAAAABAAAAABAAAD6AAAA+0AAAACAAAH0AAAAApSb29tU3RhdHVzAAAAAAPqAAAAAQ==",
        "AAAAAAAAADtQbGF5ZXIgam9pbnMgYSByb29tIGJ5IHBheWluZyBlbnRyeSBmZWUgYW5kIG9wdGlvbmFsIGV4dHJhcwAAAAAJam9pbl9yb29tAAAAAAAAAwAAAAAAAAAHcm9vbV9pZAAAAAAQAAAAAAAAAAZwbGF5ZXIAAAAAABMAAAAAAAAADWV4dHJhc19hbW91bnQAAAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAACdIb3N0IGVuZHMgdGhlIHJvb20gYW5kIGRlY2xhcmVzIHdpbm5lcnMAAAAACGVuZF9yb29tAAAAAgAAAAAAAAAHcm9vbV9pZAAAAAAQAAAAAAAAAAd3aW5uZXJzAAAAA+oAAAATAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAABtHZXQgcGxhdGZvcm0gd2FsbGV0IGFkZHJlc3MAAAAAE2dldF9wbGF0Zm9ybV93YWxsZXQAAAAAAAAAAAEAAAPpAAAAEwAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAABpHZXQgY2hhcml0eSB3YWxsZXQgYWRkcmVzcwAAAAAAEmdldF9jaGFyaXR5X3dhbGxldAAAAAAAAAAAAAEAAAPpAAAAEwAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAACVHZXQgZWNvbm9taWMgY29uZmlndXJhdGlvbiBwYXJhbWV0ZXJzAAAAAAAAE2dldF9lY29ub21pY19jb25maWcAAAAAAAAAAAEAAAPpAAAH0AAAAA5FY29ub21pY0NvbmZpZwAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAC1DaGVjayBpZiBjb250cmFjdCBpcyBpbiBlbWVyZ2VuY3kgcGF1c2Ugc3RhdGUAAAAAAAATaXNfZW1lcmdlbmN5X3BhdXNlZAAAAAAAAAAAAQAAAAE=" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<Result<void>>,
        add_approved_token: this.txFromJSON<Result<void>>,
        remove_approved_token: this.txFromJSON<Result<void>>,
        is_token_approved: this.txFromJSON<boolean>,
        transfer_admin: this.txFromJSON<Result<void>>,
        accept_admin: this.txFromJSON<Result<void>>,
        update_wallets: this.txFromJSON<Result<void>>,
        emergency_pause: this.txFromJSON<Result<void>>,
        emergency_unpause: this.txFromJSON<Result<void>>,
        init_pool_room: this.txFromJSON<Result<void>>,
        init_asset_room: this.txFromJSON<Result<void>>,
        deposit_prize_asset: this.txFromJSON<Result<void>>,
        get_room_funding_status: this.txFromJSON<Option<readonly [RoomStatus, Array<boolean>]>>,
        join_room: this.txFromJSON<Result<void>>,
        end_room: this.txFromJSON<Result<void>>,
        get_platform_wallet: this.txFromJSON<Result<string>>,
        get_charity_wallet: this.txFromJSON<Result<string>>,
        get_economic_config: this.txFromJSON<Result<EconomicConfig>>,
        is_emergency_paused: this.txFromJSON<boolean>
  }
}