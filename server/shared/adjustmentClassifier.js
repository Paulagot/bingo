// server/shared/adjustmentClassifier.js
//
// SINGLE source of truth for whether a reconciliation adjustment is
// income or expense. Every approval flow and every report must use this
// — never inline the switch again.
//
// Why this exists: five activity types each had their own copy of this
// logic and they disagreed. Quiz treated every unknown case as expense
// (default-subtract); ticketed/sub/elimination silently ignored unknown
// cases; puzzle drop was missing prize_payout entirely, so drop prize
// payouts vanished from the net. This module matches the majority
// implementation (ticketed/sub/elimination) and makes the one genuinely
// ambiguous case — cash_over_short with a bad/missing reason_code —
// explicit instead of guessed.
//
// adjustment_type is a DB enum:
//   'received' | 'refund' | 'fee' | 'cash_over_short' | 'prize_payout'
// reason_code is free-text varchar(64), so it CAN be wrong or null.

/**
 * @param {{ adjustmentType?: string, reasonCode?: string|null }} adj
 * @returns {'income' | 'expense' | 'unclassified'}
 */
export function classifyAdjustment({ adjustmentType, reasonCode }) {
  switch (adjustmentType) {
    case 'received':
      return 'income';

    case 'refund':
    case 'fee':
    case 'prize_payout':
      return 'expense';

    case 'cash_over_short':
      if (reasonCode === 'cash_over') return 'income';
      if (reasonCode === 'cash_short') return 'expense';
      return 'unclassified';

    default:
      // Unreachable while the DB enum holds, but if the enum ever grows
      // a value this module doesn't know, surface it — don't guess.
      return 'unclassified';
  }
}

/**
 * Compute the net of a set of adjustments.
 *
 * Accepts rows in any of the three shapes that exist in this codebase:
 *   - mapped camelCase rows   ({ adjustmentType, reasonCode, amount })
 *   - raw SQL rows            ({ adjustment_type, reason_code, amount })
 *   - quiz in-memory ledger   ({ type, reasonCode, amount })
 * Grouped SQL rows (SUM(amount) AS amount/total) also work.
 *
 * Unclassified rows are EXCLUDED from the net and returned separately
 * so callers can warn/flag instead of silently mis-signing money.
 *
 * @param {Array<object>} adjustments
 * @returns {{ income: number, expense: number, net: number, unclassified: object[] }}
 */
export function computeAdjustmentsNet(adjustments) {
  let income = 0;
  let expense = 0;
  const unclassified = [];

  for (const a of adjustments || []) {
    const amt = Number(a.amount ?? a.total ?? 0);
    const kind = classifyAdjustment({
      adjustmentType: a.adjustmentType ?? a.adjustment_type ?? a.type,
      reasonCode: a.reasonCode ?? a.reason_code ?? null,
    });

    if (kind === 'income') income += amt;
    else if (kind === 'expense') expense += amt;
    else unclassified.push(a);
  }

  return { income, expense, net: income - expense, unclassified };
}