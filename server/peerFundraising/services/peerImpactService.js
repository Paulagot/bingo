//server/peerFundraising/services/peerImpactService.js
import { connection, TABLE_PREFIX } from '../../config/database.js';

const F  = TABLE_PREFIX + 'peer_fundraisers';
const O  = TABLE_PREFIX + 'peer_orders';
const OI = TABLE_PREFIX + 'peer_order_items';
const PI = TABLE_PREFIX + 'peer_pack_items';
const D  = TABLE_PREFIX + 'donations';

export async function getPublicFundraiserImpact(fundraiserId) {
  const [fRows] = await connection.execute(
    'SELECT id, currency, target_amount FROM ' + F + ' WHERE id=? LIMIT 1',
    [fundraiserId],
  );
  const fundraiser = fRows[0];
  if (!fundraiser) { const e = new Error('peer_fundraiser_not_found'); e.statusCode = 404; throw e; }

  const [[orderTotals]] = await connection.execute(
    'SELECT COALESCE(SUM(total_amount),0) AS ticket_revenue FROM ' + O +
    ' WHERE peer_fundraiser_id=? AND payment_status=\'confirmed\'', [fundraiserId],
  );
  const [[donationTotals]] = await connection.execute(
    'SELECT COALESCE(SUM(amount),0) AS donation_total FROM ' + D +
    ' WHERE peer_fundraiser_id=? AND status=\'confirmed\'', [fundraiserId],
  );
  const [[ticketTotals]] = await connection.execute(
    'SELECT COALESCE(SUM(oi.quantity),0) AS total_tickets FROM ' + OI + ' oi' +
    ' JOIN ' + O + ' o ON o.id=oi.order_id' +
    ' WHERE o.peer_fundraiser_id=? AND o.payment_status=\'confirmed\'', [fundraiserId],
  );
  const [roomRows] = await connection.execute(
    'SELECT pi.target_room_id AS room_id, COALESCE(SUM(oi.quantity),0) AS tickets_sold' +
    ' FROM ' + OI + ' oi JOIN ' + O + ' o ON o.id=oi.order_id' +
    ' JOIN ' + PI + ' pi ON pi.pack_id=oi.pack_id' +
    ' WHERE o.peer_fundraiser_id=? AND o.payment_status=\'confirmed\'' +
    ' AND pi.target_room_id IS NOT NULL GROUP BY pi.target_room_id ORDER BY tickets_sold DESC',
    [fundraiserId],
  );

  const ticketRevenue   = Number(orderTotals?.ticket_revenue   || 0);
  const directDonations = Number(donationTotals?.donation_total || 0);

  return {
    currency:          fundraiser.currency || 'EUR',
    fundraisingTarget: fundraiser.target_amount ? Number(fundraiser.target_amount) : null,
    totalRaised:       ticketRevenue + directDonations,
    ticketRevenue,
    directDonations,
    totalTicketsSold:  Number(ticketTotals?.total_tickets || 0),
    roomBreakdown:     roomRows.map(r => ({ roomId: r.room_id, ticketsSold: Number(r.tickets_sold || 0) })),
  };
}