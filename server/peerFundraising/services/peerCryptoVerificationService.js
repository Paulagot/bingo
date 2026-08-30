// server/peer/services/peerCryptoVerificationService.js
//
// Verifies a Solana on-chain payment for a peer fundraiser order.
//
// Deliberately standalone - no campaign service dependencies.
// Mirrors the verification logic from campaignCryptoVerificationService but
// scoped to peer_orders and the peer payment method lookup.
//
// Called by peerCryptoRoutes after CryptoFixedFeeStep completes on-chain.
// After verification succeeds the route calls confirmPeerOrder() from
// peerOrderCompletionService, which runs the full peer fulfilment pipeline
// (reservations → expandPeerOrder → emails → state) identically to what
// the Stripe webhook triggers - crypto slots into the same confirmed-only
// accounting path, not a separate one.

import { connection as db, TABLE_PREFIX } from '../../config/database.js';
import {
  verifySolanaTransfer,
  normalizeNetwork,
  normalizeWallet,
  parseJsonMaybe,
} from '../../quiz/services/cryptoSolanaPaymentVerificationService.js';

const T_PAY_METHODS = `${TABLE_PREFIX}club_payment_methods`;

// ─── Payment method lookup ────────────────────────────────────────────────────
//
// Looks up the club's crypto payment method directly from club_payment_methods.
// Peer payment methods are fundraiser-level (not room-level), so we validate
// against club_id only - no room linked_payment_methods_json check needed.

async function getPeerCryptoPaymentMethod(clubId, clubPaymentMethodId) {
  const [rows] = await db.execute(
    `SELECT id, club_id, method_category, provider_name, method_label,
            method_config, is_enabled
     FROM ${T_PAY_METHODS}
     WHERE id = ? AND club_id = ? AND is_enabled = 1
     LIMIT 1`,
    [clubPaymentMethodId, clubId],
  );

  const method = rows[0];

  if (!method) {
    throw Object.assign(
      new Error('crypto_payment_method_not_found'),
      { statusCode: 400 },
    );
  }

  if (method.method_category !== 'crypto') {
    throw Object.assign(
      new Error('payment_method_is_not_crypto'),
      { statusCode: 400 },
    );
  }

  if (method.provider_name !== 'solana_wallet') {
    throw Object.assign(
      new Error('only_solana_wallet_supported'),
      { statusCode: 400 },
    );
  }

  const methodConfig = parseJsonMaybe(method.method_config, {});
  const walletAddress = normalizeWallet(methodConfig.walletAddress);

  if (!walletAddress) {
    throw Object.assign(
      new Error('club_solana_wallet_not_configured'),
      { statusCode: 400 },
    );
  }

  return { method, methodConfig, walletAddress };
}

// ─── Main verification export ─────────────────────────────────────────────────
//
// Returns the same shape as verifyCampaignCryptoPayment so peerCryptoRoutes
// can read totalFiat / fiatCurrency / web3Result identically.
//
// Does NOT write anything to the DB - the route handles the order status
// update and then delegates all fulfilment to confirmPeerOrder().

export async function verifyPeerCryptoPayment({
  orderId,
  clubId,
  clubPaymentMethodId,

  network = 'mainnet',
  txHash,
  senderWallet,
  recipientWallet,

  tokenCode,
  tokenMint = null,

  // Raw on-chain units (BigInt-safe strings)
  entryFeeRaw,
  extrasRaw = '0',

  // Fiat display amounts
  totalFiatAmount,
  fiatCurrency = 'EUR',

  cryptoDisplayAmount = null,
}) {
  if (!orderId || !clubId) {
    throw Object.assign(
      new Error('orderId and clubId are required'),
      { statusCode: 400 },
    );
  }

  if (!txHash || !senderWallet || !recipientWallet) {
    throw Object.assign(
      new Error('txHash, senderWallet and recipientWallet are required'),
      { statusCode: 400 },
    );
  }

  if (!tokenCode || !entryFeeRaw) {
    throw Object.assign(
      new Error('tokenCode and entryFeeRaw are required'),
      { statusCode: 400 },
    );
  }

  const resolvedNetwork = normalizeNetwork(network);

  // 1. Resolve payment method and expected wallet address
  const { method, methodConfig, walletAddress } =
    await getPeerCryptoPaymentMethod(clubId, clubPaymentMethodId);

  // 2. Recipient wallet must match what the club configured
  if (normalizeWallet(recipientWallet) !== walletAddress) {
    throw Object.assign(
      new Error('Recipient wallet does not match the club payment method wallet'),
      { statusCode: 400 },
    );
  }

  // 3. Verify on-chain - total raw = entryFee + extras
  const totalRaw = (
    BigInt(String(entryFeeRaw)) + BigInt(String(extrasRaw))
  ).toString();

  const verified = await verifySolanaTransfer({
    txHash,
    network:         resolvedNetwork,
    senderWallet,
    recipientWallet: walletAddress,
    tokenMint,
    rawAmount:       totalRaw,
  });

  if (!verified.ok) {
    throw Object.assign(
      new Error(verified.error || 'Solana transaction verification failed'),
      { statusCode: 400 },
    );
  }

  // 4. Peer orders span a single fundraiser (not necessarily a single room),
  // so we don't write to quiz_payment_ledger here - peerTicketBridgeService
  // does that per-ticket during expandPeerOrder. Return a stub so the route
  // can log web3TransactionId without change.
  const web3Result = {
    id: null,
    duplicate: false,
    metadata: {
      source:           'peer_order_crypto',
      orderId,
      clubId,
      txHash,
      tokenCode,
      network:          resolvedNetwork,
      totalFiatAmount,
      fiatCurrency,
    },
  };

  return {
    method,
    methodConfig,
    walletAddress,
    resolvedNetwork,
    fiatCurrency,
    totalFiat:          Number(totalFiatAmount || 0),
    web3Result,
    verifiedTx:         verified.tx,
    cryptoDisplayAmount,
    tokenCode,
  };
}