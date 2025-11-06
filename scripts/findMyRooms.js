/**
 * Find all quiz rooms deployed by the connected wallet on Solana devnet
 */

import { Connection, PublicKey } from '@solana/web3.js';

// Program ID from your config
const PROGRAM_ID = new PublicKey('8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i');

// Your wallet public key (from the console logs)
const YOUR_WALLET = 'C48gmshkEL8UdCe8GcpZKGwrEfCLbWWq4zk23tHmNDcE';

async function findMyRooms() {
  console.log('🔍 Searching for quiz rooms on Solana devnet...');
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('Your Wallet:', YOUR_WALLET);
  console.log('');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    // Get all accounts owned by the program
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 1000, // Approximate size, adjust if needed
        }
      ]
    });

    console.log(`Found ${accounts.length} total program accounts`);
    console.log('');

    if (accounts.length === 0) {
      console.log('No rooms found. The program may not have any deployed rooms yet.');
      return;
    }

    // List all accounts
    accounts.forEach((account, index) => {
      console.log(`Account ${index + 1}:`);
      console.log('  Address:', account.pubkey.toBase58());
      console.log('  Owner:', account.account.owner.toBase58());
      console.log('  Lamports:', account.account.lamports);
      console.log('  Data length:', account.account.data.length);
      console.log('');
    });

    // Try to find rooms by deriving PDAs for common room IDs
    console.log('🔍 Checking for recently created rooms...');
    const recentRoomIds = [
      'fi592w5Yrc', // Current stuck room
      'pxJ1CMfoNR', // From your console logs
      'd_5q5tAbxI', // From previous session
    ];

    const hostPubkey = new PublicKey(YOUR_WALLET);

    for (const roomId of recentRoomIds) {
      try {
        const [roomPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('room'),
            hostPubkey.toBuffer(),
            Buffer.from(roomId)
          ],
          PROGRAM_ID
        );

        console.log(`\nRoom ID: ${roomId}`);
        console.log('  Expected PDA:', roomPDA.toBase58());

        const accountInfo = await connection.getAccountInfo(roomPDA);
        if (accountInfo) {
          console.log('  ✅ Room exists on-chain!');
          console.log('  Lamports:', accountInfo.lamports);
          console.log('  Owner:', accountInfo.owner.toBase58());
          console.log('  Data length:', accountInfo.data.length);
          console.log('  Explorer:', `https://explorer.solana.com/address/${roomPDA.toBase58()}?cluster=devnet`);
        } else {
          console.log('  ❌ Room not found');
        }
      } catch (err) {
        console.log(`  Error checking room ${roomId}:`, err.message);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

findMyRooms().then(() => {
  console.log('\n✅ Search complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
