//! # Security Module
//!
//! Reusable security utilities and guards for the Fundraisely smart contract.
//!
//! This module provides centralized security functions to prevent common vulnerabilities:
//! - Reentrancy protection
//! - Amount validation (max limits, dust protection)
//! - Input sanitization
//! - Common security checks

use anchor_lang::prelude::*;
use crate::errors::BingoError;

/// Maximum safe amount for a single transaction (prevents overflow attacks)
/// This is approximately 2^63 / 2 to leave room for calculations
pub const MAX_SAFE_AMOUNT: u64 = 9_223_372_036_854_775_807 / 2;

/// Minimum amount to prevent dust attacks (e.g., 0.001 USDC for 6 decimals = 1000)
pub const MIN_DUST_THRESHOLD: u64 = 1000;

/// Reentrancy guard for room operations
/// 
/// On Solana, reentrancy is less of a concern than on EVM chains because:
/// - Transactions are atomic
/// - CPI calls are synchronous and complete before the program continues
/// - However, we still protect against state inconsistencies
pub struct ReentrancyGuard;

impl ReentrancyGuard {
    /// Check if a room has already been processed (ended)
    /// 
    /// This prevents double-processing of rooms and ensures idempotency
    pub fn check_room_not_ended(ended: bool) -> Result<()> {
        require!(!ended, BingoError::RoomAlreadyEnded);
        Ok(())
    }

    /// Set the ended flag before external calls
    /// 
    /// This follows the checks-effects-interactions pattern:
    /// 1. Check state is valid
    /// 2. Update state flags FIRST
    /// 3. Then make external calls
    pub fn set_ended_flag<T>(ended: &mut bool, status: &mut T, new_status: T) -> Result<()> {
        require!(!*ended, BingoError::RoomAlreadyEnded);
        *ended = true;
        *status = new_status;
        Ok(())
    }
}

/// Amount validation utilities
pub struct AmountValidator;

impl AmountValidator {
    /// Validate an amount is within safe bounds
    /// 
    /// Prevents:
    /// - Overflow attacks (amounts too large)
    /// - Dust attacks (amounts too small)
    /// - Zero amounts where not allowed
    pub fn validate_amount(amount: u64, allow_zero: bool) -> Result<()> {
        // Check for zero (if not allowed)
        if !allow_zero {
            require!(amount > 0, BingoError::InvalidEntryFee);
        }

        // Check for overflow protection
        require!(
            amount <= MAX_SAFE_AMOUNT,
            BingoError::ArithmeticOverflow
        );

        // Check for dust (unless explicitly allowing zero)
        if !allow_zero && amount < MIN_DUST_THRESHOLD {
            // Warn but don't fail - some tokens might have very small values
            msg!("Warning: Amount {} is below dust threshold {}", amount, MIN_DUST_THRESHOLD);
        }

        Ok(())
    }

    /// Validate entry fee is reasonable
    pub fn validate_entry_fee(entry_fee: u64) -> Result<()> {
        Self::validate_amount(entry_fee, false)?;
        Ok(())
    }

    /// Validate extras amount (can be zero)
    pub fn validate_extras(extras: u64) -> Result<()> {
        Self::validate_amount(extras, true)?;
        Ok(())
    }

    /// Validate total payment amount
    pub fn validate_total_payment(entry_fee: u64, extras: u64) -> Result<u64> {
        Self::validate_entry_fee(entry_fee)?;
        Self::validate_extras(extras)?;
        
        let total = entry_fee
            .checked_add(extras)
            .ok_or(BingoError::ArithmeticOverflow)?;
        
        Self::validate_amount(total, false)?;
        
        Ok(total)
    }
}

/// Input validation utilities
pub struct InputValidator;

impl InputValidator {
    /// Validate room ID length and content
    pub fn validate_room_id(room_id: &str) -> Result<()> {
        require!(
            room_id.len() > 0 && room_id.len() <= 32,
            BingoError::InvalidRoomId
        );
        
        // Check for null bytes (prevent injection attacks)
        require!(
            !room_id.contains('\0'),
            BingoError::InvalidRoomId
        );
        
        Ok(())
    }

    /// Validate charity memo length
    pub fn validate_charity_memo(memo: &str) -> Result<()> {
        require!(
            memo.len() <= 28,
            BingoError::InvalidMemo
        );
        
        // Check for null bytes
        require!(
            !memo.contains('\0'),
            BingoError::InvalidMemo
        );
        
        Ok(())
    }

    /// Validate max players is reasonable
    pub fn validate_max_players(max_players: u32) -> Result<()> {
        const MAX_PLAYERS_LIMIT: u32 = 10000;
        require!(
            max_players > 0 && max_players <= MAX_PLAYERS_LIMIT,
            BingoError::InvalidMaxPlayers
        );
        Ok(())
    }

    /// Validate winner count
    pub fn validate_winner_count(count: usize, min: usize, max: usize) -> Result<()> {
        require!(
            count >= min && count <= max,
            BingoError::InvalidWinners
        );
        Ok(())
    }
}

/// Emergency pause checker
pub struct EmergencyGuard;

impl EmergencyGuard {
    /// Check if contract is paused
    pub fn check_not_paused(paused: bool) -> Result<()> {
        require!(!paused, BingoError::EmergencyPause);
        Ok(())
    }
}

/// Access control utilities
pub struct AccessControl;

impl AccessControl {
    /// Verify admin authority
    pub fn verify_admin(admin: &Pubkey, expected_admin: &Pubkey) -> Result<()> {
        require!(
            admin == expected_admin,
            BingoError::Unauthorized
        );
        Ok(())
    }

    /// Verify host authority
    pub fn verify_host(host: &Pubkey, expected_host: &Pubkey) -> Result<()> {
        require!(
            host == expected_host,
            BingoError::Unauthorized
        );
        Ok(())
    }

    /// Verify host is not in a list (prevents self-dealing)
    pub fn verify_host_not_in_list(host: &Pubkey, list: &[Pubkey]) -> Result<()> {
        require!(
            !list.contains(host),
            BingoError::HostCannotBeWinner
        );
        Ok(())
    }
}

/// Arithmetic safety utilities
pub struct ArithmeticGuard;

impl ArithmeticGuard {
    /// Safe addition with overflow check
    pub fn checked_add(a: u64, b: u64) -> Result<u64> {
        a.checked_add(b).ok_or(BingoError::ArithmeticOverflow.into())
    }

    /// Safe subtraction with underflow check
    pub fn checked_sub(a: u64, b: u64) -> Result<u64> {
        a.checked_sub(b).ok_or(BingoError::ArithmeticUnderflow.into())
    }

    /// Safe multiplication with overflow check
    pub fn checked_mul(a: u64, b: u64) -> Result<u64> {
        a.checked_mul(b).ok_or(BingoError::ArithmeticOverflow.into())
    }

    /// Safe division with zero check
    pub fn checked_div(a: u64, b: u64) -> Result<u64> {
        require!(b > 0, BingoError::ArithmeticUnderflow);
        Ok(a.checked_div(b).unwrap_or(0))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_amount_validator() {
        // Valid amounts
        assert!(AmountValidator::validate_entry_fee(1_000_000).is_ok());
        assert!(AmountValidator::validate_extras(0).is_ok());
        assert!(AmountValidator::validate_extras(500_000).is_ok());

        // Invalid: zero entry fee
        assert!(AmountValidator::validate_entry_fee(0).is_err());

        // Invalid: too large
        assert!(AmountValidator::validate_amount(MAX_SAFE_AMOUNT + 1, false).is_err());
    }

    #[test]
    fn test_input_validator() {
        // Valid room IDs
        assert!(InputValidator::validate_room_id("test-room").is_ok());
        assert!(InputValidator::validate_room_id("a").is_ok());

        // Invalid: too long
        let long_id = "a".repeat(33);
        assert!(InputValidator::validate_room_id(&long_id).is_err());

        // Invalid: empty
        assert!(InputValidator::validate_room_id("").is_err());
    }

    #[test]
    fn test_arithmetic_guard() {
        assert_eq!(ArithmeticGuard::checked_add(100, 200).unwrap(), 300);
        assert_eq!(ArithmeticGuard::checked_sub(200, 100).unwrap(), 100);
        assert_eq!(ArithmeticGuard::checked_mul(100, 2).unwrap(), 200);
        assert_eq!(ArithmeticGuard::checked_div(200, 2).unwrap(), 100);

        // Overflow
        assert!(ArithmeticGuard::checked_add(u64::MAX, 1).is_err());
        
        // Underflow
        assert!(ArithmeticGuard::checked_sub(100, 200).is_err());
        
        // Division by zero
        assert!(ArithmeticGuard::checked_div(100, 0).is_err());
    }
}

