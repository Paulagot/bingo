export const EXPENSE_REASON_CODES = [
  'venue_hire', 'equipment', 'catering', 'printing', 'marketing',
  'insurance', 'professional_fees', 'travel', 'payment_processing', 'other_expense',
] as const;

export type ExpenseReasonCode = typeof EXPENSE_REASON_CODES[number];

export function adjustmentNet(adjustments: Array<{ adjustmentType: string; reasonCode?: string | null; amount: number }>) {
  let income = 0;
  let expense = 0;
  for (const a of adjustments) {
    const amount = Number(a.amount || 0);
    if (a.adjustmentType === 'received') income += amount;
    else if (a.adjustmentType === 'cash_over_short') {
      if (a.reasonCode === 'cash_over') income += amount;
      else if (a.reasonCode === 'cash_short') expense += amount;
    } else if (['refund', 'fee', 'prize_payout', 'expense'].includes(a.adjustmentType)) {
      expense += amount;
    }
  }
  return { income, expense, net: income - expense };
}
