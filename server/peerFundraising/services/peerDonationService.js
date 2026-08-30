// server/peerFundraising/services/peerDonationService.js
//
// Direct donations attached to Sell Activities peer fundraising.
// These rows live in fundraisely_donations and never in quiz_payment_ledger.
// The activity-sale portion remains in peer_orders and expands into the
// payment ledger/tickets only after the order itself is confirmed.
//
// Crypto donation path added:
//   createPublicPeerCryptoDonation - creates a pending row, returns walletAddress
//   confirmPublicPeerCryptoDonation - calls confirmPeerDonationAutomatic (same
//   function the Stripe webhook uses), so crypto hits the same confirmed-only path.

import Stripe from 'stripe';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getReadyStripeForClub } from '../../stripe/stripeTicketCheckoutService.js';
import { parseJsonMaybe } from '../../quiz/services/cryptoSolanaPaymentVerificationService.js';

const D = `${TABLE_PREFIX}donations`;
const O = `${TABLE_PREFIX}peer_orders`;
const F = `${TABLE_PREFIX}peer_fundraisers`;
const P = `${TABLE_PREFIX}peer_participants`;
const M = `${TABLE_PREFIX}club_payment_methods`;
const B = `${TABLE_PREFIX}club_donation_buttons`;
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

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
    [orderId],
  );
  return rows[0] || null;
}

async function getMethodSnapshot(clubId, methodId, conn = connection) {
  if (!methodId) fail('payment_method_required');
  const [rows] = await conn.execute(
    `SELECT id, method_category, provider_name, method_label, method_config
     FROM ${M}
     WHERE id=? AND club_id=? AND is_enabled=1
     LIMIT 1`,
    [methodId, clubId],
  );
  if (!rows[0]) fail('payment_method_not_available', 409);
  return rows[0];
}

async function getDonationButtonId(clubId, conn = connection) {
  const [rows] = await conn.execute(
    `SELECT id FROM ${B}
     WHERE club_id=? AND is_enabled=1
     LIMIT 1`,
    [clubId],
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
    `SELECT id, status FROM ${D}
     WHERE peer_order_id=?
     LIMIT 1`,
    [orderId],
  );
  if (existing[0]) return existing[0].id;

  const method = await getMethodSnapshot(
    order.club_id,
    order.club_payment_method_id,
    conn,
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
    ],
  );

  return String(result.insertId);
}

export async function attachPeerDonationCheckout({ orderId, sessionId }) {
  const [result] = await connection.execute(
    `UPDATE ${D}
     SET external_checkout_id=?, updated_at=UTC_TIMESTAMP()
     WHERE peer_order_id=? AND status='pending'`,
    [sessionId, orderId],
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
         external_transaction_id=COALESCE(?, external_transaction_id),
         confirmed_at=UTC_TIMESTAMP(),
         updated_at=UTC_TIMESTAMP()
     WHERE ${where} AND status='pending'`,
    [externalTransactionId, value],
  );
  return result.affectedRows > 0;
}

export async function expirePeerDonation({ orderId, externalCheckoutId }) {
  const [result] = await connection.execute(
    `UPDATE ${D}
     SET status='expired', updated_at=UTC_TIMESTAMP()
     WHERE peer_order_id=?
       AND external_checkout_id=?
       AND status='pending'`,
    [orderId, externalCheckoutId],
  );
  return result.affectedRows > 0;
}

async function assertSellFundraiser(fid, clubId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${F}
     WHERE id=? AND club_id=?
     LIMIT 1`,
    [fid, clubId],
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
    [clubId, fid],
  );
  return { donations: rows };
}

export async function confirmPeerDonationForClub(fid, clubId, donationId) {
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
    [donationId, clubId, fid],
  );
  if (!result.affectedRows) fail('donation_not_confirmable', 409);
  return { donationId, status: 'confirmed' };
}

export async function rejectPeerDonationForClub(fid, clubId, donationId) {
  await assertSellFundraiser(fid, clubId);
  const [result] = await connection.execute(
    `UPDATE ${D}
     SET status='failed', updated_at=UTC_TIMESTAMP()
     WHERE id=?
       AND club_id=?
       AND peer_fundraiser_id=?
       AND status='claimed'`,
    [donationId, clubId, fid],
  );
  if (!result.affectedRows) fail('donation_not_rejectable', 409);
  return { donationId, status: 'failed' };
}

async function getPublicDonationContext(fundraiserId, participantId = null) {
  const [rows] = await connection.execute(
    `SELECT f.*, c.name AS club_name, c.slug AS club_slug
     FROM ${F} f
     JOIN ${TABLE_PREFIX}clubs c ON c.id=f.club_id
     WHERE f.id=?
       AND f.status='published'
       AND f.format_type<>'sponsored'
     LIMIT 1`,
    [fundraiserId],
  );
  const fundraiser = rows[0];
  if (!fundraiser) fail('peer_fundraiser_not_available', 404);

  const today = new Date().toISOString().slice(0, 10);
  if (fundraiser.start_date && String(fundraiser.start_date).slice(0, 10) > today) {
    fail('peer_fundraiser_not_started', 409);
  }
  if (fundraiser.end_date && String(fundraiser.end_date).slice(0, 10) < today) {
    fail('peer_fundraiser_closed', 409);
  }

  let participant = null;
  if (participantId) {
    const [participantRows] = await connection.execute(
      `SELECT id, participant_name
       FROM ${P}
       WHERE id=?
         AND peer_fundraiser_id=?
         AND club_id=?
         AND is_active=1
       LIMIT 1`,
      [participantId, fundraiserId, fundraiser.club_id],
    );
    participant = participantRows[0];
    if (!participant) fail('participant_not_available', 404);
  }

  return { fundraiser, participant };
}

function validatePublicDonor(body, paymentCategory = null) {
  const donorName  = String(body?.donorName  || '').trim();
  const donorEmail = String(body?.donorEmail || '').trim().toLowerCase();
  const amount     = Number(body?.amount     || 0);

  if (donorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donorEmail)) {
    fail('valid_donor_email_required');
  }

  // Stripe has a €0.50 minimum charge - enforce it only for card/stripe paths.
  // Crypto and manual payments have no platform minimum.
  const isStripe = ['stripe', 'card'].includes(String(paymentCategory || '').toLowerCase());
  const minAmount = isStripe ? 0.50 : 0.01;

  if (!Number.isFinite(amount) || amount < minAmount || amount > 10000) {
    fail(isStripe
      ? 'invalid_donation_amount - minimum donation is €0.50'
      : 'invalid_donation_amount',
    );
  }

  return {
    donorName:  donorName.slice(0, 128) || null,
    donorEmail: donorEmail || null,
    amount,
  };
}

export async function createPublicPeerManualDonation({
  fundraiserId,
  participantId = null,
  clubPaymentMethodId,
  donorName,
  donorEmail,
  amount,
  paymentReference = null,
}) {
  const { fundraiser, participant } = await getPublicDonationContext(
    fundraiserId,
    participantId,
  );
  const donor  = validatePublicDonor({ donorName, donorEmail, amount });
  const method = await getMethodSnapshot(fundraiser.club_id, clubPaymentMethodId);

  if (['stripe', 'card', 'crypto'].includes(String(method.method_category).toLowerCase())) {
    fail('manual_payment_method_required');
  }

  const [result] = await connection.execute(
    `INSERT INTO ${D}
      (club_id, peer_fundraiser_id, peer_participant_id, peer_order_id,
       club_donation_button_id, club_payment_method_id,
       payment_method_category_snapshot, payment_provider_snapshot,
       payment_method_label_snapshot, amount, currency, status,
       external_transaction_id, donor_name, donor_email,
       created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
    [
      fundraiser.club_id,
      fundraiser.id,
      participant?.id || null,
      null,
      null,
      method.id,
      method.method_category,
      method.provider_name || null,
      method.method_label || null,
      donor.amount,
      fundraiser.currency || 'EUR',
      'claimed',
      paymentReference || null,
      donor.donorName,
      donor.donorEmail,
    ],
  );

  return {
    donationId: String(result.insertId),
    status:     'claimed',
    amount:     donor.amount,
    currency:   fundraiser.currency || 'EUR',
  };
}

export async function createPublicPeerStripeDonation({
  fundraiserId,
  participantId = null,
  clubPaymentMethodId,
  donorName,
  donorEmail,
  amount,
  appOrigin,
  returnPath,
}) {
  const { fundraiser, participant } = await getPublicDonationContext(
    fundraiserId,
    participantId,
  );
  const donor  = validatePublicDonor({ donorName, donorEmail, amount }, 'stripe');
  const method = await getMethodSnapshot(fundraiser.club_id, clubPaymentMethodId);

  if (!['stripe', 'card'].includes(String(method.method_category).toLowerCase())) {
    fail('stripe_payment_method_required');
  }

  const stripeConnection = await getReadyStripeForClub(fundraiser.club_id);
  if (!stripeConnection) fail('stripe_not_ready_or_disabled', 422);

  const [insert] = await connection.execute(
    `INSERT INTO ${D}
      (club_id, peer_fundraiser_id, peer_participant_id, peer_order_id,
       club_donation_button_id, club_payment_method_id,
       payment_method_category_snapshot, payment_provider_snapshot,
       payment_method_label_snapshot, amount, currency, status,
       donor_name, donor_email, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
    [
      fundraiser.club_id,
      fundraiser.id,
      participant?.id || null,
      null,
      null,
      method.id,
      method.method_category,
      method.provider_name || null,
      method.method_label || null,
      donor.amount,
      fundraiser.currency || 'EUR',
      'pending',
      donor.donorName,
      donor.donorEmail,
    ],
  );
  const donationId = String(insert.insertId);

  const origin = String(
    appOrigin || process.env.APP_ORIGIN || process.env.BASE_URL || '',
  ).replace(/\/$/, '');
  if (!origin) fail('app_origin_missing', 500);

 const safeReturnPath =
  String(returnPath || '').startsWith('/fundraise/') ||
  String(returnPath || '').startsWith('/events/')
    ? String(returnPath)
    : `/fundraise/${fundraiser.club_slug}/${fundraiser.public_slug}`;

  const session = await stripe.checkout.sessions.create(
    {
      mode:                 'payment',
      payment_method_types: ['card'],
      ...(donor.donorEmail ? { customer_email: donor.donorEmail } : {}),
      line_items: [{
        price_data: {
          currency:     String(fundraiser.currency || 'EUR').toLowerCase(),
          product_data: {
            name:        `Donation to ${fundraiser.club_name}`,
            description: participant
              ? `Via ${participant.participant_name}'s fundraising page`
              : `Via ${fundraiser.name}`,
          },
          unit_amount: Math.round(donor.amount * 100),
        },
        quantity: 1,
      }],
      success_url: `${origin}${safeReturnPath}?donation=thanks&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}${safeReturnPath}?donation=cancelled`,
      metadata: {
        type:             'peer_direct_donation',
        donationId,
        peerFundraiserId: fundraiser.id,
        participantId:    participant?.id || '',
        clubId:           fundraiser.club_id,
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    },
    { stripeAccount: stripeConnection.accountId },
  );

  await connection.execute(
    `UPDATE ${D}
     SET external_checkout_id=?, updated_at=UTC_TIMESTAMP()
     WHERE id=?`,
    [session.id, donationId],
  );

  return {
    donationId,
    redirectUrl: session.url,
    sessionId:   session.id,
  };
}

// ─── Crypto donation ──────────────────────────────────────────────────────────
//
// Two-step flow:
//   1. createPublicPeerCryptoDonation - create pending row, return walletAddress
//   2. confirmPublicPeerCryptoDonation - after on-chain verify, confirm the row
//
// The confirm step is called by peerCryptoDonationRoutes AFTER
// verifyAndRecordSolanaDonation has already done the on-chain check and
// written the crypto_* columns. This function just flips status to confirmed
// via confirmPeerDonationAutomatic - the same function the Stripe webhook uses.

export async function createPublicPeerCryptoDonation({
  fundraiserId,
  participantId = null,
  clubPaymentMethodId,
  donorName,
  donorEmail,
  amount,
}) {
  const { fundraiser, participant } = await getPublicDonationContext(
    fundraiserId,
    participantId,
  );
  const donor  = validatePublicDonor({ donorName, donorEmail, amount });
  const method = await getMethodSnapshot(fundraiser.club_id, clubPaymentMethodId);

  if (String(method.method_category).toLowerCase() !== 'crypto') {
    fail('crypto_payment_method_required');
  }

  const methodConfig  = parseJsonMaybe(method.method_config, {});
  const walletAddress = String(methodConfig?.walletAddress || '').trim();
  if (!walletAddress) fail('club_solana_wallet_not_configured', 400);

  const [insert] = await connection.execute(
    `INSERT INTO ${D}
      (club_id, peer_fundraiser_id, peer_participant_id, peer_order_id,
       club_donation_button_id, club_payment_method_id,
       payment_method_category_snapshot, payment_provider_snapshot,
       payment_method_label_snapshot, amount, currency, status,
       donor_name, donor_email, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())`,
    [
      fundraiser.club_id,
      fundraiser.id,
      participant?.id || null,
      null,
      null,
      method.id,
      method.method_category,
      method.provider_name || null,
      method.method_label || null,
      donor.amount,
      fundraiser.currency || 'EUR',
      'pending',
      donor.donorName,
      donor.donorEmail,
    ],
  );

  return {
    donationId:    String(insert.insertId),
    walletAddress,
    amount:        donor.amount,
    currency:      fundraiser.currency || 'EUR',
  };
}

export async function confirmPublicPeerCryptoDonation({ donationId, txHash }) {
  // verifyAndRecordSolanaDonation already calls confirmDonation internally,
  // so the row may already be 'confirmed' by the time we get here.
  // That's fine - just update the peer-specific external_transaction_id
  // via COALESCE without requiring status = 'pending'.
  await connection.execute(
    `UPDATE ${D}
     SET external_transaction_id = COALESCE(?, external_transaction_id),
         confirmed_at = COALESCE(confirmed_at, UTC_TIMESTAMP()),
         updated_at = UTC_TIMESTAMP()
     WHERE id = ?`,
    [txHash, donationId],
  );
  return { donationId, status: 'confirmed' };
}

// ─── Public status polling ────────────────────────────────────────────────────

export async function getPublicPeerDonationStatus({ sessionId = null }) {
  const safeSessionId = String(sessionId || '').trim();
  if (!safeSessionId) fail('donation_session_required');

  const [rows] = await connection.execute(
    `SELECT
       id,
       status,
       amount,
       currency,
       peer_fundraiser_id,
       peer_participant_id
     FROM ${D}
     WHERE external_checkout_id=?
       AND peer_fundraiser_id IS NOT NULL
     LIMIT 1`,
    [safeSessionId],
  );

  const donation = rows[0];
  if (!donation) fail('donation_not_found', 404);

  return {
    donationId:        String(donation.id),
    status:            donation.status,
    amount:            Number(donation.amount),
    currency:          donation.currency,
    peerFundraiserId:  donation.peer_fundraiser_id,
    peerParticipantId: donation.peer_participant_id || null,
  };
}