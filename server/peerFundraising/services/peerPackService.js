// peerPackService.js
// Extracted from peerCoreService.js by split_peer_core.mjs - behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,
  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,
} from './peerCoreShared.js';

async function assertRoom(roomId,clubId,allowHistorical=false) {
  const [rows]=await connection.execute(`SELECT room_id,status FROM ${R} WHERE room_id=? AND club_id=? LIMIT 1`,[roomId,clubId]);
  if (!rows[0]) fail('invalid_pack_room');
  if (!allowHistorical && ['completed','cancelled'].includes(rows[0].status)) fail('room_not_available_for_pack');
}

// Must match the DB ENUMs exactly (see peer_packs.pack_type / peer_pack_items.item_type).
const VALID_PACK_TYPES = new Set(['single_entry','bundle','ticket','sponsor','custom']);
const VALID_ITEM_TYPES = new Set([
  'quiz_entry',
  'game_entry',
  'puzzle_entry',
  'elimination_entry',
  'event_ticket',
  'custom',
]);

// Mirrors the same room-type mapping used in peerEntryExpansionService.js
// (correctEntryType) and PeerPackEditor.tsx (validItemTypesForGameType) -
// kept as three independent copies rather than a shared import on purpose,
// since this one runs server-side at save time (before a pack can even be
// created), the entry-expansion one runs at purchase time (self-healing
// existing bad data), and the editor one is UI-only (prevention via the
// dropdown). Three independent layers catching the same class of mistake.
function validItemTypesForRoomGameType(gameType) {
  if (gameType === 'quiz') {
    return new Set(['quiz_entry', 'game_entry']);
  }
  if (gameType === 'elimination') {
    return new Set(['elimination_entry']);
  }
  if (gameType === 'ticketed_event') {
    return new Set(['event_ticket']);
  }
  if (gameType === 'puzzle_drop') {
    return new Set(['puzzle_entry']);
  }
  return null;
}

// Previously savePack only checked name and items.length - price, quantity
// and itemType went straight into the INSERT unvalidated. Number(bad||0)
// silently became €0, and a bogus itemType would only fail later, deep
// inside entry expansion, with a confusing error far from the cause. Now
// also async, so it can cross-check each item's itemType against its
// target room's actual game_type - this is what would have caught the
// elimination-room-saved-as-quiz_individual_ticket mismatch found in
// testing, at save time, with a clear error, instead of silently
// persisting bad data that only surfaced as a wrong join link days later.
async function validatePackPayload(b, clubId) {
  if(!b?.name?.trim()) fail('invalid_pack_name');

  const price=Number(b.price);
  if(!Number.isFinite(price) || price<0) fail('invalid_price');
  if(b.packType && !VALID_PACK_TYPES.has(b.packType)) fail('invalid_pack_type');
  if(!Array.isArray(b.items) || !b.items.length) fail('invalid_pack');

  const roomIds=[...new Set(b.items.map(item=>item.targetRoomId).filter(Boolean))];
  if(roomIds.length!==new Set(b.items.map(item=>item.targetRoomId)).size) fail('invalid_pack_item_room');

  const placeholders=roomIds.map(()=>'?').join(',');
  const [rooms]=await connection.execute(
    `SELECT room_id,game_type,config_json,status
     FROM ${R}
     WHERE room_id IN (${placeholders}) AND club_id=?`,
    [...roomIds,clubId]
  );

  const roomById=Object.fromEntries(rooms.map(room=>[room.room_id,room]));
  if(rooms.length!==roomIds.length) fail('invalid_pack_room');

  const dropRoomIds=rooms.filter(room=>room.game_type==='puzzle_drop').map(room=>room.room_id);
  const tierById={};

  if(dropRoomIds.length){
    const dropPlaceholders=dropRoomIds.map(()=>'?').join(',');
    const [tiers]=await connection.execute(
      `SELECT id,drop_room_id,quantity,price,label
       FROM ${DROP_TIERS}
       WHERE drop_room_id IN (${dropPlaceholders})`,
      dropRoomIds
    );
    for(const tier of tiers) tierById[tier.id]=tier;
  }

  for(const item of b.items){
    if(!item.targetRoomId) fail('invalid_pack_item_room');
    if(!item.itemType || !VALID_ITEM_TYPES.has(item.itemType)) fail('invalid_item_type');

    const quantity=Number(item.quantity);
    if(!Number.isFinite(quantity) || quantity<1) fail('invalid_quantity');

    const room=roomById[item.targetRoomId];
    if(!room) fail('invalid_pack_room');
    if(['completed','cancelled'].includes(room.status)) fail('room_not_available_for_pack');

    const validTypes=validItemTypesForRoomGameType(room.game_type);
    if(validTypes && !validTypes.has(item.itemType)){
      fail(`item_type_mismatch: ${item.itemType} is not valid for a ${room.game_type} room`);
    }

    const metadata=item.metadata||{};
    const configuredPrice=Number(metadata.configuredPrice);
    const referencePrice=Number(metadata.referencePrice);
    if(!Number.isFinite(configuredPrice) || configuredPrice<0) fail('configured_price_required');
    if(!Number.isFinite(referencePrice) || referencePrice<0) fail('reference_price_required');

    const config=parseJson(room.config_json,{});

    if(room.game_type==='quiz'){
      const liveEntryFee=Number(config.entryFee||0);

      const liveExtrasTotal=Object.entries(config.fundraisingOptions||{})
        .filter(([,enabled])=>enabled===true)
        .reduce(
          (sum,[extraId]) =>
            sum + Number(config.fundraisingPrices?.[extraId]||0),
          0
        );

      const liveConfiguredValue=liveEntryFee+liveExtrasTotal;

      if(Math.abs(liveConfiguredValue-referencePrice)>0.001){
        fail('activity_price_changed');
      }
    }

    if(room.game_type==='elimination'){
      const livePrice=Number(config.entryFee||0);

      if(Math.abs(livePrice-referencePrice)>0.001){
        fail('activity_price_changed');
      }
    }

    if(room.game_type==='ticketed_event'){
      const ticketTypeId=String(metadata.ticketTypeId||'').trim();
      if(!ticketTypeId) fail('ticket_type_required');

      const allTypes=Array.isArray(config.ticketTypes) && config.ticketTypes.length
        ? config.ticketTypes
        : config.entryFee
          ? [{id:'general',name:'General Admission',price:String(config.entryFee),isEnabled:true}]
          : [];

      const ticketType=allTypes.find(type=>String(type.id)===ticketTypeId);
      if(!ticketType || ticketType.isEnabled===false) fail('ticket_type_unavailable');

      if(ticketType.saleEndsAt){
        const endMs=new Date(ticketType.saleEndsAt).getTime();
        if(Number.isFinite(endMs) && endMs<Date.now()) fail('ticket_type_unavailable');
      }

      const livePrice=Number(ticketType.price||0);
      if(Math.abs(livePrice-referencePrice)>0.001) fail('ticket_type_price_changed');
    }

    if(room.game_type==='puzzle_drop'){
      const tierId=String(metadata.pricingTierId||'').trim();
      const tier=tierById[tierId];
      if(!tier || tier.drop_room_id!==room.room_id) fail('puzzle_tier_unavailable');

      const livePrice=Number(tier.price||0);
      const liveQuantity=Number(tier.quantity||0);
      if(Math.abs(livePrice-referencePrice)>0.001) fail('puzzle_tier_price_changed');
      if(Number(metadata.puzzleQuantity)!==liveQuantity) fail('puzzle_tier_quantity_changed');
    }
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
  await validatePackPayload(b, clubId);
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
        [id(),pid,fid,clubId,item.targetRoomId,item.itemType==='quiz_entry'?'game_entry':item.itemType,Number(item.quantity||1),
         item.metadata?JSON.stringify(item.metadata):null]);
    }
    await conn.commit();
    return { packId:pid };
  } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

// ─── Hide / duplicate ──────────────────────────────────────────────────────
// Neither existed for peer packs - a pack could be created but never
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
// peer never had any version of it - building a bundle meant starting from
// a blank pack every time. Ported and extended: campaign's 'puzzle_campaign'
// key existed in the UI prompt but was never actually implemented in
// TEMPLATES - it's implemented here for real.
