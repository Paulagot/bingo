const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("UPDATE CHARITY WALLET");
  console.log("═══════════════════════════════════════════════════════");

  // Set up provider
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet
  const walletPath = path.join(process.env.HOME || process.env.USERPROFILE, ".config", "solana", "id.json");
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  console.log("Wallet:", wallet.publicKey.toBase58());

  // Load program
  const programId = new PublicKey("8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i");
  const idlPath = path.join(__dirname, "solana_bingo.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  console.log("Program ID:", program.programId.toBase58());

  // Derive GlobalConfig PDA
  const [globalConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    program.programId
  );

  console.log("GlobalConfig PDA:", globalConfigPDA.toBase58());
  console.log("");

  try {
    // Fetch current config
    const config = await program.account.globalConfig.fetch(globalConfigPDA);
    console.log("Current Configuration:");
    console.log("  Admin:", config.admin.toBase58());
    console.log("  Platform Wallet:", config.platformWallet.toBase58());
    console.log("  Charity Wallet:", config.charityWallet.toBase58());
    console.log("  Platform Fee:", config.platformFeeBps, "bps");
    console.log("");

    // New charity wallet
    const newCharityWallet = new PublicKey("Ma6H8rHHk3WPSEymdofzGKnB9j2LAzu1LkCPeJnz2NV");

    console.log("───────────────────────────────────────────────────────");
    console.log("Updating charity wallet to:", newCharityWallet.toBase58());
    console.log("───────────────────────────────────────────────────────");
    console.log("");

    // Call update_global_config
    const tx = await program.methods
      .updateGlobalConfig(
        null,              // platform_wallet - no change
        newCharityWallet,  // charity_wallet - UPDATE THIS
        null,              // platform_fee_bps - no change
        null,              // max_host_fee_bps - no change
        null,              // max_prize_pool_bps - no change
        null               // min_charity_bps - no change
      )
      .accounts({
        globalConfig: globalConfigPDA,
        admin: wallet.publicKey,
      })
      .rpc();

    console.log("✅ Transaction successful!");
    console.log("Signature:", tx);
    console.log("");

    // Fetch updated config
    const updatedConfig = await program.account.globalConfig.fetch(globalConfigPDA);
    console.log("Updated Configuration:");
    console.log("  Charity Wallet:", updatedConfig.charityWallet.toBase58());
    console.log("");

    if (updatedConfig.charityWallet.toBase58() === newCharityWallet.toBase58()) {
      console.log("✅ Charity wallet successfully updated!");
    } else {
      console.log("❌ Charity wallet update verification failed");
    }

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }

  console.log("═══════════════════════════════════════════════════════");
}

main()
  .then(() => {
    console.log("✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
