import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createTicketForPeerEntry } from './peerTicketBridgeService.js';
import { createPuzzleAccessForPeerEntry } from './peerPuzzleAccessService.js';

const O=`${TABLE_PREFIX}peer_orders`, OI=`${TABLE_PREFIX}peer_order_items`, PI=`${TABLE_PREFIX}peer_pack_items`;
const E=`${TABLE_PREFIX}peer_entries`, R=`${TABLE_PREFIX}web2_quiz_rooms`;
const parseJson=(v,f={})=>{if(!v)return f;if(typeof v==='object')return v;try{return JSON.parse(v)}catch{return f}};

// Previously only looked up config_json (for entryFee, used in fee
// apportionment) and skipped the room query entirely for single-item
// packs. Now always fetches game_type too, since that's what lets us
// self-heal a pack item whose stored item_type doesn't actually match
// its target room (e.g. a pack item saved as 'quiz_individual_ticket'
// pointing at a room that is actually an elimination room — this exact
// mismatch happened because the pack editor never cross-validated the
// two, and it silently produced wrong join links and wrong button labels
// downstream, since everything trusted the stored item_type instead of
// the room's own real game_type).
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

// Corrects a pack item's stored item_type against its room's actual
// game_type. The room is the source of truth — a pack item's item_type
// is only ever set once, manually, at pack-build time, and nothing
// previously stopped it from being wrong (or drifting out of sync if the
// room's own game_type ever changed after the pack was built).
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
  let order; // hoisted so it's still in scope for the ticket-creation loop below

  try{
    await conn.beginTransaction();

    // Locking the order row here is what actually closes the race that
    // caused "Duplicate entry ... uq_peer_entry_source" and, worse, silently
    // dropped tickets for some items in a bundle. Stripe fires BOTH
    // checkout.session.completed AND payment_intent.succeeded for every
    // Checkout Session payment, and stripeWebhooks.js calls confirmPeerOrder
    // from both — meaning expandPeerOrder could genuinely be invoked twice,
    // nearly simultaneously, for the same order. Previously the "does this
    // order already have entries?" check ran on a plain pooled connection,
    // outside any transaction — two concurrent calls could both see zero
    // entries before either had inserted anything, both proceed to insert,
    // and only the unique constraint stopped the literal duplicate row —
    // but the failing call's WHOLE transaction (including any of ITS OWN
    // non-duplicate inserts for other items in the same bundle) rolled back
    // when it hit that constraint. FOR UPDATE here forces a second
    // concurrent call to wait for the first to fully commit, then correctly
    // see the already-created entries and return {duplicate:true} instead
    // of racing.
    const [orders]=await conn.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1 FOR UPDATE`,[orderId]);
    order=orders[0];
    if(!order){ await conn.rollback(); throw new Error('peer_order_not_found'); }
    if(order.payment_status!=='confirmed'){ await conn.rollback(); throw new Error('peer_order_not_confirmed'); }

    const [count]=await conn.execute(`SELECT COUNT(*) cnt FROM ${E} WHERE order_id=? AND status NOT IN ('cancelled','refunded')`,[orderId]);
    if(Number(count[0]?.cnt||0)>0){ await conn.commit(); return {duplicate:true}; }

    const [orderItems]=await conn.execute(`SELECT * FROM ${OI} WHERE order_id=? ORDER BY created_at`,[orderId]);

    for(const oi of orderItems){
      const [packItems]=await conn.execute(`SELECT * FROM ${PI} WHERE pack_id=? ORDER BY created_at`,[oi.pack_id]);
      const { feeMap, gameTypeBy } = await apportionAndRoomTypes(packItems,Number(oi.unit_price));
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
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending_payment',?)`,
              [entryId,order.peer_fundraiser_id,order.club_id,pi.target_room_id,order.id,oi.id,oi.pack_id,pi.id,
               orderQty,q,
               order.participant_id,order.supporter_name,order.supporter_email,correctedType,
               JSON.stringify({
                 apportionedFee:feeMap.get(pi.id),
                 // Kept for visibility/debugging — shows when a pack was
                 // built with a mismatched item_type that got corrected here.
                 originalItemType: pi.item_type !== correctedType ? pi.item_type : undefined,
               })]
            );
            created.push({entryId,packItem:pi,fee:feeMap.get(pi.id),correctedType,packItemMetadata:parseJson(pi.metadata_json,{})});
          }
        }
      }
    }
    await conn.commit();
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}

  for(const x of created){
    const itemType = x.correctedType;
    try {
      if(['game_entry','elimination_entry','event_ticket'].includes(itemType)){
        await createTicketForPeerEntry(x.entryId,{order,packItem:x.packItem,packItemMetadata:x.packItemMetadata,apportionedFee:x.fee,clubPaymentMethodId:order.club_payment_method_id});
      } else if(itemType==='puzzle_entry'){
        await createPuzzleAccessForPeerEntry(x.entryId,{order,packItem:x.packItem,packItemMetadata:x.packItemMetadata,apportionedFee:x.fee,clubPaymentMethodId:order.club_payment_method_id});
      } else {
        await connection.execute(`UPDATE ${E} SET status='confirmed',entry_code=?,confirmed_at=UTC_TIMESTAMP() WHERE id=?`,[`PE-${nanoid(8).toUpperCase()}`,x.entryId]);
      }
    } catch (err) {
      console.error(`[PeerEntryExpansion] ❌ Downstream entitlement failed for entry ${x.entryId} (${itemType}):`, err.message);
      await connection.execute(
        `UPDATE ${E} SET metadata_json=JSON_SET(COALESCE(metadata_json,'{}'), '$.expansionError', ?) WHERE id=?`,
        [err.message, x.entryId]
      );
    }
  }
  return {createdCount:created.length};
}
