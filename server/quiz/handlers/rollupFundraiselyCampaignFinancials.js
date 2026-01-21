import { connection, TABLE_PREFIX } from '../../config/database.js';

function round2(value) {
  const n = Number(value || 0);
  const rounded = Math.round(n * 100) / 100;
  return Number.isFinite(rounded) ? rounded : 0;
}

/**
 * Mirrors your mgt app FinancialService.updateCampaignFinancials(campaignId)
 * so campaign dashboards update immediately after quiz end.
 */
export async function rollupFundraiselyCampaignFinancials({ campaignId }) {
  const campaignsTable = `${TABLE_PREFIX}campaigns`;
  const incomeTable = `${TABLE_PREFIX}income`;
  const expensesTable = `${TABLE_PREFIX}expenses`;
  const eventsTable = `${TABLE_PREFIX}events`;

  // 1) campaign-level income (not from events)
  const [[campaignIncomeRow]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS campaign_income
     FROM ${incomeTable}
     WHERE campaign_id = ? AND event_id IS NULL`,
    [campaignId]
  );
  const campaignIncome = round2(campaignIncomeRow?.campaign_income || 0);

  // 2) campaign-level expenses (not from events)
  const [[campaignExpenseRow]] = await connection.execute(
    `SELECT COALESCE(SUM(amount), 0) AS campaign_expenses
     FROM ${expensesTable}
     WHERE campaign_id = ? AND event_id IS NULL`,
    [campaignId]
  );
  const campaignExpenses = round2(campaignExpenseRow?.campaign_expenses || 0);

  // 3) rollup from events in campaign
  const [[eventRollupRow]] = await connection.execute(
    `SELECT
       COALESCE(SUM(actual_amount), 0) AS events_income,
       COALESCE(SUM(total_expenses), 0) AS events_expenses,
       COALESCE(SUM(net_profit), 0) AS events_net
     FROM ${eventsTable}
     WHERE campaign_id = ?`,
    [campaignId]
  );

  const eventsIncome = round2(eventRollupRow?.events_income || 0);
  const eventsExpenses = round2(eventRollupRow?.events_expenses || 0);

  // 4) totals
  const totalIncome = round2(campaignIncome + eventsIncome);
  const totalExpenses = round2(campaignExpenses + eventsExpenses);
  const netProfit = round2(totalIncome - totalExpenses);

  // 5) target / progress
  const [[campaignRow]] = await connection.execute(
    `SELECT target_amount FROM ${campaignsTable} WHERE id = ?`,
    [campaignId]
  );
  const targetAmount = round2(campaignRow?.target_amount || 0);
  const progressPercentage = targetAmount > 0 ? round2((totalIncome / targetAmount) * 100) : 0;

  // 6) update campaign totals (both legacy/new fields like your code)
  await connection.execute(
    `UPDATE ${campaignsTable}
     SET actual_amount = ?,
         total_raised = ?,
         total_expenses = ?,
         net_profit = ?,
         total_profit = ?,
         progress_percentage = ?
     WHERE id = ?`,
    [
      totalIncome,
      totalIncome,
      totalExpenses,
      netProfit,
      netProfit,
      progressPercentage,
      campaignId,
    ]
  );

  return {
    success: true,
    totals: {
      totalIncome,
      totalExpenses,
      netProfit,
      progressPercentage,
    },
    breakdown: {
      campaign_level: { income: campaignIncome, expenses: campaignExpenses },
      events_rollup: { income: eventsIncome, expenses: eventsExpenses },
    },
  };
}
