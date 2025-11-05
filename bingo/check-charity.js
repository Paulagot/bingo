const anchor = require("@coral-xyz/anchor");
const { PublicKey, Keypair } = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

async function main() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(process.env.HOME || process.env.USERPROFILE, ".config", "solana", "id.json");
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const programId = new PublicKey("8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i");
  const idlPath = path.join(__dirname, "target/idl/bingo.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  const [globalConfigPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("global-config")],
    program.programId
  );

  const config = await program.account.globalConfig.fetch(globalConfigPDA);
  console.log("Charity wallet:", config.charityWallet.toBase58());
}

main();
