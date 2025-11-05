//! # Cleanup Room Instruction
//!
//! Closes the room vault and reclaims rent after a room has ended and distributed all funds.
//! This is an important housekeeping operation to recover rent lamports.
//!
//! ## Security
//! - Can only be called by room host or admin
//! - Room must be ended
//! - Vault must be empty (balance = 0)
//! - Closes the vault token account to reclaim rent
//!
//! ## Usage
//! ```typescript
//! await program.methods
//!   .cleanupRoom(roomId)
//!   .accounts({ room, roomVault, host, tokenProgram })
//!   .rpc();
//! ```

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, CloseAccount};
use crate::{Room, GlobalConfig, BingoError, RoomCleaned, CleanupRoom};

pub fn handler(ctx: Context<CleanupRoom>, room_id: String) -> Result<()> {
    let room = &ctx.accounts.room;
    let room_vault = &ctx.accounts.room_vault;
    let caller = &ctx.accounts.caller;
    let global_config = &ctx.accounts.global_config;

    // Verify caller is either host or admin
    let is_host = room.host == caller.key();
    let is_admin = global_config.admin == caller.key();
    require!(
        is_host || is_admin,
        BingoError::InsufficientAuthority
    );

    // Room must be ended
    require!(
        room.ended,
        BingoError::InvalidRoomStatus
    );

    // Vault must be empty
    require!(
        room_vault.amount == 0,
        BingoError::VaultNotEmpty
    );

    // Get rent before closing
    let rent_reclaimed = room_vault.to_account_info().lamports();

    // Close the vault account using PDA signer
    let room_key = room.key();
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"room-vault",
        room_key.as_ref(),
        &[ctx.bumps.room_vault],
    ]];

    let cpi_accounts = CloseAccount {
        account: room_vault.to_account_info(),
        destination: caller.to_account_info(),
        authority: room_vault.to_account_info(), // vault is its own authority via PDA
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);

    token::close_account(cpi_ctx)?;

    // Emit event
    emit!(RoomCleaned {
        room: room.key(),
        room_id: room_id.clone(),
        rent_reclaimed,
        recipient: caller.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });

    msg!(
        "Room {} cleaned up, {} lamports reclaimed",
        room_id,
        rent_reclaimed
    );

    Ok(())
}
