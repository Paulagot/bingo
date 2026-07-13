import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { updateMethods as updatePeerPaymentMethods } from './peerPaymentMethodsService.js';

const F = `${TABLE_PREFIX}peer_fundraisers`;
const P = `${TABLE_PREFIX}peer_participants`;
const PK = `${TABLE_PREFIX}peer_packs`;
const PI = `${TABLE_PREFIX}peer_pack_items`;
const O = `${TABLE_PREFIX}peer_orders`;
const OI = `${TABLE_PREFIX}peer_order_items`;
const R = `${TABLE_PREFIX}web2_quiz_rooms`;
const C = `${TABLE_PREFIX}clubs`;

const id = () => nanoid(21);
const parseJson = (v, f={}) => {
  if (!v) return f;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return f; }
};
const slugify = v => String(v || '').toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-')
  .replace(/^-|-$/g,'').slice(0,120);
const fail = (message, status=400) => { throw Object.assign(new Error(message), { status }); };

// Currently the public support page hardcodes 'cash_to_participant', so a
// bare passthrough of b.paymentMethodCategory has been harmless so far —
// but the moment real payment method choice is added to the public page,
// unvalidated client input goes straight into an ENUM column. Mirrors
// campaign's normalisePaymentCategory.
function normalisePaymentCategory(category, providerName) {
  const cat = String(category || '').toLowerCase().trim();
  const provider = String(providerName || '').toLowerCase().trim();
  const valid = new Set([
    'card','stripe','instant_payment','cash_to_participant','cash',
    'card_tap','pay_admin','crypto','bank_transfer','other',
  ]);
  if (valid.has(cat)) return cat;
  if (provider === 'cash' || provider === 'cash_to_participant') return 'cash_to_participant';
  if (provider === 'card_tap') return 'card_tap';
  if (provider === 'stripe') return 'stripe';
  if (provider === 'crypto' || provider === 'solana') return 'crypto';
  return 'other';
}

async function assertFundraiser(fid, clubId) {
  const [rows] = await connection.execute(`SELECT * FROM ${F} WHERE id=? AND club_id=? LIMIT 1`, [fid, clubId]);
  if (!rows[0]) fail('peer_fundraiser_not_found',404);
  return rows[0];
}
async function uniqueSlug(table, parentCol, parentId, slugCol, raw, excludeId=null) {
  const base = slugify(raw) || `item-${Date.now()}`;
  for (let n=1;n<100;n++) {
    const candidate = n===1 ? base : `${base}-${n}`;
    const sql = `SELECT id FROM ${table} WHERE ${parentCol}=? AND ${slugCol}=? ${excludeId?'AND id<>?':''} LIMIT 1`;
    const [rows] = await connection.execute(sql, excludeId?[parentId,candidate,excludeId]:[parentId,candidate]);
    if (!rows[0]) return candidate;
  }
  return `${base}-${Date.now()}`;
}
export async function listFundraisers(clubId) {
  const [rows] = await connection.execute(
    `SELECT f.*,
      COUNT(DISTINCT p.id) participant_count,
      COUNT(DISTINCT pk.id) pack_count,
      COALESCE(SUM(CASE WHEN o.payment_status='confirmed' THEN o.total_amount ELSE 0 END),0) confirmed_total
     FROM ${F} f
     LEFT JOIN ${P} p ON p.peer_fundraiser_id=f.id
     LEFT JOIN ${PK} pk ON pk.peer_fundraiser_id=f.id
     LEFT JOIN ${O} o ON o.peer_fundraiser_id=f.id
     WHERE f.club_id=? GROUP BY f.id ORDER BY f.created_at DESC`, [clubId]);
  return { fundraisers: rows };
}
export async function createFundraiser(clubId,b,clubReportingCurrency=null) {
  if (!b?.name?.trim()) fail('name_required');
  const fundraiserId=id();
  const publicSlug=await uniqueSlug(F,'club_id',clubId,'public_slug',b.publicSlug||b.name);
  await connection.execute(
    `INSERT INTO ${F}
      (id,club_id,name,description,format_type,target_amount,currency,start_date,end_date,status,public_slug,settings_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [fundraiserId,clubId,b.name.trim(),b.description?.trim()||null,b.formatType||'door_to_door_pack',
     Number(b.targetAmount||0),b.currency||clubReportingCurrency||'EUR',b.startDate||null,b.endDate||null,b.status||'draft',
     publicSlug,JSON.stringify(b.settings||{})]);

  // Payment methods can now be picked at creation time, consistent with
  // how event setup works — previously this was only ever possible
  // afterward, via a separate Payments tab, with nothing at creation time
  // warning the club they hadn't set any up. Reuses updateMethods' existing
  // ownership + validation logic rather than duplicating it here.
  if (Array.isArray(b.paymentMethodIds) && b.paymentMethodIds.length) {
    await updatePeerPaymentMethods(fundraiserId, clubId, b.paymentMethodIds, b.updatedBy ?? null);
  }

  return getFundraiser(fundraiserId,clubId);
}
export async function getFundraiser(fid,clubId) {
  const fundraiser = await assertFundraiser(fid,clubId);
  // Previously the mgmt page had no way to know the club's real slug at all
  // and fell back to a literal "your-club" string in the URL. Join it here
  // so every screen that loads a single fundraiser gets the real value.
  const [clubRows] = await connection.execute(`SELECT slug, name FROM ${C} WHERE id=? LIMIT 1`, [clubId]);
  return { fundraiser: { ...fundraiser, club_slug: clubRows[0]?.slug ?? null, club_name: clubRows[0]?.name ?? null } };
}
export async function updateFundraiser(fid,clubId,b) {
  const cur=await assertFundraiser(fid,clubId);
  const publicSlug=b.publicSlug!==undefined
    ? await uniqueSlug(F,'club_id',clubId,'public_slug',b.publicSlug||b.name||cur.name,fid)
    : cur.public_slug;
  await connection.execute(
    `UPDATE ${F} SET name=?,description=?,format_type=?,target_amount=?,currency=?,
      start_date=?,end_date=?,status=?,public_slug=?,settings_json=? WHERE id=? AND club_id=?`,
    [b.name?.trim()||cur.name,b.description!==undefined?(b.description?.trim()||null):cur.description,
     b.formatType||cur.format_type,b.targetAmount!==undefined?Number(b.targetAmount):cur.target_amount,
     b.currency||cur.currency,b.startDate!==undefined?(b.startDate||null):cur.start_date,
     b.endDate!==undefined?(b.endDate||null):cur.end_date,b.status||cur.status,publicSlug,
     JSON.stringify(b.settings??parseJson(cur.settings_json,{})),fid,clubId]);
  return getFundraiser(fid,clubId);
}
export async function availableRooms(fid,clubId) {
  await assertFundraiser(fid,clubId);
  // Previously this only ever showed raw room_ids or whatever ad-hoc name
  // happened to be buried in a room's config_json — EventService.js never
  // actually writes an event's title/description into that config_json
  // (confirmed by reading it), so that was often just the room_id itself.
  // Now LEFT JOIN through fundraisely_event_integrations to the room's real
  // linked event, if one exists, and prefer its title/description.
  const [rows]=await connection.execute(
    `SELECT r.room_id,r.game_type,r.status,r.scheduled_at,r.time_zone,r.config_json,r.prize_description,r.prize_value,
            e.title AS event_title, e.summary AS event_summary, e.description AS event_description
     FROM ${R} r
     LEFT JOIN ${TABLE_PREFIX}event_integrations ei
       ON ei.external_ref COLLATE utf8mb4_unicode_ci = r.room_id COLLATE utf8mb4_unicode_ci
       AND ei.club_id COLLATE utf8mb4_unicode_ci = r.club_id COLLATE utf8mb4_unicode_ci
       AND ei.integration_type IN ('quiz_web2','elimination','ticketed_event','puzzle_sub','puzzle_drop')
     LEFT JOIN ${TABLE_PREFIX}events e
       ON e.id COLLATE utf8mb4_unicode_ci = ei.event_id COLLATE utf8mb4_unicode_ci
       AND e.club_id COLLATE utf8mb4_unicode_ci = r.club_id COLLATE utf8mb4_unicode_ci
     WHERE r.club_id=? AND r.status NOT IN ('completed','cancelled')
     ORDER BY CASE r.status WHEN 'scheduled' THEN 1 WHEN 'open' THEN 2 WHEN 'live' THEN 3 ELSE 4 END,
              r.scheduled_at ASC,r.created_at DESC`,[clubId]);

  // A room could in principle be linked to more than one event row — dedupe
  // to one entry per room (keep the first match).
  const seen = new Set();
  const deduped = rows.filter(r => {
    if (seen.has(r.room_id)) return false;
    seen.add(r.room_id);
    return true;
  });

  return { rooms: deduped.map(r=>{
    const config = parseJson(r.config_json,{});
    const fallbackName = config.eventName||config.eventTitle||config.quizName||config.roomName||r.room_id;
    return {
      room_id: r.room_id,
      game_type: r.game_type,
      status: r.status,
      scheduled_at: r.scheduled_at,
      time_zone: r.time_zone,
      prize_description: r.prize_description,
      prize_value: r.prize_value,
      config,
      name: r.event_title || fallbackName,
      description: r.event_description || r.event_summary || null,
    };
  }) };
}
export async function listParticipants(fid,clubId) {
  await assertFundraiser(fid,clubId);
  const [rows]=await connection.execute(
    `SELECT p.*,COUNT(DISTINCT o.id) order_count,
      COALESCE(SUM(CASE WHEN o.payment_status='confirmed' THEN o.total_amount ELSE 0 END),0) confirmed_total,
      COALESCE(SUM(CASE WHEN o.payment_status='claimed' THEN o.total_amount ELSE 0 END),0) claimed_total
     FROM ${P} p LEFT JOIN ${O} o ON o.participant_id=p.id
     WHERE p.peer_fundraiser_id=? AND p.club_id=? GROUP BY p.id
     ORDER BY confirmed_total DESC,p.participant_name`,[fid,clubId]);
  return { participants:rows };
}
export async function createParticipant(fid,clubId,b) {
  await assertFundraiser(fid,clubId);
  if (!b?.participantName?.trim()) fail('participant_name_required');
  const participantId=id();
  const participantSlug=await uniqueSlug(P,'peer_fundraiser_id',fid,'participant_slug',b.participantSlug||b.participantName);
  await connection.execute(
    `INSERT INTO ${P}
      (id,peer_fundraiser_id,club_id,participant_name,participant_slug,email,phone,personal_target,
       personal_message,profile_image_url,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [participantId,fid,clubId,b.participantName.trim(),participantSlug,b.email?.trim().toLowerCase()||null,
     b.phone?.trim()||null,b.personalTarget??null,b.personalMessage?.trim()||null,
     b.profileImageUrl||null,b.notes?.trim()||null]);
  return { participantId, participantSlug };
}

// Previously missing entirely — PeerService.ts (frontend) already had an
// updateParticipant() method calling PATCH .../participants/:participantId,
// but no route or service function existed to handle it, so it 404'd.
export async function updateParticipant(fid,clubId,participantId,b) {
  await assertFundraiser(fid,clubId);
  const [rows]=await connection.execute(
    `SELECT * FROM ${P} WHERE id=? AND peer_fundraiser_id=? AND club_id=? LIMIT 1`,
    [participantId,fid,clubId]
  );
  const current=rows[0];
  if (!current) fail('participant_not_found',404);

  if (b.participantName!==undefined && !b.participantName?.trim()) fail('participant_name_required');

  const participantSlug=b.participantSlug!==undefined
    ? await uniqueSlug(P,'peer_fundraiser_id',fid,'participant_slug',b.participantSlug||b.participantName||current.participant_name,participantId)
    : current.participant_slug;

  await connection.execute(
    `UPDATE ${P} SET participant_name=?,participant_slug=?,email=?,phone=?,personal_target=?,
       personal_message=?,profile_image_url=?,is_active=?,notes=?
     WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
    [
      b.participantName!==undefined?b.participantName.trim():current.participant_name,
      participantSlug,
      b.email!==undefined?(b.email?.trim().toLowerCase()||null):current.email,
      b.phone!==undefined?(b.phone?.trim()||null):current.phone,
      b.personalTarget!==undefined?b.personalTarget:current.personal_target,
      b.personalMessage!==undefined?(b.personalMessage?.trim()||null):current.personal_message,
      b.profileImageUrl!==undefined?(b.profileImageUrl||null):current.profile_image_url,
      b.isActive!==undefined?(b.isActive?1:0):current.is_active,
      b.notes!==undefined?(b.notes?.trim()||null):current.notes,
      participantId,fid,clubId,
    ]
  );

  const [updated]=await connection.execute(`SELECT * FROM ${P} WHERE id=? LIMIT 1`,[participantId]);
  return { participant: updated[0] };
}

// Mirrors campaign's deleteSeller: soft-delete (deactivate) if the
// participant has any non-cancelled orders, hard-delete otherwise.
export async function deleteParticipant(fid,clubId,participantId) {
  await assertFundraiser(fid,clubId);
  const [orderRows]=await connection.execute(
    `SELECT COUNT(*) cnt FROM ${O} WHERE participant_id=? AND payment_status NOT IN ('cancelled','refunded')`,
    [participantId]
  );
  const hasOrders=(orderRows[0]?.cnt||0)>0;

  if (hasOrders) {
    const [result]=await connection.execute(
      `UPDATE ${P} SET is_active=0 WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
      [participantId,fid,clubId]
    );
    if (!result.affectedRows) fail('participant_not_found',404);
    return { deleted:false, deactivated:true };
  }

  const [result]=await connection.execute(
    `DELETE FROM ${P} WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
    [participantId,fid,clubId]
  );
  if (!result.affectedRows) fail('participant_not_found',404);
  return { deleted:true, deactivated:false };
}
async function assertRoom(roomId,clubId,allowHistorical=false) {
  const [rows]=await connection.execute(`SELECT room_id,status FROM ${R} WHERE room_id=? AND club_id=? LIMIT 1`,[roomId,clubId]);
  if (!rows[0]) fail('invalid_pack_room');
  if (!allowHistorical && ['completed','cancelled'].includes(rows[0].status)) fail('room_not_available_for_pack');
}

// Must match the DB ENUMs exactly (see peer_packs.pack_type / peer_pack_items.item_type).
const VALID_PACK_TYPES = new Set(['single_entry','bundle','ticket','sponsor','custom']);
const VALID_ITEM_TYPES = new Set(['game_entry','quiz_team_ticket','quiz_individual_ticket','puzzle_entry','elimination_entry','event_ticket','custom']);

// Previously savePack only checked name and items.length — price, quantity
// and itemType went straight into the INSERT unvalidated. Number(bad||0)
// silently became €0, and a bogus itemType would only fail later, deep
// inside entry expansion, with a confusing error far from the cause.
function validatePackPayload(b) {
  if (!b?.name?.trim()) fail('invalid_pack_name');
  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0) fail('invalid_price');
  if (b.packType && !VALID_PACK_TYPES.has(b.packType)) fail('invalid_pack_type');
  if (!Array.isArray(b.items) || !b.items.length) fail('invalid_pack');
  for (const item of b.items) {
    if (!item.targetRoomId) fail('invalid_pack_item_room');
    if (!item.itemType || !VALID_ITEM_TYPES.has(item.itemType)) fail('invalid_item_type');
    const qty = Number(item.quantity);
    if (!Number.isFinite(qty) || qty < 1) fail('invalid_quantity');
  }
}
export async function listPacks(fid,clubId) {
  await assertFundraiser(fid,clubId);
  const [packs]=await connection.execute(`SELECT * FROM ${PK} WHERE peer_fundraiser_id=? AND club_id=? ORDER BY display_order,created_at`,[fid,clubId]);
  if (!packs.length) return { packs:[] };
  const ids=packs.map(x=>x.id), ph=ids.map(()=>'?').join(',');
  const [items]=await connection.execute(`SELECT * FROM ${PI} WHERE pack_id IN (${ph}) ORDER BY created_at`,ids);
  return { packs:packs.map(p=>({...p,items:items.filter(i=>i.pack_id===p.id)})) };
}
export async function savePack(fid,clubId,packId,b) {
  await assertFundraiser(fid,clubId);
  validatePackPayload(b);
  const existing = packId ? await listPacks(fid,clubId) : {packs:[]};
  const old = existing.packs.find(p=>p.id===packId);
  const oldRooms=new Set(old?.items?.map(i=>i.target_room_id)||[]);
  for (const item of b.items) await assertRoom(item.targetRoomId,clubId,oldRooms.has(item.targetRoomId));
  const conn=await connection.getConnection();
  try {
    await conn.beginTransaction();
    const pid=packId||id();
    if (packId) {
      await conn.execute(
        `UPDATE ${PK} SET name=?,description=?,pack_type=?,price=?,currency=?,is_featured=?,badge_label=?,
         display_order=?,max_sales=?,sales_start_at=?,sales_end_at=?,metadata_json=?
         WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
        [b.name.trim(),b.description?.trim()||null,b.packType||'bundle',Number(b.price||0),b.currency||'EUR',
         b.isFeatured?1:0,b.badgeLabel?.trim()||null,Number(b.displayOrder||0),b.maxSales||null,
         b.salesStartAt||null,b.salesEndAt||null,b.metadata?JSON.stringify(b.metadata):null,pid,fid,clubId]);
      await conn.execute(`DELETE FROM ${PI} WHERE pack_id=?`,[pid]);
    } else {
      await conn.execute(
        `INSERT INTO ${PK}
         (id,peer_fundraiser_id,club_id,name,description,pack_type,price,currency,is_featured,badge_label,
          display_order,max_sales,sales_start_at,sales_end_at,is_active,metadata_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
        [pid,fid,clubId,b.name.trim(),b.description?.trim()||null,b.packType||'bundle',Number(b.price||0),
         b.currency||'EUR',b.isFeatured?1:0,b.badgeLabel?.trim()||null,Number(b.displayOrder||0),
         b.maxSales||null,b.salesStartAt||null,b.salesEndAt||null,b.metadata?JSON.stringify(b.metadata):null]);
    }
    for (const item of b.items) {
      await conn.execute(
        `INSERT INTO ${PI}
         (id,pack_id,peer_fundraiser_id,club_id,target_room_id,item_type,quantity,metadata_json)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id(),pid,fid,clubId,item.targetRoomId,item.itemType,Number(item.quantity||1),
         item.metadata?JSON.stringify(item.metadata):null]);
    }
    await conn.commit();
    return { packId:pid };
  } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

// ─── Hide / duplicate ──────────────────────────────────────────────────────
// Neither existed for peer packs — a pack could be created but never
// retired or cloned, unlike campaign products (hideProduct/duplicateProduct).

export async function hidePack(fid, clubId, packId) {
  await assertFundraiser(fid, clubId);
  const [result] = await connection.execute(
    `UPDATE ${PK} SET is_active=0 WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
    [packId, fid, clubId]
  );
  if (!result.affectedRows) fail('pack_not_found', 404);
  return { ok: true };
}

export async function duplicatePack(fid, clubId, packId) {
  await assertFundraiser(fid, clubId);
  const { packs } = await listPacks(fid, clubId);
  const source = packs.find(p => p.id === packId);
  if (!source) fail('pack_not_found', 404);

  return savePack(fid, clubId, null, {
    name: `${source.name} (copy)`,
    description: source.description,
    packType: source.pack_type,
    price: source.price,
    currency: source.currency,
    isFeatured: false,
    badgeLabel: source.badge_label,
    displayOrder: source.display_order,
    maxSales: source.max_sales,
    salesStartAt: source.sales_start_at,
    salesEndAt: source.sales_end_at,
    metadata: parseJson(source.metadata_json, null),
    items: source.items.map(i => ({
      targetRoomId: i.target_room_id,
      itemType: i.item_type,
      quantity: i.quantity,
      metadata: parseJson(i.metadata_json, null),
    })),
  });
}

// ─── Templates ─────────────────────────────────────────────────────────────
// Campaign had this (TEMPLATES + applyTemplate in campaignProductService.js);
// peer never had any version of it — building a bundle meant starting from
// a blank pack every time. Ported and extended: campaign's 'puzzle_campaign'
// key existed in the UI prompt but was never actually implemented in
// TEMPLATES — it's implemented here for real.

function findRoomByGameType(rooms, gameType) {
  return rooms.find(r => r.game_type === gameType);
}
function findPuzzleRoom(rooms) {
  return rooms.find(r => String(r.game_type || '').startsWith('puzzle'));
}

const TEMPLATES = {
  door_to_door: (rooms) => {
    const elimination = findRoomByGameType(rooms, 'elimination');
    const quiz        = findRoomByGameType(rooms, 'quiz');
    const blueprints = [];

    if (elimination) {
      blueprints.push(
        { name: 'Tournament Game Pack', packType: 'bundle', price: 10, isFeatured: true, badgeLabel: 'Most Popular',
          items: [{ targetRoomId: elimination.room_id, itemType: 'elimination_entry', quantity: 1 }] },
        { name: 'Last Player Standing Entry', packType: 'single_entry', price: 5,
          items: [{ targetRoomId: elimination.room_id, itemType: 'elimination_entry', quantity: 1 }] },
      );
    }
    if (quiz) {
      blueprints.push(
        { name: 'Family Quiz Team', packType: 'ticket', price: 30,
          items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_team_ticket', quantity: 1 }] },
      );
    }
    return blueprints;
  },

  quiz_only: (rooms) => {
    const quiz = findRoomByGameType(rooms, 'quiz');
    if (!quiz) return [];
    return [
      { name: 'Family Quiz Team',  packType: 'ticket',       price: 30,
        items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_team_ticket', quantity: 1 }] },
      { name: 'Individual Ticket', packType: 'single_entry', price: 10,
        items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_individual_ticket', quantity: 1 }] },
      { name: 'Supporter Ticket',  packType: 'single_entry', price: 5,
        items: [{ targetRoomId: quiz.room_id, itemType: 'quiz_individual_ticket', quantity: 1 }] },
    ];
  },

  puzzle_campaign: (rooms) => {
    const puzzle = findPuzzleRoom(rooms);
    if (!puzzle) return [];
    return [
      { name: 'Puzzle Challenge Entry', packType: 'single_entry', price: 8,
        items: [{ targetRoomId: puzzle.room_id, itemType: 'puzzle_entry', quantity: 1 }] },
    ];
  },
};

export async function applyTemplate(fid, clubId, templateKey) {
  await assertFundraiser(fid, clubId);
  const builder = TEMPLATES[templateKey];
  if (!builder) fail('invalid_template_key');

  const { rooms } = await availableRooms(fid, clubId);
  if (!rooms.length) fail('no_available_events', 400);

  const blueprints = builder(rooms);
  if (!blueprints.length) fail('no_matching_events_for_template', 400);

  const created = [];
  for (const blueprint of blueprints) {
    const { packId } = await savePack(fid, clubId, null, blueprint);
    created.push(packId);
  }
  return listPacks(fid, clubId).then(r => ({
    packs: r.packs.filter(p => created.includes(p.id)),
  }));
}
export async function publicPayload(clubSlug,fundraiserSlug,participantSlug=null) {
  // NOTE: clubs.logo_url doesn't exist in this schema — the original query
  // selected it and crashed every public page load with "Unknown column
  // 'logo_url' in 'field list'". Dropped from the query for now; club.logo_url
  // is returned as null so the frontend's existing `d.club.logo_url && <img.../>`
  // check degrades gracefully (no broken image, just no logo shown). If clubs
  // actually have logos stored somewhere (a different column name, or a
  // separate table), point me at it and I'll wire it in properly.
  const [clubs]=await connection.execute(`SELECT id,name,slug FROM ${C} WHERE slug=? OR LOWER(REPLACE(name,' ','-'))=? LIMIT 1`,[clubSlug,clubSlug]);
  const club=clubs[0]; if(!club) fail('club_not_found',404);
  club.logo_url = null;
  const [funds]=await connection.execute(`SELECT * FROM ${F} WHERE club_id=? AND public_slug=? AND status='published' LIMIT 1`,[club.id,fundraiserSlug]);
  const fundraiser=funds[0]; if(!fundraiser) fail('peer_fundraiser_not_found',404);
  let participant=null;
  if(participantSlug){
    const [rows]=await connection.execute(`SELECT * FROM ${P} WHERE peer_fundraiser_id=? AND participant_slug=? AND is_active=1 LIMIT 1`,[fundraiser.id,participantSlug]);
    participant=rows[0]; if(!participant) fail('participant_not_found',404);
  }
  const [packs]=await connection.execute(
    `SELECT * FROM ${PK} WHERE peer_fundraiser_id=? AND is_active=1
     AND (sales_start_at IS NULL OR sales_start_at<=UTC_TIMESTAMP())
     AND (sales_end_at IS NULL OR sales_end_at>=UTC_TIMESTAMP())
     ORDER BY display_order,is_featured DESC,created_at`,[fundraiser.id]);
  let items=[];
  if(packs.length){
    const ids=packs.map(p=>p.id),ph=ids.map(()=>'?').join(',');
    [items]=await connection.execute(
      `SELECT i.*,r.game_type,r.status room_status,r.scheduled_at,r.time_zone,r.config_json,
              e.title AS event_title, e.summary AS event_summary, e.description AS event_description
       FROM ${PI} i
       LEFT JOIN ${R} r ON r.room_id=i.target_room_id AND r.club_id=i.club_id
       LEFT JOIN ${TABLE_PREFIX}event_integrations ei
         ON ei.external_ref COLLATE utf8mb4_unicode_ci = i.target_room_id COLLATE utf8mb4_unicode_ci
         AND ei.club_id COLLATE utf8mb4_unicode_ci = i.club_id COLLATE utf8mb4_unicode_ci
         AND ei.integration_type IN ('quiz_web2','elimination','ticketed_event','puzzle_sub','puzzle_drop')
       LEFT JOIN ${TABLE_PREFIX}events e
         ON e.id COLLATE utf8mb4_unicode_ci = ei.event_id COLLATE utf8mb4_unicode_ci
         AND e.club_id COLLATE utf8mb4_unicode_ci = i.club_id COLLATE utf8mb4_unicode_ci
       WHERE i.pack_id IN (${ph})`,ids);

    // Same one-room-linked-to-multiple-events dedupe as availableRooms.
    const seenItems = new Set();
    items = items.filter(i => {
      if (seenItems.has(i.id)) return false;
      seenItems.add(i.id);
      return true;
    });
  }
  return { club,fundraiser,participant,packs:packs.map(p=>({...p,items:items.filter(i=>i.pack_id===p.id).map(i=>{
    const config = parseJson(i.config_json,{});
    const fallbackName = config.eventName||config.eventTitle||config.quizName||i.target_room_id;
    return {
      ...i,
      room:{
        roomId:i.target_room_id,
        gameType:i.game_type,
        status:i.room_status,
        scheduledAt:i.scheduled_at,
        name: i.event_title || fallbackName,
        description: i.event_description || i.event_summary || null,
      }
    };
  })}))};
}
export async function createOrder(fid,b) {
  if(!b?.supporterName?.trim()||!b?.supporterEmail?.trim()||!Array.isArray(b.items)||!b.items.length) fail('invalid_order');
  const [funds]=await connection.execute(`SELECT * FROM ${F} WHERE id=? AND status='published' LIMIT 1`,[fid]);
  const fund=funds[0]; if(!fund) fail('peer_fundraiser_not_available',404);
  let participant=null;
  if(b.participantId){
    const [rows]=await connection.execute(`SELECT * FROM ${P} WHERE id=? AND peer_fundraiser_id=? AND is_active=1 LIMIT 1`,[b.participantId,fid]);
    participant=rows[0]; if(!participant) fail('participant_not_found',404);
  }
  const ids=[...new Set(b.items.map(i=>i.packId))],ph=ids.map(()=>'?').join(',');
  const [packs]=await connection.execute(`SELECT * FROM ${PK} WHERE id IN (${ph}) AND peer_fundraiser_id=? AND club_id=? AND is_active=1`,[...ids,fid,fund.club_id]);
  const map=Object.fromEntries(packs.map(p=>[p.id,p])); let total=0;
  const lines=b.items.map(i=>{const p=map[i.packId];if(!p)fail('pack_not_found',404);const q=Math.max(1,Number(i.quantity||1));const t=Number(p.price)*q;total+=t;return{p,q,t};});
  const orderId=id(),conn=await connection.getConnection();
  try{
    await conn.beginTransaction();

    // Re-validate sales window and stock inside the transaction. Previously
    // publicPayload only filtered what was *displayed* — nothing re-checked
    // these at the moment of purchase, so a stale page or a direct API call
    // could buy a sold-out or expired pack. The FOR UPDATE lock on the pack
    // row also serializes concurrent purchases of the same pack, so two
    // supporters racing for the last available spot can't both succeed.
    for (const line of lines) {
      const [windowRows] = await conn.execute(
        `SELECT id FROM ${PK} WHERE id=? AND is_active=1
         AND (sales_start_at IS NULL OR sales_start_at<=UTC_TIMESTAMP())
         AND (sales_end_at IS NULL OR sales_end_at>=UTC_TIMESTAMP())
         LIMIT 1 FOR UPDATE`,
        [line.p.id]
      );
      if (!windowRows[0]) fail('pack_not_available', 400);

      if (line.p.max_sales != null) {
        const [soldRows] = await conn.execute(
          `SELECT COALESCE(SUM(oi.quantity),0) sold
           FROM ${OI} oi JOIN ${O} o ON o.id=oi.order_id
           WHERE oi.pack_id=? AND o.payment_status NOT IN ('cancelled','refunded')`,
          [line.p.id]
        );
        const alreadySold = Number(soldRows[0]?.sold || 0);
        if (alreadySold + line.q > Number(line.p.max_sales)) {
          fail('pack_sold_out', 400);
        }
      }
    }

    await conn.execute(
      `INSERT INTO ${O}
       (id,peer_fundraiser_id,club_id,participant_id,participant_name,supporter_name,supporter_email,
        supporter_phone,club_payment_method_id,payment_method_category,payment_provider,payment_reference,
        payment_status,subtotal_amount,total_amount,currency,source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId,fid,fund.club_id,participant?.id||null,participant?.participant_name||null,b.supporterName.trim(),
       b.supporterEmail.trim().toLowerCase(),b.supporterPhone?.trim()||null,b.clubPaymentMethodId||null,
       normalisePaymentCategory(b.paymentMethodCategory,b.paymentProvider),b.paymentProvider||null,b.paymentReference||null,'pending',
       total,total,fund.currency||'EUR',participant?'participant_link':'fundraiser_page']);
    for(const l of lines) await conn.execute(
      `INSERT INTO ${OI}
       (id,order_id,peer_fundraiser_id,club_id,pack_id,pack_name_snapshot,pack_description_snapshot,unit_price,quantity,line_total)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id(),orderId,fid,fund.club_id,l.p.id,l.p.name,l.p.description||null,Number(l.p.price),l.q,l.t]);
    await conn.commit(); return { orderId,totalAmount:total,currency:fund.currency||'EUR' };
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
export async function claimOrder(orderId,b={}) {
  const [r]=await connection.execute(
    `UPDATE ${O} SET payment_status='claimed',payment_reference=COALESCE(?,payment_reference),
     club_payment_method_id=COALESCE(?,club_payment_method_id)
     WHERE id=? AND payment_status='pending'`,
    [b.paymentReference||null,b.clubPaymentMethodId||null,orderId]);
  if(!r.affectedRows) fail('order_not_claimable');

  // Fired here (server-side, right on claim) rather than depending on the
  // frontend hitting a separate "send confirmation email" route after the
  // fact — more robust if the supporter closes the tab before the thank-you
  // screen finishes loading. Peer had no order-confirmation email at all.
  try {
    const { sendPeerOrderConfirmationEmail } = await import('./peerOrderEmailService.js');
    await sendPeerOrderConfirmationEmail(orderId);
  } catch (emailErr) {
    console.error('[PeerCore] ⚠️ Order confirmation email failed (non-fatal):', emailErr.message);
  }

  return { orderId };
}

// Public order-summary lookup — peer had no equivalent to campaign's
// GET /campaign-support/orders/:orderId/summary at all. Needed for the
// supporter-facing thank-you screen and for polling after Stripe checkout.
// Strips internal fields (club_id, participant_id, metadata) the same way
// campaign's safeOrder mapping does.
export async function getPublicOrderSummary(orderId) {
  const [orderRows]=await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`,[orderId]);
  const order=orderRows[0]; if(!order) fail('order_not_found',404);

  const [itemRows]=await connection.execute(
    `SELECT pack_name_snapshot,quantity,line_total FROM ${OI} WHERE order_id=? ORDER BY created_at`,
    [orderId]
  );

  const E=`${TABLE_PREFIX}peer_entries`;
  const [entryRows]=await connection.execute(
    `SELECT id,entry_type,status,entry_code,join_url,room_id FROM ${E} WHERE order_id=? ORDER BY created_at`,
    [orderId]
  );

  return {
    order: {
      id: order.id,
      participantName: order.participant_name,
      supporterName: order.supporter_name,
      supporterEmail: order.supporter_email,
      paymentStatus: order.payment_status,
      paymentMethodCategory: order.payment_method_category,
      paymentReference: order.payment_reference,
      totalAmount: Number(order.total_amount),
      currency: order.currency,
      items: itemRows.map(i=>({
        packName: i.pack_name_snapshot,
        quantity: Number(i.quantity),
        lineTotal: Number(i.line_total),
      })),
    },
    entries: entryRows,
  };
}
export async function listOrders(fid,clubId) {
  await assertFundraiser(fid,clubId);
  const [rows]=await connection.execute(`SELECT * FROM ${O} WHERE peer_fundraiser_id=? AND club_id=? ORDER BY created_at DESC`,[fid,clubId]);
  return { orders:rows };
}
// NOTE: confirmOrder used to live here as a bare status-flip that never
// called expandPeerOrder — confirming a cash order through the mgmt UI
// marked it paid but never created tickets or join links. Order confirm
// and reject now live in peerOrderCompletionService.js (confirmPeerOrderForClub /
// rejectPeerOrder), which run the full expansion and are ownership-checked.