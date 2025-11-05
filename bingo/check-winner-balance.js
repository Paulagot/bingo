const anchor = require("@coral-xyz/anchor");
const { PublicKey, Connection } = require("@solana/web3.js");
const { getAccount } = require("@solana/spl-token");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const winnerWallet = new PublicKey("8r8VB4LhvPgQyA7SLNZjzimmAVuuWMmw8vcVTGSDfs71");
  const winnerTokenAccount = new PublicKey("5P83VwkKcgTyZobtkuuUwAuuS7TT7NBCsYBHEeyRRo3m");
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  console.log("Winner wallet:", winnerWallet.toBase58());
  console.log("Winner token account:", winnerTokenAccount.toBase58());
  console.log("");

  try {
    const tokenAccountInfo = await getAccount(connection, winnerTokenAccount);

    console.log("Token account owner:", tokenAccountInfo.owner.toBase58());
    console.log("Token mint:", tokenAccountInfo.mint.toBase58());
    console.log("Token balance:", tokenAccountInfo.amount.toString(), "raw units");
    console.log("Token balance:", (Number(tokenAccountInfo.amount) / 1e6).toFixed(6), "USDC");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
