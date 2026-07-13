import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { createTicketForPeerEntry } from './peerTicketBridgeService.js';
import { createPuzzleAccessForPeerEntry } from './peerPuzzleAccessService.js';

const O=`${TABLE_PREFIX}peer_orders`, OI=`${TABLE_PREFIX}peer_order_items`, PI=`${TABLE_PREFIX}peer_pack_items`;
const E=`${TABLE_PREFIX}peer_entries`, R=`${TABLE_PREFIX}web2_quiz_rooms`;
const parseJson=(v,f={})=>{if(!v)return f;if(typeof v==='object')return v;try{return JSON.parse(v)}catch{return f}};

async function apportion(items, packPrice) {
  if(items.length===1) return new Map([[items[0].id,Number(packPrice)]]);
  const ids=[...new Set(items.map(i=>i.target_room_id))],ph=ids.map(()=>'?').join(',');
  const [rows]=await connection.execute(`SELECT room_id,config_json FROM ${R} WHERE room_id IN (${ph})`,ids);
  const feeBy={}; for(const row of rows){const n=Number(parseJson(row.config_json,{}).entryFee||0);feeBy[row.room_id]=Number.isFinite(n)&&n>0?n:0;}
  const refs=items.map(i=>feeBy[i.target_room_id]||0),total=refs.reduce((a,b)=>a+b,0),price=Number(packPrice),map=new Map();
  let used=0;
  items.forEach((item,index)=>{let fee;if(index===items.length-1)fee=Number((price-used).toFixed(2));else{fee=total>0?Number((price*(refs[index]/total)).toFixed(2)):Number((price/items.length).toFixed(2));used+=fee;}map.set(item.id,fee);});
  return map;
}

export async function expandPeerOrder(orderId) {
  const [orders]=await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`,[orderId]);
  const order=orders[0]; if(!order)throw new Error('peer_order_not_found');
  if(order.payment_status!=='confirmed')throw new Error('peer_order_not_confirmed');
  const [count]=await connection.execute(`SELECT COUNT(*) cnt FROM ${E} WHERE order_id=? AND status NOT IN ('cancelled','refunded')`,[orderId]);
  if(Number(count[0]?.cnt||0)>0)return {duplicate:true};
  const [orderItems]=await connection.execute(`SELECT * FROM ${OI} WHERE order_id=? ORDER BY created_at`,[orderId]);
  const conn=await connection.getConnection();
  const created=[];
  try{
    await conn.beginTransaction();
    for(const oi of orderItems){
      const [packItems]=await conn.execute(`SELECT * FROM ${PI} WHERE pack_id=? ORDER BY created_at`,[oi.pack_id]);
      const fees=await apportion(packItems,Number(oi.unit_price));
      for(let orderQty=0;orderQty<Number(oi.quantity);orderQty++){
        for(const pi of packItems){
          for(let q=0;q<Number(pi.quantity);q++){
            const entryId=nanoid(21);
            await conn.execute(
              `INSERT INTO ${E}
               (id,peer_fundraiser_id,club_id,room_id,order_id,order_item_id,pack_id,pack_item_id,
                participant_id,supporter_name,supporter_email,entry_type,status,metadata_json)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending_payment',?)`,
              [entryId,order.peer_fundraiser_id,order.club_id,pi.target_room_id,order.id,oi.id,oi.pack_id,pi.id,
               order.participant_id,order.supporter_name,order.supporter_email,pi.item_type,
               JSON.stringify({orderQuantityIndex:orderQty,packItemQuantityIndex:q,apportionedFee:fees.get(pi.id)})]
            );
            created.push({entryId,packItem:pi,fee:fees.get(pi.id)});
          }
        }
      }
    }
    await conn.commit();
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
  for(const x of created){
    const itemType = x.packItem.item_type;
    try {
      // NOTE: event_ticket used to be included in this list alongside real
      // quiz/elimination types — it was being routed into createTicketForPeerEntry,
      // which looks up a room's config_json and writes a quiz_tickets row for
      // something that was never meant to be a quiz ticket. Fixed: only the
      // types that actually map to a quiz/elimination room go through the
      // ticket bridge.
      if(['quiz_team_ticket','quiz_individual_ticket','elimination_entry','game_entry'].includes(itemType)){
        await createTicketForPeerEntry(x.entryId,{order,packItem:x.packItem,apportionedFee:x.fee,clubPaymentMethodId:order.club_payment_method_id});
      } else if(itemType==='puzzle_entry'){
        // Previously fell through to the generic branch below — no real
        // puzzle access was ever created for a puzzle pack item.
        await createPuzzleAccessForPeerEntry(x.entryId,{order,packItem:x.packItem});
      } else {
        // event_ticket / custom — generic entry code, no downstream ticket/puzzle record.
        await connection.execute(`UPDATE ${E} SET status='confirmed',entry_code=?,confirmed_at=UTC_TIMESTAMP() WHERE id=?`,[`PE-${nanoid(8).toUpperCase()}`,x.entryId]);
      }
    } catch (err) {
      // Previously an error here (e.g. a missing room) would throw out of
      // the whole loop, silently abandoning entitlement creation for every
      // remaining item in the bundle. Isolate per-entry, log, and record the
      // failure on the entry itself — matches campaignEntryExpansionService's
      // createDownstreamEntitlement error handling.
      console.error(`[PeerEntryExpansion] ❌ Downstream entitlement failed for entry ${x.entryId} (${itemType}):`, err.message);
      await connection.execute(
        `UPDATE ${E} SET metadata_json=JSON_SET(COALESCE(metadata_json,'{}'), '$.expansionError', ?) WHERE id=?`,
        [err.message, x.entryId]
      );
    }
  }
  return {createdCount:created.length};
}
