const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair, Transaction, SystemProgram } = require("@solana/web3.js");
const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("CREATE CHARITY TOKEN ACCOUNT");
  console.log("═══════════════════════════════════════════════════════");

  // Set up connection
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet (payer)
  const walletPath = path.join(process.env.HOME || process.env.USERPROFILE, ".config", "solana", "id.json");
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("Payer wallet:", walletKeypair.publicKey.toBase58());
  console.log("");

  // Define addresses
  const charityWallet = new PublicKey("Ma6H8rHHk3WPSEymdofzGKnB9j2LAzu1LkCPeJnz2NV");
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  console.log("Charity wallet:", charityWallet.toBase58());
  console.log("USDC Mint:", usdcMint.toBase58());
  console.log("");

  // Derive the associated token account address
  const charityTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    charityWallet
  );

  console.log("Charity USDC token account:", charityTokenAccount.toBase58());
  console.log("");

  // Check if account already exists
  try {
    const accountInfo = await connection.getAccountInfo(charityTokenAccount);
    if (accountInfo) {
      console.log("✅ Token account already exists!");
      console.log("Balance:", accountInfo.lamports / 1e9, "SOL (account rent)");
      return;
    }
  } catch (error) {
    console.log("Token account does not exist yet, creating...");
  }

  // Create the associated token account
  console.log("Creating associated token account...");
  const instruction = createAssociatedTokenAccountInstruction(
    walletKeypair.publicKey,  // payer
    charityTokenAccount,       // associated token account
    charityWallet,             // owner
    usdcMint                   // mint
  );

  const tx = new Transaction().add(instruction);
  const signature = await anchor.web3.sendAndConfirmTransaction(
    connection,
    tx,
    [walletKeypair]
  );

  console.log("✅ Token account created!");
  console.log("Signature:", signature);
  console.log("");
  console.log("Token account address:", charityTokenAccount.toBase58());
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
