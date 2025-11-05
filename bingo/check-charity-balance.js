const anchor = require("@coral-xyz/anchor");
const { PublicKey, Connection } = require("@solana/web3.js");
const { getAssociatedTokenAddress, getAccount } = require("@solana/spl-token");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const charityWallet = new PublicKey("Ma6H8rHHk3WPSEymdofzGKnB9j2LAzu1LkCPeJnz2NV");
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  console.log("Charity wallet:", charityWallet.toBase58());
  console.log("");

  try {
    // Derive the charity token account
    const charityTokenAccount = await getAssociatedTokenAddress(usdcMint, charityWallet);
    console.log("Charity token account:", charityTokenAccount.toBase58());

    const tokenAccountInfo = await getAccount(connection, charityTokenAccount);

    console.log("Token account owner:", tokenAccountInfo.owner.toBase58());
    console.log("Token mint:", tokenAccountInfo.mint.toBase58());
    console.log("Token balance:", tokenAccountInfo.amount.toString(), "raw units");
    console.log("Token balance:", (Number(tokenAccountInfo.amount) / 1e6).toFixed(6), "USDC");
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
