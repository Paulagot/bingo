# Contract Fix Summary: Prize Vault Initialization

## Problem
Anchor validates PDA accounts before the handler runs. When `prize_vault` is defined as a PDA with seeds in the struct, Anchor checks if the account exists and is initialized. Since the account doesn't exist yet, Anchor throws `AccountNotInitialized` error.

## Solution Applied

### 1. Removed PDA Constraint from Struct
**File**: `programs/bingo/src/lib.rs`

Changed from:
```rust
#[account(
    mut,
    seeds = [b"prize-vault", room.key().as_ref(), &[prize_index]],
    bump
)]
pub prize_vault: AccountInfo<'info>,
```

To:
```rust
#[account(mut)]
pub prize_vault: AccountInfo<'info>,
```

This allows Anchor to accept an uninitialized account without validation errors.

### 2. Added Manual PDA Derivation in Handler
**File**: `programs/bingo/src/instructions/asset/add_prize_asset.rs`

Added manual PDA derivation and validation:
```rust
// Manually derive prize vault PDA and validate it matches the provided account
let (expected_prize_vault, bump) = Pubkey::find_program_address(
    &[
        b"prize-vault",
        room_key.as_ref(),
        &[prize_index],
    ],
    ctx.program_id,
);
require!(
    ctx.accounts.prize_vault.key() == expected_prize_vault,
    BingoError::InvalidVaultAccount
);
```

### 3. Updated Bump Usage
Changed from `ctx.bumps.prize_vault` to the manually derived `bump` variable in both `invoke_signed` calls.

## Next Steps

1. **Rebuild the contract**:
   ```bash
   cd C:\Users\isich\bingo-solana-contracts\solana-contracts
   anchor build
   ```

2. **Upgrade the program**:
   ```bash
   anchor upgrade --program-id 8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i --provider.cluster devnet target/deploy/bingo.so
   ```

3. **Update the IDL**:
   ```bash
   anchor idl upgrade --filepath target/idl/bingo.json --provider.cluster devnet 8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i
   ```

4. **Copy IDL to frontend**:
   ```bash
   Copy-Item target\idl\bingo.json C:\Users\isich\bingo\src\idl\solana_bingo.json -Force
   ```

## How It Works

1. Frontend derives `prize_vault` PDA manually and passes it to the instruction
2. Anchor accepts the account (no validation because no PDA constraint)
3. Handler manually validates the PDA address matches expected derivation
4. Handler creates the account if it doesn't exist
5. Handler initializes it as a token account
6. Handler transfers tokens from host to vault

This approach is similar to how `room_vault` works in `init_asset_room`, but adapted for the case where the room already exists.

