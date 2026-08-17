import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { canPurchaseTickets } from '../../mgtsystem/services/quizCapacityService.js';
import { createExpectedPayment } from '../../mgtsystem/services/quizPaymentLedgerService.js';

const O=`${TABLE_PREFIX}peer_orders`, OI=`${TABLE_PREFIX}peer_order_items`, PI=`${TABLE_PREFIX}peer_pack_items`;
const E=`${TABLE_PREFIX}peer_entries`, T=`${TABLE_PREFIX}quiz_tickets`, R=`${TABLE_PREFIX}web2_quiz_rooms`;
const L=`${TABLE_PREFIX}quiz_payment_ledger`;
const parseJson=(v,f={})=>{if(!v)return f;if(typeof v==='object')return v;try{return JSON.parse(v)}catch{return f}};
const method=cat=>({stripe:'stripe',crypto:'crypto',instant_payment:'instant_payment',bank_transfer:'instant_payment',cash_to_participant:'cash',cash:'cash',card:'card',card_tap:'card_tap'}[cat]||'other');
const corrected=(itemType,gameType)=>gameType==='quiz'?'game_entry':gameType==='elimination'?'elimination_entry':gameType==='ticketed_event'?'event_ticket':itemType;

async function loadItems(orderId,conn){
 const [ois]=await conn.execute(`SELECT * FROM ${OI} WHERE order_id=? ORDER BY created_at`,[orderId]);
 const items=[];
 for(const oi of ois){
  const [pis]=await conn.execute(`SELECT pi.*,r.game_type,r.config_json,r.status room_status FROM ${PI} pi JOIN ${R} r ON r.room_id=pi.target_room_id WHERE pi.pack_id=? ORDER BY pi.created_at`,[oi.pack_id]);
  for(let oq=0;oq<Number(oi.quantity||0);oq++) for(const pi of pis){
   const entryType=corrected(pi.item_type,pi.game_type);
   if(!['game_entry','elimination_entry','event_ticket'].includes(entryType)) continue;
   for(let pq=0;pq<Number(pi.quantity||0);pq++) items.push({oi,pi,oq,pq,entryType,gameType:pi.game_type,config:parseJson(pi.config_json,{}),metadata:parseJson(pi.metadata_json,{})});
  }
 }
 return items;
}

async function ticketTypeCheck(roomId,config,ticketTypeId,conn){
 const types=Array.isArray(config.ticketTypes)&&config.ticketTypes.length?config.ticketTypes:config.entryFee?[{id:'general',name:'General Admission',price:String(config.entryFee),isEnabled:true,quantity:null,saleEndsAt:null}]:[];
 const type=types.find(t=>String(t.id)===String(ticketTypeId));
 if(!type) throw new Error('ticket_type_not_found');
 if(type.isEnabled===false) throw new Error('ticket_type_unavailable');
 if(type.saleEndsAt&&Date.now()>new Date(type.saleEndsAt).getTime()) throw new Error('ticket_type_sale_ended');
 if(type.quantity!=null){
  const [[r]]=await conn.execute(`SELECT COUNT(*) sold FROM ${T} WHERE room_id=? AND ticket_type_id=? AND payment_status IN ('payment_claimed','payment_confirmed')`,[roomId,String(type.id)]);
  if(Number(r?.sold||0)>=Number(type.quantity)) throw new Error('ticket_type_sold_out');
 }
 return {id:String(type.id),name:String(type.name||'Event Ticket')};
}

export async function reservePeerOrderTickets({orderId,paymentCategory,paymentReference=null,clubPaymentMethodId=null}){
 const conn=await connection.getConnection();
 try{
  await conn.beginTransaction();
  const [ors]=await conn.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1 FOR UPDATE`,[orderId]);
  const order=ors[0]; if(!order) throw new Error('peer_order_not_found');
  const [existing]=await conn.execute(`SELECT id FROM ${E} WHERE order_id=? AND status='pending_payment' AND linked_ticket_id IS NOT NULL`,[orderId]);
  if(existing.length){await conn.commit();return {duplicate:true,reservedCount:existing.length};}
  const items=await loadItems(orderId,conn); const reserved=[];
  const expiresAt=paymentCategory==='stripe'?new Date(Date.now()+30*60*1000).toISOString().slice(0,19).replace('T',' '):null;
  for(const item of items){
   const roomId=item.pi.target_room_id;
   const [rooms]=await conn.execute(`SELECT room_id,status,game_type,config_json FROM ${R} WHERE room_id=? AND club_id=? LIMIT 1 FOR UPDATE`,[roomId,order.club_id]);
   const room=rooms[0]; if(!room) throw new Error(`room_not_found:${roomId}`); if(['completed','cancelled'].includes(room.status)) throw new Error('room_not_available');
   const cap=await canPurchaseTickets(roomId,1); if(!cap.allowed) throw new Error(cap.reason||'ticket_sales_closed');
   let tt=null;
   if(room.game_type==='ticketed_event'){
    const requested=String(item.metadata.ticketTypeId||'').trim(); if(!requested) throw new Error('ticket_type_required');
    tt=await ticketTypeCheck(roomId,parseJson(room.config_json,{}),requested,conn);
   }
   const entryId=nanoid(21),ticketId=nanoid(12),joinToken=nanoid(16);
   const fee=Number(item.metadata.referencePrice??item.oi.unit_price??0);
   await conn.execute(`INSERT INTO ${E} (id,peer_fundraiser_id,club_id,room_id,order_id,order_item_id,pack_id,pack_item_id,order_quantity_index,pack_item_quantity_index,participant_id,supporter_name,supporter_email,entry_type,status,linked_ticket_id,join_url,metadata_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'pending_payment',?,?,?)`,[entryId,order.peer_fundraiser_id,order.club_id,roomId,order.id,item.oi.id,item.oi.pack_id,item.pi.id,item.oq,item.pq,order.participant_id,order.supporter_name,order.supporter_email,item.entryType,ticketId,`/tickets/status/${ticketId}`,JSON.stringify({capacityReservation:true,ticketTypeId:tt?.id||null,ticketTypeName:tt?.name||null})]);
   await conn.execute(`INSERT INTO ${T} (ticket_id,room_id,club_id,purchaser_name,purchaser_email,purchaser_phone,player_name,entry_fee,extras,extras_total,total_amount,currency,payment_status,payment_method,payment_reference,club_payment_method_id,redemption_status,join_token,expires_at,ticket_type_id,ticket_type_name,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'[]',0,?,?,'payment_claimed',?,?,?,'blocked',?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())`,[ticketId,roomId,order.club_id,order.supporter_name,order.supporter_email,order.supporter_phone||null,order.supporter_name,fee,fee,order.currency||'EUR',method(paymentCategory),paymentReference,clubPaymentMethodId,joinToken,expiresAt,tt?.id||null,tt?.name||null]);
   const ledgerId=await createExpectedPayment({roomId,clubId:order.club_id,playerId:`ticket_${ticketId}`,playerName:order.supporter_name,ledgerType:'entry_fee',amount:fee,currency:order.currency||'EUR',paymentMethod:method(paymentCategory),paymentSource:paymentCategory==='stripe'?'player_selected':'player_claimed',clubPaymentMethodId,paymentReference,ticketId,status:paymentCategory==='stripe'?'expected':'claimed',claimedAt:paymentCategory==='stripe'?null:new Date(),extraMetadata:{peerFundraiserId:order.peer_fundraiser_id,peerOrderId:order.id,peerEntryId:entryId,capacityReservation:true,ticketTypeId:tt?.id||null,ticketTypeName:tt?.name||null}});
   if(ledgerId) await conn.execute(`UPDATE ${T} SET ledger_id=? WHERE ticket_id=?`,[ledgerId,ticketId]);
   reserved.push({entryId,ticketId});
  }
  await conn.commit(); return {reservedCount:reserved.length,reserved};
 }catch(e){await conn.rollback();throw e}finally{conn.release()}
}

export async function confirmPeerOrderReservations(orderId) {
  const [orderRows] = await connection.execute(
    `SELECT * FROM ${TABLE_PREFIX}peer_orders WHERE id=? LIMIT 1`,
    [orderId],
  );
  const order = orderRows[0];
  if (!order) throw new Error('peer_order_not_found');

  const [entries] = await connection.execute(
    `SELECT
       e.id,
       e.linked_ticket_id,
       e.room_id,
       e.entry_type,
       e.status,
       e.order_item_id,
       e.pack_item_id
     FROM ${TABLE_PREFIX}peer_entries e
     WHERE e.order_id=?
       AND e.status='pending_payment'
       AND e.linked_ticket_id IS NOT NULL`,
    [orderId],
  );

  console.log('[PeerTicketReservation] Eligible reservations:', {
    orderId,
    eligibleCount: entries.length,
    ticketIds: entries.map(e => e.linked_ticket_id),
  });

  if (!entries.length) return { confirmedCount: 0 };

  // Confirm payment status on each reserved ticket.
  // Fee correction (entry_fee, extras, ledger rows) is intentionally left to
  // expandPeerOrder, which runs immediately after this and has the full pack
  // metadata needed to split extras correctly. Doing it here too would race
  // and potentially overwrite the correct value.
  let confirmedCount = 0;

  for (const entry of entries) {
    await confirmTicketReservation(entry.linked_ticket_id, order);
    confirmedCount++;
  }

  console.log('[PeerTicketReservation] Reservation confirmation complete:', {
    orderId,
    confirmedCount,
  });

  return { confirmedCount };
}

async function confirmTicketReservation(ticketId, order) {
  await connection.execute(
    `UPDATE ${T}
     SET payment_status  = 'payment_confirmed',
         redemption_status = 'ready',
         confirmed_at    = UTC_TIMESTAMP(),
         expires_at      = NULL,
         updated_at      = UTC_TIMESTAMP()
     WHERE ticket_id     = ?`,
    [ticketId],
  );

  await connection.execute(
    `UPDATE ${L}
     SET status        = 'confirmed',
         confirmed_at  = UTC_TIMESTAMP(),
         updated_at    = UTC_TIMESTAMP()
     WHERE ticket_id   = ?
       AND ledger_type = 'entry_fee'
       AND status IN ('expected','claimed')`,
    [ticketId],
  );
}

export async function cancelPeerOrderReservations(orderId){
 const [rows]=await connection.execute(`SELECT id,linked_ticket_id FROM ${E} WHERE order_id=? AND linked_ticket_id IS NOT NULL AND status='pending_payment'`,[orderId]);
 for(const row of rows){
  await connection.execute(`DELETE FROM ${L} WHERE ticket_id=? AND status IN ('expected','claimed')`,[row.linked_ticket_id]);
  await connection.execute(`DELETE FROM ${T} WHERE ticket_id=? AND payment_status='payment_claimed'`,[row.linked_ticket_id]);
  await connection.execute(`UPDATE ${E} SET status='cancelled' WHERE id=?`,[row.id]);
 }
 return {cancelledCount:rows.length};
}
