/**
 * Create a test SPL token on Solana devnet
 * Usage: node scripts/createTestToken.js
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🎨 Creating Test SPL Token for Asset Room...\n');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load wallet from Solana CLI config
  const keypairPath = path.join(
    process.env.USERPROFILE || process.env.HOME,
    '.config',
    'solana',
    'id.json'
  );

  console.log('📁 Loading keypair from:', keypairPath);

  if (!fs.existsSync(keypairPath)) {
    console.error('❌ Keypair file not found. Run: solana-keygen new');
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));

  console.log('👛 Wallet address:', payer.publicKey.toBase58());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log('💰 Balance:', balance / 1e9, 'SOL');

  if (balance < 0.01 * 1e9) {
    console.error('❌ Insufficient balance. Need at least 0.01 SOL');
    console.log('Get devnet SOL: solana airdrop 1');
    process.exit(1);
  }

  console.log('\n🔨 Creating token mint...');

  // Create the token mint
  const mint = await createMint(
    connection,
    payer,
    payer.publicKey, // mint authority
    payer.publicKey, // freeze authority
    9 // decimals (standard for Solana tokens)
  );

  console.log('✅ Token Mint Created:', mint.toBase58());
  console.log('🔗 View on Explorer:', `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);

  console.log('\n🏦 Creating token account for your wallet...');

  // Create associated token account for the payer
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    payer.publicKey
  );

  console.log('✅ Token Account Created:', tokenAccount.address.toBase58());

  console.log('\n🪙 Minting 1,000 tokens to your account...');

  // Mint 1000 tokens (1000 * 10^9 because 9 decimals)
  const mintAmount = 1000 * Math.pow(10, 9);
  await mintTo(
    connection,
    payer,
    mint,
    tokenAccount.address,
    payer.publicKey, // mint authority
    mintAmount
  );

  console.log('✅ Minted 1,000 tokens successfully!');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 TEST TOKEN CREATED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log('\n📋 SAVE THESE DETAILS:\n');
  console.log('Token Mint Address:', mint.toBase58());
  console.log('Token Account:', tokenAccount.address.toBase58());
  console.log('Your Wallet:', payer.publicKey.toBase58());
  console.log('Balance: 1,000 tokens');
  console.log('Decimals: 9');
  console.log('\n🔗 Explorer:', `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`);
  console.log('\n💡 USE THIS TOKEN IN ASSET ROOM:');
  console.log('   - Prize Token Mint:', mint.toBase58());
  console.log('   - Example Prize Amount: 100 tokens = 100000000000 (100 * 10^9)');
  console.log('\n');

  // Save to file for easy reference
  const configPath = path.join(__dirname, '..', 'test-token-config.json');
  fs.writeFileSync(configPath, JSON.stringify({
    tokenMint: mint.toBase58(),
    tokenAccount: tokenAccount.address.toBase58(),
    owner: payer.publicKey.toBase58(),
    decimals: 9,
    initialSupply: 1000,
    cluster: 'devnet',
    explorerUrl: `https://explorer.solana.com/address/${mint.toBase58()}?cluster=devnet`,
    createdAt: new Date().toISOString()
  }, null, 2));

  console.log('💾 Token config saved to:', configPath);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
