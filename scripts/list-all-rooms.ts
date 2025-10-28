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

async function listAllRooms() {
  console.log('📡 Fetching all rooms from devnet...');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program(idl as any, provider);

  try {
    const rooms = await program.account.room.all();
    console.log(`\n✅ Found ${rooms.length} total rooms\n`);

    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      console.log(`${i + 1}. Room ID: "${r.account.roomId}"`);
      console.log(`   PDA: ${r.publicKey.toBase58()}`);
      console.log(`   Status: ${Object.keys(r.account.status)[0]}`);
      console.log(`   Players: ${r.account.playerCount}/${r.account.maxPlayers}`);

      // Check if vault exists
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('room-vault'), r.publicKey.toBuffer()],
        program.programId
      );

      const vaultInfo = await connection.getAccountInfo(vaultPDA);
      const vaultStatus = vaultInfo ? '✅ Has Vault' : '❌ NO VAULT';
      console.log(`   ${vaultStatus}`);
      console.log('');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

listAllRooms().catch(console.error);
