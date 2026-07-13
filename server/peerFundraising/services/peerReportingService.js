import { connection, TABLE_PREFIX } from '../../config/database.js';
const O=`${TABLE_PREFIX}peer_orders`, OI=`${TABLE_PREFIX}peer_order_items`, E=`${TABLE_PREFIX}peer_entries`;
export async function report(fid,clubId){
  const [totals]=await connection.execute(`SELECT payment_status,SUM(total_amount) total,COUNT(*) orders FROM ${O} WHERE peer_fundraiser_id=? AND club_id=? GROUP BY payment_status`,[fid,clubId]);
  const [participants]=await connection.execute(
    `SELECT participant_id,participant_name,COUNT(*) order_count,
      SUM(CASE WHEN payment_status='confirmed' THEN total_amount ELSE 0 END) confirmed_total,
      SUM(CASE WHEN payment_status='claimed' THEN total_amount ELSE 0 END) claimed_total
     FROM ${O} WHERE peer_fundraiser_id=? AND club_id=? GROUP BY participant_id,participant_name ORDER BY confirmed_total DESC`,[fid,clubId]);
  const [packs]=await connection.execute(
    `SELECT oi.pack_id,oi.pack_name_snapshot pack_name,SUM(oi.quantity) quantity,
      SUM(CASE WHEN o.payment_status='confirmed' THEN oi.line_total ELSE 0 END) confirmed_total
     FROM ${OI} oi JOIN ${O} o ON o.id=oi.order_id WHERE oi.peer_fundraiser_id=? AND oi.club_id=?
     GROUP BY oi.pack_id,oi.pack_name_snapshot ORDER BY confirmed_total DESC`,[fid,clubId]);
  const [rooms]=await connection.execute(
    `SELECT room_id,entry_type,COUNT(*) entries,SUM(status='confirmed') confirmed_entries
     FROM ${E} WHERE peer_fundraiser_id=? AND club_id=? GROUP BY room_id,entry_type ORDER BY room_id`,[fid,clubId]);
  return {totals,participants,packs,rooms};
}
