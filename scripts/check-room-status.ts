import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const idlPath = path.join(__dirname, '../src/idl/solana_bingo.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

async function checkRoomStatus() {
  // Get room ID from command line
  const roomId = process.argv[2];
  const hostPubkey = process.argv[3];

  if (!roomId || !hostPubkey) {
    console.log('Usage: ts-node scripts/check-room-status.ts <roomId> <hostPubkey>');
    process.exit(1);
  }

  console.log('🔍 Checking room status...');
  console.log('Room ID:', roomId);
  console.log('Host:', hostPubkey);

  // Connect to devnet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = new Wallet(Keypair.generate()); // Dummy wallet for reading
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program(idl as any, provider);

  try {
    // Derive room PDA
    const host = new PublicKey(hostPubkey);
    const [roomPDA, roomBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('room'), host.toBuffer(), Buffer.from(roomId)],
      program.programId
    );

    console.log('\n📍 Derived PDAs:');
    console.log('  Room PDA:', roomPDA.toBase58());
    console.log('  Room Bump:', roomBump);

    // Fetch room account
    const room = await program.account.room.fetch(roomPDA);
    console.log('\n✅ Room account found!');
    console.log('  Status:', Object.keys(room.status)[0]);
    console.log('  Player Count:', room.playerCount);
    console.log('  Max Players:', room.maxPlayers);
    console.log('  Entry Fee:', room.entryFee.toString());
    console.log('  Host:', room.host.toBase58());
    console.log('  Stored Room ID:', room.roomId);
    console.log('  Room ID Match:', room.roomId === roomId);
    console.log('  Ended:', room.ended);

    // Check room vault
    const [vaultPDA, vaultBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('room-vault'), roomPDA.toBuffer()],
      program.programId
    );
    console.log('\n💰 Room Vault PDA:', vaultPDA.toBase58());
    console.log('  Vault Bump:', vaultBump);

    const vaultInfo = await connection.getAccountInfo(vaultPDA);
    if (vaultInfo) {
      console.log('  ✅ Vault exists');
      console.log('  Owner:', vaultInfo.owner.toBase58());
    } else {
      console.log('  ❌ Vault NOT FOUND - This will cause error!');
    }

    // Check global config
    const [globalConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global-config')],
      program.programId
    );
    console.log('\n🌐 Global Config PDA:', globalConfigPDA.toBase58());
    const config = await program.account.globalConfig.fetch(globalConfigPDA);
    console.log('  Emergency Pause:', config.emergencyPause);
    console.log('  Platform Fee BPS:', config.platformFeeBps);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.logs) {
      console.log('\n📋 Program Logs:');
      error.logs.forEach((log: string) => console.log('  ', log));
    }
  }
}

checkRoomStatus().catch(console.error);
