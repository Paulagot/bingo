#!/usr/bin/env node
// split_peer_core.mjs
//
// Splits peerCoreService.js into cohesive sibling modules WITHOUT changing
// behaviour. Every function body is moved byte-for-byte; peerCoreService.js
// becomes a barrel that re-exports the identical set of names, so any file
// importing from it keeps working untouched.
//
// Run from the folder containing peerCoreService.js:
//   node split_peer_core.mjs
//
// It backs up to peerCoreService.js.bak first, and if any verification step
// fails it restores the backup and exits non-zero, leaving you as you were.

import { readFileSync, writeFileSync, copyFileSync, existsSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const DIR = dirname(fileURLToPath(import.meta.url));
const SRC = join(DIR, 'peerCoreService.js');
const BAK = join(DIR, 'peerCoreService.js.bak');

// ── name -> module. Every top-level declaration must appear here or we abort. ──
const MODULE_OF = {
  // shared primitives (get an `export` prefix added; NOT re-exported by barrel)
  F: 'shared', P: 'shared', PK: 'shared', PI: 'shared', O: 'shared', OI: 'shared',
  R: 'shared', C: 'shared', DROP_TIERS: 'shared', DROP_ITEMS: 'shared',
  id: 'shared', parseJson: 'shared', slugify: 'shared', fail: 'shared',
  assertFundraiser: 'shared', uniqueSlug: 'shared',

  // fundraiser CRUD + management order list
  listFundraisers: 'fundraiser', createFundraiser: 'fundraiser',
  getFundraiser: 'fundraiser', updateFundraiser: 'fundraiser', listOrders: 'fundraiser',

  // available rooms / activities
  availableRooms: 'rooms', availableSponsoredRooms: 'rooms',

  // sponsorship
  getPeerSponsorshipSummary: 'sponsorship', listPeerSponsorships: 'sponsorship',
  peerSponsoredContext: 'sponsorship', confirmPeerSponsorship: 'sponsorship',
  disputePeerSponsorship: 'sponsorship',

  // reporting
  getPeerPaymentReport: 'report',

  // participants
  listParticipants: 'participant', createParticipant: 'participant',
  updateParticipant: 'participant', deleteParticipant: 'participant',

  // packs
  assertRoom: 'pack', VALID_PACK_TYPES: 'pack', VALID_ITEM_TYPES: 'pack',
  validItemTypesForRoomGameType: 'pack', validatePackPayload: 'pack',
  listPacks: 'pack', savePack: 'pack', hidePack: 'pack', duplicatePack: 'pack',

  // public supporter-facing
  normalisePaymentCategory: 'public', publicFundraiserLifecycle: 'public',
  publicAvailabilityMessage: 'public', publicPackAvailability: 'public',
  publicPayload: 'public', createOrder: 'public', claimOrder: 'public',
  getPublicOrderSummary: 'public',

  // dead, unexported, uncalled - dropped
  findRoomByGameType: 'DROP', findPuzzleRoom: 'DROP',
};

const FILES = {
  shared: 'peerCoreShared.js',
  fundraiser: 'peerFundraiserService.js',
  rooms: 'peerRoomsService.js',
  sponsorship: 'peerSponsorshipService.js',
  report: 'peerReportService.js',
  participant: 'peerParticipantService.js',
  pack: 'peerPackService.js',
  public: 'peerPublicService.js',
};

// Import headers per module. Every non-shared module imports the FULL shared
// surface (unused named imports are harmless) so no symbol can go missing.
const SHARED_IMPORT =
  "import {\n  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,\n  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,\n} from './peerCoreShared.js';\n";

const HEADERS = {
  shared:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    "import { nanoid } from 'nanoid';\n",
  fundraiser:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    "import { updateMethods as updatePeerPaymentMethods } from './peerPaymentMethodsService.js';\n" +
    SHARED_IMPORT,
  rooms:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    SHARED_IMPORT,
  sponsorship:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    "import {\n  listSponsoredContributions,\n  confirmSponsoredContribution,\n  disputeSponsoredContribution,\n} from '../../mgtsystem/services/sponsoredActivityContributionService.js';\n" +
    SHARED_IMPORT,
  report:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    SHARED_IMPORT,
  participant:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    SHARED_IMPORT,
  pack:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    SHARED_IMPORT,
  public:
    "import { connection, TABLE_PREFIX } from '../../config/database.js';\n" +
    "import { createPeerDonationForOrder } from './peerDonationService.js';\n" +
    "import { getRoomCapacityStatus } from '../../mgtsystem/services/quizCapacityService.js';\n" +
    SHARED_IMPORT,
};

const BARREL_ORDER = ['fundraiser', 'rooms', 'sponsorship', 'report', 'participant', 'pack', 'public'];

function die(msg) {
  console.error(`\n✗ ${msg}`);
  if (existsSync(BAK)) { copyFileSync(BAK, SRC); console.error('  Restored peerCoreService.js from backup. Nothing changed.'); }
  process.exit(1);
}

// ── 1. read + back up ──
if (!existsSync(SRC)) die(`peerCoreService.js not found in ${DIR}`);
const original = readFileSync(SRC, 'utf8');
copyFileSync(SRC, BAK);

// ── 2. find every top-level declaration start (column 0) ──
const DECL = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)|^(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=/gm;
const decls = [];
for (const m of original.matchAll(DECL)) {
  const name = m[1] || m[2];
  decls.push({ name, start: m.index });
}
if (!decls.length) die('No top-level declarations found - is this the right file?');

// span of each decl = from its start to the next decl start (last runs to EOF)
for (let i = 0; i < decls.length; i++) {
  decls[i].end = i + 1 < decls.length ? decls[i + 1].start : original.length;
  decls[i].text = original.slice(decls[i].start, decls[i].end);
}

// ── 3. every declaration must be mapped ──
const unknown = decls.filter(d => !(d.name in MODULE_OF)).map(d => d.name);
if (unknown.length) die(`Unmapped top-level declarations: ${[...new Set(unknown)].join(', ')}`);

// ── 4. assemble modules (original order preserved within each) ──
const buckets = Object.fromEntries(Object.keys(FILES).map(k => [k, []]));
for (const d of decls) {
  const mod = MODULE_OF[d.name];
  if (mod === 'DROP') continue;
  buckets[mod].push(d.text);
}

function build(mod) {
  let body = buckets[mod].join('');
  if (mod === 'shared') {
    // add `export` to the shared primitives so siblings can import them
    body = body.replace(/^const (F|P|PK|PI|O|OI|R|C|DROP_TIERS|DROP_ITEMS) =/gm, 'export const $1 =');
    body = body.replace(/^const (id|parseJson|slugify|fail) =/gm, 'export const $1 =');
    body = body.replace(/^async function (assertFundraiser|uniqueSlug)\b/gm, 'export async function $1');
  }
  const banner = `// ${FILES[mod]}\n// Extracted from peerCoreService.js by split_peer_core.mjs - behaviour unchanged.\n\n`;
  return banner + HEADERS[mod] + '\n' + body.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

const outputs = {};
for (const mod of Object.keys(FILES)) outputs[FILES[mod]] = build(mod);

// barrel
const barrel =
  "// peerCoreService.js\n" +
  "// Barrel: this module was split into focused siblings. The public export\n" +
  "// surface is identical, so existing imports keep working unchanged.\n\n" +
  BARREL_ORDER.map(m => `export * from './${FILES[m]}';`).join('\n') + '\n';

// ── 5. write everything ──
for (const [file, text] of Object.entries(outputs)) writeFileSync(join(DIR, file), text);
writeFileSync(SRC, barrel);

// ── 6. verify: syntax + export surface + shared-import resolution ──
const exportNames = txt => new Set(
  [...txt.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/gm)].map(m => m[1])
    .concat([...txt.matchAll(/^export\s+const\s+([A-Za-z0-9_]+)/gm)].map(m => m[1]))
);

const originalExports = exportNames(original);

// syntax check each generated file + barrel
for (const file of [...Object.keys(outputs), 'peerCoreService.js']) {
  try { execSync(`node --check ${JSON.stringify(join(DIR, file))}`, { stdio: 'pipe' }); }
  catch (e) { die(`Syntax error in ${file}:\n${e.stderr?.toString() || e.message}`); }
}

// union of exports across the sibling modules that the barrel re-exports
const barrelExports = new Set();
for (const m of BARREL_ORDER) for (const n of exportNames(outputs[FILES[m]])) barrelExports.add(n);

const missing = [...originalExports].filter(n => !barrelExports.has(n));
const extra = [...barrelExports].filter(n => !originalExports.has(n));
if (missing.length) die(`Export surface shrank - missing from barrel: ${missing.join(', ')}`);
if (extra.length) die(`Export surface grew - unexpected new exports: ${extra.join(', ')}`);

// every name imported from ./peerCoreShared.js must actually be exported there
const sharedExports = exportNames(outputs['peerCoreShared.js']);
const importedFromShared = new Set();
for (const [file, text] of Object.entries(outputs)) {
  if (file === 'peerCoreShared.js') continue;
  const m = text.match(/import\s*\{([^{}]*?)\}\s*from\s*'\.\/peerCoreShared\.js'/);
  if (!m) continue;
  for (const raw of m[1].split(',')) {
    const name = raw.trim();
    if (name) importedFromShared.add(name);
  }
}
const unresolved = [...importedFromShared].filter(n => !sharedExports.has(n));
if (unresolved.length) die(`These are imported from peerCoreShared.js but not exported there: ${unresolved.join(', ')}`);

// ── done ──
console.log('✓ split complete - all checks passed\n');
console.log(`  original exports : ${originalExports.size}`);
console.log(`  barrel  exports  : ${barrelExports.size} (identical set)`);
console.log(`  shared  exports  : ${sharedExports.size} (internal, not re-exported)\n`);
for (const m of Object.keys(FILES)) {
  const lines = outputs[FILES[m]].split('\n').length;
  console.log(`  ${FILES[m].padEnd(28)} ${String(lines).padStart(4)} lines`);
}
console.log(`  peerCoreService.js (barrel)   ${String(barrel.split('\n').length).padStart(4)} lines`);
console.log(`\n  backup: peerCoreService.js.bak (delete once you've confirmed the app runs)`);
