import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import {
  createTicketForPeerEntry,
  sendPeerEntryTicketEmail,
} from './peerTicketBridgeService.js';
import { createPuzzleAccessForPeerEntry } from './peerPuzzleAccessService.js';
import { createExpectedPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';

const O=`${TABLE_PREFIX}peer_orders`, OI=`${TABLE_PREFIX}peer_order_items`, PI=`${TABLE_PREFIX}peer_pack_items`;
const E=`${TABLE_PREFIX}peer_entries`, R=`${TABLE_PREFIX}web2_quiz_rooms`;
const T=`${TABLE_PREFIX}quiz_tickets`;
const L=`${TABLE_PREFIX}quiz_payment_ledger`;

const parseJson=(v,f={})=>{if(!v)return f;if(typeof v==='object')return v;try{return JSON.parse(v)}catch{return f}};
const paymentMethod=cat=>({stripe:'stripe',crypto:'crypto',instant_payment:'instant_payment',bank_transfer:'instant_payment',cash_to_participant:'cash',cash:'cash',card:'card',card_tap:'card_tap'}[cat]||'other');
const paymentSource=cat=>cat==='stripe'?'webhook_auto':cat==='crypto'?'onchain_auto':'admin_assigned';

async function apportionAndRoomTypes(items, packPrice) {
  const ids=[...new Set(items.map(i=>i.target_room_id))],ph=ids.map(()=>'?').join(',');
  const [rows]=await connection.execute(
    `SELECT room_id,game_type FROM ${R} WHERE room_id IN (${ph})`,
    ids
  );

  const gameTypeBy=Object.fromEntries(rows.map(row=>[row.room_id,row.game_type||null]));
  const refs=items.map(item=>{
    const metadata=parseJson(item.metadata_json,{});
    const referencePrice=Number(metadata.referencePrice ?? metadata.configuredPrice ?? 0);
    return Number.isFinite(referencePrice)&&referencePrice>0
      ? referencePrice * Math.max(1,Number(item.quantity||1))
      : 0;
  });

  const total=refs.reduce((sum,value)=>sum+value,0);
  const price=Number(packPrice||0);
  const feeMap=new Map();
  let used=0;

  items.forEach((item,index)=>{
    let fee;
    if(items.length===1 || index===items.length-1){
      fee=Number((price-used).toFixed(2));
    } else {
      fee=total>0
        ? Number((price*(refs[index]/total)).toFixed(2))
        : Number((price/items.length).toFixed(2));
      used+=fee;
    }
    feeMap.set(item.id,fee);
  });

  return {feeMap,gameTypeBy};
}

function correctEntryType(originalItemType, roomGameType) {
  if (roomGameType === 'quiz') return 'game_entry';
  if (roomGameType === 'elimination') return 'elimination_entry';
  if (roomGameType === 'ticketed_event') return 'event_ticket';
  if (roomGameType === 'puzzle_drop') return 'puzzle_entry';
  return originalItemType;
}

/**
 * Calculate the apportioned entry fee and extras breakdown for a quiz room.
 * Mirrors the same logic in createTicketForPeerEntry so both the fresh-ticket
 * path and the capacity-reservation (existingTicketId) path produce identical numbers.
 */
function calcQuizExtras(fee, packItemMetadata, cfg) {
  const configuredEntryFee = Number(
    packItemMetadata.entryFee ?? cfg.entryFee ?? 0,
  );

  const configuredExtras = Array.isArray(packItemMetadata.includedExtras)
    ? packItemMetadata.includedExtras
    : Object.entries(cfg.fundraisingOptions || {})
        .filter(([, enabled]) => enabled === true)
        .map(([extraId]) => ({
          extraId,
          price: Number(cfg.fundraisingPrices?.[extraId] || 0),
        }))
        .filter(extra => extra.price > 0);

  const configuredExtrasTotal = configuredExtras.reduce(
    (sum, extra) => sum + Number(extra.price || 0), 0,
  );
  const configuredTotal = configuredEntryFee + configuredExtrasTotal;
  const allocationRatio = configuredTotal > 0 ? fee / configuredTotal : 1;

  const entryFee = Number((configuredEntryFee * allocationRatio).toFixed(2));

  let allocatedExtrasUsed = 0;
  const extras = configuredExtras.map((extra, index) => {
    const price = index === configuredExtras.length - 1
      ? Number((fee - entryFee - allocatedExtrasUsed).toFixed(2))
      : Number((Number(extra.price || 0) * allocationRatio).toFixed(2));
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

  const extrasTotal = Number(
    extras.reduce((sum, extra) => sum + extra.price, 0).toFixed(2),
  );

  return { entryFee, extras, extrasTotal };
}

export async function expandPeerOrder(orderId) {
  console.log('[ExpandPeerOrder] Starting:', { orderId });
  const conn=await connection.getConnection();
  const created=[];
  let order;

  try{
    await conn.beginTransaction();

    const [orders]=await conn.execute(
      `SELECT * FROM ${O} WHERE id=? LIMIT 1 FOR UPDATE`,
      [orderId],
    );
    order=orders[0];
    if(!order){
      console.error('[ExpandPeerOrder] Order not found:', { orderId });
      await conn.rollback();
      throw new Error('peer_order_not_found');
    }
    if(order.payment_status!=='confirmed'){
      console.error('[ExpandPeerOrder] Order not confirmed:', { orderId, paymentStatus: order.payment_status });
      await conn.rollback();
      throw new Error('peer_order_not_confirmed');
    }

    console.log('[ExpandPeerOrder] Order found:', {
      orderId,
      paymentStatus: order.payment_status,
      clubId: order.club_id,
      supporterEmail: order.supporter_email,
    });

    const [existingEntries]=await conn.execute(
      `SELECT
         e.id            AS entry_id,
         e.order_item_id,
         e.entry_type,
         e.status,
         e.pack_item_id,
         e.metadata_json,
         pi.*
       FROM ${E} e
       JOIN ${PI} pi ON pi.id=e.pack_item_id
       WHERE e.order_id=?
         AND e.status NOT IN ('cancelled','refunded')
       ORDER BY e.created_at`,
      [orderId],
    );

    console.log('[ExpandPeerOrder] Existing entries found:', {
      orderId,
      count: existingEntries.length,
      statuses: existingEntries.map(e => ({ entryId: e.entry_id, status: e.status, entryType: e.entry_type })),
    });

    if(existingEntries.length){
      // Process existing reserved entries (ticket-based items)
      for(const existing of existingEntries){
        if(existing.status!=='pending_payment') continue;

        const entryMetadata=parseJson(existing.metadata_json,{});
        created.push({
          entryId:          existing.entry_id,
          orderItemId:      existing.order_item_id,
          packItem:         existing,
          fee:              Number(entryMetadata.apportionedFee||0),
          correctedType:    existing.entry_type,
          packItemMetadata: parseJson(
            existing.metadata_json_pack_item ?? existing.metadata_json, {}
          ),
        });
      }

      // Reload pack metadata so a retry always has the original option snapshot.
      for(const item of created){
        const [packRows]=await conn.execute(
          `SELECT * FROM ${PI} WHERE id=? LIMIT 1`,
          [item.packItem.id || item.packItem.pack_item_id],
        );
        const packItem=packRows[0];
        if(packItem){
          item.packItem=packItem;
          item.packItemMetadata=parseJson(packItem.metadata_json,{});
        }
      }

      // Recalculate apportioned fees from order items so bundle discounts
      // are correctly split at confirmation time.
      const byOrderItemId = new Map();
      for(const item of created){
        const oiId = item.orderItemId;
        if(!oiId) continue;
        if(!byOrderItemId.has(oiId)) byOrderItemId.set(oiId,[]);
        byOrderItemId.get(oiId).push(item);
      }

      for(const [oiId, items] of byOrderItemId){
        const [oiRows] = await conn.execute(
          `SELECT * FROM ${OI} WHERE id=? LIMIT 1`,
          [oiId],
        );
        const oi = oiRows[0];
        if(!oi) continue;

        const packItems = items.map(item => item.packItem);
        const { feeMap } = await apportionAndRoomTypes(
          packItems,
          Number(oi.unit_price),
        );
        for(const item of items){
          item.fee = feeMap.get(item.packItem.id) ?? item.fee;
        }
      }

      console.log('[ExpandPeerOrder] created items after fee recalc:',
        created.map(item => ({
          entryId:     item.entryId,
          orderItemId: item.orderItemId,
          fee:         item.fee,
          packItemId:  item.packItem?.id,
        }))
      );

      // ── Find pack items with no entry yet (e.g. puzzle items skipped by
      // reservation) and create them fresh so mixed bundles are fully handled.
      const existingPackItemIds = new Set(
        existingEntries.map(e => e.pack_item_id),
      );

      const [orderItems] = await conn.execute(
        `SELECT * FROM ${OI} WHERE order_id=? ORDER BY created_at`,
        [orderId],
      );

      for(const oi of orderItems){
        const [packItems] = await conn.execute(
          `SELECT * FROM ${PI} WHERE pack_id=? ORDER BY created_at`,
          [oi.pack_id],
        );
        const { feeMap, gameTypeBy } = await apportionAndRoomTypes(
          packItems, Number(oi.unit_price),
        );

        for(let orderQty=0; orderQty<Number(oi.quantity); orderQty++){
          for(const pi of packItems){
            if(existingPackItemIds.has(pi.id)) continue; // already handled above

            const correctedType = correctEntryType(pi.item_type, gameTypeBy[pi.target_room_id]);

            console.log('[ExpandPeerOrder] Creating missing entry for pack item:', {
              packItemId: pi.id,
              itemType: pi.item_type,
              correctedType,
              roomId: pi.target_room_id,
              fee: feeMap.get(pi.id),
            });

            for(let q=0; q<Number(pi.quantity); q++){
              const entryId = nanoid(21);
              await conn.execute(
                `INSERT INTO ${E}
                 (id,peer_fundraiser_id,club_id,room_id,order_id,order_item_id,pack_id,pack_item_id,
                  order_quantity_index,pack_item_quantity_index,
                  participant_id,supporter_name,supporter_email,entry_type,status,metadata_json)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending_payment',?)`,
                [
                  entryId, order.peer_fundraiser_id, order.club_id, pi.target_room_id,
                  order.id, oi.id, oi.pack_id, pi.id,
                  orderQty, q,
                  order.participant_id, order.supporter_name, order.supporter_email, correctedType,
                  JSON.stringify({ apportionedFee: feeMap.get(pi.id) }),
                ],
              );
              created.push({
                entryId,
                orderItemId:      oi.id,
                packItem:         pi,
                fee:              feeMap.get(pi.id),
                correctedType,
                packItemMetadata: parseJson(pi.metadata_json, {}),
              });
            }
          }
        }
      }

      await conn.commit();

      if(!created.length){
        return {duplicate:true,createdCount:0};
      }

    } else {
      // No existing entries at all — fresh path (crypto, cash without reservation)
      const [orderItems]=await conn.execute(
        `SELECT * FROM ${OI} WHERE order_id=? ORDER BY created_at`,
        [orderId],
      );

      for(const oi of orderItems){
        const [packItems]=await conn.execute(
          `SELECT * FROM ${PI} WHERE pack_id=? ORDER BY created_at`,
          [oi.pack_id],
        );
        const { feeMap, gameTypeBy } = await apportionAndRoomTypes(
          packItems,
          Number(oi.unit_price),
        );
        for(let orderQty=0;orderQty<Number(oi.quantity);orderQty++){
          for(const pi of packItems){
            const correctedType = correctEntryType(pi.item_type, gameTypeBy[pi.target_room_id]);
            for(let q=0;q<Number(pi.quantity);q++){
              const entryId=nanoid(21);
              await conn.execute(
                `INSERT INTO ${E}
                 (id,peer_fundraiser_id,club_id,room_id,order_id,order_item_id,pack_id,pack_item_id,
                  order_quantity_index,pack_item_quantity_index,
                  participant_id,supporter_name,supporter_email,entry_type,status,metadata_json)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending_payment',?)`,
                [
                  entryId,order.peer_fundraiser_id,order.club_id,pi.target_room_id,
                  order.id,oi.id,oi.pack_id,pi.id,
                  orderQty,q,
                  order.participant_id,order.supporter_name,order.supporter_email,correctedType,
                  JSON.stringify({
                    apportionedFee: feeMap.get(pi.id),
                    originalItemType: pi.item_type !== correctedType ? pi.item_type : undefined,
                  }),
                ],
              );
              created.push({
                entryId,
                orderItemId:      oi.id,
                packItem:         pi,
                fee:              feeMap.get(pi.id),
                correctedType,
                packItemMetadata: parseJson(pi.metadata_json,{}),
              });
            }
          }
        }
      }
      await conn.commit();
    }
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}

  const failures=[];

  for(const x of created){
    const itemType=x.correctedType;

    try {
      if(
        itemType==='game_entry' ||
        itemType==='elimination_entry' ||
        itemType==='event_ticket'
      ){
        const [entryRows]=await connection.execute(
          `SELECT linked_ticket_id FROM ${E} WHERE id=? LIMIT 1`,
          [x.entryId],
        );

        if(entryRows[0]?.linked_ticket_id){
          const existingTicketId = entryRows[0].linked_ticket_id;

          // Fetch the ticket and room so we can recalculate extras correctly
          const [[ticketRow]] = await connection.execute(
            `SELECT t.*, r.game_type, r.config_json
             FROM ${T} t
             JOIN ${R} r ON r.room_id = t.room_id
             WHERE t.ticket_id = ?
             LIMIT 1`,
            [existingTicketId],
          );

          const gameType = ticketRow?.game_type;
          const cfg = parseJson(ticketRow?.config_json, {});
          const fee = x.fee;

          let entryFee = fee;
          let extras = [];
          let extrasTotal = 0;

          if (gameType === 'quiz') {
            ({ entryFee, extras, extrasTotal } = calcQuizExtras(
              fee, x.packItemMetadata, cfg,
            ));
          }
          // elimination and ticketed_event: full fee goes to entry_fee, no extras split

          console.log('[ExpandPeerOrder] correcting existing ticket fee:', {
            entryId: x.entryId,
            existingTicketId,
            gameType,
            fee,
            entryFee,
            extrasTotal,
            extrasCount: extras.length,
          });

          // Correct ticket row — entry_fee, extras, extras_total, total_amount
          await connection.execute(
            `UPDATE ${T}
             SET entry_fee    = ?,
                 extras       = ?,
                 extras_total = ?,
                 total_amount = ?,
                 updated_at   = UTC_TIMESTAMP()
             WHERE ticket_id  = ?`,
            [entryFee, JSON.stringify(extras), extrasTotal, fee, existingTicketId],
          );

          // Correct the entry_fee ledger row
          await connection.execute(
            `UPDATE ${L}
             SET amount     = ?,
                 updated_at = UTC_TIMESTAMP()
             WHERE ticket_id   = ?
               AND ledger_type = 'entry_fee'`,
            [entryFee, existingTicketId],
          );

          // Write extras ledger rows — skip if they already exist (idempotent retry safety)
          const [existingExtrasLedger] = await connection.execute(
            `SELECT id FROM ${L}
             WHERE ticket_id   = ?
               AND ledger_type = 'extra_purchase'
             LIMIT 1`,
            [existingTicketId],
          );

          if (!existingExtrasLedger.length) {
            for (const extra of extras) {
              if (extra.price <= 0) continue;
              await createExpectedPayment({
                roomId:               x.packItem.target_room_id,
                clubId:               order.club_id,
                playerId:             `ticket_${existingTicketId}`,
                playerName:           order.supporter_name,
                ledgerType:           'extra_purchase',
                amount:               extra.price,
                currency:             order.currency,
                paymentMethod:        paymentMethod(order.payment_method_category),
                paymentSource:        paymentSource(order.payment_method_category),
                clubPaymentMethodId:  order.club_payment_method_id || null,
                paymentReference:     order.payment_reference || `peer_order_${order.id}`,
                externalTransactionId: order.external_transaction_id || null,
                status:               'confirmed',
                confirmedAt:          new Date(),
                confirmedBy:          paymentSource(order.payment_method_category),
                confirmedByName:      order.payment_method_category === 'stripe' ? 'Stripe'
                                      : order.payment_method_category === 'crypto' ? 'Solana'
                                      : 'Club Admin',
                confirmedByRole:      'system',
                ticketId:             existingTicketId,
                extraId:              extra.extraId,
                extraMetadata: {
                  ...extra,
                  peerFundraiserId: order.peer_fundraiser_id,
                  peerOrderId:      order.id,
                  peerEntryId:      x.entryId,
                },
              });
            }
          }

          // Confirm the entry
          await connection.execute(
            `UPDATE ${E}
             SET status       = 'confirmed',
                 confirmed_at = COALESCE(confirmed_at, UTC_TIMESTAMP())
             WHERE id = ?`,
            [x.entryId],
          );

          await sendPeerEntryTicketEmail(x.entryId);

          console.log('[ExpandPeerOrder] Existing ticket processed successfully:', {
            entryId: x.entryId,
            existingTicketId,
            gameType,
            entryFee,
            extrasCount: extras.length,
            extrasTotal,
          });

        } else {
          console.log('[ExpandPeerOrder] No existing ticket — creating fresh:', {
            entryId: x.entryId,
            itemType,
            fee: x.fee,
            roomId: x.packItem.target_room_id,
          });
          await createTicketForPeerEntry(
            x.entryId,
            {
              order,
              packItem:         x.packItem,
              packItemMetadata: x.packItemMetadata,
              apportionedFee:   x.fee,
              clubPaymentMethodId: order.club_payment_method_id,
            },
          );
        }
      } else if(itemType==='puzzle_entry'){
        console.log('[ExpandPeerOrder] Creating puzzle access:', {
          entryId: x.entryId,
          fee: x.fee,
          roomId: x.packItem.target_room_id,
        });
        await createPuzzleAccessForPeerEntry(
          x.entryId,
          {
            order,
            packItem:         x.packItem,
            packItemMetadata: x.packItemMetadata,
            apportionedFee:   x.fee,
            clubPaymentMethodId: order.club_payment_method_id,
          },
        );
      } else {
        await connection.execute(
          `UPDATE ${E}
           SET status='confirmed',
               entry_code=?,
               confirmed_at=UTC_TIMESTAMP()
           WHERE id=?`,
          [
            `PE-${nanoid(8).toUpperCase()}`,
            x.entryId,
          ],
        );
      }

      await connection.execute(
        `UPDATE ${E}
         SET metadata_json=JSON_REMOVE(
           COALESCE(metadata_json,'{}'),
           '$.expansionError',
           '$.expansionFailedAt'
         )
         WHERE id=?`,
        [x.entryId],
      );

    } catch (error) {
      failures.push({
        entryId: x.entryId,
        itemType,
        message: error.message,
      });

      await connection.execute(
        `UPDATE ${E}
         SET metadata_json=JSON_SET(
           COALESCE(metadata_json,'{}'),
           '$.expansionError', ?,
           '$.expansionFailedAt', UTC_TIMESTAMP()
         )
         WHERE id=?`,
        [error.message, x.entryId],
      );
    }
  }

  if(failures.length){
    const error=new Error(
      `peer_fulfilment_failed:${failures
        .map(failure=>`${failure.itemType}:${failure.message}`)
        .join('|')}`
    );
    error.failures=failures;
    throw error;
  }

  console.log('[ExpandPeerOrder] Complete:', { orderId, createdCount: created.length });
  return {createdCount:created.length};
}