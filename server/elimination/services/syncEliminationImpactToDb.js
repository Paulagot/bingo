import { v4 as uuidv4 } from 'uuid';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { toEur, getTokenPriceEur } from '../../mgtsystem/services/Tokenpriceservice.js';

// ── Elimination-specific IDs ──────────────────────────────────────────────────
const ELIMINATION_CAMPAIGN_ID          = '3f898432-a98a-4210-9541-d9899b0f1d63';
const ELIMINATION_PLATFORM_CAMPAIGN_ID = 2;
const FUNDRAISELY_CLUB_ID              = 'e14cce81-e3d0-4668-a199-5cb9e7a4539b';

function round2(value) {
  const n = Number(value || 0);
  const rounded = Math.round(n * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
}

// ── Token decimals — used to convert raw units to human-readable amounts ──────
// Add new tokens here as you support them
const TOKEN_DECIMALS = {
  'USDC':  6,
  'USDT':  6,
  'SOL':   9,
  'BONK':  5,
  'PYUSD': 6,
  'EURC':  6,
  // EVM tokens
  'ETH':   18,
  'MATIC': 18,
  'BNB':   18,
};

/**
 * Called after a web3 elimination room is finalized.
 * Writes to:
 *   1. fundraisely_impact_campaign_events  (per-game record)
 *   2. fundraisely_events                  (mgmt event, idempotent)
 *   3. fundraisely_income                  (platform fee line, idempotent)
 */
export async function syncEliminationImpactToDb({
  roomId,
  hostId,
  hostName,
  hostWallet,
  charityWallet,
  charityName,
  tokenCode,       // e.g. 'USDC', 'SOL' — passed from frontend
  chain,           // e.g. 'solana'
  network,         // e.g. 'devnet' | 'mainnet'
  totalRaised,     // raw token units (number)
  charityAmount,   // raw token units (number)
  hostFeeAmount,   // raw token units (number)
  numberOfPlayers,
  txSignature,     // finalize tx
}) {
  const eventsTable   = `${TABLE_PREFIX}events`;
  const incomeTable   = `${TABLE_PREFIX}income`;
  const expensesTable = `${TABLE_PREFIX}expenses`;
  const impactTable   = `${TABLE_PREFIX}impact_campaign_events`;

  const eventDate = new Date().toISOString().slice(0, 10);

  // ── Convert raw units → human-readable amounts ────────────────────────────
  const decimals = TOKEN_DECIMALS[tokenCode] ?? 6;
  const divisor  = Math.pow(10, decimals);

  const totalRaisedHuman   = Number(totalRaised   || 0) / divisor;
  const charityAmountHuman = Number(charityAmount || 0) / divisor;
  const hostFeeHuman       = Number(hostFeeAmount || 0) / divisor;
  const platformRawHuman   = totalRaisedHuman * 0.15;   // platform gets 15%

  // ── EUR conversion ────────────────────────────────────────────────────────
  let tokenPriceEur      = null;
  let totalRaisedEur     = null;
  let charityAmountEur   = null;
  let hostFeeAmountEur   = null;
  let platformRevenueEur = null;
  let eurFetchFailed     = false;

  try {
    tokenPriceEur      = await getTokenPriceEur(tokenCode);
    totalRaisedEur     = await toEur(totalRaisedHuman,   tokenCode);
    charityAmountEur   = await toEur(charityAmountHuman, tokenCode);
    hostFeeAmountEur   = await toEur(hostFeeHuman,       tokenCode);
    platformRevenueEur = await toEur(platformRawHuman,   tokenCode);
  } catch (err) {
    console.warn(`[syncElimination] ⚠️ EUR price fetch failed for ${tokenCode}:`, err.message);
    eurFetchFailed = true;
  }

  const incomeAmountEur = eurFetchFailed || platformRevenueEur === null
    ? 0
    : round2(platformRevenueEur);

  // ── 1. impact_campaign_events row (idempotent) ────────────────────────────
  const [existingImpact] = await connection.execute(
    `SELECT id FROM ${impactTable} WHERE room_id = ? AND platform_campaign_id = ? LIMIT 1`,
    [roomId, ELIMINATION_PLATFORM_CAMPAIGN_ID]
  );

  if (!Array.isArray(existingImpact) || existingImpact.length === 0) {
    await connection.execute(
      `INSERT INTO ${impactTable}
       (
         platform_campaign_id, room_id, host_id, host_name,
         chain, network, fee_token, host_wallet, charity_wallet, charity_name,
         total_raised, charity_amount, extras_revenue, host_fee_amount,
         number_of_players, campaign_id,
         token_price_eur, total_raised_eur, charity_amount_eur, host_fee_amount_eur
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ELIMINATION_PLATFORM_CAMPAIGN_ID,
        roomId,
        hostId,
        hostName        ?? 'Host',
        chain           ?? 'solana',
        network         ?? 'unknown',
        tokenCode       ?? 'unknown',
        hostWallet      ?? null,
        charityWallet   ?? null,
        charityName     ?? 'Unknown charity',
        totalRaisedHuman,    // ← human units
        charityAmountHuman,  // ← human units
        0,                   // extras_revenue — not used in elimination
        hostFeeHuman,        // ← human units
        numberOfPlayers ?? 0,
        ELIMINATION_CAMPAIGN_ID,
        tokenPriceEur   ?? null,
        totalRaisedEur  ?? null,
        charityAmountEur ?? null,
        hostFeeAmountEur ?? null,
      ]
    );
    console.log(`[syncElimination] ✅ impact_campaign_events row inserted for room ${roomId}`);
  } else {
    console.log(`[syncElimination] ℹ️ impact_campaign_events already exists for room ${roomId} — skipping`);
  }

  // ── 2. events row (idempotent) ────────────────────────────────────────────
  const eventExternalSource = 'elimination_web3_impact';
  const eventExternalRef    = roomId;

  const title = `Web3 Elimination – ${hostName ?? 'Host'} (${roomId})`;

  const description = [
    `Web3 Elimination`,
    `Room: ${roomId}`,
    `Host: ${hostName ?? 'unknown'}`,
    `Charity: ${charityName ?? 'unknown'}`,
    `Network: ${chain} / ${network}`,
    `Token: ${tokenCode}`,
    `Players: ${numberOfPlayers}`,
    `Total pool: ${totalRaisedHuman.toFixed(6)} ${tokenCode}`,
    txSignature ? `Finalize tx: ${txSignature}` : '',
    tokenPriceEur
      ? `Token price at save: €${tokenPriceEur} / ${tokenCode}`
      : `⚠️ Token price unavailable — EUR amounts need backfill`,
  ].filter(Boolean).join('\n');

  const [existingEvent] = await connection.execute(
    `SELECT id FROM ${eventsTable}
     WHERE club_id = ? AND external_source = ? AND external_ref = ? LIMIT 1`,
    [FUNDRAISELY_CLUB_ID, eventExternalSource, eventExternalRef]
  );

  let eventId = Array.isArray(existingEvent) && existingEvent.length > 0
    ? existingEvent[0].id
    : null;

  if (!eventId) {
    eventId = uuidv4();
    await connection.execute(
      `INSERT INTO ${eventsTable}
       (
         id, club_id, campaign_id,
         title, type, description,
         venue, max_participants,
         goal_amount, actual_amount, total_expenses, net_profit,
         event_date, status,
         overhead_allocation, impact_reported, impact_status, is_published,
         external_source, external_ref
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        FUNDRAISELY_CLUB_ID,
        ELIMINATION_CAMPAIGN_ID,
        title,
        'web3_elimination',
        description,
        null, null,
        round2(platformRevenueEur ?? 0),  // goal_amount in EUR
        0, 0, 0,
        eventDate,
        'ended',
        0, 0, 'pending', 0,
        eventExternalSource,
        eventExternalRef,
      ]
    );
    console.log(`[syncElimination] ✅ events row created: ${eventId}`);
  } else {
    await connection.execute(
      `UPDATE ${eventsTable}
       SET title = ?, description = ?, goal_amount = ?
       WHERE id = ?`,
      [title, description, round2(platformRevenueEur ?? 0), eventId]
    );
  }

  // ── 3. income row (platform fee, idempotent) ──────────────────────────────
  const incomeExternalSource = 'elimination_web3_income';
  const incomeExternalRef    = roomId;

  const [existingIncome] = await connection.execute(
    `SELECT id FROM ${incomeTable}
     WHERE club_id = ? AND external_source = ? AND external_ref = ? LIMIT 1`,
    [FUNDRAISELY_CLUB_ID, incomeExternalSource, incomeExternalRef]
  );

  if (!Array.isArray(existingIncome) || existingIncome.length === 0) {
    const priceNote = tokenPriceEur
      ? `@ €${tokenPriceEur}/${tokenCode}`
      : `(EUR price unavailable — needs backfill)`;

    const incomeDescription = [
      `Platform fee (15%) from Web3 elimination room ${roomId}`,
      `Raw: ${platformRawHuman.toFixed(6)} ${tokenCode} ${priceNote}`,
      `EUR stored: €${incomeAmountEur}`,
      eurFetchFailed ? `⚠️ BACKFILL NEEDED` : '',
    ].filter(Boolean).join(' | ');

    await connection.execute(
      `INSERT INTO ${incomeTable}
       (
         id, club_id, event_id, campaign_id,
         source, description, amount, date,
         payment_method, reference, supporter_id,
         external_source, external_ref
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        FUNDRAISELY_CLUB_ID,
        eventId,
        ELIMINATION_CAMPAIGN_ID,
        'platform_fee',
        incomeDescription,
        incomeAmountEur,
        eventDate,
        'other',
        roomId,
        null,
        incomeExternalSource,
        incomeExternalRef,
      ]
    );
    console.log(`[syncElimination] 💶 Income inserted: €${incomeAmountEur} (${platformRawHuman.toFixed(6)} ${tokenCode})`);
  }

  // ── 4. Recalculate event financials from DB ───────────────────────────────
  const [[incomeSum]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total_income FROM ${incomeTable} WHERE event_id = ?`,
    [eventId]
  );
  const [[expenseSum]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM ${expensesTable} WHERE event_id = ?`,
    [eventId]
  );

  const totalIncome   = round2(incomeSum?.total_income   || 0);
  const totalExpenses = round2(expenseSum?.total_expenses || 0);
  const netProfit     = round2(totalIncome - totalExpenses);

  await connection.execute(
    `UPDATE ${eventsTable}
     SET actual_amount = ?, total_expenses = ?, net_profit = ?
     WHERE id = ?`,
    [totalIncome, totalExpenses, netProfit, eventId]
  );

  console.log(`[syncElimination] ✅ DB sync complete for room ${roomId}`);

  return {
    success: true,
    eventId,
    platformRevenue: {
      raw:   platformRawHuman,
      token: tokenCode,
      eur:   platformRevenueEur,
    },
    eurFetchFailed,
  };
}