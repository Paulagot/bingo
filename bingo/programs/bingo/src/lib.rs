//! # Fundraisely Smart Contract
//!
//! A trustless, on-chain fundraising platform built on Solana using the Anchor framework.
//!
//! ## Overview
//!
//! Fundraisely enables transparent, verifiable charitable fundraising through competitive game rooms.
//! All fund distribution logic executes on-chain, ensuring trustless operation with zero possibility
//! of fund misappropriation. Entry fees are automatically split between platform operations, hosts,
//! prize pools, and charitable causes according to immutable smart contract rules.
//!
//! ## Architecture
//!
//! This program implements a comprehensive set of instructions organized by feature domain:
//!
//! ### Admin Instructions
//! - **initialize** - One-time setup of global configuration (platform wallets, fee structure)
//! - **update_global_config** - Update platform configuration parameters (admin only)
//! - **initialize_token_registry** - Initialize approved token registry
//! - **add_approved_token** / **remove_approved_token** - Manage token allowlist
//! - **set_emergency_pause** - Circuit breaker for security incidents
//! - **recover_room** - Admin recovery mechanism for abandoned rooms
//!
//! ### Room Management
//! - **init_pool_room** - Create a new fundraising game room with prize pool distribution
//! - **init_asset_room** - Create a room with pre-deposited prize assets
//! - **close_joining** - Close room to new players (host only)
//! - **cleanup_room** - Reclaim rent from ended rooms
//!
//! ### Player Operations
//! - **join_room** - Player entry with automatic fee collection and distribution
//!
//! ### Game Execution
//! - **declare_winners** - Host declares winners before fund distribution (transparency)
//! - **end_room** - Finalize game, distribute prizes, and transfer charity donations
//!
//! ### Asset Management
//! - **add_prize_asset** - Deposit prize assets into asset-based rooms
//!
//! ## Economic Model (Trustless Distribution)
//!
//! Entry fees are automatically split via on-chain execution:
//! - **Platform Fee**: 20% (fixed) - Covers infrastructure and development
//! - **Host Fee**: 0-5% (configurable) - Incentivizes room creation
//! - **Prize Pool**: 0-35% (configurable) - Rewards to winners
//! - **Charity**: 40%+ minimum (calculated remainder) - Primary beneficiary
//!
//! **Critical Feature**: All "extras" payments (tips beyond entry fee) go 100% to charity,
//! maximizing fundraising impact while maintaining transparent accounting.
//!
//! ## Module Organization
//!
//! Following Anchor best practices, the codebase is organized into dedicated modules:
//!
//! - **state** - Account data structures (GlobalConfig, Room, PlayerEntry, TokenRegistry)
//! - **instructions** - Instruction handlers organized by feature domain
//!   - **admin** - Administrative operations
//!   - **room** - Room lifecycle management
//!   - **player** - Player participation
//!   - **game** - Game execution and winner declaration
//!   - **asset** - Asset-based prize management
//!   - **utils** - Shared utility functions
//! - **errors** - Custom error definitions with descriptive messages
//! - **events** - Event definitions for off-chain indexing
//! - **security** - Centralized security utilities and guards
//!
//! ## Security Features
//!
//! - **PDA-based Accounts**: All accounts use Program Derived Addresses preventing signature forgery
//! - **Reentrancy Protection**: Formal reentrancy guards and checks-effects-interactions pattern
//! - **Token Validation**: Full mint and owner verification for prize distributions
//! - **Input Validation**: Strict checks on fee percentages, charity minimums, and winner eligibility
//! - **Amount Validation**: Maximum limits and dust protection to prevent overflow/dust attacks
//! - **Emergency Pause**: Admin can halt operations if critical vulnerability discovered
//! - **Host Restrictions**: Hosts cannot be winners, preventing self-dealing
//! - **Arithmetic Safety**: All calculations use checked math to prevent overflow/underflow exploits
//! - **Security Module**: Centralized security utilities for consistent protection across all instructions
//! - **Owner Checks**: Validates account ownership before operations
//! - **Account Data Matching**: Ensures account data matches expected structure
//!
//! ## Frontend Integration
//!
//! The frontend interacts with this program through the `useFundraiselyContract.ts` hook:
//!
//! - **Room Creation**: Host calls `createRoom()` which invokes `init_pool_room`
//! - **Joining Games**: Players call `joinRoom()` which invokes `join_room` with SPL token approval
//! - **Ending Games**: Host calls `endRoom()` which invokes `end_room` to distribute funds
//! - **Events**: Program emits RoomCreated, PlayerJoined, RoomEnded events for real-time UI updates
//!
//! ## Example Usage
//!
//! ```rust,no_run
//! // Initialize the platform
//! program.methods()
//!     .initialize(platform_wallet, charity_wallet)
//!     .accounts({ admin, system_program })
//!     .rpc()?;
//!
//! // Create a fundraising room
//! program.methods()
//!     .init_pool_room(
//!         room_id,
//!         charity_wallet,
//!         entry_fee,
//!         max_players,
//!         host_fee_bps,
//!         prize_pool_bps,
//!         first_place_pct,
//!         second_place_pct,
//!         third_place_pct,
//!         charity_memo,
//!         expiration_slots,
//!     )
//!     .accounts({ host, fee_token_mint, ... })
//!     .rpc()?;
//!
//! // Join a room
//! program.methods()
//!     .join_room(room_id, extras_amount)
//!     .accounts({ player, room, ... })
//!     .rpc()?;
//!
//! // End room and distribute funds
//! program.methods()
//!     .end_room(room_id, winners)
//!     .accounts({ host, room, ... })
//!     .remaining_accounts(winner_token_accounts)
//!     .rpc()?;
//! ```

use anchor_lang::prelude::*;
use std::str::FromStr;

// Module declarations
pub mod state;
pub mod errors;
pub mod events;
pub mod security;
mod instructions;

// Re-export all types at crate root so Anchor macros can find them
pub use state::*;
pub use errors::*;
pub use events::*;

// Program ID - Synchronized with keypair to fix PDA derivation
declare_id!("8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i");

/// Fundraisely Program
///
/// All instruction handlers are implemented in the instructions module.
/// This keeps lib.rs clean and follows Anchor's recommended project structure.
#[program]
pub mod bingo {
    use super::*;

    /// Initialize the global configuration (one-time setup)
    ///
    /// # Arguments
    /// * `platform_wallet` - Wallet address that receives platform fees
    /// * `charity_wallet` - Default charity wallet for donations
    ///
    /// # Errors
    /// * `ArithmeticOverflow` - If calculation overflows
    /// * `InvalidAccountData` - If account data is invalid
    pub fn initialize(
        ctx: Context<Initialize>,
        platform_wallet: Pubkey,
        charity_wallet: Pubkey,
    ) -> Result<()> {
        crate::instructions::admin::initialize::handler(ctx, platform_wallet, charity_wallet)
    }

    /// Update global configuration parameters (admin only)
    ///
    /// # Arguments
    /// All parameters are optional - only provided values will be updated
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not admin or upgrade authority
    pub fn update_global_config(
        ctx: Context<UpdateGlobalConfig>,
        platform_wallet: Option<Pubkey>,
        charity_wallet: Option<Pubkey>,
        platform_fee_bps: Option<u16>,
        max_host_fee_bps: Option<u16>,
        max_prize_pool_bps: Option<u16>,
        min_charity_bps: Option<u16>,
    ) -> Result<()> {
        crate::instructions::admin::update_global_config::handler(
            ctx,
            platform_wallet,
            charity_wallet,
            platform_fee_bps,
            max_host_fee_bps,
            max_prize_pool_bps,
            min_charity_bps,
        )
    }

    /// Create a pool-based room where prizes come from entry fee pool
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room (max 32 bytes)
    /// * `charity_wallet` - Wallet address for charity donations
    /// * `entry_fee` - Amount players must pay to join (in token base units)
    /// * `max_players` - Maximum number of players allowed (1-10000)
    /// * `host_fee_bps` - Host fee in basis points (0-500 = 0-5%)
    /// * `prize_pool_bps` - Prize pool in basis points (0-3500 = 0-35%)
    /// * `first_place_pct` - First place prize percentage (must sum to 100 with others)
    /// * `second_place_pct` - Second place prize percentage (optional)
    /// * `third_place_pct` - Third place prize percentage (optional)
    /// * `charity_memo` - Memo for charity donation (max 28 bytes)
    /// * `expiration_slots` - Optional expiration in slots (0 = no expiration)
    ///
    /// # Errors
    /// * `EmergencyPause` - If contract is paused
    /// * `InvalidRoomId` - If room_id is invalid
    /// * `InvalidEntryFee` - If entry_fee is zero
    /// * `HostFeeTooHigh` - If host_fee_bps exceeds maximum
    /// * `PrizePoolTooHigh` - If prize_pool_bps exceeds maximum
    /// * `CharityBelowMinimum` - If charity allocation would be below 40%
    /// * `InvalidPrizeDistribution` - If prize percentages don't sum to 100
    pub fn init_pool_room(
        ctx: Context<InitPoolRoom>,
        room_id: String,
        charity_wallet: Pubkey,
        entry_fee: u64,
        max_players: u32,
        host_fee_bps: u16,
        prize_pool_bps: u16,
        first_place_pct: u16,
        second_place_pct: Option<u16>,
        third_place_pct: Option<u16>,
        charity_memo: String,
        expiration_slots: Option<u64>,
    ) -> Result<()> {
        crate::instructions::room::init_pool_room::handler(
            ctx,
            room_id,
            charity_wallet,
            entry_fee,
            max_players,
            host_fee_bps,
            prize_pool_bps,
            first_place_pct,
            second_place_pct,
            third_place_pct,
            charity_memo,
            expiration_slots,
        )
    }

    /// Join a room by paying entry fee
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room
    /// * `extras_amount` - Optional additional donation (100% goes to charity)
    ///
    /// # Errors
    /// * `EmergencyPause` - If contract is paused
    /// * `RoomExpired` - If room has expired
    /// * `RoomNotReady` - If room is not in Ready/Active status
    /// * `RoomAlreadyEnded` - If room has already ended
    /// * `JoiningClosed` - If room is no longer accepting players
    /// * `MaxPlayersReached` - If room is full
    /// * `PlayerAlreadyJoined` - If player has already joined
    pub fn join_room(
        ctx: Context<JoinRoom>,
        room_id: String,
        extras_amount: u64,
    ) -> Result<()> {
        crate::instructions::player::join_room::handler(ctx, room_id, extras_amount)
    }

    /// Declare winners for a room (must be called before end_room)
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room
    /// * `winners` - Vector of winner public keys (1-10 winners)
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not the host
    /// * `InvalidRoomStatus` - If room is not in valid state
    /// * `RoomAlreadyEnded` - If room has already ended
    /// * `WinnersAlreadyDeclared` - If winners have already been declared
    /// * `InvalidWinners` - If winner count is invalid or host is in winners list
    /// * `InvalidPlayerEntry` - If winner did not join the room
    pub fn declare_winners<'info>(
        ctx: Context<'_, '_, '_, 'info, DeclareWinners<'info>>,
        room_id: String,
        winners: Vec<Pubkey>,
    ) -> Result<()> {
        crate::instructions::game::declare_winners::handler(ctx, room_id, winners)
    }

    /// End room and distribute prizes to winners
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room
    /// * `winners` - Vector of winner public keys (used if winners not pre-declared)
    ///
    /// # Accounts
    /// * `remaining_accounts` - Winner token accounts for prize distribution
    ///
    /// # Errors
    /// * `RoomAlreadyEnded` - If room has already ended
    /// * `InvalidRoomStatus` - If room is not in Active status
    /// * `Unauthorized` - If caller is not the host (unless room is expired)
    /// * `InvalidWinners` - If winner list is invalid
    /// * `HostCannotBeWinner` - If host is in winners list
    /// * `InvalidTokenMint` - If token mint doesn't match
    /// * `InvalidTokenOwner` - If token owner doesn't match winner
    pub fn end_room<'info>(
        ctx: Context<'_, '_, '_, 'info, EndRoom<'info>>,
        room_id: String,
        winners: Vec<Pubkey>,
    ) -> Result<()> {
        crate::instructions::game::end_room::handler(ctx, room_id, winners)
    }

    /// Initialize the token registry (one-time setup)
    ///
    /// # Errors
    /// * `AccountAlreadyInitialized` - If registry already exists
    pub fn initialize_token_registry(ctx: Context<InitializeTokenRegistry>) -> Result<()> {
        crate::instructions::admin::initialize_token_registry::handler(ctx)
    }

    /// Add a token to the approved list
    ///
    /// # Arguments
    /// * `token_mint` - Public key of the token mint to approve
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not admin
    /// * `TokenAlreadyApproved` - If token is already in the registry
    /// * `TokenRegistryFull` - If registry is at capacity (50 tokens)
    pub fn add_approved_token(ctx: Context<AddApprovedToken>, token_mint: Pubkey) -> Result<()> {
        crate::instructions::admin::add_approved_token::handler(ctx, token_mint)
    }

    /// Remove a token from the approved list
    ///
    /// # Arguments
    /// * `token_mint` - Public key of the token mint to remove
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not admin
    /// * `TokenNotApproved` - If token is not in the registry
    pub fn remove_approved_token(ctx: Context<RemoveApprovedToken>, token_mint: Pubkey) -> Result<()> {
        crate::instructions::admin::remove_approved_token::handler(ctx, token_mint)
    }

    /// Initialize asset-based room
    ///
    /// Creates a room where prizes are pre-deposited assets rather than pool-based.
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room (max 32 bytes)
    /// * `charity_wallet` - Wallet address for charity donations
    /// * `entry_fee` - Amount players must pay to join
    /// * `max_players` - Maximum number of players allowed
    /// * `host_fee_bps` - Host fee in basis points (0-500)
    /// * `charity_memo` - Memo for charity donation (max 28 bytes)
    /// * `expiration_slots` - Optional expiration in slots
    /// * `prize_1_mint` - Token mint for first place prize
    /// * `prize_1_amount` - Amount for first place prize
    /// * `prize_2_mint` - Optional token mint for second place prize
    /// * `prize_2_amount` - Optional amount for second place prize
    /// * `prize_3_mint` - Optional token mint for third place prize
    /// * `prize_3_amount` - Optional amount for third place prize
    pub fn init_asset_room(
        ctx: Context<InitAssetRoom>,
        room_id: String,
        charity_wallet: Pubkey,
        entry_fee: u64,
        max_players: u32,
        host_fee_bps: u16,
        charity_memo: String,
        expiration_slots: Option<u64>,
        prize_1_mint: Pubkey,
        prize_1_amount: u64,
        prize_2_mint: Option<Pubkey>,
        prize_2_amount: Option<u64>,
        prize_3_mint: Option<Pubkey>,
        prize_3_amount: Option<u64>,
    ) -> Result<()> {
        crate::instructions::asset::init_asset_room::handler(
            ctx,
            room_id,
            charity_wallet,
            entry_fee,
            max_players,
            host_fee_bps,
            charity_memo,
            expiration_slots,
            prize_1_mint,
            prize_1_amount,
            prize_2_mint,
            prize_2_amount,
            prize_3_mint,
            prize_3_amount,
        )
    }

    /// Add prize asset to asset-based room
    ///
    /// Deposits a prize asset into the room's prize vault.
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room
    /// * `prize_index` - Index of prize (0, 1, or 2)
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not the host
    /// * `InvalidRoomStatus` - If room is not in asset-based mode
    /// * `PrizeAlreadyDeposited` - If prize has already been deposited
    pub fn add_prize_asset(
        ctx: Context<AddPrizeAsset>,
        room_id: String,
        prize_index: u8,
    ) -> Result<()> {
        crate::instructions::asset::add_prize_asset::handler(ctx, room_id, prize_index)
    }

    /// Recover abandoned room (admin only)
    ///
    /// Allows admin to recover funds from abandoned rooms and refund players.
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room to recover
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not admin
    /// * `RoomAlreadyEnded` - If room has already ended
    /// * `InsufficientBalance` - If room has no funds to recover
    pub fn recover_room<'info>(
        ctx: Context<'_, '_, 'info, 'info, RecoverRoom<'info>>,
        room_id: String,
    ) -> Result<()> {
        crate::instructions::admin::recover_room::handler(ctx, room_id)
    }

    /// Set emergency pause (admin only)
    ///
    /// Circuit breaker to halt all contract operations in case of security incident.
    ///
    /// # Arguments
    /// * `paused` - True to pause, false to unpause
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not admin
    pub fn set_emergency_pause(
        ctx: Context<SetEmergencyPause>,
        paused: bool,
    ) -> Result<()> {
        crate::instructions::admin::set_emergency_pause::handler(ctx, paused)
    }

    /// Close joining for a room (host only)
    ///
    /// Prevents new players from joining while allowing existing game to continue.
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not the host
    pub fn close_joining(
        ctx: Context<CloseJoining>,
        room_id: String,
    ) -> Result<()> {
        crate::instructions::room::close_joining::handler(ctx, room_id)
    }

    /// Cleanup room and reclaim rent (host or admin)
    ///
    /// Closes ended room accounts and reclaims rent. Only works if vault is empty.
    ///
    /// # Arguments
    /// * `room_id` - Unique identifier for the room
    ///
    /// # Errors
    /// * `Unauthorized` - If caller is not host or admin
    /// * `VaultNotEmpty` - If vault still has funds
    pub fn cleanup_room(
        ctx: Context<CleanupRoom>,
        room_id: String,
    ) -> Result<()> {
        crate::instructions::room::cleanup_room::handler(ctx, room_id)
    }
}

// Account structures defined at crate root for Anchor macro compatibility
// The handlers are in separate modules, but Accounts structs must be here

/// Context for initializing the global configuration
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// Global configuration PDA account
    #[account(
        init,
        payer = admin,
        space = GlobalConfig::LEN,
        seeds = [b"global-config"],
        bump
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    /// Admin account that will own the configuration
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Context for updating global configuration
#[derive(Accounts)]
pub struct UpdateGlobalConfig<'info> {
    /// Global configuration PDA account
    #[account(
        mut,
        seeds = [b"global-config"],
        bump = global_config.bump,
        constraint = global_config.admin == admin.key() || is_upgrade_authority(&admin.key()) @ BingoError::Unauthorized
    )]
    pub global_config: Account<'info, GlobalConfig>,
    
    /// Admin or upgrade authority account
    pub admin: Signer<'info>,
}

/// Check if signer is the upgrade authority
///
/// This allows the upgrade authority to modify configuration even if not the admin.
/// Useful for emergency situations or program upgrades.
fn is_upgrade_authority(signer: &Pubkey) -> bool {
    // Hardcoded upgrade authority
    let known_authority = Pubkey::from_str("C1vn2MT7tZotZPjUJQDf9oo3dpZZ2tr7NxYLg8jTYgkw").unwrap();
    signer == &known_authority
}

/// Context for initializing a pool-based room
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct InitPoolRoom<'info> {
    /// Room PDA account
    #[account(
        init,
        payer = host,
        space = Room::LEN,
        seeds = [b"room", host.key().as_ref(), room_id.as_bytes()],
        bump
    )]
    pub room: Account<'info, Room>,

    /// Room vault PDA - will be initialized as TokenAccount during room creation.
    /// 
    /// # Security
    /// Handler validates this is a proper TokenAccount with correct mint/authority.
    /// Using AccountInfo to avoid initialization order issues (room must exist before vault can use it as authority).
    /// The handler performs manual deserialization and validation of TokenAccount structure.
    #[account(
        mut,
        seeds = [b"room-vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: AccountInfo<'info>,

    /// Token mint for entry fees
    pub fee_token_mint: Account<'info, anchor_spl::token::Mint>,

    /// Token registry PDA
    #[account(
        seeds = [b"token-registry-v4"],
        bump = token_registry.bump
    )]
    pub token_registry: Account<'info, TokenRegistry>,

    /// Global configuration PDA
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Host account creating the room
    #[account(mut)]
    pub host: Signer<'info>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
    
    /// Token program for token account initialization
    pub token_program: Program<'info, anchor_spl::token::Token>,
    
    /// Rent sysvar for account sizing
    pub rent: Sysvar<'info, Rent>,
}

/// Context for joining a room
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct JoinRoom<'info> {
    /// Room PDA account
    #[account(
        mut,
        seeds = [b"room", room.host.as_ref(), room_id.as_bytes()],
        bump = room.bump
    )]
    pub room: Account<'info, Room>,

    /// Player entry PDA - prevents duplicate joins
    #[account(
        init,
        payer = player,
        space = PlayerEntry::LEN,
        seeds = [b"player", room.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_entry: Account<'info, PlayerEntry>,

    /// Room vault token account - receives player's entry fee tokens.
    /// 
    /// # Security
    /// Properly typed as TokenAccount to ensure correct account validation.
    #[account(
        mut,
        seeds = [b"room-vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: Account<'info, anchor_spl::token::TokenAccount>,

    /// Player's token account (source of funds)
    #[account(mut)]
    pub player_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    /// Global configuration PDA
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Player account joining the room
    #[account(mut)]
    pub player: Signer<'info>,

    /// Token program for token transfers
    pub token_program: Program<'info, anchor_spl::token::Token>,
    
    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Context for declaring winners
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct DeclareWinners<'info> {
    /// Room PDA account
    #[account(
        mut,
        seeds = [b"room", room.host.as_ref(), room_id.as_bytes()],
        bump = room.bump,
    )]
    pub room: Account<'info, Room>,

    /// Host account declaring winners
    #[account(mut)]
    pub host: Signer<'info>,
}

/// Context for ending a room and distributing funds
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct EndRoom<'info> {
    /// Room PDA account
    #[account(
        mut,
        seeds = [b"room", host.key().as_ref(), room_id.as_bytes()],
        bump = room.bump,
    )]
    pub room: Account<'info, Room>,

    /// Room vault token account (source of funds)
    #[account(mut)]
    pub room_vault: Account<'info, anchor_spl::token::TokenAccount>,

    /// Global configuration PDA
    #[account(seeds = [b"global-config"], bump = global_config.bump)]
    pub global_config: Account<'info, GlobalConfig>,

    /// Platform wallet token account (receives platform fees)
    #[account(mut)]
    pub platform_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    /// Charity wallet token account (receives charity donations)
    #[account(mut)]
    pub charity_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    /// Host wallet token account (receives host fees)
    #[account(mut)]
    pub host_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    /// Host account ending the room
    #[account(mut)]
    pub host: Signer<'info>,

    /// Token program for token transfers
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

/// Context for initializing token registry
#[derive(Accounts)]
pub struct InitializeTokenRegistry<'info> {
    /// Token registry PDA account
    #[account(
        init,
        payer = admin,
        space = TokenRegistry::LEN,
        seeds = [b"token-registry-v4"],
        bump
    )]
    pub token_registry: Account<'info, TokenRegistry>,

    /// Admin account initializing the registry
    #[account(mut)]
    pub admin: Signer<'info>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
}

/// Context for adding approved token
#[derive(Accounts)]
pub struct AddApprovedToken<'info> {
    /// Token registry PDA account
    #[account(
        mut,
        seeds = [b"token-registry-v4"],
        bump = token_registry.bump
    )]
    pub token_registry: Account<'info, TokenRegistry>,

    /// Admin account adding the token
    #[account(mut)]
    pub admin: Signer<'info>,
}

/// Context for removing approved token
#[derive(Accounts)]
pub struct RemoveApprovedToken<'info> {
    /// Token registry PDA account
    #[account(
        mut,
        seeds = [b"token-registry-v4"],
        bump = token_registry.bump
    )]
    pub token_registry: Account<'info, TokenRegistry>,

    /// Admin account removing the token
    #[account(mut)]
    pub admin: Signer<'info>,
}

/// Context for initializing asset-based room
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct InitAssetRoom<'info> {
    /// Room PDA account
    #[account(
        init,
        payer = host,
        space = Room::LEN,
        seeds = [b"room", host.key().as_ref(), room_id.as_bytes()],
        bump
    )]
    pub room: Account<'info, Room>,

    /// Room vault PDA
    #[account(
        seeds = [b"room-vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: AccountInfo<'info>,

    /// Token mint for entry fees
    pub fee_token_mint: Account<'info, anchor_spl::token::Mint>,

    /// Token registry PDA
    #[account(
        seeds = [b"token-registry-v4"],
        bump = token_registry.bump
    )]
    pub token_registry: Account<'info, TokenRegistry>,

    /// Global configuration PDA
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Host account creating the room
    #[account(mut)]
    pub host: Signer<'info>,

    /// System program for account creation
    pub system_program: Program<'info, System>,
    
    /// Token program for token operations
    pub token_program: Program<'info, anchor_spl::token::Token>,
    
    /// Rent sysvar for account sizing
    pub rent: Sysvar<'info, Rent>,
}

/// Context for adding prize asset
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct AddPrizeAsset<'info> {
    /// Room PDA account
    #[account(
        mut,
        seeds = [b"room", room.host.as_ref(), room_id.as_bytes()],
        bump = room.bump
    )]
    pub room: Account<'info, Room>,

    /// Prize vault token account (destination)
    #[account(mut)]
    pub prize_vault: Account<'info, anchor_spl::token::TokenAccount>,

    /// Host token account (source of funds)
    #[account(mut)]
    pub host_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    /// Host account depositing the prize
    #[account(mut)]
    pub host: Signer<'info>,

    /// Token program for token transfers
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

/// Context for recovering abandoned room
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct RecoverRoom<'info> {
    /// Room PDA account
    #[account(
        mut,
        seeds = [b"room", room.host.as_ref(), room_id.as_bytes()],
        bump = room.bump
    )]
    pub room: Account<'info, Room>,

    /// Room vault token account (source of refunds)
    #[account(
        mut,
        seeds = [b"room-vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: Account<'info, anchor_spl::token::TokenAccount>,

    /// Global configuration PDA
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Platform wallet token account (receives recovery fee)
    #[account(mut)]
    pub platform_token_account: Account<'info, anchor_spl::token::TokenAccount>,

    /// Admin account recovering the room
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Token program for token transfers
    pub token_program: Program<'info, anchor_spl::token::Token>,
}

/// Context for setting emergency pause
#[derive(Accounts)]
pub struct SetEmergencyPause<'info> {
    /// Global configuration PDA account
    #[account(
        mut,
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Admin account setting the pause
    #[account(mut)]
    pub admin: Signer<'info>,
}

/// Context for closing room joining
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct CloseJoining<'info> {
    /// Room PDA account
    #[account(
        mut,
        seeds = [b"room", room.host.as_ref(), room_id.as_bytes()],
        bump = room.bump
    )]
    pub room: Account<'info, Room>,

    /// Host account closing the room
    #[account(mut)]
    pub host: Signer<'info>,
}

/// Context for cleaning up room
#[derive(Accounts)]
#[instruction(room_id: String)]
pub struct CleanupRoom<'info> {
    /// Room PDA account
    #[account(
        mut,
        seeds = [b"room", room.host.as_ref(), room_id.as_bytes()],
        bump = room.bump
    )]
    pub room: Account<'info, Room>,

    /// Room vault token account (must be empty)
    #[account(
        mut,
        seeds = [b"room-vault", room.key().as_ref()],
        bump
    )]
    pub room_vault: Account<'info, anchor_spl::token::TokenAccount>,

    /// Global configuration PDA
    #[account(
        seeds = [b"global-config"],
        bump = global_config.bump
    )]
    pub global_config: Account<'info, GlobalConfig>,

    /// Caller account (host or admin)
    #[account(mut)]
    pub caller: Signer<'info>,

    /// Token program for token operations
    pub token_program: Program<'info, anchor_spl::token::Token>,
}
