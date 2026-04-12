// server/web3/services/web3TransactionService.js
//
// Shared ledger writer for fundraisely_web3_transactions.
// Called from:
//   - web3TransactionRoutes.js  (player join payments — frontend-triggered)
//   - eliminationRoutes.js      (prize payouts — server-side only on finalize-confirm)
//   - quiz equivalent routes    (prize payouts — server-side only)
//
// One row per confirmed on-chain transaction. Never called speculatively.

// No uuid needed — id is AUTO_INCREMENT BIGINT, MySQL assigns it
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { getTokenPriceEur, toEur } from '../../mgtsystem/services/Tokenpriceservice.js';

// ── Token decimals — keep in sync with syncEliminationImpactToDb.js ───────────
const TOKEN_DECIMALS = {
  USDC:  6,
  USDT:  6,
  SOL:   9,
  BONK:  5,
  PYUSD: 6,
  EURC:  6,
  ETH:   18,
  MATIC: 18,
  BNB:   18,
};

function round6(value) {
  const n = Number(value || 0);
  const r = Math.round(n * 1_000_000) / 1_000_000;
  return Number.isFinite(r) ? r : 0;
}

function round2(value) {
  const n = Number(value || 0);
  const r = Math.round(n * 100) / 100;
  return Number.isFinite(r) ? r : 0;
}

/**
 * Insert a confirmed web3 transaction into fundraisely_web3_transactions.
 *
 * This function is idempotent — duplicate tx_hash + chain + network
 * combinations are silently ignored (the table has a unique constraint).
 *
 * @param {object} params
 * @param {'join_payment'|'prize_payout'|'refund'} params.transaction_type
 * @param {'in'|'out'}                              params.direction
 * @param {'quiz'|'elimination'}                    params.game_type
 * @param {string}                                  params.room_id
 * @param {string|null}                             params.campaign_id       optional
 * @param {string}                                  params.wallet_address    player or recipient
 * @param {string}                                  params.chain             'solana' | 'evm'
 * @param {string}                                  params.network           'mainnet' | 'devnet' | 'base' | 'base_sepolia' etc.
 * @param {string}                                  params.tx_hash           on-chain tx hash / signature
 * @param {string}                                  params.fee_token         token symbol e.g. 'USDC'
 * @param {string|null}                             params.token_address     mint address or ERC-20 address
 * @param {number}                                  params.amount            total raw token units
 * @param {number}                                  params.entry_fee_amount  raw token units (0 for payouts)
 * @param {number}                                  params.extras_amount     raw token units (0 for payouts)
 * @param {number}                                  params.donation_amount   raw token units (0 for payouts)
 * @param {object|null}                             params.metadata_json     optional extra payload
 *
 * @returns {Promise<{ success: boolean, id: string|null, duplicate: boolean }>}
 */
export async function insertWeb3Transaction({
  transaction_type,
  direction,
  game_type,
  room_id,
  campaign_id = null,
  wallet_address,
  chain,
  network,
  tx_hash,
  fee_token,
  token_address = null,
  amount,
  entry_fee_amount = 0,
  extras_amount = 0,
  donation_amount = 0,
  metadata_json = null,
}) {
  const table = `${TABLE_PREFIX}web3_transactions`;

  // ── Validate breakdown adds up (join_payment only) ───────────────────────
  // prize_payout and refund rows intentionally have breakdown fields as zero —
  // only the total amount matters for those transaction types.
  const totalAmount = Number(amount);
  if (transaction_type === 'join_payment') {
    const breakdownSum = Number(entry_fee_amount) + Number(extras_amount) + Number(donation_amount);
    if (Math.abs(breakdownSum - totalAmount) > 1) {
      console.warn(
        `[web3Tx] ⚠️  Breakdown sum (${breakdownSum}) does not match amount (${totalAmount}) for tx ${tx_hash}`
      );
    }
  }

  // ── Convert raw → human-readable ──────────────────────────────────────────
  const decimals = TOKEN_DECIMALS[fee_token] ?? 6;
  const divisor  = Math.pow(10, decimals);

  const amountHuman          = round6(totalAmount           / divisor);
  const entryFeeHuman        = round6(Number(entry_fee_amount) / divisor);
  const extrasHuman          = round6(Number(extras_amount)    / divisor);
  const donationHuman        = round6(Number(donation_amount)  / divisor);

  // ── EUR conversion ────────────────────────────────────────────────────────
  let tokenPriceEur    = null;
  let amountEur        = null;
  let entryFeeEur      = null;
  let extrasEur        = null;
  let donationEur      = null;

  try {
    tokenPriceEur = await getTokenPriceEur(fee_token);
    amountEur     = round2(await toEur(amountHuman,     fee_token));
    entryFeeEur   = round2(await toEur(entryFeeHuman,   fee_token));
    extrasEur     = round2(await toEur(extrasHuman,     fee_token));
    donationEur   = round2(await toEur(donationHuman,   fee_token));
  } catch (err) {
    console.warn(`[web3Tx] ⚠️  EUR conversion failed for ${fee_token}:`, err.message);
  }

  // ── Check for duplicate (idempotent) ──────────────────────────────────────
  // The unique constraint on (tx_hash, chain, network) will also catch this,
  // but checking first gives us a clean log and avoids a DB error on replay.
  // Unique per (tx_hash + chain + network + wallet_address) —
  // allows multiple rows for the same tx when multiple wallets are paid
  // (e.g. quiz prize distribution paying multiple winners in one tx)
  const [existing] = await connection.execute(
    `SELECT id FROM ${table} WHERE tx_hash = ? AND chain = ? AND network = ? AND wallet_address = ? LIMIT 1`,
    [tx_hash, chain, network, wallet_address]
  );

  if (Array.isArray(existing) && existing.length > 0) {
    console.log(`[web3Tx] ℹ️  Duplicate tx skipped: ${tx_hash} (${chain}/${network})`);
    return { success: true, id: existing[0].id, duplicate: true };
  }

  // ── Insert — id is AUTO_INCREMENT, MySQL assigns it ──────────────────────
  const [insertResult] = await connection.execute(
    `INSERT INTO ${table}
     (
       game_type, room_id, campaign_id,
       wallet_address, chain, network, tx_hash,
       transaction_type, direction, status,
       fee_token, token_address, token_price_eur,
       amount, entry_fee_amount, extras_amount, donation_amount,
       amount_eur, entry_fee_amount_eur, extras_amount_eur, donation_amount_eur,
       metadata_json,
       created_at
     )
     VALUES
     (
       ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, 'confirmed',
       ?, ?, ?,
       ?, ?, ?, ?,
       ?, ?, ?, ?,
       ?,
       NOW()
     )`,
    [
      game_type,
      room_id,
      campaign_id,
      wallet_address,
      chain,
      network,
      tx_hash,
      transaction_type,
      direction,
      fee_token,
      token_address,
      tokenPriceEur,
      amountHuman,
      entryFeeHuman,
      extrasHuman,
      donationHuman,
      amountEur,
      entryFeeEur,
      extrasEur,
      donationEur,
      metadata_json ? JSON.stringify(metadata_json) : null,
    ]
  );

  const insertedId = insertResult.insertId;

  console.log(
    `[web3Tx] ✅ ${transaction_type} (${direction}) recorded — id: ${insertedId}, room: ${room_id}, ` +
    `tx: ${tx_hash.slice(0, 12)}…, amount: ${amountHuman} ${fee_token} (€${amountEur ?? '?'})`
  );

  return { success: true, id: insertedId, duplicate: false };
}

/**
 * Convenience wrapper — insert a join_payment row.
 * Called from the HTTP route after on-chain verification.
 */
export async function insertJoinPayment({
  game_type,
  room_id,
  campaign_id,
  wallet_address,
  chain,
  network,
  tx_hash,
  fee_token,
  token_address,
  amount,
  entry_fee_amount,
  extras_amount,
  donation_amount,
  metadata_json,
}) {
  return insertWeb3Transaction({
    transaction_type: 'join_payment',
    direction: 'in',
    game_type,
    room_id,
    campaign_id,
    wallet_address,
    chain,
    network,
    tx_hash,
    fee_token,
    token_address,
    amount,
    entry_fee_amount,
    extras_amount,
    donation_amount,
    metadata_json,
  });
}

/**
 * Convenience wrapper — insert a prize_payout row.
 * Called server-side only from finalize-confirm routes.
 * Never called directly from the frontend.
 */
export async function insertPrizePayout({
  game_type,
  room_id,
  campaign_id,
  wallet_address,     // winner's wallet
  chain,
  network,
  tx_hash,            // finalize tx hash
  fee_token,
  token_address,
  amount,             // prize amount in raw units
}) {
  return insertWeb3Transaction({
    transaction_type: 'prize_payout',
    direction: 'out',
    game_type,
    room_id,
    campaign_id,
    wallet_address,
    chain,
    network,
    tx_hash,
    fee_token,
    token_address,
    amount,
    entry_fee_amount: 0,
    extras_amount:    0,
    donation_amount:  0,
  });
}