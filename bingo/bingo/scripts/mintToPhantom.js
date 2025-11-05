/**
 * Mint SPL tokens to your Phantom wallet
 *
 * This script mints 1000 tokens from your test token mint to your Phantom wallet.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Configuration
const TOKEN_MINT = 'D55UpMC1mcBAi96PNuz4tdynYHEgubn5cCzXm3wwExGo';
const PHANTOM_WALLET = 'C48gmshkEL8UdCe8GcpZKGwrEfCLbWWq4zk23tHmNDcE';
const AMOUNT = 1000; // 1000 tokens (will be multiplied by decimals)

async function mintTokens() {
  console.log('🪙 Minting SPL tokens to your Phantom wallet...');
  console.log('Token Mint:', TOKEN_MINT);
  console.log('Destination:', PHANTOM_WALLET);
  console.log('Amount:', AMOUNT);
  console.log('');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load keypair from Solana CLI default location
  const keypairPath = path.join(os.homedir(), '.config', 'solana', 'id.json');

  if (!fs.existsSync(keypairPath)) {
    console.error('❌ Keypair not found at:', keypairPath);
    console.error('Please ensure your Solana CLI wallet is configured.');
    process.exit(1);
  }

  console.log('📂 Loading keypair from:', keypairPath);
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const mintAuthority = Keypair.fromSecretKey(new Uint8Array(keypairData));
  console.log('✅ Mint authority:', mintAuthority.publicKey.toBase58());
  console.log('');

  try {
    // Get or create associated token account for destination
    console.log('📦 Getting/creating token account for Phantom wallet...');
    const destinationPubkey = new PublicKey(PHANTOM_WALLET);
    const mintPubkey = new PublicKey(TOKEN_MINT);

    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority, // payer
      mintPubkey,    // mint
      destinationPubkey // owner
    );

    console.log('✅ Token account:', destinationTokenAccount.address.toBase58());
    console.log('');

    // Mint tokens (amount * 10^decimals)
    // Assuming 9 decimals (standard for Solana tokens)
    const decimals = 9;
    const amountWithDecimals = AMOUNT * Math.pow(10, decimals);

    console.log('💰 Minting tokens...');
    const signature = await mintTo(
      connection,
      mintAuthority,                    // payer
      mintPubkey,                       // mint
      destinationTokenAccount.address,  // destination
      mintAuthority,                    // mint authority
      amountWithDecimals                // amount
    );

    console.log('✅ Minting successful!');
    console.log('Transaction:', signature);
    console.log('Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    console.log('');

    // Check balance
    const accountInfo = await connection.getTokenAccountBalance(destinationTokenAccount.address);
    console.log('📊 New balance:', accountInfo.value.uiAmount, 'tokens');
    console.log('');
    console.log('🎉 Done! Your Phantom wallet now has', AMOUNT, 'tokens.');
    console.log('You can now deposit prizes in your asset room!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

mintTokens().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
