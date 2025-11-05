# Solana Contract Deployment Guide

This guide explains how to deploy the updated Solana contract and update the IDL in the frontend.

## Prerequisites

1. **Anchor CLI** installed: `npm install -g @coral-xyz/anchor-cli`
2. **Solana CLI** installed: `sh -c "$(curl -sSfL https://release.anchorswap.com/stable/install)"`
3. Access to the Solana contract repository (separate repo)
4. Devnet SOL for deployment (get from: `solana airdrop 2`)

## Step 1: Deploy the Updated Contract

### Option A: If you have access to the contract repository

1. Navigate to the contract repository:
   ```bash
   cd path/to/bingo-solana-contracts
   ```

2. Build the contract:
   ```bash
   anchor build
   ```

3. Deploy to devnet:
   ```bash
   anchor deploy --provider.cluster devnet
   ```

4. Note the program ID from the deployment output. It should match:
   ```
   8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i
   ```

5. Copy the generated IDL file:
   ```bash
   cp target/idl/bingo.json /path/to/bingo/src/idl/solana_bingo.json
   ```

### Option B: If the contract is already deployed

If the contract has already been deployed, you can fetch the IDL using the script:

```bash
npm run fetch-idl
```

Or with a custom program ID:

```bash
npx ts-node scripts/fetchIdl.ts --program-id <YOUR_PROGRAM_ID>
```

## Step 2: Update the IDL File

After deployment, the IDL file should be automatically updated. The IDL file is located at:
```
src/idl/solana_bingo.json
```

### Verify the IDL

Check that the IDL includes the `add_prize_asset` instruction:

```json
{
  "instructions": [
    {
      "name": "add_prize_asset",
      "docs": ["Add prize asset to asset-based room"],
      "accounts": [
        {
          "name": "room",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [114, 111, 111, 109]}, // "room"
              {"kind": "account", "path": "room.host"},
              {"kind": "arg", "path": "room_id"}
            ]
          }
        },
        {
          "name": "prize_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {"kind": "const", "value": [112, 114, 105, 122, 101, 45, 118, 97, 117, 108, 116]}, // "prize-vault"
              {"kind": "account", "path": "room"},
              {"kind": "arg", "path": "prize_index"}
            ]
          }
        },
        // ... other accounts
      ],
      "args": [
        {"name": "room_id", "type": "string"},
        {"name": "prize_index", "type": "u8"}
      ]
    }
  ]
}
```

### Key Changes in Updated Contract

The updated contract should:
1. ✅ Create `prize_vault` PDA token account if it doesn't exist
2. ✅ Handle prize vault initialization similar to `room_vault`
3. ✅ Support deposits for prize indices 0, 1, and 2

## Step 3: Test the depositPrizeAsset Function

### Run Integration Tests

```bash
# Run depositPrizeAsset tests
npm run test:deposit-prize

# Or run with environment variable to enable Solana tests
RUN_SOLANA_TESTS=true npm run test:deposit-prize
```

### Manual Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Create an asset room:**
   - Navigate to the room creation page
   - Select "Asset-based" prize mode
   - Configure prizes (at least 1st place)
   - Deploy the room

3. **Deposit prize assets:**
   - After room creation, use the asset upload panel
   - Click "Deposit Prize" for each prize
   - Verify the transaction succeeds

4. **Verify on-chain:**
   - Check the Solana Explorer for the transaction
   - Verify the prize vault PDA was created
   - Verify the prize vault has the correct token balance

### Test Checklist

- [ ] Contract deployed successfully
- [ ] IDL file updated with latest contract interface
- [ ] `add_prize_asset` instruction exists in IDL
- [ ] Can create asset room
- [ ] Can deposit prize asset for index 0 (1st place)
- [ ] Can deposit prize asset for index 1 (2nd place) - if configured
- [ ] Can deposit prize asset for index 2 (3rd place) - if configured
- [ ] Prize vault PDA created correctly
- [ ] Prize vault has correct token balance
- [ ] Room status updates to "Ready" after all prizes deposited

## Troubleshooting

### IDL Not Found Error

If `fetch-idl` fails with "IDL not found":
- The program may not have an IDL account stored on-chain
- In this case, copy the IDL from the contract repo's `target/idl/` directory

### Transaction Fails: AccountNotInitialized

If you see `AccountNotInitialized` for `prize_vault`:
- The contract needs to be updated to create the prize vault PDA
- See `CONTRACT_FIX_PRIZE_VAULT.md` for details

### Program ID Mismatch

If the program ID doesn't match:
- Update `src/chains/solana/config.ts` with the new program ID
- Update `src/idl/solana_bingo.json` address field

## Next Steps

After successful deployment and testing:

1. ✅ Verify all tests pass
2. ✅ Test in the UI
3. ✅ Deploy to mainnet (when ready)
4. ✅ Update production IDL

## Additional Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- Contract Fix Documentation: `CONTRACT_FIX_PRIZE_VAULT.md`

