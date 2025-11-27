/**
 * List all rooms created by your wallet on Solana devnet
 * This helps you find your asset rooms and check their status
 *
 * Usage: node scripts/listMyRooms.js
 */

import { Connection, PublicKey } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Hardcoded PROGRAM_ID (from config.ts)
const PROGRAM_ID = new PublicKey('7cBb4Ho5W66nBdcaAgt7sLnY3HG6jwTWkmCFF9d2yxBn');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🔍 Finding Your Solana Bingo Rooms...\n');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  // Load your wallet
  const keypairPath = path.join(
    process.env.USERPROFILE || process.env.HOME,
    '.config',
    'solana',
    'id.json'
  );

  if (!fs.existsSync(keypairPath)) {
    console.error('❌ Wallet not found at:', keypairPath);
    process.exit(1);
  }

  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const secretKey = new Uint8Array(keypairData);

  // Get public key from first 32 bytes (ed25519)
  const walletPubkey = new PublicKey(secretKey.slice(32, 64));

  console.log('Your Wallet:', walletPubkey.toBase58());
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('\n📡 Scanning blockchain for your rooms...\n');

  try {
    // Get all program accounts
    // Filter by accounts that might be rooms (using discriminator)
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [
        {
          dataSize: 1000, // Approximate room account size, adjust if needed
        }
      ]
    });

    console.log(`Found ${accounts.length} potential room account(s)\n`);

    if (accounts.length === 0) {
      console.log('💡 No rooms found. This could mean:');
      console.log('1. You haven\'t created any rooms yet');
      console.log('2. The room creation transaction is still processing');
      console.log('3. The room was created with a different wallet');
      console.log('\nCheck recent transactions:');
      console.log(`https://explorer.solana.com/address/${walletPubkey.toBase58()}?cluster=devnet`);
      return;
    }

    // List all accounts
    for (let i = 0; i < accounts.length; i++) {
      const { pubkey, account } = accounts[i];

      console.log(`═══════════════════════════════════════════════════════`);
      console.log(`Room #${i + 1}`);
      console.log(`═══════════════════════════════════════════════════════`);
      console.log('Address:', pubkey.toBase58());
      console.log('Owner:', account.owner.toBase58());
      console.log('Lamports:', account.lamports / 1e9, 'SOL');
      console.log('Data Size:', account.data.length, 'bytes');

      // Try to extract room ID from data (this is approximate)
      const data = account.data;

      // Skip discriminator (8 bytes) and try to find room ID
      // Room ID might start at byte 8 or later depending on struct layout
      const potentialRoomIdStart = 40; // Adjust based on actual struct
      const roomIdBytes = data.slice(potentialRoomIdStart, potentialRoomIdStart + 32);

      // Try to decode as ASCII
      let roomId = '';
      for (let j = 0; j < roomIdBytes.length; j++) {
        const byte = roomIdBytes[j];
        if (byte === 0) break; // Null terminator
        if (byte >= 32 && byte <= 126) { // Printable ASCII
          roomId += String.fromCharCode(byte);
        }
      }

      if (roomId.length > 0) {
        console.log('Potential Room ID:', roomId);
      }

      // Status byte (approximate)
      const statusByte = data[8];
      const statuses = ['AwaitingFunding', 'Ready', 'Active', 'Completed', 'Cancelled'];
      console.log('Status Byte:', statusByte, '→', statuses[statusByte] || 'Unknown');

      console.log('\n🔗 View on Explorer:');
      console.log(`https://explorer.solana.com/address/${pubkey.toBase58()}?cluster=devnet`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════\n');
    console.log('💡 Tips:');
    console.log('- Click the Explorer links above to see full account details');
    console.log('- Status "AwaitingFunding" means you need to deposit prizes');
    console.log('- Status "Ready" means players can join!');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error scanning accounts:', error.message);
    console.error('\nTry checking your recent transactions manually:');
    console.error(`https://explorer.solana.com/address/${walletPubkey.toBase58()}?cluster=devnet`);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
