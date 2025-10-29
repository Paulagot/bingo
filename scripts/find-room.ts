import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const idlPath = join(__dirname, '../src/idl/solana_bingo.json');
const idl = JSON.parse(readFileSync(idlPath, 'utf-8'));

async function findRoom() {
  const roomId = process.argv[2] || '7NIprAwepe';

  console.log('🔍 Searching for room:', roomId);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program(idl as any, provider);

  try {
    // Fetch all rooms
    console.log('📡 Fetching all rooms from devnet...');
    const rooms = await program.account.room.all();
    console.log(`\n✅ Found ${rooms.length} total rooms\n`);

    // Find matching room
    const matchingRoom = rooms.find((r: any) => r.account.roomId === roomId);

    if (!matchingRoom) {
      console.log(`❌ Room "${roomId}" not found!`);
      console.log('\n📋 Available rooms:');
      rooms.forEach((r: any, i: number) => {
        console.log(`\n${i + 1}. Room ID: "${r.account.roomId}"`);
        console.log(`   PDA: ${r.publicKey.toBase58()}`);
        console.log(`   Host: ${r.account.host.toBase58()}`);
        console.log(`   Status: ${Object.keys(r.account.status)[0]}`);
        console.log(`   Players: ${r.account.playerCount}/${r.account.maxPlayers}`);
      });
      return;
    }

    // Found the room!
    console.log(`✅ Found room "${roomId}"!\n`);
    console.log('📍 Room Details:');
    console.log('  PDA:', matchingRoom.publicKey.toBase58());
    console.log('  Host:', matchingRoom.account.host.toBase58());
    console.log('  Status:', Object.keys(matchingRoom.account.status)[0]);
    console.log('  Players:', matchingRoom.account.playerCount, '/', matchingRoom.account.maxPlayers);
    console.log('  Entry Fee:', matchingRoom.account.entryFee.toString());
    console.log('  Fee Token:', matchingRoom.account.feeTokenMint.toBase58());
    console.log('  Ended:', matchingRoom.account.ended);
    console.log('  Prize Mode:', Object.keys(matchingRoom.account.prizeMode)[0]);

    // Check vault
    const [vaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('room-vault'), matchingRoom.publicKey.toBuffer()],
      program.programId
    );

    console.log('\n💰 Room Vault:');
    console.log('  Vault PDA:', vaultPDA.toBase58());

    const vaultInfo = await connection.getAccountInfo(vaultPDA);
    if (vaultInfo) {
      console.log('  ✅ Vault exists');
      console.log('  Owner:', vaultInfo.owner.toBase58());
      console.log('  Lamports:', vaultInfo.lamports);
    } else {
      console.log('  ❌ VAULT DOES NOT EXIST!');
      console.log('  This will cause error 3012 when joining!');
    }

    // Check global config
    const [globalConfigPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('global-config')],
      program.programId
    );

    console.log('\n🌐 Global Config:');
    console.log('  Config PDA:', globalConfigPDA.toBase58());

    try {
      const config = await program.account.globalConfig.fetch(globalConfigPDA);
      console.log('  ✅ Config exists');
      console.log('  Emergency Pause:', config.emergencyPause);
    } catch {
      console.log('  ❌ CONFIG DOES NOT EXIST!');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

findRoom().catch(console.error);
