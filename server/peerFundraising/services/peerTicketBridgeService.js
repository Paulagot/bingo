import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createExpectedPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';

const E = `${TABLE_PREFIX}peer_entries`;
const T = `${TABLE_PREFIX}quiz_tickets`;
const R = `${TABLE_PREFIX}web2_quiz_rooms`;

const parseJson = (v,f={}) => { if(!v)return f; if(typeof v==='object')return v; try{return JSON.parse(v)}catch{return f} };
const gameTypeFromItemType = itemType => itemType === 'elimination_entry' ? 'elimination' : 'quiz';
const paymentMethod = cat => ({stripe:'stripe',crypto:'crypto',instant_payment:'instant_payment',bank_transfer:'instant_payment',cash_to_participant:'cash',cash:'cash',card:'card',card_tap:'card_tap'}[cat] || 'other');
const paymentSource = cat => cat === 'stripe' ? 'webhook_auto' : cat === 'crypto' ? 'onchain_auto' : 'admin_assigned';


/**
 * Send the ticket email for an already-created peer entry.
 *
 * This is intentionally separate from ticket creation because Pass 6F
 * pre-creates blocked/payment_claimed tickets to reserve capacity before
 * Stripe Checkout opens. Once Stripe confirms, those tickets already exist,
 * so createTicketForPeerEntry() is skipped and cannot be relied on to send
 * the email.
 *
 * The metadata lock prevents duplicate delivery when Stripe sends both
 * checkout.session.completed and payment_intent.succeeded.
 */
export async function sendPeerEntryTicketEmail(
  entryId,
  { forceRetry = false } = {},
) {
  console.log('[PeerTicketBridge] Ticket email requested:',{entryId,forceRetry});
  const conn = await connection.getConnection();
  let entry;
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(
      `SELECT
         id,
         linked_ticket_id,
         status,
         metadata_json
       FROM ${E}
       WHERE id=?
       LIMIT 1
       FOR UPDATE`,
      [entryId],
    );

    entry = rows[0];
    if (!entry) {
      await conn.rollback();
      throw new Error('peer_entry_not_found');
    }
    if (!entry.linked_ticket_id) {
      await conn.rollback();
      return {
        entryId,
        sent: false,
        skipped: true,
        reason: 'no_linked_ticket',
      };
    }
    if (entry.status !== 'confirmed') {
      await conn.rollback();
      return {
        entryId,
        sent: false,
        skipped: true,
        reason: 'entry_not_confirmed',
      };
    }

    const metadata = parseJson(entry.metadata_json, {});
    if (metadata.ticketEmailSentAt && !forceRetry) {
      await conn.rollback();
      return {
        entryId,
        ticketId: entry.linked_ticket_id,
        sent: false,
        skipped: true,
        reason: 'already_sent',
      };
    }

    // A second Stripe event can arrive while the first email is in flight.
    // Treat a recent sending marker as an active lock. A retry action may
    // override a stale/failed marker.
    const sendingAt = metadata.ticketEmailSendingAt
      ? new Date(metadata.ticketEmailSendingAt).getTime()
      : 0;
    const sendingRecently =
      Number.isFinite(sendingAt) &&
      sendingAt > Date.now() - (5 * 60 * 1000);

    if (sendingRecently && !forceRetry) {
      await conn.rollback();
      return {
        entryId,
        ticketId: entry.linked_ticket_id,
        sent: false,
        skipped: true,
        reason: 'send_in_progress',
      };
    }

    await conn.execute(
      `UPDATE ${E}
       SET metadata_json=JSON_SET(
         COALESCE(metadata_json,'{}'),
         '$.ticketEmailSendingAt', UTC_TIMESTAMP(),
         '$.ticketEmailError', NULL,
         '$.ticketEmailFailedAt', NULL
       )
       WHERE id=?`,
      [entryId],
    );

    await conn.commit();
  } catch (error) {
    try { await conn.rollback(); } catch {}
    throw error;
  } finally {
    conn.release();
  }

  const ticketId = entry.linked_ticket_id;

  try {
    const {
      getTicketWithRoomConfig,
      sendTicketConfirmationEmail,
    } = await import('../../utils/ticketEmail.js');

    const ticketRow = await getTicketWithRoomConfig(ticketId);
    if (!ticketRow) {
      throw new Error('linked_ticket_not_found');
    }

    const roomConfigForEmail = parseJson(
      ticketRow.config_json,
      {},
    );
    const gameType = ticketRow.game_type || 'quiz';

    const emailDetails = {
      ticketId,
      purchaserEmail: ticketRow.purchaser_email,
      purchaserName: ticketRow.purchaser_name,
      playerName: ticketRow.player_name,
      entryFee: ticketRow.entry_fee,
      extrasTotal: ticketRow.extras_total,
      totalAmount: ticketRow.total_amount,
      currency: ticketRow.currency,
      currencySymbol:
        roomConfigForEmail.currencySymbol || '€',
      clubId: ticketRow.club_id,
      clubName: ticketRow.club_name || null,
      eventTitle:
        roomConfigForEmail.eventTitle ||
        roomConfigForEmail.eventName ||
        null,
      eventLocation:
        roomConfigForEmail.eventLocation ||
        roomConfigForEmail.venue ||
        null,
      eventDateTime:
        roomConfigForEmail.eventDateTime ||
        roomConfigForEmail.startsAt ||
        null,
      timeZone:
        roomConfigForEmail.timeZone ||
        ticketRow.time_zone ||
        null,
    };

    if (gameType === 'ticketed_event') {
      const {
        sendTicketedEventConfirmationEmail,
      } = await import('../../utils/ticketedEventEmail.js');

      await sendTicketedEventConfirmationEmail(
        emailDetails,
      );
    } else {
      await sendTicketConfirmationEmail({
        ...emailDetails,
        extras: parseJson(ticketRow.extras, []),
        hostName:
          roomConfigForEmail.hostName || null,
        gameType,
      });
    }

    await connection.execute(
      `UPDATE ${E}
       SET metadata_json=JSON_SET(
         COALESCE(metadata_json,'{}'),
         '$.ticketEmailSentAt', UTC_TIMESTAMP(),
         '$.ticketEmailSendingAt', NULL,
         '$.ticketEmailError', NULL,
         '$.ticketEmailFailedAt', NULL
       )
       WHERE id=?`,
      [entryId],
    );

    console.log(
      '[PeerTicketBridge] Ticket email sent:',
      { entryId, ticketId, recipient: ticketRow.purchaser_email },
    );

    return {
      entryId,
      ticketId,
      sent: true,
      skipped: false,
    };
  } catch (emailError) {
    await connection.execute(
      `UPDATE ${E}
       SET metadata_json=JSON_SET(
         COALESCE(metadata_json,'{}'),
         '$.ticketEmailSendingAt', NULL,
         '$.ticketEmailError', ?,
         '$.ticketEmailFailedAt', UTC_TIMESTAMP()
       )
       WHERE id=?`,
      [String(emailError.message || emailError), entryId],
    );

    console.error(
      '[PeerTicketBridge] Ticket email failed (non-fatal):',
      {
        entryId,
        ticketId,
        error: emailError.message,
      },
    );

    return {
      entryId,
      ticketId,
      sent: false,
      skipped: false,
      error: emailError.message,
    };
  }
}

/**
 * Retry ticket emails for confirmed entries on one peer order.
 * Used by the existing Retry fulfilment management action.
 */
export async function retryMissingPeerTicketEmails(orderId) {
  const [allRows] = await connection.execute(
    `SELECT id,status,entry_type,linked_ticket_id,room_id,metadata_json
     FROM ${E}
     WHERE order_id=?
     ORDER BY created_at`,
    [orderId],
  );

  console.log('[PeerTicketBridge] Ticket email scan:',{
    orderId,
    totalEntries:allRows.length,
    entries:allRows.map(row=>{
      const metadata=parseJson(row.metadata_json,{});
      return {
        entryId:row.id,
        status:row.status,
        entryType:row.entry_type,
        linkedTicketId:row.linked_ticket_id,
        roomId:row.room_id,
        ticketEmailSentAt:metadata.ticketEmailSentAt||null,
        ticketEmailSendingAt:metadata.ticketEmailSendingAt||null,
        ticketEmailError:metadata.ticketEmailError||null,
      };
    }),
  });

  const rows=allRows.filter(row=>row.status==='confirmed'&&row.linked_ticket_id);
  console.log('[PeerTicketBridge] Eligible ticket email entries:',{orderId,eligibleCount:rows.length,entryIds:rows.map(row=>row.id),ticketIds:rows.map(row=>row.linked_ticket_id)});

  const results = [];
  for (const row of rows) {
    const metadata = parseJson(row.metadata_json, {});
    if (metadata.ticketEmailSentAt) {
      results.push({
        entryId: row.id,
        sent: false,
        skipped: true,
        reason: 'already_sent',
      });
      continue;
    }

    results.push(
      await sendPeerEntryTicketEmail(
        row.id,
        { forceRetry: true },
      ),
    );
  }

  const summary={
    attempted: results.filter(result => !result.skipped).length,
    sent: results.filter(result => result.sent).length,
    failed: results.filter(
      result => !result.sent && !result.skipped,
    ).length,
    skipped: results.filter(result => result.skipped).length,
    results,
  };
  console.log('[PeerTicketBridge] Ticket email scan complete:',{orderId,...summary});
  return summary;
}

export async function createTicketForPeerEntry(entryId, context) {
  const {
    order,
    packItem,
    packItemMetadata = {},
    apportionedFee,
    clubPaymentMethodId,
  } = context;

  const [entryRows] = await connection.execute(
    `SELECT linked_ticket_id,join_url,metadata_json,status
     FROM ${E}
     WHERE id=?
     LIMIT 1`,
    [entryId],
  );
  const existingEntry = entryRows[0];

  if(existingEntry?.linked_ticket_id){
    return {
      ticketId:existingEntry.linked_ticket_id,
      joinUrl:existingEntry.join_url,
      duplicate:true,
    };
  }

  const ticketId = nanoid(12);
  const joinToken = nanoid(16);
  const roomId = packItem.target_room_id;

  const [rooms] = await connection.execute(
    `SELECT config_json,game_type,status
     FROM ${R}
     WHERE room_id=? AND club_id=?
     LIMIT 1`,
    [roomId, order.club_id],
  );

  const room = rooms[0];
  if (!room) throw new Error(`room_not_found:${roomId}`);
  if (['completed', 'cancelled'].includes(room.status)) {
    throw new Error('room_not_available');
  }

  const cfg = parseJson(room.config_json, {});
  const fee = Number(apportionedFee || 0);
  const gameType = room.game_type;

  let entryFee = fee;
  let extras = [];
  let extrasTotal = 0;
  let ticketTypeId = null;
  let ticketTypeName = null;

  if (gameType === 'ticketed_event') {
    ticketTypeId = String(packItemMetadata.ticketTypeId || '').trim();
    if (!ticketTypeId) throw new Error('ticket_type_required');

    const allTypes =
      Array.isArray(cfg.ticketTypes) && cfg.ticketTypes.length
        ? cfg.ticketTypes
        : cfg.entryFee
          ? [{
              id: 'general',
              name: 'General Admission',
              price: String(cfg.entryFee),
              isEnabled: true,
              quantity: null,
              saleEndsAt: null,
            }]
          : [];

    const selectedType = allTypes.find(
      type => String(type.id) === ticketTypeId,
    );

    if (!selectedType || selectedType.isEnabled === false) {
      throw new Error('ticket_type_unavailable');
    }

    if (selectedType.saleEndsAt) {
      const saleEndsAt = new Date(selectedType.saleEndsAt).getTime();
      if (Number.isFinite(saleEndsAt) && saleEndsAt < Date.now()) {
        throw new Error('ticket_type_sale_ended');
      }
    }

    const [[soldRow]] = await connection.execute(
      `SELECT
         COUNT(*) AS total_sold,
         SUM(CASE WHEN ticket_type_id=? THEN 1 ELSE 0 END) AS type_sold
       FROM ${T}
       WHERE room_id=?
         AND payment_status IN ('payment_claimed','payment_confirmed')`,
      [ticketTypeId, roomId],
    );

    const typeSold = Number(soldRow?.type_sold || 0);
    const totalSold = Number(soldRow?.total_sold || 0);
    const typeLimit =
      selectedType.quantity == null
        ? null
        : Number(selectedType.quantity);

    if (
      typeLimit != null &&
      Number.isFinite(typeLimit) &&
      typeSold >= typeLimit
    ) {
      throw new Error('ticket_type_sold_out');
    }

    const venueCapacity = Number(
      cfg.maxCapacity ??
      cfg.venueCapacity ??
      cfg.maxPlayers ??
      0,
    );

    if (
      Number.isFinite(venueCapacity) &&
      venueCapacity > 0 &&
      totalSold >= venueCapacity
    ) {
      throw new Error('event_capacity_reached');
    }

    ticketTypeName = String(
      selectedType.name ||
      packItemMetadata.ticketTypeName ||
      'Event Ticket',
    );

    // The ticket's financial value is its apportioned bundle share.
    // The configured standalone type price remains snapshotted in metadata.
    entryFee = fee;
    extras = [];
    extrasTotal = 0;
  } else if (gameType === 'quiz') {
    const configuredEntryFee = Number(
      packItemMetadata.entryFee ?? cfg.entryFee ?? 0,
    );

    const configuredExtras = Array.isArray(
      packItemMetadata.includedExtras,
    )
      ? packItemMetadata.includedExtras
      : Object.entries(cfg.fundraisingOptions || {})
          .filter(([, enabled]) => enabled === true)
          .map(([extraId]) => ({
            extraId,
            price: Number(
              cfg.fundraisingPrices?.[extraId] || 0,
            ),
          }))
          .filter(extra => extra.price > 0);

    const configuredExtrasTotal = configuredExtras.reduce(
      (sum, extra) => sum + Number(extra.price || 0),
      0,
    );

    const configuredTotal =
      configuredEntryFee + configuredExtrasTotal;

    const allocationRatio =
      configuredTotal > 0 ? fee / configuredTotal : 1;

    entryFee = Number(
      (configuredEntryFee * allocationRatio).toFixed(2),
    );

    let allocatedExtrasUsed = 0;
    extras = configuredExtras.map((extra, index) => {
      const price =
        index === configuredExtras.length - 1
          ? Number(
              (
                fee -
                entryFee -
                allocatedExtrasUsed
              ).toFixed(2),
            )
          : Number(
              (
                Number(extra.price || 0) *
                allocationRatio
              ).toFixed(2),
            );

      allocatedExtrasUsed += price;

      return {
        extraId: extra.extraId,
        label: extra.label || extra.extraId,
        price,
        configuredPrice: Number(extra.price || 0),
        source: 'peer_pack',
        included: true,
      };
    });

    extrasTotal = Number(
      extras
        .reduce((sum, extra) => sum + extra.price, 0)
        .toFixed(2),
    );
  }

  await connection.execute(
    `INSERT INTO ${T}
      (
        ticket_id,room_id,club_id,
        purchaser_name,purchaser_email,purchaser_phone,
        player_name,
        entry_fee,extras,extras_total,total_amount,currency,
        payment_status,payment_method,payment_reference,
        club_payment_method_id,
        redemption_status,join_token,
        ticket_type_id,ticket_type_name,
        confirmed_at,confirmed_by,confirmed_by_name,
        confirmed_by_role,created_at,updated_at
      )
     VALUES (
       ?,?,?,?,?,?,?,
       ?,?,?,?,?,
       'payment_confirmed','peer_pack',?,
       ?,
       'ready',?,
       ?,?,
       UTC_TIMESTAMP(),'system','Peer-to-Peer Pack',
       'system',UTC_TIMESTAMP(),UTC_TIMESTAMP()
     )`,
    [
      ticketId,
      roomId,
      order.club_id,
      order.supporter_name,
      order.supporter_email,
      order.supporter_phone,
      order.supporter_name,
      entryFee,
      JSON.stringify(extras),
      extrasTotal,
      fee,
      order.currency,
      `peer_entry_${entryId}`,
      clubPaymentMethodId || null,
      joinToken,
      ticketTypeId,
      ticketTypeName,
    ],
  );

  const joinUrl = `/tickets/status/${ticketId}`;

  await connection.execute(
    `UPDATE ${E}
     SET status='confirmed',
         entry_code=?,
         ticket_code=?,
         join_url=?,
         linked_ticket_id=?,
         confirmed_at=UTC_TIMESTAMP(),
         metadata_json=JSON_SET(
           COALESCE(metadata_json,'{}'),
           '$.ticketTypeId', ?,
           '$.ticketTypeName', ?,
           '$.configuredTicketPrice', ?
         )
     WHERE id=?`,
    [
      `PE-${nanoid(8).toUpperCase()}`,
      ticketId,
      joinUrl,
      ticketId,
      ticketTypeId,
      ticketTypeName,
      Number(packItemMetadata.referencePrice || 0),
      entryId,
    ],
  );

  const ledgerId = await createExpectedPayment({
    roomId,
    clubId: order.club_id,
    playerId: `ticket_${ticketId}`,
    playerName: order.supporter_name,
    ledgerType: 'entry_fee',
    amount: entryFee,
    currency: order.currency,
    paymentMethod: paymentMethod(
      order.payment_method_category,
    ),
    paymentSource: paymentSource(
      order.payment_method_category,
    ),
    clubPaymentMethodId: clubPaymentMethodId || null,
    paymentReference:
      order.payment_reference ||
      `peer_order_${order.id}`,
    externalTransactionId:
      order.external_transaction_id || null,
    status: 'confirmed',
    confirmedAt: new Date(),
    confirmedBy: paymentSource(
      order.payment_method_category,
    ),
    confirmedByName:
      order.payment_method_category === 'stripe'
        ? 'Stripe'
        : order.payment_method_category === 'crypto'
          ? 'Solana'
          : 'Club Admin',
    confirmedByRole: 'system',
    ticketId,
    extraMetadata: {
      peerFundraiserId: order.peer_fundraiser_id,
      peerOrderId: order.id,
      peerEntryId: entryId,
      ticketTypeId,
      ticketTypeName,
      configuredTicketPrice: Number(
        packItemMetadata.referencePrice || 0,
      ),
      apportionedAmount: fee,
    },
  });

  if (ledgerId) {
    await connection.execute(
      `UPDATE ${T}
       SET ledger_id=?
       WHERE ticket_id=?`,
      [ledgerId, ticketId],
    );
  }

  for (const extra of extras) {
    if (extra.price <= 0) continue;

    await createExpectedPayment({
      roomId,
      clubId: order.club_id,
      playerId: `ticket_${ticketId}`,
      playerName: order.supporter_name,
      ledgerType: 'extra_purchase',
      amount: extra.price,
      currency: order.currency,
      paymentMethod: paymentMethod(
        order.payment_method_category,
      ),
      paymentSource: paymentSource(
        order.payment_method_category,
      ),
      clubPaymentMethodId:
        clubPaymentMethodId || null,
      paymentReference:
        order.payment_reference ||
        `peer_order_${order.id}`,
      externalTransactionId:
        order.external_transaction_id || null,
      status: 'confirmed',
      confirmedAt: new Date(),
      confirmedBy: paymentSource(
        order.payment_method_category,
      ),
      confirmedByName:
        order.payment_method_category === 'stripe'
          ? 'Stripe'
          : order.payment_method_category === 'crypto'
            ? 'Solana'
            : 'Club Admin',
      confirmedByRole: 'system',
      ticketId,
      extraId: extra.extraId,
      extraMetadata: {
        ...extra,
        peerFundraiserId: order.peer_fundraiser_id,
        peerOrderId: order.id,
        peerEntryId: entryId,
      },
    });
  }

  await sendPeerEntryTicketEmail(entryId);

  return {
    ticketId,
    joinToken,
    joinUrl,
    ledgerId,
    ticketTypeId,
    ticketTypeName,
  };
}

// ─── Block / unblock ──────────────────────────────────────────────────────
// Campaign has these (blockTicketForEntry/unblockTicketForEntry); peer had
// no equivalent, which meant a confirmed order — one that already has real
// quiz_tickets rows and a join link out in the world — could never be
// undone. rejectPeerOrder can now call blockTicketForPeerEntry when
// reversing an order that was already confirmed.

export async function blockTicketForPeerEntry(entryId) {
  const [rows] = await connection.execute(
    `SELECT linked_ticket_id FROM ${E} WHERE id=? LIMIT 1`, [entryId]
  );
  const ticketId = rows[0]?.linked_ticket_id;
  if (!ticketId) return;
  await connection.execute(
    `UPDATE ${T} SET redemption_status='blocked' WHERE ticket_id=?`,
    [ticketId]
  );
}

export async function unblockTicketForPeerEntry(entryId) {
  const [rows] = await connection.execute(
    `SELECT linked_ticket_id FROM ${E} WHERE id=? LIMIT 1`, [entryId]
  );
  const ticketId = rows[0]?.linked_ticket_id;
  if (!ticketId) return;
  await connection.execute(
    `UPDATE ${T} SET redemption_status='ready', payment_status='payment_confirmed' WHERE ticket_id=?`,
    [ticketId]
  );
}
