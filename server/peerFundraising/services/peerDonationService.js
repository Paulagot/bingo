// server/peerFundraising/services/peerDonationService.js
//
// Direct donations attached to Sell Activities peer fundraising.
// These rows live in fundraisely_donations and never in quiz_payment_ledger.
// The activity-sale portion remains in peer_orders and expands into the
// payment ledger/tickets only after the order itself is confirmed.

import { connection, TABLE_PREFIX } from '../../config/database.js';

const D = `${TABLE_PREFIX}donations`;
const O = `${TABLE_PREFIX}peer_orders`;
const F = `${TABLE_PREFIX}peer_fundraisers`;
const P = `${TABLE_PREFIX}peer_participants`;
const M = `${TABLE_PREFIX}club_payment_methods`;
const B = `${TABLE_PREFIX}club_donation_buttons`;

const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};

async function getOrderContext(orderId, conn = connection) {
  const [rows] = await conn.execute(
    `SELECT
       o.*,
       f.format_type,
       f.status AS fundraiser_status
     FROM ${O} o
     JOIN ${F} f ON f.id=o.peer_fundraiser_id
     WHERE o.id=?
     LIMIT 1`,
    [orderId]
  );
  return rows[0] || null;
}

async function getMethodSnapshot(clubId, methodId, conn = connection) {
  if (!methodId) fail('payment_method_required');
  const [rows] = await conn.execute(
    `SELECT id,method_category,provider_name,method_label
     FROM ${M}
     WHERE id=? AND club_id=? AND is_enabled=1
     LIMIT 1`,
    [methodId, clubId]
  );
  if (!rows[0]) fail('payment_method_not_available', 409);
  return rows[0];
}

async function getDonationButtonId(clubId, conn = connection) {
  const [rows] = await conn.execute(
    `SELECT id FROM ${B}
     WHERE club_id=? AND is_enabled=1
     LIMIT 1`,
    [clubId]
  );
  return rows[0]?.id || null;
}

export async function createPeerDonationForOrder({
  orderId,
  status,
  externalCheckoutId = null,
  conn = connection,
}) {
  if (!['pending', 'claimed'].includes(status)) {
    fail('invalid_peer_donation_status');
  }

  const order = await getOrderContext(orderId, conn);
  if (!order) fail('peer_order_not_found', 404);
  if (order.format_type === 'sponsored') {
    fail('donation_not_available_for_sponsorship', 400);
  }

  const amount = Number(order.donation_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const [existing] = await conn.execute(
    `SELECT id,status FROM ${D}
     WHERE peer_order_id=?
     LIMIT 1`,
    [orderId]
  );
  if (existing[0]) return existing[0].id;

  const method = await getMethodSnapshot(
    order.club_id,
    order.club_payment_method_id,
    conn
  );
  const buttonId = await getDonationButtonId(order.club_id, conn);

  const [result] = await conn.execute(
    `INSERT INTO ${D}
      (club_id,
       peer_fundraiser_id,
       peer_participant_id,
       peer_order_id,
       club_donation_button_id,
       club_payment_method_id,
       payment_method_category_snapshot,
       payment_provider_snapshot,
       payment_method_label_snapshot,
       amount,
       currency,
       status,
       external_checkout_id,
       donor_name,
       donor_email,
       created_at,
       updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
    [
      order.club_id,
      order.peer_fundraiser_id,
      order.participant_id || null,
      order.id,
      buttonId,
      method.id,
      method.method_category,
      method.provider_name || null,
      method.method_label || null,
      amount,
      order.currency || 'EUR',
      status,
      externalCheckoutId,
      order.supporter_name || null,
      order.supporter_email || null,
    ]
  );

  return String(result.insertId);
}

export async function attachPeerDonationCheckout({ orderId, sessionId }) {
  const [result] = await connection.execute(
    `UPDATE ${D}
     SET external_checkout_id=?,updated_at=UTC_TIMESTAMP()
     WHERE peer_order_id=? AND status='pending'`,
    [sessionId, orderId]
  );
  return result.affectedRows > 0;
}

export async function confirmPeerDonationAutomatic({
  donationId = null,
  orderId = null,
  externalCheckoutId = null,
  externalTransactionId = null,
}) {
  if (!donationId && !orderId && !externalCheckoutId) return false;

  const where = donationId
    ? 'id=?'
    : orderId
      ? 'peer_order_id=?'
      : 'external_checkout_id=?';
  const value = donationId || orderId || externalCheckoutId;

  const [result] = await connection.execute(
    `UPDATE ${D}
     SET status='confirmed',
         external_transaction_id=COALESCE(?,external_transaction_id),
         confirmed_at=UTC_TIMESTAMP(),
         updated_at=UTC_TIMESTAMP()
     WHERE ${where} AND status='pending'`,
    [externalTransactionId, value]
  );
  return result.affectedRows > 0;
}

export async function expirePeerDonation({ orderId, externalCheckoutId }) {
  const [result] = await connection.execute(
    `UPDATE ${D}
     SET status='expired',updated_at=UTC_TIMESTAMP()
     WHERE peer_order_id=?
       AND external_checkout_id=?
       AND status='pending'`,
    [orderId, externalCheckoutId]
  );
  return result.affectedRows > 0;
}

async function assertSellFundraiser(fid, clubId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${F}
     WHERE id=? AND club_id=?
     LIMIT 1`,
    [fid, clubId]
  );
  const fundraiser = rows[0];
  if (!fundraiser) fail('peer_fundraiser_not_found', 404);
  if (fundraiser.format_type === 'sponsored') {
    fail('donations_not_used_for_sponsorship', 400);
  }
  return fundraiser;
}

export async function listPeerDonations(fid, clubId) {
  await assertSellFundraiser(fid, clubId);
  const [rows] = await connection.execute(
    `SELECT
       d.*,
       p.participant_name
     FROM ${D} d
     LEFT JOIN ${P} p
       ON p.id=d.peer_participant_id
      AND p.peer_fundraiser_id=d.peer_fundraiser_id
     WHERE d.club_id=?
       AND d.peer_fundraiser_id=?
       AND d.status IN ('confirmed','claimed','failed')
     ORDER BY d.created_at DESC`,
    [clubId, fid]
  );
  return { donations: rows };
}

export async function confirmPeerDonationForClub(
  fid,
  clubId,
  donationId
) {
  await assertSellFundraiser(fid, clubId);
  const [result] = await connection.execute(
    `UPDATE ${D}
     SET status='confirmed',
         confirmed_at=UTC_TIMESTAMP(),
         updated_at=UTC_TIMESTAMP()
     WHERE id=?
       AND club_id=?
       AND peer_fundraiser_id=?
       AND status='claimed'`,
    [donationId, clubId, fid]
  );
  if (!result.affectedRows) fail('donation_not_confirmable', 409);
  return { donationId, status: 'confirmed' };
}

export async function rejectPeerDonationForClub(
  fid,
  clubId,
  donationId
) {
  await assertSellFundraiser(fid, clubId);
  const [result] = await connection.execute(
    `UPDATE ${D}
     SET status='failed',updated_at=UTC_TIMESTAMP()
     WHERE id=?
       AND club_id=?
       AND peer_fundraiser_id=?
       AND status='claimed'`,
    [donationId, clubId, fid]
  );
  if (!result.affectedRows) fail('donation_not_rejectable', 409);
  return { donationId, status: 'failed' };
}
