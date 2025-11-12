// server/tgb/persistence.js
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'tgb_deposit_intents.json');

// ensure folder exists
function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]), 'utf8');
}

export function loadAllIntents() {
  ensure();
  try {
    const raw = fs.readFileSync(FILE, 'utf8');
    return JSON.parse(raw) || [];
  } catch (e) {
    console.error('Failed to load TGB intents file', e);
    return [];
  }
}

export function saveIntent(intent) {
  ensure();
  const all = loadAllIntents();
  const existsIdx = all.findIndex(i => i.offchainIntentId === intent.offchainIntentId || i.tgbRequestId === intent.tgbRequestId);
  if (existsIdx >= 0) {
    all[existsIdx] = { ...all[existsIdx], ...intent, updatedAt: new Date().toISOString() };
  } else {
    all.push({ ...intent, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }
  fs.writeFileSync(FILE, JSON.stringify(all, null, 2), 'utf8');
  return intent;
}

export function findIntentByAddress(addr) {
  const all = loadAllIntents();
  return all.find(i => i.depositAddress === addr || i.depositTag === addr || i.id === addr || i.tgbRequestId === addr);
}

export function findIntentById(id) {
  const all = loadAllIntents();
  return all.find(i =>
    i.offchainIntentId === id ||
    i.id === id ||
    i.tgbRequestId === id ||
    i.tgbDepositId === id
  );
}
