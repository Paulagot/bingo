// server/web3/services/web3PublicEventsService.js
//
// Database operations for fundraisely_web3_public_events.
//
// IMPORTANT — two permanent fixes in this file:
//   1. `import { connection as db }` — database.js exports `connection`, NOT `getConnection`
//   2. `Number(limit), Number(offset)` — mysql2 requires integers for LIMIT/OFFSET,
//      req.query values are strings and will throw ER_WRONG_ARGUMENTS without this cast

import { v4 as uuidv4 } from 'uuid';
import { connection as db } from '../../config/database.js';

// ─── Allowed fields for create / update ──────────────────────────────────────

const WRITABLE_FIELDS = [
  'host_name', 'title', 'event_type', 'description',
  'event_date', 'start_time', 'time_zone',
  'join_url', 'platform',
  'contact_handle', 'contact_type',
  'chain', 'entry_fee', 'fee_token',
  'charity_id', 'charity_name',
];

const VALID_EVENT_TYPES   = ['quiz', 'elimination'];
const VALID_CONTACT_TYPES = ['telegram', 'x', 'discord', 'whatsapp', 'email', 'other'];
const VALID_CHAINS        = ['solana', 'base'];

// ─── Platform auto-detection ──────────────────────────────────────────────────

function detectPlatform(url) {
  if (!url) return 'other';
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('discord'))                            return 'discord';
    if (host.includes('zoom'))                               return 'zoom';
    if (host.includes('twitter') || host.includes('x.com')) return 'x';
    if (host.includes('t.me') || host.includes('telegram')) return 'telegram';
    if (host.includes('whatsapp'))                           return 'whatsapp';
    if (host.includes('lu.ma'))                              return 'luma';
    if (host.includes('eventbrite'))                         return 'eventbrite';
    if (host.includes('meet.google'))                        return 'meet';
    return 'other';
  } catch {
    return 'other';
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEventFields(fields) {
  const required = [
    'host_name', 'title', 'event_type', 'description', 'event_date',
    'start_time', 'time_zone', 'join_url',
    'contact_handle', 'contact_type',
    'chain', 'entry_fee', 'fee_token',
    'charity_id', 'charity_name',
  ];

  for (const field of required) {
    if (fields[field] === undefined || fields[field] === null || fields[field] === '') {
      const err = new Error(`${field} is required`);
      err.statusCode = 400;
      throw err;
    }
  }

  if (!VALID_EVENT_TYPES.includes(fields.event_type)) {
    const err = new Error(`event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (!VALID_CONTACT_TYPES.includes(fields.contact_type)) {
    const err = new Error(`contact_type must be one of: ${VALID_CONTACT_TYPES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  if (!VALID_CHAINS.includes(fields.chain)) {
    const err = new Error(`chain must be one of: ${VALID_CHAINS.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const fee = parseFloat(fields.entry_fee);
  if (isNaN(fee) || fee <= 0 || !isFinite(fee)) {
    const err = new Error('entry_fee must be a positive number (e.g. 0.01)');
    err.statusCode = 400;
    throw err;
  }

  // join_url must be a real URL
  const urlVal = fields.join_url?.trim() ?? '';
  if (!urlVal.startsWith('http://') && !urlVal.startsWith('https://')) {
    const err = new Error('join_url must be a valid URL starting with https://');
    err.statusCode = 400;
    throw err;
  }

  // event_date must not be in the past
  const eventDate = new Date(fields.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (eventDate < today) {
    const err = new Error('event_date must be today or in the future');
    err.statusCode = 400;
    throw err;
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createEvent(fields) {
  validateEventFields(fields);

  const id       = uuidv4();
  const platform = detectPlatform(fields.join_url);

  await db.execute(
    `INSERT INTO fundraisely_web3_public_events
       (id, wallet_address, host_name, title, event_type, description,
        event_date, start_time, time_zone,
        join_url, platform,
        contact_handle, contact_type,
        chain, entry_fee, fee_token,
        charity_id, charity_name,
        status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [
      id,
      fields.wallet_address,
      fields.host_name,
      fields.title,
      fields.event_type,
      fields.description,
      fields.event_date,
      fields.start_time,
      fields.time_zone,
      fields.join_url,
      platform,
      fields.contact_handle,
      fields.contact_type,
      fields.chain,
      parseFloat(fields.entry_fee),
      fields.fee_token,
      parseInt(fields.charity_id),
      fields.charity_name,
    ]
  );

  return getEventById(id);
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateEvent({ id, wallet_address, updates }) {
  const [rows] = await db.execute(
    `SELECT id, status FROM fundraisely_web3_public_events
     WHERE id = ? AND wallet_address = ?`,
    [id, wallet_address]
  );

  if (!rows.length) return null;

  if (rows[0].status !== 'draft') {
    const err = new Error('Only draft events can be edited. Unpublish first.');
    err.statusCode = 400;
    throw err;
  }

  const allowed = {};
  for (const field of WRITABLE_FIELDS) {
    if (updates[field] !== undefined) allowed[field] = updates[field];
  }

  if (!Object.keys(allowed).length) return getEventById(id);

  if (allowed.join_url) {
    allowed.platform = detectPlatform(allowed.join_url);
  }

  const setClauses = Object.keys(allowed).map(f => `\`${f}\` = ?`).join(', ');
  const values     = [...Object.values(allowed), id, wallet_address];

  await db.execute(
    `UPDATE fundraisely_web3_public_events SET ${setClauses} WHERE id = ? AND wallet_address = ?`,
    values
  );

  return getEventById(id);
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishEvent({ id, wallet_address }) {
  const [rows] = await db.execute(
    `SELECT id, status, event_date FROM fundraisely_web3_public_events
     WHERE id = ? AND wallet_address = ?`,
    [id, wallet_address]
  );

  if (!rows.length) return null;

  if (rows[0].status !== 'draft') {
    const err = new Error('Only draft events can be published');
    err.statusCode = 400;
    throw err;
  }

  const eventDate = new Date(rows[0].event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (eventDate < today) {
    const err = new Error('Cannot publish an event with a past date');
    err.statusCode = 400;
    throw err;
  }

  await db.execute(
    `UPDATE fundraisely_web3_public_events
     SET status = 'published', published_at = NOW()
     WHERE id = ? AND wallet_address = ?`,
    [id, wallet_address]
  );

  return getEventById(id);
}

// ─── Unpublish ────────────────────────────────────────────────────────────────

export async function unpublishEvent({ id, wallet_address }) {
  const [rows] = await db.execute(
    `SELECT id FROM fundraisely_web3_public_events
     WHERE id = ? AND wallet_address = ? AND status = 'published'`,
    [id, wallet_address]
  );

  if (!rows.length) return null;

  await db.execute(
    `UPDATE fundraisely_web3_public_events
     SET status = 'draft', published_at = NULL
     WHERE id = ? AND wallet_address = ?`,
    [id, wallet_address]
  );

  return getEventById(id);
}

// ─── Update status (live / ended) ─────────────────────────────────────────────

export async function updateStatus({ id, wallet_address, status }) {
  const [rows] = await db.execute(
    `SELECT id FROM fundraisely_web3_public_events
     WHERE id = ? AND wallet_address = ?`,
    [id, wallet_address]
  );

  if (!rows.length) return null;

  await db.execute(
    `UPDATE fundraisely_web3_public_events
     SET status = ? WHERE id = ? AND wallet_address = ?`,
    [status, id, wallet_address]
  );

  return getEventById(id);
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteEvent({ id, wallet_address }) {
  const [result] = await db.execute(
    `DELETE FROM fundraisely_web3_public_events
     WHERE id = ? AND wallet_address = ? AND status = 'draft'`,
    [id, wallet_address]
  );

  return result.affectedRows > 0;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getEventById(id) {
  const [rows] = await db.execute(
    `SELECT * FROM fundraisely_web3_public_events WHERE id = ?`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getEventsByWallet(wallet_address) {
  const [rows] = await db.execute(
    `SELECT * FROM fundraisely_web3_public_events
     WHERE wallet_address = ?
     ORDER BY event_date ASC, start_time ASC`,
    [wallet_address]
  );
  return rows;
}

export async function getPublicEvents({ type, chain, limit, offset }) {
  const conditions = [`status = 'published'`, `event_date >= CURDATE()`];
  const params     = [];

  if (type  && VALID_EVENT_TYPES.includes(type))  { conditions.push('event_type = ?'); params.push(type);  }
  if (chain && VALID_CHAINS.includes(chain))       { conditions.push('chain = ?');      params.push(chain); }

  const where = conditions.join(' AND ');

  const [countRows] = await db.execute(
    `SELECT COUNT(*) AS total FROM fundraisely_web3_public_events WHERE ${where}`,
    params.length ? params : undefined
  );

  const limitN  = Number(limit);
  const offsetN = Number(offset);
  const sql = `SELECT * FROM fundraisely_web3_public_events WHERE ${where} ORDER BY event_date ASC, start_time ASC LIMIT ${limitN} OFFSET ${offsetN}`;
  const [rows] = await db.query(sql, params.length ? params : undefined);

  return { events: rows, total: countRows[0].total, limit, offset };
}