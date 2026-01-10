import { v4 as uuidv4 } from 'uuid';
import { connection, TABLE_PREFIX } from '../../config/database.js';
import { createImpactUpdateForQuiz } from './createImpactUpdateForQuiz.js';

const FUNDRAISELY_CLUB_ID = 'e14cce81-e3d0-4668-a199-5cb9e7a4539b';
const FUNDRAISELY_CAMPAIGN_ID = 'dba6e181-254f-4da2-ade3-67a05652a26d';
const FUNDRAISELY_SYSTEM_USER_ID = 'c165f12b-17fd-4b0f-bc65-a57f3db7d453';

function round2(value) {
  const n = Number(value || 0);
  // avoid NaN and keep 2dp for decimal(10,2)
  const rounded = Math.round(n * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
}

/**
 * Creates/updates FundRaisely internal mgmt Event + Income (platform fee only),
 * idempotent via external_source/external_ref.
 */
export async function syncImpactEventToFundraiselyClubMgmt({
  roomId,
  eventData,
  explorerUrl,
  totals,
}) {
  const eventsTable = `${TABLE_PREFIX}events`;
  const incomeTable = `${TABLE_PREFIX}income`;

  // external refs
  const eventExternalSource = 'quiz_web3_impact';
  const eventExternalRef = roomId;

  const incomeExternalSource = 'quiz_web3_impact_fee';
  const incomeExternalRef = roomId;

  // Platform revenue only
  // IMPORTANT: totals.totalRaised is already computed earlier (entry + extras)
  const platformRevenue = round2((Number(totals?.totalRaised || 0) * 0.2));

  // Title/description enrichment
  const hostName = eventData?.hostName ?? 'Host';
  const charityName = eventData?.charityName ?? 'Unknown charity';
  const chain = eventData?.chain ?? 'unknown';
  const network = eventData?.network ?? 'unknown';
  const token = eventData?.feeToken ?? 'unknown';
  const players = Number(eventData?.numberOfPlayers || 0);

  const title = `Web3 Quiz – ${hostName} (${roomId})`;
  const description = [
    `Auto-created from Web3 Impact Quiz end-of-game`,
    `Room: ${roomId}`,
    `Host: ${hostName}`,
    `Charity: ${charityName}`,
    `Network: ${chain} / ${network}`,
    `Token: ${token}`,
    `Players: ${players}`,
  ].join('\n');

  // Use "today" as event_date (no scheduling yet)
  const eventDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 1) Find or create the event (idempotent)
  const [existingEventRows] = await connection.execute(
    `SELECT id FROM ${eventsTable}
     WHERE club_id = ? AND external_source = ? AND external_ref = ?
     LIMIT 1`,
    [FUNDRAISELY_CLUB_ID, eventExternalSource, eventExternalRef]
  );

  let eventId = Array.isArray(existingEventRows) && existingEventRows.length > 0
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

        null,
        null,

        platformRevenue, // goal_amount = revenue only (your requirement)
        0,              // actual_amount will be recalculated from income
        0,              // total_expenses starts at 0
        0,              // net_profit will be recalculated

        eventDate,
        'ended',

        0,
        0,
        'pending',
        0,

        eventExternalSource,
        eventExternalRef,
      ]
    );
  } else {
    // If event already exists, we can update the display fields (safe)
    await connection.execute(
      `UPDATE ${eventsTable}
       SET title = ?, type = ?, description = ?, goal_amount = ?, campaign_id = ?
       WHERE id = ?`,
      [
        title,
        'web3_quiz',
        description,
        platformRevenue,
        FUNDRAISELY_CAMPAIGN_ID,
        eventId,
      ]
    );
  }

  // 2) Find or create the income line (platform fee only, idempotent)
  const [existingIncomeRows] = await connection.execute(
    `SELECT id FROM ${incomeTable}
     WHERE club_id = ? AND external_source = ? AND external_ref = ?
     LIMIT 1`,
    [FUNDRAISELY_CLUB_ID, incomeExternalSource, incomeExternalRef]
  );

  if (!Array.isArray(existingIncomeRows) || existingIncomeRows.length === 0) {
    const incomeId = uuidv4();

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
        `Platform fee (20%) from Web3 quiz room ${roomId}`,
        platformRevenue,
        eventDate,

        'other',
        roomId,
        null,

        incomeExternalSource,
        incomeExternalRef,
      ]
    );
  }

    /* ------------------------------------------------------------------
     2.5) Create the IMPACT update (charity payment record)
     - idempotent via external_source/external_ref
  ------------------------------------------------------------------ */

  // These should come from the impact ledger totals (NOT platform revenue)
  const charityAmount = Number(eventData?.charityAmount ?? totals?.charityAmount ?? 0);
  const totalRaised = Number(eventData?.totalRaised ?? totals?.totalRaised ?? 0);

  // If you already compute host fee in totals, prefer that
  const hostFeeAmount = Number(eventData?.hostFeeAmount ?? totals?.hostFeeAmount ?? 0);

  // platformRevenue is your platform fee amount (20%)
  const platformFeeAmount = Number(platformRevenue || 0);

  const impactExternalSource = 'quiz_web3_impact_payment';
  const impactExternalRef = roomId;

  try {
    const impactResult = await createImpactUpdateForQuiz({
      clubId: FUNDRAISELY_CLUB_ID,
      userId: FUNDRAISELY_SYSTEM_USER_ID, // ✅ keep this (don’t use 'system')
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

      externalSource: impactExternalSource,
      externalRef: impactExternalRef,
      impactAreaIds: ['personal_cause'],
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
    console.error('[syncImpactEventToFundraiselyClubMgmt] ❌ Impact insert failed', err);
  }


  // 3) Recalculate event financials (matches your mgt app logic)
  // actual_amount = SUM(income) for event
  // total_expenses = SUM(expenses) for event
  // net_profit = actual_amount - total_expenses
  const expensesTable = `${TABLE_PREFIX}expenses`;

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

  const totalIncome = round2(incomeSum?.total_income || 0);
  const totalExpenses = round2(expenseSum?.total_expenses || 0);
  const netProfit = round2(totalIncome - totalExpenses);

  await connection.execute(
    `UPDATE ${eventsTable}
     SET actual_amount = ?, total_expenses = ?, net_profit = ?
     WHERE id = ?`,
    [totalIncome, totalExpenses, netProfit, eventId]
  );

  // NOTE: Your mgt app also rolls up to campaign totals.
  // If you want the same behavior here too, we can call a similar SQL rollup,
  // but it's optional if campaign financials are only updated through the mgt app UI.
  // (I can add campaign rollup SQL immediately if you want.)

  return {
    success: true,
    eventId,
    platformRevenue,
    dedupe: { eventExternalSource, eventExternalRef, incomeExternalSource, incomeExternalRef },
  };
}
