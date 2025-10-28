//! # Utility Functions
//!
//! Helper functions used across multiple instructions for common calculations.

use anchor_lang::prelude::*;
use crate::errors::BingoError;

/// Calculate basis points (percentage) of an amount
///
/// BPS (Basis Points) are 1/100th of a percent:
/// - 100 BPS = 1%
/// - 1000 BPS = 10%
/// - 10000 BPS = 100%
///
/// Used for fee calculations throughout the program.
///
/// # Arguments
/// * `amount` - The total amount to calculate percentage of
/// * `bps` - Basis points (0-10000)
///
/// # Returns
/// The calculated amount, or error if overflow occurs
///
/// # Example
/// ```
/// let platform_fee = calculate_bps(1000, 2000)?; // 20% of 1000 = 200
/// ```
pub fn calculate_bps(amount: u64, bps: u16) -> Result<u64> {
    const BPS_DENOMINATOR: u64 = 10000;
    amount
        .checked_mul(bps as u64)
        .and_then(|v| v.checked_div(BPS_DENOMINATOR))
        .ok_or(BingoError::ArithmeticOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bps() {
        // 20% of 1000 = 200
        assert_eq!(calculate_bps(1000, 2000).unwrap(), 200);

        // 5% of 1000 = 50
        assert_eq!(calculate_bps(1000, 500).unwrap(), 50);

        // 100% of 1000 = 1000
        assert_eq!(calculate_bps(1000, 10000).unwrap(), 1000);

        // 0% of 1000 = 0
        assert_eq!(calculate_bps(1000, 0).unwrap(), 0);
    }
}
