# Fundraisely Solana Program - Deployment Guide

This guide walks you through deploying the Fundraisely Solana program to devnet or mainnet.

## Prerequisites

### 1. Install Solana CLI

```bash
# Latest stable version
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Verify installation
solana --version
```

### 2. Install Anchor CLI

```bash
# Install from GitHub (v0.30.1)
cargo install --git https://github.com/coral-xyz/anchor --tag v0.30.1 anchor-cli --locked

# Verify installation
anchor --version
```

### 3. Create/Configure Wallet

```bash
# Create new wallet (if you don't have one)
solana-keygen new --outfile ~/.config/solana/id.json

# Or use existing wallet
solana config set --keypair /path/to/your/keypair.json

# View your public key
solana-keygen pubkey ~/.config/solana/id.json
```

## Deployment to Devnet

### Step 1: Configure Solana for Devnet

```bash
# Set cluster to devnet
solana config set --url https://api.devnet.solana.com

# Verify configuration
solana config get
```

### Step 2: Get Devnet SOL

```bash
# Request airdrop (2 SOL)
solana airdrop 2

# Check balance
solana balance
```

You'll need approximately **2 SOL** for deployment:
- Program deployment: ~1.5 SOL (rent + deployment fee)
- Transaction fees: ~0.1 SOL
- Buffer: 0.4 SOL

### Step 3: Build the Program

```bash
cd solana-program/fundraisely
anchor build
```

This will:
- Compile the Rust program to BPF
- Generate the program binary at `target/deploy/fundraisely.so`
- Generate the IDL at `target/idl/fundraisely.json`
- Create program keypair at `target/deploy/fundraisely-keypair.json`

### Step 4: Deploy

```bash
anchor deploy --provider.cluster devnet
```

You'll see output like:
```
Deploying cluster: https://api.devnet.solana.com
Upgrade authority: ~/.config/solana/id.json
Deploying program "fundraisely"...
Program Id: FunD8rP3kN2vX...xyz123
```

**Save this Program ID!** You'll need it in the next steps.

### Step 5: Update Program ID

#### In `programs/fundraisely/src/lib.rs` (line 7):

```rust
declare_id!("FunD8rP3kN2vX...xyz123");  // Your actual program ID
```

#### In `Anchor.toml` (line 9):

```toml
[programs.devnet]
fundraisely = "FunD8rP3kN2vX...xyz123"  # Your actual program ID
```

#### In frontend `.env`:

```bash
VITE_PROGRAM_ID=FunD8rP3kN2vX...xyz123
```

### Step 6: Rebuild with Updated Program ID

```bash
anchor build
```

This regenerates the IDL with the correct program ID.

### Step 7: Copy IDL to Frontend

```bash
# From solana-program/fundraisely directory
cp target/idl/fundraisely.json ../../src/idl/
```

### Step 8: Run Tests

```bash
# Install dependencies first
npm install

# Run tests
anchor test
```

## Automated Deployment

We've provided a deployment script that handles steps 3-7 automatically:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh devnet
```

The script will:
- ✅ Verify tools are installed
- ✅ Check wallet balance
- ✅ Build the program
- ✅ Deploy to cluster
- ✅ Update program ID in all files
- ✅ Rebuild with updated ID
- ✅ Copy IDL to frontend
- ✅ Update frontend .env

## Initializing Global Config

After deployment, you need to initialize the global configuration:

### Using Anchor TypeScript Client

Create a script at `scripts/initialize.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Fundraisely } from "../target/types/fundraisely";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

async function initialize() {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Fundraisely as Program<Fundraisely>;

  // Set wallets (REPLACE WITH YOUR ACTUAL ADDRESSES)
  const platformWallet = new PublicKey("YOUR_PLATFORM_WALLET_ADDRESS");
  const charityWallet = new PublicKey("YOUR_CHARITY_WALLET_ADDRESS");

  // Derive global config PDA
  const [globalConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    program.programId
  );

  console.log("Initializing global config...");
  console.log("Platform wallet:", platformWallet.toString());
  console.log("Charity wallet:", charityWallet.toString());

  const tx = await program.methods
    .initialize(platformWallet, charityWallet)
    .accounts({
      globalConfig: globalConfigPda,
      admin: provider.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("✓ Initialization complete!");
  console.log("Transaction:", tx);
  console.log("Global Config PDA:", globalConfigPda.toString());
}

initialize().catch(console.error);
```

Run it:

```bash
npx ts-node scripts/initialize.ts
```

### Using Solana CLI (Advanced)

You can also use the Solana CLI with a prepared transaction, but the TypeScript approach is recommended.

## Deployment to Mainnet

**⚠️ WARNING: Mainnet deployment costs real SOL and should only be done after thorough testing on devnet.**

### Prerequisites

1. **Thoroughly test on devnet** - Run all tests, create rooms, join, end games
2. **Audit the code** - Have security experts review the smart contract
3. **Fund your wallet** - You'll need ~2 SOL for deployment

### Steps

```bash
# 1. Configure for mainnet
solana config set --url https://api.mainnet-beta.solana.com

# 2. Verify balance (you need ~2 SOL)
solana balance

# 3. Deploy using script
./scripts/deploy.sh mainnet-beta

# 4. Verify on explorer
# Visit: https://explorer.solana.com/address/YOUR_PROGRAM_ID
```

### Post-Deployment Security

After mainnet deployment:

1. **Transfer upgrade authority** to a multisig or governance program
2. **Monitor transactions** for unusual activity
3. **Set up alerts** for large withdrawals
4. **Keep emergency pause** functionality ready

```bash
# Transfer upgrade authority (example)
solana program set-upgrade-authority \
  PROGRAM_ID \
  --new-upgrade-authority MULTISIG_ADDRESS
```

## Troubleshooting

### Build Errors

**Error**: `anchor: command not found`
```bash
# Make sure Anchor is in PATH
export PATH="$HOME/.cargo/bin:$PATH"
```

**Error**: `rustc version mismatch`
```bash
# Update Rust
rustup update
```

### Deployment Errors

**Error**: `Insufficient funds`
```bash
# Check balance
solana balance

# For devnet, airdrop more
solana airdrop 2
```

**Error**: `Program deployment failed`
```bash
# Check if program already exists
solana program show PROGRAM_ID

# To upgrade existing program (if you're the authority)
anchor upgrade target/deploy/fundraisely.so --program-id PROGRAM_ID
```

**Error**: `Transaction simulation failed`
```bash
# Increase compute units or try again
# Network might be congested
```

### Test Errors

**Error**: `AccountNotFound` during tests
```bash
# Make sure you're on localnet for tests
anchor test

# Tests automatically start a local validator
```

**Error**: `Tests timeout`
```bash
# Increase timeout in .mocharc.json
# Default is 600000ms (10 minutes)
```

## Verification

After deployment, verify on Solana Explorer:

**Devnet**: https://explorer.solana.com/address/YOUR_PROGRAM_ID?cluster=devnet

**Mainnet**: https://explorer.solana.com/address/YOUR_PROGRAM_ID

You should see:
- ✅ Program account with data
- ✅ Executable: Yes
- ✅ Upgradeable: Yes
- ✅ Upgrade Authority: Your wallet address

## Cost Summary

### Devnet (Free SOL)
- Program deployment: ~1.5 SOL (refundable rent)
- Transaction fees: ~0.001 SOL per transaction
- **Total**: ~1.5 SOL (can get free from faucet)

### Mainnet (Real SOL)
- Program deployment: ~1.5 SOL (rent: ~1.4 SOL + fee: ~0.1 SOL)
- Transaction fees: ~0.000005 SOL per transaction
- **Total**: ~1.5 SOL + transaction fees

**Note**: Rent is stored in the program account and can be recovered if you close the program.

## Next Steps

After successful deployment:

1. ✅ Initialize global config
2. ✅ Test creating a room from frontend
3. ✅ Test joining a room
4. ✅ Test ending a game and prize distribution
5. ✅ Monitor transactions on Explorer
6. ✅ Set up backend servers (Socket.io + Axum)

## Support

If you encounter issues:

1. Check [Anchor Documentation](https://www.anchor-lang.com/)
2. Check [Solana Documentation](https://docs.solana.com/)
3. Review [CURRENT_STATUS.md](../../CURRENT_STATUS.md)
4. Check program logs: `solana logs PROGRAM_ID`

---

**Last Updated**: October 13, 2025
