//! # Init Asset Room Instruction
//!
//! Creates an asset-based fundraising room where prizes are pre-deposited SPL tokens
//! rather than percentages of the entry fee pool.
//!
//! ## Overview
//!
//! Asset-based rooms differ from pool-based rooms:
//! - Host escrows specific SPL token prizes (up to 3) BEFORE players can join
//! - Entry fees go to platform (20%) and charity (75-80%)
//! - Host can take 0-5% of entry fees
//! - Winners receive the pre-escrowed assets

use anchor_lang::prelude::*;
use crate::state::{RoomStatus, PrizeMode, PrizeAsset};
use crate::errors::BingoError;
use crate::events::AssetRoomCreated;

/// Create an asset-based room where prizes are pre-deposited tokens
pub fn handler(
    ctx: Context<crate::InitAssetRoom>,
    room_id: String,
    charity_wallet: Pubkey,
    entry_fee: u64,
    max_players: u32,
    host_fee_bps: u16,
    charity_memo: String,
    expiration_slots: Option<u64>,
    // Prize assets [1st, 2nd, 3rd] - mint and amount for each
    prize_1_mint: Pubkey,
    prize_1_amount: u64,
    prize_2_mint: Option<Pubkey>,
    prize_2_amount: Option<u64>,
    prize_3_mint: Option<Pubkey>,
    prize_3_amount: Option<u64>,
) -> Result<()> {
    // Validation
    require!(
        !ctx.accounts.global_config.emergency_pause,
        BingoError::EmergencyPause
    );

    // Validate token is approved in registry
    require!(
        ctx.accounts.token_registry.is_token_approved(&ctx.accounts.fee_token_mint.key()),
        BingoError::TokenNotApproved
    );

    require!(
        room_id.len() <= 32 && room_id.len() > 0,
        BingoError::InvalidRoomId
    );

    require!(
        entry_fee > 0,
        BingoError::InvalidEntryFee
    );

    // Validate max_players
    const MAX_PLAYERS_LIMIT: u32 = 10000;
    require!(
        max_players > 0 && max_players <= MAX_PLAYERS_LIMIT,
        BingoError::InvalidMaxPlayers
    );

    // Validate host fee (max 5%)
    require!(
        host_fee_bps <= ctx.accounts.global_config.max_host_fee_bps,
        BingoError::HostFeeTooHigh
    );

    // Validate prize amounts
    require!(prize_1_amount > 0, BingoError::InvalidPrizeAmount);
    if let Some(amt) = prize_2_amount {
        require!(amt > 0, BingoError::InvalidPrizeAmount);
    }
    if let Some(amt) = prize_3_amount {
        require!(amt > 0, BingoError::InvalidPrizeAmount);
    }

    // Initialize room
    let room = &mut ctx.accounts.room;
    room.room_id = room_id.clone();
    room.host = ctx.accounts.host.key();
    room.charity_wallet = charity_wallet;
    room.fee_token_mint = ctx.accounts.fee_token_mint.key();
    room.entry_fee = entry_fee;
    room.host_fee_bps = host_fee_bps;
    room.prize_pool_bps = 0; // No prize pool for asset-based rooms

    // Calculate charity percentage (entry fees minus platform and host fees)
    let platform_bps = ctx.accounts.global_config.platform_fee_bps;
    room.charity_bps = 10000_u16
        .saturating_sub(platform_bps)
        .saturating_sub(host_fee_bps);

    // Asset-based rooms have higher charity allocation (75-80%)
    msg!("   Platform: {}bps, Host: {}bps, Charity: {}bps",
        platform_bps, host_fee_bps, room.charity_bps);

    room.prize_mode = PrizeMode::AssetBased;
    room.prize_distribution = vec![100, 0, 0]; // Not used for asset-based, but required
    room.status = RoomStatus::AwaitingFunding; // Waiting for prize deposits
    room.player_count = 0;
    room.max_players = max_players;
    room.total_collected = 0;
    room.total_entry_fees = 0;
    room.total_extras_fees = 0;
    room.ended = false;
    room.winners = Vec::new();

    // Set prize asset info (not yet deposited)
    room.prize_assets = [
        Some(PrizeAsset {
            mint: prize_1_mint,
            amount: prize_1_amount,
            deposited: false,
        }),
        prize_2_mint.and_then(|mint| {
            prize_2_amount.map(|amount| PrizeAsset {
                mint,
                amount,
                deposited: false,
            })
        }),
        prize_3_mint.and_then(|mint| {
            prize_3_amount.map(|amount| PrizeAsset {
                mint,
                amount,
                deposited: false,
            })
        }),
    ];

    let current_slot = Clock::get()?.slot;
    room.creation_slot = current_slot;

    // Set expiration slot if specified
    room.expiration_slot = if let Some(slots) = expiration_slots {
        current_slot.checked_add(slots).unwrap_or(0)
    } else {
        0 // No expiration
    };

    room.charity_memo = charity_memo;
    room.bump = ctx.bumps.room;

    msg!("Asset room created: {}", room_id);
    msg!("   Entry fee: {} lamports", entry_fee);
    msg!("   Max players: {}", max_players);
    msg!("   Status: AwaitingFunding (host must deposit prizes)");

    // Count expected prizes
    let mut expected_prizes = 1u8; // prize_1 is mandatory
    if prize_2_mint.is_some() { expected_prizes += 1; }
    if prize_3_mint.is_some() { expected_prizes += 1; }

    // Emit event
    emit!(AssetRoomCreated {
        room: room.key(),
        room_id: room_id.clone(),
        host: ctx.accounts.host.key(),
        entry_fee,
        expected_prizes,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

// Note: Account struct is in lib.rs
