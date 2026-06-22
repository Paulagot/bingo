// Summer Quest — Standalone DB Setup Script
//
// Run this by hand to create the fundraisely_tt_* tables and seed data
// WITHOUT starting the full server. Useful for verifying the DB side
// works before wiring initSummerQuest() into server/index.js, or for
// re-running setup manually any time.
//
// Usage (from your server/ directory, wherever your main index.js lives):
//   node summerquest/server/scripts/setupDb.js
//
// Requires the same DB env vars your main app already uses
// (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT etc) — this script
// does NOT invent new connection logic, it reuses your existing
// database config so the connection details are guaranteed to match
// whatever your app actually connects to.
//
// IMPORTANT: the relative import path below assumes this file lives at
// server/summerquest/server/scripts/setupDb.js and your DB config
// lives at server/config/database.js (per your real server/index.js,
// which does `import { connection } from './config/database.js'`).
// If your DB config file lives somewhere else, adjust the import path.

import dotenv from 'dotenv';
dotenv.config();

import { connection } from '../../../config/database.js';
import { runSummerQuestSchema } from '../config/sqSchemaRunner.js';
import { runSummerQuestSeed } from '../config/sqSeedRunner.js';

async function main() {
  console.log('[summer-quest setup] Connecting using existing app DB config...');

  try {
    await runSummerQuestSchema(connection);
    await runSummerQuestSeed(connection);
    console.log('[summer-quest setup] ✅ Done. Tables created/verified, seed data inserted.');
    process.exit(0);
  } catch (err) {
    console.error('[summer-quest setup] ❌ Failed:', err);
    process.exit(1);
  }
}

main();
