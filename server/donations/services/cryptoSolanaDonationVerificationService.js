// server/donations/services/cryptoSolanaDonationVerificationService.js
//
// Donation-flavored sibling to quiz's verifyAndRecordSolanaCryptoDonation
// (server/quiz/services/cryptoSolanaPaymentVerificationService.js).
//
// Per the Phase 3 handoff spec's open question #1: the quiz version is
// NOT generic enough to reuse directly — it requires roomId/playerId/
// playerName, looks up a quiz room via getRoomForCryptoPayment, and
// writes to the quiz_payment_ledger + web3 transaction tables via
// createExpectedPayment/insertJoinPayment. None of that exists for a
// club donation (no room, no player).
//
// What IS reused, unchanged, from cryptoSolanaPaymentVerificationService.js:
//   - verifySolanaTransfer / verifyNativeSolTransfer / verifySplTokenTransfer
//     — these are pure on-chain verification with zero room/player coupling
//     (txHash, network, senderWallet, recipientWallet, tokenMint, rawAmount
//     in, { ok, tx } out). This is the security-relevant part, and it's
//     reused as-is rather than reimplemented — re-deriving Solana tx
//     parsing logic a second time would be a real correctness risk for
//     no benefit.
//   - normalizeNetwork, normalizeWallet, asNumber — trivial helpers,
//     reused for consistency rather than duplicated.
//
// What's genuinely different here vs. the quiz version:
//   - Looks up the donation via DonationLedgerService.getDonationById
//     instead of a quiz room.
//   - The payment method is already validated and snapshotted onto the
//     donation row by DonationCheckoutService.startCheckout at the
//     /checkout step — by the time /confirm is called, we don't need to
//     re-derive "is this method linked to this button," we just need the
//     club's configured wallet address to verify against. That address
//     comes from the SAME club_payment_methods row, looked up directly
//     by club_payment_method_id (no room-linkage join, because club
//     donations have no concept of "linked to a room").
//   - On success, calls DonationLedgerService.confirmDonation (writes to
//     fundraisely_donations) instead of createExpectedPayment/
//     insertJoinPayment (writes to quiz_payment_ledger + web3 tx table).

import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  verifySolanaTransfer,
  normalizeNetwork,
  normalizeWallet,
  asNumber,
  parseJsonMaybe,
} from '../../quiz/services/cryptoSolanaPaymentVerificationService.js';
import { toFiat } from '../../mgtsystem/services/Tokenpriceservice.js';
import { getDonationById, confirmDonation } from './DonationLedgerService.js';

const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

async function _getPaymentMethodById(methodId) {
  const [rows] = await connection.execute(
    `SELECT id, club_id, method_category, provider_name, method_config
     FROM ${METHODS_TABLE}
     WHERE id = ?
     LIMIT 1`,
    [methodId]
  );
  return rows?.[0] || null;
}

/**
 * Verify an on-chain Solana donation and confirm it in
 * fundraisely_donations. Mirrors verifyAndRecordSolanaCryptoDonation's
 * shape closely enough that anyone familiar with the quiz version can
 * read this one, but with donation/club concepts substituted for
 * room/player ones throughout.
 *
 * Throws (with .statusCode set, same convention as the quiz version)
 * on any failure — donation not found, wrong status, wallet mismatch,
 * on-chain verification failure. The router maps these to HTTP
 * responses; this function never returns an ok:false shape itself.
 */
export async function verifyAndRecordSolanaDonation({
  donationId,
  network = 'mainnet',
  txHash,
  senderWallet,
  recipientWallet,
  tokenCode,
  tokenMint = null,
  rawAmount,
  displayAmount,
}) {
  if (!donationId) {
    const err = new Error('donationId is required');
    err.statusCode = 400;
    throw err;
  }
  if (!txHash || !senderWallet || !recipientWallet) {
    const err = new Error('txHash, senderWallet and recipientWallet are required');
    err.statusCode = 400;
    throw err;
  }
  if (!tokenCode || !rawAmount || Number(rawAmount) <= 0) {
    const err = new Error('tokenCode and positive rawAmount are required');
    err.statusCode = 400;
    throw err;
  }

  const resolvedNetwork = normalizeNetwork(network);

  // 1. Load the donation row — must exist and still be pending. A
  // donation already 'confirmed'/'failed'/'expired' should not be
  // re-verified; confirmDonation's own `AND status = 'pending'` guard
  // would no-op in that case anyway, but failing loudly here gives a
  // clearer error than a silent no-op affectedRows=0 deeper in.
  const donation = await getDonationById(donationId);
  if (!donation) {
    const err = new Error('Donation not found');
    err.statusCode = 404;
    throw err;
  }
  if (donation.status !== 'pending') {
    const err = new Error(`Donation is already ${donation.status}`);
    err.statusCode = 409;
    throw err;
  }
  if (donation.payment_method_category_snapshot !== 'crypto') {
    // Defensive — shouldn't happen since the quote/confirm routes are
    // crypto-only, but a donationId for a Stripe donation hitting this
    // endpoint (e.g. a stale/replayed request) should fail clearly.
    const err = new Error('This donation was not started as a crypto payment');
    err.statusCode = 400;
    throw err;
  }

  // 2. Load the club's configured wallet directly from the payment
  // method row — no room-linkage concept exists here, the donation's
  // own club_payment_method_id IS the authority (already validated at
  // /checkout time by DonationCheckoutService.startCheckout).
  const paymentMethod = await _getPaymentMethodById(donation.club_payment_method_id);
  if (!paymentMethod) {
    const err = new Error('Payment method for this donation no longer exists');
    err.statusCode = 400;
    throw err;
  }

  const methodConfig = parseJsonMaybe(paymentMethod.method_config, {});
  const savedWallet = normalizeWallet(methodConfig.walletAddress);

  if (!savedWallet) {
    const err = new Error('The club Solana wallet is not configured');
    err.statusCode = 400;
    throw err;
  }
  if (normalizeWallet(recipientWallet) !== savedWallet) {
    const err = new Error('Recipient wallet does not match the club payment method wallet');
    err.statusCode = 400;
    throw err;
  }

  // 3. The actual on-chain check — fully reused, unmodified, from the
  // quiz verification service. This is the part where re-deriving the
  // logic ourselves would be a real risk; reuse means a bug fixed there
  // is fixed here too, automatically.
  const verified = await verifySolanaTransfer({
    txHash,
    network: resolvedNetwork,
    senderWallet,
    recipientWallet: savedWallet,
    tokenMint,
    rawAmount,
  });

  if (!verified.ok) {
    const err = new Error(verified.error || 'Solana transaction verification failed');
    err.statusCode = 400;
    throw err;
  }

  // 4. Confirm in fundraisely_donations — NOT quiz_payment_ledger, NOT
  // a web3 transaction table. One ledger for club donations; the
  // crypto-specific columns (added in the same migration as this
  // feature) carry the audit detail that would otherwise be lost.
  const confirmed = await confirmDonation({
    donationId,
    externalTransactionId: txHash,
    cryptoChain: 'solana',
    cryptoNetwork: resolvedNetwork,
    cryptoSenderWallet: senderWallet,
    cryptoTokenCode: tokenCode,
    cryptoTokenMint: tokenMint,
    cryptoRawAmount: String(rawAmount),
  });

  if (!confirmed) {
    // Most likely cause: a race where the donation moved out of
    // 'pending' between step 1's read and this write (e.g. duplicate
    // confirm request arriving twice). Surface this distinctly rather
    // than claiming success.
    const err = new Error('Could not confirm donation — it may have already been processed');
    err.statusCode = 409;
    throw err;
  }

  // 5. Best-effort fiat conversion for the response only — not stored
  // anywhere new; `amount`/`currency` on the donation row were already
  // set correctly at /checkout time from the quote the supporter saw.
  // This is purely for the confirm response to echo back a sensible
  // display value, consistent with what the quote step showed.
  const donationFiat = await toFiat(asNumber(displayAmount, 0), tokenCode, donation.currency);

  return {
    donationId,
    txHash,
    resolvedNetwork,
    donationAmount: donation.amount,
    donationCurrency: donation.currency,
    convertedDisplayFiat: donationFiat ?? null,
  };
}