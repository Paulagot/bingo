import { Buffer } from "buffer";
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
    contractId: "CCZB5PXAHSO6EDV2XQEF3YHEHPIU5VU536C73F4VMFC42QDRB4QLRB3L", 
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
   * Construct and simulate a get_approved_tokens_list transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_approved_tokens_list: (options?: {
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
  }) => Promise<AssembledTransaction<Array<TokenInfo>>>

  /**
   * Construct and simulate a is_token_approved transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
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
   * Construct and simulate a get_room_players transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_room_players: ({room_id}: {room_id: string}, options?: {
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
  }) => Promise<AssembledTransaction<Array<PlayerEntry>>>

  /**
   * Construct and simulate a get_room_config transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_room_config: ({room_id}: {room_id: string}, options?: {
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
  }) => Promise<AssembledTransaction<Option<RoomConfig>>>

  /**
   * Construct and simulate a get_room_financials transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_room_financials: ({room_id}: {room_id: string}, options?: {
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
  }) => Promise<AssembledTransaction<Option<readonly [i128, i128, i128, i128, i128]>>>

  /**
   * Construct and simulate a get_platform_wallet transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
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

  /**
   * Construct and simulate a get_total_rooms_created transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_rooms_created: (options?: {
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
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_platform_total_volume transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_platform_total_volume: (options?: {
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
  }) => Promise<AssembledTransaction<i128>>

  /**
   * Construct and simulate a get_total_players_global transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_total_players_global: (options?: {
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
  }) => Promise<AssembledTransaction<u32>>

  /**
   * Construct and simulate a get_host_leaderboard transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_host_leaderboard: (options?: {
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
  }) => Promise<AssembledTransaction<Array<readonly [string, u32, i128]>>>

  /**
   * Construct and simulate a get_host_stats transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_host_stats: ({host}: {host: string}, options?: {
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
  }) => Promise<AssembledTransaction<Option<readonly [u32, i128]>>>

  /**
   * Construct and simulate a get_platform_total_fees transaction. Returns an `AssembledTransaction` object which will have a `result` field containing the result of the simulation. If this transaction changes contract state, you will need to call `signAndSend()` on the returned object.
   */
  get_platform_total_fees: (options?: {
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
  }) => Promise<AssembledTransaction<i128>>

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
        "AAAAAAAAAAAAAAAKaW5pdGlhbGl6ZQAAAAAAAwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAAAAAA9wbGF0Zm9ybV93YWxsZXQAAAAAEwAAAAAAAAAOY2hhcml0eV93YWxsZXQAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAASYWRkX2FwcHJvdmVkX3Rva2VuAAAAAAADAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEwAAAAAAAAAGc3ltYm9sAAAAAAAQAAAAAAAAAARuYW1lAAAAEAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAVcmVtb3ZlX2FwcHJvdmVkX3Rva2VuAAAAAAAAAQAAAAAAAAANdG9rZW5fYWRkcmVzcwAAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAYZ2V0X2FwcHJvdmVkX3Rva2Vuc19saXN0AAAAAAAAAAEAAAPqAAAH0AAAAAlUb2tlbkluZm8AAAA=",
        "AAAAAAAAAAAAAAARaXNfdG9rZW5fYXBwcm92ZWQAAAAAAAABAAAAAAAAAA10b2tlbl9hZGRyZXNzAAAAAAAAEwAAAAEAAAAB",
        "AAAAAAAAAAAAAAAOdHJhbnNmZXJfYWRtaW4AAAAAAAEAAAAAAAAACW5ld19hZG1pbgAAAAAAABMAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAMYWNjZXB0X2FkbWluAAAAAAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAAOdXBkYXRlX3dhbGxldHMAAAAAAAIAAAAAAAAAD3BsYXRmb3JtX3dhbGxldAAAAAPoAAAAEwAAAAAAAAAOY2hhcml0eV93YWxsZXQAAAAAA+gAAAATAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAAAAAAAAPZW1lcmdlbmN5X3BhdXNlAAAAAAAAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAARZW1lcmdlbmN5X3VucGF1c2UAAAAAAAAAAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAAAAAAAAOaW5pdF9wb29sX3Jvb20AAAAAAAoAAAAAAAAAB3Jvb21faWQAAAAAEAAAAAAAAAAEaG9zdAAAABMAAAAAAAAACWZlZV90b2tlbgAAAAAAABMAAAAAAAAACWVudHJ5X2ZlZQAAAAAAAAsAAAAAAAAADGhvc3RfZmVlX3BjdAAAA+gAAAAEAAAAAAAAAA5wcml6ZV9wb29sX3BjdAAAAAAABAAAAAAAAAAPZmlyc3RfcGxhY2VfcGN0AAAAAAQAAAAAAAAAEHNlY29uZF9wbGFjZV9wY3QAAAPoAAAABAAAAAAAAAAPdGhpcmRfcGxhY2VfcGN0AAAAA+gAAAAEAAAAAAAAAAxjaGFyaXR5X21lbW8AAAAQAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAAAAAAAAPaW5pdF9hc3NldF9yb29tAAAAAAcAAAAAAAAAB3Jvb21faWQAAAAAEAAAAAAAAAAEaG9zdAAAABMAAAAAAAAACWZlZV90b2tlbgAAAAAAABMAAAAAAAAACWVudHJ5X2ZlZQAAAAAAAAsAAAAAAAAADGhvc3RfZmVlX3BjdAAAA+gAAAAEAAAAAAAAAA9leHBlY3RlZF9wcml6ZXMAAAAD6gAAB9AAAAANRXhwZWN0ZWRQcml6ZQAAAAAAAAAAAAAMY2hhcml0eV9tZW1vAAAAEAAAAAEAAAPpAAAD7QAAAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAATZGVwb3NpdF9wcml6ZV9hc3NldAAAAAACAAAAAAAAAAdyb29tX2lkAAAAABAAAAAAAAAAC3ByaXplX2luZGV4AAAAAAQAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAXZ2V0X3Jvb21fZnVuZGluZ19zdGF0dXMAAAAAAQAAAAAAAAAHcm9vbV9pZAAAAAAQAAAAAQAAA+gAAAPtAAAAAgAAB9AAAAAKUm9vbVN0YXR1cwAAAAAD6gAAAAE=",
        "AAAAAAAAAAAAAAAJam9pbl9yb29tAAAAAAAAAwAAAAAAAAAHcm9vbV9pZAAAAAAQAAAAAAAAAAZwbGF5ZXIAAAAAABMAAAAAAAAADWV4dHJhc19hbW91bnQAAAAAAAALAAAAAQAAA+kAAAPtAAAAAAAAB9AAAAAJUXVpekVycm9yAAAA",
        "AAAAAAAAAAAAAAAIZW5kX3Jvb20AAAACAAAAAAAAAAdyb29tX2lkAAAAABAAAAAAAAAAB3dpbm5lcnMAAAAD6gAAABMAAAABAAAD6QAAA+0AAAAAAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAAQZ2V0X3Jvb21fcGxheWVycwAAAAEAAAAAAAAAB3Jvb21faWQAAAAAEAAAAAEAAAPqAAAH0AAAAAtQbGF5ZXJFbnRyeQA=",
        "AAAAAAAAAAAAAAAPZ2V0X3Jvb21fY29uZmlnAAAAAAEAAAAAAAAAB3Jvb21faWQAAAAAEAAAAAEAAAPoAAAH0AAAAApSb29tQ29uZmlnAAA=",
        "AAAAAAAAAAAAAAATZ2V0X3Jvb21fZmluYW5jaWFscwAAAAABAAAAAAAAAAdyb29tX2lkAAAAABAAAAABAAAD6AAAA+0AAAAFAAAACwAAAAsAAAALAAAACwAAAAs=",
        "AAAAAAAAAAAAAAATZ2V0X3BsYXRmb3JtX3dhbGxldAAAAAAAAAAAAQAAA+kAAAATAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAASZ2V0X2NoYXJpdHlfd2FsbGV0AAAAAAAAAAAAAQAAA+kAAAATAAAH0AAAAAlRdWl6RXJyb3IAAAA=",
        "AAAAAAAAAAAAAAATZ2V0X2Vjb25vbWljX2NvbmZpZwAAAAAAAAAAAQAAA+kAAAfQAAAADkVjb25vbWljQ29uZmlnAAAAAAfQAAAACVF1aXpFcnJvcgAAAA==",
        "AAAAAAAAAAAAAAATaXNfZW1lcmdlbmN5X3BhdXNlZAAAAAAAAAAAAQAAAAE=",
        "AAAAAAAAAAAAAAAXZ2V0X3RvdGFsX3Jvb21zX2NyZWF0ZWQAAAAAAAAAAAEAAAAE",
        "AAAAAAAAAAAAAAAZZ2V0X3BsYXRmb3JtX3RvdGFsX3ZvbHVtZQAAAAAAAAAAAAABAAAACw==",
        "AAAAAAAAAAAAAAAYZ2V0X3RvdGFsX3BsYXllcnNfZ2xvYmFsAAAAAAAAAAEAAAAE",
        "AAAAAAAAAAAAAAAUZ2V0X2hvc3RfbGVhZGVyYm9hcmQAAAAAAAAAAQAAA+oAAAPtAAAAAwAAABMAAAAEAAAACw==",
        "AAAAAAAAAAAAAAAOZ2V0X2hvc3Rfc3RhdHMAAAAAAAEAAAAAAAAABGhvc3QAAAATAAAAAQAAA+gAAAPtAAAAAgAAAAQAAAAL",
        "AAAAAAAAAAAAAAAXZ2V0X3BsYXRmb3JtX3RvdGFsX2ZlZXMAAAAAAAAAAAEAAAAL" ]),
      options
    )
  }
  public readonly fromJSON = {
    initialize: this.txFromJSON<Result<void>>,
        add_approved_token: this.txFromJSON<Result<void>>,
        remove_approved_token: this.txFromJSON<Result<void>>,
        get_approved_tokens_list: this.txFromJSON<Array<TokenInfo>>,
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
        get_room_players: this.txFromJSON<Array<PlayerEntry>>,
        get_room_config: this.txFromJSON<Option<RoomConfig>>,
        get_room_financials: this.txFromJSON<Option<readonly [i128, i128, i128, i128, i128]>>,
        get_platform_wallet: this.txFromJSON<Result<string>>,
        get_charity_wallet: this.txFromJSON<Result<string>>,
        get_economic_config: this.txFromJSON<Result<EconomicConfig>>,
        is_emergency_paused: this.txFromJSON<boolean>,
        get_total_rooms_created: this.txFromJSON<u32>,
        get_platform_total_volume: this.txFromJSON<i128>,
        get_total_players_global: this.txFromJSON<u32>,
        get_host_leaderboard: this.txFromJSON<Array<readonly [string, u32, i128]>>,
        get_host_stats: this.txFromJSON<Option<readonly [u32, i128]>>,
        get_platform_total_fees: this.txFromJSON<i128>
  }
}