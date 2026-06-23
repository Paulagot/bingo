// server/donations/services/DonationLedgerService.js
//
// Writes/reads fundraisely_donations. Deliberately separate from
// quizPaymentLedgerService.js — see donationCheckout.ts comment above
// FundraiselyDonation for the reasoning (no room/player identity here,
// different status vocabulary). Follows the same DB access conventions
// as the rest of this codebase (connection.execute, TABLE_PREFIX) so it
// reads like a sibling service, not a foreign one.

import { connection, TABLE_PREFIX } from '../../config/database.js';

const DONATIONS_TABLE = `${TABLE_PREFIX}donations`;

/**
 * Create a 'pending' donation row when checkout starts. Called by the
 * checkout dispatcher (DonationCheckoutService) before redirecting to
 * Stripe/SumUp or before returning the wallet address for crypto.
 *
 * Snapshots (categorySnapshot/providerSnapshot/labelSnapshot) are taken
 * at creation time, same pattern as PaymentLedgerEntry — protects
 * reporting if the club later renames/disables/deletes the method.
 */
export async function createPendingDonation({
  clubId,
  clubDonationButtonId = null,
  clubPaymentMethodId,
  paymentMethodCategorySnapshot,
  paymentProviderSnapshot = null,
  paymentMethodLabelSnapshot = null,
  amount,
  currency,
  donorName = null,
  donorEmail = null,
  externalCheckoutId = null,
}) {
  const sql = `
    INSERT INTO ${DONATIONS_TABLE}
      (club_id, club_donation_button_id, club_payment_method_id,
       payment_method_category_snapshot, payment_provider_snapshot,
       payment_method_label_snapshot, amount, currency, status,
       external_checkout_id, donor_name, donor_email)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
  `;

  const [result] = await connection.execute(sql, [
    clubId,
    clubDonationButtonId,
    clubPaymentMethodId,
    paymentMethodCategorySnapshot,
    paymentProviderSnapshot,
    paymentMethodLabelSnapshot,
    amount,
    currency,
    externalCheckoutId,
    donorName,
    donorEmail,
  ]);

  return result.insertId;
}

/**
 * Attach the provider's checkout/session id once it's created — for
 * Stripe this is the Checkout Session id, for SumUp (future) the
 * checkout resource id. Kept as a separate step from createPendingDonation
 * because the row needs to exist before we know the provider's id back
 * (we create the donation row, then call the provider, then store the id
 * the provider hands back) — see DonationCheckoutService.
 */
export async function attachExternalCheckoutId({ donationId, externalCheckoutId }) {
  const sql = `
    UPDATE ${DONATIONS_TABLE}
    SET external_checkout_id = ?, updated_at = UTC_TIMESTAMP()
    WHERE id = ? AND status = 'pending'
  `;
  const [result] = await connection.execute(sql, [externalCheckoutId, donationId]);
  return result.affectedRows > 0;
}

/**
 * Mark a donation confirmed. Called only from a verified source —
 * Stripe webhook (raw-body verified, see stripeWebhookHandler pattern)
 * or on-chain verification for crypto. Never optimistic / client-driven,
 * per spec acceptance criteria section 10.
 *
 * Looked up by externalCheckoutId (Stripe session id) OR by donationId
 * directly (crypto path, which already knows its own donationId from
 * the in-page flow and doesn't have a separate checkout id concept).
 *
 * The crypto* params are all optional and additive — the Stripe webhook
 * call site passes none of them and behaves exactly as before (they
 * stay NULL via COALESCE). THIS WAS THE BUG: an earlier version of this
 * function never actually accepted these six params at all — they were
 * silently dropped by JS destructuring, the three-field UPDATE below
 * ran anyway, and confirmDonation still returned true, so nothing
 * upstream noticed anything had gone wrong. A donation could show
 * status='confirmed' with a real external_transaction_id while every
 * crypto_* column stayed empty. Confirm this version is what's actually
 * deployed — diff against the previous file rather than assuming.
 */
export async function confirmDonation({
  donationId = null,
  externalCheckoutId = null,
  externalTransactionId = null,
  cryptoChain = null,
  cryptoNetwork = null,
  cryptoSenderWallet = null,
  cryptoTokenCode = null,
  cryptoTokenMint = null,
  cryptoRawAmount = null,
}) {
  if (!donationId && !externalCheckoutId) {
    throw new Error('confirmDonation requires donationId or externalCheckoutId');
  }

  const whereClause = donationId
    ? 'id = ?'
    : 'external_checkout_id = ?';
  const whereParam = donationId || externalCheckoutId;

  const sql = `
    UPDATE ${DONATIONS_TABLE}
    SET
      status = 'confirmed',
      external_transaction_id = COALESCE(?, external_transaction_id),
      crypto_chain = COALESCE(?, crypto_chain),
      crypto_network = COALESCE(?, crypto_network),
      crypto_sender_wallet = COALESCE(?, crypto_sender_wallet),
      crypto_token_code = COALESCE(?, crypto_token_code),
      crypto_token_mint = COALESCE(?, crypto_token_mint),
      crypto_raw_amount = COALESCE(?, crypto_raw_amount),
      confirmed_at = UTC_TIMESTAMP(),
      updated_at = UTC_TIMESTAMP()
    WHERE ${whereClause}
      AND status = 'pending'
  `;

  const [result] = await connection.execute(sql, [
    externalTransactionId,
    cryptoChain,
    cryptoNetwork,
    cryptoSenderWallet,
    cryptoTokenCode,
    cryptoTokenMint,
    cryptoRawAmount,
    whereParam,
  ]);

  return result.affectedRows > 0;
}

/**
 * Mark a donation failed or expired. 'expired' is for unpaid
 * Stripe/SumUp sessions past their timeout; 'failed' is for an explicit
 * provider failure event.
 */
export async function markDonationStatus({ donationId = null, externalCheckoutId = null, status }) {
  if (status !== 'failed' && status !== 'expired') {
    throw new Error(`markDonationStatus: invalid terminal status "${status}"`);
  }
  if (!donationId && !externalCheckoutId) {
    throw new Error('markDonationStatus requires donationId or externalCheckoutId');
  }

  const whereClause = donationId ? 'id = ?' : 'external_checkout_id = ?';
  const whereParam = donationId || externalCheckoutId;

  const sql = `
    UPDATE ${DONATIONS_TABLE}
    SET status = ?, updated_at = UTC_TIMESTAMP()
    WHERE ${whereClause}
      AND status = 'pending'
  `;

  const [result] = await connection.execute(sql, [status, whereParam]);
  return result.affectedRows > 0;
}

/**
 * Club-facing "donations received" list (spec section 8). Paginated,
 * optionally filtered by status. Newest first.
 */
/**
 * Club-facing "donations received" list (spec section 8). Paginated,
 * optionally filtered by status. Newest first.
 *
 * Pass `all: true` to skip pagination entirely and return every matching
 * row in one query (used by reporting views that need full totals, e.g.
 * the dashboard income report — not for paginated UI lists).
 */
export async function listDonationsForClub({ clubId, status = null, page = 1, pageSize = 25, all = false }) {
  const whereParts = ['club_id = ?'];
  const params = [clubId];
  if (status) {
    whereParts.push('status = ?');
    params.push(status);
  }
  const whereSql = whereParts.join(' AND ');

  if (all) {
    const [rows] = await connection.execute(
      `SELECT * FROM ${DONATIONS_TABLE}
       WHERE ${whereSql}
       ORDER BY created_at DESC`,
      params
    );
    return { donations: rows, total: rows.length, page: 1, pageSize: rows.length };
  }

  const offset = Math.max(0, (page - 1) * pageSize);

  const [rows] = await connection.execute(
    `SELECT * FROM ${DONATIONS_TABLE}
     WHERE ${whereSql}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const [countRows] = await connection.execute(
    `SELECT COUNT(*) as total FROM ${DONATIONS_TABLE} WHERE ${whereSql}`,
    params
  );

  return {
    donations: rows,
    total: countRows[0]?.total ?? 0,
    page,
    pageSize,
  };
}

/**
 * Single donation lookup — used by the crypto confirm path (which
 * already has a donationId from the in-page flow) and by anything that
 * needs to re-check status before acting.
 */
export async function getDonationById(donationId) {
  const [rows] = await connection.execute(
    `SELECT * FROM ${DONATIONS_TABLE} WHERE id = ? LIMIT 1`,
    [donationId]
  );
  return rows[0] || null;
}