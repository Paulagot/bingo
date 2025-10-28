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

async function checkPlayerEntry() {
  const roomId = process.argv[2] || 'RBNOb6l2SQ';
  const playerPubkey = process.argv[3];

  if (!playerPubkey) {
    console.log('Usage: ts-node scripts/check-player-entry.ts <roomId> <playerPubkey>');
    process.exit(1);
  }

  console.log('🔍 Checking player entry...');
  console.log('Room ID:', roomId);
  console.log('Player:', playerPubkey);

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const wallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(connection, wallet, {});
  const program = new Program(idl as any, provider);

  try {
    // Find the room
    const rooms = await program.account.room.all();
    const matchingRoom = rooms.find((r: any) => r.account.roomId === roomId);

    if (!matchingRoom) {
      console.log('❌ Room not found');
      return;
    }

    const roomPDA = matchingRoom.publicKey;
    console.log('Room PDA:', roomPDA.toBase58());

    // Derive player entry PDA
    const player = new PublicKey(playerPubkey);
    const [playerEntryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('player'), roomPDA.toBuffer(), player.toBuffer()],
      program.programId
    );

    console.log('Player Entry PDA:', playerEntryPDA.toBase58());

    // Try to fetch player entry
    try {
      const playerEntry = await program.account.playerEntry.fetch(playerEntryPDA);
      console.log('\n✅ Player has joined!');
      console.log('Entry Paid:', playerEntry.entryPaid.toString(), 'lamports');
      console.log('Extras Paid:', playerEntry.extrasPaid.toString(), 'lamports');
      console.log('Total Paid:', playerEntry.totalPaid.toString(), 'lamports');
      console.log('Join Slot:', playerEntry.joinSlot.toString());
    } catch (err) {
      console.log('\n❌ Player has NOT joined (PlayerEntry account does not exist)');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

checkPlayerEntry().catch(console.error);
