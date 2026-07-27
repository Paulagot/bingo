// server/shared/adjustmentClassifier.js
//
// SINGLE source of truth for whether a reconciliation adjustment is
// income or expense. Every approval flow and every report must use this.
//
// adjustment_type DB enum:
//   'received' | 'refund' | 'fee' | 'cash_over_short' |
//   'prize_payout' | 'expense'

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
    case 'expense':
      return 'expense';

    case 'cash_over_short':
      if (reasonCode === 'cash_over') return 'income';
      if (reasonCode === 'cash_short') return 'expense';
      return 'unclassified';

    default:
      return 'unclassified';
  }
}

/**
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
