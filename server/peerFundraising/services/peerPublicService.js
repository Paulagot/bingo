// peerPublicService.js
// Extracted from peerCoreService.js by split_peer_core.mjs — behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { createPeerDonationForOrder } from './peerDonationService.js';
import { getRoomCapacityStatus } from '../../mgtsystem/services/quizCapacityService.js';
import {
  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,
  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,
} from './peerCoreShared.js';

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

function publicFundraiserLifecycle(fundraiser, participant = null) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (fundraiser.status === 'draft') {
    return {
      state: 'draft',
      canTransact: false,
      message: 'This fundraiser is not public yet.',
    };
  }

  if (fundraiser.status === 'closed') {
    return {
      state: 'closed',
      canTransact: false,
      message: 'This fundraiser has closed.',
    };
  }

  if (
    fundraiser.start_date &&
    String(fundraiser.start_date).slice(0, 10) > today
  ) {
    return {
      state: 'not_started',
      canTransact: false,
      message: `This fundraiser opens on ${String(
        fundraiser.start_date,
      ).slice(0, 10)}.`,
    };
  }

  if (
    fundraiser.end_date &&
    String(fundraiser.end_date).slice(0, 10) < today
  ) {
    return {
      state: 'ended',
      canTransact: false,
      message: 'This fundraiser has ended.',
    };
  }

  if (participant && !Number(participant.is_active)) {
    return {
      state: 'participant_inactive',
      canTransact: false,
      message:
        "This participant's fundraising page is no longer active.",
    };
  }

  return {
    state: 'open',
    canTransact: true,
    message: null,
  };
}

function publicAvailabilityMessage(code, details = {}) {
  const messages = {
    fundraiser_closed: 'This fundraiser is closed.',
    pack_not_started: 'Sales have not opened yet.',
    pack_sales_ended: 'Sales have closed.',
    pack_sold_out: 'Sold out.',
    activity_missing: 'This activity is no longer available.',
    activity_closed: 'This activity has closed.',
    ticket_sales_closed:
      details.reason || 'Ticket sales have closed.',
    capacity_reached: 'Sold out.',
    ticket_type_required:
      'This ticket option is not configured correctly.',
    ticket_type_unavailable:
      details.name
        ? `${details.name} is not currently available.`
        : 'This ticket type is not currently available.',
    ticket_type_sale_ended:
      details.name
        ? `${details.name} sales have ended.`
        : 'Ticket sales have ended.',
    ticket_type_sold_out:
      details.name
        ? `${details.name} is sold out.`
        : 'This ticket type is sold out.',
  };
  return messages[code] || 'This option is not currently available.';
}

async function publicPackAvailability({ pack, packItems, lifecycle, soldQuantity, capacityByRoom }) {
  if (!lifecycle.canTransact) {
    return { available: false, reasonCode: 'fundraiser_closed', message: lifecycle.message, remaining: null };
  }
  const now = Date.now();
  if (pack.sales_start_at && new Date(pack.sales_start_at).getTime() > now) {
    return { available: false, reasonCode: 'pack_not_started', message: publicAvailabilityMessage('pack_not_started'), remaining: null };
  }
  if (pack.sales_end_at && new Date(pack.sales_end_at).getTime() < now) {
    return { available: false, reasonCode: 'pack_sales_ended', message: publicAvailabilityMessage('pack_sales_ended'), remaining: 0 };
  }
  if (pack.max_sales != null) {
    const remaining = Math.max(0, Number(pack.max_sales) - Number(soldQuantity || 0));
    if (remaining < 1) {
      return { available: false, reasonCode: 'pack_sold_out', message: publicAvailabilityMessage('pack_sold_out'), remaining: 0 };
    }
  }
  let packRemaining = pack.max_sales == null ? null : Math.max(0, Number(pack.max_sales) - Number(soldQuantity || 0));
  for (const item of packItems) {
    if (!item.target_room_id || !item.game_type) {
      return { available: false, reasonCode: 'activity_missing', message: publicAvailabilityMessage('activity_missing'), remaining: 0 };
    }
    if (['completed', 'cancelled'].includes(item.room_status)) {
      return { available: false, reasonCode: 'activity_closed', message: publicAvailabilityMessage('activity_closed'), remaining: 0 };
    }
    const quantityRequired = Math.max(1, Number(item.quantity || 1));
    if (['quiz', 'elimination', 'ticketed_event'].includes(item.game_type)) {
      const capacity = capacityByRoom?.get(item.target_room_id) ?? await getRoomCapacityStatus(item.target_room_id, 0);
      if (!capacity.ticketSalesOpen) {
        const code = capacity.ticketsFull ? 'capacity_reached' : 'ticket_sales_closed';
        return { available: false, reasonCode: code, message: publicAvailabilityMessage(code, { reason: capacity.ticketSalesCloseReason }), remaining: 0 };
      }
      if (capacity.availableForTickets < quantityRequired) {
        return { available: false, reasonCode: 'capacity_reached', message: publicAvailabilityMessage('capacity_reached'), remaining: 0 };
      }
      const optionRemaining = Math.floor(capacity.availableForTickets / quantityRequired);
      packRemaining = packRemaining == null ? optionRemaining : Math.min(packRemaining, optionRemaining);
    }
    if (item.game_type === 'ticketed_event') {
      const metadata = parseJson(item.metadata_json, {});
      const config = parseJson(item.config_json, {});
      const ticketTypeId = String(metadata.ticketTypeId || '').trim();
      if (!ticketTypeId) {
        return { available: false, reasonCode: 'ticket_type_required', message: publicAvailabilityMessage('ticket_type_required'), remaining: 0 };
      }
      const types = Array.isArray(config.ticketTypes) && config.ticketTypes.length ? config.ticketTypes : [];
      const ticketType = types.find(type => String(type.id) === ticketTypeId);
      if (!ticketType || ticketType.isEnabled === false) {
        return { available: false, reasonCode: 'ticket_type_unavailable', message: publicAvailabilityMessage('ticket_type_unavailable', { name: ticketType?.name }), remaining: 0 };
      }
      if (ticketType.saleEndsAt && new Date(ticketType.saleEndsAt).getTime() < now) {
        return { available: false, reasonCode: 'ticket_type_sale_ended', message: publicAvailabilityMessage('ticket_type_sale_ended', { name: ticketType.name }), remaining: 0 };
      }
      if (ticketType.quantity != null) {
        const [[soldRow]] = await connection.execute(
          `SELECT COUNT(*) AS sold FROM ${TABLE_PREFIX}quiz_tickets WHERE room_id=? AND ticket_type_id=? AND payment_status IN ('payment_claimed','payment_confirmed')`,
          [item.target_room_id, ticketTypeId],
        );
        const typeRemaining = Math.max(0, Number(ticketType.quantity) - Number(soldRow?.sold || 0));
        if (typeRemaining < quantityRequired) {
          return { available: false, reasonCode: 'ticket_type_sold_out', message: publicAvailabilityMessage('ticket_type_sold_out', { name: ticketType.name }), remaining: 0 };
        }
        const optionRemaining = Math.floor(typeRemaining / quantityRequired);
        packRemaining = packRemaining == null ? optionRemaining : Math.min(packRemaining, optionRemaining);
      }
    }
  }
  return {
    available: true,
    reasonCode: null,
    message: packRemaining != null && packRemaining <= 5 ? `${packRemaining} remaining` : null,
    remaining: packRemaining,
  };
}

export async function publicPayload(clubSlug, fundraiserSlug, participantSlug = null) {
  const [clubs] = await connection.execute(
    `SELECT id,name,slug,brand_logo_url,brand_primary_color,brand_background_color,brand_text_on_primary_color
     FROM ${C} WHERE slug=? OR LOWER(REPLACE(name,' ','-'))=? LIMIT 1`,
    [clubSlug, clubSlug],
  );
  const club = clubs[0];
  if (!club) fail('club_not_found', 404);
  club.logo_url = club.brand_logo_url || null;
  club.logoUrl = club.brand_logo_url || null;

  const [funds] = await connection.execute(
    `SELECT * FROM ${F} WHERE club_id=? AND public_slug=? LIMIT 1`,
    [club.id, fundraiserSlug],
  );
  const fundraiser = funds[0];
  if (!fundraiser || fundraiser.status === 'draft') fail('peer_fundraiser_not_found', 404);

  let participant = null;
  if (participantSlug) {
    const [rows] = await connection.execute(
      `SELECT * FROM ${P} WHERE peer_fundraiser_id=? AND participant_slug=? LIMIT 1`,
      [fundraiser.id, participantSlug],
    );
    participant = rows[0];
    if (!participant) fail('participant_not_found', 404);
  }

  const lifecycle = publicFundraiserLifecycle(fundraiser, participant);

  const [packs] = await connection.execute(
    `SELECT * FROM ${PK} WHERE peer_fundraiser_id=? AND is_active=1 ORDER BY display_order,is_featured DESC,created_at`,
    [fundraiser.id],
  );
  let items = [];
  if (packs.length) {
    const ids = packs.map(p => p.id), ph = ids.map(() => '?').join(',');
    [items] = await connection.execute(
      `SELECT i.*,r.game_type,r.status room_status,r.scheduled_at,r.time_zone,r.config_json,
              e.title AS event_title, e.summary AS event_summary, e.description AS event_description
       FROM ${PI} i
       LEFT JOIN ${R} r ON r.room_id=i.target_room_id AND r.club_id=i.club_id
       LEFT JOIN ${TABLE_PREFIX}event_integrations ei
         ON ei.external_ref = i.target_room_id AND ei.club_id = i.club_id
         AND ei.integration_type IN ('quiz_web2','elimination','ticketed_event','puzzle_sub','puzzle_drop')
       LEFT JOIN ${TABLE_PREFIX}events e ON e.id = ei.event_id AND e.club_id = i.club_id
       WHERE i.pack_id IN (${ph})`,
      ids,
    );
    const seenItems = new Set();
    items = items.filter(i => { if (seenItems.has(i.id)) return false; seenItems.add(i.id); return true; });
  }

  const fundraiserSettings = parseJson(fundraiser.settings_json, {});
  const isSponsored = fundraiser.format_type === 'sponsored';

  const sponsoredRoomId = isSponsored ? String(fundraiserSettings.sponsoredRoomId || '').trim() || null : null;
  let sponsoredRoom = null;
  if (sponsoredRoomId) {
    const [sRows] = await connection.execute(
      `SELECT room_id,status,config_json FROM ${R} WHERE room_id=? AND club_id=? AND game_type='sponsored_activity' LIMIT 1`,
      [sponsoredRoomId, club.id],
    );
    if (sRows[0]) {
      const config = parseJson(sRows[0].config_json, {});
      sponsoredRoom = {
        roomId: sRows[0].room_id,
        status: sRows[0].status,
        activityKind: config.activityKind || 'other',
        customActivityLabel: config.customActivityLabel || null,
        suggestedAmounts: config.suggestedAmounts || [],
        currency: config.currency || fundraiser.currency || 'EUR',
      };
    }
  }

  // ── Support totals ──────────────────────────────────────────────────────
  // Compute BOTH the fundraiser-wide total (overall bar) and, when a
  // participant is in the URL, that participant's own total (personal bar).
  // summariseSellActivities includes BOTH orders and donations so that
  // overall.confirmedTotal is the true combined figure for the progress bar.
  const summariseSellActivities = async (participantId) => {
    const [orderRes, donationRes] = await Promise.all([
      connection.execute(
        `SELECT COALESCE(SUM(total_amount),0) AS confirmed_total, COUNT(*) AS confirmed_count
         FROM ${O}
         WHERE club_id=? AND peer_fundraiser_id=? AND payment_status='confirmed'
           AND (? IS NULL OR participant_id=?)`,
        [club.id, fundraiser.id, participantId, participantId],
      ),
      connection.execute(
        `SELECT COALESCE(SUM(amount),0) AS confirmed_total, COUNT(*) AS confirmed_count
         FROM ${TABLE_PREFIX}donations
         WHERE club_id=? AND peer_fundraiser_id=? AND status='confirmed'
           AND (? IS NULL OR peer_participant_id=?)`,
        [club.id, fundraiser.id, participantId, participantId],
      ),
    ]);
    const orderRow = orderRes[0][0];
    const donationRow = donationRes[0][0];
    return {
      confirmedTotal: Number(orderRow?.confirmed_total || 0) + Number(donationRow?.confirmed_total || 0),
      confirmedCount: Number(orderRow?.confirmed_count || 0) + Number(donationRow?.confirmed_count || 0),
    };
  };

  const summariseSponsorship = async (participantId) => {
    const [res] = await connection.execute(
      `SELECT COALESCE(SUM(CASE WHEN status='confirmed' THEN amount ELSE 0 END),0) AS confirmed_total,
              SUM(status='confirmed') AS confirmed_count
       FROM ${TABLE_PREFIX}sponsored_contributions
       WHERE club_id=? AND peer_fundraiser_id=? AND (? IS NULL OR participant_id=?)`,
      [club.id, fundraiser.id, participantId, participantId],
    );
    const row = res[0];
    return { confirmedTotal: Number(row?.confirmed_total || 0), confirmedCount: Number(row?.confirmed_count || 0) };
  };

  const summarise = isSponsored ? summariseSponsorship : summariseSellActivities;
  const [overall, scoped] = await Promise.all([
    summarise(null),
    participant ? summarise(participant.id) : Promise.resolve(null),
  ]);
  const participantTotals = scoped ?? overall;

  const soldByPack = {};
  if (packs.length) {
    const packIds = packs.map(pack => pack.id);
    const placeholders = packIds.map(() => '?').join(',');
    const [soldRows] = await connection.execute(
      `SELECT oi.pack_id, COALESCE(SUM(oi.quantity),0) AS sold
       FROM ${OI} oi JOIN ${O} o ON o.id=oi.order_id
       WHERE oi.pack_id IN (${placeholders})
         AND o.payment_status NOT IN ('cancelled','refunded','failed')
       GROUP BY oi.pack_id`,
      packIds,
    );
    for (const row of soldRows) soldByPack[row.pack_id] = Number(row.sold || 0);
  }

  // ── Capacity: fetch each room once, reuse across every pack ──────────────
  const capacityRoomIds = [...new Set(
    items
      .filter(i => ['quiz', 'elimination', 'ticketed_event'].includes(i.game_type))
      .map(i => i.target_room_id)
      .filter(Boolean),
  )];
  const capacityByRoom = new Map();
  await Promise.all(capacityRoomIds.map(async roomId => {
    capacityByRoom.set(roomId, await getRoomCapacityStatus(roomId, 0));
  }));

  const publicPacks = await Promise.all(packs.map(async pack => {
    const packItems = items.filter(item => item.pack_id === pack.id);
    const availability = await publicPackAvailability({
      pack, packItems, lifecycle, soldQuantity: soldByPack[pack.id] || 0, capacityByRoom,
    });
    return {
      ...pack,
      sold_out: !availability.available,
      availability,
      items: packItems.map(i => {
        const config = parseJson(i.config_json, {});
        const fallbackName = config.eventName || config.eventTitle || config.quizName || i.target_room_id;
        return {
          ...i,
          room: {
            roomId: i.target_room_id,
            gameType: i.game_type,
            status: i.room_status,
            scheduledAt: i.scheduled_at,
            name: i.event_title || fallbackName,
            description: i.event_description || i.event_summary || null,
          },
        };
      }),
    };
  }));

  // overall.confirmedTotal already includes both orders and donations
  // (via summariseSellActivities above) — no separate donation query needed.
  return {
    club,
    lifecycle,
    fundraiser: {
      ...fundraiser,
      settings: fundraiserSettings,
      raised_amount: overall.confirmedTotal,
      raisedAmount: overall.confirmedTotal,          // FIX: was broken (fundraiser.raised_amount doesn't exist as a DB column)
      sponsorship_total: isSponsored ? overall.confirmedTotal : 0,
      sponsor_count: isSponsored ? overall.confirmedCount : 0,
      confirmed_support_count: overall.confirmedCount,
    },
    participant: participant ? {
      ...participant,
      raised_amount: participantTotals.confirmedTotal,
      raisedAmount: participantTotals.confirmedTotal,
      sponsorship_total: isSponsored ? participantTotals.confirmedTotal : 0,
      sponsor_count: isSponsored ? participantTotals.confirmedCount : 0,
      confirmed_support_count: participantTotals.confirmedCount,
    } : null,
    sponsoredRoom,
    supporterExperience: isSponsored ? 'sponsorship' : 'sell_activities',
    packs: publicPacks,
  };
}

export async function createOrder(fid,b) {
  if(!b?.supporterName?.trim()||!b?.supporterEmail?.trim()||!Array.isArray(b.items)||!b.items.length) fail('invalid_order');
  const [funds]=await connection.execute(
    `SELECT * FROM ${F} WHERE id=? LIMIT 1`,
    [fid]
  );
  const fund=funds[0];
  if(!fund) fail('peer_fundraiser_not_available',404);
  const lifecycle=publicFundraiserLifecycle(fund);
  if(!lifecycle.canTransact){
    fail(lifecycle.state==='not_started'
      ? 'peer_fundraiser_not_started'
      : 'peer_fundraiser_closed',409);
  }
  let participant=null;
  if(b.participantId){
    const [rows]=await connection.execute(`SELECT * FROM ${P} WHERE id=? AND peer_fundraiser_id=? AND is_active=1 LIMIT 1`,[b.participantId,fid]);
    participant=rows[0]; if(!participant) fail('participant_not_found',404);
  }
  const ids=[...new Set(b.items.map(i=>i.packId))],ph=ids.map(()=>'?').join(',');
  const [packs]=await connection.execute(`SELECT * FROM ${PK} WHERE id IN (${ph}) AND peer_fundraiser_id=? AND club_id=? AND is_active=1`,[...ids,fid,fund.club_id]);
  const map=Object.fromEntries(packs.map(p=>[p.id,p])); let total=0;
  const lines=b.items.map(i=>{const p=map[i.packId];if(!p)fail('pack_not_found',404);const q=Math.max(1,Number(i.quantity||1));const t=Number(p.price)*q;total+=t;return{p,q,t};});
  const donationAmount=Math.max(0,Number(b.donationAmount||0));
  if(!Number.isFinite(donationAmount) || donationAmount>10000) fail('invalid_donation_amount');
  const orderId=id(),conn=await connection.getConnection();
  try{
    await conn.beginTransaction();

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
        payment_status,subtotal_amount,total_amount,donation_amount,currency,source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId,fid,fund.club_id,participant?.id||null,participant?.participant_name||null,b.supporterName.trim(),
       b.supporterEmail.trim().toLowerCase(),b.supporterPhone?.trim()||null,b.clubPaymentMethodId||null,
       normalisePaymentCategory(b.paymentMethodCategory,b.paymentProvider),b.paymentProvider||null,b.paymentReference||null,'pending',
       total,total,donationAmount,fund.currency||'EUR',participant?'participant_link':'fundraiser_page']);
    for(const l of lines) await conn.execute(
      `INSERT INTO ${OI}
       (id,order_id,peer_fundraiser_id,club_id,pack_id,pack_name_snapshot,pack_description_snapshot,unit_price,quantity,line_total)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id(),orderId,fid,fund.club_id,l.p.id,l.p.name,l.p.description||null,Number(l.p.price),l.q,l.t]);
    await conn.commit(); return { orderId,totalAmount:total,donationAmount,payableAmount:total+donationAmount,currency:fund.currency||'EUR' };
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}

export async function claimOrder(orderId,b={}) {
  const conn=await connection.getConnection();
  try{
    await conn.beginTransaction();
    const [r]=await conn.execute(
      `UPDATE ${O}
       SET payment_status='claimed',
           payment_reference=COALESCE(?,payment_reference),
           club_payment_method_id=COALESCE(?,club_payment_method_id)
       WHERE id=? AND payment_status='pending'`,
      [b.paymentReference||null,b.clubPaymentMethodId||null,orderId]
    );
    if(!r.affectedRows) fail('order_not_claimable');

    await createPeerDonationForOrder({
      orderId,
      status:'claimed',
      conn,
    });

    await conn.commit();
  }catch(e){
    await conn.rollback();
    throw e;
  }finally{
    conn.release();
  }

  try {
    const { sendPeerOrderConfirmationEmail } = await import('./peerOrderEmailService.js');
    await sendPeerOrderConfirmationEmail(orderId);
  } catch (emailErr) {
    console.error('[PeerCore] ⚠️ Order confirmation email failed (non-fatal):', emailErr.message);
  }

  return { orderId };
}

export async function getPublicOrderSummary(orderId) {
  const [orderRows]=await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`,[orderId]);
  const order=orderRows[0]; if(!order) fail('order_not_found',404);

  const [itemRows]=await connection.execute(
    `SELECT pack_name_snapshot,quantity,line_total FROM ${OI} WHERE order_id=? ORDER BY created_at`,
    [orderId]
  );

  const E=`${TABLE_PREFIX}peer_entries`;
  const [entryRows]=await connection.execute(
    `SELECT
       e.id,
       e.entry_type,
       e.status,
       e.entry_code,
       e.join_url,
       e.room_id,
       e.linked_ticket_id,
       e.metadata_json,
       t.ticket_type_id,
       t.ticket_type_name
     FROM ${E} e
     LEFT JOIN ${TABLE_PREFIX}quiz_tickets t
       ON t.ticket_id=e.linked_ticket_id
     WHERE e.order_id=?
     ORDER BY e.created_at`,
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
      donationAmount: Number(order.donation_amount||0),
      payableAmount: Number(order.total_amount)+Number(order.donation_amount||0),
      currency: order.currency,
      fulfilmentStatus:
        parseJson(order.metadata_json,{}).fulfilmentStatus ||
        (order.payment_status==='confirmed' ? 'pending' : 'not_started'),
      fulfilmentError:
        parseJson(order.metadata_json,{}).fulfilmentError || null,
      allocationStatus:
        parseJson(order.metadata_json,{}).allocationStatus || 'pending',
      allocationCheck:
        parseJson(order.metadata_json,{}).allocationCheck || null,
      items: itemRows.map(i=>({
        packName: i.pack_name_snapshot,
        quantity: Number(i.quantity),
        lineTotal: Number(i.line_total),
      })),
    },
    entries: entryRows.map(entry=>{
      const metadata=parseJson(entry.metadata_json,{});
      const label=
        entry.ticket_type_name ||
        metadata.ticketTypeName ||
        (entry.entry_type==='game_entry'
          ? 'Quiz Entry + All Extras'
          : entry.entry_type==='elimination_entry'
            ? 'Elimination Entry'
            : entry.entry_type==='event_ticket'
              ? 'Event Ticket'
              : entry.entry_type==='puzzle_entry'
                ? 'Puzzle Drop'
                : 'Entry');

      return {
        ...entry,
        displayLabel:label,
        expansionError:metadata.expansionError||null,
      };
    }),
  };
}
