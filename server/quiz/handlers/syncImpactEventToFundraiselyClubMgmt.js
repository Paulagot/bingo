// server/quiz/handlers/syncImpactEventToFundraiselyClubMgmt.js
import { v4 as uuidv4 } from 'uuid';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { createImpactUpdateForQuiz } from './createImpactUpdateForQuiz.js';
import { toEur, getTokenPriceEur } from '../../mgtsystem/services/Tokenpriceservice.js';

const FUNDRAISELY_CLUB_ID     = 'e14cce81-e3d0-4668-a199-5cb9e7a4539b';
const FUNDRAISELY_CAMPAIGN_ID = 'dba6e181-254f-4da2-ade3-67a05652a26d';
const FUNDRAISELY_SYSTEM_USER_ID = 'c165f12b-17fd-4b0f-bc65-a57f3db7d453';

function round2(value) {
  const n = Number(value || 0);
  const rounded = Math.round(n * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
}

/**
 * Creates/updates FundRaisely internal mgmt Event + Income.
 *
 * KEY CHANGE: income.amount is now stored in EUR (decimal(10,2) column).
 * The raw token amount + token code are recorded in income.description
 * so you have an audit trail without needing a schema change on that table.
 *
 * If the price API is unavailable, we fall back to storing 0 in amount
 * and flag the description so you can backfill later.
 */
export async function syncImpactEventToFundraiselyClubMgmt({
  roomId,
  eventData,
  explorerUrl,
  totals,
}) {
  const eventsTable  = `${TABLE_PREFIX}events`;
  const incomeTable  = `${TABLE_PREFIX}income`;
  const expensesTable = `${TABLE_PREFIX}expenses`;

  // ------------------------------------------------------------------
  // External refs (idempotency keys — unchanged)
  // ------------------------------------------------------------------
  const eventExternalSource  = 'quiz_web3_impact';
  const eventExternalRef     = roomId;
  const incomeExternalSource = 'quiz_web3_impact_fee';
  const incomeExternalRef    = roomId;

  // ------------------------------------------------------------------
  // Token + EUR conversion
  // ------------------------------------------------------------------
  const tokenCode = eventData?.feeToken ?? 'unknown';

  // Platform revenue in raw token units (20 % of totalRaised)
  const platformRevenueRaw = Number(totals?.totalRaised || 0) * 0.2;

  let tokenPriceEur    = null;
  let platformRevenueEur = null;  // this goes into income.amount
  let eurFetchFailed   = false;

  try {
    tokenPriceEur      = await getTokenPriceEur(tokenCode);
    platformRevenueEur = await toEur(platformRevenueRaw, tokenCode);
  } catch (err) {
    console.warn(
      `[syncImpact] ⚠️ EUR price fetch failed for ${tokenCode}: ${err.message}`
    );
    eurFetchFailed = true;
  }

  // income.amount is decimal(10,2) so we round to 2dp here
  // If price unavailable, store 0 and flag for backfill
  const incomeAmountEur = eurFetchFailed || platformRevenueEur === null
    ? 0
    : round2(platformRevenueEur);

  // ------------------------------------------------------------------
  // Enriched metadata
  // ------------------------------------------------------------------
  const hostName    = eventData?.hostName    ?? 'Host';
  const charityName = eventData?.charityName ?? 'Unknown charity';
  const chain       = eventData?.chain       ?? 'unknown';
  const network     = eventData?.network     ?? 'unknown';
  const token       = tokenCode;
  const players     = Number(eventData?.numberOfPlayers || 0);
  const eventDate   = new Date().toISOString().slice(0, 10);

  const title = `Web3 Quiz – ${hostName} (${roomId})`;

  const description = [
    `Auto-created from Web3 Impact Quiz end-of-game`,
    `Room: ${roomId}`,
    `Host: ${hostName}`,
    `Charity: ${charityName}`,
    `Network: ${chain} / ${network}`,
    `Token: ${token}`,
    `Players: ${players}`,
    tokenPriceEur
      ? `Token price at save: €${tokenPriceEur} / ${token}`
      : `⚠️ Token price unavailable at save time — EUR amounts need backfill`,
  ].join('\n');

  // goal_amount stored in EUR (what the dashboard shows)
  const goalAmountEur = round2(platformRevenueEur ?? 0);

  // ------------------------------------------------------------------
  // 1) Find or create event (idempotent)
  // ------------------------------------------------------------------
  const [existingEventRows] = await connection.execute(
    `SELECT id FROM ${eventsTable}
     WHERE club_id = ? AND external_source = ? AND external_ref = ?
     LIMIT 1`,
    [FUNDRAISELY_CLUB_ID, eventExternalSource, eventExternalRef]
  );

  let eventId =
    Array.isArray(existingEventRows) && existingEventRows.length > 0
      ? existingEventRows[0].id
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
       VALUES
       (?, ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?)`,
      [
        eventId,
        FUNDRAISELY_CLUB_ID,
        FUNDRAISELY_CAMPAIGN_ID,

        title,
        'web3_quiz',
        description,

        null,   // venue
        null,   // max_participants

        goalAmountEur,  // ← EUR
        0,              // actual_amount — recalculated from income below
        0,              // total_expenses
        0,              // net_profit

        eventDate,
        'ended',

        0,          // overhead_allocation
        0,          // impact_reported
        'pending',  // impact_status
        0,          // is_published

        eventExternalSource,
        eventExternalRef,
      ]
    );
  } else {
    await connection.execute(
      `UPDATE ${eventsTable}
       SET title = ?, type = ?, description = ?, goal_amount = ?, campaign_id = ?
       WHERE id = ?`,
      [title, 'web3_quiz', description, goalAmountEur, FUNDRAISELY_CAMPAIGN_ID, eventId]
    );
  }

  // ------------------------------------------------------------------
  // 2) Find or create income line (platform fee, idempotent)
  //    amount column is EUR — raw token info lives in description
  // ------------------------------------------------------------------
  const [existingIncomeRows] = await connection.execute(
    `SELECT id FROM ${incomeTable}
     WHERE club_id = ? AND external_source = ? AND external_ref = ?
     LIMIT 1`,
    [FUNDRAISELY_CLUB_ID, incomeExternalSource, incomeExternalRef]
  );

  if (!Array.isArray(existingIncomeRows) || existingIncomeRows.length === 0) {
    const incomeId = uuidv4();

    // Build a human-readable description that preserves the raw token amount
    const priceNote = tokenPriceEur
      ? `@ €${tokenPriceEur}/${token}`
      : `(EUR price unavailable — needs backfill)`;

    const incomeDescription = [
      `Platform fee (20%) from Web3 quiz room ${roomId}`,
      `Raw: ${platformRevenueRaw.toFixed(6)} ${token} ${priceNote}`,
      `EUR stored: €${incomeAmountEur}`,
      eurFetchFailed ? `⚠️ BACKFILL NEEDED` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    await connection.execute(
      `INSERT INTO ${incomeTable}
       (
         id, club_id, event_id, campaign_id,
         source, description, amount, date,
         payment_method, reference, supporter_id,
         external_source, external_ref
       )
       VALUES
       (?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?)`,
      [
        incomeId,
        FUNDRAISELY_CLUB_ID,
        eventId,
        FUNDRAISELY_CAMPAIGN_ID,

        'platform_fee',
        incomeDescription,
        incomeAmountEur,  // ← EUR amount in decimal(10,2)
        eventDate,

        'other',
        roomId,
        null,

        incomeExternalSource,
        incomeExternalRef,
      ]
    );

    console.log(`[syncImpact] 💶 Income inserted: €${incomeAmountEur} (${platformRevenueRaw.toFixed(6)} ${token})`);
  }

  // ------------------------------------------------------------------
  // 2.5) Create the IMPACT update (charity payment record)
  // ------------------------------------------------------------------
  const charityAmount    = Number(eventData?.charityAmount    ?? totals?.charityAmount    ?? 0);
  const totalRaised      = Number(eventData?.totalRaised      ?? totals?.totalRaised      ?? 0);
  const hostFeeAmount    = Number(eventData?.hostFeeAmount    ?? totals?.hostFeeAmount    ?? 0);
  const platformFeeAmount = Number(platformRevenueRaw || 0);

  const impactExternalSource = 'quiz_web3_impact_payment';
  const impactExternalRef    = roomId;

  try {
    const impactResult = await createImpactUpdateForQuiz({
      clubId:    FUNDRAISELY_CLUB_ID,
      userId:    FUNDRAISELY_SYSTEM_USER_ID,
      campaignId: FUNDRAISELY_CAMPAIGN_ID,
      eventId,
      roomId,

      hostName,
      charityName,

      charityAmount,
      hostFeeAmount,
      platformFeeAmount,
      totalRaised,

      feeToken: token,
      numberOfPlayers: players,
      explorerUrl,

      externalSource:  impactExternalSource,
      externalRef:     impactExternalRef,
      impactAreaIds:   ['personal_cause'],
    });

    if (impactResult?.success) {
      await connection.execute(
        `UPDATE ${eventsTable}
         SET impact_status = 'in_progress'
         WHERE id = ? AND impact_status = 'pending'`,
        [eventId]
      );

      await connection.execute(
        `UPDATE ${TABLE_PREFIX}campaigns
         SET impact_status = 'in_progress'
         WHERE id = ? AND impact_status = 'pending'`,
        [FUNDRAISELY_CAMPAIGN_ID]
      );
    }
  } catch (err) {
    console.error('[syncImpact] ❌ Impact insert failed', err);
  }

  // ------------------------------------------------------------------
  // 3) Recalculate event financials from DB (income - expenses)
  //    All stored in EUR so the arithmetic is correct
  // ------------------------------------------------------------------
  const [[incomeSum]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total_income
     FROM ${incomeTable}
     WHERE event_id = ?`,
    [eventId]
  );

  const [[expenseSum]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS total_expenses
     FROM ${expensesTable}
     WHERE event_id = ?`,
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

  return {
    success: true,
    eventId,
    platformRevenue: {
      raw:   platformRevenueRaw,
      token: tokenCode,
      eur:   platformRevenueEur,
    },
    eurFetchFailed,
    dedupe: { eventExternalSource, eventExternalRef, incomeExternalSource, incomeExternalRef },
  };
}
