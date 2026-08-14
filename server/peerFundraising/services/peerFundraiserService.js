// peerFundraiserService.js
// Extracted from peerCoreService.js by split_peer_core.mjs — behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { updateMethods as updatePeerPaymentMethods } from './peerPaymentMethodsService.js';
import {
  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,
  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,
} from './peerCoreShared.js';

export async function listFundraisers(clubId) {
  const [rows] = await connection.execute(
    // FIX: confirmed_total now sums both peer_orders AND donations.
    // Subqueries are used instead of LEFT JOINs on both tables to avoid
    // row multiplication — joining peer_orders and donations simultaneously
    // alongside peer_participants and peer_packs inflates all four counts.
    `SELECT f.*,
      COUNT(DISTINCT p.id) AS participant_count,
      COUNT(DISTINCT pk.id) AS pack_count,
      COALESCE((
        SELECT SUM(total_amount)
        FROM ${O}
        WHERE peer_fundraiser_id = f.id
          AND payment_status = 'confirmed'
      ), 0)
      +
      COALESCE((
        SELECT SUM(amount)
        FROM ${TABLE_PREFIX}donations
        WHERE peer_fundraiser_id = f.id
          AND status = 'confirmed'
      ), 0) AS confirmed_total
     FROM ${F} f
     LEFT JOIN ${P} p ON p.peer_fundraiser_id = f.id AND p.club_id = f.club_id
     LEFT JOIN ${PK} pk ON pk.peer_fundraiser_id = f.id AND pk.club_id = f.club_id
     WHERE f.club_id = ?
     GROUP BY f.id
     ORDER BY f.created_at DESC`,
    [clubId]
  );
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
    [fundraiserId,clubId,b.name.trim(),b.description?.trim()||null,b.formatType||'door_to_door',
     Number(b.targetAmount||0),b.currency||clubReportingCurrency||'EUR',b.startDate||null,b.endDate||null,b.status||'draft',
     publicSlug,JSON.stringify(b.settings||{})]);

  if (Array.isArray(b.paymentMethodIds) && b.paymentMethodIds.length) {
    await updatePeerPaymentMethods(fundraiserId, clubId, b.paymentMethodIds, b.updatedBy ?? null);
  }

  return getFundraiser(fundraiserId,clubId);
}

export async function getFundraiser(fid,clubId) {
  const fundraiser = await assertFundraiser(fid,clubId);
  const [clubRows] = await connection.execute(`SELECT slug, name FROM ${C} WHERE id=? LIMIT 1`, [clubId]);

  // FIX: compute confirmed_total (orders + donations) so the drawer header
  // TargetProgress bar has a real value. assertFundraiser() is a bare
  // SELECT * — no confirmed_total column exists on the table itself.
  const [[totalsRow]] = await connection.execute(
    `SELECT
       COALESCE((
         SELECT SUM(total_amount)
         FROM ${O}
         WHERE peer_fundraiser_id = ? AND payment_status = 'confirmed'
       ), 0)
       +
       COALESCE((
         SELECT SUM(amount)
         FROM ${TABLE_PREFIX}donations
         WHERE peer_fundraiser_id = ? AND status = 'confirmed'
       ), 0) AS confirmed_total`,
    [fid, fid]
  );

  return {
    fundraiser: {
      ...fundraiser,
      club_slug:     clubRows[0]?.slug ?? null,
      club_name:     clubRows[0]?.name ?? null,
      confirmed_total: Number(totalsRow?.confirmed_total || 0),
    },
  };
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

export async function listOrders(fid,clubId) {
  await assertFundraiser(fid,clubId);

  const [rows]=await connection.execute(
    `SELECT
       o.*,
       COUNT(e.id) AS entry_count,
       SUM(e.status='confirmed') AS confirmed_entry_count,
       SUM(e.status='pending_payment') AS pending_entry_count,
       SUM(
         JSON_EXTRACT(
           e.metadata_json,'$.expansionError'
         ) IS NOT NULL
       ) AS failed_entry_count,
       SUM(
         e.linked_ticket_id IS NOT NULL
       ) AS ticket_entry_count,
       SUM(
         e.linked_ticket_id IS NOT NULL
         AND JSON_EXTRACT(
           e.metadata_json,
           '$.ticketEmailSentAt'
         ) IS NOT NULL
       ) AS ticket_email_sent_count,
       SUM(
         e.linked_ticket_id IS NOT NULL
         AND JSON_EXTRACT(
           e.metadata_json,
           '$.ticketEmailError'
         ) IS NOT NULL
       ) AS ticket_email_failed_count
     FROM ${O} o
     LEFT JOIN ${TABLE_PREFIX}peer_entries e
       ON e.order_id=o.id
     WHERE o.peer_fundraiser_id=?
       AND o.club_id=?
       AND o.payment_status IN ('confirmed','claimed')
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [fid,clubId],
  );

  return {
    orders:rows.map(order=>{
      const metadata=parseJson(order.metadata_json,{});
      return {
        ...order,
        fulfilment_status:
          metadata.fulfilmentStatus ||
          (order.payment_status==='confirmed'
            ? 'pending'
            : 'not_started'),
        fulfilment_error:
          metadata.fulfilmentError || null,
        allocation_status:
          metadata.allocationStatus || 'pending',
        allocation_check:
          metadata.allocationCheck || null,
        ticket_entry_count:
          Number(order.ticket_entry_count || 0),
        ticket_email_sent_count:
          Number(order.ticket_email_sent_count || 0),
        ticket_email_failed_count:
          Number(order.ticket_email_failed_count || 0),
      };
    }),
  };
}