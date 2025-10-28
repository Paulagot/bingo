import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

async function checkBalance() {
  const walletAddress = process.argv[2];

  if (!walletAddress) {
    console.log('Usage: ts-node scripts/check-wallet-balance.ts <wallet-address>');
    process.exit(1);
  }

  console.log('🔍 Checking wallet balance...');
  console.log('Wallet:', walletAddress);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    const pubkey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(pubkey);

    console.log('\n💰 Balance:', balance, 'lamports');
    console.log('   ', (balance / LAMPORTS_PER_SOL).toFixed(4), 'SOL');

    if (balance === 0) {
      console.log('\n❌ Wallet has no SOL!');
      console.log('Get devnet SOL from: https://faucet.solana.com/');
    } else if (balance < 100000000) { // 0.1 SOL
      console.log('\n⚠️  Balance is low (less than 0.1 SOL)');
      console.log('Consider getting more from: https://faucet.solana.com/');
    } else {
      console.log('\n✅ Wallet has sufficient balance');
    }

    // Check if wallet has enough for room entry (0.01 SOL) + fees
    const entryFee = 10000000; // 0.01 SOL
    const estimatedFees = 10000; // ~0.00001 SOL for transaction fees
    const totalNeeded = entryFee + estimatedFees;

    console.log('\n💵 Room entry fee: 0.01 SOL');
    console.log('   Estimated fees: ~0.00001 SOL');
    console.log('   Total needed: ~', (totalNeeded / LAMPORTS_PER_SOL).toFixed(5), 'SOL');

    if (balance >= totalNeeded) {
      console.log('   ✅ Wallet can join the room!');
    } else {
      console.log('   ❌ Insufficient balance to join');
      console.log('   Need', ((totalNeeded - balance) / LAMPORTS_PER_SOL).toFixed(4), 'more SOL');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

checkBalance().catch(console.error);
