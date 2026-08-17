import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import {
  createTicketForPeerEntry,
  sendPeerEntryTicketEmail,
} from './peerTicketBridgeService.js';
import { createPuzzleAccessForPeerEntry } from './peerPuzzleAccessService.js';

const O=`${TABLE_PREFIX}peer_orders`, OI=`${TABLE_PREFIX}peer_order_items`, PI=`${TABLE_PREFIX}peer_pack_items`;
const E=`${TABLE_PREFIX}peer_entries`, R=`${TABLE_PREFIX}web2_quiz_rooms`;
const T=`${TABLE_PREFIX}quiz_tickets`;

const parseJson=(v,f={})=>{if(!v)return f;if(typeof v==='object')return v;try{return JSON.parse(v)}catch{return f}};

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

export async function expandPeerOrder(orderId) {
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
    if(!order){ await conn.rollback(); throw new Error('peer_order_not_found'); }
    if(order.payment_status!=='confirmed'){ await conn.rollback(); throw new Error('peer_order_not_confirmed'); }

    // ── Fix 1: alias e.id and explicitly select e.order_item_id ─────────
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

    if(existingEntries.length){
      for(const existing of existingEntries){
        if(existing.status!=='pending_payment') continue;

        const entryMetadata=parseJson(existing.metadata_json,{});
        // ── Fix 2: use entry_id not id (pi.* overwrites id) ─────────────
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

      // Reload pack metadata explicitly so a retry always has the
      // original option snapshot. pi.* in the SELECT above can have
      // metadata_json collide with e.metadata_json in some MySQL drivers.
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

      // ── Fix 3: recalculate apportioned fees from order items ──────────
      // Capacity reservation entries are created before payment so
      // apportionedFee is never written to metadata_json at reservation
      // time. Recalculate here using the same apportionAndRoomTypes logic
      // as the non-reservation path so bundle discounts are correctly
      // split at confirmation time.
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
      // ── End Fix 3 ─────────────────────────────────────────────────────

      await conn.commit();

      if(!created.length){
        return {duplicate:true,createdCount:0};
      }

    } else {
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

        console.log('[ExpandPeerOrder] updating ticket fee:', {
  entryId:          x.entryId,
  existingTicketId,
  fee:              x.fee,
});

        if(entryRows[0]?.linked_ticket_id){
          const existingTicketId = entryRows[0].linked_ticket_id;

          // Correct ticket fee to apportioned amount.
          // Capacity reservation tickets are created at the room's full
          // entry_fee before payment. At confirmation we correct to the
          // pro-rata share of the actual pack price paid.
          // For single-pack purchases where fee === entry_fee this is a no-op.
          await connection.execute(
            `UPDATE ${T}
             SET entry_fee    = ?,
                 total_amount = ? + extras_total,
                 updated_at   = UTC_TIMESTAMP()
             WHERE ticket_id  = ?`,
            [x.fee, x.fee, existingTicketId],
          );

          // Correct the ledger entry to match.
          await connection.execute(
            `UPDATE ${TABLE_PREFIX}quiz_payment_ledger
             SET amount     = ?,
                 updated_at = UTC_TIMESTAMP()
             WHERE ticket_id  = ?
               AND ledger_type = 'entry_fee'`,
            [x.fee, existingTicketId],
          );

          await connection.execute(
            `UPDATE ${E}
             SET status='confirmed',
                 confirmed_at=COALESCE(confirmed_at, UTC_TIMESTAMP())
             WHERE id=?`,
            [x.entryId],
          );

          await sendPeerEntryTicketEmail(x.entryId);

        } else {
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

  return {createdCount:created.length};
}