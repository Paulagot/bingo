// server/campaigns/services/campaignCryptoVerificationService.js
//
// Verifies a Solana on-chain payment for a campaign product order.
//
// Key difference from verifyAndRecordSolanaFixedFeePayment:
//   - Does NOT validate the payment method against a room's linked_payment_methods_json.
//     Campaign payment methods are stored at campaign level, not room level.
//   - Looks up the wallet address from fundraisely_club_payment_methods directly.
//   - Works for any game type (quiz, elimination, bundles) since it is not
//     room-specific at verification time.
//   - Records the web3 transaction via insertJoinPayment with the correct
//     game_type derived from the campaign order's product items.

import { connection as db, TABLE_PREFIX } from '../../config/database.js';
import {
  verifySolanaTransfer,
  normalizeNetwork,
  normalizeWallet,
  parseJsonMaybe,
} from '../../quiz/services/cryptoSolanaPaymentVerificationService.js';
// insertJoinPayment not used for campaign products — it requires a room_id
// which doesn't exist at the campaign level. The quiz_payment_ledger is
// written per-ticket by campaignTicketBridgeService after expansion instead.
import { getRoomCurrencyCode, getRoomCurrencySymbol } from '../../utils/currencyUtils.js';

const T_ORDERS       = `${TABLE_PREFIX}campaign_product_orders`;
const T_CAMPAIGNS    = `${TABLE_PREFIX}campaigns`;
const T_CLUBS        = `${TABLE_PREFIX}clubs`;
const T_PAY_METHODS  = `${TABLE_PREFIX}club_payment_methods`;
const T_PROD_ITEMS   = `${TABLE_PREFIX}campaign_product_items`;
const T_ORDER_ITEMS  = `${TABLE_PREFIX}campaign_product_order_items`;
const T_ROOMS        = `${TABLE_PREFIX}web2_quiz_rooms`;

/**
 * Resolve the wallet address and method details from a club payment method.
 * Unlike the room-based version, this does NOT check linked_payment_methods_json
 * on the room — campaign methods are campaign-level.
 */
async function getCampaignCryptoPaymentMethod(clubId, clubPaymentMethodId) {
  const [rows] = await db.execute(
    `SELECT id, club_id, method_category, provider_name, method_label, method_config, is_enabled
     FROM ${T_PAY_METHODS}
     WHERE id = ? AND club_id = ? AND is_enabled = 1
     LIMIT 1`,
    [clubPaymentMethodId, clubId]
  );

  const method = rows[0];
  if (!method) throw Object.assign(new Error('crypto_payment_method_not_found'), { statusCode: 400 });
  if (method.method_category !== 'crypto')
    throw Object.assign(new Error('payment_method_is_not_crypto'), { statusCode: 400 });
  if (method.provider_name !== 'solana_wallet')
    throw Object.assign(new Error('only_solana_wallet_supported'), { statusCode: 400 });

  const methodConfig = parseJsonMaybe(method.method_config, {});
  const walletAddress = normalizeWallet(methodConfig.walletAddress);
  if (!walletAddress)
    throw Object.assign(new Error('club_solana_wallet_not_configured'), { statusCode: 400 });

  return { method, methodConfig, walletAddress };
}

/**
 * Determine the primary game_type for this order's product items.
 * Used for insertJoinPayment game_type field.
 * If a bundle has quiz + elimination, we record 'quiz' as primary.
 * If elimination-only, we record 'elimination'.
 */
async function resolveOrderGameType(orderId) {
  const [rows] = await db.execute(
    `SELECT pi.item_type
     FROM ${T_ORDER_ITEMS} oi
     JOIN ${T_PROD_ITEMS} pi ON pi.product_id = oi.product_id
     WHERE oi.order_id = ?`,
    [orderId]
  );

  const types = rows.map(r => r.item_type);
  if (types.includes('quiz_team_ticket') || types.includes('quiz_individual_ticket') || types.includes('game_entry')) {
    return 'quiz';
  }
  if (types.includes('elimination_entry')) return 'elimination';
  return 'quiz'; // safe default
}

/**
 * Get the fiat currency for this order.
 * Uses the first linked room's config_json currency, falling back to order.currency.
 */
async function resolveOrderCurrency(orderId, fallbackCurrency = 'EUR') {
  const [rows] = await db.execute(
    `SELECT r.config_json
     FROM ${T_ORDER_ITEMS} oi
     JOIN ${T_PROD_ITEMS} pi ON pi.product_id = oi.product_id
     JOIN ${T_ROOMS} r ON r.room_id = pi.target_room_id
     WHERE oi.order_id = ?
     LIMIT 1`,
    [orderId]
  );

  if (!rows[0]) return fallbackCurrency;
  const config = parseJsonMaybe(rows[0].config_json, {});
  return getRoomCurrencyCode(config) || fallbackCurrency;
}

/**
 * Verify a Solana payment for a campaign product order and record it
 * in the web3 transaction ledger.
 *
 * @returns {object} result — same shape as verifyAndRecordSolanaFixedFeePayment
 *   so campaignCryptoRoutes.js can use it identically
 */
export async function verifyCampaignCryptoPayment({
  orderId,
  clubId,
  clubPaymentMethodId,

  network = 'mainnet',
  txHash,
  senderWallet,
  recipientWallet,

  tokenCode,
  tokenMint = null,

  // Raw on-chain units
  entryFeeRaw,
  extrasRaw = '0',

  // Fiat display amounts (what the campaign charged)
  totalFiatAmount,      // full campaign product price e.g. 36
  fiatCurrency,         // e.g. 'EUR'

  cryptoDisplayAmount = null,
}) {
  if (!orderId || !clubId)
    throw Object.assign(new Error('orderId and clubId are required'), { statusCode: 400 });
  if (!txHash || !senderWallet || !recipientWallet)
    throw Object.assign(new Error('txHash, senderWallet and recipientWallet are required'), { statusCode: 400 });
  if (!tokenCode || !entryFeeRaw)
    throw Object.assign(new Error('tokenCode and entryFeeRaw are required'), { statusCode: 400 });

  const resolvedNetwork = normalizeNetwork(network);

  // 1. Resolve payment method and wallet
  const { method, methodConfig, walletAddress } =
    await getCampaignCryptoPaymentMethod(clubId, clubPaymentMethodId);

  if (normalizeWallet(recipientWallet) !== walletAddress) {
    throw Object.assign(
      new Error('Recipient wallet does not match the club payment method wallet'),
      { statusCode: 400 }
    );
  }

  // 2. Verify on-chain
  const totalRaw = (BigInt(String(entryFeeRaw)) + BigInt(String(extrasRaw))).toString();

  const verified = await verifySolanaTransfer({
    txHash,
    network:          resolvedNetwork,
    senderWallet,
    recipientWallet:  walletAddress,
    tokenMint,
    rawAmount:        totalRaw,
  });

  if (!verified.ok) {
    throw Object.assign(
      new Error(verified.error || 'Solana transaction verification failed'),
      { statusCode: 400 }
    );
  }

  // 3. Resolve currency
  const currency = fiatCurrency || await resolveOrderCurrency(orderId, 'EUR');

  // 4. Web3 transaction ledger — campaign products span multiple rooms so we
  // cannot use insertJoinPayment (requires room_id NOT NULL). The per-ticket
  // quiz_payment_ledger entries are written by campaignTicketBridgeService
  // after expandOrderIntoEntries runs. We return a stub web3Result so the
  // rest of the route (which reads web3Result?.id) works without change.
  const web3Result = {
    id:        null,
    duplicate: false,
    metadata:  {
      source:              'campaign_product_crypto',
      orderId,
      clubId,
      txHash,
      tokenCode,
      network:             resolvedNetwork,
      totalFiatAmount,
      fiatCurrency:        currency,
    },
  };

  return {
    method,
    methodConfig,
    walletAddress,
    resolvedNetwork,
    fiatCurrency:      currency,
    totalFiat:         Number(totalFiatAmount || 0),
    entryFeeFiat:      Number(totalFiatAmount || 0), // full amount — bridge apportions per ticket
    extrasFiat:        0,
    web3Result,
    verifiedTx:        verified.tx,
    cryptoDisplayAmount,
    tokenCode,
  };
}