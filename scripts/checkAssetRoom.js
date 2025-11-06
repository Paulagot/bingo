/**
 * Check Asset Room Status on Solana
 * Usage: node scripts/checkAssetRoom.js <ROOM_PDA>
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount } from '@solana/spl-token';

const PROGRAM_ID = new PublicKey('8W83G9mSeoQ6Ljcz5QJHYPjH2vQgw94YeVCnpY6KFt7i');

// PDA derivation (same as in solana-asset-room.ts)
function deriveRoomPDA(host, roomId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('room'), host.toBuffer(), Buffer.from(roomId)],
    PROGRAM_ID
  );
}

function deriveRoomVaultPDA(room) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('room-vault'), room.toBuffer()],
    PROGRAM_ID
  );
}

async function main() {
  // Room PDA from error logs
  const roomPDAStr = process.argv[2] || '6LfedQ6Fakmy8tZP3feX5K2Jgn3ge6bSFwyigifWPBjD';

  console.log('🔍 Checking Asset Room Status...\n');
  console.log('Room PDA:', roomPDAStr);
  console.log('Program ID:', PROGRAM_ID.toBase58());
  console.log('');

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  try {
    const roomPDA = new PublicKey(roomPDAStr);

    // 1. Check if room exists
    console.log('📦 1. Checking Room Account...');
    const roomInfo = await connection.getAccountInfo(roomPDA);

    if (!roomInfo) {
      console.log('❌ Room does not exist on-chain!');
      console.log('');
      console.log('💡 SOLUTION: Create a new room');
      process.exit(1);
    }

    console.log('✅ Room exists');
    console.log('  Owner:', roomInfo.owner.toBase58());
    console.log('  Lamports:', roomInfo.lamports / 1e9, 'SOL');
    console.log('  Data length:', roomInfo.data.length, 'bytes');
    console.log('  Explorer:', `https://explorer.solana.com/address/${roomPDA.toBase58()}?cluster=devnet`);
    console.log('');

    // 2. Check room vault
    console.log('💰 2. Checking Room Vault (for entry fees)...');
    const [roomVaultPDA] = deriveRoomVaultPDA(roomPDA);
    console.log('  Expected Vault PDA:', roomVaultPDA.toBase58());

    const vaultInfo = await connection.getAccountInfo(roomVaultPDA);

    if (!vaultInfo) {
      console.log('❌ Room vault does NOT exist!');
      console.log('');
      console.log('🔧 DIAGNOSIS:');
      console.log('  The room was created but the vault was not initialized.');
      console.log('  This means the init_asset_room instruction did not complete successfully.');
      console.log('');
      console.log('💡 SOLUTION:');
      console.log('  1. Create a NEW room (this one cannot be fixed)');
      console.log('  2. Make sure you have enough SOL for rent (~0.01 SOL)');
      console.log('  3. Check that the program is deployed correctly');
      console.log('');
      process.exit(1);
    }

    console.log('✅ Room vault exists');
    console.log('  Owner:', vaultInfo.owner.toBase58());
    console.log('  Lamports:', vaultInfo.lamports / 1e9, 'SOL');
    console.log('  Data length:', vaultInfo.data.length, 'bytes');

    // Try to parse as token account
    try {
      const vaultTokenAccount = await getAccount(connection, roomVaultPDA, 'confirmed');
      console.log('  ✅ Valid Token Account:');
      console.log('    Mint:', vaultTokenAccount.mint.toBase58());
      console.log('    Owner:', vaultTokenAccount.owner.toBase58());
      console.log('    Balance:', vaultTokenAccount.amount.toString());
    } catch (tokenErr) {
      console.log('  ⚠️  Not a valid token account:', tokenErr.message);
    }
    console.log('');

    // 3. Parse room status
    console.log('📊 3. Room Status:');
    const data = roomInfo.data;
    const discriminator = data.slice(0, 8);
    console.log('  Discriminator:', discriminator.toString('hex'));

    const statusByte = data[8];
    const statuses = ['AwaitingFunding', 'Ready', 'Active', 'Completed', 'Cancelled'];
    console.log('  Status:', statuses[statusByte] || `Unknown (${statusByte})`);
    console.log('');

    if (statusByte === 0) {
      console.log('💡 Room is AwaitingFunding - deposit prizes to make it Ready');
    } else if (statusByte === 1) {
      console.log('✅ Room is Ready - players can join!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
